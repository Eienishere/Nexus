#!/data/data/com.termux/files/usr/bin/bash

set -e

# Always run from this script's folder
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo
echo "=========================================="
echo "               Nexus (Android)"
echo "=========================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[HATA] Node.js bulunamadi."
  echo "Termux icin: pkg update && pkg install nodejs"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[HATA] npm bulunamadi. Node.js kurulumu kontrol edin."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "[1/3] Bagimliliklar kuruluyor..."
  if ! npm install; then
    echo
    echo "[HATA] npm install basarisiz oldu."
    exit 1
  fi
else
  echo "[1/3] node_modules bulundu, kurulum atlandi."
fi

echo "[2/3] Sunucu baslatiliyor..."
echo
echo "Uygulama: http://localhost:3000"
echo "Durdurmak icin Ctrl+C basin."
echo

# If termux-api exists, try to open browser automatically.
if command -v termux-open-url >/dev/null 2>&1; then
  termux-open-url "http://localhost:3000" >/dev/null 2>&1 || true
fi

echo "[3/3] Nexus calisiyor..."
npm run dev
