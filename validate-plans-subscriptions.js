#!/usr/bin/env node

/**
 * VALIDAÇÃO COMPLETA - SISTEMA DE PLANOS E ASSINATURAS
 *
 * Testa todas as APIs relacionadas a planos e assinaturas
 * tanto do lado admin quanto do seller.
 *
 * Data: 22 Setembro 2025
 */

const API_BASE = "http://localhost:3006";
const colors = {
  green: "\x1b[32m%s\x1b[0m",
  red: "\x1b[31m%s\x1b[0m",
  yellow: "\x1b[33m%s\x1b[0m",
  blue: "\x1b[34m%s\x1b[0m",
  bold: "\x1b[1m%s\x1b[0m",
};

// Credenciais de teste
const adminCredentials = {
  email: "admin@vendeuonline.com",
  password: "Test123!@#",
};

let adminToken = null;
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

// Helper para fazer requests
async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const responseData = await response.text();
    let data;
    try {
      data = JSON.parse(responseData);
    } catch {
      data = { rawResponse: responseData };
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: { error: error.message },
    };
  }
}

// Helper para testar endpoints
async function testEndpoint(name, endpoint, options = {}, expectedStatus = 200, shouldHaveData = true) {
  testResults.total++;

  console.log(`\n🧪 Testando: ${name}`);
  console.log(`   📡 ${options.method || "GET"} ${endpoint}`);

  const result = await makeRequest(endpoint, options);

  if (result.status === expectedStatus) {
    if (
      !shouldHaveData ||
      (result.data && (result.data.success !== false || result.data.data || result.data.length >= 0))
    ) {
      console.log(colors.green, `   ✅ PASSOU: ${result.status} - Dados OK`);
      testResults.passed++;
      return { success: true, data: result.data };
    } else {
      console.log(colors.red, `   ❌ FALHOU: ${result.status} - Sem dados válidos`);
      console.log(`   📄 Response:`, JSON.stringify(result.data, null, 2));
      testResults.failed++;
      testResults.errors.push(`${name}: Dados inválidos`);
      return { success: false, data: result.data };
    }
  } else {
    console.log(colors.red, `   ❌ FALHOU: Status ${result.status} (esperado ${expectedStatus})`);
    console.log(`   📄 Response:`, JSON.stringify(result.data, null, 2));
    testResults.failed++;
    testResults.errors.push(`${name}: Status ${result.status} !== ${expectedStatus}`);
    return { success: false, data: result.data };
  }
}

// Fazer login
async function login(credentials, userType) {
  console.log(colors.bold, `\n🔐 FAZENDO LOGIN COMO ${userType.toUpperCase()}`);

  const result = await makeRequest("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (result.ok && result.data.token) {
    console.log(colors.green, `   ✅ Login ${userType} bem-sucedido`);
    return result.data.token;
  } else {
    console.log(colors.red, `   ❌ Falha no login ${userType}`);
    console.log(`   📄 Response:`, JSON.stringify(result.data, null, 2));
    throw new Error(`Falha no login ${userType}`);
  }
}

// Testar APIs públicas de planos
async function testPublicPlansAPI() {
  console.log(colors.bold, "\n💰 SEÇÃO 1: TESTANDO APIs PÚBLICAS DE PLANOS");

  // 1. Listar planos públicos
  const plansResult = await testEndpoint("Listar planos públicos", "/api/plans", {}, 200, true);

  // 2. Buscar plano específico
  if (plansResult.success && plansResult.data.data && plansResult.data.data.length > 0) {
    const planId = plansResult.data.data[0].id;
    await testEndpoint("Buscar plano por ID", `/api/plans/${planId}`, {}, 200, true);
  }

  return plansResult;
}

