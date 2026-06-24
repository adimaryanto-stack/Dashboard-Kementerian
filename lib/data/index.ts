/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// ============================================
// Supabase Data Connector — Dashboard Kementerian
// Fetches directly from Supabase PostgREST API using env credentials
// ============================================
import {
  TahunAnggaran,
  AlokasiProvinsi,
  AlokasiKabupatenKota,
  InstitusiPendidikan,
  User,
  UserRole,
  DashboardSummary,
  Jenjang,
  ProfilInstitusi,
  RincianPengeluaranBulanan,
  RincianPengeluaranItem,
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

// Helper for paginated fetch to bypass PostgREST 1000-row limit
async function fetchPaginated(url: string, headers: HeadersInit): Promise<any[]> {
  let allData: any[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}limit=${limit}&offset=${offset}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Error details for ${url}:`, text);
      throw new Error(`Failed to fetch paginated data for ${url}: ${res.statusText}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < limit) break;
    offset += limit;
  }
  return allData;
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
    const [taData, provData, kabkotaData, instData, sdData, pbData, userData] = await Promise.all([
      fetchPaginated(`${url}/rest/v1/tahun_anggaran?select=*&order=tahun.asc`, headers),
      fetchPaginated(`${url}/rest/v1/alokasi_provinsi?select=*,provinsi(*)&order=id.asc`, headers),
      fetchPaginated(`${url}/rest/v1/alokasi_kabupaten_kota?select=*,kabupaten_kota(*)&order=id.asc`, headers),
      fetchPaginated(`${url}/rest/v1/institusi_pendidikan?select=*&order=id.asc`, headers),
      fetchPaginated(`${url}/rest/v1/sumber_dana_institusi?select=*&order=id.asc`, headers),
      fetchPaginated(`${url}/rest/v1/pengeluaran_bulanan_institusi?select=*&order=id.asc`, headers),
      fetchPaginated(`${url}/rest/v1/users?select=*&order=id.asc`, headers),
    ]);

    tahunAnggaranData = taData;
    alokasiProvinsiData = provData;
    alokasiKabupatenKotaData = kabkotaData;
    institusiPendidikanData = instData;
    sumberDanaData = sdData;
    pengeluaranBulananData = pbData;
    usersData = userData;

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

export function getProfilInstitusi(id: string, _tahun: number = 2026): ProfilInstitusi | null {
  const institusi = institusiPendidikanData.find((item) => item.id === id);
  if (!institusi) return null;

  const sumber_dana = sumberDanaData.filter((sd) => sd.institusi_id === id);
  const pengeluaran_bulanan = pengeluaranBulananData
    .filter((pb) => pb.institusi_id === id)
    .sort((a, b) => a.nomor - b.nomor);

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
  _tahun: number = 2026
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
  _namaKabkota: string,
  _provinsiNama: string,
  _totalNominal: number
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

// ============================================
// Supabase Database Mutations (Sprint 4)
// ============================================

export async function updateTahunAnggaran(id: string, updates: Partial<TahunAnggaran>) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/tahun_anggaran?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await initDbConnection(true); // reload local cache
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to update tahun_anggaran:', err);
    return false;
  }
}

export async function createTahunAnggaran(tahun: number, total_anggaran: number) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/tahun_anggaran`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tahun,
        total_anggaran,
        status: 'DRAFT',
        created_at: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      await initDbConnection(true);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to create tahun_anggaran:', err);
    return false;
  }
}

export async function deleteTahunAnggaran(id: string) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/tahun_anggaran?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });
    if (res.ok) {
      await initDbConnection(true);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to delete tahun_anggaran:', err);
    return false;
  }
}

export async function createUser(username: string, email: string, role: UserRole) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        role,
        is_active: true,
        created_at: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      await initDbConnection(true);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to create user:', err);
    return false;
  }
}

export async function updateUser(id: string, updates: Partial<User>) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/users?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await initDbConnection(true);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to update user:', err);
    return false;
  }
}

export async function updateSumberDana(id: string, updates: Partial<SumberDanaInstitusi>) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/sumber_dana_institusi?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await initDbConnection(true);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to update sumber_dana_institusi:', err);
    return false;
  }
}

export async function updatePengeluaranBulanan(id: string, updates: Partial<PengeluaranBulananInstitusi>) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/pengeluaran_bulanan_institusi?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      await initDbConnection(true);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to update pengeluaran_bulanan_institusi:', err);
    return false;
  }
}

export async function createRincianPengeluaranItem(item: {
  institusi_id: string;
  nomor_bulan: number;
  nomor: number;
  nama_produk_jasa: string;
  harga_satuan: number;
  qty: number;
  jumlah: number;
}) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/rincian_pengeluaran_item`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to create rincian_pengeluaran_item:', err);
    return false;
  }
}

