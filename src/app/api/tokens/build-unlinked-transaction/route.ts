import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getRpcUrl, PROGRAM_ID, getConfigPDA } from "@/lib/solana-program";
import bs58 from "bs58";

export async function POST(request: NextRequest) {
  try {
    console.log("BUILD-UNLINKED-TX: Received request");

    const body = await request.json();
    console.log("BUILD-UNLINKED-TX: Request body:", body);

    const { senderWallet, socialHandle, mint, amount } = body;

    if (!senderWallet || !socialHandle || !mint || !amount) {
      console.error("BUILD-UNLINKED-TX: Missing parameters");
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("BUILD-UNLINKED-TX: Connecting to RPC:", getRpcUrl());
    const connection = new Connection(getRpcUrl(), "confirmed");

    // Create public keys
    const senderPubkey = new PublicKey(senderWallet);
    const mintPubkey = new PublicKey(mint);
    const configPDA = getConfigPDA();

    // Get sender's token account
    const senderTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      senderPubkey
    );

    // Get escrow token account (owned by config PDA)
    // PDAs need allowOwnerOffCurve: true
    const escrowTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      configPDA,
      true // allowOwnerOffCurve
    );

    console.log("BUILD-UNLINKED-TX: Sender ATA:", senderTokenAccount.toString());
    console.log("BUILD-UNLINKED-TX: Escrow ATA:", escrowTokenAccount.toString());

    // Check if sender account exists
    const senderAccountInfo = await connection.getAccountInfo(
      senderTokenAccount
    );

    if (!senderAccountInfo) {
      return NextResponse.json(
        {
          error:
            "Sender token account does not exist. Please create a USDC account first.",
        },
        { status: 400 }
      );
    }

    // Check if escrow account exists
    const escrowAccountInfo = await connection.getAccountInfo(
      escrowTokenAccount
    );

    console.log("BUILD-UNLINKED-TX: Escrow account exists:", !!escrowAccountInfo);

    // Derive pending claim PDA
    const [pendingClaimPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
      PROGRAM_ID
    );

    console.log("BUILD-UNLINKED-TX: Pending claim PDA:", pendingClaimPDA.toString());

    // Get the current payment count to determine the payment index
    let paymentIndex = 0;
    const pendingClaimInfo = await connection.getAccountInfo(pendingClaimPDA);
    
    if (pendingClaimInfo) {
      // Parse payment_count from the account data
      // Structure: discriminator (8) + social_handle (4 + string) + amount (8) + claimed (1) + payment_count (8) + bump (1)
      const data = pendingClaimInfo.data;
      const handleLength = data.readUInt32LE(8);
      const paymentCountOffset = 8 + 4 + handleLength + 8 + 1;
      paymentIndex = Number(data.readBigUInt64LE(paymentCountOffset));
      console.log("BUILD-UNLINKED-TX: Current payment count:", paymentIndex);
    }

    // Derive payment record PDA
    const paymentIndexBuf = Buffer.alloc(8);
    paymentIndexBuf.writeBigUInt64LE(BigInt(paymentIndex), 0);
    
    const [paymentRecordPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("payment_record"), Buffer.from(socialHandle), paymentIndexBuf],
      PROGRAM_ID
    );

    console.log("BUILD-UNLINKED-TX: Payment record PDA:", paymentRecordPDA.toString(), "Index:", paymentIndex);

    // Create transaction
    const transaction = new Transaction();

    // If escrow account doesn't exist, we need to create it first
    // Note: This should be done by the admin during setup
    if (!escrowAccountInfo) {
      console.error("BUILD-UNLINKED-TX: Escrow account does not exist");
      return NextResponse.json(
        {
          error:
            "Escrow account not initialized. The admin needs to set up the escrow account first. Please try again later or contact support.",
        },
        { status: 400 }
      );
    }

    // Build send_token_to_unlinked instruction
    console.log("BUILD-UNLINKED-TX: Building send_token_to_unlinked instruction");

    // Instruction discriminator for send_token_to_unlinked (from IDL)
    const discriminator = Buffer.from([64, 140, 178, 112, 10, 168, 2, 48]);

    // Encode social handle as Borsh string (4 bytes length + UTF-8 bytes)
    const handleBytes = Buffer.from(socialHandle, 'utf-8');
    const handleLengthBuffer = Buffer.alloc(4);
    handleLengthBuffer.writeUInt32LE(handleBytes.length, 0);

    // Encode amount as u64 little-endian
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(amount), 0);

    // Encode payment_index as u64 little-endian
    const paymentIndexBuffer = Buffer.alloc(8);
    paymentIndexBuffer.writeBigUInt64LE(BigInt(paymentIndex), 0);

    const instructionData = Buffer.concat([
      discriminator,
      handleLengthBuffer,
      handleBytes,
      amountBuffer,
      paymentIndexBuffer,
    ]);

    console.log("BUILD-UNLINKED-TX: Instruction data length:", instructionData.length);
    console.log("BUILD-UNLINKED-TX: Social handle:", socialHandle, "Length:", handleBytes.length, "Payment index:", paymentIndex);

    const sendTokenToUnlinkedIx = new TransactionInstruction({
      keys: [
        { pubkey: senderPubkey, isSigner: true, isWritable: true },
        { pubkey: senderTokenAccount, isSigner: false, isWritable: true },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: pendingClaimPDA, isSigner: false, isWritable: true },
        { pubkey: paymentRecordPDA, isSigner: false, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    transaction.add(sendTokenToUnlinkedIx);

    // Add a memo instruction with timestamp and random nonce to make each transaction unique
    const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    const nonce = Math.random().toString(36).substring(2, 15);
    const memoData = Buffer.from(`Payment:${Date.now()}:${nonce}`);
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: memoData,
    });
    transaction.add(memoInstruction);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;

    console.log("BUILD-UNLINKED-TX: Using blockhash:", blockhash, "Valid until block:", lastValidBlockHeight, "Memo:", memoData.toString());

    // Serialize transaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log("BUILD-UNLINKED-TX: Transaction built successfully");

    // Convert to base58 (Phantom expects base58)
    const transactionBase58 = bs58.encode(serialized);

    return NextResponse.json({
      transaction: transactionBase58,
      message: `USDC will be held in escrow for ${socialHandle} to claim`,
    });
  } catch (error: any) {
    console.error("BUILD-UNLINKED-TX: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to build transaction" },
      { status: 500 }
    );
  }
}
