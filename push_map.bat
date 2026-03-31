@echo off
chcp 65001 >nul
echo === MAP CLOUD PUSH SYSTEM ===
set /p msg="Introduce el mensaje del cambio: "
if "%msg%"=="" (
  echo Error: el mensaje no puede estar vacío.
  pause
  exit /b 1
)
git add .
git commit -m "%msg%"
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
