import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJwt, type SessionTokenPayload } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function GET(req: Request) {
  // First try cookie-based auth
  const cookieStore = await cookies();
  let token = cookieStore.get("session")?.value;

  // Fallback to Authorization: Bearer <token>
  if (!token) {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer (.+)$/i);
    if (match) token = match[1];
  }

  if (!token) {
    return unauthorized("Missing session token");
  }

  try {
    const { payload } = await verifySessionJwt<SessionTokenPayload>(token);

    // jose already validates expiration and signature.
    const address = payload.sub;
    const nonce = payload.nonce;
    const iat = payload.iat; // seconds since epoch (number), if present
    const exp = payload.exp; // seconds since epoch (number), if present

    return NextResponse.json(
      {
        ok: true,
        address,
        nonce,
        iat,
        exp,
        // Convenience ISO timestamp for clients
        expiresAt:
          typeof exp === "number" ? new Date(exp * 1000).toISOString() : null,
        message: "You have accessed a protected resource.",
      },
      { status: 200 },
    );
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Invalid or expired session token";
    return unauthorized(msg);
  }
}
