import { NextResponse } from "next/server";
import { getSocialLink } from "@/lib/solana-program";
import { PublicKey } from "@solana/web3.js";

export const dynamic = "force-dynamic";

/**
 * Get social links for a wallet
 * GET /api/social/get?wallet=<WALLET_ADDRESS>
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Missing wallet parameter" },
        { status: 400 },
      );
    }

    let walletPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 },
      );
    }

    const socialLink = await getSocialLink(walletPubkey);

    if (!socialLink) {
      return NextResponse.json({
        linked: false,
        wallet,
        socials: null,
      });
    }

    return NextResponse.json({
      linked: true,
      wallet,
      socials: {
        twitter: socialLink.twitter || null,
      },
    });
  } catch (error: unknown) {
    console.error("Get social links error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch social links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
