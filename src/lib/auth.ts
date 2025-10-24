/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Auth utilities:
 * - Create a canonical "Sign In With Solana" message to be signed by Phantom (or any Solana wallet)
 * - Verify a signature using the wallet public key
 * - Create and verify JWTs for session management
 *
 * Packages used:
 * - jose: JWT creation/verification with HS256
 * - tweetnacl: ed25519 verification
 * - bs58: base58 encoding/decoding for Solana public keys and signatures
 */

import {
  SignJWT,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyResult,
} from "jose";
import * as nacl from "tweetnacl";
import bs58 from "bs58";

// ---------- Types

export type SessionTokenPayload = JWTPayload & {
  // Standard subject: wallet address (base58)
  sub: string;
  // Random nonce used for the login attempt, bound into the session
  nonce: string;
  // Optional additional claims your app may include
  [key: string]: any;
};

export type SigninMessageParams = {
  // Domain asking for the sign-in (e.g., "example.com")
  domain: string;
  // Wallet public key (base58)
  address: string;
  // Optional explanatory statement to show to the user
  statement?: string;
  // URI of the site requesting sign-in; defaults to https://{domain}
  uri?: string;
  // Chain identifier; defaults to "solana:mainnet"
  chainId?: string;
  // Version of the message; defaults to "1"
  version?: string;
  // Random nonce, base58 recommended
  nonce: string;
  // Optional ISO datetime strings
  issuedAt?: string;
  expirationTime?: string;
  // Additional resources
  resources?: string[];
};

export type ValidateMessageOptions = {
  expectedDomain?: string;
  expectedAddress?: string;
  expectedNonce?: string;
  // If provided, ensure the issuedAt is not older than this many seconds
  maxAgeSeconds?: number;
};

// ---------- Constants

const DEFAULT_JWT_EXPIRES_IN = "15m";
const DEFAULT_MESSAGE_VERSION = "1";
const DEFAULT_CHAIN_ID = "solana:mainnet";

// ---------- Helpers: randomness and encoding

/**
 * Generate a cryptographically secure random nonce encoded as base58.
 * @param length number of random bytes to generate before base58-encoding
 */
export function createNonce(length = 16): string {
  const buf = new Uint8Array(length);
  getRandomValues(buf);
  return bs58.encode(buf);
}

function getRandomValues(buf: Uint8Array) {
  const cryptoObj = (globalThis as any)?.crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(buf);
    return;
  }
  throw new Error(
    "Secure crypto.getRandomValues is not available in this environment",
  );
}

/**
 * UTF-8 encode a message into bytes suitable for wallet signing/verification.
 */
export function messageToBytes(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}

// ---------- SIWS (Sign-In With Solana) message

/**
 * Build a canonical sign-in message similar to EIP-4361 but tailored for Solana.
 * Wallets like Phantom can sign the raw UTF-8 bytes of this message.
 *
 * The structure is:
 * {domain} wants you to sign in with your Solana account:
 * {address}
 *
 * {statement}
 * URI: {uri}
 * Version: {version}
 * Chain ID: {chainId}
 * Nonce: {nonce}
 * Issued At: {issuedAt}
 * Expiration Time: {expirationTime?}
 * Resources:
 * - {resource1}
 * - {resource2}
 * ...
 */
