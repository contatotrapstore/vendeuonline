// Utility functions for API requests

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Helper para pegar token do authStore
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.token || null;
    }
  } catch (error) {
    console.error('Erro ao ler token:', error);
  }
  return null;
}

export async function apiRequest<T = any>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    // Pegar token e adicionar ao header Authorization
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      headers,
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.message || "Request failed");
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function get<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { method: "GET" });
}

export async function post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function del<T = any>(url: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { method: "DELETE" });
}

export async function patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });
}
