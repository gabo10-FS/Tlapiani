@echo off
title Tlapiani - Demo
cd /d "%~dp0"
echo.
echo   Iniciando la demo de Tlapiani...
echo   (se abrira tu navegador en http://localhost:8099)
echo.
node serve.js
if errorlevel 1 (
  echo.
  echo   No se pudo iniciar. Verifica que Node este instalado ^(node -v^).
  echo.
  pause
)
