/**
 * Local transaction storage utility
 * Stores USDC transactions sent via the extension in localStorage
 */

export type LocalTransaction = {
  id: string;
  timestamp: number;
  type: "sent" | "received"; // 'sent' for extension-initiated, 'received' for claimed
  handle: string; // Social handle (Twitter handle)
  amount: number; // In USDC (not micro-units)
  amountMicro: number; // In micro-units
  senderWallet: string;
  recipientWallet?: string; // May be empty if sent to unlinked wallet
  signature?: string; // Transaction signature
  status: "pending" | "confirmed" | "failed";
  memo?: string; // Optional message
};

const STORAGE_KEY = "cypherpunk_transactions";

/**
 * Get all stored transactions from the Chrome extension
 * Uses messaging system to communicate with localhost content script
 */
export async function getStoredTransactions(
  wallet?: string,
  handle?: string,
): Promise<LocalTransaction[]> {
  try {
    if (typeof window === "undefined") {
      console.warn("Cannot fetch transactions on server-side");
      return [];
    }

    // Build query params
    const params = new URLSearchParams();
    if (wallet) params.append("wallet", wallet);
    if (handle) params.append("handle", handle);

    const url = `/api/transactions/store?${params.toString()}`;

    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      console.warn("Failed to fetch stored transactions");
      return [];
    }

    const data = await response.json();
    const transactions = data.transactions || [];

    if (transactions.length > 0) {
      console.log(
        `[Transaction Storage] Retrieved ${transactions.length} transactions from API`,
      );
    }

    return transactions;
  } catch (e) {
    console.error("Error reading stored transactions:", e);
    return [];
  }
}

/**
 * Add a new transaction to storage
 */
export function addTransaction(transaction: LocalTransaction): void {
  try {
    const transactions = getStoredTransactions();
    transactions.unshift(transaction); // Add to beginning (most recent first)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error("Error storing transaction:", e);
  }
}

/**
 * Update a transaction's status (e.g., pending -> confirmed)
 */
export function updateTransactionStatus(
  txId: string,
  status: "pending" | "confirmed" | "failed",
  signature?: string,
): void {
  try {
    const transactions = getStoredTransactions();
    const tx = transactions.find((t) => t.id === txId);
    if (tx) {
      tx.status = status;
      if (signature) {
        tx.signature = signature;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }
  } catch (e) {
    console.error("Error updating transaction:", e);
  }
}

/**
 * Clear all stored transactions
 */
export function clearAllTransactions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Error clearing transactions:", e);
  }
}

/**
 * Get transactions for a specific handle
 */
export function getTransactionsForHandle(handle: string): LocalTransaction[] {
  const transactions = getStoredTransactions();
  return transactions.filter((t) => t.handle === handle);
}

/**
 * Generate unique transaction ID
 */
export function generateTxId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
