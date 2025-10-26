"use client";

import { useState, useEffect } from "react";

// Extend Window interface for Phantom
interface PhantomWallet {
  isPhantom?: boolean;
  publicKey?: { toString: () => string };
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signAndSendTransaction?: (transaction: any) => Promise<{ signature: string }>;
  signTransaction?: (transaction: any) => Promise<any>;
}

declare global {
  interface Window {
    solana?: PhantomWallet;
  }
}

export default function ClaimPendingFunds() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);
  const [checking, setChecking] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  useEffect(() => {
    // Get user info
    fetch("/api/user/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.wallet) {
          setPublicKey(data.wallet);
        }
      })
      .catch(() => {});
  }, []);

  const checkPendingClaims = async () => {
    if (!publicKey) {
      setError("Please sign in first");
      return;
    }

    setChecking(true);
    setError(null);
    setPendingClaims([]);

    try {
      const response = await fetch("/api/tokens/pending-claims", {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to check pending claims');
      }

      const data = await response.json();
      setPendingClaims(data.claims || []);

      if (data.claims.length === 0) {
        setError("No pending claims found");
      }
    } catch (err: any) {
      console.error('Error checking pending claims:', err);
      setError(err.message || 'Failed to check pending claims');
    } finally {
      setChecking(false);
    }
  };

  const loadPaymentHistory = async (handle: string) => {
    setLoadingHistory(true);
    setPaymentHistory(null);

    try {
      const response = await fetch(
        `/api/tokens/payment-history?handle=${encodeURIComponent(handle)}`,
        { credentials: "include" },
      );

      if (!response.ok) {
        throw new Error("Failed to load payment history");
      }

      const data = await response.json();
      setPaymentHistory(data);
      setExpandedClaim(handle);
    } catch (err: any) {
      console.error('Error loading payment history:', err);
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const claimFunds = async (handle: string) => {
    if (!publicKey) {
      setError("Please sign in first");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Check if Phantom is available
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error("Phantom wallet not found. Please install Phantom.");
      }

      // Build the claim transaction via API
      const buildResponse = await fetch("/api/tokens/build-claim-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ socialHandle: handle }),
      });

      if (!buildResponse.ok) {
        const data = await buildResponse.json();
        throw new Error(data.error || 'Failed to build claim transaction');
      }

      const { transaction: transactionBase58, amount } = await buildResponse.json();

      // Decode base58 transaction
      const decodeBase58 = (str: string) => {
        const ALPHABET =
          "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        const ALPHABET_MAP: { [key: string]: number } = {};
        for (let i = 0; i < ALPHABET.length; i++) {
          ALPHABET_MAP[ALPHABET[i]] = i;
        }

        let bytes = [0];
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

      const transactionBytes = decodeBase58(transactionBase58);

      // Create a transaction-like object for Phantom
      const transaction = {
        serialize: () => transactionBytes,
        serializeMessage: () => transactionBytes,
      };

      // Sign and send with Phantom
      const result = await (window.solana as any).signAndSendTransaction(transaction);
      const signature = result.signature;

      setSuccess(`Successfully claimed ${amount / 1_000_000} USDC!`);
      
      // Store signature for the link
      (window as any).lastClaimSignature = signature;
      
      // Refresh pending claims
      setTimeout(() => checkPendingClaims(), 2000);
    } catch (err: any) {
      console.error('Error claiming funds:', err);
      setError(err.message || 'Failed to claim funds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Claim Pending Funds
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Check if anyone has sent you USDC before you linked your wallet. These
        funds are held in escrow waiting for you to claim them.
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        Note: If multiple people sent you funds, the total amount is accumulated
        but only the most recent sender is shown.
      </p>

      <div className="mt-6">
        <button
          onClick={checkPendingClaims}
          disabled={!publicKey || checking}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {checking ? "Checking..." : "Check for Pending Claims"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <p className="text-sm text-green-800 dark:text-green-200">
            {success}
            {(window as any).lastClaimSignature && (
              <>
                {" "}
                <a
                  href={`https://explorer.solana.com/tx/${(window as any).lastClaimSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline hover:no-underline"
                >
                  View on Explorer →
                </a>
              </>
            )}
          </p>
        </div>
      )}

      {pendingClaims.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Pending Claims:
          </h3>
          {pendingClaims.map((claim, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {(claim.amount / 1_000_000).toFixed(2)} USDC
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      For: <span className="font-mono">{claim.handle}</span>
                    </p>
                    {claim.paymentCount > 1 ? (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                        From:{" "}
                        <span className="font-semibold">
                          {claim.paymentCount} payment
                          {claim.paymentCount !== 1 ? "s" : ""}
                        </span>
                        <span className="ml-1 text-zinc-400 dark:text-zinc-600">
                          (most recent: {claim.sender.slice(0, 8)}...
                          {claim.sender.slice(-8)})
                        </span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                        From:{" "}
                        <span className="font-mono">
                          {claim.sender.slice(0, 8)}...{claim.sender.slice(-8)}
                        </span>
                      </p>
                    )}

                    <button
                      onClick={() => {
                        if (expandedClaim === claim.handle) {
                          setExpandedClaim(null);
                          setPaymentHistory(null);
                        } else {
                          loadPaymentHistory(claim.handle);
                        }
                      }}
                      disabled={loadingHistory}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      {loadingHistory && expandedClaim === claim.handle
                        ? "Loading..."
                        : expandedClaim === claim.handle
                          ? "Hide payment history"
                          : "View payment history"}
                    </button>
                  </div>
                  <button
                    onClick={() => claimFunds(claim.handle)}
                    disabled={loading}
                    className="ml-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-400"
                  >
                    {loading ? "Claiming..." : "Claim"}
                  </button>
                </div>
              </div>

              {expandedClaim === claim.handle && paymentHistory && (
                <div className="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                    Payment History ({paymentHistory.payments.length}{" "}
                    transaction{paymentHistory.payments.length !== 1 ? "s" : ""}
                    )
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {paymentHistory.payments.map((payment: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded bg-zinc-50 dark:bg-zinc-800"
                      >
                        <div className="flex-1">
                          <p className="font-mono text-zinc-900 dark:text-zinc-100">
                            {payment.sender.slice(0, 8)}...
                            {payment.sender.slice(-8)}
                          </p>
                          <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {new Date(
                              payment.timestamp * 1000,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {payment.amount.toFixed(2)} USDC
                          </p>
                          <a
                            href={`https://explorer.solana.com/address/${payment.pda}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline text-xs"
                          >
                            View account
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  {paymentHistory.payments.length === 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4">
                      No payment history found
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
