import { NextResponse } from "next/server";
import { findWalletBySocialHandle } from "@/lib/solana-program";

export const dynamic = "force-dynamic";

/**
 * Find wallet address by social handle
 * GET /api/social/find-wallet?handle=@username&platform=twitter
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get("handle");
    const platform = searchParams.get("platform");

    if (!handle) {
      return NextResponse.json(
        { error: "Missing required parameter: handle" },
        { status: 400 },
      );
    }

    if (platform && platform !== "twitter") {
      return NextResponse.json(
        { error: "Invalid platform. Only twitter is supported" },
        { status: 400 },
      );
    }

    const wallet = await findWalletBySocialHandle(handle, "twitter");

    if (!wallet) {
      return NextResponse.json({
        found: false,
        handle,
        platform: "twitter",
        wallet: null,
      });
    }

    return NextResponse.json({
      found: true,
      handle,
      platform: "twitter",
      wallet: wallet.toString(),
    });
  } catch (error: unknown) {
    console.error("Find wallet error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to find wallet";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
