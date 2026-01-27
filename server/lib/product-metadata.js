import { logger } from "./logger.js";

const DEFAULT_DIMENSIONS = {
  length: 0,
  width: 0,
  height: 0,
  unit: "cm",
};

const DEFAULT_METADATA = {
  brand: "",
  model: "",
  condition: "",
  shippingOptions: [],
  deliveryOptions: [], // Opções de entrega customizadas (novo)
  dimensions: { ...DEFAULT_DIMENSIONS },
};

const normalizeDimensions = (source = {}) => ({
  length: Number(source.length) || 0,
  width: Number(source.width) || 0,
  height: Number(source.height) || 0,
  unit: source.unit === "m" ? "m" : "cm",
});

export const parseProductMetadata = (raw) => {
  if (!raw) {
    return { ...DEFAULT_METADATA, dimensions: { ...DEFAULT_DIMENSIONS } };
  }

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_METADATA, dimensions: { ...DEFAULT_DIMENSIONS } };
    }

    const hasExtendedFields = ["brand", "model", "condition", "shippingOptions", "deliveryOptions", "dimensions"].some(
      (field) => parsed[field] !== undefined
    );

    if (hasExtendedFields) {
      return {
        brand: parsed.brand || "",
        model: parsed.model || "",
        condition: parsed.condition || "",
        shippingOptions: Array.isArray(parsed.shippingOptions) ? parsed.shippingOptions : [],
        deliveryOptions: Array.isArray(parsed.deliveryOptions) ? parsed.deliveryOptions : [],
        dimensions: normalizeDimensions(parsed.dimensions || {}),
      };
    }

    // Legacy format (only dimensions stored)
    return {
      ...DEFAULT_METADATA,
      dimensions: normalizeDimensions(parsed),
    };
  } catch (error) {
    if (logger) {
      logger.warn("⚠️ Erro ao parsear metadata do produto:", error);
    }
    return { ...DEFAULT_METADATA, dimensions: { ...DEFAULT_DIMENSIONS } };
  }
};

export const serializeProductMetadata = (payload = {}, previousRawMetadata = null) => {
  const base = previousRawMetadata ? parseProductMetadata(previousRawMetadata) : { ...DEFAULT_METADATA, dimensions: { ...DEFAULT_DIMENSIONS } };

  return {
    brand: payload.brand !== undefined ? payload.brand : base.brand,
    model: payload.model !== undefined ? payload.model : base.model,
    condition: payload.condition !== undefined ? payload.condition : base.condition,
    shippingOptions: Array.isArray(payload.shippingOptions) ? payload.shippingOptions : base.shippingOptions,
    deliveryOptions: Array.isArray(payload.deliveryOptions) ? payload.deliveryOptions : base.deliveryOptions,
    dimensions: payload.dimensions ? normalizeDimensions(payload.dimensions) : base.dimensions,
  };
};
