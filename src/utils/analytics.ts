import { logger } from "@/lib/logger";

// Declaração de tipos para gtag
declare global {
  interface Window {
    gtag: any;
    dataLayer: any[];
  }
}

// Configuração do Google Analytics 4
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

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
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === "G-XXXXXXXXXX") {
    logger.warn("Google Analytics não configurado ou executando no servidor");
    return;
  }

  // Carregar script do Google Analytics
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Configurar gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: any[]) {
    window.dataLayer.push(args);
  } as any;

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });
};

// Rastrear visualização de página
export const trackPageView = (page_title: string, page_location?: string) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("config", GA_MEASUREMENT_ID, {
    page_title,
    page_location: page_location || window.location.href,
  });
};

// Eventos de E-commerce

// Visualizar produto
export const trackViewItem = (product: ProductEvent) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "view_item", {
    currency: "BRL",
    value: product.price || 0,
    items: [product],
  });
};

// Adicionar ao carrinho
export const trackAddToCart = (product: ProductEvent) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "add_to_cart", {
    currency: "BRL",
    value: (product.price || 0) * (product.quantity || 1),
    items: [product],
  });
};

// Remover do carrinho
export const trackRemoveFromCart = (product: ProductEvent) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "remove_from_cart", {
    currency: "BRL",
    value: (product.price || 0) * (product.quantity || 1),
    items: [product],
  });
};

// Iniciar checkout
export const trackBeginCheckout = (items: ProductEvent[], value: number) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "begin_checkout", {
    currency: "BRL",
    value,
    items,
  });
};

// Compra realizada
export const trackPurchase = (purchase: PurchaseEvent) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "purchase", {
    transaction_id: purchase.transaction_id,
    value: purchase.value,
    currency: purchase.currency || "BRL",
    items: purchase.items,
  });
};

// Eventos de Busca
export const trackSearch = (searchEvent: SearchEvent) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "search", {
    search_term: searchEvent.search_term,
    event_category: "engagement",
    event_label: searchEvent.search_term,
    custom_parameters: {
      results_count: searchEvent.results_count,
    },
  });
};

// Eventos de Engajamento

// Clique em produto
export const trackSelectItem = (product: ProductEvent) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "select_item", {
    item_list_id: "product_list",
    item_list_name: "Produtos",
    items: [product],
  });
};

// Compartilhar produto
export const trackShare = (content_type: string, item_id: string, method?: string) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "share", {
    content_type,
    item_id,
    method: method || "unknown",
  });
};

// Login
export const trackLogin = (method: string = "email") => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "login", {
    method,
  });
};

// Cadastro
export const trackSignUp = (method: string = "email") => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", "sign_up", {
    method,
  });
};

// Eventos personalizados
export const trackCustomEvent = (action: string, category: string = "engagement", label?: string, value?: number) => {
  if (typeof window.gtag === "undefined") return;

  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value,
  });
};

// Eventos específicos do marketplace

// Visualizar loja
export const trackViewStore = (storeId: string, storeName: string) => {
  trackCustomEvent("view_store", "store_engagement", `${storeName} (${storeId})`);
};

// Contatar vendedor
export const trackContactSeller = (storeId: string, productId?: string) => {
  trackCustomEvent(
    "contact_seller",
    "seller_engagement",
    `Store: ${storeId}${productId ? ` - Product: ${productId}` : ""}`
  );
};

// Filtrar produtos
export const trackFilterProducts = (filterType: string, filterValue: string) => {
  trackCustomEvent("filter_products", "product_discovery", `${filterType}: ${filterValue}`);
};

// Visualizar categoria
export const trackViewCategory = (categoryName: string) => {
  trackCustomEvent("view_category", "navigation", categoryName);
};

// Erro de pagamento
export const trackPaymentError = (errorType: string, paymentMethod: string) => {
  trackCustomEvent("payment_error", "ecommerce_error", `${paymentMethod}: ${errorType}`);
};

// Sucesso de pagamento
export const trackPaymentSuccess = (paymentMethod: string, value: number) => {
  trackCustomEvent("payment_success", "ecommerce_success", paymentMethod, value);
};

// ============================================
// META/FACEBOOK PIXEL INTEGRATION
// ============================================

declare global {
  interface Window {
    fbq: any;
    ttq: any;
  }
}

// Inicializar Meta Pixel
export const initMetaPixel = (pixelId: string) => {
  if (typeof window === "undefined" || !pixelId) {
    logger.warn("Meta Pixel não configurado ou executando no servidor");
    return;
  }

  try {
    // Carregar script do Meta Pixel
    const script = document.createElement("script");
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    logger.info("✅ Meta Pixel inicializado:", pixelId);
  } catch (error) {
    logger.error("❌ Erro ao inicializar Meta Pixel:", error);
  }
};

// Eventos do Meta Pixel
export const trackMetaEvent = (event: string, parameters: any = {}) => {
  if (typeof window === "undefined" || !window.fbq) return;

  try {
    window.fbq("track", event, parameters);
    logger.info("📊 Meta Pixel evento:", event, parameters);
  } catch (error) {
    logger.error("❌ Erro no Meta Pixel:", error);
  }
};

// ============================================
// TIKTOK PIXEL INTEGRATION
// ============================================

