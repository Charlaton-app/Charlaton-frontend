/**
 * Utility to get access token for chat server authentication
 * Tries to get JWT from cookies first, then falls back to Firebase Auth token
 */

import { auth } from "./firebase.config";

/**
 * Get access token from cookies (set by backend after login)
 */
function getAccessTokenFromCookies(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const accessTokenCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("AccessToken=")
  );

  if (accessTokenCookie) {
    const token = accessTokenCookie.split("=")[1]?.trim();
    return token || null;
  }

  return null;
}

/**
 * Get Firebase ID token as fallback
 */
async function getFirebaseToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log("[TOKEN] No Firebase user found");
      return null;
    }

    const token = await user.getIdToken();
    console.log("[TOKEN] Using Firebase ID token");
    return token;
  } catch (error) {
    console.error("[TOKEN] Error getting Firebase token:", error);
    return null;
  }
}

/**
 * Get access token for chat server authentication
 * Tries cookies first, then Firebase token
 */
export async function getAccessToken(): Promise<string | null> {
  // Try cookies first (backend JWT)
  const cookieToken = getAccessTokenFromCookies();
  if (cookieToken) {
    console.log("[TOKEN] Using access token from cookies");
    return cookieToken;
  }

  // Fallback to Firebase token
  const firebaseToken = await getFirebaseToken();
  if (firebaseToken) {
    return firebaseToken;
  }

  console.warn("[TOKEN] ⚠️ No access token found");
  return null;
}

