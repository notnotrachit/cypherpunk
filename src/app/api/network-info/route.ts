import { NextResponse } from "next/server";
import { getNetworkName, getRpcUrl, PROGRAM_ID } from "@/lib/solana-program";

export const dynamic = "force-dynamic";

/**
 * Get network information
 * GET /api/network-info
 */
export async function GET() {
  try {
    const network = getNetworkName();
    const rpcUrl = getRpcUrl();
    const programId = PROGRAM_ID.toString();

    return NextResponse.json({
      network,
      rpcUrl,
      programId,
      explorerUrl: `https://explorer.solana.com/address/${programId}?cluster=${network.toLowerCase()}`,
    });
  } catch (error: unknown) {
    console.error("Network info error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to get network info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
