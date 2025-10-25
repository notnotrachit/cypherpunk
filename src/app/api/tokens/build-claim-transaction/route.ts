import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getRpcUrl, PROGRAM_ID, getConfigPDA } from "@/lib/solana-program";
import bs58 from "bs58";

const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

export async function POST(request: NextRequest) {
  try {
    // Get wallet address from headers (set by middleware)
    const walletAddress = request.headers.get("x-wallet-address");

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { socialHandle } = body;

    if (!socialHandle) {
      return NextResponse.json(
        { error: "Missing socialHandle parameter" },
        { status: 400 }
      );
    }

    console.log("BUILD-CLAIM-TX: Processing claim for", socialHandle, "by", walletAddress);

    const connection = new Connection(getRpcUrl(), "confirmed");
    const claimerPubkey = new PublicKey(walletAddress);

    // Get PDAs
    const [socialLinkPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("social_link"), claimerPubkey.toBuffer()],
      PROGRAM_ID
    );

    const [pendingClaimPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
      PROGRAM_ID
    );

    const configPDA = getConfigPDA();

    // Get token accounts
    const escrowTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      configPDA,
      true // allowOwnerOffCurve
    );

    const claimerTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      claimerPubkey
    );

    // Check if claimer token account exists
    const claimerAccountInfo = await connection.getAccountInfo(claimerTokenAccount);
    if (!claimerAccountInfo) {
      return NextResponse.json(
        { error: "You need to create a USDC token account first. Please initialize your USDC account." },
        { status: 400 }
      );
    }

    // Get pending claim info to get the amount
    const pendingClaimInfo = await connection.getAccountInfo(pendingClaimPDA);
    if (!pendingClaimInfo) {
      return NextResponse.json(
        { error: "No pending claim found for this handle" },
        { status: 404 }
      );
    }

    // Parse amount from pending claim
    // New structure: discriminator (8) + social_handle (4 + string) + amount (8) + claimed (1) + payment_count (8) + bump (1)
    const claimData = pendingClaimInfo.data;
    const handleLength = claimData.readUInt32LE(8); // After discriminator
    const amountOffset = 8 + 4 + handleLength;
    const amount = Number(claimData.readBigUInt64LE(amountOffset));

    console.log("BUILD-CLAIM-TX: Amount to claim:", amount);

    // Build instruction data
    const discriminator = Buffer.from([116, 206, 27, 191, 166, 19, 0, 73]); // claim_token discriminator
    const handleBytes = Buffer.from(socialHandle, "utf-8");
    const handleLengthBuffer = Buffer.alloc(4);
    handleLengthBuffer.writeUInt32LE(handleBytes.length, 0);
    const instructionData = Buffer.concat([
      discriminator,
      handleLengthBuffer,
      handleBytes,
    ]);

    // Build transaction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: claimerPubkey, isSigner: true, isWritable: true },
        { pubkey: socialLinkPDA, isSigner: false, isWritable: false },
        { pubkey: pendingClaimPDA, isSigner: false, isWritable: true },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: claimerTokenAccount, isSigner: false, isWritable: true },
        { pubkey: configPDA, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    });

    const transaction = new Transaction().add(instruction);
    
    // Get recent blockhash with finalized commitment to ensure fresh blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = claimerPubkey;

    console.log("BUILD-CLAIM-TX: Using blockhash:", blockhash, "Valid until block:", lastValidBlockHeight);

    // Serialize transaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const transactionBase58 = bs58.encode(serialized);

    console.log("BUILD-CLAIM-TX: Transaction built successfully");

    return NextResponse.json({
      transaction: transactionBase58,
      amount,
      message: `Ready to claim ${amount / 1_000_000} USDC`,
    });
  } catch (error: any) {
    console.error("BUILD-CLAIM-TX: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to build claim transaction" },
      { status: 500 }
    );
  }
}
