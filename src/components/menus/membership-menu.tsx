'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, ErrorState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useToastStore, useAuthStore } from '@/lib/store'
import { formatDateID, formatDateTimeID } from '@/lib/format'
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  FileText,
  Clock,
  ShieldCheck,
  AlertCircle,
  Download,
  Lock,
} from 'lucide-react'

interface Member {
  id: string
  memberNumber: string
  fullName: string
  nik: string | null
  passportNumber: string | null
  phone: string
  email: string | null
  address: string | null
  shirtSize: string | null
  profession: string | null
  gender: string | null
  birthDate: string | null
  birthPlace: string | null
  bloodType: string | null
  maritalStatus: string | null
  photoUrl: string | null
  idCardUrl: string | null
  territoryId: string
  territory: { id: string; name: string; code: string; level: string }
  status: string
  verifiedAt: string | null
  registeredAt: string
  createdAt: string
  canEdit?: boolean // flag dari API: true = bisa edit, false = read-only
}

interface Territory {
  id: string
  code: string
  name: string
  level: string
  category: string
  parentId: string | null
  isActive: boolean
  canEdit?: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  VERIFIED: { label: 'Terverifikasi', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: ShieldCheck },
  ACTIVE: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  INACTIVE: { label: 'Nonaktif', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: AlertCircle },
}

