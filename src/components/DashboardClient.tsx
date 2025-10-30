"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
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
  Twitter,
} from "lucide-react";

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
              const histRes = await fetch(
                `/api/tokens/payment-history?handle=${encodeURIComponent(th)}`,
                { credentials: "include" },
              );
              if (histRes.ok) {
                const hist: PaymentHistory = await histRes.json();
                if (mounted) setPayments(hist.payments || []);
              }
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
          setPayments(hist.payments || []);
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
      toast.info("Redirecting to Twitter…");
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
      <div className="grid gap-6 sm:grid-cols-2">
        {totalPendingMicro > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-end justify-between gap-4">
              <div>
                <CardTitle className="text-sm text-muted-foreground">
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
            <CardTitle className="text-sm text-muted-foreground">
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
                <Coins className="h-5 w-5" />
                Unclaimed
              </CardTitle>
              <CardDescription>
                Incoming funds waiting to be claimed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {claimsLoading ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : pendingClaims.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No pending claims
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingClaims.map((c) => (
                    <div
                      key={c.handle}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <div className="text-lg font-semibold">
                          {(c.amount / 1_000_000).toFixed(2)} USDC
                        </div>
                        <div className="text-xs text-muted-foreground">
                          for @{c.handle}
                        </div>
                        {c.paymentCount > 0 ? (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            from {shortAddr(c.sender)}
                            {c.paymentCount > 1
                              ? ` and ${c.paymentCount - 1} more`
                              : ""}
                          </div>
                        ) : null}
                      </div>
                      <div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const task = claimOne(c.handle);
                              await toast.promise(task, {
                                loading: "Claiming…",
                                success: (a: number) =>
                                  `Claimed ${a / 1_000_000} USDC`,
                                error: (err: unknown) =>
                                  err instanceof Error
                                    ? err.message
                                    : String(err),
                              });
                              await refreshData();
                            } catch (e: unknown) {
                              const m =
                                e instanceof Error ? e.message : String(e);
                              toast.error(m);
                            }
                          }}
                        >
                          Claim
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Previous transactions
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
                            from {shortAddr(p.sender)}
                          </span>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>
                            {new Date(p.timestamp * 1000).toLocaleString()}
                          </div>
                          <div>{p.claimed ? "Claimed" : "Unclaimed"}</div>
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
                        <Twitter className="h-4 w-4" />
                      )}
                      {twitterHandle ? "Relink Twitter" : "Link Twitter"}
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
