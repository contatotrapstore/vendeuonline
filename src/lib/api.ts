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

// Detecta se é um cold start do Render (timeout ou conexão recusada)
function isColdStartError(error: any): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() || '';
  return (
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('network') ||
    error.name === 'AbortError'
  );
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<ApiResponse<T>> {
  const MAX_RETRIES = 2;
  const COLD_START_TIMEOUT = 40000; // 40s para primeira tentativa durante cold start

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

    // Timeout maior na primeira tentativa para permitir cold start
    const timeout = retryCount === 0 ? COLD_START_TIMEOUT : 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      headers,
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.message || "Request failed");
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    // Se é cold start error e ainda temos retries, tentar novamente
    if (isColdStartError(error) && retryCount < MAX_RETRIES) {
      console.warn(`⏳ Servidor inicializando (tentativa ${retryCount + 1}/${MAX_RETRIES + 1})...`);

      // Aguardar antes de retry (backoff exponencial)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

      return apiRequest<T>(url, options, retryCount + 1);
    }

    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Mensagem amigável para timeout
    if (isColdStartError(error)) {
      return {
        success: false,
        error: "Servidor está inicializando. Por favor, tente novamente em alguns segundos.",
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
