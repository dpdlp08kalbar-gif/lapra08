'use client'

// LAPRA 08 - Menu Survey & Polling (Fase 1 MVP)
// ============================================================
// Sederhana, praktis, Vercel Free compatible
// Fitur:
// 1. Buat survei (Esai / Pilihan Ganda)
// 2. List survei dengan aksi: Detail, Aktifkan, Tutup, Hapus, Share
// 3. Detail dengan respon + sentimen stats
// 4. Share link /survey/[id]
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, EmptyState } from '@/components/ui-helpers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useToastStore, useAuthStore } from '@/lib/store'
import { formatDateTimeID } from '@/lib/format'
import { Brain, Plus, Eye, Zap, Share2, Trash2, Loader2, Shield, CheckCircle2 } from 'lucide-react'

export function CommunicationMenu() {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore.getState().user
  const [surveys, setSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailSurvey, setDetailSurvey] = useState<any>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [pollType, setPollType] = useState<'ESSAY' | 'MULTIPLE_CHOICE'>('ESSAY')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [targetScope, setTargetScope] = useState('NATIONAL')

  // Load surveys
  const loadData = useCallback(() => {
    setLoading(true)
    api('/api/surveys').then(res => {
      const data = Array.isArray(res) ? res : (res?.data || [])
      setSurveys(data)
    }).catch(() => setSurveys([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const resetForm = () => {
    setTitle(''); setQuestion(''); setPollType('ESSAY'); setOptions(['', '']); setTargetScope('NATIONAL')
  }

  // Create survey
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !question.trim()) { addToast('Judul dan pertanyaan wajib diisi', 'error'); return }
    if (pollType === 'MULTIPLE_CHOICE') {
      const clean = options.map(o => o.trim()).filter(o => o)
      if (clean.length < 2) { addToast('Pilihan ganda butuh minimal 2 opsi', 'error'); return }
    }
    setSaving(true)
    try {
      const res = await api('/api/surveys', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), question: question.trim(), targetScope,
          pollType, options: pollType === 'MULTIPLE_CHOICE' ? options : undefined,
        }),
      })
      if (res?.success !== false) {
        addToast(res?.message || 'Survei dibuat (DRAFT)', 'success')
        resetForm(); setShowForm(false); loadData()
      } else { addToast(res?.error || 'Gagal', 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  // Activate
  const handleActivate = async (id: string) => {
    try {
      const res = await api(`/api/surveys/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'ACTIVE' }) })
      if (res?.success !== false) { addToast('Survei diaktifkan', 'success'); loadData() }
      else { addToast(res?.error, 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // Close
  const handleClose = async (id: string, t: string) => {
    if (!confirm(`Tutup survei "${t.substring(0, 50)}"?`)) return
    try {
      const res = await api(`/api/surveys/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'CLOSED' }) })
      if (res?.success !== false) { addToast('Survei ditutup', 'success'); loadData() }
      else { addToast(res?.error, 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // Delete
  const handleDelete = async (id: string, t: string) => {
    if (!confirm(`Hapus survei "${t.substring(0, 50)}" permanen?`)) return
    try {
      const res = await api(`/api/surveys/${id}`, { method: 'DELETE' })
      if (res?.success !== false) { addToast('Survei dihapus', 'success'); loadData() }
      else { addToast(res?.error, 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // Detail
  const handleDetail = async (id: string) => {
    try {
      const res = await api(`/api/surveys/${id}`)
      if (res?.success !== false) setDetailSurvey(res.data)
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // Share
  const handleShare = (survey: any) => {
    const url = `${window.location.origin}/survey/${survey.id}`
    navigator.clipboard.writeText(url).then(() => addToast('Link survei disalin ke clipboard', 'success')).catch(() => addToast(`Link: ${url}`, 'info'))
  }

  // Option handlers
  const addOption = () => { if (options.length < 5) setOptions([...options, '']) }
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)) }
  const updateOption = (i: number, v: string) => { const n = [...options]; n[i] = v; setOptions(n) }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      <PageHeader title="Survey & Polling" description="Manajemen survei opini publik — netral, anonim, dan terintegrasi." />

      {/* Banner Netralitas */}
      <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-3 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-amber-800 text-sm">Survei Netral & Anonim</div>
          <p className="text-xs text-amber-700 mt-0.5">Jangan sebut &quot;LAPRA 08&quot; atau &quot;Laskar Prabowo&quot; di pertanyaan. Responden harus merasa bebas menjawab jujur.</p>
        </div>
      </div>

      {/* Header + tombol buat */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Daftar Survei</h3>
          <p className="text-xs text-muted-foreground">{surveys.length} survei • {surveys.filter(s => s.status === 'ACTIVE').length} aktif • {surveys.reduce((sum, s) => sum + (s._count?.responses || 0), 0)} respon</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Buat Survei
        </Button>
      </div>

      {/* List */}
      {surveys.length === 0 ? (
        <EmptyState icon={Brain} title="Belum ada survei" description="Klik 'Buat Survei' untuk membuat survei pertama Anda." />
      ) : (
        <div className="space-y-2">
          {surveys.map(s => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : s.status === 'CLOSED' ? 'bg-slate-50 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{s.status}</Badge>
                      <Badge variant="outline" className="text-xs">{s._count?.responses || 0} respon</Badge>
                    </div>
                    <div className="font-semibold text-sm">{s.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.question}</p>
                    <div className="text-xs text-muted-foreground mt-1">{formatDateTimeID(s.createdAt)}</div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDetail(s.id)}><Eye className="w-3 h-3 mr-1" /> Detail</Button>
                    {s.status === 'DRAFT' && <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleActivate(s.id)}><Zap className="w-3 h-3 mr-1" /> Aktifkan</Button>}
                    <Button size="sm" variant="outline" className="h-7 text-xs bg-blue-50 border-blue-300 text-blue-700" onClick={() => handleShare(s)}><Share2 className="w-3 h-3 mr-1" /> Share</Button>
                    {s.status === 'ACTIVE' && <Button size="sm" variant="outline" className="h-7 text-xs bg-amber-50 border-amber-300 text-amber-700" onClick={() => handleClose(s.id, s.title)}>Tutup</Button>}
                    <Button size="sm" variant="outline" className="h-7 text-xs bg-red-50 border-red-300 text-red-700" onClick={() => handleDelete(s.id, s.title)}><Trash2 className="w-3 h-3 mr-1" /> Hapus</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Buat Survei */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Buat Survei Baru</DialogTitle>
            <DialogDescription>Survei disimpan sebagai DRAFT. Aktifkan manual setelah review.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label className="text-sm">Judul <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul survei" required disabled={saving} maxLength={200} />
            </div>
            <div>
              <Label className="text-sm">Pertanyaan <span className="text-red-500">*</span></Label>
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Tulis pertanyaan..." required disabled={saving} rows={3} maxLength={2000} />
            </div>
            <div>
              <Label className="text-sm">Tipe Jawaban</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button type="button" onClick={() => setPollType('ESSAY')} className={`p-2 border rounded text-left ${pollType === 'ESSAY' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'}`}>
                  <div className="text-sm font-medium">Esai</div><div className="text-xs text-muted-foreground">Jawaban bebas</div>
                </button>
                <button type="button" onClick={() => setPollType('MULTIPLE_CHOICE')} className={`p-2 border rounded text-left ${pollType === 'MULTIPLE_CHOICE' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'}`}>
                  <div className="text-sm font-medium">Pilihan Ganda</div><div className="text-xs text-muted-foreground">Pilih 1 opsi</div>
                </button>
              </div>
            </div>
            {pollType === 'MULTIPLE_CHOICE' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Opsi (2-5)</Label>
                  {options.length < 5 && <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={addOption}><Plus className="w-3 h-3 mr-1" /> Tambah</Button>}
                </div>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                    <Input value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Opsi ${idx + 1}`} className="h-8 text-sm" maxLength={100} disabled={saving} />
                    {options.length > 2 && <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => removeOption(idx)} disabled={saving}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label className="text-sm">Target Wilayah</Label>
              <select value={targetScope} onChange={(e) => setTargetScope(e.target.value)} disabled={saving} className="w-full mt-1 px-3 py-2 border rounded text-sm">
                <option value="NATIONAL">Nasional (semua Indonesia)</option>
                <option value="PROVINCE">Provinsi (admin DPD)</option>
                <option value="REGENCY">Kab/Kota (admin DPC)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button>
              <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail */}
      {detailSurvey && (
        <Dialog open={true} onOpenChange={() => setDetailSurvey(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Detail Survei</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs font-semibold">Judul</Label><p className="text-sm">{detailSurvey.title}</p></div>
              <div><Label className="text-xs font-semibold">Pertanyaan</Label><p className="text-sm">{detailSurvey.question}</p></div>
              <div><Label className="text-xs font-semibold">Status</Label><Badge variant="outline" className="text-xs ml-2">{detailSurvey.status}</Badge><Badge variant="outline" className="text-xs ml-1">{detailSurvey.totalResponses || 0} respon</Badge></div>
              {detailSurvey.totalResponses > 0 && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded border p-2 text-center"><div className="text-lg font-bold text-emerald-600">{detailSurvey.sentimentStats?.POSITIVE || 0}</div><div className="text-xs text-muted-foreground">Positif</div></div>
                    <div className="rounded border p-2 text-center"><div className="text-lg font-bold text-amber-600">{detailSurvey.sentimentStats?.NEUTRAL || 0}</div><div className="text-xs text-muted-foreground">Netral</div></div>
                    <div className="rounded border p-2 text-center"><div className="text-lg font-bold text-red-600">{detailSurvey.sentimentStats?.NEGATIVE || 0}</div><div className="text-xs text-muted-foreground">Negatif</div></div>
                  </div>
                  {detailSurvey.responses?.length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold">Respon Terbaru</Label>
                      <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                        {detailSurvey.responses.map((r: any) => (
                          <div key={r.id} className="rounded border p-2 text-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{r.aiSentiment || 'BELUM'}</Badge>
                              {r.occupation && <Badge variant="outline" className="text-xs">{r.occupation}</Badge>}
                              <span className="text-xs text-muted-foreground ml-auto">{r.wordCount} kata</span>
                            </div>
                            <p className="line-clamp-2">{r.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleShare(detailSurvey)}><Share2 className="w-4 h-4 mr-1" /> Share</Button>
              <Button variant="outline" onClick={() => setDetailSurvey(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
