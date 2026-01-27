export const DEFAULT_FREE_PLAN = {
  id: "free",
  name: "Gratuito",
  slug: "gratuito",
  description: "Plano basico para iniciar as vendas",
  price: 0,
  billingPeriod: "MONTHLY",
  maxAds: 1,
  maxPhotos: 5,
  maxPhotosPerAd: 5,
  maxProducts: 5,
  maxImages: 5,
  maxCategories: 1,
  prioritySupport: false,
  support: "Basic support",
  features: ["1 anuncio por mes", "5 fotos por produto", "Suporte basico por email"],
  isActive: true,
  order: 1,
  popular: false,
};

export function normalizePlan(rawPlan) {
  if (!rawPlan || typeof rawPlan !== "object") {
    return null;
  }

  const pickNumber = (candidates, fallback = 0) => {
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      const value =
        typeof candidate === "string" ? Number(candidate.trim()) : Number(candidate);
      if (!Number.isNaN(value)) {
        return value;
      }
    }
    return fallback;
  };

  const pickBoolean = (candidates, fallback = false) => {
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      if (typeof candidate === "boolean") return candidate;
      if (typeof candidate === "number") return candidate !== 0;
      if (typeof candidate === "string") {
        const normalized = candidate.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(normalized)) return true;
        if (["false", "0", "no", "n"].includes(normalized)) return false;
      }
    }
    return fallback;
  };

  const pickString = (candidates, fallback = "") => {
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue;
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return fallback;
  };

  const parseFeatures = (features) => {
    if (!features) return [];
    if (Array.isArray(features)) {
      return features
        .map((item) => (typeof item === "string" ? item.trim() : String(item)))
        .filter(Boolean);
    }
    if (typeof features === "string") {
      try {
        const parsed = JSON.parse(features);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => (typeof item === "string" ? item.trim() : String(item)))
            .filter(Boolean);
        }
      } catch {
        return features
          .split(/[\n\r,;]+/)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }
    if (typeof features === "object") {
      return Object.values(features)
        .map((item) => (typeof item === "string" ? item.trim() : String(item)))
        .filter(Boolean);
    }
    return [];
  };

  const normalizedPrice = pickNumber(
    [rawPlan.price, rawPlan.monthlyPrice, rawPlan.cost, rawPlan.amount],
    0
  );
  const normalizedMaxAds = pickNumber(
    [rawPlan.maxAds, rawPlan.max_ads, rawPlan.maxListings, rawPlan.maxProducts],
    -1
  );
  const normalizedMaxPhotos = pickNumber(
    [
      rawPlan.maxPhotos,
      rawPlan.max_photos,
      rawPlan.maxPhotosPerAd,
      rawPlan.maxPhotosPerProduct,
      rawPlan.photosPerProduct,
    ],
    -1
  );
  const normalizedMaxProducts = pickNumber(
    [rawPlan.maxProducts, rawPlan.max_products, rawPlan.productsLimit, normalizedMaxAds],
    normalizedMaxAds
  );
  const normalizedMaxImages = pickNumber(
    [rawPlan.maxImages, rawPlan.max_images, rawPlan.maxPhotosPerAd, normalizedMaxPhotos],
    normalizedMaxPhotos
  );
  const normalizedMaxCategories = pickNumber(
    [rawPlan.maxCategories, rawPlan.max_categories, rawPlan.categoryLimit],
    -1
  );
  const normalizedPrioritySupport = pickBoolean(
    [
      rawPlan.prioritySupport,
      rawPlan.priority_support,
      rawPlan.supportLevel === "PRIORITY",
      rawPlan.support_level === "PRIORITY",
    ],
    false
  );
  const normalizedFeatures = parseFeatures(rawPlan.features);

  return {
    id: rawPlan.id || rawPlan.planId || rawPlan.slug,
    name: pickString([rawPlan.name, rawPlan.title], "Plano"),
    slug:
      pickString([rawPlan.slug, rawPlan.name, rawPlan.title], "plano")
        .toLowerCase()
        .replace(/\s+/g, "-") || "plano",
    description: pickString(
      [rawPlan.description, rawPlan.details, rawPlan.summary],
      ""
    ),
    price: normalizedPrice,
    billingPeriod: pickString(
      [
        rawPlan.billingPeriod,
        rawPlan.billing_period,
        rawPlan.billingcycle,
        rawPlan.interval,
      ],
      "MONTHLY"
    ),
    maxAds: normalizedMaxAds,
    maxPhotos: normalizedMaxPhotos,
    maxPhotosPerAd: pickNumber(
      [rawPlan.maxPhotosPerAd, rawPlan.maxPhotosPerProduct, rawPlan.maxPhotos],
      normalizedMaxPhotos
    ),
    maxProducts: normalizedMaxProducts,
    maxImages: normalizedMaxImages,
    maxCategories: normalizedMaxCategories,
    maxHighlightsPerDay: pickNumber(
      [rawPlan.maxHighlightsPerDay, rawPlan.max_highlights_per_day],
      0
    ),
    supportLevel: pickString(
      [rawPlan.supportLevel, rawPlan.support_level],
      normalizedPrioritySupport ? "PRIORITY" : "STANDARD"
    ),
    support: pickString(
      [rawPlan.support, rawPlan.supportLevel, rawPlan.support_level],
      normalizedPrioritySupport ? "Priority support" : "Basic support"
    ),
    prioritySupport: normalizedPrioritySupport,
    features: normalizedFeatures,
    isActive: pickBoolean([rawPlan.isActive, rawPlan.is_active], true),
    order: pickNumber([rawPlan.order, rawPlan.sortOrder, rawPlan.priority], 0),
    popular: pickBoolean([rawPlan.popular, rawPlan.isPopular], false),
    raw: rawPlan,
  };
}

