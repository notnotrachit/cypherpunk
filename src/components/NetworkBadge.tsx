"use client";

import { useEffect, useState } from "react";

export default function NetworkBadge() {
  const [network, setNetwork] = useState<string>("Loading...");

  useEffect(() => {
    // Fetch network info from API
    fetch("/api/network-info")
      .then((res) => res.json())
      .then((data) => setNetwork(data.network))
      .catch(() => setNetwork("Unknown"));
  }, []);

  const getNetworkColor = () => {
    switch (network.toLowerCase()) {
      case "mainnet":
        return "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-800";
      case "devnet":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800";
      case "localhost":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800";
      default:
        return "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700";
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${getNetworkColor()}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
      </span>
      {network}
    </div>
  );
}
