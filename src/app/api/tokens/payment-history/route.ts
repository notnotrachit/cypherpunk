import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getRpcUrl, PROGRAM_ID } from "@/lib/solana-program";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("x-wallet-address");

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle");

    if (!handle) {
      return NextResponse.json(
        { error: "Handle parameter required" },
        { status: 400 }
      );
    }

    console.log("PAYMENT-HISTORY: Fetching for handle:", handle);

    const connection = new Connection(getRpcUrl(), "confirmed");

    // First, get the pending claim to know how many payments exist
    const [pendingClaimPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("pending_claim"), Buffer.from(handle)],
      PROGRAM_ID
    );

    const pendingClaimInfo = await connection.getAccountInfo(pendingClaimPDA);

    if (!pendingClaimInfo) {
      console.log("PAYMENT-HISTORY: No pending claim found");
      return NextResponse.json({
        handle,
        payments: [],
        total: 0,
      });
    }

    // Parse payment_count from the account data
    const data = pendingClaimInfo.data;
    const handleLength = data.readUInt32LE(8);
    const paymentCountOffset = 8 + 4 + handleLength + 8 + 1;
    const paymentCount = Number(data.readBigUInt64LE(paymentCountOffset));

    console.log(`PAYMENT-HISTORY: Found ${paymentCount} payment(s)`);

    // Fetch all payment records
    const payments = [];

    for (let i = 0; i < paymentCount; i++) {
      try {
        const paymentIndexBuffer = Buffer.alloc(8);
        paymentIndexBuffer.writeBigUInt64LE(BigInt(i), 0);

        const [paymentRecordPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("payment_record"), Buffer.from(handle), paymentIndexBuffer],
          PROGRAM_ID
        );

        const paymentRecordInfo = await connection.getAccountInfo(paymentRecordPDA);

        if (paymentRecordInfo) {
          // Parse payment record data
          // Structure: discriminator (8) + sender (32) + social_handle (4 + string) + amount (8) + timestamp (8) + claimed (1) + bump (1)
          const recordData = paymentRecordInfo.data;
          
          const sender = new PublicKey(recordData.slice(8, 40));
          const recordHandleLength = recordData.readUInt32LE(40);
          const amountOffset = 40 + 4 + recordHandleLength;
          const amount = Number(recordData.readBigUInt64LE(amountOffset));
          const timestamp = Number(recordData.readBigInt64LE(amountOffset + 8));
          const claimed = recordData[amountOffset + 16] === 1;

          payments.push({
            index: i,
            sender: sender.toString(),
            amount: amount / 1_000_000, // Convert to USDC
            timestamp,
            claimed,
            pda: paymentRecordPDA.toString(),
          });
        }
      } catch (err) {
        console.error(`Error fetching payment record ${i}:`, err);
        continue;
      }
    }

    // Sort by timestamp descending (newest first)
    payments.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`PAYMENT-HISTORY: Retrieved ${payments.length} payment records`);

    return NextResponse.json({
      handle,
      payments,
      total: payments.reduce((sum, p) => sum + p.amount, 0),
    });
  } catch (error: any) {
    console.error("PAYMENT-HISTORY: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
