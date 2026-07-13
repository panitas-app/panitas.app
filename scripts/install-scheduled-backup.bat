@echo off
REM ══════════════════════════════════════════════════════════════
REM  Instala una tarea programada en Windows que respalda la BD
REM  cada día a las 4:00 AM
REM ══════════════════════════════════════════════════════════════
echo.
echo  🔒 Instalando respaldo automático diario...
echo.

set TASK_NAME="Panitas Backup DB"
set SCRIPT_PATH=%~dp0backup-db.js
set NODE_PATH=%~dp0..\node_modules\.bin\node.exe

if not exist "%NODE_PATH%" (
  set NODE_PATH=node
)

schtasks /CREATE /SC DAILY /TN %TASK_NAME% /TR "%NODE_PATH% %SCRIPT_PATH%" /ST 04:00 /F

if %ERRORLEVEL% equ 0 (
  echo  ✅ Tarea programada instalada correctamente.
  echo     La BD se respaldará automáticamente cada día a las 4:00 AM.
  echo     Los backups se guardan en la carpeta "backups/".
) else (
  echo  ⚠️  No se pudo instalar la tarea. Ejecuta como Administrador.
)

echo.
pause
