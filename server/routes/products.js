import express from "express";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { protectRoute, validateInput, commonValidations } from "../middleware/security.js";

const router = express.Router();

// Configurar cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Schema de validação para query parameters
const querySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("1"),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default("12"),
  search: z.string().optional(),
  category: z.string().optional(),
  minPrice: z
    .string()
    .transform((val) => parseFloat(val))
    .optional(),
  maxPrice: z
    .string()
    .transform((val) => parseFloat(val))
    .optional(),
  sortBy: z.enum(["name", "price", "createdAt", "rating", "sales", "created_at", "price_asc"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  storeId: z.string().optional(),
  sellerId: z.string().optional(),
  featured: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

// Schema de validação para criação de produtos
const createProductSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(200, "Nome muito longo"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(2000, "Descrição muito longa"),
  price: z.number().min(0.01, "Preço deve ser maior que zero").max(999999.99, "Preço máximo excedido"),
  comparePrice: z.number().optional(),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
  categoryId: z.string().uuid("ID da categoria deve ser um UUID válido"),
  images: z
    .array(
      z.object({
        url: z.string().url("URL da imagem inválida"),
        alt: z.string().max(200, "Texto alternativo muito longo"),
        order: z.number().int().min(0, "Ordem deve ser positiva"),
      })
    )
    .optional(),
  specifications: z
    .array(
      z.object({
        name: z.string().min(1, "Nome da especificação obrigatório"),
        value: z.string().min(1, "Valor da especificação obrigatório"),
      })
    )
    .optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

// GET /api/products - Listar produtos
router.get("/", async (req, res) => {
  try {
    const query = querySchema.parse(req.query);

    // Dados mock temporários enquanto configuramos Supabase
    const mockProducts = [
      {
        id: "test-product-1",
        name: "Smartphone Galaxy S24",
        description: "Smartphone Samsung Galaxy S24 com tela de 6.2 polegadas",
        price: 2499.9,
        comparePrice: 2799.9,
        stock: 15,
        isActive: true,
        isFeatured: true,
        rating: 4.5,
        averageRating: 4.5,
        reviewCount: 127,
        viewCount: 1250,
        salesCount: 89,
        createdAt: new Date().toISOString(),
        images: [
          {
            id: "1",
            url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400",
            alt: "Samsung Galaxy S24",
            order: 0,
          },
        ],
        category: {
          id: "cat_1",
          name: "Smartphones",
          slug: "smartphones",
        },
        store: {
          id: "store_1",
          name: "TechStore",
          slug: "techstore",
          rating: 4.8,
          isVerified: true,
        },
      },
      {
        id: "test-product-2",
        name: "iPhone 15 Pro Max",
        description: "iPhone 15 Pro Max 256GB com câmera profissional",
        price: 6999.9,
        comparePrice: 7499.9,
        stock: 8,
        isActive: true,
        isFeatured: true,
        rating: 4.8,
        averageRating: 4.8,
        reviewCount: 95,
        viewCount: 2100,
        salesCount: 67,
        createdAt: new Date().toISOString(),
        images: [
          {
            id: "2",
            url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400",
            alt: "iPhone 15 Pro Max",
            order: 0,
          },
        ],
        category: {
          id: "cat_1",
          name: "Smartphones",
          slug: "smartphones",
        },
        store: {
          id: "store_2",
          name: "Apple Store",
          slug: "apple-store",
          rating: 4.9,
          isVerified: true,
        },
      },
      {
        id: "test-product-3",
        name: "Notebook Dell Inspiron",
        description: "Notebook Dell Inspiron 15 com Intel i5 e 8GB RAM",
        price: 2899.9,
        comparePrice: 3199.9,
        stock: 12,
        isActive: true,
        isFeatured: false,
        rating: 4.3,
        averageRating: 4.3,
        reviewCount: 76,
        viewCount: 890,
        salesCount: 45,
        createdAt: new Date().toISOString(),
        images: [
          {
            id: "3",
            url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
            alt: "Notebook Dell",
            order: 0,
          },
        ],
        category: {
          id: "cat_2",
          name: "Notebooks",
          slug: "notebooks",
        },
        store: {
          id: "store_3",
          name: "ComputerShop",
          slug: "computershop",
          rating: 4.6,
          isVerified: true,
        },
      },
    ];

    // Aplicar filtros simples
    let filteredProducts = [...mockProducts];

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm) || product.description.toLowerCase().includes(searchTerm)
      );
    }

    if (query.featured) {
      filteredProducts = filteredProducts.filter((product) => product.isFeatured);
    }

    // Paginação simples
    const startIndex = (query.page - 1) * query.limit;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + query.limit);

    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / query.limit);

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      products: paginatedProducts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNext: query.page < totalPages,
        hasPrev: query.page > 1,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
});

