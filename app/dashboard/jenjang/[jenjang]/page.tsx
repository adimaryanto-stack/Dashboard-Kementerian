'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PctBadge from '@/components/ui/PctBadge';
import { useAppStore } from '@/lib/store';
import { 
  getInstitusiByJenjang, 
  alokasiProvinsiData, 
  getKabkotaByProvinsi, 
  tahunAnggaranData,
  updateInstitusiPendidikan
} from '@/lib/data';
import { fmtRupiah, fmtTriliun } from '@/lib/utils/formatters';
import { exportToExcel, getPctColorHex } from '@/lib/utils/excelExport';
import { Jenjang, InstitusiPendidikan } from '@/types';
import { Search, Download, Plus, Upload, ChevronLeft, ChevronRight } from 'lucide-react';


const jenjangLabels: Record<string, { label: string; jenjang: Jenjang }> = {
  universitas: { label: 'Universitas', jenjang: 'UNIVERSITAS' },
  sma: { label: 'SMA', jenjang: 'SMA' },
  smp: { label: 'SMP', jenjang: 'SMP' },
  sd: { label: 'SD', jenjang: 'SD' },
  paud: { label: 'PAUD', jenjang: 'PAUD' },
};

export default function JenjangPage() {
  const params = useParams();
  const slug = params.jenjang as string;
  const config = jenjangLabels[slug] || jenjangLabels.universitas;
  const { activeTahun } = useAppStore();

  const rawData = useMemo(() => {
    const list = getInstitusiByJenjang(config.jenjang);
    const targetTahun = tahunAnggaranData.find(t => t.tahun === activeTahun) || tahunAnggaranData[6];
    const baseTahun = tahunAnggaranData[6];
    const scale = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;
    const seed = (activeTahun % 7) || 1;
    const shift = 0.95 + (seed * 0.012);

    return list.map(item => {
      const nominal = Math.round(item.nominal_alokasi * scale);
      const realisasi = Math.min(nominal, Math.round(item.realisasi_total * scale * shift));
      return {
        ...item,
        nominal_alokasi: nominal,
        realisasi_total: realisasi,
        selisih: nominal - realisasi,
        persentase_penyerapan: nominal > 0 ? Math.round((realisasi / nominal) * 1000) / 10 : 0
      };
    });
  }, [config.jenjang, activeTahun]);

  const [data, setData] = useState<InstitusiPendidikan[]>(rawData);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setData(rawData);
  }, [rawData]);

  const [search, setSearch] = useState('');
  const [selectedProvinsiId, setSelectedProvinsiId] = useState('');
  const [selectedKabKotaName, setSelectedKabKotaName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'nominal' | 'realisasi' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedProvinsiId, selectedKabKotaName, selectedStatus]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const lines = csvText.split('\n');
      
      const newItems: InstitusiPendidikan[] = [];
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const columns = lines[i].split(',');
        if (columns.length >= 4) {
          const [nama, npsn, kabkota, prov] = columns.map(c => c.trim().replace(/^"|"$/g, ''));
          newItems.push({
            id: `inst-imp-${Date.now()}-${i}`,
            npsn: npsn || `IMP${i}`,
            nama_institusi: nama || 'Sekolah Import',
            jenjang: config.jenjang,
            kabupaten_kota_id: 'auto-match',
            kabupaten_kota_nama: kabkota || 'Kabupaten Bogor',
            provinsi_nama: prov || 'Jawa Barat',
            status_sekolah: nama.toLowerCase().includes('swasta') ? 'SWASTA' : 'NEGERI',
            nominal_alokasi: 0,
            realisasi_total: 0,
            selisih: 0,
            persentase_penyerapan: 0,
            updated_at: new Date().toISOString().split('T')[0]
          });
        }
      }

      if (newItems.length > 0) {
        setData(prev => [...newItems, ...prev]);
        alert(`${newItems.length} data institusi berhasil diimport dan dicocokkan!`);
      } else {
        alert('Gagal membaca data CSV. Pastikan format: Nama Sekolah, NPSN, Kabupaten/Kota, Provinsi');
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Reset when jenjang changes
  useMemo(() => { setData(rawData); }, [rawData]);

  const kabkotaOptions = useMemo(() => {
    if (!selectedProvinsiId) return [];
    return getKabkotaByProvinsi(selectedProvinsiId);
  }, [selectedProvinsiId]);

  const filtered = useMemo(() => {
    let result = data;
    
    if (selectedProvinsiId) {
      const prov = alokasiProvinsiData.find(p => p.provinsi_id === selectedProvinsiId);
      if (prov) {
        result = result.filter(inst => inst.provinsi_nama === prov.provinsi.nama_provinsi);
      }
    }
    
    if (selectedKabKotaName) {
      result = result.filter(inst => inst.kabupaten_kota_nama === selectedKabKotaName);
    }
    
    if (selectedStatus) {
      result = result.filter(inst => inst.status_sekolah === selectedStatus);
    }
    
    if (search) {
      result = result.filter(inst => inst.nama_institusi.toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [data, search, selectedProvinsiId, selectedKabKotaName, selectedStatus]);

  const totals = useMemo(() => {
    const nom = filtered.reduce((s, i) => s + i.nominal_alokasi, 0);
    const real = filtered.reduce((s, i) => s + i.realisasi_total, 0);
    return { nominal: nom, realisasi: real, selisih: nom - real, pct: nom > 0 ? (real / nom) * 100 : 0 };
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const startEdit = (id: string, field: 'nominal' | 'realisasi', value: number) => {
    setEditingCell({ id, field });
    setEditValue(String(value));
  };

  const commitEdit = async () => {
    if (!editingCell) return;
    const parsed = Number(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      setData(prev => prev.map(inst => {
        if (inst.id !== editingCell.id) return inst;
        const nominal = editingCell.field === 'nominal' ? parsed : inst.nominal_alokasi;
        const realisasi = editingCell.field === 'realisasi' ? parsed : inst.realisasi_total;
        return {
          ...inst,
          nominal_alokasi: nominal,
          realisasi_total: realisasi,
          selisih: nominal - realisasi,
          persentase_penyerapan: nominal > 0 ? Math.round((realisasi / nominal) * 1000) / 10 : 0,
        };
      }));
      await updateInstitusiPendidikan(editingCell.id, {
        [editingCell.field === 'nominal' ? 'nominal_alokasi' : 'realisasi_total']: parsed
      });
    }
    setEditingCell(null);
  };

  const handleExport = async () => {
    const headers = [
      'No', 'Nama Sekolah', 'Status', 'Kabupaten/Kota', 'Provinsi',
      'Nominal (Rp)', 'Realisasi (Rp)', 'Selisih (Rp)', 'Persentase Penyerapan (%)', 'NPSN'
    ];

    const rows = filtered.map((row, idx) => {
      const rowNum = idx + 2; // Header is row 1
      const colorHex = getPctColorHex(row.persentase_penyerapan);
      
      return [
        { value: idx + 1, align: 'center' },
        { value: row.nama_institusi },
        { value: row.status_sekolah, align: 'center' },
        { value: row.kabupaten_kota_nama },
        { value: row.provinsi_nama },
        { value: row.nominal_alokasi, isCurrency: true },
        { value: row.realisasi_total, isCurrency: true },
        { value: { formula: `F${rowNum}-G${rowNum}` }, isCurrency: true, textColor: '991B1B' },
        { 
          value: { formula: `IF(F${rowNum}>0, G${rowNum}/F${rowNum}, 0)` }, 
          isPercent: true, 
          bgColor: colorHex.bg, 
          textColor: colorHex.text,
          bold: true,
          align: 'center'
        },
        { value: row.npsn, align: 'center' }
      ];
    });

    const totalRowIndex = filtered.length + 2;
    const totalColorHex = getPctColorHex(totals.pct);
    const totalsRow = [
      { value: '', bold: true },
      { value: `TOTAL (${filtered.length})`, bold: true },
      { value: '', bold: true },
      { value: '', bold: true },
      { value: '', bold: true },
      { value: { formula: `SUM(F2:F${totalRowIndex-1})` }, isCurrency: true, bold: true },
      { value: { formula: `SUM(G2:G${totalRowIndex-1})` }, isCurrency: true, bold: true },
      { value: { formula: `F${totalRowIndex}-G${totalRowIndex}` }, isCurrency: true, bold: true, textColor: '991B1B' },
      { 
        value: { formula: `IF(F${totalRowIndex}>0, G${totalRowIndex}/F${totalRowIndex}, 0)` }, 
        isPercent: true, 
        bold: true, 
        bgColor: totalColorHex.bg,
        textColor: totalColorHex.text,
        align: 'center'
      },
      { value: '', bold: true }
    ];

    await exportToExcel(`Laporan_Anggaran_${config.label}_${activeTahun}.xlsx`, [
      {
        name: config.label,
        headers,
        rows: [...rows, totalsRow],
        columnWidths: [8, 32, 12, 22, 18, 20, 20, 20, 25, 12]
      }
    ]);
  };


  const renderEditableCell = (row: InstitusiPendidikan, field: 'nominal' | 'realisasi') => {
    const value = field === 'nominal' ? row.nominal_alokasi : row.realisasi_total;
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
            className="w-full bg-transparent outline-none text-right font-mono text-sm"
          />
        </td>
      );
    }

    return (
      <td className="sheet-cell sheet-cell-editable text-right" onClick={() => startEdit(row.id, field, value)}>
        {fmtRupiah(value)}
      </td>
    );
  };

  return (
    <div className="min-h-screen">
      <Header title={`Jenjang: ${config.label}`} subtitle={`Data alokasi dan realisasi institusi ${config.label} Tahun ${activeTahun}`} />

      <div className="p-6">
        {/* Toolbar */}
        <div className="sheet-toolbar flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Provinsi:</span>
            <select
              value={selectedProvinsiId}
              onChange={(e) => {
                setSelectedProvinsiId(e.target.value);
                setSelectedKabKotaName('');
              }}
              className="select-dropdown"
            >
              <option value="">Semua Provinsi</option>
              {alokasiProvinsiData.map(p => (
                <option key={p.provinsi_id} value={p.provinsi_id}>{p.provinsi.nama_provinsi}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Kab/Kota:</span>
            <select
              value={selectedKabKotaName}
              onChange={(e) => setSelectedKabKotaName(e.target.value)}
              className="select-dropdown"
              disabled={!selectedProvinsiId}
            >
              <option value="">Semua Kab/Kota</option>
              {kabkotaOptions.map(k => (
                <option key={k.id} value={k.kabupaten_kota.nama_kabupaten_kota}>{k.kabupaten_kota.nama_kabupaten_kota}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="select-dropdown"
            >
              <option value="">Semua Status</option>
              <option value="NEGERI">Negeri</option>
              <option value="SWASTA">Swasta</option>
            </select>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={`Cari nama ${config.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <span className="text-xs text-text-muted flex-1">{filtered.length} institusi</span>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Import CSV
          </button>
          <button className="btn btn-ghost">
            <Plus size={14} />
            Tambah
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={14} />
            Ekspor Excel
          </button>
        </div>

        {/* Spreadsheet */}
        <div className="sheet-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 220 }}>Nama {config.label}</th>
                <th className="sheet-header-cell text-center" style={{ width: 90 }}>Status</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 160 }}>Kabupaten/Kota</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 130 }}>Provinsi</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 160 }}>Nominal (Rp)</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 160 }}>Realisasi (Rp)</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 120 }}>Selisih</th>
                <th className="sheet-header-cell text-center" style={{ width: 110 }}>%</th>
                <th className="sheet-header-cell text-center" style={{ width: 80 }}>NPSN</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                  <td className="sheet-cell text-center text-text-muted text-xs">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                  <td className="sheet-cell text-left font-medium text-text-primary">
                    <Link href={`/dashboard/profil-institusi/${row.id}`} className="hover:text-accent hover:underline transition-colors">
                      {row.nama_institusi}
                    </Link>
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
                  {renderEditableCell(row, 'nominal')}
                  {renderEditableCell(row, 'realisasi')}
                  <td className="sheet-cell text-right text-rose-600">{fmtTriliun(row.selisih)}</td>
                  <td className="sheet-cell text-center">
                    <PctBadge value={row.persentase_penyerapan} />
                  </td>
                  <td className="sheet-cell text-center text-text-muted text-xs font-mono">{row.npsn}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell text-left font-bold">TOTAL ({filtered.length})</td>
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell text-right">{fmtRupiah(totals.nominal)}</td>
                <td className="sheet-footer-cell text-right">{fmtRupiah(totals.realisasi)}</td>
                <td className="sheet-footer-cell text-right text-rose-600">{fmtTriliun(totals.selisih)}</td>
                <td className="sheet-footer-cell text-center">
                  <PctBadge value={totals.pct} size="md" />
                </td>
                <td className="sheet-footer-cell" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-lg shadow-sm">
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
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between animate-fade-in">
            <div>
              <p className="text-xs text-slate-700">
                Menampilkan <span className="font-semibold">{filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> sampai{' '}
                <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> dari{' '}
                <span className="font-semibold">{filtered.length}</span> data institusi
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
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
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

        <p className="mt-3 text-xs text-text-muted">
          ✏️ Klik sel untuk edit • Cascade update: Institusi → Kabkota → Provinsi
        </p>
      </div>
    </div>
  );
}

