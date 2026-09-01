'use client'

// LAPRA 08 - Menu Survey & Polling (Fase 1+2+3)
// ============================================================
// Fase 1: CRUD Survei + Public Form + Sentimen
// Fase 2: GPS + Foto + Tier 2 + Offline Queue
// Fase 3: Media Monitoring (9 platform scanner)
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
import { useToastStore, useAuthStore } from '@/lib/store'
import { formatDateTimeID } from '@/lib/format'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Brain, Plus, Eye, Zap, Share2, Trash2, Loader2, Shield,
  Globe, Newspaper, Youtube, Facebook, Instagram, Twitter, MapPin,
  Send, Sparkles, Filter, AlertTriangle, CheckCircle2,
} from 'lucide-react'

const TABS = [
  { key: 'surveys', label: 'Survei & Polling', icon: Brain },
  { key: 'monitoring', label: 'Monitoring Berita', icon: Sparkles },
]

const PLATFORMS = [
  { id: 'GOOGLE', label: 'Google', icon: '🔍' },
  { id: 'YAHOO', label: 'Yahoo', icon: '🟣' },
  { id: 'FACEBOOK', label: 'Facebook', icon: '🔵' },
  { id: 'INSTAGRAM', label: 'Instagram', icon: '📷' },
  { id: 'TIKTOK', label: 'TikTok', icon: '🎵' },
  { id: 'TWITTER_X', label: 'Twitter/X', icon: '🐦' },
  { id: 'LINKEDIN', label: 'LinkedIn', icon: '💼' },
  { id: 'PERS_INDONESIA', label: 'Pers Indonesia', icon: '📰' },
  { id: 'YOUTUBE', label: 'YouTube', icon: '▶️' },
]

export function CommunicationMenu() {
  const [tab, setTab] = useState('surveys')
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore.getState().user

  return (
    <div className="space-y-4">
      <PageHeader title="Survey & Polling" description="Manajemen survei opini publik & monitoring berita — netral, anonim, dan terintegrasi." />

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b pb-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-purple-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'surveys' && <SurveysTab />}
      {tab === 'monitoring' && <MonitoringTab />}
    </div>
  )
}

