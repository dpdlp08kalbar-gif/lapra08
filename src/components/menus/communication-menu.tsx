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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToastStore, useAuthStore } from '@/lib/store'
import { formatDateTimeID } from '@/lib/format'
import {
  Megaphone, Plus, MessageSquare, Bell, Pin, Send, Users, Globe,
  BarChart3, AlertTriangle, Heart, TrendingUp, TrendingDown, Activity,
  MapPin, Shield, ShieldCheck, Lightbulb, Loader2, Search, Edit, Trash2, Eye,
  CheckCircle2, XCircle, Clock, Target, Zap, FileText, Video,
  ExternalLink, Upload, RefreshCw,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface Territory {
  id: string
  code: string
  name: string
  level: string
  category: string
  parentId: string | null
  isActive: boolean
}

interface Broadcast {
  id: string
  title: string
  message: string
  channel: string
  status: string
  targetScope: string
  recipientCount: number
  sentAt: string | null
  scheduledAt: string | null
  videoUrl?: string | null
  linkUrl?: string | null
  sentBy: {
    id: string
    fullName: string
    territory: { name: string }
  }
  createdAt: string
}

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  category?: string | null
  priority?: string
  isPinned: boolean
  isActive: boolean
  territoryId: string
  territory: { id: string; name: string; code: string }
  createdBy: { id: string; fullName: string }
  createdAt: string
}

interface PollOption {
  id: string
  label: string
  sentiment: string
}

interface Poll {
  id: string
  title: string
  question: string
  description?: string | null
  triggerEvent?: string | null
  triggerUrl?: string | null
  options: string
  status: string
  scheduledAt?: string | null
  closesAt?: string | null
  broadcastSentAt?: string | null
  broadcastRecipientCount?: number
  territoryId: string
  territory: { id: string; name: string; code: string }
  createdBy: { id: string; fullName: string; username: string }
  _count: { responses: number; aspirations: number }
  createdAt: string
}

interface CrisisZone {
  id: string
  title: string
  description: string
  issueCategory: string
  issueSource?: string | null
  sentimentScore: number
  severity: string
  status: string
  isLocked: boolean
  territoryId: string
  territory: { id: string; name: string; code: string }
  clarificationMessage?: string | null
  clarificationVideoUrl?: string | null
  clarificationQuote?: string | null
  resolutionNotes?: string | null
  resolvedAt?: string | null
  broadcastSentAt?: string | null
  broadcastRecipientCount?: number
  resolvedBy?: { id: string; fullName: string; username: string } | null
  createdAt: string
}

interface Aspiration {
  id: string
  title: string
  message: string
  category: string
  subCategory?: string | null
  sentiment: string
  priority: string
  status: string
  aiCluster?: string | null
  senderName?: string | null
  senderPhone?: string | null
  occupation?: string | null
  ageGroup?: string | null
  gender?: string | null
  provinceCode?: string | null
  regencyCode?: string | null
  districtCode?: string | null
  sourceUrl?: string | null
  reviewNotes?: string | null
  reviewedAt?: string | null
  reviewedBy?: { id: string; fullName: string; username: string } | null
  poll?: { id: string; title: string } | null
  submittedAt: string
}

interface CommandCenterData {
  generatedAt: string
  scope: {
    isGlobalView: boolean
    primaryTerritoryId: string | null
    territoryName: string | null
  }
  sentiment: {
    totalResponses: number
    summary: Array<{ sentiment: string; count: number; percentage: number }>
    trend7Days: Array<{
      date: string
      dateLabel: string
      total: number
      POSITIVE: number
      NEGATIVE: number
      NEUTRAL: number
      URGENT: number
    }>
  }
  polls: {
    active: number
    activePolls: Array<{
      id: string
      title: string
      responseCount: number
      territoryName: string | null
      closesAt: string | null
    }>
  }
  crisis: {
    total: number
    active: number
    resolved: number
    critical: number
    high: number
    medium: number
    low: number
    broadcastSent: number
    bySeverity: Record<string, number>
  }
  aspirasi: {
    total: number
    new: number
    reviewing: number
    addressed: number
    resolved: number
    urgent: number
    high: number
    normal: number
    low: number
    bySentiment: Record<string, number>
  }
  voters: {
    total: number
    topProvinces: Array<{ provinceCode: string; count: number }>
  }
  alerts: {
    total: number
    critical: number
    high: number
    items: Array<{
      type: string
      severity: string
      title: string
      message: string
      source: string
      sourceId?: string
      metadata?: any
    }>
  }
}

interface AspirationCluster {
  total: number
  byCategory: Array<{ category: string; count: number; percentage: number }>
  byOccupation: Array<{ occupation: string; count: number; percentage: number }>
  byProvince: Array<{ provinceCode: string; count: number; percentage: number }>
  topClusters: Array<{ aiCluster: string; count: number; percentage: number }>
  topOccupations: Array<{ occupation: string; count: number; percentage: number }>
  insights: Array<{
    type: string
    title: string
    description: string
    recommendation: string
    supportingData?: any
  }>
}

// ============================================================
// MAIN COMPONENT
// ============================================================

