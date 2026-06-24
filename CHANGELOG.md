# Changelog — Dashboard Kementerian

Semua perubahan penting pada proyek **Dashboard Kementerian** akan didokumentasikan di file ini. Format berkas ini mengacu pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) dan mematuhi penomoran [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 24-06-2026

### Ditambahkan
- Ditambahkan menu **User Manager** lengkap dengan data mock user yang komprehensif, fitur CRUD (Tambah/Edit/Hapus), dan status aktif/nonaktif.
- Ditambahkan mekanisme **Role-Based Access Control (RBAC)** untuk membatasi interaksi (seperti inline spreadsheet editing) bagi pengguna dengan peran `VIEWER` atau `AUDITOR`, atau admin dengan cakupan wilayah berbeda.
- Ditambahkan visualisasi grafik tren pengeluaran bulanan dan alokasi per sumber dana di menu **Profil Institusi**.
- Ditambahkan screenshot fungsionalitas aplikasi di localhost (Port 3009) yang dirujuk ke dalam `README.md`.
- Ditambahkan file target roadmap/checklist minimal layak produk [`MVP.md`](./MVP.md) ke struktur project.

### Diubah
- Mengubah nama project resmi dan seluruh referensi dokumen menjadi **Dashboard Kementerian**.
- Memperbaiki pengurutan pengeluaran bulanan (berdasarkan nomor bulan 1-12).
- Meningkatkan fitur pencarian header agar berfungsi penuh dengan pencarian nama sekolah/institusi secara instan dan redirect langsung ke profil sekolah.
- Menyesuaikan penomoran versi di `package.json` menjadi `1.4.0`.

---

## [1.3.0] - 13-06-2026

### Ditambahkan
- Ditambahkan tombol **Deploy with Vercel** di berkas `README.md`.
- Ditambahkan konfigurasi `vercel.json` untuk optimasi pembangunan web Next.js di platform Vercel.

### Diubah
- Membersihkan referensi data InsForge dan menghapus file konfigurasi `.insforge/` agar demo dapat berjalan 100% independen sebagai client-side mockup statis.
- Mengembalikan data mock APBN, Provinsi, Kab/Kota, dan data Sekolah secara lengkap pada layer `lib/data/index.ts`.

---

## [1.0.0] - 13-05-2026

### Ditambahkan
- Rilis inisial Dashboard Anggaran Pendidikan Indonesia dengan antarmuka spreadsheet interaktif (inline editing, cascade update, dan export Excel menggunakan ExcelJS).
