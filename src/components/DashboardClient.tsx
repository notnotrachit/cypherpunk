"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  User,
  Copy,
  Check,
  History,
  Coins,
} from "lucide-react";
import { getStoredTransactions } from "@/lib/transaction-storage";

type PendingClaim = {
  amount: number;
  handle: string;
  paymentCount: number;
  sender: string;
};

type PendingClaimsResponse = {
  claims: PendingClaim[];
  message?: string;
  error?: string;
};

type Payment = {
  index: number;
  sender: string;
  amount: number;
  timestamp: number;
  claimed: boolean;
  pda: string;
};

type PaymentHistory = {
  handle: string;
  payments: Payment[];
  total: number;
};

type SocialGetResponse = {
  linked: boolean;
  wallet: string;
  socials: {
    twitter: null | {
      handle: string;
      name: string;
      profileImageUrl: string;
    };
  } | null;
};

type MeResponse = {
  wallet?: string;
};

type BalanceResponse = {
  balance: number;
  balanceMicro: number;
  tokenAccount: string;
  mint: string;
  error?: string;
};

type BuildClaimResponse = {
  transaction: string;
  amount: number;
  error?: string;
};

type PhantomTransactionLike = {
  serialize(): Uint8Array;
  serializeMessage(): Uint8Array;
};

type PhantomSignAndSendResult = {
  signature: string;
};

type PhantomProviderLike = {
  isPhantom: boolean;
  signAndSendTransaction(
    tx: PhantomTransactionLike,
  ): Promise<PhantomSignAndSendResult>;
};

type WindowWithSolana = Window & {
  solana?: PhantomProviderLike;
  lastClaimSignature?: string;
};

function shortAddr(addr: string, left = 6, right = 6) {
  if (!addr) return "";
  if (addr.length <= left + right) return addr;
  return `${addr.slice(0, left)}...${addr.slice(-right)}`;
}

function decodeBase58(str: string) {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const ALPHABET_MAP: { [key: string]: number } = {};
  for (let i = 0; i < ALPHABET.length; i++) ALPHABET_MAP[ALPHABET[i]] = i;
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (!(c in ALPHABET_MAP)) throw new Error("Invalid base58 character");
    let carry = ALPHABET_MAP[c];
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) bytes.push(0);
  return new Uint8Array(bytes.reverse());
}

