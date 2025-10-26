import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SocialLinking } from "../target/types/social_linking";
import { expect } from "chai";
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount
} from "@solana/spl-token";

describe("social_linking", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SocialLinking as Program<SocialLinking>;
  
  let configPda: anchor.web3.PublicKey;
  let mint: anchor.web3.PublicKey;
  let adminTokenAccount: any;
  
  before(async () => {
    // Get config PDA
    [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    // Create a test token mint
    mint = await createMint(
      provider.connection,
      (provider.wallet as any).payer,
      provider.wallet.publicKey,
      null,
      9 // 9 decimals
    );

    // Create token account for admin
    adminTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      provider.wallet.publicKey
    );

    // Mint some tokens to admin
    await mintTo(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      adminTokenAccount.address,
      provider.wallet.publicKey,
      1000000000000 // 1000 tokens
    );
  });

  it("Initializes the config", async () => {
    await (program as any).methods
      .initialize()
      .accounts({
        config: configPda,
        admin: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const config = await (program.account as any).config.fetch(configPda);
    expect(config.admin.toString()).to.equal(provider.wallet.publicKey.toString());
    console.log("✅ Config initialized with admin:", config.admin.toString());
  });

  it("Links a Twitter account", async () => {
    const user = anchor.web3.Keypair.generate();
    const twitterHandle = "@testuser";

    const [socialLinkPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("social_link"), user.publicKey.toBuffer()],
      program.programId
    );

    await (program as any).methods
      .linkTwitter(twitterHandle)
      .accounts({
        socialLink: socialLinkPda,
        user: user.publicKey,
        admin: provider.wallet.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const socialLink = await (program.account as any).socialLink.fetch(socialLinkPda);
    expect(socialLink.twitter).to.equal(twitterHandle);
    expect(socialLink.owner.toString()).to.equal(user.publicKey.toString());
    console.log("✅ Twitter linked:", twitterHandle, "to", user.publicKey.toString().slice(0, 8) + "...");
  });

  it("Links Instagram and LinkedIn to same user", async () => {
    const user = anchor.web3.Keypair.generate();
    const instagramHandle = "@instauser";
    const linkedinHandle = "linkedin-user";

    const [socialLinkPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("social_link"), user.publicKey.toBuffer()],
      program.programId
    );

    // Link Instagram
    await (program as any).methods
      .linkInstagram(instagramHandle)
      .accounts({
        socialLink: socialLinkPda,
        user: user.publicKey,
        admin: provider.wallet.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Link LinkedIn
    await (program as any).methods
      .linkLinkedin(linkedinHandle)
      .accounts({
        socialLink: socialLinkPda,
        user: user.publicKey,
        admin: provider.wallet.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const socialLink = await (program.account as any).socialLink.fetch(socialLinkPda);
    expect(socialLink.instagram).to.equal(instagramHandle);
    expect(socialLink.linkedin).to.equal(linkedinHandle);
    console.log("✅ Multiple socials linked to same user");
  });

  it("Sends tokens to a linked user", async () => {
    const sender = provider.wallet.publicKey;
    const recipient = anchor.web3.Keypair.generate();
    
    // Link recipient's Twitter
    const [socialLinkPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("social_link"), recipient.publicKey.toBuffer()],
      program.programId
    );

    await (program as any).methods
      .linkTwitter("@recipient")
      .accounts({
        socialLink: socialLinkPda,
        user: recipient.publicKey,
        admin: provider.wallet.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create token account for recipient
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      recipient.publicKey
    );

    const amount = 100000000; // 0.1 tokens

    await (program as any).methods
      .sendToken(new anchor.BN(amount))
      .accounts({
        sender: sender,
        senderTokenAccount: adminTokenAccount.address,
        recipientTokenAccount: recipientTokenAccount.address,
        recipient: recipient.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const recipientBalance = await getAccount(provider.connection, recipientTokenAccount.address);
    expect(recipientBalance.amount.toString()).to.equal(amount.toString());
    console.log("✅ Sent", amount / 1e9, "tokens to linked user");
  });

  it("Sends tokens to unlinked user (escrow)", async () => {
    const socialHandle = "@unlinkeduser";
    const amount = 50000000; // 0.05 tokens

    const [pendingClaimPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
      program.programId
    );

    // Create escrow token account
    const escrowTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      configPda,
      true // allowOwnerOffCurve
    );

    await (program as any).methods
      .sendTokenToUnlinked(socialHandle, new anchor.BN(amount))
      .accounts({
        sender: provider.wallet.publicKey,
        senderTokenAccount: adminTokenAccount.address,
        escrowTokenAccount: escrowTokenAccount.address,
        pendingClaim: pendingClaimPda,
        config: configPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const pendingClaim = await (program.account as any).pendingClaim.fetch(pendingClaimPda);
    expect(pendingClaim.socialHandle).to.equal(socialHandle);
    expect(pendingClaim.amount.toString()).to.equal(amount.toString());
    expect(pendingClaim.claimed).to.be.false;
    console.log("✅ Sent", amount / 1e9, "tokens to escrow for", socialHandle);
  });

  it("Claims tokens from escrow", async () => {
    const claimer = anchor.web3.Keypair.generate();
    const socialHandle = "@claimuser";
    const amount = 75000000; // 0.075 tokens

    // First, send tokens to escrow
    const [pendingClaimPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pending_claim"), Buffer.from(socialHandle)],
      program.programId
    );

    const escrowTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      configPda,
      true
    );

    await (program as any).methods
      .sendTokenToUnlinked(socialHandle, new anchor.BN(amount))
      .accounts({
        sender: provider.wallet.publicKey,
        senderTokenAccount: adminTokenAccount.address,
        escrowTokenAccount: escrowTokenAccount.address,
        pendingClaim: pendingClaimPda,
        config: configPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Now link the claimer's account
    const [socialLinkPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("social_link"), claimer.publicKey.toBuffer()],
      program.programId
    );

    await (program as any).methods
      .linkTwitter(socialHandle)
      .accounts({
        socialLink: socialLinkPda,
        user: claimer.publicKey,
        admin: provider.wallet.publicKey,
        config: configPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Create token account for claimer
    const claimerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as any).payer,
      mint,
      claimer.publicKey
    );

    // Claim the tokens
    await (program as any).methods
      .claimToken(socialHandle)
      .accounts({
        claimer: claimer.publicKey,
        socialLink: socialLinkPda,
        pendingClaim: pendingClaimPda,
        escrowTokenAccount: escrowTokenAccount.address,
        claimerTokenAccount: claimerTokenAccount.address,
        config: configPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([claimer])
      .rpc();

    const claimerBalance = await getAccount(provider.connection, claimerTokenAccount.address);
    expect(claimerBalance.amount.toString()).to.equal(amount.toString());

    const pendingClaim = await (program.account as any).pendingClaim.fetch(pendingClaimPda);
    expect(pendingClaim.claimed).to.be.true;
    console.log("✅ Claimed", amount / 1e9, "tokens from escrow");
  });

  it("Fails when non-admin tries to link account", async () => {
    const nonAdmin = anchor.web3.Keypair.generate();
    const user = anchor.web3.Keypair.generate();

    // Airdrop some SOL to non-admin
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(nonAdmin.publicKey, 1000000000)
    );

    const [socialLinkPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("social_link"), user.publicKey.toBuffer()],
      program.programId
    );

    try {
      await (program as any).methods
        .linkTwitter("@hacker")
        .accounts({
          socialLink: socialLinkPda,
          user: user.publicKey,
          admin: nonAdmin.publicKey,
          config: configPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([nonAdmin])
        .rpc();
      
      expect.fail("Should have thrown an error");
    } catch (err: any) {
      expect(err.toString()).to.include("Unauthorized");
      console.log("✅ Non-admin correctly rejected");
    }
  });
});
