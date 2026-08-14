'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToastStore, useAuthStore } from '@/lib/store'
import { useIsSuperAdmin } from './portal-menus'
import {
  Crown, Building2, MapPin, ChevronRight, Plus, Edit, Trash2,
  Upload, FileCheck, Loader2, CalendarDays, Briefcase, Camera, Eye, X,
} from 'lucide-react'

interface Territory {
  id: string; name: string; code: string; level: string; parentId: string | null
}

// ============================================================
// MAIN: Program Kerja with DPN/DPD/DPC hierarchy
// ============================================================
export function ProgramContentManager({ title, description, icon: Icon, category, accentColor }: {
  title: string; description: string; icon: any; category: string; accentColor: string
}) {
  const [view, setView] = useState<'home' | 'dpn' | 'dpd-list' | 'dpd-detail' | 'dpc-list' | 'dpc-detail'>('home')
  const [territories, setTerritories] = useState<Territory[]>([])
  const [regencies, setRegencies] = useState<Territory[]>([])
  const [selectedProv, setSelectedProv] = useState<Territory | null>(null)
  const [selectedRegency, setSelectedRegency] = useState<Territory | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api('/api/territory'),
      api('/api/gallery'),
    ]).then(([allTerr, allGallery]) => {
      setTerritories((allTerr as any[]).filter(t => t.level === 'PROVINCE'))
      setRegencies((allTerr as any[]).filter(t => t.level === 'REGENCY'))
      setItems((allGallery as any[]).filter(a => a.category === category))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const isFiltered = (i: any, code: string, level: string) =>
    i.territoryCode === code || (i.level === level && i.territoryCode === code)

  const dpnItems = items.filter(i => !i.territoryCode || i.territoryCode === 'ID' || i.level === 'DPN')
  const dpdCount = items.filter(i => i.level === 'DPD' || (i.territoryCode && i.territoryCode.length === 2 && i.territoryCode !== 'ID')).length
  const dpcCount = items.filter(i => i.level === 'DPC' || (i.territoryCode && i.territoryCode.length >= 4)).length

  // === HOME: 3 Kartu DPN/DPD/DPC ===
  if (view === 'home') {
    const cards = [
      { key: 'dpn', title: 'DPN', subtitle: 'Pusat Nasional', desc: `${title} tingkat DPN`, count: dpnItems.length, icon: Crown, grad: 'from-red-500 to-orange-600' },
      { key: 'dpd', title: 'DPD', subtitle: 'Provinsi', desc: `${title} DPD se-Indonesia + LN`, count: dpdCount, icon: Building2, grad: 'from-blue-500 to-cyan-600' },
      { key: 'dpc', title: 'DPC', subtitle: 'Kabupaten/Kota', desc: `${title} DPC per DPD`, count: dpcCount, icon: MapPin, grad: 'from-emerald-500 to-teal-600' },
    ]
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
          <strong>Hierarki:</strong> DPN (Pusat Nasional) → DPD (Provinsi) → DPC (Kabupaten/Kota).
          Pilih tingkat untuk melihat {title.toLowerCase()} masing-masing wilayah.
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map(c => (
            <div key={c.key} className="rounded-2xl border-2 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
              onClick={() => { setView(c.key === 'dpn' ? 'dpn' : c.key === 'dpd' ? 'dpd-list' : 'dpc-list'); setSelectedProv(null); setSelectedRegency(null) }}>
              <div className={`bg-gradient-to-br ${c.grad} p-5 text-white`}>
                <c.icon className="w-8 h-8 mb-2" />
                <div className="text-xl font-bold">{c.title}</div>
                <div className="text-sm opacity-90">{c.subtitle}</div>
              </div>
              <div className="p-4 bg-white">
                <div className="text-sm text-muted-foreground mb-2">{c.desc}</div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[13px]">{c.count} program</Badge>
                  <span className="text-xs font-medium text-blue-600">Buka <ChevronRight className="w-4 h-4 inline" /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // === DPN VIEW ===
  if (view === 'dpn') {
    return <ProgramLevelView title={`${title} — DPN (Pusat Nasional)`} description={description} icon={Icon} accentColor={accentColor} items={dpnItems} loading={loading} category={category} level="DPN" territoryCode="ID" territoryName="DPN (Pusat Nasional)" onBack={() => setView('home')} items_ref={items} setItems={setItems} />
  }

  // === DPD LIST VIEW ===
  if (view === 'dpd-list') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('home')}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali</Button>
        <h3 className="text-base font-bold flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-600" /> Pilih DPD (Provinsi)</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {territories.map(prov => {
            const count = items.filter(i => isFiltered(i, prov.code, 'DPD')).length
            return (
              <button key={prov.code} onClick={() => { setSelectedProv(prov); setView('dpd-detail') }}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{prov.name}</span>
                <Badge variant="outline" className="text-[13px]">{count > 0 ? `${count} program` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // === DPD DETAIL VIEW ===
  if (view === 'dpd-detail' && selectedProv) {
    const dpdItems = items.filter(i => isFiltered(i, selectedProv.code, 'DPD'))
    return <ProgramLevelView title={`${title} — DPD ${selectedProv.name}`} description={description} icon={Icon} accentColor={accentColor} items={dpdItems} loading={loading} category={category} level="DPD" territoryCode={selectedProv.code} territoryName={`DPD ${selectedProv.name}`} onBack={() => { setSelectedProv(null); setView('dpd-list') }} items_ref={items} setItems={setItems} />
  }

  // === DPC LIST VIEW (pilih provinsi dulu) ===
  if (view === 'dpc-list') {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('home')}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali</Button>
        <h3 className="text-base font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" /> Pilih DPD (Provinsi) untuk lihat DPC</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {territories.map(prov => {
            const regCount = regencies.filter(r => r.parentId === prov.id).length
            return (
              <button key={prov.code} onClick={() => { setSelectedProv(prov); setView('dpc-detail'); setSelectedRegency(null) }}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{prov.name}</span>
                <Badge variant="outline" className="text-[13px]">{regCount > 0 ? `${regCount} DPC` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // === DPC DETAIL VIEW (list kab/kota di provinsi terpilih) ===
  if (view === 'dpc-detail' && selectedProv) {
    const provRegencies = regencies.filter(r => r.parentId === selectedProv.id)
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedProv(null); setView('dpc-list') }}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke daftar provinsi</Button>
        <h3 className="text-base font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600" /> DPC di {selectedProv.name}</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {provRegencies.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">Belum ada DPC terdaftar di provinsi ini.</p>
          ) : provRegencies.map(reg => {
            const count = items.filter(i => isFiltered(i, reg.code, 'DPC')).length
            return (
              <button key={reg.code} onClick={() => setSelectedRegency(reg)}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-all text-left">
                <span className="text-sm font-medium">{reg.name}</span>
                <Badge variant="outline" className="text-[13px]">{count > 0 ? `${count} program` : 'Kosong'}</Badge>
              </button>
            )
          })}
        </div>
        {selectedRegency && (() => {
          const dpcItems = items.filter(i => isFiltered(i, selectedRegency.code, 'DPC'))
          return <ProgramLevelView title={`${title} — DPC ${selectedRegency.name}`} description={description} icon={Icon} accentColor={accentColor} items={dpcItems} loading={loading} category={category} level="DPC" territoryCode={selectedRegency.code} territoryName={`DPC ${selectedRegency.name}`} onBack={() => setSelectedRegency(null)} items_ref={items} setItems={setItems} />
        })()}
      </div>
    )
  }

  return null
}

// ============================================================
// PROGRAM LEVEL VIEW — Content for DPN/DPD/DPC
// ============================================================
function ProgramLevelView({
  title, description, icon: Icon, accentColor, items, loading, category, level, territoryCode, territoryName, onBack, items_ref, setItems,
}: any) {
  const addToast = useToastStore((s) => s.addToast)
  const isSuperAdmin = useIsSuperAdmin()
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [form, setForm] = useState({ title: '', description: '', location: '', date: '', status: 'DIRENCANAKAN' })
  const [saving, setSaving] = useState(false)
  const [pdfUploadOpen, setPdfUploadOpen] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [extractResult, setExtractResult] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState('ALL')
  // Bukti pelaksanaan state
  const [evidenceDialog, setEvidenceDialog] = useState<any>(null) // { item, files: [] }
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)

  const reload = () => {
    api('/api/gallery').then((all: any[]) => {
      setItems(all.filter(a => a.category === category))
    }).catch(() => {})
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const itemData = {
      id: editItem?.id || `prog_${Date.now()}`,
      title: form.title, description: form.description, location: form.location,
      date: form.date, status: form.status, category, level, territoryCode, territoryName,
    }
    try {
      if (editItem) {
        await api('/api/gallery', { method: 'PUT', body: JSON.stringify({ id: editItem.id, ...itemData }) })
        addToast('Program diperbarui', 'success')
      } else {
        await api('/api/gallery', { method: 'POST', body: JSON.stringify(itemData) })
        addToast('Program ditambahkan', 'success')
      }
      setForm({ title: '', description: '', location: '', date: '', status: 'DIRENCANAKAN' })
      setAddOpen(false); setEditItem(null); reload()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await api(`/api/gallery?id=${deleteItem.id}`, { method: 'DELETE' })
      addToast('Program dihapus', 'success')
      setDeleteItem(null); reload()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // === Upload Bukti Pelaksanaan ===
  const handleUploadEvidence = async () => {
    if (!evidenceFile || !evidenceDialog?.item) return
    const max = 5 * 1024 * 1024
    if (evidenceFile.size > max) { addToast('Ukuran file maksimal 5MB', 'error'); return }

    setEvidenceLoading(true)
    try {
      const buf = Buffer.from(await evidenceFile.arrayBuffer())
      const ext = evidenceFile.name.toLowerCase().match(/\.([^.]+)$/)?.[1] || 'jpg'
      const mime = ext === 'pdf' ? 'application/pdf'
        : ext === 'png' ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'doc' || ext === 'docx' ? 'application/msword'
        : 'application/octet-stream'
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

      // Get existing evidence files
      const item = evidenceDialog.item
      const existingEvidence = item.evidenceFiles ? (typeof item.evidenceFiles === 'string' ? JSON.parse(item.evidenceFiles) : item.evidenceFiles) : []
      const newEvidence = [...existingEvidence, {
        id: `ev_${Date.now()}`,
        fileName: evidenceFile.name,
        fileSize: evidenceFile.size,
        fileType: ext,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      }]

      // Update program item with evidence + auto-update status to BERJALAN if still DIRENCANAKAN
      const updateData: any = { evidenceFiles: JSON.stringify(newEvidence) }
      if ((item.status || 'DIRENCANAKAN') === 'DIRENCANAKAN') {
        updateData.status = 'BERJALAN'
      }
      await api('/api/gallery', { method: 'PUT', body: JSON.stringify({ id: item.id, ...updateData }) })

      addToast(`Bukti pelaksanaan "${evidenceFile.name}" berhasil diupload${updateData.status ? '. Status diubah ke BERJALAN' : ''}`, 'success')
      setEvidenceFile(null)
      setEvidenceDialog(null)
      reload()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setEvidenceLoading(false) }
  }

  // === Delete evidence file ===
  const handleDeleteEvidence = async (itemId: string, evidenceId: string, currentEvidence: any[]) => {
    try {
      const filtered = currentEvidence.filter(e => e.id !== evidenceId)
      await api('/api/gallery', { method: 'PUT', body: JSON.stringify({ id: itemId, evidenceFiles: JSON.stringify(filtered) }) })
      addToast('Bukti dihapus', 'success')
      setEvidenceDialog(null)
      reload()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  const filtered = items.filter((i: any) =>
    (!search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus === 'ALL' || (i.status || 'DIRENCANAKAN') === filterStatus)
  )

  // Stats by status
  const statusCounts = {
    DIRENCANAKAN: items.filter(i => (i.status || 'DIRENCANAKAN') === 'DIRENCANAKAN').length,
    BERJALAN: items.filter(i => i.status === 'BERJALAN').length,
    SELESAI: items.filter(i => i.status === 'SELESAI').length,
    DITUNDA: items.filter(i => i.status === 'DITUNDA').length,
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ChevronRight className="w-4 h-4 rotate-180" /> Kembali</Button>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Icon className={`w-5 h-5 bg-gradient-to-br ${accentColor} bg-clip-text`} />
          {title}
          <Badge variant="outline" className="text-[13px]">{filtered.length} program</Badge>
        </h3>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPdfUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-1" /> Upload PDF
            </Button>
            <Button size="sm" onClick={() => { setEditItem(null); setForm({ title: '', description: '', location: '', date: '', status: 'DIRENCANAKAN' }); setAddOpen(true) }}
              className={`bg-gradient-to-r ${accentColor} text-white`}>
              <Plus className="w-4 h-4 mr-1" /> Tambah Program
            </Button>
          </div>
        )}
      </div>

      {/* Status Stats Cards */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: 'DIRENCANAKAN', label: 'Direncanakan', color: 'bg-amber-50 border-amber-200 text-amber-700', count: statusCounts.DIRENCANAKAN },
          { key: 'BERJALAN', label: 'Berjalan', color: 'bg-blue-50 border-blue-200 text-blue-700', count: statusCounts.BERJALAN },
          { key: 'SELESAI', label: 'Selesai', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', count: statusCounts.SELESAI },
          { key: 'DITUNDA', label: 'Ditunda', color: 'bg-red-50 border-red-200 text-red-700', count: statusCounts.DITUNDA },
        ].map(s => (
          <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? 'ALL' : s.key)}
            className={`rounded-lg border p-3 text-center transition-all ${s.color} ${filterStatus === s.key ? 'ring-2 ring-offset-1 ring-current scale-105' : 'hover:scale-105'}`}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs font-medium">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Cari program..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md flex-1" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="DIRENCANAKAN">Direncanakan</SelectItem>
            <SelectItem value="BERJALAN">Berjalan</SelectItem>
            <SelectItem value="SELESAI">Selesai</SelectItem>
            <SelectItem value="DITUNDA">Ditunda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Icon} title={`Belum ada program ${level}`} description={`Tambah program ${level} ${territoryName} baru, atau upload PDF program kerja.`} />
      ) : (
        <div className="space-y-2">
          {filtered.map((item: any) => {
            const statusColor = item.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : item.status === 'BERJALAN' ? 'bg-blue-100 text-blue-700 border-blue-200'
              : item.status === 'DITUNDA' ? 'bg-red-100 text-red-700 border-red-200'
              : 'bg-amber-100 text-amber-700 border-amber-200'
            return (
              <div key={item.id} className="group relative rounded-lg border p-4 hover:shadow-md transition-all bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{item.title}</div>
                    {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {item.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>}
                      {item.date && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {item.date}</span>}
                      <Badge variant="outline" className={`text-[11px] ${statusColor}`}>{item.status || 'DIRENCANAKAN'}</Badge>
                      {/* Link to view PDF if program came from PDF upload */}
                      {item.pdfId && (
                        <a href={`/api/program-kerja/${item.pdfId}/view`} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <FileCheck className="w-3 h-3" /> Lihat PDF ↗
                        </a>
                      )}
                      {/* Bukti Pelaksanaan */}
                      {(() => {
                        const evFiles = item.evidenceFiles ? (typeof item.evidenceFiles === 'string' ? JSON.parse(item.evidenceFiles) : item.evidenceFiles) : []
                        return (
                          <button
                            onClick={() => setEvidenceDialog({ item, files: evFiles })}
                            className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100"
                            title="Upload/Lihat Bukti Pelaksanaan"
                          >
                            <Camera className="w-3 h-3" /> Bukti ({evFiles.length})
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50" onClick={() => { setEditItem(item); setForm({ title: item.title || '', description: item.description || '', location: item.location || '', date: item.date || '', status: item.status || 'DIRENCANAKAN' }); setAddOpen(true) }}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => setDeleteItem(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setEditItem(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit' : 'Tambah'} Program {level}</DialogTitle>
            <DialogDescription>{territoryName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="space-y-2"><Label>Judul Program *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Lokasi</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="space-y-2"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRENCANAKAN">Direncanakan</SelectItem>
                  <SelectItem value="BERJALAN">Berjalan</SelectItem>
                  <SelectItem value="SELESAI">Selesai</SelectItem>
                  <SelectItem value="DITUNDA">Ditunda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* === Preview PDF Program Kerja (jika dari upload PDF) === */}
            {editItem?.pdfId && (
              <div className="space-y-2">
                <Label>Dokumen Program Kerja (PDF)</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50">
                  <FileCheck className="w-8 h-8 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">PDF Program Kerja</div>
                    <a href={`/api/program-kerja/${editItem.pdfId}/view`} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                      <Eye className="w-3 h-3" /> Buka PDF di tab baru ↗
                    </a>
                  </div>
                </div>
                {/* Inline PDF Preview */}
                <iframe src={`/api/program-kerja/${editItem.pdfId}/view`} className="w-full h-96 rounded-lg border" title="Preview PDF" />
              </div>
            )}

            {/* === Upload Bukti Pelaksanaan === */}
            {editItem && (
              <div className="space-y-2">
                <Label>Bukti Pelaksanaan (Foto/Dokumen)</Label>
                {(() => {
                  const evFiles = editItem.evidenceFiles ? (typeof editItem.evidenceFiles === 'string' ? JSON.parse(editItem.evidenceFiles) : editItem.evidenceFiles) : []
                  return (
                    <div className="space-y-2">
                      {/* Upload button */}
                      {isSuperAdmin && (
                        <div className="border-2 border-dashed rounded-lg p-3 text-center">
                          <input type="file" accept="image/jpeg,image/png,application/pdf,.doc,.docx" className="hidden" id="edit-evidence-upload"
                            onChange={async (e) => {
                              const f = e.target.files?.[0]
                              if (!f) return
                              if (f.size > 5 * 1024 * 1024) { addToast('Maksimal 5MB', 'error'); return }
                              try {
                                const buf = Buffer.from(await f.arrayBuffer())
                                const ext = f.name.toLowerCase().match(/\.([^.]+)$/)?.[1] || 'jpg'
                                const mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg'
                                const dataUrl = `data:${mime};base64,${buf.toString('base64')}`
                                const newEv = [...evFiles, { id: `ev_${Date.now()}`, fileName: f.name, fileSize: f.size, fileType: ext, dataUrl, uploadedAt: new Date().toISOString() }]
                                const updateData: any = { evidenceFiles: JSON.stringify(newEv) }
                                if ((editItem.status || 'DIRENCANAKAN') === 'DIRENCANAKAN') updateData.status = 'BERJALAN'
                                await api('/api/gallery', { method: 'PUT', body: JSON.stringify({ id: editItem.id, ...updateData }) })
                                addToast('Bukti pelaksanaan diupload', 'success')
                                reload()
                                setEditItem({ ...editItem, evidenceFiles: JSON.stringify(newEv), status: updateData.status || editItem.status })
                              } catch (err: any) { addToast(err.message, 'error') }
                              e.target.value = ''
                            }} />
                          <label htmlFor="edit-evidence-upload" className="cursor-pointer inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded hover:bg-emerald-100">
                            <Camera className="w-4 h-4" /> Upload Bukti Pelaksanaan
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">Foto (JPG/PNG) atau Dokumen (PDF/DOC), max 5MB</p>
                        </div>
                      )}

                      {/* List existing evidence */}
                      {evFiles.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {evFiles.map((ev: any, i: number) => (
                            <div key={ev.id || i} className="relative group">
                              {ev.fileType === 'jpg' || ev.fileType === 'jpeg' || ev.fileType === 'png' ? (
                                <img src={ev.dataUrl} alt={ev.fileName} className="w-full h-24 rounded-lg object-cover border" />
                              ) : (
                                <a href={ev.dataUrl} target="_blank" rel="noopener noreferrer" className="w-full h-24 rounded-lg bg-blue-50 border flex items-center justify-center">
                                  <FileCheck className="w-8 h-8 text-blue-500" />
                                </a>
                              )}
                              <div className="text-[11px] text-muted-foreground mt-1 truncate">{ev.fileName}</div>
                              {isSuperAdmin && (
                                <button type="button" className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                                  onClick={async () => {
                                    const filtered = evFiles.filter((e: any) => e.id !== ev.id)
                                    await api('/api/gallery', { method: 'PUT', body: JSON.stringify({ id: editItem.id, evidenceFiles: JSON.stringify(filtered) }) })
                                    addToast('Bukti dihapus', 'success')
                                    reload()
                                    setEditItem({ ...editItem, evidenceFiles: JSON.stringify(filtered) })
                                  }}>
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setEditItem(null) }}>Batal</Button>
              <Button type="submit" disabled={saving} className={`bg-gradient-to-r ${accentColor} text-white`}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Program?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteItem?.title}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Upload + Preview Dialog */}
      <Dialog open={pdfUploadOpen} onOpenChange={(o) => { setPdfUploadOpen(o); if (!o) { setPdfFile(null); setExtractResult(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload PDF {title}</DialogTitle>
            <DialogDescription>{territoryName} — Upload PDF, sistem akan baca isi & extract program kerja otomatis (100% FOSS, tanpa biaya).</DialogDescription>
          </DialogHeader>

          {/* File picker */}
          {!extractResult && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input type="file" accept=".pdf" className="hidden" id="prog-pdf-upload" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
              {pdfFile ? (
                <div>
                  <FileCheck className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">{pdfFile.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{(pdfFile.size / 1024).toFixed(0)} KB</div>
                  <Button type="button" variant="link" size="sm" onClick={() => document.getElementById('prog-pdf-upload')?.click()}>Ganti file</Button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm">Klik untuk <Button type="button" variant="link" className="p-0 h-auto" onClick={() => document.getElementById('prog-pdf-upload')?.click()}>pilih file PDF</Button></div>
                  <div className="text-xs text-muted-foreground mt-1">PDF, maksimal 20MB</div>
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {ocrLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-orange-600" />
              <p className="text-sm mt-2 font-medium">Sedang membaca PDF & extracting program...</p>
              <p className="text-xs text-muted-foreground mt-1">Mohon tunggu, sistem sedang menganalisis dokumen Anda.</p>
            </div>
          )}

          {/* Preview Results */}
          {extractResult && !ocrLoading && (
            <div className="space-y-3">
              {/* Success banner */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-start gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Berhasil! {extractResult.data.savedCount} program disimpan.</div>
                  <div className="text-xs mt-1">{extractResult.data.programs.length} program terdeteksi dari PDF. Data sudah otomatis tersimpan di daftar program.</div>
                </div>
              </div>

              {/* Document title */}
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground font-semibold mb-1">Judul Dokumen:</div>
                <div className="text-sm font-medium">{extractResult.data.title}</div>
              </div>

              {/* AI Summary */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <div className="text-xs text-blue-800 font-semibold mb-1">Ringkasan Otomatis:</div>
                <p className="text-xs text-blue-700">{extractResult.data.aiSummary}</p>
              </div>

              {/* List of extracted programs */}
              {extractResult.data.programs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Program Terdeteksi ({extractResult.data.programs.length}):</div>
                  {extractResult.data.programs.map((prog: any, i: number) => (
                    <div key={i} className="rounded-lg border p-3 bg-white">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-[11px] bg-orange-50 text-orange-700 border-orange-200 shrink-0">#{prog.priority}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{prog.name}</div>
                          {prog.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{prog.description.substring(0, 200)}</p>}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {prog.timeline && <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">{prog.timeline}</Badge>}
                            {prog.budget && <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">{prog.budget}</Badge>}
                            {prog.target && <Badge variant="outline" className="text-[11px] bg-purple-50 text-purple-700 border-purple-200">{prog.target}</Badge>}
                            {prog.location && <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200">{prog.location}</Badge>}
                            <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700 border-slate-200">{prog.category}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw text preview */}
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Lihat teks asli PDF (2000 karakter pertama)</summary>
                <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">{extractResult.data.rawTextPreview}</pre>
              </details>

              {/* View original PDF */}
              {extractResult.data.viewUrl && (
                <a href={extractResult.data.viewUrl} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <FileCheck className="w-3 h-3" /> Lihat PDF Asli ↗
                </a>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <DialogFooter>
            {extractResult ? (
              <>
                <Button type="button" variant="outline" onClick={() => { setExtractResult(null); setPdfFile(null) }}>Upload Lagi</Button>
                <Button type="button" onClick={() => { setPdfUploadOpen(false); setPdfFile(null); setExtractResult(null); reload() }} className={`bg-gradient-to-r ${accentColor} text-white`}>
                  Selesai
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => { setPdfUploadOpen(false); setPdfFile(null) }}>Batal</Button>
                <Button type="button" disabled={!pdfFile || ocrLoading} onClick={async () => {
                  if (!pdfFile) return
                  setOcrLoading(true)
                  try {
                    const formData = new FormData()
                    formData.append('file', pdfFile)
                    formData.append('level', level)
                    formData.append('territoryCode', territoryCode)
                    formData.append('territoryName', territoryName)
                    const res = await fetch('/api/program-kerja/upload-pdf', { method: 'POST', headers: { 'x-user-id': useAuthStore.getState().user?.id || '' }, body: formData })
                    const data = await res.json()
                    if (!data.success) throw new Error(data.error)
                    setExtractResult(data)
                    reload()
                  } catch (e: any) { addToast(e.message, 'error') }
                  finally { setOcrLoading(false) }
                }} className={`bg-gradient-to-r ${accentColor} text-white`}>
                  {ocrLoading ? 'Memproses...' : 'Upload & Extract'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Bukti Pelaksanaan */}
      <Dialog open={!!evidenceDialog} onOpenChange={(o) => { if (!o) { setEvidenceDialog(null); setEvidenceFile(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" />
              Bukti Pelaksanaan Program
            </DialogTitle>
            <DialogDescription>
              {evidenceDialog?.item?.title || 'Program'}
              {evidenceDialog?.files?.length > 0 && ` — ${evidenceDialog.files.length} bukti terupload`}
            </DialogDescription>
          </DialogHeader>

          {/* Upload area */}
          {isSuperAdmin && (
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input type="file" accept="image/jpeg,image/png,application/pdf,.doc,.docx" className="hidden" id="evidence-upload"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
              {evidenceFile ? (
                <div>
                  <FileCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <div className="text-sm font-medium">{evidenceFile.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{(evidenceFile.size / 1024).toFixed(0)} KB</div>
                  <div className="flex gap-2 justify-center mt-2">
                    <Button type="button" variant="link" size="sm" onClick={() => document.getElementById('evidence-upload')?.click()}>Ganti file</Button>
                    <Button type="button" size="sm" disabled={evidenceLoading} onClick={handleUploadEvidence}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                      {evidenceLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                      {evidenceLoading ? 'Mengupload...' : 'Upload Bukti'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm">Klik untuk <Button type="button" variant="link" className="p-0 h-auto"
                    onClick={() => document.getElementById('evidence-upload')?.click()}>pilih file bukti</Button></div>
                  <div className="text-xs text-muted-foreground mt-1">Foto (JPG/PNG) atau Dokumen (PDF/DOC), maksimal 5MB</div>
                </div>
              )}
            </div>
          )}

          {/* List of uploaded evidence */}
          {evidenceDialog?.files?.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">Bukti Terupload ({evidenceDialog.files.length}):</div>
              {evidenceDialog.files.map((ev: any, i: number) => (
                <div key={ev.id || i} className="flex items-start gap-3 p-3 rounded-lg border bg-white">
                  {/* Thumbnail for images, icon for docs */}
                  {ev.fileType === 'jpg' || ev.fileType === 'jpeg' || ev.fileType === 'png' ? (
                    <img src={ev.dataUrl} alt={ev.fileName} className="w-16 h-16 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center border">
                      <FileCheck className="w-8 h-8 text-blue-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{ev.fileName}</div>
                    <div className="text-xs text-muted-foreground">{(ev.fileSize / 1024).toFixed(0)} KB • {ev.fileType?.toUpperCase()}</div>
                    {ev.uploadedAt && <div className="text-xs text-muted-foreground mt-0.5">Upload: {new Date(ev.uploadedAt).toLocaleDateString('id-ID')}</div>}
                    <a href={ev.dataUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                      <Eye className="w-3 h-3" /> Lihat ↗
                    </a>
                  </div>
                  {isSuperAdmin && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteEvidence(evidenceDialog.item.id, ev.id, evidenceDialog.files)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {(!evidenceDialog?.files || evidenceDialog.files.length === 0) && !isSuperAdmin && (
            <div className="text-center py-4 text-sm text-muted-foreground">Belum ada bukti pelaksanaan diupload.</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setEvidenceDialog(null); setEvidenceFile(null) }}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
