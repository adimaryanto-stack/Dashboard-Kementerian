'use client';

import { create } from 'zustand';

interface AppState {
  activeTahun: number;
  setActiveTahun: (tahun: number) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  dataVersion: number;
  incrementVersion: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTahun: 2026,
  setActiveTahun: (tahun) => set({ activeTahun: tahun }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  dataVersion: 0,
  incrementVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  loading: false,
  setLoading: (loading) => set({ loading }),
}));
