#!/usr/bin/env ts-node

/**
 * Interactive CLI tool to test smart contract functions
 * 
 * Usage: npx ts-node scripts/test-functions.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount
} from "@solana/spl-token";
import * as fs from "fs";
import * as readline from "readline";

const idl = JSON.parse(fs.readFileSync("target/idl/social_linking.json", "utf-8"));
const PROGRAM_ID = new PublicKey("BCD29c55GrdmwUefJ8ndbp49TuH4h3khj62CrRaD1tx9");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("🚀 Solana Smart Contract Testing Tool\n");

  // Setup connection
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  
  // Load wallet
  const walletPath = process.env.HOME + "/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  
  const wallet = new Wallet(walletKeypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  
  const program = new Program(idl as any, PROGRAM_ID, provider);
  
  console.log("📍 Program ID:", PROGRAM_ID.toString());
  console.log("👤 Admin Wallet:", wallet.publicKey.toString());
  console.log("💰 Balance:", await connection.getBalance(wallet.publicKey) / 1e9, "SOL\n");

  // Get PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  // Store these for use in functions
  const context = { program, connection, wallet, configPda, provider };

  while (true) {
    console.log("\n=== Available Functions ===");
    console.log("1. Initialize Program");
    console.log("2. Link Twitter Account");
    console.log("3. Link Instagram Account");
    console.log("4. Link LinkedIn Account");
    console.log("5. View Social Links");
    console.log("6. Send Tokens (to linked user)");
    console.log("7. Send Tokens to Unlinked User (escrow)");
    console.log("8. Claim Tokens");
    console.log("9. View Pending Claims");
    console.log("10. Create Test Token & Mint");
    console.log("0. Exit\n");

    const choice = await question("Choose an option: ");

    try {
      switch (choice) {
        case "1":
          await initializeProgram(context);
          break;
        case "2":
          await linkTwitter(context);
          break;
        case "3":
          await linkInstagram(context);
          break;
        case "4":
          await linkLinkedin(context);
          break;
        case "5":
          await viewSocialLinks(context);
          break;
        case "6":
          await sendTokens(context);
          break;
        case "7":
          await sendTokensToUnlinked(context);
          break;
        case "8":
          await claimTokens(context);
          break;
        case "9":
          await viewPendingClaims(context);
          break;
        case "10":
          await createTestToken(context);
          break;
        case "0":
          console.log("👋 Goodbye!");
          rl.close();
          process.exit(0);
        default:
          console.log("❌ Invalid option");
      }
    } catch (error: any) {
      console.error("❌ Error:", error.message);
      if (error.logs) {
        console.log("📋 Logs:", error.logs);
      }
    }
  }
}

type Context = {
  program: Program;
  connection: Connection;
  wallet: Wallet;
  configPda: PublicKey;
  provider: AnchorProvider;
};

async function initializeProgram(ctx: Context) {
  console.log("\n🔧 Initializing program...");
  
  const tx = await ctx.program.methods
    .initialize()
    .accounts({
      config: ctx.configPda,
      admin: ctx.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Program initialized!");
  console.log("📝 Transaction:", tx);
  
  const config = await (ctx.program.account as any).config.fetch(ctx.configPda);
  console.log("👤 Admin:", config.admin.toString());
}

async function linkTwitter(ctx: Context) {
  const userWallet = await question("Enter user wallet address: ");
  const twitterHandle = await question("Enter Twitter handle (e.g., @username): ");

  const [socialLinkPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("social_link"), new PublicKey(userWallet).toBuffer()],
    PROGRAM_ID
  );

  const tx = await ctx.program.methods
    .linkTwitter(twitterHandle)
    .accounts({
      socialLink: socialLinkPda,
      user: new PublicKey(userWallet),
      admin: ctx.wallet.publicKey,
      config: ctx.configPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Twitter linked!");
  console.log("📝 Transaction:", tx);
}

async function linkInstagram(ctx: Context) {
  const userWallet = await question("Enter user wallet address: ");
  const instagramHandle = await question("Enter Instagram handle (e.g., @username): ");

  const [socialLinkPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("social_link"), new PublicKey(userWallet).toBuffer()],
    PROGRAM_ID
  );

  const tx = await ctx.program.methods
    .linkInstagram(instagramHandle)
    .accounts({
      socialLink: socialLinkPda,
      user: new PublicKey(userWallet),
      admin: ctx.wallet.publicKey,
      config: ctx.configPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Instagram linked!");
  console.log("📝 Transaction:", tx);
}

async function linkLinkedin(ctx: Context) {
  const userWallet = await question("Enter user wallet address: ");
  const linkedinHandle = await question("Enter LinkedIn handle: ");

  const [socialLinkPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("social_link"), new PublicKey(userWallet).toBuffer()],
    PROGRAM_ID
  );

  const tx = await ctx.program.methods
    .linkLinkedin(linkedinHandle)
    .accounts({
      socialLink: socialLinkPda,
      user: new PublicKey(userWallet),
      admin: ctx.wallet.publicKey,
      config: ctx.configPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ LinkedIn linked!");
  console.log("📝 Transaction:", tx);
}

async function viewSocialLinks(ctx: Context) {
  const userWallet = await question("Enter user wallet address: ");

  const [socialLinkPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("social_link"), new PublicKey(userWallet).toBuffer()],
    PROGRAM_ID
  );

  try {
    const socialLink = await (ctx.program.account as any).socialLink.fetch(socialLinkPda);
    console.log("\n📱 Social Links:");
    console.log("  Owner:", socialLink.owner.toString());
    console.log("  Twitter:", socialLink.twitter || "(not linked)");
    console.log("  Instagram:", socialLink.instagram || "(not linked)");
    console.log("  LinkedIn:", socialLink.linkedin || "(not linked)");
  } catch (e) {
    console.log("❌ No social links found for this wallet");
  }
}

async function sendTokens(ctx: Context) {
  const mintAddress = await question("Enter token mint address: ");
  const recipientWallet = await question("Enter recipient wallet address: ");
  const amount = await question("Enter amount (in smallest units): ");

  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    ctx.connection,
    ctx.wallet.payer,
    new PublicKey(mintAddress),
    ctx.wallet.publicKey
  );

  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    ctx.connection,
    ctx.wallet.payer,
    new PublicKey(mintAddress),
    new PublicKey(recipientWallet)
  );

  const tx = await ctx.program.methods
    .sendToken(new anchor.BN(amount))
    .accounts({
      sender: ctx.wallet.publicKey,
      senderTokenAccount: senderTokenAccount.address,
      recipientTokenAccount: recipientTokenAccount.address,
      recipient: new PublicKey(recipientWallet),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("✅ Tokens sent!");
  console.log("📝 Transaction:", tx);
}

async function sendTokensToUnlinked(ctx: Context) {
  const mintAddress = await question("Enter token mint address: ");
  const socialHandle = await question("Enter social handle (e.g., @username): ");
  const amount = await question("Enter amount (in smallest units): ");

  const [pendingClaimPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
    PROGRAM_ID
  );

  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    ctx.connection,
    ctx.wallet.payer,
    new PublicKey(mintAddress),
    ctx.wallet.publicKey
  );

  const escrowTokenAccount = await getOrCreateAssociatedTokenAccount(
    ctx.connection,
    ctx.wallet.payer,
    new PublicKey(mintAddress),
    ctx.configPda,
    true
  );

  const tx = await ctx.program.methods
    .sendTokenToUnlinked(socialHandle, new anchor.BN(amount))
    .accounts({
      sender: ctx.wallet.publicKey,
      senderTokenAccount: senderTokenAccount.address,
      escrowTokenAccount: escrowTokenAccount.address,
      pendingClaim: pendingClaimPda,
      config: ctx.configPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Tokens sent to escrow!");
  console.log("📝 Transaction:", tx);
}

async function claimTokens(ctx: Context) {
  const claimerWalletPath = await question("Enter path to claimer's keypair JSON: ");
  const socialHandle = await question("Enter social handle to claim: ");
  const mintAddress = await question("Enter token mint address: ");

  const claimerKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(claimerWalletPath, "utf-8")))
  );

  const [socialLinkPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("social_link"), claimerKeypair.publicKey.toBuffer()],
    PROGRAM_ID
  );

  const [pendingClaimPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
    PROGRAM_ID
  );

  const escrowTokenAccount = await getOrCreateAssociatedTokenAccount(
    ctx.connection,
    claimerKeypair,
    new PublicKey(mintAddress),
    ctx.configPda,
    true
  );

  const claimerTokenAccount = await getOrCreateAssociatedTokenAccount(
    ctx.connection,
    claimerKeypair,
    new PublicKey(mintAddress),
    claimerKeypair.publicKey
  );

  const tx = await ctx.program.methods
    .claimToken(socialHandle)
    .accounts({
      claimer: claimerKeypair.publicKey,
      socialLink: socialLinkPda,
      pendingClaim: pendingClaimPda,
      escrowTokenAccount: escrowTokenAccount.address,
      claimerTokenAccount: claimerTokenAccount.address,
      config: ctx.configPda,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([claimerKeypair])
    .rpc();

  console.log("✅ Tokens claimed!");
  console.log("📝 Transaction:", tx);
}

async function viewPendingClaims(ctx: Context) {
  const socialHandle = await question("Enter social handle: ");

  const [pendingClaimPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
    PROGRAM_ID
  );

  try {
    const pendingClaim = await (ctx.program.account as any).pendingClaim.fetch(pendingClaimPda);
    console.log("\n💰 Pending Claim:");
    console.log("  Sender:", pendingClaim.sender.toString());
    console.log("  Social Handle:", pendingClaim.socialHandle);
    console.log("  Amount:", pendingClaim.amount.toString());
    console.log("  Claimed:", pendingClaim.claimed);
  } catch (e) {
    console.log("❌ No pending claim found for this handle");
  }
}

async function createTestToken(ctx: Context) {
  console.log("\n🪙 Creating test token...");
  
  const mint = await createMint(
    ctx.connection,
    ctx.wallet.payer,
    ctx.wallet.publicKey,
    null,
    9
  );

  console.log("✅ Token created!");
  console.log("🪙 Mint address:", mint.toString());

  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    ctx.connection,
    ctx.wallet.payer,
    mint,
    ctx.wallet.publicKey
  );

  await mintTo(
    ctx.connection,
    ctx.wallet.payer,
    mint,
    tokenAccount.address,
    ctx.wallet.publicKey,
    1000000000000 // 1000 tokens
  );

  console.log("✅ Minted 1000 tokens to your account");
  console.log("📍 Your token account:", tokenAccount.address.toString());
}

main().catch(console.error);