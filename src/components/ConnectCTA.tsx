"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import PhantomLogin from "./PhantomLogin";
import { ArrowRight, Loader2, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
        <Badge variant="outline" className="hidden md:inline font-mono">
          {shortAddress(address)}
        </Badge>
      ) : null}

      {address ? (
        <Button type="button" onClick={goToDashboard} disabled={navigating}>
          {navigating ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Opening…
            </span>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {dashboardLabel}
            </>
          )}
        </Button>
      ) : (
        <>
          <Button type="button" onClick={openModal} size="lg">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
            {connectLabel}
          </Button>

          <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeModal())}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" aria-hidden="true" />
                  Connect your wallet
                </DialogTitle>
                <DialogDescription>
                  Connect your Phantom wallet and sign a message. We’ll verify it on the server to securely sign you in.
                </DialogDescription>
              </DialogHeader>
              <PhantomLogin
                buttonLabel="Continue with Phantom"
                onAuthenticatedAction={onAuthenticated}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={["h-4 w-4 animate-spin", className ?? ""].join(" ")}
      aria-hidden="true" />
  );
}
