import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { getRpcUrl } from "@/lib/solana-program";

const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from middleware-injected header
    const walletAddress = request.headers.get("x-wallet-address");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const connection = new Connection(getRpcUrl(), "confirmed");
    const walletPubkey = new PublicKey(walletAddress);

    // Get the associated token account for this wallet and USDC mint
    const tokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      walletPubkey
    );

    try {
      // Fetch the token account info
      const accountInfo = await getAccount(connection, tokenAccount);

      // Convert from micro units (6 decimals) to USDC
      const balance = Number(accountInfo.amount) / 1_000_000;

      return NextResponse.json({
        balance,
        balanceMicro: Number(accountInfo.amount),
        tokenAccount: tokenAccount.toBase58(),
        mint: USDC_MINT.toBase58(),
      });
    } catch (e) {
      // Token account doesn't exist yet - balance is 0
      console.log("Token account does not exist for wallet:", walletAddress);
      return NextResponse.json({
        balance: 0,
        balanceMicro: 0,
        tokenAccount: tokenAccount.toBase58(),
        mint: USDC_MINT.toBase58(),
      });
    }
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch balance",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
