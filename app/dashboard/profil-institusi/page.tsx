'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PctBadge from '@/components/ui/PctBadge';
import { 
  getAllInstitusi, 
  alokasiProvinsiData, 
  alokasiKabupatenKotaData, 
  fetchKecamatanForKabkota 
} from '@/lib/data';
import { fmtRupiah } from '@/lib/utils/formatters';
import { Jenjang } from '@/types';
import { Search, ExternalLink, ChevronLeft, ChevronRight, School, GraduationCap, Building } from 'lucide-react';

const jenjangOptions: { value: '' | Jenjang; label: string }[] = [
  { value: '', label: 'Semua Jenjang' },
  { value: 'UNIVERSITAS', label: 'Universitas' },
  { value: 'SMA', label: 'SMA' },
  { value: 'SMP', label: 'SMP' },
  { value: 'SD', label: 'SD' },
  { value: 'PAUD', label: 'PAUD' },
];

export default function ProfilInstitusiPage() {
  const allInstitusi = useMemo(() => getAllInstitusi(), []);
  
  // States
  const [search, setSearch] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState<'' | Jenjang>('');
  const [selectedProvinsiId, setSelectedProvinsiId] = useState('');
  const [selectedKabkotaId, setSelectedKabkotaId] = useState('');
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [kecamatanList, setKecamatanList] = useState<{ id: string; name: string }[]>([]);
  const [loadingKecamatan, setLoadingKecamatan] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Cascading Filter Handlers
  const handleProvinsiChange = (provId: string) => {
    setSelectedProvinsiId(provId);
    setSelectedKabkotaId('');
    setSelectedKecamatan('');
    setKecamatanList([]);
    setCurrentPage(1);
  };

  const handleKabkotaChange = async (kabId: string) => {
    setSelectedKabkotaId(kabId);
    setSelectedKecamatan('');
    setCurrentPage(1);

    if (kabId) {
      setLoadingKecamatan(true);
      try {
        const list = await fetchKecamatanForKabkota(kabId);
        setKecamatanList(list);
      } catch (e) {
        console.error('Failed to load subdistricts:', e);
      } finally {
        setLoadingKecamatan(false);
      }
    } else {
      setKecamatanList([]);
    }
  };

  const handleKecamatanChange = (kec: string) => {
    setSelectedKecamatan(kec);
    setCurrentPage(1);
  };

  const handleJenjangChange = (jen: '' | Jenjang) => {
    setSelectedJenjang(jen);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  // Filtered Kabupaten/Kota Options based on selected Provinsi
  const kabupatenOptions = useMemo(() => {
    if (!selectedProvinsiId) return [];
    const filteredKK = alokasiKabupatenKotaData.filter(
      item => item.kabupaten_kota.provinsi_id === selectedProvinsiId
    );
    
    const seen = new Set();
    const list = [];
    for (const item of filteredKK) {
      const kk = item.kabupaten_kota;
      if (!seen.has(kk.id)) {
        seen.add(kk.id);
        list.push(kk);
      }
    }
    return list.sort((a, b) => a.nama_kabupaten_kota.localeCompare(b.nama_kabupaten_kota));
  }, [selectedProvinsiId]);

  // Main Filtering Logic
  const filtered = useMemo(() => {
    let result = allInstitusi;

    if (selectedJenjang) {
      result = result.filter(inst => inst.jenjang === selectedJenjang);
    }
    if (selectedProvinsiId) {
      const prov = alokasiProvinsiData.find(p => p.provinsi_id === selectedProvinsiId);
      if (prov) {
        result = result.filter(inst => inst.provinsi_nama === prov.provinsi.nama_provinsi);
      }
    }
    if (selectedKabkotaId) {
      result = result.filter(inst => inst.kabupaten_kota_id === selectedKabkotaId);
    }
    if (selectedKecamatan) {
      result = result.filter(inst => {
        if (!inst.alamat) return false;
        return inst.alamat.toLowerCase().includes(selectedKecamatan.toLowerCase());
      });
    }
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(inst =>
        inst.nama_institusi.toLowerCase().includes(query) ||
        (inst.npsn && inst.npsn.includes(query)) ||
        (inst.alamat && inst.alamat.toLowerCase().includes(query))
      );
    }

    return result;
  }, [allInstitusi, search, selectedJenjang, selectedProvinsiId, selectedKabkotaId, selectedKecamatan]);

  // Jenjang Counts Stats calculation
  const stats = useMemo(() => {
    const categories = [
      { type: 'UNIVERSITAS' as Jenjang, label: 'Universitas', bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-700', icon: GraduationCap },
      { type: 'SMA' as Jenjang, label: 'SMA', bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: School },
      { type: 'SMP' as Jenjang, label: 'SMP', bg: 'bg-sky-50 border-sky-100', text: 'text-sky-700', icon: School },
      { type: 'SD' as Jenjang, label: 'SD', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', icon: School },
      { type: 'PAUD' as Jenjang, label: 'PAUD', bg: 'bg-pink-50 border-pink-100', text: 'text-pink-700', icon: Building },
    ];

    return categories.map(cat => {
      const totalCount = allInstitusi.filter(inst => inst.jenjang === cat.type).length;
      const filteredCount = filtered.filter(inst => inst.jenjang === cat.type).length;
      return {
        ...cat,
        totalCount,
        filteredCount
      };
    });
  }, [allInstitusi, filtered]);

  // Pagination Logic
  const pageSize = 100;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  return (
    <div className="min-h-screen">
      <Header
        title="Profil Institusi"
        subtitle="Klik nama institusi untuk melihat detail profil keuangan"
      />

      <div className="p-6">
        {/* ===== STATS CARDS ===== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {stats.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.type} className={`p-4 rounded-xl border ${item.bg} flex flex-col justify-between shadow-sm transition-all hover:shadow-md`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${item.text}`}>{item.label}</span>
                  <Icon size={16} className={`${item.text} opacity-60`} />
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold font-mono ${item.text}`}>{item.filteredCount}</span>
                  {item.filteredCount !== item.totalCount && (
                    <span className="text-[10px] text-slate-400 font-medium">/ {item.totalCount} total</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="sheet-toolbar flex-wrap gap-y-3">
          {/* Jenjang */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Jenjang:</span>
            <select
              value={selectedJenjang}
              onChange={(e) => handleJenjangChange(e.target.value as '' | Jenjang)}
              className="select-dropdown font-medium text-xs text-text-secondary"
            >
              {jenjangOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Provinsi */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Provinsi:</span>
            <select
              value={selectedProvinsiId}
              onChange={(e) => handleProvinsiChange(e.target.value)}
              className="select-dropdown font-medium text-xs text-text-secondary"
            >
              <option value="">Semua Provinsi</option>
              {alokasiProvinsiData.map(p => (
                <option key={p.provinsi_id} value={p.provinsi_id}>{p.provinsi.nama_provinsi}</option>
              ))}
            </select>
          </div>

          {/* Kabupaten/Kota (Cascading) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Kab/Kota:</span>
            <select
              value={selectedKabkotaId}
              onChange={(e) => handleKabkotaChange(e.target.value)}
              disabled={!selectedProvinsiId}
              className="select-dropdown font-medium text-xs text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Semua Kab/Kota</option>
              {kabupatenOptions.map(kk => (
                <option key={kk.id} value={kk.id}>{kk.nama_kabupaten_kota}</option>
              ))}
            </select>
          </div>

          {/* Kecamatan (Cascading & Dynamic Fetch) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium">Kecamatan:</span>
            <select
              value={selectedKecamatan}
              onChange={(e) => handleKecamatanChange(e.target.value)}
              disabled={!selectedKabkotaId || loadingKecamatan}
              className="select-dropdown font-medium text-xs text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingKecamatan ? 'Memuat...' : 'Semua Kecamatan'}
              </option>
              {kecamatanList.map(kec => (
                <option key={kec.id} value={kec.name}>{kec.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari nama, NPSN, alamat..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input text-xs font-medium py-1.5"
            />
          </div>
        </div>

        {/* Table */}
        <div className="sheet-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 280 }}>Nama Institusi / Alamat</th>
                <th className="sheet-header-cell text-center" style={{ width: 110 }}>Jenjang</th>
                <th className="sheet-header-cell text-center" style={{ width: 90 }}>Status</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 150 }}>Kabupaten/Kota</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 130 }}>Provinsi</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 150 }}>Nominal (Rp)</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 150 }}>Realisasi (Rp)</th>
                <th className="sheet-header-cell text-center" style={{ width: 110 }}>%</th>
                <th className="sheet-header-cell text-center" style={{ width: 60 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="sheet-cell text-center py-8 text-text-muted text-sm">
                    Tidak ada institusi pendidikan yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                paginated.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                      <td className="sheet-cell text-center text-text-muted text-xs font-mono">{globalIdx}</td>
                      <td className="sheet-cell text-left">
                        <Link
                          href={`/dashboard/profil-institusi/${row.id}`}
                          className="hover:text-accent hover:underline font-bold text-text-primary text-sm transition-colors block"
                        >
                          {row.nama_institusi}
                        </Link>
                        {/* Inline Alamat & NPSN */}
                        <div className="text-[10px] text-text-muted mt-0.5 font-normal leading-relaxed">
                          <span className="font-semibold text-indigo-600 font-mono bg-indigo-50 px-1 rounded">NPSN: {row.npsn}</span>
                          <span className="mx-1.5">•</span>
                          <span>{row.alamat || 'Alamat tidak tersedia'}</span>
                        </div>
                      </td>
                      <td className="sheet-cell text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.jenjang === 'UNIVERSITAS' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : row.jenjang === 'SMA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : row.jenjang === 'SMP' ? 'bg-sky-100 text-sky-700 border border-sky-200'
                          : row.jenjang === 'SD' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-pink-100 text-pink-700 border border-pink-200'
                        }`}>
                          {row.jenjang}
                        </span>
                      </td>
                      <td className="sheet-cell text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          row.status_sekolah === 'NEGERI' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
                        }`}>
                          {row.status_sekolah}
                        </span>
                      </td>
                      <td className="sheet-cell text-left text-text-secondary text-xs">{row.kabupaten_kota_nama}</td>
                      <td className="sheet-cell text-left text-text-secondary text-xs">{row.provinsi_nama}</td>
                      <td className="sheet-cell text-right font-mono text-xs">{fmtRupiah(row.nominal_alokasi)}</td>
                      <td className="sheet-cell text-right font-mono text-xs">{fmtRupiah(row.realisasi_total)}</td>
                      <td className="sheet-cell text-center">
                        <PctBadge value={row.persentase_penyerapan} />
                      </td>
                      <td className="sheet-cell text-center">
                        <Link
                          href={`/dashboard/profil-institusi/${row.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-indigo-100 text-text-muted hover:text-accent transition-colors"
                          title="Lihat Profil"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===== PAGINATION FOOTER ===== */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-4 px-2 flex-wrap gap-3">
          <span className="text-xs text-text-muted font-medium">
            Menampilkan <span className="font-semibold font-mono">{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> - <span className="font-semibold font-mono">{Math.min(filtered.length, currentPage * pageSize)}</span> dari <span className="font-semibold font-mono">{filtered.length}</span> institusi
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-text-secondary hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1 text-xs font-medium"
              >
                <ChevronLeft size={14} />
                Sebelumnya
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1;
                if (totalPages > 5 && Math.abs(pageNum - currentPage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 && currentPage > 3) {
                    return <span key={pageNum} className="px-1 text-text-muted text-xs">...</span>;
                  }
                  if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                    return <span key={pageNum} className="px-1 text-text-muted text-xs">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-text-secondary hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-text-secondary hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1 text-xs font-medium"
              >
                Selanjutnya
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-text-muted font-medium">
          🏫 Klik nama institusi atau ikon untuk melihat detail profil keuangan
        </p>
      </div>
    </div>
  );
}
