/**
 * Get access token from cookies
 * The backend sets AccessToken cookie on login
 */
export function getAccessTokenFromCookies(): string | null {
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'AccessToken' || name === 'accessToken') {
      return value;
    }
  }
  
  console.warn('[TOKEN] Access token not found in cookies');
  return null;
}

/**
 * Get access token from Firebase Auth (alternative method)
 * Falls back to this if cookie method doesn't work
 */
export async function getAccessTokenFromFirebase(): Promise<string | null> {
  try {
    const { auth } = await import('./firebase.config');
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.warn('[TOKEN] No Firebase user logged in');
      return null;
    }
    
    // Get Firebase ID token (can be used as JWT)
    const token = await currentUser.getIdToken();
    console.log('[TOKEN] Got token from Firebase Auth');
    return token;
  } catch (error) {
    console.error('[TOKEN] Error getting Firebase token:', error);
    return null;
  }
}

/**
 * Get access token (tries cookies first, then Firebase)
 */
export async function getAccessToken(): Promise<string | null> {
  // Try cookies first (backend JWT)
  let token = getAccessTokenFromCookies();
  
  if (token) {
    console.log('[TOKEN] Using access token from cookies');
    return token;
  }
  
  // Fallback to Firebase token
  console.log('[TOKEN] Cookie not found, trying Firebase token');
  token = await getAccessTokenFromFirebase();
  
  return token;
}

