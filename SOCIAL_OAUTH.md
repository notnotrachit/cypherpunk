# Social OAuth Setup with NextAuth

## ✅ What's Implemented

NextAuth.js is configured for **Twitter**, **Instagram/Facebook**, and **LinkedIn** OAuth.

When users click "Link with Twitter" (or Instagram/LinkedIn):

1. NextAuth handles OAuth flow automatically
2. User authenticates on the platform
3. Verified username is returned
4. Backend links it to Solana wallet on-chain

## 🚀 Quick Setup

### 1. Update OAuth Callback URLs

NextAuth uses standard callbacks. Update these in your developer apps:

**Twitter:** `http://localhost:3000/api/auth/callback/twitter`  
**Facebook/Instagram:** `http://localhost:3000/api/auth/callback/facebook`  
**LinkedIn:** `http://localhost:3000/api/auth/callback/linkedin`

For production, replace `localhost:3000` with your domain.

### 2. Get Credentials

#### Twitter (X)

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a Project & App
3. Go to "User authentication settings" → Set up OAuth 2.0
4. Add callback URL above
5. Copy Client ID & Client Secret

#### Instagram (via Facebook)

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create an App
3. Add "Instagram" product
4. Go to Settings → Basic
5. Copy App ID (= Client ID) & App Secret (= Client Secret)
6. Add callback URL above to Valid OAuth Redirect URIs

#### LinkedIn

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create an App
3. Go to Auth tab
4. Add callback URL above
5. Request scopes: `openid`, `profile`, `email`
6. Copy Client ID & Client Secret

### 3. Add to .env

Already done! Just fill in the values:

```bash
TWITTER_CLIENT_ID="your_client_id"
TWITTER_CLIENT_SECRET="your_client_secret"

INSTAGRAM_CLIENT_ID="your_facebook_app_id"
INSTAGRAM_CLIENT_SECRET="your_facebook_app_secret"

LINKEDIN_CLIENT_ID="your_client_id"
LINKEDIN_CLIENT_SECRET="your_client_secret"
```

## 🧪 Test It

```bash
npm run dev
```

1. Login with Phantom wallet
2. Go to Dashboard
3. Click "Link with Twitter" (or Instagram/LinkedIn)
4. Authorize on the platform
5. See success message + verified handle stored on-chain!

## 📁 Files Created

```
src/app/api/auth/[...nextauth]/route.ts  - NextAuth config
src/app/api/social/link-verified/route.ts - Blockchain linking
src/components/NextAuthProvider.tsx       - Session provider
src/components/SocialLinkingForm.tsx      - Updated UI (OAuth buttons)
src/types/next-auth.d.ts                  - TypeScript types
```

## 🔒 Security

- ✅ NextAuth handles all OAuth complexity
- ✅ CSRF protection via state parameter
- ✅ Secure token exchange
- ✅ Session management
- ✅ Verified username before blockchain link

## ⚠️ Important Notes

1. **Callback URLs must match exactly** - including http/https and trailing slashes
2. **Instagram requires Facebook app** - uses Facebook OAuth
3. **LinkedIn gives email, not handle** - we use email prefix as identifier
4. **Test one platform at a time** - easier to debug

## 🐛 Common Issues

**"Invalid redirect_uri"**
→ Check callback URL in developer console matches exactly

**"Client authentication failed"**
→ Verify Client ID & Secret in .env are correct

**Instagram: "App not in development mode"**
→ Add test users OR submit for app review

**Twitter: "App is suspended"**
→ Complete app setup in Twitter Developer Portal

## 🎯 That's It!

NextAuth makes OAuth super simple. Just 5 files and you're done!
