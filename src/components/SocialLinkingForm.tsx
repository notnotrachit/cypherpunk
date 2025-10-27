"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signIn, useSession, signOut } from "next-auth/react";
import Image from "next/image";

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
      const res = await fetch("/api/social/link-verified", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        linkedSessionRef.current = null; // Reset on error so user can retry
        throw new Error(data.error || "Failed to link");
      }

      setSuccess(
        `${session.provider} account (${session.username}) linked successfully!`,
      );
      await fetchSocialLinks();

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
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (err: unknown) {
      setError(
        (err instanceof Error && err.message) || "Failed to start OAuth",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Show authenticated user info */}
      {session && session.username && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200">
          <p className="font-medium">
            ✓ Authenticated with {session.provider}:
          </p>
          <p className="mt-1 text-xs">
            Username: <strong>@{session.username}</strong>
          </p>
          {linking && (
            <p className="mt-2 text-xs animate-pulse">
              Linking to blockchain...
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {success}
        </div>
      )}

      {/* Twitter */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Twitter / X Account
        </label>
        <p className="  text-xs text-zinc-500 dark:text-zinc-500">
          Link your Twitter / X account so that people can directly send funds
          to you via your profile on the platform.
        </p>
        {socials?.twitter ? (
          <div className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-zinc-50 py-2 px-4 dark:border-zinc-800 dark:bg-zinc-800/50">
            <Image
              src={socials.twitter.profileImageUrl}
              alt={`@${socials.twitter.handle} profile picture`}
              width={32}
              height={32}
              className="h-10 w-10 rounded-full"
            />
            <div className="flex-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {socials.twitter.name}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {socials.twitter.handle}
              </p>
            </div>
            <button
              onClick={() => linkSocial("twitter")}
              disabled={linking}
              className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300 disabled:opacity-50 transition-colors dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              {linking ? "Linking..." : "Relink"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => linkSocial("twitter")}
            disabled={linking}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1DA1F2] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a8cd8] disabled:opacity-50 transition-colors"
          >
            {linking ? "Linking..." : "Link with Twitter"}
          </button>
        )}
      </div>
    </div>
  );
}
