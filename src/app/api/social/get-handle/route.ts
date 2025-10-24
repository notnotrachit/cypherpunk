import { NextResponse } from "next/server";
import {
  getLinkedInHandle,
  getTwitterHandle,
  getInstagramHandle,
} from "@/lib/solana-program";
import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

/**
 * Get a specific social handle for a wallet
 * GET /api/social/get-handle?wallet=<ADDRESS>&platform=linkedin
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");
    const platform = searchParams.get("platform");

    if (!wallet || !platform) {
      return NextResponse.json(
        { error: "Missing required parameters: wallet, platform" },
        { status: 400 }
      );
    }

    if (!["twitter", "instagram", "linkedin"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Must be twitter, instagram, or linkedin" },
        { status: 400 }
      );
    }

    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    let handle: string | null = null;

    switch (platform) {
      case "twitter":
        handle = await getTwitterHandle(walletPubkey);
        break;
      case "instagram":
        handle = await getInstagramHandle(walletPubkey);
        break;
      case "linkedin":
        handle = await getLinkedInHandle(walletPubkey);
        break;
    }

    if (!handle) {
      return NextResponse.json({
        linked: false,
        wallet,
        platform,
        handle: null,
      });
    }

    return NextResponse.json({
      linked: true,
      wallet,
      platform,
      handle,
    });
  } catch (error: any) {
    console.error("Get handle error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get handle" },
      { status: 500 }
    );
  }
}
