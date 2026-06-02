#!/usr/bin/env bash
set -euo pipefail

# Always run from this script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo
echo "=========================================="
echo "               Nexus (Linux)"
echo "=========================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js bulunamadi. Lutfen kurun: https://nodejs.org/"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm bulunamadi. Node.js kurulumunu kontrol edin."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "[1/3] Bagimliliklar kuruluyor..."
  npm install
else
  echo "[1/3] node_modules bulundu, kurulum atlandi."
fi

echo "[2/3] Sunucu baslatiliyor..."
echo
echo "Uygulama: http://localhost:3000"
echo "Durdurmak icin bu terminalde Ctrl+C basin."
echo

# Open browser in background if available
if command -v xdg-open >/dev/null 2>&1; then
  (sleep 2; xdg-open "http://localhost:3000" >/dev/null 2>&1 || true) &
fi

echo "[3/3] Nexus calisiyor..."
npm run dev

