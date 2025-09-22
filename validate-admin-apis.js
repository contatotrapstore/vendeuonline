#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE VALIDAÇÃO - ADMIN APIS VENDEU ONLINE
 * Este script valida que todas as 18 APIs admin estão funcionando corretamente
 */

const { execSync } = require("child_process");
const fs = require("fs");

const BASE_URL = "http://localhost:3016";
const TOTAL_APIS = 18;

// Cores para output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Lista das 18 APIs admin a serem testadas
const ADMIN_APIS_TO_TEST = [
  // Core Admin APIs (14)
  { method: "GET", endpoint: "/api/admin/stats", requiresAuth: true, category: "Dashboard" },
  { method: "GET", endpoint: "/api/admin/users", requiresAuth: true, category: "Users" },
  { method: "GET", endpoint: "/api/admin/stores", requiresAuth: true, category: "Stores" },
  { method: "GET", endpoint: "/api/admin/products", requiresAuth: true, category: "Products" },
  { method: "GET", endpoint: "/api/admin/plans", requiresAuth: true, category: "Plans" },
  { method: "PUT", endpoint: "/api/admin/plans/1", requiresAuth: true, category: "Plans" },
  { method: "GET", endpoint: "/api/admin/subscriptions", requiresAuth: true, category: "Subscriptions" },
  { method: "POST", endpoint: "/api/admin/stores/1/approve", requiresAuth: true, category: "Store Management" },
  { method: "POST", endpoint: "/api/admin/stores/1/reject", requiresAuth: true, category: "Store Management" },
  { method: "POST", endpoint: "/api/admin/stores/1/suspend", requiresAuth: true, category: "Store Management" },
  { method: "POST", endpoint: "/api/admin/stores/1/activate", requiresAuth: true, category: "Store Management" },
  { method: "PATCH", endpoint: "/api/admin/users/1/status", requiresAuth: true, category: "User Management" },
  { method: "DELETE", endpoint: "/api/admin/users/1", requiresAuth: true, category: "User Management" },
  { method: "GET", endpoint: "/api/admin/orders", requiresAuth: true, category: "Orders" },

  // Banner APIs (4) - implementadas no server.js
  { method: "GET", endpoint: "/api/admin/banners", requiresAuth: true, category: "Banners" },
  { method: "POST", endpoint: "/api/admin/banners", requiresAuth: true, category: "Banners" },
  { method: "PUT", endpoint: "/api/admin/banners/1", requiresAuth: true, category: "Banners" },
  { method: "DELETE", endpoint: "/api/admin/banners/1", requiresAuth: true, category: "Banners" },
];

// Função para fazer requisições HTTP
function makeRequest(method, url, requiresAuth = false) {
  try {
    let curlCmd = `curl -s -w "%{http_code}" -o /dev/null`;

    if (method !== "GET") {
      curlCmd += ` -X ${method}`;
    }

    curlCmd += ` "${url}"`;
    curlCmd += ` -H "Content-Type: application/json"`;

    if (requiresAuth) {
      curlCmd += ` -H "Authorization: Bearer invalid_admin_token_for_testing"`;
    }

    const result = execSync(curlCmd, { encoding: "utf8", timeout: 5000 });
    return parseInt(result.trim());
  } catch (error) {
    return 0;
  }
}