// ============================================================
// SHARED HELPERS
// ============================================================
function getAuthHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {
    'x-user-id': useAuthStore.getState().user?.id || '',
  }
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: any; maxChars: number; color: string; bg: string; border: string; text: string; mediaRequired: boolean }> = {
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare, maxChars: 4096, color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', mediaRequired: false },
  FACEBOOK: { label: 'Facebook', icon: Globe, maxChars: 63206, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', mediaRequired: false },
  INSTAGRAM: { label: 'Instagram', icon: Heart, maxChars: 2200, color: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', mediaRequired: true },
}

function ChannelBadge({ channel }: { channel: string }) {
  const cfg = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.WHATSAPP
  const Icon = cfg.icon
  return (
    <Badge variant="outline" className={`${cfg.bg} ${cfg.text} ${cfg.border} text-xs gap-1`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SENT: { label: 'Terkirim', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    QUEUED: { label: 'Antri', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    FAILED: { label: 'Gagal', cls: 'bg-red-50 text-red-700 border-red-200' },
    DRAFT: { label: 'Draft', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    ACTIVE: { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CLOSED: { label: 'Ditutup', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    ARCHIVED: { label: 'Arsip', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
    RESOLVED: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    NEW: { label: 'Baru', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    REVIEWING: { label: 'Ditinjau', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    ADDRESSED: { label: 'Ditangani', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }
  const v = map[status] || { label: status, cls: 'bg-gray-50 text-gray-700 border-gray-200' }
  return <Badge variant="outline" className={`text-xs ${v.cls}`}>{v.label}</Badge>
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-700 border-red-200',
    HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
    NORMAL: 'bg-blue-50 text-blue-700 border-blue-200',
    LOW: 'bg-gray-100 text-gray-700 border-gray-200',
  }
  return (
    <Badge variant="outline" className={`text-xs ${map[priority] || map.NORMAL}`}>
      {priority}
    </Badge>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    MEDIUM: 'bg-amber-100 text-amber-800 border-amber-300',
    LOW: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  }
  return (
    <Badge variant="outline" className={`text-xs font-bold ${map[severity] || map.MEDIUM}`}>
      {severity}
    </Badge>
  )
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const map: Record<string, string> = {
    POSITIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    NEGATIVE: 'bg-red-50 text-red-700 border-red-200',
    NEUTRAL: 'bg-gray-50 text-gray-700 border-gray-200',
    URGENT: 'bg-orange-50 text-orange-700 border-orange-200',
  }
  const iconMap: Record<string, any> = {
    POSITIVE: TrendingUp, NEGATIVE: TrendingDown, NEUTRAL: Activity, URGENT: Zap,
  }
  const Icon = iconMap[sentiment] || Activity
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${map[sentiment] || map.NEUTRAL}`}>
      <Icon className="w-3 h-3" /> {sentiment}
    </Badge>
  )
}

function AlertSeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-amber-400 text-amber-900',
    LOW: 'bg-yellow-200 text-yellow-900',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${map[severity] || map.LOW}`}>
      {severity}
    </span>
  )
}

function googleNewsUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`
}
function googleMapsUrl(query: string) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`
}
function googleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}

// ============================================================
// 1. COMMAND CENTER TAB
// ============================================================
function CommandCenterTab() {
  const [data, setData] = useState<CommandCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const loadData = useCallback(() => {
    api('/api/command-center')
      .then((d: CommandCenterData) => { setData(d); setLastRefresh(new Date()) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  if (loading) return <LoadingState message="Memuat data Command Center..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const { sentiment, crisis, aspirasi, voters, alerts } = data
  const positivePct = sentiment.summary.find((s) => s.sentiment === 'POSITIVE')?.percentage || 0
  const negativePct = sentiment.summary.find((s) => s.sentiment === 'NEGATIVE')?.percentage || 0

  return (
    <div className="space-y-5">
      {/* Hero Banner with Alerts Count */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-600 to-rose-700" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-0 right-0 opacity-5">
          <Shield className="w-64 h-64 -mr-12 -mt-12" />
        </div>
        <div className="relative z-10 p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Live Command Center</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black mb-1">
              {alerts.total > 0 ? `${alerts.total} Alert Aktif Terdeteksi` : 'Sistem Stabil'}
            </h2>
            <p className="text-sm opacity-90">
              {alerts.critical > 0 && `${alerts.critical} KRITIS · `}
              {alerts.high > 0 && `${alerts.high} HIGH · `}
              {data.scope.territoryName ? `Wilayah: ${data.scope.territoryName}` : 'Cakupan Nasional'}
              {' · '}Diperbarui: {formatDateTimeID(lastRefresh)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur"
              onClick={loadData}
            >
              <Activity className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.items.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" /> Alert & Peringatan Aktif
            </CardTitle>
            <CardDescription>
              {alerts.total} alert terdeteksi oleh sistem — perlu tindak lanjut
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.items.slice(0, 10).map((alert, idx) => {
              const Icon = alert.source === 'CRISIS' ? AlertTriangle :
                          alert.source === 'POLL' ? BarChart3 : Lightbulb
              const borderColors: Record<string, string> = {
                CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#ca8a04',
              }
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border-l-4"
                  style={{ borderLeftColor: borderColors[alert.severity] || '#d97706' }}
                >
                  <div className="mt-0.5">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <AlertSeverityBadge severity={alert.severity} />
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {alert.source}
                      </span>
                    </div>
                    <div className="font-semibold text-sm">{alert.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{alert.message}</div>
                  </div>
                  {alert.metadata?.regencyCode && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      <MapPin className="w-3 h-3 mr-1" /> {alert.metadata.regencyCode}
                    </Badge>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sentimen Total"
          value={sentiment.totalResponses.toLocaleString('id-ID')}
          subtitle={`${positivePct}% positif · ${negativePct}% negatif`}
          icon={BarChart3}
          color="orange"
        />
        <StatCard
          label="Crisis Zones"
          value={crisis.total}
          subtitle={`${crisis.critical} kritis · ${crisis.active} aktif`}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          label="Aspirasi Rakyat"
          value={aspirasi.total}
          subtitle={`${aspirasi.urgent} urgent · ${aspirasi.new} baru`}
          icon={Lightbulb}
          color="amber"
        />
        <StatCard
          label="Voter Contacts"
          value={voters.total.toLocaleString('id-ID')}
          subtitle={`${voters.topProvinces[0]?.count.toLocaleString('id-ID') || 0} di ${voters.topProvinces[0]?.provinceCode || '-'}`}
          icon={Users}
          color="emerald"
        />
      </div>

      {/* 7-Day Sentiment Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" /> Tren Sentimen 7 Hari Terakhir
          </CardTitle>
          <CardDescription>Total respons harian dari seluruh poll aktif</CardDescription>
        </CardHeader>
        <CardContent>
          {sentiment.trend7Days.every((t) => t.total === 0) ? (
            <EmptyState icon={TrendingUp} title="Belum ada data tren" description="Belum ada respons poll dalam 7 hari terakhir." />
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-2 h-48">
                {sentiment.trend7Days.map((day, idx) => {
                  const max = Math.max(...sentiment.trend7Days.map((d) => d.total), 1)
                  const heightPct = (day.total / max) * 100
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="text-xs font-semibold">{day.total || ''}</div>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-orange-600 to-orange-400 transition-all hover:from-orange-700 hover:to-orange-500"
                        style={{ height: `${Math.max(heightPct, day.total > 0 ? 4 : 0)}%` }}
                        title={`Total: ${day.total} | +${day.POSITIVE} -${day.NEGATIVE} =${day.NEUTRAL} !${day.URGENT}`}
                      />
                      <div className="text-xs text-muted-foreground">{day.dateLabel}</div>
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-3 justify-center pt-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-500" /> POSITIVE
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500" /> NEGATIVE
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-400" /> NEUTRAL
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-orange-500" /> URGENT
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Polls Quick Look + Quick Action Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-orange-600" /> Poll Aktif ({data.polls.activePolls.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {data.polls.activePolls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada poll aktif.</p>
            ) : (
              data.polls.activePolls.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.territoryName || 'Nasional'} · {p.responseCount} respons
                    </div>
                  </div>
                  {p.closesAt && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(p.closesAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-orange-600" /> Quick Actions
            </CardTitle>
            <CardDescription>Akses cepat ke modul Command Center</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => window.dispatchEvent(new CustomEvent('set-comm-tab', { detail: 'broadcast' }))}>
              <Send className="w-4 h-4 mr-2 text-emerald-600" />
              <div className="text-left">
                <div className="text-xs font-semibold">Buat Broadcast</div>
                <div className="text-[10px] text-muted-foreground">WA / FB / IG</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => window.dispatchEvent(new CustomEvent('set-comm-tab', { detail: 'crisis' }))}>
              <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
              <div className="text-left">
                <div className="text-xs font-semibold">Crisis Center</div>
                <div className="text-[10px] text-muted-foreground">Klarifikasi isu</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => window.dispatchEvent(new CustomEvent('set-comm-tab', { detail: 'polls' }))}>
              <BarChart3 className="w-4 h-4 mr-2 text-orange-600" />
              <div className="text-left">
                <div className="text-xs font-semibold">Polling Baru</div>
                <div className="text-[10px] text-muted-foreground">Sentimen rakyat</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => window.dispatchEvent(new CustomEvent('set-comm-tab', { detail: 'aspirations' }))}>
              <Lightbulb className="w-4 h-4 mr-2 text-amber-600" />
              <div className="text-left">
                <div className="text-xs font-semibold">Tinjau Aspirasi</div>
                <div className="text-[10px] text-muted-foreground">Voice of people</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        <Activity className="w-3 h-3 inline mr-1 animate-pulse" />
        Auto-refresh setiap 30 detik. Terakhir diperbarui: {formatDateTimeID(lastRefresh)}
      </p>
    </div>
  )
}

// ============================================================
// 2. MULTI-CHANNEL BROADCAST TAB
// ============================================================
function BroadcastTab() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api('/api/broadcasts'), api('/api/territory')])
      .then(([b, t]: any) => { setBroadcasts(b); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const totalSent = broadcasts.filter((b) => b.status === 'SENT').length
  const totalRecipients = broadcasts.reduce((sum, b) => sum + b.recipientCount, 0)
  const waCount = broadcasts.filter((b) => b.channel === 'WHATSAPP').length
  const fbCount = broadcasts.filter((b) => b.channel === 'FACEBOOK').length
  const igCount = broadcasts.filter((b) => b.channel === 'INSTAGRAM').length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Broadcast" value={broadcasts.length} icon={Send} color="orange" />
        <StatCard label="Terkirim" value={totalSent} icon={CheckCircle2} color="emerald" />
        <StatCard label="Total Penerima" value={totalRecipients.toLocaleString('id-ID')} icon={Users} color="blue" />
        <StatCard label="Channel Aktif" value={[waCount > 0, fbCount > 0, igCount > 0].filter(Boolean).length} icon={Globe} color="purple" />
      </div>

      {/* Per-channel cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM'] as const).map((ch) => {
          const cfg = CHANNEL_CONFIG[ch]
          const Icon = cfg.icon
          const count = broadcasts.filter((b) => b.channel === ch).length
          const recipients = broadcasts.filter((b) => b.channel === ch).reduce((s, b) => s + b.recipientCount, 0)
          return (
            <Card key={ch} className={`${cfg.bg} ${cfg.border} border-2`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${cfg.text}`} />
                  </div>
                  <Badge variant="outline" className={cfg.text}>{count} broadcast</Badge>
                </div>
                <div className="text-lg font-bold">{cfg.label}</div>
                <div className="text-xs text-muted-foreground">{recipients.toLocaleString('id-ID')} penerima · max {cfg.maxChars.toLocaleString('id-ID')} karakter</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-base font-semibold">Riwayat Broadcast</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStatsOpen(true)}>
            <BarChart3 className="w-4 h-4 mr-2" /> Statistik
          </Button>
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Buat Broadcast
          </Button>
        </div>
      </div>

      {broadcasts.length === 0 ? (
        <EmptyState icon={Send} title="Belum ada broadcast" description="Kirim pesan massal ke ribuan anggota melalui WhatsApp, Facebook, atau Instagram." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Pesan</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dikirim</TableHead>
                    <TableHead>Oleh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">{b.title}</TableCell>
                      <TableCell><ChannelBadge channel={b.channel} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">{b.message}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{b.recipientCount.toLocaleString('id-ID')}</Badge></TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                      <TableCell className="text-xs">{b.sentAt ? formatDateTimeID(b.sentAt) : b.scheduledAt ? `Jadwal: ${formatDateTimeID(b.scheduledAt)}` : '-'}</TableCell>
                      <TableCell className="text-xs">
                        <div>{b.sentBy?.fullName || '-'}</div>
                        <div className="text-muted-foreground">{b.sentBy?.territory?.name || ''}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AddBroadcastDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
      <BroadcastStatsDialog open={statsOpen} onOpenChange={setStatsOpen} broadcasts={broadcasts} />
    </div>
  )
}

// ----- Add Broadcast Dialog -----
function AddBroadcastDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    title: '', message: '', territoryId: '', scheduledAt: '', linkUrl: '',
  })
  const [channels, setChannels] = useState<string[]>(['WHATSAPP'])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const primaryChannel = channels[0] || 'WHATSAPP'
  const cfg = CHANNEL_CONFIG[primaryChannel] || CHANNEL_CONFIG.WHATSAPP
  const remainingChars = cfg.maxChars - form.message.length
  const needsMedia = channels.includes('INSTAGRAM') && !imageFile && !videoFile

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (channels.length === 0) {
      addToast('Pilih minimal 1 channel', 'error')
      return
    }
    if (needsMedia) {
      addToast('Instagram wajib menyertakan gambar atau video', 'error')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title', form.title)
      formData.append('message', form.message)
      formData.append('channels', JSON.stringify(channels))
      formData.append(
        'targetScope',
        JSON.stringify(form.territoryId ? { territoryId: form.territoryId } : { all: true })
      )
      if (form.scheduledAt) formData.append('scheduledAt', form.scheduledAt)
      if (form.linkUrl) formData.append('linkUrl', form.linkUrl)
      if (imageFile) formData.append('image', imageFile)
      if (videoFile) formData.append('video', videoFile)

      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: getAuthHeaders(false),
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

      addToast(`Broadcast berhasil dikirim ke ${channels.length} channel (simulasi)`, 'success')
      setForm({ title: '', message: '', territoryId: '', scheduledAt: '', linkUrl: '' })
      setChannels(['WHATSAPP'])
      setImageFile(null)
      setVideoFile(null)
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Buat Multi-Channel Broadcast</DialogTitle>
          <DialogDescription>Pilih channel, isi pesan, dan unggah media. Pesan akan dikirim ke anggota AKTIF.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Selector */}
          <div className="space-y-2">
            <Label>Pilih Channel *</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM'] as const).map((ch) => {
                const c = CHANNEL_CONFIG[ch]
                const Icon = c.icon
                const active = channels.includes(ch)
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      active ? `${c.bg} ${c.border} ${c.text}` : 'border-gray-200 text-muted-foreground hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{c.label}</span>
                    <span className="text-[10px] opacity-70">{c.maxChars.toLocaleString('id-ID')} char</span>
                  </button>
                )
              })}
            </div>
            {channels.includes('INSTAGRAM') && (
              <p className="text-xs text-purple-700 bg-purple-50 p-2 rounded">
                <Heart className="w-3 h-3 inline mr-1" />
                Instagram wajib menyertakan gambar atau video.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Judul Broadcast *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Isi Pesan *</Label>
              <span className={`text-xs ${remainingChars < 0 ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                {form.message.length.toLocaleString('id-ID')} / {cfg.maxChars.toLocaleString('id-ID')} char
              </span>
            </div>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              placeholder={`Tulis pesan untuk ${channels.map((c) => CHANNEL_CONFIG[c]?.label).join(', ')}...`}
              required
            />
          </div>

          {/* Media Upload */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Upload className="w-3 h-3" /> Gambar
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
              {imageFile && <p className="text-xs text-emerald-700">{imageFile.name}</p>}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Video className="w-3 h-3" /> Video
              </Label>
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
              {videoFile && <p className="text-xs text-emerald-700">{videoFile.name}</p>}
            </div>
          </div>

          {channels.includes('FACEBOOK') && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Link URL (untuk Facebook)
              </Label>
              <Input
                type="url"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Target Wilayah</Label>
              <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Semua wilayah" /></SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jadwal Kirim</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <Send className="w-4 h-4 inline mr-1" />
            Mode simulasi — di produksi akan terintegrasi dengan WhatsApp Business API, Facebook Graph API, dan Instagram Content Publishing API.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading || needsMedia}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {loading ? 'Mengirim...' : `Kirim ke ${channels.length} Channel`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ----- Broadcast Stats Dialog -----
function BroadcastStatsDialog({
  open, onOpenChange, broadcasts,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  broadcasts: Broadcast[]
}) {
  const channelStats = (['WHATSAPP', 'FACEBOOK', 'INSTAGRAM'] as const).map((ch) => {
    const list = broadcasts.filter((b) => b.channel === ch)
    const recipients = list.reduce((s, b) => s + b.recipientCount, 0)
    return { channel: ch, count: list.length, recipients, sent: list.filter((b) => b.status === 'SENT').length }
  })
  const totalRecipients = broadcasts.reduce((s, b) => s + b.recipientCount, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Statistik Broadcast
          </DialogTitle>
          <DialogDescription>Analitik per channel</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {channelStats.map((s) => {
            const cfg = CHANNEL_CONFIG[s.channel]
            const Icon = cfg.icon
            return (
              <div key={s.channel} className={`p-3 rounded-lg ${cfg.bg} ${cfg.border} border`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${cfg.text}`} />
                    <span className="font-semibold">{cfg.label}</span>
                  </div>
                  <Badge variant="outline" className={cfg.text}>{s.count} broadcast</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Terkirim</div>
                    <div className="font-bold text-base">{s.sent}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Penerima</div>
                    <div className="font-bold text-base">{s.recipients.toLocaleString('id-ID')}</div>
                  </div>
                </div>
              </div>
            )
          })}
          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-600" />
                <span className="font-semibold">Total Penerima</span>
              </div>
              <div className="text-lg font-black text-orange-700">{totalRecipients.toLocaleString('id-ID')}</div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// 3. PENGUMUMAN INTERNAL TAB
// ============================================================
function AnnouncementTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api('/api/announcements?category=PENGUMUMAN'), api('/api/territory')])
      .then(([a, t]: any) => { setAnnouncements(a); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  const pinned = announcements.filter((a) => a.isPinned)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Buat Pengumuman
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState icon={Bell} title="Belum ada pengumuman" description="Buat pengumuman untuk ditampilkan di dashboard anggota." />
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-2">
                <Pin className="w-4 h-4 text-orange-600" /> Disematkan
              </div>
              {pinned.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
            </div>
          )}
          <div className="space-y-2">
            {announcements.filter((a) => !a.isPinned).map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
          </div>
        </>
      )}

      <AddAnnouncementDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const typeColors: Record<string, string> = {
    INFO: '#3b82f6',
    WARNING: '#f59e0b',
    URGENT: '#ef4444',
  }
  return (
    <Card className="border-l-4" style={{ borderLeftColor: typeColors[announcement.type] || '#6b7280' }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {announcement.isPinned && <Pin className="w-4 h-4 text-orange-600" />}
            <div className="font-bold">{announcement.title}</div>
          </div>
          <Badge variant="outline" className="text-xs">{announcement.type}</Badge>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>Oleh: {announcement.createdBy?.fullName || '-'}</span>
          <span>•</span>
          <span>{announcement.territory?.name}</span>
          <span>•</span>
          <span>{formatDateTimeID(announcement.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function AddAnnouncementDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    title: '', content: '', type: 'INFO', priority: 'NORMAL',
    isPinned: false, territoryId: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          type: form.type,
          priority: form.priority,
          isPinned: form.isPinned,
          territoryId: form.territoryId,
          category: 'PENGUMUMAN',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      addToast('Pengumuman berhasil dibuat', 'success')
      setForm({ title: '', content: '', type: 'INFO', priority: 'NORMAL', isPinned: false, territoryId: '' })
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Buat Pengumuman Internal</DialogTitle>
          <DialogDescription>Pengumuman akan muncul di dashboard pengurus di wilayah terkait.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Judul *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Isi Pengumuman *</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="WARNING">Peringatan</SelectItem>
                  <SelectItem value="URGENT">Mendesak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioritas</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Rendah</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">Tinggi</SelectItem>
                  <SelectItem value="URGENT">Mendesak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Wilayah *</Label>
            <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
              <SelectContent>
                {territories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinned-ann"
              checked={form.isPinned}
              onChange={(e) => setForm({ ...form, isPinned: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="pinned-ann">Sematkan di atas</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// 4. SENTIMEN PRESIDEN TAB (POLLS)
// ============================================================
function PollsTab() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api('/api/polls'), api('/api/territory')])
      .then(([p, t]: any) => { setPolls(p); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState message="Memuat data polling..." />
  if (error) return <ErrorState message={error} />

  const activeCount = polls.filter((p) => p.status === 'ACTIVE').length
  const totalResponses = polls.reduce((s, p) => s + (p._count?.responses || 0), 0)
  const broadcasted = polls.filter((p) => p.broadcastSentAt).length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Polls" value={polls.length} icon={BarChart3} color="orange" />
        <StatCard label="Poll Aktif" value={activeCount} icon={Activity} color="emerald" />
        <StatCard label="Total Respons" value={totalResponses.toLocaleString('id-ID')} icon={Users} color="blue" />
        <StatCard label="Sudah Broadcast" value={broadcasted} icon={Send} color="purple" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Buat Poll Baru
        </Button>
      </div>

      {polls.length === 0 ? (
        <EmptyState icon={BarChart3} title="Belum ada polling" description="Buat poll sentimen pertama Anda untuk mengukur dukungan rakyat." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {polls.map((p) => <PollCard key={p.id} poll={p} onAction={loadData} />)}
        </div>
      )}

      <AddPollDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function PollCard({ poll, onAction }: { poll: Poll; onAction: () => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [activating, setActivating] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  let parsedOptions: PollOption[] = []
  try { parsedOptions = JSON.parse(poll.options) } catch { parsedOptions = [] }

  const handleActivate = async () => {
    setActivating(true)
    try {
      const res = await fetch(`/api/polls/${poll.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          status: 'ACTIVE',
          broadcastSentAt: new Date().toISOString(),
          broadcastRecipientCount: 1000,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      addToast(data.message || 'Poll berhasil diaktifkan & disiarkan', 'success')
      onAction()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setActivating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/polls/${poll.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(true),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      addToast('Poll berhasil dihapus', 'success')
      onAction()
      setDeleteOpen(false)
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={poll.status} />
              {poll.territory && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" /> {poll.territory.name}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" /> {poll._count?.responses || 0} respons
              </Badge>
            </div>
            <h4 className="font-bold text-sm leading-tight">{poll.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{poll.question}</p>
          </div>
        </div>

        {parsedOptions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {parsedOptions.slice(0, 4).map((opt) => (
              <Badge key={opt.id} variant="outline" className="text-[10px]">{opt.label}</Badge>
            ))}
            {parsedOptions.length > 4 && (
              <Badge variant="outline" className="text-[10px]">+{parsedOptions.length - 4}</Badge>
            )}
          </div>
        )}

        {poll.triggerEvent && (
          <div className="text-xs bg-orange-50 border border-orange-200 rounded p-2 flex items-center gap-2">
            <Zap className="w-3 h-3 text-orange-600 shrink-0" />
            <span className="text-orange-800">Trigger: {poll.triggerEvent}</span>
            {poll.triggerUrl && (
              <a href={poll.triggerUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-blue-600 hover:underline inline-flex items-center gap-0.5">
                <ExternalLink className="w-3 h-3" /> Sumber
              </a>
            )}
          </div>
        )}

        {poll.broadcastSentAt && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Send className="w-3 h-3" />
            Disiarkan: {formatDateTimeID(poll.broadcastSentAt)}
            {poll.broadcastRecipientCount ? ` · ${poll.broadcastRecipientCount.toLocaleString('id-ID')} penerima` : ''}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={() => setAnalyticsOpen(true)}>
            <BarChart3 className="w-3 h-3 mr-1" /> Analytics
          </Button>
          {poll.status === 'DRAFT' && (
            <Button size="sm" onClick={handleActivate} disabled={activating} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {activating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
              {activating ? 'Aktifkan...' : 'Aktifkan & Broadcast'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        <PollAnalyticsDialog
          open={analyticsOpen}
          onOpenChange={setAnalyticsOpen}
          pollId={poll.id}
          pollTitle={poll.title}
        />

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent aria-describedby={undefined}>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Poll?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini tidak dapat dibatalkan. Semua respons akan dihapus, aspirasi terkait akan dilepas dari poll ini.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {deleting ? 'Menghapus...' : 'Hapus'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

function AddPollDialog({
  open, onOpenChange, territories, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    title: '', question: '', description: '',
    triggerEvent: '', triggerUrl: '', territoryId: '', status: 'DRAFT',
  })
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', label: '', sentiment: 'POSITIVE' },
    { id: '2', label: '', sentiment: 'NEGATIVE' },
  ])
  const [loading, setLoading] = useState(false)

  const addOption = () => {
    setOptions([...options, { id: String(options.length + 1), label: '', sentiment: 'NEUTRAL' }])
  }
  const removeOption = (idx: number) => {
    if (options.length <= 2) {
      addToast('Minimal 2 opsi jawaban', 'error')
      return
    }
    setOptions(options.filter((_, i) => i !== idx))
  }
  const updateOption = (idx: number, field: keyof PollOption, value: string) => {
    setOptions(options.map((o, i) => (i === idx ? { ...o, [field]: value } : o)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validOptions = options.filter((o) => o.label.trim())
    if (validOptions.length < 2) {
      addToast('Minimal 2 opsi jawaban harus diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          title: form.title,
          question: form.question,
          description: form.description || undefined,
          triggerEvent: form.triggerEvent || undefined,
          triggerUrl: form.triggerUrl || undefined,
          options: validOptions,
          territoryId: form.territoryId,
          status: form.status,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      addToast('Poll berhasil dibuat', 'success')
      setForm({ title: '', question: '', description: '', triggerEvent: '', triggerUrl: '', territoryId: '', status: 'DRAFT' })
      setOptions([
        { id: '1', label: '', sentiment: 'POSITIVE' },
        { id: '2', label: '', sentiment: 'NEGATIVE' },
      ])
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Buat Poll Sentimen
          </DialogTitle>
          <DialogDescription>Poll untuk mengukur sentimen rakyat terhadap isu atau kebijakan tertentu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Judul Poll *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Pertanyaan *</Label>
            <Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={2} required />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi (opsional)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Trigger Event (opsional)</Label>
              <Input value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value })} placeholder="cth: Kebijakan Subsidi Pupuk" />
            </div>
            <div className="space-y-2">
              <Label>Trigger URL (opsional)</Label>
              <Input value={form.triggerUrl} onChange={(e) => setForm({ ...form, triggerUrl: e.target.value })} placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Wilayah Target *</Label>
              <Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ACTIVE">Aktif Langsung</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Opsi Jawaban (min 2) *</Label>
              <Button type="button" size="sm" variant="outline" onClick={addOption}>
                <Plus className="w-3 h-3 mr-1" /> Tambah Opsi
              </Button>
            </div>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(idx, 'label', e.target.value)}
                    placeholder={`Opsi ${idx + 1}`}
                    className="flex-1"
                  />
                  <Select value={opt.sentiment} onValueChange={(v) => updateOption(idx, 'sentiment', v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POSITIVE">Positive</SelectItem>
                      <SelectItem value="NEGATIVE">Negative</SelectItem>
                      <SelectItem value="NEUTRAL">Neutral</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => removeOption(idx)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Menyimpan...' : 'Simpan Poll'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PollAnalyticsDialog({
  open, onOpenChange, pollId, pollTitle,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  pollId: string; pollTitle: string
}) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    api(`/api/polls/${pollId}/analytics`)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [open, pollId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Analytics: {pollTitle}
          </DialogTitle>
          <DialogDescription>Detail sentimen, demografi, dan alert dari poll ini</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
          </div>
        )}
        {error && <ErrorState message={error} />}
        {data && !loading && !error && (
          <div className="space-y-4">
            {/* Sentiment Summary */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">Sentimen Summary ({data.poll?.totalResponses || 0} respons)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {data.sentimentSummary?.map((s: any) => (
                  <div key={s.sentiment} className="p-2 rounded-md bg-muted/40 text-center">
                    <SentimentBadge sentiment={s.sentiment} />
                    <div className="text-lg font-black mt-1">{s.count}</div>
                    <div className="text-xs text-muted-foreground">{s.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart per Option */}
            {data.poll?.options && data.poll.options.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">Distribusi per Opsi</h4>
                <div className="space-y-2">
                  {data.poll.options.map((opt: any) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <div className="text-xs w-32 truncate">{opt.label}</div>
                      <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                        <div
                          className={`h-full ${opt.sentiment === 'POSITIVE' ? 'bg-emerald-500' : opt.sentiment === 'NEGATIVE' ? 'bg-red-500' : opt.sentiment === 'URGENT' ? 'bg-orange-500' : 'bg-gray-400'}`}
                          style={{ width: `${Math.min(100, (opt.count || 0) / Math.max(data.poll.totalResponses, 1) * 100)}%` }}
                        />
                      </div>
                      <div className="text-xs font-semibold w-12 text-right">{opt.count || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Demographic Breakdown */}
            <div className="grid md:grid-cols-2 gap-3">
              {(['ageGroup', 'gender', 'occupation', 'provinceCode'] as const).map((key) => {
                const list = data.demographicBreakdown?.[key] || []
                if (list.length === 0) return null
                return (
                  <div key={key}>
                    <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-1">{key}</h5>
                    <div className="space-y-1">
                      {list.slice(0, 5).map((item: any) => (
                        <div key={item.label} className="flex items-center justify-between text-xs">
                          <span>{item.label}</span>
                          <span className="font-semibold">{item.count} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Alerts */}
            {data.alerts && data.alerts.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" /> Alert ({data.alerts.length})
                </h4>
                <div className="space-y-2">
                  {data.alerts.slice(0, 5).map((a: any, idx: number) => (
                    <div key={idx} className="p-2 rounded bg-red-50 border border-red-200 text-xs">
                      <div className="font-semibold text-red-800">{a.title}</div>
                      <div className="text-red-700 mt-0.5">{a.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
// 5. CRISIS CENTER TAB
// ============================================================
function CrisisTab() {
  const [crisisZones, setCrisisZones] = useState<CrisisZone[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api('/api/crisis-zones'), api('/api/territory')])
      .then(([c, t]: any) => { setCrisisZones(c); setTerritories(t) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState message="Memuat data crisis zones..." />
  if (error) return <ErrorState message={error} />

  const active = crisisZones.filter((c) => c.status === 'ACTIVE')
  const resolved = crisisZones.filter((c) => c.status === 'RESOLVED')
  const critical = crisisZones.filter((c) => c.severity === 'CRITICAL' && c.status === 'ACTIVE')
  const broadcasted = crisisZones.filter((c) => c.broadcastSentAt)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Crisis" value={crisisZones.length} icon={AlertTriangle} color="red" />
        <StatCard label="Aktif" value={active.length} icon={Activity} color="orange" />
        <StatCard label="Kritis (Aktif)" value={critical.length} icon={Shield} color="purple" />
        <StatCard label="Klarifikasi Terkirim" value={broadcasted.length} icon={Send} color="emerald" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)} className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
          <Plus className="w-4 h-4 mr-2" /> Tandai Crisis Zone Baru
        </Button>
      </div>

      {crisisZones.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Tidak ada crisis zone" description="Belum ada isu negatif yang ditandai sebagai crisis zone." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {crisisZones.map((c) => <CrisisCard key={c.id} crisis={c} onAction={loadData} />)}
        </div>
      )}

      <CrisisZoneFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        territories={territories}
        onSuccess={() => { loadData(); setAddOpen(false) }}
      />
    </div>
  )
}

function CrisisCard({ crisis, onAction }: { crisis: CrisisZone; onAction: () => void }) {
  const addToast = useToastStore((s) => s.addToast)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const severityColors: Record<string, string> = {
    CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#ca8a04',
  }
  const googleNewsLink = crisis.issueSource || googleNewsUrl(`${crisis.title} ${crisis.territory?.name || ''}`)
  const googleMapsLink = googleMapsUrl(`${crisis.title} ${crisis.territory?.name || ''}`)

  const handleResolve = async () => {
    setResolving(true)
    try {
      const res = await fetch(`/api/crisis-zones/${crisis.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          status: 'RESOLVED',
          resolutionNotes: resolutionNotes || 'Crisis zone telah ditangani dan ditandai sebagai selesai.',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      addToast('Crisis zone berhasil ditandai RESOLVED', 'success')
      onAction()
      setResolveOpen(false)
      setResolutionNotes('')
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setResolving(false)
    }
  }

  return (
    <Card className="border-l-4" style={{ borderLeftColor: severityColors[crisis.severity] || '#d97706' }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <SeverityBadge severity={crisis.severity} />
              <StatusBadge status={crisis.status} />
              {crisis.territory && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" /> {crisis.territory.name}
                </Badge>
              )}
              {crisis.isLocked && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  <Shield className="w-3 h-3 mr-1" /> GEO-LOCKED
                </Badge>
              )}
            </div>
            <h4 className="font-bold text-sm leading-tight">{crisis.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{crisis.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          <Badge variant="outline" className="text-[10px]">{crisis.issueCategory}</Badge>
          <Badge variant="outline" className="text-[10px]">Sentiment: {crisis.sentimentScore}</Badge>
          <Badge variant="outline" className="text-[10px]">{formatDateTimeID(crisis.createdAt)}</Badge>
        </div>

        {/* Source links */}
        <div className="flex flex-wrap gap-2 pt-1">
          {crisis.issueSource && (
            <a
              href={crisis.issueSource}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
            >
              <FileText className="w-3 h-3" /> Sumber Isu
            </a>
          )}
          <a
            href={googleNewsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
          >
            <ExternalLink className="w-3 h-3" /> Google News
          </a>
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
          >
            <MapPin className="w-3 h-3" /> Google Maps
          </a>
        </div>

        {crisis.broadcastSentAt && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2 flex items-center gap-1">
            <Send className="w-3 h-3" />
            Klarifikasi disiarkan: {formatDateTimeID(crisis.broadcastSentAt)}
            {crisis.broadcastRecipientCount ? ` · ${crisis.broadcastRecipientCount.toLocaleString('id-ID')} penerima` : ''}
          </div>
        )}

        {crisis.clarificationMessage && (
          <div className="text-xs bg-orange-50 border border-orange-200 rounded p-2">
            <div className="font-semibold text-orange-800 mb-1">Klarifikasi:</div>
            <p className="text-orange-700">{crisis.clarificationMessage}</p>
            {crisis.clarificationQuote && (
              <p className="text-orange-700 italic mt-1">"{crisis.clarificationQuote}"</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {crisis.status === 'ACTIVE' && (
            <>
              <Button size="sm" onClick={() => setBroadcastOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Send className="w-3 h-3 mr-1" /> Siarkan Klarifikasi
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 ml-auto"
                onClick={() => setResolveOpen(true)}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
              </Button>
            </>
          )}
          {crisis.status === 'RESOLVED' && crisis.resolvedAt && (
            <div className="text-xs text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Resolved: {formatDateTimeID(crisis.resolvedAt)}
              {crisis.resolvedBy?.fullName && ` oleh ${crisis.resolvedBy.fullName}`}
            </div>
          )}
        </div>

        <CrisisBroadcastDialog
          open={broadcastOpen}
          onOpenChange={setBroadcastOpen}
          crisis={crisis}
          onSuccess={onAction}
        />
        <CrisisZoneFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          territories={[]}
          editCrisis={crisis}
          onSuccess={() => { onAction(); setEditOpen(false) }}
        />

        <AlertDialog open={resolveOpen} onOpenChange={setResolveOpen}>
          <AlertDialogContent aria-describedby={undefined}>
            <AlertDialogHeader>
              <AlertDialogTitle>Tandai Crisis Zone sebagai RESOLVED?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menandai crisis zone sebagai selesai dan membuka kunci geo-fencing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label>Catatan Resolusi</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                placeholder="Jelaskan tindakan yang telah diambil..."
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResolve}
                disabled={resolving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {resolving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {resolving ? 'Menyelesaikan...' : 'Tandai Resolved'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

function CrisisZoneFormDialog({
  open, onOpenChange, territories, editCrisis, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  territories: Territory[]
  editCrisis?: CrisisZone
  onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const isEdit = !!editCrisis
  const [form, setForm] = useState({
    title: '', description: '', issueCategory: 'POLITIK',
    issueSource: '', sentimentScore: 0, territoryId: '', severity: 'MEDIUM',
    isLocked: true, clarificationMessage: '', clarificationVideoUrl: '', clarificationQuote: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editCrisis) {
      setForm({
        title: editCrisis.title,
        description: editCrisis.description,
        issueCategory: editCrisis.issueCategory || 'POLITIK',
        issueSource: editCrisis.issueSource || '',
        sentimentScore: editCrisis.sentimentScore || 0,
        territoryId: editCrisis.territoryId,
        severity: editCrisis.severity || 'MEDIUM',
        isLocked: editCrisis.isLocked,
        clarificationMessage: editCrisis.clarificationMessage || '',
        clarificationVideoUrl: editCrisis.clarificationVideoUrl || '',
        clarificationQuote: editCrisis.clarificationQuote || '',
      })
    } else {
      setForm({
        title: '', description: '', issueCategory: 'POLITIK',
        issueSource: '', sentimentScore: 0, territoryId: '', severity: 'MEDIUM',
        isLocked: true, clarificationMessage: '', clarificationVideoUrl: '', clarificationQuote: '',
      })
    }
  }, [editCrisis, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        issueCategory: form.issueCategory,
        issueSource: form.issueSource || undefined,
        sentimentScore: Number(form.sentimentScore),
        territoryId: form.territoryId,
        severity: form.severity,
        isLocked: form.isLocked,
        clarificationMessage: form.clarificationMessage || undefined,
        clarificationVideoUrl: form.clarificationVideoUrl || undefined,
        clarificationQuote: form.clarificationQuote || undefined,
      }
      const url = isEdit ? `/api/crisis-zones/${editCrisis!.id}` : '/api/crisis-zones'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      addToast(isEdit ? 'Crisis zone berhasil diperbarui' : 'Crisis zone berhasil dibuat', 'success')
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {isEdit ? 'Edit Crisis Zone' : 'Tandai Crisis Zone Baru'}
          </DialogTitle>
          <DialogDescription>
            Crisis zone akan mengunci wilayah (geo-fencing) untuk klarifikasi terfokus.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Judul Crisis *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi Isu *</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Kategori Isu *</Label>
              <Select value={form.issueCategory} onValueChange={(v) => setForm({ ...form, issueCategory: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POLITIK">Politik</SelectItem>
                  <SelectItem value="EKONOMI">Ekonomi</SelectItem>
                  <SelectItem value="SOSIAL">Sosial</SelectItem>
                  <SelectItem value="AGAMA">Agama</SelectItem>
                  <SelectItem value="KEAMANAN">Keamanan</SelectItem>
                  <SelectItem value="LINGKUNGAN">Lingkungan</SelectItem>
                  <SelectItem value="LAINNYA">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity *</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Skor Sentimen (-100 s/d 100)</Label>
              <Input
                type="number"
                min={-100}
                max={100}
                value={form.sentimentScore}
                onChange={(e) => setForm({ ...form, sentimentScore: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Wilayah *</Label>
              <Select
                value={form.territoryId}
                onValueChange={(v) => setForm({ ...form, territoryId: v })}
                disabled={isEdit}
              >
                <SelectTrigger><SelectValue placeholder="Pilih wilayah..." /></SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sumber Isu (URL)</Label>
            <Input
              type="url"
              value={form.issueSource}
              onChange={(e) => setForm({ ...form, issueSource: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Pesan Klarifikasi</Label>
            <Textarea
              value={form.clarificationMessage}
              onChange={(e) => setForm({ ...form, clarificationMessage: e.target.value })}
              rows={3}
              placeholder="Pesan resmi klarifikasi..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Video className="w-3 h-3" /> URL Video Klarifikasi
              </Label>
              <Input
                type="url"
                value={form.clarificationVideoUrl}
                onChange={(e) => setForm({ ...form, clarificationVideoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Quote Klarifikasi</Label>
              <Input
                value={form.clarificationQuote}
                onChange={(e) => setForm({ ...form, clarificationQuote: e.target.value })}
                placeholder="Kutipan penting..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLocked"
              checked={form.isLocked}
              onChange={(e) => setForm({ ...form, isLocked: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="isLocked">Kunci Wilayah (GEO-LOCKED)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Menyimpan...' : isEdit ? 'Update Crisis Zone' : 'Simpan Crisis Zone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CrisisBroadcastDialog({
  open, onOpenChange, crisis, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  crisis: CrisisZone; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    clarificationMessage: '', clarificationVideoUrl: '', clarificationQuote: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (open) {
      setForm({
        clarificationMessage: crisis.clarificationMessage || '',
        clarificationVideoUrl: crisis.clarificationVideoUrl || '',
        clarificationQuote: crisis.clarificationQuote || '',
      })
      setResult(null)
    }
  }, [open, crisis])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clarificationMessage) {
      addToast('Pesan klarifikasi wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/crisis-zones/${crisis.id}/broadcast`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setResult(data.data)
      addToast(data.message || 'Klarifikasi berhasil disiarkan', 'success')
      onSuccess()
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-emerald-600" /> Siarkan Klarifikasi
          </DialogTitle>
          <DialogDescription>
            Klarifikasi akan dikirim ke VoterContact di wilayah <strong>{crisis.territory?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <div className="font-bold text-emerald-800">Klarifikasi Berhasil Disiarkan!</div>
              <div className="text-sm text-emerald-700 mt-1">
                Terkirim ke <strong>{result.broadcastDetails?.recipientCount?.toLocaleString('id-ID') || 0}</strong> kontak pemilih
              </div>
            </div>
            <div className="text-xs space-y-1 bg-muted/40 rounded p-3">
              <div><strong>Judul Broadcast:</strong> {result.broadcastDetails?.title}</div>
              <div><strong>Channel:</strong> {result.broadcastDetails?.channel}</div>
              <div><strong>Status:</strong> {result.broadcastDetails?.status}</div>
              <div><strong>Crisis Zone:</strong> {result.crisisZone?.title}</div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Selesai
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label>Pesan Klarifikasi *</Label>
              <Textarea
                value={form.clarificationMessage}
                onChange={(e) => setForm({ ...form, clarificationMessage: e.target.value })}
                rows={4}
                placeholder="Tulis pesan klarifikasi resmi..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Video className="w-3 h-3" /> URL Video Klarifikasi (opsional)
              </Label>
              <Input
                type="url"
                value={form.clarificationVideoUrl}
                onChange={(e) => setForm({ ...form, clarificationVideoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Quote Penting (opsional)</Label>
              <Input
                value={form.clarificationQuote}
                onChange={(e) => setForm({ ...form, clarificationQuote: e.target.value })}
                placeholder="Kutipan untuk disorot..."
              />
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              <Users className="w-4 h-4 inline mr-1" />
              Estimasi penerima: VoterContact aktif & WhatsApp opt-in di wilayah {crisis.territory?.name}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {loading ? 'Mengirim...' : 'Siarkan Klarifikasi'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// 6. ASPIRASI RAKYAT TAB
// ============================================================
function AspirationsTab() {
  const [aspirations, setAspirations] = useState<Aspiration[]>([])
  const [cluster, setCluster] = useState<AspirationCluster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [analyticsOpen, setAnalyticsOpen] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api('/api/aspirations'), api('/api/aspirations/cluster')])
      .then(([a, c]: any) => { setAspirations(a); setCluster(c) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return <LoadingState message="Memuat aspirasi rakyat..." />
  if (error) return <ErrorState message={error} />

  const filtered = aspirations.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (filterCategory !== 'all' && a.category !== filterCategory) return false
    return true
  })

  const total = aspirations.length
  const newCount = aspirations.filter((a) => a.status === 'NEW').length
  const urgent = aspirations.filter((a) => a.priority === 'URGENT').length
  const reviewed = aspirations.filter((a) => a.reviewedAt).length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Aspirasi" value={total} icon={Lightbulb} color="orange" />
        <StatCard label="Baru" value={newCount} icon={Bell} color="blue" />
        <StatCard label="Urgent" value={urgent} icon={Zap} color="red" />
        <StatCard label="Sudah Direview" value={reviewed} icon={CheckCircle2} color="emerald" />
      </div>

      {/* AI Insights Section */}
      {cluster && cluster.insights && cluster.insights.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-5 h-5 text-orange-600" /> AI Insights & Rekomendasi Pidato
            </CardTitle>
            <CardDescription>
              Berdasarkan {cluster.total} aspirasi — rekomendasi tema pidato otomatis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {cluster.insights.slice(0, 4).map((ins, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white/70 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-sm">{ins.title}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{ins.description}</p>
                {ins.recommendation && (
                  <div className="text-xs text-orange-800 bg-orange-100 rounded p-2">
                    <strong>Rekomendasi:</strong> {ins.recommendation}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="NEW">Baru</SelectItem>
              <SelectItem value="REVIEWING">Ditinjau</SelectItem>
              <SelectItem value="ADDRESSED">Ditangani</SelectItem>
              <SelectItem value="RESOLVED">Selesai</SelectItem>
              <SelectItem value="ARCHIVED">Arsip</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="PERTANIAN">Pertanian</SelectItem>
              <SelectItem value="EKONOMI">Ekonomi</SelectItem>
              <SelectItem value="PENDIDIKAN">Pendidikan</SelectItem>
              <SelectItem value="KESEHATAN">Kesehatan</SelectItem>
              <SelectItem value="INFRASTRUKTUR">Infrastruktur</SelectItem>
              <SelectItem value="LAINNYA">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => setAnalyticsOpen(true)}>
            <BarChart3 className="w-4 h-4 mr-2" /> Speech Insights
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Tidak ada aspirasi" description="Belum ada aspirasi yang cocok dengan filter ini." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((a) => <AspirationCard key={a.id} aspiration={a} onAction={loadData} />)}
        </div>
      )}

      <AspirationAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        cluster={cluster}
      />
    </div>
  )
}

function AspirationCard({ aspiration, onAction }: { aspiration: Aspiration; onAction: () => void }) {
  const [reviewOpen, setReviewOpen] = useState(false)

  const regencyCode = aspiration.regencyCode || aspiration.provinceCode || ''
  const title = aspiration.title
  const sumberAsli = aspiration.sourceUrl
  const gNews = googleNewsUrl(`${title} ${regencyCode}`)
  const gMaps = googleMapsUrl(`${title} ${regencyCode}`)
  const gSearch = googleSearchUrl(title)

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={aspiration.status} />
              <Badge variant="outline" className="text-[10px]">{aspiration.category}</Badge>
              {aspiration.subCategory && (
                <Badge variant="outline" className="text-[10px]">{aspiration.subCategory}</Badge>
              )}
              <PriorityBadge priority={aspiration.priority} />
              <SentimentBadge sentiment={aspiration.sentiment} />
            </div>
            <h4 className="font-bold text-sm leading-tight">{aspiration.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{aspiration.message}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          {aspiration.occupation && (
            <Badge variant="outline" className="text-[10px]">
              <Users className="w-3 h-3 mr-1" /> {aspiration.occupation}
            </Badge>
          )}
          {regencyCode && (
            <Badge variant="outline" className="text-[10px]">
              <MapPin className="w-3 h-3 mr-1" /> {regencyCode}
            </Badge>
          )}
          {aspiration.ageGroup && (
            <Badge variant="outline" className="text-[10px]">{aspiration.ageGroup}</Badge>
          )}
          {aspiration.gender && (
            <Badge variant="outline" className="text-[10px]">{aspiration.gender}</Badge>
          )}
        </div>

        {aspiration.aiCluster && (
          <div className="text-xs bg-purple-50 border border-purple-200 rounded p-2">
            <div className="flex items-center gap-1 text-purple-700">
              <Target className="w-3 h-3" />
              <strong>AI Cluster:</strong>
            </div>
            <code className="text-purple-800 text-[10px] block mt-1 break-all">{aspiration.aiCluster}</code>
          </div>
        )}

        {/* Cek Sumber section */}
        <div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Cek Sumber</div>
          <div className="flex flex-wrap gap-2">
            {sumberAsli && (
              <a href={sumberAsli} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
                <FileText className="w-3 h-3" /> Sumber Asli
              </a>
            )}
            <a href={gNews} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
              <ExternalLink className="w-3 h-3" /> Google News
            </a>
            <a href={gMaps} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
              <MapPin className="w-3 h-3" /> Google Maps
            </a>
            <a href={gSearch} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
              <Search className="w-3 h-3" /> Google Search
            </a>
          </div>
        </div>

        {aspiration.reviewedAt && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Direview: {formatDateTimeID(aspiration.reviewedAt)}
            {aspiration.reviewedBy?.fullName && ` oleh ${aspiration.reviewedBy.fullName}`}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">{formatDateTimeID(aspiration.submittedAt)}</span>
          <Button size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
            <Eye className="w-3 h-3 mr-1" /> Review
          </Button>
        </div>

        <ReviewAspirationDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          aspiration={aspiration}
          onSuccess={onAction}
        />
      </CardContent>
    </Card>
  )
}

function ReviewAspirationDialog({
  open, onOpenChange, aspiration, onSuccess,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  aspiration: Aspiration; onSuccess: () => void
}) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    status: 'NEW', priority: 'NORMAL', category: 'LAINNYA', reviewNotes: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        status: aspiration.status,
        priority: aspiration.priority,
        category: aspiration.category,
        reviewNotes: aspiration.reviewNotes || '',
      })
    }
  }, [open, aspiration])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/aspirations/${aspiration.id}/review`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      addToast('Aspirasi berhasil ditinjau', 'success')
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      addToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const regencyCode = aspiration.regencyCode || aspiration.provinceCode || ''
  const title = aspiration.title
  const sumberAsli = aspiration.sourceUrl
  const gNews = googleNewsUrl(`${title} ${regencyCode}`)
  const gMaps = googleMapsUrl(`${title} ${regencyCode}`)
  const gSearch = googleSearchUrl(title)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" /> Review Aspirasi
          </DialogTitle>
          <DialogDescription>{aspiration.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Detail Aspiration */}
          <div className="bg-muted/40 rounded-lg p-3 space-y-2">
            <div className="flex flex-wrap gap-1">
              <StatusBadge status={aspiration.status} />
              <PriorityBadge priority={aspiration.priority} />
              <SentimentBadge sentiment={aspiration.sentiment} />
              <Badge variant="outline" className="text-xs">{aspiration.category}</Badge>
              {aspiration.subCategory && (
                <Badge variant="outline" className="text-xs">{aspiration.subCategory}</Badge>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{aspiration.message}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {aspiration.senderName && <div><strong>Pengirim:</strong> {aspiration.senderName}</div>}
              {aspiration.occupation && <div><strong>Pekerjaan:</strong> {aspiration.occupation}</div>}
              {aspiration.ageGroup && <div><strong>Usia:</strong> {aspiration.ageGroup}</div>}
              {aspiration.gender && <div><strong>Gender:</strong> {aspiration.gender}</div>}
              {aspiration.provinceCode && <div><strong>Provinsi:</strong> {aspiration.provinceCode}</div>}
              {aspiration.regencyCode && <div><strong>Kab/Kota:</strong> {aspiration.regencyCode}</div>}
              {aspiration.districtCode && <div><strong>Kecamatan:</strong> {aspiration.districtCode}</div>}
              <div><strong>Submit:</strong> {formatDateTimeID(aspiration.submittedAt)}</div>
            </div>
            {aspiration.aiCluster && (
              <div className="text-xs">
                <strong>AI Cluster:</strong> <code className="bg-purple-50 text-purple-800 px-1 rounded">{aspiration.aiCluster}</code>
              </div>
            )}
          </div>

          {/* Source Links */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Verifikasi Sumber
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {sumberAsli && (
                <a href={sumberAsli} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                  <FileText className="w-3 h-3" /> Sumber Asli
                </a>
              )}
              <a href={gNews} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                <ExternalLink className="w-3 h-3" /> Google News
              </a>
              <a href={gMaps} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3" /> Google Maps
              </a>
              <a href={gSearch} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                <Search className="w-3 h-3" /> Google Search
              </a>
            </div>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">Baru</SelectItem>
                    <SelectItem value="REVIEWING">Ditinjau</SelectItem>
                    <SelectItem value="ADDRESSED">Ditangani</SelectItem>
                    <SelectItem value="RESOLVED">Selesai</SelectItem>
                    <SelectItem value="ARCHIVED">Arsip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioritas</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERTANIAN">Pertanian</SelectItem>
                    <SelectItem value="EKONOMI">Ekonomi</SelectItem>
                    <SelectItem value="PENDIDIKAN">Pendidikan</SelectItem>
                    <SelectItem value="KESEHATAN">Kesehatan</SelectItem>
                    <SelectItem value="INFRASTRUKTUR">Infrastruktur</SelectItem>
                    <SelectItem value="LAINNYA">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan Review</Label>
              <Textarea
                value={form.reviewNotes}
                onChange={(e) => setForm({ ...form, reviewNotes: e.target.value })}
                rows={3}
                placeholder="Catatan internal reviewer..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? 'Menyimpan...' : 'Simpan Review'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AspirationAnalyticsDialog({
  open, onOpenChange, cluster,
}: {
  open: boolean; onOpenChange: (o: boolean) => void
  cluster: AspirationCluster | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Speech Insights
          </DialogTitle>
          <DialogDescription>
            Analitik aspirasi rakyat untuk rekomendasi pidato
          </DialogDescription>
        </DialogHeader>

        {!cluster ? (
          <div className="text-center py-8 text-muted-foreground">Tidak ada data tersedia</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-center">
                <div className="text-2xl font-black text-orange-700">{cluster.total}</div>
                <div className="text-xs text-orange-800">Total Aspirasi</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-center">
                <div className="text-2xl font-black text-blue-700">{cluster.byCategory.length}</div>
                <div className="text-xs text-blue-800">Kategori</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-center">
                <div className="text-2xl font-black text-purple-700">{cluster.topClusters.length}</div>
                <div className="text-xs text-purple-800">Hotspot Clusters</div>
              </div>
            </div>

            {/* Top Categories */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-600" /> Top Kategori
              </h4>
              <div className="space-y-1">
                {cluster.byCategory.slice(0, 5).map((c) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <div className="text-xs w-28 font-medium">{c.category}</div>
                    <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-600 to-red-500"
                        style={{ width: `${c.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs font-semibold w-16 text-right">{c.count} ({c.percentage}%)</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Clusters */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600" /> Top Clusters
              </h4>
              <div className="space-y-1">
                {cluster.topClusters.slice(0, 5).map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/40">
                    <Badge variant="outline" className="text-xs shrink-0">{c.count}</Badge>
                    <code className="text-xs flex-1 truncate">{c.aiCluster}</code>
                    <span className="text-xs font-semibold text-muted-foreground">{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Occupations */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Top Pekerjaan
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {cluster.topOccupations.map((o) => (
                  <div key={o.occupation} className="p-2 rounded bg-muted/40 text-center">
                    <div className="text-xs font-semibold">{o.occupation}</div>
                    <div className="text-sm font-bold text-blue-700">{o.count}</div>
                    <div className="text-xs text-muted-foreground">{o.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            {cluster.insights.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600" /> Rekomendasi Pidato
                </h4>
                <div className="space-y-2">
                  {cluster.insights.map((ins, idx) => (
                    <div key={idx} className="p-3 rounded bg-amber-50 border border-amber-200">
                      <div className="font-semibold text-sm text-amber-900">{ins.title}</div>
                      <p className="text-xs text-amber-800 mt-1">{ins.description}</p>
                      {ins.recommendation && (
                        <div className="text-xs text-amber-900 mt-2 bg-white rounded p-2 border border-amber-200">
                          <strong>Rekomendasi:</strong> {ins.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Local Filter icon to avoid extra imports (uses Search as fallback)
function Filter({ className }: { className?: string }) {
  return <Search className={className} />
}

export function CommunicationMenu() {
  const [tab, setTab] = useState('overview')

  const tabs = [
    { key: 'overview', label: 'Command Center', icon: Activity },
    { key: 'contacts', label: 'Database Kontak', icon: Users },
    { key: 'segments', label: 'Segment Audiens', icon: Target },
    { key: 'templates', label: 'Template Pesan', icon: FileText },
    { key: 'integrations', label: 'Integrasi API', icon: Globe },
    { key: 'broadcast', label: 'Multi-Channel Broadcast', icon: Send },
    { key: 'announcement', label: 'Pengumuman Internal', icon: Bell },
    { key: 'sentiment', label: 'Sentimen & Opini Publik', icon: BarChart3 },
    { key: 'polls', label: 'Polling Internal', icon: Target },
    { key: 'crisis', label: 'Crisis Center', icon: Shield },
    { key: 'aspirasi', label: 'Aspirasi Rakyat', icon: Heart },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Komunikasi & Command Center"
        description="Database kontak, segment audiens, template pesan, integrasi API, multi-channel broadcast, sentimen publik, crisis management, dan aspirasi rakyat"
        icon={Megaphone}
      />
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.key ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-sm' : 'border hover:bg-accent'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <CommandCenterTab />}
      {tab === 'contacts' && <ContactDatabaseTab />}
      {tab === 'segments' && <AudienceSegmentTab />}
      {tab === 'templates' && <TemplateManagerTab />}
      {tab === 'integrations' && <ApiIntegrationTab />}
      {tab === 'broadcast' && <BroadcastTab />}
      {tab === 'announcement' && <AnnouncementTab />}
      {tab === 'sentiment' && <SentimenOpiniPublikTab />}
      {tab === 'polls' && <PollsTab />}
      {tab === 'crisis' && <CrisisTab />}
      {tab === 'aspirasi' && <AspirationsTab />}
    </div>
  )
}

// ============================================================
// CONTACT DATABASE TAB - Real contact management
// ============================================================
function ContactDatabaseTab() {
  const addToast = useToastStore((s) => s.addToast)
  const [contacts, setContacts] = useState<any[]>([])
  const [territories, setTerritories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [optInOnly, setOptInOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [stats, setStats] = useState({ totalContacts: 0, optInCount: 0, verifiedCount: 0 })

  const loadData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (optInOnly) params.set('optInOnly', 'true')
    Promise.all([
      api(`/api/contacts?${params.toString()}`),
      api('/api/territory'),
    ]).then(([c, t]) => {
      setContacts(c || [])
      setTerritories(t || [])
      if (c?.length > 0 || c?.stats) setStats(c.stats || stats)
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [search, optInOnly])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Kontak" value={stats.totalContacts} icon={Users} color="blue" />
        <StatCard label="WA Opt-in" value={stats.optInCount} icon={CheckCircle2} color="emerald" />
        <StatCard label="Terverifikasi" value={stats.verifiedCount} icon={ShieldCheck} color="purple" />
        <StatCard label="Belum Opt-in" value={stats.totalContacts - stats.optInCount} icon={Clock} color="amber" />
      </div>

      {/* Info banner */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <strong>Sistem Mulai dari 0:</strong> Database kontak masih kosong. Untuk mengirim broadcast WhatsApp/Facebook/Instagram, Anda perlu:
          <ol className="list-decimal ml-4 mt-1 space-y-0.5">
            <li>Import kontak dari CSV/Excel (nomor WA yang sudah opt-in)</li>
            <li>Konfigurasi integrasi API di tab "Integrasi API"</li>
            <li>Buat segment audiens untuk targeting</li>
            <li>Buat template pesan untuk reuse</li>
            <li>Kirim broadcast dari tab "Multi-Channel Broadcast"</li>
          </ol>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Database Kontak</h3>
          <p className="text-sm text-muted-foreground">Kelola daftar kontak WhatsApp, Facebook, Instagram untuk broadcast</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" /> Import CSV</Button>
          <Button onClick={() => setAddOpen(true)} size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"><Plus className="w-4 h-4 mr-1" /> Tambah Kontak</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama, nomor WA, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant={optInOnly ? 'default' : 'outline'} size="sm" onClick={() => setOptInOnly(!optInOnly)}>
          {optInOnly ? <CheckCircle2 className="w-4 h-4 mr-1" /> : null} WA Opt-in Only
        </Button>
      </div>

      {/* Table */}
      {contacts.length === 0 ? (
        <EmptyState icon={Users} title="Database kontak masih kosong" description="Import kontak dari CSV atau tambah manual untuk mulai broadcast." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Opt-in</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Pekerjaan</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell className="text-xs font-mono">{c.phone || '-'}</TableCell>
                    <TableCell>
                      {c.whatsappOptIn ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">✓ Opt-in</Badge> : <Badge variant="outline" className="text-[10px] text-slate-500">Belum</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{c.territory?.name || '-'}</TableCell>
                    <TableCell className="text-xs">{c.occupation || '-'}</TableCell>
                    <TableCell className="text-xs">{(() => { try { return JSON.parse(c.tags || '[]').join(', ') || '-' } catch { return '-' } })()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                      {c.isVerified && <Badge variant="outline" className="text-[10px] ml-1 bg-blue-50 text-blue-700"><ShieldCheck className="w-2.5 h-2.5 mr-0.5" />Verified</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => setDeleteItem(c)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AddContactDialog open={addOpen} onOpenChange={setAddOpen} territories={territories} onSuccess={() => { loadData(); setAddOpen(false) }} />
      <ImportContactDialog open={importOpen} onOpenChange={setImportOpen} territories={territories} onSuccess={() => { loadData(); setImportOpen(false) }} />

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kontak?</AlertDialogTitle>
            <AlertDialogDescription>Yakin hapus <strong>{deleteItem?.name}</strong> ({deleteItem?.phone})?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              try { await fetch(`/api/contacts/${deleteItem.id}`, { method: 'DELETE', headers: { 'x-user-id': useAuthStore.getState().user?.id || '' } }); addToast('Kontak dihapus', 'success'); setDeleteItem(null); loadData() } catch (e: any) { addToast(e.message, 'error') }
            }} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AddContactDialog({ open, onOpenChange, territories, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ name: '', phone: '', email: '', ageGroup: '', gender: '', occupation: '', territoryId: '', whatsappOptIn: false })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.territoryId) { addToast('Nama dan wilayah wajib', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast('Kontak berhasil ditambahkan', 'success')
      setForm({ name: '', phone: '', email: '', ageGroup: '', gender: '', occupation: '', territoryId: '', whatsappOptIn: false })
      onSuccess()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" /> Tambah Kontak</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2"><Label>Nama *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Nomor WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="628xxx" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Wilayah *</Label><Select value={form.territoryId} onValueChange={(v) => setForm({ ...form, territoryId: v })}><SelectTrigger><SelectValue placeholder="Pilih wilayah" /></SelectTrigger><SelectContent className="max-h-60">{territories.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Pekerjaan</Label><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="cth: Petani, PNS, dll" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Kelompok Usia</Label><Select value={form.ageGroup} onValueChange={(v) => setForm({ ...form, ageGroup: v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent>{['17-25','26-35','36-45','46-55','56-65','65+'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Jenis Kelamin</Label><Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger><SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t">
            <input type="checkbox" id="optin" checked={form.whatsappOptIn} onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })} />
            <Label htmlFor="optin" className="text-sm">Kontak sudah opt-in (persetujuan menerima WhatsApp broadcast)</Label>
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

function ImportContactDialog({ open, onOpenChange, territories, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [csvText, setCsvText] = useState('')
  const [territoryId, setTerritoryId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvText || !territoryId) { addToast('CSV dan wilayah wajib', 'error'); return }
    setLoading(true)
    try {
      // Parse CSV: name,phone,email,occupation,ageGroup,gender,whatsappOptIn
      const lines = csvText.trim().split('\n')
      const contacts = lines.slice(1).map(line => { // Skip header
        const [name, phone, email, occupation, ageGroup, gender, optIn] = line.split(',').map(s => s?.trim() || '')
        return { name, phone, email, occupation, ageGroup, gender, whatsappOptIn: optIn === 'true' || optIn === '1' }
      }).filter(c => c.name && c.phone)

      const res = await fetch('/api/contacts', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' }, body: JSON.stringify({ contacts, territoryId }) })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast(data.message, 'success')
      setCsvText(''); onSuccess()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-blue-600" /> Import Kontak dari CSV</DialogTitle></DialogHeader>
        <form onSubmit={handleImport} className="space-y-3">
          <div className="space-y-2">
            <Label>Wilayah Target *</Label>
            <Select value={territoryId} onValueChange={setTerritoryId}><SelectTrigger><SelectValue placeholder="Pilih wilayah" /></SelectTrigger><SelectContent className="max-h-60">{territories.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-2">
            <Label>Data CSV (paste di sini) *</Label>
            <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8} placeholder={`name,phone,email,occupation,ageGroup,gender,whatsappOptIn\nBudi Santoso,6281234567890,budi@email.com,Petani,46-55,L,true\nSiti Aminah,6289876543210,siti@email.com,Guru,36-45,P,true`} />
            <p className="text-[10px] text-muted-foreground">Format: name,phone,email,occupation,ageGroup,gender,whatsappOptIn (true/false)</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Mengimport...' : 'Import'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// AUDIENCE SEGMENT TAB
// ============================================================
function AudienceSegmentTab() {
  const [segments, setSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => { setLoading(true); api('/api/audience-segments').then(setSegments).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2"><Target className="w-5 h-5 text-purple-600" /> Segment Audiens</h3>
          <p className="text-sm text-muted-foreground">Kelompok kontak untuk targeted broadcast (cth: "Petani Jawa Tengah")</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"><Plus className="w-4 h-4 mr-1" /> Buat Segment</Button>
      </div>
      {segments.length === 0 ? (
        <EmptyState icon={Target} title="Belum ada segment audiens" description="Buat segment untuk menargetkan broadcast ke kelompok kontak tertentu (cth: Petani Jateng, Milenial Jabar)." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {segments.map(s => (
            <Card key={s.id}><CardContent className="p-4">
              <div className="font-bold text-sm">{s.name}</div>
              {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">{s.contactCount} kontak</Badge>
                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">{(() => { try { const f = JSON.parse(s.filterCriteria); return Object.entries(f).map(([k,v]) => `${k}=${v}`).join(', ') } catch { return 'filter' } })()}</Badge>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      {addOpen && <CreateSegmentDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => { loadData(); setAddOpen(false) }} />}
    </div>
  )
}

function CreateSegmentDialog({ open, onOpenChange, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ name: '', description: '', whatsappOptIn: true, provinceCode: '', regencyCode: '', ageGroup: '', gender: '', occupation: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { addToast('Nama segment wajib', 'error'); return }
    setLoading(true)
    try {
      const filterCriteria = { whatsappOptIn: form.whatsappOptIn, provinceCode: form.provinceCode || undefined, regencyCode: form.regencyCode || undefined, ageGroup: form.ageGroup || undefined, gender: form.gender || undefined, occupation: form.occupation || undefined }
      const res = await fetch('/api/audience-segments', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' }, body: JSON.stringify({ name: form.name, description: form.description, filterCriteria }) })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast('Segment audiens dibuat', 'success')
      onSuccess()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-purple-600" /> Buat Segment Audiens</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2"><Label>Nama Segment *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: Petani Jawa Tengah" required /></div>
          <div className="space-y-2"><Label>Deskripsi</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Provinsi</Label><Input value={form.provinceCode} onChange={(e) => setForm({ ...form, provinceCode: e.target.value })} placeholder="cth: 33" /></div>
            <div className="space-y-2"><Label>Kab/Kota</Label><Input value={form.regencyCode} onChange={(e) => setForm({ ...form, regencyCode: e.target.value })} placeholder="cth: 3301" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Kelompok Usia</Label><Select value={form.ageGroup} onValueChange={(v) => setForm({ ...form, ageGroup: v })}><SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger><SelectContent>{['17-25','26-35','36-45','46-55','56-65','65+'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Jenis Kelamin</Label><Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger><SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Pekerjaan</Label><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="cth: PETANI" /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="segoptin" checked={form.whatsappOptIn} onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })} />
            <Label htmlFor="segoptin" className="text-sm">Hanya kontak yang sudah WA opt-in</Label>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Membuat...' : 'Buat Segment'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// TEMPLATE MANAGER TAB
// ============================================================
function TemplateManagerTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => { setLoading(true); api('/api/message-templates').then(setTemplates).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Template Pesan</h3>
          <p className="text-sm text-muted-foreground">Simpan dan reuse template pesan untuk broadcast</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"><Plus className="w-4 h-4 mr-1" /> Buat Template</Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState icon={FileText} title="Belum ada template pesan" description="Buat template untuk mempercepat pembuatan broadcast (cth: template klarifikasi hoaks, template pengumuman rapat)." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map(t => (
            <Card key={t.id}><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">{t.useCount}x digunakan</Badge>
              </div>
              <div className="font-bold text-sm">{t.name}</div>
              {t.subject && <div className="text-xs text-muted-foreground mt-1">{t.subject}</div>}
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{t.content}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
      {addOpen && <CreateTemplateDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => { loadData(); setAddOpen(false) }} />}
    </div>
  )
}

function CreateTemplateDialog({ open, onOpenChange, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ name: '', category: 'UMUM', subject: '', content: '', whatsappContent: '', facebookContent: '', instagramContent: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.content) { addToast('Nama dan konten wajib', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/message-templates', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast('Template pesan dibuat', 'success')
      onSuccess()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Buat Template Pesan</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Nama Template *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Kategori</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['UMUM','PENGUMUMAN','KRISIS','POLLING','SOSIAL','KEMITRAAN'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Subject/Judul</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
          <div className="space-y-2"><Label>Konten Utama *</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} placeholder="Gunakan {name} untuk nama penerima, {territory} untuk wilayah" required /></div>
          <div className="space-y-2"><Label>Konten WhatsApp (opsional, maks 4096 char)</Label><Textarea value={form.whatsappContent} onChange={(e) => setForm({ ...form, whatsappContent: e.target.value })} rows={3} /></div>
          <div className="space-y-2"><Label>Konten Facebook (opsional)</Label><Textarea value={form.facebookContent} onChange={(e) => setForm({ ...form, facebookContent: e.target.value })} rows={3} /></div>
          <div className="space-y-2"><Label>Konten Instagram (opsional, maks 2200 char)</Label><Textarea value={form.instagramContent} onChange={(e) => setForm({ ...form, instagramContent: e.target.value })} rows={3} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Template'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// API INTEGRATION TAB - Connection status
// ============================================================
function ApiIntegrationTab() {
  const [integrations, setIntegrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState<string | null>(null)

  const loadData = () => { setLoading(true); api('/api/api-integrations').then(setIntegrations).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />

  const platforms = [
    { id: 'WHATSAPP_BUSINESS', label: 'WhatsApp Business API', icon: MessageSquare, color: 'emerald', desc: 'Kirim pesan WhatsApp ke kontak yang opt-in via Meta Cloud API' },
    { id: 'FACEBOOK_PAGE', label: 'Facebook Page', icon: Globe, color: 'blue', desc: 'Posting ke Facebook Page LAPRA 08 via Graph API' },
    { id: 'INSTAGRAM_BUSINESS', label: 'Instagram Business', icon: Heart, color: 'purple', desc: 'Posting ke Instagram Business via Graph API' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base flex items-center gap-2"><Globe className="w-5 h-5 text-orange-600" /> Integrasi API Platform</h3>
        <p className="text-sm text-muted-foreground">Konfigurasi koneksi ke WhatsApp Business API, Facebook Page, dan Instagram Business</p>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
        <Globe className="w-4 h-4 inline mr-1" />
        <strong>Mode Demo:</strong> Saat ini sistem berjalan dalam mode simulasi. Untuk mengirim broadcast real:
        <ol className="list-decimal ml-4 mt-1">
          <li>Daftar WhatsApp Business API di <a href="https://business.whatsapp.com" target="_blank" className="text-blue-600 underline">business.whatsapp.com</a></li>
          <li>Daftar Facebook Developer di <a href="https://developers.facebook.com" target="_blank" className="text-blue-600 underline">developers.facebook.com</a></li>
          <li>Dapatkan API key & access token</li>
          <li>Konfigurasi di bawah ini</li>
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {platforms.map(p => {
          const integration = integrations.find(i => i.platform === p.id)
          const isConnected = integration?.status === 'CONNECTED'
          const Icon = p.icon
          return (
            <Card key={p.id} className={isConnected ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-slate-300'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${isConnected ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{p.label}</div>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {isConnected ? '✓ Terhubung' : '✗ Belum Terhubung'}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                {integration?.displayName && <div className="text-xs font-medium mb-2">{integration.displayName}</div>}
                {integration?.phoneNumber && <div className="text-xs text-muted-foreground font-mono mb-2">{integration.phoneNumber}</div>}
                <Button variant="outline" size="sm" className="w-full" onClick={() => setConfigOpen(p.id)}>
                  {isConnected ? 'Konfigurasi Ulang' : 'Konfigurasi'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {configOpen && <ApiConfigDialog platform={configOpen} integration={integrations.find(i => i.platform === configOpen)} onOpenChange={(o: boolean) => !o && setConfigOpen(null)} onSuccess={loadData} />}
    </div>
  )
}

function ApiConfigDialog({ platform, integration, onOpenChange, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    apiKey: '', apiSecret: '', phoneNumberId: '', businessAccountId: '',
    pageId: '', pageAccessToken: '', igBusinessAccountId: '', igAccessToken: '',
    displayName: '', phoneNumber: '', webhookUrl: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (integration) {
      setForm({
        apiKey: integration.apiKey || '', apiSecret: integration.apiSecret || '',
        phoneNumberId: integration.phoneNumberId || '', businessAccountId: integration.businessAccountId || '',
        pageId: integration.pageId || '', pageAccessToken: integration.pageAccessToken || '',
        igBusinessAccountId: integration.igBusinessAccountId || '', igAccessToken: integration.igAccessToken || '',
        displayName: integration.displayName || '', phoneNumber: integration.phoneNumber || '',
        webhookUrl: integration.webhookUrl || '',
      })
    }
  }, [integration])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/api-integrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' },
        body: JSON.stringify({ platform, ...form }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast(`Integrasi ${platform} berhasil dikonfigurasi`, 'success')
      onSuccess(); onOpenChange(false)
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const platformLabel = platform === 'WHATSAPP_BUSINESS' ? 'WhatsApp Business API' : platform === 'FACEBOOK_PAGE' ? 'Facebook Page' : 'Instagram Business'

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-orange-600" /> Konfigurasi {platformLabel}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Display Name</Label><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="cth: LAPRA 08 Official WA" /></div>
            <div className="space-y-2"><Label>Phone Number</Label><Input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+62 811-9090-08" /></div>
          </div>
          {platform === 'WHATSAPP_BUSINESS' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Phone Number ID</Label><Input value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} /></div>
                <div className="space-y-2"><Label>Business Account ID</Label><Input value={form.businessAccountId} onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>API Key (Access Token)</Label><Input value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} type="password" /></div>
                <div className="space-y-2"><Label>API Secret</Label><Input value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} type="password" /></div>
              </div>
            </>
          )}
          {platform === 'FACEBOOK_PAGE' && (
            <>
              <div className="space-y-2"><Label>Page ID</Label><Input value={form.pageId} onChange={(e) => setForm({ ...form, pageId: e.target.value })} /></div>
              <div className="space-y-2"><Label>Page Access Token</Label><Input value={form.pageAccessToken} onChange={(e) => setForm({ ...form, pageAccessToken: e.target.value })} type="password" /></div>
            </>
          )}
          {platform === 'INSTAGRAM_BUSINESS' && (
            <>
              <div className="space-y-2"><Label>IG Business Account ID</Label><Input value={form.igBusinessAccountId} onChange={(e) => setForm({ ...form, igBusinessAccountId: e.target.value })} /></div>
              <div className="space-y-2"><Label>IG Access Token</Label><Input value={form.igAccessToken} onChange={(e) => setForm({ ...form, igAccessToken: e.target.value })} type="password" /></div>
            </>
          )}
          <div className="space-y-2"><Label>Webhook URL (opsional)</Label><Input value={form.webhookUrl} onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://app.lapra08.id/api/webhook/wa" /></div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Credentials disimpan di database. Pastikan menggunakan HTTPS di produksi.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Konfigurasi'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// SENTIMEN & OPINI PUBLIK (Social Listening AI) - Rp0 API Cost
// ============================================================
function SentimenOpiniPublikTab() {
  const [subTab, setSubTab] = useState('dashboard')
  const subTabs = [
    { key: 'dashboard', label: 'Dasbor Sentimen', icon: BarChart3 },
    { key: 'sources', label: 'Sumber Data', icon: Globe },
    { key: 'mentions', label: 'Feed Mention', icon: MessageSquare },
    { key: 'alerts', label: 'Peringatan Dini', icon: AlertTriangle },
    { key: 'recommendations', label: 'Rekomendasi AI', icon: Lightbulb },
  ]
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base flex items-center gap-2"><BarChart3 className="w-5 h-5 text-orange-600" /> Sentimen & Opini Publik (Social Listening AI)</h3>
        <p className="text-sm text-muted-foreground">Monitor sentimen publik dari Google News, X/Twitter, YouTube, TikTok, Facebook, Instagram. Analisis via IndoBERT (lokal). AI rekomendasi via Ollama (Llama 3 lokal). Rp0 biaya API.</p>
      </div>

      {/* Info banner */}
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
        <CheckCircle2 className="w-4 h-4 inline mr-1" />
        <strong>Arsitektur Rp0:</strong> Data scraping via open-source (RSS, Twikit, YouTube Data API free). NLP via IndoBERT (server lokal). AI rekomendasi via Ollama/Llama 3 (server lokal). RBAC: DPN=Global, DPD=Provinsi, DPC=Kab/Kota.
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${subTab === t.key ? 'bg-orange-600 text-white' : 'border hover:bg-accent'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {subTab === 'dashboard' && <SentimenDashboard />}
      {subTab === 'sources' && <SocialSourcesManager />}
      {subTab === 'mentions' && <MentionFeed />}
      {subTab === 'alerts' && <AlertManager />}
      {subTab === 'recommendations' && <RecommendationManager />}
    </div>
  )
}

// --- Sentimen Dashboard ---
function SentimenDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/social-listening/analytics').then(setData).catch(() => {}).finally(() => setLoading(false))
    const interval = setInterval(() => api('/api/social-listening/analytics').then(setData).catch(() => {}), 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <LoadingState />
  if (!data) return <EmptyState icon={BarChart3} title="Belum ada data" description="Tambahkan sumber data dan lakukan scraping untuk mulai monitoring." />

  const repColor = data.reputationIndex >= 70 ? 'emerald' : data.reputationIndex >= 50 ? 'amber' : 'red'
  const repBg = repColor === 'emerald' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : repColor === 'amber' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-red-50 border-red-300 text-red-700'
  const trendIcon = data.reputationTrend === 'UP' ? '↗' : data.reputationTrend === 'DOWN' ? '↘' : '→'

  return (
    <div className="space-y-4">
      {/* Reputation Index Hero */}
      <div className={`rounded-xl border-2 p-6 ${repBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Reputation Index (Citra Presiden Prabowo)</div>
            <div className="text-5xl font-black mt-2">{data.reputationIndex}<span className="text-2xl">/100</span></div>
            <div className="text-sm mt-1">{trendIcon} {data.reputationTrend} • Cakupan: {data.scope}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{data.positivePct}%</div>
            <div className="text-xs opacity-70">Positif</div>
            <div className="text-lg font-bold text-red-600 mt-1">{data.negativePct}%</div>
            <div className="text-xs opacity-70">Negatif</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Mentions" value={data.total} icon={MessageSquare} color="blue" />
        <StatCard label="Positif" value={data.positive} icon={TrendingUp} color="emerald" />
        <StatCard label="Negatif" value={data.negative} icon={TrendingDown} color="red" />
        <StatCard label="Belum Diproses" value={data.unprocessed} icon={Clock} color="amber" />
      </div>

      {/* 7-day trend */}
      {data.trend && data.trend.some((t: any) => t.total > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Tren Sentimen 7 Hari</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {data.trend.map((day: any, i: number) => {
                const max = Math.max(...data.trend.map((d: any) => d.total), 1)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="text-xs font-semibold">{day.total || ''}</div>
                    <div className="w-full rounded-t bg-gradient-to-t from-orange-600 to-orange-400" style={{ height: `${Math.max((day.total / max) * 100, day.total > 0 ? 4 : 0)}%` }} />
                    <div className="text-[10px] text-muted-foreground">{day.date}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Platform & Category */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Per Platform</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {Object.entries(data.byPlatform || {}).length === 0 ? <div className="text-xs text-muted-foreground">Belum ada data</div> :
              Object.entries(data.byPlatform).map(([k, v]: any) => (
                <div key={k} className="flex justify-between text-xs"><span>{k}</span><span className="font-bold">{v}</span></div>
              ))
            }
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Per Kategori</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {Object.entries(data.byCategory || {}).length === 0 ? <div className="text-xs text-muted-foreground">Belum ada data</div> :
              Object.entries(data.byCategory).map(([k, v]: any) => (
                <div key={k} className="flex justify-between text-xs"><span>{k}</span><span className="font-bold">{v}</span></div>
              ))
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- Social Sources Manager ---
function SocialSourcesManager() {
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)

  const loadData = () => { setLoading(true); api('/api/social-listening/sources').then(setSources).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />

  const platformConfig: Record<string, { label: string, color: string }> = {
    GOOGLE_NEWS: { label: 'Google News', color: 'bg-blue-50 text-blue-700' },
    TWITTER_X: { label: 'X (Twitter)', color: 'bg-slate-50 text-slate-700' },
    YOUTUBE: { label: 'YouTube', color: 'bg-red-50 text-red-700' },
    TIKTOK: { label: 'TikTok', color: 'bg-purple-50 text-purple-700' },
    FACEBOOK: { label: 'Facebook', color: 'bg-indigo-50 text-indigo-700' },
    INSTAGRAM: { label: 'Instagram', color: 'bg-pink-50 text-pink-700' },
    RSS_FEED: { label: 'RSS Feed', color: 'bg-orange-50 text-orange-700' },
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Sumber data untuk scraping sentimen publik (Gratis - Open Source)</p>
        <Button onClick={() => setAddOpen(true)} size="sm" className="bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Tambah Sumber</Button>
      </div>
      {sources.length === 0 ? (
        <EmptyState icon={Globe} title="Belum ada sumber data" description="Tambah sumber (Google News, RSS, Twitter, YouTube, dll) untuk mulai monitoring sentimen." />
      ) : (
        <div className="space-y-2">
          {sources.map(s => {
            const pc = platformConfig[s.platform] || { label: s.platform, color: 'bg-slate-50' }
            return (
              <Card key={s.id}><CardContent className="p-3 flex items-center gap-3">
                <Badge className={`text-[10px] ${pc.color}`}>{pc.label}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{s.name}</div>
                  {s.url && <div className="text-xs text-muted-foreground truncate">{s.url}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Scope: {s.scope} {s.provinceCode ? `• Prov: ${s.provinceCode}` : ''} {s.regencyCode ? `• Kab: ${s.regencyCode}` : ''}
                    {s.lastSyncAt && ` • Last sync: ${formatDateTimeID(s.lastSyncAt)}`}
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>{s.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
              </CardContent></Card>
            )
          })}
        </div>
      )}
      {addOpen && <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => { loadData(); setAddOpen(false) }} />}
    </div>
  )
}

function AddSourceDialog({ open, onOpenChange, onSuccess }: any) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({ platform: 'GOOGLE_NEWS', name: '', url: '', keywords: '', scope: 'NATIONAL', provinceCode: '', regencyCode: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { addToast('Nama sumber wajib', 'error'); return }
    setLoading(true)
    try {
      const keywords = form.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
      const res = await fetch('/api/social-listening/sources', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' }, body: JSON.stringify({ ...form, keywords }) })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      addToast('Sumber data ditambahkan', 'success'); onSuccess()
    } catch (e: any) { addToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-orange-600" /> Tambah Sumber Data</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Platform *</Label><Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries({ GOOGLE_NEWS: 'Google News', TWITTER_X: 'X (Twitter)', YOUTUBE: 'YouTube', TIKTOK: 'TikTok', FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', RSS_FEED: 'RSS Feed' }).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Nama Sumber *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: Google News - Prabowo" required /></div>
          </div>
          <div className="space-y-2"><Label>URL / RSS Feed</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://news.google.com/rss/search?q=Prabowo" /></div>
          <div className="space-y-2"><Label>Kata Kunci (pisahkan koma)</Label><Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="Prabowo, Laskar Prabowo, Kabinet Merah Putih" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Scope</Label><Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NATIONAL">Nasional</SelectItem><SelectItem value="PROVINCE">Provinsi</SelectItem><SelectItem value="REGENCY">Kab/Kota</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Prov Code</Label><Input value={form.provinceCode} onChange={(e) => setForm({ ...form, provinceCode: e.target.value })} placeholder="33" /></div>
            <div className="space-y-2"><Label>Kab Code</Label><Input value={form.regencyCode} onChange={(e) => setForm({ ...form, regencyCode: e.target.value })} placeholder="3301" /></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- Mention Feed (REAL-TIME LIVE SCRAPE) ---
function MentionFeed() {
  const [mentions, setMentions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSentiment, setFilterSentiment] = useState('ALL')
  const [liveMode, setLiveMode] = useState(true) // Default: live scrape from REAL social media
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const loadData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterSentiment && filterSentiment !== 'ALL') params.set('sentiment', filterSentiment)
    if (liveMode) params.set('live', 'true')
    api(`/api/social-listening/mentions?${params.toString()}`)
      .then(res => {
        // API returns either array or { data: [...] }
        const data = Array.isArray(res) ? res : (res?.data || [])
        setMentions(data)
        setLastFetch(new Date())
      })
      .catch(() => setMentions([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [filterSentiment, liveMode])

  if (loading) return <LoadingState />

  const sentimentConfig: Record<string, { label: string, color: string }> = {
    POSITIVE: { label: 'Positif', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    NEUTRAL: { label: 'Netral', color: 'bg-slate-50 text-slate-700 border-slate-200' },
    NEGATIVE: { label: 'Negatif', color: 'bg-red-50 text-red-700 border-red-200' },
  }

  const platformIcon = (p: string) => p === 'FACEBOOK' ? '📘' : p === 'INSTAGRAM' ? '📷' : p === 'TIKTOK' ? '🎵' : p === 'TWITTER_X' ? '🐦' : '🔍'

  return (
    <div className="space-y-3">
      {/* Live mode banner */}
      {liveMode && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-pulse shrink-0" />
          <div className="flex-1">
            <strong>REAL-TIME LIVE SCRAPING — 100% REAL Data:</strong> Mention diambil langsung dari Google News RSS (indexing REAL posts dari Facebook, Instagram, TikTok, X/Twitter, dan berita Google). Tanpa API key, tanpa biaya. Klik link pada setiap mention untuk membuka post asli di platform sumbernya.
            {lastFetch && <div className="mt-1 text-[10px] text-emerald-600">Terakhir fetch: {formatDateTimeID(lastFetch)}</div>}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <Select value={filterSentiment} onValueChange={setFilterSentiment}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Sentimen" /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">Semua</SelectItem><SelectItem value="POSITIVE">Positif</SelectItem><SelectItem value="NEUTRAL">Netral</SelectItem><SelectItem value="NEGATIVE">Negatif</SelectItem></SelectContent>
        </Select>
        <Button size="sm" variant={liveMode ? 'default' : 'outline'} onClick={() => setLiveMode(!liveMode)} className="h-9">
          {liveMode ? '🟢 Live (REAL RSS)' : '⚪ Stored (DB)'}
        </Button>
        <Button size="sm" variant="outline" onClick={loadData} className="h-9">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
        <div className="text-xs text-muted-foreground ml-auto">
          {mentions.length} mention {liveMode && '• LIVE'}
        </div>
      </div>

      {mentions.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Belum ada mention" description={liveMode ? "Tidak ada mention LAPRA 08 di social media dalam 30 hari terakhir. Coba refresh atau ubah filter." : "Jalankan scraper dari sumber data untuk mengumpulkan mention."} />
      ) : (
        <div className="space-y-2">
          {mentions.map(m => {
            const sc = m.sentiment ? sentimentConfig[m.sentiment] : null
            return (
              <Card key={m.id} className={sc ? `border-l-4 ${m.sentiment === 'NEGATIVE' ? 'border-l-red-500' : m.sentiment === 'POSITIVE' ? 'border-l-emerald-500' : 'border-l-slate-300'}` : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px]">{platformIcon(m.platform)} {m.platform}</Badge>
                        {m.isLive && <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />REAL</Badge>}
                        {sc && <Badge variant="outline" className={`text-[9px] ${sc.color}`}>{sc.label}</Badge>}
                        {m.category && <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700">{m.category}</Badge>}
                        {m.priority && <Badge variant="outline" className={`text-[9px] ${m.priority === 'HIGH' ? 'bg-red-100 text-red-800' : m.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{m.priority}</Badge>}
                        {m.provinceName && <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700"><MapPin className="w-2.5 h-2.5 mr-0.5" />{m.provinceName}</Badge>}
                        {m.regencyName && <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700">{m.regencyName}</Badge>}
                      </div>
                      <div className="font-semibold text-sm">{m.title || m.author}</div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{m.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>📅 {formatDateTimeID(m.publishedAt)}</span>
                        {m.author && <span>✍️ {m.author}</span>}
                        {m.engagementCount > 0 && <span>💬 {m.engagementCount}</span>}
                        {m.urgencyScore > 0 && <span>⚡ {m.urgencyScore}/100</span>}
                      </div>
                    </div>
                    {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline shrink-0"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Alert Manager ---
function AlertManager() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [genRecId, setGenRecId] = useState<string | null>(null)

  const loadData = () => { setLoading(true); api('/api/social-listening/alerts').then(setAlerts).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />

  const handleGenRec = async (id: string) => {
    setGenRecId(id)
    try {
      const res = await fetch(`/api/social-listening/alerts/${id}`, { method: 'POST', headers: { 'x-user-id': useAuthStore.getState().user?.id || '' } })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error)
      useToastStore.getState().addToast('Rekomendasi AI dihasilkan', 'success')
      loadData()
    } catch (e: any) { useToastStore.getState().addToast(e.message, 'error') }
    finally { setGenRecId(null) }
  }

  const severityConfig: Record<string, { label: string, color: string }> = {
    CRITICAL: { label: 'Kritis', color: 'bg-red-100 text-red-800 border-red-300' },
    HIGH: { label: 'Tinggi', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    MEDIUM: { label: 'Sedang', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    LOW: { label: 'Rendah', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  }

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Belum ada alert" description="Alert otomatis muncul saat sentimen negatif >60% di wilayah tertentu." />
      ) : (
        <div className="space-y-2">
          {alerts.map(a => {
            const sc = severityConfig[a.severity] || severityConfig.HIGH
            return (
              <Card key={a.id} className="border-l-4" style={{ borderLeftColor: a.severity === 'CRITICAL' ? '#dc2626' : a.severity === 'HIGH' ? '#ea580c' : '#d97706' }}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{a.type.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${a.status === 'NEW' ? 'bg-red-50 text-red-700' : a.status === 'ACKNOWLEDGED' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{a.status}</Badge>
                      </div>
                      <div className="font-semibold text-sm">{a.title}</div>
                      <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>📅 {formatDateTimeID(a.createdAt)}</span>
                        {a.mentionCount > 0 && <span>📊 {a.mentionCount} mentions</span>}
                        {a.negativePercentage && <span>⚠️ {a.negativePercentage.toFixed(1)}% negatif</span>}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={genRecId === a.id} onClick={() => handleGenRec(a.id)}>
                          {genRecId === a.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lightbulb className="w-3 h-3 mr-1" />}
                          Generate AI Rekomendasi
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Recommendation Manager ---
function RecommendationManager() {
  const [recs, setRecs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => { setLoading(true); api('/api/social-listening/recommendations').then(setRecs).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  if (loading) return <LoadingState />

  const actionConfig: Record<string, { label: string, color: string }> = {
    FIELD_VISIT: { label: 'Turun ke Lapangan', color: 'bg-orange-50 text-orange-700' },
    CLARIFICATION: { label: 'Klarifikasi', color: 'bg-red-50 text-red-700' },
    REPORT_UP: { label: 'Laporkan ke Atasan', color: 'bg-blue-50 text-blue-700' },
    COORDINATE: { label: 'Koordinasi Tim', color: 'bg-purple-50 text-purple-700' },
    MONITOR: { label: 'Pantau', color: 'bg-slate-50 text-slate-700' },
  }

  const handleAction = async (id: string, status: string) => {
    try {
      await fetch(`/api/social-listening/recommendations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': useAuthStore.getState().user?.id || '' }, body: JSON.stringify({ status }) })
      useToastStore.getState().addToast(`Rekomendasi ${status}`, 'success')
      loadData()
    } catch (e: any) { useToastStore.getState().addToast(e.message, 'error') }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
        <Lightbulb className="w-4 h-4 inline mr-1" />
        <strong>AI Lokal (Rp0):</strong> Rekomendasi dihasilkan oleh AI lokal (Ollama/Llama 3) yang di-host di server internal. Tidak ada biaya API. Mode demo saat ini menggunakan template-based generator.
      </div>
      {recs.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Belum ada rekomendasi" description="Generate rekomendasi dari alert yang aktif di tab 'Peringatan Dini'." />
      ) : (
        <div className="space-y-2">
          {recs.map(r => {
            const ac = actionConfig[r.actionType] || actionConfig.MONITOR
            return (
              <Card key={r.id} className="border-l-4 border-l-purple-500">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0"><Lightbulb className="w-4 h-4 text-purple-600" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] ${ac.color}`}>{ac.label}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${r.priority === 'URGENT' ? 'bg-red-50 text-red-700' : r.priority === 'HIGH' ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-600'}`}>{r.priority}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : r.status === 'APPROVED' ? 'bg-blue-50 text-blue-700' : r.status === 'EXECUTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">{r.context.substring(0, 100)}...</div>
                      <p className="text-sm font-medium">{r.recommendation}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <span>📅 {formatDateTimeID(r.createdAt)}</span>
                        {r.provinceCode && <span>📍 {r.provinceCode}</span>}
                        {r.regencyCode && <span>📍 {r.regencyCode}</span>}
                      </div>
                      {r.status === 'PENDING' && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-300" onClick={() => handleAction(r.id, 'APPROVED')}><CheckCircle2 className="w-3 h-3 mr-1" /> Setujui</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300" onClick={() => handleAction(r.id, 'REJECTED')}><XCircle className="w-3 h-3 mr-1" /> Tolak</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-300" onClick={() => handleAction(r.id, 'EXECUTED')}><Zap className="w-3 h-3 mr-1" /> Eksekusi</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
