import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionJwt } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import DashboardClient from "@/components/DashboardClient";

import { Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    <div className="min-h-screen">
      <Navbar address={walletAddress} />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="font-logo text-3xl sm:text-4xl md:text-5xl tracking-tight text-primary">
            Dashboard
          </h1>
          <Badge variant="secondary" className="mt-3 inline-flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="font-mono">{walletAddress}</span>
          </Badge>
        </header>
        <DashboardClient walletAddress={walletAddress} />
      </main>
    </div>
  );
}
