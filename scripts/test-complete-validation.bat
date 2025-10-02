@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo 🔍 VALIDAÇÃO COMPLETA DO MARKETPLACE
echo ========================================
echo.

set "API_URL=http://localhost:3000"
set "RESULTS_FILE=docs\test-results.json"
set "MD_FILE=docs\VALIDACAO-COMPLETA-MARKETPLACE.md"

set /a TOTAL_TESTS=0
set /a PASSED_TESTS=0
set /a FAILED_TESTS=0

echo [INÍCIO] Validação iniciada em %date% %time%
echo.

REM ===== 1. AUTENTICAÇÃO E AUTORIZAÇÃO =====
echo.
echo ========================================
echo 1️⃣ TESTANDO AUTENTICAÇÃO E AUTORIZAÇÃO
echo ========================================
echo.

REM 1.1 Health Check
echo [TEST] Health Check...
curl -s -w "%%{http_code}" -o temp_response.json "%API_URL%/api/health"
set /a TOTAL_TESTS+=1
for /f %%i in (temp_response.json) do (
    findstr /C:"healthy" temp_response.json >nul
    if !errorlevel! equ 0 (
        echo ✅ PASSOU - Health Check OK
        set /a PASSED_TESTS+=1
    ) else (
        echo ❌ FALHOU - Health Check
        set /a FAILED_TESTS+=1
    )
)

REM 1.2 Login Admin
echo.
echo [TEST] Login como ADMIN...
curl -s -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@vendeuonline.com\",\"password\":\"Test123!@#\"}" ^
  -o temp_admin_login.json
set /a TOTAL_TESTS+=1
findstr /C:"token" temp_admin_login.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Login Admin OK
    set /a PASSED_TESTS+=1
    for /f "tokens=2 delims=:," %%a in ('findstr /C:"token" temp_admin_login.json') do (
        set "ADMIN_TOKEN=%%~a"
    )
) else (
    echo ❌ FALHOU - Login Admin
    set /a FAILED_TESTS+=1
)

REM 1.3 Login Seller
echo.
echo [TEST] Login como SELLER...
curl -s -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"seller@vendeuonline.com\",\"password\":\"Test123!@#\"}" ^
  -o temp_seller_login.json
set /a TOTAL_TESTS+=1
findstr /C:"token" temp_seller_login.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Login Seller OK
    set /a PASSED_TESTS+=1
    for /f "tokens=2 delims=:," %%a in ('findstr /C:"token" temp_seller_login.json') do (
        set "SELLER_TOKEN=%%~a"
    )
) else (
    echo ❌ FALHOU - Login Seller
    set /a FAILED_TESTS+=1
)

REM 1.4 Login Buyer
echo.
echo [TEST] Login como BUYER...
curl -s -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"buyer@vendeuonline.com\",\"password\":\"Test123!@#\"}" ^
  -o temp_buyer_login.json
set /a TOTAL_TESTS+=1
findstr /C:"token" temp_buyer_login.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Login Buyer OK
    set /a PASSED_TESTS+=1
    for /f "tokens=2 delims=:," %%a in ('findstr /C:"token" temp_buyer_login.json') do (
        set "BUYER_TOKEN=%%~a"
    )
) else (
    echo ❌ FALHOU - Login Buyer
    set /a FAILED_TESTS+=1
)

REM 1.5 Login com senha incorreta
echo.
echo [TEST] Login com senha incorreta...
curl -s -X POST "%API_URL%/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@vendeuonline.com\",\"password\":\"wrongpassword\"}" ^
  -o temp_wrong_pass.json
set /a TOTAL_TESTS+=1
findstr /C:"error" temp_wrong_pass.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Senha incorreta rejeitada
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Senha incorreta aceita
    set /a FAILED_TESTS+=1
)

REM ===== 2. FLUXO BUYER =====
echo.
echo ========================================
echo 2️⃣ TESTANDO FLUXO BUYER
echo ========================================
echo.

REM 2.1 Listar produtos
echo [TEST] Listar produtos (público)...
curl -s "%API_URL%/api/products" -o temp_products.json
set /a TOTAL_TESTS+=1
findstr /C:"products" temp_products.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Listagem de produtos OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Listagem de produtos
    set /a FAILED_TESTS+=1
)

REM 2.2 Listar categorias
echo.
echo [TEST] Listar categorias...
curl -s "%API_URL%/api/categories" -o temp_categories.json
set /a TOTAL_TESTS+=1
findstr /C:"categories" temp_categories.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Listagem de categorias OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Listagem de categorias
    set /a FAILED_TESTS+=1
)

REM 2.3 Visualizar carrinho (autenticado)
echo.
echo [TEST] Visualizar carrinho (autenticado)...
curl -s -H "Authorization: Bearer %BUYER_TOKEN%" "%API_URL%/api/cart" -o temp_cart.json
set /a TOTAL_TESTS+=1
findstr /C:"items" temp_cart.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Carrinho autenticado OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Carrinho autenticado
    set /a FAILED_TESTS+=1
)

