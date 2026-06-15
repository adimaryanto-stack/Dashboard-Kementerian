'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PctBadge from '@/components/ui/PctBadge';
import { useAppStore } from '@/lib/store';
import { alokasiProvinsiData, getKabkotaByProvinsi, getJenjangBreakdownByProvinsi } from '@/lib/data';
import { fmtRupiah } from '@/lib/utils/formatters';
import { exportToExcel, getPctColorHex } from '@/lib/utils/excelExport';
import { AlokasiKabupatenKota } from '@/types';
import { ArrowLeft, Banknote, Download, Sparkles } from 'lucide-react';

export default function ProvinsiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string; // provinsi_id e.g. p-1
  const { activeTahun } = useAppStore();

  // Use real Supabase data directly — no scaling
  const provData = useMemo(() => {
    return alokasiProvinsiData.find(p => p.provinsi_id === id) || null;
  }, [id]);

  // Real Kabkota list from Supabase
  const realKabkotaList = useMemo(() => {
    return getKabkotaByProvinsi(id);
  }, [id]);

  // States
  const [prevRealKabkotaList, setPrevRealKabkotaList] = useState(realKabkotaList);
  const [kabkotaList, setKabkotaList] = useState<AlokasiKabupatenKota[]>(realKabkotaList);

  if (realKabkotaList !== prevRealKabkotaList) {
    setPrevRealKabkotaList(realKabkotaList);
    setKabkotaList(realKabkotaList);
  }

  const [editingCell, setEditingCell] = useState<{ id: string; field: 'nominal_alokasi' | 'realisasi_total' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Calculate dynamic totals based on Kabupaten/Kota state
  const totals = useMemo(() => {
    const nominal = kabkotaList.reduce((sum, item) => sum + item.nominal_alokasi, 0);
    const realisasi = kabkotaList.reduce((sum, item) => sum + item.realisasi_total, 0);
    const selisih = nominal - realisasi;
    const persentase = nominal > 0 ? (realisasi / nominal) * 100 : 0;
    return { nominal, realisasi, selisih, persentase };
  }, [kabkotaList]);

  // Jenjang Breakdown calculation (linked to total nominal)
  const jenjangBreakdown = useMemo(() => {
    return getJenjangBreakdownByProvinsi(id, totals.nominal);
  }, [id, totals.nominal]);

  if (!provData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-md border border-slate-100 max-w-md">
          <h2 className="text-xl font-bold text-text-primary mb-2">Provinsi Tidak Ditemukan</h2>
          <p className="text-text-muted mb-6">ID Provinsi: &quot;{id}&quot; tidak terdaftar di sistem.</p>
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

  const commitEdit = () => {
    if (!editingCell) return;
    const parsed = Number(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      setKabkotaList(prev => prev.map(item => {
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
      import('@/lib/data').then(({ updateAlokasiKabupatenKota }) => {
        updateAlokasiKabupatenKota(editingCell.id, editingCell.field, parsed);
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

    const kabkotaHeaders = [
      'Nomor', 'Nama Kabupaten/Kota', 'Nominal Anggaran (Rp)', 'Realisasi (Rp)', 'Nominal Selisih (Rp)', 'Persentase penyerapan (%)'
    ];
    const kabkotaRows = kabkotaList.map((row, idx) => {
      const rowNum = idx + 2;
      const colorHex = getPctColorHex(row.persentase_penyerapan);
      return [
        { value: idx + 1, align: 'center' },
        { value: row.kabupaten_kota.nama_kabupaten_kota },
        { value: row.nominal_alokasi, isCurrency: true },
        { value: row.realisasi_total, isCurrency: true },
        { value: { formula: `C${rowNum}-D${rowNum}` }, isCurrency: true, textColor: '991B1B' },
        { 
          value: { formula: `IF(C${rowNum}>0, D${rowNum}/C${rowNum}, 0)` }, 
          isPercent: true, 
          bgColor: colorHex.bg, 
          textColor: colorHex.text,
          bold: true,
          align: 'center'
        }
      ];
    });

    const totalRowIndex = kabkotaList.length + 2;
    const totalColorHex = getPctColorHex(totals.persentase);
    const totalsRow = [
      { value: '', bold: true },
      { value: 'TOTAL / REALISASI', bold: true },
      { value: { formula: `SUM(C2:C${totalRowIndex-1})` }, isCurrency: true, bold: true },
      { value: { formula: `SUM(D2:D${totalRowIndex-1})` }, isCurrency: true, bold: true },
      { value: { formula: `C${totalRowIndex}-D${totalRowIndex}` }, isCurrency: true, bold: true, textColor: '991B1B' },
      { 
        value: { formula: `IF(C${totalRowIndex}>0, D${totalRowIndex}/C${totalRowIndex}, 0)` }, 
        isPercent: true, 
        bold: true, 
        bgColor: totalColorHex.bg,
        textColor: totalColorHex.text,
        align: 'center'
      }
    ];

    await exportToExcel(`Laporan_Provinsi_${provData.provinsi.nama_provinsi}_${activeTahun}.xlsx`, [
      {
        name: 'Summary',
        headers: summaryHeaders,
        rows: summaryRows,
        columnWidths: [8, 18, 22, 22, 22, 25]
      },
      {
        name: 'Porsi Jenjang',
        headers: jenjangHeaders,
        rows: jenjangRows,
        columnWidths: [8, 28, 16, 25, 20]
      },
      {
        name: 'Dinas Kabupaten-Kota',
        headers: kabkotaHeaders,
        rows: [...kabkotaRows, totalsRow],
        columnWidths: [8, 28, 22, 22, 22, 25]
      }
    ]);
  };


  const renderEditableCell = (row: AlokasiKabupatenKota, field: 'nominal_alokasi' | 'realisasi_total') => {
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
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                commitEdit();
              }
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

  return (
    <div className="min-h-screen">
      <Header
        title={`Rincian Provinsi: ${provData.provinsi.nama_provinsi}`}
        subtitle={`Tahun Anggaran ${activeTahun} — Transparansi Pembagian Anggaran Wilayah`}
      />

      <div className="p-6 space-y-6">
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center">
          <button onClick={() => router.back()} className="btn btn-ghost text-sm flex items-center gap-2">
            <ArrowLeft size={16} />
            Kembali
          </button>
          
          <button 
            onClick={handleExport} 
            className="btn btn-secondary text-sm flex items-center gap-2"
          >
            <Download size={16} />
            Ekspor Spreadsheet
          </button>
        </div>

        {/* ============================================================ */}
        {/* 1. SUMMARY CARD / TABLE RINGKASAN */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500" />
              Tabel Summary Anggaran Provinsi
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
                  <td className="sheet-cell text-right font-mono font-bold text-text-primary">
                    {fmtRupiah(totals.nominal)}
                  </td>
                  <td className="sheet-cell text-right font-mono font-bold text-emerald-600 bg-emerald-50/30">
                    {fmtRupiah(totals.realisasi)}
                  </td>
                  <td className="sheet-cell text-right font-mono font-bold text-rose-600 bg-rose-50/30">
                    {fmtRupiah(totals.selisih)}
                  </td>
                  <td className="sheet-cell text-center">
                    <PctBadge value={totals.persentase} size="md" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. JENJANG PENDIDIKAN TABLE */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Banknote size={16} className="text-indigo-500" />
              Porsi Alokasi Dana per Jenjang Pendidikan
            </h3>
            <span className="text-xs text-text-muted font-medium font-mono">[Sheet: Porsi Jenjang]</span>
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
                    <td className="sheet-cell text-right font-mono font-medium text-indigo-700 bg-indigo-50/10">
                      {fmtRupiah(row.nominal_keseluruhan)}
                    </td>
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

        {/* ============================================================ */}
        {/* 3. KABUPATEN/KOTA DETAIL TABLE */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Rincian Pembagian Anggaran Ke Dinas Pendidikan Kabupaten/Kota di Provinsi {provData.provinsi.nama_provinsi}
            </h3>
            <span className="text-xs text-text-muted font-medium font-mono">[Sheet: Dinas Kabupaten/Kota]</span>
          </div>

          <div className="overflow-x-auto">
            <table className="sheet-table w-full">
              <thead>
                <tr>
                  <th className="sheet-header-cell text-center" style={{ width: 80 }}>Nomor</th>
                  <th className="sheet-header-cell text-left">Nama Kabupaten/Kota</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 220 }}>Nominal Anggaran</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 220 }}>Realisasi</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 220 }}>Nominal Selisih</th>
                  <th className="sheet-header-cell text-center" style={{ width: 180 }}>Persentase penyerapan</th>
                </tr>
              </thead>
              <tbody>
                {kabkotaList.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                    <td className="sheet-cell text-center text-text-muted text-xs">{idx + 1}</td>
                    <td className="sheet-cell text-left font-semibold text-slate-700">
                      <Link href={`/dashboard/provinsi/${id}/kabkota/${row.kabupaten_kota_id}`} className="hover:text-accent hover:underline transition-colors">
                        {row.kabupaten_kota.nama_kabupaten_kota}
                      </Link>
                    </td>
                    {renderEditableCell(row, 'nominal_alokasi')}
                    {renderEditableCell(row, 'realisasi_total')}
                    <td className="sheet-cell text-right font-mono text-rose-600 bg-rose-50/5">
                      {fmtRupiah(row.selisih)}
                    </td>
                    <td className="sheet-cell text-center">
                      <PctBadge value={row.persentase_penyerapan} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Realisasi Anggaran Row (Identical to Google Sheets Screenshot) */}
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

        <p className="text-xs text-text-muted flex items-center gap-1">
          <span>✏️</span>
          <span>Klik langsung pada kolom <strong>Nominal Anggaran</strong> atau <strong>Realisasi</strong> untuk mengubah data • Tekan <strong>Enter</strong> untuk menyimpan</span>
        </p>
      </div>
    </div>
  );
}