// ============================================================
// TAB 1: SURVEYS (Fase 1 + 2)
// ============================================================
function SurveysTab() {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore.getState().user
  const [surveys, setSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detailSurvey, setDetailSurvey] = useState<any>(null)

  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [pollType, setPollType] = useState<'ESSAY' | 'MULTIPLE_CHOICE'>('ESSAY')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [targetScope, setTargetScope] = useState('NATIONAL')

  const loadData = useCallback(() => {
    setLoading(true)
    api('/api/surveys').then(res => {
      const data = Array.isArray(res) ? res : (res?.data || [])
      setSurveys(data)
    }).catch(() => setSurveys([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const resetForm = () => { setTitle(''); setQuestion(''); setPollType('ESSAY'); setOptions(['', '']); setTargetScope('NATIONAL') }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !question.trim()) { addToast('Judul dan pertanyaan wajib diisi', 'error'); return }
    if (pollType === 'MULTIPLE_CHOICE') { const c = options.map(o => o.trim()).filter(o => o); if (c.length < 2) { addToast('Pilihan ganda butuh minimal 2 opsi', 'error'); return } }
    setSaving(true)
    try {
      const res = await api('/api/surveys', { method: 'POST', body: JSON.stringify({ title: title.trim(), question: question.trim(), targetScope, pollType, options: pollType === 'MULTIPLE_CHOICE' ? options : undefined }) })
      if (res?.success !== false) { addToast(res?.message || 'Survei dibuat (DRAFT)', 'success'); resetForm(); setShowForm(false); loadData() }
      else { addToast(res?.error || 'Gagal', 'error') }
    } catch (e: any) { addToast(e.message, 'error') } finally { setSaving(false) }
  }

  const handleActivate = async (id: string) => {
    try { const res = await api(`/api/surveys/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'ACTIVE' }) }); if (res?.success !== false) { addToast('Survei diaktifkan', 'success'); loadData() } else { addToast(res?.error, 'error') } }
    catch (e: any) { addToast(e.message, 'error') }
  }

  const handleClose = async (id: string, t: string) => {
    if (!confirm(`Tutup survei "${t.substring(0, 50)}"?`)) return
    try { const res = await api(`/api/surveys/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'CLOSED' }) }); if (res?.success !== false) { addToast('Survei ditutup', 'success'); loadData() } else { addToast(res?.error, 'error') } }
    catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDelete = async (id: string, t: string) => {
    if (!confirm(`Hapus survei "${t.substring(0, 50)}" permanen?`)) return
    try { const res = await api(`/api/surveys/${id}`, { method: 'DELETE' }); if (res?.success !== false) { addToast('Survei dihapus', 'success'); loadData() } else { addToast(res?.error, 'error') } }
    catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDetail = async (id: string) => {
    try { const res = await api(`/api/surveys/${id}`); if (res?.success !== false) setDetailSurvey(res.data) }
    catch (e: any) { addToast(e.message, 'error') }
  }

  const handleShare = (s: any) => {
    const url = `${window.location.origin}/survey/${s.id}`
    navigator.clipboard.writeText(url).then(() => addToast('Link survei disalin', 'success')).catch(() => addToast(`Link: ${url}`, 'info'))
  }

  const addOption = () => { if (options.length < 5) setOptions([...options, '']) }
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)) }
  const updateOption = (i: number, v: string) => { const n = [...options]; n[i] = v; setOptions(n) }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-3 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div><div className="font-bold text-amber-800 text-sm">Survei Netral & Anonim</div><p className="text-xs text-amber-700 mt-0.5">Jangan sebut &quot;LAPRA 08&quot; atau &quot;Laskar Prabowo&quot; di pertanyaan.</p></div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div><h3 className="text-sm font-bold">Daftar Survei</h3><p className="text-xs text-muted-foreground">{surveys.length} survei • {surveys.filter(s => s.status === 'ACTIVE').length} aktif • {surveys.reduce((sum, s) => sum + (s._count?.responses || 0), 0)} respon</p></div>
        <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700 text-white"><Plus className="w-4 h-4 mr-1" /> Buat Survei</Button>
      </div>

      {surveys.length === 0 ? (
        <EmptyState icon={Brain} title="Belum ada survei" description="Klik 'Buat Survei' untuk membuat survei pertama." />
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
          <DialogHeader><DialogTitle>Buat Survei Baru</DialogTitle><DialogDescription>Survei disimpan sebagai DRAFT. Aktifkan manual setelah review.</DialogDescription></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div><Label className="text-sm">Judul <span className="text-red-500">*</span></Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul survei" required disabled={saving} maxLength={200} /></div>
            <div><Label className="text-sm">Pertanyaan <span className="text-red-500">*</span></Label><Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Tulis pertanyaan..." required disabled={saving} rows={3} maxLength={2000} /></div>
            <div>
              <Label className="text-sm">Tipe Jawaban</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button type="button" onClick={() => setPollType('ESSAY')} className={`p-2 border rounded text-left ${pollType === 'ESSAY' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'}`}><div className="text-sm font-medium">Esai</div><div className="text-xs text-muted-foreground">Jawaban bebas</div></button>
                <button type="button" onClick={() => setPollType('MULTIPLE_CHOICE')} className={`p-2 border rounded text-left ${pollType === 'MULTIPLE_CHOICE' ? 'border-purple-500 bg-purple-50' : 'border-slate-200'}`}><div className="text-sm font-medium">Pilihan Ganda</div><div className="text-xs text-muted-foreground">Pilih 1 opsi</div></button>
              </div>
            </div>
            {pollType === 'MULTIPLE_CHOICE' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between"><Label className="text-sm">Opsi (2-5)</Label>{options.length < 5 && <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={addOption}><Plus className="w-3 h-3 mr-1" /> Tambah</Button>}</div>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                    <Input value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Opsi ${idx + 1}`} className="h-8 text-sm" maxLength={100} disabled={saving} />
                    {options.length > 2 && <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => removeOption(idx)} disabled={saving}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                ))}
              </div>
            )}
            <div><Label className="text-sm">Target Wilayah</Label><select value={targetScope} onChange={(e) => setTargetScope(e.target.value)} disabled={saving} className="w-full mt-1 px-3 py-2 border rounded text-sm"><option value="NATIONAL">Nasional</option><option value="PROVINCE">Provinsi</option><option value="REGENCY">Kab/Kota</option></select></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Batal</Button><Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{saving ? 'Menyimpan...' : 'Simpan'}</Button></div>
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
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">{r.aiSentiment || 'BELUM'}</Badge>
                              {r.occupation && <Badge variant="outline" className="text-xs">{r.occupation}</Badge>}
                              {r.gps && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">📍 {r.gps.lat}, {r.gps.lng}</Badge>}
                              {r.hasPhoto && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">📷 Foto</Badge>}
                              {r.tier2?.orgAffiliation && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">{r.tier2.orgAffiliation}</Badge>}
                              {r.tier2?.votingBehavior && <Badge variant="outline" className="text-xs bg-red-50 text-red-700">{r.tier2.votingBehavior}</Badge>}
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

// ============================================================
// TAB 2: MONITORING BERITA (Fase 3 — 9 Platform Scanner)
// ============================================================
function MonitoringTab() {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore.getState().user
  const [scanning, setScanning] = useState(false)
  const [mentions, setMentions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['GOOGLE', 'YAHOO', 'PERS_INDONESIA'])
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [scanResult, setScanResult] = useState<any>(null)

  const loadMentions = useCallback(() => {
    setLoading(true)
    api('/api/opinion-links?limit=100').then(res => {
      const data = Array.isArray(res) ? res : (res?.data || [])
      setMentions(data)
    }).catch(() => setMentions([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadMentions() }, [loadMentions])

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const handleScan = async () => {
    if (selectedPlatforms.length === 0) { addToast('Pilih minimal 1 platform', 'error'); return }
    setScanning(true); setScanResult(null)
    try {
      const res = await fetch('/api/opinion-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ action: 'scrape', platforms: selectedPlatforms }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      setScanResult(data.data)
      addToast(data.message || 'Scan selesai', 'success')
      loadMentions()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setScanning(false) }
  }

  const handleAutoDraft = async (linkId: string) => {
    try {
      const res = await api(`/api/opinion-links/${linkId}/auto-survey`, { method: 'POST', keepWrapper: true })
      if (res?.success) { addToast(res.message || 'Draft survei dibuat', 'success'); loadMentions() }
      else { addToast(res?.error || 'Gagal', 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Hapus berita ini?')) return
    try {
      const res = await api(`/api/opinion-links/${linkId}`, { method: 'DELETE' })
      if (res?.success !== false) { addToast('Berita dihapus', 'success'); loadMentions() }
      else { addToast(res?.error, 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const platformIcon = (p: string) => {
    const map: any = { YOUTUBE: Youtube, GOOGLE: Newspaper, FACEBOOK: Facebook, INSTAGRAM: Instagram, TWITTER_X: Twitter }
    const Icon = map[p] || Globe
    return <Icon className="w-3.5 h-3.5" />
  }

  const filteredMentions = mentions.filter(m => filterPriority === 'ALL' || m.priority === filterPriority)

  return (
    <div className="space-y-4">
      {/* Scanner Control */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-lg shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base mb-1">Monitoring Berita Otomatis</h3>
              <p className="text-xs text-muted-foreground mb-3">Scan REAL mention LAPRA 08 dari 9 platform media sosial & berita. AI analisis sentimen, prioritas, lokasi.</p>

              {/* Platform Selection */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Pilih Platform ({selectedPlatforms.length}/9):</span>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedPlatforms(PLATFORMS.map(p => p.id))} className="text-xs text-blue-600 hover:underline">Semua</button>
                    <span className="text-xs text-muted-foreground">|</span>
                    <button onClick={() => setSelectedPlatforms([])} className="text-xs text-slate-500 hover:underline">Kosong</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                  {PLATFORMS.map(p => {
                    const isSelected = selectedPlatforms.includes(p.id)
                    return (
                      <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border text-[10px] font-medium transition-all ${isSelected ? 'border-orange-500 bg-orange-100 text-orange-800 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                        <span className="text-lg">{p.icon}</span>
                        <span className="truncate w-full text-center">{p.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleScan} disabled={scanning || selectedPlatforms.length === 0} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                  {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {scanning ? `Scanning ${selectedPlatforms.length} platform...` : `Scan ${selectedPlatforms.length} Platform`}
                </Button>
                <Button variant="outline" onClick={loadMentions} disabled={loading}>
                  <Filter className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </div>
            </div>
          </div>

          {scanResult && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              <strong>Scan selesai:</strong> {scanResult.saved} link baru, {scanResult.duplicates} duplikat.
              {scanResult.newHigh > 0 && <Badge className="ml-2 bg-red-100 text-red-800">HIGH: {scanResult.newHigh}</Badge>}
              {scanResult.newMedium > 0 && <Badge className="ml-1 bg-amber-100 text-amber-800">MEDIUM: {scanResult.newMedium}</Badge>}
              {' '}Sumber: {scanResult.sources?.join(' + ')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
          <button key={p} onClick={() => setFilterPriority(p)}
            className={`px-3 py-1 rounded text-xs font-medium ${filterPriority === p ? 'bg-slate-700 text-white' : 'border'}`}>
            {p === 'ALL' ? 'Semua' : p}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filteredMentions.length} berita</span>
      </div>

      {/* List Berita */}
      {loading ? <LoadingState /> : filteredMentions.length === 0 ? (
        <EmptyState icon={Sparkles} title="Belum ada berita" description="Klik 'Scan' untuk mulai monitoring mention LAPRA 08 dari 9 platform." />
      ) : (
        <div className="space-y-2">
          {filteredMentions.map(m => (
            <Card key={m.id} className={`hover:shadow-md transition-shadow ${m.priority === 'HIGH' ? 'border-l-4 border-l-red-500' : m.priority === 'MEDIUM' ? 'border-l-4 border-l-amber-500' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {platformIcon(m.platform)}
                      <Badge variant="outline" className={`text-xs ${m.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : m.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>{m.sentiment}</Badge>
                      <Badge variant="outline" className={`text-xs ${m.priority === 'HIGH' ? 'bg-red-50 text-red-700' : m.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50'}`}>{m.priority}</Badge>
                      {m.provinceName && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{m.provinceName}</Badge>}
                      <span className="text-xs text-muted-foreground">{m.platform}</span>
                    </div>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm hover:text-blue-600 line-clamp-1">{m.title}</a>
                    {m.aiSummary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.aiSummary}</p>}
                    <div className="text-xs text-muted-foreground mt-1">{m.publishedAt ? formatDateTimeID(m.publishedAt) : formatDateTimeID(m.createdAt)} • {m.sourceDomain || m.author || '—'}</div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {m.sentiment === 'NEGATIVE' && m.priority === 'HIGH' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-purple-50 border-purple-300 text-purple-700" onClick={() => handleAutoDraft(m.id)} title="Buat draft survei dari berita ini">
                        <Brain className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteLink(m.id)} title="Hapus">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