export function buildSignInMessage(params: SigninMessageParams): string {
  const {
    domain,
    address,
    statement,
    uri,
    chainId = DEFAULT_CHAIN_ID,
    version = DEFAULT_MESSAGE_VERSION,
    nonce,
    issuedAt = new Date().toISOString(),
    expirationTime,
    resources,
  } = params;

  if (!isValidDomain(domain)) {
    throw new Error(`Invalid domain: ${domain}`);
  }
  if (!isValidBase58(address)) {
    throw new Error(`Invalid wallet address (expected base58): ${address}`);
  }
  if (!nonce) {
    throw new Error("Nonce is required");
  }

  const lines: string[] = [];
  lines.push(`${domain} wants you to sign in with your Solana account:`);
  lines.push(address);
  lines.push(""); // blank line

  if (statement) {
    lines.push(statement);
  }

  lines.push(`URI: ${uri ?? `https://${domain}`}`);
  lines.push(`Version: ${version}`);
  lines.push(`Chain ID: ${chainId}`);
  lines.push(`Nonce: ${nonce}`);
  lines.push(`Issued At: ${issuedAt}`);
  if (expirationTime) {
    lines.push(`Expiration Time: ${expirationTime}`);
  }

  if (resources && resources.length > 0) {
    lines.push("Resources:");
    for (const r of resources) {
      lines.push(`- ${r}`);
    }
  }

  // Ensure a trailing newline for consistent byte representation
  return lines.join("\n") + "\n";
}

/**
 * Parse key fields from a sign-in message. Returns best-effort extraction.
 */
export function parseSignInMessage(message: string) {
  const domainMatch = message.match(/^([^\n]+?) wants you to sign in/i);
  const addressMatch = message.match(/^\s*([1-9A-HJ-NP-Za-km-z]{32,})\s*$/m);
  const uriMatch = message.match(/^\s*URI:\s*(.+)\s*$/im);
  const versionMatch = message.match(/^\s*Version:\s*(.+)\s*$/im);
  const chainIdMatch = message.match(/^\s*Chain ID:\s*(.+)\s*$/im);
  const nonceMatch = message.match(/^\s*Nonce:\s*(.+)\s*$/im);
  const issuedAtMatch = message.match(/^\s*Issued At:\s*(.+)\s*$/im);
  const expirationMatch = message.match(/^\s*Expiration Time:\s*(.+)\s*$/im);

  let statement: string | undefined;
  {
    // Statement is any non-empty block between the blank line after address and the "URI:" line.
    const parts = message.split("\n");
    const addrIndex = parts.findIndex(
      (l) => l.trim() === (addressMatch?.[1] ?? "").trim(),
    );
    const uriIndex = parts.findIndex((l) => /^\s*URI:/i.test(l));
    if (addrIndex >= 0 && uriIndex > addrIndex + 2) {
      const slice = parts.slice(addrIndex + 2, uriIndex);
      const joined = slice.join("\n").trim();
      if (joined) statement = joined;
    }
  }

  return {
    domain: domainMatch?.[1],
    address: addressMatch?.[1],
    statement,
    uri: uriMatch?.[1],
    version: versionMatch?.[1],
    chainId: chainIdMatch?.[1],
    nonce: nonceMatch?.[1],
    issuedAt: issuedAtMatch?.[1],
    expirationTime: expirationMatch?.[1],
  };
}

/**
 * Validate a sign-in message against expectations (domain/address/nonce, and age).
 * Throws an Error with a descriptive message if validation fails.
 */
export function validateSignInMessage(
  message: string,
  opts: ValidateMessageOptions = {},
) {
  const parsed = parseSignInMessage(message);

  if (!parsed.domain || !isValidDomain(parsed.domain)) {
    throw new Error("Invalid or missing domain in message");
  }
  if (!parsed.address || !isValidBase58(parsed.address)) {
    throw new Error("Invalid or missing address in message");
  }
  if (!parsed.nonce) {
    throw new Error("Missing nonce in message");
  }
  if (!parsed.issuedAt) {
    throw new Error("Missing 'Issued At' in message");
  }

  const { expectedDomain, expectedAddress, expectedNonce, maxAgeSeconds } =
    opts;

  if (expectedDomain && !sameHost(parsed.domain, expectedDomain)) {
    throw new Error(
      `Domain mismatch. Expected ${expectedDomain}, got ${parsed.domain}`,
    );
  }
  if (expectedAddress && parsed.address !== expectedAddress) {
    throw new Error(
      `Address mismatch. Expected ${expectedAddress}, got ${parsed.address}`,
    );
  }
  if (expectedNonce && !constantTimeEquals(parsed.nonce, expectedNonce)) {
    throw new Error("Nonce mismatch");
  }

  if (maxAgeSeconds && parsed.issuedAt) {
    const now = Date.now();
    const issued = Date.parse(parsed.issuedAt);
    if (Number.isFinite(issued)) {
      const ageSec = Math.max(0, Math.floor((now - issued) / 1000));
      if (ageSec > maxAgeSeconds) {
        throw new Error(`Message too old (${ageSec}s > ${maxAgeSeconds}s)`);
      }
    }
  }

  if (parsed.expirationTime) {
    const exp = Date.parse(parsed.expirationTime);
    if (Number.isFinite(exp) && Date.now() > exp) {
      throw new Error("Message has expired");
    }
  }

  return parsed;
}

// ---------- Signature verification

export type VerifySignatureInput = {
  message: string;
  // Signature as Uint8Array or base58 string
  signature: Uint8Array | string;
  // Public key (base58)
  publicKey: string;
};

/**
 * Verify an ed25519 signature of the provided message using the given public key.
 * Returns true if verification succeeds.
 */
export function verifySolanaSignature(input: VerifySignatureInput): boolean {
  const { message, signature, publicKey } = input;
  const msgBytes = messageToBytes(message);
  const sigBytes =
    typeof signature === "string"
      ? decodeBase58("signature", signature)
      : signature;
  const pubKeyBytes = decodeBase58("publicKey", publicKey);

  if (pubKeyBytes.length !== nacl.sign.publicKeyLength) {
    throw new Error(`Invalid public key length: ${pubKeyBytes.length}`);
  }

  return nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes);
}

