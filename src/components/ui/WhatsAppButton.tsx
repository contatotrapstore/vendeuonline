/**
 * 📱 COMPONENTE WHATSAPP BUTTON
 *
 * Botão reutilizável para compras via WhatsApp
 * Substitui o sistema de carrinho/checkout tradicional
 */

import { useState } from "react";
import { MessageCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buyViaWhatsApp,
  buyCartViaWhatsApp,
  hasValidWhatsApp,
  type Product,
  type Store,
  type CartItem,
} from "@/utils/whatsapp";

interface WhatsAppButtonProps {
  product?: Product;
  products?: CartItem[];
  store: Store;
  quantity?: number;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  showIcon?: boolean;
}

export function WhatsAppButton({
  product,
  products,
  store,
  quantity = 1,
  variant = "default",
  size = "default",
  className,
  children,
  disabled = false,
  showIcon = true,
}: WhatsAppButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Validações
  const hasProducts = product || (products && products.length > 0);
  const storeHasWhatsApp = hasValidWhatsApp(store);
  const isDisabled = disabled || !hasProducts || !storeHasWhatsApp || isLoading;

  const handleClick = async () => {
    if (isDisabled) return;

    setIsLoading(true);

    try {
      // Aguardar um pouco para feedback visual
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (product) {
        // Compra de produto único
        buyViaWhatsApp(product, store, quantity);
        toast.success(`Redirecionando para WhatsApp da ${store.name}!`, {
          description: "Uma nova aba será aberta com a mensagem pronta.",
          duration: 3000,
        });
      } else if (products) {
        // Compra de múltiplos produtos
        buyCartViaWhatsApp(products, store);
        toast.success(`Redirecionando para WhatsApp da ${store.name}!`, {
          description: `${products.length} produto(s) serão enviados na mensagem.`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Erro ao processar WhatsApp:", error);

      if (error instanceof Error) {
        toast.error("Erro ao abrir WhatsApp", {
          description: error.message,
          duration: 5000,
        });
      } else {
        toast.error("Ops! Algo deu errado", {
          description: "Tente novamente ou entre em contato conosco.",
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar botão desabilitado se não tem WhatsApp
  if (!storeHasWhatsApp) {
    return (
      <Button variant="outline" size={size} className={`${className} opacity-50 cursor-not-allowed`} disabled>
        <AlertTriangle className="w-4 h-4 mr-2" />
        WhatsApp Indisponível
      </Button>
    );
  }

  // Texto padrão do botão
  const defaultText = product ? "Comprar via WhatsApp" : "Finalizar via WhatsApp";
  const loadingText = isLoading ? "Abrindo WhatsApp..." : defaultText;

  return (
    <Button
      variant={variant}
      size={size}
      className={`${className} ${variant === "default" ? "bg-green-600 hover:bg-green-700" : ""}`}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-transparent border-t-current" />
          {loadingText}
        </>
      ) : (
        <>
          {showIcon && <MessageCircle className="w-4 h-4 mr-2" />}
          {children || loadingText}
          {!isLoading && <ExternalLink className="w-3 h-3 ml-2 opacity-70" />}
        </>
      )}
    </Button>
  );
}

// Variações do componente para casos específicos

/**
 * Botão compacto para cards de produto
 */
export function WhatsAppProductButton({
  product,
  store,
  quantity = 1,
  className,
}: {
  product: Product;
  store: Store;
  quantity?: number;
  className?: string;
}) {
  return (
    <WhatsAppButton product={product} store={store} quantity={quantity} size="sm" className={className}>
      Comprar
    </WhatsAppButton>
  );
}

/**
 * Botão grande para página do produto
 */
export function WhatsAppBuyButton({
  product,
  store,
  quantity = 1,
  className,
}: {
  product: Product;
  store: Store;
  quantity?: number;
  className?: string;
}) {
  return (
    <WhatsAppButton product={product} store={store} quantity={quantity} size="lg" className={`${className} w-full`}>
      🛒 Comprar Agora via WhatsApp
    </WhatsAppButton>
  );
}

/**
 * Botão para finalizar carrinho (múltiplos produtos)
 */
export function WhatsAppCartButton({
  products,
  store,
  className,
}: {
  products: CartItem[];
  store: Store;
  className?: string;
}) {
  const productCount = products.length;
  const itemText = productCount === 1 ? "item" : "itens";

  return (
    <WhatsAppButton products={products} store={store} size="lg" className={`${className} w-full`}>
      🛍️ Finalizar {productCount} {itemText} via WhatsApp
    </WhatsAppButton>
  );
}

/**
 * Botão minimalista (só ícone)
 */
export function WhatsAppIconButton({
  product,
  store,
  quantity = 1,
  className,
}: {
  product: Product;
  store: Store;
  quantity?: number;
  className?: string;
}) {
  return (
    <WhatsAppButton
      product={product}
      store={store}
      quantity={quantity}
      variant="outline"
      size="icon"
      className={`${className} text-green-600 border-green-600 hover:bg-green-50`}
      showIcon={false}
    >
      <MessageCircle className="w-4 h-4" />
    </WhatsAppButton>
  );
}
