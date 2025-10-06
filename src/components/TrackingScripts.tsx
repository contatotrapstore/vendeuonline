import { logger } from "@/lib/logger";

"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { buildApiUrl } from "@/config/api";

interface TrackingConfig {
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  meta_pixel_id?: string;
}

declare global {
  interface Window {
    gtag: any;
    dataLayer: any[];
    fbq: any;
    chrome?: {
      runtime?: {
        id?: string;
      };
    };
  }
}

export default function TrackingScripts() {
  const [configs, setConfigs] = useState<TrackingConfig>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Adicionar listener global para silenciar erros de extensão
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object') {
        const message = reason.message || reason.toString() || '';
        // Lista expandida de mensagens de erro de extensão para silenciar
        const extensionErrors = [
          'Receiving end does not exist',
          'Could not establish connection',
          'Extension context invalidated',
          'chrome-extension://',
          'moz-extension://',
          'The message port closed before a response was received',
          'Failed to fetch'
        ];

        if (extensionErrors.some(errorText => message.includes(errorText))) {
          event.preventDefault(); // Silenciar o erro
          if (process.env.NODE_ENV === 'development') {
            logger.debug("Extension error silenciado:", message);
          }
          return;
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || '';
      const extensionErrors = [
        'Receiving end does not exist',
        'Could not establish connection',
        'Extension context invalidated',
        'chrome-extension://',
        'moz-extension://'
      ];

      if (extensionErrors.some(errorText => message.includes(errorText))) {
        event.preventDefault(); // Silenciar o erro
        if (process.env.NODE_ENV === 'development') {
          logger.debug("Extension error silenciado:", message);
        }
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    loadTrackingConfigs();

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const loadTrackingConfigs = async () => {
    try {
      // Buscar configurações de tracking sem autenticação (endpoint público)
      const response = await fetch(buildApiUrl("/api/tracking/configs"));
      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          const activeConfigs: TrackingConfig = {};

          // Filtrar apenas configurações ativas e com valor
          Object.keys(data.configs).forEach((key) => {
            const config = data.configs[key];
            if (config.isActive && config.value && config.value.trim() !== "") {
              activeConfigs[key as keyof TrackingConfig] = config.value;
            }
          });

          setConfigs(activeConfigs);
          setIsLoaded(true);

          // Inicializar pixels após carregar configurações
          initializePixels(activeConfigs);
        }
      }
    } catch (error) {
      logger.error("Erro ao carregar configurações de tracking:", error);
      setIsLoaded(true);
    }
  };

  const initializePixels = (configs: TrackingConfig) => {
    try {
      // Inicializar Google Analytics
      if (configs.google_analytics_id) {
        initGoogleAnalytics(configs.google_analytics_id);
      }

      // Inicializar Google Tag Manager
      if (configs.google_tag_manager_id) {
        initGoogleTagManager(configs.google_tag_manager_id);
      }

      // Inicializar Meta Pixel
      if (configs.meta_pixel_id) {
        initMetaPixel(configs.meta_pixel_id);
      }
    } catch (error) {
      // Silenciar erros de inicialização de pixels
      if (process.env.NODE_ENV === 'development') {
        logger.warn("Pixel initialization error (ignorado):", error);
      }
    }


    // Aguardar um momento para garantir que os pixels carregaram e disparar PageView inicial
    setTimeout(() => {
      try {
        if (process.env.NODE_ENV === 'development') {
          logger.info("📊 Disparando PageView inicial para todos os pixels");
        }

        // Google Analytics PageView já é disparado automaticamente na configuração

        // Meta Pixel PageView adicional (se necessário) - com proteção
        if (window.fbq && typeof window.fbq === 'function' && configs.meta_pixel_id) {
          try {
            window.fbq("track", "PageView");
          } catch (pixelError) {
            // Silenciar erros de pixel - pode ser bloqueado por adblockers
            if (process.env.NODE_ENV === 'development') {
              logger.warn("Meta Pixel error (ignorado):", pixelError);
            }
          }
        }
      } catch (error) {
        // Silenciar erros de tracking em geral
        if (process.env.NODE_ENV === 'development') {
          logger.warn("Tracking initialization error (ignorado):", error);
        }
      }
    }, 1000);
  };

  const initGoogleAnalytics = (gaId: string) => {
    try {
      // Carregar script do Google Analytics
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      // Configurar gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };

      window.gtag("js", new Date());
      window.gtag("config", gaId, {
        page_title: document.title,
        page_location: window.location.href,
        custom_map: {
          custom_parameter_1: "marketplace_event",
        },
      });

      logger.info("✅ Google Analytics inicializado:", gaId);
    } catch (error) {
      logger.error("❌ Erro ao inicializar Google Analytics:", error);
    }
  };

  const initGoogleTagManager = (gtmId: string) => {
    try {
      // Carregar GTM script
      const script = document.createElement("script");
      script.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `;
      document.head.appendChild(script);

      // Adicionar noscript para GTM
      const noscript = document.createElement("noscript");
      noscript.innerHTML = `
        <iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
                height="0" width="0" style="display:none;visibility:hidden"></iframe>
      `;
      document.body.appendChild(noscript);

      logger.info("✅ Google Tag Manager inicializado:", gtmId);
    } catch (error) {
      logger.error("❌ Erro ao inicializar Google Tag Manager:", error);
    }
  };

  const initMetaPixel = (pixelId: string) => {
    try {
      // Carregar Meta Pixel
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

      // Adicionar noscript para Meta Pixel
      const noscript = document.createElement("noscript");
      noscript.innerHTML = `
        <img height="1" width="1" style="display:none"
             src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />
      `;
      document.body.appendChild(noscript);

      logger.info("✅ Meta Pixel inicializado:", pixelId);
    } catch (error) {
      logger.error("❌ Erro ao inicializar Meta Pixel:", error);
    }
  };



  // Este componente não renderiza nada visível
  return null;
}

// Hook para facilitar uso do tracking em outros componentes
export const useTracking = () => {
  // Função auxiliar para verificar se é erro de extensão
  const isExtensionError = (error: any): boolean => {
    if (!error || typeof error !== 'object') return false;
    
    const errorMessage = error.message || error.toString() || '';
    const extensionErrors = [
      'Receiving end does not exist',
      'Could not establish connection',
      'Extension context invalidated',
      'The message port closed before a response was received',
      'chrome.runtime',
      'chrome-extension://'
    ];
    
    return extensionErrors.some(errMsg => errorMessage.includes(errMsg));
  };

  // Import das funções universais do analytics
  const trackUniversalEvent = (eventName: string, parameters: any = {}) => {
    try {
      // Verificar se não é uma extensão do Chrome tentando se comunicar
      try {
        if (typeof window.chrome !== 'undefined' && window.chrome?.runtime?.id) {
          return; // Ignorar completamente se for extensão ativa
        }
      } catch {
        // Ignorar erros de extensão silenciosamente
      }

      // Google Analytics
      if (window.gtag) {
        try {
          window.gtag("event", eventName, parameters);
        } catch (gtErr: any) {
          // Silenciar completamente erros de extensão
          if (!isExtensionError(gtErr)) {
            logger.warn("⚠️ Google Analytics erro:", gtErr);
          }
        }
      }

      // Meta Pixel - mapear eventos para formato Facebook
      if (window.fbq) {
        try {
          const metaEventName = mapToMetaEvent(eventName);
          const metaParams = mapToMetaParams(parameters);
          window.fbq("track", metaEventName, metaParams);
          logger.info("📊 Meta Pixel evento:", metaEventName, metaParams);
        } catch (fbErr: any) {
          // Silenciar completamente erros de extensão
          if (!isExtensionError(fbErr)) {
            logger.warn("⚠️ Meta Pixel erro:", fbErr);
          }
        }
      }


      logger.info("📊 Evento rastreado:", eventName, parameters);
    } catch (error: any) {
      // Silenciar completamente erros de extensão, logar apenas outros erros
      if (!isExtensionError(error)) {
        logger.error("❌ Erro ao rastrear evento:", error);
      }
    }
  };

  // Mapear eventos para formato Meta Pixel
  const mapToMetaEvent = (eventName: string): string => {
    const eventMap: { [key: string]: string } = {
      view_item: "ViewContent",
      viewcontent: "ViewContent",
      add_to_cart: "AddToCart",
      addtocart: "AddToCart",
      begin_checkout: "InitiateCheckout",
      purchase: "Purchase",
      sign_up: "CompleteRegistration",
      search: "Search",
      contact: "Contact",
      view_category: "ViewContent",
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

  const trackPageView = (pageName?: string) => {
    trackUniversalEvent("page_view", {
      page_title: pageName || document.title,
      page_location: window.location.href,
    });
  };

  const trackPurchase = (transactionId: string, value: number, items: any[] = []) => {
    trackUniversalEvent("purchase", {
      transaction_id: transactionId,
      value,
      currency: "BRL",
      content_ids: items.map((item) => item.id || item.content_ids),
      num_items: items.length,
    });
  };

  const trackAddToCart = (productId: string, productName: string, value: number) => {
    trackUniversalEvent("add_to_cart", {
      content_ids: [productId],
      content_name: productName,
      value,
      currency: "BRL",
    });
  };

  const trackViewContent = (productId: string, productName: string, value: number) => {
    trackUniversalEvent("view_item", {
      content_ids: [productId],
      content_name: productName,
      value,
      currency: "BRL",
      content_type: "product",
    });
  };

  const trackLead = (userType: string = "unknown") => {
    trackUniversalEvent("sign_up", {
      content_category: userType,
      method: "email",
    });
  };

  const trackSearch = (searchTerm: string, resultsCount: number = 0) => {
    trackUniversalEvent("search", {
      search_term: searchTerm,
      results_count: resultsCount,
    });
  };

  return {
    trackEvent: trackUniversalEvent,
    trackPageView,
    trackPurchase,
    trackAddToCart,
    trackViewContent,
    trackLead,
    trackSearch,
  };
};
