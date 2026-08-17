// LAPRA 08 - Menu Gabungan: Keanggotaan & Pengurus
// Menggabungkan 2 menu jadi 1:
// 1. Struktur & Pengurus (dari PusatDataMenu) — drill-down DPN/DPD/DPC + SK
// 2. Verifikasi Anggota (dari MembershipMenu) — workflow verifikasi + KTA print
//
// Nama menu: "Keanggotaan & Pengurus"
// Tujuan: hemat slot sidebar tanpa kurangi fitur
'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui-helpers'
import { Users, Building2, ShieldCheck } from 'lucide-react'
import { PusatDataMenu } from './pusat-data-menu'
import { MembershipMenu } from './membership-menu'

type TabKey = 'struktur' | 'anggota'

const TABS: { key: TabKey; label: string; icon: any; color: string; desc: string }[] = [
  {
    key: 'struktur',
    label: 'Struktur & Pengurus',
    icon: Building2,
    color: 'from-blue-500 to-indigo-600',
    desc: 'Drill-down DPN → DPD → DPC + SK & pengurus',
  },
  {
    key: 'anggota',
    label: 'Verifikasi Anggota',
    icon: Users,
    color: 'from-emerald-500 to-teal-600',
    desc: 'Kelola anggota: verifikasi, KTA, status',
  },
]

export function KeanggotaanStrukturMenu() {
  const [tab, setTab] = useState<TabKey>('struktur')
  const activeTab = TABS.find((t) => t.key === tab)!

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keanggotaan & Pengurus"
        description="Database terpadu anggota, struktur pengurus, dan SK — hierarki DPN → DPD → DPC"
        icon={ShieldCheck}
      />

      {/* Tab navigasi utama */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? `bg-gradient-to-r ${t.color} text-white shadow-sm`
                : 'border hover:bg-accent'
            }`}
            title={t.desc}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Konten tab aktif */}
      {tab === 'struktur' ? <PusatDataMenu /> : <MembershipMenu />}
    </div>
  )
}
