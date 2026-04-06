@echo off
chcp 65001 >nul
REM Remoto: https://github.com/LuisCalvo-Chino/map-financial-advisors.git
REM Rama en GitHub: MAP-FinancialAdvisors (mismo repo; el codigo del sitio esta en esa rama)
echo === MAP CLOUD PUSH SYSTEM ===
REM Uso: push_map.bat "mensaje del commit"  (recomendado en terminales sin entrada interactiva)
REM      push_map.bat                         (pide el mensaje al vuelo)
if not "%~1"=="" (
  set "MAP_COMMIT_MSG=%~1"
  goto :commit_push
)
set /p MAP_COMMIT_MSG="Introduce el mensaje del cambio: "
:commit_push
if "%MAP_COMMIT_MSG%"=="" (
  echo Error: el mensaje no puede estar vacío.
  pause
  exit /b 1
)
git add .
git commit -m "%MAP_COMMIT_MSG%"
if errorlevel 1 (
  echo.
  echo No se pudo crear el commit ^(sin cambios o error^). Revisa el mensaje anterior.
  pause
  exit /b 1
)
REM Sube main al remoto (rama MAP-FinancialAdvisors si asi esta enlazado el repo)
git push origin HEAD:MAP-FinancialAdvisors
if errorlevel 1 (
  echo.
  echo Error al hacer push. Comprueba la rama, la red y tus credenciales de GitHub.
  pause
  exit /b 1
)
echo.
echo ========================================
echo [ÉXITO] Cambios subidos a GitHub (MAP)
echo ========================================
pause
