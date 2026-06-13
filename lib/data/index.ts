// ============================================
// Supabase Data Connector — Sistem Transparansi Anggaran Pendidikan
// Fetches directly from Supabase PostgREST API using env credentials
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
  SumberDanaInstitusi,
  PengeluaranBulananInstitusi,
} from '@/types';

// In-memory caching variables populated during initialization
export let tahunAnggaranData: TahunAnggaran[] = [];
export let alokasiProvinsiData: AlokasiProvinsi[] = [];
export let alokasiKabupatenKotaData: AlokasiKabupatenKota[] = [];
export let institusiPendidikanData: InstitusiPendidikan[] = [];
export let sumberDanaData: SumberDanaInstitusi[] = [];
export let pengeluaranBulananData: PengeluaranBulananInstitusi[] = [];
export let usersData: User[] = [];

export function updateTahunAnggaranData(newData: TahunAnggaran[]) {
  tahunAnggaranData = newData;
}

let isInitialized = false;

// Utility to get Supabase connection details safely on the client
function getSupabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jpytxmnxbicjmgsgprba.supabase.co').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  return { url, anonKey };
}

// Global initialization function to fetch and populate caches in parallel
export async function initDbConnection(force = false) {
  if (isInitialized && !force) return true;

  const { url, anonKey } = getSupabaseConfig();
  if (!anonKey) {
    console.warn('Supabase ANON KEY is not configured in .env.local.');
    return false;
  }

  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  };

  try {
    const [taRes, provRes, kabkotaRes, instRes, sdRes, pbRes, userRes] = await Promise.all([
      fetch(`${url}/rest/v1/tahun_anggaran?select=*&order=tahun.asc`, { headers }),
      fetch(`${url}/rest/v1/alokasi_provinsi?select=*,provinsi(*)&order=id.asc`, { headers }),
      fetch(`${url}/rest/v1/alokasi_kabupaten_kota?select=*,kabupaten_kota(*)&order=id.asc`, { headers }),
      fetch(`${url}/rest/v1/institusi_pendidikan?select=*&order=id.asc`, { headers }),
      fetch(`${url}/rest/v1/sumber_dana_institusi?select=*&order=id.asc`, { headers }),
      fetch(`${url}/rest/v1/pengeluaran_bulanan_institusi?select=*&order=id.asc`, { headers }),
      fetch(`${url}/rest/v1/users?select=*&order=id.asc`, { headers }),
    ]);

    const results = [
      { name: 'tahun_anggaran', res: taRes },
      { name: 'alokasi_provinsi', res: provRes },
      { name: 'alokasi_kabupaten_kota', res: kabkotaRes },
      { name: 'institusi_pendidikan', res: instRes },
      { name: 'sumber_dana_institusi', res: sdRes },
      { name: 'pengeluaran_bulanan_institusi', res: pbRes },
      { name: 'users', res: userRes }
    ];

    let hasFailed = false;
    for (const r of results) {
      if (!r.res.ok) {
        hasFailed = true;
        console.error(`Supabase table fetch failed: ${r.name} - Status: ${r.res.status} ${r.res.statusText}`);
        try {
          r.res.clone().text().then(text => console.error(`Error body for ${r.name}:`, text));
        } catch (e) {}
      }
    }

    if (hasFailed) {
      throw new Error('One or more table fetches failed.');
    }

    tahunAnggaranData = await taRes.json();
    alokasiProvinsiData = await provRes.json();
    alokasiKabupatenKotaData = await kabkotaRes.json();
    institusiPendidikanData = await instRes.json();
    sumberDanaData = await sdRes.json();
    pengeluaranBulananData = await pbRes.json();
    usersData = await userRes.json();

    isInitialized = true;
    console.log('Successfully synchronized database with Supabase.');
    return true;
  } catch (err) {
    console.error('Failed to load database from Supabase:', err);
    return false;
  }
}

// Mutate functions to save updates to Supabase directly
export async function updateAlokasiProvinsi(id: string, field: string, value: number) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/alokasi_provinsi?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [field]: value, updated_at: new Date().toISOString() }),
    });
    if (res.ok) {
      await initDbConnection(true); // force reload cache
    }
  } catch (err) {
    console.error('Failed to patch alokasi_provinsi:', err);
  }
}

export async function updateAlokasiKabupatenKota(id: string, field: string, value: number) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/alokasi_kabupaten_kota?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [field]: value, updated_at: new Date().toISOString() }),
    });
    if (res.ok) {
      await initDbConnection(true); // force reload cache
    }
  } catch (err) {
    console.error('Failed to patch alokasi_kabupaten_kota:', err);
  }
}

