import { NextResponse, type NextRequest } from "next/server";
import { verifySessionJwt, type SessionTokenPayload } from "./lib/auth";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
]);

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  // Common static paths (adjust as needed)
  if (pathname.startsWith("/assets")) return true;
  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/icons")) return true;

  // File extension check (static files)
  if (
    /\.(?:png|jpe?g|gif|svg|ico|webp|avif|css|js|txt|json|map|woff2?|ttf|otf)$/i.test(
      pathname,
    )
  ) {
    return true;
  }
  return false;
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (isStaticAsset(pathname)) return true;

  // Allow unauthenticated access to auth endpoints
  if (pathname.startsWith("/api/auth/")) return true;

  // Allow public API endpoints
  if (pathname === "/api/network-info") return true;
  if (pathname === "/api/social/get") return true;
  if (pathname === "/api/social/get-handle") return true;
  if (pathname === "/api/social/find-wallet") return true;
  if (pathname === "/api/tokens/get-accounts") return true;
  if (pathname === "/api/tokens/build-transaction") return true;
  if (pathname === "/api/tokens/build-unlinked-transaction") return true;
  // Note: build-claim-transaction requires auth, so it's not in this list

  return false;
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Add CORS headers for Chrome extension
  const response = NextResponse.next();

  // Allow requests from Chrome extension
  const origin = req.headers.get('origin');
  if (origin && (origin.includes('chrome-extension://') || origin.includes('twitter.com') || origin.includes('x.com'))) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }

  // Skip protection for public paths
  if (isPublicPath(pathname)) {
    return response;
  }

  const token = req.cookies.get("session")?.value;

  if (!token) {
    // If it's an API route, return 401 JSON; otherwise redirect to home (login)
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: response.headers });
    }
    // Redirect to home page with auth required message
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "required");
    return NextResponse.redirect(url);
  }

  try {
    const { payload } = await verifySessionJwt<SessionTokenPayload>(token);

    // Pass along useful auth context to downstream handlers via headers
    const requestHeaders = new Headers(req.headers);
    if (payload.sub)
      requestHeaders.set("x-wallet-address", String(payload.sub));
    if (payload.exp) requestHeaders.set("x-session-exp", String(payload.exp));
    if (payload.iat) requestHeaders.set("x-session-iat", String(payload.iat));
    if (payload.nonce)
      requestHeaders.set("x-session-nonce", String(payload.nonce));

    const newResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Copy CORS headers to the new response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  } catch {
    // Invalid or expired token
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401, headers: response.headers }
      );
    }
    // Redirect to home page with expired message
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "expired");
    return NextResponse.redirect(url);
  }
}

// Exclude Next.js internal assets by default; other exclusions handled in code.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