const ensureNumber = (value, fallback) => {
  const num = typeof value === "string" ? Number(value.trim()) : value;
  return typeof num === "number" && Number.isFinite(num) ? num : fallback;
};

const ensureBoolean = (value, fallback) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
  }
  return fallback;
};

export function formatPlanResponse(rawPlan, fallback = DEFAULT_FREE_PLAN) {
  if (!rawPlan) {
    return { ...fallback };
  }

  const normalizedPlan = normalizePlan(rawPlan);

  if (!normalizedPlan) {
    return { ...fallback };
  }

  const { raw, ...rest } = normalizedPlan;
  const features = Array.isArray(rest.features) ? rest.features : fallback.features;

  return {
    ...fallback,
    ...rest,
    id: rest.id || fallback.id,
    slug: rest.slug || fallback.slug,
    name: rest.name || fallback.name,
    description: rest.description || fallback.description,
    price: ensureNumber(rest.price, fallback.price),
    billingPeriod: rest.billingPeriod || fallback.billingPeriod,
    maxAds: ensureNumber(rest.maxAds, fallback.maxAds),
    maxProducts: ensureNumber(rest.maxProducts, ensureNumber(rest.maxAds, fallback.maxProducts)),
    maxPhotos: ensureNumber(
      rest.maxPhotos,
      ensureNumber(rest.maxPhotosPerAd, fallback.maxPhotos)
    ),
    maxPhotosPerAd: ensureNumber(rest.maxPhotosPerAd, fallback.maxPhotosPerAd || fallback.maxPhotos),
    maxImages: ensureNumber(
      rest.maxImages,
      ensureNumber(rest.maxPhotosPerAd, fallback.maxImages || fallback.maxPhotos)
    ),
    maxCategories: ensureNumber(rest.maxCategories, fallback.maxCategories),
    maxHighlightsPerDay: ensureNumber(rest.maxHighlightsPerDay, fallback.maxHighlightsPerDay || 0),
    prioritySupport: ensureBoolean(rest.prioritySupport, fallback.prioritySupport),
    support: rest.support || fallback.support,
    features,
    isActive: ensureBoolean(rest.isActive, fallback.isActive),
    order: ensureNumber(rest.order, fallback.order),
    popular: ensureBoolean(rest.popular, fallback.popular),
  };
}

export function formatPlanListResponse(plans, fallback = DEFAULT_FREE_PLAN) {
  if (!Array.isArray(plans)) {
    return [];
  }

  return plans
    .map((plan) => formatPlanResponse(plan, fallback))
    .filter((plan) => !!plan);
}

/**
 * Maps plan slug to sellers.plan enum value
 * This is needed because database has legacy enum field that doesn't match Plan table slugs
 */
export function mapPlanSlugToEnum(planSlug) {
  if (!planSlug || typeof planSlug !== "string") {
    return "GRATUITO";
  }

  const slug = planSlug.toLowerCase().trim();

  const mapping = {
    "gratuito": "GRATUITO",
    "micro-empresa": "BASICO",
    "pequena-empresa": "PREMIUM",
    "empresa-simples": "ENTERPRISE",
    "empresa-plus": "ENTERPRISE",
  };

  return mapping[slug] || "GRATUITO";
}
