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
  Share2, Copy, MessageCircle, Mail, Linkedin, Shield,
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
      '/api/opinion-links?limit=15',
      '/api/geospatial-voice?code=ID',
      '/api/demographics-analytics?code=ID',
      '/api/broadcast-composer?type=templates',
      '/api/broadcast-composer?type=broadcasts',
      '/api/broadcast-composer?type=contacts_count',
      '/api/essay-polls',
      '/api/opinion-links?limit=50',
      '/api/decision-dashboard',
      '/api/agents/status',
    ]

    // Fire all requests in parallel — results go to server cache, not UI state
    endpoints.forEach(url => {
      fetch(url, { headers }).catch(() => {})
    })
  }, [])

  const tabs = [
    { key: 'opinion-scanner', label: 'Opini Publik Auto-Scanner', icon: Sparkles, desc: 'Scan otomatis YouTube + Google News, AI analisis sentimen + lokasi + kategori' },
    { key: 'opinion-map', label: 'Geospatial Voice Mapping', icon: MapPin, desc: 'Heatmap + drill-down 7 level + trust index per demografi' },
    { key: 'broadcast', label: 'Broadcast Composer', icon: Send, desc: 'Multi-channel: WA, FB, IG, Email + attach essay poll' },
    { key: 'essay-polls', label: 'Essay Polling & AI Auto-Pertanyaan', icon: Brain, desc: 'AI generate pertanyaan essay otomatis + analisis jawaban' },
    { key: 'opinion-links', label: 'Link Analisis Publik', icon: ExternalLink, desc: 'Dashboard semua link medsos yang sudah dianalisis' },
    { key: 'decision', label: 'Decision Dashboard', icon: Target, desc: 'Sintesis AI untuk pengambil keputusan politik' },
    { key: 'agents', label: 'AI Agent Monitor', icon: Activity, desc: 'Multi-Agent System status + background jobs + sync events' },
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
      {tab === 'opinion-map' && <GeospatialVoiceTab />}
      {tab === 'broadcast' && <BroadcastComposerTab />}
      {tab === 'essay-polls' && <EssayPollsTab />}
      {tab === 'opinion-links' && <OpinionLinksTab />}
      {tab === 'decision' && <DecisionDashboardTab />}
      {tab === 'agents' && <AgentsMonitorTab />}
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // === FIX: cache-bust dengan timestamp + limit 50 (dari 15) ===
  const loadRecent = useCallback(() => {
    setLoading(true)
    const _t = Date.now() // cache-bust: bypass 30s cache di API
    api(`/api/opinion-links?limit=50&_t=${_t}`).then(res => {
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

      {/* Filter + Bulk Delete */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground">Filter Prioritas:</span>
        {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
          <Button key={p} size="sm" variant={filterPriority === p ? 'default' : 'outline'}
            className={`h-7 text-xs ${filterPriority === p ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
            onClick={() => setFilterPriority(p)}>
            {p === 'ALL' ? 'Semua' : p}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filteredLinks.length} mention</span>
          {/* === NEW: Bulk Delete Button === */}
          {filteredLinks.length > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:bg-red-50 border-red-200"
              onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-3 h-3 mr-1" /> Hapus Semua ({filteredLinks.length})
            </Button>
          )}
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
                  <a href={link.url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline shrink-0">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                  {/* === NEW: Tombol Hapus per item === */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                    disabled={deletingId === link.id}
                    onClick={() => handleDelete(link.id)}
                    title="Hapus link ini">
                    {deletingId === link.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
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
// TAB 2: GEOSPATIAL VOICE MAPPING & DEMOGRAPHICS ANALYTICS
// 7-level drill-down: Nasional → Provinsi → DPC → Kec → Desa → RW → RT
// 3 dimensi: Geografis, Demografi Usia Pemilih, Stratifikasi Sosial
// ============================================================
function GeospatialVoiceTab() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [currentCode, setCurrentCode] = useState('ID') // default: Nasional
  const [ageFilter, setAgeFilter] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('')
  const [demographics, setDemographics] = useState<any>(null)
  const [showRecompute, setShowRecompute] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (ageFilter) params.set('ageGroup', ageFilter)
    if (segmentFilter) params.set('segment', segmentFilter)
    
    Promise.all([
      api(`/api/geospatial-voice?code=${currentCode}${params.toString() ? '&' + params.toString() : ''}`),
      api(`/api/demographics-analytics?code=${currentCode}`),
    ]).then(([geoRes, demRes]) => {
      const geoData = geoRes?.data || geoRes
      const demData = demRes?.data || demRes
      setData(geoData)
      setDemographics(demData)
    }).catch(() => { setData(null); setDemographics(null) })
      .finally(() => setLoading(false))
  }, [currentCode, ageFilter, segmentFilter])

  useEffect(() => { loadData() }, [loadData])

  const handleDrillDown = (code: string) => {
    setCurrentCode(code)
  }

  const handleBreadcrumbClick = (code: string) => {
    setCurrentCode(code)
  }

  const handleRecompute = async () => {
    setShowRecompute(true)
    try {
      const res = await fetch('/api/trust-index', {
        method: 'POST',
        headers: { 'x-user-id': useAuthStore.getState().user?.id || '' },
      })
      const result = await res.json()
      if (result.success) {
        useToastStore.getState().addToast(result.message, 'success')
        loadData()
      }
    } catch (e: any) {
      useToastStore.getState().addToast(e.message, 'error')
    } finally { setShowRecompute(false) }
  }

  if (loading) return <LoadingState />
  if (!data) return <EmptyState icon={MapPin} title="Tidak ada data" description="Error memuat data geospasial." />

  const { current, nextLevel, stats, heatmap, trustIndex, opinionLinks, allTrustIndices } = data

  const levelLabels: Record<string, string> = {
    NATIONAL: 'Nasional', PROVINCE: 'Provinsi (DPD)', REGENCY: 'Kabupaten/Kota (DPC)',
    DISTRICT: 'Kecamatan', VILLAGE: 'Kelurahan/Desa', RW: 'Rukun Warga (RW)', RT: 'Rukun Tetangga (RT)',
  }

  // Heat color logic
  const getTrustColor = (score: number) => {
    if (score >= 70) return { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50' }
    if (score >= 55) return { bg: 'bg-lime-500', text: 'text-lime-700', light: 'bg-lime-50' }
    if (score >= 45) return { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50' }
    if (score >= 30) return { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50' }
    return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50' }
  }

  // Chart data
  const ageGroupChartData = demographics?.ageGroups?.map((ag: any) => ({
    name: ag.key,
    label: ag.label.split('(')[0].trim(),
    voters: ag.voters,
    trust: ag.trustScore,
    mentions: ag.totalMentions,
  })) || []

  const segmentChartData = demographics?.communitySegments?.map((seg: any) => ({
    name: seg.key,
    label: seg.label,
    population: seg.population,
    trust: seg.trustScore,
    mentions: seg.totalMentions,
  })) || []

  const currentTrust = trustIndex?.trustScore || demographics?.overall?.trustScore || 0
  const trustColor = getTrustColor(currentTrust)

  return (
    <div className="space-y-4">
      {/* Header dengan judul baru + Recompute button */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-orange-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-orange-600 flex items-center justify-center shadow-lg shrink-0">
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Geospatial Voice Mapping &amp; Demographics Analytics</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Sistem intelijen opini publik dengan 7-level hierarki drill-down (Nasional → RT) + 
                3 dimensi analisis (Geografis, Demografi Usia Pemilih, Stratifikasi Sosial).
                Memetakan indeks kepercayaan publik terhadap pemerintahan Presiden Prabowo.
              </p>
              <Button onClick={handleRecompute} disabled={showRecompute} variant="outline" size="sm">
                {showRecompute ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                {showRecompute ? 'Recomputing...' : 'Recompute Trust Index'}
              </Button>
            </div>
            {/* Trust Index gauge */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${trustColor.text}`}>{currentTrust.toFixed(1)}</div>
              <div className="text-[13px] text-muted-foreground">Trust Index</div>
              <div className={`text-[13px] ${trustColor.text} font-semibold`}>
                {currentTrust >= 70 ? 'TINGGI' : currentTrust >= 55 ? 'CENDERUNG POSITIF' : currentTrust >= 45 ? 'NETRAL' : currentTrust >= 30 ? 'CENDERUNG NEGATIF' : 'RENDAH'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breadcrumb (drill-down path) */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-1 flex-wrap text-sm">
            <Home className="w-3.5 h-3.5 text-muted-foreground" />
            <button onClick={() => handleBreadcrumbClick('ID')} className="text-blue-600 hover:underline text-xs font-semibold">
              Indonesia
            </button>
            {current.breadcrumb.map((b: any, i: number) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <button
                  onClick={() => handleBreadcrumbClick(b.code)}
                  className={`hover:underline text-xs ${b.code === currentCode ? 'font-bold text-orange-600' : 'text-blue-600'}`}
                >
                  {b.name}
                </button>
                <span className="text-[13px] text-muted-foreground">({levelLabels[b.level] || b.level})</span>
              </span>
            ))}
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-bold text-orange-600">{current.name}</span>
            <span className="text-[13px] text-muted-foreground">({levelLabels[current.level] || current.level})</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats utama */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Populasi" value={stats.totalPopulation.toLocaleString('id-ID')} icon={Users} color="blue" />
        <StatCard label="Total Pemilih (DPT)" value={stats.totalVoters.toLocaleString('id-ID')} icon={Award} color="purple" />
        <StatCard label="Total Mention Opini" value={trustIndex?.totalMentions || 0} icon={Sparkles} color="orange" />
        <StatCard label="Confidence Level" value={`${trustIndex?.confidence || 0}%`} icon={Activity} color="emerald" />
      </div>

      {/* Demographic filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs font-semibold">Filter Demografi:</Label>
            <Select value={ageFilter || 'ALL'} onValueChange={(v) => setAgeFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue placeholder="Semua Usia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kelompok Usia</SelectItem>
                <SelectItem value="17-21">Pemilih Pemula (17-21)</SelectItem>
                <SelectItem value="22-30">Pemilih Muda (22-30)</SelectItem>
                <SelectItem value="31-40">Pemilih Matang (31-40)</SelectItem>
                <SelectItem value="41-60">Pemilih Paruh Baya (41-60)</SelectItem>
                <SelectItem value="61+">Pemilih Lansia (61+)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={segmentFilter || 'ALL'} onValueChange={(v) => setSegmentFilter(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-[220px] h-8 text-xs"><SelectValue placeholder="Semua Segmen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Community Segment</SelectItem>
                <SelectItem value="INDIGENOUS">Suku Adat & Budaya</SelectItem>
                <SelectItem value="RELIGIOUS">Komunitas Agama & Kepercayaan</SelectItem>
                <SelectItem value="PROFESSION">Kelompok Profesi & Sektoral</SelectItem>
                <SelectItem value="YOUTH">Aliansi Ormas & Pemuda</SelectItem>
              </SelectContent>
            </Select>
            {(ageFilter || segmentFilter) && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setAgeFilter(''); setSegmentFilter('') }}>
                Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two-column: Heatmap list + Trust gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap list (left, 2 cols) — ENHANCED: auto-sort + visual bar + alert badge */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-5 h-5 text-orange-600" />
                Heatmap Trust Index per {nextLevel ? levelLabels[nextLevel] : 'Wilayah'}
                {nextLevel && <span className="text-xs text-muted-foreground ml-2">({heatmap.length} wilayah — klik untuk drill-down)</span>}
              </CardTitle>
              {/* === NEW: Auto-sort toggle === */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Sort:</span>
                <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">Urgency</Badge>
                <span className="text-muted-foreground opacity-50">(isu kritis di atas)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {heatmap.length === 0 ? (
              <EmptyState icon={MapPin} title={`Belum ada ${nextLevel || 'wilayah'}`} description="Tidak ada data populasi untuk level ini." />
            ) : (
              <div className="space-y-3">
                {/* === NEW: Mini Heatmap Bar Chart (top 10 wilayah with issues) === */}
                {(() => {
                  const topIssues = [...heatmap]
                    .filter(loc => (loc.totalMentions || 0) > 0)
                    .sort((a, b) => (b.totalMentions || 0) - (a.totalMentions || 0))
                    .slice(0, 10)
                  if (topIssues.length === 0) return null
                  return (
                    <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-bold text-red-800">⚠️ Top {topIssues.length} Wilayah dengan Isu Aktif</span>
                      </div>
                      <div className="space-y-1">
                        {topIssues.map(loc => {
                          const trustPct = Math.max(0, Math.min(100, loc.trustScore || 0))
                          const barColor = trustPct >= 70 ? '#10b981' : trustPct >= 55 ? '#84cc16' : trustPct >= 45 ? '#f59e0b' : trustPct >= 30 ? '#f97316' : '#ef4444'
                          return (
                            <div key={loc.code} className="flex items-center gap-2">
                              <span className="text-xs font-medium w-24 truncate">{loc.name}</span>
                              <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden relative">
                                <div className="h-full rounded-full transition-all" style={{ width: `${trustPct}%`, background: barColor }} />
                                <span className="absolute inset-0 flex items-center justify-end pr-1 text-[10px] font-bold text-white">
                                  {loc.totalMentions}m
                                </span>
                              </div>
                              <span className="text-xs font-bold w-10 text-right" style={{ color: barColor }}>
                                {trustPct.toFixed(0)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* === Heatmap list with auto-sort === */}
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {/* === NEW: Auto-sort by urgency (mentions + negative sentiment + trust score) === */}
                  {[...heatmap].sort((a, b) => {
                    // 1. Total mentions descending (lebih banyak mention = lebih urgent)
                    const mentionsA = (a.totalMentions || 0) + (a.sentimentNegative || 0) * 2
                    const mentionsB = (b.totalMentions || 0) + (b.sentimentNegative || 0) * 2
                    if (mentionsB !== mentionsA) return mentionsB - mentionsA
                    // 2. Trust score ascending (lebih rendah = lebih bermasalah)
                    return (a.trustScore || 0) - (b.trustScore || 0)
                  }).slice(0, 50).map((loc: any) => {
                    const color = getTrustColor(loc.trustScore)
                    const trustPct = Math.max(0, Math.min(100, loc.trustScore || 0))
                    const hasIssue = (loc.totalMentions || 0) > 0 || (loc.sentimentNegative || 0) > 0
                    return (
                      <button key={loc.code} onClick={() => loc.canDrillDown && handleDrillDown(loc.code)}
                        disabled={!loc.canDrillDown}
                        className={`w-full flex items-center gap-3 p-2.5 rounded border text-left transition-all ${loc.canDrillDown ? 'hover:bg-accent hover:border-orange-300 cursor-pointer' : 'cursor-default opacity-80'} ${hasIssue ? 'border-l-4 border-l-red-500 bg-red-50/30' : ''}`}>
                        <div className={`w-2 h-12 rounded-full ${color.bg}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{loc.name}</span>
                            {/* === NEW: Alert badge for urgent wilayah === */}
                            {hasIssue && (
                              <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300">
                                ⚠️ {loc.totalMentions} mention
                              </Badge>
                            )}
                          </div>
                          <div className="text-[13px] text-muted-foreground">
                            {loc.totalPopulation?.toLocaleString('id-ID') || 0} pop • {loc.totalVoters?.toLocaleString('id-ID') || 0} voters • {loc.totalMentions || 0} mentions
                          </div>
                          {loc.totalMentions > 0 && (
                            <div className="text-[13px] text-muted-foreground mt-0.5 flex items-center gap-2">
                              <span className="text-emerald-600">+{loc.sentimentPositive || 0}</span>
                              <span className="text-red-600">-{loc.sentimentNegative || 0}</span>
                            </div>
                          )}
                          {/* === NEW: Visual trust bar (gradient) === */}
                          <div className="mt-1.5 w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${trustPct}%`,
                                background: trustPct >= 70 ? '#10b981' : trustPct >= 55 ? '#84cc16' : trustPct >= 45 ? '#f59e0b' : trustPct >= 30 ? '#f97316' : '#ef4444'
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-xl font-bold ${color.text}`}>{(loc.trustScore || 0).toFixed(1)}</div>
                          <div className="text-[13px] text-muted-foreground">trust</div>
                          {/* === NEW: Status badge === */}
                          {(loc.trustScore || 0) === 0 && (loc.totalMentions || 0) === 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">No data</div>
                          )}
                        </div>
                        {loc.canDrillDown && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust Index gauge (right, 1 col) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Activity className="w-5 h-5 text-purple-600" />Trust Index Gauge</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="40%" outerRadius="100%" data={[{ name: 'Trust', value: currentTrust, fill: currentTrust >= 70 ? '#10b981' : currentTrust >= 55 ? '#84cc16' : currentTrust >= 45 ? '#f59e0b' : currentTrust >= 30 ? '#f97316' : '#ef4444' }]} startAngle={180} endAngle={0}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center -mt-12">
              <div className={`text-4xl font-bold ${trustColor.text}`}>{currentTrust.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-1">dari 100 (skala kepercayaan)</div>
            </div>
            <div className="mt-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between"><span className="text-emerald-600">✓ Positif</span><span className="font-semibold">{trustIndex?.sentimentPositive || demographics?.overall?.sentimentPositive || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-600">• Netral</span><span className="font-semibold">{trustIndex?.sentimentNeutral || demographics?.overall?.sentimentNeutral || 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-red-600">✗ Negatif</span><span className="font-semibold">{trustIndex?.sentimentNegative || demographics?.overall?.sentimentNegative || 0}</span></div>
              <div className="flex items-center justify-between border-t pt-1.5 mt-1.5"><span className="text-muted-foreground">Trend</span><span className="font-semibold">{trustIndex?.trendDirection || demographics?.overall?.trendDirection || 'STABLE'}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Sample</span><span className="font-semibold">{trustIndex?.sampleSize || demographics?.overall?.totalMentions || 0}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demographics: Age Groups Chart */}
      {demographics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" /> 
                Dimensi B: Demografi Kelompok Usia Pemilih
              </CardTitle>
              <CardDescription>Trust index per kelompok usia pemilih Pemilu (5 segmen)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageGroupChartData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="bg-white border rounded p-2 shadow-lg text-xs">
                            <div className="font-semibold mb-1">{d.label}</div>
                            <div>Trust Score: <strong>{d.trust}</strong>/100</div>
                            <div>Voters: {d.voters.toLocaleString('id-ID')}</div>
                            <div>Mentions: {d.mentions}</div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="trust" radius={[8, 8, 0, 0]}>
                      {ageGroupChartData.map((entry: any, index: number) => {
                        const c = getTrustColor(entry.trust)
                        return <Cell key={index} fill={c.bg.replace('bg-', '').replace('-500', '') === 'emerald' ? '#10b981' : c.bg.includes('lime') ? '#84cc16' : c.bg.includes('amber') ? '#f59e0b' : c.bg.includes('orange') ? '#f97316' : '#ef4444'} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Detailed age group breakdown */}
              <div className="mt-3 space-y-2">
                {demographics.ageGroups.map((ag: any, i: number) => (
                  <div key={i} className="rounded border p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{ag.label}</span>
                      <span className={`text-sm font-bold ${getTrustColor(ag.trustScore).text}`}>{ag.trustScore}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground italic mb-1">{ag.desc}</p>
                    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                      <span>{ag.voters.toLocaleString('id-ID')} voters ({ag.percentage}%)</span>
                      <span className="text-emerald-600">+{ag.sentimentPositive}</span>
                      <span className="text-red-600">-{ag.sentimentNegative}</span>
                      <span className="text-slate-500">•{ag.sentimentNeutral}</span>
                      <span>mentions: {ag.totalMentions}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Community Segments Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-purple-600" />
                Dimensi C: Stratifikasi Sosial & Golongan
              </CardTitle>
              <CardDescription>Trust index per community segment (4 cluster)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={segmentChartData.map((s: any) => ({ name: s.label, value: s.population, trust: s.trust }))} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={(e: any) => `${e.trust}`}>
                      {segmentChartData.map((entry: any, index: number) => {
                        const c = getTrustColor(entry.trust)
                        return <Cell key={index} fill={c.bg.includes('emerald') ? '#10b981' : c.bg.includes('lime') ? '#84cc16' : c.bg.includes('amber') ? '#f59e0b' : c.bg.includes('orange') ? '#f97316' : '#ef4444'} />
                      })}
                    </Pie>
                    <Tooltip formatter={(v: any) => v.toLocaleString('id-ID')} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Detailed segment breakdown */}
              <div className="mt-3 space-y-2">
                {demographics.communitySegments.map((seg: any, i: number) => (
                  <div key={i} className="rounded border p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{seg.label}</span>
                      <span className={`text-sm font-bold ${getTrustColor(seg.trustScore).text}`}>{seg.trustScore}</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground italic mb-1">{seg.desc}</p>
                    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                      <span>{seg.population.toLocaleString('id-ID')} ({seg.percentage}%)</span>
                      <span className="text-emerald-600">+{seg.sentimentPositive}</span>
                      <span className="text-red-600">-{seg.sentimentNegative}</span>
                      <span>mentions: {seg.totalMentions}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Opinion Links untuk wilayah ini */}
      {opinionLinks && opinionLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-orange-600" />Mention Opini Publik di {current.name}</CardTitle>
            <CardDescription>{opinionLinks.length} mention terbaru dari wilayah ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {opinionLinks.map((link: any) => (
                <div key={link.id} className="rounded border p-2 hover:bg-accent/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[13px]">{link.platform}</Badge>
                        <Badge variant="outline" className={`text-[13px] ${link.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : link.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : ''}`}>{link.sentiment}</Badge>
                        <Badge variant="outline" className={`text-[13px] ${link.priority === 'HIGH' ? 'bg-red-100 text-red-800' : link.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{link.priority}</Badge>
                        {link.regencyName && <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{link.regencyName}</Badge>}
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline line-clamp-1">{link.title}</a>
                      {link.aiSummary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">{link.aiSummary}</p>}
                    </div>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><ExternalLink className="w-3.5 h-3.5" /></Button>
                    </a>
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
              Pilih channel, target wilayah (DPN/DPD/DPC), isi pesan dengan variabel otomatis. Sistem akan resolve kontak dari DB & jadwalkan pengiriman anti-banned.
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
// TAB 4: ESSAY POLLS & AI AUTO-PERTANYAAN
// ============================================================
function EssayPollsTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [polls, setPolls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiGenOpen, setAiGenOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [detailPoll, setDetailPoll] = useState<any>(null)
  const [sharePoll, setSharePoll] = useState<any>(null)
  const [aiForm, setAiForm] = useState({ sourceTopic: '', sourceUrl: '', sourceContent: '' })
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
          sourceTopic: 'Survei opini publik umum LAPRA 08',
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
                (langsung, komparatif, solusi, emosional, analitis). Pilih salah satu, lalu share ke medsos & group populer.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => { setAiGenOpen(true); setAiSuggestions([]) }} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <Sparkles className="w-4 h-4 mr-1" /> AI Generate Pertanyaan
                </Button>
                <Button variant="outline" onClick={() => setManualOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Buat Manual + Saran AI
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

      {/* === AI Generate Dialog (Multiple Suggestions) — Enhanced with Topic Suggestions === */}
      <Dialog open={aiGenOpen} onOpenChange={(o) => { setAiGenOpen(o); if (!o) { setAiSuggestions([]); setSelectedSuggestionIdx(null); setShowTopicSuggestions(false); setActiveCategory(null) } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" /> AI Generate Pertanyaan Essay (Multi-Saran)
            </DialogTitle>
            <DialogDescription>
              AI akan generate 5 varian pertanyaan dengan pendekatan berbeda. Pilih salah satu untuk dibuat poll.
              Klik <strong>"💡 Saran Topik"</strong> untuk inspirasi dari trending issues & kategori.
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

// ============================================================
// TAB 5: LINK ANALISIS PUBLIK
// ============================================================
function OpinionLinksTab() {
  const addToast = useToastStore((s) => s.addToast)
  const user = useAuthStore((s) => s.user)
  const [links, setLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ platform: '', sentiment: '', priority: '', status: '' })
  const [reviewOpen, setReviewOpen] = useState<any>(null)
  const [generatingKonter, setGeneratingKonter] = useState<string | null>(null)
  // === NEW: Bulk select state ===
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionOpen, setBulkActionOpen] = useState(false)

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

  // === NEW: Auto-Triage Sort (by urgency, then by priority, then by sentiment) ===
  // FAN-OUT #1: Triage Agent — sort otomatis, link paling kritis di atas
  const sortedLinks = [...links].sort((a, b) => {
    // 1. Urgency score descending (paling kritis di atas)
    const urgencyA = a.urgencyScore || 0
    const urgencyB = b.urgencyScore || 0
    if (urgencyB !== urgencyA) return urgencyB - urgencyA
    // 2. Priority HIGH > MEDIUM > LOW
    const prioOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
    if ((prioOrder[b.priority] || 0) !== (prioOrder[a.priority] || 0)) {
      return (prioOrder[b.priority] || 0) - (prioOrder[a.priority] || 0)
    }
    // 3. Sentiment NEGATIVE > NEUTRAL > POSITIVE (negatif lebih urgent)
    const sentOrder: Record<string, number> = { NEGATIVE: 3, NEUTRAL: 2, POSITIVE: 1 }
    if ((sentOrder[b.sentiment] || 0) !== (sentOrder[a.sentiment] || 0)) {
      return (sentOrder[b.sentiment] || 0) - (sentOrder[a.sentiment] || 0)
    }
    // 4. Engagement count descending (lebih viral lebih urgent)
    return (b.engagementCount || 0) - (a.engagementCount || 0)
  })

  // === NEW: Generate Konter Isu per link (Fan-Out #2 trigger) ===
  const handleGenerateKonter = async (linkId: string) => {
    setGeneratingKonter(linkId)
    try {
      const res = await fetch(`/api/opinion-links/${linkId}/counter-issue`, {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      addToast(`Draft konter isu dibuat (${data.data.aiProvider}). Lihat di Broadcast Composer.`, 'success')
      loadData() // refresh list (status berubah ke ADDRESSED)
    } catch (e: any) {
      addToast(`Gagal generate konter: ${e.message}`, 'error')
    } finally {
      setGeneratingKonter(null)
    }
  }

  // === NEW: Bulk Triage — auto-map 50 link ke provinsi via Lexicon Matrix ===
  const [triageLoading, setTriageLoading] = useState(false)
  const handleBulkTriage = async () => {
    setTriageLoading(true)
    try {
      const res = await fetch('/api/opinion-links/bulk-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ limit: 50 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const stats = data.data
      const topProvinsiStr = stats.topProvinsiList?.map((p: any) => `${p.provinsi}(${p.count})`).join(', ') || 'tidak ada'
      addToast(`Triage: ${stats.mapped}/${stats.total} link di-map. Top: ${topProvinsiStr}`, 'success')
      loadData() // refresh list
    } catch (e: any) {
      addToast(`Gagal bulk triage: ${e.message}`, 'error')
    } finally {
      setTriageLoading(false)
    }
  }

  // === NEW: Bulk Action — Generate Konter untuk semua HIGH+NEGATIVE selected ===
  const handleBulkGenerateKonter = async () => {
    const selected = Array.from(selectedIds)
    if (selected.length === 0) {
      addToast('Pilih minimal 1 link dulu', 'warning')
      return
    }
    setBulkActionOpen(false)
    addToast(`Memproses ${selected.length} link. Mohon tunggu...`, 'info')
    // Process sequential (anti 429) — jeda 5 detik per LLM call
    let success = 0, failed = 0
    for (const linkId of selected) {
      try {
        const res = await fetch(`/api/opinion-links/${linkId}/counter-issue`, {
          method: 'POST',
          headers: { 'x-user-id': user?.id || '' },
        })
        if (res.ok) success++
        else failed++
        // Jeda 5 detik antar call (anti 429 Gemini Free 15 RPM)
        if (selected.length > 1) await new Promise(r => setTimeout(r, 5000))
      } catch {
        failed++
      }
    }
    addToast(`Selesai: ${success} draft dibuat, ${failed} gagal`, success > 0 ? 'success' : 'error')
    setSelectedIds(new Set())
    loadData()
  }

  // === NEW: Bulk mark all selected as REVIEWED ===
  const handleBulkMarkReviewed = async () => {
    const selected = Array.from(selectedIds)
    if (selected.length === 0) return
    setBulkActionOpen(false)
    try {
      // Sequential update (anti 504 — jangan Promise.all 50 request)
      for (const linkId of selected) {
        await fetch(`/api/opinion-links/${linkId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
          body: JSON.stringify({ status: 'REVIEWED', reviewNotes: 'Bulk marked as reviewed' }),
        })
      }
      addToast(`${selected.length} link ditandai REVIEWED`, 'success')
      setSelectedIds(new Set())
      loadData()
    } catch (e: any) {
      addToast(`Gagal bulk review: ${e.message}`, 'error')
    }
  }

  // === NEW: Quick select helpers ===
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const selectAllHighNeg = () => {
    const highNeg = sortedLinks
      .filter(l => l.priority === 'HIGH' && l.sentiment === 'NEGATIVE' && l.status === 'NEW')
      .map(l => l.id)
    setSelectedIds(new Set(highNeg))
  }
  const selectAll = () => setSelectedIds(new Set(sortedLinks.map(l => l.id)))
  const clearSelection = () => setSelectedIds(new Set())

  if (loading) return <LoadingState />

  const platformIcon = (p: string) => {
    if (p === 'YOUTUBE') return <Youtube className="w-3.5 h-3.5 text-red-600" />
    if (p === 'GOOGLE') return <Newspaper className="w-3.5 h-3.5 text-blue-600" />
    return <Globe className="w-3.5 h-3.5" />
  }

  // === NEW: Auto-Triage stats ===
  const stats = {
    total: links.length,
    highNeg: links.filter(l => l.priority === 'HIGH' && l.sentiment === 'NEGATIVE').length,
    highNegNew: links.filter(l => l.priority === 'HIGH' && l.sentiment === 'NEGATIVE' && l.status === 'NEW').length,
    belumDireview: links.filter(l => l.status === 'NEW').length,
  }

  return (
    <div className="space-y-4">
      {/* === AUTO-TRIAGE ALERT BANNER + BULK TRIAGE BUTTON === */}
      {stats.belumDireview > 0 && (
        <div className="rounded-lg bg-amber-50 border-2 border-amber-300 p-3 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-amber-800 text-sm">
              🗺️ {stats.belumDireview} link belum di-map ke wilayah
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Jalankan Bulk Triage untuk auto-detect provinsi/kabupaten dari 50 link menggunakan Lexicon Matrix (kota + kodim + kejati).
              Data akan langsung mengisi Geospatial Heatmap & Decision Dashboard.
            </p>
            <Button size="sm" className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={triageLoading}
              onClick={handleBulkTriage}>
              {triageLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <MapPin className="w-3.5 h-3.5 mr-1" />}
              {triageLoading ? 'Sedang triage...' : `Bulk Triage ${stats.belumDireview} Link`}
            </Button>
          </div>
        </div>
      )}

      {stats.highNegNew > 0 && (
        <div className="rounded-lg bg-red-50 border-2 border-red-300 p-3 flex items-start gap-3">
          <Zap className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-red-800 text-sm">
              ⚠️ {stats.highNegNew} link HIGH+NEGATIVE belum direview!
            </div>
            <p className="text-xs text-red-700 mt-1">
              Link ini berpotensi viral/membahayakan elektoral. Generate draft konter isu sekarang untuk golden window 2-4 jam.
            </p>
            <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { selectAllHighNeg(); setBulkActionOpen(true) }}>
              <Zap className="w-3.5 h-3.5 mr-1" /> Pilih {stats.highNegNew} Link & Generate Konter
            </Button>
          </div>
        </div>
      )}

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

      {/* Stats — Auto-Triage Highlight */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Link" value={stats.total} icon={ExternalLink} color="blue" />
        <StatCard label="HIGH + NEG" value={stats.highNeg} icon={AlertTriangle} color="red" />
        <StatCard label="⚠️ HIGH+NEG Baru" value={stats.highNegNew} icon={Zap} color="red" />
        <StatCard label="Belum Direview" value={stats.belumDireview} icon={Eye} color="amber" />
      </div>

      {/* === NEW: Bulk Action Toolbar === */}
      {selectedIds.size > 0 && (
        <div className="rounded-lg bg-blue-50 border-2 border-blue-300 p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-blue-800">{selectedIds.size} link dipilih</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>Batal Pilih</Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8" onClick={handleBulkMarkReviewed}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Tandai Reviewed
            </Button>
            <Button size="sm" className="h-8 bg-red-600 hover:bg-red-700 text-white" onClick={handleBulkGenerateKonter}>
              <Zap className="w-3.5 h-3.5 mr-1" /> Generate Konter ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Links table — Auto-Sorted by Urgency */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-orange-600" />
              Daftar Link (Auto-Sort: Urgency)
              <Badge variant="outline" className="text-[11px] bg-slate-50">{sortedLinks.length}</Badge>
            </CardTitle>
            {selectedIds.size === 0 && sortedLinks.length > 0 && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAllHighNeg}>
                  Pilih HIGH+NEG Baru
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}>Pilih Semua</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedLinks.length === 0 ? (
            <EmptyState icon={ExternalLink} title="Belum ada link"
              description="Jalankan Opinion Scanner di tab pertama untuk mengumpulkan link otomatis." />
          ) : (
            <div className="space-y-2">
              {sortedLinks.map((link, idx) => {
                const priBadge = link.priority === 'HIGH' ? 'bg-red-100 text-red-800 border-red-300' :
                  link.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                const isSelected = selectedIds.has(link.id)
                const isHighNeg = link.priority === 'HIGH' && link.sentiment === 'NEGATIVE'
                const isGeneratingKonter = generatingKonter === link.id
                return (
                  <div key={link.id} className={`rounded border p-3 transition-all ${isSelected ? 'border-blue-400 bg-blue-50' : 'hover:bg-accent/30'} ${isHighNeg && link.status === 'NEW' ? 'border-l-4 border-l-red-500' : ''}`}>
                    <div className="flex items-start gap-3">
                      {/* === NEW: Checkbox bulk select === */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(link.id)}
                        className="mt-1 w-4 h-4 rounded cursor-pointer"
                      />
                      {/* === NEW: Rank number (auto-triage position) === */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        idx < 3 ? 'bg-red-100 text-red-700' : idx < 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-[13px] ${priBadge}`}>{link.priority}</Badge>
                          <Badge variant="outline" className="text-[13px] gap-1">{platformIcon(link.platform)}{link.platform}</Badge>
                          <Badge variant="outline" className={`text-[13px] ${link.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' : link.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'}`}>{link.sentiment}</Badge>
                          <Badge variant="outline" className="text-[13px] bg-purple-50 text-purple-700">{link.category}</Badge>
                          {link.regencyName && <Badge variant="outline" className="text-[13px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{link.regencyName}</Badge>}
                          <Badge variant="outline" className={`text-[13px] ${link.status === 'NEW' ? 'bg-amber-50 text-amber-700' : link.status === 'ADDRESSED' ? 'bg-emerald-50 text-emerald-700' : ''}`}>{link.status}</Badge>
                          {/* Urgency score prominent */}
                          <Badge variant="outline" className={`text-[13px] font-bold ${link.urgencyScore >= 70 ? 'bg-red-100 text-red-800 border-red-300' : link.urgencyScore >= 40 ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-50 text-slate-700'}`}>
                            ⚡ {link.urgencyScore || 0}/100
                          </Badge>
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-600 hover:underline line-clamp-1">
                          {link.title}
                        </a>
                        {link.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{link.content}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[13px] text-muted-foreground">
                          <span>📅 {formatDateTimeID(link.publishedAt || link.createdAt)}</span>
                          {link.engagementCount > 0 && <span>💬 {link.engagementCount}</span>}
                          {link.author && <span>✍️ {link.author}</span>}
                          {link.reviewedBy && <span>👁️ {link.reviewedBy.fullName}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {/* === NEW: Generate Konter button (priority for HIGH+NEG) === */}
                        {(isHighNeg || link.sentiment === 'NEGATIVE') && link.status !== 'ADDRESSED' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white"
                            disabled={isGeneratingKonter}
                            onClick={() => handleGenerateKonter(link.id)}
                            title="Generate draft konter isu otomatis">
                            {isGeneratingKonter ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                            Konter Isu
                          </Button>
                        )}
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
  if (!data) return <ErrorState message="Gagal memuat dashboard. Coba refresh halaman." />

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
                  <div className="text-[13px] text-muted-foreground">Sentiment Index (-100 s/d +100)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-orange-600">{data.stats.totalOpinionLinks}</div>
                  <div className="text-[13px] text-muted-foreground">Total Mention Dianalisis</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-600">{data.stats.needsAction}</div>
                  <div className="text-[13px] text-muted-foreground">Perlu Tindakan</div>
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
                    <Badge className={`text-[13px] ${a.prioritas === 'TINGGI' ? 'bg-red-100 text-red-800' : a.prioritas === 'SEDANG' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                      {a.prioritas}
                    </Badge>
                    <Badge variant="outline" className="text-[13px]"><MapPin className="w-2.5 h-2.5 mr-0.5" />{a.wilayah}</Badge>
                    <Badge variant="outline" className="text-[13px]"><Calendar className="w-2.5 h-2.5 mr-0.5" />{a.deadline}</Badge>
                  </div>
                  <p className="text-sm font-medium">{a.aksi}</p>
                  {a.alasan && (
                    <p className="text-[13px] text-muted-foreground mt-1 italic">Alasan: {a.alasan}</p>
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
            {data.topKategori.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : (
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
            {data.topPlatform.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data.</p> : (
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

// ============================================================
// TAB 7: AI AGENT MONITOR — Multi-Agent System status & control
// ============================================================
function AgentsMonitorTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [triggering, setTriggering] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    api('/api/agents/status').then(res => {
      setData(res?.data || res)
    }).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // 30s (was 10s — too aggressive)
    return () => clearInterval(interval)
  }, [loadData])

  const handleTrigger = async (agent: string) => {
    setTriggering(agent)
    try {
      const res = await fetch('/api/agents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ agent }),
      })
      const r = await res.json()
      if (!r.success) throw new Error(r.error)
      addToast(`${agent} agent executed successfully`, 'success')
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setTriggering(null)
    }
  }

  const handleToggleJob = async (jobId: string) => {
    try {
      const res = await fetch('/api/agents/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ action: 'toggle', jobId }),
      })
      const r = await res.json()
      if (!r.success) throw new Error(r.error)
      addToast(r.message, 'success')
      loadData()
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  const handleRunJobNow = async (jobId: string) => {
    try {
      const res = await fetch('/api/agents/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ action: 'run_now', jobId }),
      })
      const r = await res.json()
      if (!r.success) throw new Error(r.error)
      addToast('Job triggered to run now (background)', 'success')
      setTimeout(loadData, 2000)
    } catch (e: any) {
      addToast(e.message, 'error')
    }
  }

  if (loading) return <LoadingState />
  if (!data) return <ErrorState message="Gagal memuat agent status. Coba refresh halaman." />

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-cyan-50 to-blue-50">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-600 via-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shrink-0">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">AI Agent Monitor — Multi-Agent System</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Sistem otonom 4 AI Agents (Scraper, TrustIndex, EssayResponse, Orchestrator) yang bekerja paralel
                dengan sinkronisasi real-time antar menu. Background jobs berjalan periodik tanpa block UI.
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-white/70 p-2">
                  <div className="font-bold text-lg">{data.syncEvents?.pending || 0}</div>
                  <div className="text-[13px] text-muted-foreground">Pending Sync Events</div>
                </div>
                <div className="rounded bg-white/70 p-2">
                  <div className="font-bold text-lg text-emerald-700">{data.syncEvents?.completedToday || 0}</div>
                  <div className="text-[13px] text-muted-foreground">Syncs Completed Today</div>
                </div>
                <div className="rounded bg-white/70 p-2">
                  <div className="font-bold text-lg text-blue-700">{data.jobs?.filter((j: any) => j.isActive).length || 0}</div>
                  <div className="text-[13px] text-muted-foreground">Active Background Jobs</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" /> Manual Trigger Agent Pipeline
          </CardTitle>
          <CardDescription>Klik untuk eksekusi agent manual (background, non-blocking)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleTrigger('scraper')} disabled={triggering !== null} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
              {triggering === 'scraper' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Scraper Agent (Scrape + Trust Index)
            </Button>
            <Button onClick={() => handleTrigger('trust')} disabled={triggering !== null} variant="outline">
              {triggering === 'trust' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Trust Index Agent (Recompute)
            </Button>
            <Button onClick={() => handleTrigger('orchestrator')} disabled={triggering !== null} variant="outline">
              {triggering === 'orchestrator' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Brain className="w-4 h-4 mr-1" />}
              Full Orchestrator Pipeline
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Statistics (auto-refresh 10s)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.agents?.length === 0 ? (
            <EmptyState icon={Activity} title="Belum ada agent dijalankan" description="Klik tombol trigger di atas untuk mulai." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Success</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                  <TableHead className="text-center">Avg</TableHead>
                  <TableHead className="text-center">Tokens</TableHead>
                  <TableHead className="text-center">Records</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.agents?.map((agent: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold text-sm">{agent.name}</TableCell>
                    <TableCell className="text-center">{agent.total}</TableCell>
                    <TableCell className="text-center text-emerald-600 font-bold">{agent.success}</TableCell>
                    <TableCell className="text-center text-red-600">{agent.failed}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={agent.successRate >= 80 ? 'bg-emerald-100 text-emerald-800' : agent.successRate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                        {agent.successRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">{agent.avgDurationMs}ms</TableCell>
                    <TableCell className="text-center text-xs">{agent.totalTokens.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-xs">{agent.totalRecords}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> Background Jobs (Auto-Ingestion)</CardTitle>
          <CardDescription>Jobs berjalan periodik di background — non-blocking UI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.jobs?.map((job: any) => (
              <div key={job.id} className="rounded border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[13px]">{job.jobType}</Badge>
                      <Badge className={`text-[13px] ${job.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {job.isActive ? 'ACTIVE' : 'PAUSED'}
                      </Badge>
                      <span className="font-semibold text-sm">{job.jobName}</span>
                    </div>
                    <div className="text-[13px] text-muted-foreground mt-1">
                      Every {job.intervalMinutes}min • Last: {job.lastRunAt ? formatDateTimeID(job.lastRunAt) : 'never'} • Next: {formatDateTimeID(job.nextRunAt)} •
                      Runs: {job.totalRuns} (✓{job.successCount}/✗{job.failureCount})
                      {job.lastDurationMs ? ` • ${job.lastDurationMs}ms` : ''}
                    </div>
                    {job.lastError && (
                      <div className="text-[13px] text-red-600 mt-1">⚠️ {job.lastError.substring(0, 100)}</div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleRunJobNow(job.id)}>
                      <Zap className="w-3 h-3 mr-1" /> Run Now
                    </Button>
                    <Button size="sm" variant={job.isActive ? 'outline' : 'default'} className="h-7 text-xs" onClick={() => handleToggleJob(job.id)}>
                      {job.isActive ? 'Pause' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Agent Logs (last 50 actions)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentLogs?.length === 0 ? (
            <EmptyState icon={Activity} title="Belum ada agent logs" description="Trigger agent di atas untuk mulai." />
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {data.recentLogs?.slice(0, 30).map((log: any) => (
                <div key={log.id} className="rounded border p-2 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-[13px] ${log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : log.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {log.status}
                    </Badge>
                    <span className="font-semibold">{log.agentName}.{log.action}</span>
                    {log.durationMs && <span className="text-muted-foreground">{log.durationMs}ms</span>}
                    {log.recordsAffected > 0 && <Badge variant="outline" className="text-[13px]">{log.recordsAffected} records</Badge>}
                    {log.llmTokensUsed > 0 && <Badge variant="outline" className="text-[13px]">{log.llmTokensUsed} tokens</Badge>}
                  </div>
                  {log.error && <div className="text-red-600 text-[13px]">{log.error.substring(0, 150)}</div>}
                  <div className="text-[13px] text-muted-foreground">{formatDateTimeID(log.startedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
            Provider Indonesia (Fonnte, Waboo, Wootalk) direkomendasikan untuk harga lokal & support bahasa.
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
                <li>Untuk skala 10.000+ pesan/hari: gunakan multiple device/account (Fonnte & Waboo support ini)</li>
                <li>Wootalk & WhatsApp Business API = zero banned risk (official partner)</li>
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
