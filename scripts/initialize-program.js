#!/usr/bin/env node

/**
 * Initialize the Solana program on devnet
 * This only needs to be run once after deployment
 * 
 * Usage: node scripts/initialize-program.js
 */

require('dotenv').config({ path: '.env' });
const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const bs58 = require("bs58");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Initializing Solana Program...\n");

  // Load environment variables
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const programId = new PublicKey("B6Zx3sv8tRUHJq3pzLSfikCd6uEx17ksp6FmyEoeh1Wd");

  if (!privateKey) {
    console.error("❌ Error: ADMIN_WALLET_PRIVATE_KEY not set in .env file");
    console.error("\nRun: node scripts/export-wallet-key.js");
    process.exit(1);
  }

  try {
    // Load admin wallet
    const secretKey = bs58.decode(privateKey);
    const adminWallet = Keypair.fromSecretKey(secretKey);
    console.log("👤 Admin Wallet:", adminWallet.publicKey.toString());

    // Setup connection and provider
    const connection = new Connection(rpcUrl, "confirmed");
    const wallet = new anchor.Wallet(adminWallet);
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // Check balance
    const balance = await connection.getBalance(adminWallet.publicKey);
    console.log("💰 Balance:", balance / 1e9, "SOL");

    if (balance < 0.01 * 1e9) {
      console.error("\n❌ Error: Insufficient balance. Need at least 0.01 SOL");
      console.error("Get devnet SOL from: https://faucet.solana.com/");
      process.exit(1);
    }

    // Load IDL
    const idlPath = path.join(process.cwd(), "target/idl/social_linking.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const program = new anchor.Program(idl, provider);

    // Get config PDA
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    console.log("📍 Config PDA:", configPda.toString());
    console.log("🌐 Network:", rpcUrl);
    console.log("\n⏳ Initializing...\n");

    // Check if already initialized
    try {
      const configAccount = await program.account.config.fetch(configPda);
      console.log("✅ Program already initialized!");
      console.log("   Admin:", configAccount.admin.toString());
      return;
    } catch (e) {
      // Not initialized yet, continue
    }

    // Initialize the program
    const tx = await program.methods
      .initialize()
      .accounts({
        config: configPda,
        admin: adminWallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Program initialized successfully!");
    console.log("📝 Transaction:", tx);
    console.log("🔗 Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Verify initialization
    const configAccount = await program.account.config.fetch(configPda);
    console.log("\n✅ Verification:");
    console.log("   Admin:", configAccount.admin.toString());
    console.log("   Bump:", configAccount.bump);

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.logs) {
      console.error("\n📋 Logs:");
      error.logs.forEach(log => console.error("  ", log));
    }
    process.exit(1);
  }
}

main().then(() => {
  console.log("\n🎉 Done!");
  process.exit(0);
}).catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
