"use client";

import { useState } from "react";

type LookupResult = {
  found: boolean;
  wallet?: string;
  handle?: string;
  platform?: string;
  socials?: {
    twitter: string | null;
    instagram: string | null;
    linkedin: string | null;
  };
};

export default function SocialLookup() {
  const [activeTab, setActiveTab] = useState<"by-wallet" | "by-handle">("by-wallet");
  
  // By Wallet
  const [walletAddress, setWalletAddress] = useState("");
  const [walletResult, setWalletResult] = useState<LookupResult | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  
  // By Handle
  const [socialHandle, setSocialHandle] = useState("");
  const [platform, setPlatform] = useState<"twitter" | "instagram" | "linkedin">("twitter");
  const [handleResult, setHandleResult] = useState<LookupResult | null>(null);
  const [handleLoading, setHandleLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const searchByWallet = async () => {
    if (!walletAddress.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    try {
      setWalletLoading(true);
      setError(null);
      setWalletResult(null);

      const response = await fetch(`/api/social/get?wallet=${walletAddress}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch social links");
      }

      setWalletResult({
        found: data.linked,
        wallet: data.wallet,
        socials: data.socials,
      });
    } catch (err: any) {
      setError(err.message || "Failed to search");
    } finally {
      setWalletLoading(false);
    }
  };

  const searchByHandle = async () => {
    if (!socialHandle.trim()) {
      setError("Please enter a social handle");
      return;
    }

    try {
      setHandleLoading(true);
      setError(null);
      setHandleResult(null);

      const response = await fetch(
        `/api/social/find-wallet?handle=${encodeURIComponent(socialHandle)}&platform=${platform}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find wallet");
      }

      setHandleResult({
        found: data.found,
        wallet: data.wallet,
        handle: data.handle,
        platform: data.platform,
      });
    } catch (err: any) {
      setError(err.message || "Failed to search");
    } finally {
      setHandleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveTab("by-wallet")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "by-wallet"
              ? "border-b-2 border-violet-600 text-violet-600 dark:text-violet-400"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Search by Wallet
        </button>
        <button
          onClick={() => setActiveTab("by-handle")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "by-handle"
              ? "border-b-2 border-violet-600 text-violet-600 dark:text-violet-400"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Search by Social Handle
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Search by Wallet */}
      {activeTab === "by-wallet" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Wallet Address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter Solana wallet address"
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                onKeyDown={(e) => e.key === "Enter" && searchByWallet()}
              />
              <button
                onClick={searchByWallet}
                disabled={walletLoading}
                className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-700"
              >
                {walletLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {walletResult && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              {walletResult.found ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✓</span>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Social Links Found
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 w-24">
                        Twitter:
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {walletResult.socials?.twitter || (
                          <span className="text-zinc-400">Not linked</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 w-24">
                        Instagram:
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {walletResult.socials?.instagram || (
                          <span className="text-zinc-400">Not linked</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 w-24">
                        LinkedIn:
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {walletResult.socials?.linkedin || (
                          <span className="text-zinc-400">Not linked</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="text-2xl">ℹ️</span>
                  <p>No social links found for this wallet</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Search by Handle */}
      {activeTab === "by-handle" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Platform
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPlatform("twitter")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  platform === "twitter"
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                Twitter
              </button>
              <button
                onClick={() => setPlatform("instagram")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  platform === "instagram"
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                Instagram
              </button>
              <button
                onClick={() => setPlatform("linkedin")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  platform === "linkedin"
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                LinkedIn
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Social Handle
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                placeholder={
                  platform === "linkedin"
                    ? "Enter LinkedIn username"
                    : "Enter handle (e.g., @username)"
                }
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                onKeyDown={(e) => e.key === "Enter" && searchByHandle()}
              />
              <button
                onClick={searchByHandle}
                disabled={handleLoading}
                className="rounded-lg bg-violet-600 px-6 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-700"
              >
                {handleLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {handleResult && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              {handleResult.found ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✓</span>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Wallet Found
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 w-24">
                        Handle:
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100">
                        {handleResult.handle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 w-24">
                        Platform:
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100 capitalize">
                        {handleResult.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 w-24">
                        Wallet:
                      </span>
                      <code className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                        {handleResult.wallet}
                      </code>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <span className="text-2xl">ℹ️</span>
                  <p>No wallet found for this {platform} handle</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        <p className="font-medium mb-2">💡 How to use:</p>
        <ul className="list-inside list-disc space-y-1 text-xs">
          <li><strong>Search by Wallet:</strong> Find all social accounts linked to a Solana wallet</li>
          <li><strong>Search by Handle:</strong> Find the Solana wallet linked to a social account</li>
          <li>All data is stored on-chain and publicly queryable</li>
        </ul>
      </div>
    </div>
  );
}