export function MembershipMenu() {
  const user = useAuthStore((s) => s.user)!
  const addToast = useToastStore((s) => s.addToast)
  const [members, setMembers] = useState<Member[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('active')
  const [addOpen, setAddOpen] = useState(false)
  const [detailMember, setDetailMember] = useState<Member | null>(null)
  const [editMember, setEditMember] = useState<Member | null>(null)

  const loadData = (status?: string) => {
    setLoading(true)
    const statusFilter = status || (tab === 'pending' ? 'PENDING' : tab === 'active' ? 'ACTIVE' : '')
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)

    Promise.all([
      api(`/api/members${params.toString() ? `?${params.toString()}` : ''}`),
      api('/api/territory'),
    ])
      .then(([m, t]) => {
        setMembers(m)
        // Filter territory yang bisa DIEDIT user untuk pendaftaran anggota
        // DPN: COUNTRY level (untuk input anggota DPN pusat)
        // DPD: PROVINCE + REGENCY level di provinsinya
        // DPC: REGENCY level sendiri
        setTerritories(t.filter((tt: Territory) => tt.canEdit && tt.isActive))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [tab, search])

  const handleAction = async (member: Member, action: string) => {
    try {
      await api(`/api/members/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      addToast(`Anggota berhasil ${action === 'verify' ? 'diverifikasi' : action === 'activate' ? 'diaktifkan' : action === 'reject' ? 'ditolak' : 'dinonaktifkan'}`, 'success')
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  const handleDelete = async (member: Member) => {
    if (!confirm(`Hapus anggota ${member.fullName}? Tindakan ini tidak dapat dibatalkan.`)) return
    try {
      await api(`/api/members/${member.id}`, { method: 'DELETE' })
      addToast('Anggota berhasil dihapus', 'success')
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const counts = {
    pending: members.filter((m) => m.status === 'PENDING').length,
    active: members.filter((m) => m.status === 'ACTIVE').length,
    all: members.length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Keanggotaan"
        description="Manajemen anggota lengkap dengan generator nomor KTA otomatis"
        icon={Users}
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <UserPlus className="w-4 h-4 mr-2" />
            Input Anggota
          </Button>
        }
      />

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, NIK, nomor KTA, atau WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Anggota Aktif ({counts.active})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="w-4 h-4 mr-2" />
            Antrean Verifikasi ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="all">
            <Users className="w-4 h-4 mr-2" />
            Semua ({counts.all})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada data anggota"
              description="Klik 'Input Anggota' untuk mulai menambahkan data keanggotaan."
              action={
                <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Input Anggota
                </Button>
              }
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nomor KTA</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Wilayah</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Terdaftar</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((m) => {
                        const status = STATUS_CONFIG[m.status]
                        const StatusIcon = status.icon
                        const canEdit = m.canEdit !== false // default true jika undefined
                        // Tentukan level berdasarkan territory
                        const levelLabel =
                          m.territory?.level === 'COUNTRY' ? 'DPN' :
                          m.territory?.level === 'PROVINCE' ? 'DPD' : 'DPC'
                        return (
                          <TableRow key={m.id} className={!canEdit ? 'bg-muted/30' : ''}>
                            <TableCell>
                              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                {m.memberNumber}
                              </code>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{levelLabel}</div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <div>
                                {m.fullName}
                                {m.nik && (
                                  <div className="text-xs text-muted-foreground">
                                    NIK: {m.nik}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{m.phone}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {m.territory.name}
                              </Badge>
                              {!canEdit && (
                                <Badge variant="outline" className="text-[10px] ml-1 bg-amber-50 text-amber-700 border-amber-200">
                                  Read-Only
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${status.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateID(m.registeredAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setDetailMember(m)}>
                                    <Eye className="w-4 h-4 mr-2" /> Lihat Detail
                                  </DropdownMenuItem>
                                  {canEdit ? (
                                    <>
                                      <DropdownMenuItem onClick={() => setEditMember(m)}>
                                        <Edit className="w-4 h-4 mr-2" /> Edit Data
                                      </DropdownMenuItem>
                                      {m.status === 'PENDING' && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleAction(m, 'verify')}>
                                            <ShieldCheck className="w-4 h-4 mr-2 text-blue-600" /> Verifikasi
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleAction(m, 'activate')}>
                                            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> Aktifkan
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleAction(m, 'reject')}>
                                            <XCircle className="w-4 h-4 mr-2 text-red-600" /> Tolak
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(m)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" /> Hapus
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                      <Lock className="w-4 h-4 mr-2" /> Read-Only (Lihat saja)
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => window.print()}>
                                    <CreditCard className="w-4 h-4 mr-2" /> Cetak KTA
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => {
          loadData()
          setAddOpen(false)
        }}
      />

      {/* Detail Member Dialog */}
      <DetailMemberDialog member={detailMember} onClose={() => setDetailMember(null)} />

      {/* Edit Member Dialog */}
      <EditMemberDialog
        member={editMember}
        territories={territories}
        onClose={() => setEditMember(null)}
        onSuccess={() => {
          loadData()
          setEditMember(null)
        }}
      />
    </div>
  )
}

function AddMemberDialog({
  open,
  onOpenChange,
  territories,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  territories: Territory[]
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    fullName: '',
    nik: '',
    passportNumber: '',
    phone: '',
    email: '',
    address: '',
    shirtSize: '',
    profession: '',
    gender: '',
    birthDate: '',
    birthPlace: '',
    bloodType: '',
    maritalStatus: '',
    territoryId: '',
    isInternational: false,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = form.isInternational
        ? {
            fullName: form.fullName,
            passportNumber: form.passportNumber,
            phone: form.phone,
            email: form.email,
            address: form.address,
            territoryId: form.territoryId,
            status: 'PENDING',
          }
        : {
            fullName: form.fullName,
            nik: form.nik,
            phone: form.phone,
            email: form.email,
            address: form.address,
            shirtSize: form.shirtSize,
            profession: form.profession,
            gender: form.gender,
            birthDate: form.birthDate || undefined,
            birthPlace: form.birthPlace,
            bloodType: form.bloodType,
            maritalStatus: form.maritalStatus,
            territoryId: form.territoryId,
            status: 'PENDING',
          }

      await api('/api/members', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      addToast('Anggota baru berhasil ditambahkan. Nomor KTA otomatis dihasilkan.', 'success')
      setForm({
        fullName: '',
        nik: '',
        passportNumber: '',
        phone: '',
        email: '',
        address: '',
        shirtSize: '',
        profession: '',
        gender: '',
        birthDate: '',
        birthPlace: '',
        bloodType: '',
        maritalStatus: '',
        territoryId: '',
        isInternational: false,
      })
      onSuccess()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Input Anggota Baru</DialogTitle>
          <DialogDescription>
            Nomor KTA akan dihasilkan otomatis dengan format:{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              LAPRA08.[NEGARA].[PROVINSI].[KAB/KOTA].[TAHUN].[URUT]
            </code>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle domestik/internasional */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setForm({ ...form, isInternational: false })}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                !form.isInternational ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Skema Domestik (Kalbar)
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, isInternational: true })}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                form.isInternational ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Skema Internasional
            </button>
          </div>

          <div className="space-y-2">
            <Label>Wilayah Kepengurusan *</Label>
            <Select
              value={form.territoryId}
              onValueChange={(v) => setForm({ ...form, territoryId: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih wilayah..." />
              </SelectTrigger>
              <SelectContent>
                {territories.map((t) => {
                  const levelLabel =
                    t.level === 'COUNTRY' ? 'DPN' :
                    t.level === 'PROVINCE' ? 'DPD' : 'DPC'
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      [{levelLabel}] {t.name} ({t.code})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pilih wilayah sesuai tingkat kepengurusan Anda. Nomor KTA otomatis sesuai format masing-masing level.
            </p>
          </div>

          {/* Info KTA format preview */}
          {form.territoryId && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              <strong>Preview Nomor KTA:</strong> Akan di-generate otomatis dengan format:
              <ul className="mt-1 ml-4 list-disc">
                <li>DPN (Pusat): LAPRA08.ID.00.00.26.0000X</li>
                <li>DPD (Provinsi): LAPRA08.ID.61.00.26.0000X</li>
                <li>DPC (Kab/Kota): LAPRA08.ID.61.71.26.0000X</li>
                <li>Internasional: LAPRA08.US.00.LAX.26.0000X</li>
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder={form.isInternational ? 'Full Name (as in Passport)' : 'Nama sesuai KTP'}
                required
              />
            </div>

            {form.isInternational ? (
              <div className="space-y-2 col-span-2">
                <Label>Nomor Paspor / ID Lokal *</Label>
                <Input
                  value={form.passportNumber}
                  onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
                  placeholder="Passport Number"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2 col-span-2">
                <Label>NIK KTP (16 digit) *</Label>
                <Input
                  value={form.nik}
                  onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                  placeholder="16 digit NIK"
                  pattern="[0-9]{16}"
                  maxLength={16}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {form.nik.length}/16 digit
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nomor WhatsApp *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={form.isInternational ? '+1, +86...' : '628xxx'}
                required
              />
              {!form.isInternational && (
                <p className="text-xs text-muted-foreground">Wajib awalan 62</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@contoh.com"
              />
            </div>

            {!form.isInternational && (
              <>
                <div className="space-y-2">
                  <Label>Jenis Kelamin</Label>
                  <Select
                    value={form.gender}
                    onValueChange={(v) => setForm({ ...form, gender: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tempat Lahir</Label>
                  <Input
                    value={form.birthPlace}
                    onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
                    placeholder="Kota kelahiran"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ukuran Kemeja</Label>
                  <Select
                    value={form.shirtSize}
                    onValueChange={(v) => setForm({ ...form, shirtSize: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Profesi</Label>
                  <Input
                    value={form.profession}
                    onChange={(e) => setForm({ ...form, profession: e.target.value })}
                    placeholder="cth: Wiraswasta, PNS, Guru"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Golongan Darah</Label>
                  <Select
                    value={form.bloodType}
                    onValueChange={(v) => setForm({ ...form, bloodType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'AB', 'O', 'Tidak Tahu'].map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status Pernikahan</Label>
                  <Select
                    value={form.maritalStatus}
                    onValueChange={(v) => setForm({ ...form, maritalStatus: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Belum Menikah">Belum Menikah</SelectItem>
                      <SelectItem value="Menikah">Menikah</SelectItem>
                      <SelectItem value="Cerai Hidup">Cerai Hidup</SelectItem>
                      <SelectItem value="Cerai Mati">Cerai Mati</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2 col-span-2">
              <Label>Alamat</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Alamat lengkap"
                rows={2}
              />
            </div>
          </div>

          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Setelah disimpan, anggota berstatus <strong>Menunggu Verifikasi</strong>. Verifikasi di menu Antrean Verifikasi untuk mengaktifkan.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Anggota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DetailMemberDialog({
  member,
  onClose,
}: {
  member: Member | null
  onClose: () => void
}) {
  if (!member) return null

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Anggota</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* KTA Card */}
          <Card className="bg-gradient-to-br from-orange-600 to-red-700 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-80">
                    Kartu Tanda Anggota
                  </div>
                  <div className="text-2xl font-black mt-1">LAPRA 08</div>
                </div>
                <ShieldCheck className="w-8 h-8 opacity-80" />
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold">{member.fullName}</div>
                <div className="text-xs opacity-80">{member.territory.name}</div>
                <div className="font-mono text-sm mt-3 bg-white/10 px-2 py-1 rounded inline-block">
                  {member.memberNumber}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detail info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <DetailItem label="Status" value={STATUS_CONFIG[member.status]?.label || member.status} />
            <DetailItem label="WhatsApp" value={member.phone} />
            {member.nik && <DetailItem label="NIK" value={member.nik} />}
            {member.passportNumber && <DetailItem label="Paspor" value={member.passportNumber} />}
            {member.email && <DetailItem label="Email" value={member.email} />}
            {member.shirtSize && <DetailItem label="Ukuran Kemeja" value={member.shirtSize} />}
            {member.profession && <DetailItem label="Profesi" value={member.profession} />}
            {member.gender && (
              <DetailItem label="Jenis Kelamin" value={member.gender === 'L' ? 'Laki-laki' : 'Perempuan'} />
            )}
            {member.birthPlace && <DetailItem label="Tempat Lahir" value={member.birthPlace} />}
            {member.birthDate && (
              <DetailItem label="Tanggal Lahir" value={formatDateID(member.birthDate)} />
            )}
            {member.bloodType && <DetailItem label="Gol. Darah" value={member.bloodType} />}
            {member.maritalStatus && <DetailItem label="Status Pernikahan" value={member.maritalStatus} />}
            <DetailItem label="Terdaftar" value={formatDateTimeID(member.registeredAt)} />
            {member.verifiedAt && (
              <DetailItem label="Diverifikasi" value={formatDateTimeID(member.verifiedAt)} />
            )}
            {member.address && (
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Alamat</div>
                <div className="font-medium">{member.address}</div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

function EditMemberDialog({
  member,
  territories,
  onClose,
  onSuccess,
}: {
  member: Member | null
  territories: Territory[]
  onClose: () => void
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (member) {
      setForm({
        fullName: member.fullName,
        nik: member.nik || '',
        passportNumber: member.passportNumber || '',
        phone: member.phone,
        email: member.email || '',
        address: member.address || '',
        shirtSize: member.shirtSize || '',
        profession: member.profession || '',
        gender: member.gender || '',
        birthDate: member.birthDate ? member.birthDate.split('T')[0] : '',
        birthPlace: member.birthPlace || '',
        bloodType: member.bloodType || '',
        maritalStatus: member.maritalStatus || '',
        territoryId: member.territoryId,
        status: member.status,
      })
    }
  }, [member])

  if (!member) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api(`/api/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      addToast('Data anggota berhasil diperbarui', 'success')
      onSuccess()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Data Anggota</DialogTitle>
          <DialogDescription>
            Edit data <strong>{member.fullName}</strong> ({member.memberNumber})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={form.fullName || ''}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </div>
            {form.nik !== undefined && form.nik !== '' && (
              <div className="space-y-2 col-span-2">
                <Label>NIK</Label>
                <Input
                  value={form.nik || ''}
                  onChange={(e) => setForm({ ...form, nik: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ukuran Kemeja</Label>
              <Select value={form.shirtSize || ''} onValueChange={(v) => setForm({ ...form, shirtSize: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Profesi</Label>
              <Input
                value={form.profession || ''}
                onChange={(e) => setForm({ ...form, profession: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status || ''} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Menunggu</SelectItem>
                  <SelectItem value="VERIFIED">Terverifikasi</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Alamat</Label>
              <Textarea
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
