import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/auth";
import {
  linkTwitterAccount,
  linkInstagramAccount,
  linkLinkedinAccount,
} from "@/lib/solana-program";
import { PublicKey } from "@solana/web3.js";
import { getAdminWallet } from "@/lib/wallet";

export const dynamic = "force-dynamic";

type LinkSocialRequest = {
  platform: "twitter" | "instagram" | "linkedin";
  handle: string;
  userWallet?: string; // Optional: if linking for another user (admin only)
};

/**
 * Link a social account to a wallet
 * POST /api/social/link
 * 
 * Body: { platform: "twitter" | "instagram" | "linkedin", handle: string, userWallet?: string }
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await verifySessionJwt(sessionToken);
    const userAddress = payload.sub;

    const body: LinkSocialRequest = await req.json();
    const { platform, handle, userWallet } = body;

    if (!platform || !handle) {
      return NextResponse.json(
        { error: "Missing required fields: platform, handle" },
        { status: 400 }
      );
    }

    if (!["twitter", "instagram", "linkedin"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Must be twitter, instagram, or linkedin" },
        { status: 400 }
      );
    }

    // Load admin wallet from environment variable
    const adminWallet = getAdminWallet();

    // Determine which wallet to link
    // If userWallet is provided and caller is admin, link that wallet
    // Otherwise, link the caller's wallet
    const targetWallet = userWallet
      ? new PublicKey(userWallet)
      : new PublicKey(userAddress);

    // Call the appropriate linking function
    let tx: string;
    switch (platform) {
      case "twitter":
        tx = await linkTwitterAccount(adminWallet, targetWallet, handle);
        break;
      case "instagram":
        tx = await linkInstagramAccount(adminWallet, targetWallet, handle);
        break;
      case "linkedin":
        tx = await linkLinkedinAccount(adminWallet, targetWallet, handle);
        break;
      default:
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      transaction: tx,
      platform,
      handle,
      wallet: targetWallet.toString(),
      message: `${platform} account linked successfully`,
    });
  } catch (error: any) {
    console.error("Link social error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to link social account" },
      { status: 500 }
    );
  }
}
