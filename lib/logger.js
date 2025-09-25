/**
 * 📊 LOGGER BRIDGE - Bridge para server/lib/logger.js
 *
 * Este arquivo serve como ponte para manter compatibilidade
 * entre a estrutura lib/ e server/lib/ no Vercel
 */

export { logger, formatSensitive, devLog } from "../server/lib/logger.js";
export { default } from "../server/lib/logger.js";
