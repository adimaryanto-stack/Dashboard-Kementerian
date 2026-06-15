'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PctBadge from '@/components/ui/PctBadge';
import { useAppStore } from '@/lib/store';
import { 
  alokasiProvinsiData, 
  getKabkotaByProvinsi, 
  getInstitusiByKabkota, 
  updateInstitusiPendidikan 
} from '@/lib/data';
import { fmtRupiah } from '@/lib/utils/formatters';
import { InstitusiPendidikan } from '@/types';
import { ArrowLeft, Download, School, Sparkles, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import { exportToExcel, getPctColorHex } from '@/lib/utils/excelExport';

export default function KabkotaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const kabkotaId = params.kabkotaId as string;
  const { activeTahun } = useAppStore();

  // Use real Supabase data directly — no scaling
  const provData = useMemo(() => {
    return alokasiProvinsiData.find(p => p.provinsi_id === id) || null;
  }, [id]);

  const kabkotaData = useMemo(() => {
    return getKabkotaByProvinsi(id).find(k => k.kabupaten_kota_id === kabkotaId) || null;
  }, [id, kabkotaId]);

  const realSchoolList = useMemo(() => {
    if (!kabkotaData || !provData) return [];
    return getInstitusiByKabkota(
      kabkotaId,
      kabkotaData.kabupaten_kota.nama_kabupaten_kota,
      provData.provinsi.nama_provinsi,
      kabkotaData.nominal_alokasi
    );
  }, [kabkotaId, kabkotaData, provData]);

  // States
  const [prevRealSchoolList, setPrevRealSchoolList] = useState(realSchoolList);
  const [schoolList, setSchoolList] = useState<InstitusiPendidikan[]>(realSchoolList);

  if (realSchoolList !== prevRealSchoolList) {
    setPrevRealSchoolList(realSchoolList);
    setSchoolList(realSchoolList);
  }
  
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'nominal_alokasi' | 'realisasi_total' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [search, setSearch] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Extract unique jenjang values for filter
  const jenjangOptions = useMemo(() => {
    const jenjangSet = new Set(schoolList.map(s => s.jenjang));
    return Array.from(jenjangSet).sort();
  }, [schoolList]);

  // Filtered data
  const filtered = useMemo(() => {
    let result = schoolList;
    if (selectedJenjang) {
      result = result.filter(s => s.jenjang === selectedJenjang);
    }
    if (search) {
      result = result.filter(s => s.nama_institusi.toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [schoolList, selectedJenjang, search]);

  // Calculate dynamic totals based on filtered data
  const totals = useMemo(() => {
    const nominal = filtered.reduce((sum, item) => sum + item.nominal_alokasi, 0);
    const realisasi = filtered.reduce((sum, item) => sum + item.realisasi_total, 0);
    const selisih = nominal - realisasi;
    const persentase = nominal > 0 ? (realisasi / nominal) * 100 : 0;
    return { nominal, realisasi, selisih, persentase };
  }, [filtered]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // Jenjang Breakdown calculation
  const jenjangBreakdown = useMemo(() => {
    const counts = { UNIVERSITAS: 0, SMA: 0, SMP: 0, SD: 0, PAUD: 0 };
    const budgets = { UNIVERSITAS: 0, SMA: 0, SMP: 0, SD: 0, PAUD: 0 };

    schoolList.forEach((item) => {
      if (item.jenjang in counts) {
        counts[item.jenjang]++;
        budgets[item.jenjang] += item.nominal_alokasi;
      }
    });

    const labels = {
      UNIVERSITAS: 'Universitas (Strata 1)',
      SMA: 'Sekolah Menengah Atas (SMA)',
      SMP: 'Sekolah Menengah Pertama (SMP)',
      SD: 'Sekolah Dasar (SD)',
      PAUD: 'Pendidikan Anak Usia Dini (PAUD)',
    };

    const totalNom = schoolList.reduce((s, i) => s + i.nominal_alokasi, 0);

    return (Object.keys(labels) as Array<keyof typeof labels>).map((j, i) => {
      const budget = budgets[j];
      return {
        nomor: i + 1,
        jenjang: labels[j],
        jumlah_sekolah: counts[j],
        nominal_keseluruhan: budget,
        porsi_anggaran: totalNom > 0 ? Math.round((budget / totalNom) * 1000) / 10 : 0,
      };
    });
  }, [schoolList]);

  if (!provData || !kabkotaData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-md border border-slate-100 max-w-md">
          <h2 className="text-xl font-bold text-text-primary mb-2">Daerah Tidak Ditemukan</h2>
          <p className="text-text-muted mb-6">Data Wilayah / Kabupaten tidak terdaftar di sistem.</p>
          <button onClick={() => router.back()} className="btn btn-primary inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // Inline editing functions
  const startEdit = (rowId: string, field: 'nominal_alokasi' | 'realisasi_total', currentValue: number) => {
    setEditingCell({ id: rowId, field });
    setEditValue(String(currentValue));
  };

  const commitEdit = async () => {
    if (!editingCell) return;
    const parsed = Number(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      setSchoolList(prev => prev.map(item => {
        if (item.id !== editingCell.id) return item;
        const nominal = editingCell.field === 'nominal_alokasi' ? parsed : item.nominal_alokasi;
        const realisasi = editingCell.field === 'realisasi_total' ? parsed : item.realisasi_total;
        return {
          ...item,
          nominal_alokasi: nominal,
          realisasi_total: realisasi,
          selisih: nominal - realisasi,
          persentase_penyerapan: nominal > 0 ? Math.round((realisasi / nominal) * 1000) / 10 : 0
        };
      }));
      await updateInstitusiPendidikan(editingCell.id, {
        [editingCell.field]: parsed
      });
    }
    setEditingCell(null);
  };

  const handleExport = async () => {
    const summaryHeaders = [
      'Nomor', 'Tahun Anggaran', 'Nominal (Rp)', 'Realisasi (Rp)', 'Nominal Selisih (Rp)', 'Persentase penyerapan (%)'
    ];
    const summaryColorHex = getPctColorHex(totals.persentase);
    const summaryRows = [
      [
        { value: 1, align: 'center' },
        { value: activeTahun, align: 'center' },
        { value: totals.nominal, isCurrency: true },
        { value: totals.realisasi, isCurrency: true },
        { value: { formula: 'C2-D2' }, isCurrency: true, textColor: '991B1B' },
        { 
          value: { formula: 'IF(C2>0, D2/C2, 0)' }, 
          isPercent: true, 
          bgColor: summaryColorHex.bg, 
          textColor: summaryColorHex.text,
          bold: true,
          align: 'center'
        }
      ]
    ];

    const jenjangHeaders = [
      'Nomor', 'Jenjang Pendidikan', 'Jumlah Sekolah', 'Nominal Keseluruhan (Rp)', 'Porsi Anggaran (%)'
    ];
    const jenjangRows = jenjangBreakdown.map((row, idx) => {
      const rowNum = idx + 2;
      return [
        { value: row.nomor, align: 'center' },
        { value: row.jenjang },
        { value: row.jumlah_sekolah, align: 'center' },
        { value: row.nominal_keseluruhan, isCurrency: true },
        { value: { formula: `D${rowNum}/SUM(D$2:D$6)` }, isPercent: true, align: 'center', bold: true }
      ];
    });

    const schoolHeaders = [
      'Nomor', 'Nama Sekolah / Universitas', 'Status', 'Nominal Anggaran (Rp)', 'Realisasi (Rp)', 'Nominal Selisih (Rp)', 'Persentase penyerapan (%)'
    ];
    const schoolRows = filtered.map((row, idx) => {
      const rowNum = idx + 2;
      const colorHex = getPctColorHex(row.persentase_penyerapan);
      return [
        { value: idx + 1, align: 'center' },
        { value: row.nama_institusi },
        { value: row.status_sekolah, align: 'center' },
        { value: row.nominal_alokasi, isCurrency: true },
        { value: row.realisasi_total, isCurrency: true },
        { value: { formula: `D${rowNum}-E${rowNum}` }, isCurrency: true, textColor: '991B1B' },
        { 
          value: { formula: `IF(D${rowNum}>0, E${rowNum}/D${rowNum}, 0)` }, 
          isPercent: true, 
          bgColor: colorHex.bg, 
          textColor: colorHex.text,
          bold: true,
          align: 'center'
        }
      ];
    });

    const totalRowIndex = filtered.length + 2;
    const totalColorHex = getPctColorHex(totals.persentase);
    const totalsRow = [
      { value: '', bold: true },
      { value: 'Realisasi Anggaran', bold: true },
      { value: '', bold: true },
      { value: { formula: `SUM(D2:D${totalRowIndex-1})` }, isCurrency: true, bold: true },
      { value: { formula: `SUM(E2:E${totalRowIndex-1})` }, isCurrency: true, bold: true },
      { value: { formula: `D${totalRowIndex}-E${totalRowIndex}` }, isCurrency: true, bold: true, textColor: '991B1B' },
      { 
        value: { formula: `IF(D${totalRowIndex}>0, E${totalRowIndex}/D${totalRowIndex}, 0)` }, 
        isPercent: true, 
        bold: true, 
        bgColor: totalColorHex.bg,
        textColor: totalColorHex.text,
        align: 'center'
      }
    ];

    await exportToExcel(`Laporan_Kabkota_${kabkotaData.kabupaten_kota.nama_kabupaten_kota}_${activeTahun}.xlsx`, [
      { name: 'Summary', headers: summaryHeaders, rows: summaryRows, columnWidths: [8, 18, 22, 22, 22, 25] },
      { name: 'Proporsi Sekolah', headers: jenjangHeaders, rows: jenjangRows, columnWidths: [8, 28, 16, 25, 20] },
      { name: 'Alokasi Sekolah', headers: schoolHeaders, rows: [...schoolRows, totalsRow], columnWidths: [8, 35, 12, 22, 22, 22, 25] }
    ]);
  };

  const renderEditableCell = (row: InstitusiPendidikan, field: 'nominal_alokasi' | 'realisasi_total') => {
    const value = row[field];
    const isEditing = editingCell?.id === row.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <td className="sheet-cell sheet-cell-editing text-right">
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') setEditingCell(null);
            }}
            className="w-full bg-transparent outline-none text-right font-mono text-sm pr-1"
          />
        </td>
      );
    }

    return (
      <td
        className="sheet-cell sheet-cell-editable text-right font-mono cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => startEdit(row.id, field, value)}
      >
        {fmtRupiah(value)}
      </td>
    );
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen">
      <Header
        title={`Rincian Kabupaten/Kota: ${kabkotaData.kabupaten_kota.nama_kabupaten_kota}`}
        subtitle={`Provinsi ${provData.provinsi.nama_provinsi} — Anggaran Sekolah & Institusi Tahun ${activeTahun}`}
      />

      <div className="p-6 space-y-6">
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Link href="/dashboard/provinsi" className="hover:text-accent hover:underline">Provinsi</Link>
            <span>➔</span>
            <Link href={`/dashboard/provinsi/${id}`} className="hover:text-accent hover:underline">{provData.provinsi.nama_provinsi}</Link>
            <span>➔</span>
            <span className="font-semibold text-slate-700">{kabkotaData.kabupaten_kota.nama_kabupaten_kota}</span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn btn-ghost text-sm flex items-center gap-2">
              <ArrowLeft size={16} />
              Kembali
            </button>
            <button onClick={handleExport} className="btn btn-secondary text-sm flex items-center gap-2">
              <Download size={16} />
              Ekspor Spreadsheet
            </button>
          </div>
        </div>

        {/* 1. SUMMARY */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" />
              Tabel Summary Anggaran Wilayah Kabupaten/Kota
            </h3>
            <span className="text-xs text-text-muted font-medium font-mono">[Sheet: Summary]</span>
          </div>
          <div className="overflow-x-auto">
            <table className="sheet-table w-full">
              <thead>
                <tr>
                  <th className="sheet-header-cell text-center" style={{ width: 80 }}>Nomor</th>
                  <th className="sheet-header-cell text-center" style={{ width: 160 }}>Tahun Anggaran</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 200 }}>Nominal</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 200 }}>Realisasi</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 200 }}>Nominal Selisih</th>
                  <th className="sheet-header-cell text-center" style={{ width: 200 }}>Persentase penyerapan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sheet-cell text-center font-bold text-text-muted">1</td>
                  <td className="sheet-cell text-center font-medium">{activeTahun}</td>
                  <td className="sheet-cell text-right font-mono font-bold text-text-primary">{fmtRupiah(totals.nominal)}</td>
                  <td className="sheet-cell text-right font-mono font-bold text-emerald-600 bg-emerald-50/30">{fmtRupiah(totals.realisasi)}</td>
                  <td className="sheet-cell text-right font-mono font-bold text-rose-600 bg-rose-50/30">{fmtRupiah(totals.selisih)}</td>
                  <td className="sheet-cell text-center"><PctBadge value={totals.persentase} size="md" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. JENJANG PENDIDIKAN TABLE */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <School size={16} className="text-indigo-500" />
              Jumlah & Anggaran Pendidikan per Tingkatan Sekolah
            </h3>
            <span className="text-xs text-text-muted font-medium font-mono">[Sheet: Proporsi Sekolah]</span>
          </div>
          <div className="overflow-x-auto">
            <table className="sheet-table w-full">
              <thead>
                <tr>
                  <th className="sheet-header-cell text-center" style={{ width: 80 }}>Nomor</th>
                  <th className="sheet-header-cell text-left">Jenjang Pendidikan</th>
                  <th className="sheet-header-cell text-right" style={{ width: 180 }}>Jumlah Sekolah</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 240 }}>Nominal Keseluruhan</th>
                  <th className="sheet-header-cell text-center" style={{ width: 180 }}>Porsi Anggaran (%)</th>
                </tr>
              </thead>
              <tbody>
                {jenjangBreakdown.map((row) => (
                  <tr key={row.nomor} className="hover:bg-indigo-50/50 transition">
                    <td className="sheet-cell text-center text-text-muted text-xs">{row.nomor}</td>
                    <td className="sheet-cell text-left font-semibold text-slate-700">{row.jenjang}</td>
                    <td className="sheet-cell text-right font-mono text-text-primary font-medium">{row.jumlah_sekolah}</td>
                    <td className="sheet-cell text-right font-mono font-medium text-indigo-700 bg-indigo-50/10">{fmtRupiah(row.nominal_keseluruhan)}</td>
                    <td className="sheet-cell text-center">
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
                        {row.porsi_anggaran}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. SCHOOL DETAIL TABLE WITH PAGINATION & FILTERS */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Rincian Pembagian Anggaran Ke Instansi Sekolah di {kabkotaData.kabupaten_kota.nama_kabupaten_kota}
            </h3>
            <span className="text-xs text-text-muted font-medium font-mono">[Sheet: Alokasi Sekolah]</span>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-white">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-text-muted" />
              <span className="text-xs text-text-muted font-medium">Jenjang:</span>
              <select
                value={selectedJenjang}
                onChange={(e) => { setSelectedJenjang(e.target.value); setCurrentPage(1); }}
                className="select-dropdown"
              >
                <option value="">Semua Jenjang</option>
                {jenjangOptions.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari nama sekolah..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="search-input"
              />
            </div>
            <span className="text-xs text-text-muted flex-1">
              {filtered.length} institusi{filtered.length !== schoolList.length ? ` (dari ${schoolList.length} total)` : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="sheet-table w-full">
              <thead>
                <tr>
                  <th className="sheet-header-cell text-center" style={{ width: 80 }}>Nomor</th>
                  <th className="sheet-header-cell text-left">Nama Sekolah / Universitas</th>
                  <th className="sheet-header-cell text-center" style={{ width: 140 }}>Status</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 220 }}>Nominal Anggaran</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 220 }}>Realisasi</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 220 }}>Nominal Selisih</th>
                  <th className="sheet-header-cell text-center" style={{ width: 180 }}>Persentase penyerapan</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                    <td className="sheet-cell text-center text-text-muted text-xs">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="sheet-cell text-left font-semibold text-slate-700">
                      {row.jenjang === 'UNIVERSITAS' ? (
                        <Link href={`/dashboard/profil-institusi/${row.id}`} className="hover:text-accent hover:underline transition-colors text-indigo-700">
                          {row.nama_institusi}
                        </Link>
                      ) : (
                        <span>{row.nama_institusi}</span>
                      )}
                    </td>
                    <td className="sheet-cell text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        row.status_sekolah === 'NEGERI' 
                          ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {row.status_sekolah}
                      </span>
                    </td>
                    {renderEditableCell(row, 'nominal_alokasi')}
                    {renderEditableCell(row, 'realisasi_total')}
                    <td className="sheet-cell text-right font-mono text-rose-600 bg-rose-50/5">{fmtRupiah(row.selisih)}</td>
                    <td className="sheet-cell text-center"><PctBadge value={row.persentase_penyerapan} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300">
                  <td className="sheet-cell font-bold text-center bg-emerald-100 text-emerald-800 border-r border-slate-200" colSpan={3}>
                    Realisasi Anggaran
                  </td>
                  <td className="sheet-cell text-right font-bold bg-emerald-500 text-white font-mono border-r border-slate-200 text-sm">
                    {fmtRupiah(totals.realisasi)}
                  </td>
                  <td className="sheet-cell text-right font-bold bg-amber-400 text-slate-900 font-mono border-r border-slate-200 text-sm">
                    {fmtRupiah(totals.selisih)}
                  </td>
                  <td className="sheet-cell text-center font-bold bg-emerald-500 text-white font-mono text-sm">
                    {totals.persentase.toFixed(2).replace('.', ',')}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-lg shadow-sm">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-700">
                  Menampilkan <span className="font-semibold">{filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> sampai{' '}
                  <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> dari{' '}
                  <span className="font-semibold">{filtered.length}</span> data sekolah
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {getPageNumbers().map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className="relative inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum as number)}
                        className={`relative inline-flex items-center px-4 py-2 text-xs font-semibold focus:z-20 ${
                          currentPage === pageNum
                            ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                            : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:outline-offset-0'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-text-muted flex items-center gap-1">
          <span>✏️</span>
          <span>Klik langsung pada kolom <strong>Nominal Anggaran</strong> atau <strong>Realisasi</strong> untuk mengubah data • Tekan <strong>Enter</strong> untuk menyimpan • Limit {itemsPerPage} data per halaman</span>
        </p>
      </div>
    </div>
  );
}
