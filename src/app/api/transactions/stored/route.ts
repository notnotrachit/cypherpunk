import { NextRequest, NextResponse } from "next/server";

/**
 * This endpoint retrieves locally stored transactions from the Chrome extension
 * The extension stores transactions in chrome.storage.local via the background script
 *
 * Note: Since this is a web API and doesn't have access to chrome.storage directly,
 * we return a message instructing the client to read from localStorage or
 * provide a mechanism for the extension to sync data.
 *
 * For now, we'll document the structure and let the client-side code handle it.
 */

export type StoredTransactionResponse = {
  transactions: Array<{
    id: string;
    timestamp: number;
    type: "sent" | "received";
    handle: string;
    amount: number;
    amountMicro: number;
    senderWallet: string;
    recipientWallet?: string;
    signature?: string;
    status: "pending" | "confirmed" | "failed";
    memo?: string;
  }>;
  source: "chrome-storage" | "localStorage";
  message: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // This endpoint documents the transaction structure
    // The actual retrieval happens on the client-side through the transaction-storage utility
    return NextResponse.json({
      transactions: [],
      source: "chrome-storage",
      message:
        "Use getStoredTransactions() utility or chrome.storage.local API to retrieve transactions",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stored transactions" },
      { status: 500 }
    );
  }
}
