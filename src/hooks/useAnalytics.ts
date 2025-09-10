import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView, initGA } from "../utils/analytics";

// Hook para rastrear mudanças de página automaticamente
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Inicializar GA na primeira execução
    initGA();
  }, []);

  useEffect(() => {
    // Rastrear mudança de página
    const pageTitle = document.title;
    const pagePath = location.pathname + location.search;

    trackPageView(pageTitle, window.location.origin + pagePath);
  }, [location]);
};

// Hook para rastrear eventos de e-commerce
export const useEcommerceTracking = () => {
  const {
    trackViewItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackBeginCheckout,
    trackPurchase,
    trackSelectItem,
  } = require("../utils/analytics");

  return {
    trackViewItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackBeginCheckout,
    trackPurchase,
    trackSelectItem,
  };
};

// Hook para rastrear eventos de engajamento
export const useEngagementTracking = () => {
  const { trackSearch, trackShare, trackLogin, trackSignUp, trackCustomEvent } = require("../utils/analytics");

  return {
    trackSearch,
    trackShare,
    trackLogin,
    trackSignUp,
    trackCustomEvent,
  };
};

// Hook para rastrear eventos específicos do marketplace
export const useMarketplaceTracking = () => {
  const {
    trackViewStore,
    trackContactSeller,
    trackFilterProducts,
    trackViewCategory,
    trackPaymentError,
    trackPaymentSuccess,
  } = require("../utils/analytics");

  return {
    trackViewStore,
    trackContactSeller,
    trackFilterProducts,
    trackViewCategory,
    trackPaymentError,
    trackPaymentSuccess,
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