// Inicializar TikTok Pixel
export const initTikTokPixel = (pixelId: string) => {
  if (typeof window === "undefined" || !pixelId) {
    logger.warn("TikTok Pixel não configurado ou executando no servidor");
    return;
  }

  try {
    const script = document.createElement("script");
    script.innerHTML = `
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${pixelId}');
        ttq.page();
      }(window, document, 'ttq');
    `;
    document.head.appendChild(script);

    logger.info("✅ TikTok Pixel inicializado:", pixelId);
  } catch (error) {
    logger.error("❌ Erro ao inicializar TikTok Pixel:", error);
  }
};

// Eventos do TikTok Pixel
export const trackTikTokEvent = (event: string, parameters: any = {}) => {
  if (typeof window === "undefined" || !window.ttq) return;

  try {
    window.ttq.track(event, parameters);
    logger.info("📊 TikTok Pixel evento:", event, parameters);
  } catch (error) {
    logger.error("❌ Erro no TikTok Pixel:", error);
  }
};

// ============================================
// TRACKING UNIFICADO PARA MÚLTIPLOS PIXELS
// ============================================

// Função universal para rastrear em todos os pixels ativos
export const trackUniversalEvent = (eventName: string, parameters: any = {}) => {
  // Google Analytics
  if (window.gtag) {
    window.gtag("event", eventName, parameters);
  }

  // Meta Pixel - mapear eventos para formato Facebook
  if (window.fbq) {
    const metaEventName = mapToMetaEvent(eventName);
    const metaParams = mapToMetaParams(parameters);
    trackMetaEvent(metaEventName, metaParams);
  }

  // TikTok Pixel
  if (window.ttq) {
    const tiktokEventName = mapToTikTokEvent(eventName);
    trackTikTokEvent(tiktokEventName, parameters);
  }
};

// Mapear eventos para formato Meta Pixel
const mapToMetaEvent = (eventName: string): string => {
  const eventMap: { [key: string]: string } = {
    view_item: "ViewContent",
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
    purchase: "Purchase",
    sign_up: "CompleteRegistration",
    search: "Search",
    contact: "Contact",
    view_category: "ViewContent",
  };

  return eventMap[eventName.toLowerCase()] || eventName;
};

// Mapear eventos para formato TikTok Pixel
const mapToTikTokEvent = (eventName: string): string => {
  const eventMap: { [key: string]: string } = {
    view_item: "ViewContent",
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
    purchase: "CompletePayment",
    sign_up: "CompleteRegistration",
    search: "Search",
    contact: "Contact",
  };

  return eventMap[eventName.toLowerCase()] || eventName;
};

// Mapear parâmetros para formato Meta Pixel
const mapToMetaParams = (params: any): any => {
  const metaParams: any = {};

  if (params.value) metaParams.value = params.value;
  if (params.currency) metaParams.currency = params.currency;
  if (params.content_ids) metaParams.content_ids = params.content_ids;
  if (params.content_name) metaParams.content_name = params.content_name;
  if (params.content_type) metaParams.content_type = params.content_type;
  if (params.search_term) metaParams.search_string = params.search_term;

  return metaParams;
};

// ============================================
// EVENTOS E-COMMERCE UNIVERSAIS
// ============================================

// Visualizar produto (universal)
export const trackUniversalViewItem = (product: ProductEvent) => {
  trackUniversalEvent("view_item", {
    content_ids: [product.item_id],
    content_name: product.item_name,
    content_type: "product",
    content_category: product.item_category,
    value: product.price || 0,
    currency: "BRL",
  });
};

// Adicionar ao carrinho (universal)
export const trackUniversalAddToCart = (product: ProductEvent) => {
  trackUniversalEvent("add_to_cart", {
    content_ids: [product.item_id],
    content_name: product.item_name,
    value: (product.price || 0) * (product.quantity || 1),
    currency: "BRL",
  });
};

// Iniciar checkout (universal)
export const trackUniversalBeginCheckout = (items: ProductEvent[], value: number) => {
  trackUniversalEvent("begin_checkout", {
    content_ids: items.map((item) => item.item_id),
    value,
    currency: "BRL",
    num_items: items.length,
  });
};

// Compra realizada (universal)
export const trackUniversalPurchase = (purchase: PurchaseEvent) => {
  trackUniversalEvent("purchase", {
    transaction_id: purchase.transaction_id,
    value: purchase.value,
    currency: purchase.currency || "BRL",
    content_ids: purchase.items.map((item) => item.item_id),
    num_items: purchase.items.length,
  });
};

// Cadastro de usuário (universal)
export const trackUniversalSignUp = (userType: string = "unknown") => {
  trackUniversalEvent("sign_up", {
    content_category: userType,
    method: "email",
  });
};

// Busca (universal)
export const trackUniversalSearch = (searchTerm: string, resultsCount: number = 0) => {
  trackUniversalEvent("search", {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

// Hook para facilitar o uso do analytics
export const useAnalytics = () => {
  return {
    // Funções originais
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

    // Novas funções universais
    trackUniversalEvent,
    trackUniversalViewItem,
    trackUniversalAddToCart,
    trackUniversalBeginCheckout,
    trackUniversalPurchase,
    trackUniversalSignUp,
    trackUniversalSearch,

    // Funções específicas de pixels
    trackMetaEvent,
    trackTikTokEvent,
    initMetaPixel,
    initTikTokPixel,
  };
};
