/**
 * CONSTANTS AND CONFIGURATION VALUES
 * Centralized constants used across the application
 */

/**
 * Placeholder SVG para produtos sem imagem
 * Inline data URI (não viola CSP - Content Security Policy)
 *
 * Imagem: Ícone de produto genérico em cinza (#9B9B9B) com fundo cinza claro (#F3F4F6)
 * Dimensões: 500x500px
 */
export const PRODUCT_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUwMCIgaGVpZ2h0PSI1MDAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMjAwIDI1MEMyMzAuOTI4IDI1MCAyNTYgMjI0LjkyOCAyNTYgMTk0QzI1NiAxNjMuMDcyIDIzMC45MjggMTM4IDIwMCAxMzhDMTY5LjA3MiAxMzggMTQ0IDE2My4wNzIgMTQ0IDE5NEMxNDQgMjI0LjkyOCAxNjkuMDcyIDI1MCAyMDAgMjUwWiIgZmlsbD0iIzlCOUI5QiIvPjxwYXRoIGQ9Ik0xMDAgMzYyTDE2MCAzMDJMMjAwIDM0MkwyODAgMjYyTDM2MCAzNDJWMzYySDE0MFoiIGZpbGw9IiM5QjlCOUIiLz48L3N2Zz4=";

/**
 * Placeholder SVG para lojas sem logo
 * Similar ao placeholder de produto
 */
export const STORE_PLACEHOLDER = PRODUCT_PLACEHOLDER;

/**
 * Placeholder SVG para avatares de usuários
 * Ícone de pessoa genérico
 */
export const AVATAR_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSIxMDAiIGZpbGw9IiNGM0Y0RjYiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI3MCIgcj0iMzAiIGZpbGw9IiM5QjlCOUIiLz48cGF0aCBkPSJNNTAgMTUwQzUwIDEzMCA2OSAxMTAgMTAwIDExMEMxMzEgMTEwIDE1MCAxMzAgMTUwIDE1MCIgc3Ryb2tlPSIjOUI5QjlCIiBzdHJva2Utd2lkdGg9IjIwIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=";
