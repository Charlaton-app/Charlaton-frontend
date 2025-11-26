import { create } from "zustand";
import { persist } from "zustand/middleware";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../lib/firebase.config";
import authService from "../services/auth.service";

interface User {
  id?: string; // ID del backend (Firestore)
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  nickname?: string | null;
  edad?: number;
  role?: string | null;
  createdAt?: any;
  authProvider?: string | null;
}

type AuthStore = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  initAuthObserver: () => () => void;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
    email: string;
    nickname?: string;
    password: string;
    edad: number;
    confirmPassword: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithGithub: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  recoverPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (
    data: Partial<User>
  ) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
};

const normalizeProvider = (providerId?: string | null) => {
  if (!providerId) return "password";
  if (providerId.includes("google")) return "google";
  if (providerId.includes("github")) return "github";
  if (providerId.includes("password")) return "password";
  return providerId;
};

const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      isInitialized: false,

      setUser: (user: User | null) =>
        set({
          user,
          error: null,
          isAuthenticated: !!user,
        }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),

      initAuthObserver: () => {
        set({ isInitialized: false });
        const unsubscribe = onAuthStateChanged(
          auth,
          async (fbUser) => {
            if (fbUser) {
              // Sincronizar con el backend para obtener datos completos
              try {
                const response = await authService.getCurrentUser(
                  fbUser.uid,
                  fbUser.email || undefined
                );
                const providerId =
                  fbUser.providerData?.[0]?.providerId || fbUser.providerId;
                const authProvider = normalizeProvider(providerId);

                if (response.data) {
                  const userLogged: User = {
                    id: response.data.id || fbUser.uid,
                    displayName: fbUser.displayName,
                    email: fbUser.email,
                    photoURL: fbUser.photoURL,
                    nickname: response.data.nickname,
                    edad: response.data.edad,
                    role: response.data.role,
                    createdAt: response.data.createdAt || null,
                    authProvider,
                  };
                  set({
                    user: userLogged,
                    isAuthenticated: true,
                    isInitialized: true,
                    error: null,
                  });
                } else {
                  // Si no hay datos en backend, usar solo Firebase
                  const userLogged: User = {
                    id: fbUser.uid,
                    displayName: fbUser.displayName,
                    email: fbUser.email,
                    photoURL: fbUser.photoURL,
                    createdAt: null,
                    authProvider,
                  };
                  set({
                    user: userLogged,
                    isAuthenticated: true,
                    isInitialized: true,
                    error: null,
                  });
                }
              } catch (error: any) {
                console.error("Error sincronizando usuario:", error);
                
                // Si el error es 401 o token expirado, cerrar sesión completamente
                if (
                  error.message?.includes("401") ||
                  error.message?.includes("Token") ||
                  error.message?.includes("expirado") ||
                  error.message?.includes("unauthorized")
                ) {
                  console.log("[AUTH-STORE] Token expirado, cerrando sesión");
                  // Cerrar sesión de Firebase
                  await firebaseSignOut(auth);
                  // Limpiar el store
                  set({
                    user: null,
                    isAuthenticated: false,
                    isInitialized: true,
                    error: null,
                  });
                  return;
                }
                
                // Para otros errores, usar solo Firebase (fallback)
                const providerId =
                  fbUser.providerData?.[0]?.providerId || fbUser.providerId;
                const authProvider = normalizeProvider(providerId);
                const userLogged: User = {
                  id: fbUser.uid,
                  displayName: fbUser.displayName,
                  email: fbUser.email,
                  photoURL: fbUser.photoURL,
                  createdAt: null,
                  authProvider,
                };
                set({
                  user: userLogged,
                  isAuthenticated: true,
                  isInitialized: true,
                  error: null,
                });
              }
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isInitialized: true,
                error: null,
              });
            }
          },
          (err) => {
            console.error("Error en auth observer:", err);
            set({
              error: err.message,
              isInitialized: true,
              isAuthenticated: false,
            });
          }
        );
        return unsubscribe;
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          if (response.data) {
            const user: User = {
              id: response.data.user?.id || response.data.firebaseUser.uid,
              displayName: response.data.firebaseUser.displayName,
              email: response.data.firebaseUser.email,
              photoURL: response.data.firebaseUser.photoURL,
              nickname: response.data.user?.nickname,
              edad: response.data.user?.edad,
              role: response.data.user?.role,
              createdAt: response.data.user?.createdAt || null,
              authProvider: "password",
            };
            set({
              user,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: "Error desconocido" };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.signup(data);

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          if (response.data) {
            const user: User = {
              id: response.data.user?.id || response.data.firebaseUser.uid,
              displayName: response.data.firebaseUser.displayName,
              email: response.data.firebaseUser.email,
              photoURL: response.data.firebaseUser.photoURL,
              nickname: response.data.user?.nickname,
              edad: response.data.user?.edad,
              role: response.data.user?.role,
              createdAt: response.data.user?.createdAt || null,
              authProvider: "password",
            };
            set({
              user,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: "Error desconocido" };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.loginWithGoogle();

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          if (response.data) {
            const user: User = {
              id: response.data.user?.id || response.data.firebaseUser.uid,
              displayName: response.data.firebaseUser.displayName,
              email: response.data.firebaseUser.email,
              photoURL: response.data.firebaseUser.photoURL,
              nickname: response.data.user?.nickname,
              edad: response.data.user?.edad,
              role: response.data.user?.role,
              createdAt: response.data.user?.createdAt || null,
              authProvider: "google",
            };
            set({
              user,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: "Error desconocido" };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      loginWithGithub: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.loginWithGithub();

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          if (response.data) {
            const user: User = {
              id: response.data.user?.id || response.data.firebaseUser.uid,
              displayName: response.data.firebaseUser.displayName,
              email: response.data.firebaseUser.email,
              photoURL: response.data.firebaseUser.photoURL,
              nickname: response.data.user?.nickname,
              edad: response.data.user?.edad,
              role: response.data.user?.role,
              createdAt: response.data.user?.createdAt || null,
              authProvider: "github",
            };
            set({
              user,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: "Error desconocido" };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await authService.logout();
          set({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          });
        } catch (error: any) {
          console.error("Error al cerrar sesión:", error);
          // Aún así, limpiar el estado local
          set({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            error: error.message,
          });
        }
      },

      recoverPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.recoverPassword(email);

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      updateUserProfile: async (data: Partial<User>) => {
        const user = get().user;
        if (!user || !user.id) {
          return { success: false, error: "No hay usuario autenticado" };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await authService.updateProfile(user.id, data);

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          // Merge backend response data with local state to ensure all fields are updated
          const updatedUser = {
            ...user,
            ...data,
            // Ensure backend response data is used if available
            ...(response.data || {}),
          } as User;

          // Actualizar usuario en el store
          set({
            user: updatedUser,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });

          return { success: true };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      changePassword: async (
        currentPassword: string,
        newPassword: string,
        confirmPassword: string
      ) => {
        const user = get().user;
        if (!user || !user.id) {
          return { success: false, error: "No hay usuario autenticado" };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await authService.changePassword(
            user.id,
            currentPassword,
            newPassword,
            confirmPassword
          );

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      deleteAccount: async () => {
        const user = get().user;
        if (!user || !user.id) {
          return { success: false, error: "No hay usuario autenticado" };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await authService.deleteAccount(user.id);

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          set({ user: null, isLoading: false });
          return { success: true };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },
    }),
    {
      name: "auth-storage", // Nombre para localStorage
      partialize: (state) => ({
        // NO persistir el usuario - siempre verificar con Firebase/Backend
        // Esto evita problemas con tokens expirados
      }),
    }
  )
);

export default useAuthStore;
