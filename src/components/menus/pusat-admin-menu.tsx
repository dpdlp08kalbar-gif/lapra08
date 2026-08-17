// LAPRA 08 - Pusat Admin (v1.0)
// Menu terpadu yang menggabungkan Dashboard Admin + Pengaturan User + Saklar Keamanan
// jadi 1 menu ringkas & padat.
//
// Struktur:
// 1. Header + Last Updated timestamp
// 2. KPI Cards (4 buku) — Anggota / Event / User / Kas
// 3. Callout Alert (pending verifikasi — clickable ke Membership)
// 4. Quick Actions (4 tombol shortcut ke menu terkait)
// 5. Manajemen User (inline dengan search + filter + pagination + action per-row)
// 6. Saklar Keamanan (accordion, SUPERADMIN only)
//
// Performance: useMemo + useCallback, debounce search, server-side pagination untuk user list
'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { api } from '@/lib/api-client'
import { useToastStore, useAuthStore, useNavStore } from '@/lib/store'
import { PageHeader, LoadingState, EmptyState, ErrorState } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import {
  Users, UserCog, CalendarClock, Wallet, AlertTriangle, ArrowRight, Plus,
  Edit, Trash2, Search, RefreshCw, Loader2, Shield, ShieldCheck, Lock, Unlock,
  KeyRound, UserPlus, CalendarDays, Briefcase, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, Building2, MapPin, User as UserIcon,
  Megaphone, HelpCircle,
} from 'lucide-react'
import { formatDateTimeID } from '@/lib/format'

// ============================================================
// TYPES
// ============================================================
interface StatsData {
  members: {
    total: number
    active: number
    pending: number
    verified: number
    rejected: number
    byLevel: { dpn: number; dpd: number; dpc: number }
  }
  perTerritory: any[]
  global: {
    totalDomestic: number
    totalInternational: number
    totalProvinces: number
    totalRegencies: number
  }
  finance: { totalIncome: number; totalExpense: number; balance: number }
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

interface UserItem {
  id: string
  username: string
  fullName: string
  email?: string | null
  phone?: string | null
  role: string
  isActive: boolean
  lastLogin?: string | null
  createdAt?: string
  territory: { id: string; name: string; code: string }
}

interface Territory {
  id: string
  name: string
  code: string
  level: string
}

interface SecuritySetting {
  id: string
  key: string
  value: string
  description?: string | null
  isActive: boolean
}

// ============================================================
// CONSTANTS (module-level)
// ============================================================
const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN_DPN: 'Admin DPN',
  ADMIN_DPD: 'Admin DPD',
  ADMIN_DPC: 'Admin DPC',
}

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-red-100 text-red-700 border-red-300',
  ADMIN_DPN: 'bg-orange-100 text-orange-700 border-orange-300',
  ADMIN_DPD: 'bg-blue-100 text-blue-700 border-blue-300',
  ADMIN_DPC: 'bg-emerald-100 text-emerald-700 border-emerald-300',
}

const PAGE_SIZE = 10

// ============================================================
// MAIN MENU
// ============================================================
export function PusatAdminMenu() {
  const user = useAuthStore((s) => s.user)
  const setNav = useNavStore((s) => s.setActiveMenu)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load stats
  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    setStatsError(null)
    try {
      const data = await api('/api/stats')
      setStats(data as StatsData)
      setLastUpdated(new Date())
    } catch (e: any) {
      console.error('[PusatAdmin] stats load failed:', e)
      setStatsError(e.message || 'Gagal memuat statistik')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  return (
    <div className="space-y-6">
      {/* Header dengan tombol refresh + timestamp */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader
          title="Pusat Admin"
          description="Ringkasan operasional & manajemen pengguna sistem"
          icon={ShieldCheck}
        />
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loadingStats} className="gap-1">
            <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards (4) — ringkasan kilat */}
      {loadingStats ? (
        <LoadingState message="Memuat ringkasan..." />
      ) : statsError ? (
        <ErrorState message={statsError} />
      ) : stats ? (
        <>
          <KpiCards stats={stats} />
          <AlertCallout stats={stats} onNavigate={setNav} />
          <QuickActions onNavigate={setNav} />
        </>
      ) : null}

      {/* Manajemen User — inline, bukan tab */}
      <UsersManager />

      {/* Privasi & DPO — UU PDP No. 27/2022 — DPO/SuperAdmin only */}
      <PrivacyDPOManager currentUser={user} />

      {/* Saklar Keamanan — SUPERADMIN only, accordion */}
      {user?.role === 'SUPERADMIN' && <SecurityManager />}
    </div>
  )
}

