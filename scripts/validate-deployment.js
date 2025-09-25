#!/usr/bin/env node

/**
 * Script para validar o deployment do Vendeu Online
 * Testa endpoints críticos e configurações
 */

import fetch from "node-fetch";
import { execSync } from "child_process";
import { readFileSync } from "fs";

const PRODUCTION_URL = "https://www.vendeu.online";
const CRITICAL_ENDPOINTS = ["/api/health", "/api/products", "/api/categories", "/api/plans", "/api/diagnostics"];

const FRONTEND_ROUTES = ["/", "/admin", "/seller", "/products", "/about"];

console.log("🚀 VALIDANDO DEPLOYMENT DO VENDEU ONLINE\n");

async function testEndpoint(url) {
  try {
    const response = await fetch(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "VendeuOnline-Deploy-Validator/1.0",
      },
    });

    return {
      status: response.status,
      ok: response.ok,
      size: response.headers.get("content-length") || "unknown",
    };
  } catch (error) {
    return {
      status: "ERROR",
      ok: false,
      error: error.message,
    };
  }
}

async function validateAPIs() {
  console.log("📡 TESTANDO APIs CRÍTICAS...\n");

  let successCount = 0;

  for (const endpoint of CRITICAL_ENDPOINTS) {
    const url = PRODUCTION_URL + endpoint;
    const result = await testEndpoint(url);

    if (result.ok) {
      console.log(`✅ ${endpoint} - Status: ${result.status} (${result.size} bytes)`);
      successCount++;
    } else {
      console.log(`❌ ${endpoint} - Status: ${result.status || result.error}`);
    }
  }

  console.log(`\n📊 APIs: ${successCount}/${CRITICAL_ENDPOINTS.length} funcionando\n`);
  return successCount === CRITICAL_ENDPOINTS.length;
}

async function validateFrontend() {
  console.log("🎨 TESTANDO ROTAS DO FRONTEND...\n");

  let successCount = 0;

  for (const route of FRONTEND_ROUTES) {
    const url = PRODUCTION_URL + route;
    const result = await testEndpoint(url);

    if (result.ok) {
      console.log(`✅ ${route} - Status: ${result.status}`);
      successCount++;
    } else {
      console.log(`❌ ${route} - Status: ${result.status || result.error}`);
    }
  }

  console.log(`\n📊 Frontend: ${successCount}/${FRONTEND_ROUTES.length} rotas funcionando\n`);
  return successCount === FRONTEND_ROUTES.length;
}

function validateBuild() {
  console.log("🔨 VALIDANDO BUILD LOCAL...\n");

  try {
    // Verificar se dist existe
    const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));
    console.log(`✅ Package: ${packageJson.name} v${packageJson.version}`);

    // Testar TypeScript
    execSync("npx tsc --noEmit", { stdio: "pipe" });
    console.log("✅ TypeScript: Sem erros de tipos");

    // Testar ESLint
    execSync("npm run lint", { stdio: "pipe" });
    console.log("✅ ESLint: Código aprovado");

    console.log("\n🎯 Build local validado!\n");
    return true;
  } catch (error) {
    console.log(`❌ Build Error: ${error.message}`);
    return false;
  }
}

async function main() {
  const buildOk = validateBuild();
  const apisOk = await validateAPIs();
  const frontendOk = await validateFrontend();

  console.log("📋 RESUMO DO DEPLOYMENT:");
  console.log(`🔨 Build Local: ${buildOk ? "✅ OK" : "❌ FALHA"}`);
  console.log(`📡 APIs: ${apisOk ? "✅ OK" : "❌ FALHA"}`);
  console.log(`🎨 Frontend: ${frontendOk ? "✅ OK" : "❌ FALHA"}`);

  if (buildOk && apisOk && frontendOk) {
    console.log("\n🎉 DEPLOYMENT 100% FUNCIONAL!");
    process.exit(0);
  } else {
    console.log("\n⚠️  DEPLOYMENT COM PROBLEMAS - VERIFICAR CONFIGURAÇÕES");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Erro na validação:", error);
  process.exit(1);
});
