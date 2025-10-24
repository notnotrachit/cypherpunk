import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);

  const res = NextResponse.json({ ok: true }, { status: 200 });

  // Clear the session cookie
  res.cookies.set("session", "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Also clear any pending login nonce (if present)
  res.cookies.set("login_nonce", "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
