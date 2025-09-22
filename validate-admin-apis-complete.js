#!/usr/bin/env node

/**
 * VALIDAÇÃO COMPLETA DAS APIs ADMIN - VENDEU ONLINE
 *
 * Este script testa todas as 25 APIs do painel administrativo
 * incluindo autenticação, autorização e funcionalidades.
 *
 * Data: 22 Setembro 2025
 * Status: Validação completa de produção
 */

const API_BASE = "http://localhost:3002";
const colors = {
  green: "\x1b[32m%s\x1b[0m",
  red: "\x1b[31m%s\x1b[0m",
  yellow: "\x1b[33m%s\x1b[0m",
  blue: "\x1b[34m%s\x1b[0m",
  magenta: "\x1b[35m%s\x1b[0m",
  cyan: "\x1b[36m%s\x1b[0m",
  bold: "\x1b[1m%s\x1b[0m",
};

// Credenciais de teste
const adminCredentials = {
  email: "admin@vendeuonline.com",
  password: "Test123!@#",
};

const buyerCredentials = {
  email: "buyer@test.com",
  password: "Test123!@#",
};

let adminToken = null;
let buyerToken = null;
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

// Testar autenticação
async function testAuthentication() {
  console.log(colors.bold, "\n🔒 SEÇÃO 1: TESTANDO AUTENTICAÇÃO E AUTORIZAÇÃO");

  // 1. Testar acesso sem token
  await testEndpoint("Acesso sem token (deve falhar)", "/api/admin/stats", {}, 401, false);

  // 2. Testar acesso com token de buyer (deve falhar)
  await testEndpoint(
    "Acesso com token de buyer (deve falhar)",
    "/api/admin/stats",
    { headers: { Authorization: `Bearer ${buyerToken}` } },
    403,
    false
  );

  // 3. Testar acesso com token de admin (deve passar)
  await testEndpoint(
    "Acesso com token de admin (deve passar)",
    "/api/admin/stats",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );
}

// Testar dashboard
async function testDashboard() {
  console.log(colors.bold, "\n📊 SEÇÃO 2: TESTANDO DASHBOARD E ESTATÍSTICAS");

  await testEndpoint(
    "Dashboard Stats",
    "/api/admin/stats",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );
}

