'use client'

import { useState, useEffect } from 'react'
import { useAuthStore, useNavStore, useToastStore } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet, SheetContent,
} from '@/components/ui/sheet'
import {
  LayoutDashboard, Map, Users, Building2, Package,
  CalendarDays, Megaphone, Wallet, UserCog, Database,
  Home, Newspaper, ShieldCheck, Menu, LogOut,
  ChevronLeft, ChevronRight, Shield, ShieldOff,
  CheckCircle2, XCircle, Info, AlertTriangle,
  KeyRound, Bell, MoreVertical,
} from 'lucide-react'
import type { SessionUser } from '@/lib/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types'
import { formatDateTimeID } from '@/lib/format'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Map, Users, Building2, Package, CalendarDays,
  Megaphone, Wallet, UserCog, Database, Home, Newspaper, ShieldCheck,
}

interface MenuData {
  id: string; key: string; label: string; icon: string
  order: number; roles: string; isVisible: boolean; isActive: boolean
  children?: MenuData[]
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const logout = useAuthStore((s) => s.logout)
  const activeMenu = useNavStore((s) => s.activeMenu)
  const setActiveMenu = useNavStore((s) => s.setActiveMenu)
  const sidebarCollapsed = useNavStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useNavStore((s) => s.toggleSidebar)
  const [menus, setMenus] = useState<MenuData[]>([])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])

  useEffect(() => {
    if (hasHydrated && user) {
      api('/api/menus').then(setMenus).catch(console.error)
      api('/api/announcements').then(setAnnouncements).catch(() => {})
    }
  }, [user, hasHydrated])

  if (!hasHydrated) return null
  if (!user) return null

  const handleLogout = () => {
    logout()
    window.location.reload()
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800">
      {/* Logo Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden border border-slate-700">
            <img src="/logo-lapra08.png" alt="LAPRA 08" className="w-full h-full object-contain p-1" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="font-black text-base leading-tight bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                LAPRA 08
              </div>
              <div className="text-[13px] text-slate-400 truncate uppercase tracking-wider">
                Portal Sistem Informasi
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
        {/* 6 Menu Portal */}
        {menus.filter(m => ['beranda','profil','pusat-media','program','layanan','kontak'].includes(m.key)).map((menu) => {
          const Icon = ICON_MAP[menu.icon] || LayoutDashboard
          const isActive = activeMenu === menu.key
          return (
            <button
              key={menu.id}
              onClick={() => { setActiveMenu(menu.key); setMobileOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? menu.label : undefined}
            >
              {isActive && !sidebarCollapsed && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 rounded-r-full" />
              )}
              <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />
              {!sidebarCollapsed && <span className="truncate">{menu.label}</span>}
            </button>
          )
        })}

        {/* Divider */}
        {!sidebarCollapsed ? (
          <div className="pt-3 pb-1 px-3 text-[13px] font-bold text-slate-500 uppercase tracking-widest">
            Sistem Administrasi
          </div>
        ) : (
          <div className="border-t border-slate-800 my-2" />
        )}

        {/* Menu Admin Internal */}
        {menus.filter(m => ['pusat-admin','dashboard','pusat-data','logistics','communication','finance','users','events','territory','membership','organization','help'].includes(m.key)).map((menu) => {
          // Mapping key lama → key baru (untuk backward compat menu DB yang belum di-reseed)
          // 'dashboard' & 'users' → 'pusat-admin' (sudah digabung)
          // 'events' & 'finance' & 'logistics' → 'pusat-admin' (sudah dihapus, redirect ke pusat admin)
          const effectiveKey = ['dashboard', 'users', 'events', 'finance', 'logistics'].includes(menu.key) ? 'pusat-admin' : menu.key
          const Icon = ICON_MAP[menu.icon] || LayoutDashboard
          const isActive = activeMenu === effectiveKey || activeMenu === menu.key
          return (
            <button
              key={menu.id}
              onClick={() => { setActiveMenu(effectiveKey); setMobileOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg shadow-orange-600/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? menu.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110`} />
              {!sidebarCollapsed && <span className="truncate">{menu.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* CTA Button - Pendaftaran KTA */}
      {!sidebarCollapsed && (
        <div className="px-3 pb-2">
          <button
            onClick={() => setActiveMenu('layanan')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-slate-900 font-bold text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] transition-all duration-200"
          >
            <KeyRound className="w-4 h-4" />
            Pendaftaran KTA
          </button>
        </div>
      )}

      {/* User info & logout */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40">
            <Avatar className="w-8 h-8 ring-2 ring-orange-500/30">
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">
                {user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate text-slate-200">{user.fullName}</div>
              <div className="text-[13px] text-slate-400 truncate">
                {ROLE_LABELS[user.role]} • {user.territoryName}
              </div>
            </div>
          </div>
        ) : (
          <Avatar className="w-8 h-8 mx-auto ring-2 ring-orange-500/30">
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-bold">
              {user.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}
          className={`w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 ${sidebarCollapsed ? 'px-2' : ''}`}>
          <LogOut className="w-4 h-4" />
          {!sidebarCollapsed && <span className="ml-2">Keluar</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-slate-900">
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Portal Header with Running News */}
        <header className="sticky top-0 z-30 shadow-lg shadow-slate-900/5">
          {/* Top bar */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="flex items-center justify-between px-4 lg:px-6 h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-300 hover:text-white hover:bg-slate-700/50"
                  onClick={() => setMobileOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="hidden lg:flex text-slate-300 hover:text-white hover:bg-slate-700/50"
                  onClick={toggleSidebar}>
                  {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </Button>
                <div className="hidden sm:block">
                  <div className="text-[13px] text-slate-400 uppercase tracking-wider">Portal LAPRA 08</div>
                  <div className="font-bold text-sm leading-tight">
                    {menus.find(m => m.key === activeMenu)?.label || 'Beranda'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 lg:gap-3">
                <Badge className={`text-xs font-semibold border-0 ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </Badge>
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <ShieldOff className="w-3 h-3" />
                  <span className="text-sm font-medium">Dev Mode</span>
                </div>
              </div>
            </div>

            {/* Running News Ticker */}
            {announcements.length > 0 && (
              <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 py-1.5 overflow-hidden">
                <div className="flex items-center gap-2 px-4">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Megaphone className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                    <span className="text-[13px] font-bold text-yellow-300 uppercase tracking-wider hidden sm:block">Info Terkini</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex gap-12 animate-marquee whitespace-nowrap">
                      {announcements.concat(announcements).map((a, i) => (
                        <span key={i} className="text-xs text-white/95 font-medium">
                          {a.title}
                          {a.isPinned && <span className="ml-1 text-yellow-300">📌</span>}
                          <span className="mx-3 text-white/40">●</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-x-hidden bg-slate-50">
          <div className="container mx-auto px-4 lg:px-6 py-6 max-w-7xl">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto bg-slate-900 text-slate-400 py-4 px-6">
          <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs">
              © 2026 LAPRA 08 — Perkumpulan Laskar Prabowo 08. All rights reserved.
            </div>
            <div className="text-[13px] text-slate-500">
              Sistem Informasi Internal • DPN → DPD → DPC • 514 DPC Terhubung
            </div>
          </div>
        </footer>
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  )
}

function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((t) => {
        const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? XCircle : t.type === 'warning' ? AlertTriangle : Info
        const color = t.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800'
          : t.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-blue-50 border-blue-200 text-blue-800'
        return (
          <div key={t.id}
            className={`flex items-start gap-2 p-3 rounded-xl border shadow-lg ${color} animate-in slide-in-from-top-2`}
            onClick={() => removeToast(t.id)}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-sm flex-1">{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
