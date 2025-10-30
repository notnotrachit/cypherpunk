/**
 * Initialize escrow account for unlinked payments
 * Run this once to set up the escrow token account
 */

const { Connection, PublicKey, Keypair } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const fs = require("fs");

const PROGRAM_ID = new PublicKey("B6Zx3sv8tRUHJq3pzLSfikCd6uEx17ksp6FmyEoeh1Wd");
const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"); // Devnet USDC
const RPC_URL = "https://api.devnet.solana.com";

async function main() {
  console.log("🚀 Initializing Escrow Account\n");

  // Load wallet
  const walletPath = process.env.HOME + "/.config/solana/id.json";

  if (!fs.existsSync(walletPath)) {
    console.error("❌ Wallet not found at:", walletPath);
    console.log("Please make sure you have a Solana wallet configured");
    process.exit(1);
  }

  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("👤 Admin Wallet:", walletKeypair.publicKey.toString());

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");

  // Get config PDA
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("📍 Config PDA:", configPDA.toString());
  console.log("💰 USDC Mint:", USDC_MINT.toString());

  // Create or get escrow token account (owned by config PDA)
  console.log("\n🔨 Creating escrow token account...");

  const escrowTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    walletKeypair,
    USDC_MINT,
    configPDA,
    true // allowOwnerOffCurve - PDA can own token accounts
  );

  console.log("\n✅ Escrow account initialized!");
  console.log("📍 Escrow Token Account:", escrowTokenAccount.address.toString());
  console.log("💰 Current Balance:", escrowTokenAccount.amount.toString(), "micro-USDC");
  console.log("\n🎉 You can now send USDC to unlinked users!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
