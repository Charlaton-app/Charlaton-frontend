import { create } from "zustand";
import { persist } from "zustand/middleware";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase.config";
import authService from "../services/auth.service";

interface User {
  id?: string; // ID del backend (Firestore)
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  nickname?: string | null;
  role?: string | null;
}

type AuthStore = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  initAuthObserver: () => () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: {
    email: string;
    nickname?: string;
    password: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithFacebook: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  recoverPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>;
};

const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      setUser: (user: User | null) => set({ user, error: null }),
      setLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),

      initAuthObserver: () => {
        const unsubscribe = onAuthStateChanged(
          auth,
          async (fbUser) => {
            if (fbUser) {
              // Sincronizar con el backend para obtener datos completos
              try {
                const response = await authService.getCurrentUser(fbUser.uid);
                
                if (response.data) {
                  const userLogged: User = {
                    id: fbUser.uid,
                    displayName: fbUser.displayName,
                    email: fbUser.email,
                    photoURL: fbUser.photoURL,
                    nickname: response.data.nickname,
                    role: response.data.role,
                  };
                  set({ user: userLogged });
                } else {
                  // Si no hay datos en backend, usar solo Firebase
                  const userLogged: User = {
                    id: fbUser.uid,
                    displayName: fbUser.displayName,
                    email: fbUser.email,
                    photoURL: fbUser.photoURL,
                  };
                  set({ user: userLogged });
                }
              } catch (error) {
                console.error("Error sincronizando usuario:", error);
                const userLogged: User = {
                  id: fbUser.uid,
                  displayName: fbUser.displayName,
                  email: fbUser.email,
                  photoURL: fbUser.photoURL,
                };
                set({ user: userLogged });
              }
            } else {
              set({ user: null });
            }
          },
          (err) => {
            console.error("Error en auth observer:", err);
            set({ error: err.message });
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
              id: response.data.firebaseUser.uid,
              displayName: response.data.firebaseUser.displayName,
              email: response.data.firebaseUser.email,
              photoURL: response.data.firebaseUser.photoURL,
              nickname: response.data.user?.nickname,
              role: response.data.user?.role,
            };
            set({ user, isLoading: false });
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
              id: response.data.firebaseUser.uid,
              displayName: response.data.firebaseUser.displayName,
              email: response.data.firebaseUser.email,
              photoURL: response.data.firebaseUser.photoURL,
              nickname: response.data.user?.nickname,
              role: response.data.user?.role,
            };
            set({ user, isLoading: false });
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
              id: response.data.firebaseUser.uid,
              displayName: response.data.firebaseUser.displayName,
              email: response.data.firebaseUser.email,
              photoURL: response.data.firebaseUser.photoURL,
              nickname: response.data.user?.nickname,
              role: response.data.user?.role,
            };
            set({ user, isLoading: false });
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: "Error desconocido" };
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      loginWithFacebook: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.loginWithFacebook();

          if (response.error) {
            set({ error: response.error, isLoading: false });
            return { success: false, error: response.error };
          }

          if (response.data) {
            const user: User = {
              id: response.data.firebaseUser.uid,
              displayName: response.data.firebaseUser.displayName,
              email: response.data.firebaseUser.email,
              photoURL: response.data.firebaseUser.photoURL,
              nickname: response.data.user?.nickname,
              role: response.data.user?.role,
            };
            set({ user, isLoading: false });
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
          set({ user: null, isLoading: false });
        } catch (error: any) {
          console.error("Error al cerrar sesión:", error);
          set({ error: error.message, isLoading: false });
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

          // Actualizar usuario en el store
          set({
            user: { ...user, ...data },
            isLoading: false,
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

      deleteAccount: async (password: string) => {
        const user = get().user;
        if (!user || !user.id) {
          return { success: false, error: "No hay usuario autenticado" };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await authService.deleteAccount(user.id, password);

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
      partialize: (state) => ({ user: state.user }), // Solo persistir el usuario
    }
  )
);

export default useAuthStore;