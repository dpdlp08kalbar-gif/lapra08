'use client'

import { useAuthStore, useNavStore } from '@/lib/store'
import { LoginPage } from '@/components/login-page'
import { MainShell } from '@/components/main-shell'
import { DashboardMenu } from '@/components/menus/dashboard-menu'
import { TerritoryMenu } from '@/components/menus/territory-menu'
import { MembershipMenu } from '@/components/menus/membership-menu'
import { OrganizationMenu } from '@/components/menus/organization-menu'
import { LogisticsMenu } from '@/components/menus/logistics-menu'
import { EventsMenu } from '@/components/menus/events-menu'
import { CommunicationMenu } from '@/components/menus/communication-menu'
import { FinanceMenu } from '@/components/menus/finance-menu'
import { UsersMenu } from '@/components/menus/users-menu'
import { HelpMenu } from '@/components/menus/help-menu'
import { Loader2, Shield } from 'lucide-react'

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const activeMenu = useNavStore((s) => s.activeMenu)

  // Tampilkan loading screen saat menunggu hydration dari localStorage
  // Ini mencegah race condition dimana API dipanggil sebelum session ter-load
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Memuat sistem LAPRA 08...</span>
          </div>
        </div>
      </div>
    )
  }

  // Setelah hydration selesai, cek apakah user ter-authenticated
  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  // Render menu content based on active menu
  const renderMenu = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardMenu />
      case 'territory':
        return <TerritoryMenu />
      case 'membership':
        return <MembershipMenu />
      case 'organization':
        return <OrganizationMenu />
      case 'logistics':
        return <LogisticsMenu />
      case 'events':
        return <EventsMenu />
      case 'communication':
        return <CommunicationMenu />
      case 'finance':
        return <FinanceMenu />
      case 'users':
        return <UsersMenu />
      case 'help':
        return <HelpMenu />
      default:
        return <DashboardMenu />
    }
  }

  return <MainShell>{renderMenu()}</MainShell>
}
