import { logger } from "@/lib/logger";

/**
 * Cliente de API centralizado para todas as requisições
 */

import { API_BASE_URL, API_TIMEOUT, DEFAULT_HEADERS } from "@/config/api";
import { getAuthToken } from "@/config/storage-keys";

// Função para obter token armazenado
const getStoredToken = (): string | null => {
  if (typeof window !== "undefined") {
    return getAuthToken();
  }
  return null;
};

// Interface para opções de requisição customizadas
export interface ApiRequestOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  token?: string;
}

/**
 * Função principal para requisições à API
 * @param endpoint - Endpoint da API (ex: '/products' ou '/auth/login')
 * @param options - Opções da requisição
 * @returns Promise com os dados da resposta
 */
// Função auxiliar para delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Função para verificar se erro é recuperável
const isRetryableError = (error: Error): boolean => {
  return (
    error.name === "AbortError" || // Timeout
    error.message.includes("Failed to fetch") || // Network error
    error.message.includes("NetworkError") ||
    error.message.includes("Tempo limite") ||
    error.message.includes("500") || // Server error
    error.message.includes("502") || // Bad gateway
    error.message.includes("503") || // Service unavailable
    error.message.includes("504") // Gateway timeout
  );
};

export const apiRequest = async <T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { timeout = API_TIMEOUT, headers = {}, retryAttempts = 3, retryDelay = 1000, ...restOptions } = options;

  // Construir URL completa
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  // Função interna para fazer a requisição
  const makeRequest = async (attempt: number): Promise<T> => {
    // Preparar headers
    const token = getStoredToken();
    const requestHeaders: Record<string, string> = {
      ...DEFAULT_HEADERS,
      ...headers,
    };

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    // Criar controller para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Verificar se a resposta é bem-sucedida
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorData;

        if (contentType && contentType.includes("application/json")) {
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: `Erro ${response.status}: ${response.statusText}` };
          }
        } else {
          errorData = { error: `Erro ${response.status}: ${response.statusText}` };
        }

        // Extrair a mensagem de erro mais específica possível
        let errorMessage = `Erro ${response.status}`;
        if (errorData) {
          // Se tem erro específico na resposta
          if (errorData.error) {
            // Tentar extrair mensagens de validação do Zod se for um JSON string
            if (typeof errorData.error === 'string' && errorData.error.startsWith('[')) {
              try {
                const validationErrors = JSON.parse(errorData.error);
                if (Array.isArray(validationErrors) && validationErrors.length > 0) {
                  // Pegar a primeira mensagem de erro
                  errorMessage = validationErrors[0].message || errorData.error;
                } else {
                  errorMessage = errorData.error;
                }
              } catch {
                errorMessage = errorData.error;
              }
            } else {
              errorMessage = errorData.error;
            }
          }
          // Se tem mensagem específica na resposta
          else if (errorData.message) {
            errorMessage = errorData.message;
          }
          // Se tem detalhes de validação (como do Zod)
          else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        }
        
        const error = new Error(errorMessage);

        // Se é erro 4xx, não tentar novamente
        if (response.status >= 400 && response.status < 500) {
          throw error;
        }

        // Se é erro 5xx e ainda temos tentativas, tentar novamente
        if (response.status >= 500 && attempt < retryAttempts) {
          logger.warn(`API request failed (attempt ${attempt}/${retryAttempts}):`, error.message);
          await sleep(retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
          return makeRequest(attempt + 1);
        }

        throw error;
      }

      // Verificar se a resposta contém JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        // Se não for JSON, retornar como texto
        const text = await response.text();
        return text as unknown as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        // Se é erro de timeout/network e ainda temos tentativas
        if (isRetryableError(error) && attempt < retryAttempts) {
          logger.warn(`API request failed (attempt ${attempt}/${retryAttempts}):`, error.message);
          await sleep(retryDelay * Math.pow(2, attempt - 1)); // Exponential backoff
          return makeRequest(attempt + 1);
        }

        if (error.name === "AbortError") {
          throw new Error("Tempo limite da requisição excedido");
        }
        throw error;
      }

      throw new Error("Erro desconhecido na requisição");
    }
  };

  return makeRequest(1);
};

// Funções de conveniência para diferentes métodos HTTP
export const get = <T = any>(endpoint: string, options: Omit<ApiRequestOptions, "method"> = {}): Promise<T> =>
  apiRequest<T>(endpoint, { ...options, method: "GET" });

export const post = <T = any>(
  endpoint: string,
  data?: any,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<T> =>
  apiRequest<T>(endpoint, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });

export const put = <T = any>(
  endpoint: string,
  data?: any,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<T> =>
  apiRequest<T>(endpoint, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });

export const patch = <T = any>(
  endpoint: string,
  data?: any,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<T> =>
  apiRequest<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });

export const del = <T = any>(endpoint: string, options: Omit<ApiRequestOptions, "method"> = {}): Promise<T> =>
  apiRequest<T>(endpoint, { ...options, method: "DELETE" });

export default apiRequest;
