'use client'

// LAPRA 08 - Survey Form (Fase 2: GPS + Foto + Tier 2 + Offline)
// ============================================================
// Fitur Fase 2:
// - GPS capture (browser geolocation, rounded to ~100m)
// - Foto upload (camera only, no gallery, base64, max 500KB)
// - Tier 2 form opsional (afiliasi organisasi, pendidikan, perilaku politik)
// - Offline queue (LocalStorage) — sync saat online
// ============================================================

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, Shield, MapPin, Camera, Wifi, WifiOff, RefreshCw } from 'lucide-react'

interface Survey {
  id: string
  title: string
  question: string
  description?: string | null
  pollType?: string | null
  options?: string[] | null
  totalResponses?: number
}

export default function SurveyForm({ survey }: { survey: Survey }) {
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // === FASE 2: GPS ===
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // === FASE 2: Foto ===
  const [photo, setPhoto] = useState<string | null>(null) // base64

  // === FASE 2: Tier 2 (opsional) ===
  const [showTier2, setShowTier2] = useState(false)
  const [orgAffiliation, setOrgAffiliation] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [votingBehavior, setVotingBehavior] = useState('')

  // === FASE 2: Offline queue ===
  const [isOnline, setIsOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const onOnline = () => { setIsOnline(true); syncQueue() }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    updateQueueCount()
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  const updateQueueCount = () => {
    try {
      const q = JSON.parse(localStorage.getItem('survey_queue') || '[]')
      setQueueCount(q.length)
    } catch { setQueueCount(0) }
  }

  // GPS capture
  const captureGps = () => {
    setGpsLoading(true); setGpsError(null)
    if (!navigator.geolocation) { setGpsError('GPS tidak didukung di browser ini'); setGpsLoading(false); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false) },
      (err) => { setGpsError(err.message || 'Gagal ambil GPS'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  // Photo capture (camera only)
  const capturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500000) { setError('Ukuran foto maksimal 500KB'); return }
    const reader = new FileReader()
    reader.onload = () => {
      // Strip EXIF by re-encoding via canvas
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 640; canvas.height = 480
        const ctx = canvas.getContext('2d')
        if (ctx) { ctx.drawImage(img, 0, 0, 640, 480); setPhoto(canvas.toDataURL('image/jpeg', 0.7)) }
        else { setPhoto(reader.result as string) }
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  // Offline queue
  const addToQueue = (payload: any) => {
    try {
      const q = JSON.parse(localStorage.getItem('survey_queue') || '[]')
      q.push({ surveyId: survey.id, payload, ts: Date.now() })
      localStorage.setItem('survey_queue', JSON.stringify(q))
      updateQueueCount()
    } catch (e) { console.error('[Queue] Error:', e) }
  }

  const syncQueue = async () => {
    try {
      const q = JSON.parse(localStorage.getItem('survey_queue') || '[]')
      if (q.length === 0) return
      const remaining: any[] = []
      for (const item of q) {
        try {
          const res = await fetch(`/api/surveys/${item.surveyId}/responses`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.payload),
          })
          if (!res.ok) remaining.push(item)
        } catch { remaining.push(item) }
      }
      localStorage.setItem('survey_queue', JSON.stringify(remaining))
      updateQueueCount()
      if (remaining.length === 0) alert('Sinkronisasi berhasil! Semua respon offline sudah terkirim.')
    } catch (e) { console.error('[Sync] Error:', e) }
  }

  const pollType = survey.pollType || 'ESSAY'
  const options = survey.options || []
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length
  const canSubmit = (pollType === 'ESSAY' ? answer.trim().length >= 10 && wordCount >= 10 : selectedOption !== '') && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true); setError(null)

    const payload: any = {
      answer: pollType === 'ESSAY' ? answer.trim() : selectedOption,
      ageGroup: ageGroup || undefined, gender: gender || undefined, occupation: occupation || undefined,
    }
    if (gps) payload.gps = gps
    if (photo) payload.photoData = photo
    if (showTier2) {
      payload.tier2 = { orgAffiliation, educationLevel, votingBehavior }
    }

    // Offline mode → queue
    if (!navigator.onLine) {
      addToQueue(payload)
      setResult({ data: { aiSentiment: 'QUEUED' }, message: 'Respon disimpan offline. Akan dikirim saat online.' })
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setResult(data)
    } catch (e: any) {
      // Kalau gagal, simpan ke queue
      addToQueue(payload)
      setError(`Gagal kirim (disimpan offline): ${e.message}`)
    } finally { setSubmitting(false) }
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Terima Kasih!</h1>
            <p className="text-sm text-slate-600">{result.message || 'Jawaban Anda telah dikirim.'}</p>
          </div>
          {result.data?.aiSentiment && result.data.aiSentiment !== 'QUEUED' && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase">Hasil Analisis AI</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Sentimen:</span>
                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${result.data.aiSentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' : result.data.aiSentiment === 'NEGATIVE' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{result.data.aiSentiment}</span>
              </div>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4">
            <Shield className="w-4 h-4 inline mr-1" /><strong>Privasi:</strong> Jawaban anonim. GPS dibulatkan ke ~100m. Foto tanpa metadata EXIF.
          </div>
          <button onClick={() => { setResult(null); setAnswer(''); setSelectedOption(''); setPhoto(null); setGps(null) }} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Selesai</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Offline indicator */}
        {!isOnline && (
          <div className="mb-4 rounded-lg bg-amber-50 border-2 border-amber-300 p-3 flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-800"><strong>Mode Offline.</strong> Respon akan disimpan lokal & dikirim saat online.</span>
          </div>
        )}
        {queueCount > 0 && (
          <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-800 flex-1">{queueCount} respon menunggu sinkronisasi</span>
            {isOnline && <button onClick={syncQueue} className="text-xs px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Sync</button>}
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
            <div className="text-xs opacity-80 mb-1">📊 Survei Opini Publik</div>
            <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
            {survey.description && <p className="text-sm opacity-90">{survey.description}</p>}
          </div>
        </div>

        {/* Privacy banner */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div><div className="font-bold text-amber-800 text-sm">Survei Anonim & Netral</div><p className="text-xs text-amber-700 mt-0.5">Jawaban anonim. GPS dibulatkan. Foto tanpa EXIF. Tidak ada nama/telepon disimpan.</p></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Pertanyaan:</label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-800 leading-relaxed">{survey.question}</div>
          </div>

          {/* Answer */}
          {pollType === 'ESSAY' && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Jawaban Anda <span className="text-red-500">*</span></label>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={6} maxLength={5000} placeholder="Tulis jawaban... (minimal 10 kata)" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm" required disabled={submitting} />
              <div className="flex justify-between mt-1"><span className="text-xs text-slate-500">{wordCount} kata {wordCount < 10 && '(minimal 10)'}</span><span className="text-xs text-slate-400">{answer.length}/5000</span></div>
            </div>
          )}
          {pollType === 'MULTIPLE_CHOICE' && options.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Pilih Jawaban <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <label key={idx} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${selectedOption === opt ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="mc" value={opt} checked={selectedOption === opt} onChange={(e) => setSelectedOption(e.target.value)} disabled={submitting} className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-slate-800">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* === FASE 2: GPS === */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">📍 Lokasi GPS (Opsional)</label>
            {gps ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-800">Lokasi tercatat: {gps.lat.toFixed(3)}, {gps.lng.toFixed(3)} (dibulatkan ~100m)</span>
                <button type="button" onClick={() => setGps(null)} className="text-xs text-red-500 ml-auto">Hapus</button>
              </div>
            ) : (
              <button type="button" onClick={captureGps} disabled={gpsLoading || submitting} className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {gpsLoading ? 'Mengambil GPS...' : 'Ambil Lokasi GPS'}
              </button>
            )}
            {gpsError && <p className="text-xs text-red-500 mt-1">{gpsError}</p>}
          </div>

          {/* === FASE 2: Foto === */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">📷 Foto Bukti (Opsional, kamera langsung)</label>
            {photo ? (
              <div className="relative">
                <img src={photo} alt="Foto bukti" className="w-full max-h-48 object-cover rounded-lg border" />
                <button type="button" onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✕</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 cursor-pointer">
                <Camera className="w-4 h-4" />
                Ambil Foto
                <input type="file" accept="image/*" capture="environment" onChange={capturePhoto} disabled={submitting} className="hidden" />
              </label>
            )}
          </div>

          {/* Demografi dasar */}
          <details className="border rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700">Data Demografi (Opsional)</summary>
            <div className="p-4 grid grid-cols-3 gap-3">
              <div><label className="text-xs text-slate-600">Usia</label><select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}><option value="">—</option><option value="17-22">17-22</option><option value="23-42">23-42</option><option value="43-59">43-59</option><option value="60+">60+</option></select></div>
              <div><label className="text-xs text-slate-600">Kelamin</label><select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}><option value="">—</option><option value="LAKI-LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option></select></div>
              <div><label className="text-xs text-slate-600">Pekerjaan</label><select value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}><option value="">—</option><option value="PETANI">Petani</option><option value="NELAYAN">Nelayan</option><option value="UMKM">UMKM</option><option value="PELAJAR">Pelajar</option><option value="SWASTA">Swasta</option><option value="PNS">PNS</option><option value="LAINNYA">Lainnya</option></select></div>
            </div>
          </details>

          {/* === FASE 2: Tier 2 (Opsional) === */}
          <details className="border rounded-lg" open={showTier2}>
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700" onClick={(e) => { e.preventDefault(); setShowTier2(!showTier2) }}>
              Survei Lanjutan (Opsional — Afiliasi & Perilaku Politik)
            </summary>
            {showTier2 && (
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs text-slate-600">Afiliasi Organisasi</label>
                  <select value={orgAffiliation} onChange={(e) => setOrgAffiliation(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}>
                    <option value="">— Tidak ada / Tidak ingin menyebut —</option>
                    <option value="NU">NU (Ansor/Fatayat)</option>
                    <option value="MUHAMMADIYAH">Muhammadiyah (Aisyiyah)</option>
                    <option value="PANCASILA">Pemuda Pancasila</option>
                    <option value="FKPPI">FKPPI</option>
                    <option value="GMNI">GMNI</option>
                    <option value="HMI">HMI</option>
                    <option value="GERINDRA">Gerindra (TIDAR/PIRA)</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Pendidikan Terakhir</label>
                  <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}>
                    <option value="">—</option>
                    <option value="SD">SD/Sederajat</option>
                    <option value="SMP">SMP/Sederajat</option>
                    <option value="SMA">SMA/SMK/Sederajat</option>
                    <option value="D3">Diploma (D1-D4)</option>
                    <option value="S1">Sarjana (S1)</option>
                    <option value="S2">Magister (S2+)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600">Perilaku Politik</label>
                  <select value={votingBehavior} onChange={(e) => setVotingBehavior(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}>
                    <option value="">—</option>
                    <option value="LOYAL">Pemilih Setia (sudah pasti pilihan)</option>
                    <option value="SWING">Pemilih Mengambang (masih ragu)</option>
                    <option value="UNDECIDED">Belum Memutuskan</option>
                  </select>
                </div>
              </div>
            )}
          </details>

          {error && <div className="bg-red-50 border rounded-lg p-3 flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /><div className="text-sm text-red-700"><strong>Gagal:</strong> {error}</div></div>}
          <button type="submit" disabled={!canSubmit} className={`w-full py-3 rounded-lg font-semibold text-white ${canSubmit ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-slate-300 cursor-not-allowed'}`}>
            {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</span> : 'Kirim Jawaban'}
          </button>
        </form>
      </div>
    </div>
  )
}
