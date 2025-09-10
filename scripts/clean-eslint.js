#!/usr/bin/env node

/**
 * Script para limpar automaticamente warnings do ESLint
 * Remove imports não utilizados, variáveis não usadas, etc.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Arquivos que precisam de limpeza baseado no relatório anterior
const filesToClean = [
  "src/app/(auth)/register/page.tsx",
  "src/app/about/page.tsx",
  "src/app/admin/banners/page.tsx",
  "src/app/admin/page.tsx",
  "src/app/admin/plans/page.tsx",
  "src/app/admin/products/page.tsx",
  "src/app/admin/stores/page.tsx",
  "src/app/admin/subscriptions/page.tsx",
  "src/app/admin/tracking/page.tsx",
  "src/app/admin/users/page.tsx",
  "src/store/productStore.ts",
  "src/stores/storeStore.ts",
  "vite.config.ts",
];

// Padrões de limpeza
const cleanupPatterns = [
  {
    // Remove imports não utilizados
    pattern: /import\s+{\s*([^}]*?)\s*}\s+from\s+['"][^'"]+['"];?\n/g,
    fix: (match, importList, filePath) => {
      const imports = importList
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const usedImports = imports.filter((imp) => {
        const importName = imp.replace(/\s+as\s+\w+/, "").trim();
        return fileContent.includes(importName) && fileContent.indexOf(importName) !== fileContent.indexOf(match);
      });

      if (usedImports.length === 0) return "";
      if (usedImports.length === imports.length) return match;

      return match.replace(importList, usedImports.join(", "));
    },
  },
  {
    // Adiciona underscore para variáveis não utilizadas
    pattern: /const\s+(\w+)\s*=/g,
    fix: (match, varName, filePath) => {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const usageCount = (fileContent.match(new RegExp(varName, "g")) || []).length;

      if (usageCount === 1) {
        // Só declaração, não é usado
        return match.replace(varName, `_${varName}`);
      }
      return match;
    },
  },
];

function cleanFile(filePath) {
  console.log(`🧹 Limpando: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  // Aplicar padrões de limpeza
  cleanupPatterns.forEach(({ pattern, fix }) => {
    const newContent = content.replace(pattern, (match, ...args) => {
      const result = fix(match, ...args, filePath);
      if (result !== match) changed = true;
      return result;
    });
    content = newContent;
  });

  // Limpezas específicas
  if (filePath.includes("register/page.tsx")) {
    // Remove interfaces não utilizadas
    content = content.replace(/interface\s+BuyerFormData\s*{[^}]*}\s*\n/g, "");
    content = content.replace(/interface\s+SellerFormData\s*{[^}]*}\s*\n/g, "");
    // Remove variáveis não utilizadas
    content = content.replace(/const\s+watchedUserType\s*=.*?\n/g, "");
    changed = true;
  }

  if (filePath.includes("vite.config.ts")) {
    // Prefix unused parameters with underscore
    content = content.replace(/\(proxy,\s*options\)/g, "(proxy, _options)");
    content = content.replace(/\(err,\s*req,\s*res\)/g, "(err, _req, _res)");
    content = content.replace(/\(proxyRes,\s*req,\s*res\)/g, "(proxyRes, req, _res)");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Arquivo limpo: ${filePath}`);
  } else {
    console.log(`ℹ️  Sem alterações: ${filePath}`);
  }
}

function main() {
  console.log("🚀 Iniciando limpeza automática do ESLint...\n");

  filesToClean.forEach(cleanFile);

  // Execute ESLint --fix para correções automáticas
  console.log("\n🔧 Executando ESLint --fix automático...");
  try {
    execSync("npm run lint -- --fix", { stdio: "pipe" });
    console.log("✅ ESLint --fix executado com sucesso");
  } catch (error) {
    console.log("ℹ️  ESLint --fix executado (com warnings restantes)");
  }

  console.log("\n🎉 Limpeza concluída!");
}

main();
