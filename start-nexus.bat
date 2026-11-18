@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Nexus
cd /d "%~dp0"

set "PORT=3000"
set "URL=http://localhost:%PORT%"
for %%i in ("%~dp0.") do set "DIR=%%~nxi"

REM Sabit (sabitlenen) başlık satır sayısı. :dashboard içindeki satırları değiştirirsen burayı da güncelle.
set "HDR=18"

REM ---------- ANSI renkleri (Windows 10+) ----------
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
set "R=%ESC%[0m"
set "B=%ESC%[1m"
set "DIM=%ESC%[90m"
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "CYAN=%ESC%[96m"
set "WHITE=%ESC%[97m"

REM Logo için cyan → mor degrade (truecolor)
set "G1=%ESC%[38;2;0;229;255m"
set "G2=%ESC%[38;2;0;196;255m"
set "G3=%ESC%[38;2;54;160;255m"
set "G4=%ESC%[38;2;105;130;255m"
set "G5=%ESC%[38;2;150;100;255m"
set "G6=%ESC%[38;2;190;80;255m"

REM Kutu çizgisi: tam 43 karakter (iç genişlik)
set "H10=──────────"
set "LINE=%H10%%H10%%H10%%H10%───"
set "SEP=%H10%%H10%%H10%%H10%%H10%%H10%%H10%%H10%%H10%%H10%"

cls
echo.
call :logo
echo.
echo   %DIM%──────────  Geliştirme Ortamı Başlatıcı  ──────────%R%
echo.

REM ---------- Ön kontroller ----------
where node >nul 2>&1
if errorlevel 1 (
  call :fail "Node.js bulunamadı." "Lütfen kurun: https://nodejs.org/"
  goto :end_error
)

where npm >nul 2>&1
if errorlevel 1 (
  call :fail "npm bulunamadı." "Node.js kurulumunu kontrol edin."
  goto :end_error
)

for /f "delims=" %%v in ('node -v') do set "NODE_VER=%%v"
echo   %DIM%Proje   %R%%WHITE%%DIR%%R%
echo   %DIM%Node.js %R%%WHITE%%NODE_VER%%R%
echo.

REM ---------- Çalıştırma komutunu belirle ----------
if not exist "package.json" (
  call :fail "package.json bulunamadı." "Bu dosyayı proje klasörüne koyun."
  goto :end_error
)

set "SCRIPT="
set "ENTRY="
for %%s in (dev start serve) do (
  if not defined SCRIPT (
    node -e "const s=require('./package.json').scripts||{};process.exit(s['%%s']?0:1)" >nul 2>&1 && set "SCRIPT=%%s"
  )
)
if not defined SCRIPT (
  for %%f in (server.js app.js index.js main.js) do (
    if not defined ENTRY if exist "%%f" set "ENTRY=%%f"
  )
)
if not defined SCRIPT if not defined ENTRY (
  call :fail "package.json içinde dev, start veya serve betiği yok." "Projedeki mevcut betikler aşağıda:"
  echo.
  call npm run
  goto :end_error
)
if defined SCRIPT (set "RUNCMD=npm run %SCRIPT%") else (set "RUNCMD=node %ENTRY%")

REM ---------- 1/3 Bağımlılıklar ----------
call :bar "░░░░░░░░░░░░░░░░░░░░░░░░" "" 0
echo.
if not exist "node_modules" (
  call :step 1 "Bağımlılıklar kuruluyor..."
  echo.
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo.
    call :fail "npm install başarısız oldu." "Hata çıktısını yukarıda inceleyin."
    goto :end_error
  )
  echo.
  call :ok "Bağımlılıklar kuruldu."
) else (
  call :step 1 "Bağımlılıklar kontrol ediliyor..."
  call :ok "node_modules bulundu, kurulum atlandı."
)

REM ---------- 2/3 Sabit başlığı çiz ve sabitle ----------
call :dashboard

REM Terminal yüksekliği (alınamazsa 30 varsay)
set "ROWS="
for /f %%h in ('powershell -NoProfile -Command "$Host.UI.RawUI.WindowSize.Height" 2^>nul') do set "ROWS=%%h"
if not defined ROWS set "ROWS=30"

set /a START=HDR+1
set /a MINROWS=HDR+6
set "PIN=1"
if %ROWS% LSS %MINROWS% set "PIN=0"

REM Kaydırma bölgesini başlığın altına ayarla: başlık yerinde kalır, günlükler altta akar
if "%PIN%"=="1" <nul set /p "=%ESC%[%START%;%ROWS%r%ESC%[%START%;1H"

REM Tarayıcıyı sunucu hazır olsun diye kısa gecikmeyle aç
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start "" %URL%"

REM ---------- 3/3 Çalıştır ----------
call %RUNCMD%

REM Kaydırma bölgesini sıfırla
if "%PIN%"=="1" <nul set /p "=%ESC%[r%ESC%[%ROWS%;1H"
echo.
echo   %DIM%%SEP%%R%
echo   %YELLOW%●%R% Nexus kapatıldı.
echo.
pause
exit /b 0

REM ==========================================
REM  Yardımcı fonksiyonlar
REM ==========================================
:logo
echo   %G1%███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗%R%
echo   %G2%████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝%R%
echo   %G3%██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗%R%
echo   %G4%██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║%R%
echo   %G5%██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║%R%
echo   %G6%╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝%R%
exit /b

REM Sabit başlık: tam %HDR% satır (logo 6 + 12 satır)
:dashboard
cls
call :logo
echo.
echo   %DIM%──────────  Geliştirme Ortamı Başlatıcı  ──────────%R%
echo.
echo   %DIM%Proje   %R%%WHITE%%DIR%%R%
echo   %DIM%Node.js %R%%WHITE%%NODE_VER%%R%
echo   %DIM%╭%LINE%╮%R%
call :row "Uygulama" "%URL%" "%B%%GREEN%"
call :row "Komut" "%RUNCMD%" "%WHITE%"
call :row "Durdurma" "Ctrl + C" "%YELLOW%"
echo   %DIM%╰%LINE%╯%R%
echo   %GREEN%●%R% %B%%GREEN%AKTİF%R%  %DIM%— günlükler aşağıda%R%
echo   %DIM%%SEP%%R%
exit /b

REM Kutu satırı: %1 = etiket (8 krk), %2 = değer (30 krk), %3 = değer rengi
:row
set "L=%~1            "
set "V=%~2                                        "
echo   %DIM%│%R%  %DIM%%L:~0,8%%R% %~3%V:~0,30%%R%  %DIM%│%R%
exit /b

:step
echo   %CYAN%%B%[%~1/3]%R% %WHITE%%~2%R%
exit /b

:ok
echo   %GREEN%✔%R% %~1
exit /b

:fail
echo   %RED%✖ HATA%R%  %WHITE%%~1%R%
if not "%~2"=="" echo   %DIM%        %~2%R%
exit /b

:bar
REM %1 = dolu kısım, %2 = boş kısım, %3 = yüzde
if "%~3"=="100" (
  echo   %G1%%~1%R% %B%%GREEN%100%%%R%
) else if "%~3"=="0" (
  echo   %DIM%%~1%R% %DIM%0%%%R%
) else (
  echo   %G3%%~1%DIM%%~2%R% %B%%WHITE%%~3%%%R%
)
exit /b

:end_error
echo.
pause
exit /b 1
