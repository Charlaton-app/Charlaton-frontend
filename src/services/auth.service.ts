// src/services/auth.service.ts
// Servicio de autenticación con el backend

import api from "./api";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser as firebaseDeleteUser,
} from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "../lib/firebase.config";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  nickname?: string;
  password: string;
  confirmPassword?: string;
  rolId?: number;
}

export interface UserResponse {
  id: string;
  email: string | null;
  nickname?: string | null;
  role?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ============ AUTENTICACIÓN CON BACKEND ============

/**
 * Login con credenciales (email y password)
 * Este método primero autentica con Firebase, luego sincroniza con el backend
 */
export const login = async (credentials: LoginCredentials) => {
  try {
    // 1. Autenticar con Firebase Client
    const userCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );

    // 2. Sincronizar con backend (obtener cookies de sesión)
    const response = await api.post("/auth/login", credentials);

    if (response.error) {
      // Si falla el backend, cerrar sesión de Firebase
      await firebaseSignOut(auth);
      return { error: response.error };
    }

    return {
      data: {
        user: response.data?.user,
        firebaseUser: userCredential.user,
      },
    };
  } catch (error: any) {
    console.error("Error en login:", error);
    return {
      error: error.message || "Error al iniciar sesión",
    };
  }
};

/**
 * User registration
 * Creates user in Firebase first, then syncs with backend
 * Auto-login after successful registration
 *
 * @param {SignupData} data - User registration data
 * @returns {Promise<{data?: any, error?: string}>} Response with user data or error message
 */
export const signup = async (data: SignupData) => {
  let firebaseUser = null;
  
  try {
    console.log("[AUTH-SERVICE] Starting signup process");
    
    // Validate password match
    if (data.confirmPassword && data.password !== data.confirmPassword) {
      console.log("[AUTH-SERVICE] Signup failed: Passwords don't match");
      return { error: "Las contraseñas no coinciden" };
    }

    // 1. Create user in Firebase Auth
    console.log("[AUTH-SERVICE] Creating user in Firebase Auth...");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    firebaseUser = userCredential.user;
    console.log(`[AUTH-SERVICE] User created in Firebase: ${firebaseUser.uid}`);

    // 2. Create user in backend (Firestore via API)
    console.log("[AUTH-SERVICE] Creating user in backend...");
    const response = await api.post("/auth/signup", {
      id: firebaseUser.uid, // Pass Firebase UID
      email: data.email,
      nickname: data.nickname || null,
      password: data.password,
      rolId: data.rolId || 2, // 2 = regular user by default
    });

    if (response.error) {
      console.error("[AUTH-SERVICE] Backend creation failed:", response.error);
      // If backend fails, delete Firebase user
      if (firebaseUser) {
        try {
          await firebaseDeleteUser(firebaseUser);
          console.log("[AUTH-SERVICE] Firebase user deleted due to backend error");
        } catch (deleteError) {
          console.error("[AUTH-SERVICE] Error deleting Firebase user:", deleteError);
        }
      }
      return { error: response.error };
    }

    console.log("[AUTH-SERVICE] User created in backend successfully");

    // Backend auto-login is handled by signup endpoint (sets cookies)
    // Just return the user data
    return {
      data: {
        user: response.data?.user,
        firebaseUser: firebaseUser,
      },
    };
  } catch (error: any) {
    console.error("[AUTH-SERVICE] Error in signup:", error);

    // If user was created in Firebase but something failed after, clean up
    if (firebaseUser) {
      try {
        await firebaseDeleteUser(firebaseUser);
        console.log("[AUTH-SERVICE] Firebase user deleted due to error");
      } catch (deleteError) {
        console.error("[AUTH-SERVICE] Error deleting Firebase user:", deleteError);
      }
    }

    // User-friendly error messages
    if (error.code === "auth/email-already-in-use") {
      console.log("[AUTH-SERVICE] Email already exists in Firebase");
      return { error: "El correo ya está registrado. Intenta iniciar sesión en lugar de registrarte." };
    }

    if (error.code === "auth/weak-password") {
      return { error: "La contraseña es demasiado débil. Usa al menos 6 caracteres." };
    }

    if (error.code === "auth/invalid-email") {
      return { error: "El correo electrónico no es válido." };
    }

    return {
      error: error.message || "Error al crear cuenta",
    };
  }
};
        console.error("Error al sincronizar usuario:", syncError);
        return { 
          error: "El correo ya está registrado en Firebase. Si no puedes iniciar sesión, contacta al administrador." 
        };
      }
    }
    if (error.code === "auth/weak-password") {
      return { error: "La contraseña debe tener al menos 6 caracteres" };
    }
    if (error.code === "auth/invalid-email") {
      return { error: "El correo electrónico no es válido" };
    }
    if (error.code === "auth/operation-not-allowed") {
      return { 
        error: "El registro con email y contraseña no está habilitado. Por favor, contacta al administrador o usa Google/Facebook para registrarte." 
      };
    }

    return {
      error: error.message || "Error al registrarse",
    };
  }
};

