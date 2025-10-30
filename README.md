# Rivo Browser Extension

This is the browser extension for **Rivo** - a social payment platform on Solana. The extension adds a "Send USDC" button directly on Twitter profiles, enabling instant crypto payments using @usernames instead of wallet addresses.

> **Note:** For the complete Rivo ecosystem (mobile app, web dashboard, and smart contracts), see the [main repository](https://github.com/notnotrachit/Rivo) and [full documentation](./HACKATHON_DOCUMENTATION.md).

---

## 🎯 What It Does

The extension injects a **"Send USDC"** button on every Twitter profile page. Click it, enter an amount, sign with your wallet, and send USDC to that @username - no wallet address needed.

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
2. Click "Send USDC" button (appears next to Follow)
3. Enter amount in the modal
4. Connect Phantom wallet
5. Sign transaction
6. Done! ✨

---

## 🏗️ Extension Architecture

```
Twitter Page
    ↓
Content Script (injects button)
    ↓
Solana Program (on-chain execution)
```

### Tech Stack

- **Manifest V3** - Chrome/Firefox compatible
- **TypeScript** - Type-safe code
- **Solana Web3.js** - Blockchain interaction
- **Phantom Adapter** - Wallet integration

## 🎨 Extension UI

### Send Money Button
- Injected next to Username
- Matches Twitter's native design
- Shows loading state during transaction

### Payment Modal
- Centred overlay with backdrop
- Pre-filled @username
- Amount input with validation
- Direct/Escrow status indicator
---

## 🔗 Links

- **Main Repository**: [Rivo App](https://github.com/notnotrachit/Rivo)

---

## 🤝 Contributing

Contributions welcome! Fork, create a feature branch, and submit a PR.

---

## 📄 License

MIT License

---

**Built with ❤️ on Solana**