// Data fetching stubs returning elements from memory cache
export function getKabkotaByProvinsi(provinsiId: string): AlokasiKabupatenKota[] {
  return alokasiKabupatenKotaData.filter(
    (item) => item.kabupaten_kota?.provinsi_id === provinsiId
  );
}

export function getAllKabkota(): AlokasiKabupatenKota[] {
  return alokasiKabupatenKotaData;
}

export function getInstitusiByJenjang(jenjang: Jenjang): InstitusiPendidikan[] {
  return institusiPendidikanData.filter((item) => item.jenjang === jenjang);
}

export function getDashboardSummary(tahun: number = 2026): DashboardSummary {
  const targetTahun = tahunAnggaranData.find((t) => t.tahun === tahun);
  const totalNominal = targetTahun ? targetTahun.total_anggaran : 0;

  // Filter provinsi allocations matching the target active year id
  const matchingProvData = alokasiProvinsiData.filter(
    (p) => p.tahun_anggaran_id === targetTahun?.id
  );

  const totalRealisasi = matchingProvData.reduce((s, p) => s + p.realisasi_total, 0);

  // Group by jenjang from all institusi
  const jenjangSums: Record<Jenjang, { nominal: number; realisasi: number }> = {
    UNIVERSITAS: { nominal: 0, realisasi: 0 },
    SMA: { nominal: 0, realisasi: 0 },
    SMP: { nominal: 0, realisasi: 0 },
    SD: { nominal: 0, realisasi: 0 },
    PAUD: { nominal: 0, realisasi: 0 },
  };

  institusiPendidikanData.forEach((item) => {
    if (jenjangSums[item.jenjang]) {
      jenjangSums[item.jenjang].nominal += item.nominal_alokasi;
      jenjangSums[item.jenjang].realisasi += item.realisasi_total;
    }
  });

  const perJenjang = (Object.keys(jenjangSums) as Jenjang[]).map((j) => {
    const nominal = jenjangSums[j].nominal;
    const realisasi = jenjangSums[j].realisasi;
    return {
      jenjang: j,
      nominal,
      realisasi,
      persentase: nominal > 0 ? (realisasi / nominal) * 100 : 0,
    };
  });

  // Trend mapping from years configuration
  const trenTahunan = tahunAnggaranData.map((t) => {
    const yearProvData = alokasiProvinsiData.filter((p) => p.tahun_anggaran_id === t.id);
    const realSum = yearProvData.reduce((s, p) => s + p.realisasi_total, 0);
    return {
      tahun: t.tahun,
      nominal: t.total_anggaran,
      realisasi: realSum,
    };
  });

  return {
    total_nominal: totalNominal,
    total_realisasi: totalRealisasi,
    persentase_penyerapan: totalNominal > 0 ? (totalRealisasi / totalNominal) * 100 : 0,
    per_jenjang: perJenjang,
    tren_tahunan: trenTahunan,
  };
}

export function getProfilInstitusi(id: string, tahun: number = 2026): ProfilInstitusi | null {
  const institusi = institusiPendidikanData.find((item) => item.id === id);
  if (!institusi) return null;

  const sumber_dana = sumberDanaData.filter((sd) => sd.institusi_id === id);
  const pengeluaran_bulanan = pengeluaranBulananData.filter((pb) => pb.institusi_id === id);

  const totalNominalSumber = sumber_dana.reduce((s, d) => s + d.nominal, 0);
  const totalRealisasiSumber = sumber_dana.reduce((s, d) => s + d.realisasi, 0);
  const saldoSurplusDefisit = totalNominalSumber - totalRealisasiSumber;

  return {
    institusi,
    sumber_dana,
    pengeluaran_bulanan,
    saldo_surplus_defisit: saldoSurplusDefisit,
  };
}

export function getAllInstitusi(): InstitusiPendidikan[] {
  return institusiPendidikanData;
}

