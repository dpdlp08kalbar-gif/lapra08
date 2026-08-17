'use client'

import { useAuthStore, useNavStore } from '@/lib/store'
import { LoginPage } from '@/components/login-page'
import { MainShell } from '@/components/main-shell'
import { BerandaMenu } from '@/components/menus/beranda-menu'
import { ProfilMenu } from '@/components/menus/profil-menu'
import { PusatMediaMenu } from '@/components/menus/pusat-media-menu'
import { ProgramKegiatanMenu } from '@/components/menus/program-kegiatan-menu'
import { LayananAdvokasiMenu } from '@/components/menus/layanan-advokasi-menu'
import { KontakSekretariatMenu } from '@/components/menus/kontak-sekretariat-menu'
import { PusatAdminMenu } from '@/components/menus/pusat-admin-menu'
import { PusatDataMenu } from '@/components/menus/pusat-data-menu'
import { CommunicationMenu } from '@/components/menus/communication-menu'
import { HelpMenu } from '@/components/menus/help-menu'
import { Loader2, Shield } from 'lucide-react'

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)
  const activeMenu = useNavStore((s) => s.activeMenu)

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

  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  const renderMenu = () => {
    switch (activeMenu) {
      // 6 Menu Portal Publik
      case 'beranda':
        return <BerandaMenu />
      case 'profil':
        return <ProfilMenu />
      case 'pusat-media':
        return <PusatMediaMenu />
      case 'program':
        return <ProgramKegiatanMenu />
      case 'layanan':
        return <LayananAdvokasiMenu />
      case 'kontak':
        return <KontakSekretariatMenu />
      // Menu Admin Internal (accessible dari Beranda/Dashboard)
      case 'pusat-admin':
      case 'dashboard':
        return <PusatAdminMenu />
      case 'users':
        // Backward compat: lama pakai 'users', sekarang redirect ke Pusat Admin
        return <PusatAdminMenu />
      case 'events':
      case 'finance':
      case 'logistics':
        // Menu sudah dihapus, redirect ke Pusat Admin
        return <PusatAdminMenu />
      case 'pusat-data':
        return <PusatDataMenu />
      case 'communication':
        return <CommunicationMenu />
      case 'help':
        return <HelpMenu />
      default:
        return <BerandaMenu />
    }
  }

  return <MainShell>{renderMenu()}</MainShell>
}
