'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'
import { PageHeader, LoadingState, ErrorState, EmptyState, StatCard } from '@/components/ui-helpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToastStore, useAuthStore } from '@/lib/store'
import { formatDateTimeID } from '@/lib/format'
import {
  Megaphone, Search, Send, MapPin, Lightbulb, Loader2, ExternalLink,
  CheckCircle2, AlertTriangle, Sparkles, Zap, Brain, Target,
  RefreshCw, Plus, Eye, Edit, Trash2, FileText, Users, TrendingUp,
  Calendar, Globe, Youtube, Newspaper, Twitter, Instagram, Facebook, Filter,
} from 'lucide-react'

// ============================================================
// MAIN: Komunikasi & Command Center — 6 Sub-menu Baru
// ============================================================
export function CommunicationMenu() {
  const [tab, setTab] = useState('opinion-scanner')

  const tabs = [
    { key: 'opinion-scanner', label: 'Opini Publik Auto-Scanner', icon: Sparkles, desc: 'Scan otomatis YouTube + Google News, AI analisis sentimen + lokasi + kategori' },
    { key: 'opinion-map', label: 'Peta Lokasi Suara', icon: MapPin, desc: 'Heatmap geografis opini publik per provinsi & kab/kota' },
    { key: 'broadcast', label: 'Broadcast Composer', icon: Send, desc: 'Multi-channel: WA, FB, IG, Email + attach essay poll' },
    { key: 'essay-polls', label: 'Essay Polling & AI Auto-Pertanyaan', icon: Brain, desc: 'AI generate pertanyaan essay otomatis + analisis jawaban' },
    { key: 'opinion-links', label: 'Link Analisis Publik', icon: ExternalLink, desc: 'Dashboard semua link medsos yang sudah dianalisis' },
    { key: 'decision', label: 'Decision Dashboard', icon: Target, desc: 'Sintesis AI untuk pengambil keputusan politik' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Komunikasi & Command Center"
        description="Sistem cerdas audit opini publik + broadcast + polling essay + decision dashboard. 100% otomatis, terhubung langsung ke YouTube (yt-dlp) + Google News RSS."
        icon={Megaphone}
      />

      {/* Tab navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex flex-col items-start gap-1 p-3 rounded-lg text-left transition-all ${tab === t.key ? 'bg-gradient-to-br from-orange-600 to-red-600 text-white shadow-md' : 'border hover:bg-accent'}`}>
            <t.icon className={`w-4 h-4 ${tab === t.key ? 'text-white' : 'text-orange-600'}`} />
            <span className="text-xs font-semibold leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'opinion-scanner' && <OpinionScannerTab />}
      {tab === 'opinion-map' && <OpinionMapTab />}
      {tab === 'broadcast' && <BroadcastComposerTab />}
      {tab === 'essay-polls' && <EssayPollsTab />}
      {tab === 'opinion-links' && <OpinionLinksTab />}
      {tab === 'decision' && <DecisionDashboardTab />}
    </div>
  )
}

// ============================================================
// TAB 1: OPINI PUBLIK AUTO-SCANNER
// ============================================================
function OpinionScannerTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [recentLinks, setRecentLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState('ALL')

  const loadRecent = useCallback(() => {
    setLoading(true)
    api('/api/opinion-links?limit=15').then(res => {
      const data = Array.isArray(res) ? res : (res?.data || [])
      setRecentLinks(data)
    }).catch(() => setRecentLinks([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadRecent() }, [loadRecent])

  const handleScan = async () => {
    setScanning(true); setLastResult(null)
    try {
      const res = await fetch('/api/opinion-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ action: 'scrape' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      setLastResult(data.data)
      addToast(data.message, 'success')
      loadRecent()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setScanning(false) }
  }

  const platformIcon = (p: string) => {
    if (p === 'YOUTUBE') return <Youtube className="w-3.5 h-3.5 text-red-600" />
    if (p === 'GOOGLE') return <Newspaper className="w-3.5 h-3.5 text-blue-600" />
    if (p === 'FACEBOOK') return <Facebook className="w-3.5 h-3.5 text-blue-700" />
    if (p === 'INSTAGRAM') return <Instagram className="w-3.5 h-3.5 text-purple-600" />
    if (p === 'TWITTER_X') return <Twitter className="w-3.5 h-3.5 text-slate-700" />
    return <Globe className="w-3.5 h-3.5" />
  }

  const filteredLinks = recentLinks.filter(l => filterPriority === 'ALL' || l.priority === filterPriority)

  return (
    <div className="space-y-4">
      {/* Scanner control */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-lg shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Audit Opini Publik Otomatis</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Sistem akan otomatis mengambil REAL mention LAPRA 08 dari YouTube (via yt-dlp) + Google News RSS,
                lalu menganalisis sentimen, prioritas, lokasi, dan kategori setiap mention dengan AI.
                Hasil disimpan ke database untuk tracking & decision dashboard.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={handleScan} disabled={scanning} size="lg"
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                  {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  {scanning ? 'Sedang scan otomatis...' : 'Mulai Scan Sekarang'}
                </Button>
                <Button variant="outline" onClick={loadRecent} disabled={loading} size="lg">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Hasil
                </Button>
              </div>
            </div>
          </div>

          {lastResult && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              <strong>Scan selesai:</strong> {lastResult.saved} link baru disimpan, {lastResult.duplicates} duplikat dilewati.
              {' '}<Badge className="ml-2 bg-red-100 text-red-800">HIGH: {lastResult.newHigh}</Badge>
              <Badge className="ml-1 bg-amber-100 text-amber-800">MEDIUM: {lastResult.newMedium}</Badge>
              {' '}Sumber: {lastResult.sources?.join(' + ')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">Filter Prioritas:</span>
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
          <Button key={p} size="sm" variant={filterPriority === p ? 'default' : 'outline'}
            className={`h-7 text-xs ${filterPriority === p ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
            onClick={() => setFilterPriority(p)}>
            {p === 'ALL' ? 'Semua' : p}
          </Button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground">
          {filteredLinks.length} mention
        </div>
      </div>

      {/* Recent results */}
      {loading ? <LoadingState /> : filteredLinks.length === 0 ? (
        <EmptyState icon={Sparkles} title="Belum ada mention"
          description="Klik 'Mulai Scan Sekarang' untuk mengambil mention LAPRA 08 dari YouTube + Google News secara otomatis." />
      ) : (
        <div className="space-y-2">
          {filteredLinks.map((link) => {
            const priColor = link.priority === 'HIGH' ? 'border-l-red-500 bg-red-50/30' :
              link.priority === 'MEDIUM' ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-blue-500 bg-blue-50/30'
            const priBadge = link.priority === 'HIGH' ? 'bg-red-100 text-red-800 border-red-300' :
              link.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'
            return (
              <div key={link.id} className={`rounded-xl border-l-4 p-3 ${priColor}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-[10px] ${priBadge}`}>{link.priority}</Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">{platformIcon(link.platform)} {link.platform}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${link.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : link.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'}`}>
                        {link.sentiment}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">{link.category}</Badge>
                      {link.provinceName && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{link.regencyName || link.provinceName}</Badge>}
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />REAL
                      </Badge>
                    </div>
                    <div className="text-sm font-semibold">{link.title}</div>
                    {link.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{link.content}</p>}
                    {link.aiSummary && (
                      <div className="mt-2 p-2 rounded bg-white border text-xs">
                        <Lightbulb className="w-3 h-3 inline mr-1 text-amber-500" />
                        <strong>AI:</strong> {link.aiSummary}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>📅 {formatDateTimeID(link.publishedAt || link.createdAt)}</span>
                      {link.engagementCount > 0 && <span>💬 {link.engagementCount}</span>}
                      <span>⚡ {link.urgencyScore}/100</span>
                      {link.author && <span>✍️ {link.author}</span>}
                    </div>
                  </div>
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================
// TAB 2: PETA LOKASI SUARA
// ============================================================
function OpinionMapTab() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [level, setLevel] = useState('PROVINCE')
  const [selectedLoc, setSelectedLoc] = useState<any>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    api(`/api/opinion-map?level=${level}`).then(res => {
      const d = Array.isArray(res) ? res : (res?.data || res)
      setData(d)
    }).catch(() => setData(null)).finally(() => setLoading(false))
  }, [level])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState />
  if (!data || !data.locations) return <EmptyState icon={MapPin} title="Tidak ada data" description="Jalankan Opinion Scanner terlebih dahulu." />

  const { locations, summary } = data

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Wilayah" value={summary.totalLocations} icon={MapPin} color="blue" />
        <StatCard label="Total Mention" value={summary.totalLinks} icon={Sparkles} color="orange" />
        <StatCard label="Negatif" value={summary.totalNegative} icon={AlertTriangle} color="red" />
        <StatCard label="Total Engagement" value={summary.totalEngagement} icon={TrendingUp} color="emerald" />
      </div>

      {/* Level switcher */}
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold">Level:</Label>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PROVINCE">Per Provinsi (38 DPD)</SelectItem>
            <SelectItem value="REGENCY">Per Kab/Kota (514 DPC)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Heat list (provincial ranking) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-5 h-5 text-orange-600" />
            Heatmap Opini Publik per Wilayah
          </CardTitle>
          <CardDescription>Diurutkan berdasarkan heat score (urgensi). Klik untuk detail.</CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <EmptyState icon={MapPin} title="Belum ada data lokasi"
              description="Jalankan Opinion Scanner terlebih dahulu untuk mengumpulkan mention dengan lokasi terdeteksi." />
          ) : (
            <div className="space-y-2">
              {locations.slice(0, 20).map((loc: any) => {
                const heatColor = loc.heatScore >= 70 ? 'bg-red-500' :
                  loc.heatScore >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                return (
                  <div key={loc.code} className="flex items-center gap-3 p-2 rounded border hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedLoc(loc)}>
                    <div className={`w-2 h-12 rounded-full ${heatColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{loc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {loc.total} mention • {loc.NEGATIVE} negatif • {loc.HIGH} HIGH • {loc.totalEngagement} engagement
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{loc.heatScore}</div>
                      <div className="text-[10px] text-muted-foreground">heat</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      {selectedLoc && (
        <Dialog open={true} onOpenChange={() => setSelectedLoc(null)}>
          <DialogContent className="max-w-2xl" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                Detail Opini Publik: {selectedLoc.name}
              </DialogTitle>
              <DialogDescription>Sample mention dari wilayah ini</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {selectedLoc.sampleLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada sample link.</p>
              ) : selectedLoc.sampleLinks.map((link: any, i: number) => (
                <div key={i} className="rounded border p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">{link.platform}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${link.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : link.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>{link.sentiment}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${link.priority === 'HIGH' ? 'bg-red-100 text-red-800' : link.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{link.priority}</Badge>
                  </div>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline line-clamp-2">
                    {link.title}
                  </a>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedLoc(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============================================================
// TAB 3: BROADCAST COMPOSER
// ============================================================
function BroadcastComposerTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [templates, setTemplates] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [contactsStats, setContactsStats] = useState({ total: 0, optIn: 0 })
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)

  // Composer form
  const [form, setForm] = useState({
    title: '', content: '', channels: ['WHATSAPP'],
    scheduleAt: '', imageUrl: '', attachedEssayPollId: '',
  })

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      api('/api/broadcast-composer?type=templates'),
      api('/api/broadcast-composer?type=broadcasts'),
      api('/api/broadcast-composer?type=contacts_count'),
    ]).then(([t, b, c]) => {
      setTemplates(Array.isArray(t) ? t : (t?.data || []))
      setBroadcasts(Array.isArray(b) ? b : (b?.data || []))
      setContactsStats(c?.data || c || { total: 0, optIn: 0 })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState />

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/broadcast-composer', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          action: 'send',
          title: form.title, content: form.content,
          channels: form.channels,
          scheduleAt: form.scheduleAt || null,
          imageUrl: form.imageUrl || null,
          attachedEssayPollId: form.attachedEssayPollId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast(data.message, 'success')
      setForm({ title: '', content: '', channels: ['WHATSAPP'], scheduleAt: '', imageUrl: '', attachedEssayPollId: '' })
      setComposerOpen(false); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const channels = [
    { id: 'WHATSAPP', label: 'WhatsApp', icon: Send, color: 'emerald' },
    { id: 'FACEBOOK', label: 'Facebook', icon: Facebook, color: 'blue' },
    { id: 'INSTAGRAM', label: 'Instagram', icon: Instagram, color: 'purple' },
    { id: 'EMAIL', label: 'Email', icon: FileText, color: 'slate' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Kontak" value={contactsStats.total} icon={Users} color="blue" />
        <StatCard label="WA Opt-in" value={contactsStats.optIn} icon={CheckCircle2} color="emerald" />
        <StatCard label="Templates" value={templates.length} icon={FileText} color="purple" />
        <StatCard label="Broadcasts" value={broadcasts.length} icon={Send} color="orange" />
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-base">Broadcast Composer</h3>
          <p className="text-sm text-muted-foreground">Buat & jadwalkan broadcast multi-channel dengan template variabel + attach essay poll</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateOpen(true)}><FileText className="w-4 h-4 mr-1" /> Template</Button>
          <Button onClick={() => setComposerOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> Buat Broadcast
          </Button>
        </div>
      </div>

      {/* Recent broadcasts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Broadcast Terbaru</CardTitle></CardHeader>
        <CardContent>
          {broadcasts.length === 0 ? (
            <EmptyState icon={Send} title="Belum ada broadcast" description="Klik 'Buat Broadcast' untuk mulai." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-center">Penerima</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-sm">{b.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{b.channel}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{b.recipientCount}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${b.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : b.status === 'QUEUED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTimeID(b.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Composer dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-orange-600" /> Buat Broadcast Baru</DialogTitle>
            <DialogDescription>Pilih channel, isi pesan, jadwalkan jika perlu</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-3">
            <div className="space-y-2">
              <Label>Judul Broadcast *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="cth: Pengumuman Rapat DPD 15 Agustus 2026" required />
            </div>

            <div className="space-y-2">
              <Label>Pilih Channel (bisa lebih dari satu) *</Label>
              <div className="flex flex-wrap gap-2">
                {channels.map(ch => {
                  const active = form.channels.includes(ch.id)
                  return (
                    <button key={ch.id} type="button"
                      onClick={() => setForm({ ...form, channels: active ? form.channels.filter((c: string) => c !== ch.id) : [...form.channels, ch.id] })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${active ? 'bg-orange-600 text-white border-orange-600' : 'border hover:bg-accent'}`}>
                      <ch.icon className="w-4 h-4" /> {ch.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Isi Pesan * <span className="text-xs text-muted-foreground">(boleh pakai variabel: {'{nama}'}, {'{wilayah}'}, {'{tanggal}'})</span></Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Assalamualaikum {nama}, kami dari LAPRA 08 {wilayah} mengundang Bapak/Ibu untuk..." rows={6} required />
              <div className="text-xs text-muted-foreground">{form.content.length} karakter</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jadwalkan (opsional)</Label>
                <Input type="datetime-local" value={form.scheduleAt}
                  onChange={(e) => setForm({ ...form, scheduleAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Image URL (opsional)</Label>
                <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..." />
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              <strong>Estimasi penerima:</strong> {contactsStats.optIn} kontak WA opt-in
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setComposerOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                <Send className="w-4 h-4 mr-1" />
                {form.scheduleAt ? 'Jadwalkan' : 'Kirim Broadcast'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template dialog (placeholder — user can build later) */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Template Pesan</DialogTitle>
            <DialogDescription>Template yang sudah disimpan</DialogDescription>
          </DialogHeader>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada template.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {templates.map(t => (
                <div key={t.id} className="rounded border p-2">
                  <div className="font-semibold text-sm">{t.name}</div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setTemplateOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// TAB 4: ESSAY POLLS & AI AUTO-PERTANYAAN
// ============================================================
function EssayPollsTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [polls, setPolls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiGenOpen, setAiGenOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [detailPoll, setDetailPoll] = useState<any>(null)
  const [aiForm, setAiForm] = useState({ sourceTopic: '', sourceUrl: '', sourceContent: '' })

  const loadData = useCallback(() => {
    setLoading(true)
    api('/api/essay-polls').then(res => {
      setPolls(Array.isArray(res) ? res : (res?.data || []))
    }).catch(() => setPolls([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/essay-polls', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          action: 'ai_generate',
          sourceTopic: aiForm.sourceTopic,
          sourceUrl: aiForm.sourceUrl,
          sourceContent: aiForm.sourceContent,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast(data.message, 'success')
      setAiForm({ sourceTopic: '', sourceUrl: '', sourceContent: '' })
      setAiGenOpen(false); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleActivate = async (pollId: string) => {
    try {
      const res = await fetch(`/api/essay-polls/${pollId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast(`Poll diaktifkan. Responden bisa kirim jawaban sekarang.`, 'success')
      loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  const handleViewDetail = async (pollId: string) => {
    try {
      const res = await fetch(`/api/essay-polls/${pollId}`, { headers: { 'x-user-id': useAuthStore.getState().user?.id || '' } })
      const data = await res.json()
      if (data.success) setDetailPoll(data.data)
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shrink-0">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Essay Polling & AI Auto-Pertanyaan</h3>
              <p className="text-sm text-muted-foreground mb-3">
                AI menelaah berita/event otomatis → generate pertanyaan essay yang tepat sasaran berdasarkan sentimen, lokasi & demografi.
                Jawaban essay dianalisis AI untuk sentimen, kategori, dan keyword otomatis.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setAiGenOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <Sparkles className="w-4 h-4 mr-1" /> AI Generate Pertanyaan
                </Button>
                <Button variant="outline" onClick={() => setManualOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Buat Manual
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Polls list */}
      {polls.length === 0 ? (
        <EmptyState icon={Brain} title="Belum ada essay poll"
          description="Klik 'AI Generate Pertanyaan' untuk membuat pertanyaan essay otomatis dari topik berita/event." />
      ) : (
        <div className="space-y-2">
          {polls.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {p.isAiGenerated && (
                        <Badge className="text-[10px] bg-purple-100 text-purple-800">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />AI GENERATED
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] ${p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : p.status === 'CLOSED' ? 'bg-slate-50 text-slate-700' : 'bg-amber-50 text-amber-700'}`}>
                        {p.status}
                      </Badge>
                      {p.sourceSentiment && (
                        <Badge variant="outline" className={`text-[10px] ${p.sourceSentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : p.sourceSentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                          {p.sourceSentiment}
                        </Badge>
                      )}
                      {p.targetOccupation && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">{p.targetOccupation}</Badge>}
                      {p.provinceName && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{p.regencyName || p.provinceName}</Badge>}
                      <Badge variant="outline" className="text-[10px]">{p._count?.responses || 0} respon</Badge>
                    </div>
                    <div className="font-semibold text-sm">{p.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.question}</p>
                    {p.description && <p className="text-xs text-purple-700 mt-1 italic line-clamp-1">{p.description}</p>}
                    <div className="text-[10px] text-muted-foreground mt-2">
                      📅 {formatDateTimeID(p.createdAt)} • oleh {p.createdBy?.fullName || '?'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleViewDetail(p.id)}>
                      <Eye className="w-3 h-3 mr-1" /> Detail
                    </Button>
                    {p.status === 'DRAFT' && (
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleActivate(p.id)}>
                        <Zap className="w-3 h-3 mr-1" /> Aktifkan
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Generate dialog */}
      <Dialog open={aiGenOpen} onOpenChange={setAiGenOpen}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> AI Generate Pertanyaan Essay</DialogTitle>
            <DialogDescription>AI akan analisis topik/berita, deteksi sentimen + lokasi + demografi, lalu generate pertanyaan essay yang tepat sasaran</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAiGenerate} className="space-y-3">
            <div className="space-y-2">
              <Label>Topik Isu / Berita *</Label>
              <Input value={aiForm.sourceTopic} onChange={(e) => setAiForm({ ...aiForm, sourceTopic: e.target.value })}
                placeholder="cth: Kenaikan harga pupuk bersubsidi di Grobogan" required />
            </div>
            <div className="space-y-2">
              <Label>URL Sumber (opsional)</Label>
              <Input value={aiForm.sourceUrl} onChange={(e) => setAiForm({ ...aiForm, sourceUrl: e.target.value })}
                placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Isi Berita / Konten (opsional — bantu AI lebih akurat)</Label>
              <Textarea value={aiForm.sourceContent} onChange={(e) => setAiForm({ ...aiForm, sourceContent: e.target.value })}
                placeholder="Paste isi berita atau ringkasan isu di sini..." rows={5} />
            </div>
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-2 text-xs text-purple-800">
              <Brain className="w-3.5 h-3.5 inline mr-1" />
              AI akan: 1) analisis sentimen (positif/negatif/netral), 2) deteksi lokasi (provinsi & kab/kota),
              3) identifikasi demografi target (petani/nelayan/UMKM/pelajar/umum), 4) generate pertanyaan essay sesuai konteks.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAiGenOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <Sparkles className="w-4 h-4 mr-1" /> Generate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual create dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Buat Essay Poll Manual</DialogTitle>
            <DialogDescription>Tulis pertanyaan essay sendiri</DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.target as HTMLFormElement)
            const data = Object.fromEntries(fd.entries())
            try {
              const res = await fetch('/api/essay-polls', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
                body: JSON.stringify({
                  title: data.title, question: data.question, description: data.description,
                  targetScope: data.targetScope || 'NATIONAL',
                }),
              })
              const r = await res.json()
              if (!res.ok || !r.success) throw new Error(r.error)
              addToast('Essay poll dibuat', 'success')
              setManualOpen(false); loadData()
            } catch (err: any) { addToast(err.message, 'error') }
          }} className="space-y-3">
            <div className="space-y-2"><Label>Judul *</Label><Input name="title" required /></div>
            <div className="space-y-2"><Label>Pertanyaan Essay *</Label><Textarea name="question" rows={4} required /></div>
            <div className="space-y-2"><Label>Deskripsi (opsional)</Label><Textarea name="description" rows={2} /></div>
            <div className="space-y-2">
              <Label>Target Scope</Label>
              <Select name="targetScope" defaultValue="NATIONAL">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATIONAL">Nasional (semua DPC)</SelectItem>
                  <SelectItem value="PROVINCE">Provinsi (DPD)</SelectItem>
                  <SelectItem value="REGENCY">Kab/Kota (DPC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManualOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      {detailPoll && (
        <Dialog open={true} onOpenChange={() => setDetailPoll(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                {detailPoll.title}
              </DialogTitle>
              <DialogDescription>
                {detailPoll.totalResponses} respon • {detailPoll.sentimentStats?.POSITIVE || 0} positif • {detailPoll.sentimentStats?.NEGATIVE || 0} negatif • {detailPoll.sentimentStats?.UNPROCESSED || 0} belum diproses
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="p-3 rounded bg-purple-50 border border-purple-200">
                <Label className="text-xs font-semibold">Pertanyaan:</Label>
                <p className="text-sm mt-1">{detailPoll.question}</p>
              </div>
              {detailPoll.description && (
                <div className="text-xs text-muted-foreground italic">{detailPoll.description}</div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded border bg-emerald-50 p-2">
                  <div className="text-2xl font-bold text-emerald-700">{detailPoll.sentimentStats?.POSITIVE || 0}</div>
                  <div className="text-[10px]">Positif</div>
                </div>
                <div className="rounded border bg-slate-50 p-2">
                  <div className="text-2xl font-bold text-slate-700">{detailPoll.sentimentStats?.NEUTRAL || 0}</div>
                  <div className="text-[10px]">Netral</div>
                </div>
                <div className="rounded border bg-red-50 p-2">
                  <div className="text-2xl font-bold text-red-700">{detailPoll.sentimentStats?.NEGATIVE || 0}</div>
                  <div className="text-[10px]">Negatif</div>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Top Wilayah Responden:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(detailPoll.topLocations || []).map((loc: any) => (
                    <Badge key={loc.code} variant="outline" className="text-[10px]">{loc.code}: {loc.count}</Badge>
                  ))}
                  {(detailPoll.topLocations || []).length === 0 && <span className="text-xs text-muted-foreground">Belum ada responden</span>}
                </div>
              </div>
              {detailPoll.responses && detailPoll.responses.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">Respon Terbaru:</Label>
                  <div className="space-y-2 mt-2 max-h-[40vh] overflow-y-auto">
                    {detailPoll.responses.slice(0, 10).map((r: any) => (
                      <div key={r.id} className="rounded border p-2 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[9px] ${r.aiSentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : r.aiSentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                            {r.aiSentiment || 'BELUM'}
                          </Badge>
                          {r.occupation && <Badge variant="outline" className="text-[9px]">{r.occupation}</Badge>}
                          {r.ageGroup && <Badge variant="outline" className="text-[9px]">{r.ageGroup}</Badge>}
                          {r.regencyCode && <Badge variant="outline" className="text-[9px]">{r.regencyCode}</Badge>}
                          <span className="text-[10px] text-muted-foreground ml-auto">{r.wordCount} kata</span>
                        </div>
                        <p className="text-xs line-clamp-3">{r.answer}</p>
                        {r.aiSummary && <p className="text-[10px] text-purple-700 mt-1 italic">{r.aiSummary}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setDetailPoll(null)}>Tutup</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============================================================
// TAB 5: LINK ANALISIS PUBLIK
// ============================================================
function OpinionLinksTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ platform: '', sentiment: '', priority: '', status: '' })
  const [reviewOpen, setReviewOpen] = useState<any>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.platform) params.set('platform', filters.platform)
    if (filters.sentiment) params.set('sentiment', filters.sentiment)
    if (filters.priority) params.set('priority', filters.priority)
    if (filters.status) params.set('status', filters.status)
    api(`/api/opinion-links?${params.toString()}`).then(res => {
      setLinks(Array.isArray(res) ? res : (res?.data || []))
    }).catch(() => setLinks([])).finally(() => setLoading(false))
  }, [filters])

  useEffect(() => { loadData() }, [loadData])

  const handleReview = async (linkId: string, status: string, notes: string) => {
    try {
      const res = await fetch(`/api/opinion-links/${linkId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ status, reviewNotes: notes }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      addToast(`Link ditandai: ${status}`, 'success')
      setReviewOpen(null); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
  }

  if (loading) return <LoadingState />

  const platformIcon = (p: string) => {
    if (p === 'YOUTUBE') return <Youtube className="w-3.5 h-3.5 text-red-600" />
    if (p === 'GOOGLE') return <Newspaper className="w-3.5 h-3.5 text-blue-600" />
    return <Globe className="w-3.5 h-3.5" />
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={filters.platform || 'ALL'} onValueChange={(v) => setFilters({ ...filters, platform: v === 'ALL' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Semua Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Platform</SelectItem>
                <SelectItem value="YOUTUBE">YouTube</SelectItem>
                <SelectItem value="GOOGLE">Google News</SelectItem>
                <SelectItem value="FACEBOOK">Facebook</SelectItem>
                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                <SelectItem value="TIKTOK">TikTok</SelectItem>
                <SelectItem value="TWITTER_X">X (Twitter)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sentiment || 'ALL'} onValueChange={(v) => setFilters({ ...filters, sentiment: v === 'ALL' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Semua Sentimen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Sentimen</SelectItem>
                <SelectItem value="POSITIVE">Positif</SelectItem>
                <SelectItem value="NEUTRAL">Netral</SelectItem>
                <SelectItem value="NEGATIVE">Negatif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.priority || 'ALL'} onValueChange={(v) => setFilters({ ...filters, priority: v === 'ALL' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Semua Prioritas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Prioritas</SelectItem>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || 'ALL'} onValueChange={(v) => setFilters({ ...filters, status: v === 'ALL' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="NEW">Baru</SelectItem>
                <SelectItem value="REVIEWED">Sudah Direview</SelectItem>
                <SelectItem value="ADDRESSED">Sudah Ditangani</SelectItem>
                <SelectItem value="ARCHIVED">Arsip</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Link" value={links.length} icon={ExternalLink} color="blue" />
        <StatCard label="HIGH Priority" value={links.filter(l => l.priority === 'HIGH').length} icon={AlertTriangle} color="red" />
        <StatCard label="Negatif" value={links.filter(l => l.sentiment === 'NEGATIVE').length} icon={AlertTriangle} color="amber" />
        <StatCard label="Belum Direview" value={links.filter(l => l.status === 'NEW').length} icon={Eye} color="purple" />
      </div>

      {/* Links table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-orange-600" />
            Daftar Link Sudah Dianalisis ({links.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {links.length === 0 ? (
            <EmptyState icon={ExternalLink} title="Belum ada link"
              description="Jalankan Opinion Scanner di tab pertama untuk mengumpulkan link otomatis." />
          ) : (
            <div className="space-y-2">
              {links.map(link => {
                const priBadge = link.priority === 'HIGH' ? 'bg-red-100 text-red-800 border-red-300' :
                  link.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                return (
                  <div key={link.id} className="rounded border p-3 hover:bg-accent/30">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-[10px] ${priBadge}`}>{link.priority}</Badge>
                          <Badge variant="outline" className="text-[10px] gap-1">{platformIcon(link.platform)}{link.platform}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${link.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : link.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'}`}>{link.sentiment}</Badge>
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">{link.category}</Badge>
                          {link.regencyName && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{link.regencyName}</Badge>}
                          <Badge variant="outline" className={`text-[10px] ${link.status === 'NEW' ? 'bg-amber-50 text-amber-700' : link.status === 'ADDRESSED' ? 'bg-emerald-50 text-emerald-700' : ''}`}>{link.status}</Badge>
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600 hover:underline line-clamp-1">
                          {link.title}
                        </a>
                        {link.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{link.content}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>📅 {formatDateTimeID(link.publishedAt || link.createdAt)}</span>
                          {link.engagementCount > 0 && <span>💬 {link.engagementCount}</span>}
                          <span>⚡ {link.urgencyScore}/100</span>
                          {link.author && <span>✍️ {link.author}</span>}
                          {link.reviewedBy && <span>👁️ {link.reviewedBy.fullName}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-7 text-xs w-full"><ExternalLink className="w-3 h-3 mr-1" /> Buka</Button>
                        </a>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReviewOpen(link)}>
                          <Edit className="w-3 h-3 mr-1" /> Review
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review dialog */}
      {reviewOpen && (
        <ReviewDialog link={reviewOpen} onClose={() => setReviewOpen(null)} onSubmit={handleReview} />
      )}
    </div>
  )
}

function ReviewDialog({ link, onClose, onSubmit }: { link: any, onClose: () => void, onSubmit: (id: string, status: string, notes: string) => void }) {
  const [status, setStatus] = useState('REVIEWED')
  const [notes, setNotes] = useState('')
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Review Link Opini</DialogTitle>
          <DialogDescription className="line-clamp-2">{link.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">
            Buka link asli →
          </a>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="REVIEWED">Sudah Direview</SelectItem>
                <SelectItem value="ADDRESSED">Sudah Ditangani</SelectItem>
                <SelectItem value="ARCHIVED">Arsip</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Catatan Review</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="cth: Sudah diklarifikasi via broadcast WA, ditindaklanjuti DPC setempat..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => onSubmit(link.id, status, notes)} className="bg-orange-600 hover:bg-orange-700 text-white">
            Simpan Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// TAB 6: DECISION DASHBOARD
// ============================================================
function DecisionDashboardTab() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    api('/api/decision-dashboard').then(res => {
      setData(Array.isArray(res) ? res : (res?.data || res))
    }).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState />
  if (!data) return <ErrorState title="Gagal memuat dashboard" onRetry={loadData} />

  const sentimentPct = data.sentimentTrend.total > 0 ? {
    pos: Math.round((data.sentimentTrend.positive / data.sentimentTrend.total) * 100),
    neu: Math.round((data.sentimentTrend.neutral / data.sentimentTrend.total) * 100),
    neg: Math.round((data.sentimentTrend.negative / data.sentimentTrend.total) * 100),
  } : { pos: 0, neu: 0, neg: 0 }

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-lg shrink-0">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Executive Summary — Sintesis AI untuk Pengambil Keputusan</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.executiveSummary}</p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className={`text-3xl font-bold ${data.sentimentIndex >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {data.sentimentIndex > 0 ? '+' : ''}{data.sentimentIndex}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Sentiment Index (-100 s/d +100)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600">{data.stats.totalOpinionLinks}</div>
                  <div className="text-[10px] text-muted-foreground">Total Mention Dianalisis</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-600">{data.stats.needsAction}</div>
                  <div className="text-[10px] text-muted-foreground">Perlu Tindakan</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Distribution */}
      <Card>
        <CardHeader><CardTitle className="text-base">Distribusi Sentimen Publik</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-20 text-xs">Positif</div>
              <div className="flex-1 bg-slate-100 rounded h-6 overflow-hidden">
                <div className="bg-emerald-500 h-full flex items-center px-2 text-white text-xs"
                  style={{ width: `${sentimentPct.pos}%` }}>{sentimentPct.pos}% ({data.sentimentTrend.positive})</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 text-xs">Netral</div>
              <div className="flex-1 bg-slate-100 rounded h-6 overflow-hidden">
                <div className="bg-slate-500 h-full flex items-center px-2 text-white text-xs"
                  style={{ width: `${sentimentPct.neu}%` }}>{sentimentPct.neu}% ({data.sentimentTrend.neutral})</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 text-xs">Negatif</div>
              <div className="flex-1 bg-slate-100 rounded h-6 overflow-hidden">
                <div className="bg-red-500 h-full flex items-center px-2 text-white text-xs"
                  style={{ width: `${sentimentPct.neg}%` }}>{sentimentPct.neg}% ({data.sentimentTrend.negative})</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Wilayah Urgent */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-5 h-5 text-red-600" /> 5 Wilayah Paling Urgent</CardTitle></CardHeader>
        <CardContent>
          {data.topWilayahUrgent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada data wilayah. Jalankan Opinion Scanner.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wilayah</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center text-red-600">Negatif</TableHead>
                  <TableHead className="text-center text-red-600">HIGH</TableHead>
                  <TableHead className="text-center">Engagement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topWilayahUrgent.map((w: any, i: number) => (
                  <TableRow key={i} className={w.high > 0 ? 'bg-red-50/50' : ''}>
                    <TableCell className="font-semibold text-sm">{w.name}</TableCell>
                    <TableCell className="text-center">{w.total}</TableCell>
                    <TableCell className="text-center text-red-700 font-semibold">{w.negative}</TableCell>
                    <TableCell className="text-center text-red-700 font-bold">{w.high}</TableCell>
                    <TableCell className="text-center">{w.engagement}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="w-5 h-5 text-orange-600" /> Action Items untuk DPN/DPD/DPC</CardTitle></CardHeader>
        <CardContent>
          {data.actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada action items.</p>
          ) : (
            <div className="space-y-2">
              {data.actionItems.map((a: any, i: number) => (
                <div key={i} className="rounded border p-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`text-[10px] ${a.prioritas === 'TINGGI' ? 'bg-red-100 text-red-800' : a.prioritas === 'SEDANG' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                      {a.prioritas}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]"><MapPin className="w-2.5 h-2.5 mr-0.5" />{a.wilayah}</Badge>
                    <Badge variant="outline" className="text-[10px]"><Calendar className="w-2.5 h-2.5 mr-0.5" />{a.deadline}</Badge>
                  </div>
                  <p className="text-sm font-medium">{a.aksi}</p>
                  {a.alasan && (
                    <p className="text-[11px] text-muted-foreground mt-1 italic">Alasan: {a.alasan}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Kategori & Platform */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Kategori Isu</CardTitle></CardHeader>
          <CardContent>
            {data.topKategori.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada data.</p> : (
              <div className="space-y-2">
                {data.topKategori.map((k: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">{k.category}</Badge>
                    <span className="text-sm font-semibold">{k.count} mention</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Platform (Engagement)</CardTitle></CardHeader>
          <CardContent>
            {data.topPlatform.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada data.</p> : (
              <div className="space-y-2">
                {data.topPlatform.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{p.platform}</Badge>
                    <span className="text-sm font-semibold">{p.engagement} engagement</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Essay Polls */}
      {data.activePolls.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-5 h-5 text-purple-600" /> Essay Polls Aktif</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.activePolls.map((p: any) => (
                <div key={p.id} className="rounded border p-2">
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.totalResponses} respon • {p.positiveResponses} positif • {p.negativeResponses} negatif
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
