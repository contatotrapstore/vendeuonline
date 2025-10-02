#!/bin/bash

echo "Testing Admin Authentication..."

# Login
echo "1. Admin Login:"
TOKEN=$(curl -s -X POST https://www.vendeu.online/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vendeuonline.com","password":"Test123!@#"}' \
  | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no token received"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."

# Test admin stats
echo -e "\n2. Admin Stats:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://www.vendeu.online/api/admin/stats \
  -H "Authorization: Bearer $TOKEN")

if [ "$STATUS" = "200" ]; then
  echo "✅ Admin stats accessible (Status: $STATUS)"

  # Get actual stats
  echo -e "\n3. Fetching stats data:"
  curl -s https://www.vendeu.online/api/admin/stats \
    -H "Authorization: Bearer $TOKEN" | jq '.'
else
  echo "❌ Admin stats blocked (Status: $STATUS)"
fi

# Test diagnostic endpoint
echo -e "\n4. Diagnostic Endpoint:"
curl -s https://www.vendeu.online/api/diag | jq '.buildVersion' || echo "❌ Diagnostic endpoint not ready"