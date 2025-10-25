use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("BCD29c55GrdmwUefJ8ndbp49TuH4h3khj62CrRaD1tx9");

#[program]
pub mod social_linking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn link_twitter(
        ctx: Context<LinkTwitter>,
        twitter_handle: String,
    ) -> Result<()> {
        require!(twitter_handle.len() <= 30, ErrorCode::HandleTooLong);
        
        let social_link = &mut ctx.accounts.social_link;
        if social_link.owner == Pubkey::default() {
            social_link.owner = ctx.accounts.user.key();
            social_link.bump = ctx.bumps.social_link;
        }
        social_link.twitter = twitter_handle;
        
        Ok(())
    }

    pub fn link_instagram(
        ctx: Context<LinkInstagram>,
        instagram_handle: String,
    ) -> Result<()> {
        require!(instagram_handle.len() <= 30, ErrorCode::HandleTooLong);
        
        let social_link = &mut ctx.accounts.social_link;
        if social_link.owner == Pubkey::default() {
            social_link.owner = ctx.accounts.user.key();
            social_link.bump = ctx.bumps.social_link;
        }
        social_link.instagram = instagram_handle;
        
        Ok(())
    }

    pub fn link_linkedin(
        ctx: Context<LinkLinkedin>,
        linkedin_handle: String,
    ) -> Result<()> {
        require!(linkedin_handle.len() <= 30, ErrorCode::HandleTooLong);
        
        let social_link = &mut ctx.accounts.social_link;
        if social_link.owner == Pubkey::default() {
            social_link.owner = ctx.accounts.user.key();
            social_link.bump = ctx.bumps.social_link;
        }
        social_link.linkedin = linkedin_handle;
        
        Ok(())
    }

    pub fn send_token(
        ctx: Context<SendToken>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer tokens from sender to recipient
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn send_token_to_unlinked(
        ctx: Context<SendTokenToUnlinked>,
        social_handle: String,
        amount: u64,
        payment_index: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(social_handle.len() <= 30, ErrorCode::HandleTooLong);

        // Transfer tokens to escrow account
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Record or update pending claim
        let pending_claim = &mut ctx.accounts.pending_claim;
        
        // If account was just created or was previously claimed, initialize it
        if pending_claim.claimed || pending_claim.amount == 0 {
            pending_claim.social_handle = social_handle.clone();
            pending_claim.amount = amount;
            pending_claim.claimed = false;
            pending_claim.payment_count = 1;
            pending_claim.bump = ctx.bumps.pending_claim;
        } else {
            // Account exists and is unclaimed - accumulate the amount
            pending_claim.amount = pending_claim.amount.checked_add(amount)
                .ok_or(ErrorCode::InvalidAmount)?;
            pending_claim.payment_count = pending_claim.payment_count.checked_add(1)
                .ok_or(ErrorCode::InvalidAmount)?;
        }

        // Create individual payment record
        let payment_record = &mut ctx.accounts.payment_record;
        payment_record.sender = ctx.accounts.sender.key();
        payment_record.social_handle = social_handle;
        payment_record.amount = amount;
        payment_record.timestamp = Clock::get()?.unix_timestamp;
        payment_record.claimed = false;
        payment_record.bump = ctx.bumps.payment_record;

        Ok(())
    }

    pub fn claim_token(
        ctx: Context<ClaimToken>,
        social_handle: String,
    ) -> Result<()> {
        let pending_claim = &mut ctx.accounts.pending_claim;
        require!(!pending_claim.claimed, ErrorCode::AlreadyClaimed);
        require!(pending_claim.social_handle == social_handle, ErrorCode::InvalidHandle);

        let amount = pending_claim.amount;

        // Transfer tokens from escrow to claimer
        let bump = &[ctx.accounts.config.bump];
        let seeds = &[
            b"config".as_ref(),
            bump.as_ref(),
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.claimer_token_account.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        pending_claim.claimed = true;

        // Note: Individual payment records remain on-chain for history
        // They can be queried to show payment history even after claiming

        Ok(())
    }

    pub fn close_pending_claim(
        ctx: Context<ClosePendingClaim>,
        _social_handle: String,
    ) -> Result<()> {
        // Admin can close old/invalid pending claim accounts
        // This is useful for migration after contract upgrades
        
        // Transfer lamports from pending_claim to admin
        let pending_claim_info = ctx.accounts.pending_claim.to_account_info();
        let admin_info = ctx.accounts.admin.to_account_info();
        
        let lamports = pending_claim_info.lamports();
        **pending_claim_info.try_borrow_mut_lamports()? = 0;
        **admin_info.try_borrow_mut_lamports()? = admin_info.lamports().checked_add(lamports).unwrap();
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LinkTwitter<'info> {
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + SocialLink::INIT_SPACE,
        seeds = [b"social_link", user.key().as_ref()],
        bump
    )]
    pub social_link: Account<'info, SocialLink>,
    
    /// CHECK: User wallet to link
    pub user: AccountInfo<'info>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        seeds = [b"config"], 
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LinkInstagram<'info> {
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + SocialLink::INIT_SPACE,
        seeds = [b"social_link", user.key().as_ref()],
        bump
    )]
    pub social_link: Account<'info, SocialLink>,
    
    /// CHECK: User wallet to link
    pub user: AccountInfo<'info>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        seeds = [b"config"], 
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LinkLinkedin<'info> {
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + SocialLink::INIT_SPACE,
        seeds = [b"social_link", user.key().as_ref()],
        bump
    )]
    pub social_link: Account<'info, SocialLink>,
    
    /// CHECK: User wallet to link
    pub user: AccountInfo<'info>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        seeds = [b"config"], 
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SendToken<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = sender_token_account.mint,
        associated_token::authority = sender
    )]
    pub sender_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = sender_token_account.mint,
        associated_token::authority = recipient
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Recipient wallet address
    pub recipient: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(social_handle: String, amount: u64, payment_index: u64)]