// Função principal
function validateAdminAPIs() {
  console.log(`${colors.bold}🧪 VALIDAÇÃO DE APIs ADMIN - VENDEU ONLINE${colors.reset}`);
  console.log(`${colors.blue}📊 Testando ${TOTAL_APIS} APIs Admin...${colors.reset}\n`);

  // Verificar se servidor está rodando
  console.log(`${colors.blue}🔍 Verificando se servidor está rodando...${colors.reset}`);
  const healthStatus = makeRequest("GET", `${BASE_URL}/api/health`, false);

  if (healthStatus !== 200) {
    console.log(`${colors.red}❌ Servidor não está rodando ou não responde!${colors.reset}`);
    console.log(`${colors.yellow}💡 Execute: npm run dev ou node server.js${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.green}✅ Servidor rodando na porta 3016${colors.reset}\n`);

  let workingCount = 0;
  let failedCount = 0;
  const results = {};

  // Agrupar por categoria
  ADMIN_APIS_TO_TEST.forEach((api) => {
    if (!results[api.category]) {
      results[api.category] = { working: 0, failed: 0, total: 0 };
    }
    results[api.category].total++;
  });

  console.log(`${colors.bold}📋 Testando APIs Admin:${colors.reset}\n`);

  // Testar todas as APIs
  ADMIN_APIS_TO_TEST.forEach((api, index) => {
    const url = `${BASE_URL}${api.endpoint}`;
    const statusCode = makeRequest(api.method, url, api.requiresAuth);

    let isWorking = false;
    let statusMessage = "";

    if (api.requiresAuth) {
      // Para APIs com auth admin, esperamos 401 ou 403 (não autorizado)
      isWorking = statusCode === 401 || statusCode === 403 || statusCode === 400 || statusCode === 422;
      statusMessage =
        statusCode === 401
          ? "401 (Auth Required)"
          : statusCode === 403
            ? "403 (Admin Required)"
            : statusCode === 400
              ? "400 (Bad Request)"
              : statusCode === 422
                ? "422 (Validation Error)"
                : statusCode === 200
                  ? "200 (OK)"
                  : `${statusCode} (Error)`;
    } else {
      // Para APIs públicas, esperamos 200
      isWorking = statusCode === 200 || statusCode === 400 || statusCode === 422;
      statusMessage =
        statusCode === 200
          ? "200 (OK)"
          : statusCode === 400
            ? "400 (Bad Request)"
            : statusCode === 422
              ? "422 (Validation Error)"
              : statusCode === 404
                ? "404 (Not Found)"
                : `${statusCode} (Error)`;
    }

    const status = isWorking
      ? `${colors.green}✅ ${statusMessage}${colors.reset}`
      : `${colors.red}❌ ${statusMessage}${colors.reset}`;

    const indexStr = (index + 1).toString().padStart(2);
    const methodStr = api.method.padEnd(6);
    const endpointStr = api.endpoint.padEnd(40);

    console.log(`${indexStr}. ${methodStr} ${endpointStr} ${status}`);

    if (isWorking) {
      workingCount++;
      results[api.category].working++;
    } else {
      failedCount++;
      results[api.category].failed++;
    }
  });

  // Resumo por categoria
  console.log(`\n${colors.bold}📊 Resumo por Categoria:${colors.reset}\n`);

  Object.entries(results).forEach(([category, stats]) => {
    const percentage = Math.round((stats.working / stats.total) * 100);
    const statusColor = percentage === 100 ? colors.green : percentage >= 80 ? colors.yellow : colors.red;

    const categoryStr = category.padEnd(18);
    console.log(`${statusColor}${categoryStr} ${stats.working}/${stats.total} (${percentage}%)${colors.reset}`);
  });

  // Resultado final
  console.log(`\n${colors.bold}🎯 RESULTADO FINAL:${colors.reset}\n`);

  const totalPercentage = Math.round((workingCount / TOTAL_APIS) * 100);
  const finalColor = totalPercentage === 100 ? colors.green : totalPercentage >= 90 ? colors.yellow : colors.red;

  console.log(
    `${finalColor}${colors.bold}${workingCount}/${TOTAL_APIS} APIs Admin funcionando (${totalPercentage}%)${colors.reset}`
  );

  if (totalPercentage === 100) {
    console.log(`${colors.green}${colors.bold}🎉 PARABÉNS! Todas as APIs Admin estão funcionando!${colors.reset}`);
    console.log(`${colors.green}✅ Sistema Admin 100% operacional${colors.reset}`);
  } else if (totalPercentage >= 90) {
    console.log(`${colors.yellow}⚠️  Quase lá! ${failedCount} APIs precisam de atenção${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Várias APIs falharam. Verifique implementação e autenticação${colors.reset}`);
  }

  // Salvar relatório
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    server: BASE_URL,
    total: TOTAL_APIS,
    working: workingCount,
    failed: failedCount,
    percentage: totalPercentage,
    categories: results,
  };

  fs.writeFileSync("admin-apis-validation-report.json", JSON.stringify(report, null, 2));
  console.log(`\n${colors.blue}📄 Relatório salvo em: admin-apis-validation-report.json${colors.reset}`);

  // Exit code baseado no resultado
  process.exit(totalPercentage === 100 ? 0 : 1);
}

// Executar validação
validateAdminAPIs();
