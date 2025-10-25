import Navbar from "../components/Navbar";
import NetworkBadge from "../components/NetworkBadge";

export default function Home({
  searchParams,
}: {
  searchParams: { auth?: string };
}) {
  const authMessage = searchParams.auth === "required"
    ? "Please sign in to access the dashboard"
    : searchParams.auth === "expired"
      ? "Your session has expired. Please sign in again"
      : null;
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.08),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.08),transparent)] dark:bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.12),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.12),transparent)]">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="space-y-6">
          {/* Network Badge */}
          <div className="flex justify-center">
            <NetworkBadge />
          </div>

          {/* Auth Message */}
          {authMessage && (
            <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm ring-1 ring-blue-500/10 backdrop-blur dark:border-blue-900 dark:bg-blue-950/30 dark:ring-blue-500/20">
              <div className="flex items-center gap-2">
                <span className="text-xl">ℹ️</span>
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  {authMessage}
                </p>
              </div>
            </section>
          )}

          {/* Welcome Section */}
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
                  Welcome to Cypherpunk
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Link your Solana wallet with your social media accounts
                </p>
              </div>
            </div>
          </section>

          {/* Devnet Notice */}
          <section className="rounded-2xl border border-yellow-200 bg-yellow-50/70 p-6 shadow-sm ring-1 ring-yellow-500/10 backdrop-blur dark:border-yellow-900 dark:bg-yellow-950/30 dark:ring-yellow-500/20">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                  Running on Devnet
                </h2>
                <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-300">
                  This app is currently connected to Solana Devnet for testing. Make sure your Phantom wallet is also set to Devnet.
                </p>
                <div className="mt-3 space-y-1 text-xs text-yellow-700 dark:text-yellow-400">
                  <p><strong>To switch Phantom to Devnet:</strong></p>
                  <ol className="ml-4 list-decimal space-y-0.5">
                    <li>Open Phantom wallet</li>
                    <li>Click Settings (gear icon)</li>
                    <li>Go to Developer Settings</li>
                    <li>Change network to Devnet</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="rounded-2xl border border-zinc-200 bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 dark:ring-white/5">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Features
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="text-2xl mb-2">🔗</div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Link Social Accounts
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Connect your Twitter, Instagram, and LinkedIn to your Solana wallet
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="text-2xl mb-2">🔍</div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Lookup Wallets
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Find wallets by social handle or view social links for any wallet
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="text-2xl mb-2">⛓️</div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  On-Chain Storage
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  All data stored securely on the Solana blockchain
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <div className="text-2xl mb-2">🌐</div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Public API
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  RESTful endpoints for Chrome extension integration
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