pub struct SendTokenToUnlinked<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = sender_token_account.mint,
        associated_token::authority = sender
    )]
    pub sender_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = sender_token_account.mint,
        associated_token::authority = config
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = sender,
        space = 8 + PendingClaim::INIT_SPACE,
        seeds = [b"pending_claim", social_handle.as_bytes()],
        bump
    )]
    pub pending_claim: Account<'info, PendingClaim>,
    
    #[account(
        init,
        payer = sender,
        space = 8 + PaymentRecord::INIT_SPACE,
        seeds = [b"payment_record", social_handle.as_bytes(), payment_index.to_le_bytes().as_ref()],
        bump
    )]
    pub payment_record: Account<'info, PaymentRecord>,
    
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(social_handle: String)]
pub struct ClaimToken<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,
    
    #[account(
        seeds = [b"social_link", claimer.key().as_ref()],
        bump = social_link.bump,
        constraint = social_link.twitter == social_handle || 
                     social_link.instagram == social_handle || 
                     social_link.linkedin == social_handle @ ErrorCode::NotLinked
    )]
    pub social_link: Account<'info, SocialLink>,
    
    #[account(
        mut,
        seeds = [b"pending_claim", social_handle.as_bytes()],
        bump = pending_claim.bump,
        constraint = !pending_claim.claimed @ ErrorCode::AlreadyClaimed
    )]
    pub pending_claim: Account<'info, PendingClaim>,
    
    #[account(
        mut,
        associated_token::mint = escrow_token_account.mint,
        associated_token::authority = config
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = escrow_token_account.mint,
        associated_token::authority = claimer
    )]
    pub claimer_token_account: Account<'info, TokenAccount>,
    
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(social_handle: String)]
pub struct ClosePendingClaim<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        seeds = [b"config"], 
        bump = config.bump,
        constraint = config.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,
    
    /// CHECK: We use UncheckedAccount because the account might have old structure
    #[account(
        mut,
        seeds = [b"pending_claim", social_handle.as_bytes()],
        bump
    )]
    pub pending_claim: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct SocialLink {
    pub owner: Pubkey,
    #[max_len(30)]
    pub twitter: String,
    #[max_len(30)]
    pub instagram: String,
    #[max_len(30)]
    pub linkedin: String,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PendingClaim {
    #[max_len(30)]
    pub social_handle: String,
    pub amount: u64,
    pub claimed: bool,
    pub payment_count: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PaymentRecord {
    pub sender: Pubkey,
    #[max_len(30)]
    pub social_handle: String,
    pub amount: u64,
    pub timestamp: i64,
    pub claimed: bool,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Social handle is too long")]
    HandleTooLong,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("User has not linked any social accounts")]
    NotLinked,
    #[msg("Unauthorized: Only admin can perform this action")]
    Unauthorized,
    #[msg("Invalid social handle")]
    InvalidHandle,
}
