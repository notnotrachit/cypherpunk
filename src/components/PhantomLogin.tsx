"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import bs58 from "bs58";
import { RiWallet3Line } from "react-icons/ri";
import { CgSpinner } from "react-icons/cg";

type Props = {
  className?: string;
  buttonLabel?: string;
  statement?: string;
  onAuthenticatedAction?: (address: string) => void;
  onErrorAction?: (error: Error) => void;
};

type PhantomPublicKeyLike = {
  toString(): string;
};

type PhantomConnectResponse = {
  publicKey: PhantomPublicKeyLike;
};

type PhantomSignMessageResponse = {
  signature: Uint8Array;
  publicKey?: PhantomPublicKeyLike;
};

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: PhantomPublicKeyLike;
  isConnected?: boolean;
  connect: (opts?: {
    onlyIfTrusted?: boolean;
  }) => Promise<PhantomConnectResponse>;
  disconnect: () => Promise<void>;
  signMessage: (
    message: Uint8Array,
    display?: "utf8",
  ) => Promise<PhantomSignMessageResponse>;
};

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}

function getProvider(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const anyWindow = window as Window;
  if (anyWindow?.solana?.isPhantom) return anyWindow.solana!;
  return null;
}

function shortAddress(addr: string, chars = 4) {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export default function PhantomLogin({
  className,
  buttonLabel = "Sign in with Phantom",
  statement = "Please sign this message to authenticate with the application.",
  onAuthenticatedAction,
  onErrorAction,
}: Props) {
  const provider = useMemo(getProvider, []);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [signing, setSigning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installed = !!provider;

  useEffect(() => {
    // Attempt to hydrate current address if already connected
    if (!provider) return;
    if (provider.publicKey) {
      try {
        const a = provider.publicKey.toString();
        if (a) setAddress(a);
      } catch {
        // ignore
      }
    }
  }, [provider]);

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

  const handleDisconnect = useCallback(async () => {
    clearErrors();
    try {
      if (provider?.disconnect) {
        await provider.disconnect();
      }
    } catch {
      // ignore provider disconnect errors
    } finally {
      setAddress(null);
    }
  }, [provider]);

  const busy = connecting || signing || verifying;

  return (
    <div className={className}>
      {!installed ? (
        <a
          href="https://phantom.app/download"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center rounded-md bg-violet-600 px-5 py-3 text-sm font-medium text-white transition-all hover:bg-violet-700 focus:outline-none  dark:bg-violet-500 dark:hover:bg-violet-600"
        >
          <span className="inline-flex items-center gap-2">
            <RiWallet3Line className="h-5 w-5" aria-hidden="true" />
            Install Phantom
          </span>
        </a>
      ) : (
        <div className="w-full space-y-3">
          <div className="w-full">
            <button
              disabled={busy}
              onClick={handleSignIn}
              className={`inline-flex w-full items-center justify-center rounded-md ${
                busy
                  ? "bg-zinc-400 dark:bg-zinc-700 cursor-wait"
                  : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600"
              } px-5 py-3 text-sm font-medium text-white transition-all focus:outline-none disabled:cursor-not-allowed`}
              title="Connect your wallet"
            >
              {busy ? (
                <span
                  className="inline-flex items-center gap-2"
                  aria-live="polite"
                >
                  <CgSpinner className="h-4 w-4 animate-spin text-white" />
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
                  <RiWallet3Line className="h-5 w-5" aria-hidden="true" />
                  {buttonLabel}
                </span>
              )}
            </button>
          </div>

          {error ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <p className="text-xs text-zinc-500 text-center">
            By clicking “{buttonLabel}”, you will connect your wallet, sign a
            message, and we’ll verify it on the server before granting access.
          </p>
        </div>
      )}
    </div>
  );
}
