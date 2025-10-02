import { z } from "zod";

/**
 * Schemas de validação Zod para dados comuns do sistema
 */

// Tipos básicos
export const uuidSchema = z.string().uuid("ID deve ser um UUID válido");

export const emailSchema = z
  .string()
  .min(1, "Email é obrigatório")
  .email("Email inválido")
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Formato de email inválido")
  .transform((email) => email.toLowerCase());

export const phoneSchema = z
  .string()
  .regex(
    /^(\(\d{2}\)\s?\d{4,5}-?\d{4}|\d{10,11}|\d{3}-\d{4})$/,
    "Telefone deve estar no formato (xx) xxxxx-xxxx ou apenas números (10-11 dígitos)"
  )
  .transform((phone) => {
    // Normalizar para formato padrão se for apenas números
    const numbers = phone.replace(/\D/g, "");
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return phone;
  });

export const passwordSchema = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .max(100, "Senha deve ter no máximo 100 caracteres")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número")
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Senha deve conter pelo menos um caractere especial (!@#$%^&*)");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Nome deve ter pelo menos 2 caracteres")
  .max(100, "Nome deve ter no máximo 100 caracteres")
  .regex(/^[a-zA-ZÀ-ÿ\s\d]+$/, "Nome deve conter apenas letras, números e espaços");

export const priceSchema = z
  .number()
  .positive("Preço deve ser positivo")
  .max(999999.99, "Preço deve ser menor que R$ 1.000.000");

// Estados brasileiros
export const stateSchema = z
  .string()
  .length(2, "Estado deve ter 2 caracteres")
  .regex(/^[A-Z]{2}$/, "Estado deve ser uma sigla válida (ex: SP, RJ, TS)");

export const zipCodeSchema = z.string().regex(/^\d{5}-?\d{3}$/, "CEP deve estar no formato xxxxx-xxx");

// Paginação
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Query de busca
export const searchSchema = z
  .object({
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .merge(paginationSchema);

/**
 * Schemas para User
 */
export const userTypeSchema = z.enum(["BUYER", "SELLER", "ADMIN"]);

export const createUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema.optional(),
    city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres").max(100),
    state: stateSchema,
    userType: z
      .enum(["buyer", "seller", "BUYER", "SELLER"])
      .transform((val) => val.toUpperCase())
      .default("BUYER"),
    type: z
      .enum(["buyer", "seller", "BUYER", "SELLER"])
      .transform((val) => val.toUpperCase())
      .optional(),
  })
  .passthrough(); // Permitir campos extras para compatibilidade

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres").max(100).optional(),
  state: stateSchema.optional(),
  avatar: z.string().url("URL do avatar inválida").optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
  userType: z.enum(["buyer", "seller", "admin", "BUYER", "SELLER", "ADMIN"]).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: passwordSchema,
    confirmPassword: z.string().optional(),
  })
  .refine((data) => !data.confirmPassword || data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

/**
 * Schemas para Address
 */
export const createAddressSchema = z.object({
  label: z.string().min(1, "Label deve ter pelo menos 1 caractere").max(50).optional(),
  street: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres").max(200),
  number: z.string().min(1, "Número é obrigatório").max(10),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().min(2, "Bairro deve ter pelo menos 2 caracteres").max(100),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres").max(100),
  state: stateSchema,
  zipCode: zipCodeSchema,
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

/**
 * Schemas para Product
 */
export const productStatusSchema = z.enum(["DRAFT", "ACTIVE", "INACTIVE", "SUSPENDED"]);
export const approvalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const createProductSchema = z.object({
  name: z.string().min(2, "Nome do produto deve ter pelo menos 2 caracteres").max(200),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(5000),
  price: priceSchema,
  originalPrice: priceSchema.optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  weight: z.number().positive().optional(),
  dimensions: z
    .object({
      length: z.number().positive().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
    })
    .optional(),
  tags: z.array(z.string()).max(10, "Máximo 10 tags").default([]),
  images: z.array(z.string().url()).min(1, "Pelo menos uma imagem é obrigatória").max(15),
  specifications: z.record(z.string()).optional(),
  stock: z.number().int().min(0, "Estoque não pode ser negativo").default(0),
  sku: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z
  .object({
    category: z.string().optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    brand: z.string().optional(),
    inStock: z.coerce.boolean().optional(),
    status: productStatusSchema.optional(),
  })
  .merge(searchSchema);

/**
 * Schemas para Store
 */
export const createStoreSchema = z.object({
  name: z.string().min(2, "Nome da loja deve ter pelo menos 2 caracteres").max(100),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífen"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(1000),
  logo: z.string().url("URL do logo inválida").optional(),
  banner: z.string().url("URL do banner inválida").optional(),
  theme: z
    .object({
      primaryColor: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, "Cor primária inválida")
        .optional(),
      secondaryColor: z
        .string()
        .regex(/^#[0-9A-F]{6}$/i, "Cor secundária inválida")
        .optional(),
    })
    .optional(),
  socialMedia: z
    .object({
      instagram: z.string().url().optional(),
      facebook: z.string().url().optional(),
      twitter: z.string().url().optional(),
      whatsapp: phoneSchema.optional(),
    })
    .optional(),
  businessHours: z
    .object({
      monday: z.string().optional(),
      tuesday: z.string().optional(),
      wednesday: z.string().optional(),
      thursday: z.string().optional(),
      friday: z.string().optional(),
      saturday: z.string().optional(),
      sunday: z.string().optional(),
    })
    .optional(),
});

export const updateStoreSchema = createStoreSchema.partial();

/**
 * Schemas para Order
 */
export const orderStatusSchema = z.enum(["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]);

export const orderItemSchema = z.object({
  productId: uuidSchema,
  quantity: z.number().int().positive("Quantidade deve ser positiva"),
  price: priceSchema,
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Pelo menos um item é obrigatório"),
  shippingAddress: createAddressSchema,
  paymentMethod: z.enum(["PIX", "BOLETO", "CREDIT_CARD", "DEBIT_CARD"]),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  trackingCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Schemas para Plan
 */
export const billingPeriodSchema = z.enum(["monthly", "yearly"]);

export const createPlanSchema = z.object({
  name: z.string().min(2, "Nome do plano deve ter pelo menos 2 caracteres").max(100),
  slug: z
    .string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(500),
  price: z.number().min(0, "Preço não pode ser negativo"),
  billingPeriod: billingPeriodSchema,
  maxAds: z.number().int().min(-1, "Máximo de anúncios inválido"),
  maxPhotos: z.number().int().min(-1, "Máximo de fotos inválido"),
  maxProducts: z.number().int().min(-1, "Máximo de produtos inválido"),
  maxImages: z.number().int().min(-1, "Máximo de imagens inválido"),
  maxCategories: z.number().int().min(-1, "Máximo de categorias inválido"),
  prioritySupport: z.boolean().default(false),
  support: z.string().default("Email"),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const updatePlanSchema = createPlanSchema.partial();

/**
 * Schemas para Admin
 */
export const adminUserQuerySchema = z
  .object({
    userType: z.enum(["all", "buyer", "seller", "admin"]).default("all"),
    status: z.enum(["all", "active", "inactive"]).default("all"),
  })
  .merge(searchSchema);

export const updateUserStatusSchema = z.object({
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export const bannerPositionSchema = z.enum(["HOME_HERO", "HOME_SECTION", "CATEGORY", "PRODUCT"]);

export const createBannerSchema = z.object({
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url("URL da imagem inválida"),
  targetUrl: z.string().url("URL de destino inválida").optional(),
  position: bannerPositionSchema,
  isActive: z.boolean().default(true),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const updateBannerSchema = createBannerSchema.partial();
