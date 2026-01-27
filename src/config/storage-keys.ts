/**
 * Constantes centralizadas para keys do localStorage
 * Garante consistência em todo o projeto
 */

export const STORAGE_KEYS = {
  // Autenticação - usa Zustand persist
  AUTH: 'auth-storage',

  // Carrinho - usa Zustand persist
  CART: 'cart-storage',

  // Wishlist - usa Zustand persist
  WISHLIST: 'wishlist-storage',

  // Theme/Preferências
  THEME: 'theme-preference',

  // Outros stores
  PRODUCT: 'product-storage',
  ORDER: 'order-storage',
  PLAN: 'plan-storage',
} as const;

/**
 * Helper para obter token JWT do authStore
 * Compatível com Zustand persist format
 */
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const authStorage = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!authStorage) return null;

    const parsed = JSON.parse(authStorage);
    return parsed?.state?.token || null;
  } catch (error) {
    console.error('Erro ao ler token de autenticação:', error);
    return null;
  }
};

/**
 * Helper para obter dados do usuário autenticado
 */
export const getAuthUser = (): any | null => {
  if (typeof window === 'undefined') return null;

  try {
    const authStorage = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!authStorage) return null;

    const parsed = JSON.parse(authStorage);
    return parsed?.state?.user || null;
  } catch (error) {
    console.error('Erro ao ler usuário autenticado:', error);
    return null;
  }
};

/**
 * Helper para verificar se usuário está autenticado
 */
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const authStorage = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!authStorage) return false;

    const parsed = JSON.parse(authStorage);
    return parsed?.state?.isAuthenticated === true && !!parsed?.state?.token;
  } catch (error) {
    return false;
  }
};

/**
 * Helper para limpar autenticação (logout)
 */
export const clearAuth = (): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH);

    // Limpar também stores relacionados se necessário
    // localStorage.removeItem(STORAGE_KEYS.CART);
    // localStorage.removeItem(STORAGE_KEYS.WISHLIST);
  } catch (error) {
    console.error('Erro ao limpar autenticação:', error);
  }
};
