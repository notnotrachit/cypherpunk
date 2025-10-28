import Link from "next/link";
import { headers, cookies } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ProtectedOk = {
  ok: true;
  address: string | null;
  nonce: string | null;
  iat: number | null;
  exp: number | null;
  expiresAt: string | null;
  message: string;
};

type ProtectedErr = {
  error: string;
};

async function callProtectedApi(): Promise<{
  data: ProtectedOk | null;
  error: string | null;
}> {
  const hdrs = await headers();
  const cookieStore = await cookies();

  const host =
    hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = (hdrs.get("x-forwarded-proto") as "http" | "https") ?? "http";
  const origin = `${proto}://${host}`;

  // Forward incoming cookies to the API route so it can read the session cookie
  const cookieHeader = cookieStore
    .getAll()
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await fetch(`${origin}/api/protected`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON response
    }

    if (!res.ok) {
      const errMsg =
        (json as ProtectedErr | null)?.error ??
        `Request failed with status ${res.status}${text ? `: ${text}` : ""}`;
      return { data: null, error: errMsg };
    }

    return { data: json as ProtectedOk, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: null, error: `Network error: ${msg}` };
  }
}

export default async function ProtectedPage() {
  const { data, error } = await callProtectedApi();

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            Protected Area
          </h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Home</Link>
          </Button>
        </header>

        {!error && data ? (
          <section className="space-y-3">
            <p className="text-muted-foreground">
              This page fetched from the protected API on the server. Your
              wallet address and session details are shown below.
            </p>

            <Card className="text-sm">
              <CardContent className="p-4">
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Address</dt>
                    <dd className="font-mono">{data.address ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Nonce</dt>
                    <dd className="font-mono">{data.nonce ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Issued (iat)</dt>
                    <dd className="font-mono">
                      {typeof data.iat === "number"
                        ? new Date(data.iat * 1000).toISOString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Expires (exp)</dt>
                    <dd className="font-mono">{data.expiresAt ?? "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>{data.message}</AlertDescription>
            </Alert>

            <div>
              <form action="" method="GET">
                <Button type="submit">Refresh</Button>
              </form>
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <Alert variant="destructive">
              <AlertDescription>
                <p className="font-medium">Failed to load protected data</p>
                <p className="mt-1 text-sm">{error}</p>
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              If your session expired, return to the home page and sign in with
              Phantom again.
            </p>
            <div>
              <Button asChild>
                <Link href="/">Go to login</Link>
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
