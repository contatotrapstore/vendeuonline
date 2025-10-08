#!/bin/bash

echo "=========================================="
echo "TESTE COMPLETO DAS APIS - RENDER + LOCAL"
echo "=========================================="
echo ""

# CORES
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URLs
RENDER_URL="https://vendeuonline-uqkk.onrender.com"
LOCAL_URL="http://localhost:3001"

# 1. TESTAR LOGIN NO RENDER
echo "1️⃣ TESTANDO LOGIN ADMIN NO RENDER..."
RENDER_RESPONSE=$(curl -s -X POST "$RENDER_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vendeuonline.com","password":"Test123!@#"}')

if echo "$RENDER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Login Render: SUCCESS${NC}"
  RENDER_TOKEN=$(echo "$RENDER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "Token: ${RENDER_TOKEN:0:50}..."
else
  echo -e "${RED}❌ Login Render: FAILED${NC}"
  echo "Response: $RENDER_RESPONSE"
fi

echo ""

# 2. TESTAR STATS NO RENDER
if [ ! -z "$RENDER_TOKEN" ]; then
  echo "2️⃣ TESTANDO API STATS NO RENDER..."
  STATS_RESPONSE=$(curl -s "$RENDER_URL/api/admin/stats" \
    -H "Authorization: Bearer $RENDER_TOKEN")

  if echo "$STATS_RESPONSE" | grep -q 'totalUsers'; then
    echo -e "${GREEN}✅ Stats Render: SUCCESS${NC}"
    echo "$STATS_RESPONSE" | python -m json.tool 2>/dev/null || echo "$STATS_RESPONSE"
  else
    echo -e "${RED}❌ Stats Render: FAILED${NC}"
    echo "$STATS_RESPONSE"
  fi
else
  echo -e "${YELLOW}⏭️ Pulando stats (sem token)${NC}"
fi

echo ""
echo "=========================================="
echo "TESTE LOCAL"
echo "=========================================="
echo ""

# 3. TESTAR LOGIN LOCAL
echo "3️⃣ TESTANDO LOGIN ADMIN LOCAL..."
LOCAL_RESPONSE=$(curl -s -X POST "$LOCAL_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vendeuonline.com","password":"Test123!@#"}')

if echo "$LOCAL_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Login Local: SUCCESS${NC}"
  LOCAL_TOKEN=$(echo "$LOCAL_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  echo "Token: ${LOCAL_TOKEN:0:50}..."
else
  echo -e "${RED}❌ Login Local: FAILED${NC}"
  echo "Response: $LOCAL_RESPONSE"
fi

echo ""

# 4. TESTAR STATS LOCAL
if [ ! -z "$LOCAL_TOKEN" ]; then
  echo "4️⃣ TESTANDO API STATS LOCAL..."
  STATS_LOCAL=$(curl -s "$LOCAL_URL/api/admin/stats" \
    -H "Authorization: Bearer $LOCAL_TOKEN")

  if echo "$STATS_LOCAL" | grep -q 'totalUsers'; then
    echo -e "${GREEN}✅ Stats Local: SUCCESS${NC}"
    echo "$STATS_LOCAL" | python -m json.tool 2>/dev/null || echo "$STATS_LOCAL"
  else
    echo -e "${RED}❌ Stats Local: FAILED${NC}"
    echo "$STATS_LOCAL"
  fi
else
  echo -e "${YELLOW}⏭️ Pulando stats (sem token)${NC}"
fi

echo ""
echo "=========================================="
echo "RESUMO"
echo "=========================================="
echo "Render Login: $([ ! -z "$RENDER_TOKEN" ] && echo "✅" || echo "❌")"
echo "Render Stats: $([ ! -z "$STATS_RESPONSE" ] && echo "✅" || echo "❌")"
echo "Local Login: $([ ! -z "$LOCAL_TOKEN" ] && echo "✅" || echo "❌")"
echo "Local Stats: $([ ! -z "$STATS_LOCAL" ] && echo "✅" || echo "❌")"
echo "=========================================="
