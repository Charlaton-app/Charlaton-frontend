// src/services/api.ts
// Servicio base para comunicación con el backend

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// Configuración base para fetch
const fetchWithConfig = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Importante para cookies (AccessToken, RefreshToken)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.error || data.message || "Error en la petición",
      };
    }

    return { data };
  } catch (error: any) {
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

  // DELETE request
  delete: <T = any>(endpoint: string, options?: RequestInit) => {
    return fetchWithConfig<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  },
};

export default api;
