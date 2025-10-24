import { NextResponse } from "next/server";
import { buildSignInMessage, createNonce } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

function getHost(headers: Headers): string {
  const xfHost = headers.get("x-forwarded-host");
  const host = xfHost ?? headers.get("host") ?? "localhost:3000";
  // Strip port for the domain field
  return host.split(":")[0];
}

function getProto(headers: Headers): "http" | "https" {
  const xfProto = headers.get("x-forwarded-proto");
  if (xfProto === "http" || xfProto === "https") return xfProto;
  // Assume https in production-ish environments
  return "https";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const headers = req.headers;

  const address = url.searchParams.get("address") ?? undefined;
  const statement =
    url.searchParams.get("statement") ??
    "Please sign this message to authenticate with the application.";
  const chainId = url.searchParams.get("chainId") ?? "solana:mainnet";

  const nonce = createNonce();
  const domain = getHost(headers);
  const proto = getProto(headers);

  const payload: Record<string, unknown> = {
    nonce,
    domain,
  };

  // If a wallet address is provided, return a ready-to-sign message too
  if (address) {
    const message = buildSignInMessage({
      domain,
      address,
      statement,
      chainId,
      uri: `${proto}://${domain}`,
      nonce,
    });
    payload.message = message;
    payload.address = address;
    payload.chainId = chainId;
  }

  const res = NextResponse.json(payload, {
    status: 200,
  });

  // Bind the nonce to the browser via an HttpOnly cookie so the backend
  // can verify it during the signature verification step
  res.cookies.set("login_nonce", nonce, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  });

  return res;
}