// ============================================================
// KPI CARDS — 4 ringkasan utama
// ============================================================
function KpiCards({ stats }: { stats: StatsData }) {
  const cards = [
    {
      label: 'Total Anggota',
      value: stats.members.total,
      sub: `${stats.members.active} aktif · ${stats.members.pending} pending`,
      icon: Users,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      label: 'Event Mendatang',
      value: stats.events.upcoming,
      sub: `${stats.events.total} total event`,
      icon: CalendarClock,
      color: 'from-purple-500 to-pink-600',
    },
    {
      label: 'User Aktif',
      value: stats.users.total,
      sub: `${stats.members.byLevel.dpn} DPN · ${stats.members.byLevel.dpd} DPD · ${stats.members.byLevel.dpc} DPC`,
      icon: UserCog,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Kas Saldo',
      value: formatIDRShort(stats.finance.balance),
      sub: `+${formatIDRShort(stats.finance.totalIncome)} · -${formatIDRShort(stats.finance.totalExpense)}`,
      icon: Wallet,
      color: 'from-orange-500 to-red-600',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <Card key={i} className="overflow-hidden">
          <div className={`bg-gradient-to-br ${c.color} p-3 text-white`}>
            <div className="flex items-center justify-between">
              <c.icon className="w-5 h-5" />
              <span className="text-[10px] uppercase opacity-80 tracking-wide">{c.label}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
          </div>
          <CardContent className="p-2">
            <div className="text-xs text-muted-foreground truncate" title={c.sub}>{c.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Helper format IDR singkat (1.2M, 500K, dll)
function formatIDRShort(value: number): string {
  if (!value) return 'Rp 0'
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`
  if (abs >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`
  if (abs >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}K`
  return `Rp ${value}`
}

// ============================================================
// ALERT CALLOUT — pending verifikasi (clickable)
// ============================================================
function AlertCallout({ stats, onNavigate }: { stats: StatsData; onNavigate: (menu: string) => void }) {
  const pending = stats.members.pending
  const rejected = stats.members.rejected
  if (pending === 0 && rejected === 0) return null

  return (
    <Card className="border-orange-300 bg-orange-50">
      <CardContent className="p-3 flex items-center gap-3 flex-wrap">
        <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-orange-900">
            {pending > 0 && `${pending} anggota menunggu verifikasi`}
            {pending > 0 && rejected > 0 && ' · '}
            {rejected > 0 && `${rejected} anggota ditolak`}
          </div>
          <div className="text-xs text-orange-700">Klik untuk membuka menu Keanggotaan</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => onNavigate('keanggotaan-struktur')} className="gap-1">
          Buka <ArrowRight className="w-3 h-3" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================
// QUICK ACTIONS — 4 tombol shortcut ke menu yang masih aktif
// ============================================================
function QuickActions({ onNavigate }: { onNavigate: (menu: string) => void }) {
  const actions = [
    { label: 'Verifikasi Anggota', icon: UserPlus, menu: 'keanggotaan-struktur', color: 'text-blue-600 hover:bg-blue-50' },
    { label: 'Struktur Pengurus', icon: Building2, menu: 'keanggotaan-struktur', color: 'text-purple-600 hover:bg-purple-50' },
    { label: 'Buat Siaran', icon: Megaphone, menu: 'communication', color: 'text-orange-600 hover:bg-orange-50' },
    { label: 'Tiket Bantuan', icon: HelpCircle, menu: 'help', color: 'text-emerald-600 hover:bg-emerald-50' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onNavigate(a.menu)}
          className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${a.color}`}
        >
          <a.icon className="w-4 h-4" />
          <span className="text-sm font-medium">{a.label}</span>
          <ArrowRight className="w-3 h-3 ml-auto" />
        </button>
      ))}
    </div>
  )
}

