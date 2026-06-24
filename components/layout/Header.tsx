'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { tahunAnggaranData, institusiPendidikanData } from '@/lib/data';
import { Bell, Search, Menu, CheckCheck, Info, AlertTriangle, Sparkles } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

interface NotificationItem {
  id: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'info' | 'success' | 'warning';
  url: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const { activeTahun, setActiveTahun, toggleSidebar } = useAppStore();
  const activeTahunList = tahunAnggaranData.filter(t => t.status !== 'DRAFT');

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const trimmed = val.trim().toLowerCase();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const filtered = (institusiPendidikanData || []).filter(
      item =>
        (item.npsn && item.npsn.toLowerCase().includes(trimmed)) ||
        (item.nama_institusi && item.nama_institusi.toLowerCase().includes(trimmed))
    ).slice(0, 5);

    setSearchResults(filtered);
    setShowSearchDropdown(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return;

    const exactMatch = (institusiPendidikanData || []).find(
      item => item.npsn === trimmed || item.npsn?.toLowerCase() === trimmed
    );

    if (exactMatch) {
      router.push(`/dashboard/profil-institusi/${exactMatch.id}`);
      setShowSearchDropdown(false);
      setSearchQuery('');
    } else if (searchResults.length > 0) {
      router.push(`/dashboard/profil-institusi/${searchResults[0].id}`);
      setShowSearchDropdown(false);
      setSearchQuery('');
    }
  };

  // Notification States
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      message: 'Anggaran APBN 2026 Provinsi Aceh berhasil dialokasikan.',
      time: '10 menit yang lalu',
      unread: true,
      type: 'success',
      url: '/dashboard/provinsi/p-1',
    },
    {
      id: 'n2',
      message: 'Realisasi Universitas Indonesia bulan Januari telah disinkronkan.',
      time: '1 jam yang lalu',
      unread: true,
      type: 'info',
      url: '/dashboard/profil-institusi/inst-universitas-0',
    },
    {
      id: 'n3',
      message: 'Peringatan: Penyerapan Kabupaten Ogan Komering Ulu di bawah 50%.',
      time: '3 jam yang lalu',
      unread: true,
      type: 'warning',
      url: '/dashboard/provinsi/p-6/kabkota/k-p-6-0',
    },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleNotificationClick = (n: NotificationItem) => {
    setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, unread: false } : item));
    setShowNotifications(false);
    router.push(n.url);
  };

  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-bg-card transition hidden lg:block">
            <Menu size={18} className="text-text-secondary" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Tahun:</span>
            <select
              value={activeTahun}
              onChange={(e) => setActiveTahun(Number(e.target.value))}
              className="select-dropdown"
            >
              {activeTahunList.map(t => (
                <option key={t.tahun} value={t.tahun}>
                  {t.tahun} {t.status === 'ACTIVE' ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div ref={searchRef} className="relative hidden md:block w-48 focus-within:w-72 transition-all duration-300">
            <form onSubmit={handleSearchSubmit}>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Cari NPSN / nama..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) {
                    setShowSearchDropdown(true);
                  }
                }}
                className="search-input"
                style={{ width: '100%' }}
              />
            </form>

            {showSearchDropdown && (
              <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-xl border border-slate-200/80 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-text-muted">
                      Tidak ditemukan institusi "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((school) => (
                      <div
                        key={school.id}
                        onClick={() => {
                          router.push(`/dashboard/profil-institusi/${school.id}`);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        className="p-3 hover:bg-slate-50 transition cursor-pointer flex flex-col gap-0.5 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-text-primary truncate">{school.nama_institusi}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                            {school.jenjang}
                          </span>
                        </div>
                        <span className="text-[10px] text-text-muted">
                          NPSN: {school.npsn} • {school.kabupaten_kota_nama}, {school.provinsi_nama}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={toggleNotifications}
              className={`relative p-2 rounded-lg transition hover:bg-bg-card ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-text-secondary'}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotifications && (
              <>
                {/* Click-outside backdrop overlay */}
                <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                
                <div 
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200/80 shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  style={{ right: 0 }}
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-indigo-500" />
                      Notifikasi Terbaru
                    </span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead} 
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                      >
                        <CheckCheck size={12} />
                        Semua Dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada notifikasi baru
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3.5 flex gap-3 cursor-pointer transition-colors ${n.unread ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {n.type === 'success' && <div className="p-1 rounded-md bg-emerald-100 text-emerald-600"><CheckCheck size={14} /></div>}
                            {n.type === 'info' && <div className="p-1 rounded-md bg-blue-100 text-blue-600"><Info size={14} /></div>}
                            {n.type === 'warning' && <div className="p-1 rounded-md bg-amber-100 text-amber-600"><AlertTriangle size={14} /></div>}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-relaxed ${n.unread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                              {n.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                              {n.time}
                            </span>
                          </div>

                          {n.unread && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-600" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold">Dashboard Kementerian v1.4.1</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
