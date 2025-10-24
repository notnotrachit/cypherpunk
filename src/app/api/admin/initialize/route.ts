import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/auth";
import { initializeProgram } from "@/lib/solana-program";
import { getAdminWallet } from "@/lib/wallet";

export const dynamic = "force-dynamic";

/**
 * Initialize the Solana program (admin only, run once)
 * POST /api/admin/initialize
 */
export async function POST(req: Request) {
  try {
    // Verify admin session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await verifySessionJwt(sessionToken);
    const adminAddress = payload.sub;

    // Load admin wallet from environment variable
    const adminWallet = getAdminWallet();

    // Verify the session user is the admin
    if (adminWallet.publicKey.toString() !== adminAddress) {
      return NextResponse.json({ error: "Unauthorized: Admin only" }, { status: 403 });
    }

    // Initialize the program
    const tx = await initializeProgram(adminWallet);

    return NextResponse.json({
      success: true,
      transaction: tx,
      message: "Program initialized successfully",
    });
  } catch (error: any) {
    console.error("Initialize error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize program" },
      { status: 500 }
    );
  }
}
