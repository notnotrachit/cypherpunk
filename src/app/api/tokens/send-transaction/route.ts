import { NextRequest, NextResponse } from "next/server";
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Keypair
} from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { getRpcUrl, PROGRAM_ID } from "@/lib/solana-program";
import bs58 from "bs58";

export async function POST(request: NextRequest) {
  try {
    console.log("SEND-TX: Received request");
    
    const body = await request.json();
    console.log("SEND-TX: Request body:", body);
    
    const { senderWallet, recipientWallet, mint, amount, signedTransaction } = body;

    if (!senderWallet || !recipientWallet || !mint || !amount || !signedTransaction) {
      console.error("SEND-TX: Missing parameters");
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("SEND-TX: Connecting to RPC:", getRpcUrl());
    const connection = new Connection(getRpcUrl(), "confirmed");

    // Decode the signed transaction
    const transactionBytes = bs58.decode(signedTransaction);
    const transaction = Transaction.from(transactionBytes);

    console.log("SEND-TX: Sending transaction to network...");
    
    // Send the transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log("SEND-TX: Transaction sent:", signature);

    // Wait for confirmation
    console.log("SEND-TX: Waiting for confirmation...");
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
    }

    console.log("SEND-TX: Transaction confirmed");

    return NextResponse.json({
      signature,
      confirmed: true,
      message: 'Transaction confirmed successfully',
    });
  } catch (error: any) {
    console.error("SEND-TX: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send transaction" },
      { status: 500 }
    );
  }
}
