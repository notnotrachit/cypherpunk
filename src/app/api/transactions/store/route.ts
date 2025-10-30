import { NextRequest, NextResponse } from "next/server";

/**
 * Store a transaction record sent from the extension
 * This endpoint allows the extension to persist transaction history
 * that can be accessed by the dashboard
 */

export type TransactionRecord = {
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
};

// In-memory store for now (can be replaced with database)
const transactions: TransactionRecord[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transaction: TransactionRecord = body;

    // Validate required fields
    if (!transaction.id || !transaction.timestamp || !transaction.senderWallet) {
      return NextResponse.json(
        { error: "Missing required transaction fields" },
        { status: 400 }
      );
    }

    // Add to store (prepend to keep most recent first)
    transactions.unshift(transaction);

    // Keep only last 1000 transactions
    if (transactions.length > 1000) {
      transactions.pop();
    }

    console.log(`✅ Transaction stored: ${transaction.id} - ${transaction.amount} USDC to @${transaction.handle}`);

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      message: "Transaction stored successfully",
    });
  } catch (error) {
    console.error("Error storing transaction:", error);
    return NextResponse.json(
      { error: "Failed to store transaction" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query params
    const url = new URL(request.url);
    const wallet = url.searchParams.get("wallet");
    const handle = url.searchParams.get("handle");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    let filtered = transactions;

    // Filter by wallet if provided
    if (wallet) {
      filtered = filtered.filter((t) => t.senderWallet === wallet);
    }

    // Filter by handle if provided
    if (handle) {
      filtered = filtered.filter((t) => t.handle === handle);
    }

    // Apply limit
    const result = filtered.slice(0, limit);

    return NextResponse.json({
      transactions: result,
      total: result.length,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
