'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionUser, Role } from '@/lib/types'

interface AuthState {
  user: SessionUser | null
  isAuthenticated: boolean
  hasHydrated: boolean // flag untuk cek apakah store sudah di-hydrate dari localStorage
  login: (user: SessionUser) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'lapra08-auth',
      onRehydrateStorage: () => (state) => {
        // Dipanggil setelah store selesai di-hydrate dari localStorage
        state?.setHasHydrated(true)
      },
    }
  )
)

interface NavState {
  activeMenu: string
  activeSubmenu: string | null
  sidebarCollapsed: boolean
  setActiveMenu: (menu: string) => void
  setActiveSubmenu: (submenu: string | null) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      activeMenu: 'dashboard',
      activeSubmenu: null,
      sidebarCollapsed: false,
      setActiveMenu: (menu) => set({ activeMenu: menu, activeSubmenu: null }),
      setActiveSubmenu: (submenu) => set({ activeSubmenu: submenu }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'lapra08-nav',
    }
  )
)

// Toast notifications sederhana
interface ToastState {
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
