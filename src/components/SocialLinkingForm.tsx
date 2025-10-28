"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signIn, useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Twitter } from "lucide-react";

type TwitterProfile = {
  handle: string;
  name: string;
  profileImageUrl: string;
};

type SocialLinks = {
  twitter: TwitterProfile | null;
};

type Props = {
  walletAddress: string;
};

export default function SocialLinkingForm({ walletAddress }: Props) {
  const [socials, setSocials] = useState<SocialLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const linkedSessionRef = useRef<string | null>(null); // Track which session we've already linked

  const fetchSocialLinks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/social/get?wallet=${walletAddress}`);
      const data = await res.json();

      if (data.linked && data.socials) {
        setSocials(data.socials);
      }
    } catch (err) {
      console.error("Failed to fetch social links:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const linkToBlockchain = useCallback(async () => {
    if (!session || linking) return;

    const sessionId = `${session.provider}-${session.username}`;

    // Skip if we've already linked this exact session
    if (linkedSessionRef.current === sessionId) return;

    linkedSessionRef.current = sessionId; // Mark this session as being linked
    setLinking(true);

    try {
      const task = (async () => {
        const res = await fetch("/api/social/link-verified", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          linkedSessionRef.current = null; // Reset on error so user can retry
          throw new Error(data.error || "Failed to link");
        }
        await fetchSocialLinks();
        return `${session.provider} (@${session.username})`;
      })();

      await toast.promise(task, {
        loading: "Linking account…",
        success: (s) => `Linked ${s}`,
        error: (e: unknown) =>
          (e instanceof Error ? e.message : String(e)) || "Failed to link account",
      });

      setSuccess(
        `${session.provider} account (${session.username}) linked successfully!`,
      );
      // Sign out from NextAuth (clear OAuth session) after successful link
      setTimeout(async () => {
        await signOut({ redirect: false });
        setSuccess(null);
        // linkedSessionRef stays set to prevent re-linking the same account immediately
      }, 3000);
    } catch (err: unknown) {
      setError(
        (err instanceof Error && err.message) || "Failed to link account",
      );
      toast.error(
        (err instanceof Error && err.message) || "Failed to link account",
      );
    } finally {
      setLinking(false);
    }
  }, [session, linking, fetchSocialLinks]);

  useEffect(() => {
    fetchSocialLinks();
  }, [fetchSocialLinks]);

  // Auto-link when returning from OAuth
  useEffect(() => {
    const sessionId = session?.provider
      ? `${session.provider}-${session.username}`
      : null;

    // Only link if we have a session, it's authenticated, and we haven't linked this exact session yet
    if (
      session &&
      status === "authenticated" &&
      sessionId &&
      linkedSessionRef.current !== sessionId
    ) {
      linkToBlockchain();
    }
  }, [session, status, linkToBlockchain]);

  const linkSocial = async (provider: "twitter") => {
    setError(null);
    setSuccess(null);

    try {
      // Trigger OAuth - will redirect to provider and back
      toast.info("Redirecting to Twitter…");
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (err: unknown) {
      setError(
        (err instanceof Error && err.message) || "Failed to start OAuth",
      );
      toast.error(
        (err instanceof Error && err.message) || "Failed to start OAuth",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Show authenticated user info */}
      {session && session.username && (
        <div className="rounded-lg border p-4 text-sm">
          <p className="font-medium">Authenticated with {session.provider}:</p>
          <p className="mt-1 text-xs">
            Username: <strong>@{session.username}</strong>
          </p>
          {linking && (
            <p className="mt-2 text-xs animate-pulse">Linking to blockchain...</p>
          )}
        </div>
      )}

      {null}

      {/* Twitter */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Twitter / X Account</h2>
        <p className="text-sm text-muted-foreground">
          Link your Twitter / X account so that people can directly send funds
          to you via your profile on the platform.
        </p>
        {socials?.twitter ? (
          <div className="flex items-center gap-4 rounded-lg border py-2 px-4">
            <Image
              src={socials.twitter.profileImageUrl}
              alt={`@${socials.twitter.handle} profile picture`}
              width={32}
              height={32}
              className="h-10 w-10 rounded-full"
            />
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {socials.twitter.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {socials.twitter.handle}
              </p>
            </div>
            <Button onClick={() => linkSocial("twitter")} disabled={linking} size="sm" variant="secondary">
              {linking ? (
                "Linking..."
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Twitter className="h-4 w-4" />
                  Relink
                </span>
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={() => linkSocial("twitter")} disabled={linking} className="w-full" size="lg">
            {linking ? (
              "Linking..."
            ) : (
              <span className="inline-flex items-center gap-2">
                <Twitter className="h-5 w-5" />
                Link with Twitter
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
