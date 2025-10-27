import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionJwt } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import SocialLinkingForm from "@/components/SocialLinkingForm";

import { RiWallet3Line, RiLinksLine, RiCoinsLine } from "react-icons/ri";
import ClaimPendingFunds from "@/components/ClaimPendingFunds";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/");
  }

  let walletAddress: string;
  try {
    const { payload } = await verifySessionJwt(sessionToken);
    walletAddress = payload.sub;
  } catch {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.08),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.08),transparent)] dark:bg-[radial-gradient(1200px_600px_at_-10%_-20%,rgba(139,92,246,.12),transparent),radial-gradient(1200px_600px_at_110%_-20%,rgba(16,185,129,.12),transparent)]">
      <Navbar address={walletAddress} />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="font-logo text-3xl sm:text-4xl md:text-5xl tracking-tight text-violet-400">
            Dashboard
          </h1>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-zinc-200/60 bg-white/70 px-3 py-1.5 text-xs text-zinc-700 ring-1 ring-black/5 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-900/70 dark:text-zinc-300 dark:ring-white/5">
            <RiWallet3Line className="h-4 w-4 text-violet-500" />
            <span className="font-mono">{walletAddress}</span>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Link Socials */}
          <div>
            <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-linear-to-br from-white to-zinc-50 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/50 dark:from-zinc-900 dark:to-zinc-900/50">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 blur-2xl transition-all group-hover:scale-150" />
              <div className="relative">
                <div className="inline-flex items-center justify-center rounded-xl bg-linear-to-br from-violet-500/10 to-fuchsia-500/10 p-3 ring-1 ring-violet-500/20 dark:ring-violet-500/30">
                  <RiLinksLine className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Link Social Accounts
                </h3>
                <div className="mt-4">
                  <SocialLinkingForm walletAddress={walletAddress} />
                </div>
              </div>
            </div>
          </div>

          {/* Claim Funds */}
          <div>
            <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/50 bg-linear-to-br from-white to-zinc-50 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800/50 dark:from-zinc-900 dark:to-zinc-900/50">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-linear-to-br from-emerald-500/10 to-cyan-500/10 blur-2xl transition-all group-hover:scale-150" />
              <div className="relative">
                <div className="inline-flex items-center justify-center rounded-xl bg-linear-to-br from-emerald-500/10 to-cyan-500/10 p-3 ring-1 ring-emerald-500/20 dark:ring-emerald-500/30">
                  <RiCoinsLine className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="mt-4">
                  <ClaimPendingFunds />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
