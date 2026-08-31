'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, ErrorState, EmptyState, StatCard } from '@/components/ui-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { useToastStore, useAuthStore } from '@/lib/store'
import { ROLE_LABELS } from '@/lib/types'
import { formatDateID, formatDateTimeID } from '@/lib/format'
import {
  UserCog, Plus, Shield, ShieldOff, Lock, Unlock, ToggleLeft, ToggleRight,
  AlertTriangle, CheckCircle2, Key,
} from 'lucide-react'

interface UserItem {
  id: string
  username: string
  fullName: string
  email: string | null
  phone: string | null
  role: string
  territoryId: string
  territory: { id: string; name: string; code: string; level: string }
  isActive: boolean
  lastLogin: string | null
  createdAt: string
}

interface Territory {
  id: string
  code: string
  name: string
  level: string
  category: string
  parentId: string | null
  isActive: boolean
}

interface SecuritySetting {
  id: string
  key: string
  value: string
  isActive: boolean
  description: string | null
}

export function UsersMenu() {
  const [tab, setTab] = useState('users')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan User"
        description="Manajemen akun pengurus & saklar keamanan sistem"
        icon={UserCog}
      />
      <TabsSimple value={tab} onValueChange={setTab} />
    </div>
  )
}

function TabsSimple({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
  const user = useAuthStore((s) => s.user)!
  const canManageSecurity = user.role === 'SUPERADMIN'

  return (
    <>
      <div className="flex gap-2 border-b">
        <button
          onClick={() => onValueChange('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            value === 'users' ? 'border-orange-600 text-orange-600' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCog className="w-4 h-4 inline mr-2" />
          Daftar User
        </button>
        {canManageSecurity && (
          <button
            onClick={() => onValueChange('security')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              value === 'security' ? 'border-orange-600 text-orange-600' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Saklar Keamanan
          </button>
        )}
      </div>
      {value === 'users' && <UsersTab />}
      {value === 'security' && <SecurityTab />}
    </>
  )
}

function UsersTab() {
  const addToast = useToastStore((s) => s.addToast)
  const currentUser = useAuthStore((s) => s.user)!
  const [users, setUsers] = useState<UserItem[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([api('/api/users'), api('/api/territory')])
      .then(([u, t]) => { setUsers(u); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const canCreate = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN_DPN' || currentUser.role === 'ADMIN_DPD'

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total User" value={users.length} icon={UserCog} color="orange" />
        <StatCard label="Aktif" value={users.filter((u) => u.isActive).length} icon={CheckCircle2} color="emerald" />
        <StatCard label="Login Terakhir" value={users.filter((u) => u.lastLogin).length} icon={Key} color="blue" />
      </div>

      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Tambah User
          </Button>
        </div>
      )}

      {users.length === 0 ? (
        <EmptyState icon={UserCog} title="Belum ada user" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Login Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{u.username}</code></TableCell>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{u.territory.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.lastLogin ? formatDateTimeID(u.lastLogin) : 'Belum pernah'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AddUserDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const currentUser = useAuthStore((s) => s.user)!
  const [form, setForm] = useState({
    username: '', password: '', fullName: '', email: '', phone: '',
    role: 'ADMIN_DPC', territoryId: '', isActive: true,
  })
  const [loading, setLoading] = useState(false)

  // Filter role yang bisa dibuat berdasarkan role current user
  const availableRoles = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN_DPN'
    ? [
        { value: 'ADMIN_DPN', label: 'Admin DPN (Pusat Nasional)' },
        { value: 'ADMIN_DPD', label: 'Admin DPD (Provinsi)' },
        { value: 'ADMIN_DPC', label: 'Admin DPC (Kab/Kota)' },
      ]
    : currentUser.role === 'ADMIN_DPD'
    ? [
        { value: 'ADMIN_DPC', label: 'Admin DPC (Kab/Kota)' },
      ]
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      addToast('User baru berhasil dibuat', 'success')
      setForm({ username: '', password: '', fullName: '', email: '', phone: '', role: 'ADMIN_DPC', territoryId: '', isActive: true })
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah User Baru</DialogTitle>
          <DialogDescription>Buat akun login untuk pengurus DPD/DPC</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Username *</Label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} required />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nama Lengkap *</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="628xxx" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.isActive ? 'true' : 'false'} onValueChange={(v) => setForm({ ...form, isActive: v === 'true' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Wilayah *</Label>
            <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
              <SelectContent>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SecurityTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [settings, setSettings] = useState<SecuritySetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = () => {
    setLoading(true)
    api('/api/security')
      .then(setSettings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const toggleSetting = async (key: string, isActive: boolean) => {
    try {
      await api('/api/security', {
        method: 'PATCH',
        body: JSON.stringify({ key, isActive }),
      })
      addToast(`${key} ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`, isActive ? 'warning' : 'success')
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  const activeCount = settings.filter((s) => s.isActive).length

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-amber-900">Saklar Keamanan Akhir Fase</div>
              <p className="text-amber-800 mt-1">
                Saat ini sistem berjalan dalam <strong>Mode Akses Terbuka</strong> untuk memudahkan
                pengisian data awal. Aktifkan saklar di bawah saat fase finishing sebelum serah terima resmi.
                Saat ini <strong>{activeCount} dari {settings.length}</strong> fitur keamanan aktif.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {settings.map((s) => (
          <Card key={s.id} className={s.isActive ? 'border-emerald-200' : 'border-muted'}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {s.isActive ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm">{s.key.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
                    <Badge variant="outline" className={`text-[13px] mt-2 ${
                      s.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {s.isActive ? 'AKTIF' : 'NONAKTIF'}
                    </Badge>
                  </div>
                </div>
                <Switch
                  checked={s.isActive}
                  onCheckedChange={(c) => toggleSetting(s.key, c)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
