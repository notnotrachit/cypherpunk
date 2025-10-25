# ⚠️ IMPORTANT: Clear Your Browser Cookies!

## Why?

We just changed the `NEXTAUTH_SECRET` environment variable. This means all existing NextAuth session cookies are now invalid and will cause decryption errors.

## How to Fix:

### Option 1: Clear All Cookies (Recommended)

1. Open Chrome DevTools (F12 or Cmd+Opt+I)
2. Go to **Application** tab
3. Expand **Cookies** in the left sidebar
4. Click on `http://localhost:3000`
5. Click **Clear all** button at the top

### Option 2: Clear Specific Cookies

Delete these cookies:

- `next-auth.session-token`
- `next-auth.csrf-token`
- `next-auth.callback-url`

### Option 3: Use Incognito/Private Window

Just open a new incognito window - no cookies to clear!

## Then:

1. **Restart your dev server:**

   ```bash
   npm run dev
   ```

2. **Login with Phantom wallet first**

3. **Click "Link with LinkedIn"** and it should work! ✅

---

**Note:** You'll need to reconnect your Phantom wallet too since we're starting fresh.
