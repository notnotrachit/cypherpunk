import { NextRequest, NextResponse } from "next/server";
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram
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
    console.log("BUILD-TX: Received request");
    
    const body = await request.json();
    console.log("BUILD-TX: Request body:", body);
    
    const { senderWallet, recipientWallet, mint, amount } = body;

    if (!senderWallet || !recipientWallet || !mint || !amount) {
      console.error("BUILD-TX: Missing parameters");
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("BUILD-TX: Connecting to RPC:", getRpcUrl());
    const connection = new Connection(getRpcUrl(), "confirmed");

    // Create public keys
    const senderPubkey = new PublicKey(senderWallet);
    const recipientPubkey = new PublicKey(recipientWallet);
    const mintPubkey = new PublicKey(mint);

    // Get ATAs
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      senderPubkey
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      recipientPubkey
    );

    console.log("BUILD-TX: Sender ATA:", senderTokenAccount.toString());
    console.log("BUILD-TX: Recipient ATA:", recipientTokenAccount.toString());

    // Check if accounts exist
    const senderAccountInfo = await connection.getAccountInfo(senderTokenAccount);
    const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);

    if (!senderAccountInfo) {
      return NextResponse.json(
        { error: "Sender token account does not exist. Please create a USDC account first." },
        { status: 400 }
      );
    }

    // Create transaction
    const transaction = new Transaction();

    // If recipient token account doesn't exist, add instruction to create it
    if (!recipientAccountInfo) {
      console.log("BUILD-TX: Adding create ATA instruction");
      const createAtaIx = createAssociatedTokenAccountInstruction(
        senderPubkey, // payer
        recipientTokenAccount, // ata
        recipientPubkey, // owner
        mintPubkey, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      transaction.add(createAtaIx);
    }

    // Build send_token instruction
    console.log("BUILD-TX: Building send_token instruction");
    
    // Instruction discriminator for send_token (from IDL)
    const discriminator = Buffer.from([157, 183, 177, 53, 196, 251, 54, 185]);
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(amount));
    const instructionData = Buffer.concat([discriminator, amountBuffer]);

    const sendTokenIx = new TransactionInstruction({
      keys: [
        { pubkey: senderPubkey, isSigner: true, isWritable: true },
        { pubkey: senderTokenAccount, isSigner: false, isWritable: true },
        { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
        { pubkey: recipientPubkey, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    transaction.add(sendTokenIx);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;

    // Serialize transaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log("BUILD-TX: Transaction built successfully");

    // Convert to base58 (Phantom expects base58)
    const transactionBase58 = bs58.encode(serialized);

    return NextResponse.json({
      transaction: transactionBase58,
      message: recipientAccountInfo ? 'Transaction ready' : 'Will create recipient token account',
    });
  } catch (error: any) {
    console.error("BUILD-TX: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to build transaction" },
      { status: 500 }
    );
  }
}
