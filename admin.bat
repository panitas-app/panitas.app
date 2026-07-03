@echo off
cd /d "%~dp0"
title PANITAS - Admin Panel

:: ─────────────────────────────────────────
:: Leer o generar ADMIN_SECRET
:: ─────────────────────────────────────────
set "ENV_FILE=.env"
set "ADMIN_SECRET="

for /f "usebackq tokens=1,2 delims==" %%a in ("%ENV_FILE%") do (
  if "%%a"=="ADMIN_SECRET" set "ADMIN_SECRET=%%b"
)

if "%ADMIN_SECRET%"=="" (
  echo Generando ADMIN_SECRET...
  for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set "ADMIN_SECRET=%%i"
  echo ADMIN_SECRET=%ADMIN_SECRET%>> "%ENV_FILE%"
  echo ADMIN_SECRET generado y guardado en .env
)

echo.
echo  ==================================================
echo    PANITAS — Panel de Administracion
echo  ==================================================
echo.
echo  Abriendo panel de administracion...
start http://localhost:3000/admin/login?secret=%ADMIN_SECRET%
echo.
echo  Servidor iniciado en http://localhost:3000
echo  Cierra esta ventana para detener el servidor.
echo.
npm run dev
pause
