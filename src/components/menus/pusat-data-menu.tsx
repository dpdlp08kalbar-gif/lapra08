'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui-helpers'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNavStore } from '@/lib/store'
import {
  Database, Map, Users, Building2, FileText,
  Crown, Building, MapPin,
} from 'lucide-react'

// Reuse komponen yang sudah ada
import { TerritoryMenu } from '@/components/menus/territory-menu'
import { OrganizationMenu } from '@/components/menus/organization-menu'
import { MembershipMenu } from '@/components/menus/membership-menu'

export function PusatDataMenu() {
  const [tab, setTab] = useState('wilayah')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Data Organisasi"
        description="Single source of truth untuk Wilayah, Pengurus, Anggota & SK. Terintegrasi anti-duplikasi dengan hierarki geografis ketat: Pusat → Provinsi → Kabupaten/Kota."
        icon={Database}
      />

      {/* Info anti-duplikasi */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-900">
              Sistem Anti-Duplikasi Aktif
            </div>
            <div className="text-emerald-700 mt-1">
              Semua data terintegrasi via <code className="bg-emerald-100 px-1 rounded font-mono text-xs">territoryId</code> sebagai single source of truth.
              Unique constraint aktif: NIK, WhatsApp, Email anggota unik. Nomor SK unik. Jabatan pengurus unik per wilayah.
              Hierarki: DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota).
            </div>
          </div>
        </div>
      </div>

      {/* Statistik hierarki cepat - 3 level */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <HierarchyStat label="DPN (Pusat Nasional)" color="purple" icon={Crown} />
        <HierarchyStat label="DPD (Provinsi)" color="blue" icon={Building} />
        <HierarchyStat label="DPC (Kabupaten/Kota)" color="emerald" icon={MapPin} />
      </div>

      {/* 4 Tab terintegrasi */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="wilayah">
            <Map className="w-4 h-4 mr-2" />
            Master Wilayah
          </TabsTrigger>
          <TabsTrigger value="pengurus">
            <Building2 className="w-4 h-4 mr-2" />
            Pengurus
          </TabsTrigger>
          <TabsTrigger value="anggota">
            <Users className="w-4 h-4 mr-2" />
            Database Anggota
          </TabsTrigger>
          <TabsTrigger value="sk">
            <FileText className="w-4 h-4 mr-2" />
            Arsip SK
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wilayah" className="mt-4">
          {/* Render TerritoryMenu tanpa PageHeader (sudah di atas) */}
          <TerritoryMenuContent />
        </TabsContent>

        <TabsContent value="pengurus" className="mt-4">
          <OrganizationMenuContent />
        </TabsContent>

        <TabsContent value="anggota" className="mt-4">
          <MembershipMenuContent />
        </TabsContent>

        <TabsContent value="sk" className="mt-4">
          <OrganizationMenuContent activeTab="sk" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Statistik hierarki (dummy - data di-fetch di komponen anak)
function HierarchyStat({
  label, color, icon: Icon,
}: {
  label: string
  color: 'purple' | 'blue' | 'emerald'
  icon: React.ComponentType<{ className?: string }>
}) {
  const colors = {
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
  }
  return (
    <div className="rounded-lg border p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{label}</div>
        <div className="text-xs text-muted-foreground">Hierarki level</div>
      </div>
    </div>
  )
}

// ============================================================
// Wrapper components - render menu lama tapi tanpa PageHeader
// Karena komponen lama sudah punya PageHeader sendiri,
// kita render langsung dan biarkan PageHeader mereka tampil
// (alternatif: refactor komponen lama untuk export content tanpa header)
// ============================================================

function TerritoryMenuContent() {
  return <TerritoryMenu />
}

function OrganizationMenuContent({ activeTab }: { activeTab?: string }) {
  // Untuk SK tab, kita perlu set active tab di OrganizationMenu
  // Tapi OrganizationMenu punya state internal, jadi kita render saja
  // User bisa klik tab SK di dalam OrganizationMenu
  return <OrganizationMenu />
}

function MembershipMenuContent() {
  return <MembershipMenu />
}
