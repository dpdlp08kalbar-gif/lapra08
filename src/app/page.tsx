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

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const activeMenu = useNavStore((s) => s.activeMenu)

  // Show login if not authenticated
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
