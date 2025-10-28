This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Wallet Authentication (Phantom + Backend Verification)

This project includes a Phantom login flow for Solana, with backend verification before granting access.

- Server-side verification:
  - GET /api/auth/nonce issues a one-time nonce and a canonical message to sign (an HttpOnly cookie named login_nonce is set).
  - The wallet signs the message with Phantom.
  - POST /api/auth/verify validates the signature, domain, and nonce, then sets a short-lived HttpOnly session cookie.
  - Protected APIs (e.g., GET /api/protected) and pages are gated by middleware that checks the session.

- Client components:
  - src/components/PhantomLogin.tsx handles connect -> fetch nonce/message -> sign -> verify.

- Run locally:
  1) Create a .env.local file in the project root and set:
     AUTH_JWT_SECRET="a-long-random-string"
  2) Install dependencies:
     npm install
  3) Start the dev server:
     npm run dev
  4) Open http://localhost:3000 and click “Sign in with Phantom”. After a successful login, try the “Protected” page or the “Check session” button.

- Production notes:
  - Cookies are marked secure when running under HTTPS.
  - Rotate AUTH_JWT_SECRET if compromised, and consider longer session lifetimes only if appropriate.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
