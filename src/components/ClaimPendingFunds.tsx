"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Search, History, Wallet, Loader2 } from "lucide-react";

interface PendingClaim {
  amount: number;
  handle: string;
  paymentCount: number;
  sender: string;
}

interface Payment {
  sender: string;
  timestamp: number; // seconds since epoch
}

interface PaymentHistory {
  payments: Payment[];
}

interface PendingClaimsResponse {
  claims: PendingClaim[];
  error?: string;
}

interface BuildClaimResponse {
  transaction: string; // base58-encoded transaction bytes
  amount: number; // in micro units (e.g., 1e6 = 1 USDC)
  error?: string;
}

interface PhantomTransactionLike {
  serialize(): Uint8Array;
  serializeMessage(): Uint8Array;
}

interface PhantomSignAndSendResult {
  signature: string;
}

interface PhantomProviderLike {
  isPhantom: boolean;
  signAndSendTransaction(
    tx: PhantomTransactionLike,
  ): Promise<PhantomSignAndSendResult>;
}

type WindowWithSolana = Window & {
  solana?: PhantomProviderLike;
  lastClaimSignature?: string;
};

export default function ClaimPendingFunds() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([]);
  const [checking, setChecking] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory | null>(
    null,
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  useEffect(() => {
    // Get user info
    fetch("/api/user/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { wallet?: string } | null) => {
        if (data?.wallet) {
          setPublicKey(data.wallet);
        }
      })
      .catch(() => {});
  }, []);

  const checkPendingClaims = async () => {
    if (!publicKey) {
      setError("Please sign in first");
      toast.error("Please sign in first");
      return;
    }

    setChecking(true);
    setError(null);
    setPendingClaims([]);

    try {
      const task = (async () => {
        const response = await fetch("/api/tokens/pending-claims", {
          credentials: "include",
        });
        const data: PendingClaimsResponse = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to check pending claims");
        }
        setPendingClaims(data.claims || []);
        return data.claims?.length ?? 0;
      })();

      const count = await toast.promise(task, {
        loading: "Checking pending claims…",
        success: (n: number) =>
          n > 0 ? `Found ${n} pending ${n === 1 ? "claim" : "claims"}` : "No pending claims",
        error: (err: unknown) => (err instanceof Error ? err.message : String(err)),
      });

      if (count === 0) {
        setError("No pending claims found");
      }
    } catch (err: unknown) {
      console.error("Error checking pending claims:", err);
      const message =
        err instanceof Error ? err.message : "Failed to check pending claims";
      setError(message);
      toast.error(message);
    } finally {
      setChecking(false);
    }
  };

  const loadPaymentHistory = async (handle: string) => {
    setLoadingHistory(true);
    setPaymentHistory(null);

    try {
      const task = (async () => {
        const response = await fetch(
          `/api/tokens/payment-history?handle=${encodeURIComponent(handle)}`,
          { credentials: "include" },
        );
        if (!response.ok) {
          throw new Error("Failed to load payment history");
        }
        const data: PaymentHistory = await response.json();
        setPaymentHistory(data);
        setExpandedClaim(handle);
        return data.payments.length;
      })();
      await toast.promise(task, {
        loading: "Loading payment history…",
        success: (n: number) =>
          n > 0 ? `${n} transaction${n === 1 ? "" : "s"} found` : "No payment history found",
        error: (err: unknown) => (err instanceof Error ? err.message : String(err)),
      });
    } catch (err: unknown) {
      console.error("Error loading payment history:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load payment history";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const claimFunds = async (handle: string) => {
    if (!publicKey) {
      setError("Please sign in first");
      toast.error("Please sign in first");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if Phantom is available
      const provider = (window as WindowWithSolana).solana;
      if (!provider || !provider.isPhantom) {
        const msg = "Phantom wallet not found. Please install Phantom.";
        toast.error(msg);
        throw new Error(msg);
      }

      const decodeBase58 = (str: string) => {
        const ALPHABET =
          "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        const ALPHABET_MAP: { [key: string]: number } = {};
        for (let i = 0; i < ALPHABET.length; i++) {
          ALPHABET_MAP[ALPHABET[i]] = i;
        }

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

        // Add leading zeros
        for (let i = 0; i < str.length && str[i] === "1"; i++) {
          bytes.push(0);
        }

        return new Uint8Array(bytes.reverse());
      };

      const task = (async () => {
        // Build the claim transaction via API
        const buildResponse = await fetch("/api/tokens/build-claim-transaction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ socialHandle: handle }),
        });

        const buildData: BuildClaimResponse = await buildResponse.json();
        if (!buildResponse.ok) {
          throw new Error(buildData.error || "Failed to build claim transaction");
        }

        const { transaction: transactionBase58, amount } = buildData;
        const transactionBytes = decodeBase58(transactionBase58);
        const transaction: PhantomTransactionLike = {
          serialize: () => transactionBytes,
          serializeMessage: () => transactionBytes,
        };
        const result = await provider.signAndSendTransaction(transaction);
        (window as WindowWithSolana).lastClaimSignature = result.signature;
        return amount;
      })();

      toast.promise(task, {
        loading: "Claiming funds…",
        success: (a: number) => `Successfully claimed ${a / 1_000_000} USDC!`,
        error: (err: unknown) => (err instanceof Error ? err.message : String(err)),
      });
      const amt = await task;
      setSuccess(`Successfully claimed ${amt / 1_000_000} USDC!`);
      setTimeout(() => checkPendingClaims(), 2000);
    } catch (err: unknown) {
      console.error("Error claiming funds:", err);
      const message =
        err instanceof Error ? err.message : "Failed to claim funds";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">
        Claim Pending Funds
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Check if anyone has sent you USDC before you linked your wallet. These
        funds are held in escrow waiting for you to claim them.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Note: If multiple people sent you funds, the total amount is accumulated
        but only the most recent sender is shown.
      </p>

      <div className="mt-6">
        <Button onClick={checkPendingClaims} disabled={!publicKey || checking}>
          {checking ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              Check for Pending Claims
            </span>
          )}
        </Button>
      </div>

      {null}

      {pendingClaims.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Pending Claims:
          </h3>
          {pendingClaims.map((claim, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-2xl font-bold">
                      {(claim.amount / 1_000_000).toFixed(2)} USDC
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      For: <span className="font-mono">{claim.handle}</span>
                    </p>
                    {claim.paymentCount > 1 ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        From: {" "}
                        <span className="font-semibold">
                          {claim.paymentCount} payment
                          {claim.paymentCount !== 1 ? "s" : ""}
                        </span>
                        <span className="ml-1 text-muted-foreground/70">
                          (most recent: {claim.sender.slice(0, 8)}...
                          {claim.sender.slice(-8)})
                        </span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        From: {" "}
                        <span className="font-mono">
                          {claim.sender.slice(0, 8)}...{claim.sender.slice(-8)}
                        </span>
                      </p>
                    )}

                    <Button
                      variant="link"
                      className="mt-2 px-0 h-auto"
                      onClick={() => {
                        if (expandedClaim === claim.handle) {
                          setExpandedClaim(null);
                          setPaymentHistory(null);
                        } else {
                          loadPaymentHistory(claim.handle);
                        }
                      }}
                      disabled={loadingHistory}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {loadingHistory && expandedClaim === claim.handle ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <History className="h-4 w-4" />
                        )}
                        {loadingHistory && expandedClaim === claim.handle
                          ? "Loading..."
                          : expandedClaim === claim.handle
                            ? "Hide payment history"
                            : "View payment history"}
                      </span>
                    </Button>
                  </div>
                  <Button onClick={() => claimFunds(claim.handle)} disabled={loading} className="ml-4">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Claiming...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Claim
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>

              {expandedClaim === claim.handle && paymentHistory && (
                <div className="border-t p-4">
                  <h4 className="text-sm font-semibold mb-3">
                    Payment History ({paymentHistory.payments.length} transaction
                    {paymentHistory.payments.length !== 1 ? "s" : ""})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {paymentHistory.payments.map(
                      (payment: Payment, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs p-2 rounded bg-accent/40"
                        >
                          <div className="flex-1">
                            <p className="font-mono">
                              {payment.sender.slice(0, 8)}...
                              {payment.sender.slice(-8)}
                            </p>
                            <p className="text-muted-foreground mt-0.5">
                              {new Date(
                                payment.timestamp * 1000,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  {paymentHistory.payments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No payment history found
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
