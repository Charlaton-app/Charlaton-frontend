// src/services/api.ts
// Servicio base para comunicación con el backend

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
// Normalizar API_URL para evitar duplicar /api
// Remover /api o /api/ del final si existe
const normalizedApiUrl = API_URL.replace(/\/api\/?$/, "");
const API_BASE = `${normalizedApiUrl}/api`;

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Configuración base para fetch con timeout
const fetchWithConfig = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryOn401: boolean = true
): Promise<ApiResponse<T>> => {
  const timeout = 10000; // 10 segundos de timeout
  
  try {
    // Crear un AbortController para el timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Importante para cookies (AccessToken, RefreshToken)
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      // Manejar errores específicos
      if (response.status === 401) {
        // Intentar refrescar el token si es la primera vez y no es el endpoint de refresh
        if (retryOn401 && !endpoint.includes("/auth/refresh")) {
          console.log("[API] Token expirado, intentando refrescar...");
          try {
            const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
            });

            const refreshData = await refreshResponse.json();

            if (refreshResponse.ok) {
              console.log("[API] Token refrescado, reintentando petición...");
              // Reintentar la petición original después de refrescar
              return fetchWithConfig<T>(endpoint, options, false);
            } else {
              console.error("[API] Error al refrescar token:", refreshData.error);
              // Si el refresh falla, podría ser que la sesión expiró completamente
              // En este caso, el usuario necesita volver a iniciar sesión
              return {
                error: refreshData.error || "Tu sesión ha expirado. Por favor, recarga la página o inicia sesión nuevamente.",
              };
            }
          } catch (refreshError) {
            console.error("[API] Error en el proceso de refresh:", refreshError);
            return {
              error: "Error al refrescar la sesión. Por favor, recarga la página o inicia sesión nuevamente.",
            };
          }
        }
        return {
          error: data.error || data.message || "Token expirado o no autorizado. Por favor, inicia sesión nuevamente.",
        };
      }
      if (response.status === 404) {
        return {
          error: data.error || data.message || "Recurso no encontrado",
        };
      }
      if (response.status === 400) {
        return {
          error: data.error || data.message || "Solicitud inválida",
        };
      }
      return {
        error: data.error || data.message || `Error en la petición (${response.status})`,
      };
    }

    return { data };
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.error("Timeout en API:", endpoint);
      return {
        error: "El servidor tardó demasiado en responder. Verifica que el backend esté corriendo.",
      };
    }
    console.error("Error en API:", error);
    return {
      error: error.message || "Error de conexión con el servidor",
    };
  }
};

export const api = {
  // GET request
  get: <T = any>(endpoint: string, options?: RequestInit) => {
    return fetchWithConfig<T>(endpoint, {
      ...options,
      method: "GET",
    });
  },

  // POST request
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    return fetchWithConfig<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // PUT request
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    return fetchWithConfig<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // PATCH request
  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) => {
    return fetchWithConfig<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  // DELETE request
  delete: <T = any>(endpoint: string, options?: RequestInit) => {
    return fetchWithConfig<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  },
};

export default api;