// ---------- JWT helpers

/**
 * Get the JWT secret from the environment.
 * For local dev, set AUTH_JWT_SECRET to a random long string.
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
}

export type CreateSessionTokenInput = {
  address: string; // wallet address (base58)
  nonce: string;
  expiresIn?: string; // e.g., "15m", "1h"
  extra?: Record<string, any>;
};

export async function signSessionJwt(
  input: CreateSessionTokenInput,
): Promise<string> {
  const { address, nonce, expiresIn = DEFAULT_JWT_EXPIRES_IN, extra } = input;

  if (!isValidBase58(address)) {
    throw new Error("Invalid address for JWT 'sub'");
  }
  if (!nonce) {
    throw new Error("Nonce is required to create session token");
  }

  const secret = getJwtSecret();

  const payload: SessionTokenPayload = {
    sub: address,
    nonce,
    ...(extra ?? {}),
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifySessionJwt<
  T extends SessionTokenPayload = SessionTokenPayload,
>(token: string): Promise<JWTVerifyResult<T>> {
  const secret = getJwtSecret();
  // jose infers HS256 from the signature
  return (await jwtVerify(token, secret)) as JWTVerifyResult<T>;
}

// ---------- Combined verification helper

export type VerifyLoginFlowInput = {
  message: string;
  signature: Uint8Array | string;
  address: string; // base58
  expectedDomain?: string;
  expectedNonce?: string;
  maxMessageAgeSeconds?: number;
};

/**
 * Full verification flow for a login attempt:
 * 1) Validate the message structure and expected fields
 * 2) Verify the signature with the provided address
 *
 * Throws if invalid. Returns parsed message fields if valid.
 */
export function verifySignedLogin(input: VerifyLoginFlowInput) {
  const {
    message,
    signature,
    address,
    expectedDomain,
    expectedNonce,
    maxMessageAgeSeconds,
  } = input;

  const parsed = validateSignInMessage(message, {
    expectedDomain,
    expectedAddress: address,
    expectedNonce,
    maxAgeSeconds: maxMessageAgeSeconds,
  });

  const ok = verifySolanaSignature({ message, signature, publicKey: address });
  if (!ok) {
    throw new Error("Invalid signature");
  }

  return parsed;
}

// ---------- Internal utils

function isValidDomain(domain: string): boolean {
  // Basic host validation (no scheme, no path)
  // Accepts localhost and TLD-like patterns
  if (!domain || domain.length > 255) return false;
  // Disallow protocol/scheme
  if (/^https?:\/\//i.test(domain)) return false;
  // Allow localhost, IPv4, or hostname labels
  return /^[a-z0-9.-]+$/i.test(domain);
}

function sameHost(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isValidBase58(s: string): boolean {
  try {
    const bytes = bs58.decode(s);
    return bytes.length > 0;
  } catch {
    return false;
  }
}

function decodeBase58(label: string, s: string): Uint8Array {
  try {
    return bs58.decode(s);
  } catch {
    throw new Error(`Invalid base58 ${label}`);
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  const aBytes = messageToBytes(a);
  const bBytes = messageToBytes(b);
  if (aBytes.length !== bBytes.length) return false;
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}
