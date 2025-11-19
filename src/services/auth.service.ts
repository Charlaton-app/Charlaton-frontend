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
  let firebaseUser = null;
  
  try {
    // Validar que las contraseñas coincidan
    if (data.password !== data.confirmPassword) {
      return { error: "Las contraseñas no coinciden" };
    }

    // 1. Crear usuario en Firebase
    console.log("Creando usuario en Firebase...");
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    firebaseUser = userCredential.user;
    console.log("Usuario creado en Firebase:", firebaseUser.uid);

    // 2. Crear usuario en backend (Firestore via API)
    console.log("Creando usuario en backend...");
    const response = await api.post("/user", {
      id: userCredential.user.uid,
      email: data.email,
      nickname: data.nickname || null,
      password: data.password,
      rolId: data.rolId || 2, // 2 = usuario normal por defecto
    });

    if (response.error) {
      console.error("Error al crear usuario en backend:", response.error);
      // Si falla el backend, eliminar usuario de Firebase
      if (firebaseUser) {
        try {
          await firebaseDeleteUser(firebaseUser);
          console.log("Usuario eliminado de Firebase debido a error en backend");
        } catch (deleteError) {
          console.error("Error al eliminar usuario de Firebase:", deleteError);
        }
      }
      return { error: response.error };
    }

    console.log("Usuario creado en backend exitosamente");

    // 3. Hacer login automático después del registro
    console.log("Iniciando sesión automática...");
    const loginResponse = await login({
      email: data.email,
      password: data.password,
    });

    if (loginResponse.error) {
      console.warn("Login automático falló, pero el usuario fue creado:", loginResponse.error);
      // El usuario ya está creado, así que retornamos éxito pero sin datos de login
      // El auth observer de Firebase manejará la autenticación
      return {
        data: {
          user: response.data,
          firebaseUser: firebaseUser,
        },
      };
    }

    return loginResponse;
  } catch (error: any) {
    console.error("Error en signup:", error);

    // Si el usuario fue creado en Firebase pero falló algo después, intentar limpiar
    if (firebaseUser) {
      try {
        await firebaseDeleteUser(firebaseUser);
        console.log("Usuario eliminado de Firebase debido a error");
      } catch (deleteError) {
        console.error("Error al eliminar usuario de Firebase:", deleteError);
      }
    }

    // Mensajes de error más amigables
    if (error.code === "auth/email-already-in-use") {
      // El usuario existe en Firebase Auth pero puede que no en el backend
      // Intentar hacer login para sincronizar
      console.log("Usuario existe en Firebase Auth, intentando sincronizar con backend...");
      try {
        const loginResponse = await login({
          email: data.email,
          password: data.password,
        });
        
        if (loginResponse.error) {
          // Si el login falla, puede ser que el usuario no exista en el backend
          // Intentar crear solo en el backend
          console.log("Login falló, intentando crear usuario solo en backend...");
          const backendResponse = await api.post("/user", {
            email: data.email,
            nickname: data.nickname || null,
            password: data.password,
            rolId: data.rolId || 2,
          });
          
          if (backendResponse.error && backendResponse.error.includes("ya está registrado")) {
            return { error: "El correo ya está registrado. Intenta iniciar sesión en lugar de registrarte." };
          }
          
          if (backendResponse.error) {
            return { error: `El correo ya existe en Firebase pero hubo un error al sincronizar: ${backendResponse.error}` };
          }
          
          // Usuario creado en backend, ahora intentar login de nuevo
          const retryLogin = await login({
            email: data.email,
            password: data.password,
          });
          
          return retryLogin;
        }
        
        // Login exitoso, usuario sincronizado
        return loginResponse;
      } catch (syncError: any) {
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
 * Login con Google OAuth
 */
export const loginWithGoogle = async () => {
  try {
    // 1. Autenticar con Google via Firebase
    console.log("Autenticando con Google...");
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Usuario autenticado en Firebase:", user.email);

    if (!user.email) {
      await firebaseSignOut(auth);
      return { error: "No se pudo obtener el correo electrónico de Google" };
    }

    // 2. Intentar crear o actualizar el usuario en el backend
    let backendUser = null;
    
    // Intentar crear el usuario si no existe
    console.log("Intentando crear/sincronizar usuario en backend...");
    const createResponse = await api.post("/user", {
      id: user.uid,
      email: user.email,
      nickname: user.displayName || user.email.split("@")[0],
      password: "GOOGLE_OAUTH_USER", // Contraseña placeholder
      rolId: 2,
    });

    if (createResponse.error) {
      // Si el error es que ya existe, intentar hacer login para obtener tokens
      if (createResponse.error.includes("ya está registrado") || createResponse.error.includes("already")) {
        console.log("Usuario ya existe en backend, intentando login para obtener tokens...");
        // Intentar hacer login con la contraseña placeholder para obtener las cookies
        const loginAttempt = await api.post("/auth/login", {
          email: user.email,
          password: "GOOGLE_OAUTH_USER",
        });
        
        if (loginAttempt.error) {
          console.warn("No se pudo hacer login automático, pero Firebase está autenticado:", loginAttempt.error);
          // Continuar de todas formas porque Firebase está autenticado
        } else {
          console.log("Login exitoso, tokens obtenidos");
          backendUser = loginAttempt.data?.user || backendUser;
        }
      } else {
        console.error("Error al crear usuario en backend:", createResponse.error);
        // Si es otro error, intentar continuar de todas formas
        // porque el usuario ya está autenticado en Firebase
      }
    } else {
      console.log("Usuario creado/sincronizado en backend exitosamente");
      backendUser = createResponse.data;
      // Intentar hacer login para obtener tokens
      const loginAttempt = await api.post("/auth/login", {
        email: user.email,
        password: "GOOGLE_OAUTH_USER",
      });
      if (!loginAttempt.error) {
        console.log("Login exitoso después de crear usuario");
        backendUser = loginAttempt.data?.user || backendUser;
      }
    }

    // Si aún no tenemos info del backend, intentar obtenerla por email
    if (!backendUser && user.email) {
      const fallbackUser = await api.get(`/user?email=${encodeURIComponent(user.email)}`);
      if (!fallbackUser.error) {
        backendUser = fallbackUser.data;
      }
    }

    // 3. Retornar éxito - el usuario ya está autenticado en Firebase
    // No necesitamos hacer login en el backend porque OAuth no usa contraseña
    return {
      data: {
        user: backendUser || {
          email: user.email,
          nickname: user.displayName || user.email.split("@")[0],
        },
        firebaseUser: user,
      },
    };
  } catch (error: any) {
    console.error("Error en login con Google:", error);
    
    // Si el error es que el usuario canceló, no mostrar error
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
      return { error: "Inicio de sesión cancelado" };
    }
    
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
    console.log("Autenticando con Facebook...");
    const result = await signInWithPopup(auth, facebookProvider);
    const user = result.user;
    console.log("Usuario autenticado en Firebase:", user.email);

    if (!user.email) {
      await firebaseSignOut(auth);
      return { error: "No se pudo obtener el correo electrónico de Facebook" };
    }

    // 2. Intentar crear o actualizar el usuario en el backend
    let backendUser = null;
    
    // Intentar crear el usuario si no existe
    console.log("Intentando crear/sincronizar usuario en backend...");
    const createResponse = await api.post("/user", {
      id: user.uid,
      email: user.email,
      nickname: user.displayName || user.email.split("@")[0],
      password: "FACEBOOK_OAUTH_USER", // Contraseña placeholder
      rolId: 2,
    });

    if (createResponse.error) {
      // Si el error es que ya existe, intentar hacer login para obtener tokens
      if (createResponse.error.includes("ya está registrado") || createResponse.error.includes("already")) {
        console.log("Usuario ya existe en backend, intentando login para obtener tokens...");
        // Intentar hacer login con la contraseña placeholder para obtener las cookies
        const loginAttempt = await api.post("/auth/login", {
          email: user.email,
          password: "FACEBOOK_OAUTH_USER",
        });
        
        if (loginAttempt.error) {
          console.warn("No se pudo hacer login automático, pero Firebase está autenticado:", loginAttempt.error);
          // Continuar de todas formas porque Firebase está autenticado
        } else {
          console.log("Login exitoso, tokens obtenidos");
          backendUser = loginAttempt.data?.user || backendUser;
        }
      } else {
        console.error("Error al crear usuario en backend:", createResponse.error);
        // Si es otro error, intentar continuar de todas formas
        // porque el usuario ya está autenticado en Firebase
      }
    } else {
      console.log("Usuario creado/sincronizado en backend exitosamente");
      backendUser = createResponse.data;
      // Intentar hacer login para obtener tokens
      const loginAttempt = await api.post("/auth/login", {
        email: user.email,
        password: "FACEBOOK_OAUTH_USER",
      });
      if (!loginAttempt.error) {
        console.log("Login exitoso después de crear usuario");
        backendUser = loginAttempt.data?.user || backendUser;
      }
    }

    // Si aún no tenemos info del backend, intentar obtenerla por email
    if (!backendUser && user.email) {
      const fallbackUser = await api.get(`/user?email=${encodeURIComponent(user.email)}`);
      if (!fallbackUser.error) {
        backendUser = fallbackUser.data;
      }
    }

    // 3. Retornar éxito - el usuario ya está autenticado en Firebase
    // No necesitamos hacer login en el backend porque OAuth no usa contraseña
    return {
      data: {
        user: backendUser || {
          email: user.email,
          nickname: user.displayName || user.email.split("@")[0],
        },
        firebaseUser: user,
      },
    };
  } catch (error: any) {
    console.error("Error en login con Facebook:", error);
    
    // Si el error es que el usuario canceló, no mostrar error
    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
      return { error: "Inicio de sesión cancelado" };
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
