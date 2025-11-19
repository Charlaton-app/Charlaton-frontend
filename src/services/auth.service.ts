// src/services/auth.service.ts
// Servicio de autenticación con el backend

import api from "./api";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
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
  email: string;
  nickname?: string;
  role?: string;
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
 * Registro de nuevo usuario
 * Crea usuario en Firebase y luego en el backend
 */
export const signup = async (data: SignupData) => {
  try {
    // Validar que las contraseñas coincidan
    if (data.password !== data.confirmPassword) {
      return { error: "Las contraseñas no coinciden" };
    }

    // 1. Crear usuario en Firebase
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    // 2. Crear usuario en backend (Firestore via API)
    const response = await api.post("/user", {
      email: data.email,
      nickname: data.nickname || null,
      password: data.password,
      rolId: data.rolId || 2, // 2 = usuario normal por defecto
    });

    if (response.error) {
      // Si falla el backend, eliminar usuario de Firebase
      if (userCredential.user) {
        await firebaseDeleteUser(userCredential.user);
      }
      return { error: response.error };
    }

    // 3. Hacer login automático después del registro
    const loginResponse = await login({
      email: data.email,
      password: data.password,
    });

    return loginResponse;
  } catch (error: any) {
    console.error("Error en signup:", error);

    // Mensajes de error más amigables
    if (error.code === "auth/email-already-in-use") {
      return { error: "El correo ya está registrado" };
    }
    if (error.code === "auth/weak-password") {
      return { error: "La contraseña debe tener al menos 6 caracteres" };
    }
    if (error.code === "auth/invalid-email") {
      return { error: "El correo electrónico no es válido" };
    }

    return {
      error: error.message || "Error al registrarse",
    };
  }
};

/**
 * Login con Google OAuth
 */
export const loginWithGoogle = async () => {
  try {
    // 1. Autenticar con Google via Firebase
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // 2. Verificar si el usuario ya existe en backend
    const checkResponse = await api.get(`/user/${user.uid}`);

    // Si no existe, crear el usuario en backend
    if (checkResponse.error) {
      const createResponse = await api.post("/user", {
        email: user.email,
        nickname: user.displayName || user.email?.split("@")[0],
        password: "GOOGLE_OAUTH_USER", // Contraseña placeholder para OAuth
        rolId: 2,
      });

      if (createResponse.error) {
        await firebaseSignOut(auth);
        return { error: createResponse.error };
      }
    }

    // 3. Hacer login en backend (sincronizar sesión)
    // Nota: El backend debería tener un endpoint específico para OAuth
    // Por ahora usamos el login normal
    const loginResponse = await api.post("/auth/login", {
      email: user.email,
      password: "GOOGLE_OAUTH_USER",
    });

    if (loginResponse.error) {
      await firebaseSignOut(auth);
      return { error: loginResponse.error };
    }

    return {
      data: {
        user: loginResponse.data?.user,
        firebaseUser: user,
      },
    };
  } catch (error: any) {
    console.error("Error en login con Google:", error);
    return {
      error: error.message || "Error al iniciar sesión con Google",
    };
  }
};

/**
 * Login con Facebook OAuth
 */
export const loginWithFacebook = async () => {
  try {
    // 1. Autenticar con Facebook via Firebase
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;

    // 2. Verificar si el usuario ya existe en backend
    const checkResponse = await api.get(`/user/${user.uid}`);

    // Si no existe, crear el usuario en backend
    if (checkResponse.error) {
      const createResponse = await api.post("/user", {
        email: user.email,
        nickname: user.displayName || user.email?.split("@")[0],
        password: "FACEBOOK_OAUTH_USER", // Contraseña placeholder para OAuth
        rolId: 2,
      });

      if (createResponse.error) {
        await firebaseSignOut(auth);
        return { error: createResponse.error };
      }
    }

    // 3. Hacer login en backend (sincronizar sesión)
    const loginResponse = await api.post("/auth/login", {
      email: user.email,
      password: "FACEBOOK_OAUTH_USER",
    });

    if (loginResponse.error) {
      await firebaseSignOut(auth);
      return { error: loginResponse.error };
    }

    return {
      data: {
        user: loginResponse.data?.user,
        firebaseUser: user,
      },
    };
  } catch (error: any) {
    console.error("Error en login con Facebook:", error);
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
export const getCurrentUser = async (userId: string) => {
  try {
    const response = await api.get(`/user/${userId}`);

    if (response.error) {
      return { error: response.error };
    }

    return {
      data: response.data,
    };
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
