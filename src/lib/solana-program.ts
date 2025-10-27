import * as anchor from "@coral-xyz/anchor";
import {
  Program,
  AnchorProvider,
  type Wallet,
  type Idl,
} from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

export const PROGRAM_ID = new PublicKey(
  "BCD29c55GrdmwUefJ8ndbp49TuH4h3khj62CrRaD1tx9",
);

// RPC URLs
export const LOCALHOST_RPC = "http://127.0.0.1:8899";
export const DEVNET_RPC = "https://api.devnet.solana.com";
export const MAINNET_RPC = "https://api.mainnet-beta.solana.com";

// Get RPC URL from environment or default to devnet
export function getRpcUrl(): string {
  return process.env.SOLANA_RPC_URL || DEVNET_RPC;
}

// Get network name for display
export function getNetworkName(): string {
  const rpcUrl = getRpcUrl();
  if (rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1")) {
    return "Localhost";
  } else if (rpcUrl.includes("devnet")) {
    return "Devnet";
  } else if (rpcUrl.includes("mainnet")) {
    return "Mainnet";
  }
  return "Unknown";
}

// Load IDL from file system (server-side only)
function loadIdl() {
  const idlPath = path.join(process.cwd(), "target/idl/social_linking.json");
  const idlString = fs.readFileSync(idlPath, "utf-8");
  return JSON.parse(idlString);
}

export function getProgram(wallet: Keypair | Wallet, rpcUrl?: string) {
  const connection = new Connection(rpcUrl || getRpcUrl(), "confirmed");

  // Normalize Keypair or Wallet into an Anchor Wallet
  const kp = wallet instanceof Keypair ? wallet : Keypair.generate();
  const baseAdapter =
    "signTransaction" in wallet && "signAllTransactions" in wallet
      ? (wallet as Wallet)
      : null;

  const walletAdapter: Wallet = {
    publicKey: baseAdapter ? baseAdapter.publicKey : kp.publicKey,
    payer: kp,
    async signTransaction<T extends Transaction | VersionedTransaction>(
      tx: T,
    ): Promise<T> {
      if (baseAdapter) {
        return baseAdapter.signTransaction<T>(tx);
      }
      if ("partialSign" in tx) {
        (tx as Transaction).partialSign(kp);
      } else {
        (tx as VersionedTransaction).sign([kp]);
      }
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> {
      if (baseAdapter) {
        return baseAdapter.signAllTransactions<T>(txs);
      }
      const signed = await Promise.all(
        txs.map((tx) => walletAdapter.signTransaction(tx)),
      );
      return signed;
    },
  };

  const provider = new AnchorProvider(connection, walletAdapter, {
    commitment: "confirmed",
  });

  const idl = loadIdl() as Idl;
  return new Program(idl, provider);
}

// Helper to get PDA addresses
export function getConfigPDA() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID,
  );
  return pda;
}

export function getSocialLinkPDA(userWallet: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("social_link"), userWallet.toBuffer()],
    PROGRAM_ID,
  );
  return pda;
}

export function getPendingClaimPDA(socialHandle: string) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
    PROGRAM_ID,
  );
  return pda;
}

// Example functions to call from your webapp
export async function initializeProgram(wallet: Keypair | Wallet) {
  const program = getProgram(wallet);
  const configPDA = getConfigPDA();

  const tx = await program.methods
    .initialize()
    .accounts({
      config: configPDA,
      admin: (wallet as Keypair).publicKey ?? wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([wallet as Keypair])
    .rpc();

  return tx;
}

export async function linkTwitterAccount(
  wallet: Keypair | Wallet,
  userWallet: PublicKey,
  twitterHandle: string,
) {
  const program = getProgram(wallet);
  const configPDA = getConfigPDA();
  const socialLinkPDA = getSocialLinkPDA(userWallet);

  const tx = await program.methods
    .linkTwitter(twitterHandle)
    .accounts({
      socialLink: socialLinkPDA,
      user: userWallet,
      admin: (wallet as Keypair).publicKey ?? wallet.publicKey,
      config: configPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([wallet as Keypair])
    .rpc();

  return tx;
}

export type SocialLinkAccount = {
  owner: PublicKey;
  twitter: string;
  bump: number;
};

export async function getSocialLink(
  userWallet: PublicKey,
  rpcUrl?: string,
): Promise<SocialLinkAccount | null> {
  const connection = new Connection(rpcUrl || getRpcUrl(), "confirmed");

  // Create a read-only provider (no wallet needed for reading)
  const dummyWallet: Wallet = {
    publicKey: Keypair.generate().publicKey,
    payer: Keypair.generate(),
    async signTransaction<T extends Transaction | VersionedTransaction>(
      tx: T,
    ): Promise<T> {
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> {
      return txs;
    },
  };
  const provider = new AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });

  const idl = loadIdl();
  const program = new Program(idl, provider);

  const socialLinkPDA = getSocialLinkPDA(userWallet);

  try {
    const account = await (
      program.account as unknown as {
        socialLink: { fetch: (pda: PublicKey) => Promise<unknown> };
      }
    ).socialLink.fetch(socialLinkPDA);
    return account as SocialLinkAccount;
  } catch {
    return null; // Account doesn't exist yet
  }
}

// Helper function to get just the Twitter handle
export async function getTwitterHandle(
  userWallet: PublicKey,
  rpcUrl?: string,
): Promise<string | null> {
  const socialLink = await getSocialLink(userWallet, rpcUrl);
  return socialLink?.twitter || null;
}

// Helper function to find wallet by social handle (requires scanning all accounts)
export async function findWalletBySocialHandle(
  handle: string,
  platform: "twitter",
  rpcUrl?: string,
): Promise<PublicKey | null> {
  const connection = new Connection(rpcUrl || getRpcUrl(), "confirmed");

  const dummyWallet: Wallet = {
    publicKey: Keypair.generate().publicKey,
    payer: Keypair.generate(),
    async signTransaction<T extends Transaction | VersionedTransaction>(
      tx: T,
    ): Promise<T> {
      return tx;
    },
    async signAllTransactions<T extends Transaction | VersionedTransaction>(
      txs: T[],
    ): Promise<T[]> {
      return txs;
    },
  };
  const provider = new AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });

  const idl = loadIdl();
  const program = new Program(idl, provider);

  try {
    // Get all social_link accounts
    const accounts = await (
      program.account as unknown as {
        socialLink: { all: () => Promise<Array<{ account: unknown }>> };
      }
    ).socialLink.all();

    // Find the account with matching handle
    for (const account of accounts) {
      const data = account.account as SocialLinkAccount;
      if (data.twitter === handle) {
        return data.owner;
      }
    }

    return null;
  } catch (e) {
    console.error("Error finding wallet by social handle:", e);
    return null;
  }
}
