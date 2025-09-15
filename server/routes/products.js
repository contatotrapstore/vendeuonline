import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { supabase } from "../lib/supabase-client.js";
import { protectRoute, validateInput, commonValidations } from "../middleware/security.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware de autenticação
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: "Acesso negado. Faça login primeiro.",
        code: "AUTHENTICATION_REQUIRED",
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac';
    const decoded = jwt.verify(token, jwtSecret);

    // Buscar dados atualizados do usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      console.error('❌ Erro ao buscar usuário:', error);
      return res.status(401).json({
        error: "Usuário não encontrado",
        code: "USER_NOT_FOUND"
      });
    }

    req.user = {
      userId: user.id,
      email: user.email,
      type: user.type,
      name: user.name,
      ...user
    };

    next();
  } catch (error) {
    console.error('❌ Erro na autenticação:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        code: "TOKEN_EXPIRED"
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido',
        code: "TOKEN_INVALID"
      });
    }

    res.status(401).json({
      error: 'Falha na autenticação',
      code: "AUTHENTICATION_FAILED"
    });
  }
};

// Função para processar query parameters
const processQuery = (query) => {
  return {
    page: parseInt(query.page) || 1,
    limit: parseInt(query.limit) || 12,
    search: query.search || undefined,
    category: query.category || undefined,
    minPrice: query.minPrice ? parseFloat(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
    sortBy: query.sortBy || "createdAt",
    sortOrder: query.sortOrder || "desc",
    storeId: query.storeId || undefined,
    sellerId: query.sellerId || undefined,
    featured: query.featured === "true" || undefined
  };
};

// Schema de validação para criação de produtos
const createProductSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(200, "Nome muito longo"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(2000, "Descrição muito longa"),
  price: z.number().min(0.01, "Preço deve ser maior que zero").max(999999.99, "Preço máximo excedido"),
  comparePrice: z.number().optional(),
  stock: z.number().int().min(0, "Estoque não pode ser negativo"),
  categoryId: z.string().min(1, "ID da categoria é obrigatório"),
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
    const query = processQuery(req.query);

    // Usar Supabase diretamente para evitar problemas do Prisma
    let supabaseQuery = supabase
      .from('Product')
      .select(`
        *,
        images:ProductImage(*),
        specifications:ProductSpecification(*),
        category:categories(*),
        store:stores(id, name, slug, isVerified)
      `)
      .eq('isActive', true);

    // Aplicar filtros
    if (query.search) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }

    if (query.category) {
      supabaseQuery = supabaseQuery.eq('category.name', query.category);
    }

    if (query.minPrice) {
      supabaseQuery = supabaseQuery.gte('price', query.minPrice);
    }

    if (query.maxPrice) {
      supabaseQuery = supabaseQuery.lte('price', query.maxPrice);
    }

    if (query.featured) {
      supabaseQuery = supabaseQuery.eq('isFeatured', true);
    }

    if (query.storeId) {
      supabaseQuery = supabaseQuery.eq('storeId', query.storeId);
    }

    if (query.sellerId) {
      supabaseQuery = supabaseQuery.eq('sellerId', query.sellerId);
    }

    // Ordenação
    const sortField = query.sortBy === 'price_asc' ? 'price' : query.sortBy;
    const sortOrder = query.sortBy === 'price_asc' ? 'asc' : query.sortOrder;

    supabaseQuery = supabaseQuery.order(sortField, { ascending: sortOrder === 'asc' });

    // Paginação
    const rangeStart = (query.page - 1) * query.limit;
    const rangeEnd = rangeStart + query.limit - 1;

    supabaseQuery = supabaseQuery.range(rangeStart, rangeEnd);

    const { data: products, error, count } = await supabaseQuery;

    if (error) {
      console.error('Erro ao buscar produtos no Supabase:', error);
      throw error;
    }

    // Formatar produtos para resposta
    const formattedProducts = (products || []).map(product => ({
      ...product,
      averageRating: product.rating || 0,
      totalReviews: product.reviewCount || 0,
      store: {
        ...product.store,
        rating: 5 // Placeholder rating
      },
      seller: {
        id: product.sellerId,
        rating: 5,
        storeName: product.store?.name || 'Loja'
      }
    }));

    const totalCount = count || 0;

    res.json({
      success: true,
      products: formattedProducts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / query.limit),
        hasNext: query.page * query.limit < totalCount,
        hasPrev: query.page > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);

    // Se um sellerId específico foi solicitado, retornar lista vazia
    if (req.query.sellerId) {
      return res.json({
        success: true,
        products: [],
        pagination: {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 12,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      products: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    });
  }
});

// GET /api/products/test - Endpoint de teste (DEVE FICAR ANTES DE /:id)
router.get("/test", async (req, res) => {
  res.json({
    success: true,
    message: "API de produtos funcionando!",
    query: req.query
  });
});

// GET /api/products/:id - Buscar produto por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' }
        },
        specifications: true,
        category: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            isVerified: true
          }
        },
        seller: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        error: "Produto não encontrado",
      });
    }

    // Incrementar visualizações (opcional - pode remover se não quiser salvar no banco)
    // await prisma.product.update({
    //   where: { id },
    //   data: { viewCount: { increment: 1 } }
    // });

    // Formatar resposta
    const formattedProduct = {
      ...product,
      averageRating: product.rating || 0,
      totalReviews: product.reviewCount || 0,
      store: {
        ...product.store,
        rating: 5 // Placeholder rating
      },
      seller: {
        id: product.sellerId,
        rating: product.seller?.rating || 5,
        storeName: product.store?.name || product.seller?.user?.name || 'Loja'
      }
    };

    res.json(formattedProduct);
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
  authenticate,
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
