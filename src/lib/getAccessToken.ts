/**
 * Utilities for obtaining an access token used to authenticate
 * WebSocket connections against the chat microservice.
 *
 * The lookup strategy is:
 * 1. Prefer the backend‑issued JWT stored in the `AccessToken` cookie.
 * 2. If not present, fall back to the Firebase ID token for the
 *    currently signed‑in user.
 */

import { auth } from "./firebase.config";

/**
 * Read the backend access token from browser cookies.
 *
 * @returns The raw JWT string if found, otherwise `null`.
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
 * Obtain a Firebase ID token for the current authenticated user.
 *
 * This is used as a fallback when there is no backend `AccessToken`
 * cookie available (for example, during local development).
 *
 * @returns A Firebase ID token string or `null` when the user is not logged in.
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
 * Resolve an access token suitable for authenticating with the chat server.
 *
 * The function is environment‑agnostic and can be used from anywhere
 * in the frontend that needs a JWT for Socket.IO:
 *
 * - First it tries to read the `AccessToken` cookie issued by the backend.
 * - If that fails, it falls back to a Firebase ID token.
 *
 * @returns A JWT string or `null` when no token could be obtained.
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

