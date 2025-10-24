import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySignedLogin, signSessionJwt } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

type VerifyRequestBody = {
  address?: string;
  signature?: string; // base58 string
  message?: string;
};

function getHost(headers: Headers): string {
  const xfHost = headers.get("x-forwarded-host");
  const host = xfHost ?? headers.get("host") ?? "localhost:3000";
  return host.split(":")[0];
}

function getProto(headers: Headers): "http" | "https" {
  const xfProto = headers.get("x-forwarded-proto");
  if (xfProto === "http" || xfProto === "https") return xfProto;
  return "https";
}

export async function POST(req: Request) {
  let body: VerifyRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { address, signature, message } = body;

  if (!address || !signature || !message) {
    return NextResponse.json(
      { error: "Missing required fields: address, signature, message" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const nonce = cookieStore.get("login_nonce")?.value;

  if (!nonce) {
    return NextResponse.json(
      { error: "Missing or expired nonce. Please request a new login nonce." },
      { status: 400 },
    );
  }

  const headers = req.headers;
  const domain = getHost(headers);
  const url = new URL(req.url);

  try {
    // Verify message fields, domain, nonce, and signature
    verifySignedLogin({
      message,
      signature,
      address,
      expectedDomain: domain,
      expectedNonce: nonce,
      // 10 minutes max age (match nonce cookie lifetime)
      maxMessageAgeSeconds: 10 * 60,
    });

    // Create a short-lived session token
    const token = await signSessionJwt({
      address,
      nonce,
      // Keep cookie and JWT expiration aligned
      expiresIn: "15m",
    });

    const res = NextResponse.json(
      {
        ok: true,
        address,
      },
      { status: 200 },
    );

    // Clear the one-time nonce cookie to prevent replay
    res.cookies.set("login_nonce", "", {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // Set the session cookie with the JWT
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "lax",
      path: "/",
      // 15 minutes
      maxAge: 15 * 60,
    });

    return res;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Authentication failed";
    const status =
      message.toLowerCase().includes("signature") ||
      message.toLowerCase().includes("mismatch") ||
      message.toLowerCase().includes("invalid")
        ? 401
        : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
