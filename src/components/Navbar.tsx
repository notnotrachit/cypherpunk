"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PhantomLogin from "./PhantomLogin";
import { ArrowRight, Loader2, Plug, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModeToggle } from "@/components/ModeToggle";
import { toast } from "sonner";

type Props = {
  className?: string;
  address?: string | null;
  showLogout?: boolean;
  onLogoutAction?: () => void;
  // Optional brand icon path (e.g., "/phantom.svg")
  iconSrc?: string;
};

export default function Navbar({ className, address, onLogoutAction }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  // Connect modal state
  const [openConnect, setOpenConnect] = useState(false);
  const openConnectModal = useCallback(() => setOpenConnect(true), []);
  const closeConnectModal = useCallback(() => setOpenConnect(false), []);
  const onAuthenticated = useCallback(() => {
    setOpenConnect(false);
    router.replace("/dashboard");
    router.refresh();
  }, [router]);

  const onLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });
      onLogoutAction?.();
      toast.success("Logged out");
      router.replace("/");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Failed to log out: ${msg}`);
      setLoggingOut(false);
    }
  }, [loggingOut, onLogoutAction, router]);

  return (
    <nav
      className={[
        "bg-transparent",
        "border-b border-transparent",
        className ?? "",
      ].join(" ")}
      aria-label="Global Navigation"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        {/* Brand */}
        <div className="flex min-w-0 items-center">
          <Link
            href="/"
            className="group rounded-lg px-1 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="text-3xl font-bold tracking-wider text-foreground font-logo">
              RIVO
            </span>
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <ModeToggle />
          {address ? (
            <Button type="button" onClick={onLogout} disabled={loggingOut} title="Log out" size="sm">
              {loggingOut ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging out…
                </span>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Logout
                </>
              )}
            </Button>
          ) : (
            <Button type="button" onClick={openConnectModal} title="Get Started" size="sm">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              Get Started
            </Button>
          )}
        </div>
      </div>

      {/* Connect Dialog */}
      <Dialog open={openConnect} onOpenChange={(o) => (o ? openConnectModal() : closeConnectModal())}>
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
    </nav>
  );
}
