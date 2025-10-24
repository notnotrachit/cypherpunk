import Link from "next/link";
import { headers, cookies } from "next/headers";

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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Protected Area
          </h1>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Home
          </Link>
        </header>

        {!error && data ? (
          <section className="space-y-3">
            <p className="text-zinc-700 dark:text-zinc-300">
              This page fetched from the protected API on the server. Your
              wallet address and session details are shown below.
            </p>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Address</dt>
                  <dd className="font-mono text-zinc-900 dark:text-zinc-100">
                    {data.address ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Nonce</dt>
                  <dd className="font-mono text-zinc-900 dark:text-zinc-100">
                    {data.nonce ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Issued (iat)</dt>
                  <dd className="font-mono text-zinc-900 dark:text-zinc-100">
                    {typeof data.iat === "number"
                      ? new Date(data.iat * 1000).toISOString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Expires (exp)</dt>
                  <dd className="font-mono text-zinc-900 dark:text-zinc-100">
                    {data.expiresAt ?? "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900/40 dark:bg-green-950 dark:text-green-200">
              {data.message}
            </div>

            <div>
              <form action="" method="GET">
                <button
                  type="submit"
                  className="rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
                >
                  Refresh
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/40 dark:bg-red-950 dark:text-red-200">
              <p className="font-medium">Failed to load protected data</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              If your session expired, return to the home page and sign in with
              Phantom again.
            </p>
            <div>
              <Link
                href="/"
                className="inline-flex items-center rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
              >
                Go to login
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
