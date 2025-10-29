import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { verifyTwitterOAuth } from "@/lib/twitter-oauth";
import { linkTwitterAccount } from "@/lib/solana-program";
import { PublicKey } from "@solana/web3.js";
import { getAdminWallet } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/**
 * Verify Twitter OAuth code and return user info
 * This endpoint is called by the mobile app after OAuth authorization
 *
 * Flow:
 * 1. Mobile app sends authorization code + wallet address
 * 2. Backend exchanges code for access token (using Client Secret)
 * 3. Backend fetches verified user info from Twitter
 * 4. Backend links Twitter to wallet on blockchain
 * 5. Backend returns verified info to mobile app
 */
export async function POST(request: NextRequest) {
  try {
    const { code, redirectUrl, codeVerifier, walletAddress } = await request.json();

    if (!code || !redirectUrl) {
      return NextResponse.json(
        { error: "Missing code or redirectUrl" },
        { status: 400 }
      );
    }

    console.log("[Twitter OAuth] Verifying authorization code...");
    console.log("[Twitter OAuth] Code verifier present:", !!codeVerifier);
    console.log("[Twitter OAuth] Wallet address present:", !!walletAddress);

    // Verify OAuth code and get user info using mobile app credentials
    const userInfo = await verifyTwitterOAuth(code, redirectUrl, codeVerifier, true);

    console.log(
      `[Twitter OAuth] Successfully verified: @${userInfo.username} (${userInfo.name})`
    );

    // Link to blockchain if wallet address provided
    let blockchainTx: string | null = null;
    if (walletAddress) {
      try {
        console.log("[Blockchain] Linking Twitter to wallet on-chain...");
        
        const targetWallet = new PublicKey(walletAddress);
        const adminWallet = getAdminWallet();
        
        blockchainTx = await linkTwitterAccount(
          adminWallet,
          targetWallet,
          `@${userInfo.username}`,
          userInfo.profileImageUrl
        );
        
        console.log("[Blockchain] Successfully linked Twitter to wallet");
        console.log("[Blockchain] Transaction:", blockchainTx);
      } catch (error) {
        console.error("[Blockchain] Error linking to wallet:", error);
        // Don't fail the whole request if blockchain linking fails
        // The Twitter verification was successful
      }
    }

    // Return verified info to mobile app
    return NextResponse.json({
      username: userInfo.username,
      name: userInfo.name,
      profileImageUrl: userInfo.profileImageUrl,
      walletAddress: walletAddress || undefined,
      blockchainTx: blockchainTx || undefined,
    });
  } catch (error: unknown) {
    console.error("[Twitter OAuth] Error:", error);

    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data as Record<string, unknown>;
      const errorMessage =
        (errorData?.error_description as string) ||
        (errorData?.error as string) ||
        error.message;

      console.error("[Twitter OAuth] Twitter API error:", errorMessage);

      return NextResponse.json(
        { error: `Twitter verification failed: ${errorMessage}` },
        { status: error.response?.status || 500 }
      );
    }

    const message = error instanceof Error ? error.message : "OAuth verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
