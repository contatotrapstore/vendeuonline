/**
 * Configuração centralizada da API
 */

const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

// Base URLs for different environments
const API_URLS = {
  development: 'http://localhost:5173',
  production: import.meta.env.VITE_API_URL || window.location.origin
};

// Current API base URL
export const API_BASE_URL = isDevelopment ? API_URLS.development : API_URLS.production;

// Timeout padrão para requisições
export const API_TIMEOUT = 30000; // 30 segundos

// Headers padrão
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint: string): string => {
  // Se o endpoint já for uma URL completa, retorna como está
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // Se começar com /api, usa o servidor backend
  if (endpoint.startsWith('/api')) {
    return `${API_BASE_URL}${endpoint}`;
  }
  
  // Caso contrário, adiciona /api/ ao início
  return `${API_BASE_URL}/api/${endpoint.replace(/^\//, '')}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth-token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper function to get all headers with auth
export const getHeaders = (customHeaders: Record<string, string> = {}): Record<string, string> => {
  return {
    ...DEFAULT_HEADERS,
    ...getAuthHeaders(),
    ...customHeaders
  };
};

export default API_BASE_URL;