// Fetch rincian items from Supabase PostgREST API on-demand
export async function fetchRincianPengeluaranBulanan(
  institusiId: string,
  nomorBulan: number,
  tahun: number = 2026
): Promise<RincianPengeluaranBulanan | null> {
  const { url, anonKey } = getSupabaseConfig();
  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  };

  try {
    const inst = institusiPendidikanData.find((item) => item.id === institusiId);
    if (!inst) return null;

    const res = await fetch(
      `${url}/rest/v1/rincian_pengeluaran_item?institusi_id=eq.${institusiId}&nomor_bulan=eq.${nomorBulan}&order=nomor.asc`,
      { headers }
    );
    if (!res.ok) throw new Error('Failed to fetch items');

    const items = await res.json();

    const bulanNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    const subTotal = items.reduce((s: number, item: any) => s + item.jumlah, 0);
    const pajak_persen = 11;
    const pajak_nominal = Math.round((subTotal * pajak_persen) / 100);

    return {
      institusi_id: institusiId,
      institusi_nama: inst.nama_institusi,
      bulan: bulanNames[nomorBulan - 1] || 'Januari',
      nomor_bulan: nomorBulan,
      items,
      sub_total: subTotal,
      pajak_persen,
      pajak_nominal,
      total: subTotal + pajak_nominal,
    };
  } catch (err) {
    console.error('Failed to fetch rincian from Supabase:', err);
    return null;
  }
}

// Legacy synchronous fallback returning null
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
  // Compute breakdown dynamically based on institutions under this kabkota
  const kabSchools = institusiPendidikanData.filter(
    (item) => item.kabupaten_kota_id === kabkotaId
  );

  const jenjangCounts = { UNIVERSITAS: 0, SMA: 0, SMP: 0, SD: 0, PAUD: 0 };
  const jenjangBudgets = { UNIVERSITAS: 0, SMA: 0, SMP: 0, SD: 0, PAUD: 0 };

  kabSchools.forEach((item) => {
    jenjangCounts[item.jenjang]++;
    jenjangBudgets[item.jenjang] += item.nominal_alokasi;
  });

  const labels: Record<Jenjang, string> = {
    UNIVERSITAS: 'Universitas (Strata 1)',
    SMA: 'Sekolah Menengah Atas (SMA)',
    SMP: 'Sekolah Menengah Pertama (SMP)',
    SD: 'Sekolah Dasar (SD)',
    PAUD: 'Pendidikan Anak Usia Dini (PAUD)',
  };

  return (Object.keys(labels) as Jenjang[]).map((j, i) => {
    const budget = jenjangBudgets[j];
    return {
      nomor: i + 1,
      jenjang: labels[j],
      jumlah_sekolah: jenjangCounts[j],
      nominal_keseluruhan: budget,
      porsi_anggaran: nominalAlokasi > 0 ? (budget / nominalAlokasi) * 100 : 0,
    };
  });
}

export function getInstitusiByKabkota(
  kabkotaId: string,
  namaKabkota: string,
  provinsiNama: string,
  totalNominal: number
): InstitusiPendidikan[] {
  return institusiPendidikanData.filter((item) => item.kabupaten_kota_id === kabkotaId);
}

export function getJenjangBreakdownByProvinsi(
  provinsiId: string,
  nominalAlokasi: number
): JenjangBreakdownProvinsi[] {
  // Filter all kabkotas of this province
  const kabIdList = alokasiKabupatenKotaData
    .filter((k) => k.kabupaten_kota?.provinsi_id === provinsiId)
    .map((k) => k.kabupaten_kota_id);

  const provSchools = institusiPendidikanData.filter((item) =>
    kabIdList.includes(item.kabupaten_kota_id)
  );

  const jenjangCounts = { UNIVERSITAS: 0, SMA: 0, SMP: 0, SD: 0, PAUD: 0 };
  const jenjangBudgets = { UNIVERSITAS: 0, SMA: 0, SMP: 0, SD: 0, PAUD: 0 };

  provSchools.forEach((item) => {
    jenjangCounts[item.jenjang]++;
    jenjangBudgets[item.jenjang] += item.nominal_alokasi;
  });

  const labels: Record<Jenjang, string> = {
    UNIVERSITAS: 'Universitas (Strata 1)',
    SMA: 'Sekolah Menengah Atas (SMA)',
    SMP: 'Sekolah Menengah Pertama (SMP)',
    SD: 'Sekolah Dasar (SD)',
    PAUD: 'Pendidikan Anak Usia Dini (PAUD)',
  };

  return (Object.keys(labels) as Jenjang[]).map((j, i) => {
    const budget = jenjangBudgets[j];
    return {
      nomor: i + 1,
      jenjang: labels[j],
      jumlah_sekolah: jenjangCounts[j],
      nominal_keseluruhan: budget,
      porsi_anggaran: nominalAlokasi > 0 ? (budget / nominalAlokasi) * 100 : 0,
    };
  });
}
