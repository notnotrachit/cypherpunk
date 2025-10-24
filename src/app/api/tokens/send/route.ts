import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionJwt } from "@/lib/auth";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { getRpcUrl, getProgram } from "@/lib/solana-program";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { BN } from "bn.js";

export const dynamic = "force-dynamic";

// USDC Mint Address on Devnet
const USDC_MINT_DEVNET = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");

type SendTokenRequest = {
  recipientWallet: string;
  amount: number;
  message?: string;
};

/**
 * Send USDC tokens to a recipient
 * POST /api/tokens/send
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await verifySessionJwt(sessionToken);
    const senderAddress = payload.sub;

    const body: SendTokenRequest = await req.json();
    const { recipientWallet, amount, message } = body;

    if (!recipientWallet || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: recipientWallet, amount" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Validate addresses
    let senderPubkey: PublicKey;
    let recipientPubkey: PublicKey;

    try {
      senderPubkey = new PublicKey(senderAddress);
      recipientPubkey = new PublicKey(recipientWallet);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Connect to Solana
    const connection = new Connection(getRpcUrl(), "confirmed");

    // Get token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      senderPubkey
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      recipientPubkey
    );

    // Check if sender has token account
    const senderAccountInfo = await connection.getAccountInfo(senderTokenAccount);
    if (!senderAccountInfo) {
      return NextResponse.json(
        { error: "Sender does not have a USDC token account. Please create one first." },
        { status: 400 }
      );
    }

    // Convert amount to smallest unit (USDC has 6 decimals)
    const amountInSmallestUnit = Math.floor(amount * 1_000_000);

    // Create a dummy wallet for the provider (we won't use it to sign)
    const dummyKeypair = Keypair.generate();
    const wallet = new Wallet(dummyKeypair);
    const provider = new AnchorProvider(connection, wallet, {});

    // Get the program
    const program = getProgram(provider);

    // Build the send_token instruction using Anchor
    const instruction = await program.methods
      .sendToken(new BN(amountInSmallestUnit))
      .accounts({
        sender: senderPubkey,
        senderTokenAccount: senderTokenAccount,
        recipientTokenAccount: recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create transaction
    const transaction = await program.methods
      .sendToken(new BN(amountInSmallestUnit))
      .accounts({
        sender: senderPubkey,
        senderTokenAccount: senderTokenAccount,
        recipientTokenAccount: recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPubkey;

    // Serialize transaction for client to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return NextResponse.json({
      success: true,
      transaction: serializedTransaction.toString('base64'),
      message: `Prepared transaction to send ${amount} USDC`,
      details: {
        sender: senderAddress,
        recipient: recipientWallet,
        amount: amount,
        amountInSmallestUnit: amountInSmallestUnit,
        message: message || null,
      }
    });

  } catch (error: any) {
    console.error("Send token error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send tokens" },
      { status: 500 }
    );
  }
}
