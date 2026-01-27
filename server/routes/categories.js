import express from "express";
import crypto from "crypto";
import { supabase, supabaseAdmin } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";
import { authenticateAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /api/categories - Listar categorias
router.get("/", async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .eq("isActive", true)
      .order("order", { ascending: true });

    if (error) {
      throw error;
    }

    // Retornar formato padronizado { success, data }
    res.json({
      success: true,
      data: categories || [],
    });
  } catch (error) {
    logger.error("Erro ao buscar categorias:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/categories/:slug - Buscar categoria por slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: category, error } = await supabase
      .from("categories")
      .select(
        `
        *,
        children:categories!parent_id(*),
        parent:categories!parent_id(id, name, slug)
      `
      )
      .eq("slug", slug)
      .eq("isActive", true)
      .single();

    if (error || !category) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    logger.error("Erro ao buscar categoria:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/categories - Criar nova categoria (Admin only)
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { name, slug, description, image, icon, parentId, order } = req.body;

    // Validação básica
    if (!name || !slug) {
      return res.status(400).json({
        error: "Nome e slug são obrigatórios",
      });
    }

    // Verificar se slug já existe
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingCategory) {
      return res.status(400).json({
        error: "Slug já existe. Escolha outro slug único.",
      });
    }

    // 🔧 FIX: Usar supabaseAdmin para bypassar RLS
    // Gerar ID explícito (Prisma usa cuid() mas Supabase não tem default)
    const categoryId = crypto.randomUUID();
    const { data: category, error } = await supabaseAdmin
      .from("categories")
      .insert({
        id: categoryId,
        name,
        slug,
        description: description || null,
        image: image || icon || null,
        parentId: parentId || null,
        order: order || 0,
        isActive: true,
      })
      .select()
      .single();

    if (error) {
      logger.error("❌ Erro Supabase ao criar categoria:", error);
      throw error;
    }

    logger.info(`✅ Categoria criada: ${name} (${slug})`);
    res.status(201).json({
      success: true,
      data: category,
      message: "Categoria criada com sucesso",
    });
  } catch (error) {
    logger.error("Erro ao criar categoria:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PUT /api/categories/:id - Atualizar categoria (Admin only)
router.put("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image, icon, parentId, order, isActive } = req.body;

    // Validação básica
    if (!name && !slug && description === undefined && icon === undefined && parentId === undefined && order === undefined && isActive === undefined) {
      return res.status(400).json({
        error: "Nenhum campo para atualizar foi fornecido",
      });
    }

    // Se slug foi alterado, verificar se já existe
    if (slug) {
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .neq("id", id)
        .single();

      if (existingCategory) {
        return res.status(400).json({
          error: "Slug já existe. Escolha outro slug único.",
        });
      }
    }

    // Preparar dados para atualização
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.image = icon; // 🔧 FIX: Mapear icon para image
    if (image !== undefined) updateData.image = image;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    // 🔧 FIX: Usar supabaseAdmin para bypassar RLS
    const { data: category, error } = await supabaseAdmin
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Categoria não encontrada",
        });
      }
      throw error;
    }

    logger.info(`✅ Categoria atualizada: ${category.name} (${category.slug})`);
    res.json({
      success: true,
      data: category,
      message: "Categoria atualizada com sucesso",
    });
  } catch (error) {
    logger.error("Erro ao atualizar categoria:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// DELETE /api/categories/:id - Deletar categoria (Admin only)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se categoria existe
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("id", id)
      .single();

    if (fetchError || !category) {
      return res.status(404).json({
        error: "Categoria não encontrada",
      });
    }

    // Verificar se há produtos associados
    const { count: productCount, error: countError } = await supabase
      .from("Product")
      .select("id", { count: "exact", head: true })
      .eq("categoryId", id);

    if (countError) {
      throw countError;
    }

    if (productCount > 0) {
      return res.status(400).json({
        error: `Não é possível deletar a categoria. Existem ${productCount} produto(s) associado(s).`,
        code: "CATEGORY_HAS_PRODUCTS",
      });
    }

    // Verificar se há subcategorias
    const { count: childCount, error: childError } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("parentId", id);

    if (childError) {
      throw childError;
    }

    if (childCount > 0) {
      return res.status(400).json({
        error: `Não é possível deletar a categoria. Existem ${childCount} subcategoria(s) associada(s).`,
        code: "CATEGORY_HAS_CHILDREN",
      });
    }

    // 🔧 FIX: Usar supabaseAdmin para bypassar RLS
    const { error: deleteError } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    logger.info(`✅ Categoria deletada: ${category.name} (${category.slug})`);
    res.json({
      success: true,
      message: "Categoria deletada com sucesso",
    });
  } catch (error) {
    logger.error("Erro ao deletar categoria:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
