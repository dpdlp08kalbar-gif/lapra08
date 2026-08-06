'use client'

import { useState, useEffect } from 'react'
import { useAuthStore, useNavStore, useToastStore } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Map,
  Users,
  Building2,
  Package,
  CalendarDays,
  Megaphone,
  Wallet,
  UserCog,
  LifeBuoy,
  Menu,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldOff,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Bell,
} from 'lucide-react'
import type { SessionUser } from '@/lib/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/types'

// Icon mapping - agar bisa render dari string
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Map,
  Users,
  Building2,
  Package,
  CalendarDays,
  Megaphone,
  Wallet,
  UserCog,
  LifeBuoy,
}

interface MenuData {
  id: string
  key: string
  label: string
  icon: string
  order: number
  roles: string
  isVisible: boolean
  isActive: boolean
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

  useEffect(() => {
    // Hanya fetch menus jika sudah hydrated dan user ada
    if (hasHydrated && user) {
      api('/api/menus').then(setMenus).catch(console.error)
    }
  }, [user, hasHydrated])

  // Tunggu hydration selesai sebelum render apapun
  if (!hasHydrated) return null
  if (!user) return null

  const handleLogout = () => {
    logout()
    window.location.reload()
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Logo Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="font-black text-base leading-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                LAPRA 08
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Sistem Informasi Internal
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {menus.map((menu) => {
          const Icon = ICON_MAP[menu.icon] || LayoutDashboard
          const isActive = activeMenu === menu.key
          return (
            <button
              key={menu.id}
              onClick={() => {
                setActiveMenu(menu.key)
                setMobileOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? menu.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{menu.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User info & logout */}
      <div className="border-t p-3 space-y-2">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-semibold">
                {user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{user.fullName}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {user.territoryName}
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className={`w-full ${sidebarCollapsed ? 'px-2' : ''}`}
        >
          <LogOut className="w-4 h-4" />
          {!sidebarCollapsed && <span className="ml-2">Keluar</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </Button>
            <div className="hidden sm:block">
              <div className="text-sm text-muted-foreground">
                Selamat datang,
              </div>
              <div className="font-semibold text-sm leading-tight">
                {user.fullName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <Badge
              variant="outline"
              className={`${ROLE_COLORS[user.role]} text-xs font-medium`}
            >
              {ROLE_LABELS[user.role]}
            </Badge>
            <Badge variant="outline" className="text-xs hidden md:flex">
              {user.territoryName}
            </Badge>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              <ShieldOff className="w-3 h-3" />
              <span className="text-[11px] font-medium">Dev Mode</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-x-hidden">
          <div className="container mx-auto px-4 lg:px-6 py-6 max-w-7xl">
            {children}
          </div>
        </main>
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
        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
            ? XCircle
            : t.type === 'warning'
            ? AlertTriangle
            : Info
        const color =
          t.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : t.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : t.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2 p-3 rounded-lg border shadow-md ${color} animate-in slide-in-from-top-2`}
            onClick={() => removeToast(t.id)}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-sm flex-1">{t.message}</span>
          </div>
        )
      })}
    </div>
  )
}
