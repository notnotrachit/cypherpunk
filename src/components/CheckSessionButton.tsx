"use client";

import React, { useCallback, useState } from "react";

type ProtectedOk = {
  ok: true;
  address: string | null;
  nonce: string | null;
  iat: number | null;
  exp: number | null;
  expiresAt: string | null;
  message: string;
};

type ProtectedErr = {
  error: string;
};

type Props = {
  className?: string;
  buttonLabel?: string;
  onCheckedAction?: (result: {
    data: ProtectedOk | null;
    error: string | null;
  }) => void;
};

function shortAddress(addr: string | null | undefined, chars = 4) {
  if (!addr) return "—";
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export default function CheckSessionButton({
  className,
  buttonLabel = "Check session",
  onCheckedAction,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProtectedOk | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/protected", {
        method: "GET",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        cache: "no-store",
      });

      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // ignore parse errors; will handle below
      }

      if (!res.ok) {
        const msg =
          (json as ProtectedErr | null)?.error ??
          `Request failed with status ${res.status}${text ? `: ${text}` : ""}`;
        setError(msg);
        onCheckedAction?.({ data: null, error: msg });
        return;
      }

      setResult(json as ProtectedOk);
      onCheckedAction?.({ data: json as ProtectedOk, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Network error: ${msg}`);
      onCheckedAction?.({ data: null, error: `Network error: ${msg}` });
    } finally {
      setLoading(false);
    }
  }, [onCheckedAction]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={check}
        disabled={loading}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-white transition-colors disabled:cursor-not-allowed ${
          loading ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Checking…
          </span>
        ) : (
          buttonLabel
        )}
      </button>

      {error ? (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-3 space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Address</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              {shortAddress(result.address)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Expires</span>
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              {result.expiresAt ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Status</span>
            <span className="text-emerald-700 dark:text-emerald-400">
              Authenticated
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
