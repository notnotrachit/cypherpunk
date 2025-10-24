#!/usr/bin/env node

/**
 * Export Solana wallet private key as base58 for environment variables
 * 
 * Usage:
 *   node scripts/export-wallet-key.js
 *   node scripts/export-wallet-key.js /path/to/wallet.json
 */

const fs = require('fs');
const path = require('path');
const bs58 = require('bs58');

// Get wallet path from argument or use default
const walletPath = process.argv[2] || path.join(
  process.env.HOME || process.env.USERPROFILE,
  '.config',
  'solana',
  'id.json'
);

try {
  console.log(`Reading wallet from: ${walletPath}\n`);

  // Read wallet file
  const walletData = fs.readFileSync(walletPath, 'utf-8');
  const secretKey = new Uint8Array(JSON.parse(walletData));

  // Encode as base58
  const base58Key = bs58.encode(secretKey);

  console.log('✅ Successfully exported wallet key!\n');
  console.log('Add this to your .env file:\n');
  console.log('ADMIN_WALLET_PRIVATE_KEY="' + base58Key + '"\n');
  console.log('⚠️  IMPORTANT: Keep this key secret! Never commit it to git!\n');

  // Also show public key for verification
  const { Keypair } = require('@solana/web3.js');
  const keypair = Keypair.fromSecretKey(secretKey);
  console.log('Public Key (for verification): ' + keypair.publicKey.toString() + '\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nUsage:');
  console.error('  node scripts/export-wallet-key.js');
  console.error('  node scripts/export-wallet-key.js /path/to/wallet.json');
  process.exit(1);
}
