import NextAuth, { AuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import LinkedInProvider from "next-auth/providers/linkedin";

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
    FacebookProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID!,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture?.data?.url,
        };
      },
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
      wellKnown:
        "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      checks: ["state"],
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
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

        // Extract username/identifier from profile
        let username =
          (profile as any)?.data?.username || // Twitter v2
          (profile as any)?.username || // Twitter v1/other
          (profile as any)?.login ||
          (profile as any)?.screen_name ||
          (profile as any)?.name ||
          (profile as any)?.email?.split("@")[0];

        // Twitter specific: use username from data object (v2.0 API)
        if (account.provider === "twitter") {
          username =
            (profile as any)?.data?.username ||
            (profile as any)?.username ||
            (profile as any)?.data?.name ||
            (profile as any)?.name;
        }

        // Facebook/Instagram specific: use name or email prefix
        if (account.provider === "facebook") {
          username =
            (profile as any)?.username ||
            (profile as any)?.name?.toLowerCase().replace(/\s+/g, ".") ||
            (profile as any)?.email?.split("@")[0] ||
            (profile as any)?.id;
        }

        // LinkedIn specific: use email prefix or formatted name
        if (account.provider === "linkedin") {
          const emailPrefix = (profile as any)?.email?.split("@")[0];
          const formattedName = (profile as any)?.name
            ?.toLowerCase()
            .replace(/\s+/g, "-");
          username = emailPrefix || formattedName || (profile as any)?.sub;
        }

        token.username = username;
        console.log(`[NextAuth] Extracted username: ${username}`);
      }
      return token;
    },
    async session({ session, token }) {
      session.provider = token.provider as string;
      session.username = token.username as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect back to dashboard after OAuth
      return `${baseUrl}/dashboard`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
