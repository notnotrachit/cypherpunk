"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import PhantomLogin from "./PhantomLogin";

type Props = {
  className?: string;
  address?: string | null;
  showLogout?: boolean;
  onLogoutAction?: () => void;
  // Optional brand icon path (e.g., "/phantom.svg")
  iconSrc?: string;
};

function shortAddress(addr: string | null | undefined, chars = 4) {
  if (!addr) return "";
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export default function Navbar({
  className,
  address,
  showLogout = true,
  onLogoutAction,
  iconSrc = "/phantom.svg",
}: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connect modal state
  const [openConnect, setOpenConnect] = useState(false);
  const openConnectModal = useCallback(() => setOpenConnect(true), []);
  const closeConnectModal = useCallback(() => setOpenConnect(false), []);
  const onAuthenticated = useCallback(
    (_: string) => {
      setOpenConnect(false);
      router.replace("/dashboard");
      router.refresh();
    },
    [router],
  );

  const onLogout = useCallback(async () => {
    if (loggingOut) return;
    setError(null);
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      onLogoutAction?.();
      router.replace("/");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Failed to log out: ${msg}`);
      setLoggingOut(false);
    }
  }, [loggingOut, onLogoutAction, router]);

  return (
    <nav
      className={[
        "sticky top-0 z-40",
        "backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-900/70",
        "bg-white/80 dark:bg-zinc-900/80",
        "border-b border-zinc-200/70 dark:border-zinc-800/70",
        className ?? "",
      ].join(" ")}
      aria-label="Global Navigation"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-lg px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconSrc}
              alt=""
              className="h-7 w-7 rounded-xl ring-1 ring-white/30 group-hover:scale-[1.03] transition-transform dark:ring-white/10"
              draggable={false}
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Cypherpunk
              </span>
              <span className="text-[10px] font-medium text-violet-700/80 dark:text-violet-300/80">
                Solana Auth
              </span>
            </div>
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {address ? (
            <span className="hidden rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200 md:inline dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
              {shortAddress(address)}
            </span>
          ) : null}

          {address ? (
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className={[
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white",
                loggingOut
                  ? "bg-zinc-400 dark:bg-zinc-700 cursor-wait"
                  : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                "transition-colors",
              ].join(" ")}
              title="Log out"
            >
              {loggingOut ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="text-white" />
                  Logging out…
                </span>
              ) : (
                <>
                  <LogoutIcon className="h-4 w-4" />
                  Logout
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={openConnectModal}
              className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-violet-500/30 transition-all hover:scale-[1.01] hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-violet-500 dark:hover:bg-violet-600"
              title="Connect Wallet"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/phantom.svg"
                alt=""
                className="h-4 w-4"
                aria-hidden="true"
              />
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Connect Modal */}
      <Modal
        open={openConnect}
        onCloseAction={closeConnectModal}
        title="Connect your wallet"
        iconSrc="/phantom.svg"
        description="Use Phantom to sign a message. We will verify it on the server before granting access."
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-zinc-100/60 p-3 text-xs text-zinc-600 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-900/40 dark:text-zinc-300 dark:ring-zinc-800">
            No funds are required. This only proves you own the wallet.
          </div>
          <PhantomLogin
            buttonLabel="Continue with Phantom"
            onAuthenticatedAction={onAuthenticated}
          />
        </div>
      </Modal>

      {/* Non-intrusive error line */}
      {error ? (
        <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-1 text-center text-xs text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
          {error}
        </div>
      ) : null}
    </nav>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={["h-4 w-4 animate-spin", className ?? ""].join(" ")}
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

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 4.75A2.75 2.75 0 015.75 2h4.5A2.75 2.75 0 0113 4.75v1a.75.75 0 01-1.5 0v-1c0-.69-.56-1.25-1.25-1.25h-4.5C4.56 3.5 4 4.06 4 4.75v10.5c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25v-1a.75.75 0 011.5 0v1A2.75 2.75 0 0110.25 18h-4.5A2.75 2.75 0 013 15.25V4.75z" />
      <path d="M12.22 6.22a.75.75 0 011.06 0l3 3c.3.3.3.77 0 1.06l-3 3a.75.75 0 11-1.06-1.06l1.72-1.72H8a.75.75 0 010-1.5h5.94l-1.72-1.72a.75.75 0 010-1.06z" />
    </svg>
  );
}
