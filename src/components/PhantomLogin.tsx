"use client";

import React, { useCallback, useMemo, useState } from "react";
import bs58 from "bs58";
import { Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  className?: string;
  buttonLabel?: string;
  statement?: string;
  onAuthenticatedAction?: (address: string) => void;
  onErrorAction?: (error: Error) => void;
};

function getProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const anyWindow = window as Window;
  if (anyWindow?.solana?.isPhantom) return anyWindow.solana!;
  return null;
}

export default function PhantomLogin({
  className,
  buttonLabel = "Sign in with Phantom",
  statement = "Please sign this message to authenticate with the application.",
  onAuthenticatedAction,
  onErrorAction,
}: Props) {
  const provider = useMemo(() => getProvider(), []);
  const [address, setAddress] = useState<string | null>(
    () => provider?.publicKey?.toString() ?? null,
  );
  const [connecting, setConnecting] = useState(false);
  const [signing, setSigning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installed = !!provider;

  const clearErrors = () => setError(null);

  const connectWallet = useCallback(async (): Promise<string> => {
    if (!provider)
      throw new Error("Phantom wallet not detected. Please install Phantom.");
    const { publicKey } = await provider.connect();
    const addr = publicKey.toString();
    setAddress(addr);
    return addr;
  }, [provider]);

  const signMessageWithWallet = useCallback(
    async (message: string): Promise<Uint8Array> => {
      if (!provider) throw new Error("Phantom wallet not detected.");
      const bytes = new TextEncoder().encode(message);
      // Phantom supports signMessage(Uint8Array, "utf8") in many versions; fallback to single-arg.
      if (!provider.signMessage)
        throw new Error("Provider cannot sign messages");
      try {
        const { signature } = await provider.signMessage(bytes, "utf8");
        return signature;
      } catch {
        const { signature } = await provider.signMessage(bytes);
        return signature;
      }
    },
    [provider],
  );

  const fetchNonceAndMessage = useCallback(
    async (addr: string): Promise<{ nonce: string; message: string }> => {
      const params = new URLSearchParams({
        address: addr,
        statement,
      });
      const res = await fetch(`/api/auth/nonce?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to fetch nonce: ${res.status} ${text}`);
      }
      const data = (await res.json()) as {
        nonce: string;
        message?: string;
        address?: string;
      };
      if (!data?.nonce) throw new Error("Server did not return a login nonce.");
      if (!data?.message)
        throw new Error("Server did not return a sign-in message.");
      return { nonce: data.nonce, message: data.message };
    },
    [statement],
  );

  const verifySignature = useCallback(
    async (
      addr: string,
      signatureB58: string,
      message: string,
    ): Promise<void> => {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address: addr,
          signature: signatureB58,
          message,
        }),
      });
      if (!res.ok) {
        let data: unknown = null;
        try {
          data = await res.json();
        } catch {
          // ignore parse errors
        }
        const msg =
          (data as { error?: string } | null)?.error ||
          `Verification failed (${res.status})`;
        throw new Error(msg);
      }
    },
    [],
  );

  const handleSignIn = useCallback(async () => {
    clearErrors();
    try {
      const task = (async () => {
        setConnecting(true);
        const addr = address ?? (await connectWallet());
        setConnecting(false);

        setSigning(true);
        const { message } = await fetchNonceAndMessage(addr);
        const signature = await signMessageWithWallet(message);
        setSigning(false);

        const signatureB58 = bs58.encode(signature);

        setVerifying(true);
        await verifySignature(addr, signatureB58, message);
        setVerifying(false);
        return addr;
      })();

      toast.promise(task, {
        loading: "Authenticating…",
        success: "Signed in",
        error: (err: unknown) =>
          (err instanceof Error ? err.message : String(err)) ||
          "Authentication failed",
      });
      const addr = await task;

      if (onAuthenticatedAction) {
        onAuthenticatedAction(addr);
      } else {
        window.location.assign("/dashboard");
      }
    } catch (e: unknown) {
      setConnecting(false);
      setSigning(false);
      setVerifying(false);
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message || "Authentication failed");
      toast.error(err.message || "Authentication failed");
      onErrorAction?.(err);
    }
  }, [
    address,
    connectWallet,
    fetchNonceAndMessage,
    onAuthenticatedAction,
    onErrorAction,
    signMessageWithWallet,
    verifySignature,
  ]);

  const busy = connecting || signing || verifying;

  return (
    <div className={className}>
      {!installed ? (
        <Button asChild className="w-full" size="lg">
          <a href="https://phantom.app/download" target="_blank" rel="noreferrer">
            <span className="inline-flex items-center gap-2">
              <Wallet className="h-5 w-5" aria-hidden="true" />
              Install Phantom
            </span>
          </a>
        </Button>
      ) : (
        <div className="w-full space-y-3">
          <div className="w-full">
            <Button disabled={busy} onClick={handleSignIn} className="w-full" size="lg" title="Connect your wallet">
              {busy ? (
                <span
                  className="inline-flex items-center gap-2"
                  aria-live="polite"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {connecting
                    ? "Connecting…"
                    : signing
                      ? "Signing…"
                      : verifying
                        ? "Verifying…"
                        : "Working…"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Wallet className="h-5 w-5" aria-hidden="true" />
                  {buttonLabel}
                </span>
              )}
            </Button>
          </div>

          {null}

          <p className="text-xs text-muted-foreground text-center">
            By clicking “{buttonLabel}”, you will connect your wallet, sign a
            message, and we’ll verify it on the server before granting access.
          </p>
        </div>
      )}
    </div>
  );
}
