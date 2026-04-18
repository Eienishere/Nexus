<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLCipher-4-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/License-Private-red?style=for-the-badge" />
</p>

<h1 align="center">
  ⚡ NEXUS
</h1>

<p align="center">
  <strong>Üretkenliğinin Merkezi — Your Productivity Hub</strong>
</p>

<p align="center">
  <em>Tek bir arayüzde görev yönetimi, not defteri, pomodoro zamanlayıcı, takvim, saat ve daha fazlası.<br/>Uçtan uca şifreli, sıfır bilgi mimarisine sahip, tamamen yerel çalışan kişisel üretkenlik platformu.</em>
</p>

<br/>

<p align="center">
  <code>🔐 Zero Knowledge</code> · <code>🧠 Argon2id</code> · <code>🗄️ SQLCipher 4</code> · <code>🖥️ Cross-platform</code> · <code>🌍 i18n (TR/EN)</code>
</p>

---

## 📖 İçindekiler

- [🌟 Neden Nexus?](#-neden-nexus)
- [🧩 Özellikler](#-özellikler)
- [🏗️ Mimari](#️-mimari)
- [🔐 Güvenlik Modeli](#-güvenlik-modeli)
- [🚀 Kurulum](#-kurulum)
- [⌨️ Klavye Kısayolları](#️-klavye-kısayolları)
- [🎨 Temalar](#-temalar)
- [📡 API Referansı](#-api-referansı)
- [🧪 Test](#-test)
- [📱 Platform Desteği](#-platform-desteği)
- [🗂️ Proje Yapısı](#️-proje-yapısı)
- [🛣️ Yol Haritası](#️-yol-haritası)

---

## 🌟 Neden Nexus?

| Problem | Nexus Çözümü |
|---------|--------------|
| Verileriniz bulutta, üçüncü parti sunucularda | **%100 yerel** — verileriniz hiç cihazınızdan çıkmaz |
| Şifreler `.env` dosyasında açık metin | **Zero Knowledge** — Argon2id ile türetilen anahtar sadece RAM'de yaşar |
| Birden fazla uygulama (görev, not, timer, takvim) | **Hepsi bir arada** — tek bir unified arayüz |
| Kurulumu karmaşık | **Tek komut** — `start-nexus.bat` çift tıkla, bitti |
| Mobil destek yok | **Responsive + Termux** — Android'de bile çalışır |

---

## 🧩 Özellikler

### 📊 Dashboard — Analitik Merkez
Uygulamayı açtığınızda sizi karşılayan akıllı kontrol paneli:
- ☀️ Zaman dilimine göre kişiselleştirilmiş karşılama
- 📈 **Haftalık/aylık istatistik grafikleri** (Recharts ile interaktif area chart)
- ✅ Tamamlanan görev, pomodoro sayısı, odaklanma süresi ve verimlilik skoru kartları
- 📅 Yaklaşan görevler listesi (öncelik renk kodlu)
- ⚡ Hızlı görev ekleme butonu

---

### ✅ Görev Yöneticisi — Task Manager
Profesyonel seviyede görev takibi:
- **4 kademeli öncelik:** `Low` → `Medium` → `High` → `Critical`
- **Durum yönetimi:** Todo → In Progress → Done → Archived
- ⭐ Yıldızlama ve 🗃️ arşivleme desteği
- 🏷️ **Etiket sistemi** — renk kodlu etiketler oluşturun, görevlere atayın
- 🔍 Arama ve filtreleme (durum, etiket, yıldız bazlı)
- 📅 Bitiş tarihi ataması
- ✏️ Inline düzenleme ile görev güncelleme
- 🎯 Öncelik sıralaması ile otomatik listeleme
- 🗑️ Onaylı silme koruması

---

### 📝 Notlar — Markdown Not Defteri
Obsidian kalitesinde not alma deneyimi:

**Düzenleme Modları:**
| Mod | Açıklama |
|-----|----------|
| ✏️ **Edit** | Tam ekran Markdown editörü |
| 📖 **Read** | Render edilmiş önizleme |
| ↔️ **Split** | Yan yana düzenleme + önizleme |

**Markdown Desteği:**
- ✅ **GitHub Flavored Markdown** (GFM) — tablolar, görev listeleri, strikethrough
- 🔢 **KaTeX** — matematiksel formüller (`$E = mc^2$`)
- 💻 **Syntax highlighting** — 190+ programlama dili
- 🖼️ Resim, bağlantı, alıntı, kod blokları
- 📊 Tablolar ve ayırıcı çizgiler

**Zengin Toolbar:**
`Bold` · `Italic` · `Strikethrough` · `Underline` · `H1-H3` · `List` · `Numbered List` · `Checkbox` · `Quote` · `Code` · `Code Block` · `Link` · `Image` · `Table` · `Custom List Character`

**Ek Özellikler:**
- 📌 Sabitleme (pin) ve ⭐ yıldızlama
- 🗃️ Arşivleme
- 🏷️ Etiket sistemi (görevlerle ortak)
- 🔍 Tam metin arama
- 💾 **Otomatik kaydetme** — 10+ karakter değişiklikte otomatik tetiklenir
- ⌨️ `Ctrl+S` ile anında kayıt, `Ctrl+B` kalın, `Ctrl+I` italik
- 📋 Akıllı liste devamı — Enter'a basınca madde işareti otomatik devam eder

---

### 🍅 Pomodoro Zamanlayıcı
Odaklanma tekniğinin dijital hali:
- 🧠 **Çalışma** / ☕ **Kısa Mola** / ☕ **Uzun Mola** modları
- ⚙️ Özelleştirilebilir süreler (1-120 dk)
- 🔴 Animasyonlu dairesel ilerleme çubuğu (SVG ring)
- 📊 Günlük seans sayacı ve hedef takibi
- 🔔 Tarayıcı bildirimi (izin tabanlı)
- 🪟 **Picture-in-Picture (PiP)** — yüzen pencere modu

---

### ⏱️ Saat & Zamanlayıcılar

#### 🕐 Yerel Saat
- Büyük, okunabilir dijital saat
- Tarih, gün ve yerel bilgilerle (TR/EN locale desteği)

#### ⏱️ Kronometre
- Milisaniye hassasiyetinde ölçüm
- 🏁 Tur (lap) kayıtları — tur farkları ile
- ↩️ Sıfırlama ve ▶️/⏸️ kontrolleri
- 🪟 PiP yüzen pencere

#### ⏳ Geri Sayım (Countdown)
- Saat/dakika/saniye girişi
- ⚡ Hızlı presetler: 5, 10, 15, 30, 45, 60 dakika
- 🔔 Süre dolduğunda ses ve bildirim
- 🪟 PiP yüzen pencere

#### ⏰ Alarm Sistemi
- 🕐 Saat seçicili alarm kurma
- 🏷️ Alarm etiketi
- 📅 **Tekrar seçenekleri:** Bir Kez · Her Gün · Hafta İçi · Hafta Sonu · Özel gün kombinasyonu
- 🔔 Sesli alarm bildirimi
- ✅/❌ Alarm aktif/pasif kontrolü

---

### 📅 Takvim
Kompakt ama güçlü takvim modülü:

| Görünüm | Açıklama |
|---------|----------|
| 📆 **Ay** | Klasik aylık ızgara, görevler renk kodlu |
| 📅 **Hafta** | 7 günlük detaylı görünüm |
| 📄 **Gün** | Seçili günün tüm etkinlikleri |
| 📋 **Ajanda** | Yaklaşan/geçmiş etkinlikler zaman çizelgesi |

- ➕ Takvim üzerinden hızlı etkinlik ekleme
- 🗑️ Kaydırarak silme
- ⚙️ Hafta başlangıç günü ayarı (Pazartesi/Pazar)
- 📊 Görev öncelikleri renk kodlu (`Critical` = kırmızı, `High` = amber, diğer = indigo)

---

### ⚙️ Ayarlar — Kontrol Merkezi

#### 🎨 Tema Motoru
**14 hazır tema** + özel tema oluşturucu:

| Tema | Karakter |
|------|----------|
| 🌑 Koyu | Saf karanlık, minimal |
| ☀️ Açık | Temiz, beyaz tabanlı |
| 🌊 Gece Mavisi | Derin okyanus tonları |
| 💜 Mor Gradient | Elektrikli mor paleti |
| 🌲 Yeşil Orman | Doğa esinlenmeli |
| 🌌 Gece Aurorası | Kuzey ışıkları teması |
| 🧊 Kutup Buzu | Soğuk mavi açık tema |
| 🌅 Gün Batımı | Sıcak turuncu-kırmızı |
| 🌿 Orman Alacası | Lime yeşili tonlar |
| 🌹 Gül Kuvarsı | Pembe açık tema |
| 💎 Neon Noir | Siber-punk neon |
| 🪨 Slate Pro | Profesyonel gri |
| 🌟 Altın Saat | Altın sarısı vurgular |
| 🎨 **Özel Tema** | 5 renk parametresi ile sıfırdan tasarlayın |

Özel tema oluşturucu renk seçiciler:
`Arkaplan` · `Yüzey` · `Ana Renk` · `Vurgu` · `Yazı Rengi`

#### 🌍 Çoklu Dil
- 🇹🇷 **Türkçe** (varsayılan)
- 🇬🇧 **English**
- 380+ çeviri anahtarı ile kapsamlı lokalizasyon

#### 🔔 Bildirim & Ses
- Bildirimleri açma/kapama
- Ses efektlerini açma/kapama
- 🎵 **Özel alarm sesi** yükleme (max 2MB)
- 🎵 **Özel bildirim sesi** yükleme (max 2MB)

#### 💾 Veri Yönetimi
- 📤 **JSON dışa aktarma** — tüm görevler, notlar, ayarlar
- 📥 **JSON içe aktarma** — yedekten geri yükleme
- 🔄 **Otomatik şifreli yedekleme** — Saatlik, Günlük, Haftalık veya Aylık
- 📁 Özel yedekleme klasörü belirleme
- 🔐 Yedekler AES-256-GCM ile şifrelenir

---

## 🏗️ Mimari

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  React 19 + TypeScript + Tailwind CSS 4              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │Dashboard │ │TaskMgr   │ │Notes     │ ...          │
│  └──────────┘ └──────────┘ └──────────┘             │
│  Motion (Framer) · Recharts · Sonner · Lucide       │
│  ReactMarkdown + KaTeX + Highlight.js               │
├─────────────────────────────────────────────────────┤
│                   API LAYER                          │
│  Express 4 + Vite Dev Server (middleware mode)       │
│  ┌────────────────────────────────────────┐          │
│  │ /api/auth    │ /api/tasks  │ /api/tags │          │
│  │ /api/notes   │ /api/goals  │ /api/alarms│         │
│  │ /api/pomodoro│ /api/settings│/api/stats │         │
│  │ /api/backups │                          │          │
│  └────────────────────────────────────────┘          │
│  Rate Limiter · Brute-force Protection · Auth Guard  │
├─────────────────────────────────────────────────────┤
│                  DATA LAYER                          │
│  SQLCipher 4 (AES-256-CBC)                           │
│  ┌──────────────────────────────┐                    │
│  │ tasks │ notes │ goals │ tags │                    │
│  │ pomodoro_sessions │ alarms  │                    │
│  │ settings │ task_tags │ note_tags │                │
│  └──────────────────────────────┘                    │
│  Argon2id Key Derivation · DPAPI Keychain (Windows)  │
└─────────────────────────────────────────────────────┘
```

### Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 19, TypeScript 5.8, Tailwind CSS 4 |
| **Animasyon** | Motion (Framer Motion) |
| **Grafikler** | Recharts |
| **Markdown** | react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight, rehype-raw |
| **İkonlar** | Lucide React |
| **Bildirimler** | Sonner (toast) |
| **Backend** | Express 4, tsx (dev runner) |
| **Veritabanı** | better-sqlite3-multiple-ciphers (SQLCipher 4) |
| **Şifreleme** | Argon2id (@node-rs/argon2), AES-256-GCM (backups) |
| **Anahtar Depolama** | Windows DPAPI / macOS Keychain / Linux secret-tool |
| **Bundler** | Vite 6 |
| **Test** | Vitest |

---

## 🔐 Güvenlik Modeli

Nexus, **Zero Knowledge** mimarisine dayalı, premium güvenlik katmanları sunar:

### 🔑 Master Password Akışı

```
Kullanıcı şifresi
       │
       ▼
 ┌─────────────┐     ┌──────────────┐
 │  Argon2id    │◄────│ Salt (dosya) │
 │  KDF         │     │ 32-byte      │
 └──────┬──────┘     └──────────────┘
        │
        ▼
 ┌──────────────┐
 │ 32-byte key  │ ← Sadece RAM'de yaşar!
 │ (AES-256)    │
 └──────┬──────┘
        │
        ▼
 ┌──────────────┐
 │ SQLCipher 4  │ ← Şifreli veritabanı
 │ nexus.db     │
 └──────────────┘
```

### Güvenlik Katmanları

| Katman | Açıklama |
|--------|----------|
| **Argon2id KDF** | Şifre → anahtar dönüşümünde altın standart, GPU/ASIC saldırılarına dayanıklı |
| **SQLCipher 4** | Veritabanı sayfa bazlı AES-256-CBC şifreleme |
| **RAM-only Key** | Şifreleme anahtarı hiçbir zaman diske yazılmaz, sadece RAM'de tutulur |
| **Otomatik Silme** | Uygulama kapanışında (`exit`, `SIGINT`, `SIGTERM`) anahtar bellekten silinir |
| **Kilit Ekranı** | `Ctrl+L` ile anında kilitleme, anahtar RAM'den wiped |
| **Brute-force Koruması** | 5 hatalı deneme → 5 dakika kilitleme, exponential backoff |
| **Rate Limiting** | API endpoint'lerinde dakika başı istek sınırı |
| **Güvenli Dosya Silme** | Fabrika sıfırlamada dosyalar random data ile üzerine yazılıp silinir |
| **OS Keychain** | Autologin anahtarı Windows DPAPI / macOS Keychain / Linux secret-tool ile korunur |
| **Şifreli Yedekleme** | Yedekler AES-256-GCM ile oturum anahtarıyla şifrelenir |
| **Auth Guard** | Tüm API endpoint'leri `requireUnlocked` middleware ile korunur |

### ⚠️ Önemli Güvenlik Notu

> **Şifrenizi unutursanız verilerinize erişmek teknik olarak imkânsızdır.**  
> Nexus Zero Knowledge mimarisindedir — sunucu bile şifrenizi bilmez.  
> Tek seçenek: **Fabrika Sıfırlama** (tüm veriler silinir).

---

## 🚀 Kurulum

### Gereksinimler

| Gereksinim | Minimum Versiyon |
|------------|-----------------|
| **Node.js** | v18+ |
| **npm** | v9+ |
| **OS** | Windows 10+, macOS, Linux |

### ⚡ Hızlı Başlangıç (Windows)

```bash
# 1. Projeyi klonlayın
git clone https://github.com/Eienishere/Nexus.git
cd Nexus

# 2. Çift tıklayın:
start-nexus.bat
```

`start-nexus.bat` otomatik olarak:
1. ✅ Node.js ve npm kontrolü yapar
2. 📦 `node_modules` yoksa `npm install` çalıştırır
3. 🚀 Sunucuyu başlatır
4. 🌐 Tarayıcıda `http://localhost:3000` açar

### 🐧 Linux / macOS

```bash
git clone https://github.com/Eienishere/Nexus.git
cd Nexus
npm install
npm run dev
```

### 📱 Android (Termux)

```bash
pkg update && pkg install nodejs git
git clone https://github.com/Eienishere/Nexus.git
cd Nexus
chmod +x start-nexus-android.sh
./start-nexus-android.sh
```

### 🔧 Manuel Başlatma

```bash
# Bağımlılıkları kur
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Production build
npm run build
npm run preview
```

### İlk Çalıştırma

1. 🌐 `http://localhost:3000` adresini açın
2. 🔐 **Master Password** oluşturma ekranı gelecektir
3. 🔑 En az 8 karakterlik güçlü bir şifre belirleyin
4. ✅ Şifreyi onaylayın — veritabanı oluşturulur ve şifrelenir
5. 🎉 Nexus kullanıma hazır!

---

## ⌨️ Klavye Kısayolları

| Kısayol | Aksiyon |
|---------|---------|
| `Ctrl + L` | 🔒 Uygulamayı kilitle (anahtar RAM'den silinir) |
| `Ctrl + Shift + N` | ➕ Hızlı görev ekleme modalı |
| `Ctrl + S` | 💾 Aktif notu kaydet (Not editöründe) |
| `Ctrl + B` | **Kalın** metin (Not editöründe) |
| `Ctrl + I` | *İtalik* metin (Not editöründe) |
| `Tab` | ↦ Girinti ekle (Not editöründe) |

---

## 🎨 Temalar

Nexus, CSS custom properties tabanlı güçlü bir tema motoruna sahiptir. Her tema, otomatik olarak tüm bileşenlere uygulanır:

```
data-theme="dark"            → Karanlık tema (varsayılan)
data-theme="light"           → Aydınlık tema
data-theme="night-blue"      → Gece mavisi
data-theme="purple"          → Mor gradient
data-theme="forest"          → Yeşil orman
data-theme="midnight-aurora" → Kuzey ışıkları
data-theme="arctic-frost"    → Kutup buzu
data-theme="sunset-ember"    → Gün batımı
data-theme="forest-dusk"     → Orman alacası
data-theme="rose-quartz"     → Gül kuvarsı
data-theme="neon-noir"       → Neon siber-punk
data-theme="slate-pro"       → Profesyonel gri
data-theme="golden-hour"     → Altın saat
data-theme="custom"          → Özel tema (5 renk parametresi)
```

**Özel Tema** oluştururken ayarlanabilir parametreler:
- `--custom-bg` — Arkaplan rengi
- `--custom-surface` — Yüzey/kart rengi
- `--custom-primary` — Ana vurgu rengi
- `--custom-accent` — İkincil vurgu rengi
- `--custom-text` — Metin rengi

---

## 📡 API Referansı

Tüm API endpoint'leri `http://localhost:3000/api/` altındadır.

### 🔐 Kimlik Doğrulama

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/auth/status` | Uygulama durumu (firstRun, isLocked, autologin) |
| `POST` | `/api/auth/setup` | İlk kurulum — Master Password oluşturma |
| `POST` | `/api/auth/unlock` | Şifre ile kilit açma |
| `POST` | `/api/auth/lock` | Oturumu kilitle (RAM'deki anahtar silinir) |
| `POST` | `/api/auth/change-password` | Master Password değiştirme (DB rekey) |
| `POST` | `/api/auth/factory-reset` | Tüm verileri sil (geri alınamaz) |
| `POST` | `/api/auth/autologin` | Otomatik giriş aç/kapat (OS Keychain) |

### 📋 Veri Endpoint'leri

> ⚠️ Tüm veri endpoint'leri `requireUnlocked` middleware ile korunur.

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET/POST` | `/api/tasks` | Görev listele / oluştur |
| `PUT/DELETE` | `/api/tasks/:id` | Görev güncelle / sil |
| `POST/DELETE` | `/api/tasks/:id/tags/:tagId` | Görev-etiket ilişkisi |
| `GET/POST` | `/api/notes` | Not listele / oluştur |
| `PUT/DELETE` | `/api/notes/:id` | Not güncelle / sil |
| `POST/DELETE` | `/api/notes/:id/tags/:tagId` | Not-etiket ilişkisi |
| `GET/POST/DELETE` | `/api/tags` | Etiket CRUD |
| `GET/POST` | `/api/goals` | Hedef listele / oluştur |
| `GET/POST` | `/api/alarms` | Alarm listele / oluştur |
| `GET/POST` | `/api/pomodoro` | Pomodoro oturumları |
| `GET/PUT` | `/api/settings` | Uygulama ayarları |
| `GET` | `/api/stats` | İstatistikler |
| `POST` | `/api/backups/create` | Manuel yedekleme oluştur |

---

## 🧪 Test

Nexus, **Vitest** tabanlı otomatik test altyapısına sahiptir:

```bash
# Testleri çalıştır
npm test

# Watch modunda test
npm run test:watch

# Type checking
npm run lint
```

### Test Dosyaları

| Test | Kapsam |
|------|--------|
| `tests/auth.test.ts` | Kimlik doğrulama akışları, setup, unlock, lock, brute-force koruması |
| `tests/keyUtils.test.ts` | Argon2id anahtar türetme, salt yönetimi, buffer silme işlemleri |

---

## 📱 Platform Desteği

| Platform | Durum | Çalıştırma |
|----------|-------|------------|
| 🪟 **Windows 10+** | ✅ Tam destek | `start-nexus.bat` |
| 🍎 **macOS** | ✅ Tam destek | `npm run dev` |
| 🐧 **Linux** | ✅ Tam destek | `npm run dev` |
| 📱 **Android (Termux)** | ✅ Tam destek | `./start-nexus-android.sh` |
| 🌐 **Herhangi bir tarayıcı** | ✅ Responsive | `http://localhost:3000` |

### 🔑 OS Keychain Desteği

| Platform | Autologin Depolama |
|----------|-------------------|
| Windows | **DPAPI** (Data Protection API) — kullanıcı oturumuyla şifreli |
| macOS | **Keychain** (`security` CLI) |
| Linux | **secret-tool** (libsecret / GNOME Keyring) |

---

## 🗂️ Proje Yapısı

```
Nexus/
├── 📄 server.ts                    # Ana giriş noktası — Express + Vite orchestrator
├── 📁 server/
│   ├── db.ts                       # Veritabanı yönetimi, şifreli yedekleme, fabrika reset
│   ├── keyUtils.ts                 # Argon2id KDF, salt yönetimi, buffer güvenliği
│   ├── keychainStore.ts            # OS Keychain entegrasyonu (DPAPI/Keychain/secret-tool)
│   ├── middleware.ts               # Rate limiter, brute-force koruması, auth guard
│   └── 📁 routes/
│       ├── auth.ts                 # Kimlik doğrulama (setup/unlock/lock/change-pw/reset)
│       ├── tasks.ts                # Görev CRUD + etiket ilişkileri
│       ├── notes.ts                # Not CRUD + etiket ilişkileri
│       ├── tags.ts                 # Etiket yönetimi
│       ├── goals.ts                # Hedef takibi
│       ├── alarms.ts               # Alarm sistemi
│       ├── pomodoro.ts             # Pomodoro oturumları
│       ├── settings.ts             # Uygulama ayarları
│       ├── stats.ts                # İstatistik endpoint'leri
│       └── backups.ts              # Otomatik/manuel şifreli yedekleme
├── 📁 src/
│   ├── App.tsx                     # Ana uygulama bileşeni, yönlendirme, sidebar
│   ├── main.tsx                    # React mount noktası
│   ├── index.css                   # Global stiller, tema değişkenleri, glassmorphism
│   ├── types.ts                    # TypeScript tip tanımları
│   ├── 📁 lib/
│   │   ├── api.ts                  # HTTP istemci (fetch wrapper)
│   │   ├── AuthContext.tsx          # React Context — kimlik doğrulama state yönetimi
│   │   ├── TimerContext.tsx         # React Context — timer/pomodoro/alarm state
│   │   ├── i18n.ts                 # Çoklu dil desteği (TR/EN, 380+ anahtar)
│   │   ├── audio.ts                # Ses yönetimi
│   │   └── utils.ts                # Yardımcı fonksiyonlar (cn, formatDuration)
│   └── 📁 components/
│       ├── Dashboard.tsx            # Analitik kontrol paneli
│       ├── TaskManager.tsx          # Görev yöneticisi
│       ├── Notes.tsx                # Markdown not editörü
│       ├── Pomodoro.tsx             # Pomodoro zamanlayıcı
│       ├── Calendar.tsx             # Takvim modülü
│       ├── TimerModule.tsx          # Saat, kronometre, geri sayım, alarm
│       ├── Settings.tsx             # Ayarlar paneli
│       ├── LockScreen.tsx           # Kilit ekranı + ilk kurulum
│       ├── FloatingWidget.tsx       # Yüzen PiP pencere
│       ├── PopoutWindow.tsx         # Pop-out timer penceresi
│       ├── QuickAddModal.tsx        # Hızlı görev ekleme
│       ├── OnboardingModal.tsx      # İlk kullanım rehberi
│       ├── GlobalNotificationOverlay.tsx  # Alarm/bildirim overlay
│       └── ErrorBoundary.tsx        # Hata yakalama sınırı
├── 📁 tests/
│   ├── auth.test.ts                # Kimlik doğrulama testleri
│   └── keyUtils.test.ts            # Şifreleme testleri
├── 📁 backups/                     # Şifreli yedek dosyaları (.enc)
├── 📄 start-nexus.bat              # Windows tek-tık başlatıcı
├── 📄 start-nexus-android.sh       # Android/Termux başlatıcı
├── 📄 decrypt_backup.js            # Yedek çözme aracı
├── 📄 package.json                 # Bağımlılıklar ve scriptler
├── 📄 vite.config.ts               # Vite yapılandırması
├── 📄 vitest.config.ts             # Test yapılandırması
├── 📄 tsconfig.json                # TypeScript yapılandırması
└── 📄 .env.example                 # Örnek ortam değişkenleri
```

---

## 🛣️ Yol Haritası

- [ ] 📊 Gelişmiş istatistik ve verimlilik grafikleri
- [ ] 🔄 Kanban board görünümü (görev yöneticisi)
- [ ] 📎 Not'lara dosya eki ekleme
- [ ] 🤖 AI entegrasyonu (akıllı görev önerileri)
- [ ] 📦 Electron ile standalone .exe paketleme
- [ ] 🔗 CalDAV/Google Calendar senkronizasyonu
- [ ] 📊 Pomodoro istatistikleri ve geçmiş görünümü
- [ ] 🌐 PWA (Progressive Web App) desteği
- [ ] 🔔 Masaüstü native bildirimleri (Electron)
- [ ] 📱 React Native mobil uygulama

---

<p align="center">
  <strong>Nexus</strong> — Üretkenliğinin Merkezi ⚡
  <br/>
  <sub>Tüm verileriniz sizinle kalır. Sıfır bilgi. Sıfır ödün.</sub>
</p>

<p align="center">
  <sub>Made with 💜 by <a href="https://github.com/Eienishere">Eienishere</a></sub>
</p>