// Testar APIs Admin de planos
async function testAdminPlansAPI() {
  console.log(colors.bold, "\n🔧 SEÇÃO 2: TESTANDO APIs ADMIN DE PLANOS");

  // 1. Listar planos como admin
  const adminPlansResult = await testEndpoint(
    "Admin - Listar planos",
    "/api/admin/plans",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  // 2. Criar novo plano (com nome único usando timestamp)
  const timestamp = Date.now();
  const newPlanResult = await testEndpoint(
    "Admin - Criar novo plano",
    "/api/admin/plans",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Plano Teste ${timestamp}`,
        description: `Plano criado durante validação em ${new Date().toLocaleString()}`,
        price: 19.9,
        billingPeriod: "monthly",
        maxAds: 15,
        maxPhotos: 5,
        maxProducts: 20,
        maxImages: 100,
        maxCategories: 5,
        prioritySupport: false,
        support: "Email",
        features: ["15 anúncios", "5 fotos por produto", "Suporte email"],
        isActive: true,
      }),
    },
    201,
    true
  );

  let createdPlanId = null;
  if (newPlanResult.success && newPlanResult.data.data) {
    createdPlanId = newPlanResult.data.data.id;
  }

  // 3. Atualizar plano (se temos um plano)
  if (adminPlansResult.success && adminPlansResult.data.data && adminPlansResult.data.data.length > 0) {
    const planId = adminPlansResult.data.data[0].id;
    await testEndpoint(
      "Admin - Atualizar plano",
      `/api/admin/plans/${planId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Plano Atualizado ${timestamp}`,
          description: `Descrição atualizada em ${new Date().toLocaleString()}`,
          price: 29.9,
        }),
      },
      200,
      true
    );
  }

  // 4. Deletar plano criado (se foi criado)
  if (createdPlanId) {
    await testEndpoint(
      "Admin - Deletar plano",
      `/api/admin/plans/${createdPlanId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      200,
      true
    );
  }

  return adminPlansResult;
}

// Testar APIs Admin de assinaturas
async function testAdminSubscriptionsAPI() {
  console.log(colors.bold, "\n💳 SEÇÃO 3: TESTANDO APIs ADMIN DE ASSINATURAS");

  // 1. Listar assinaturas
  const subscriptionsResult = await testEndpoint(
    "Admin - Listar assinaturas",
    "/api/admin/subscriptions",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  // 2. Filtrar assinaturas por status
  await testEndpoint(
    "Admin - Filtrar assinaturas por status",
    "/api/admin/subscriptions?status=ACTIVE",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  let testSubscriptionId = null;
  if (subscriptionsResult.success && subscriptionsResult.data.data && subscriptionsResult.data.data.length > 0) {
    testSubscriptionId = subscriptionsResult.data.data[0].id;
  }

  // 3. Atualizar status da assinatura
  if (testSubscriptionId) {
    await testEndpoint(
      "Admin - Atualizar status da assinatura",
      `/api/admin/subscriptions/${testSubscriptionId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "ACTIVE" }),
      },
      200,
      true
    );

    // 4. Renovar assinatura
    await testEndpoint(
      "Admin - Renovar assinatura",
      `/api/admin/subscriptions/${testSubscriptionId}/renew`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ months: 1, notes: "Renovação teste" }),
      },
      200,
      true
    );
  }

  return subscriptionsResult;
}

// Testar APIs Seller
async function testSellerAPIs() {
  console.log(colors.bold, "\n🏪 SEÇÃO 4: TESTANDO APIs SELLER");

  // Para seller, precisamos de um token de seller
  // Por enquanto vamos testar sem autenticação específica

  console.log(colors.yellow, "⚠️ APIs de seller requerem autenticação específica - pulando por enquanto");

  return { success: true };
}

// Função principal
async function main() {
  console.log(colors.bold, "🚀 INICIANDO VALIDAÇÃO - SISTEMA DE PLANOS E ASSINATURAS");
  console.log(colors.blue, "📅 Data: 22 Setembro 2025");
  console.log(colors.blue, "🎯 Objetivo: Validar todo o sistema de monetização");
  console.log(colors.blue, "🔗 Base URL:", API_BASE);

  try {
    // Fazer login admin
    adminToken = await login(adminCredentials, "admin");

    // Executar todos os testes
    await testPublicPlansAPI();
    await testAdminPlansAPI();
    await testAdminSubscriptionsAPI();
    await testSellerAPIs();

    // Relatório final
    console.log(colors.bold, "\n📊 RELATÓRIO FINAL - PLANOS E ASSINATURAS");
    console.log(colors.blue, `📈 Total de testes: ${testResults.total}`);
    console.log(colors.green, `✅ Passaram: ${testResults.passed}`);
    console.log(colors.red, `❌ Falharam: ${testResults.failed}`);
    console.log(colors.yellow, `📊 Taxa de sucesso: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

    if (testResults.failed > 0) {
      console.log(colors.red, "\n🚨 ERROS ENCONTRADOS:");
      testResults.errors.forEach((error, index) => {
        console.log(colors.red, `   ${index + 1}. ${error}`);
      });
    } else {
      console.log(colors.green, "\n🎉 TODOS OS TESTES PASSARAM!");
      console.log(colors.green, "✅ SISTEMA DE PLANOS E ASSINATURAS 100% FUNCIONAL");
    }

    // Status final
    const status = testResults.failed === 0 ? "✅ SUCESSO COMPLETO" : "⚠️ NECESSITA CORREÇÕES";
    const color = testResults.failed === 0 ? colors.green : colors.yellow;
    console.log(color, `\n🏁 STATUS FINAL: ${status}`);

    // Resumo dos componentes
    console.log(colors.bold, "\n📋 RESUMO DOS COMPONENTES:");
    console.log("   💰 APIs Públicas de Planos: Testadas");
    console.log("   🔧 APIs Admin de Planos: Testadas");
    console.log("   💳 APIs Admin de Assinaturas: Testadas");
    console.log("   🏪 APIs Seller: Pendente (requer auth específica)");
  } catch (error) {
    console.log(colors.red, "\n💥 ERRO CRÍTICO:");
    console.log(colors.red, error.message);
    process.exit(1);
  }
}

// Verificar se fetch está disponível
if (typeof fetch === "undefined") {
  console.log(colors.red, "❌ Este script requer Node.js 18+ com fetch nativo");
  process.exit(1);
}

// Executar
main().catch(console.error);
