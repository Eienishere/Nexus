# <img src="./client/favicon.svg" alt="Nexus Logo" width="34" style="vertical-align: middle;" /> Nexus

Modern, guvenli ve tek noktadan verimlilik odakli bir personal productivity platformu.  
Nexus; task, not, pomodoro, takvim, alarm ve istatistik modullerini sifreli bir lokal veri katmani ile birlestirir.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express)
![SQLite](https://img.shields.io/badge/SQLite-SQLCipher-003B57?style=for-the-badge&logo=sqlite)
![Tailwind](https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=for-the-badge&logo=tailwindcss)

---

## One Look

- **Full-stack TypeScript:** React + Vite frontend, Express backend
- **Security-first:** Zero-knowledge master password akisi, RAM-only session key
- **Encrypted local storage:** SQLCipher 4 destekli SQLite
- **Moduler API:** `auth`, `tasks`, `notes`, `goals`, `alarms`, `pomodoro`, `settings`, `stats`, `backups`
- **Modern UX:** Responsive sidebar, quick-add, lock screen, animation support

## Feature Set

- Dashboard ile genel durum ozeti
- Gorev yonetimi (durum, oncelik, etiket, tarih, yildizlama)
- Takvim gorunumu ve zaman planlama
- Pomodoro ve odak seans takibi
- Notlar (pin/star/archive, markdown-friendly icerik)
- Alarm modulu
- Ayarlar + tema davranislari
- Istatistik ve progress takibi
- Sifreli backup olusturma

## Tech Stack

### Frontend
- React 19
- Vite 6
- React Router 7
- Tailwind CSS 4
- Motion (animation), Sonner (toast), Lucide (icons)
- Recharts (chart/analytics)

### Backend
- Node.js + Express 4
- TypeScript (ESM)
- better-sqlite3-multiple-ciphers (SQLCipher entegrasyonu)
- Argon2id (`@node-rs/argon2`) for key derivation

### Data & Security
- SQLite DB file: `nexus.db`
- SQLCipher pragmas: `cipher='sqlcipher'`, `legacy=4`
- Session key process memory'de tutulur, lock/exit ile wipe edilir
- Autologin key migration + OS keychain tabanli saklama
- Encrypted backup: AES-256-GCM

## Project Structure

```text
Nexus/
|- client/                 # React UI (Vite)
|  |- src/
|  |  |- components/       # Dashboard, TaskManager, Pomodoro, Notes, ...
|  |  |- lib/              # Context + utility katmani
|  |- public/
|- server/
|  |- routes/              # API route modulleri
|  |- repositories/        # Veri erisim katmani
|  |- db.ts                # DB/session/security lifecycle
|- tests/                  # Vitest test dosyalari
|- server.ts               # App entrypoint + router mount + Vite middleware
|- start-nexus.bat         # Windows hizli baslatma
|- start-nexus.sh          # Linux hizli baslatma
|- .env.example            # Ornek ortam degiskenleri
```

## API Surface (High Level)

Backend mount noktalarinin tamamı:

- `GET/POST ... /api/auth`
- `... /api/tasks`
- `... /api/tags`
- `... /api/notes`
- `... /api/goals`
- `... /api/alarms`
- `... /api/pomodoro`
- `... /api/settings`
- `... /api/stats`
- `... /api/backups`

## Getting Started

### Requirements

- Node.js 20+ (LTS onerilir)
- npm 10+

### 1) Install

```bash
npm install
```

### 2) Configure

`.env.example` dosyasini kopyalayip `.env` olusturun:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3) Run (Dev)

```bash
npm run dev
```

Uygulama varsayilan olarak su adreste calisir:  
`http://127.0.0.1:3000`

### Optional Quick Start Scripts

- Windows: `start-nexus.bat`
- Linux: `./start-nexus.sh`

## Build, Preview, Test

```bash
npm run build      # Frontend production build
npm run preview    # Vite preview
npm run lint       # Type check
npm run test       # Vitest run
npm run test:watch # Vitest watch mode
```

## Security Model (Technical)

- Ilk acilista kullanici master password olusturur
- Password, Argon2id ile key derivation icin kullanilir
- Uretilen key ile SQLCipher DB unlock edilir
- Session key sadece RAM'de tutulur (`clearSession` ile wipe + close)
- Uygulama localhost'a baglidir (`127.0.0.1:3000`)
- Legacy autologin dosyasi varsa keychain'e migrate edilir

## Environment Variables

`.env.example` icindeki alanlar:

- `APP_URL` -> deploy URL (self links/callbacks)
- `DB_ENCRYPTION_KEY` -> legacy backup decrypt senaryolari
- `BACKUP_KDF_SALT` -> backup decrypt salt
- `BACKUP_KDF_ITERATIONS` -> backup decrypt iteration count

> Not: Runtime akista temel guvenlik modeli master password + RAM-only session key uzerine kurulu.

## Notes for Contributors

- Kod stili: TypeScript + ESM
- Frontend ve backend ayni root package altinda yonetiliyor
- Yeni route eklerken `server/routes` + `server.ts` mount adimini unutmayin
- DB migration ihtiyaci varsa `server/db.ts` icindeki migration bolumunu guncelleyin

---
