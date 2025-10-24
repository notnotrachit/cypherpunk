import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.08),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.08),transparent)] dark:bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.12),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.12),transparent)]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <section className="rounded-2xl border border-zinc-200 bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/phantom.svg"
              alt=""
              className="h-8 w-8 rounded-xl ring-1 ring-white/30 dark:ring-white/10"
              aria-hidden="true"
              draggable={false}
            />
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Welcome
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Use the Connect Wallet button in the navbar to sign in with
                Phantom.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