export async function updateRincianPengeluaranItem(id: string, updates: Partial<RincianPengeluaranItem>) {
  const { url, anonKey } = getSupabaseConfig();
  try {
    const res = await fetch(`${url}/rest/v1/rincian_pengeluaran_item?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to update rincian_pengeluaran_item:', err);
    return false;
  }
}

export async function updateInstitusiPendidikan(
  id: string,
  updates: { nominal_alokasi?: number; realisasi_total?: number; nomor_rekening?: string }
) {
  const { url, anonKey } = getSupabaseConfig();
  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };

  try {
    // 1. Fetch current institution state
    const instRes = await fetch(`${url}/rest/v1/institusi_pendidikan?id=eq.${id}`, { headers });
    if (!instRes.ok) throw new Error('Failed to fetch institution');
    const [inst] = await instRes.json();
    if (!inst) throw new Error('Institution not found');

    const newNominal = updates.nominal_alokasi !== undefined ? updates.nominal_alokasi : inst.nominal_alokasi;
    const newRealisasi = updates.realisasi_total !== undefined ? updates.realisasi_total : inst.realisasi_total;
    const newSelisih = newNominal - newRealisasi;
    const newPct = newNominal > 0 ? (newRealisasi / newNominal) * 100 : 0;

    const patchPayload: any = {
      nominal_alokasi: newNominal,
      realisasi_total: newRealisasi,
      selisih: newSelisih,
      persentase_penyerapan: newPct,
      updated_at: new Date().toISOString()
    };

    if (updates.nomor_rekening !== undefined) {
      patchPayload.nomor_rekening = updates.nomor_rekening;
    }

    // 2. Patch institution in DB
    const patchInstRes = await fetch(`${url}/rest/v1/institusi_pendidikan?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchPayload),
    });
    if (!patchInstRes.ok) throw new Error('Failed to patch institution');

    // 3. Trigger cascade update to parent Kabupaten/Kota
    const kabkotaId = inst.kabupaten_kota_id;
    if (kabkotaId) {
      const allInstsRes = await fetch(`${url}/rest/v1/institusi_pendidikan?kabupaten_kota_id=eq.${kabkotaId}`, { headers });
      if (allInstsRes.ok) {
        const allInsts = await allInstsRes.json();
        const totalNominalKab = allInsts.reduce((s: number, i: any) => s + (i.id === id ? newNominal : i.nominal_alokasi), 0);
        const totalRealisasiKab = allInsts.reduce((s: number, i: any) => s + (i.id === id ? newRealisasi : i.realisasi_total), 0);

        const alokasiKabRes = await fetch(`${url}/rest/v1/alokasi_kabupaten_kota?kabupaten_kota_id=eq.${kabkotaId}`, { headers });
        if (alokasiKabRes.ok) {
          const alokasiKabs = await alokasiKabRes.json();
          for (const alokasiKab of alokasiKabs) {
            const selisihKab = totalNominalKab - totalRealisasiKab;
            const pctKab = totalNominalKab > 0 ? (totalRealisasiKab / totalNominalKab) * 100 : 0;

            const patchKabRes = await fetch(`${url}/rest/v1/alokasi_kabupaten_kota?id=eq.${alokasiKab.id}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({
                nominal_alokasi: totalNominalKab,
                realisasi_total: totalRealisasiKab,
                selisih: selisihKab,
                persentase_penyerapan: pctKab,
                updated_at: new Date().toISOString()
              })
            });

            if (patchKabRes.ok) {
              // 4. Trigger cascade update to parent Provinsi
              const provId = alokasiKab.kabupaten_kota?.provinsi_id || (alokasiKab.alokasi_provinsi_id ? 
                await (async () => {
                  const apRes = await fetch(`${url}/rest/v1/alokasi_provinsi?id=eq.${alokasiKab.alokasi_provinsi_id}`, { headers });
                  if (apRes.ok) {
                    const [ap] = await apRes.json();
                    return ap?.provinsi_id;
                  }
                  return null;
                })() : null);

              if (provId) {
                const allKabkotasOfProvRes = await fetch(`${url}/rest/v1/kabupaten_kota?provinsi_id=eq.${provId}`, { headers });
                if (allKabkotasOfProvRes.ok) {
                  const kabkotasOfProv = await allKabkotasOfProvRes.json();
                  const kabkotaIds = kabkotasOfProv.map((k: any) => k.id);

                  const allAlokasiKabsRes = await fetch(`${url}/rest/v1/alokasi_kabupaten_kota?kabupaten_kota_id=in.(${kabkotaIds.join(',')})`, { headers });
                  if (allAlokasiKabsRes.ok) {
                    const allAlokasiKabs = await allAlokasiKabsRes.json();
                    const totalNominalProv = allAlokasiKabs.reduce((s: number, k: any) => 
                      s + (k.id === alokasiKab.id ? totalNominalKab : k.nominal_alokasi), 0);
                    const totalRealisasiProv = allAlokasiKabs.reduce((s: number, k: any) => 
                      s + (k.id === alokasiKab.id ? totalRealisasiKab : k.realisasi_total), 0);
                    const selisihProv = totalNominalProv - totalRealisasiProv;
                    const pctProv = totalNominalProv > 0 ? (totalRealisasiProv / totalNominalProv) * 100 : 0;

                    const alokasiProvRes = await fetch(`${url}/rest/v1/alokasi_provinsi?provinsi_id=eq.${provId}`, { headers });
                    if (alokasiProvRes.ok) {
                      const alokasiProvs = await alokasiProvRes.json();
                      for (const alokasiProv of alokasiProvs) {
                        const patchProvRes = await fetch(`${url}/rest/v1/alokasi_provinsi?id=eq.${alokasiProv.id}`, {
                          method: 'PATCH',
                          headers,
                          body: JSON.stringify({
                            nominal_alokasi: totalNominalProv,
                            realisasi_total: totalRealisasiProv,
                            selisih: selisihProv,
                            persentase_penyerapan: pctProv,
                            updated_at: new Date().toISOString()
                          })
                        });

                        if (patchProvRes.ok) {
                          // 5. Trigger cascade update to parent APBN (tahun_anggaran)
                          const taId = alokasiProv.tahun_anggaran_id;
                          if (taId) {
                            const allAlokasiProvsRes = await fetch(`${url}/rest/v1/alokasi_provinsi?tahun_anggaran_id=eq.${taId}`, { headers });
                            if (allAlokasiProvsRes.ok) {
                              const allAlokasiProvs = await allAlokasiProvsRes.json();
                              const totalNominalTA = allAlokasiProvs.reduce((s: number, p: any) => 
                                s + (p.id === alokasiProv.id ? totalNominalProv : p.nominal_alokasi), 0);

                              await fetch(`${url}/rest/v1/tahun_anggaran?id=eq.${taId}`, {
                                method: 'PATCH',
                                headers,
                                body: JSON.stringify({
                                  total_anggaran: totalNominalTA
                                })
                              });
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    await initDbConnection(true);
    return true;
  } catch (err) {
    console.error('Failed to update institusi_pendidikan and cascade:', err);
    return false;
  }
}

export async function fetchKecamatanForKabkota(kabkotaId: string): Promise<{ id: string; name: string }[]> {
  const { url, anonKey } = getSupabaseConfig();
  if (!anonKey) return [];
  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  };

  try {
    // 1. Get the kabupaten_kota details from alokasiKabupatenKotaData or Supabase
    const kk = alokasiKabupatenKotaData.find(item => item.kabupaten_kota_id === kabkotaId)?.kabupaten_kota;
    if (!kk) {
      console.warn(`Kabupaten/Kota with ID ${kabkotaId} not found in cache.`);
      return [];
    }

    // 2. Normalize name for matching
    const normKK = kk.nama_kabupaten_kota.toLowerCase()
      .replace(/^kab\.\s+/, 'kabupaten ')
      .replace(/^kabupaten\s+/, '')
      .replace(/^kota\s+/, '')
      .trim();

    // Query regencies by name to get its UUID
    const resReg = await fetch(`${url}/rest/v1/regencies?name=ilike.*${normKK}*`, { headers });
    if (!resReg.ok) {
      console.error(`Failed to fetch regency for name ${normKK}: ${resReg.statusText}`);
      return [];
    }
    const regData = await resReg.json();
    if (regData.length === 0) {
      console.warn(`No regency found in Supabase matching name ${normKK}`);
      return [];
    }
    const reg = regData[0];

    // 3. Fetch all districts (kecamatan) for this regency
    const resDist = await fetch(`${url}/rest/v1/districts?regency_id=eq.${reg.id}&order=name.asc`, { headers });
    if (!resDist.ok) {
      console.error(`Failed to fetch districts for regency ${reg.id}: ${resDist.statusText}`);
      return [];
    }
    const distData = await resDist.json();
    return distData.map((d: any) => ({
      id: d.id,
      name: d.name
    }));
  } catch (err) {
    console.error('Failed in fetchKecamatanForKabkota:', err);
    return [];
  }
}

