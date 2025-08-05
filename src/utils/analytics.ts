// Declaração de tipos para gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}

// Configuração do Google Analytics 4
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// Tipos para eventos personalizados
interface BaseEvent {
  event_category?: string;
  event_label?: string;
  value?: number;
}

interface ProductEvent extends BaseEvent {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
}

interface PurchaseEvent extends BaseEvent {
  transaction_id: string;
  value: number;
  currency?: string;
  items: ProductEvent[];
}

interface SearchEvent extends BaseEvent {
  search_term: string;
  results_count?: number;
}

// Inicializar Google Analytics
export const initGA = () => {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
    console.warn('Google Analytics não configurado ou executando no servidor');
    return;
  }

  // Carregar script do Google Analytics
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Configurar gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Rastrear visualização de página
export const trackPageView = (page_title: string, page_location?: string) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_title,
    page_location: page_location || window.location.href,
  });
};

// Eventos de E-commerce

// Visualizar produto
export const trackViewItem = (product: ProductEvent) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'view_item', {
    currency: 'BRL',
    value: product.price || 0,
    items: [product],
  });
};

// Adicionar ao carrinho
export const trackAddToCart = (product: ProductEvent) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'add_to_cart', {
    currency: 'BRL',
    value: (product.price || 0) * (product.quantity || 1),
    items: [product],
  });
};

// Remover do carrinho
export const trackRemoveFromCart = (product: ProductEvent) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'remove_from_cart', {
    currency: 'BRL',
    value: (product.price || 0) * (product.quantity || 1),
    items: [product],
  });
};

// Iniciar checkout
export const trackBeginCheckout = (items: ProductEvent[], value: number) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'begin_checkout', {
    currency: 'BRL',
    value,
    items,
  });
};

// Compra realizada
export const trackPurchase = (purchase: PurchaseEvent) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'purchase', {
    transaction_id: purchase.transaction_id,
    value: purchase.value,
    currency: purchase.currency || 'BRL',
    items: purchase.items,
  });
};

// Eventos de Busca
export const trackSearch = (searchEvent: SearchEvent) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'search', {
    search_term: searchEvent.search_term,
    event_category: 'engagement',
    event_label: searchEvent.search_term,
    custom_parameters: {
      results_count: searchEvent.results_count,
    },
  });
};

// Eventos de Engajamento

// Clique em produto
export const trackSelectItem = (product: ProductEvent) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'select_item', {
    item_list_id: 'product_list',
    item_list_name: 'Produtos',
    items: [product],
  });
};

// Compartilhar produto
export const trackShare = (content_type: string, item_id: string, method?: string) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'share', {
    content_type,
    item_id,
    method: method || 'unknown',
  });
};

// Login
export const trackLogin = (method: string = 'email') => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'login', {
    method,
  });
};

// Cadastro
export const trackSignUp = (method: string = 'email') => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', 'sign_up', {
    method,
  });
};

// Eventos personalizados
export const trackCustomEvent = (
  action: string,
  category: string = 'engagement',
  label?: string,
  value?: number
) => {
  if (typeof window.gtag === 'undefined') return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
  });
};

// Eventos específicos do marketplace

// Visualizar loja
export const trackViewStore = (storeId: string, storeName: string) => {
  trackCustomEvent('view_store', 'store_engagement', `${storeName} (${storeId})`);
};

// Contatar vendedor
export const trackContactSeller = (storeId: string, productId?: string) => {
  trackCustomEvent('contact_seller', 'seller_engagement', `Store: ${storeId}${productId ? ` - Product: ${productId}` : ''}`);
};

// Filtrar produtos
export const trackFilterProducts = (filterType: string, filterValue: string) => {
  trackCustomEvent('filter_products', 'product_discovery', `${filterType}: ${filterValue}`);
};

// Visualizar categoria
export const trackViewCategory = (categoryName: string) => {
  trackCustomEvent('view_category', 'navigation', categoryName);
};

// Erro de pagamento
export const trackPaymentError = (errorType: string, paymentMethod: string) => {
  trackCustomEvent('payment_error', 'ecommerce_error', `${paymentMethod}: ${errorType}`);
};

// Sucesso de pagamento
export const trackPaymentSuccess = (paymentMethod: string, value: number) => {
  trackCustomEvent('payment_success', 'ecommerce_success', paymentMethod, value);
};

// Hook para facilitar o uso do analytics
export const useAnalytics = () => {
  return {
    trackPageView,
    trackViewItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackBeginCheckout,
    trackPurchase,
    trackSearch,
    trackSelectItem,
    trackShare,
    trackLogin,
    trackSignUp,
    trackCustomEvent,
    trackViewStore,
    trackContactSeller,
    trackFilterProducts,
    trackViewCategory,
    trackPaymentError,
    trackPaymentSuccess,
  };
};