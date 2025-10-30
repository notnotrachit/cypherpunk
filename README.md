# Rivo - Complete Ecosystem

<div align="center">
  <img src="https://rivo.rcht.dev/logo.svg" alt="Rivo Logo" width="100" />
</div>

**Rivo** is a social payment platform on Solana that enables instant crypto payments using Twitter @usernames instead of wallet addresses. This repository contains the complete implementation:

- 🌐 **Web Application** - Dashboard for wallet linking and transaction history
- 🔌 **Browser Extension** - "Send Money" button on Twitter profiles
- 📝 **Smart Contracts** - Solana programs for direct transfers and escrow

> **Note:** For the mobile app, see the [main repository](https://github.com/notnotrachit/Rivo)
---

## 🎯 Key Features

### Browser Extension
Injects a **"Send Money"** button on every Twitter profile page. Click it, enter an amount, sign with your wallet, and send USDC to that @username - no wallet address needed.

### Web Dashboard
Manage your Rivo account, link your Twitter to your wallet, view transaction history, and manage escrow payments.

### Smart Contracts
Solana programs that handle payment processing, wallet linking, and escrow management on-chain.

**Two Payment Modes:**
- ✅ **Direct Transfer** - If user has linked their Twitter to a wallet, USDC sent instantly
- ⏳ **Escrow** - If user hasn't linked yet, USDC held in escrow until they claim

---

## 🚀 Quick Start

### Installation

**Chrome/Brave/Edge (Chromium-based browsers):**
```bash
1. Download latest release
2. Open chrome://extensions
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select extension folder
```

### Usage

1. Visit any Twitter profile
2. Click "Send Money" button (appears next to Follow)
3. Enter amount in the modal
4. Connect Phantom wallet
5. Sign transaction
6. Done! ✨

---

## 🏗️ Extension Architecture

### System Flow

```
User on Twitter Profile
    ↓
Content Script detects page load
    ↓
Injects "Send Money" button
    ↓
User clicks button
    ↓
Payment Modal opens with @username pre-filled
    ↓
User enters amount & connects wallet
    ↓
Transaction signed via Phantom
    ↓
Solana Program processes payment
    ↓
Direct Transfer OR Escrow (based on wallet link status)
```

### Component Architecture

**Content Script** (`src/content/`)
- Injects UI elements into Twitter DOM
- Listens for button clicks
- Communicates with background script

**Background Script** (`src/background/`)
- Manages wallet connections
- Handles transaction signing
- Stores user preferences

**UI Components** (`src/ui/`)
- Payment modal
- Send button
- Status indicators

### Tech Stack

- **Manifest V3** - Chrome/Firefox compatible
- **TypeScript** - Type-safe code
- **Solana Web3.js** - Blockchain interaction
- **Phantom Adapter** - Wallet integration
- **React** - UI component framework (if applicable)

## 📋 Smart Contract Details

### Program Overview

The Rivo Solana program handles two main payment flows:

**1. Direct Transfer**
- User has linked Twitter → Wallet
- USDC transferred instantly to recipient's wallet
- Transaction finalized on-chain immediately

**2. Escrow Payment**
- User hasn't linked Twitter → Wallet yet
- USDC held in escrow account
- Recipient can claim funds after linking wallet
- Escrow released upon verification

### Key Program Instructions

- `initialize_user` - Register user with Twitter handle
- `link_wallet` - Link Twitter account to Solana wallet
- `send_direct` - Direct USDC transfer to linked wallet
- `send_escrow` - Create escrow for unlinked users
- `claim_escrow` - Recipient claims escrowed funds
- `cancel_escrow` - Sender cancels escrow (after timeout)

### Account Structure

**User Account**
- Twitter handle (string)
- Linked wallet address (pubkey)
- Account creation timestamp
- Escrow balance

**Escrow Account**
- Sender address
- Recipient Twitter handle
- Amount (in lamports)
- Creation timestamp
- Status (Active/Claimed/Cancelled)

### Security Features

- **Signature Verification** - All transactions require sender signature
- **Twitter Handle Validation** - Prevents impersonation
- **Escrow Timeout** - Funds returned after 30 days if unclaimed
- **Rate Limiting** - Prevents spam transactions
- **Amount Validation** - Minimum and maximum transfer limits

## 🎨 Extension UI

### Send Money Button
- Injected next to Username
- Matches Twitter's native design
- Shows loading state during transaction
- Disabled for own profile

### Payment Modal
- Centered overlay with backdrop
- Pre-filled @username
- Amount input with validation
- Direct/Escrow status indicator
- Real-time balance display
- Transaction confirmation screen
---

## 🔗 Links

- **Main Mobile App Repository**: [Rivo App](https://github.com/notnotrachit/Rivo)

---

**Built with ❤️ on Solana**
