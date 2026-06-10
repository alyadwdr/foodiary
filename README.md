# Foodiary — Takoyaki Business Dashboard

## Tech Stack
- React + Vite + Tailwind CSS
- Supabase (database)
- Recharts (charts)
- jsPDF + xlsx (export)

---

## Setup Guide

### 1. Install dependencies

```bash
npm install
```

---

### 2. Setup Supabase (step by step)

#### A. Buat akun & project
1. Buka https://supabase.com → Sign Up (bisa pakai Google)
2. Klik **New Project**
3. Isi:
   - **Name**: foodiary
   - **Database Password**: buat password kuat, **simpan baik-baik**
   - **Region**: Southeast Asia (Singapore)
4. Klik **Create new project** → tunggu ~2 menit

#### B. Buat tabel database
1. Di sidebar kiri klik **SQL Editor**
2. Klik **New query**
3. Copy seluruh isi file `supabase_schema.sql`
4. Paste ke SQL Editor
5. Klik tombol **Run** (atau Ctrl+Enter)
6. Cek tab **Table Editor** → harus ada 4 tabel: `products`, `orders`, `expenses`, `open_po_dates`

#### C. Ambil API Keys
1. Di sidebar kiri klik **Project Settings** (icon gear)
2. Klik **API**
3. Copy dua nilai ini:
   - **Project URL** → contoh: `https://abcdefgh.supabase.co`
   - **anon public** key → string panjang

#### D. Buat file `.env`
Di folder project, buat file baru bernama `.env`:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc....(anon key kamu)
```

> ⚠️ Jangan pernah commit file `.env` ke GitHub!

---

### 3. Jalankan project

```bash
npm run dev
```

Buka http://localhost:5173

---

### 4. First time setup

Setelah app jalan:
1. Buka halaman **Products**
2. Default sudah ada "Takoyaki 8 Ball" — edit harga sesuai harga jualmu
3. Mulai input order di halaman **Orders**

---

## Folder Structure

```
foodiary/
├── src/
│   ├── components/
│   │   ├── Layout.jsx          # Sidebar + navigation
│   │   ├── Modal.jsx           # Reusable modal
│   │   └── AddTransactionModal.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx       # Home dashboard
│   │   ├── Orders.jsx          # Order management
│   │   ├── Expenses.jsx        # Expense tracking
│   │   ├── Reports.jsx         # Financial reports
│   │   └── Products.jsx        # Product management
│   ├── lib/
│   │   ├── supabase.js         # Supabase client
│   │   └── export.js           # PDF & Excel utilities
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase_schema.sql         # Run this in Supabase SQL Editor
├── .env.example
└── package.json
```

---

## Build for Production

```bash
npm run build
```

Deploy folder `dist/` ke Vercel atau Netlify.
