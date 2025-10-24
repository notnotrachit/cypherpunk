import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Get admin wallet keypair from environment variable
 * This works on any hosting platform (Vercel, Cloudflare, etc.)
 */
export function getAdminWallet(): Keypair {
  const privateKey = process.env.ADMIN_WALLET_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "ADMIN_WALLET_PRIVATE_KEY environment variable is not set. " +
      "Run 'node scripts/export-wallet-key.js' to get your private key."
    );
  }

  try {
    // Decode base58 private key
    const secretKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error(
      "Invalid ADMIN_WALLET_PRIVATE_KEY. Make sure it's a valid base58 encoded private key."
    );
  }
}

/**
 * Validate that admin wallet is configured correctly
 */
export function validateAdminWallet(): { valid: boolean; error?: string; publicKey?: string } {
  try {
    const wallet = getAdminWallet();
    return {
      valid: true,
      publicKey: wallet.publicKey.toString(),
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message,
    };
  }
}
