/**
 * UTILITY FUNCTIONS FOR SERVER
 * Helper functions used across server routes
 */

/**
 * Gera slug SEO-friendly a partir de texto
 * Remove acentos, caracteres especiais e converte espaços em hífens
 *
 * @param {string} text - Texto para slugificar
 * @returns {string} Slug limpo e URL-safe
 *
 * @example
 * slugify("Loja de Eduardo Teste") // "loja-de-eduardo-teste"
 * slugify("Ação & Reação!") // "acao-reacao"
 * slugify("  Espaços   Múltiplos  ") // "espacos-multiplos"
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString() // Garantir que é string
    .toLowerCase() // Converter para minúsculas
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiais (manter letras, números, espaços e hífens)
    .trim() // Remover espaços no início e fim
    .replace(/\s+/g, '-') // Substituir espaços por hífens
    .replace(/-+/g, '-') // Substituir múltiplos hífens por um único
    .replace(/^-+|-+$/g, ''); // Remover hífens no início e fim
}

/**
 * Gera slug único adicionando timestamp curto ao final
 * Usado para garantir unicidade de slugs (ex: lojas com mesmo nome)
 *
 * @param {string} text - Texto para slugificar
 * @returns {string} Slug com timestamp único
 *
 * @example
 * uniqueSlugify("Loja Teste") // "loja-teste-lx5m3n"
 */
export function uniqueSlugify(text) {
  const baseSlug = slugify(text);
  const timestamp = Date.now().toString(36).slice(-6); // Últimos 6 caracteres do timestamp em base36
  return `${baseSlug}-${timestamp}`;
}
