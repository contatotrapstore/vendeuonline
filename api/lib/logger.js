/**
 * 📊 LOGGER CONDICIONAL PARA PRODUÇÃO
 *
 * Sistema de logs que só exibe mensagens em desenvolvimento,
 * garantindo performance e segurança em produção.
 */

const isDevelopment = process.env.NODE_ENV !== "production";

/**
 * Logger condicional que só exibe logs em desenvolvimento
 */
export const logger = {
  /**
   * Log informativo (azul)
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log("ℹ️", ...args);
    }
  },

  /**
   * Log de sucesso (verde)
   */
  success: (...args) => {
    if (isDevelopment) {
      console.log("✅", ...args);
    }
  },

  /**
   * Log de aviso (amarelo)
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn("⚠️", ...args);
    }
  },

  /**
   * Log de erro (vermelho) - sempre exibe em produção para debugging
   */
  error: (...args) => {
    console.error("❌", ...args);
  },

  /**
   * Log de debug (cinza) - só em desenvolvimento
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log("🔍", ...args);
    }
  },

  /**
   * Log de performance (roxo) - só em desenvolvimento
   */
  perf: (...args) => {
    if (isDevelopment) {
      console.log("⚡", ...args);
    }
  },

  /**
   * Log de request/response (verde água) - só em desenvolvimento
   */
  request: (...args) => {
    if (isDevelopment) {
      console.log("🌐", ...args);
    }
  },

  /**
   * Log de database (azul escuro) - só em desenvolvimento
   */
  db: (...args) => {
    if (isDevelopment) {
      console.log("🗃️", ...args);
    }
  },
};

/**
 * Helper para formatar dados sensíveis
 */
export const formatSensitive = (data) => {
  if (!isDevelopment) {
    return "[HIDDEN]";
  }
  return data;
};

/**
 * Helper para logs condicionais inline
 */
export const devLog = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

export default logger;
