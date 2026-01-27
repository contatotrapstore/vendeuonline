import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";
import { logger } from "@/lib/logger";


// Interceptador de erros de extensões do navegador
// Isso evita que erros de extensões (como React DevTools) poluam o console
if (typeof window !== 'undefined') {
  // Interceptar console.error
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const errorStr = args.join(' ');
    // Ignorar erros conhecidos de extensões
    if (errorStr.includes('Receiving end does not exist') || 
        errorStr.includes('Could not establish connection') ||
        errorStr.includes('chrome.runtime') ||
        errorStr.includes('chrome-extension://') ||
        errorStr.includes('Extension context invalidated') ||
        errorStr.includes('The message port closed before a response was received') ||
        errorStr.includes('requests.js') ||
        errorStr.includes('traffic.js') ||
        errorStr.includes('GET http://localhost') && errorStr.includes('401') && errorStr.includes('wishlist')) {
      return; // Silenciar erros de extensões e erros conhecidos de API
    }
    originalError.apply(console, args);
  };
  
  // Interceptar promessas rejeitadas relacionadas a extensões
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && typeof reason === 'object' && 'message' in reason) {
      const message = reason.message || '';
      if (message.includes('Receiving end does not exist') ||
          message.includes('Could not establish connection') ||
          message.includes('chrome.runtime') ||
          message.includes('chrome-extension://')) {
        event.preventDefault(); // Prevenir que o erro apareça no console
        return;
      }
    }
  });

  // Interceptar window.onerror para erros globais
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const errorStr = String(message);
    if (errorStr.includes('Receiving end does not exist') ||
        errorStr.includes('Could not establish connection') ||
        errorStr.includes('chrome.runtime') ||
        errorStr.includes('chrome-extension://')) {
      return true; // Prevenir propagação do erro
    }
    // Chamar o handler original se houver
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };
}

// MSW desabilitado - usando APIs reais do Supabase
logger.info("🚀 Conectando com APIs reais (Supabase)");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>
);
