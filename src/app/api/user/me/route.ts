import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Get current user info
 * GET /api/user/me
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await verifySessionJwt(sessionToken);

    return NextResponse.json({
      wallet: payload.sub,
      nonce: payload.nonce,
      exp: payload.exp,
      iat: payload.iat,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 }
    );
  }
}
