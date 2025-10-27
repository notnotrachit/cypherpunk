"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signIn, useSession, signOut } from "next-auth/react";

type SocialLinks = {
  twitter: string | null;
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
      <div className="space-y-2">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Twitter / X Account
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => linkSocial("twitter")}
            disabled={linking}
            className="flex-1 rounded-lg bg-[#1DA1F2] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a8cd8] disabled:opacity-50 transition-colors"
          >
            {linking
              ? "Linking..."
              : socials?.twitter
                ? "Update Twitter"
                : "Link with Twitter"}
          </button>
        </div>
        {socials?.twitter && (
          <p className="text-xs text-green-600 dark:text-green-400">
            ✓ Linked: {socials.twitter}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        <p className="font-medium">🔒 Secure OAuth via NextAuth:</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>Click a button to authenticate with the social platform</li>
          <li>Your verified handle is linked to your Solana wallet on-chain</li>
          <li>Others can send you tokens using your social handle</li>
        </ul>
      </div>
    </div>
  );
}
