@echo off
setlocal enabledelayedexpansion

:: TOKENS DE AUTENTICAÇÃO
set "ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkZTk1OTJiNS1lZGQyLTRmMmYtOGY3ZC0zZGNjMWUwMzMzYjgiLCJlbWFpbCI6ImFkbWluQHZlbmRldW9ubGluZS5jb20uYnIiLCJ0eXBlIjoiQURNSU4iLCJuYW1lIjoiQWRtaW5pc3RyYWRvciBQcmluY2lwYWwiLCJpYXQiOjE3NTk0MjMxNTEsImV4cCI6MTc2MDAyNzk1MX0.kNWzsc0EbR3zIM5CBS_GDsPe5ZFt6-cfuAVsoIfPrPw"
set "SELLER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzE3NTk0MjMxNTAxMzZfbmdkb3RrM2k4IiwiZW1haWwiOiJ2ZW5kZWRvckB0ZXN0LmNvbSIsInR5cGUiOiJCVVlFUiIsIm5hbWUiOiJWZW5kZWRvciBUZXN0ZSIsImlhdCI6MTc1OTQyMzE1MiwiZXhwIjoxNzYwMDI3OTUyfQ.EZsaLlAuhKg9gZSt7Is7VRcy8HiQ6ro8xLuInnAJw_Y"
set "BUYER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzE3NTk0MjMxNDg3MTdfZWcxanhvbHQ2IiwiZW1haWwiOiJjb21wcmFkb3JAdGVzdC5jb20iLCJ0eXBlIjoiQlVZRVIiLCJuYW1lIjoiQ29tcHJhZG9yIFRlc3RlIiwiaWF0IjoxNzU5NDIzMTUzLCJleHAiOjE3NjAwMjc5NTN9.RTLEvbzwptbxpz58-FyTLbfJiE_3TnfAXWkm_K7QL4U"

set API_URL=http://localhost:3000
set OUTPUT_FILE=test-results.txt

echo ============================================= > %OUTPUT_FILE%
echo RELATÓRIO DE VALIDAÇÃO COMPLETA DE APIS >> %OUTPUT_FILE%
echo Data: %date% %time% >> %OUTPUT_FILE%
echo ============================================= >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [1/15] Testando Health API...
echo === 1. HEALTH API === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/health >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [2/15] Testando Profile API (Admin)...
echo === 2. PROFILE API (ADMIN) === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/auth/profile -H "Authorization: Bearer %ADMIN_TOKEN%" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [3/15] Testando Produtos - Listar...
echo === 3. PRODUTOS - LISTAR === >> %OUTPUT_FILE%
curl -s -X GET "%API_URL%/api/products?page=1&limit=5" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [4/15] Testando Lojas - Listar...
echo === 4. LOJAS - LISTAR === >> %OUTPUT_FILE%
curl -s -X GET "%API_URL%/api/stores?page=1&limit=5" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [5/15] Testando Categorias...
echo === 5. CATEGORIAS === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/categories >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [6/15] Testando Planos...
echo === 6. PLANOS === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/plans >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [7/15] Testando Wishlist - Listar (Buyer)...
echo === 7. WISHLIST - LISTAR (BUYER) === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/wishlist -H "Authorization: Bearer %BUYER_TOKEN%" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [8/15] Testando Notificações (Admin)...
echo === 8. NOTIFICAÇÕES (ADMIN) === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/notifications -H "Authorization: Bearer %ADMIN_TOKEN%" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [9/15] Testando Admin Dashboard...
echo === 9. ADMIN DASHBOARD === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/admin/dashboard -H "Authorization: Bearer %ADMIN_TOKEN%" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [10/15] Testando Admin - Listar Usuários...
echo === 10. ADMIN - LISTAR USUÁRIOS === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/admin/users -H "Authorization: Bearer %ADMIN_TOKEN%" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [11/15] Testando Tracking Configs...
echo === 11. TRACKING CONFIGS === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/tracking/configs >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [12/15] Testando Endereços (Buyer)...
echo === 12. ENDEREÇOS (BUYER) === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/addresses -H "Authorization: Bearer %BUYER_TOKEN%" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [13/15] Testando Pedidos (Buyer)...
echo === 13. PEDIDOS (BUYER) === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/orders -H "Authorization: Bearer %BUYER_TOKEN%" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [14/15] Testando Cache Status...
echo === 14. CACHE STATUS === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/cache/status >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo [15/15] Testando Admin Analytics...
echo === 15. ADMIN ANALYTICS === >> %OUTPUT_FILE%
curl -s -X GET %API_URL%/api/admin/analytics -H "Authorization: Bearer %ADMIN_TOKEN%" >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%
echo. >> %OUTPUT_FILE%

echo ============================================= >> %OUTPUT_FILE%
echo TESTES FINALIZADOS >> %OUTPUT_FILE%
echo ============================================= >> %OUTPUT_FILE%

echo.
echo Todos os testes foram executados!
echo Resultados salvos em: %OUTPUT_FILE%
echo.

type %OUTPUT_FILE%
