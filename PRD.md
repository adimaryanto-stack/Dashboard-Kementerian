# PRD — Dashboard Kementerian

**Version:** 1.4.0 (Mockup Client-Side Consolidated)  
**Date:** 24 Juni 2026  
**Status:** ✅ APPROVED FOR DEVELOPMENT  
**Project Type:** Web-Based Spreadsheet Dashboard — Education Budget Transparency  
**Backend Platform:** None (Pure Client-Side Mockup / Static Demo)

---

## DAFTAR ISI

1. [Project Overview](#1-project-overview)
2. [Menu Structure](#2-menu-structure)
3. [Fitur per Menu](#3-fitur-per-menu)
4. [Database Schema (Logical)](#4-database-schema-logical)
5. [Tech Stack & Architecture](#5-tech-stack--architecture)
6. [MVP Roadmap (Mockup Evolution)](#6-mvp-roadmap-mockup-evolution)
7. [Success Metrics](#7-success-metrics)
8. [Deployment Plan](#8-deployment-plan)

---

## 1. Project Overview

### 1.1 Deskripsi Aplikasi
Dashboard Kementerian adalah aplikasi web berbasis **spreadsheet interface** untuk menampilkan, mengelola, dan mengaudit aliran dana pendidikan Indonesia dari tingkat nasional (APBN) hingga institusi pendidikan di seluruh daerah. Tampilannya menyerupai Excel/Google Sheets dengan semua kalkulasi angka terhubung secara real-time antar menu.

Aplikasi ini berjalan sebagai demo frontend statis (pure mockup) dengan data deterministik dalam memori untuk simulasi interaksi spreadsheet.

### 1.2 Target User & Role

| Role | Akses | Keterangan |
|------|-------|------------|
| `SUPER_ADMIN` | Full access | Semua menu, termasuk User Manager |
| `ADMIN` | Create, Read, Update | Semua menu data anggaran |
| `ADMIN_PROVINSI` | CRUD untuk provinsinya | Terbatas pada wilayah provinsi |
| `ADMIN_KABKOTA` | CRUD untuk kabkotanya | Terbatas pada wilayah kabkota |
| `VIEWER` | Read-only | Semua menu, tidak bisa edit |
| `AUDITOR` | Read-only + Export | Semua menu, fokus audit trail |

### 1.3 Core Concept: Spreadsheet-Like Interface
- **Tampilan seperti Excel** — table rows & columns, sticky header & footer
- **Inline Editing** — klik sel angka langsung edit, tekan Enter/Tab untuk simpan
- **Kalkulasi Real-Time** — `Selisih = Nominal − Realisasi`, `% = (Realisasi / Nominal) × 100`
- **Conditional Formatting** — badge warna: 🟢 ≥80%, 🟡 50–79%, 🔴 <50%
- **Cascade Update** — edit Institusi → auto-update Kabkota → auto-update Provinsi → auto-update Dashboard
- **Export Excel** — download `.xlsx` dengan formula Excel tersimpan, bukan nilai statis

---

## 2. Menu Structure

```
📊 Dashboard (Main)
   └── Ringkasan nasional: Nominal, Realisasi, % + Chart

💰 APBN Pertahun
   └── Kelola tahun anggaran: DRAFT → ACTIVE → CLOSED

📍 Provinsi
   └── Spreadsheet 38 provinsi, inline editing

🏛️ Kabupaten / Kota
   └── Filter per provinsi, inline editing

🎓 Jenjang Pendidikan
   ├── Universitas
   ├── SMA
   ├── SMP
   ├── SD
   └── PAUD

👥 User Manager
   └── CRUD users + role assignment
```

---

## 3. Fitur per Menu

### 3.1 Dashboard
- **Metric Cards:** Total Nominal, Total Realisasi, % Penyerapan Nasional.
- **Tabel Ringkasan:** Penyerapan per jenjang pendidikan dengan progress bar.
- **Charts (Recharts):** 
  - Bar Chart: Nominal vs Realisasi per Jenjang.
  - Area Chart: Tren APBN Tahunan (2020–2026).
- **Global Filter:** Dropdown Tahun Anggaran di header global.

### 3.2 APBN Pertahun
- Mengelola tahun anggaran (`DRAFT`, `ACTIVE`, `CLOSED`).
- Hanya **1 tahun** boleh berstatus `ACTIVE` dalam satu waktu.
- Tahun yang berstatus `CLOSED` bersifat read-only untuk audit trail.

### 3.3 Provinsi
- Spreadsheet 38 provinsi dengan inline editing nominal alokasi dan realisasi.
- Download Excel dengan formula tersimpan.

### 3.4 Kabupaten / Kota
- Filter cascading per provinsi.
- Inline editing dan sinkronisasi ke data provinsi.

### 3.5 Jenjang Pendidikan (5 Sub-Menu)
- Komponen reusable untuk Universitas, SMA, SMP, SD, dan PAUD.
- Pencarian dan filter cascading: Provinsi → Kabupaten/Kota.
- Dukungan export bulk via template Excel.

### 3.6 User Manager
- CRUD user lengkap dengan assignment role & status aktif/nonaktif.

---

## 4. Database Schema (Logical)

Logical schema untuk representasi data relasional dalam aplikasi:

- **tahun_anggaran**: ID, tahun, total_anggaran, status (DRAFT, ACTIVE, CLOSED)
- **provinsi**: ID, kode_provinsi, nama_provinsi
- **alokasi_provinsi**: ID, tahun_anggaran_id, provinsi_id, nominal_alokasi, realisasi_total, selisih, persentase_penyerapan
- **kabupaten_kota**: ID, provinsi_id, kode_kabupaten_kota, nama_kabupaten_kota, tipe (KABUPATEN, KOTA)
- **alokasi_kabupaten_kota**: ID, alokasi_provinsi_id, kabupaten_kota_id, nominal_alokasi, realisasi_total, selisih, persentase_penyerapan
- **institusi_pendidikan**: ID, npsn, nama_institusi, jenjang, kabupaten_kota_id, nominal_alokasi, realisasi_total, selisih, persentase_penyerapan

---

## 5. Tech Stack & Architecture

- **Frontend Framework:** Next.js (App Router, Tailwind CSS, TypeScript)
- **State Management:** Zustand (untuk activeTahun global)
- **Charts:** Recharts
- **Excel Generation:** ExcelJS + file-saver

---

## 6. MVP Roadmap (Mockup Evolution)

### SPRINT 1: Setup & UI Foundation
- Konfigurasi Next.js 16 + Tailwind CSS v4.
- Implementasi sidebar, global header, dan kerangka halaman utama.
- Setup Zustand store untuk sinkronisasi pilihan tahun aktif.

### SPRINT 2: Dashboard & APBN Management
- Desain metric cards dan integrasi charts dengan Recharts.
- Halaman APBN per tahun dengan transisi status (`DRAFT` → `ACTIVE` → `CLOSED`).

### SPRINT 3: Spreadsheet Provinsi & Kab/Kota
- Halaman spreadsheet Provinsi dengan editable cells.
- Halaman spreadsheet Kabupaten/Kota dengan filter cascading per provinsi.
- Integrasi logic edit data lokal dalam memori.

### SPRINT 4: Jenjang Pendidikan & Export/Import
- Halaman detail jenjang pendidikan (Universitas, SMA, SMP, SD, PAUD) dengan pagination.
- Fungsionalitas Export Excel untuk data provinsi, kabupaten/kota, dan jenjang pendidikan.
