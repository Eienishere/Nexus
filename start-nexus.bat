@echo off
setlocal

REM Always run from this script's folder
cd /d "%~dp0"

echo.
echo ==========================================
echo  		 Nexus 
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. Lutfen Node.js kurun: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [HATA] npm bulunamadi. Node.js kurulumu kontrol edin.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/3] Bagimliliklar kuruluyor...
  call npm install
  if errorlevel 1 (
    echo.
    echo [HATA] npm install basarisiz oldu.
    pause
    exit /b 1
  )
) else (
  echo [1/3] node_modules bulundu, kurulum atlandi.
)

echo [2/3] Sunucu baslatiliyor...
echo.
echo Uygulama: http://localhost:3000
echo Durdurmak icin bu pencerede Ctrl+C basin.
echo.

start "" http://localhost:3000

echo [3/3] Nexus calisiyor...
call npm run dev

echo.
echo Nexus kapatildi.
pause