// GET /api/products/:id - Buscar produto por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from("Product")
      .select(
        `
        *,
        images:ProductImage(*),
        specifications:ProductSpecification(*),
        category:categories(*),
        store:stores(id, name, slug, rating, isVerified),
        seller:sellers(id, storeName, rating)
      `
      )
      .eq("id", id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        error: "Produto não encontrado",
      });
    }

    // Incrementar visualizações
    await supabase
      .from("Product")
      .update({ viewCount: product.viewCount + 1 })
      .eq("id", id);

    res.json(product);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// GET /api/products/:id/related - Produtos relacionados
router.get("/:id/related", async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    // Primeiro buscar o produto para pegar a categoria
    const { data: product, error: productError } = await supabase
      .from("Product")
      .select("categoryId")
      .eq("id", id)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: "Produto não encontrado",
      });
    }

    // Buscar produtos relacionados da mesma categoria
    const { data: relatedProducts, error } = await supabase
      .from("Product")
      .select(
        `
        *,
        images:ProductImage(url, alt, order),
        category:categories(*),
        store:stores(id, name, slug, rating, isVerified)
      `
      )
      .eq("categoryId", product.categoryId)
      .neq("id", id)
      .eq("isActive", true)
      .limit(limit);

    if (error) {
      throw error;
    }

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      products: relatedProducts || [],
    });
  } catch (error) {
    console.error("Erro ao buscar produtos relacionados:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// POST /api/products - Criar produto
router.post(
  "/",
  protectRoute(["SELLER", "ADMIN"]),
  validateInput([commonValidations.name, commonValidations.price]),
  async (req, res) => {
    try {
      console.log("🛍️ Criação de produto requisitada:", req.body);

      // Validar dados de entrada
      const productData = createProductSchema.parse(req.body);

      // Gerar ID único para o produto
      const productId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Criar produto no Supabase
      const { data: product, error } = await supabase
        .from("Product")
        .insert([
          {
            id: productId,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            comparePrice: productData.comparePrice || null,
            stock: productData.stock,
            categoryId: productData.categoryId,
            sellerId: req.user.userId,
            storeId: req.user.type === "SELLER" ? `store_${req.user.userId}` : "store_1",
            isActive: productData.isActive,
            isFeatured: req.user.type === "ADMIN" ? productData.isFeatured : false,
            viewCount: 0,
            salesCount: 0,
            averageRating: 0,
            reviewCount: 0,
            createdAt: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao criar produto no Supabase:", error);

        // Para demonstração, retornar produto mock em caso de erro
        const mockProduct = {
          id: productId,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          comparePrice: productData.comparePrice || null,
          stock: productData.stock,
          categoryId: productData.categoryId,
          sellerId: req.user.userId,
          storeId: req.user.type === "SELLER" ? `store_${req.user.userId}` : "store_1",
          isActive: productData.isActive,
          isFeatured: req.user.type === "ADMIN" ? productData.isFeatured : false,
          viewCount: 0,
          salesCount: 0,
          averageRating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString(),
          images: productData.images || [],
          specifications: productData.specifications || [],
          category: {
            id: productData.categoryId,
            name: "Categoria Teste",
            slug: "categoria-teste",
          },
          store: {
            id: req.user.type === "SELLER" ? `store_${req.user.userId}` : "store_1",
            name: `${req.user.name} Store`,
            slug: "store-slug",
            rating: 4.8,
            isVerified: true,
          },
        };

        console.log("✅ Produto criado (modo mock):", productId);
        return res.status(201).json({
          success: true,
          message: "Produto criado com sucesso (modo demonstração)",
          product: mockProduct,
        });
      }

      // Adicionar imagens se fornecidas
      if (productData.images && productData.images.length > 0) {
        const imagePromises = productData.images.map((image, index) =>
          supabase.from("ProductImage").insert([
            {
              id: `img_${productId}_${index}`,
              productId: productId,
              url: image.url,
              alt: image.alt,
              order: image.order,
            },
          ])
        );

        await Promise.all(imagePromises);
      }

      // Adicionar especificações se fornecidas
      if (productData.specifications && productData.specifications.length > 0) {
        const specPromises = productData.specifications.map((spec, index) =>
          supabase.from("ProductSpecification").insert([
            {
              id: `spec_${productId}_${index}`,
              productId: productId,
              name: spec.name,
              value: spec.value,
            },
          ])
        );

        await Promise.all(specPromises);
      }

      console.log("✅ Produto criado com sucesso:", productId);

      // Buscar produto completo com relacionamentos
      const { data: fullProduct, error: fetchError } = await supabase
        .from("Product")
        .select(
          `
        *,
        images:ProductImage(*),
        specifications:ProductSpecification(*),
        category:categories(*),
        store:stores(id, name, slug, rating, isVerified)
      `
        )
        .eq("id", productId)
        .single();

      res.status(201).json({
        success: true,
        message: "Produto criado com sucesso",
        product: fullProduct || product,
      });
    } catch (error) {
      console.error("❌ Erro ao criar produto:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Dados de entrada inválidos",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
            value: issue.input,
          })),
        });
      }

      res.status(500).json({
        success: false,
        error: "Erro interno do servidor",
        message: error.message,
      });
    }
  }
);

export default router;
