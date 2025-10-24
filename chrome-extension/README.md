# Cypherpunk Chrome Extension

Send USDC to Twitter users via their linked Solana wallets.

## Features

- 🔗 Detects linked Solana wallets on Twitter profiles
- 💰 Send USDC directly from Twitter
- 🔐 Shares authentication with webapp
- ⚡ Powered by Phantom wallet
- 🌐 Works on Solana Devnet

## Installation

### Development Mode

1. **Build the extension** (if needed):
   ```bash
   # No build step needed - it's vanilla JS
   ```

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Grant permissions**:
   - The extension will request permissions for Twitter and localhost

### Icons

Create placeholder icons or use these commands to generate them:

```bash
cd chrome-extension
mkdir -p icons

# Create placeholder icons (you can replace with actual designs)
# For now, use any 16x16, 48x48, and 128x128 PNG images
# Or use an online icon generator
```

## Usage

### 1. Sign in to Webapp

First, visit http://localhost:3000 and sign in with Phantom:
- Click "Connect Wallet"
- Approve the connection in Phantom
- Sign the authentication message

### 2. Link Social Accounts

On the dashboard:
- Link your Twitter account
- Link other users' accounts (if you're admin)

### 3. Use on Twitter

1. Visit any Twitter profile
2. If the user has linked their wallet, you'll see a "Pay with Solana" button
3. Click the button to open the payment modal
4. Enter USDC amount and optional message
5. Click "Send USDC"
6. Approve the transaction in Phantom

## How It Works

### Architecture

```
Twitter Profile
    ↓
Content Script (detects profile)
    ↓
Background Script (checks API)
    ↓
API: /api/social/find-wallet
    ↓
If linked: Show "Pay with Solana" button
    ↓
User clicks → Payment Modal
    ↓
Connect to Phantom wallet
    ↓
API: /api/tokens/get-accounts (fetch ATAs)
    ↓
Injected Script builds transaction with send_token instruction
    ↓
Phantom signs transaction
    ↓
Transaction sent to Solana via smart contract
    ↓
Wait for confirmation
    ↓
Display success with Explorer link
```

### Smart Contract Integration

The extension now uses the **social_linking smart contract** to handle token transfers:

1. **Token Account Lookup**: Fetches Associated Token Accounts (ATAs) for both sender and recipient
2. **Transaction Building**: Creates a transaction with the `send_token` instruction from the program
3. **Instruction Data**: 
   - Discriminator: `[0xc4, 0x9e, 0x93, 0x4e, 0x4f, 0x9d, 0x6c, 0x8a]` (sha256 hash of "global:send_token")
   - Amount: u64 encoded as little-endian (USDC has 6 decimals)
4. **Accounts**:
   - sender (signer, writable)
   - sender_token_account (writable)
   - recipient_token_account (writable)
   - recipient (read-only)
   - token_program (read-only)
5. **Signing**: User signs the transaction in Phantom
6. **Confirmation**: Extension waits for on-chain confirmation

### Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker for API calls
- `content.js` - Injected into Twitter pages
- `content.css` - Styles for buttons and modal
- `popup.html` - Extension popup UI
- `popup.js` - Popup logic

## Configuration

### Change API URL

For production, update the API URL in:

1. `background.js`:
```javascript
const API_BASE_URL = 'https://your-domain.com';
```

2. `content.js`:
```javascript
const API_BASE_URL = 'https://your-domain.com';
```

3. `popup.js`:
```javascript
const API_BASE_URL = 'https://your-domain.com';
```

4. `manifest.json`:
```json
"host_permissions": [
  "https://your-domain.com/*"
]
```

### USDC Mint Address

The extension uses devnet USDC. For mainnet, update in:

`src/app/api/tokens/send/route.ts`:
```typescript
const USDC_MINT_MAINNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
```

## Testing

### Test Flow

1. **Setup**:
   - Install extension
   - Sign in to webapp
   - Link a Twitter account

2. **Test on Twitter**:
   - Visit the linked Twitter profile
   - Verify "Pay with Solana" button appears
   - Click button and check modal opens

3. **Test Payment**:
   - Enter amount (e.g., 0.01 USDC)
   - Click "Send USDC"
   - Approve in Phantom
   - Verify transaction on Solana Explorer

### Debug Mode

Open Chrome DevTools:
- Right-click extension icon → "Inspect popup"
- On Twitter: Right-click → "Inspect" → Console tab
- Check for console logs starting with "🚀"

## Troubleshooting

### Button not appearing

- Check console for errors
- Verify user has linked their Twitter account
- Try refreshing the page
- Check if you're signed in to the webapp

### "Phantom wallet not found"

- Install Phantom extension
- Make sure Phantom is unlocked
- Refresh the page

### "Please sign in to the webapp first"

- Visit http://localhost:3000
- Sign in with Phantom
- Return to Twitter and try again

### Transaction failing

- Check you have USDC in your wallet
- Verify you're on the correct network (devnet)
- Check you have SOL for transaction fees
- View transaction on Solana Explorer for details

## Security

- ✅ Session cookies are HttpOnly
- ✅ API calls require authentication
- ✅ Transactions signed by user's Phantom wallet
- ✅ No private keys stored in extension
- ⚠️ Only use on devnet for testing
- ⚠️ Audit before mainnet deployment

## Publishing

### Chrome Web Store

1. Create icons (16x16, 48x48, 128x128)
2. Update manifest.json with production URLs
3. Create a developer account
4. Package extension as ZIP
5. Upload to Chrome Web Store
6. Submit for review

### Firefox Add-ons

1. Update manifest to v2 (Firefox doesn't fully support v3 yet)
2. Create account on addons.mozilla.org
3. Submit for review

## Development

### Adding Features

**Support more platforms**:
- Add LinkedIn detection in `content.js`
- Update API calls to use correct platform

**Add token selection**:
- Modify modal to show token dropdown
- Update API to accept token mint address

**Add transaction history**:
- Create new API endpoint
- Add history view in popup

## License

MIT

## Support

For issues or questions:
- GitHub: [your-repo]
- Email: [your-email]
- Discord: [your-discord]
