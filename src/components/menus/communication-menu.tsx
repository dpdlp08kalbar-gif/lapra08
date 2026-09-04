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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Send, Sparkles, Filter, AlertTriangle, CheckCircle2, Target,
  TrendingUp, BarChart3, PieChart, Award, RefreshCw,
  Users, ChevronDown, ChevronRight,
} from 'lucide-react'

const TABS = [
  { key: 'territory', label: 'Kelola Wilayah', icon: MapPin },
  { key: 'surveys', label: 'Survei & Polling', icon: Brain },
  { key: 'monitoring', label: 'Monitoring Berita', icon: Sparkles },
  { key: 'analytics', label: 'Dashboard Analitik', icon: Target },
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
  const [tab, setTab] = useState('territory')
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

      {tab === 'territory' && <TerritoryTab />}
      {tab === 'surveys' && <SurveysTab onGoToTerritory={() => setTab('territory')} />}
      {tab === 'monitoring' && <MonitoringTab onGoToTerritory={() => setTab('territory')} />}
      {tab === 'analytics' && <AnalyticsTab onGoToTerritory={() => setTab('territory')} />}
    </div>
  )
}

// ============================================================
// TAB: SURVEYS (Fase 1 + 2)
// ============================================================
function SurveysTab({ onGoToTerritory }: { onGoToTerritory?: () => void }) {
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
      const res = await api('/api/surveys', { method: 'POST', body: JSON.stringify({ title: title.trim(), question: question.trim(), targetScope, pollType, options: pollType === 'MULTIPLE_CHOICE' ? options : undefined }), keepWrapper: true })
      if (res?.success !== false) { addToast(res?.message || 'Survei dibuat (DRAFT)', 'success'); resetForm(); setShowForm(false); loadData() }
      else { addToast(res?.error || 'Gagal', 'error') }
    } catch (e: any) { addToast(e.message, 'error') } finally { setSaving(false) }
  }

  const handleActivate = async (id: string) => {
    try { const res = await api(`/api/surveys/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'ACTIVE' }), keepWrapper: true }); if (res?.success) { addToast('Survei diaktifkan', 'success'); loadData() } else { addToast(res?.error, 'error') } }
    catch (e: any) { addToast(e.message, 'error') }
  }

  const handleClose = async (id: string, t: string) => {
    if (!confirm(`Tutup survei "${t.substring(0, 50)}"?`)) return
    try { const res = await api(`/api/surveys/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'CLOSED' }), keepWrapper: true }); if (res?.success) { addToast('Survei ditutup', 'success'); loadData() } else { addToast(res?.error, 'error') } }
    catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDelete = async (id: string, t: string) => {
    if (!confirm(`Hapus survei "${t.substring(0, 50)}" permanen?`)) return
    try { const res = await api(`/api/surveys/${id}`, { method: 'DELETE', keepWrapper: true }); if (res?.success) { addToast('Survei dihapus', 'success'); loadData() } else { addToast(res?.error, 'error') } }
    catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDetail = async (id: string) => {
    try {
      const res = await api(`/api/surveys/${id}`, { keepWrapper: true })
      if (res?.success && res.data) setDetailSurvey(res.data)
      else addToast(res?.error || 'Gagal memuat detail', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
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
      {/* Info: Atur wilayah dulu */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-3">
        <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-bold text-blue-800 text-sm">📌 Langkah 1: Atur Wilayah Dulu</div>
          <p className="text-xs text-blue-700 mt-0.5">Pastikan struktur wilayah (Provinsi → Kab/Kota → Kecamatan → Desa → RT) sudah diatur di tab <strong>Kelola Wilayah</strong> sebelum membuat survei.</p>
        </div>
        {onGoToTerritory && <Button size="sm" variant="outline" className="h-7 text-xs bg-blue-50 border-blue-300 text-blue-700" onClick={onGoToTerritory}>Buka Kelola Wilayah →</Button>}
      </div>

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
function MonitoringTab({ onGoToTerritory }: { onGoToTerritory?: () => void }) {
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
      const res = await api(`/api/opinion-links/${linkId}`, { method: 'DELETE', keepWrapper: true })
      if (res?.success) { addToast('Berita dihapus', 'success'); loadMentions() }
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

// ============================================================
// TAB 3: DASHBOARD ANALITIK (Fase 4 — Cross-tab + Tren + Zonasi)
// ============================================================
function AnalyticsTab({ onGoToTerritory }: { onGoToTerritory?: () => void }) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await api('/api/surveys/analytics', { keepWrapper: true })
      if (res?.success) {
        setAnalytics(res.data)
        setLastUpdated(new Date())
      }
    } catch (e) { console.error('[Analytics] Error:', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadAnalytics()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadAnalytics()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadAnalytics])

  if (loading) return <LoadingState />
  if (!analytics) return <EmptyState icon={Target} title="Belum ada data" description="Data analitik akan muncul setelah ada respon survei." />

  const s = analytics.summary
  const total = s.totalResponses || 1

  return (
    <div className="space-y-4">
      {/* Live Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE
          </div>
          {lastUpdated && <span className="text-xs text-muted-foreground">Update: {lastUpdated.toLocaleTimeString('id-ID')}</span>}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={loadAnalytics}>
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-slate-800">{s.totalResponses}</div>
          <div className="text-xs text-muted-foreground">Total Respon</div>
        </CardContent></Card>
        <Card className="border-emerald-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{s.positive}</div>
          <div className="text-xs text-muted-foreground">Positif ({Math.round(s.positive / total * 100)}%)</div>
        </CardContent></Card>
        <Card className="border-amber-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{s.neutral}</div>
          <div className="text-xs text-muted-foreground">Netral ({Math.round(s.neutral / total * 100)}%)</div>
        </CardContent></Card>
        <Card className="border-red-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{s.negative}</div>
          <div className="text-xs text-muted-foreground">Negatif ({Math.round(s.negative / total * 100)}%)</div>
        </CardContent></Card>
      </div>

      {/* Zonasi Wilayah */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-600" /> Zonasi Wilayah</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3 text-xs">
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-50"><span>🟢</span> Basis Aman ({s.greenZones})</div>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50"><span>🟡</span> Medan Tempur ({s.yellowZones})</div>
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-50"><span>🔴</span> Kritis ({s.redZones})</div>
          </div>
          {analytics.zonasi.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada data zonasi. Data muncul setelah ada respon dengan lokasi.</p>
          ) : (
            <div className="space-y-1.5">
              {analytics.zonasi.slice(0, 10).map((z: any) => (
                <div key={z.code} className="flex items-center gap-2 text-xs p-2 rounded border">
                  <span className="text-lg">{z.zoneIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{z.name}</div>
                    <div className="text-[10px] text-muted-foreground">{z.total} respon • {z.posRate}% positif • {z.negRate}% negatif</div>
                  </div>
                  <Badge variant="outline" className={`text-xs bg-${z.zoneColor}-50 text-${z.zoneColor}-700`}>{z.zone}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tren Sentimen Harian */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Tren Sentimen Harian (30 Hari)</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.sentimenTrend.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada data tren. Data muncul setelah ada respon dalam 30 hari terakhir.</p>
          ) : (
            <div className="space-y-2">
              {/* Simple bar chart (CSS-based, no external lib) */}
              {analytics.sentimenTrend.slice(-15).map((d: any) => {
                const max = Math.max(d.positive, d.neutral, d.negative, 1)
                return (
                  <div key={d.date} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-muted-foreground">{d.date.slice(5)}</span>
                    <div className="flex-1 flex gap-0.5 h-4">
                      <div className="bg-emerald-500 rounded-l h-full transition-all" style={{ width: `${(d.positive / max) * 100}%` }} title={`Positif: ${d.positive}`} />
                      <div className="bg-amber-500 h-full transition-all" style={{ width: `${(d.neutral / max) * 100}%` }} title={`Netral: ${d.neutral}`} />
                      <div className="bg-red-500 rounded-r h-full transition-all" style={{ width: `${(d.negative / max) * 100}%` }} title={`Negatif: ${d.negative}`} />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">{d.positive + d.neutral + d.negative}</span>
                  </div>
                )
              })}
              <div className="flex gap-3 text-[10px] text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500"></span> Positif</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500"></span> Netral</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500"></span> Negatif</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross-tabulation: Demografi vs Sentimen */}
      <div className="grid md:grid-cols-3 gap-3">
        {/* Age Group */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-600" /> Usia vs Sentimen</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(analytics.crossTab.ageGroup).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada data</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(analytics.crossTab.ageGroup).map(([age, ct]: any) => {
                  const t = ct.positive + ct.neutral + ct.negative || 1
                  return (
                    <div key={age} className="text-xs">
                      <div className="flex justify-between mb-0.5"><span className="font-medium">{age}</span><span className="text-muted-foreground">{t} respon</span></div>
                      <div className="flex h-2 rounded overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${(ct.positive / t) * 100}%` }} />
                        <div className="bg-amber-500 h-full" style={{ width: `${(ct.neutral / t) * 100}%` }} />
                        <div className="bg-red-500 h-full" style={{ width: `${(ct.negative / t) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gender */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><PieChart className="w-4 h-4 text-blue-600" /> Gender vs Sentimen</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(analytics.crossTab.gender).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada data</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(analytics.crossTab.gender).map(([gender, ct]: any) => {
                  const t = ct.positive + ct.neutral + ct.negative || 1
                  return (
                    <div key={gender} className="text-xs">
                      <div className="flex justify-between mb-0.5"><span className="font-medium">{gender === 'LAKI-LAKI' ? 'Laki-laki' : 'Perempuan'}</span><span className="text-muted-foreground">{t} respon</span></div>
                      <div className="flex h-2 rounded overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${(ct.positive / t) * 100}%` }} />
                        <div className="bg-amber-500 h-full" style={{ width: `${(ct.neutral / t) * 100}%` }} />
                        <div className="bg-red-500 h-full" style={{ width: `${(ct.negative / t) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Occupation */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-orange-600" /> Pekerjaan vs Sentimen</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(analytics.crossTab.occupation).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada data</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(analytics.crossTab.occupation).slice(0, 8).map(([occ, ct]: any) => {
                  const t = ct.positive + ct.neutral + ct.negative || 1
                  return (
                    <div key={occ} className="text-xs">
                      <div className="flex justify-between mb-0.5"><span className="font-medium truncate">{occ}</span><span className="text-muted-foreground">{t}</span></div>
                      <div className="flex h-2 rounded overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${(ct.positive / t) * 100}%` }} />
                        <div className="bg-amber-500 h-full" style={{ width: `${(ct.neutral / t) * 100}%` }} />
                        <div className="bg-red-500 h-full" style={{ width: `${(ct.negative / t) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// TAB 4: KELOLA WILAYAH (Fase 5 — Struktur Hierarki)
// ============================================================
// Drill-down: Indonesia → Provinsi → Kab/Kota → Kecamatan → Desa/Kelurahan → RW → RT
// Admin bisa: tambah, edit, hapus wilayah
// Penamaan: DPN=Indonesia, DPD=Provinsi, DPC=Kab/Kota
// ============================================================

const LEVEL_LABELS: Record<string, string> = {
  COUNTRY: 'Indonesia',
  PROVINCE: 'Provinsi',
  REGENCY: 'Kabupaten/Kota',
  DISTRICT: 'Kecamatan',
  VILLAGE: 'Desa/Kelurahan',
  RW: 'RW',
  RT: 'RT',
}

const LEVEL_COLORS: Record<string, string> = {
  COUNTRY: 'bg-red-50 text-red-700',
  PROVINCE: 'bg-orange-50 text-orange-700',
  REGENCY: 'bg-amber-50 text-amber-700',
  DISTRICT: 'bg-blue-50 text-blue-700',
  VILLAGE: 'bg-emerald-50 text-emerald-700',
  RW: 'bg-purple-50 text-purple-700',
  RT: 'bg-slate-50 text-slate-700',
}

function TerritoryTab() {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore.getState().user
  const [territories, setTerritories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [breadcrumb, setBreadcrumb] = useState<any[]>([])
  const [currentParentId, setCurrentParentId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formLevel, setFormLevel] = useState('')
  const [importing, setImporting] = useState(false)
  // Data Warga dialog state
  const [wargaOpen, setWargaOpen] = useState(false)
  const [wargaTerritory, setWargaTerritory] = useState<any | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = currentParentId ? `?parentId=${currentParentId}` : '?level=COUNTRY'
      const res = await api(`/api/territory/manage${params}`, { keepWrapper: true })
      if (res?.success) setTerritories(res.data || [])
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [currentParentId, addToast])

  useEffect(() => { loadData() }, [loadData])

  // Drill into child
  const handleDrillDown = (territory: any) => {
    setBreadcrumb(prev => [...prev, territory])
    setCurrentParentId(territory.id)
  }

  // === Import Kalbar ===
  const handleImportKalbar = async () => {
    if (!confirm('Import hierarki Kalimantan Barat?\n\n• 13 Kab/Kota\n• 160 Kecamatan\n• 1982 Desa/Kelurahan\n• RT/RW di kelurahan Pontianak Selatan (BMD, Akcaya, BML, Kotabaru, Parittokaya)\n\nProses ini mungkin 1-3 menit.')) return
    setImporting(true)
    try {
      // Fetch JSON dari public folder
      const res = await fetch('/kalbar-territories.json')
      const data = await res.json()
      // POST ke API import
      const importRes = await api('/api/territory/import-kalbar', {
        method: 'POST',
        body: JSON.stringify({ data }),
        keepWrapper: true,
      })
      if (importRes?.success) {
        const created = importRes.data?.created || 0
        const rwRt = importRes.data?.rwRtCreated || 0
        const skipped = importRes.data?.skipped || 0
        addToast(importRes.message || `Import selesai: ${created} wilayah + ${rwRt} RW/RT dibuat (${skipped} sudah ada)`, 'success')
        loadData()
      } else {
        addToast(importRes?.error || 'Gagal import', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setImporting(false)
    }
  }

  // Go back to parent
  const handleGoBack = (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)
    setCurrentParentId(index >= 0 ? newBreadcrumb[newBreadcrumb.length - 1]?.id || null : null)
    if (index < 0) { setBreadcrumb([]); setCurrentParentId(null) }
  }

  // Determine next level
  const getNextLevel = (): string => {
    if (breadcrumb.length === 0) return 'PROVINCE'
    const lastLevel = breadcrumb[breadcrumb.length - 1].level
    const idx = ['COUNTRY', 'PROVINCE', 'REGENCY', 'DISTRICT', 'VILLAGE', 'RW', 'RT'].indexOf(lastLevel)
    return ['COUNTRY', 'PROVINCE', 'REGENCY', 'DISTRICT', 'VILLAGE', 'RW', 'RT'][idx + 1] || 'RT'
  }

  // Add territory
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) { addToast('Nama wajib diisi', 'error'); return }
    try {
      const parentId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : null
      const level = getNextLevel()
      const res = await api('/api/territory/manage', {
        method: 'POST',
        body: JSON.stringify({ name: formName.trim(), code: formCode.trim() || `TERR_${Date.now()}`, level, parentId }),
        keepWrapper: true,
      })
      if (res?.success) { addToast(res.message || 'Wilayah ditambahkan', 'success'); setFormName(''); setFormCode(''); setShowForm(false); loadData() }
      else { addToast(res?.error || 'Gagal', 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // Edit territory
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) { addToast('Nama wajib diisi', 'error'); return }
    try {
      const res = await api(`/api/territory/manage/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: formName.trim(), code: formCode.trim() }),
        keepWrapper: true,
      })
      if (res?.success) { addToast(res.message || 'Wilayah diperbarui', 'success'); setFormName(''); setFormCode(''); setEditingId(null); setShowForm(false); loadData() }
      else { addToast(res?.error || 'Gagal', 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // Delete territory
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus "${name}"? Semua sub-wilayah di bawahnya juga akan dihapus.`)) return
    try {
      const res = await api(`/api/territory/manage/${id}`, { method: 'DELETE', keepWrapper: true })
      if (res?.success) { addToast(res.message || 'Wilayah dihapus', 'success'); loadData() }
      else { addToast(res?.error || 'Gagal', 'error') }
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const currentLevel = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].level : 'COUNTRY'
  const nextLevel = getNextLevel()

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 flex-wrap text-xs">
        <button onClick={() => { setBreadcrumb([]); setCurrentParentId(null); loadData() }} className="px-2 py-1 rounded hover:bg-accent text-blue-600">🏠 Indonesia</button>
        {breadcrumb.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            <button onClick={() => { handleGoBack(i); loadData() }} className="px-2 py-1 rounded hover:bg-accent text-blue-600">{b.name}</button>
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">
            {breadcrumb.length === 0 ? 'Indonesia (DPN)' : `${LEVEL_LABELS[currentLevel] || currentLevel} — ${breadcrumb[breadcrumb.length - 1]?.name}`}
          </h3>
          <p className="text-xs text-muted-foreground">{territories.length} {LEVEL_LABELS[nextLevel] || nextLevel}</p>
        </div>
        <div className="flex gap-2">
          {breadcrumb.length === 0 && (
            <Button onClick={handleImportKalbar} disabled={importing} variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              {importing ? 'Mengimpor...' : 'Import Kalbar'}
            </Button>
          )}
          <Button onClick={() => { setShowForm(true); setFormName(''); setFormCode(''); setEditingId(null) }} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Tambah {LEVEL_LABELS[nextLevel] || nextLevel}
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? <LoadingState /> : territories.length === 0 ? (
        <EmptyState icon={MapPin} title={`Belum ada ${LEVEL_LABELS[nextLevel] || nextLevel}`} description={`Klik tombol di atas untuk menambah ${LEVEL_LABELS[nextLevel] || nextLevel}.`} />
      ) : (
        <div className="space-y-2">
          {territories.map(t => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className={`text-xs ${LEVEL_COLORS[t.level] || ''}`}>{LEVEL_LABELS[t.level] || t.level}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{t.name}</div>
                      {t.code && <div className="text-xs text-muted-foreground">Kode: {t.code}</div>}
                      {t.childCount > 0 && <div className="text-xs text-blue-600">{t.childCount} sub-wilayah</div>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {t.childCount > 0 || ['COUNTRY', 'PROVINCE', 'REGENCY', 'DISTRICT', 'VILLAGE', 'RW'].includes(t.level) ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDrillDown(t)}>
                        <Eye className="w-3 h-3 mr-1" /> Buka
                      </Button>
                    ) : null}
                    {/* Data Warga button — ONLY on RT level (RT yang bertugas input data warga masing-masing) */}
                    {t.level === 'RT' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        onClick={() => { setWargaTerritory(t); setWargaOpen(true) }}
                      >
                        <Users className="w-3 h-3 mr-1" /> Data Warga
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(t.id); setFormName(t.name); setFormCode(t.code); setShowForm(true) }}>
                      <Plus className="w-3 h-3 rotate-45" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(t.id, t.name)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Tambah/Edit */}
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) { setEditingId(null); setFormName(''); setFormCode('') } }}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Wilayah' : `Tambah ${LEVEL_LABELS[nextLevel] || nextLevel}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingId ? handleEdit : handleAdd} className="space-y-3">
            <div>
              <Label className="text-sm">Nama {LEVEL_LABELS[nextLevel] || nextLevel} <span className="text-red-500">*</span></Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={`cth: ${LEVEL_LABELS[nextLevel] === 'Provinsi' ? 'Kalimantan Barat' : LEVEL_LABELS[nextLevel] === 'Kabupaten/Kota' ? 'Pontianak' : 'Nama ' + (LEVEL_LABELS[nextLevel] || nextLevel)}`} required className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Kode Wilayah (opsional)</Label>
              <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="cth: 61 untuk Kalbar, 6171 untuk Pontianak" className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">{editingId ? 'Simpan' : 'Tambah'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Data Warga Manager Dialog */}
      <WargaManagerDialog
        open={wargaOpen}
        onClose={() => { setWargaOpen(false); setWargaTerritory(null) }}
        territory={wargaTerritory}
      />
    </div>
  )
}

// ============================================================
// WARGA MANAGER DIALOG (KK + Warga per RT)
// ============================================================
// Komponen untuk input data warga di level RT dengan pengelompokan KK.
//
// Struktur form (per user spec 2026-09-04):
// - 1. Data Utama (KK):
//   - Nomor KK, Nama Kepala Keluarga, Alamat Lengkap, Upload Dokumen KK (PDF/JPG)
// - 2. Data Anggota Keluarga (per individu dalam KK):
//   - Upload Pas Foto (preview gambar)
//   - NIK, Nama Lengkap, Jenis Kelamin, Tempat Lahir, Tanggal Lahir
//   - Usia (dihitung otomatis dari tanggal lahir)
//   - Email, Agama (Wajib), Pendidikan Terakhir (Wajib), Pekerjaan (Wajib)
//   - Hubungan Keluarga (Kepala Keluarga, Istri, Anak, dll)
//   - Kegiatan Organisasi yang Diikuti
//   - Status Domisili (Aktif/Non-aktif)
//   - Upload KTP (PDF/JPG)
//
// Alur Pengisian "+ Tambah KK":
// 1. Admin klik tombol "+ Tambah KK"
// 2. Muncul formulir: Nomor KK, Nama Kepala Keluarga, Alamat, Upload KK
// 3. Di bawahnya, tombol "+ Tambah Anggota Keluarga" untuk tambah individu
// 4. Setelah semua data terisi, klik "Simpan"
// 5. Stats (KK count, total warga, aktif, non-aktif) auto-update
// ============================================================

const RELATION_OPTIONS = [
  { value: 'KEPALA KELUARGA', label: 'Kepala Keluarga' },
  { value: 'ISTRI', label: 'Istri' },
  { value: 'SUAMI', label: 'Suami' },
  { value: 'ANAK', label: 'Anak' },
  { value: 'MENANTU', label: 'Menantu' },
  { value: 'CUCU', label: 'Cucu' },
  { value: 'ORANG TUA', label: 'Orang Tua' },
  { value: 'MERTUA', label: 'Mertua' },
  { value: 'FAMILI LAIN', label: 'Famili Lain' },
  { value: 'PEMBANTU', label: 'Pembantu' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

const GENDER_OPTIONS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
]

// Per user spec — 7 agama + Penghayat Kepercayaan
const RELIGION_OPTIONS = [
  { value: 'ISLAM', label: 'Islam' },
  { value: 'KRISTEN', label: 'Kristen' },
  { value: 'KATOLIK', label: 'Katolik' },
  { value: 'HINDU', label: 'Hindu' },
  { value: 'BUDDHA', label: 'Buddha' },
  { value: 'KONGHUCU', label: 'Khonghucu' },
  { value: 'PENGHAYAT KEPERCAYAAN', label: 'Penghayat Kepercayaan' },
]

// Per user spec — 9 tingkat pendidikan
const EDUCATION_OPTIONS = [
  { value: 'TIDAK SEKOLAH', label: 'Tidak / Belum Sekolah' },
  { value: 'PUTUS SEKOLAH', label: 'Putus Sekolah (SD/Sederajat)' },
  { value: 'SD', label: 'SD / Sederajat' },
  { value: 'SMP', label: 'SMP / Sederajat' },
  { value: 'SMA', label: 'SMA / SMK / Sederajat' },
  { value: 'DIPLOMA', label: 'Diploma (D1 / D2 / D3)' },
  { value: 'S1', label: 'Strata 1 (S1) / Diploma 4 (D4)' },
  { value: 'S2', label: 'Strata 2 (S2)' },
  { value: 'S3', label: 'Strata 3 (S3)' },
]

// Per user spec — 12 pekerjaan utama
const OCCUPATION_OPTIONS = [
  { value: 'BELUM/TIDAK BEKERJA', label: 'Belum / Tidak Bekerja' },
  { value: 'MENGURUS RUMAH TANGGA', label: 'Mengurus Rumah Tangga' },
  { value: 'PELAJAR/MAHASISWA', label: 'Pelajar / Mahasiswa' },
  { value: 'PNS', label: 'Pegawai Negeri Sipil (PNS)' },
  { value: 'TNI/POLRI', label: 'TNI / Polri' },
  { value: 'KARYAWAN SWASTA', label: 'Karyawan Swasta' },
  { value: 'KARYAWAN BUMN/BUMD', label: 'Karyawan BUMN / BUMD' },
  { value: 'BURUH HARIAN LEPAS', label: 'Buruh Harian Lepas' },
  { value: 'PEDAGANG', label: 'Pedagang' },
  { value: 'WIRASWASTA', label: 'Wiraswasta / Pengusaha' },
  { value: 'PENSIUNAN', label: 'Pensiunan' },
  { value: 'LAINNYA', label: 'Pekerjaan Lainnya' },
]

// Helper: hitung usia dari birthDate (YYYY-MM-DD string)
function calcAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null
  try {
    const birth = new Date(birthDateStr)
    if (isNaN(birth.getTime())) return null
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
    return age >= 0 && age < 150 ? age : null
  } catch { return null }
}

// Helper: konversi File menjadi base64 data URL
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

// Helper: cek MIME type untuk preview
function isImageMime(dataUrl: string): boolean {
  return dataUrl?.startsWith('data:image/')
}

// Default anggota form (untuk reset)
function emptyMember(relation: string = 'KEPALA KELUARGA'): any {
  return {
    fullName: '', nik: '', gender: '', birthPlace: '', birthDate: '',
    email: '', religion: '', education: '', occupation: '',
    relationToHead: relation, organisasi: '', isActive: true,
    photoUrl: '', idCardUrl: '',
    // Kontak & Medsos
    phone: '', whatsapp: '',
    facebook: '', instagram: '', tiktok: '', linkedin: '', socialOther: '',
  }
}

function WargaManagerDialog({ open, onClose, territory }: { open: boolean; onClose: () => void; territory: any | null }) {
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [familyCards, setFamilyCards] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [expandedKk, setExpandedKk] = useState<Record<string, boolean>>({})
  const [editingResident, setEditingResident] = useState<string | null>(null)

  // === Multi-step Tambah KK state ===
  const [showAddKk, setShowAddKk] = useState(false)
  const [kkForm, setKkForm] = useState({ kkNumber: '', headOfFamilyName: '', address: '', kkDocumentUrl: '' })
  const [members, setMembers] = useState<any[]>([emptyMember('KEPALA KELUARGA')])
  const [uploading, setUploading] = useState<string>('') // which field is uploading

  // === Single resident edit form ===
  const [residentForm, setResidentForm] = useState<any>(emptyMember('FAMILI LAIN'))

  const loadData = useCallback(async () => {
    if (!territory) return
    setLoading(true)
    try {
      const [listRes, statsRes] = await Promise.all([
        api(`/api/warga?territoryId=${territory.id}`, { keepWrapper: true }),
        api(`/api/warga?territoryId=${territory.id}&stats=1`, { keepWrapper: true }),
      ])
      if (listRes?.success) setFamilyCards(listRes.data?.familyCards || [])
      if (statsRes?.success) setStats(statsRes.data)
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [territory, addToast])

  useEffect(() => {
    if (open && territory) loadData()
  }, [open, territory, loadData])

  // ===== Upload handler =====
  const handleUpload = async (file: File, type: 'kk' | 'ktp' | 'photo', memberIndex?: number) => {
    if (file.size > 2 * 1024 * 1024) {
      addToast('Ukuran file melebihi 2MB', 'error')
      return null
    }
    const uploadKey = `${type}_${memberIndex ?? 'kk'}`
    setUploading(uploadKey)
    try {
      const dataUrl = await fileToDataUrl(file)
      const res = await api('/api/warga/upload', {
        method: 'POST',
        body: JSON.stringify({ file: dataUrl, type }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Upload berhasil', 'success')
        return res.data?.url || dataUrl
      } else {
        addToast(res?.error || 'Upload gagal', 'error')
        return null
      }
    } catch (e: any) {
      addToast(e.message, 'error')
      return null
    } finally {
      setUploading('')
    }
  }

  // ===== Submit KK + members (multi-step form) =====
  const handleSubmitKkWithMembers = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!territory) return
    if (!kkForm.kkNumber.trim() || !kkForm.headOfFamilyName.trim()) {
      addToast('Nomor KK dan Nama Kepala Keluarga wajib diisi', 'error')
      return
    }
    if (members.length === 0) {
      addToast('Minimal 1 anggota (kepala keluarga) wajib diisi', 'error')
      return
    }
    // Validate each member
    for (let i = 0; i < members.length; i++) {
      const m = members[i]
      if (!m.fullName?.trim()) {
        addToast(`Anggota #${i + 1}: Nama wajib diisi`, 'error')
        return
      }
      // Per user spec: Agama, Pendidikan, Pekerjaan WAJIB
      if (!m.religion) { addToast(`Anggota #${i + 1} (${m.fullName}): Agama wajib diisi`, 'error'); return }
      if (!m.education) { addToast(`Anggota #${i + 1} (${m.fullName}): Pendidikan wajib diisi`, 'error'); return }
      if (!m.occupation) { addToast(`Anggota #${i + 1} (${m.fullName}): Pekerjaan wajib diisi`, 'error'); return }
    }

    setSubmitting(true)
    try {
      const res = await api('/api/warga', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_kk_with_members',
          territoryId: territory.id,
          kkNumber: kkForm.kkNumber.trim(),
          headOfFamilyName: kkForm.headOfFamilyName.trim(),
          address: kkForm.address.trim(),
          kkDocumentUrl: kkForm.kkDocumentUrl || null,
          members,
        }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || `KK berhasil dibuat dengan ${members.length} anggota`, 'success')
        // Reset form
        setKkForm({ kkNumber: '', headOfFamilyName: '', address: '', kkDocumentUrl: '' })
        setMembers([emptyMember('KEPALA KELUARGA')])
        setShowAddKk(false)
        loadData()
      } else addToast(res?.error || 'Gagal membuat KK', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  // ===== Add/Remove member di multi-step form =====
  const addMember = () => {
    setMembers([...members, emptyMember('FAMILI LAIN')])
  }
  const removeMember = (idx: number) => {
    if (members.length === 1) { addToast('Minimal 1 anggota (kepala keluarga) wajib ada', 'error'); return }
    setMembers(members.filter((_, i) => i !== idx))
  }
  const updateMember = (idx: number, field: string, value: any) => {
    setMembers(members.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  // ===== Single resident handlers (edit existing) =====
  const handleUpdateResident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!residentForm.fullName.trim() || !editingResident) return
    setSubmitting(true)
    try {
      const res = await api('/api/warga', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'update_resident',
          id: editingResident,
          ...residentForm,
        }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast('Warga diperbarui', 'success')
        setResidentForm(emptyMember('FAMILI LAIN'))
        setEditingResident(null)
        loadData()
      } else addToast(res?.error || 'Gagal', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  const handleToggleResident = async (resident: any) => {
    if (!confirm(`${resident.isActive ? 'Non-aktifkan' : 'Aktifkan kembali'} warga "${resident.fullName}"?`)) return
    try {
      const res = await api('/api/warga', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'toggle_resident',
          id: resident.id,
          isActive: !resident.isActive,
        }),
        keepWrapper: true,
      })
      if (res?.success) { addToast(res.message, 'success'); loadData() }
      else addToast(res?.error || 'Gagal', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDeleteResident = async (id: string, name: string) => {
    if (!confirm(`Hapus warga "${name}"? Tindakan ini permanen.`)) return
    try {
      const res = await api(`/api/warga?id=${id}&type=resident`, { method: 'DELETE', keepWrapper: true })
      if (res?.success) { addToast(res.message, 'success'); loadData() }
      else addToast(res?.error || 'Gagal', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleDeleteKk = async (id: string, kkNumber: string, count: number) => {
    if (!confirm(`Hapus KK "${kkNumber}" beserta ${count} anggota? Tindakan ini permanen.`)) return
    try {
      const res = await api(`/api/warga?id=${id}&type=kk`, { method: 'DELETE', keepWrapper: true })
      if (res?.success) { addToast(res.message, 'success'); loadData() }
      else addToast(res?.error || 'Gagal', 'error')
    } catch (e: any) { addToast(e.message, 'error') }
  }

  // ===== Open edit resident =====
  const openEditResident = (r: any) => {
    setEditingResident(r.id)
    setResidentForm({
      fullName: r.fullName || '', nik: r.nik || '', gender: r.gender || '',
      birthPlace: r.birthPlace || '',
      birthDate: r.birthDate ? new Date(r.birthDate).toISOString().slice(0, 10) : '',
      email: r.email || '', religion: r.religion || '', education: r.education || '',
      occupation: r.occupation || '', relationToHead: r.relationToHead || 'FAMILI LAIN',
      organisasi: r.organisasi || '', isActive: r.isActive,
      photoUrl: r.photoUrl || '', idCardUrl: r.idCardUrl || '',
      phone: r.phone || '', whatsapp: r.whatsapp || '',
      facebook: r.facebook || '', instagram: r.instagram || '',
      tiktok: r.tiktok || '', linkedin: r.linkedin || '', socialOther: r.socialOther || '',
    })
  }

  if (!territory) return null

  const totalResidents = familyCards.reduce((sum, kk) => sum + (kk.residents?.length || 0), 0)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            Data Warga — {territory.name}
            <Badge variant="outline" className="text-xs">{territory.code}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Stats summary (auto-update setelah simpan) */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-2">
              <div className="text-emerald-700 font-bold text-lg">{familyCards.length}</div>
              <div className="text-emerald-600">Kartu Keluarga</div>
            </CardContent></Card>
            <Card className="bg-blue-50 border-blue-200"><CardContent className="p-2">
              <div className="text-blue-700 font-bold text-lg">{totalResidents}</div>
              <div className="text-blue-600">Total Warga</div>
            </CardContent></Card>
            <Card className="bg-amber-50 border-amber-200"><CardContent className="p-2">
              <div className="text-amber-700 font-bold text-lg">{stats?.activeResidents || 0}</div>
              <div className="text-amber-600">Aktif</div>
            </CardContent></Card>
            <Card className="bg-rose-50 border-rose-200"><CardContent className="p-2">
              <div className="text-rose-700 font-bold text-lg">{stats?.inactiveResidents || 0}</div>
              <div className="text-rose-600">Non-aktif</div>
            </CardContent></Card>
          </div>

          {/* Action bar */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {territory.name} • Klik "+ Tambah KK" untuk input KK + anggota
            </div>
            <Button onClick={() => setShowAddKk(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Tambah KK
            </Button>
          </div>

          {/* List KK + Residents */}
          {loading ? <LoadingState /> : familyCards.length === 0 ? (
            <EmptyState icon={Users} title="Belum ada KK" description="Klik 'Tambah KK' di atas untuk mulai input data warga." />
          ) : (
            <div className="space-y-2">
              {familyCards.map((kk) => (
                <Card key={kk.id} className="border-l-4 border-l-emerald-500">
                  <CardContent className="p-3">
                    {/* KK Header */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="flex-1 text-left"
                        onClick={() => setExpandedKk(prev => ({ ...prev, [kk.id]: !prev[kk.id] }))}
                      >
                        <div className="flex items-center gap-2">
                          {expandedKk[kk.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">KK</Badge>
                          <span className="font-medium text-sm">{kk.headOfFamilyName}</span>
                          <span className="text-xs text-muted-foreground">• No. {kk.kkNumber}</span>
                          {kk.kkDocumentUrl && <span className="text-xs text-blue-600">📎 KK</span>}
                        </div>
                        {kk.address && <div className="text-xs text-muted-foreground ml-6">📍 {kk.address}</div>}
                      </button>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{kk.residents?.length || 0} warga</Badge>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                          onClick={() => handleDeleteKk(kk.id, kk.kkNumber, kk.residents?.length || 0)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Residents list */}
                    {expandedKk[kk.id] && (
                      <div className="mt-2 ml-6 space-y-1">
                        {(!kk.residents || kk.residents.length === 0) ? (
                          <div className="text-xs text-muted-foreground italic">Belum ada anggota terdaftar.</div>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="text-left p-1.5">Foto</th>
                                <th className="text-left p-1.5">Nama</th>
                                <th className="text-left p-1.5">Hub.</th>
                                <th className="text-left p-1.5">JK</th>
                                <th className="text-left p-1.5">Tgl Lahir</th>
                                <th className="text-left p-1.5">Usia</th>
                                <th className="text-left p-1.5">Agama</th>
                                <th className="text-left p-1.5">Pendidikan</th>
                                <th className="text-left p-1.5">Pekerjaan</th>
                                <th className="text-center p-1.5">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {kk.residents.map((r: any) => (
                                <tr key={r.id} className={r.isActive ? '' : 'opacity-50 line-through'}>
                                  <td className="p-1.5">
                                    {r.photoUrl && isImageMime(r.photoUrl) ? (
                                      <img src={r.photoUrl} alt={r.fullName} className="w-8 h-8 rounded object-cover" />
                                    ) : r.photoUrl ? (
                                      <span className="text-xs">📎</span>
                                    ) : (
                                      <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs">—</div>
                                    )}
                                  </td>
                                  <td className="p-1.5">
                                    <div className="font-medium">{r.fullName}</div>
                                    <div className="text-[10px] text-muted-foreground">NIK: {r.nik || '-'}</div>
                                    {r.phone && <div className="text-[10px] text-green-700">📞 {r.phone}</div>}
                                    {r.whatsapp && r.whatsapp !== r.phone && <div className="text-[10px] text-emerald-700">💬 WA: {r.whatsapp}</div>}
                                    {r.organisasi && <div className="text-[10px] text-blue-600">🏅 {r.organisasi}</div>}
                                    {/* Medsos badges */}
                                    {(r.facebook || r.instagram || r.tiktok || r.linkedin || r.socialOther) && (
                                      <div className="text-[10px] flex items-center gap-1 mt-0.5 flex-wrap">
                                        {r.facebook && <span title="Facebook" className="text-blue-600">f</span>}
                                        {r.instagram && <span title="Instagram">📷</span>}
                                        {r.tiktok && <span title="TikTok">🎵</span>}
                                        {r.linkedin && <span title="LinkedIn" className="text-blue-700 font-bold">in</span>}
                                        {r.socialOther && <span title="Medsos Lainnya">✈️</span>}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-1.5">{r.relationToHead || '-'}</td>
                                  <td className="p-1.5">{r.gender || '-'}</td>
                                  <td className="p-1.5">{r.birthDate ? new Date(r.birthDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                                  <td className="p-1.5">{calcAge(r.birthDate ? new Date(r.birthDate).toISOString().slice(0, 10) : '') ?? '-'}</td>
                                  <td className="p-1.5">{r.religion || '-'}</td>
                                  <td className="p-1.5">{EDUCATION_OPTIONS.find(e => e.value === r.education)?.label || r.education || '-'}</td>
                                  <td className="p-1.5">{OCCUPATION_OPTIONS.find(o => o.value === r.occupation)?.label || r.occupation || '-'}</td>
                                  <td className="p-1.5">
                                    <div className="flex gap-1 justify-center">
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                                        onClick={() => openEditResident(r)} title="Edit">
                                        <Plus className="w-3 h-3 rotate-45" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                                        onClick={() => handleToggleResident(r)}
                                        title={r.isActive ? 'Non-aktifkan' : 'Aktifkan'}>
                                        {r.isActive ? '🟢' : '🔴'}
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500"
                                        onClick={() => handleDeleteResident(r.id, r.fullName)} title="Hapus">
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* === DIALOG: Tambah KK + Multiple Anggota (multi-step) === */}
        {/* ============================================================ */}
        <Dialog open={showAddKk} onOpenChange={(o) => setShowAddKk(o)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Tambah Kartu Keluarga + Anggota</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitKkWithMembers} className="space-y-4">
              {/* === Section 1: Data Utama KK === */}
              <div className="border-l-4 border-l-emerald-500 pl-3 space-y-2">
                <h3 className="text-sm font-semibold text-emerald-700">📋 Data Utama (Satu Rumah / KK)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Nomor KK (16 digit) <span className="text-red-500">*</span></Label>
                    <Input value={kkForm.kkNumber} onChange={(e) => setKkForm({ ...kkForm, kkNumber: e.target.value })}
                      placeholder="cth: 6171030001080001" required className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Nama Kepala Keluarga <span className="text-red-500">*</span></Label>
                    <Input value={kkForm.headOfFamilyName} onChange={(e) => setKkForm({ ...kkForm, headOfFamilyName: e.target.value })}
                      placeholder="cth: Budi Santoso" required className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm">Alamat Lengkap</Label>
                    <Input value={kkForm.address} onChange={(e) => setKkForm({ ...kkForm, address: e.target.value })}
                      placeholder="cth: Jl. Merdeka No. 1, BMD" className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm">Upload Dokumen KK (PDF / JPG)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="file" accept=".pdf,image/jpeg,image/png,application/pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const url = await handleUpload(file, 'kk')
                          if (url) setKkForm({ ...kkForm, kkDocumentUrl: url })
                        }}
                        className="block w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-emerald-100 file:text-emerald-700 file:font-medium hover:file:bg-emerald-200"
                        disabled={uploading === 'kk_kk'} />
                      {uploading === 'kk_kk' && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    {kkForm.kkDocumentUrl && (
                      <div className="mt-1 text-xs flex items-center gap-2">
                        {isImageMime(kkForm.kkDocumentUrl) ? (
                          <img src={kkForm.kkDocumentUrl} alt="KK" className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <span className="text-blue-600">📎 PDF terunggah</span>
                        )}
                        <button type="button" onClick={() => setKkForm({ ...kkForm, kkDocumentUrl: '' })}
                          className="text-red-500 hover:underline">Hapus</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* === Section 2: Data Anggota Keluarga === */}
              <div className="border-l-4 border-l-blue-500 pl-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-blue-700">👥 Data Anggota Keluarga ({members.length} orang)</h3>
                  <Button type="button" size="sm" variant="outline" onClick={addMember} className="bg-blue-50 border-blue-300 text-blue-700">
                    <Plus className="w-3 h-3 mr-1" /> Tambah Anggota Keluarga
                  </Button>
                </div>

                {members.map((m, idx) => {
                  const age = calcAge(m.birthDate)
                  return (
                    <Card key={idx} className="bg-slate-50 border-slate-200">
                      <CardContent className="p-3 space-y-2">
                        {/* Header anggota */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-100 text-blue-700">Anggota #{idx + 1}</Badge>
                            {m.fullName && <span className="text-sm font-medium">{m.fullName}</span>}
                            {age !== null && <span className="text-xs text-muted-foreground">({age} thn)</span>}
                          </div>
                          {members.length > 1 && (
                            <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500"
                              onClick={() => removeMember(idx)} title="Hapus anggota">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        {/* Photo + Biodata grid */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Photo column */}
                          <div className="col-span-1 space-y-2">
                            <Label className="text-xs">Pas Foto</Label>
                            <div className="flex flex-col items-center gap-1">
                              {m.photoUrl && isImageMime(m.photoUrl) ? (
                                <img src={m.photoUrl} alt="Foto" className="w-24 h-32 object-cover rounded border-2 border-slate-300" />
                              ) : m.photoUrl ? (
                                <div className="w-24 h-32 flex items-center justify-center bg-blue-50 rounded border-2 border-slate-300 text-xs text-blue-600">📎 KTP</div>
                              ) : (
                                <div className="w-24 h-32 flex items-center justify-center bg-slate-100 rounded border-2 border-dashed border-slate-300 text-slate-400 text-xs">— Foto —</div>
                              )}
                              <input type="file" accept="image/jpeg,image/png"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const url = await handleUpload(file, 'photo', idx)
                                  if (url) updateMember(idx, 'photoUrl', url)
                                }}
                                className="block w-full text-[10px] file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:bg-blue-100 file:text-blue-700 file:font-medium hover:file:bg-blue-200"
                                disabled={uploading === `photo_${idx}`} />
                              {uploading === `photo_${idx}` && <Loader2 className="w-3 h-3 animate-spin" />}
                              {m.photoUrl && (
                                <button type="button" onClick={() => updateMember(idx, 'photoUrl', '')}
                                  className="text-xs text-red-500 hover:underline">Hapus foto</button>
                              )}
                            </div>
                          </div>

                          {/* Biodata column */}
                          <div className="col-span-2 grid grid-cols-2 gap-2">
                            <div className="col-span-2">
                              <Label className="text-xs">Nama Lengkap <span className="text-red-500">*</span></Label>
                              <Input value={m.fullName} onChange={(e) => updateMember(idx, 'fullName', e.target.value)}
                                placeholder="cth: Siti Aminah" required className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs">NIK (16 digit)</Label>
                              <Input value={m.nik} onChange={(e) => updateMember(idx, 'nik', e.target.value)}
                                placeholder="cth: 617103..." className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs">Jenis Kelamin</Label>
                              <select value={m.gender} onChange={(e) => updateMember(idx, 'gender', e.target.value)}
                                className="w-full mt-0.5 px-1 py-1 border rounded text-xs h-8">
                                <option value="">— pilih —</option>
                                {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">Tempat Lahir</Label>
                              <Input value={m.birthPlace} onChange={(e) => updateMember(idx, 'birthPlace', e.target.value)}
                                placeholder="Pontianak" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs">Tanggal Lahir</Label>
                              <Input type="date" value={m.birthDate} onChange={(e) => updateMember(idx, 'birthDate', e.target.value)}
                                className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs">Usia (otomatis)</Label>
                              <Input value={age !== null ? `${age} tahun` : '—'} readOnly disabled
                                className="mt-0.5 text-xs h-8 bg-slate-100" />
                            </div>
                            <div>
                              <Label className="text-xs">Email</Label>
                              <Input value={m.email} onChange={(e) => updateMember(idx, 'email', e.target.value)}
                                placeholder="opsional" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs">No. Telepon</Label>
                              <Input value={m.phone} onChange={(e) => updateMember(idx, 'phone', e.target.value)}
                                placeholder="cth: 0812xxxxxxx" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs">No. WhatsApp</Label>
                              <Input value={m.whatsapp} onChange={(e) => updateMember(idx, 'whatsapp', e.target.value)}
                                placeholder="cth: 0812xxxxxxx" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs">Hubungan Keluarga</Label>
                              <select value={m.relationToHead} onChange={(e) => updateMember(idx, 'relationToHead', e.target.value)}
                                className="w-full mt-0.5 px-1 py-1 border rounded text-xs h-8">
                                {RELATION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">Agama <span className="text-red-500">*</span></Label>
                              <select value={m.religion} onChange={(e) => updateMember(idx, 'religion', e.target.value)}
                                required className="w-full mt-0.5 px-1 py-1 border rounded text-xs h-8">
                                <option value="">— wajib —</option>
                                {RELIGION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">Pendidikan Terakhir <span className="text-red-500">*</span></Label>
                              <select value={m.education} onChange={(e) => updateMember(idx, 'education', e.target.value)}
                                required className="w-full mt-0.5 px-1 py-1 border rounded text-xs h-8">
                                <option value="">— wajib —</option>
                                {EDUCATION_OPTIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <Label className="text-xs">Pekerjaan <span className="text-red-500">*</span></Label>
                              <select value={m.occupation} onChange={(e) => updateMember(idx, 'occupation', e.target.value)}
                                required className="w-full mt-0.5 px-1 py-1 border rounded text-xs h-8">
                                <option value="">— wajib —</option>
                                {OCCUPATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Kegiatan Organisasi yang Diikuti</Label>
                              <Input value={m.organisasi} onChange={(e) => updateMember(idx, 'organisasi', e.target.value)}
                                placeholder="cth: Karang Taruna, PKK, BPD, Linmas" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs">Status Domisili</Label>
                              <select value={m.isActive ? 'AKTIF' : 'NON-AKTIF'}
                                onChange={(e) => updateMember(idx, 'isActive', e.target.value === 'AKTIF')}
                                className="w-full mt-0.5 px-1 py-1 border rounded text-xs h-8">
                                <option value="AKTIF">Aktif</option>
                                <option value="NON-AKTIF">Non-aktif (Pindah/Meninggal)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* === Social Media Section === */}
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="text-xs font-semibold text-purple-700">📱 Akun Media Sosial</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs flex items-center gap-1">
                                <span className="text-blue-600">f</span> Facebook
                              </Label>
                              <Input value={m.facebook} onChange={(e) => updateMember(idx, 'facebook', e.target.value)}
                                placeholder="username atau URL" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs flex items-center gap-1">
                                <span className="text-pink-600">📷</span> Instagram
                              </Label>
                              <Input value={m.instagram} onChange={(e) => updateMember(idx, 'instagram', e.target.value)}
                                placeholder="@username" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs flex items-center gap-1">
                                <span className="text-slate-900">🎵</span> TikTok
                              </Label>
                              <Input value={m.tiktok} onChange={(e) => updateMember(idx, 'tiktok', e.target.value)}
                                placeholder="@username" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div>
                              <Label className="text-xs flex items-center gap-1">
                                <span className="text-blue-700">in</span> LinkedIn
                              </Label>
                              <Input value={m.linkedin} onChange={(e) => updateMember(idx, 'linkedin', e.target.value)}
                                placeholder="URL atau username" className="mt-0.5 text-xs h-8" />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs flex items-center gap-1">
                                <span className="text-sky-600">✈️</span> Medsos Lainnya
                              </Label>
                              <Input value={m.socialOther} onChange={(e) => updateMember(idx, 'socialOther', e.target.value)}
                                placeholder="cth: Telegram @username, Twitter @handle, YouTube channel" className="mt-0.5 text-xs h-8" />
                            </div>
                          </div>
                        </div>

                        {/* Upload KTP */}
                        <div className="pt-2 border-t border-slate-200">
                          <Label className="text-xs">Upload KTP (PDF / JPG)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input type="file" accept=".pdf,image/jpeg,image/png,application/pdf"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const url = await handleUpload(file, 'ktp', idx)
                                if (url) updateMember(idx, 'idCardUrl', url)
                              }}
                              className="block w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-amber-100 file:text-amber-700 file:font-medium hover:file:bg-amber-200"
                              disabled={uploading === `ktp_${idx}`} />
                            {uploading === `ktp_${idx}` && <Loader2 className="w-4 h-4 animate-spin" />}
                          </div>
                          {m.idCardUrl && (
                            <div className="mt-1 text-xs flex items-center gap-2">
                              {isImageMime(m.idCardUrl) ? (
                                <img src={m.idCardUrl} alt="KTP" className="w-16 h-10 object-cover rounded" />
                              ) : (
                                <span className="text-amber-600">📎 KTP PDF terunggah</span>
                              )}
                              <button type="button" onClick={() => updateMember(idx, 'idCardUrl', '')}
                                className="text-red-500 hover:underline">Hapus</button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              {/* === Submit buttons === */}
              <div className="flex justify-between items-center pt-3 border-t sticky bottom-0 bg-white">
                <div className="text-xs text-muted-foreground">
                  Total: {members.length} anggota akan disimpan
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddKk(false)}>Batal</Button>
                  <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    {submitting ? 'Menyimpan...' : 'Simpan KK + Anggota'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ============================================================ */}
        {/* === DIALOG: Edit single resident (existing) === */}
        {/* ============================================================ */}
        <Dialog open={!!editingResident} onOpenChange={(o) => { if (!o) setEditingResident(null) }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Edit Biodata Warga</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateResident} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {/* Photo preview */}
                <div className="col-span-1">
                  <Label className="text-sm">Pas Foto</Label>
                  <div className="flex flex-col items-center gap-1 mt-1">
                    {residentForm.photoUrl && isImageMime(residentForm.photoUrl) ? (
                      <img src={residentForm.photoUrl} alt="Foto" className="w-24 h-32 object-cover rounded border-2 border-slate-300" />
                    ) : (
                      <div className="w-24 h-32 flex items-center justify-center bg-slate-100 rounded border-2 border-dashed border-slate-300 text-slate-400 text-xs">— Foto —</div>
                    )}
                    <input type="file" accept="image/jpeg,image/png"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await handleUpload(file, 'photo')
                        if (url) setResidentForm({ ...residentForm, photoUrl: url })
                      }}
                      className="block w-full text-[10px] file:mr-1 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:bg-blue-100 file:text-blue-700 file:font-medium"
                      disabled={uploading === 'photo_'} />
                  </div>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-sm">Nama Lengkap <span className="text-red-500">*</span></Label>
                    <Input value={residentForm.fullName} onChange={(e) => setResidentForm({ ...residentForm, fullName: e.target.value })}
                      required className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">NIK</Label>
                    <Input value={residentForm.nik} onChange={(e) => setResidentForm({ ...residentForm, nik: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Jenis Kelamin</Label>
                    <select value={residentForm.gender} onChange={(e) => setResidentForm({ ...residentForm, gender: e.target.value })}
                      className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="">— pilih —</option>
                      {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">Tempat Lahir</Label>
                    <Input value={residentForm.birthPlace} onChange={(e) => setResidentForm({ ...residentForm, birthPlace: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Tanggal Lahir</Label>
                    <Input type="date" value={residentForm.birthDate} onChange={(e) => setResidentForm({ ...residentForm, birthDate: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Usia (otomatis)</Label>
                    <Input value={calcAge(residentForm.birthDate) !== null ? `${calcAge(residentForm.birthDate)} tahun` : '—'}
                      readOnly disabled className="mt-1 bg-slate-100" />
                  </div>
                  <div>
                    <Label className="text-sm">Email</Label>
                    <Input value={residentForm.email} onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })}
                      className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">No. Telepon</Label>
                    <Input value={residentForm.phone} onChange={(e) => setResidentForm({ ...residentForm, phone: e.target.value })}
                      placeholder="cth: 0812xxxxxxx" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">No. WhatsApp</Label>
                    <Input value={residentForm.whatsapp} onChange={(e) => setResidentForm({ ...residentForm, whatsapp: e.target.value })}
                      placeholder="cth: 0812xxxxxxx" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Hubungan Keluarga</Label>
                    <select value={residentForm.relationToHead} onChange={(e) => setResidentForm({ ...residentForm, relationToHead: e.target.value })}
                      className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      {RELATION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">Agama <span className="text-red-500">*</span></Label>
                    <select value={residentForm.religion} onChange={(e) => setResidentForm({ ...residentForm, religion: e.target.value })}
                      required className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="">— pilih —</option>
                      {RELIGION_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">Pendidikan <span className="text-red-500">*</span></Label>
                    <select value={residentForm.education} onChange={(e) => setResidentForm({ ...residentForm, education: e.target.value })}
                      required className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="">— pilih —</option>
                      {EDUCATION_OPTIONS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm">Pekerjaan <span className="text-red-500">*</span></Label>
                    <select value={residentForm.occupation} onChange={(e) => setResidentForm({ ...residentForm, occupation: e.target.value })}
                      required className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="">— pilih —</option>
                      {OCCUPATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm">Kegiatan Organisasi yang Diikuti</Label>
                    <Input value={residentForm.organisasi} onChange={(e) => setResidentForm({ ...residentForm, organisasi: e.target.value })}
                      placeholder="cth: Karang Taruna, PKK, BPD, Linmas" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-sm">Status Domisili</Label>
                    <select value={residentForm.isActive ? 'AKTIF' : 'NON-AKTIF'}
                      onChange={(e) => setResidentForm({ ...residentForm, isActive: e.target.value === 'AKTIF' })}
                      className="w-full mt-1 px-2 py-1 border rounded text-sm">
                      <option value="AKTIF">Aktif</option>
                      <option value="NON-AKTIF">Non-aktif</option>
                    </select>
                  </div>
                </div>

                {/* === Social Media Section (edit dialog) === */}
                <div className="col-span-3 pt-2 border-t border-slate-200 space-y-2">
                  <div className="text-sm font-semibold text-purple-700">📱 Akun Media Sosial</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        <span className="text-blue-600 font-bold">f</span> Facebook
                      </Label>
                      <Input value={residentForm.facebook} onChange={(e) => setResidentForm({ ...residentForm, facebook: e.target.value })}
                        placeholder="username atau URL" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        <span className="text-pink-600">📷</span> Instagram
                      </Label>
                      <Input value={residentForm.instagram} onChange={(e) => setResidentForm({ ...residentForm, instagram: e.target.value })}
                        placeholder="@username" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        <span className="text-slate-900">🎵</span> TikTok
                      </Label>
                      <Input value={residentForm.tiktok} onChange={(e) => setResidentForm({ ...residentForm, tiktok: e.target.value })}
                        placeholder="@username" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm flex items-center gap-1">
                        <span className="text-blue-700 font-bold">in</span> LinkedIn
                      </Label>
                      <Input value={residentForm.linkedin} onChange={(e) => setResidentForm({ ...residentForm, linkedin: e.target.value })}
                        placeholder="URL atau username" className="mt-1" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-sm flex items-center gap-1">
                        <span className="text-sky-600">✈️</span> Medsos Lainnya
                      </Label>
                      <Input value={residentForm.socialOther} onChange={(e) => setResidentForm({ ...residentForm, socialOther: e.target.value })}
                        placeholder="cth: Telegram @username, Twitter @handle, YouTube channel" className="mt-1" />
                    </div>
                  </div>
                </div>

                <div className="col-span-3">
                  <Label className="text-sm">Upload KTP (PDF / JPG)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="file" accept=".pdf,image/jpeg,image/png,application/pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const url = await handleUpload(file, 'ktp')
                        if (url) setResidentForm({ ...residentForm, idCardUrl: url })
                      }}
                      className="block w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-amber-100 file:text-amber-700 file:font-medium hover:file:bg-amber-200" />
                  </div>
                  {residentForm.idCardUrl && (
                    <div className="mt-1 text-xs flex items-center gap-2">
                      {isImageMime(residentForm.idCardUrl) ? (
                        <img src={residentForm.idCardUrl} alt="KTP" className="w-16 h-10 object-cover rounded" />
                      ) : (
                        <span className="text-amber-600">📎 KTP PDF</span>
                      )}
                      <button type="button" onClick={() => setResidentForm({ ...residentForm, idCardUrl: '' })}
                        className="text-red-500 hover:underline">Hapus</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingResident(null)}>Batal</Button>
                <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
