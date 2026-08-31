#!/usr/bin/env python3
"""
Patch SurveyOutputDashboard - replace stub with full implementation
"""
import re

FILE = '/home/z/my-project/src/components/menus/communication-menu.tsx'

# Baca file
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern: dari "// ===..." sebelum "SURVEY OUTPUT DASHBOARD" sampai baris sebelum "// ===..." sebelum "TAB 4: ESSAY POLLS"
# Pakai marker unik
start_marker = '// ============================================================\n// SURVEY OUTPUT DASHBOARD'
end_marker = '// ============================================================\n// TAB 4: ESSAY POLLS'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print('ERROR: start marker not found')
    exit(1)
if end_idx == -1:
    print('ERROR: end marker not found')
    exit(1)
if end_idx <= start_idx:
    print('ERROR: end before start')
    exit(1)

# Buat replacement
new_block = '''// ============================================================
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

'''

# Replace
new_content = content[:start_idx] + new_block + content[end_idx:]

# Tulis kembali
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f'OK: replaced {end_idx - start_idx} chars with {len(new_block)} chars')
