import NextAuth, { AuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";

export const authOptions: AuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      profile(profile) {
        return {
          id: profile.data.id,
          name: profile.data.name,
          email: profile.data.email || null,
          image: profile.data.profile_image_url,
        };
      },
    }),
  ],
  pages: {
    signIn: "/dashboard", // Redirect to dashboard instead of default sign-in page
    error: "/dashboard", // Redirect errors to dashboard too
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;

        // Debug: Log profile data
        console.log(`[NextAuth] ${account.provider} profile:`, profile);

        // Extract username from typed Twitter profile
        type TwitterOAuthProfile = {
          data?: {
            username?: string;
            name?: string;
            email?: string;
          };
          username?: string;
          login?: string;
          screen_name?: string;
          name?: string;
          email?: string;
        };

        const isTwitterOAuthProfile = (p: unknown): p is TwitterOAuthProfile =>
          typeof p === "object" && p !== null;

        let username: string | undefined;

        if (account.provider === "twitter" && isTwitterOAuthProfile(profile)) {
          username =
            profile.data?.username ||
            profile.username ||
            profile.login ||
            profile.screen_name ||
            profile.name ||
            profile.email?.split("@")[0] ||
            undefined;
        }

        // Fallback to existing token value if present
        if (!username && typeof token.username === "string") {
          username = token.username;
        }

        if (username) {
          token.username = username;
        }
        console.log(`[NextAuth] Extracted username: ${username}`);
      }
      return token;
    },
    async session({ session, token }) {
      session.provider = token.provider as string;
      session.username = token.username as string;
      return session;
    },
    async redirect({ baseUrl }) {
      // Always redirect back to dashboard after OAuth
      return `${baseUrl}/dashboard`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
