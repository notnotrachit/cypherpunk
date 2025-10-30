import { NextRequest, NextResponse } from "next/server";

/**
 * This endpoint retrieves locally stored transactions from the extension
 * The extension stores transactions in chrome.storage.local and this endpoint
 * reads from localStorage (which the extension content script has access to)
 */
export async function GET(request: NextRequest) {
  try {
    // This endpoint is meant to be called from a browser context
    // The actual data is stored in localStorage by the extension content script
    // We'll return instructions for the client to read from localStorage directly

    return NextResponse.json({
      message: "Use getStoredTransactions() utility to read from localStorage",
      storageKey: "cypherpunk_transactions"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