export default function DashboardClient({
  walletAddress: walletFromServer,
}: {
  walletAddress?: string;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const [wallet, setWallet] = useState<string | null>(walletFromServer ?? null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [claimingAll, setClaimingAll] = useState(false);
  const [linking, setLinking] = useState(false);

  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);

  const [copied, setCopied] = useState(false);

  const totalPendingMicro = useMemo(
    () => pendingClaims.reduce((s, c) => s + (Number(c.amount) || 0), 0),
    [pendingClaims],
  );
  const totalPending = useMemo(
    () => totalPendingMicro / 1_000_000,
    [totalPendingMicro],
  );

  // Handle Twitter OAuth callback - link account to blockchain (only on initial callback)
  useEffect(() => {
    async function linkTwitterAfterOAuth() {
      // Only link if we just received the OAuth callback (session exists and Twitter handle doesn't match yet)
      if (
        sessionStatus === "authenticated" &&
        session?.provider === "twitter" &&
        session?.username &&
        (!twitterHandle ||
          !twitterHandle.toLowerCase().includes(session.username.toLowerCase()))
      ) {
        // Mark that we've attempted linking to avoid re-running this
        const hasAttemptedLink = sessionStorage.getItem(
          `twitter-linking-${session.username}`,
        );
        if (hasAttemptedLink) {
          return; // Already attempted linking for this session
        }

        try {
          console.log("🔗 Linking Twitter account after OAuth...");
          sessionStorage.setItem(`twitter-linking-${session.username}`, "true");

          const response = await fetch("/api/social/link-verified", {
            method: "POST",
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            console.log("✅ Twitter account linked:", data);
            toast.success(
              `Twitter account @${session.username} linked successfully!`,
            );
            // Refresh data to show the new linked account
            await refreshData();
          } else {
            const error = await response.json();
            console.error("❌ Failed to link Twitter:", error);
            // Don't show error toast if it's just "already linked"
            if (!error.error?.includes("already")) {
              toast.error(error.error || "Failed to link Twitter account");
            }
          }
        } catch (e) {
          console.error("Error linking Twitter after OAuth:", e);
        }
      }
    }

    linkTwitterAfterOAuth();
  }, [sessionStatus, session?.username, twitterHandle]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        let me: MeResponse | null = null;
        if (!walletFromServer) {
          const r = await fetch("/api/user/me", { credentials: "include" });
          me = r.ok ? await r.json() : null;
          if (me?.wallet && mounted) setWallet(me.wallet);
        }
        const walletUse = walletFromServer || me?.wallet || wallet;
        setClaimsLoading(true);
        const claimsRes = await fetch("/api/tokens/pending-claims", {
          credentials: "include",
        });
        const claimsData: PendingClaimsResponse = await claimsRes.json();
        if (!claimsRes.ok)
          throw new Error(claimsData.error || "Failed to load claims");
        if (mounted) setPendingClaims(claimsData.claims || []);

        // Fetch USDC balance
        setBalanceLoading(true);
        const balanceRes = await fetch("/api/tokens/balance", {
          credentials: "include",
        });
        if (balanceRes.ok) {
          const balanceData: BalanceResponse = await balanceRes.json();
          if (mounted) setUsdcBalance(balanceData.balance || 0);
        }
        setBalanceLoading(false);

        if (walletUse) {
          const socialRes = await fetch(
            `/api/social/get?wallet=${encodeURIComponent(walletUse)}`,
          );
          if (socialRes.ok) {
            const social: SocialGetResponse = await socialRes.json();
            const th = social.socials?.twitter?.handle || null;
            const pi = social.socials?.twitter?.profileImageUrl || null;
            if (mounted) {
              setTwitterHandle(th);
              setProfileImage(pi && pi.length > 0 ? pi : null);
            }
            if (th) {
              setHistoryLoading(true);
              try {
                const histRes = await fetch(
                  `/api/tokens/payment-history?handle=${encodeURIComponent(th)}`,
                  { credentials: "include" },
                );

                let allPayments: Payment[] = [];

                if (histRes.ok) {
                  const hist: PaymentHistory = await histRes.json();
                  allPayments = hist.payments || [];
                }

                // Merge with locally stored transactions from the extension
                const storedTransactions = await getStoredTransactions();
                console.log(
                  "📦 Stored transactions found:",
                  storedTransactions.length,
                );

                const storedPayments = storedTransactions
                  .filter((t) => t.type === "sent")
                  .map((t) => ({
                    index: -2, // Use -2 to identify as "sent" transactions
                    sender: t.senderWallet,
                    amount: t.amount,
                    timestamp: Math.floor(t.timestamp / 1000), // Convert to seconds
                    claimed: true, // Mark as "sent" (not pending claim)
                    pda: t.id, // Use transaction ID as PDA for local txs
                  }));

                console.log(
                  "📤 Stored payments for handle",
                  th,
                  ":",
                  storedPayments.length,
                );

                // Combine: server payments first, then local transactions
                allPayments = [...allPayments, ...storedPayments];

                // Sort by timestamp (newest first)
                allPayments.sort((a, b) => b.timestamp - a.timestamp);

                console.log(
                  "📊 Total payments to display:",
                  allPayments.length,
                );
                if (mounted) setPayments(allPayments);
              } catch (e) {
                console.error("Error loading payment history:", e);
              }
              setHistoryLoading(false);
            } else {
              // No Twitter handle linked, but still load local transactions if they exist
              setHistoryLoading(true);
              try {
                const storedTransactions = await getStoredTransactions();
                const localPayments = storedTransactions
                  .map((t) => ({
                    index: -1,
                    sender: t.senderWallet,
                    amount: t.amount,
                    timestamp: Math.floor(t.timestamp / 1000),
                    claimed: false,
                    pda: t.id,
                  }))
                  .sort((a, b) => b.timestamp - a.timestamp);

                if (mounted) setPayments(localPayments);
              } catch (e) {
                console.error("Error loading local transactions:", e);
              }
              setHistoryLoading(false);
            }
          }
        }
      } catch (e: unknown) {
        const m = e instanceof Error ? e.message : String(e);
        toast.error(m);
      } finally {
        if (mounted) {
          setLoading(false);
          setClaimsLoading(false);
          setHistoryLoading(false);
        }
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [walletFromServer]);

  async function refreshData() {
    try {
      setClaimsLoading(true);
      const claimsRes = await fetch("/api/tokens/pending-claims", {
        credentials: "include",
      });
      const claimsData: PendingClaimsResponse = await claimsRes.json();
      if (!claimsRes.ok)
        throw new Error(claimsData.error || "Failed to load claims");
      setPendingClaims(claimsData.claims || []);

      // Refresh USDC balance
      setBalanceLoading(true);
      const balanceRes = await fetch("/api/tokens/balance", {
        credentials: "include",
      });
      if (balanceRes.ok) {
        const balanceData: BalanceResponse = await balanceRes.json();
        setUsdcBalance(balanceData.balance || 0);
      }
      setBalanceLoading(false);

      if (twitterHandle) {
        setHistoryLoading(true);
        const histRes = await fetch(
          `/api/tokens/payment-history?handle=${encodeURIComponent(twitterHandle)}`,
          { credentials: "include" },
        );
        if (histRes.ok) {
          const hist: PaymentHistory = await histRes.json();

          // Merge with locally stored transactions from the extension
          const storedTransactions = await getStoredTransactions();
          const storedPayments = storedTransactions
            .filter((t) => t.handle === twitterHandle && t.type === "sent")
            .map((t) => ({
              index: -1,
              sender: t.senderWallet,
              amount: t.amount,
              timestamp: Math.floor(t.timestamp / 1000),
              claimed: false,
              pda: t.id,
            }));

          const allPayments = [...(hist.payments || []), ...storedPayments];
          allPayments.sort((a, b) => b.timestamp - a.timestamp);

          setPayments(allPayments);
        }
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toast.error(m);
    } finally {
      setClaimsLoading(false);
      setHistoryLoading(false);
    }
  }

  async function claimOne(handle: string): Promise<number> {
    const provider = (window as WindowWithSolana).solana;
    if (!provider || !provider.isPhantom)
      throw new Error("Phantom wallet not found");
    const buildRes = await fetch("/api/tokens/build-claim-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ socialHandle: handle }),
    });
    const buildData: BuildClaimResponse = await buildRes.json();
    if (!buildRes.ok)
      throw new Error(buildData.error || "Failed to build claim transaction");
    const txBytes = decodeBase58(buildData.transaction);
    const tx: PhantomTransactionLike = {
      serialize: () => txBytes,
      serializeMessage: () => txBytes,
    };
    const res = await provider.signAndSendTransaction(tx);
    (window as WindowWithSolana).lastClaimSignature = res.signature;
    return buildData.amount;
  }

  async function onClaimAll() {
    if (!pendingClaims.length) return;
    try {
      setClaimingAll(true);
      const task = (async () => {
        let totalAmt = 0;
        for (const c of pendingClaims) {
          const amt = await claimOne(c.handle);
          totalAmt += amt;
        }
        return totalAmt;
      })();
      const amt = await toast.promise(task, {
        loading: "Claiming all…",
        success: (a: number) => `Claimed ${a / 1_000_000} USDC`,
        error: (err: unknown) =>
          err instanceof Error ? err.message : String(err),
      });
      await refreshData();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toast.error(m);
    } finally {
      setClaimingAll(false);
    }
  }

  async function onLinkTwitter() {
    try {
      setLinking(true);
      // Clear the linking flag to allow the OAuth callback to trigger linking
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("twitter-linking-")) {
          sessionStorage.removeItem(key);
        }
      });
      toast.info("Redirecting to X/Twitter...");
      await signIn("twitter", { callbackUrl: "/dashboard" });
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toast.error(m);
    } finally {
      setLinking(false);
    }
  }

  function ProfileAvatar() {
    const src = profileImage;
    if (src) {
      return (
        <div className="h-16 w-16 overflow-hidden rounded-full">
          <Image
            src={src}
            alt="avatar"
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }
    return (
      <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center text-xl">
        <User className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`grid gap-6 ${totalPendingMicro > 0 ? 'sm:grid-cols-2' : ''}`}>
        {totalPendingMicro > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-end justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  Pending balance
                </CardTitle>
                <div className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight">
                  {loading || claimsLoading ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    <span className="font-mono font-bold">
                      {totalPending.toFixed(2)} USDC
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={onClaimAll}
                  disabled={claimingAll || totalPendingMicro <= 0}
                >
                  {claimingAll ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Claiming…
                    </span>
                  ) : (
                    <span>Claim All</span>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Wallet balance
            </CardTitle>
            <div className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight">
              {loading || balanceLoading ? (
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Loading…
                </span>
              ) : (
                <span className="font-mono font-bold">
                  {usdcBalance.toFixed(2)} USDC
                </span>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Previous Activity
              </CardTitle>
              <CardDescription>
                Activity associated with your linked handle
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : !twitterHandle ? (
                <div className="text-sm text-muted-foreground">
                  No social handle linked
                </div>
              ) : payments.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {payments.map((p) => {
                    return (
                      <div
                        key={p.pda}
                        className="flex items-center justify-between rounded-md border p-3 text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {p.amount.toFixed(2)} USDC
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {p.index === -2 ? "to" : "from"}{" "}
                            {shortAddr(p.sender)}
                          </span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>
                            {new Date(p.timestamp * 1000).toLocaleString()}
                          </div>
                          <div>
                            {p.index === -2
                              ? "Sent"
                              : p.claimed
                                ? "Claimed"
                                : "Unclaimed"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 order-1 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your linked identity and wallet</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    Loading profile…
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center gap-3">
                  <ProfileAvatar />
                  <div className="text-base font-semibold">
                    {twitterHandle ?? "Not linked"}
                  </div>
                  <div className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" />
                    <span title={wallet ?? ""}>
                      {wallet ? shortAddr(wallet) : ""}
                    </span>
                    {wallet ? (
                      <button
                        aria-label="Copy address"
                        className="ml-1 inline-flex items-center gap-1 text-foreground/70 hover:text-foreground"
                        onClick={async () => {
                          if (!wallet) return;
                          await navigator.clipboard.writeText(wallet);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1200);
                        }}
                      >
                        {copied ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={onLinkTwitter}
                      disabled={linking}
                    >
                      <span className="inline-flex items-center gap-2">
                        {linking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <span className="text-lg">𝕏</span>
                        )}
                        {twitterHandle ? "Relink X/Twitter" : "Link X/Twitter"}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
