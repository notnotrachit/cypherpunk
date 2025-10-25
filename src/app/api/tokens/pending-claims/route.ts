import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getRpcUrl, PROGRAM_ID } from "@/lib/solana-program";

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from headers (set by middleware)
    const walletAddress = request.headers.get("x-wallet-address");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("PENDING-CLAIMS: Checking for wallet:", walletAddress);

    // Get user's social links
    const userPubkey = new PublicKey(walletAddress);
    const connection = new Connection(getRpcUrl(), "confirmed");

    // Get social link PDA
    const [socialLinkPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("social_link"), userPubkey.toBuffer()],
      PROGRAM_ID
    );

    // Fetch social link account
    const socialLinkAccount = await connection.getAccountInfo(socialLinkPDA);

    if (!socialLinkAccount) {
      return NextResponse.json({
        claims: [],
        message: "No social accounts linked",
      });
    }

    // Decode social link data
    // Skip discriminator (8 bytes)
    const data = socialLinkAccount.data;
    
    // Parse: owner (32 bytes), twitter (4 + string), instagram (4 + string), linkedin (4 + string), bump (1 byte)
    let offset = 8 + 32; // Skip discriminator and owner

    // Read twitter
    const twitterLength = data.readUInt32LE(offset);
    offset += 4;
    const twitter = data.slice(offset, offset + twitterLength).toString("utf-8");
    offset += twitterLength;

    // Read instagram
    const instagramLength = data.readUInt32LE(offset);
    offset += 4;
    const instagram = data.slice(offset, offset + instagramLength).toString("utf-8");
    offset += instagramLength;

    // Read linkedin
    const linkedinLength = data.readUInt32LE(offset);
    offset += 4;
    const linkedin = data.slice(offset, offset + linkedinLength).toString("utf-8");

    const handles = [twitter, instagram, linkedin].filter((h) => h && h.length > 0);

    console.log("PENDING-CLAIMS: Found handles:", handles);

    if (handles.length === 0) {
      return NextResponse.json({
        claims: [],
        message: "No social accounts linked",
      });
    }

    // Check for pending claims for each handle
    const claims = [];

    for (const handle of handles) {
      const [pendingClaimPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("pending_claim"), Buffer.from(handle)],
        PROGRAM_ID
      );

      const accountInfo = await connection.getAccountInfo(pendingClaimPDA);

      if (accountInfo) {
        try {
          // Decode the account data
          // New structure: discriminator (8) + social_handle (4 + string) + amount (8) + claimed (1) + payment_count (8) + bump (1)
          const claimData = accountInfo.data;

          console.log("PENDING-CLAIMS: Account data length:", claimData.length);

          // Check if this is an old account structure (without payment_count)
          // Old: discriminator (8) + sender (32) + social_handle (4 + string) + amount (8) + claimed (1) + bump (1)
          // New: discriminator (8) + social_handle (4 + string) + amount (8) + claimed (1) + payment_count (8) + bump (1)
          
          // Try to detect old vs new structure by checking data length
          const handleLength = claimData.readUInt32LE(8);
          
          // Validate handleLength is reasonable
          if (handleLength > 30 || handleLength < 1) {
            console.error("PENDING-CLAIMS: Invalid handle length:", handleLength);
            console.error("PENDING-CLAIMS: This is likely an old account format created before the contract upgrade");
            console.error("PENDING-CLAIMS: Account needs to be migrated or closed");
            
            // Skip old accounts silently for now
            console.log("PENDING-CLAIMS: Skipping old format account for handle:", handle);
            continue;
          }

          const socialHandle = claimData
            .slice(12, 12 + handleLength)
            .toString("utf-8");
          const amountOffset = 12 + handleLength;
          
          // Check if we have enough data
          if (amountOffset + 17 > claimData.length) {
            console.error("PENDING-CLAIMS: Account data too short for new structure, might be old format - skipping");
            continue;
          }

          const amount = Number(claimData.readBigUInt64LE(amountOffset));
          const claimed = claimData[amountOffset + 8] === 1;
          const paymentCount = Number(claimData.readBigUInt64LE(amountOffset + 9));

          console.log("PENDING-CLAIMS: Found claim for", socialHandle, "Amount:", amount, "Claimed:", claimed, "Payment count:", paymentCount);

        if (!claimed) {
          // Get the most recent payment record to show sender
          let mostRecentSender = "Unknown";
          if (paymentCount > 0) {
            try {
              const lastPaymentIndex = paymentCount - 1;
              const paymentIndexBuffer = Buffer.alloc(8);
              paymentIndexBuffer.writeBigUInt64LE(BigInt(lastPaymentIndex), 0);
              
              const [paymentRecordPDA] = PublicKey.findProgramAddressSync(
                [Buffer.from("payment_record"), Buffer.from(socialHandle), paymentIndexBuffer],
                PROGRAM_ID
              );
              
              const paymentRecordInfo = await connection.getAccountInfo(paymentRecordPDA);
              if (paymentRecordInfo) {
                const sender = new PublicKey(paymentRecordInfo.data.slice(8, 40));
                mostRecentSender = sender.toString();
              }
            } catch (err) {
              console.error("Error fetching most recent sender:", err);
            }
          }

          claims.push({
            handle: socialHandle,
            amount: amount,
            sender: mostRecentSender,
            paymentCount: paymentCount,
            pda: pendingClaimPDA.toString(),
          });
        }
        } catch (err: any) {
          console.error("PENDING-CLAIMS: Error parsing claim data:", err.message);
          console.error("PENDING-CLAIMS: This might be an old account format - skipping");
          continue;
        }
      }
    }

    return NextResponse.json({
      claims,
      message: claims.length > 0 ? `Found ${claims.length} pending claim(s)` : "No pending claims",
    });
  } catch (error: any) {
    console.error("PENDING-CLAIMS: Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check pending claims" },
      { status: 500 }
    );
  }
}
