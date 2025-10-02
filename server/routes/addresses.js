import express from "express";
import { authenticate, authenticateUser, authenticateSeller, authenticateAdmin } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase-client.js";
import { logger } from "../lib/logger.js";

const router = express.Router();

// JWT Secret - OBRIGATÓRIO nas variáveis de ambiente
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET é obrigatório para rotas addresses");
}

// Middleware de autenticação
// Middleware removido - usando middleware centralizado

// GET /api/addresses - Listar endereços do usuário
router.get("/", authenticateUser, async (req, res) => {
  try {
    logger.info("📍 Buscando endereços para usuário:", req.user.id);

    // Buscar endereços do usuário no Supabase
    const { data: addresses, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("userId", req.user.id)
      .order("isDefault", { ascending: false })
      .order("createdAt", { ascending: false });

    if (error) {
      logger.error("❌ Erro ao buscar endereços:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    logger.info(`✅ ${addresses?.length || 0} endereços encontrados`);

    return res.json({
      success: true,
      data: addresses || [],
    });
  } catch (error) {
    logger.error("❌ Erro ao buscar endereços:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao carregar endereços",
      details: error.message,
    });
  }
});

// POST /api/addresses - Adicionar novo endereço
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { label, street, number, complement, neighborhood, city, state, zipCode, isDefault = false } = req.body;

    // Validações básicas (label is optional after FASE 2 fix)
    if (!street || !number || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: street, number, city, state, zipCode",
      });
    }

    if (!/^\d{5}-?\d{3}$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: "CEP deve estar no formato xxxxx-xxx",
      });
    }

    logger.info("📍 Adicionando endereço para usuário:", req.user.id);

    // Se isDefault é true, remover default de outros endereços
    if (isDefault) {
      const { error: updateError } = await supabase
        .from("addresses")
        .update({ isDefault: false })
        .eq("userId", req.user.id);

      if (updateError) {
        logger.warn("⚠️ Erro ao atualizar endereços existentes:", updateError);
      }
    }

    // Criar novo endereço
    const { data: address, error: insertError } = await supabase
      .from("addresses")
      .insert({
        userId: req.user.id,
        label: label?.trim() || "Endereço principal",
        street: street.trim(),
        number: number.trim(),
        complement: complement?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        city: city.trim(),
        state: state.trim().toUpperCase(),
        zipCode: zipCode.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"),
        isDefault: Boolean(isDefault),
      })
      .select()
      .single();

    if (insertError) {
      logger.error("❌ Erro ao criar endereço:", insertError);
      throw new Error(`Erro ao criar: ${insertError.message}`);
    }

    logger.info("✅ Endereço criado:", address.id);

    return res.status(201).json({
      success: true,
      message: "Endereço adicionado com sucesso",
      data: address,
    });
  } catch (error) {
    logger.error("❌ Erro ao criar endereço:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao adicionar endereço",
      details: error.message,
    });
  }
});

// PUT /api/addresses/:id - Atualizar endereço
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, street, number, complement, neighborhood, city, state, zipCode, isDefault } = req.body;

    logger.info("📝 Atualizando endereço:", id, "usuário:", req.user.id);

    // Verificar se endereço existe e pertence ao usuário
    const { data: existingAddress, error: checkError } = await supabase
      .from("addresses")
      .select("id, isDefault")
      .eq("id", id)
      .eq("userId", req.user.id)
      .single();

    if (checkError || !existingAddress) {
      return res.status(404).json({
        success: false,
        error: "Endereço não encontrado ou você não tem permissão para editá-lo",
      });
    }

    // Construir objeto de atualização
    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (label !== undefined) updateData.label = label.trim();
    if (street !== undefined) updateData.street = street.trim();
    if (number !== undefined) updateData.number = number.trim();
    if (complement !== undefined) updateData.complement = complement?.trim() || null;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood?.trim() || null;
    if (city !== undefined) updateData.city = city.trim();
    if (state !== undefined) updateData.state = state.trim().toUpperCase();
    if (zipCode !== undefined) {
      if (!/^\d{5}-?\d{3}$/.test(zipCode)) {
        return res.status(400).json({
          success: false,
          error: "CEP deve estar no formato xxxxx-xxx",
        });
      }
      updateData.zipCode = zipCode.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2");
    }
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);

    // Se isDefault está sendo definido como true, remover default de outros endereços
    if (updateData.isDefault && !existingAddress.isDefault) {
      const { error: updateOthersError } = await supabase
        .from("addresses")
        .update({ isDefault: false })
        .eq("userId", req.user.id)
        .neq("id", id);

      if (updateOthersError) {
        logger.warn("⚠️ Erro ao atualizar outros endereços:", updateOthersError);
      }
    }

    // Atualizar endereço
    const { data: updatedAddress, error: updateError } = await supabase
      .from("addresses")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("❌ Erro ao atualizar endereço:", updateError);
      throw new Error(`Erro ao atualizar: ${updateError.message}`);
    }

    logger.info("✅ Endereço atualizado:", updatedAddress.id);

    return res.json({
      success: true,
      message: "Endereço atualizado com sucesso",
      data: updatedAddress,
    });
  } catch (error) {
    logger.error("❌ Erro ao atualizar endereço:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar endereço",
      details: error.message,
    });
  }
});

// DELETE /api/addresses/:id - Deletar endereço
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("🗑️ Deletando endereço:", id, "usuário:", req.user.id);

    // Verificar se endereço existe e pertence ao usuário
    const { data: existingAddress, error: checkError } = await supabase
      .from("addresses")
      .select("id, isDefault")
      .eq("id", id)
      .eq("userId", req.user.id)
      .single();

    if (checkError || !existingAddress) {
      return res.status(404).json({
        success: false,
        error: "Endereço não encontrado ou você não tem permissão para deletá-lo",
      });
    }

    // Deletar endereço
    const { error: deleteError } = await supabase.from("addresses").delete().eq("id", id).eq("userId", req.user.id);

    if (deleteError) {
      logger.error("❌ Erro ao deletar endereço:", deleteError);
      throw new Error(`Erro ao deletar: ${deleteError.message}`);
    }

    // Se era o endereço padrão, definir outro como padrão (se existir)
    if (existingAddress.isDefault) {
      const { data: otherAddresses, error: searchError } = await supabase
        .from("addresses")
        .select("id")
        .eq("userId", req.user.id)
        .limit(1);

      if (!searchError && otherAddresses && otherAddresses.length > 0) {
        await supabase.from("addresses").update({ isDefault: true }).eq("id", otherAddresses[0].id);

        logger.info("✅ Novo endereço padrão definido:", otherAddresses[0].id);
      }
    }

    logger.info("✅ Endereço deletado:", id);

    return res.json({
      success: true,
      message: "Endereço deletado com sucesso",
    });
  } catch (error) {
    logger.error("❌ Erro ao deletar endereço:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao deletar endereço",
      details: error.message,
    });
  }
});

export default router;
