import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { getRpcUrl } from "@/lib/solana-program";

export async function POST(request: NextRequest) {
  try {
    console.log("GET-ACCOUNTS: Received request");
    
    const body = await request.json();
    console.log("GET-ACCOUNTS: Request body:", body);
    
    const { senderWallet, recipientWallet, mint } = body;

    if (!senderWallet || !recipientWallet || !mint) {
      console.error("GET-ACCOUNTS: Missing parameters", { senderWallet, recipientWallet, mint });
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("GET-ACCOUNTS: Connecting to RPC:", getRpcUrl());
    const connection = new Connection(getRpcUrl(), "confirmed");

    // Get associated token addresses
    console.log("GET-ACCOUNTS: Creating public keys");
    const senderPubkey = new PublicKey(senderWallet);
    const recipientPubkey = new PublicKey(recipientWallet);
    const mintPubkey = new PublicKey(mint);

    console.log("GET-ACCOUNTS: Getting ATAs");
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      senderPubkey
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      recipientPubkey
    );

    console.log("GET-ACCOUNTS: Sender ATA:", senderTokenAccount.toString());
    console.log("GET-ACCOUNTS: Recipient ATA:", recipientTokenAccount.toString());

    // Check if accounts exist
    console.log("GET-ACCOUNTS: Checking if accounts exist");
    const senderAccountInfo = await connection.getAccountInfo(senderTokenAccount);
    const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);

    if (!senderAccountInfo) {
      console.error("GET-ACCOUNTS: Sender token account does not exist");
      return NextResponse.json(
        { error: "Sender token account does not exist. Please create a USDC account first." },
        { status: 400 }
      );
    }

    let needsRecipientAccountCreation = false;
    if (!recipientAccountInfo) {
      console.log("GET-ACCOUNTS: Recipient token account does not exist, will need to create it");
      needsRecipientAccountCreation = true;
    }

    console.log("GET-ACCOUNTS: Success, returning accounts");
    return NextResponse.json({
      senderTokenAccount: senderTokenAccount.toString(),
      recipientTokenAccount: recipientTokenAccount.toString(),
      needsRecipientAccountCreation,
      recipientPubkey: recipientWallet,
      mintPubkey: mint,
    });
  } catch (error: any) {
    console.error("GET-ACCOUNTS: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get token accounts" },
      { status: 500 }
    );
  }
}