REM 2.4 Visualizar wishlist (autenticado)
echo.
echo [TEST] Visualizar wishlist (autenticado)...
curl -s -H "Authorization: Bearer %BUYER_TOKEN%" "%API_URL%/api/wishlist" -o temp_wishlist.json
set /a TOTAL_TESTS+=1
findstr /C:"wishlist" temp_wishlist.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Wishlist autenticada OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Wishlist autenticada
    set /a FAILED_TESTS+=1
)

REM ===== 3. FLUXO SELLER =====
echo.
echo ========================================
echo 3️⃣ TESTANDO FLUXO SELLER
echo ========================================
echo.

REM 3.1 Listar produtos do seller
echo [TEST] Listar produtos do seller...
curl -s -H "Authorization: Bearer %SELLER_TOKEN%" "%API_URL%/api/products" -o temp_seller_products.json
set /a TOTAL_TESTS+=1
findstr /C:"products" temp_seller_products.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Produtos do seller OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Produtos do seller
    set /a FAILED_TESTS+=1
)

REM 3.2 Analytics do seller
echo.
echo [TEST] Analytics do seller...
curl -s -H "Authorization: Bearer %SELLER_TOKEN%" "%API_URL%/api/seller/analytics" -o temp_seller_analytics.json
set /a TOTAL_TESTS+=1
findstr /C:"revenue" temp_seller_analytics.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Analytics do seller OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Analytics do seller
    set /a FAILED_TESTS+=1
)

REM 3.3 Perfil da loja
echo.
echo [TEST] Perfil da loja do seller...
curl -s -H "Authorization: Bearer %SELLER_TOKEN%" "%API_URL%/api/stores/profile" -o temp_store_profile.json
set /a TOTAL_TESTS+=1
findstr /C:"store" temp_store_profile.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Perfil da loja OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Perfil da loja
    set /a FAILED_TESTS+=1
)

REM 3.4 Planos disponíveis
echo.
echo [TEST] Listar planos disponíveis...
curl -s "%API_URL%/api/plans" -o temp_plans.json
set /a TOTAL_TESTS+=1
findstr /C:"plans" temp_plans.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Planos disponíveis OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Planos disponíveis
    set /a FAILED_TESTS+=1
)

REM ===== 4. FLUXO ADMIN =====
echo.
echo ========================================
echo 4️⃣ TESTANDO FLUXO ADMIN
echo ========================================
echo.

REM 4.1 Estatísticas admin
echo [TEST] Estatísticas gerais (admin)...
curl -s -H "Authorization: Bearer %ADMIN_TOKEN%" "%API_URL%/api/admin/stats" -o temp_admin_stats.json
set /a TOTAL_TESTS+=1
findstr /C:"users" temp_admin_stats.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Estatísticas admin OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Estatísticas admin
    set /a FAILED_TESTS+=1
)

REM 4.2 Listar usuários (admin)
echo.
echo [TEST] Listar usuários (admin)...
curl -s -H "Authorization: Bearer %ADMIN_TOKEN%" "%API_URL%/api/admin/users" -o temp_admin_users.json
set /a TOTAL_TESTS+=1
findstr /C:"users" temp_admin_users.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Listar usuários admin OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Listar usuários admin
    set /a FAILED_TESTS+=1
)

REM 4.3 Listar lojas (admin)
echo.
echo [TEST] Listar lojas (admin)...
curl -s -H "Authorization: Bearer %ADMIN_TOKEN%" "%API_URL%/api/admin/stores" -o temp_admin_stores.json
set /a TOTAL_TESTS+=1
findstr /C:"stores" temp_admin_stores.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Listar lojas admin OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Listar lojas admin
    set /a FAILED_TESTS+=1
)

REM 4.4 Listar assinaturas (admin)
echo.
echo [TEST] Listar assinaturas (admin)...
curl -s -H "Authorization: Bearer %ADMIN_TOKEN%" "%API_URL%/api/admin/subscriptions" -o temp_admin_subs.json
set /a TOTAL_TESTS+=1
findstr /C:"subscriptions" temp_admin_subs.json >nul
if !errorlevel! equ 0 (
    echo ✅ PASSOU - Listar assinaturas admin OK
    set /a PASSED_TESTS+=1
) else (
    echo ❌ FALHOU - Listar assinaturas admin
    set /a FAILED_TESTS+=1
)

REM ===== RESUMO FINAL =====
echo.
echo ========================================
echo 📊 RESUMO FINAL DA VALIDAÇÃO
echo ========================================
echo.
echo Total de Testes: %TOTAL_TESTS%
echo ✅ Passaram: %PASSED_TESTS%
echo ❌ Falharam: %FAILED_TESTS%

set /a SUCCESS_RATE=(%PASSED_TESTS%*100)/%TOTAL_TESTS%
echo 📈 Taxa de Sucesso: %SUCCESS_RATE%%%
echo.

if %FAILED_TESTS% equ 0 (
    echo ✅✅✅ TODOS OS TESTES PASSARAM! ✅✅✅
) else (
    echo ⚠️ ATENÇÃO: Há %FAILED_TESTS% teste(s) falhando
)

echo.
echo [FIM] Validação concluída em %date% %time%
echo.

REM Limpar arquivos temporários
del temp_*.json 2>nul

pause
