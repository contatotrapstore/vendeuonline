import express from "express";
import { supabase } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";
import { formatPlanListResponse, formatPlanResponse } from "../utils/plan-utils.js";

const router = express.Router();

// GET /api/plans - list all active plans
router.get("/", async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from("Plan")
      .select("*")
      .eq("isActive", true)
      .order("order", { ascending: true });

    if (error) {
      logger.error("[Plans] Failed to fetch plans:", error);
      throw error;
    }

    const normalizedPlans = formatPlanListResponse(plans);

    logger.info(`[Plans] ${normalizedPlans.length} plans retrieved`);

    res.json({
      success: true,
      data: normalizedPlans,
      plans: normalizedPlans,
    });
  } catch (error) {
    logger.error("[Plans] Unexpected error fetching plans:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar planos",
      details: error.message,
      data: [],
      plans: [],
    });
  }
});

// GET /api/plans/:id - fetch plan by id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: plan, error } = await supabase.from("Plan").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          error: "Plano nao encontrado",
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data: formatPlanResponse(plan),
    });
  } catch (error) {
    logger.error("[Plans] Error fetching plan by id:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

export default router;
