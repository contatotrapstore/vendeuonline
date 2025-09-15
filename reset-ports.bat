@echo off
echo ================================
echo    RESET PORTAS VENDEU ONLINE
echo ================================
echo.
echo Verificando e liberando portas...

REM Verificar e matar processos na porta 3000 (API)
echo Verificando porta 3000 (API)...
netstat -ano | findstr :3000 > nul
if %errorlevel% == 0 (
    echo   - Encontrados processos na porta 3000
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo   - Matando processo PID: %%a
        taskkill /PID %%a /F 2>nul
    )
    echo   - Porta 3000 liberada!
) else (
    echo   - Porta 3000 ja esta livre
)

echo.

REM Verificar e matar processos na porta 5173 (Frontend)
echo Verificando porta 5173 (Frontend)...
netstat -ano | findstr :5173 > nul
if %errorlevel% == 0 (
    echo   - Encontrados processos na porta 5173
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
        echo   - Matando processo PID: %%a
        taskkill /PID %%a /F 2>nul
    )
    echo   - Porta 5173 liberada!
) else (
    echo   - Porta 5173 ja esta livre
)

echo.

REM Verificar outras portas comuns que podem estar em uso
echo Verificando outras portas (3001-3010, 5174-5180)...
for %%p in (3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 5174 5175 5176 5177 5178 5179 5180) do (
    netstat -ano | findstr :%%p > nul
    if %errorlevel% == 0 (
        echo   - Liberando porta %%p
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p') do (
            taskkill /PID %%a /F 2>nul
        )
    )
)

echo.
echo ================================
echo   PORTAS PADRAO LIBERADAS!
echo ================================
echo.
echo Agora voce pode executar:
echo   npm run dev
echo.
echo As portas padrao serao:
echo   API: http://localhost:3000
echo   Frontend: http://localhost:5173
echo.
pause