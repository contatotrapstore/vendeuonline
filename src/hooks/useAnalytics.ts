import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import * as analytics from "../utils/analytics";

// Hook para rastrear mudanças de página automaticamente
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Inicializar GA na primeira execução
    analytics.initGA();
  }, []);

  useEffect(() => {
    // Rastrear mudança de página
    const pageTitle = document.title;
    const pagePath = location.pathname + location.search;

    analytics.trackPageView(pageTitle, window.location.origin + pagePath);
  }, [location]);
};

// Hook para rastrear eventos de e-commerce
export const useEcommerceTracking = () => {
  return {
    trackViewItem: analytics.trackViewItem,
    trackAddToCart: analytics.trackAddToCart,
    trackRemoveFromCart: analytics.trackRemoveFromCart,
    trackBeginCheckout: analytics.trackBeginCheckout,
    trackPurchase: analytics.trackPurchase,
    trackSelectItem: analytics.trackSelectItem,
  };
};

// Hook para rastrear eventos de engajamento
export const useEngagementTracking = () => {
  return {
    trackSearch: analytics.trackSearch,
    trackShare: analytics.trackShare,
    trackLogin: analytics.trackLogin,
    trackSignUp: analytics.trackSignUp,
    trackCustomEvent: analytics.trackCustomEvent,
  };
};

// Hook para rastrear eventos específicos do marketplace
export const useMarketplaceTracking = () => {
  return {
    trackViewStore: analytics.trackViewStore,
    trackContactSeller: analytics.trackContactSeller,
    trackFilterProducts: analytics.trackFilterProducts,
    trackViewCategory: analytics.trackViewCategory,
    trackPaymentError: analytics.trackPaymentError,
    trackPaymentSuccess: analytics.trackPaymentSuccess,
  };
};

// Hook combinado para facilitar o uso
export const useAnalytics = () => {
  const ecommerce = useEcommerceTracking();
  const engagement = useEngagementTracking();
  const marketplace = useMarketplaceTracking();

  return {
    ...ecommerce,
    ...engagement,
    ...marketplace,
  };
};
