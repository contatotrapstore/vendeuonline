import express from "express";
import { supabase } from "../lib/supabase-client.js";

const router = express.Router();

// GET /api/categories - Listar categorias
router.get("/", async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('isActive', true)
      .order('order', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: categories || []
    });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/categories/:slug - Buscar categoria por slug
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: category, error } = await supabase
      .from('categories')
      .select(`
        *,
        children:categories!parent_id(*),
        parent:categories!parent_id(id, name, slug)
      `)
      .eq('slug', slug)
      .eq('isActive', true)
      .single();

    if (error || !category) {
      return res.status(404).json({ error: "Categoria não encontrada" });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error("Erro ao buscar categoria:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
