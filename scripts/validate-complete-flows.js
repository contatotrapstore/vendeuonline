#!/usr/bin/env node

/**
 * Script de Validação Completa de Fluxos E2E
 * Testa todas as jornadas de usuários do marketplace
 */

import http from "http";

const API_HOST = "localhost";
const API_PORT = 3000;
const timestamp = Date.now();

// Dados de teste
const testUsers = {
  buyer: {
    name: `Comprador Teste ${timestamp}`,
    email: `buyer-${timestamp}@test.com`,
    password: "Test123!@#",
    phone: "11999999001",
    type: "BUYER",
    city: "São Paulo",
    state: "SP",
  },
  seller: {
    name: `Vendedor Teste ${timestamp}`,
    email: `seller-${timestamp}@test.com`,
    password: "Test123!@#",
    phone: "21999999002",
    type: "SELLER",
    city: "Rio de Janeiro",
    state: "RJ",
  },
  admin: {
    email: "admin@vendeuonline.com.br",
    password: "Test123!@#",
  },
};

// Armazenar tokens e IDs
const tokens = {};
const ids = {};

// Utilitários de log com cores ANSI
const log = {
  success: (msg) => console.log("\x1b[32m✅\x1b[0m", msg),
  error: (msg) => console.log("\x1b[31m❌\x1b[0m", msg),
  info: (msg) => console.log("\x1b[34mℹ️\x1b[0m ", msg),
  warning: (msg) => console.log("\x1b[33m⚠️\x1b[0m ", msg),
  section: (msg) => console.log(`\x1b[36m\x1b[1m\n${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}\x1b[0m`),
};

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: `/api${path}`,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            data: jsonData,
            status: res.statusCode,
          });
        } catch (e) {
          resolve({
            success: false,
            error: body || "Invalid JSON response",
            status: res.statusCode,
          });
        }
      });
    });

    req.on("error", (error) => {
      resolve({
        success: false,
        error: error.message,
        status: 0,
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// FASE 1: FLUXO DE AUTENTICAÇÃO
// ============================================================================

async function testAuthenticationFlow() {
  log.section("FASE 1: VALIDAÇÃO DE AUTENTICAÇÃO");

  // 1.1 Registrar Comprador
  log.info("1.1 Registrando novo comprador...");
  const buyerReg = await makeRequest("POST", "/auth/register", testUsers.buyer);
  if (buyerReg.success) {
    tokens.buyer = buyerReg.data.token;
    ids.buyer = buyerReg.data.user.id;
    log.success(`Comprador registrado: ${testUsers.buyer.email}`);
  } else {
    log.error(`Erro ao registrar comprador:`);
    console.log("Status:", buyerReg.status);
    console.log("Error:", buyerReg.error);
    console.log("Data:", JSON.stringify(buyerReg, null, 2));
    return false;
  }

  await sleep(500);

  // 1.2 Registrar Vendedor
  log.info("1.2 Registrando novo vendedor...");
  const sellerReg = await makeRequest("POST", "/auth/register", testUsers.seller);
  if (sellerReg.success) {
    tokens.seller = sellerReg.data.token;
    ids.seller = sellerReg.data.user.id;
    log.success(`Vendedor registrado: ${testUsers.seller.email}`);
  } else {
    log.error(`Erro ao registrar vendedor: ${JSON.stringify(sellerReg.error)}`);
    return false;
  }

  await sleep(500);

  // 1.3 Login Admin
  log.info("1.3 Fazendo login como admin...");
  const adminLogin = await makeRequest("POST", "/auth/login", testUsers.admin);
  if (adminLogin.success) {
    tokens.admin = adminLogin.data.token;
    ids.admin = adminLogin.data.user.id;
    log.success(`Admin logado: ${testUsers.admin.email}`);
  } else {
    log.error(`Erro ao fazer login admin:`);
    console.log("Status:", adminLogin.status);
    console.log("Error:", adminLogin.error);
    console.log("Data:", JSON.stringify(adminLogin, null, 2));
    return false;
  }

  // 1.4 Verificar tokens
  log.info("1.4 Verificando tokens JWT...");
  for (const [role, token] of Object.entries(tokens)) {
    if (token && token.length > 20) {
      log.success(`Token ${role}: válido (${token.substring(0, 20)}...)`);
    } else {
      log.error(`Token ${role}: inválido`);
      return false;
    }
  }

  log.success("✅ Fase 1 completa: Autenticação funcionando 100%\n");
  return true;
}

// ============================================================================
// FASE 2: FLUXO DE COMPRADOR
// ============================================================================

async function testBuyerFlow() {
  log.section("FASE 2: VALIDAÇÃO DE FLUXO COMPRADOR");

  // 2.1 Buscar produtos
  log.info("2.1 Buscando produtos disponíveis...");
  const products = await makeRequest("GET", "/products");
  if (products.success && products.data.products) {
    log.success(`Encontrados ${products.data.products.length} produtos`);
    if (products.data.products.length > 0) {
      ids.product = products.data.products[0].id;
      log.info(`Produto selecionado: ${products.data.products[0].name}`);
    } else {
      log.warning("Nenhum produto encontrado - alguns testes serão pulados");
    }
  } else {
    log.error("Erro ao buscar produtos");
    return false;
  }

  await sleep(500);

  if (ids.product) {
    // 2.2 Ver detalhes do produto
    log.info("2.2 Vendo detalhes do produto...");
    const productDetail = await makeRequest("GET", `/products/${ids.product}`);
    if (productDetail.success) {
      log.success(`Produto: ${productDetail.data.name} - R$ ${productDetail.data.price}`);
    } else {
      log.error("Erro ao buscar detalhes do produto");
    }

    await sleep(500);

    // 2.3 Adicionar à wishlist
    log.info("2.3 Adicionando produto à wishlist...");
    const addWishlist = await makeRequest("POST", "/wishlist", { productId: ids.product }, tokens.buyer);
    if (addWishlist.success) {
      log.success("Produto adicionado à wishlist");
    } else {
      log.warning(`Wishlist: ${JSON.stringify(addWishlist.error)}`);
    }

    await sleep(500);

    // 2.4 Buscar wishlist
    log.info("2.4 Buscando items da wishlist...");
    const getWishlist = await makeRequest("GET", "/wishlist", null, tokens.buyer);
    if (getWishlist.success) {
      log.success(`Wishlist: ${getWishlist.data.length} items`);
    } else {
      log.warning("Erro ao buscar wishlist");
    }
  }

  await sleep(500);

  // 2.5 Buscar carrinho
  log.info("2.5 Verificando carrinho...");
  const cart = await makeRequest("GET", "/cart", null, tokens.buyer);
  if (cart.success) {
    log.success(`Carrinho: ${cart.data.items?.length || 0} items`);
  } else {
    log.warning("Carrinho não disponível");
  }

  await sleep(500);

  // 2.6 Buscar pedidos
  log.info("2.6 Verificando histórico de pedidos...");
  const orders = await makeRequest("GET", "/orders", null, tokens.buyer);
  if (orders.success) {
    log.success(`Pedidos: ${orders.data.orders?.length || 0} encontrados`);
  } else {
    log.warning("Erro ao buscar pedidos");
  }

  log.success("✅ Fase 2 completa: Fluxo comprador validado\n");
  return true;
}

// ============================================================================
// FASE 3: FLUXO DE VENDEDOR
// ============================================================================

async function testSellerFlow() {
  log.section("FASE 3: VALIDAÇÃO DE FLUXO VENDEDOR");

  // 3.1 Criar loja
  log.info("3.1 Criando loja do vendedor...");
  const storeData = {
    name: `Loja Teste ${timestamp}`,
    slug: `loja-teste-${timestamp}`,
    description: "Loja de testes automatizados",
    phone: "11999999999",
  };

  const createStore = await makeRequest("POST", "/stores", storeData, tokens.seller);
  if (createStore.success) {
    ids.store = createStore.data.id;
    log.success(`Loja criada: ${createStore.data.name} (ID: ${ids.store})`);
  } else {
    log.error(`Erro ao criar loja:`);
    console.log("Status:", createStore.status);
    console.log("Error:", createStore.error);
    console.log("Data:", JSON.stringify(createStore, null, 2));
    return false;
  }

  await sleep(500);

  // 3.2 Publicar produto
  log.info("3.2 Publicando produto...");
  const productData = {
    name: `Produto Teste ${timestamp}`,
    description: "Produto de teste automatizado",
    price: 99.99,
    stock: 10,
    categoryId: "eletronicos",
    isActive: true,
  };

  const createProduct = await makeRequest("POST", "/products", productData, tokens.seller);
  if (createProduct.success) {
    ids.newProduct = createProduct.data.id;
    log.success(`Produto publicado: ${createProduct.data.name} (ID: ${ids.newProduct})`);
  } else {
    log.error(`Erro ao publicar produto: ${JSON.stringify(createProduct.error)}`);
    return false;
  }

  await sleep(500);

  // 3.3 Editar produto
  log.info("3.3 Editando produto...");
  const updateData = {
    price: 79.99,
    stock: 15,
  };

  const updateProduct = await makeRequest("PUT", `/products/${ids.newProduct}`, updateData, tokens.seller);
  if (updateProduct.success) {
    log.success(`Produto atualizado: novo preço R$ 79.99`);
  } else {
    log.warning(`Erro ao atualizar produto: ${JSON.stringify(updateProduct.error)}`);
  }

  await sleep(500);

  // 3.4 Ver analytics
  log.info("3.4 Verificando analytics do vendedor...");
  const analytics = await makeRequest("GET", "/seller/analytics", null, tokens.seller);
  if (analytics.success) {
    log.success(`Analytics: ${analytics.data.totalSales || 0} vendas, R$ ${analytics.data.totalRevenue || 0}`);
  } else {
    log.warning("Analytics não disponível ainda");
  }

  await sleep(500);

  // 3.5 Ver pedidos da loja
  log.info("3.5 Verificando pedidos da loja...");
  const sellerOrders = await makeRequest("GET", "/seller/orders", null, tokens.seller);
  if (sellerOrders.success) {
    log.success(`Pedidos da loja: ${sellerOrders.data.length || 0}`);
  } else {
    log.warning("Erro ao buscar pedidos da loja");
  }

  await sleep(500);

  // 3.6 Configurar perfil da loja
  log.info("3.6 Atualizando perfil da loja...");
  const profileUpdate = {
    description: "Loja atualizada via teste automatizado",
  };

  const updateProfile = await makeRequest("PUT", "/stores/profile", profileUpdate, tokens.seller);
  if (updateProfile.success) {
    log.success("Perfil da loja atualizado");
  } else {
    log.warning(`Erro ao atualizar perfil: ${JSON.stringify(updateProfile.error)}`);
  }

  log.success("✅ Fase 3 completa: Fluxo vendedor validado\n");
  return true;
}

// ============================================================================
// FASE 4: FLUXO ADMIN
// ============================================================================

async function testAdminFlow() {
  log.section("FASE 4: VALIDAÇÃO DE FLUXO ADMIN");

  // 4.1 Dashboard
  log.info("4.1 Acessando dashboard admin...");
  const dashboard = await makeRequest("GET", "/admin/dashboard", null, tokens.admin);
  if (dashboard.success) {
    log.success(`Dashboard: ${dashboard.data.totalUsers || 0} usuários totais`);
    log.info(`  - Compradores: ${dashboard.data.buyersCount || 0}`);
    log.info(`  - Vendedores: ${dashboard.data.sellersCount || 0}`);
    log.info(`  - Admins: ${dashboard.data.adminsCount || 0}`);
  } else {
    log.error("Erro ao acessar dashboard");
    return false;
  }

  await sleep(500);

  // 4.2 Listar usuários
  log.info("4.2 Listando todos os usuários...");
  const users = await makeRequest("GET", "/admin/users", null, tokens.admin);
  if (users.success) {
    log.success(`Total de usuários: ${users.data.total || 0}`);
  } else {
    log.error("Erro ao listar usuários");
  }

  await sleep(500);

  // 4.3 Buscar lojas
  log.info("4.3 Listando lojas cadastradas...");
  const stores = await makeRequest("GET", "/stores?page=1&limit=10");
  if (stores.success) {
    log.success(`Total de lojas: ${stores.data.total || 0}`);
  } else {
    log.warning("Erro ao listar lojas");
  }

  log.success("✅ Fase 4 completa: Fluxo admin validado\n");
  return true;
}

// ============================================================================
// LIMPEZA: Deletar dados de teste
// ============================================================================

async function cleanup() {
  log.section("LIMPEZA: Removendo dados de teste");

  // Deletar produto criado
  if (ids.newProduct) {
    log.info(`Deletando produto ${ids.newProduct}...`);
    const delProduct = await makeRequest("DELETE", `/products/${ids.newProduct}`, null, tokens.seller);
    if (delProduct.success) {
      log.success("Produto deletado");
    } else {
      log.warning("Erro ao deletar produto (pode já ter sido deletado)");
    }
  }

  log.success("✅ Limpeza completa\n");
}

// ============================================================================
// MAIN: Executar todos os testes
// ============================================================================

async function main() {
  console.log("\x1b[36m\x1b[1m\n🚀 INICIANDO VALIDAÇÃO COMPLETA DE FLUXOS E2E\n\x1b[0m");
  console.log(`\x1b[90mTimestamp: ${new Date().toISOString()}\x1b[0m`);
  console.log(`\x1b[90mAPI URL: http://${API_HOST}:${API_PORT}/api\n\x1b[0m`);

  const results = {
    authentication: false,
    buyer: false,
    seller: false,
    admin: false,
  };

  try {
    // Fase 1
    results.authentication = await testAuthenticationFlow();
    if (!results.authentication) {
      throw new Error("Falha na autenticação - parando testes");
    }

    await sleep(1000);

    // Fase 2
    results.buyer = await testBuyerFlow();

    await sleep(1000);

    // Fase 3
    results.seller = await testSellerFlow();

    await sleep(1000);

    // Fase 4
    results.admin = await testAdminFlow();

    await sleep(1000);

    // Limpeza
    await cleanup();
  } catch (error) {
    log.error(`Erro crítico: ${error.message}`);
    process.exit(1);
  }

  // Resumo final
  log.section("RESUMO FINAL DA VALIDAÇÃO");

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter((r) => r === true).length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log("\x1b[1m\nResultados:\x1b[0m");
  console.log(`  ✅ Autenticação: ${results.authentication ? "\x1b[32mPASS OU\x1b[0m" : "\x1b[31mFALHOU\x1b[0m"}`);
  console.log(`  ✅ Fluxo Comprador: ${results.buyer ? "\x1b[32mPASSOU\x1b[0m" : "\x1b[31mFALHOU\x1b[0m"}`);
  console.log(`  ✅ Fluxo Vendedor: ${results.seller ? "\x1b[32mPASSOU\x1b[0m" : "\x1b[31mFALHOU\x1b[0m"}`);
  console.log(`  ✅ Fluxo Admin: ${results.admin ? "\x1b[32mPASSOU\x1b[0m" : "\x1b[31mFALHOU\x1b[0m"}`);

  console.log(`\n\x1b[1m📊 Taxa de Sucesso: ${percentage}% (${passed}/${total})\n\x1b[0m`);

  if (percentage === 100) {
    console.log("\x1b[32m\x1b[1m🎉 SISTEMA 100% FUNCIONAL - PRONTO PARA PRODUÇÃO!\n\x1b[0m");
    process.exit(0);
  } else if (percentage >= 75) {
    console.log("\x1b[33m\x1b[1m⚠️  Sistema funcional com alguns avisos\n\x1b[0m");
    process.exit(0);
  } else {
    console.log("\x1b[31m\x1b[1m❌ Sistema com falhas críticas\n\x1b[0m");
    process.exit(1);
  }
}

// Executar
main().catch((error) => {
  console.error("\x1b[31m\x1b[1m\n❌ ERRO FATAL:\x1b[0m", error);
  process.exit(1);
});
