import express from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase-client.js";

const router = express.Router();

// JWT Secret
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "cc59dcad7b4e400792f5a7b2d060f34f93b8eec2cf540878c9bd20c0bb05eaef1dd9e348f0c680ceec145368285c6173e028988f5988cf5fe411939861a8f9ac";

// Middleware de autenticação
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de autenticação necessário" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário real do Supabase
    const { data: user, error } = await supabase.from("users").select("*").eq("id", decoded.userId).single();

    if (error || !user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    return res.status(401).json({ error: "Token inválido" });
  }
};

// GET /api/addresses - Listar endereços do usuário
router.get("/", authenticateUser, async (req, res) => {
  try {
    console.log("📍 Buscando endereços para usuário:", req.user.id);

    // Buscar endereços do usuário no Supabase
    const { data: addresses, error } = await supabase
      .from("Address")
      .select("*")
      .eq("userId", req.user.id)
      .order("isDefault", { ascending: false })
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("❌ Erro ao buscar endereços:", error);
      throw new Error(`Erro na consulta: ${error.message}`);
    }

    console.log(`✅ ${addresses?.length || 0} endereços encontrados`);

    return res.json({
      success: true,
      data: addresses || [],
    });
  } catch (error) {
    console.error("❌ Erro ao buscar endereços:", error);
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

    // Validações básicas
    if (!label || !street || !number || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        error: "Campos obrigatórios: label, street, number, city, state, zipCode",
      });
    }

    if (!/^\d{5}-?\d{3}$/.test(zipCode)) {
      return res.status(400).json({
        success: false,
        error: "CEP deve estar no formato xxxxx-xxx",
      });
    }

    console.log("📍 Adicionando endereço para usuário:", req.user.id);

    // Se isDefault é true, remover default de outros endereços
    if (isDefault) {
      const { error: updateError } = await supabase
        .from("Address")
        .update({ isDefault: false })
        .eq("userId", req.user.id);

      if (updateError) {
        console.warn("⚠️ Erro ao atualizar endereços existentes:", updateError);
      }
    }

    // Criar novo endereço
    const { data: address, error: insertError } = await supabase
      .from("Address")
      .insert({
        userId: req.user.id,
        label: label.trim(),
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
      console.error("❌ Erro ao criar endereço:", insertError);
      throw new Error(`Erro ao criar: ${insertError.message}`);
    }

    console.log("✅ Endereço criado:", address.id);

    return res.status(201).json({
      success: true,
      message: "Endereço adicionado com sucesso",
      data: address,
    });
  } catch (error) {
    console.error("❌ Erro ao criar endereço:", error);
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

    console.log("📝 Atualizando endereço:", id, "usuário:", req.user.id);

    // Verificar se endereço existe e pertence ao usuário
    const { data: existingAddress, error: checkError } = await supabase
      .from("Address")
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
        .from("Address")
        .update({ isDefault: false })
        .eq("userId", req.user.id)
        .neq("id", id);

      if (updateOthersError) {
        console.warn("⚠️ Erro ao atualizar outros endereços:", updateOthersError);
      }
    }

    // Atualizar endereço
    const { data: updatedAddress, error: updateError } = await supabase
      .from("Address")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar endereço:", updateError);
      throw new Error(`Erro ao atualizar: ${updateError.message}`);
    }

    console.log("✅ Endereço atualizado:", updatedAddress.id);

    return res.json({
      success: true,
      message: "Endereço atualizado com sucesso",
      data: updatedAddress,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar endereço:", error);
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

    console.log("🗑️ Deletando endereço:", id, "usuário:", req.user.id);

    // Verificar se endereço existe e pertence ao usuário
    const { data: existingAddress, error: checkError } = await supabase
      .from("Address")
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
    const { error: deleteError } = await supabase.from("Address").delete().eq("id", id).eq("userId", req.user.id);

    if (deleteError) {
      console.error("❌ Erro ao deletar endereço:", deleteError);
      throw new Error(`Erro ao deletar: ${deleteError.message}`);
    }

    // Se era o endereço padrão, definir outro como padrão (se existir)
    if (existingAddress.isDefault) {
      const { data: otherAddresses, error: searchError } = await supabase
        .from("Address")
        .select("id")
        .eq("userId", req.user.id)
        .limit(1);

      if (!searchError && otherAddresses && otherAddresses.length > 0) {
        await supabase.from("Address").update({ isDefault: true }).eq("id", otherAddresses[0].id);

        console.log("✅ Novo endereço padrão definido:", otherAddresses[0].id);
      }
    }

    console.log("✅ Endereço deletado:", id);

    return res.json({
      success: true,
      message: "Endereço deletado com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao deletar endereço:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao deletar endereço",
      details: error.message,
    });
  }
});

export default router;
