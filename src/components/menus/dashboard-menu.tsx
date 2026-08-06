'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, StatCard, LoadingState, ErrorState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Users,
  Globe,
  MapPin,
  TrendingUp,
  Wallet,
  CalendarDays,
  Building2,
  Package,
  UserCog,
  LayoutDashboard,
  Shield,
  Crown,
  Award,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/types'
import { formatIDR } from '@/lib/format'

interface Stats {
  members: {
    total: number
    pending: number
    verified: number
    active: number
    rejected: number
    byLevel?: {
      dpn: number
      dpd: number
      dpc: number
    }
  }
  perTerritory: Array<{
    id: string
    code: string
    name: string
    provinceCode?: string
    provinceName?: string
    category: string
    memberCount: number
  }>
  global: {
    totalDomestic: number
    totalInternational: number
    totalCountries: number
    totalProvinces: number
    totalRegencies: number
    totalDpdLn: number
    totalTerritoriesDomestic: number
  }
  finance: {
    totalIncome: number
    totalExpense: number
    balance: number
  }
  events: { upcoming: number; total: number }
  assets: { total: number }
  organization: { totalPositions: number }
  users: { total: number }
  scope: {
    isGlobal: boolean
    role: string
    territoryName: string
    territoryCode: string
  }
}

export function DashboardMenu() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Jangan panggil API jika user belum ada (defensive)
    if (!user) return
    api('/api/stats')
      .then((data) => setStats(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return <LoadingState message="Memuat data user..." />
  if (loading) return <LoadingState message="Memuat statistik dashboard..." />
  if (error) return <ErrorState message={error} />
  if (!stats) return null

  const isGlobal = stats.scope.isGlobal
  const isDPD = user.role === 'ADMIN_DPD'
  const isDPC = user.role === 'ADMIN_DPC'

  // Max member count untuk scaling heatmap
  const maxMembers = Math.max(...stats.perTerritory.map((t) => t.memberCount), 1)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dasbor Utama"
        description={
          isGlobal
            ? `Visualisasi data global LAPRA 08 - ${stats.scope.territoryName}`
            : `Visualisasi data ${stats.scope.territoryName}`
        }
        icon={LayoutDashboard}
        actions={
          <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
            <Activity className="w-3 h-3 mr-1" />
            Real-Time
          </Badge>
        }
      />

      {/* Top stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Anggota"
          value={stats.members.total.toLocaleString('id-ID')}
          icon={Users}
          color="orange"
          subtitle={`${stats.members.active} aktif`}
        />
        <StatCard
          label="Saldo Kas"
          value={formatIDR(stats.finance.balance)}
          icon={Wallet}
          color={stats.finance.balance >= 0 ? 'emerald' : 'red'}
          subtitle={`Pemasukan: ${formatIDR(stats.finance.totalIncome)}`}
        />
        <StatCard
          label="Event Mendatang"
          value={stats.events.upcoming}
          icon={CalendarDays}
          color="blue"
          subtitle={`${stats.events.total} total event`}
        />
        <StatCard
          label="Provinsi (DPD)"
          value={
            isGlobal
              ? stats.global.totalProvinces
              : isDPD
              ? 1
              : 0
          }
          icon={MapPin}
          color="blue"
          subtitle={isGlobal ? `${stats.global.totalCountries} negara • ${stats.global.totalDpdLn || 0} DPD LN` : 'Provinsi Anda'}
        />
      </div>

      {/* Statistik anggota per level (DPN/DPD/DPC) - 3 level hierarki */}
      {stats.members.byLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600" />
              Hierarki Kepengurusan LAPRA 08
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <LevelStat
                label="DPN"
                subLabel="Pusat Nasional"
                count={stats.members.byLevel.dpn}
                color="purple"
                icon={Crown}
                ktaFormat="LAPRA08.ID.00.00.XX"
              />
              <LevelStat
                label="DPD"
                subLabel="Provinsi (38 Provinsi)"
                count={stats.members.byLevel.dpd}
                color="blue"
                icon={Building2}
                ktaFormat="LAPRA08.ID.61.00.XX"
              />
              <LevelStat
                label="DPC"
                subLabel="Kabupaten/Kota"
                count={stats.members.byLevel.dpc}
                color="emerald"
                icon={MapPin}
                ktaFormat="LAPRA08.ID.61.6171.XX"
              />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Hierarki: DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota). DPN membawahi semua DPD, setiap DPD membawahi DPC-DPC di provinsinya.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap Kalbar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-600" />
            {isGlobal
              ? 'Peta Sebaran Anggota per Wilayah'
              : isDPD
              ? `Peta Sebaran Anggota - ${stats.scope.territoryName}`
              : `Peta Wilayah ${stats.scope.territoryName}`}
          </CardTitle>
          <CardDescription>
            Visualisasi kepadatan anggota di setiap Kabupaten/Kota. Gradasi warna menunjukkan jumlah anggota.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.perTerritory.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Belum ada data wilayah"
              description="Tambahkan wilayah di menu Manajemen Wilayah untuk mulai mengisi data."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stats.perTerritory
                .sort((a, b) => b.memberCount - a.memberCount)
                .map((territory) => {
                  const intensity = territory.memberCount / maxMembers
                  const bgColor =
                    intensity > 0.75
                      ? 'bg-red-700 border-red-800'
                      : intensity > 0.5
                      ? 'bg-red-500 border-red-600'
                      : intensity > 0.25
                      ? 'bg-orange-400 border-orange-500'
                      : intensity > 0
                      ? 'bg-orange-200 border-orange-300'
                      : 'bg-orange-50 border-orange-200'
                  const textColor = intensity > 0.5 ? 'text-white' : 'text-orange-900'
                  return (
                    <div
                      key={territory.id}
                      className={`relative rounded-xl border-2 p-4 transition-all hover:scale-105 hover:shadow-md cursor-default ${bgColor} ${textColor}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="font-bold text-sm leading-tight truncate">
                            {territory.name}
                          </div>
                          <div className="text-[10px] opacity-75 mt-0.5">
                            Kode: {territory.code}
                            {territory.provinceCode && ` • ${territory.provinceCode}`}
                          </div>
                        </div>
                        {territory.category === 'INTERNATIONAL' && (
                          <Globe className="w-4 h-4 shrink-0 opacity-75" />
                        )}
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-black">{territory.memberCount}</span>
                        <span className="text-xs opacity-75">anggota</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
                        <div
                          className="h-full bg-current rounded-full transition-all"
                          style={{ width: `${intensity * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed stats grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Member status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-600" />
              Status Keanggotaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow label="Total Anggota" value={stats.members.total} total={stats.members.total} color="bg-orange-500" />
            <StatusRow label="Aktif" value={stats.members.active} total={stats.members.total} color="bg-emerald-500" />
            <StatusRow label="Menunggu Verifikasi" value={stats.members.pending} total={stats.members.total} color="bg-amber-500" />
            <StatusRow label="Terverifikasi" value={stats.members.verified} total={stats.members.total} color="bg-blue-500" />
            <StatusRow label="Ditolak" value={stats.members.rejected} total={stats.members.total} color="bg-red-500" />
          </CardContent>
        </Card>

        {/* Global stats (DPN only) */}
        {isGlobal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                Statistik Global
              </CardTitle>
              <CardDescription>Sebaran yurisdiksi LAPRA 08 di seluruh dunia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 bg-emerald-50 border-emerald-200">
                  <div className="text-xs text-emerald-700 font-medium">Domestik</div>
                  <div className="text-2xl font-black text-emerald-900">
                    {stats.global.totalDomestic}
                  </div>
                  <div className="text-[10px] text-emerald-600">anggota Indonesia</div>
                </div>
                <div className="rounded-lg border p-3 bg-purple-50 border-purple-200">
                  <div className="text-xs text-purple-700 font-medium">Internasional</div>
                  <div className="text-2xl font-black text-purple-900">
                    {stats.global.totalInternational}
                  </div>
                  <div className="text-[10px] text-purple-600">anggota luar negeri</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-lg border p-2 bg-purple-50 border-purple-200">
                  <div className="text-lg font-bold text-purple-700">{stats.global.totalCountries}</div>
                  <div className="text-[10px] text-purple-600">Negara (DPN)</div>
                </div>
                <div className="rounded-lg border p-2 bg-blue-50 border-blue-200">
                  <div className="text-lg font-bold text-blue-700">{stats.global.totalProvinces}</div>
                  <div className="text-[10px] text-blue-600">Provinsi (DPD)</div>
                </div>
                <div className="rounded-lg border p-2 bg-emerald-50 border-emerald-200">
                  <div className="text-lg font-bold text-emerald-700">{stats.global.totalRegencies}</div>
                  <div className="text-[10px] text-emerald-600">Kab/Kota (DPC)</div>
                </div>
                <div className="rounded-lg border p-2 bg-pink-50 border-pink-200">
                  <div className="text-lg font-bold text-pink-700">{stats.global.totalDpdLn || 0}</div>
                  <div className="text-[10px] text-pink-600">DPD Luar Negeri</div>
                </div>
              </div>
              <div className="mt-2 text-center text-xs text-muted-foreground">
                Total wilayah terdaftar: <strong>{stats.global.totalTerritoriesDomestic || 0} domestik</strong> • {stats.global.totalDpdLn || 0} DPD LN
              </div>
            </CardContent>
          </Card>
        )}

        {/* Finance overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Ringkasan Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-sm font-medium text-emerald-700">Total Pemasukan</span>
              <span className="font-bold text-emerald-900">
                {formatIDR(stats.finance.totalIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
              <span className="text-sm font-medium text-red-700">Total Pengeluaran</span>
              <span className="font-bold text-red-900">
                {formatIDR(stats.finance.totalExpense)}
              </span>
            </div>
            <div
              className={`flex items-center justify-between p-3 rounded-lg border ${
                stats.finance.balance >= 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <span className="text-sm font-medium">Saldo</span>
              <span
                className={`font-bold ${
                  stats.finance.balance >= 0 ? 'text-blue-900' : 'text-red-900'
                }`}
              >
                {formatIDR(stats.finance.balance)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Statistik Operasional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <QuickStat icon={Building2} label="Pengurus" value={stats.organization.totalPositions} />
              <QuickStat icon={Package} label="Atribut" value={stats.assets.total} />
              <QuickStat icon={CalendarDays} label="Event Total" value={stats.events.total} />
              <QuickStat icon={UserCog} label="User Aktif" value={stats.users.total} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User context info */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <Crown className="w-5 h-5 text-orange-600 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">
              Anda login sebagai {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
            </span>{' '}
            dengan yurisdiksi <span className="font-semibold">{user.territoryName}</span>.
            {isGlobal && ' Anda dapat melihat data dari seluruh wilayah.'}
            {isDPD && ' Anda dapat melihat data dari provinsi dan semua DPC di bawahnya.'}
            {isDPC && ' Anda hanya dapat melihat data dari wilayah DPC Anda sendiri (terisolasi).'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusRow({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {value.toLocaleString('id-ID')} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-lg font-bold leading-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}

function LevelStat({
  label,
  subLabel,
  count,
  color,
  icon: Icon,
  ktaFormat,
}: {
  label: string
  subLabel: string
  count: number
  color: 'purple' | 'blue' | 'emerald'
  icon: React.ComponentType<{ className?: string }>
  ktaFormat: string
}) {
  const colors = {
    purple: 'border-purple-200 bg-purple-50/50 text-purple-700',
    blue: 'border-blue-200 bg-blue-50/50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
  }
  const iconBg = {
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <div className={`rounded-lg border-2 p-3 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight">{label}</div>
          <div className="text-[10px] opacity-75">{subLabel}</div>
        </div>
      </div>
      <div className="text-2xl font-black">{count}</div>
      <div className="text-[10px] opacity-75 mt-1 font-mono">{ktaFormat}</div>
    </div>
  )
}
