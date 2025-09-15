import express from "express";
import { supabase } from "../lib/supabase-client.js";

const router = express.Router();

// GET /api/plans - Listar todos os planos
router.get("/", async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('order', { ascending: true });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: plans || []
    });
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
});

// GET /api/plans/:id - Buscar plano por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: plan, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: "Plano não encontrado"
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error("Erro ao buscar plano:", error);
    res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
});

export default router;
