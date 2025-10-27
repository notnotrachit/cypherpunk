"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import PhantomLogin from "./PhantomLogin";
import { RiArrowRightLine } from "react-icons/ri";
import { CgSpinner } from "react-icons/cg";
import { SiGitconnected } from "react-icons/si";

type Props = {
  className?: string;
  address?: string | null;
  showAddressChip?: boolean;
  connectLabel?: string;
  dashboardLabel?: string;
};

function shortAddress(addr: string | null | undefined, chars = 4) {
  if (!addr) return "";
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}

export default function ConnectCTA({
  className,
  address,
  showAddressChip = true,
  connectLabel = "Get Started",
  dashboardLabel = "Go to Dashboard",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const onAuthenticated = useCallback(
    (_wallet: string) => {
      void _wallet;
      setOpen(false);
      router.replace("/dashboard");
      router.refresh();
    },
    [router],
  );

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  const goToDashboard = useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    router.push("/dashboard");
    // refresh after a short delay to ensure UI picks up session changes (defensive)
    setTimeout(() => router.refresh(), 0);
  }, [router, navigating]);

  return (
    <div className={["flex items-center gap-3", className ?? ""].join(" ")}>
      {showAddressChip && address ? (
        <span className="hidden rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200 md:inline dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700">
          {shortAddress(address)}
        </span>
      ) : null}

      {address ? (
        <button
          type="button"
          onClick={goToDashboard}
          disabled={navigating}
          className={[
            "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white",
            navigating
              ? "bg-zinc-400 dark:bg-zinc-700 cursor-wait"
              : "bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
            "transition-colors",
          ].join(" ")}
        >
          {navigating ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="text-white" />
              Opening…
            </span>
          ) : (
            <>
              <RiArrowRightLine className="h-4 w-4" aria-hidden="true" />
              {dashboardLabel}
            </>
          )}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2.5 rounded-md bg-violet-600 px-6 py-3 text-base font-semibold text-white ring-1 ring-violet-500/30 transition-all hover:scale-[1.01] hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:bg-violet-500 dark:hover:bg-violet-600"
          >
            <RiArrowRightLine className="h-5 w-5" aria-hidden="true" />
            {connectLabel}
          </button>

          <Modal
            open={open}
            onCloseAction={closeModal}
            title="Connect your wallet"
            icon={<SiGitconnected className="h-5 w-5" aria-hidden="true" />}
            description="Connect your Phantom wallet and sign a message. We’ll verify it on the server to securely sign you in."
            size="sm"
          >
            <PhantomLogin
              buttonLabel="Continue with Phantom"
              onAuthenticatedAction={onAuthenticated}
            />
          </Modal>
        </>
      )}
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <CgSpinner
      className={["h-4 w-4 animate-spin", className ?? ""].join(" ")}
    />
  );
}
