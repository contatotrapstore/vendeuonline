#!/bin/bash

# Script para executar limpeza do banco via API
# Mantém apenas conta admin

API_URL="https://vendeuonline-uqkk.onrender.com"
ADMIN_EMAIL="admin@vendeuonline.com"
ADMIN_PASSWORD="Test123!@#"

echo "🔐 Fazendo login como admin..."

# 1. Login para obter token
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login. Resposta:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login realizado com sucesso!"
echo ""

# 2. Executar limpeza
echo "🗑️  Executando limpeza do banco..."
echo "⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!"
echo ""

CLEANUP_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/cleanup-database" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "📊 RESULTADO:"
echo "$CLEANUP_RESPONSE" | python -m json.tool

echo ""
echo "✅ Limpeza concluída!"
