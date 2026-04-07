@echo off
chcp 65001 >nul
REM ============================================================================
REM  MAP — Subir cambios a GitHub
REM
REM  Repositorio: https://github.com/LuisCalvo-Chino/map-financial-advisors.git
REM  Rama en GitHub: MAP-FinancialAdvisors
REM
REM  Requisitos: Git instalado, carpeta del proyecto como directorio actual,
REM  remoto "origin" apuntando al enlace de arriba (o equivalente).
REM
REM  USO
REM  -----
REM  1) Doble clic en este archivo, O ejecútalo desde cmd/PowerShell ya ubicado
REM     en la raíz del proyecto (donde está package.json).
REM  2) Con mensaje en la misma línea (recomendado en Cursor / sin consola interactiva):
REM        push-github-map.bat "Describe aquí tu cambio"
REM  3) Sin argumentos: el script pedirá el mensaje del commit.
REM
REM  Qué hace: git add .  →  git commit  →  git push origin HEAD:MAP-FinancialAdvisors
REM
REM  GitHub Pages (sitio publicado): el push del código NO actualiza la web sola.
REM  Tras cambios de frontend, en la raíz del proyecto ejecuta:
REM        npm run deploy
REM ============================================================================

echo === MAP — Push a GitHub (rama MAP-FinancialAdvisors) ===

cd /d "%~dp0"
if not exist "package.json" (
  echo Error: no se encontró package.json. Ejecuta este .bat desde la raíz del repo MAP.
  pause
  exit /b 1
)

if not "%~1"=="" (
  set "MAP_COMMIT_MSG=%~1"
  goto :commit_push
)
set /p MAP_COMMIT_MSG="Mensaje del commit: "

:commit_push
if "%MAP_COMMIT_MSG%"=="" (
  echo Error: el mensaje del commit no puede estar vacío.
  pause
  exit /b 1
)

git add .
if errorlevel 1 (
  echo Error en git add.
  pause
  exit /b 1
)

git commit -m "%MAP_COMMIT_MSG%"
if errorlevel 1 (
  echo.
  echo No se creó el commit ^(sin cambios nuevos o error^). Revisa el mensaje anterior.
  pause
  exit /b 1
)

git push origin HEAD:MAP-FinancialAdvisors
if errorlevel 1 (
  echo.
  echo Error en git push. Comprueba red, credenciales y que exista la rama MAP-FinancialAdvisors en el remoto.
  pause
  exit /b 1
)

echo.
echo Listo: cambios subidos a https://github.com/LuisCalvo-Chino/map-financial-advisors
echo Rama: MAP-FinancialAdvisors
echo.
echo Recuerda: para actualizar GitHub Pages ejecuta  npm run deploy  en esta misma carpeta.
pause