// Testar gestão de usuários
async function testUserManagement() {
  console.log(colors.bold, "\n👥 SEÇÃO 3: TESTANDO GESTÃO DE USUÁRIOS");

  // Listar usuários
  const usersResult = await testEndpoint(
    "Listar usuários",
    "/api/admin/users",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  let testUserId = null;
  if (usersResult.success && usersResult.data.data && usersResult.data.data.length > 0) {
    // Encontrar usuário que não seja admin para testes
    testUserId = usersResult.data.data.find((u) => u.userType !== "ADMIN")?.id;
  }

  // Filtrar usuários por tipo
  await testEndpoint(
    "Filtrar usuários por tipo",
    "/api/admin/users?type=BUYER",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  // Buscar usuários
  await testEndpoint(
    "Buscar usuários",
    "/api/admin/users?search=test",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  if (testUserId) {
    // Atualizar status do usuário
    await testEndpoint(
      "Atualizar status do usuário",
      `/api/admin/users/${testUserId}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "active" }),
      },
      200,
      true
    );
  }
}

// Testar gestão de lojas
async function testStoreManagement() {
  console.log(colors.bold, "\n🏪 SEÇÃO 4: TESTANDO GESTÃO DE LOJAS");

  // Listar lojas
  const storesResult = await testEndpoint(
    "Listar lojas",
    "/api/admin/stores",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  let testStoreId = null;
  if (storesResult.success && storesResult.data.data && storesResult.data.data.length > 0) {
    testStoreId = storesResult.data.data[0].id;
  }

  // Filtrar lojas por status
  await testEndpoint(
    "Filtrar lojas por status",
    "/api/admin/stores?status=active",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  if (testStoreId) {
    // Ações nas lojas
    await testEndpoint(
      "Aprovar loja",
      `/api/admin/stores/${testStoreId}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      200,
      true
    );

    await testEndpoint(
      "Suspender loja",
      `/api/admin/stores/${testStoreId}/suspend`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Teste de suspensão" }),
      },
      200,
      true
    );

    await testEndpoint(
      "Ativar loja",
      `/api/admin/stores/${testStoreId}/activate`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      200,
      true
    );
  }
}

// Testar gestão de produtos
async function testProductManagement() {
  console.log(colors.bold, "\n📦 SEÇÃO 5: TESTANDO GESTÃO DE PRODUTOS");

  // Listar produtos
  await testEndpoint(
    "Listar produtos",
    "/api/admin/products",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  // Filtrar produtos por status
  await testEndpoint(
    "Filtrar produtos por status",
    "/api/admin/products?status=active",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  // Buscar produtos
  await testEndpoint(
    "Buscar produtos",
    "/api/admin/products?search=iphone",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );
}

// Testar gestão de pedidos
async function testOrderManagement() {
  console.log(colors.bold, "\n🛒 SEÇÃO 6: TESTANDO GESTÃO DE PEDIDOS");

  // Listar pedidos
  await testEndpoint(
    "Listar pedidos",
    "/api/admin/orders",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  // Filtrar pedidos por status
  await testEndpoint(
    "Filtrar pedidos por status",
    "/api/admin/orders?status=PENDING",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );
}

// Testar gestão de planos
async function testPlanManagement() {
  console.log(colors.bold, "\n💰 SEÇÃO 7: TESTANDO GESTÃO DE PLANOS");

  // Listar planos
  const plansResult = await testEndpoint(
    "Listar planos",
    "/api/admin/plans",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  let testPlanId = null;
  if (plansResult.success && plansResult.data.data && plansResult.data.data.length > 0) {
    testPlanId = plansResult.data.data[0].id;
  }

  // Criar plano de teste
  const newPlanResult = await testEndpoint(
    "Criar novo plano",
    "/api/admin/plans",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Plano Teste Admin",
        description: "Plano criado para teste das APIs",
        price: 49.9,
        billingPeriod: "MONTHLY",
        maxAds: 25,
        maxPhotosPerAd: 8,
        supportLevel: "EMAIL",
        features: ["25 anúncios", "8 fotos por anúncio", "Suporte email"],
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

  if (testPlanId) {
    // Atualizar plano existente
    await testEndpoint(
      "Atualizar plano",
      `/api/admin/plans/${testPlanId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Plano Atualizado",
          description: "Descrição atualizada",
          price: 59.9,
        }),
      },
      200,
      true
    );
  }

  if (createdPlanId) {
    // Deletar plano criado
    await testEndpoint(
      "Deletar plano",
      `/api/admin/plans/${createdPlanId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      200,
      true
    );
  }
}

// Testar gestão de assinaturas
async function testSubscriptionManagement() {
  console.log(colors.bold, "\n💳 SEÇÃO 8: TESTANDO GESTÃO DE ASSINATURAS");

  // Listar assinaturas
  const subsResult = await testEndpoint(
    "Listar assinaturas",
    "/api/admin/subscriptions",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  // Filtrar assinaturas por status
  await testEndpoint(
    "Filtrar assinaturas por status",
    "/api/admin/subscriptions?status=ACTIVE",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  let testSubscriptionId = null;
  if (subsResult.success && subsResult.data.data && subsResult.data.data.length > 0) {
    testSubscriptionId = subsResult.data.data[0].id;
  }

  if (testSubscriptionId) {
    // Atualizar status da assinatura
    await testEndpoint(
      "Atualizar status da assinatura",
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

    // Renovar assinatura
    await testEndpoint(
      "Renovar assinatura",
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
}

// Testar gestão de banners
async function testBannerManagement() {
  console.log(colors.bold, "\n🎨 SEÇÃO 9: TESTANDO GESTÃO DE BANNERS");

  // Listar banners
  await testEndpoint(
    "Listar banners",
    "/api/admin/banners",
    { headers: { Authorization: `Bearer ${adminToken}` } },
    200,
    true
  );

  // Criar banner
  const bannerResult = await testEndpoint(
    "Criar banner",
    "/api/admin/banners",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Banner Teste Admin",
        description: "Banner criado para teste",
        imageUrl: "/images/banner-test.jpg",
        targetUrl: "/teste",
        position: "HEADER",
        isActive: true,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      }),
    },
    200,
    true
  );

  let bannerId = null;
  if (bannerResult.success && bannerResult.data.banner) {
    bannerId = bannerResult.data.banner.id;
  }

  if (bannerId) {
    // Atualizar banner
    await testEndpoint(
      "Atualizar banner",
      `/api/admin/banners/${bannerId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Banner Atualizado",
          description: "Descrição atualizada",
        }),
      },
      200,
      true
    );

    // Deletar banner
    await testEndpoint(
      "Deletar banner",
      `/api/admin/banners/${bannerId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      },
      200,
      true
    );
  }
}

// Função principal
async function main() {
  console.log(colors.bold, "🚀 INICIANDO VALIDAÇÃO COMPLETA DAS APIs ADMIN");
  console.log(colors.cyan, "📅 Data: 22 Setembro 2025");
  console.log(colors.cyan, "🎯 Objetivo: Validar todas as 25 APIs do painel admin");
  console.log(colors.cyan, "🔗 Base URL:", API_BASE);

  try {
    // Fazer logins
    adminToken = await login(adminCredentials, "admin");

    try {
      buyerToken = await login(buyerCredentials, "buyer");
    } catch (buyerError) {
      console.log(colors.yellow, "⚠️ Login buyer falhou, continuando apenas com admin");
      buyerToken = "invalid_token"; // Token inválido para testar autorização
    }

    // Executar todos os testes
    await testAuthentication();
    await testDashboard();
    await testUserManagement();
    await testStoreManagement();
    await testProductManagement();
    await testOrderManagement();
    await testPlanManagement();
    await testSubscriptionManagement();
    await testBannerManagement();

    // Relatório final
    console.log(colors.bold, "\n📊 RELATÓRIO FINAL");
    console.log(colors.cyan, `📈 Total de testes: ${testResults.total}`);
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
      console.log(colors.green, "✅ PAINEL ADMIN 100% FUNCIONAL");
    }

    // Status final
    const status = testResults.failed === 0 ? "✅ SUCESSO" : "❌ PROBLEMAS ENCONTRADOS";
    const color = testResults.failed === 0 ? colors.green : colors.red;
    console.log(color, `\n🏁 STATUS FINAL: ${status}`);
  } catch (error) {
    console.log(colors.red, "\n💥 ERRO CRÍTICO:");
    console.log(colors.red, error.message);
    process.exit(1);
  }
}

// Verificar se fetch está disponível
if (typeof fetch === "undefined") {
  console.log(colors.red, "❌ Este script requer Node.js 18+ com fetch nativo");
  console.log(colors.yellow, "💡 Instale Node.js 18+ ou use: npm install node-fetch");
  process.exit(1);
}

// Executar
main().catch(console.error);
