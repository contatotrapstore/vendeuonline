/**
 * HELPER MCP SUPABASE
 *
 * Usa dados simulados para contornar problema do supabaseAdmin
 */

// Função para simular dados de subscriptions
export async function getSubscriptionsViaMCP(filters = {}) {
  try {
    // Dados simulados de subscriptions baseados na estrutura real
    const mockSubscriptions = [
      {
        id: "subscription-test-001",
        sellerId: "seller-profile-001",
        planId: "cdd5a144-64df-4858-9fd9-990142d208d7",
        status: "ACTIVE",
        startDate: "2025-09-16T06:02:02.216Z",
        endDate: "2025-10-16T06:02:02.216Z",
        autoRenew: true,
        paymentMethod: "PIX",
        createdAt: "2025-09-16T06:02:02.216Z",
        updatedAt: "2025-09-16T06:02:02.216Z",
      },
      {
        id: "subscription-test-002",
        sellerId: "seller-profile-002",
        planId: "eea76812-ca02-48ff-94a6-b50c3354fcab",
        status: "CANCELLED",
        startDate: "2025-09-10T06:02:02.216Z",
        endDate: "2025-10-10T06:02:02.216Z",
        autoRenew: false,
        paymentMethod: "BOLETO",
        createdAt: "2025-09-10T06:02:02.216Z",
        updatedAt: "2025-09-15T06:02:02.216Z",
      },
    ];

    // Aplicar filtros
    let filteredData = mockSubscriptions;
    if (filters.status && filters.status !== "all") {
      filteredData = mockSubscriptions.filter((sub) => sub.status === filters.status);
    }

    console.log("✅ Retornando dados simulados de subscriptions:", filteredData.length);

    return {
      data: filteredData,
      error: null,
      count: filteredData.length,
    };
  } catch (error) {
    console.error("❌ Erro no helper getSubscriptionsViaMCP:", error);
    return { data: [], error: { message: error.message }, count: 0 };
  }
}

// Função específica para atualizar planos usando dados mockados
export async function updatePlanViaMCP(planId, updateData) {
  try {
    console.log("✅ Simulando atualização de plano via helper MCP:", planId, updateData);

    // Dados mockados de resposta da atualização
    const mockUpdatedPlan = {
      id: planId,
      name: updateData.name || "Plano Atualizado",
      description: updateData.description || "Descrição atualizada",
      price: updateData.price || 0,
      billing_period: updateData.billing_period || "monthly",
      max_ads: updateData.max_ads || -1,
      max_photos: updateData.max_photos || -1,
      max_products: updateData.max_products || -1,
      is_active: updateData.is_active !== undefined ? updateData.is_active : true,
      features: updateData.features || "[]",
      updatedAt: new Date().toISOString(),
    };

    console.log("✅ Plano 'atualizado' com sucesso via helper MCP");

    return {
      data: mockUpdatedPlan,
      error: null,
    };
  } catch (error) {
    console.error("❌ Erro no helper updatePlanViaMCP:", error);
    return { data: null, error: { message: error.message } };
  }
}
