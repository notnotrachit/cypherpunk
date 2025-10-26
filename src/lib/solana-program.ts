import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

export const PROGRAM_ID = new PublicKey("BCD29c55GrdmwUefJ8ndbp49TuH4h3khj62CrRaD1tx9");

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

export function getProgram(wallet: any, rpcUrl?: string) {
  const connection = new Connection(rpcUrl || getRpcUrl(), "confirmed");
  
  // Create a minimal wallet interface for server-side usage
  const walletAdapter = {
    publicKey: wallet.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(wallet);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      txs.forEach(tx => tx.partialSign(wallet));
      return txs;
    },
  };
  
  const provider = new AnchorProvider(connection, walletAdapter as any, {
    commitment: "confirmed",
  });
  
  const idl = loadIdl();
  return new Program(idl, provider);
}

// Helper to get PDA addresses
export function getConfigPDA() {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  return pda;
}

export function getSocialLinkPDA(userWallet: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("social_link"), userWallet.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function getPendingClaimPDA(socialHandle: string) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
    PROGRAM_ID
  );
  return pda;
}

// Example functions to call from your webapp
export async function initializeProgram(wallet: any) {
  const program = getProgram(wallet);
  const configPDA = getConfigPDA();

  const tx = await (program as any).methods
    .initialize()
    .accounts({
      config: configPDA,
      admin: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();

  return tx;
}

export async function linkTwitterAccount(
  wallet: any,
  userWallet: PublicKey,
  twitterHandle: string
) {
  const program = getProgram(wallet);
  const configPDA = getConfigPDA();
  const socialLinkPDA = getSocialLinkPDA(userWallet);

  const tx = await (program as any).methods
    .linkTwitter(twitterHandle)
    .accounts({
      socialLink: socialLinkPDA,
      user: userWallet,
      admin: wallet.publicKey,
      config: configPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();

  return tx;
}

export async function linkInstagramAccount(
  wallet: any,
  userWallet: PublicKey,
  instagramHandle: string
) {
  const program = getProgram(wallet);
  const configPDA = getConfigPDA();
  const socialLinkPDA = getSocialLinkPDA(userWallet);

  const tx = await (program as any).methods
    .linkInstagram(instagramHandle)
    .accounts({
      socialLink: socialLinkPDA,
      user: userWallet,
      admin: wallet.publicKey,
      config: configPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();

  return tx;
}

export async function linkLinkedinAccount(
  wallet: any,
  userWallet: PublicKey,
  linkedinHandle: string
) {
  const program = getProgram(wallet);
  const configPDA = getConfigPDA();
  const socialLinkPDA = getSocialLinkPDA(userWallet);

  const tx = await (program as any).methods
    .linkLinkedin(linkedinHandle)
    .accounts({
      socialLink: socialLinkPDA,
      user: userWallet,
      admin: wallet.publicKey,
      config: configPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();

  return tx;
}

export type SocialLinkAccount = {
  owner: PublicKey;
  twitter: string;
  instagram: string;
  linkedin: string;
  bump: number;
};

export async function getSocialLink(
  userWallet: PublicKey,
  rpcUrl?: string
): Promise<SocialLinkAccount | null> {
  const connection = new Connection(rpcUrl || getRpcUrl(), "confirmed");

  // Create a read-only provider (no wallet needed for reading)
  const provider = new AnchorProvider(
    connection,
    {} as any,
    { commitment: "confirmed" }
  );

  const idl = loadIdl();
  const program = new Program(idl, provider);

  const socialLinkPDA = getSocialLinkPDA(userWallet);

  try {
    const account = await (program.account as any).socialLink.fetch(
      socialLinkPDA
    );
    return account as SocialLinkAccount;
  } catch (e) {
    return null; // Account doesn't exist yet
  }
}

// Helper function to get just the LinkedIn handle
export async function getLinkedInHandle(
  userWallet: PublicKey,
  rpcUrl?: string
): Promise<string | null> {
  const socialLink = await getSocialLink(userWallet, rpcUrl);
  return socialLink?.linkedin || null;
}

// Helper function to get just the Twitter handle
export async function getTwitterHandle(
  userWallet: PublicKey,
  rpcUrl?: string
): Promise<string | null> {
  const socialLink = await getSocialLink(userWallet, rpcUrl);
  return socialLink?.twitter || null;
}

// Helper function to get just the Instagram handle
export async function getInstagramHandle(
  userWallet: PublicKey,
  rpcUrl?: string
): Promise<string | null> {
  const socialLink = await getSocialLink(userWallet, rpcUrl);
  return socialLink?.instagram || null;
}

// Helper function to find wallet by social handle (requires scanning all accounts)
export async function findWalletBySocialHandle(
  handle: string,
  platform: "twitter" | "instagram" | "linkedin",
  rpcUrl?: string
): Promise<PublicKey | null> {
  const connection = new Connection(rpcUrl || getRpcUrl(), "confirmed");

  const provider = new AnchorProvider(
    connection,
    {} as any,
    { commitment: "confirmed" }
  );

  const idl = loadIdl();
  const program = new Program(idl, provider);

  try {
    // Get all social_link accounts
    const accounts = await (program.account as any).socialLink.all();

    // Find the account with matching handle
    for (const account of accounts) {
      const data = account.account as SocialLinkAccount;
      if (
        (platform === "twitter" && data.twitter === handle) ||
        (platform === "instagram" && data.instagram === handle) ||
        (platform === "linkedin" && data.linkedin === handle)
      ) {
        return data.owner;
      }
    }

    return null;
  } catch (e) {
    console.error("Error finding wallet by social handle:", e);
    return null;
  }
}
