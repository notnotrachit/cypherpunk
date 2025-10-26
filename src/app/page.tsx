import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/auth";
import Navbar from "../components/Navbar";
import ConnectCTA from "../components/ConnectCTA";
import {
  RiLinksLine,
  RiSearchLine,
  RiDatabase2Line,
  RiCodeSSlashLine,
} from "react-icons/ri";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  let walletAddress: string | null = null;
  if (sessionToken) {
    try {
      const { payload } = await verifySessionJwt(sessionToken);
      walletAddress = payload.sub;
    } catch {
      // Invalid session; treat as logged out
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar address={walletAddress} />

      <main className="mx-auto flex min-h-[80vh] max-w-6xl items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full text-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight tracking-tight text-violet-400 dark:text-violet-400">
            The liquidity layer for your social graph.
          </h1>
          <p className="mt-6 mx-auto max-w-5xl text-base text-zinc-600 sm:text-lg md:text-xl dark:text-zinc-400">
            Rivo turns every social profile into a functional payment endpoint.
            No more copy-pasting wallet addresses or asking &quot;what&apos;s
            your pubkey?&quot; We overlay a seamless Solana transaction rail
            directly onto the platforms you already use. Connect your Phantom,
            sync your socials, and send crypto as easily as sending a DM.
          </p>
          <div className="mt-8 flex justify-center">
            <ConnectCTA
              address={walletAddress}
              showAddressChip={false}
              connectLabel="Get Started"
            />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Why Rivo?
          </h2>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            Seamlessly connect your social identity to the Solana blockchain
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Feature 1 */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-linear-to-br from-white to-zinc-50 p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 dark:border-zinc-800/50 dark:from-zinc-900 dark:to-zinc-900/50">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 blur-2xl transition-all group-hover:scale-150" />
            <div className="relative">
              <div className="inline-flex items-center justify-center rounded-xl bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 p-3 ring-1 ring-violet-500/20 dark:ring-violet-500/30">
                <RiLinksLine className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Link Social Accounts
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Connect your socials to your Solana wallet to build your
                on-chain identity.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-linear-to-br from-white to-zinc-50 p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 dark:border-zinc-800/50 dark:from-zinc-900 dark:to-zinc-900/50">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-linear-to-br from-teal-500/10 to-emerald-500/10 blur-2xl transition-all group-hover:scale-150" />
            <div className="relative">
              <div className="inline-flex items-center justify-center rounded-xl bg-linear-to-br from-teal-500/10 to-emerald-500/10 p-3 ring-1 ring-teal-500/20 dark:ring-teal-500/30">
                <RiSearchLine className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Social Lookup
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Find any user&apos;s wallet just by knowing their social media
                handle.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-linear-to-br from-white to-zinc-50 p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 dark:border-zinc-800/50 dark:from-zinc-900 dark:to-zinc-900/50">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-linear-to-br from-emerald-500/10 to-cyan-500/10 blur-2xl transition-all group-hover:scale-150" />
            <div className="relative">
              <div className="inline-flex items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/10 to-cyan-500/10 p-3 ring-1 ring-emerald-500/20 dark:ring-emerald-500/30">
                <RiDatabase2Line className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                On-Chain Identity
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                All social links are stored decentrally on the Solana
                blockchain.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-linear-to-br from-white to-zinc-50 p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 dark:border-zinc-800/50 dark:from-zinc-900 dark:to-zinc-900/50">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-linear-to-br from-fuchsia-500/10 to-pink-500/10 blur-2xl transition-all group-hover:scale-150" />
            <div className="relative">
              <div className="inline-flex items-center justify-center rounded-xl bg-linear-to-br from-fuchsia-500/10 to-pink-500/10 p-3 ring-1 ring-fuchsia-500/20 dark:ring-fuchsia-500/30">
                <RiCodeSSlashLine className="h-6 w-6 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Instant Payments
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Our browser extension adds a payment button directly to social
                profiles.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
