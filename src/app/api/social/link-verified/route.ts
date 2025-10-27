import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/auth";
import { linkTwitterAccount } from "@/lib/solana-program";
import { PublicKey } from "@solana/web3.js";
import { getAdminWallet } from "@/lib/wallet";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

/**
 * Link verified social account to blockchain
 * Requires both Phantom wallet session AND NextAuth social session
 */
export async function POST() {
  try {
    // Check Phantom wallet session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Please login with Phantom wallet first" },
        { status: 401 },
      );
    }

    const { payload } = await verifySessionJwt(sessionToken);
    const walletAddress = payload.sub;

    // Check NextAuth social session
    const socialSession = await getServerSession(authOptions);

    if (!socialSession || !socialSession.provider || !socialSession.username) {
      return NextResponse.json(
        { error: "No social account authenticated" },
        { status: 401 },
      );
    }

    const { provider, username, user } = socialSession;
    const handle = username.startsWith("@") ? username : `@${username}`;
    const profileImageUrl = user?.image ?? "";

    // Link to blockchain
    const adminWallet = getAdminWallet();
    const userWallet = new PublicKey(walletAddress);

    let tx: string;

    if (provider === "twitter") {
      tx = await linkTwitterAccount(adminWallet, userWallet, handle, profileImageUrl);
    } else {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      platform: provider,
      handle,
      transaction: tx,
      message: `${provider} account linked successfully!`,
    });
  } catch (error: unknown) {
    console.error("Link verified error:", error);
    const message = error instanceof Error ? error.message : "Failed to link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