/**
 * Google OAuth Login
 * Authenticates with Google via Firebase, then syncs with backend using OAuth endpoint
 *
 * @returns {Promise<{data?: any, error?: string}>} Response with user data or error message
 */
export const loginWithGoogle = async () => {
  try {
    console.log("[AUTH-SERVICE] Starting Google OAuth authentication");
    
    // 1. Authenticate with Google via Firebase
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log(`[AUTH-SERVICE] User authenticated in Firebase: ${user.email}`);

    if (!user.email) {
      await firebaseSignOut(auth);
      console.log("[AUTH-SERVICE] Failed: No email from Google");
      return { error: "No se pudo obtener el correo electrónico de Google" };
    }

    // 2. Get Firebase ID token
    const idToken = await user.getIdToken();
    console.log("[AUTH-SERVICE] Firebase ID token obtained");

    // 3. Sync with backend using OAuth endpoint
    console.log("[AUTH-SERVICE] Syncing with backend via OAuth endpoint");
    const response = await api.post("/auth/login/OAuth", {
      email: user.email,
      password: "GOOGLE_OAUTH_USER", // Placeholder for OAuth
      idToken, // Send ID token for verification
    });

    if (response.error) {
      console.error("[AUTH-SERVICE] Backend OAuth sync failed:", response.error);
      // Continue anyway since Firebase is authenticated
      return {
        data: {
          user: {
            email: user.email,
            nickname: user.displayName || user.email.split("@")[0],
          },
          firebaseUser: user,
        },
      };
    }

    console.log("[AUTH-SERVICE] Google OAuth login successful");
    return {
      data: {
        user: response.data?.user,
        firebaseUser: user,
      },
    };
  } catch (error: any) {
    console.error("[AUTH-SERVICE] Error in Google OAuth login:", error);
    
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
      return { error: "Inicio de sesión cancelado" };
    }
    
    if (error.code === "auth/popup-blocked") {
      return { error: "El navegador bloqueó la ventana emergente. Permite ventanas emergentes para continuar." };
    }
    
    return {
      error: error.message || "Error al iniciar sesión con Google",
    };
  }
};

/**
 * Facebook OAuth Login
 * Authenticates with Facebook via Firebase, then syncs with backend using OAuth endpoint
 *
 * @returns {Promise<{data?: any, error?: string}>} Response with user data or error message
 */
export const loginWithFacebook = async () => {
  try {
    console.log("[AUTH-SERVICE] Starting Facebook OAuth authentication");
    
    // 1. Authenticate with Facebook via Firebase
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;
    console.log(`[AUTH-SERVICE] User authenticated in Firebase: ${user.email}`);

    if (!user.email) {
      await firebaseSignOut(auth);
      console.log("[AUTH-SERVICE] Failed: No email from Facebook");
      return { error: "No se pudo obtener el correo electrónico de Facebook" };
    }

    // 2. Get Firebase ID token
    const idToken = await user.getIdToken();
    console.log("[AUTH-SERVICE] Firebase ID token obtained");

    // 3. Sync with backend using OAuth endpoint
    console.log("[AUTH-SERVICE] Syncing with backend via OAuth endpoint");
    const response = await api.post("/auth/login/OAuth", {
      email: user.email,
      password: "FACEBOOK_OAUTH_USER", // Placeholder for OAuth
      idToken, // Send ID token for verification
    });

    if (response.error) {
      console.error("[AUTH-SERVICE] Backend OAuth sync failed:", response.error);
      // Continue anyway since Firebase is authenticated
      return {
        data: {
          user: {
            email: user.email,
            nickname: user.displayName || user.email.split("@")[0],
          },
          firebaseUser: user,
        },
      };
    }

    console.log("[AUTH-SERVICE] Facebook OAuth login successful");
    return {
      data: {
        user: response.data?.user,
        firebaseUser: user,
      },
    };
  } catch (error: any) {
    console.error("[AUTH-SERVICE] Error in Facebook OAuth login:", error);
    
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
      return { error: "Inicio de sesión cancelado" };
    }
    
    if (error.code === "auth/popup-blocked") {
      return { error: "El navegador bloqueó la ventana emergente. Permite ventanas emergentes para continuar." };
    }
    
    if (error.code === "auth/account-exists-with-different-credential") {
      return { error: "Ya existe una cuenta con este correo usando otro método de inicio de sesión." };
    }
    
    return {
      error: error.message || "Error al iniciar sesión con Facebook",
    };
  }
};

/**
 * Logout (cerrar sesión)
 */
export const logout = async () => {
  try {
    // 1. Cerrar sesión en backend (limpiar cookies)
    await api.post("/auth/logout");

    // 2. Cerrar sesión en Firebase
    await firebaseSignOut(auth);

    return { data: { message: "Sesión cerrada exitosamente" } };
  } catch (error: any) {
    console.error("Error en logout:", error);
    return {
      error: error.message || "Error al cerrar sesión",
    };
  }
};

