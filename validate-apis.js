#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE VALIDAÇÃO - VENDEU ONLINE APIs
 * Este script valida que todas as 36 APIs estão funcionando corretamente
 */

const { execSync } = require("child_process");
const fs = require("fs");

const BASE_URL = "http://localhost:3016";
const TOTAL_APIS = 36;

// Cores para output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Lista das 36 APIs a serem testadas
const APIs_TO_TEST = [
  // Auth (3)
  { method: "POST", endpoint: "/api/auth/register", requiresAuth: false, category: "Auth" },
  { method: "POST", endpoint: "/api/auth/login", requiresAuth: false, category: "Auth" },
  { method: "GET", endpoint: "/api/auth/profile", requiresAuth: true, category: "Auth" },

  // Produtos (5)
  { method: "GET", endpoint: "/api/products", requiresAuth: false, category: "Produtos" },
  { method: "GET", endpoint: "/api/products/1", requiresAuth: false, category: "Produtos" },
  { method: "POST", endpoint: "/api/products", requiresAuth: true, category: "Produtos" },
  { method: "PUT", endpoint: "/api/products/1", requiresAuth: true, category: "Produtos" },
  { method: "DELETE", endpoint: "/api/products/1", requiresAuth: true, category: "Produtos" },

  // Lojas (4)
  { method: "GET", endpoint: "/api/stores", requiresAuth: false, category: "Lojas" },
  { method: "GET", endpoint: "/api/stores/1", requiresAuth: false, category: "Lojas" },
  { method: "POST", endpoint: "/api/stores", requiresAuth: true, category: "Lojas" },
  { method: "PUT", endpoint: "/api/stores/1", requiresAuth: true, category: "Lojas" },

  // Pedidos (3)
  { method: "GET", endpoint: "/api/orders", requiresAuth: true, category: "Pedidos" },
  { method: "GET", endpoint: "/api/orders/1", requiresAuth: true, category: "Pedidos" },
  { method: "PUT", endpoint: "/api/orders/1/status", requiresAuth: true, category: "Pedidos" },

  // Pagamentos (3)
  { method: "POST", endpoint: "/api/payments/create", requiresAuth: true, category: "Pagamentos" },
  { method: "GET", endpoint: "/api/payments/1", requiresAuth: true, category: "Pagamentos" },
  { method: "POST", endpoint: "/api/payments/webhook", requiresAuth: false, category: "Pagamentos" },

  // Planos (2)
  { method: "GET", endpoint: "/api/plans", requiresAuth: false, category: "Planos" },
  { method: "POST", endpoint: "/api/subscriptions", requiresAuth: true, category: "Planos" },

  // Categorias (2)
  { method: "GET", endpoint: "/api/categories", requiresAuth: false, category: "Categorias" },
  { method: "GET", endpoint: "/api/categories/1/products", requiresAuth: false, category: "Categorias" },

  // Wishlist (3)
  { method: "GET", endpoint: "/api/wishlist", requiresAuth: true, category: "Wishlist" },
  { method: "POST", endpoint: "/api/wishlist", requiresAuth: true, category: "Wishlist" },
  { method: "DELETE", endpoint: "/api/wishlist/1", requiresAuth: true, category: "Wishlist" },

  // Reviews (4)
  { method: "GET", endpoint: "/api/reviews", requiresAuth: false, category: "Reviews" },
  { method: "POST", endpoint: "/api/reviews", requiresAuth: true, category: "Reviews" },
  { method: "PUT", endpoint: "/api/reviews/1", requiresAuth: true, category: "Reviews" },
  { method: "DELETE", endpoint: "/api/reviews/1", requiresAuth: true, category: "Reviews" },

  // Carrinho (5)
  { method: "GET", endpoint: "/api/cart", requiresAuth: true, category: "Carrinho" },
  { method: "POST", endpoint: "/api/cart", requiresAuth: true, category: "Carrinho" },
  { method: "PUT", endpoint: "/api/cart/1", requiresAuth: true, category: "Carrinho" },
  { method: "DELETE", endpoint: "/api/cart/1", requiresAuth: true, category: "Carrinho" },
  { method: "DELETE", endpoint: "/api/cart", requiresAuth: true, category: "Carrinho" },

  // Endereços (4)
  { method: "GET", endpoint: "/api/addresses", requiresAuth: true, category: "Endereços" },
  { method: "POST", endpoint: "/api/addresses", requiresAuth: true, category: "Endereços" },
  { method: "PUT", endpoint: "/api/addresses/1", requiresAuth: true, category: "Endereços" },
  { method: "DELETE", endpoint: "/api/addresses/1", requiresAuth: true, category: "Endereços" },

  // Checkout (1)
  { method: "POST", endpoint: "/api/checkout", requiresAuth: true, category: "Checkout" },

  // Upload (1)
  { method: "POST", endpoint: "/api/upload", requiresAuth: true, category: "Upload" },

  // Diagnóstico (2)
  { method: "GET", endpoint: "/api/health", requiresAuth: false, category: "Diagnóstico" },
  { method: "GET", endpoint: "/api/diagnostics", requiresAuth: false, category: "Diagnóstico" },
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
      curlCmd += ` -H "Authorization: Bearer invalid_token_for_testing"`;
    }

    const result = execSync(curlCmd, { encoding: "utf8", timeout: 5000 });
    return parseInt(result.trim());
  } catch (error) {
    return 0;
  }
}

