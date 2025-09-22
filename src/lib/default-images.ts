/**
 * Gerenciador centralizado de imagens padrão
 * Usa SVGs otimizados ao invés de placeholders externos
 */

export const DEFAULT_IMAGES = {
  product: "/assets/default-product.svg",
  store: "/assets/default-store.svg",
  avatar: "/assets/default-avatar.svg",
  banner: "/assets/default-banner.svg",
  category: "/assets/default-category.svg",
} as const;

/**
 * Retorna a imagem padrão apropriada ou a imagem fornecida
 */
export function getImageUrl(url: string | null | undefined, type: keyof typeof DEFAULT_IMAGES = "product"): string {
  // Se não há URL ou é uma URL placeholder conhecida
  if (
    !url ||
    url.includes("placeholder") ||
    url.includes("unsplash.com") ||
    url.includes("picsum.photos") ||
    url.includes("via.placeholder")
  ) {
    return DEFAULT_IMAGES[type];
  }

  // Se é uma URL relativa, garantir que começa com /
  if (!url.startsWith("http") && !url.startsWith("/")) {
    return `/${url}`;
  }

  return url;
}

/**
 * Verifica se uma imagem é válida e retorna fallback se necessário
 */
export async function validateImageUrl(
  url: string,
  fallbackType: keyof typeof DEFAULT_IMAGES = "product"
): Promise<string> {
  try {
    // Para URLs locais, assumir que são válidas
    if (url.startsWith("/")) {
      return url;
    }

    // Para URLs externas, tentar fazer um HEAD request
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      return url;
    }
  } catch {
    // Se falhar, retornar imagem padrão
  }

  return DEFAULT_IMAGES[fallbackType];
}

/**
 * Gera uma URL de avatar baseada no nome do usuário
 */
export function generateAvatarUrl(name: string): string {
  if (!name) return DEFAULT_IMAGES.avatar;

  // Usar serviço de avatar baseado em iniciais
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Por enquanto retornar o SVG padrão
  // Em produção, poderia gerar dinamicamente ou usar um serviço
  return DEFAULT_IMAGES.avatar;
}
