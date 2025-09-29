#!/usr/bin/env node

/**
 * 🚀 VALIDADOR DE DEPLOY VERCEL - VENDEU ONLINE
 *
 * Script para validar se todas as correções foram aplicadas corretamente
 * e se o projeto está funcionando no Vercel
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

console.log("🔍 VALIDADOR DE DEPLOY VERCEL - VENDEU ONLINE");
console.log("=".repeat(50));

let errors = [];
let warnings = [];

// 1. Verificar estrutura de arquivos API
console.log("\n📁 1. Verificando estrutura de arquivos API...");

const requiredApiFiles = [
  "api/index.js",
  "api/lib/prisma.js",
  "api/lib/logger.js",
  "api/lib/supabase-anon.js",
  "api/lib/supabase-fetch.js",
  "api/tracking/configs.js",
];

requiredApiFiles.forEach((file) => {
  const filePath = join(projectRoot, file);
  if (existsSync(filePath)) {
    console.log(`✅ ${file} - Existe`);
  } else {
    console.log(`❌ ${file} - Não encontrado`);
    errors.push(`Arquivo obrigatório não encontrado: ${file}`);
  }
});

// 2. Verificar imports corretos no arquivo API
console.log("\n🔗 2. Verificando imports no arquivo API...");

try {
  const apiContent = readFileSync(join(projectRoot, "api/index.js"), "utf8");

  // Verificar se não há imports incorretos
  const badImports = apiContent.match(/from\s+["']\.\.\/lib\//g);
  if (badImports) {
    console.log(`❌ Encontrados ${badImports.length} imports incorretos (../lib/)`);
    errors.push("Arquivo api/index.js contém imports incorretos para ../lib/");
  } else {
    console.log("✅ Imports de ../lib/ corrigidos");
  }

  // Verificar se há imports corretos
  const goodImports = apiContent.match(/from\s+["']\.\//g);
  if (goodImports) {
    console.log(`✅ Encontrados ${goodImports.length} imports corretos (./lib/)`);
  }

  // Verificar se não há NEXT_PUBLIC_ no backend
  const nextPublicVars = apiContent.match(/NEXT_PUBLIC_/g);
  if (nextPublicVars) {
    console.log(`⚠️  Encontradas ${nextPublicVars.length} referências a NEXT_PUBLIC_`);
    warnings.push("Arquivo api/index.js ainda contém referências a NEXT_PUBLIC_");
  } else {
    console.log("✅ Variáveis NEXT_PUBLIC_ removidas do backend");
  }
} catch (error) {
  console.log(`❌ Erro ao ler api/index.js: ${error.message}`);
  errors.push("Não foi possível ler o arquivo api/index.js");
}

// 3. Verificar configuração do frontend
console.log("\n⚙️  3. Verificando configuração do frontend...");

try {
  const apiConfigContent = readFileSync(join(projectRoot, "src/config/api.ts"), "utf8");

  // Verificar se API_BASE_URL está vazio
  if (apiConfigContent.includes('export const API_BASE_URL = "";')) {
    console.log("✅ API_BASE_URL configurado para caminho relativo");
  } else {
    console.log("❌ API_BASE_URL não está configurado corretamente");
    errors.push("API_BASE_URL deveria ser string vazia para Vercel");
  }

  // Verificar se buildApiUrl usa /api/
  if (apiConfigContent.includes("return `/api/")) {
    console.log("✅ buildApiUrl configurado para usar /api/");
  } else {
    console.log("❌ buildApiUrl não está configurado corretamente");
    errors.push("buildApiUrl deve sempre retornar caminhos que iniciem com /api/");
  }
} catch (error) {
  console.log(`❌ Erro ao ler src/config/api.ts: ${error.message}`);
  errors.push("Não foi possível ler o arquivo src/config/api.ts");
}

// 4. Verificar vercel.json
console.log("\n🚀 4. Verificando configuração do Vercel...");

try {
  const vercelConfig = JSON.parse(readFileSync(join(projectRoot, "vercel.json"), "utf8"));

  // Verificar rewrites
  if (vercelConfig.rewrites && vercelConfig.rewrites.length >= 3) {
    console.log("✅ Rewrites configurados no vercel.json");

    const apiRewrite = vercelConfig.rewrites.find((r) => r.source === "/api/(.*)");
    if (apiRewrite && apiRewrite.destination === "/api/index") {
      console.log("✅ Rewrite para APIs configurado corretamente");
    } else {
      console.log("❌ Rewrite para APIs incorreto");
      errors.push("Rewrite /api/(.*) deve apontar para /api/index");
    }
  } else {
    console.log("❌ Rewrites não configurados adequadamente");
    errors.push("vercel.json deve ter pelo menos 3 rewrites configurados");
  }

  // Verificar functions
  if (vercelConfig.functions && vercelConfig.functions["api/*.js"]) {
    console.log("✅ Configuração de serverless functions encontrada");
  } else {
    console.log("⚠️  Configuração de serverless functions não encontrada");
    warnings.push("Considere adicionar configuração para api/*.js em vercel.json");
  }
} catch (error) {
  console.log(`❌ Erro ao ler vercel.json: ${error.message}`);
  errors.push("Não foi possível ler ou parsear o arquivo vercel.json");
}

// 5. Verificar arquivo .env.vercel
console.log("\n🔐 5. Verificando variáveis de ambiente...");

try {
  const envContent = readFileSync(join(projectRoot, ".env.vercel"), "utf8");

  const requiredVars = [
    "DATABASE_URL",
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET",
    "NODE_ENV",
  ];

  let foundVars = 0;
  requiredVars.forEach((varName) => {
    if (envContent.includes(`${varName}=`)) {
      console.log(`✅ ${varName} - Definida`);
      foundVars++;
    } else {
      console.log(`❌ ${varName} - Não encontrada`);
      errors.push(`Variável obrigatória não encontrada: ${varName}`);
    }
  });

  console.log(`📊 Total: ${foundVars}/${requiredVars.length} variáveis encontradas`);
} catch (error) {
  console.log(`❌ Erro ao ler .env.vercel: ${error.message}`);
  errors.push("Não foi possível ler o arquivo .env.vercel");
}

// 6. Relatório final
console.log("\n" + "=".repeat(50));
console.log("📊 RELATÓRIO FINAL");
console.log("=".repeat(50));

if (errors.length === 0 && warnings.length === 0) {
  console.log("🎉 PERFEITO! Todas as correções foram aplicadas com sucesso!");
  console.log("✅ O projeto está pronto para deploy no Vercel");
  console.log("\n📋 PRÓXIMOS PASSOS:");
  console.log("1. Copie as variáveis de .env.vercel para o dashboard do Vercel");
  console.log("2. Faça commit e push das alterações");
  console.log("3. O Vercel fará o deploy automaticamente");
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`❌ ERROS ENCONTRADOS (${errors.length}):`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (warnings.length > 0) {
    console.log(`⚠️  AVISOS (${warnings.length}):`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }

  if (errors.length > 0) {
    console.log("\n🔧 Corrija os erros acima antes de fazer deploy no Vercel");
    process.exit(1);
  } else {
    console.log("\n✅ Sem erros críticos, mas verifique os avisos acima");
    process.exit(0);
  }
}
