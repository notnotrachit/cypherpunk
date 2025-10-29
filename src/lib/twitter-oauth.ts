import axios from "axios";

// Web app credentials
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;

// Mobile app credentials
const TWITTER_MOBILE_CLIENT_ID = process.env.TWITTER_MOBILE_CLIENT_ID!;
const TWITTER_MOBILE_CLIENT_SECRET = process.env.TWITTER_MOBILE_CLIENT_SECRET!;

const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_USER_URL = "https://api.twitter.com/2/users/me";

export interface TwitterUserInfo {
  id: string;
  username: string;
  name: string;
  profileImageUrl: string;
}

interface TwitterUserResponse {
  data: {
    id: string;
    username: string;
    name: string;
    profile_image_url?: string;
  };
}

/**
 * Exchange Twitter authorization code for access token
 * This uses the Client Secret which is kept secure on the backend
 */
export async function exchangeTwitterCode(
  code: string,
  redirectUrl: string,
  codeVerifier?: string,
  useMobileCredentials: boolean = false
): Promise<string> {
  try {
    // Select credentials based on app type
    const clientId = useMobileCredentials ? TWITTER_MOBILE_CLIENT_ID : TWITTER_CLIENT_ID;
    const clientSecret = useMobileCredentials ? TWITTER_MOBILE_CLIENT_SECRET : TWITTER_CLIENT_SECRET;
    const appType = useMobileCredentials ? "Mobile" : "Web";

    console.log(`[Twitter ${appType}] Exchanging authorization code for token...`);
    console.log(`[Twitter ${appType}] Client ID:`, clientId);
    console.log(`[Twitter ${appType}] Client Secret present:`, !!clientSecret);
    console.log(`[Twitter ${appType}] Redirect URL:`, redirectUrl);
    console.log(`[Twitter ${appType}] Code:`, code.substring(0, 20) + "...");
    console.log(`[Twitter ${appType}] Code verifier:`, codeVerifier?.substring(0, 20) + "...");

    // Twitter requires application/x-www-form-urlencoded format
    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUrl,
    });

    // Add code_verifier if provided (for PKCE)
    if (codeVerifier) {
      params.append("code_verifier", codeVerifier);
    }

    // Twitter OAuth 2.0 requires Basic Auth with client_id:client_secret
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    console.log(`[Twitter ${appType}] Auth header length:`, authHeader.length);

    const response = await axios.post(TWITTER_TOKEN_URL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authHeader}`,
      },
    });

    console.log("[Twitter] Token response status:", response.status);
    // console.log("[Twitter] Token response data:", JSON.stringify(response.data, null, 2));

    const { access_token } = response.data;

    if (!access_token) {
      console.error("[Twitter] Full response:", response);
      throw new Error("No access token received from Twitter");
    }

    console.log("[Twitter] Successfully exchanged code for token");
    return access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("[Twitter] Axios error response:", error.response?.data);
      console.error("[Twitter] Axios error status:", error.response?.status);
    }
    console.error("[Twitter] Error exchanging code:", error);
    throw error;
  }
}

/**
 * Fetch verified user info from Twitter API using access token
 */
export async function fetchTwitterUserInfo(
  accessToken: string
): Promise<TwitterUserInfo> {
  try {
    console.log("[Twitter] Fetching user info from Twitter API...");

    const response = await axios.get<TwitterUserResponse>(
      `${TWITTER_USER_URL}?user.fields=profile_image_url,name,username`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const userData = response.data.data;

    if (!userData || !userData.username) {
      throw new Error("Invalid user data from Twitter");
    }

    console.log(`[Twitter] Got verified user: @${userData.username}`);

    return {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      profileImageUrl: userData.profile_image_url || "",
    };
  } catch (error) {
    console.error("[Twitter] Error fetching user info:", error);
    throw error;
  }
}

/**
 * Verify Twitter OAuth code and get user info
 * This is the main function used by the API endpoint
 */
export async function verifyTwitterOAuth(
  code: string,
  redirectUrl: string,
  codeVerifier?: string,
  useMobileCredentials: boolean = false
): Promise<TwitterUserInfo> {
  try {
    // Step 1: Exchange code for token (using Client Secret)
    const accessToken = await exchangeTwitterCode(code, redirectUrl, codeVerifier, useMobileCredentials);

    // Step 2: Fetch user info
    const userInfo = await fetchTwitterUserInfo(accessToken);

    return userInfo;
  } catch (error) {
    console.error("[Twitter] OAuth verification failed:", error);
    throw error;
  }
}
