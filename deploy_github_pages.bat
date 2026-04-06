@echo off
chcp 65001 >nul
REM Publica el sitio en GitHub Pages (rama gh-pages).
REM El push del codigo fuente (push_map.bat) NO actualiza la web sola: hace falta este paso tras los cambios.
echo === MAP — Despliegue GitHub Pages (build + gh-pages) ===
call npm run deploy
if errorlevel 1 (
  echo.
  echo Error en el despliegue. Revisa npm, la red y git.
  pause
  exit /b 1
)
echo.
echo Listo. En unos segundos GitHub Pages deberia servir la nueva version.
echo URL tipica: https://luiscalvo-chino.github.io/map-financial-advisors/
pause