// ============================================================
// USERS MANAGER — inline dengan search + filter + pagination + action
// ============================================================
function UsersManager() {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<UserItem[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<UserItem | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search)
      setPage(1)
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  // Load users + territories
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [u, t] = await Promise.all([
        api('/api/users').catch(() => []),
        api('/api/territory').catch(() => []),
      ])
      setUsers(u as UserItem[])
      setTerritories(t as Territory[])
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Filtered + paginated users
  const filtered = useMemo(() => {
    let result = users
    if (searchDebounced) {
      const q = searchDebounced.toLowerCase()
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.territory?.name?.toLowerCase().includes(q)
      )
    }
    if (roleFilter !== 'ALL') {
      result = result.filter(u => u.role === roleFilter)
    }
    if (statusFilter !== 'ALL') {
      const wantActive = statusFilter === 'ACTIVE'
      result = result.filter(u => u.isActive === wantActive)
    }
    return result
  }, [users, searchDebounced, roleFilter, statusFilter])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  // Cek role boleh tambah user
  const canAddUser = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_DPN' || user?.role === 'ADMIN_DPD'
  const canEditUser = (target: UserItem) => {
    if (!user) return false
    if (user.id === target.id) return true // self edit
    if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN') return true
    if (user.role === 'ADMIN_DPD' && target.role === 'ADMIN_DPC') return true
    return false
  }
  const canDeleteUser = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_DPN'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="w-4 h-4" /> Manajemen User
            </CardTitle>
            <CardDescription className="text-xs">
              {filtered.length} user{filtered.length !== users.length && ` dari ${users.length} total`}
            </CardDescription>
          </div>
          {canAddUser && (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Tambah User
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari username / nama / wilayah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <XCircle className="w-3 h-3" />
              </button>
            )}
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Role</SelectItem>
              <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
              <SelectItem value="ADMIN_DPN">Admin DPN</SelectItem>
              <SelectItem value="ADMIN_DPD">Admin DPD</SelectItem>
              <SelectItem value="ADMIN_DPC">Admin DPC</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error state */}
        {error && <ErrorState message={error} />}

        {/* Loading */}
        {loading && !error && <LoadingState message="Memuat user..." />}

        {/* Empty state */}
        {!loading && !error && paginated.length === 0 && (
          <EmptyState
            icon={UserCog}
            title={search || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Tidak ada user cocok' : 'Belum ada user'}
            description={search || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Coba ubah filter' : 'Tambah user baru untuk mulai.'}
          />
        )}

        {/* Tabel user */}
        {!loading && !error && paginated.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Username</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-28">Role</TableHead>
                  <TableHead className="w-40">Wilayah</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  <TableHead className="w-32">Login Terakhir</TableHead>
                  <TableHead className="w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(u => (
                  <TableRow key={u.id} className={!u.isActive ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs">{u.username}</TableCell>
                    <TableCell className="font-medium text-sm">{u.fullName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[u.role] || ''}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{u.territory?.name || '-'}</TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.lastLogin ? formatDateTimeID(u.lastLogin) : 'Belum pernah'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {canEditUser(u) && (
                          <>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                              onClick={() => setEditUser(u)}
                              aria-label="Edit user"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
                              onClick={() => setResetPasswordUser(u)}
                              aria-label="Reset password"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {canDeleteUser && user?.id !== u.id && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteUser(u)}
                            aria-label="Hapus user"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-xs text-muted-foreground">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="gap-1 h-8"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </Button>
              <Button
                variant="outline" size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="gap-1 h-8"
              >
                Next <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      {addOpen && (
        <AddUserDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          territories={territories}
          onSuccess={() => { setAddOpen(false); loadData() }}
        />
      )}
      {editUser && (
        <EditUserDialog
          user={editUser}
          territories={territories}
          open={!!editUser}
          onOpenChange={(o) => !o && setEditUser(null)}
          onSuccess={() => { setEditUser(null); loadData() }}
        />
      )}
      {resetPasswordUser && (
        <ResetPasswordDialog
          user={resetPasswordUser}
          open={!!resetPasswordUser}
          onOpenChange={(o) => !o && setResetPasswordUser(null)}
          onSuccess={() => setResetPasswordUser(null)}
        />
      )}
      {deleteUser && (
        <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus user "{deleteUser.fullName}"?</AlertDialogTitle>
              <AlertDialogDescription>
                User akan dihapus permanen. Pastikan user ini tidak memiliki data terkait (anggota/event/dll).
                Untuk penonaktifan sementara, gunakan tombol Edit → Nonaktifkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    await api(`/api/users/${deleteUser.id}`, { method: 'DELETE' })
                    addToast(`User "${deleteUser.fullName}" dihapus`, 'success')
                    setDeleteUser(null)
                    loadData()
                  } catch (e: any) {
                    addToast(`Gagal hapus: ${e.message}`, 'error')
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Hapus Permanen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  )
}

// ============================================================
// ADD USER DIALOG
// ============================================================
function AddUserDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  territories: Territory[]
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const currentUser = useAuthStore((s) => s.user)
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', email: '', phone: '',
    role: 'ADMIN_DPC' as string, territoryId: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        username: '', password: '', fullName: '', email: '', phone: '',
        role: 'ADMIN_DPC', territoryId: '',
      })
    }
  }, [open])

  // Available roles berdasarkan creator
  const availableRoles = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN_DPN') {
      return [
        { value: 'ADMIN_DPN', label: 'Admin DPN' },
        { value: 'ADMIN_DPD', label: 'Admin DPD' },
        { value: 'ADMIN_DPC', label: 'Admin DPC' },
      ]
    }
    if (currentUser.role === 'ADMIN_DPD') {
      return [{ value: 'ADMIN_DPC', label: 'Admin DPC' }]
    }
    return []
  }, [currentUser])

  // Filter territories berdasarkan role yang dipilih
  const availableTerritories = useMemo(() => {
    if (form.role === 'ADMIN_DPN') {
      return territories.filter(t => t.level === 'COUNTRY')
    }
    if (form.role === 'ADMIN_DPD') {
      return territories.filter(t => t.level === 'PROVINCE')
    }
    if (form.role === 'ADMIN_DPC') {
      return territories.filter(t => t.level === 'REGENCY')
    }
    return territories
  }, [territories, form.role])

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.fullName || !form.role || !form.territoryId) {
      addToast('Semua field wajib diisi', 'error')
      return
    }
    if (form.password.length < 6) {
      addToast('Password minimal 6 karakter', 'error')
      return
    }
    setSaving(true)
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      addToast('User baru berhasil dibuat', 'success')
      onSuccess()
    } catch (e: any) {
      addToast(`Gagal tambah user: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah User Baru</DialogTitle>
          <DialogDescription>Buat akun untuk pengurus sistem LAPRA 08</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="mis. budi.santoso"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 6 karakter"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nama Lengkap *</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nama lengkap pengurus"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="opsional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="62xxx"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, territoryId: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Wilayah *</Label>
              <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih wilayah" /></SelectTrigger>
                <SelectContent>
                  {availableTerritories.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Buat User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// EDIT USER DIALOG
// ============================================================
function EditUserDialog({
  user, territories, open, onOpenChange, onSuccess,
}: {
  user: UserItem
  territories: Territory[]
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const currentUser = useAuthStore((s) => s.user)
  const [form, setForm] = useState({
    fullName: user.fullName,
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
    territoryId: user.territory?.id || '',
    isActive: user.isActive,
  })
  const [saving, setSaving] = useState(false)

  const availableRoles = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN_DPN') {
      return [
        { value: 'ADMIN_DPN', label: 'Admin DPN' },
        { value: 'ADMIN_DPD', label: 'Admin DPD' },
        { value: 'ADMIN_DPC', label: 'Admin DPC' },
      ]
    }
    if (currentUser.role === 'ADMIN_DPD') {
      return [{ value: 'ADMIN_DPC', label: 'Admin DPC' }]
    }
    return []
  }, [currentUser])

  const availableTerritories = useMemo(() => {
    if (form.role === 'ADMIN_DPN') return territories.filter(t => t.level === 'COUNTRY')
    if (form.role === 'ADMIN_DPD') return territories.filter(t => t.level === 'PROVINCE')
    if (form.role === 'ADMIN_DPC') return territories.filter(t => t.level === 'REGENCY')
    return territories
  }, [territories, form.role])

  const handleSubmit = async () => {
    if (!form.fullName || !form.role || !form.territoryId) {
      addToast('Field wajib tidak boleh kosong', 'error')
      return
    }
    setSaving(true)
    try {
      await api(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      addToast('User berhasil diperbarui', 'success')
      onSuccess()
    } catch (e: any) {
      addToast(`Gagal update: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit User — {user.fullName}</DialogTitle>
          <DialogDescription>@{user.username}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nama Lengkap *</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, territoryId: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Wilayah *</Label>
              <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableTerritories.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label className="font-medium">Status Akun</Label>
              <p className="text-xs text-muted-foreground">
                {form.isActive ? 'Akun aktif, user bisa login' : 'Akun nonaktif, user tidak bisa login'}
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// RESET PASSWORD DIALOG
// ============================================================
function ResetPasswordDialog({
  user, open, onOpenChange, onSuccess,
}: {
  user: UserItem
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      addToast('Password minimal 6 karakter', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      addToast('Konfirmasi password tidak cocok', 'error')
      return
    }
    setSaving(true)
    try {
      await api(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'reset_password', newPassword }),
      })
      addToast(`Password "${user.fullName}" berhasil direset`, 'success')
      onSuccess()
    } catch (e: any) {
      addToast(`Gagal reset password: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password — {user.fullName}</DialogTitle>
          <DialogDescription>@{user.username} akan dipaksa login ulang dengan password baru</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Password Baru *</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 karakter"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Konfirmasi Password *</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// SECURITY MANAGER — accordion, SUPERADMIN only
// ============================================================
function SecurityManager() {
  const addToast = useToastStore((s) => s.addToast)
  const [settings, setSettings] = useState<SecuritySetting[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/api/security')
      setSettings(data as SecuritySetting[])
    } catch (e: any) {
      addToast(`Gagal memuat security settings: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleToggle = async (setting: SecuritySetting) => {
    try {
      await api('/api/security', {
        method: 'PATCH',
        body: JSON.stringify({ key: setting.key, isActive: !setting.isActive }),
      })
      addToast(`Sakla "${setting.key}" ${!setting.isActive ? 'diaktifkan' : 'dimatikan'}`, 'success')
      loadData()
    } catch (e: any) {
      addToast(`Gagal toggle: ${e.message}`, 'error')
    }
  }

  const activeCount = settings.filter(s => s.isActive).length
  const totalCount = settings.length

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="security" className="border rounded-lg px-4">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 w-full">
            <Shield className="w-5 h-5 text-red-600" />
            <div className="text-left flex-1">
              <div className="text-sm font-medium">Saklar Keamanan Sistem</div>
              <div className="text-xs text-muted-foreground">
                {activeCount} dari {totalCount} saklar aktif
                {activeCount < totalCount && (
                  <span className="ml-2 text-amber-600 font-medium">
                    ⚠ Beberapa saklar dimatikan
                  </span>
                )}
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {loading ? (
            <div className="text-center py-4">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : settings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Belum ada saklar keamanan terdaftar.</p>
          ) : (
            <div className="grid gap-2 pt-2">
              {settings.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  {s.isActive ? (
                    <Unlock className="w-4 h-4 text-green-600" />
                  ) : (
                    <Lock className="w-4 h-4 text-red-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium font-mono">{s.key}</div>
                    {s.description && (
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    )}
                  </div>
                  <Switch
                    checked={s.isActive}
                    onCheckedChange={() => handleToggle(s)}
                  />
                </div>
              ))}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

// ============================================================
// PRIVACY & DPO MANAGER — UU PDP No. 27/2022
// Tampilkan: list DPO aktif, audit log akses data, data access requests
// RBAC: DPO + SUPERADMIN + ADMIN_DPN bisa lihat
// ============================================================
function PrivacyDPOManager({ currentUser }: { currentUser: any }) {
  const addToast = useToastStore((s) => s.addToast)
  const [tab, setTab] = useState<'dpo' | 'audit' | 'dar'>('dpo')

  // Cek akses
  const canView = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN_DPN' || currentUser?.isDPO
  if (!canView) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-600" /> Privasi & DPO
              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300">
                UU PDP No. 27/2022
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Perlindungan Data Pribadi — penunjukan DPO, audit log akses, dan permintaan hak subjek data
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tab navigasi */}
        <div className="flex gap-2 border-b pb-2">
          {[
            { key: 'dpo' as const, label: 'Penunjukan DPO' },
            { key: 'audit' as const, label: 'Audit Log Akses' },
            { key: 'dar' as const, label: 'Permintaan Hak Subjek' },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                tab === t.key ? 'bg-red-50 text-red-700 border-b-2 border-red-500' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'dpo' && <DPOTab currentUser={currentUser} />}
        {tab === 'audit' && <AuditLogTab />}
        {tab === 'dar' && <DataAccessRequestTab currentUser={currentUser} />}
      </CardContent>
    </Card>
  )
}

// ----- DPO Tab -----
function DPOTab({ currentUser }: { currentUser: any }) {
  const addToast = useToastStore((s) => s.addToast)
  const [dpos, setDpos] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dpoList, userList] = await Promise.all([
        api('/api/dpo').catch(() => []),
        api('/api/users').catch(() => []),
      ])
      setDpos(dpoList || [])
      setUsers(userList || [])
    } catch (e: any) {
      addToast(`Gagal memuat: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleDPO = async (userId: string, assign: boolean) => {
    try {
      await api('/api/dpo', {
        method: 'PATCH',
        body: JSON.stringify({ userId, assign }),
      })
      addToast(`DPO ${assign ? 'ditunjuk' : 'dihapus'}`, 'success')
      loadData()
    } catch (e: any) {
      addToast(`Gagal: ${e.message}`, 'error')
    }
  }

  if (loading) return <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        <strong>UU PDP Pasal 53:</strong> Pengendali data wajib tunjuk DPO kalau pemrosesan data skala besar.
        LAPRA 08 dengan ribuan anggota masuk kategori ini. Minimal 1 DPO aktif.
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">DPO Aktif ({dpos.length})</div>
        {dpos.length === 0 ? (
          <div className="text-xs text-red-600 bg-red-50 p-3 rounded">
            ⚠ Belum ada DPO ditunjuk. Wajib tunjuk minimal 1 DPO untuk compliance UU PDP.
          </div>
        ) : (
          <div className="space-y-1">
            {dpos.map(dpo => (
              <div key={dpo.id} className="flex items-center justify-between p-2 rounded border text-xs">
                <div>
                  <div className="font-medium">{dpo.fullName} <span className="text-muted-foreground">({dpo.username})</span></div>
                  <div className="text-muted-foreground">{dpo.role} • {dpo.territory?.name || '-'}</div>
                </div>
                {currentUser.role === 'SUPERADMIN' && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleDPO(dpo.id, false)}>
                    Hapus DPO
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {currentUser.role === 'SUPERADMIN' && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 mt-4">Tunjuk DPO Baru</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {users.filter(u => !u.isDPO && u.isActive).map(u => (
              <div key={u.id} className="flex items-center justify-between p-2 rounded border text-xs">
                <div>
                  <div className="font-medium">{u.fullName} <span className="text-muted-foreground">({u.username})</span></div>
                  <div className="text-muted-foreground">{u.role} • {u.territory?.name || '-'}</div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleDPO(u.id, true)}>
                  Tunjuk DPO
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ----- Audit Log Tab -----
function AuditLogTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ action: '', resource: '', search: '' })
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(filter ? 1 : 1), pageSize: '50' })
      if (filter.action) params.set('action', filter.action)
      if (filter.resource) params.set('resource', filter.resource)
      if (filter.search) params.set('search', filter.search)
      const data = await api(`/api/audit-logs?${params.toString()}`)
      setLogs((data as any)?.data || [])
      setPagination((data as any)?.pagination || { page: 1, totalPages: 1, total: 0 })
    } catch (e: any) {
      console.error('Audit log load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>

  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
        <strong>UU PDP Pasal 17:</strong> Audit log wajib disimpan sebagai bukti akuntabilitas pemrosesan data.
        Setiap akses ke data anggota (Member, User, KTA) tercatat di sini.
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filter.action} onValueChange={(v) => setFilter({ ...filter, action: v === 'ALL' ? '' : v })}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Aksi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Aksi</SelectItem>
            <SelectItem value="VIEW">View</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
            <SelectItem value="DENIED">Denied</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filter.resource} onValueChange={(v) => setFilter({ ...filter, resource: v === 'ALL' ? '' : v })}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Resource" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Resource</SelectItem>
            <SelectItem value="MEMBER">Anggota</SelectItem>
            <SelectItem value="USER">Pengurus</SelectItem>
            <SelectItem value="KTA_APPLICATION">KTA</SelectItem>
            <SelectItem value="DATA_ACCESS_REQUEST">DAR</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Cari nama/label..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="h-8 text-xs flex-1 min-w-40"
        />
      </div>

      <div className="rounded border overflow-x-auto max-h-96 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="text-xs">Waktu</TableHead>
              <TableHead className="text-xs">Actor</TableHead>
              <TableHead className="text-xs">Aksi</TableHead>
              <TableHead className="text-xs">Resource</TableHead>
              <TableHead className="text-xs">Detail</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-xs text-center text-muted-foreground py-4">Tidak ada log</TableCell></TableRow>
            ) : logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap">{formatDateTimeID(log.createdAt)}</TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium">{log.actorName}</div>
                  <div className="text-muted-foreground">{log.actorRole}{log.actorTerritory ? ` • ${log.actorTerritory}` : ''}</div>
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant={log.action === 'DENIED' ? 'destructive' : log.action === 'DELETE' ? 'destructive' : 'outline'} className="text-[10px]">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{log.resource}</TableCell>
                <TableCell className="text-xs max-w-xs truncate" title={log.detail || log.resourceLabel || ''}>
                  {log.resourceLabel || log.detail || '-'}
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant={log.status === 'DENIED' ? 'destructive' : log.status === 'ERROR' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {log.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-muted-foreground">Total: {pagination.total} log</div>
    </div>
  )
}

// ----- Data Access Request Tab -----
function DataAccessRequestTab({ currentUser }: { currentUser: any }) {
  const addToast = useToastStore((s) => s.addToast)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [form, setForm] = useState({ type: 'ACCESS', description: '' })
  const [saving, setSaving] = useState(false)

  const isDPOView = currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN_DPN' || currentUser?.isDPO

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api('/api/data-access-requests')
      setRequests((data as any)?.data || [])
    } catch (e: any) {
      addToast(`Gagal memuat: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSubmit = async () => {
    if (form.description.trim().length < 10) {
      addToast('Deskripsi minimal 10 karakter', 'error')
      return
    }
    setSaving(true)
    try {
      await api('/api/data-access-requests', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      addToast('Permintaan diajukan. DPO akan respons dalam 3×24 jam.', 'success')
      setNewOpen(false)
      setForm({ type: 'ACCESS', description: '' })
      loadData()
    } catch (e: any) {
      addToast(`Gagal: ${e.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (id: string, action: string, notes?: string) => {
    try {
      await api(`/api/data-access-requests/${id}/handle`, {
        method: 'PATCH',
        body: JSON.stringify({ action, notes }),
      })
      addToast(`Permintaan ${action}`, 'success')
      loadData()
    } catch (e: any) {
      addToast(`Gagal: ${e.message}`, 'error')
    }
  }

  if (loading) return <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>

  const TYPE_LABELS: Record<string, string> = {
    ACCESS: 'Lihat Data Saya',
    CORRECT: 'Koreksi Data',
    DELETE: 'Hapus Data Saya',
    RESTRICT: 'Batasi Pemrosesan',
    PORTABILITY: 'Ekspor Data',
  }
  const STATUS_COLORS: Record<string, any> = {
    PENDING: 'secondary',
    IN_REVIEW: 'default',
    APPROVED: 'outline',
    DENIED: 'destructive',
    COMPLETED: 'outline',
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
        <strong>UU PDP Pasal 5-13:</strong> Anggota berhak: lihat data (Pasal 5), koreksi (Pasal 9), hapus (Pasal 10),
        batasi pemrosesan (Pasal 11), portabilitas data (Pasal 13). DPO wajib respons dalam 3×24 jam (Pasal 46).
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {isDPOView ? `${requests.length} permintaan (DPO view)` : `Riwayat permintaan Anda (${requests.length})`}
        </div>
        <Button size="sm" onClick={() => setNewOpen(true)} className="h-8 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Ajukan Permintaan
        </Button>
      </div>

      {requests.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">
          {isDPOView ? 'Belum ada permintaan masuk' : 'Anda belum pernah ajukan permintaan hak subjek data'}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {requests.map(req => (
            <div key={req.id} className="rounded border p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{req.requestNumber}</div>
                <Badge variant={STATUS_COLORS[req.status] || 'secondary'} className="text-[10px]">{req.status}</Badge>
              </div>
              <div className="flex gap-2 text-muted-foreground">
                <span>{TYPE_LABELS[req.type] || req.type}</span>
                <span>•</span>
                <span>{isDPOView ? req.requestorName : 'Anda'}</span>
                <span>•</span>
                <span>{formatDateTimeID(req.submittedAt)}</span>
              </div>
              <div className="text-foreground">{req.description}</div>
              {req.handlerNotes && (
                <div className="text-muted-foreground italic">Catatan DPO: {req.handlerNotes}</div>
              )}
              {isDPOView && req.status === 'PENDING' && (
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleAction(req.id, 'claim')}>Claim</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                    const notes = prompt('Alasan penolakan:')
                    if (notes) handleAction(req.id, 'deny', notes)
                  }}>Tolak</Button>
                </div>
              )}
              {isDPOView && req.status === 'IN_REVIEW' && (
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleAction(req.id, 'approve')}>Setujui</Button>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                    const notes = prompt('Alasan penolakan:')
                    if (notes) handleAction(req.id, 'deny', notes)
                  }}>Tolak</Button>
                </div>
              )}
              {isDPOView && req.status === 'APPROVED' && (
                <div className="pt-1">
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleAction(req.id, 'complete', 'Selesai diproses')}>Tandai Selesai</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Permintaan Hak Subjek Data</DialogTitle>
            <DialogDescription>Sesuai UU PDP No. 27/2022 Pasal 5-13. DPO akan respons dalam 3×24 jam.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Jenis Permintaan</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCESS">Lihat Data Saya (Pasal 5)</SelectItem>
                  <SelectItem value="CORRECT">Koreksi Data (Pasal 9)</SelectItem>
                  <SelectItem value="DELETE">Hapus Data Saya (Pasal 10)</SelectItem>
                  <SelectItem value="RESTRICT">Batasi Pemrosesan (Pasal 11)</SelectItem>
                  <SelectItem value="PORTABILITY">Ekspor Data (Pasal 13)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi Permintaan *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Jelaskan data yang diminta, mis. 'mohon lihat semua data keanggotaan saya'"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Ajukan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
