import Navbar from "../../components/Navbar";
import { headers } from "next/headers";

function shortAddress(addr: string | null, chars = 4) {
  if (!addr) return "";
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export default async function Dashboard() {
  // Read auth context injected by middleware
  const hdrs = await headers();
  const address = (hdrs.get("x-wallet-address") || null) as string | null;

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.08),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.08),transparent)] dark:bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.12),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.12),transparent)]">
      {/* Top navigation with brand and logout/connect */}
      <Navbar address={address} />

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {address ? (
              <>
                Signed in as{" "}
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
                  {shortAddress(address)}
                </span>
              </>
            ) : (
              "Authenticated session"
            )}
          </p>
        </div>

        {/* Empty state card */}
        <section
          className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5"
          style={{
            backgroundImage:
              "radial-gradient(800px 400px at -10% -20%, rgba(139, 92, 246, 0.14), transparent), radial-gradient(800px 400px at 110% -20%, rgba(16, 185, 129, 0.12), transparent)",
          }}
        >
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center justify-center rounded-xl bg-violet-600/10 p-3 ring-1 ring-inset ring-violet-500/20 dark:bg-violet-500/10 dark:ring-violet-400/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/phantom.svg"
                alt=""
                className="h-7 w-7"
                aria-hidden="true"
                draggable={false}
              />
            </div>
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Nothing here yet
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Your dashboard is currently empty. Come back later to see your
              data and tools.
            </p>
          </div>

          {/* Soft glow accents */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 left-1/2 h-40 w-[60%] -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-400/20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 left-1/4 h-32 w-[40%] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-400/20"
          />
        </section>
      </main>
    </div>
  );
}
