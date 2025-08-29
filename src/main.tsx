import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from 'sonner';
import App from "./App";
import "./index.css";

// MSW desabilitado - usando APIs reais do Supabase
console.log('🚀 Conectando com APIs reais (Supabase)');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster />
  </StrictMode>
);
