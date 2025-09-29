/**
 * 📱 UTILITÁRIOS WHATSAPP - VENDEU ONLINE
 *
 * Funções para gerar links e mensagens do WhatsApp
 * para finalização de compras via WhatsApp
 */

export interface Product {
  id: string;
  name: string;
  price: number | string;
  slug?: string;
}

export interface Store {
  id: string;
  name: string;
  whatsapp?: string | null;
  phone?: string | null;
}

export interface CartItem extends Product {
  quantity: number;
}

/**
 * Limpa e formata número de telefone para WhatsApp
 * @param phone - Número de telefone bruto
 * @returns Número limpo para WhatsApp (apenas dígitos)
 */
export function cleanPhoneNumber(phone: string): string {
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, "");

  // Se não começar com 55 (código do Brasil), adiciona
  if (!cleaned.startsWith("55")) {
    return `55${cleaned}`;
  }

  return cleaned;
}

/**
 * Formata preço para exibição na mensagem
 * @param price - Preço do produto
 * @returns Preço formatado em R$
 */
export function formatPrice(price: number | string): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numPrice);
}

/**
 * Gera URL do produto baseado no slug ou ID
 * @param product - Produto
 * @returns URL completa do produto
 */
export function getProductUrl(product: Product): string {
  const baseUrl = window.location.origin;
  const productSlug = product.slug || product.id;
  return `${baseUrl}/produto/${productSlug}`;
}

/**
 * Formata mensagem para um único produto
 * @param product - Produto
 * @param storeName - Nome da loja
 * @param quantity - Quantidade desejada
 * @returns Mensagem formatada
 */
export function formatSingleProductMessage(product: Product, storeName: string, quantity: number = 1): string {
  const price = formatPrice(product.price);
  const productUrl = getProductUrl(product);
  const total = formatPrice((typeof product.price === "string" ? parseFloat(product.price) : product.price) * quantity);

  return `Olá! Vi este produto na *Vendeu Online*:

📦 *Produto:* ${product.name}
🏪 *Loja:* ${storeName}
💰 *Preço:* ${price}
📊 *Quantidade:* ${quantity}
${quantity > 1 ? `💯 *Total:* ${total}` : ""}

🔗 *Link:* ${productUrl}

Gostaria de mais informações e fechar a compra! 🛍️`;
}

/**
 * Formata mensagem para múltiplos produtos (carrinho)
 * @param items - Itens do carrinho
 * @param storeName - Nome da loja
 * @returns Mensagem formatada
 */
export function formatCartMessage(items: CartItem[], storeName: string): string {
  const itemList = items
    .map((item) => {
      const price = formatPrice(item.price);
      const itemTotal = formatPrice(
        (typeof item.price === "string" ? parseFloat(item.price) : item.price) * item.quantity
      );
      return `• ${item.name}\n  Qtd: ${item.quantity} | Preço: ${price} | Total: ${itemTotal}`;
    })
    .join("\n\n");

  const grandTotal = items.reduce((total, item) => {
    const itemPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
    return total + itemPrice * item.quantity;
  }, 0);

  return `Olá! Tenho interesse nesses produtos da *Vendeu Online*:

🏪 *Loja:* ${storeName}

🛍️ *Produtos:*
${itemList}

💰 *Total Geral:* ${formatPrice(grandTotal)}

Gostaria de mais informações e fechar a compra! 🛒`;
}

/**
 * Gera link completo do WhatsApp
 * @param phone - Número do WhatsApp da loja
 * @param message - Mensagem formatada
 * @returns URL completa do WhatsApp
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Gera link do WhatsApp para um produto específico
 * @param product - Produto
 * @param store - Loja
 * @param quantity - Quantidade desejada
 * @returns URL completa do WhatsApp
 */
export function generateProductWhatsAppLink(product: Product, store: Store, quantity: number = 1): string {
  // Usar whatsapp primeiro, depois phone como fallback
  const phone = store.whatsapp || store.phone;

  if (!phone) {
    throw new Error(`Loja ${store.name} não possui WhatsApp ou telefone cadastrado`);
  }

  const message = formatSingleProductMessage(product, store.name, quantity);
  return generateWhatsAppLink(phone, message);
}

/**
 * Gera link do WhatsApp para múltiplos produtos
 * @param items - Itens do carrinho
 * @param store - Loja
 * @returns URL completa do WhatsApp
 */
export function generateCartWhatsAppLink(items: CartItem[], store: Store): string {
  const phone = store.whatsapp || store.phone;

  if (!phone) {
    throw new Error(`Loja ${store.name} não possui WhatsApp ou telefone cadastrado`);
  }

  const message = formatCartMessage(items, store.name);
  return generateWhatsAppLink(phone, message);
}

/**
 * Abre WhatsApp em nova aba
 * @param whatsappUrl - URL do WhatsApp
 */
export function openWhatsApp(whatsappUrl: string): void {
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

/**
 * Valida se a loja tem WhatsApp configurado
 * @param store - Loja
 * @returns True se tem WhatsApp válido
 */
export function hasValidWhatsApp(store: Store): boolean {
  return !!(store.whatsapp || store.phone);
}

/**
 * Função principal para comprar via WhatsApp (um produto)
 * @param product - Produto
 * @param store - Loja
 * @param quantity - Quantidade
 */
export function buyViaWhatsApp(product: Product, store: Store, quantity: number = 1): void {
  try {
    const whatsappUrl = generateProductWhatsAppLink(product, store, quantity);
    openWhatsApp(whatsappUrl);
  } catch (error) {
    console.error("Erro ao abrir WhatsApp:", error);
    throw error;
  }
}

/**
 * Função principal para comprar múltiplos produtos via WhatsApp
 * @param items - Itens do carrinho
 * @param store - Loja
 */
export function buyCartViaWhatsApp(items: CartItem[], store: Store): void {
  try {
    const whatsappUrl = generateCartWhatsAppLink(items, store);
    openWhatsApp(whatsappUrl);
  } catch (error) {
    console.error("Erro ao abrir WhatsApp:", error);
    throw error;
  }
}
