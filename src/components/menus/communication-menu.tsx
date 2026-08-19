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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  ChevronRight, Home, Activity, BarChart3, PieChart as PieIcon, Award,
  Share2, Copy, MessageCircle, Mail, Linkedin, Shield, Folder, Hash, MessageSquare,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, PieChart, Pie, Legend, PolarAngleAxis,
} from 'recharts'
import {
  SHARE_PLATFORMS, POPULAR_GROUPS, buildShareText, openShareUrl, copyToClipboard,
  type SharePlatform, type PopularGroup,
} from '@/lib/share-social'

// ============================================================
// MAIN: Komunikasi & Command Center — 6 Sub-menu Baru
// ============================================================
export function CommunicationMenu() {
  const [tab, setTab] = useState('opinion-scanner')

  // === PRE-WARM: Fire all 7 tab APIs in background when menu mounts ===
  // Results cached server-side (30-60s) so subsequent tab clicks are instant.
  // We don't await — just trigger requests, results populate server cache.
  useEffect(() => {
    const userId = useAuthStore.getState().user?.id || ''
    if (!userId) return

    const headers = { 'x-user-id': userId }
    const endpoints = [
      '/api/opinion-links?limit=100',
      '/api/broadcast-composer?type=templates',
      '/api/broadcast-composer?type=broadcasts',
      '/api/broadcast-composer?type=contacts_count',
      '/api/essay-polls',
      '/api/decision-dashboard',
    ]

    // Fire all requests in parallel — results go to server cache, not UI state
    endpoints.forEach(url => {
      fetch(url, { headers }).catch(() => {})
    })
  }, [])

  const tabs = [
    { key: 'broadcast', label: 'Siaran & Broadcast', icon: Send, desc: 'Multi-channel: WA, FB, IG, Email + konter isu + template siap pakai' },
    { key: 'essay-polls', label: 'Survei & Polling', icon: Brain, desc: 'Survei cepat + input manual lapangan + WhatsApp + analisis' },
    { key: 'decision', label: 'Dashboard Pemenangan', icon: Target, desc: 'Sintesis data untuk pengambil keputusan politik' },
    { key: 'opinion-scanner', label: 'Monitoring Berita', icon: Sparkles, desc: 'Scan berita LAPRA 08 + triage + konter isu otomatis' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Komunikasi & Command Center"
        description="Sistem siaran, survei, dan monitoring berita LAPRA 08. Fokus pemenangan pemilu."
        icon={Megaphone}
      />

      {/* Tab navigation — 4 menu fokus elektoral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex flex-col items-start gap-1 p-3 rounded-lg text-left transition-all ${tab === t.key ? 'bg-gradient-to-br from-orange-600 to-red-600 text-white shadow-md' : 'border hover:bg-accent'}`}>
            <t.icon className={`w-4 h-4 ${tab === t.key ? 'text-white' : 'text-orange-600'}`} />
            <span className="text-xs font-semibold leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'broadcast' && <BroadcastComposerTab />}
      {tab === 'essay-polls' && <EssayPollsTab onSwitchTab={setTab} />}
      {tab === 'decision' && <DecisionDashboardTab />}
      {tab === 'opinion-scanner' && <OpinionScannerTab />}
    </div>
  )
}

// ============================================================
// TAB: MONITORING BERITA (gabungan Scanner + Link Analisis + Triage + Konter Isu)
// Dipindahkan dari Opini Publik Auto-Scanner + Link Analisis Publik
// ============================================================
function OpinionScannerTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [recentLinks, setRecentLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [generatingKonter, setGeneratingKonter] = useState<string | null>(null)
  const [generatingSurvey, setGeneratingSurvey] = useState<string | null>(null)
  const [batchSurveyRunning, setBatchSurveyRunning] = useState(false)
  const [batchPreview, setBatchPreview] = useState<any>(null)
  const [triageLoading, setTriageLoading] = useState(false)

  // === PILAR 1: Handle Auto-draft Survei dari opinion link (single) ===
  const handleAutoSurvey = async (linkId: string) => {
    setGeneratingSurvey(linkId)
    try {
      const res = await api(`/api/opinion-links/${linkId}/auto-survey`, {
        method: 'POST',
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Draft survei dibuat', 'success')
        loadRecent()
      } else {
        addToast(res?.error || 'Gagal generate survei', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setGeneratingSurvey(null)
    }
  }

  // === PILAR 1: Handle Batch Auto-survey (cron trigger manual) ===
  const handleBatchAutoSurvey = async () => {
    if (!confirm('Jalankan batch auto-survey? Sistem akan mencari semua opinion link NEGATIVE+HIGH dan generate draft survei (max 10 per run).')) return
    setBatchSurveyRunning(true)
    try {
      const res = await api('/api/opinion-links/auto-survey-batch', {
        method: 'POST',
        keepWrapper: true,
      })
      if (res?.success) {
        const stats = res.stats
        addToast(
          `Batch selesai: ${stats.generated} draft baru, ${stats.deduped} dedup, ${stats.errors} error`,
          stats.generated > 0 ? 'success' : 'info'
        )
        setBatchPreview(null) // force re-fetch on next preview
      } else {
        addToast(res?.error || 'Gagal run batch', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setBatchSurveyRunning(false)
    }
  }

  // === PILAR 1: Preview kandidat batch (tanpa generate) ===
  const handlePreviewBatch = async () => {
    try {
      const res = await api('/api/opinion-links/auto-survey-batch', { keepWrapper: true })
      if (res?.success) {
        setBatchPreview(res)
        addToast(res.message || `${res.data?.length || 0} kandidat ditemukan`, 'info')
      } else {
        addToast(res?.error || 'Gagal preview', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Handle Generate Konter Isu (dari OpinionLinksTab) ===
  const handleGenerateKonter = async (linkId: string) => {
    setGeneratingKonter(linkId)
    try {
      const res = await fetch(`/api/opinion-links/${linkId}/counter-issue`, {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      addToast(`Draft konter isu dibuat (${data.data.aiProvider}). Lihat di Siaran & Broadcast.`, 'success')
      loadRecent()
    } catch (e: any) {
      addToast(`Gagal generate konter: ${e.message}`, 'error')
    } finally {
      setGeneratingKonter(null)
    }
  }

  // === Handle Bulk Triage (dari OpinionLinksTab) ===
  const handleBulkTriage = async () => {
    setTriageLoading(true)
    try {
      const res = await fetch('/api/opinion-links/bulk-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ limit: 100 })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const stats = data.data
      const topProvinsiStr = stats.topProvinsiList?.map((p: any) => `${p.provinsi}(${p.count})`).join(', ') || 'tidak ada'
      addToast(`Triage: ${stats.mapped}/${stats.total} link di-map. Top: ${topProvinsiStr}`, 'success')
      loadRecent()
    } catch (e: any) {
      addToast(`Gagal bulk triage: ${e.message}`, 'error')
    } finally {
      setTriageLoading(false)
    }
  }

  // === FIX: cache-bust dengan timestamp + limit 50 (dari 15) ===
  const loadRecent = useCallback(() => {
    setLoading(true)
    const _t = Date.now() // cache-bust: bypass 30s cache di API
    api(`/api/opinion-links?limit=100&_t=${_t}`).then(res => {
      const data = Array.isArray(res) ? res : (res?.data || [])
      setRecentLinks(data)
    }).catch(() => setRecentLinks([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadRecent() }, [loadRecent])

  // === NEW: Handle delete link ===
  const handleDelete = async (linkId: string) => {
    setDeletingId(linkId)
    try {
      const res = await fetch(`/api/opinion-links/${linkId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      addToast('Link dihapus dari hasil scan', 'success')
      // Remove dari state langsung (instant, tanpa reload)
      setRecentLinks(prev => prev.filter(l => l.id !== linkId))
    } catch (e: any) {
      addToast(`Gagal hapus: ${e.message}`, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  // === NEW: Handle bulk delete semua yang tampil ===
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const handleBulkDelete = async () => {
    setBulkDeleteOpen(false)
    const toDelete = filteredLinks
    addToast(`Menghapus ${toDelete.length} link...`, 'info')
    let success = 0, failed = 0
    for (const link of toDelete) {
      try {
        const res = await fetch(`/api/opinion-links/${link.id}`, {
          method: 'DELETE',
          headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
        })
        if (res.ok) success++
        else failed++
      } catch { failed++ }
    }
    addToast(`Selesai: ${success} dihapus, ${failed} gagal`, 'success')
    loadRecent()
  }

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

  // === SORT: tanggal terbaru di atas (bukan by priority) ===
  const filteredLinks = recentLinks
    .filter(l => filterPriority === 'ALL' || l.priority === filterPriority)
    .sort((a, b) => {
      // publishedAt descending (terbaru di atas)
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(a.createdAt || 0).getTime()
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    })

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
                Hasil disimpan ke database untuk tracking &amp; decision dashboard.
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

      {/* Filter + Bulk Triage + Bulk Delete */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">Filter:</span>
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
          <Button key={p} size="sm" variant={filterPriority === p ? 'default' : 'outline'}
            className={`h-7 text-xs ${filterPriority === p ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
            onClick={() => setFilterPriority(p)}>
            {p === 'ALL' ? 'Semua' : p}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filteredLinks.length} berita</span>
          {/* === PILAR 1: Auto-Survey Batch Button === */}
          <Button size="sm" variant="outline" className="h-7 text-xs text-purple-700 hover:bg-purple-50 border-purple-200"
            disabled={batchSurveyRunning}
            onClick={handleBatchAutoSurvey}
            title="Generate draft survei otomatis dari semua berita NEGATIVE+HIGH">
            {batchSurveyRunning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {batchSurveyRunning ? 'Memproses...' : 'Auto-Survey Batch'}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs"
            onClick={handlePreviewBatch}
            title="Preview kandidat auto-survey tanpa generate">
            <Eye className="w-3 h-3 mr-1" /> Preview
          </Button>
          {/* === Bulk Triage Button === */}
          <Button size="sm" variant="outline" className="h-7 text-xs text-amber-700 hover:bg-amber-50 border-amber-200"
            disabled={triageLoading}
            onClick={handleBulkTriage}>
            {triageLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MapPin className="w-3 h-3 mr-1" />}
            {triageLoading ? 'Triage...' : 'Bulk Triage'}
          </Button>
          {/* === Bulk Delete Button === */}
          {filteredLinks.length > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:bg-red-50 border-red-200"
              onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-3 h-3 mr-1" /> Hapus Semua ({filteredLinks.length})
            </Button>
          )}
        </div>
      </div>

      {/* === PILAR 1: Batch Preview Panel === */}
      {batchPreview && batchPreview.success && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Preview Auto-Survey Batch
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setBatchPreview(null)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {batchPreview.stats.total} kandidat ditemukan ({batchPreview.stats.readyToGenerate} siap generate, {batchPreview.stats.deduped} sudah punya draft dalam 7 hari)
            </div>
            {batchPreview.data && batchPreview.data.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {batchPreview.data.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs p-2 rounded border bg-white">
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700">{item.sentiment}</Badge>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">{item.priority}</Badge>
                    {item.alreadyHasDraft && (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600">DRAFT ADA</Badge>
                    )}
                    <span className="flex-1 truncate font-medium">{item.title}</span>
                    {item.provinceName && <span className="text-muted-foreground">{item.provinceName}</span>}
                    <span className="text-muted-foreground">urgency: {item.urgencyScore?.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic">Tidak ada kandidat saat ini.</div>
            )}
            <div className="text-xs text-purple-700 bg-purple-100/50 p-2 rounded">
              💡 Klik <strong>"Auto-Survey Batch"</strong> untuk generate draft survei otomatis. Setiap draft berstatus <strong>DRAFT</strong> dan perlu aktivasi manual di menu Survei & Polling.
            </div>
          </CardContent>
        </Card>
      )}

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
                      <Badge className={`text-[13px] ${priBadge}`}>{link.priority}</Badge>
                      <Badge variant="outline" className="text-[13px] gap-1">{platformIcon(link.platform)} {link.platform}</Badge>
                      <Badge variant="outline" className={`text-[13px] ${link.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : link.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'}`}>
                        {link.sentiment}
                      </Badge>
                      <Badge variant="outline" className="text-[13px] bg-purple-50 text-purple-700">{link.category}</Badge>
                      {link.provinceName && <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{link.regencyName || link.provinceName}</Badge>}
                      <Badge variant="outline" className="text-[13px] bg-emerald-50 text-emerald-700 border-emerald-200">
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
                    <div className="flex items-center gap-3 mt-2 text-[13px] text-muted-foreground">
                      <span>📅 {formatDateTimeID(link.publishedAt || link.createdAt)}</span>
                      {link.engagementCount > 0 && <span>💬 {link.engagementCount}</span>}
                      <span>⚡ {link.urgencyScore}/100</span>
                      {link.author && <span>✍️ {link.author}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                    {/* === Konter Isu Button (untuk NEGATIVE/HIGH) === */}
                    {(link.sentiment === 'NEGATIVE' || link.priority === 'HIGH') && link.status !== 'ADDRESSED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        disabled={generatingKonter === link.id}
                        onClick={() => handleGenerateKonter(link.id)}
                        title="Generate draft konter isu">
                        {generatingKonter === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    {/* === PILAR 1: Auto-draft Survei Button (untuk NEGATIVE+HIGH) === */}
                    {link.sentiment === 'NEGATIVE' && link.priority === 'HIGH' && link.status !== 'ADDRESSED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50"
                        disabled={generatingSurvey === link.id}
                        onClick={() => handleAutoSurvey(link.id)}
                        title="Generate draft survei dari isu ini (PILAR 1: AI Early Warning)">
                        {generatingSurvey === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                      </Button>
                    )}
                    {/* === Hapus per item === */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      disabled={deletingId === link.id}
                      onClick={() => handleDelete(link.id)}
                      title="Hapus link ini">
                      {deletingId === link.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* === NEW: Konfirmasi Bulk Delete === */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {filteredLinks.length} Link?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong>{filteredLinks.length} link</strong> dari hasil scan?
              Tindakan ini tidak dapat dibatalkan. Link yang dihapus akan hilang dari Dashboard & Geospatial Mapping.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="w-4 h-4 mr-2" /> Hapus {filteredLinks.length} Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
// ============================================================
// TAB 3: BROADCAST COMPOSER — Dynamic Target + Anti-Banned Queue + Variable Personalization
// ============================================================
function BroadcastComposerTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [templates, setTemplates] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [contactsStats, setContactsStats] = useState({ total: 0, optIn: 0 })
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [broadcastStatsOpen, setBroadcastStatsOpen] = useState<any>(null)
  const [gatewayOpen, setGatewayOpen] = useState(false)

  // Composer form
  const [form, setForm] = useState({
    title: '', content: '', channels: ['WHATSAPP'],
    scheduleAt: '', imageUrl: '', attachedEssayPollId: '',
    // Target config (dynamic contact resolution)
    targetScope: 'ALL' as 'ALL' | 'NATIONAL' | 'PROVINCE' | 'REGENCY',
    targetTerritoryCode: '',
    targetOccupation: '',
    targetAgeGroup: '',
    onlyLapraMembers: false,
  })

  // Target resolution state (preview contacts)
  const [targetPreview, setTargetPreview] = useState<any>(null)
  const [resolvingTargets, setResolvingTargets] = useState(false)
  const [sending, setSending] = useState(false)

  // Territories for dropdown
  const [territories, setTerritories] = useState<any[]>([])

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

  // Load territories when target scope changes
  useEffect(() => {
    if (form.targetScope === 'PROVINCE' || form.targetScope === 'REGENCY') {
      api(`/api/broadcast-composer/targets?level=${form.targetScope}`).then(res => {
        setTerritories(Array.isArray(res) ? res : (res?.data || []))
      }).catch(() => setTerritories([]))
    } else {
      setTerritories([])
    }
  }, [form.targetScope])

  useEffect(() => { loadData() }, [loadData])

  // Preview target contacts (resolve dari DB)
  const handlePreviewTargets = async () => {
    setResolvingTargets(true)
    setTargetPreview(null)
    try {
      const res = await fetch('/api/broadcast-composer/targets', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          scope: form.targetScope,
          territoryCode: form.targetTerritoryCode || null,
          occupation: form.targetOccupation && form.targetOccupation !== 'ALL' ? form.targetOccupation : null,
          ageGroup: form.targetAgeGroup && form.targetAgeGroup !== 'ALL' ? form.targetAgeGroup : null,
          onlyLapraMembers: form.onlyLapraMembers,
          onlyOptIn: true,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setTargetPreview(data.data)
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setResolvingTargets(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate target
    if ((form.targetScope === 'PROVINCE' || form.targetScope === 'REGENCY') && !form.targetTerritoryCode) {
      addToast('Pilih wilayah target (provinsi/kab-kota) dulu', 'error')
      return
    }

    setSending(true)
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
          target: {
            scope: form.targetScope,
            territoryCode: form.targetTerritoryCode || null,
            occupation: form.targetOccupation && form.targetOccupation !== 'ALL' ? form.targetOccupation : null,
            ageGroup: form.targetAgeGroup && form.targetAgeGroup !== 'ALL' ? form.targetAgeGroup : null,
            onlyLapraMembers: form.onlyLapraMembers,
            onlyOptIn: true,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast(data.message, 'success')
      // Reset form
      setForm({
        title: '', content: '', channels: ['WHATSAPP'],
        scheduleAt: '', imageUrl: '', attachedEssayPollId: '',
        targetScope: 'ALL', targetTerritoryCode: '', targetOccupation: '', targetAgeGroup: '', onlyLapraMembers: false,
      })
      setTargetPreview(null)
      setComposerOpen(false); loadData()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setSending(false) }
  }

  // Quick insert variable helper
  const insertVariable = (varName: string) => {
    setForm({ ...form, content: form.content + `{${varName}}` })
  }

  const channels = [
    { id: 'WHATSAPP', label: 'WhatsApp', icon: Send, color: 'emerald', desc: 'Anti-banned queue + dynamic contacts' },
    { id: 'FACEBOOK', label: 'Facebook', icon: Facebook, color: 'blue', desc: 'Posting ke FB Page' },
    { id: 'INSTAGRAM', label: 'Instagram', icon: Instagram, color: 'purple', desc: 'Posting ke IG Business' },
    { id: 'EMAIL', label: 'Email', icon: FileText, color: 'slate', desc: 'Kirim email massal' },
  ]

  const scopeOptions = [
    { value: 'ALL', label: 'Semua Indonesia (Nasional / DPN)' },
    { value: 'PROVINCE', label: 'Per Provinsi (DPD)' },
    { value: 'REGENCY', label: 'Per Kabupaten/Kota (DPC)' },
  ]

  const occupationOptions = ['ALL', 'PETANI', 'NELAYAN', 'UMKM', 'PELAJAR', 'GURU', 'BURUH', 'LAINNYA']
  const ageGroupOptions = ['ALL', '17-21', '22-30', '31-40', '41-60', '61+']

  if (loading) return <LoadingState />

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
          <p className="text-sm text-muted-foreground">Dynamic target DB + anti-banned message queue + variabel otomatis {`{nama}`} {`{wilayah}`} {`{tanggal}`}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTemplateOpen(true)}><FileText className="w-4 h-4 mr-1" /> Template</Button>
          <Button variant="outline" onClick={() => setGatewayOpen(true)} className="bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
            <Shield className="w-4 h-4 mr-1" /> WA Gateway
          </Button>
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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-sm">{b.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[13px]">{b.channel}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{b.recipientCount}</TableCell>
                    <TableCell>
                      <Badge className={`text-[13px] ${b.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : b.status === 'QUEUED' ? 'bg-amber-100 text-amber-800' : b.status === 'PARTIAL' ? 'bg-orange-100 text-orange-800' : b.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTimeID(b.createdAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBroadcastStatsOpen(b)}>
                        <Eye className="w-3 h-3 mr-1" /> Stats
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Composer dialog — NEW with dynamic target + preview + variable personalization */}
      <Dialog open={composerOpen} onOpenChange={(o) => { setComposerOpen(o); if (!o) setTargetPreview(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="w-5 h-5 text-orange-600" /> Buat Broadcast Baru</DialogTitle>
            <DialogDescription>
              Pilih channel, target wilayah (DPN/DPD/DPC), isi pesan dengan variabel otomatis. Sistem akan resolve kontak dari DB &amp; jadwalkan pengiriman anti-banned.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSend} className="space-y-3">
            {/* Title */}
            <div className="space-y-2">
              <Label>Judul Broadcast *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="cth: Pengumuman Rapat DPD 15 Agustus 2026" required />
            </div>

            {/* Channel selector */}
            <div className="space-y-2">
              <Label>Pilih Channel (bisa lebih dari satu) *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {channels.map(ch => {
                  const active = form.channels.includes(ch.id)
                  return (
                    <button key={ch.id} type="button"
                      onClick={() => setForm({ ...form, channels: active ? form.channels.filter((c: string) => c !== ch.id) : [...form.channels, ch.id] })}
                      className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all ${active ? 'bg-orange-600 text-white border-orange-600' : 'border hover:bg-accent'}`}>
                      <div className="flex items-center gap-2">
                        <ch.icon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{ch.label}</span>
                      </div>
                      <span className={`text-[13px] ${active ? 'text-orange-100' : 'text-muted-foreground'}`}>{ch.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* === TARGET WILAYAH (Dynamic Database Contact Resolution) === */}
            {form.channels.includes('WHATSAPP') && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700" />
                  <Label className="text-sm font-semibold text-emerald-800">Target Audiens (Dynamic Database Resolution)</Label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Scope Wilayah *</Label>
                    <Select value={form.targetScope} onValueChange={(v) => setForm({ ...form, targetScope: v as any, targetTerritoryCode: '' })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {scopeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {(form.targetScope === 'PROVINCE' || form.targetScope === 'REGENCY') && (
                    <div className="space-y-1">
                      <Label className="text-xs">{form.targetScope === 'PROVINCE' ? 'Provinsi (DPD)' : 'Kabupaten/Kota (DPC)'} *</Label>
                      <Select value={form.targetTerritoryCode} onValueChange={(v) => setForm({ ...form, targetTerritoryCode: v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
                        <SelectContent>
                          {territories.map(t => <SelectItem key={t.code} value={t.code}>{t.name} ({t.contactCount} kontak)</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Profesi (opsional)</Label>
                    <Select value={form.targetOccupation} onValueChange={(v) => setForm({ ...form, targetOccupation: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Semua" /></SelectTrigger>
                      <SelectContent>
                        {occupationOptions.map(o => <SelectItem key={o} value={o}>{o === 'ALL' ? 'Semua Profesi' : o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Kelompok Usia (opsional)</Label>
                    <Select value={form.targetAgeGroup} onValueChange={(v) => setForm({ ...form, targetAgeGroup: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Semua" /></SelectTrigger>
                      <SelectContent>
                        {ageGroupOptions.map(a => <SelectItem key={a} value={a}>{a === 'ALL' ? 'Semua Usia' : a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Filter Khusus</Label>
                    <label className="flex items-center gap-2 h-9 cursor-pointer">
                      <input type="checkbox" checked={form.onlyLapraMembers} onChange={(e) => setForm({ ...form, onlyLapraMembers: e.target.checked })}
                        className="w-4 h-4 rounded" />
                      <span className="text-xs">Pengurus LAPRA 08 saja</span>
                    </label>
                  </div>
                </div>

                <Button type="button" variant="outline" size="sm" onClick={handlePreviewTargets} disabled={resolvingTargets}>
                  {resolvingTargets ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Search className="w-3 h-3 mr-1" />}
                  {resolvingTargets ? 'Mengambil kontak...' : 'Preview Target Kontak'}
                </Button>

                {/* Target preview results */}
                {targetPreview && (
                  <div className="rounded-lg bg-white border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-emerald-700">{targetPreview.filterDescription}</div>
                      <Badge className="bg-emerald-100 text-emerald-800">{targetPreview.totalOptIn} WA opt-in</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded bg-emerald-50 p-1.5">
                        <div className="font-bold text-emerald-700">{targetPreview.totalFound}</div>
                        <div className="text-[13px]">Total Found</div>
                      </div>
                      <div className="rounded bg-emerald-50 p-1.5">
                        <div className="font-bold text-emerald-700">{targetPreview.totalOptIn}</div>
                        <div className="text-[13px]">WA Opt-in</div>
                      </div>
                      <div className="rounded bg-amber-50 p-1.5">
                        <div className="font-bold text-amber-700">{targetPreview.totalSkipped}</div>
                        <div className="text-[13px]">Skipped</div>
                      </div>
                    </div>
                    {targetPreview.sampleContacts && targetPreview.sampleContacts.length > 0 && (
                      <div>
                        <div className="text-[13px] font-semibold text-muted-foreground mb-1">Sample kontak (5 dari {targetPreview.totalOptIn}):</div>
                        <div className="space-y-1">
                          {targetPreview.sampleContacts.map((c: any, i: number) => (
                            <div key={i} className="text-[13px] flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                              <div>
                                <span className="font-semibold">{c.name}</span>
                                <span className="text-muted-foreground ml-2">{c.phone}</span>
                              </div>
                              <div className="text-[13px]">
                                {c.territoryName} • {c.occupation || '-'} • {c.ageGroup || '-'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message content with variable buttons */}
            <div className="space-y-2">
              <Label>Isi Pesan * <span className="text-sm text-muted-foreground">(klik variabel untuk sisipkan otomatis)</span></Label>
              <div className="flex flex-wrap gap-1 mb-1">
                {['nama', 'wilayah', 'tanggal', 'waktu', 'profesi', 'gender'].map(v => (
                  <Button key={v} type="button" size="sm" variant="outline" className="h-6 text-[13px]"
                    onClick={() => insertVariable(v)}>
                    {`{${v}}`}
                  </Button>
                ))}
              </div>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Assalamualaikum {nama}, kami dari LAPRA 08 {wilayah} mengundang Bapak/Ibu untuk hadir rapat pada {tanggal}..." rows={5} required />
              <div className="text-sm text-muted-foreground">{form.content.length} karakter • Variabel akan otomatis di-resolve per kontak</div>
            </div>

            {/* Schedule + image */}
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

            {/* Estimate */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800 flex items-start gap-2">
              <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <strong>Estimasi pengiriman:</strong>{' '}
                {targetPreview ? (
                  <>
                    {targetPreview.totalOptIn} kontak WA opt-in akan menerima pesan personalisasi ({`{nama}`} & {`{wilayah}`} otomatis di-resolve).
                    Anti-banned: ~2-8 detik random delay per pesan, batch 20 pesan/jeda 1 menit.
                    {!targetPreview.totalOptIn && ' ⚠️ Tidak ada kontak opt-in — jalankan resolve target dulu.'}
                  </>
                ) : (
                  <>
                    {contactsStats.optIn} kontak WA opt-in tersedia. Klik "Preview Target Kontak" untuk lihat kontak yang akan menerima pesan berdasarkan filter di atas.
                  </>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setComposerOpen(false); setTargetPreview(null) }}>Batal</Button>
              <Button type="submit" disabled={sending || (targetPreview?.totalOptIn === 0)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                {sending ? 'Memproses & queue...' : form.scheduleAt ? 'Jadwalkan Broadcast' : 'Kirim Broadcast (Anti-Banned Queue)'}
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

      {/* Broadcast stats dialog */}
      {broadcastStatsOpen && (
        <BroadcastStatsDialog broadcast={broadcastStatsOpen} onClose={() => setBroadcastStatsOpen(null)} />
      )}

      {/* WhatsApp Gateway Providers dialog */}
      <GatewayProvidersDialog open={gatewayOpen} onOpenChange={setGatewayOpen} />
    </div>
  )
}

// === BROADCAST STATS DIALOG (queue progress + anti-banned tracking) ===
function BroadcastStatsDialog({ broadcast, onClose }: { broadcast: any; onClose: () => void }) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/broadcast-composer/${broadcast.id}/stats`, {
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch (e) { /* ignore */ }
    finally { setLoading(false) }
  }, [broadcast.id])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 15000) // 15s (was 5s — too aggressive for Vercel serverless)
    return () => clearInterval(interval)
  }, [loadData])

  const handleProcessQueue = async () => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/broadcast-composer/${broadcast.id}/queue`, {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (data.success) {
        useToastStore.getState().addToast(data.message, 'success')
        loadData()
      }
    } catch (e: any) { useToastStore.getState().addToast(e.message, 'error') }
    finally { setProcessing(false) }
  }

  if (loading) return <LoadingState />

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-orange-600" /> Broadcast Stats: {broadcast.title}</DialogTitle>
          <DialogDescription>Progress pengiriman + anti-banned queue tracking</DialogDescription>
        </DialogHeader>

        {stats && (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="rounded-lg bg-slate-50 border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Progress Pengiriman</span>
                <span className="text-2xl font-bold text-orange-600">{stats.stats.progress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 h-full transition-all" style={{ width: `${stats.stats.progress}%` }} />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
                <div className="rounded bg-amber-50 p-1.5"><div className="font-bold text-amber-700">{stats.stats.queued}</div><div className="text-[13px]">Antrian</div></div>
                <div className="rounded bg-emerald-50 p-1.5"><div className="font-bold text-emerald-700">{stats.stats.sent}</div><div className="text-[13px]">Terkirim</div></div>
                <div className="rounded bg-red-50 p-1.5"><div className="font-bold text-red-700">{stats.stats.failed}</div><div className="text-[13px]">Gagal</div></div>
                <div className="rounded bg-slate-100 p-1.5"><div className="font-bold text-slate-700">{stats.stats.blocked}</div><div className="text-[13px]">Blocked</div></div>
              </div>
              <div className="text-[13px] text-muted-foreground mt-2 text-center">
                Total: {stats.stats.total} • Success rate: {stats.stats.successRate}%
              </div>
            </div>

            {/* Process queue button */}
            {stats.stats.queued > 0 && (
              <Button onClick={handleProcessQueue} disabled={processing} className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white">
                {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Zap className="w-4 h-4 mr-1" />}
                {processing ? 'Memproses batch...' : `Proses Antrian (${stats.stats.queued} pesan menunggu)`}
              </Button>
            )}

            {/* Sample sent messages (personalized) */}
            {stats.sentMessages && stats.sentMessages.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Sample Pesan Terkirim (Personalisasi Aktif)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {stats.sentMessages.map((m: any, i: number) => (
                      <div key={i} className="rounded border p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{m.recipientName}</span>
                          <span className="text-[13px] text-muted-foreground">{m.recipientTerritory}</span>
                        </div>
                        <p className="text-[13px] text-muted-foreground line-clamp-2">{m.personalizedContent}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Failed messages */}
            {stats.failedMessages && stats.failedMessages.length > 0 && (
              <Card className="border-red-200">
                <CardHeader><CardTitle className="text-sm text-red-700">Pesan Gagal/Blocked ({stats.failedMessages.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {stats.failedMessages.map((m: any, i: number) => (
                      <div key={i} className="rounded border border-red-200 p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{m.recipientName}</span>
                          <Badge variant="outline" className={`text-[13px] ${m.status === 'BLOCKED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{m.status}</Badge>
                        </div>
                        <div className="text-[13px] text-red-700">{m.errorCode}: {m.errorMessage}</div>
                        <div className="text-[13px] text-muted-foreground mt-1">Retry: {m.retryCount}/3</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter><Button variant="outline" onClick={onClose}>Tutup</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// SURVEY OUTPUT DASHBOARD — Bagian 3: Konsolidasi Hasil 3 Dimensi
// ============================================================
// FASE 3.4: Pakai API /api/essay-polls/analytics untuk agregasi data
// - Sentimen stats dari DB aggregate (bukan dari polls[].responses yang capped)
// - Word Cloud dari aiKeywords sample 100 terbaru
// - Demografi Lapangan dari filter ipAddress LIKE 'FIELD:%'
// - Heatmap dari topLocations (groupBy regencyCode)
// - Aspirasi Top dari aiCategory aggregate
function SurveyOutputDashboard({ polls }: { polls: any[] }) {
  const [outputTab, setOutputTab] = useState<'medsos' | 'online' | 'lapangan'>('medsos')
  const [analytics, setAnalytics] = useState<any>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)

  // Fallback stat dari polls (jika analytics belum load)
  const totalResponses = polls.reduce((sum, p) => sum + (p._count?.responses || 0), 0)
  const activePolls = polls.filter(p => p.status === 'ACTIVE').length
  const aiGenerated = polls.filter(p => p.isAiGenerated).length

  // Load analytics (scope sesuai tab aktif)
  const loadAnalytics = useCallback(async () => {
    try {
      const scope = outputTab === 'medsos' ? 'all' : outputTab === 'online' ? 'online' : 'lapangan'
      const res = await api(`/api/essay-polls/analytics?scope=${scope}`, { keepWrapper: true })
      if (res?.success) {
        setAnalytics(res.data)
      }
    } catch (e) {
      console.error('[Analytics] load error:', e)
    } finally {
      setLoadingAnalytics(false)
    }
  }, [outputTab])

  useEffect(() => {
    setLoadingAnalytics(true)
    loadAnalytics()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAnalytics()
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [loadAnalytics])

  const sentimentStats = analytics?.sentimentStats || { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0, UNPROCESSED: 0 }
  const totalSentiment = (sentimentStats.POSITIVE || 0) + (sentimentStats.NEUTRAL || 0) + (sentimentStats.NEGATIVE || 0) || 1
  const wordCloud = analytics?.wordCloud || []
  const demography = analytics?.demography || { ageGroups: {}, genders: {}, occupations: {} }
  const topLocations = analytics?.topLocations || []
  const channelSplit = analytics?.channelSplit || { online: 0, field: 0 }
  const aspirasiTop = analytics?.aspirasiTop || []
  const pollsList = analytics?.polls || []
  const totalResponsesFromAnalytics = analytics?.totalResponses || 0

  const subTabs = [
    { key: 'medsos' as const, label: '🌐 Hasil Percakapan Medsos', icon: Globe },
    { key: 'online' as const, label: '📱 Hasil Online Broadcast', icon: Send },
    { key: 'lapangan' as const, label: '📍 Hasil Teritorial Lapangan', icon: MapPin },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
        <h3 className="text-sm font-bold">📊 Dashboard Konsolidasi Hasil 3 Dimensi</h3>
        {loadingAnalytics && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        {!loadingAnalytics && analytics && (
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">
            {totalResponsesFromAnalytics} respon teragregasi
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setOutputTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all ${outputTab === t.key ? 'bg-emerald-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: Medsos */}
      {outputTab === 'medsos' && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Tren Sentimen Medsos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {totalSentiment > 1 ? (
                <>
                  {[
                    { l: 'Positif', v: sentimentStats.POSITIVE || 0, bg: 'bg-emerald-500', text: 'text-emerald-600' },
                    { l: 'Netral', v: sentimentStats.NEUTRAL || 0, bg: 'bg-amber-500', text: 'text-amber-600' },
                    { l: 'Negatif', v: sentimentStats.NEGATIVE || 0, bg: 'bg-red-500', text: 'text-red-600' },
                  ].map(s => (
                    <div key={s.l} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={s.text}>{s.l}</span>
                        <span className="font-bold">{s.v} ({Math.round(s.v / totalSentiment * 100)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${s.bg} rounded-full transition-all`} style={{ width: `${s.v / totalSentiment * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  {sentimentStats.UNPROCESSED > 0 && (
                    <div className="text-[10px] text-muted-foreground text-center pt-1">
                      + {sentimentStats.UNPROCESSED} respon belum diproses AI
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {loadingAnalytics ? 'Memuat data sentimen...' : 'Belum ada data sentimen dari medsos'}
                </p>
              )}
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-purple-600" /> Feed Percakapan Viral</CardTitle></CardHeader>
            <CardContent>
              {pollsList.length > 0 ? (
                <div className="space-y-1">
                  {pollsList.map((p: any) => (
                    <div key={p.id} className="text-xs p-2 rounded border bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="font-medium truncate">{p.title}</div>
                      <div className="text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>💬 {p.responseCount} respon</span>
                        {p.isAiGenerated && <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">AI</Badge>}
                        <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {loadingAnalytics ? 'Memuat...' : 'Belum ada poll dengan respon'}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Hash className="w-4 h-4 text-cyan-600" /> Word Cloud — Kata Kunci Paling Sering</CardTitle></CardHeader>
            <CardContent>
              {wordCloud.length > 0 ? (
                <WordCloudViz words={wordCloud} />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {loadingAnalytics ? 'Memuat word cloud...' : 'Belum ada keywords. Akan terisi otomatis setelah ada respon survei dengan AI analysis.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-TAB 2: Online Broadcast */}
      {outputTab === 'online' && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-600" /> Diagram Hasil Pilihan Ganda &amp; Skala Opini</CardTitle></CardHeader>
            <CardContent>
              {totalResponsesFromAnalytics > 0 ? (
                <div className="space-y-2">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-600">{channelSplit.online}</div>
                    <div className="text-xs text-muted-foreground">Total Respon Online Broadcast</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-emerald-50"><div className="text-lg font-bold text-emerald-600">{sentimentStats.POSITIVE || 0}</div><div className="text-[10px] text-muted-foreground">Positif</div></div>
                    <div className="p-2 rounded bg-amber-50"><div className="text-lg font-bold text-amber-600">{sentimentStats.NEUTRAL || 0}</div><div className="text-[10px] text-muted-foreground">Netral</div></div>
                    <div className="p-2 rounded bg-red-50"><div className="text-lg font-bold text-red-600">{sentimentStats.NEGATIVE || 0}</div><div className="text-[10px] text-muted-foreground">Negatif</div></div>
                  </div>
                  {channelSplit.field > 0 && (
                    <div className="text-[11px] text-muted-foreground text-center pt-1">
                      + {channelSplit.field} respon dari jalur lapangan (lihat tab Lapangan)
                    </div>
                  )}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center py-4">{loadingAnalytics ? 'Memuat...' : 'Belum ada respon dari broadcast'}</p>}
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" /> Ringkasan Kluster Jawaban Esai</CardTitle></CardHeader>
            <CardContent>
              {aspirasiTop.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">Top 5 kategori aspirasi dari AI analysis jawaban esai:</p>
                  <div className="space-y-1">
                    {aspirasiTop.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">{i + 1}</span>
                        <span className="flex-1 truncate font-medium">{a.category}</span>
                        <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">{a.count} respon</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {loadingAnalytics ? 'Memuat...' : 'AI akan merangkum aspirasi setelah ada respon dengan kategori analysis'}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="md:col-span-2"><CardContent className="p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">📊 Response Rate (Online Broadcast)</span>
              <div className="flex items-center gap-2">
                <span className="font-bold">{channelSplit.online} respon online</span>
                <span className="text-muted-foreground">/ {activePolls} poll aktif</span>
                {aiGenerated > 0 && <Badge variant="outline" className="text-[10px]">{aiGenerated} AI-generated</Badge>}
              </div>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* SUB-TAB 3: Teritorial Lapangan */}
      {outputTab === 'lapangan' && (
        <div className="space-y-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-600" /> Peta Panas (Heatmap Teritorial)</CardTitle>
            <CardDescription className="text-xs">Top 10 wilayah dengan respon terbanyak dari surveyor lapangan</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200"><div className="w-4 h-4 rounded-full bg-green-500 mx-auto mb-1" /><div className="text-xs font-medium text-green-700">Sentimen Baik</div></div>
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200"><div className="w-4 h-4 rounded-full bg-yellow-500 mx-auto mb-1" /><div className="text-xs font-medium text-yellow-700">Netral</div></div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200"><div className="w-4 h-4 rounded-full bg-red-500 mx-auto mb-1" /><div className="text-xs font-medium text-red-700">Sentimen Buruk</div></div>
              </div>
              <HeatmapViz locations={topLocations} loading={loadingAnalytics} />
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> Tabel Demografi Responden Lapangan</CardTitle>
            <CardDescription className="text-xs">Data agregat demografi (Usia, Pekerjaan, Jenis Kelamin) responden door-to-door.</CardDescription></CardHeader>
            <CardContent>
              <DemographyTable demography={demography} topLocations={topLocations} channelSplit={channelSplit} loading={loadingAnalytics} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================================
// FASE 3.4: WORD CLOUD COMPONENT
// ============================================================
// Render word cloud dari aggregate aiKeywords
// - Font size berdasarkan frequency (count)
// - Color berdasarkan rank (top 5 merah, dst)
// - No external library (pure CSS, hemat bundle)
// ============================================================
function WordCloudViz({ words }: { words: Array<{ text: string; count: number }> }) {
  if (words.length === 0) return null
  const maxCount = words[0].count
  const minCount = words[words.length - 1].count
  const range = Math.max(1, maxCount - minCount)

  const getColor = (idx: number) => {
    if (idx < 5) return 'text-red-600'
    if (idx < 15) return 'text-orange-600'
    return 'text-slate-600'
  }
  const getFontSize = (count: number) => {
    const normalized = (count - minCount) / range
    return Math.round(12 + normalized * 20) // 12-32px
  }
  const getWeight = (idx: number) => idx < 5 ? 'font-bold' : idx < 15 ? 'font-semibold' : 'font-normal'

  return (
    <div className="flex flex-wrap gap-2 items-center justify-center p-4 min-h-[120px]">
      {words.map((w, idx) => (
        <span
          key={w.text}
          className={`${getColor(idx)} ${getWeight(idx)} transition-all hover:scale-110 cursor-default`}
          style={{ fontSize: `${getFontSize(w.count)}px` }}
          title={`${w.text}: ${w.count}x disebut`}
        >
          {w.text}
        </span>
      ))}
    </div>
  )
}

// ============================================================
// FASE 3.4: HEATMAP COMPONENT
// ============================================================
// Visualisasi top locations sebagai "heatmap" berbasis list
// (bukan peta geospasial nyata — itu butuh library berat seperti Leaflet)
// Color intensity berdasarkan count
// ============================================================
function HeatmapViz({ locations, loading }: { locations: Array<{ regencyCode: string | null; regencyName: string | null; provinceName: string | null; count: number }>; loading: boolean }) {
  if (loading) {
    return (
      <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (locations.length === 0) {
    return (
      <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            Belum ada data lokasi dari lapangan.<br />
            Data akan terisi saat surveyor submit respon dengan regencyCode.
          </p>
        </div>
      </div>
    )
  }
  const maxCount = locations[0].count
  return (
    <div className="space-y-1.5">
      {locations.map((loc, idx) => {
        const intensity = loc.count / maxCount
        const bgColor = intensity > 0.7 ? 'bg-red-200' : intensity > 0.4 ? 'bg-amber-200' : 'bg-emerald-200'
        const textColor = intensity > 0.7 ? 'text-red-800' : intensity > 0.4 ? 'text-amber-800' : 'text-emerald-800'
        const barWidth = `${Math.max(10, intensity * 100)}%`
        return (
          <div key={loc.regencyCode || idx} className="flex items-center gap-2 text-xs">
            <div className="w-32 truncate font-medium">{loc.regencyName || loc.regencyCode || 'Unknown'}</div>
            <div className="text-[10px] text-muted-foreground w-24 truncate">{loc.provinceName || '—'}</div>
            <div className="flex-1 relative h-6 bg-slate-100 rounded">
              <div
                className={`h-full ${bgColor} rounded transition-all flex items-center px-2`}
                style={{ width: barWidth }}
              >
                <span className={`${textColor} font-semibold`}>{loc.count}</span>
              </div>
            </div>
          </div>
        )
      })}
      <div className="text-[10px] text-muted-foreground text-center pt-2">
        Total {locations.length} wilayah • Top: {locations[0]?.regencyName || '—'} ({locations[0]?.count || 0} respon)
      </div>
    </div>
  )
}

// ============================================================
// FASE 3.4: DEMOGRAPHY TABLE COMPONENT
// ============================================================
function DemographyTable({ demography, topLocations, channelSplit, loading }: {
  demography: { ageGroups: Record<string, number>; genders: Record<string, number>; occupations: Record<string, number> }
  topLocations: Array<{ regencyName: string | null; count: number }>
  channelSplit: { online: number; field: number }
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="text-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
      </div>
    )
  }
  if (channelSplit.field === 0) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        Belum ada data dari lapangan. Data akan terisi otomatis saat surveyor menginput dari HP.
      </div>
    )
  }

  const ageGroups = demography.ageGroups || {}
  const age17to25 = (ageGroups['18-25'] || 0)
  const age26to45 = (ageGroups['26-35'] || 0) + (ageGroups['36-50'] || 0)
  const age46plus = (ageGroups['51+'] || 0)

  const genders = demography.genders || {}
  const totalL = genders['LAKI-LAKI'] || 0
  const totalP = genders['PEREMPUAN'] || 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded bg-orange-50 border border-orange-200">
          <div className="text-lg font-bold text-orange-700">{channelSplit.field}</div>
          <div className="text-[10px] text-muted-foreground">Total Lapangan</div>
        </div>
        <div className="p-2 rounded bg-blue-50 border border-blue-200">
          <div className="text-lg font-bold text-blue-700">{totalL}</div>
          <div className="text-[10px] text-muted-foreground">Laki-laki</div>
        </div>
        <div className="p-2 rounded bg-pink-50 border border-pink-200">
          <div className="text-lg font-bold text-pink-700">{totalP}</div>
          <div className="text-[10px] text-muted-foreground">Perempuan</div>
        </div>
        <div className="p-2 rounded bg-purple-50 border border-purple-200">
          <div className="text-lg font-bold text-purple-700">{Object.keys(demography.occupations || {}).length}</div>
          <div className="text-[10px] text-muted-foreground">Pekerjaan</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left py-2 px-2">Wilayah</th>
              <th className="text-center py-2 px-2">Total</th>
              <th className="text-center py-2 px-2">% dari Total</th>
            </tr>
          </thead>
          <tbody>
            {topLocations.slice(0, 10).map((loc, idx) => (
              <tr key={idx} className="border-b hover:bg-slate-50">
                <td className="py-2 px-2 font-medium">{loc.regencyName || 'Unknown'}</td>
                <td className="text-center py-2 px-2 font-bold">{loc.count}</td>
                <td className="text-center py-2 px-2 text-muted-foreground">
                  {channelSplit.field > 0 ? Math.round((loc.count / channelSplit.field) * 100) : 0}%
                </td>
              </tr>
            ))}
            {topLocations.length === 0 && (
              <tr><td colSpan={3} className="text-center py-4 text-muted-foreground">Belum ada data wilayah spesifik</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded border">
          <div className="font-semibold mb-1 text-slate-700">Kelompok Usia</div>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span>17-25</span><span className="font-bold">{age17to25}</span></div>
            <div className="flex justify-between"><span>26-45</span><span className="font-bold">{age26to45}</span></div>
            <div className="flex justify-between"><span>46+</span><span className="font-bold">{age46plus}</span></div>
          </div>
        </div>
        <div className="p-2 rounded border">
          <div className="font-semibold mb-1 text-slate-700">Pekerjaan (Top 5)</div>
          <div className="space-y-0.5">
            {Object.entries(demography.occupations || {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([occ, count]) => (
                <div key={occ} className="flex justify-between">
                  <span className="truncate">{occ}</span>
                  <span className="font-bold">{count as number}</span>
                </div>
              ))}
            {Object.keys(demography.occupations || {}).length === 0 && (
              <div className="text-muted-foreground italic">Belum ada data</div>
            )}
          </div>
        </div>
        <div className="p-2 rounded border">
          <div className="font-semibold mb-1 text-slate-700">Gender</div>
          <div className="space-y-0.5">
            <div className="flex justify-between"><span>Laki-laki</span><span className="font-bold">{totalL}</span></div>
            <div className="flex justify-between"><span>Perempuan</span><span className="font-bold">{totalP}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Ratio L:P</span><span>{totalP > 0 ? (totalL / totalP).toFixed(2) : '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TAB 4: ESSAY POLLS & AI AUTO-PERTANYAAN
// ============================================================
function EssayPollsTab({ onSwitchTab }: { onSwitchTab?: (tab: string) => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [polls, setPolls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiGenOpen, setAiGenOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [detailPoll, setDetailPoll] = useState<any>(null)
  const [sharePoll, setSharePoll] = useState<any>(null)
  const [configPoll, setConfigPoll] = useState<any>(null) // FASE 3.3.8: poll untuk config dialog
  const [aiForm, setAiForm] = useState({ sourceTopic: '', sourceUrl: '', sourceContent: '' })
  // === State untuk dialog Keyword AI & Hashtag ===
  const [keywordManagerOpen, setKeywordManagerOpen] = useState(false)
  // === State untuk dialog Surveyor Manager & Sync ===
  const [surveyorManagerOpen, setSurveyorManagerOpen] = useState(false)
  const [surveyorSyncOpen, setSurveyorSyncOpen] = useState(false)
  // === State baru untuk multiple AI suggestions ===
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [aiSuggestionsMeta, setAiSuggestionsMeta] = useState<any>(null)
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false)
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState<number | null>(null)
  const [creatingFromSuggestion, setCreatingFromSuggestion] = useState(false)
  // === State untuk AI suggestions di mode Manual ===
  const [manualSuggestions, setManualSuggestions] = useState<any[]>([])
  const [loadingManualSuggestions, setLoadingManualSuggestions] = useState(false)
  // === State untuk topic suggestions (auto-fill inspirasi) ===
  const [topicSuggestions, setTopicSuggestions] = useState<any>(null)

  // === BANNER: Pengingat survei harus netral ===
  const neutralityBanner = (
    <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-3 flex items-start gap-3">
      <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-bold text-amber-800 text-sm">
          🔒 Survei Opini Publik — Netral &amp; Anonim
        </div>
        <p className="text-xs text-amber-700 mt-1">
          Pertanyaan survei <strong>TIDAK boleh menyebut</strong> "Laskar Prabowo 08" atau "LAPRA 08". 
          Responden harus merasa bebas menjawab jujur tanpa tekanan. 
          Sistem AI sudah otomatis menghapus nama organisasi dari pertanyaan yang di-generate.
        </p>
      </div>
    </div>
  )
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    api('/api/essay-polls').then(res => {
      setPolls(Array.isArray(res) ? res : (res?.data || []))
    }).catch(() => setPolls([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // === AI Generate: dapetin dulu 5 varian pertanyaan ===
  const handleGetSuggestions = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneratingSuggestions(true)
    setAiSuggestions([])
    setSelectedSuggestionIdx(null)
    try {
      const res = await fetch('/api/essay-polls/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          sourceTopic: aiForm.sourceTopic,
          sourceUrl: aiForm.sourceUrl,
          sourceContent: aiForm.sourceContent,
          count: 5,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      setAiSuggestions(data.data.questions)
      setAiSuggestionsMeta(data.data)
      addToast(data.message, 'success')
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setGeneratingSuggestions(false)
    }
  }

  // === Pilih salah satu suggestion & buat poll ===
  const handleCreateFromSuggestion = async (idx: number) => {
    const suggestion = aiSuggestions[idx]
    if (!suggestion) return
    setCreatingFromSuggestion(true)
    try {
      const res = await fetch('/api/essay-polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          action: 'ai_generate',
          sourceTopic: aiForm.sourceTopic,
          sourceUrl: aiForm.sourceUrl,
          sourceContent: aiForm.sourceContent,
          // Override dengan suggestion yang dipilih user
          selectedSuggestion: suggestion,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast(`Poll dibuat dari saran AI #${idx + 1} (pendekatan ${suggestion.approach})`, 'success')
      // Reset & close
      setAiForm({ sourceTopic: '', sourceUrl: '', sourceContent: '' })
      setAiSuggestions([])
      setSelectedSuggestionIdx(null)
      setAiGenOpen(false)
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setCreatingFromSuggestion(false)
    }
  }

  // === Dapatkan AI suggestions untuk mode Manual (preview, tanpa simpan) ===
  const handleGetManualSuggestions = async () => {
    setLoadingManualSuggestions(true)
    try {
      const res = await fetch('/api/essay-polls/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          sourceTopic: 'Survei opini publik umum',
          count: 5,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setManualSuggestions(data.data.questions)
      addToast(`${data.data.questions.length} saran pertanyaan AI tersedia`, 'success')
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoadingManualSuggestions(false)
    }
  }

  // === Apply suggestion ke form manual ===
  const applyManualSuggestion = (suggestion: any) => {
    const titleInput = document.getElementById('manual-title') as HTMLInputElement
    const questionTextarea = document.getElementById('manual-question') as HTMLTextAreaElement
    const descriptionTextarea = document.getElementById('manual-description') as HTMLTextAreaElement
    if (titleInput) titleInput.value = suggestion.title
    if (questionTextarea) questionTextarea.value = suggestion.question
    if (descriptionTextarea) descriptionTextarea.value = suggestion.description
    addToast(`Saran AI "${suggestion.approach}" diterapkan ke form`, 'success')
  }

  // === Load topic suggestions (categories + recent news + recent opinions) ===
  const loadTopicSuggestions = useCallback(async () => {
    if (topicSuggestions) return // already loaded
    try {
      const res = await fetch('/api/essay-polls/topic-suggestions', {
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (data.success) setTopicSuggestions(data.data)
    } catch (e: any) {
      console.error('[TopicSuggestions] Error:', e.message)
    }
  }, [topicSuggestions])

  // === Apply topic suggestion (auto-fill form) ===
  const applyTopicSuggestion = (topic: string, occupation?: string, sourceUrl?: string) => {
    setAiForm({
      ...aiForm,
      sourceTopic: topic,
      sourceUrl: sourceUrl || '',
    })
    addToast(`Topik "${topic.substring(0, 60)}..." diisi otomatis${occupation ? ` (target: ${occupation})` : ''}`, 'success')
  }

  // === Apply recent opinion link as topic ===
  const applyOpinionAsTopic = (opinion: any) => {
    setAiForm({
      ...aiForm,
      sourceTopic: opinion.title,
      sourceUrl: '', // opinion links don't have public URL we'd share
    })
    addToast(`Topik dari opinion link diisi otomatis (sentiment: ${opinion.sentiment})`, 'success')
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
      {neutralityBanner}

      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shrink-0">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Essay Polling &amp; AI Auto-Pertanyaan</h3>
              <p className="text-sm text-muted-foreground mb-3">
                AI menelaah berita/event otomatis → generate <strong>5 varian pertanyaan</strong> dengan pendekatan berbeda
                (langsung, komparatif, solusi, emosional, analitis). Pilih salah satu, lalu share ke medsos &amp; group populer.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => { setAiGenOpen(true); setAiSuggestions([]) }} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <Sparkles className="w-4 h-4 mr-1" /> AI Generate Pertanyaan
                </Button>
                <Button variant="outline" onClick={() => setManualOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Buat Manual Esai
                </Button>
                <Button variant="outline" onClick={() => { setManualOpen(true); addToast('Pilih jenis "Pilihan Ganda" di form manual', 'info') }}>
                  <Plus className="w-4 h-4 mr-1" /> Buat Manual Pilihan Ganda
                </Button>
                <Button variant="outline" onClick={() => { setManualOpen(true); addToast('Pilih jenis "Skala Opini (Likert)" di form manual', 'info') }}>
                  <Plus className="w-4 h-4 mr-1" /> Buat Skala Opini/Likert
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Polls list */}
      {polls.length === 0 ? (
        <EmptyState icon={Brain} title="Belum ada essay poll"
          description="Klik 'AI Generate Pertanyaan' untuk membuat 5 varian pertanyaan essay otomatis dari topik berita/event." />
      ) : (
        <div className="space-y-2">
          {polls.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {p.isAiGenerated && (
                        <Badge className="text-[13px] bg-purple-100 text-purple-800">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />AI GENERATED
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[13px] ${p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : p.status === 'CLOSED' ? 'bg-slate-50 text-slate-700' : 'bg-amber-50 text-amber-700'}`}>
                        {p.status}
                      </Badge>
                      {p.sourceSentiment && (
                        <Badge variant="outline" className={`text-[13px] ${p.sourceSentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : p.sourceSentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                          {p.sourceSentiment}
                        </Badge>
                      )}
                      {p.targetOccupation && <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700">{p.targetOccupation}</Badge>}
                      {p.provinceName && <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{p.regencyName || p.provinceName}</Badge>}
                      <Badge variant="outline" className="text-[13px]">{p._count?.responses || 0} respon</Badge>
                    </div>
                    <div className="font-semibold text-sm">{p.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.question}</p>
                    {p.description && <p className="text-xs text-purple-700 mt-1 italic line-clamp-1">{p.description}</p>}
                    <div className="text-[13px] text-muted-foreground mt-2">
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
                    {/* === FASE 3.3.8: Tombol Atur Tipe Poll === */}
                    <Button size="sm" variant="outline" className="h-7 text-xs bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100" onClick={() => setConfigPoll(p)}>
                      <Hash className="w-3 h-3 mr-1" /> Atur Tipe
                    </Button>
                    {/* === Tombol Share ke Medsos === */}
                    <Button size="sm" variant="outline" className="h-7 text-xs bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100" onClick={() => setSharePoll(p)}>
                      <Share2 className="w-3 h-3 mr-1" /> Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* === BAGIAN 2: KANAL DISTRIBUSI & INTEGRASI (3 Kolom) === */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-blue-500 to-cyan-600" />
          <h3 className="text-sm font-bold">📡 Kanal Distribusi &amp; Integrasi</h3>
          <span className="text-xs text-muted-foreground">— Pilih jalur pengumpulan data</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {/* KOLOM A: Jalur Otomatis Medsos */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-blue-600" />
                </div>
                <CardTitle className="text-sm">Jalur Otomatis Medsos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Menangkap percakapan publik di media sosial secara otomatis dan real-time berbasis AI.
              </p>
              <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={() => setKeywordManagerOpen(true)}>
                ⚙️ Atur Keyword AI &amp; Hashtag
              </Button>
            </CardContent>
          </Card>

          {/* KOLOM B: Jalur Digital Broadcast */}
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Send className="w-4 h-4 text-emerald-600" />
                </div>
                <CardTitle className="text-sm">Jalur Digital Broadcast</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Menyebarkan tautan kuesioner digital mandiri secara massal ke pangkalan data masyarakat.
              </p>
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full text-xs gap-1 bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={() => onSwitchTab?.('broadcast')}>
                  🚀 Kirim via WhatsApp/SMS Blast
                </Button>
                <p className="text-[11px] text-muted-foreground italic">→ Buka tab Siaran &amp; Broadcast</p>
              </div>
            </CardContent>
          </Card>

          {/* KOLOM C: Jalur Teritorial Lapangan */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <CardTitle className="text-sm">Jalur Teritorial Lapangan</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Mengirimkan kuesioner ke aplikasi HP khusus tim surveyor di lapangan untuk pendataan door-to-door.
              </p>
              <div className="space-y-1">
                <Button size="sm" variant="outline" className="w-full text-xs gap-1 bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100" onClick={() => setSurveyorSyncOpen(true)}>
                  📱 Sinkronisasi ke HP Surveyor
                </Button>
                <Button size="sm" variant="outline" className="w-full text-xs gap-1 bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100" onClick={() => setSurveyorManagerOpen(true)}>
                  👥 Kelola Akun &amp; Wilayah Surveyor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* === BAGIAN 3: OUTPUT DATA — Dashboard Konsolidasi Hasil 3 Dimensi === */}
      <SurveyOutputDashboard polls={polls} />

      {/* === AI Generate Dialog (Multiple Suggestions) — Enhanced with Topic Suggestions === */}
      <Dialog open={aiGenOpen} onOpenChange={(o) => { setAiGenOpen(o); if (!o) { setAiSuggestions([]); setSelectedSuggestionIdx(null); setShowTopicSuggestions(false); setActiveCategory(null) } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> AI Generate Pertanyaan Essay (Multi-Saran)
            </DialogTitle>
            <DialogDescription>
              AI akan generate 5 varian pertanyaan dengan pendekatan berbeda. Pilih salah satu untuk dibuat poll.
              Klik <strong>"💡 Saran Topik"</strong> untuk inspirasi dari trending issues &amp; kategori.
            </DialogDescription>
          </DialogHeader>

          {/* === Topic Suggestions Panel (auto-fill inspirasi) === */}
          {aiSuggestions.length === 0 && (
            <div className="rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-purple-800">💡 Saran Topik Otomatis (AI-curated)</Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => {
                    if (!showTopicSuggestions) loadTopicSuggestions()
                    setShowTopicSuggestions(!showTopicSuggestions)
                  }}>
                  {showTopicSuggestions ? '▲ Sembunyikan' : '▼ Tampilkan Saran'}
                </Button>
              </div>
              {showTopicSuggestions && topicSuggestions && (
                <div className="space-y-3">
                  {/* Quick stats */}
                  <div className="text-[13px] text-purple-700">
                    {topicSuggestions.stats.totalCategories} kategori • {topicSuggestions.stats.totalSuggestedTopics} topik siap pakai • {topicSuggestions.stats.recentOpinionsCount} opinion links terbaru • {topicSuggestions.stats.recentNewsCount} berita LAPRA 08
                  </div>

                  {/* Category chips */}
                  <div>
                    <div className="text-[13px] font-semibold text-muted-foreground mb-1">📚 Pilih Kategori Isu:</div>
                    <div className="flex flex-wrap gap-1">
                      {topicSuggestions.categories.map(cat => (
                        <button key={cat.id} type="button"
                          onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                          className={`px-2 py-1 rounded-full text-[13px] font-medium border transition-all ${activeCategory === cat.id ? `bg-${cat.color}-500 text-white border-${cat.color}-500` : 'border hover:bg-accent'}`}>
                          {cat.icon} {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suggested topics for active category */}
                  {activeCategory && (() => {
                    const cat = topicSuggestions.categories.find(c => c.id === activeCategory)
                    if (!cat) return null
                    return (
                      <div className="rounded bg-white border p-2 space-y-1">
                        <div className="text-[13px] font-semibold text-muted-foreground mb-1">
                          {cat.icon} {cat.label} — {cat.description}
                        </div>
                        <div className="space-y-1">
                          {cat.suggestedTopics.map((t: any, i: number) => (
                            <button key={i} type="button"
                              onClick={() => applyTopicSuggestion(t.topic, t.occupation)}
                              className="w-full text-left p-1.5 rounded border hover:bg-accent text-[13px] transition-all">
                              <div className="flex items-start justify-between gap-2">
                                <span className="flex-1">{t.topic}</span>
                                <div className="flex gap-1 shrink-0">
                                  {t.occupation && t.occupation !== 'UMUM' && <Badge variant="outline" className="text-[13px]">{t.occupation}</Badge>}
                                  <Badge variant="outline" className={`text-[13px] ${t.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : t.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                                    {t.sentiment}
                                  </Badge>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Recent trending opinions (auto-detected from DB) */}
                  {topicSuggestions.recentOpinions && topicSuggestions.recentOpinions.length > 0 && (
                    <div>
                      <div className="text-[13px] font-semibold text-muted-foreground mb-1">🔥 Trending Issues (dari Opinion Scanner terbaru):</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {topicSuggestions.recentOpinions.slice(0, 5).map((o: any, i: number) => (
                          <button key={i} type="button"
                            onClick={() => applyOpinionAsTopic(o)}
                            className="w-full text-left p-1.5 rounded border hover:bg-accent text-[13px] transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <span className="flex-1 line-clamp-1">{o.title}</span>
                              <div className="flex gap-1 shrink-0">
                                <Badge variant="outline" className={`text-[13px] ${o.priority === 'HIGH' ? 'bg-red-50 text-red-700' : o.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : ''}`}>{o.priority}</Badge>
                                <Badge variant="outline" className={`text-[13px] ${o.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : o.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>{o.sentiment}</Badge>
                              </div>
                            </div>
                            {o.location && o.location !== 'Nasional' && <div className="text-[13px] text-muted-foreground mt-0.5">📍 {o.location} • 💬 {o.engagement} engagement</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent LAPRA 08 news */}
                  {topicSuggestions.recentNews && topicSuggestions.recentNews.length > 0 && (
                    <div>
                      <div className="text-[13px] font-semibold text-muted-foreground mb-1">📰 Berita LAPRA 08 Terbaru (auto-sync):</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {topicSuggestions.recentNews.slice(0, 5).map((n: any, i: number) => (
                          <button key={i} type="button"
                            onClick={() => applyTopicSuggestion(n.title, n.occupation)}
                            className="w-full text-left p-1.5 rounded border hover:bg-accent text-[13px] transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <span className="flex-1 line-clamp-1">{n.title}</span>
                              <Badge variant="outline" className="text-[13px]">{n.source}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {showTopicSuggestions && !topicSuggestions && (
                <div className="text-[13px] text-purple-700 italic">Loading topic suggestions...</div>
              )}
            </div>
          )}

          {/* Step 1: Input form */}
          <form onSubmit={handleGetSuggestions} className="space-y-3">
            <div className="space-y-2">
              <Label>Topik Isu / Berita * <span className="text-[13px] text-muted-foreground">(atau klik saran di atas untuk auto-fill)</span></Label>
              <Input value={aiForm.sourceTopic} onChange={(e) => setAiForm({ ...aiForm, sourceTopic: e.target.value })}
                placeholder="cth: Kenaikan harga pupuk bersubsidi di Grobogan" required disabled={generatingSuggestions || aiSuggestions.length > 0} />
            </div>
            <div className="space-y-2">
              <Label>URL Sumber (opsional)</Label>
              <Input value={aiForm.sourceUrl} onChange={(e) => setAiForm({ ...aiForm, sourceUrl: e.target.value })}
                placeholder="https://..." disabled={generatingSuggestions || aiSuggestions.length > 0} />
            </div>
            <div className="space-y-2">
              <Label>Isi Berita / Konten (opsional)</Label>
              <Textarea value={aiForm.sourceContent} onChange={(e) => setAiForm({ ...aiForm, sourceContent: e.target.value })}
                placeholder="Paste isi berita atau ringkasan isu di sini..." rows={3} disabled={generatingSuggestions || aiSuggestions.length > 0} />
            </div>
            {aiSuggestions.length === 0 && (
              <div className="flex justify-end">
                <Button type="submit" disabled={generatingSuggestions} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  {generatingSuggestions ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  {generatingSuggestions ? 'Menunggu AI generate 5 varian...' : 'Generate 5 Varian Pertanyaan'}
                </Button>
              </div>
            )}
          </form>

          {/* Step 2: Hasil multiple suggestions */}
          {aiSuggestions.length > 0 && aiSuggestionsMeta && (
            <div className="space-y-3">
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs text-purple-800">
                <strong>Analisis AI:</strong> Lokasi: {aiSuggestionsMeta.detectedLocation} • Target: {aiSuggestionsMeta.detectedOccupation} •
                Sentimen: {aiSuggestionsMeta.detectedSentiment} • Provider: {aiSuggestionsMeta.aiProvider}
              </div>
              <div className="text-sm font-semibold">Pilih salah satu varian pertanyaan (klik untuk pilih):</div>
              <div className="space-y-2">
                {aiSuggestions.map((q, i) => {
                  const isSelected = selectedSuggestionIdx === i
                  const approachLabels: Record<string, string> = {
                    direct: '🎯 Langsung',
                    comparative: '📊 Komparatif',
                    'solution-oriented': '💡 Solusi',
                    emotional: '💖 Emosional',
                    analytical: '🔬 Analitis',
                    aspiratif: '🙏 Aspiratif',
                  }
                  return (
                    <button key={i} type="button" onClick={() => setSelectedSuggestionIdx(i)}
                      className={`w-full text-left rounded-lg border-2 p-3 transition-all ${isSelected ? 'border-purple-500 bg-purple-50 shadow-md' : 'border-slate-200 hover:border-purple-300 hover:bg-accent'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[13px] bg-purple-100 text-purple-800">
                          {approachLabels[q.approach] || q.approach} #{i + 1}
                        </Badge>
                        <Badge variant="outline" className="text-[13px]">{q.targetOccupation}</Badge>
                      </div>
                      <div className="font-semibold text-sm mb-1">{q.title}</div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{q.question}</p>
                      <p className="text-[13px] text-purple-700 italic mt-1 line-clamp-1">{q.description}</p>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => { setAiSuggestions([]); setSelectedSuggestionIdx(null) }}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Mulai Ulang
                </Button>
                <Button
                  type="button"
                  disabled={selectedSuggestionIdx === null || creatingFromSuggestion}
                  onClick={() => selectedSuggestionIdx !== null && handleCreateFromSuggestion(selectedSuggestionIdx)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                >
                  {creatingFromSuggestion ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  {creatingFromSuggestion ? 'Membuat Poll...' : selectedSuggestionIdx !== null ? `Buat Poll dari Varian #${selectedSuggestionIdx + 1}` : 'Pilih varian dulu'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Manual Create Dialog with AI Suggestions === */}
      <Dialog open={manualOpen} onOpenChange={(o) => { setManualOpen(o); if (!o) setManualSuggestions([]) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" /> Buat Essay Poll Manual + Saran AI
            </DialogTitle>
            <DialogDescription>
              Tulis pertanyaan essay sendiri, atau klik "Dapatkan Saran AI" untuk generate 5 varian pertanyaan yang bisa Anda pilih sebagai starting point.
            </DialogDescription>
          </DialogHeader>

          {/* AI Suggestions panel */}
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-purple-800">Saran Pertanyaan dari AI (opsional)</div>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={handleGetManualSuggestions} disabled={loadingManualSuggestions}>
                {loadingManualSuggestions ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {loadingManualSuggestions ? 'Loading...' : manualSuggestions.length > 0 ? 'Refresh Saran' : 'Dapatkan Saran AI'}
              </Button>
            </div>
            {manualSuggestions.length > 0 && (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {manualSuggestions.map((q, i) => {
                  const approachLabels: Record<string, string> = {
                    direct: '🎯 Langsung',
                    comparative: '📊 Komparatif',
                    'solution-oriented': '💡 Solusi',
                    emotional: '💖 Emosional',
                    analytical: '🔬 Analitis',
                    aspiratif: '🙏 Aspiratif',
                  }
                  return (
                    <div key={i} className="rounded border bg-white p-2">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[13px]">{approachLabels[q.approach] || q.approach}</Badge>
                        <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => applyManualSuggestion(q)}>
                          <Plus className="w-3 h-3 mr-0.5" /> Pakai
                        </Button>
                      </div>
                      <div className="text-xs font-semibold">{q.title}</div>
                      <p className="text-[13px] text-muted-foreground line-clamp-2 mt-0.5">{q.question}</p>
                    </div>
                  )
                })}
              </div>
            )}
            {!loadingManualSuggestions && manualSuggestions.length === 0 && (
              <p className="text-[13px] text-purple-700 italic">Klik tombol di kanan atas untuk generate 5 varian pertanyaan AI. Anda bisa pakai sebagai starting point, lalu edit sesuai kebutuhan.</p>
            )}
          </div>

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
              setManualOpen(false); setManualSuggestions([]); loadData()
            } catch (err: any) { addToast(err.message, 'error') }
          }} className="space-y-3">
            <div className="space-y-2"><Label>Judul *</Label><Input id="manual-title" name="title" required /></div>
            <div className="space-y-2"><Label>Pertanyaan Essay *</Label><Textarea id="manual-question" name="question" rows={4} required /></div>
            <div className="space-y-2"><Label>Deskripsi (opsional)</Label><Textarea id="manual-description" name="description" rows={2} /></div>
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
              <Button type="button" variant="outline" onClick={() => { setManualOpen(false); setManualSuggestions([]) }}>Batal</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">Simpan Poll</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* === Share to Social Media Dialog === */}
      {sharePoll && (
        <ShareToSocialMediaDialog poll={sharePoll} onClose={() => setSharePoll(null)} />
      )}

      {/* === Keyword & Hashtag Manager Dialog === */}
      <KeywordHashtagManagerDialog open={keywordManagerOpen} onOpenChange={setKeywordManagerOpen} />

      {/* === FASE 3.3.8: Poll Config Dialog (set pollType + options) === */}
      {configPoll && (
        <PollConfigDialog poll={configPoll} onClose={() => setConfigPoll(null)} />
      )}

      {/* === Surveyor Manager Dialog === */}
      <SurveyorManagerDialog open={surveyorManagerOpen} onOpenChange={setSurveyorManagerOpen} />

      {/* === Surveyor Sync Dialog === */}
      <SurveyorSyncDialog open={surveyorSyncOpen} onOpenChange={setSurveyorSyncOpen} />

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
                  <div className="text-[13px]">Positif</div>
                </div>
                <div className="rounded border bg-slate-50 p-2">
                  <div className="text-2xl font-bold text-slate-700">{detailPoll.sentimentStats?.NEUTRAL || 0}</div>
                  <div className="text-[13px]">Netral</div>
                </div>
                <div className="rounded border bg-red-50 p-2">
                  <div className="text-2xl font-bold text-red-700">{detailPoll.sentimentStats?.NEGATIVE || 0}</div>
                  <div className="text-[13px]">Negatif</div>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Top Wilayah Responden:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(detailPoll.topLocations || []).map((loc: any) => (
                    <Badge key={loc.code} variant="outline" className="text-[13px]">{loc.code}: {loc.count}</Badge>
                  ))}
                  {(detailPoll.topLocations || []).length === 0 && <span className="text-sm text-muted-foreground">Belum ada responden</span>}
                </div>
              </div>
              {detailPoll.responses && detailPoll.responses.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold">Respon Terbaru:</Label>
                  <div className="space-y-2 mt-2 max-h-[40vh] overflow-y-auto">
                    {detailPoll.responses.slice(0, 10).map((r: any) => (
                      <div key={r.id} className="rounded border p-2 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`text-[13px] ${r.aiSentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : r.aiSentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                            {r.aiSentiment || 'BELUM'}
                          </Badge>
                          {r.occupation && <Badge variant="outline" className="text-[13px]">{r.occupation}</Badge>}
                          {r.ageGroup && <Badge variant="outline" className="text-[13px]">{r.ageGroup}</Badge>}
                          {r.regencyCode && <Badge variant="outline" className="text-[13px]">{r.regencyCode}</Badge>}
                          <span className="text-[13px] text-muted-foreground ml-auto">{r.wordCount} kata</span>
                        </div>
                        <p className="text-xs line-clamp-3">{r.answer}</p>
                        {r.aiSummary && <p className="text-[13px] text-purple-700 mt-1 italic">{r.aiSummary}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSharePoll(sharePoll || detailPoll)}>
                <Share2 className="w-4 h-4 mr-1" /> Share ke Medsos
              </Button>
              <Button variant="outline" onClick={() => setDetailPoll(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============================================================
// SHARE TO SOCIAL MEDIA DIALOG — Bagikan poll ke WA/FB/IG/X/Telegram/Email + Group Populer
// ============================================================
function ShareToSocialMediaDialog({ poll, onClose }: { poll: any; onClose: () => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [customText, setCustomText] = useState('')
  const [activeTab, setActiveTab] = useState<'platforms' | 'groups'>('platforms')

  const pollUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://lapra08.id'}/poll/${poll.id}`
  const shareText = customText || buildShareText(poll)

  const handleShare = async (platform: SharePlatform) => {
    if (platform.id === 'copy_link') {
      const success = await copyToClipboard(`${shareText}\n\n${pollUrl}`)
      addToast(success ? 'Link & teks berhasil disalin ke clipboard' : 'Gagal menyalin', success ? 'success' : 'error')
      return
    }
    const url = platform.buildUrl(shareText, pollUrl)
    openShareUrl(url)
    addToast(`Membuka ${platform.label}...`, 'success')
  }

  const handleShareToGroup = (group: PopularGroup) => {
    // Untuk grup, tetap pakai share URL standard tapi user pilih grup manual di platformnya
    const platform = group.platform === 'whatsapp' ? SHARE_PLATFORMS.find(p => p.id === 'whatsapp_web') :
                     group.platform === 'facebook' ? SHARE_PLATFORMS.find(p => p.id === 'facebook_group') :
                     SHARE_PLATFORMS.find(p => p.id === 'telegram_personal')
    if (!platform) return
    const url = platform.buildUrl(shareText, pollUrl)
    openShareUrl(url)
    addToast(`Membuka ${platform.label} — ${group.shareHint}`, 'success')
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-600" /> Share Poll ke Media Sosial
          </DialogTitle>
          <DialogDescription>
            Bagikan survei essay ini ke medsos & grup populer yang sering dikunjungi calon pemilih / masyarakat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Poll preview */}
          <div className="rounded-lg bg-slate-50 border p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Poll yang akan dibagikan:</div>
            <div className="font-semibold text-sm">{poll.title}</div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{poll.question}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {poll.targetOccupation && poll.targetOccupation !== 'UMUM' && <Badge variant="outline" className="text-[13px]">{poll.targetOccupation}</Badge>}
              {poll.provinceName && <Badge variant="outline" className="text-[13px]"><MapPin className="w-2.5 h-2.5 mr-0.5" />{poll.regencyName || poll.provinceName}</Badge>}
            </div>
          </div>

          {/* Custom text editor */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Teks Share (bisa edit):</Label>
            <Textarea value={customText || shareText} onChange={(e) => setCustomText(e.target.value)} rows={4}
              placeholder="Teks yang akan dibagikan ke medsos..." />
            <div className="text-[13px] text-muted-foreground">{(customText || shareText).length} karakter + URL</div>
          </div>

          {/* Poll URL */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-blue-800">
            <strong>URL Poll:</strong> <code className="break-all">{pollUrl}</code>
          </div>

          {/* Tabs: Platforms / Groups */}
          <div className="flex gap-2 border-b">
            <button onClick={() => setActiveTab('platforms')}
              className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-all ${activeTab === 'platforms' ? 'border-purple-600 text-purple-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Send className="w-3 h-3 inline mr-1" /> Platform Medsos ({SHARE_PLATFORMS.length})
            </button>
            <button onClick={() => setActiveTab('groups')}
              className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-all ${activeTab === 'groups' ? 'border-purple-600 text-purple-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Users className="w-3 h-3 inline mr-1" /> Grup Populer ({POPULAR_GROUPS.length})
            </button>
          </div>

          {/* Platforms tab */}
          {activeTab === 'platforms' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SHARE_PLATFORMS.map(platform => (
                <button key={platform.id} onClick={() => handleShare(platform)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${platform.color}`}>
                  <span className="text-base">{platform.icon}</span>
                  <span className="text-left leading-tight">{platform.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Groups tab */}
          {activeTab === 'groups' && (
            <div className="space-y-3">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[13px] text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                Klik grup untuk membuka platform share. Anda akan diarahkan ke WhatsApp Web / Facebook / Telegram,
                lalu pilih grup spesifik di akun Anda.
              </div>
              {['Komunitas Lokal', 'Kelompok Profesi', 'Pemuda', 'Politik', 'Agama', 'Pendidikan'].map(cat => {
                const groups = POPULAR_GROUPS.filter(g => g.category === cat)
                if (groups.length === 0) return null
                return (
                  <div key={cat}>
                    <div className="text-xs font-semibold text-muted-foreground mb-1.5">{cat}:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {groups.map(group => {
                        const platformIcon = group.platform === 'whatsapp' ? '💬' : group.platform === 'facebook' ? '📘' : '✈️'
                        const platformColor = group.platform === 'whatsapp' ? 'border-emerald-300 hover:bg-emerald-50' :
                                               group.platform === 'facebook' ? 'border-blue-300 hover:bg-blue-50' :
                                               'border-sky-300 hover:bg-sky-50'
                        return (
                          <button key={group.id} onClick={() => handleShareToGroup(group)}
                            className={`text-left rounded border p-2 transition-all ${platformColor}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-base">{platformIcon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-xs">{group.name}</div>
                                <div className="text-[13px] text-muted-foreground line-clamp-1">{group.description}</div>
                                <div className="text-[13px] text-purple-600 italic mt-0.5">{group.shareHint}</div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
// TAB: DASHBOARD PEMENANGAN
// ============================================================
function DecisionDashboardTab() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    api('/api/decision-dashboard').then(res => {
      setData(Array.isArray(res) ? res : (res?.data || res))
      setLastUpdated(new Date())
    }).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // === PILAR 2: Auto-refresh 30 detik (near real-time) ===
  // Cache invalidation di backend sudah handle "instant update" saat ada respon baru.
  // Polling 30 detik adalah safety net untuk kasus cache miss / multiple instances.
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      // Silent refresh: tidak set loading true supaya UI tidak flicker
      api('/api/decision-dashboard').then(res => {
        setData(Array.isArray(res) ? res : (res?.data || res))
        setLastUpdated(new Date())
      }).catch(() => {})
    }, 30000) // 30 detik
    return () => clearInterval(interval)
  }, [autoRefresh])

  if (loading) return <LoadingState />
  if (!data) return <ErrorState message="Gagal memuat dashboard. Coba refresh halaman." />

  const sentimentPct = data.sentimentTrend?.total > 0 ? {
    pos: Math.round((data.sentimentTrend.positive / data.sentimentTrend.total) * 100),
    neu: Math.round((data.sentimentTrend.neutral / data.sentimentTrend.total) * 100),
    neg: Math.round((data.sentimentTrend.negative / data.sentimentTrend.total) * 100),
  } : { pos: 0, neu: 0, neg: 0 }

  const totalLinks = data.stats?.totalOpinionLinks || 0
  const negCount = data.sentimentTrend?.negative || 0
  const posCount = data.sentimentTrend?.positive || 0
  const sentimentIdx = data.sentimentIndex || 0

  const electoralStatus = sentimentIdx >= 50 ? { label: 'SANGAT BAIK', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🟢' } :
    sentimentIdx >= 20 ? { label: 'BAIK', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🟢' } :
    sentimentIdx >= 0 ? { label: 'NETRAL', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🟡' } :
    sentimentIdx >= -20 ? { label: 'WASPADA', color: 'text-orange-600', bg: 'bg-orange-50', icon: '🟠' } :
    { label: 'KRITIS', color: 'text-red-600', bg: 'bg-red-50', icon: '🔴' }

  return (
    <div className="space-y-4">
      {/* === PILAR 2: Live Sync Badge === */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${autoRefresh ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`relative flex h-2 w-2 ${autoRefresh ? '' : 'opacity-50'}`}>
              {autoRefresh && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${autoRefresh ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            </span>
            {autoRefresh ? 'LIVE' : 'PAUSED'}
          </div>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Update: {lastUpdated.toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '⏸ Pause Auto-Refresh' : '▶ Resume Auto-Refresh'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={loadData}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh Manual
          </Button>
        </div>
      </div>

      {/* === KPI CARDS: Status Elektoral + Total Berita + Positif + Negatif === */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className={`border-2 ${electoralStatus.bg}`}>
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-1">{electoralStatus.icon}</div>
            <div className={`text-lg font-bold ${electoralStatus.color}`}>{electoralStatus.label}</div>
            <div className="text-xs text-muted-foreground mt-1">Status Elektoral LAPRA 08</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Newspaper className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-600">{totalLinks}</div>
            <div className="text-xs text-muted-foreground">Total Berita LAPRA 08</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-600">{posCount}</div>
            <div className="text-xs text-muted-foreground">Berita Positif</div>
          </CardContent>
        </Card>
        <Card className={negCount > 0 ? 'border-2 border-red-300 bg-red-50' : ''}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={`w-6 h-6 mx-auto mb-1 ${negCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
            <div className={`text-2xl font-bold ${negCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{negCount}</div>
            <div className="text-xs text-muted-foreground">Berita Negatif</div>
          </CardContent>
        </Card>
      </div>
      {/* === BAR CHART + TABEL RINGKASAN BERDAMPINGAN (2 kolom) === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KIRI: TABEL RINGKASAN */}
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-purple-600" />
              Tabel Ringkasan — Data Lengkap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead className="text-xs">Kategori</TableHead>
                  <TableHead className="text-xs text-right">Jumlah</TableHead>
                  <TableHead className="text-xs text-right">Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Monitoring Berita */}
                <TableRow className="bg-blue-50/50">
                  <TableCell className="text-xs font-bold" colSpan={3}>📰 MONITORING BERITA</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">Total Berita LAPRA 08</TableCell>
                  <TableCell className="text-xs text-right font-bold">{data.newsStats?.total || 0}</TableCell>
                  <TableCell className="text-xs text-right">100%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">🟢 Sentimen Positif</TableCell>
                  <TableCell className="text-xs text-right font-bold text-emerald-600">{data.newsStats?.positive || 0}</TableCell>
                  <TableCell className="text-xs text-right text-emerald-600">{data.newsStats?.total ? Math.round((data.newsStats.positive / data.newsStats.total) * 100) : 0}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">🔴 Sentimen Negatif</TableCell>
                  <TableCell className="text-xs text-right font-bold text-red-600">{data.newsStats?.negative || 0}</TableCell>
                  <TableCell className="text-xs text-right text-red-600">{data.newsStats?.total ? Math.round((data.newsStats.negative / data.newsStats.total) * 100) : 0}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">📍 Ter-map ke Wilayah</TableCell>
                  <TableCell className="text-xs text-right font-bold text-blue-600">{data.newsStats?.mapped || 0}</TableCell>
                  <TableCell className="text-xs text-right text-blue-600">{data.newsStats?.total ? Math.round((data.newsStats.mapped / data.newsStats.total) * 100) : 0}%</TableCell>
                </TableRow>
                {/* Siaran */}
                <TableRow className="bg-orange-50/50">
                  <TableCell className="text-xs font-bold" colSpan={3}>📤 SIARAN &amp; BROADCAST</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">Total Video</TableCell>
                  <TableCell className="text-xs text-right font-bold">{data.broadcastStats?.total || 0}</TableCell>
                  <TableCell className="text-xs text-right">100%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">📺 YouTube</TableCell>
                  <TableCell className="text-xs text-right font-bold text-red-600">{data.broadcastStats?.youtube || 0}</TableCell>
                  <TableCell className="text-xs text-right">{data.broadcastStats?.total ? Math.round((data.broadcastStats.youtube / data.broadcastStats.total) * 100) : 0}%</TableCell>
                </TableRow>
                {/* Survei */}
                <TableRow className="bg-purple-50/50">
                  <TableCell className="text-xs font-bold" colSpan={3}>🧠 SURVEI &amp; POLLING</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">Total Survei</TableCell>
                  <TableCell className="text-xs text-right font-bold">{data.pollStats?.total || 0}</TableCell>
                  <TableCell className="text-xs text-right">100%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">📝 Total Respon</TableCell>
                  <TableCell className="text-xs text-right font-bold text-blue-600">{data.pollStats?.totalResponses || 0}</TableCell>
                  <TableCell className="text-xs text-right">—</TableCell>
                </TableRow>
                {/* Sentiment Index */}
                <TableRow className="bg-emerald-50/50">
                  <TableCell className="text-xs font-bold" colSpan={3}>📊 SENTIMENT INDEX</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs font-bold">Skala -100 s/d +100</TableCell>
                  <TableCell className="text-xs text-right font-bold text-2xl text-emerald-600">{sentimentIdx > 0 ? '+' : ''}{sentimentIdx}</TableCell>
                  <TableCell className="text-xs text-right">
                    <Badge className={electoralStatus.color.replace('text-', 'bg-').replace('-600', '-100') + ' ' + electoralStatus.color}>
                      {electoralStatus.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* KANAN: BAR CHART — Sentimen per Wilayah */}
        <Card className="border-2 border-emerald-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Diagram Batang — Sentimen Berita per Wilayah
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topWilayahUrgent && data.topWilayahUrgent.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={data.topWilayahUrgent.map((w: any) => ({
                    name: w.name?.length > 15 ? w.name.substring(0, 15) + '...' : w.name,
                    Positif: w.total - (w.negative || 0),
                    Negatif: w.negative || 0,
                  }))}
                  margin={{ top: 20, right: 20, bottom: 40, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                  <YAxis label={{ value: 'Jumlah Berita', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                    formatter={(value: any, name: any) => [`${value} berita`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Positif" stackId="a" fill="#10b981" name="🟢 Positif/Netral" />
                  <Bar dataKey="Negatif" stackId="a" fill="#ef4444" name="🔴 Negatif" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                Belum ada data wilayah. Jalankan scan + bulk triage.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === BAR CHART + TABEL STATUS REVIEW (berdampingan) === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* KIRI: Tabel Status Review */}
        <Card className="border-2 border-amber-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-amber-600" />
              Tabel Status Review Berita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Jumlah</TableHead>
                  <TableHead className="text-xs text-right">Persentase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-xs">⚠️ Belum Direview</TableCell>
                  <TableCell className="text-xs text-right font-bold text-amber-600">{data.newsStats?.new || 0}</TableCell>
                  <TableCell className="text-xs text-right text-amber-600">{data.newsStats?.total ? Math.round((data.newsStats.new / data.newsStats.total) * 100) : 0}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">✅ Sudah Direview</TableCell>
                  <TableCell className="text-xs text-right font-bold text-blue-600">{data.newsStats?.reviewed || 0}</TableCell>
                  <TableCell className="text-xs text-right text-blue-600">{data.newsStats?.total ? Math.round((data.newsStats.reviewed / data.newsStats.total) * 100) : 0}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-xs">✅ Sudah Ditangani</TableCell>
                  <TableCell className="text-xs text-right font-bold text-emerald-600">{data.newsStats?.addressed || 0}</TableCell>
                  <TableCell className="text-xs text-right text-emerald-600">{data.newsStats?.total ? Math.round((data.newsStats.addressed / data.newsStats.total) * 100) : 0}%</TableCell>
                </TableRow>
                <TableRow className="bg-slate-50">
                  <TableCell className="text-xs font-bold">TOTAL</TableCell>
                  <TableCell className="text-xs text-right font-bold">{data.newsStats?.total || 0}</TableCell>
                  <TableCell className="text-xs text-right font-bold">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* KANAN: Bar Chart Status Review */}
        <Card className="border-2 border-orange-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Diagram Batang — Status Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.newsStats && (data.newsStats.total || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={[
                    { name: 'Belum\nDireview', value: data.newsStats.new || 0, fill: '#f59e0b' },
                    { name: 'Sudah\nDireview', value: data.newsStats.reviewed || 0, fill: '#3b82f6' },
                    { name: 'Sudah\nDitangani', value: data.newsStats.addressed || 0, fill: '#10b981' },
                  ]}
                  margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis label={{ value: 'Jumlah', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: '12px', borderRadius: '8px', border: '1px solid #ccc' }}
                    formatter={(value: any) => [`${value} berita`, 'Jumlah']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                Belum ada data berita.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === EXECUTIVE SUMMARY + Sentiment Gauge === */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center shadow-lg shrink-0">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base mb-2">Executive Summary — Sintesis untuk Pengambil Keputusan</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.executiveSummary}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">Sentiment Index: {sentimentIdx > 0 ? '+' : ''}{sentimentIdx} / 100</div>
                  <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate-400" />
                    <div className={`h-full rounded-full transition-all ${sentimentIdx >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.abs(sentimentIdx) / 2}%`, marginLeft: sentimentIdx >= 0 ? '50%' : `${50 + sentimentIdx / 2}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>-100</span><span>0</span><span>+100</span>
                  </div>
                </div>
                <Badge className={`text-xs ${electoralStatus.color.replace('text-', 'bg-').replace('-600', '-100')} ${electoralStatus.color}`}>
                  {electoralStatus.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === DISTRIBUSI SENTIMEN + TOP KATEGORI === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-purple-600" /> Distribusi Sentimen Publik</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-700 font-semibold">🟢 Positif</span>
                  <span className="font-bold">{posCount} berita ({sentimentPct.pos}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded h-4 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded transition-all" style={{ width: `${sentimentPct.pos}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 font-semibold">⚪ Netral</span>
                  <span className="font-bold">{data.sentimentTrend?.neutral || 0} berita ({sentimentPct.neu}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded h-4 overflow-hidden">
                  <div className="bg-slate-400 h-full rounded transition-all" style={{ width: `${sentimentPct.neu}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-red-700 font-semibold">🔴 Negatif</span>
                  <span className="font-bold">{negCount} berita ({sentimentPct.neg}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded h-4 overflow-hidden">
                  <div className="bg-red-500 h-full rounded transition-all" style={{ width: `${sentimentPct.neg}%` }} />
                </div>
              </div>
            </div>
            {negCount > 0 && (
              <div className="mt-3 p-2 rounded bg-red-50 border border-red-200 text-xs text-red-800">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                <strong>Perhatian:</strong> {negCount} berita negatif terdeteksi. Generate konter isu di tab "Monitoring Berita".
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Folder className="w-4 h-4 text-purple-600" /> Top Kategori Isu</CardTitle></CardHeader>
          <CardContent>
            {data.topKategori?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data. Jalankan scan berita.</p>
            ) : (
              <div className="space-y-2">
                {data.topKategori?.map((k: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 shrink-0">{k.category}</Badge>
                    <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden">
                      <div className="bg-purple-500 h-full rounded" style={{ width: `${Math.min(100, (k.count / Math.max(1, totalLinks)) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold w-12 text-right">{k.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === 5 WILAYAH PALING URGENT === */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-5 h-5 text-red-600" /> 5 Wilayah Paling Urgent — Perlu Perhatian DPD/DPC</CardTitle></CardHeader>
        <CardContent>
          {data.topWilayahUrgent?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada data wilayah. Jalankan scan + bulk triage.</p>
          ) : (
            <div className="space-y-2">
              {data.topWilayahUrgent?.map((w: any, i: number) => (
                <div key={i} className={`rounded-lg border p-3 ${w.high > 0 ? 'border-l-4 border-l-red-500 bg-red-50/30' : 'border-l-4 border-l-amber-500 bg-amber-50/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i < 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {i + 1}
                      </div>
                      <span className="font-semibold text-sm">{w.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[11px]">{w.total} berita</Badge>
                      {w.negative > 0 && <Badge variant="outline" className="text-[11px] bg-red-50 text-red-700">🔴 {w.negative} negatif</Badge>}
                      {w.high > 0 && <Badge variant="outline" className="text-[11px] bg-red-100 text-red-800 font-bold">⚠️ {w.high} HIGH</Badge>}
                      {w.engagement > 0 && <Badge variant="outline" className="text-[11px]">💬 {w.engagement}</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === ACTION ITEMS === */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="w-5 h-5 text-orange-600" /> Action Items untuk DPN/DPD/DPC</CardTitle></CardHeader>
        <CardContent>
          {data.actionItems?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada action items. Jalankan scan berita untuk generate rekomendasi.</p>
          ) : (
            <div className="space-y-2">
              {data.actionItems?.map((a: any, i: number) => (
                <div key={i} className={`rounded-lg border p-3 ${a.prioritas === 'TINGGI' ? 'border-red-300 bg-red-50' : a.prioritas === 'SEDANG' ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={`text-[11px] ${a.prioritas === 'TINGGI' ? 'bg-red-600 text-white' : a.prioritas === 'SEDANG' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {a.prioritas}
                    </Badge>
                    {a.wilayah && <Badge variant="outline" className="text-[11px]"><MapPin className="w-2.5 h-2.5 mr-0.5" />{a.wilayah}</Badge>}
                    {a.deadline && <Badge variant="outline" className="text-[11px]"><Calendar className="w-2.5 h-2.5 mr-0.5" />{a.deadline}</Badge>}
                  </div>
                  <p className="text-sm font-medium">{a.aksi}</p>
                  {a.alasan && <p className="text-[12px] text-muted-foreground mt-1 italic">Alasan: {a.alasan}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === TOP PLATFORM + SURVEI AKTIF === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-blue-600" /> Top Platform (Engagement)</CardTitle></CardHeader>
          <CardContent>
            {data.topPlatform?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data.</p>
            ) : (
              <div className="space-y-2">
                {data.topPlatform?.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">{p.platform}</Badge>
                    <span className="text-sm font-semibold">{p.engagement} engagement</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4 text-purple-600" /> Survei/Polling Aktif</CardTitle></CardHeader>
          <CardContent>
            {data.activePolls?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada survei aktif.</p>
            ) : (
              <div className="space-y-2">
                {data.activePolls?.map((p: any) => (
                  <div key={p.id} className="rounded border p-2">
                    <div className="text-sm font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.totalResponses} respon • {p.positiveResponses} positif • {p.negativeResponses} negatif
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === NEW: RINGKASAN DARI SEMUA MENU === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Siaran & Broadcast */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-600" />
              Ringkasan Siaran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Video</span>
                <span className="font-bold">{data.broadcastStats?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">YouTube</span>
                <span className="font-bold text-red-600">{data.broadcastStats?.youtube || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Upload MP4</span>
                <span className="font-bold text-blue-600">{data.broadcastStats?.mp4 || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Draft Konter Isu</span>
                <span className="font-bold text-amber-600">{data.counterDrafts?.length || 0}</span>
              </div>
              {(data.counterDrafts || []).length > 0 && (
                <div className="mt-2 pt-2 border-t space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Draft Terbaru:</div>
                  {(data.counterDrafts || []).slice(0, 3).map((d: any, i: number) => (
                    <div key={i} className="text-xs truncate">
                      📄 {d.title} <span className="text-muted-foreground">({d.wilayah})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Survei & Polling */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              Ringkasan Survei
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Survei</span>
                <span className="font-bold">{data.pollStats?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Survei Aktif</span>
                <span className="font-bold text-emerald-600">{data.pollStats?.active || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Respon</span>
                <span className="font-bold text-blue-600">{data.pollStats?.totalResponses || 0}</span>
              </div>
              {(data.activePolls || []).length > 0 && (
                <div className="mt-2 pt-2 border-t space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Survei Aktif:</div>
                  {(data.activePolls || []).slice(0, 3).map((p: any, i: number) => (
                    <div key={i} className="text-xs truncate">
                      📊 {p.title?.substring(0, 40)} <span className="text-muted-foreground">({p.totalResponses} respon)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monitoring Berita */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-blue-600" />
              Ringkasan Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Berita</span>
                <span className="font-bold">{data.newsStats?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Belum Direview</span>
                <span className="font-bold text-amber-600">{data.newsStats?.new || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sudah Ditangani</span>
                <span className="font-bold text-emerald-600">{data.newsStats?.addressed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ter-map ke Wilayah</span>
                <span className="font-bold text-blue-600">{data.newsStats?.mapped || 0}</span>
              </div>
              {(data.recentNews || []).length > 0 && (
                <div className="mt-2 pt-2 border-t space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Berita Terbaru:</div>
                  {(data.recentNews || []).slice(0, 3).map((n: any, i: number) => (
                    <div key={i} className="text-xs truncate">
                      {n.sentiment === 'NEGATIVE' ? '🔴' : n.sentiment === 'POSITIVE' ? '🟢' : '⚪'} {n.title?.substring(0, 40)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      <Button variant="outline" onClick={loadData} className="w-full">
        <RefreshCw className="w-4 h-4 mr-2" /> Refresh Dashboard
      </Button>
    </div>
  )
}

// ============================================================
// WHATSAPP GATEWAY PROVIDERS DIALOG — Rekomendasi Fonnte, Waboo, Wootalk, dll
// ============================================================
function GatewayProvidersDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<any[]>([])
  const [activeProvider, setActiveProvider] = useState<string>('')
  const [config, setConfig] = useState<any>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [apiKeyForm, setApiKeyForm] = useState({ apiKey: '', apiSecret: '', phoneNumberId: '', displayName: '' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/broadcast-composer/gateway-providers', {
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const data = await res.json()
      if (data.success) {
        setProviders(data.data.providers)
        setActiveProvider(data.data.activeProvider)
        setConfig(data.data.config)
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  const handleSetActive = async (providerId: string) => {
    try {
      const res = await fetch('/api/broadcast-composer/gateway-providers', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ action: 'set_active_provider', providerId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      addToast(`Provider aktif: ${providerId}`, 'success')
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  const handleSaveApiKey = async (providerId: string) => {
    if (!apiKeyForm.apiKey) {
      addToast('API key wajib diisi', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/broadcast-composer/gateway-providers', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({
          action: 'save_api_key',
          providerId,
          apiKey: apiKeyForm.apiKey,
          apiSecret: apiKeyForm.apiSecret || null,
          phoneNumberId: apiKeyForm.phoneNumberId || null,
          displayName: apiKeyForm.displayName || providerId,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      addToast(data.message, 'success')
      setApiKeyForm({ apiKey: '', apiSecret: '', phoneNumberId: '', displayName: '' })
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestProvider = async (providerId: string) => {
    setTesting(true)
    try {
      const res = await fetch('/api/broadcast-composer/gateway-providers', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ action: 'test_provider', providerId }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      addToast(data.message, 'success')
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" /> WhatsApp Gateway Providers — Anti-Banned Recommendations
          </DialogTitle>
          <DialogDescription>
            Untuk broadcast massal ribuan pesan WA tanpa risiko diblokir, integrasikan dengan salah satu provider di bawah.
            Provider Indonesia (Fonnte, Waboo, Wootalk) direkomendasikan untuk harga lokal &amp; support bahasa.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState />
        ) : (
          <div className="space-y-3">
            {/* Active provider banner */}
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <Shield className="w-4 h-4 inline mr-1" />
              <strong>Provider Aktif:</strong> {activeProvider} • Rate limit: {config?.messagesPerMinute}/menit, {config?.messagesPerHour}/jam, {config?.messagesPerDay}/hari
            </div>

            {/* Provider cards */}
            <div className="space-y-3">
              {providers.map(p => (
                <div key={p.id} className={`rounded-lg border-2 p-3 transition-all ${p.isActive ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200'}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-base">{p.name}</span>
                        <Badge variant="outline" className="text-[13px]">{p.country}</Badge>
                        {p.recommended && <Badge className="text-[13px] bg-purple-100 text-purple-800">⭐ RECOMMENDED</Badge>}
                        {p.isActive && <Badge className="text-[13px] bg-emerald-100 text-emerald-800">✓ ACTIVE</Badge>}
                        {p.isConfigured && <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700">🔑 CONFIGURED</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                      <div className="text-[13px] text-muted-foreground mt-1">
                        <strong>Pricing:</strong> {p.pricing} • <strong>API:</strong> <code>{p.apiEndpoint}</code>
                      </div>
                    </div>
                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-1 text-[13px] text-center ml-2">
                      <div className="rounded bg-slate-100 p-1"><div className="font-bold">{p.antiBannedScore}</div><div className="text-[13px]">Anti-Banned</div></div>
                      <div className="rounded bg-slate-100 p-1"><div className="font-bold">{p.scalabilityScore}</div><div className="text-[13px]">Skalabilitas</div></div>
                      <div className="rounded bg-slate-100 p-1"><div className="font-bold">{p.pricingScore}</div><div className="text-[13px]">Harga</div></div>
                      <div className="rounded bg-slate-100 p-1"><div className="font-bold">{p.easeOfUse}</div><div className="text-[13px]">Kemudahan</div></div>
                    </div>
                  </div>

                  {/* Pros/cons */}
                  <div className="grid grid-cols-2 gap-2 text-[13px] mt-2">
                    <div>
                      <div className="font-semibold text-emerald-700 mb-0.5">✅ Pros:</div>
                      <ul className="space-y-0.5">
                        {p.pros.map((pro: string, i: number) => <li key={i}>• {pro}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-amber-700 mb-0.5">⚠️ Cons:</div>
                      <ul className="space-y-0.5">
                        {p.cons.map((con: string, i: number) => <li key={i}>• {con}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.features.map((f: string, i: number) => (
                      <span key={i} className="text-[13px] bg-slate-100 rounded px-1.5 py-0.5">{f}</span>
                    ))}
                  </div>

                  {/* Recommendation reason */}
                  {p.recommendationReason && (
                    <div className="mt-2 rounded bg-purple-50 border border-purple-200 p-2 text-[13px] text-purple-800 italic">
                      💡 {p.recommendationReason}
                    </div>
                  )}

                  {/* Integration steps (expandable) */}
                  {selectedProviderId === p.id && (
                    <div className="mt-2 rounded bg-blue-50 border border-blue-200 p-2 space-y-2">
                      <div className="text-[13px] font-semibold text-blue-800">📋 Langkah Integrasi:</div>
                      <ol className="text-[13px] space-y-0.5 list-decimal ml-4">
                        {p.integrationSteps.map((step: string, i: number) => <li key={i}>{step}</li>)}
                      </ol>

                      <div className="text-[13px] font-semibold text-blue-800 mt-2">🔧 Example API Call:</div>
                      <pre className="text-[13px] bg-white border rounded p-2 overflow-x-auto">
{`${p.examplePayload.method} ${p.examplePayload.url}
Headers: ${JSON.stringify(p.examplePayload.headers, null, 2)}
Body: ${JSON.stringify(p.examplePayload.body, null, 2)}`}
                      </pre>

                      {/* API key form */}
                      <div className="mt-2 rounded bg-white border p-2 space-y-2">
                        <div className="text-[13px] font-semibold">🔑 Konfigurasi API Key untuk {p.name}:</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="password" placeholder="API Key / Token" value={apiKeyForm.apiKey}
                            onChange={(e) => setApiKeyForm({ ...apiKeyForm, apiKey: e.target.value })} className="h-8 text-xs" />
                          {(p.id === 'WOOTALK' || p.id === 'WHATSAPP_BUSINESS_API') && (
                            <Input type="password" placeholder="API Secret / Access Token" value={apiKeyForm.apiSecret}
                              onChange={(e) => setApiKeyForm({ ...apiKeyForm, apiSecret: e.target.value })} className="h-8 text-xs" />
                          )}
                          {(p.id === 'WOOTALK' || p.id === 'WHATSAPP_BUSINESS_API') && (
                            <Input placeholder="Phone Number ID" value={apiKeyForm.phoneNumberId}
                              onChange={(e) => setApiKeyForm({ ...apiKeyForm, phoneNumberId: e.target.value })} className="h-8 text-xs" />
                          )}
                          <Input placeholder="Display Name (cth: LAPRA 08 WA)" value={apiKeyForm.displayName}
                            onChange={(e) => setApiKeyForm({ ...apiKeyForm, displayName: e.target.value })} className="h-8 text-xs" />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveApiKey(p.id)} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                            Simpan API Key
                          </Button>
                          {p.isConfigured && (
                            <Button size="sm" variant="outline" onClick={() => handleTestProvider(p.id)} disabled={testing} className="h-8 text-xs">
                              {testing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                              Test Koneksi
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    {!p.isActive && (
                      <Button size="sm" onClick={() => handleSetActive(p.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Set sebagai Active
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => setSelectedProviderId(selectedProviderId === p.id ? null : p.id)}>
                      {selectedProviderId === p.id ? '▲ Sembunyikan' : '▼ Lihat Detail & Setup'}
                    </Button>
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="ml-auto">
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <ExternalLink className="w-3 h-3 mr-1" /> {p.website.replace('https://', '')}
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Anti-banned tips */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              <strong>Tips Anti-Banned WhatsApp:</strong>
              <ol className="list-decimal ml-6 mt-1 space-y-0.5">
                <li>Gunakan device/number rotation (jangan 1 nomor untuk 1000+ pesan/hari)</li>
                <li>Random delay 3-10 detik antar pesan (sudah otomatis di sistem kami)</li>
                <li>Batch processing: 20 pesan per batch, jeda 1 menit antar batch</li>
                <li>Personalisasi pesan dengan {`{nama}`} {`{wilayah}`} (sudah otomatis)</li>
                <li>Hindari pesan identik 100% (variasikan greeting)</li>
                <li>Pastikan kontak sudah opt-in (sudah otomatis di sistem kami)</li>
                <li>Untuk skala 10.000+ pesan/hari: gunakan multiple device/account (Fonnte &amp; Waboo support ini)</li>
                <li>Wootalk &amp; WhatsApp Business API = zero banned risk (official partner)</li>
              </ol>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// KEYWORD & HASHTAG MANAGER DIALOG
// ============================================================
// Mengelola keyword/hashtag/mention yang dipakai AI untuk monitoring medsos.
// Storage: SystemSetting key='medsos_keywords' (lihat /api/medsos-keywords)
//
// Fitur:
// - List dengan filter (type, category, active, search)
// - Statistik ringkas (total, aktif, per type, per kategori)
// - Tambah tunggal & bulk paste
// - Edit inline (toggle active, ganti priority/category)
// - Hapus tunggal & bulk
// - Import preset politik (Prabowo, Gerindra, LAPRA 08, dll)
// ============================================================

const KEYWORD_TYPES = [
  { value: 'KEYWORD', label: 'Keyword', desc: 'Kata/frasa umum', prefix: '' },
  { value: 'HASHTAG', label: 'Hashtag', desc: 'Diawali #', prefix: '#' },
  { value: 'MENTION', label: 'Mention', desc: 'Akun @', prefix: '@' },
] as const

const KEYWORD_CATEGORIES = [
  { value: 'POLITIK', label: 'Politik', color: 'bg-purple-50 text-purple-700' },
  { value: 'EKONOMI', label: 'Ekonomi', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'SOSIAL', label: 'Sosial', color: 'bg-blue-50 text-blue-700' },
  { value: 'HANKAM', label: 'Hankam', color: 'bg-red-50 text-red-700' },
  { value: 'PEMERINTAHAN', label: 'Pemerintahan', color: 'bg-amber-50 text-amber-700' },
  { value: 'LAINNYA', label: 'Lainnya', color: 'bg-slate-50 text-slate-700' },
] as const

const KEYWORD_PRIORITIES = [
  { value: 'HIGH', label: 'Tinggi', color: 'bg-red-100 text-red-800' },
  { value: 'MEDIUM', label: 'Sedang', color: 'bg-amber-100 text-amber-800' },
  { value: 'LOW', label: 'Rendah', color: 'bg-slate-100 text-slate-800' },
] as const

function KeywordHashtagManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore.getState().user
  const canEdit = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_DPN'

  const [keywords, setKeywords] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterActive, setFilterActive] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  // Add form state
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [formData, setFormData] = useState({
    text: '',
    type: 'KEYWORD' as 'KEYWORD' | 'HASHTAG' | 'MENTION',
    category: 'POLITIK',
    priority: 'MEDIUM',
    notes: '',
    isActive: true,
  })
  const [bulkText, setBulkText] = useState('')
  const [bulkType, setBulkType] = useState<'KEYWORD' | 'HASHTAG' | 'MENTION'>('HASHTAG')
  const [bulkCategory, setBulkCategory] = useState('POLITIK')
  const [bulkPriority, setBulkPriority] = useState('MEDIUM')

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>(null)

  // Selection for bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'ALL') params.set('type', filterType)
      if (filterCategory !== 'ALL') params.set('category', filterCategory)
      if (filterActive !== 'ALL') params.set('active', filterActive)
      if (search.trim()) params.set('q', search.trim())
      const res = await api(`/api/medsos-keywords?${params.toString()}`, { keepWrapper: true })
      if (res?.success) {
        setKeywords(res.data || [])
        setStats(res.stats || null)
      } else {
        addToast(res?.error || 'Gagal memuat keyword', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [filterType, filterCategory, filterActive, search, addToast])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  // === Add single ===
  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.text.trim()) {
      addToast('Text keyword wajib diisi', 'error')
      return
    }
    try {
      const res = await api('/api/medsos-keywords', {
        method: 'POST',
        body: JSON.stringify(formData),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Keyword ditambahkan', 'success')
        setFormData({ ...formData, text: '', notes: '' })
        loadData()
      } else {
        addToast(res?.error || 'Gagal menambah keyword', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Add bulk ===
  const handleAddBulk = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      addToast('Paste minimal 1 keyword (1 per baris)', 'error')
      return
    }
    try {
      const res = await api('/api/medsos-keywords', {
        method: 'POST',
        body: JSON.stringify({
          action: 'bulk',
          items: lines.map(text => ({
            text,
            type: bulkType,
            category: bulkCategory,
            priority: bulkPriority,
            isActive: true,
          })),
        }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || `${res.addedCount} keyword ditambahkan`, 'success')
        setBulkText('')
        loadData()
      } else {
        addToast(res?.error || 'Gagal bulk add', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Import preset politik ===
  const handleImportPreset = async () => {
    if (!confirm('Import 12 preset keyword politik (Prabowo, Gerindra, LAPRA 08, Kabinet Merah Putih, dll)? Keyword yang sudah ada akan dilewati.')) return
    try {
      const res = await api('/api/medsos-keywords', {
        method: 'POST',
        body: JSON.stringify({ action: 'preset_politik' }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || `${res.addedCount} preset ditambahkan`, 'success')
        loadData()
      } else {
        addToast(res?.error || 'Gagal import preset', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Toggle active ===
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await api('/api/medsos-keywords', {
        method: 'PATCH',
        body: JSON.stringify({ id, isActive: !currentActive }),
        keepWrapper: true,
      })
      if (res?.success) {
        loadData()
      } else {
        addToast(res?.error || 'Gagal toggle status', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Edit save ===
  const handleSaveEdit = async () => {
    if (!editId || !editData) return
    try {
      const res = await api('/api/medsos-keywords', {
        method: 'PATCH',
        body: JSON.stringify({ id: editId, ...editData }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Keyword diperbarui', 'success')
        setEditId(null)
        setEditData(null)
        loadData()
      } else {
        addToast(res?.error || 'Gagal update keyword', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Delete single ===
  const handleDelete = async (id: string, text: string) => {
    if (!confirm(`Hapus keyword "${text}"?`)) return
    try {
      const res = await api('/api/medsos-keywords', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Keyword dihapus', 'success')
        loadData()
      } else {
        addToast(res?.error || 'Gagal hapus keyword', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Bulk delete ===
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      addToast('Pilih keyword dulu dengan centang checkbox', 'info')
      return
    }
    if (!confirm(`Hapus ${selectedIds.size} keyword terpilih?`)) return
    try {
      const res = await api('/api/medsos-keywords', {
        method: 'DELETE',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || `${res.deletedCount} keyword dihapus`, 'success')
        setSelectedIds(new Set())
        loadData()
      } else {
        addToast(res?.error || 'Gagal bulk delete', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Toggle selection ===
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startEdit = (kw: any) => {
    setEditId(kw.id)
    setEditData({ text: kw.text, type: kw.type, category: kw.category, priority: kw.priority, notes: kw.notes || '', isActive: kw.isActive })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-600" />
            Atur Keyword AI &amp; Hashtag
          </DialogTitle>
          <DialogDescription>
            Konfigurasi keyword/hashtag/mention yang dipakai AI untuk memantau percakapan publik di media sosial.
            Keyword di sini menjadi dasar filter <strong>Feed Viral</strong>, <strong>Word Cloud</strong>, dan sumber
            inspirasi <strong>AI Generate Pertanyaan Survei</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* === STATISTIK === */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Keyword</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Aktif</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
              <div className="text-[11px] text-muted-foreground">{stats.total - stats.active} nonaktif</div>
            </div>
            <div className="rounded-lg border bg-card p-3 col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Komposisi Tipe</div>
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="outline" className="bg-blue-50 text-blue-700">Keyword: {stats.byType.KEYWORD}</Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700">Hashtag: {stats.byType.HASHTAG}</Badge>
                <Badge variant="outline" className="bg-cyan-50 text-cyan-700">Mention: {stats.byType.MENTION}</Badge>
              </div>
            </div>
          </div>
        )}

        {/* === ALERT: Read-only untuk non-DPN === */}
        {!canEdit && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Anda dalam mode <strong>read-only</strong>. Hanya admin DPN yang bisa menambah/mengubah/menghapus keyword.
          </div>
        )}

        {/* === ADD FORM (only for DPN) === */}
        {canEdit && (
          <div className="rounded-lg border bg-slate-50/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold">Tambah Keyword</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant={addMode === 'single' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setAddMode('single')}>Tunggal</Button>
                <Button size="sm" variant={addMode === 'bulk' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setAddMode('bulk')}>Bulk Paste</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={handleImportPreset}>
                  <Sparkles className="w-3 h-3 mr-1" /> Preset Politik
                </Button>
              </div>
            </div>

            {addMode === 'single' ? (
              <form onSubmit={handleAddSingle} className="space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <Label className="text-xs">Text</Label>
                    <Input
                      value={formData.text}
                      onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                      placeholder={formData.type === 'HASHTAG' ? 'LAPRA08 (otomatis jadi #LAPRA08)' : formData.type === 'MENTION' ? 'prabowo (otomatis jadi @prabowo)' : 'Prabowo Subianto'}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tipe</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KEYWORD_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label} ({t.desc})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Prioritas</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KEYWORD_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value} className="text-sm">{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Kategori</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KEYWORD_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Catatan (opsional)</Label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Contoh: Tokoh utama LAPRA 08"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="rounded"
                      />
                      Aktif
                    </label>
                  </div>
                </div>
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-3 h-3 mr-1" /> Tambah Keyword
                </Button>
              </form>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Tipe</Label>
                    <Select value={bulkType} onValueChange={(v) => setBulkType(v as any)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KEYWORD_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Kategori</Label>
                    <Select value={bulkCategory} onValueChange={(v) => setBulkCategory(v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KEYWORD_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Prioritas</Label>
                    <Select value={bulkPriority} onValueChange={(v) => setBulkPriority(v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {KEYWORD_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value} className="text-sm">{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Paste 1 keyword per baris...&#10;Contoh (jika tipe Hashtag):&#10;Prabowo2024&#10;Gerindra&#10;LAPRA08&#10;KabinetMerahPutih"
                  className="text-sm min-h-[100px] font-mono"
                />
                <Button size="sm" onClick={handleAddBulk} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-3 h-3 mr-1" /> Tambah Semua
                </Button>
              </div>
            )}
          </div>
        )}

        {/* === FILTERS === */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-sm">Semua Tipe</SelectItem>
              {KEYWORD_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-sm">Semua Kategori</SelectItem>
              {KEYWORD_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-sm">Semua Status</SelectItem>
              <SelectItem value="true" className="text-sm">Aktif saja</SelectItem>
              <SelectItem value="false" className="text-sm">Nonaktif saja</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Cari text atau catatan..."
            className="h-8 text-sm"
          />
        </div>

        {/* === KEYWORD LIST === */}
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : keywords.length === 0 ? (
          <EmptyState
            icon={Hash}
            title="Belum ada keyword"
            description={canEdit
              ? 'Klik "Preset Politik" untuk import cepat 12 keyword standar, atau tambah manual di atas.'
              : 'Admin DPN belum menambahkan keyword. Hubungi admin DPN untuk konfigurasi.'}
          />
        ) : (
          <>
            {/* Bulk action bar */}
            {canEdit && selectedIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                <span className="text-sm text-red-800 font-medium">{selectedIds.size} dipilih</span>
                <Button size="sm" variant="destructive" className="h-7 text-xs ml-auto" onClick={handleBulkDelete}>
                  <Trash2 className="w-3 h-3 mr-1" /> Hapus Terpilih
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>Batal</Button>
              </div>
            )}

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canEdit && <TableHead className="w-8"></TableHead>}
                    <TableHead className="text-xs">Text</TableHead>
                    <TableHead className="text-xs w-20">Tipe</TableHead>
                    <TableHead className="text-xs w-24">Kategori</TableHead>
                    <TableHead className="text-xs w-20">Prioritas</TableHead>
                    <TableHead className="text-xs w-16">Status</TableHead>
                    <TableHead className="text-xs w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.map((kw) => {
                    const isEditing = editId === kw.id
                    const isSelected = selectedIds.has(kw.id)
                    const typeMeta = KEYWORD_TYPES.find(t => t.value === kw.type)
                    const catMeta = KEYWORD_CATEGORIES.find(c => c.value === kw.category)
                    const priMeta = KEYWORD_PRIORITIES.find(p => p.value === kw.priority)

                    if (isEditing && editData) {
                      return (
                        <TableRow key={kw.id} className="bg-blue-50/50">
                          {canEdit && <TableCell></TableCell>}
                          <TableCell>
                            <Input
                              value={editData.text}
                              onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                              className="h-7 text-sm"
                            />
                            <Input
                              value={editData.notes}
                              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                              placeholder="Catatan..."
                              className="h-7 text-xs mt-1"
                            />
                          </TableCell>
                          <TableCell>
                            <Select value={editData.type} onValueChange={(v) => setEditData({ ...editData, type: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {KEYWORD_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {KEYWORD_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={editData.priority} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {KEYWORD_PRIORITIES.map(p => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editData.isActive}
                                onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                              />
                              {editData.isActive ? 'Aktif' : 'Off'}
                            </label>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveEdit}>
                                <CheckCircle2 className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditId(null); setEditData(null) }}>
                                Batal
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <TableRow key={kw.id} className={isSelected ? 'bg-blue-50/40' : ''}>
                        {canEdit && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(kw.id)}
                              className="rounded"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-mono text-sm font-medium">{kw.text}</div>
                          {kw.notes && <div className="text-xs text-muted-foreground italic">{kw.notes}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${typeMeta?.value === 'HASHTAG' ? 'bg-purple-50 text-purple-700' : typeMeta?.value === 'MENTION' ? 'bg-cyan-50 text-cyan-700' : 'bg-blue-50 text-blue-700'}`}>
                            {typeMeta?.label || kw.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${catMeta?.color || ''}`}>{catMeta?.label || kw.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${priMeta?.color || ''}`}>{priMeta?.label || kw.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <button
                              onClick={() => handleToggleActive(kw.id, kw.isActive)}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${kw.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${kw.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {kw.isActive ? 'Aktif' : 'Off'}
                            </button>
                          ) : (
                            <Badge variant="outline" className={`text-xs ${kw.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {kw.isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => startEdit(kw)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => handleDelete(kw.id, kw.text)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Menampilkan {keywords.length} keyword
              {stats && ` dari total ${stats.total}`}
            </div>
          </>
        )}

        {/* === INFO FOOTER === */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          <Brain className="w-4 h-4 inline mr-1" />
          <strong>Cara kerja:</strong> AI secara berkala mengambil percakapan publik dari medsos yang mengandung keyword di atas,
          lalu menganalisis sentimen &amp; klaster opini. Hasilnya tampil di <em>SurveyOutputDashboard → Medsos (Tren Sentimen, Feed Viral, Word Cloud)</em>.
          Keyword <code>High Priority</code> dipantau lebih sering (setiap 30 menit), <code>Medium</code> setiap 2 jam, <code>Low</code> setiap 6 jam.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// SURVEYOR MANAGER DIALOG — Kelola Akun & Wilayah Surveyor
// ============================================================
// CRUD surveyor lapangan. Pakai API /api/surveyors (SystemSetting storage).
//
// Fitur:
// - List surveyor dengan filter (active, search)
// - Tambah surveyor: pilih user + territory (multi-select)
// - Assign survei ke surveyor (multi-select dari poll aktif)
// - Toggle aktif/nonaktif
// - Hapus assignment
// - Statistik (total, aktif, never synced, total respon)
// ============================================================
function SurveyorManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore.getState().user
  const canManage = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN_DPN' || user?.role === 'ADMIN_DPD'

  const [surveyors, setSurveyors] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<string>('ALL')

  // Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [territories, setTerritories] = useState<any[]>([])
  const [polls, setPolls] = useState<any[]>([])
  const [addForm, setAddForm] = useState({
    userId: '',
    territoryIds: [] as string[],
    assignedPollIds: [] as string[],
    notes: '',
    isActive: true,
  })
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editPollIds, setEditPollIds] = useState<string[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterActive !== 'ALL') params.set('active', filterActive)
      if (search.trim()) params.set('q', search.trim())
      const res = await api(`/api/surveyors?${params.toString()}`, { keepWrapper: true })
      if (res?.success) {
        setSurveyors(res.data || [])
        setStats(res.stats || null)
      } else {
        addToast(res?.error || 'Gagal memuat surveyor', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [filterActive, search, addToast])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  // Load options for add form
  const loadOptions = useCallback(async () => {
    try {
      // Pakai keepWrapper untuk konsistensi (beberapa endpoint return { success, data })
      const [usersRes, terrRes, pollsRes] = await Promise.all([
        api('/api/users', { keepWrapper: true }),
        api('/api/territory', { keepWrapper: true }),
        api('/api/essay-polls'),  // essay-polls GET return array langsung (unwrap OK)
      ])
      if (usersRes?.success) setUsers(usersRes.data || [])
      if (terrRes?.success) setTerritories(terrRes.data || [])
      if (Array.isArray(pollsRes)) setPolls(pollsRes.filter((p: any) => p.status === 'ACTIVE' || p.status === 'DRAFT'))
      else if (pollsRes?.data) setPolls((pollsRes.data || []).filter((p: any) => p.status === 'ACTIVE' || p.status === 'DRAFT'))
    } catch (e: any) {
      addToast('Gagal memuat opsi: ' + e.message, 'error')
    }
  }, [addToast])

  useEffect(() => {
    if (open && canManage && showAddForm) loadOptions()
  }, [open, canManage, showAddForm, loadOptions])

  // === Add new surveyor ===
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.userId) {
      addToast('Pilih user terlebih dahulu', 'error')
      return
    }
    if (addForm.territoryIds.length === 0) {
      addToast('Pilih minimal 1 wilayah', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await api('/api/surveyors', {
        method: 'POST',
        body: JSON.stringify(addForm),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Surveyor ditambahkan', 'success')
        setAddForm({ userId: '', territoryIds: [], assignedPollIds: [], notes: '', isActive: true })
        setShowAddForm(false)
        loadData()
      } else {
        addToast(res?.error || 'Gagal menambah surveyor', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // === Toggle active ===
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await api('/api/surveyors', {
        method: 'PATCH',
        body: JSON.stringify({ id, isActive: !currentActive }),
        keepWrapper: true,
      })
      if (res?.success) {
        loadData()
      } else {
        addToast(res?.error || 'Gagal toggle status', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Save edit (polls assignment) ===
  const handleSaveEdit = async (surveyorId: string) => {
    try {
      const res = await api('/api/surveyors', {
        method: 'PATCH',
        body: JSON.stringify({ id: surveyorId, assignedPollIds: editPollIds }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Tugas survei diperbarui', 'success')
        setEditId(null)
        setEditPollIds([])
        loadData()
      } else {
        addToast(res?.error || 'Gagal update tugas', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Delete ===
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus ${name} dari daftar surveyor? Respon yang sudah dikumpulkan tetap tersimpan.`)) return
    try {
      const res = await api('/api/surveyors', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Surveyor dihapus', 'success')
        loadData()
      } else {
        addToast(res?.error || 'Gagal hapus surveyor', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // === Toggle selection in multi-select ===
  const toggleArrayValue = (arr: string[], value: string): string[] => {
    return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
  }

  const startEdit = (svy: any) => {
    setEditId(svy.id)
    setEditPollIds(svy.assignedPollIds || [])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            Kelola Akun &amp; Wilayah Surveyor
          </DialogTitle>
          <DialogDescription>
            Daftar surveyor lapangan yang bertugas mengumpulkan data door-to-door. Setiap surveyor bisa ditugaskan
            ke beberapa wilayah dan beberapa survei aktif.
          </DialogDescription>
        </DialogHeader>

        {/* === STATISTIK === */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Surveyor</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Aktif</div>
              <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Belum Sync</div>
              <div className="text-2xl font-bold text-amber-600">{stats.neverSynced}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Respon</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalResponses}</div>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">Total Tugas</div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalAssignedSurveys}</div>
            </div>
          </div>
        )}

        {/* === ALERT: Read-only === */}
        {!canManage && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Anda dalam mode <strong>read-only</strong>. Hanya admin DPN/DPD yang bisa mengelola surveyor.
          </div>
        )}

        {/* === ACTION BAR === */}
        <div className="flex gap-2 flex-wrap">
          {canManage && (
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> {showAddForm ? 'Tutup Form' : 'Tambah Surveyor'}
            </Button>
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Cari nama / telepon / wilayah..."
            className="h-8 text-sm max-w-xs ml-auto"
          />
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-sm">Semua</SelectItem>
              <SelectItem value="true" className="text-sm">Aktif</SelectItem>
              <SelectItem value="false" className="text-sm">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* === ADD FORM === */}
        {canManage && showAddForm && (
          <form onSubmit={handleAdd} className="rounded-lg border bg-orange-50/30 p-3 space-y-3">
            <div className="text-sm font-semibold text-orange-800">Form Penugasan Surveyor Baru</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pilih User (anggota/admin)</Label>
                <Select value={addForm.userId} onValueChange={(v) => setAddForm({ ...addForm, userId: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih user..." /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-sm">
                        {u.fullName} — {u.role} {u.territory?.name ? `(${u.territory.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Catatan (opsional)</Label>
                <Input
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Contoh: Surveyor khusus kecamatan X"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Wilayah Tugas (pilih satu atau beberapa)</Label>
              <div className="mt-1 max-h-32 overflow-y-auto rounded border bg-white p-2 space-y-1">
                {territories.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">Memuat wilayah...</div>
                ) : (
                  territories.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={addForm.territoryIds.includes(t.id)}
                        onChange={() => setAddForm({
                          ...addForm,
                          territoryIds: toggleArrayValue(addForm.territoryIds, t.id),
                        })}
                      />
                      <span className="font-medium">{t.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">{t.level}</Badge>
                    </label>
                  ))
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{addForm.territoryIds.length} wilayah dipilih</div>
            </div>

            <div>
              <Label className="text-xs">Survei yang Ditugaskan (opsional, bisa diisi nanti)</Label>
              <div className="mt-1 max-h-32 overflow-y-auto rounded border bg-white p-2 space-y-1">
                {polls.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">Belum ada survei aktif</div>
                ) : (
                  polls.map(p => (
                    <label key={p.id} className="flex items-start gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={addForm.assignedPollIds.includes(p.id)}
                        onChange={() => setAddForm({
                          ...addForm,
                          assignedPollIds: toggleArrayValue(addForm.assignedPollIds, p.id),
                        })}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.title}</div>
                        <div className="text-[10px] text-muted-foreground">{p.status}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{addForm.assignedPollIds.length} survei dipilih</div>
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.isActive}
                onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })}
              />
              Aktifkan langsung (surveyor bisa langsung sync)
            </label>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                {saving ? 'Menyimpan...' : 'Tambah Surveyor'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Batal</Button>
            </div>
          </form>
        )}

        {/* === SURVEYOR LIST === */}
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : surveyors.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada surveyor"
            description={canManage
              ? 'Klik "Tambah Surveyor" untuk mendaftarkan anggota sebagai surveyor lapangan.'
              : 'Admin DPN/DPD belum menambahkan surveyor.'}
          />
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nama Surveyor</TableHead>
                  <TableHead className="text-xs">Wilayah Tugas</TableHead>
                  <TableHead className="text-xs w-24">Survei</TableHead>
                  <TableHead className="text-xs w-20">Respon</TableHead>
                  <TableHead className="text-xs w-28">Sync Terakhir</TableHead>
                  <TableHead className="text-xs w-16">Status</TableHead>
                  <TableHead className="text-xs w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveyors.map(svy => {
                  const isEditing = editId === svy.id
                  return (
                    <TableRow key={svy.id} className={svy.isActive ? '' : 'opacity-60'}>
                      <TableCell>
                        <div className="font-medium text-sm">{svy.fullName}</div>
                        {svy.phone && <div className="text-xs text-muted-foreground">📞 {svy.phone}</div>}
                        {svy.notes && <div className="text-xs italic text-orange-700 mt-0.5">{svy.notes}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {svy.territoryNames.map((name: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-blue-50 text-blue-700">{name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {polls.map(p => (
                              <label key={p.id} className="flex items-center gap-1 text-[11px] cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editPollIds.includes(p.id)}
                                  onChange={() => setEditPollIds(toggleArrayValue(editPollIds, p.id))}
                                />
                                <span className="truncate">{p.title}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                            {svy.assignedPollIds.length} survei
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-blue-600">{svy.responsesCount || 0}</span>
                      </TableCell>
                      <TableCell>
                        {svy.lastSyncAt ? (
                          <span className="text-xs">{formatDateTimeID(svy.lastSyncAt)}</span>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">Belum pernah</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <button
                            onClick={() => handleToggleActive(svy.id, svy.isActive)}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${svy.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${svy.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {svy.isActive ? 'Aktif' : 'Off'}
                          </button>
                        ) : (
                          <Badge variant="outline" className={`text-xs ${svy.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {svy.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <div className="flex gap-1">
                            {isEditing ? (
                              <>
                                <Button size="sm" className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleSaveEdit(svy.id)}>
                                  <CheckCircle2 className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => { setEditId(null); setEditPollIds([]) }}>
                                  ✕
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => startEdit(svy)} title="Edit survei yang ditugaskan">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => handleDelete(svy.id, svy.fullName)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* === INFO FOOTER === */}
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-900">
          <MapPin className="w-4 h-4 inline mr-1" />
          <strong>Cara kerja:</strong> Surveyor yang ditugaskan akan menerima daftar survei aktif via
          endpoint <code>/api/surveyor-feed/&lt;userId&gt;</code>. Mereka bisa akses feed ini lewat browser HP
          atau aplikasi mobile khusus (lihat dialog <em>Sinkronisasi ke HP Surveyor</em> untuk URL &amp; QR code).
          Respon yang dikirim surveyor otomatis tercatat anonymous (UU PDP No. 27/2022 compliance).
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// SURVEYOR SYNC DIALOG — Status Sinkronisasi & URL Feed
// ============================================================
// Menampilkan:
// - URL feed untuk setiap surveyor (bisa dibuka di HP)
// - QR code URL feed (untuk scan dengan HP)
// - Status sync terakhir per surveyor
// - Tombol "Test Sync" untuk trigger sync manual
// ============================================================
function SurveyorSyncDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [surveyors, setSurveyors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({})
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api('/api/surveyors?active=true', { keepWrapper: true })
      if (res?.success) {
        setSurveyors(res.data || [])
      } else {
        addToast(res?.error || 'Gagal memuat surveyor', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  // Generate QR code for a surveyor's feed URL
  const generateQR = async (userId: string, url: string) => {
    if (qrDataUrls[userId]) return
    try {
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: { dark: '#1f2937', light: '#ffffff' },
      })
      setQrDataUrls(prev => ({ ...prev, [userId]: dataUrl }))
    } catch (e: any) {
      console.error('[QR] Error:', e)
      addToast('Gagal generate QR: ' + e.message, 'error')
    }
  }

  // Manual sync trigger
  const handleTestSync = async (userId: string) => {
    try {
      const res = await fetch(`/api/surveyor-feed/${userId}`)
      const data = await res.json()
      if (data.success) {
        addToast(`Sync berhasil untuk ${data.data.surveyor.fullName}. ${data.data.activeSurveys.length} survei aktif.`, 'success')
        loadData()
      } else {
        addToast(data.error || 'Sync gagal', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  // Copy URL to clipboard
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      addToast('URL feed disalin ke clipboard', 'success')
    } catch {
      addToast('Gagal menyalin URL', 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-600" />
            Sinkronisasi ke HP Surveyor
          </DialogTitle>
          <DialogDescription>
            Setiap surveyor memiliki URL feed unik. URL ini bisa dibuka di browser HP atau di-scan via QR code
            untuk langsung pull daftar survei aktif yang harus dikerjakan.
          </DialogDescription>
        </DialogHeader>

        {/* === CARA KERJA === */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          <strong>📋 Cara Pakai (untuk Surveyor):</strong>
          <ol className="list-decimal ml-5 mt-1 space-y-0.5">
            <li>Buka URL feed (atau scan QR code) di HP</li>
            <li>Sistem otomatis pull daftar survei aktif yang ditugaskan</li>
            <li>Untuk setiap survei: baca pertanyaan, wawancara responden, isi jawaban essay</li>
            <li>Klik <strong>Submit</strong> — respon tersimpan anonymous + counter surveyor bertambah</li>
            <li>Sync ulang secara berkala untuk cek survei baru</li>
          </ol>
        </div>

        {/* === SURVEYOR LIST === */}
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : surveyors.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Belum ada surveyor aktif"
            description="Tambahkan surveyor lewat dialog 'Kelola Akun & Wilayah Surveyor' terlebih dahulu."
          />
        ) : (
          <div className="space-y-2">
            {surveyors.map(svy => {
              // === FASE 3.2: URL ke halaman UI (bukan API JSON) ===
              // Sebelumnya: /api/surveyor-feed/[userId] → JSON mentah (tidak bisa dikerjakan)
              // Sekarang: /surveyor/[userId] → halaman UI lengkap dengan form
              const feedUrl = `${origin}/surveyor/${svy.userId}`
              const isExpanded = expandedId === svy.id
              return (
                <Card key={svy.id} className="border-orange-200">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm">{svy.fullName}</span>
                          {svy.lastSyncAt ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Sync: {formatDateTimeID(svy.lastSyncAt)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Belum sync
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
                            {svy.responsesCount || 0} respon
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">
                            {svy.assignedPollIds.length} tugas
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{feedUrl}</div>
                        {/* Territory tags */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {svy.territoryNames.map((name: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{name}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setExpandedId(isExpanded ? null : svy.id)}>
                          {isExpanded ? '▲ Sembunyikan' : '▼ Lihat QR & Sync'}
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-orange-100 grid md:grid-cols-2 gap-3">
                        {/* QR Code */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold">📷 QR Code Feed</div>
                          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white border">
                            {qrDataUrls[svy.userId] ? (
                              <img src={qrDataUrls[svy.userId]} alt="QR Code" className="w-40 h-40" />
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => generateQR(svy.userId, feedUrl)}>
                                Generate QR Code
                              </Button>
                            )}
                            <div className="text-[10px] text-muted-foreground text-center">
                              Scan dengan HP kamera → buka URL feed
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold">⚡ Aksi</div>
                          <div className="flex flex-col gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs justify-start" onClick={() => window.open(feedUrl, '_blank')}>
                              <ExternalLink className="w-3 h-3 mr-1" /> Buka Feed di Tab Baru
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs justify-start" onClick={() => handleCopyUrl(feedUrl)}>
                              <Copy className="w-3 h-3 mr-1" /> Copy URL
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs justify-start bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={() => handleTestSync(svy.userId)}>
                              <RefreshCw className="w-3 h-3 mr-1" /> Test Sync Manual
                            </Button>
                          </div>

                          <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-700 mt-2">
                            <div><strong>Device Info:</strong></div>
                            {svy.deviceInfo ? (
                              <>
                                <div>Platform: {svy.deviceInfo.platform || 'unknown'}</div>
                                <div>Last seen: {svy.deviceInfo.lastSeen ? formatDateTimeID(svy.deviceInfo.lastSeen) : '—'}</div>
                                <div className="truncate">UA: {svy.deviceInfo.userAgent || '—'}</div>
                              </>
                            ) : (
                              <div className="italic text-muted-foreground">Belum ada info device (surveyor belum pernah sync)</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* === INFO FOOTER === */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          <strong>Catatan keamanan:</strong> URL feed bersifat <em>semi-publik</em> — siapa saja yang punya URL
          bisa pull daftar survei &amp; submit respon. Namun URL mengandung ID acak (cuid) sehingga sulit ditebak.
          Untuk keamanan lebih ketat, nonaktifkan surveyor yang sudah selesai tugas via dialog Kelola Surveyor.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// FASE 3.3.8: POLL CONFIG DIALOG (set pollType + options)
// ============================================================
// Admin set tipe poll: ESSAY | MULTIPLE_CHOICE | LIKERT
// Untuk MC: input options (min 2, max 10)
// Untuk LIKERT: pilih skala (3-7) + label per skala
//
// Storage: SystemSetting key='poll_config_[pollId]' (no DB migration)
// API: PUT /api/essay-polls/[id]/config
// ============================================================
function PollConfigDialog({ poll, onClose }: { poll: any; onClose: () => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pollType, setPollType] = useState<'ESSAY' | 'MULTIPLE_CHOICE' | 'LIKERT'>('ESSAY')
  const [options, setOptions] = useState<string[]>(['', '']) // default 2 empty
  const [likertScale, setLikertScale] = useState(5)
  const [likertLabels, setLikertLabels] = useState<string[]>([
    'Sangat Tidak Setuju', 'Tidak Setuju', 'Netral', 'Setuju', 'Sangat Setuju'
  ])

  // Load existing config saat dialog buka
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true)
      try {
        const res = await api(`/api/essay-polls/${poll.id}/config`, { keepWrapper: true })
        if (res?.success && res.data) {
          setPollType(res.data.pollType || 'ESSAY')
          if (res.data.options && Array.isArray(res.data.options) && res.data.options.length > 0) {
            setOptions(res.data.options)
          }
          if (res.data.likertScale) setLikertScale(res.data.likertScale)
          if (res.data.likertLabels && Array.isArray(res.data.likertLabels)) {
            setLikertLabels(res.data.likertLabels)
          }
        }
      } catch (e: any) {
        addToast('Gagal memuat config: ' + e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [poll.id, addToast])

  // Handler untuk options
  const addOption = () => {
    if (options.length >= 10) {
      addToast('Maksimal 10 opsi', 'info')
      return
    }
    setOptions([...options, ''])
  }
  const removeOption = (idx: number) => {
    if (options.length <= 2) {
      addToast('Minimal 2 opsi', 'info')
      return
    }
    setOptions(options.filter((_, i) => i !== idx))
  }
  const updateOption = (idx: number, value: string) => {
    const next = [...options]
    next[idx] = value
    setOptions(next)
  }

  // Handler untuk likert scale change
  const handleScaleChange = (newScale: number) => {
    setLikertScale(newScale)
    // Adjust labels array
    if (newScale > likertLabels.length) {
      // Tambah label default
      const additions = Array.from({ length: newScale - likertLabels.length }, (_, i) =>
        `Skala ${likertLabels.length + i + 1}`
      )
      setLikertLabels([...likertLabels, ...additions])
    } else if (newScale < likertLabels.length) {
      // Trim labels
      setLikertLabels(likertLabels.slice(0, newScale))
    }
  }

  // Save config
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = { pollType }
      if (pollType === 'MULTIPLE_CHOICE') {
        const cleanOptions = options.map(o => o.trim()).filter(o => o.length > 0)
        if (cleanOptions.length < 2) {
          addToast('MULTIPLE_CHOICE butuh minimal 2 opsi terisi', 'error')
          setSaving(false)
          return
        }
        // Cek duplikat
        const lowerSet = new Set(cleanOptions.map(o => o.toLowerCase()))
        if (lowerSet.size !== cleanOptions.length) {
          addToast('Opsi tidak boleh duplikat', 'error')
          setSaving(false)
          return
        }
        payload.options = cleanOptions
      }
      if (pollType === 'LIKERT') {
        payload.likertScale = likertScale
        payload.likertLabels = likertLabels
      }

      const res = await api(`/api/essay-polls/${poll.id}/config`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        keepWrapper: true,
      })
      if (res?.success) {
        addToast(res.message || 'Konfigurasi disimpan', 'success')
        onClose()
      } else {
        addToast(res?.error || 'Gagal simpan config', 'error')
      }
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-purple-600" />
            Atur Tipe Poll
          </DialogTitle>
          <DialogDescription>
            Pilih tipe jawaban untuk survei <strong>"{poll.title?.substring(0, 60)}"</strong>.
            Responden akan melihat form yang berbeda sesuai tipe yang dipilih.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* === Pilih pollType === */}
            <div>
              <Label className="text-sm font-semibold">Tipe Jawaban</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { value: 'ESSAY', label: 'Esai', icon: '📝', desc: 'Jawaban bebas (min 10 kata)' },
                  { value: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda', icon: '☑️', desc: 'Pilih 1 dari N opsi' },
                  { value: 'LIKERT', label: 'Skala Likert', icon: '📊', desc: 'Rating 1-5/7' },
                ].map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setPollType(t.value as any)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      pollType === t.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xl mb-1">{t.icon}</div>
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* === Options untuk MULTIPLE_CHOICE === */}
            {pollType === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Opsi Jawaban (min 2, max 10)</Label>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addOption}>
                    <Plus className="w-3 h-3 mr-1" /> Tambah Opsi
                  </Button>
                </div>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Opsi ${idx + 1}`}
                      className="h-8 text-sm"
                      maxLength={100}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                      onClick={() => removeOption(idx)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground italic">
                  {options.length} opsi. Responden hanya bisa pilih 1.
                </div>
              </div>
            )}

            {/* === Likert config === */}
            {pollType === 'LIKERT' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">Jumlah Skala</Label>
                  <Select value={String(likertScale)} onValueChange={(v) => handleScaleChange(parseInt(v, 10))}>
                    <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[3, 4, 5, 6, 7].map(n => <SelectItem key={n} value={String(n)} className="text-sm">{n} skala</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Label per Skala</Label>
                  <div className="space-y-1 mt-1">
                    {likertLabels.map((label, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                          {idx + 1}
                        </span>
                        <Input
                          value={label}
                          onChange={(e) => {
                            const next = [...likertLabels]
                            next[idx] = e.target.value
                            setLikertLabels(next)
                          }}
                          className="h-8 text-sm"
                          maxLength={50}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === Info box === */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
              <strong>Catatan:</strong>{' '}
              {pollType === 'ESSAY' && 'Responden menulis jawaban bebas (minimal 10 kata). AI akan analisis sentimen & kategori otomatis.'}
              {pollType === 'MULTIPLE_CHOICE' && 'Responden pilih 1 opsi. AI tetap analisis sentimen dari opsi yang dipilih (mis. "Setuju" = POSITIVE).'}
              {pollType === 'LIKERT' && 'Responden beri rating 1-N. Sentimen dihitung dari skala (1-2=NEGATIVE, 3=NEUTRAL, 4-5=POSITIVE untuk skala 5).'}
              {' '}
              Perubahan hanya berlaku untuk respon baru. Respon lama tetap tersimpan.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-purple-600 hover:bg-purple-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Simpan Konfigurasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
