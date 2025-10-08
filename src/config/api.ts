/**
 * Configuração centralizada da API
 */

const isDevelopment = import.meta.env.MODE === "development";
const isProduction = import.meta.env.MODE === "production";

// Base URLs for different environments
const API_URLS = {
  // Em desenvolvimento, usar localhost
  development: import.meta.env.VITE_API_URL || "http://localhost:3000",
  // Em produção, usar URL do Render
  production: import.meta.env.VITE_API_URL || "https://vendeuonline-uqkk.onrender.com",
};

// Current API base URL baseado no ambiente
export const API_BASE_URL = isProduction ? API_URLS.production : API_URLS.development;

// Timeout padrão para requisições
export const API_TIMEOUT = 30000; // 30 segundos

// Headers padrão com encoding UTF-8
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  Accept: "application/json",
  "Accept-Charset": "utf-8",
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  // Se o endpoint já for uma URL completa, retorna como está
  if (endpoint.startsWith("http")) {
    return endpoint;
  }

  // Remover /api/ do início do endpoint se existir (será adicionado abaixo)
  const cleanEndpoint = endpoint.replace(/^\/api\/?/, "");

  // Construir URL completa: BASE_URL + /api/ + endpoint
  return `${API_BASE_URL}/api/${cleanEndpoint.replace(/^\//, "")}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (): Record<string, string> => {
  // Tentar pegar token do Zustand persist storage primeiro
  let token = null;

  try {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      token = parsed?.state?.token || parsed?.token;
    }
  } catch (error) {
    console.warn("[API] Erro ao parsear auth-storage:", error);
  }

  // Fallback: tentar chave antiga
  if (!token) {
    token = localStorage.getItem("auth-token");
  }

  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to get all headers with auth
export const getHeaders = (customHeaders: Record<string, string> = {}): Record<string, string> => {
  return {
    ...DEFAULT_HEADERS,
    ...getAuthHeaders(),
    ...customHeaders,
  };
};

export default API_BASE_URL;