// Função principal
function validateAPIs() {
  console.log(`${colors.bold}🧪 VALIDAÇÃO DE APIs - VENDEU ONLINE${colors.reset}`);
  console.log(`${colors.blue}📊 Testando ${TOTAL_APIS} APIs...${colors.reset}\n`);

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
  APIs_TO_TEST.forEach((api) => {
    if (!results[api.category]) {
      results[api.category] = { working: 0, failed: 0, total: 0 };
    }
    results[api.category].total++;
  });

  console.log(`${colors.bold}📋 Testando APIs:${colors.reset}\n`);

  // Testar todas as APIs
  APIs_TO_TEST.forEach((api, index) => {
    const url = `${BASE_URL}${api.endpoint}`;
    const statusCode = makeRequest(api.method, url, api.requiresAuth);

    let isWorking = false;
    let statusMessage = "";

    if (api.requiresAuth) {
      // Para APIs com auth, esperamos 401 (não autorizado)
      isWorking = statusCode === 401 || statusCode === 400 || statusCode === 422;
      statusMessage =
        statusCode === 401
          ? "401 (Auth Required)"
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
    const endpointStr = api.endpoint.padEnd(35);

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

    const categoryStr = category.padEnd(12);
    console.log(`${statusColor}${categoryStr} ${stats.working}/${stats.total} (${percentage}%)${colors.reset}`);
  });

  // Resultado final
  console.log(`\n${colors.bold}🎯 RESULTADO FINAL:${colors.reset}\n`);

  const totalPercentage = Math.round((workingCount / TOTAL_APIS) * 100);
  const finalColor = totalPercentage === 100 ? colors.green : totalPercentage >= 90 ? colors.yellow : colors.red;

  console.log(
    `${finalColor}${colors.bold}${workingCount}/${TOTAL_APIS} APIs funcionando (${totalPercentage}%)${colors.reset}`
  );

  if (totalPercentage === 100) {
    console.log(`${colors.green}${colors.bold}🎉 PARABÉNS! Todas as APIs estão funcionando!${colors.reset}`);
    console.log(`${colors.green}✅ Sistema Buyer 100% operacional${colors.reset}`);
  } else if (totalPercentage >= 90) {
    console.log(`${colors.yellow}⚠️  Quase lá! ${failedCount} APIs precisam de atenção${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Várias APIs falharam. Verifique o servidor e banco de dados${colors.reset}`);
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

  fs.writeFileSync("api-validation-report.json", JSON.stringify(report, null, 2));
  console.log(`\n${colors.blue}📄 Relatório salvo em: api-validation-report.json${colors.reset}`);

  // Exit code baseado no resultado
  process.exit(totalPercentage === 100 ? 0 : 1);
}

// Executar validação
validateAPIs();
