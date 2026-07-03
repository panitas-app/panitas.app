@echo off
cd /d "%~dp0"
echo.
echo  ==================================================
echo    PANITAS — Configuracion Inicial (Superadmin)
echo  ==================================================
echo.
node scripts/admin-cli.mjs --setup
if %errorlevel% neq 0 (
  echo.
  echo  Cerrando en 5 segundos...
  timeout /t 5 >nul
)
pause
