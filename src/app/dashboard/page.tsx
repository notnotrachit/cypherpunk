import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionJwt } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import SocialLinkingForm from "@/components/SocialLinkingForm";

import { Wallet, Link, Coins } from "lucide-react";
import ClaimPendingFunds from "@/components/ClaimPendingFunds";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

        <div className="grid gap-6 md:grid-cols-2 items-stretch">
          {/* Link Socials */}
          <div>
            <Card className="flex h-full flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-6 w-6" />
                  Link Social Accounts
                </CardTitle>
                <CardDescription>Connect your socials to link your on-chain identity.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end">
                <SocialLinkingForm walletAddress={walletAddress} />
              </CardContent>
            </Card>
          </div>

          {/* Claim Funds */}
          <div>
            <Card className="flex h-full flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-6 w-6" />
                  Claim Funds
                </CardTitle>
                <CardDescription>Claim any pending USDC sent to your handle before linking your wallet.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end">
                <ClaimPendingFunds />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