/**
 * Recuperar contraseña (enviar email)
 */
export const recoverPassword = async (email: string) => {
  try {
    // 1. Enviar email de recuperación via backend
    const response = await api.post("/auth/recover", { email });

    if (response.error) {
      return { error: response.error };
    }

    // 2. También enviar con Firebase (backup)
    await sendPasswordResetEmail(auth, email);

    return {
      data: { message: "Revisa tu correo para continuar" },
    };
  } catch (error: any) {
    console.error("Error en recuperar contraseña:", error);
    return {
      error: error.message || "Error al recuperar contraseña",
    };
  }
};

/**
 * Restablecer contraseña con token
 */
export const resetPassword = async (
  token: string,
  password: string,
  confirmPassword: string
) => {
  try {
    const response = await api.post(`/auth/reset/${token}`, {
      password,
      confirmPassword,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      data: { message: "Contraseña actualizada correctamente" },
    };
  } catch (error: any) {
    console.error("Error en resetear contraseña:", error);
    return {
      error: error.message || "Error al restablecer contraseña",
    };
  }
};

// ============ GESTIÓN DE PERFIL ============

/**
 * Actualizar perfil de usuario
 */
export const updateProfile = async (
  userId: string,
  data: Partial<UserResponse>
) => {
  try {
    const response = await api.put(`/user/${userId}`, data);

    if (response.error) {
      // Si el error es 401 (token expirado), intentar refrescar el token
      if (response.error.includes("401") || response.error.includes("Token expirado") || response.error.includes("no autorizado")) {
        console.log("Token expirado, intentando refrescar...");
        const refreshResponse = await api.post("/auth/refresh");
        
        if (!refreshResponse.error) {
          console.log("Token refrescado, reintentando actualización...");
          // Reintentar la petición después de refrescar el token
          const retryResponse = await api.put(`/user/${userId}`, data);
          if (retryResponse.error) {
            return { error: retryResponse.error };
          }
          return { data: retryResponse.data };
        } else {
          return { 
            error: "Tu sesión ha expirado. Por favor, recarga la página o inicia sesión nuevamente." 
          };
        }
      }
      return { error: response.error };
    }

    return {
      data: response.data,
    };
  } catch (error: any) {
    console.error("Error en actualizar perfil:", error);
    return {
      error: error.message || "Error al actualizar perfil",
    };
  }
};

/**
 * Cambiar contraseña (requiere contraseña actual)
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) => {
  try {
    // 1. Re-autenticar con Firebase
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { error: "No hay usuario autenticado" };
    }

    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    await reauthenticateWithCredential(user, credential);

    // 2. Cambiar contraseña en Firebase
    await firebaseUpdatePassword(user, newPassword);

    // 3. Cambiar contraseña en backend
    const response = await api.put(`/user/password/${userId}`, {
      password: newPassword,
      confirmPassword,
    });

    if (response.error) {
      return { error: response.error };
    }

    return {
      data: { message: "Contraseña actualizada correctamente" },
    };
  } catch (error: any) {
    console.error("Error en cambiar contraseña:", error);

    if (error.code === "auth/wrong-password") {
      return { error: "La contraseña actual es incorrecta" };
    }

    return {
      error: error.message || "Error al cambiar contraseña",
    };
  }
};

/**
 * Eliminar cuenta de usuario
 */
export const deleteAccount = async (userId: string, password: string) => {
  try {
    // 1. Re-autenticar con Firebase
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { error: "No hay usuario autenticado" };
    }

    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // 2. Eliminar en backend primero
    const response = await api.delete(`/user/${userId}`);

    if (response.error) {
      return { error: response.error };
    }

    // 3. Eliminar cuenta de Firebase
    await firebaseDeleteUser(user);

    return {
      data: { message: "Cuenta eliminada exitosamente" },
    };
  } catch (error: any) {
    console.error("Error en eliminar cuenta:", error);

    if (error.code === "auth/wrong-password") {
      return { error: "La contraseña es incorrecta" };
    }

    return {
      error: error.message || "Error al eliminar cuenta",
    };
  }
};

/**
 * Obtener usuario actual
 */
export const getCurrentUser = async (userId: string, email?: string) => {
  try {
    const response = await api.get(`/user/${userId}`);

    if (!response.error) {
      return { data: response.data };
    }

    // Si no se encuentra por ID y tenemos email, intentar buscar por email
    if (email) {
      const fallback = await api.get(`/user?email=${encodeURIComponent(email)}`);
      if (!fallback.error) {
        return { data: fallback.data };
      }
      return { error: fallback.error };
    }

    return { error: response.error };
  } catch (error: any) {
    console.error("Error en obtener usuario:", error);
    return {
      error: error.message || "Error al obtener usuario",
    };
  }
};

export default {
  login,
  signup,
  loginWithGoogle,
  loginWithFacebook,
  logout,
  recoverPassword,
  resetPassword,
  updateProfile,
  changePassword,
  deleteAccount,
  getCurrentUser,
};
