/**
 * Configuração centralizada da API
 */

const isDevelopment = import.meta.env.MODE === "development";
const isProduction = import.meta.env.MODE === "production";

// Base URLs for different environments
const API_URLS = {
  // Em desenvolvimento, usar '' para que requisições passem pelo proxy do Vite
  development: "",
  // Em produção, usar URL completa
  production: import.meta.env.VITE_API_URL || window.location.origin,
};

// Current API base URL
export const API_BASE_URL = isDevelopment ? API_URLS.development : API_URLS.production;

// Timeout padrão para requisições
export const API_TIMEOUT = 30000; // 30 segundos

// Headers padrão com encoding UTF-8
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Accept": "application/json",
  "Accept-Charset": "utf-8",
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  // Se o endpoint já for uma URL completa, retorna como está
  if (endpoint.startsWith("http")) {
    return endpoint;
  }

  // Em desenvolvimento, todas as requisições devem começar com /api para usar o proxy
  if (isDevelopment) {
    if (endpoint.startsWith("/api")) {
      return endpoint; // Já tem /api, usar diretamente
    }
    // Adicionar /api/ ao início para usar o proxy
    return `/api/${endpoint.replace(/^\//, "")}`;
  }

  // Em produção, usar API_BASE_URL
  if (endpoint.startsWith("/api")) {
    return `${API_BASE_URL}${endpoint}`;
  }

  return `${API_BASE_URL}/api/${endpoint.replace(/^\//, "")}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("auth-token");
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
