@echo off
REM ============================================
REM  ACB Actas de Reunion - Arranque de la app
REM ============================================
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install
)

echo Abriendo la aplicacion en el navegador...
REM Espera unos segundos a que el servidor arranque antes de abrir el navegador
start "" cmd /c "timeout /t 5 /nobreak >nul & start "" http://localhost:5180"

call npm run dev
pause
