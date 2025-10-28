import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/auth";
import Navbar from "../components/Navbar";
import ConnectCTA from "../components/ConnectCTA";
import { Link as LinkIcon, Search, Database, Code2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-extrabold leading-tight tracking-tight text-primary">
            The liquidity layer for your social graph.
          </h1>
          <p className="mt-6 mx-auto max-w-5xl text-base text-muted-foreground sm:text-lg md:text-xl">
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
          <h2 className="text-3xl font-bold">Why Rivo?</h2>
          <p className="mt-3 text-base text-muted-foreground">
            Seamlessly connect your social identity to the Solana blockchain
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="inline-flex items-center justify-center rounded-xl bg-accent p-3 text-accent-foreground/80">
                <LinkIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-serif font-semibold">Link Social Accounts</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your socials to your Solana wallet to build your on-chain identity.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="inline-flex items-center justify-center rounded-xl bg-accent p-3 text-accent-foreground/80">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-serif font-semibold">Social Lookup</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Find any user&apos;s wallet just by knowing their social media handle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="inline-flex items-center justify-center rounded-xl bg-accent p-3 text-accent-foreground/80">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-serif font-semibold">On-Chain Identity</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                All social links are stored decentrally on the Solana blockchain.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="inline-flex items-center justify-center rounded-xl bg-accent p-3 text-accent-foreground/80">
                <Code2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-serif font-semibold">Instant Payments</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Our browser extension adds a payment button directly to social profiles.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
