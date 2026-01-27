import { z } from "zod";
import { emailSchema, passwordSchema, nameSchema, priceSchema, uuidSchema, productIdSchema } from "../schemas/commonSchemas.js";
import { logger } from "../lib/logger.js";

/**
 * Middleware centralizado de validação usando Zod
 */

// Middleware genérico para validar dados
export const validateData = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const data =
        source === "body" ? req.body : source === "query" ? req.query : source === "params" ? req.params : req.body;

      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          received: err.received,
        }));

        logger.warn("Erro de validação:", { errors, source, data });

        return res.status(400).json({
          success: false,
          error: "Dados inválidos",
          details: errors,
        });
      }

      // Substituir dados originais pelos validados/transformados
      if (source === "body") req.body = result.data;
      else if (source === "query") req.query = result.data;
      else if (source === "params") req.params = result.data;

      next();
    } catch (error) {
      logger.error("Erro no middleware de validação:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno de validação",
      });
    }
  };
};

// Schemas específicos para endpoints comuns

export const loginValidation = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória"),
});

export const registerValidation = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().optional(),
    type: z.enum(["BUYER", "SELLER"], {
      errorMap: () => ({ message: "Tipo deve ser BUYER ou SELLER" }),
    }),
    phone: z.string().optional(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Você deve aceitar os termos",
    }),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Senhas não coincidem",
    path: ["confirmPassword"],
  });

export const productValidation = z.object({
  name: nameSchema,
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(2000),
  price: priceSchema,
  comparePrice: priceSchema.optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  stock: z.number().int().min(0, "Estoque deve ser maior ou igual a 0"),
  isActive: z.boolean().default(true),
  specifications: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
});

// Schema para validação de slug (usado em stores e produtos)
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens")
  .min(3, "Slug deve ter pelo menos 3 caracteres")
  .max(100, "Slug muito longo");

export const storeValidation = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  description: z.string().min(20, "Descrição da loja deve ter pelo menos 20 caracteres").max(1000),
  category: z.string().min(1, "Categoria da loja é obrigatória"),
  phone: z.string().optional(),
  whatsapp: z.string().regex(/^[0-9]{10,11}$/, "WhatsApp deve ter 10 ou 11 dígitos").optional().or(z.literal("")),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP deve estar no formato 99999-999 ou 99999999").optional().or(z.literal("")),
  address: z.string().min(5, "Endereço muito curto").max(500, "Endereço muito longo").optional().or(z.literal("")),
  website: z.string().url("Website deve ser uma URL válida").optional().or(z.literal("")),
});

export const orderValidation = z.object({
  items: z
    .array(
      z.object({
        productId: uuidSchema,
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1, "Pedido deve ter pelo menos 1 item"),
  // shippingAddress removido: Sistema WhatsApp-only (endereço negociado via WhatsApp)
  paymentMethod: z.enum(["CREDIT_CARD", "PIX"]),
});

export const queryPaginationValidation = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(1))
    .default("1"),
  limit: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(1).max(100))
    .default("10"),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
}).passthrough(); // Permitir campos adicionais (storeId, category, etc.)

// Validações rápidas para parâmetros comuns
export const validateUUIDParam = validateData(z.object({ id: uuidSchema }), "params");
export const validateProductIdParam = validateData(z.object({ id: productIdSchema }), "params");
export const validateStoreSlugParam = validateData(z.object({ slug: slugSchema }), "params");
export const validatePagination = validateData(queryPaginationValidation, "query");
export const validateLogin = validateData(loginValidation);
export const validateRegister = validateData(registerValidation);
export const validateProduct = validateData(productValidation);
export const validateStore = validateData(storeValidation);
export const validateOrder = validateData(orderValidation);

// Middleware para sanitizar e validar IDs em massa
export const validateBulkIds = validateData(
  z.object({
    ids: z.array(uuidSchema).min(1, "Pelo menos um ID é necessário").max(100, "Máximo 100 IDs por vez"),
  })
);

// Middleware para validar filtros de busca
export const validateSearchFilters = validateData(
  z
    .object({
      search: z.string().trim().min(2, "Busca deve ter pelo menos 2 caracteres").max(200).optional().or(z.literal("")),
      q: z.string().trim().min(2, "Busca deve ter pelo menos 2 caracteres").max(200).optional().or(z.literal("")),
      category: z.string().optional().default(undefined),
      minPrice: z
        .string()
        .transform((val) => parseFloat(val))
        .pipe(z.number().min(0))
        .optional(),
      maxPrice: z
        .string()
        .transform((val) => parseFloat(val))
        .pipe(z.number().min(0))
        .optional(),
      inStock: z
        .string()
        .transform((val) => val === "true")
        .pipe(z.boolean())
        .optional(),
      sellerId: uuidSchema.optional(),
      // storeId pode ser tanto UUID quanto formato custom (store_XXX_XXX)
      storeId: z.string().min(1).optional(),
    })
    .transform((data) => {
      if (!data.search && data.q) {
        return { ...data, search: data.q };
      }
      return data;
    })
    .refine(
      (data) => {
        if (data.minPrice && data.maxPrice) {
          return data.minPrice <= data.maxPrice;
        }
        return true;
      },
      {
        message: "Preço mínimo deve ser menor que preço máximo",
        path: ["minPrice"],
      }
    ),
  "query"
);
