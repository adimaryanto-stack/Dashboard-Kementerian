// ============================================
// Clean Data Placeholders (Post-Cleanup)
// ============================================
import {
  TahunAnggaran,
  AlokasiProvinsi,
  AlokasiKabupatenKota,
  InstitusiPendidikan,
  User,
  DashboardSummary,
  Jenjang,
  ProfilInstitusi,
  RincianPengeluaranBulanan,
  JenjangBreakdownProvinsi,
} from '@/types';

// Structural Metadata: 8 Years
export let tahunAnggaranData: TahunAnggaran[] = [
  { id: '1', tahun: 2020, total_anggaran: 0, status: 'CLOSED', created_at: '2020-01-01' },
  { id: '2', tahun: 2021, total_anggaran: 0, status: 'CLOSED', created_at: '2021-01-01' },
  { id: '3', tahun: 2022, total_anggaran: 0, status: 'CLOSED', created_at: '2022-01-01' },
  { id: '4', tahun: 2023, total_anggaran: 0, status: 'CLOSED', created_at: '2023-01-01' },
  { id: '5', tahun: 2024, total_anggaran: 0, status: 'CLOSED', created_at: '2024-01-01' },
  { id: '6', tahun: 2025, total_anggaran: 0, status: 'CLOSED', created_at: '2025-01-01' },
  { id: '7', tahun: 2026, total_anggaran: 0, status: 'ACTIVE', created_at: '2026-01-01' },
  { id: '8', tahun: 2027, total_anggaran: 0, status: 'DRAFT', created_at: '2026-06-01' },
];

const provinsiNames = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi',
  'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Kep. Bangka Belitung',
  'Kep. Riau', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta',
  'Jawa Timur', 'Banten', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur',
  'Kalimantan Utara', 'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan',
  'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara',
  'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan',
  'Papua Barat Daya',
];

// Structural Metadata: 38 Provinces (All values cleaned to 0)
export let alokasiProvinsiData: AlokasiProvinsi[] = provinsiNames.map((nama, i) => ({
  id: `prov-${i + 1}`,
  tahun_anggaran_id: '7',
  provinsi_id: `p-${i + 1}`,
  provinsi: { id: `p-${i + 1}`, kode_provinsi: `${11 + i}`, nama_provinsi: nama },
  nominal_alokasi: 0,
  realisasi_total: 0,
  selisih: 0,
  persentase_penyerapan: 0,
  updated_at: '2026-06-13',
}));

export let usersData: User[] = [];

// No-op update function
export function updateTahunAnggaranData(newData: TahunAnggaran[]) {
  tahunAnggaranData = newData;
}

// Data fetching stubs returning empty/default structures
export function getKabkotaByProvinsi(provinsiId: string): AlokasiKabupatenKota[] {
  return [];
}

export function getAllKabkota(): AlokasiKabupatenKota[] {
  return [];
}

export function getInstitusiByJenjang(jenjang: Jenjang): InstitusiPendidikan[] {
  return [];
}

export function getDashboardSummary(tahun: number = 2026): DashboardSummary {
  return {
    total_nominal: 0,
    total_realisasi: 0,
    persentase_penyerapan: 0,
    per_jenjang: [
      { jenjang: 'UNIVERSITAS', nominal: 0, realisasi: 0, persentase: 0 },
      { jenjang: 'SMA', nominal: 0, realisasi: 0, persentase: 0 },
      { jenjang: 'SMP', nominal: 0, realisasi: 0, persentase: 0 },
      { jenjang: 'SD', nominal: 0, realisasi: 0, persentase: 0 },
      { jenjang: 'PAUD', nominal: 0, realisasi: 0, persentase: 0 },
    ],
    tren_tahunan: [],
  };
}

export function getProfilInstitusi(id: string, tahun: number = 2026): ProfilInstitusi | null {
  return null;
}

export function getAllInstitusi(): InstitusiPendidikan[] {
  return [];
}

export function getRincianPengeluaranBulanan(
  institusiId: string,
  nomorBulan: number,
  tahun: number = 2026
): RincianPengeluaranBulanan | null {
  return null;
}

export function getJenjangBreakdownByKabkota(
  kabkotaId: string,
  nominalAlokasi: number
): JenjangBreakdownProvinsi[] {
  return [];
}

export function getInstitusiByKabkota(
  kabkotaId: string,
  namaKabkota: string,
  provinsiNama: string,
  totalNominal: number
): InstitusiPendidikan[] {
  return [];
}

export function getJenjangBreakdownByProvinsi(
  provinsiId: string,
  nominalAlokasi: number
): JenjangBreakdownProvinsi[] {
  return [];
}
