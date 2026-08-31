'use client'

// LAPRA 08 - Surveyor Feed App (client component)
// UI untuk surveyor: lihat daftar tugas + submit jawaban + lihat progress

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, MapPin, Clock, Award, ChevronRight, ArrowLeft } from 'lucide-react'

interface SurveyorInfo {
  id: string
  userId: string
  fullName: string
  territoryNames: string[]
  notes?: string | null
  responsesCount: number
}

interface ActiveSurvey {
  id: string
  title: string
  question: string
  description?: string | null
  targetScope: string
  targetAgeGroup?: string | null
  targetOccupation?: string | null
  provinceCode?: string | null
  regencyCode?: string | null
  closesAt?: string | null
  createdAt: string
  pollType: string
  expiresAt?: string | null
  // === FASE 3.3.5: poll type config ===
  options?: string[] | null
  likertScale?: number | null
  likertLabels?: string[] | null
}

interface SurveyorFeed {
  surveyor: SurveyorInfo
  activeSurveys: ActiveSurvey[]
  lastSyncAt: string
  serverTime: string
  feedVersion: string
}

export default function SurveyorFeedApp({ userId, initialFeed }: { userId: string; initialFeed: SurveyorFeed }) {
  const [feed, setFeed] = useState<SurveyorFeed>(initialFeed)
  const [selectedSurvey, setSelectedSurvey] = useState<ActiveSurvey | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [answer, setAnswer] = useState('') // untuk ESSAY
  const [selectedOption, setSelectedOption] = useState('') // untuk MULTIPLE_CHOICE
  const [selectedLikert, setSelectedLikert] = useState<number | null>(null) // untuk LIKERT
  const [ageGroup, setAgeGroup] = useState('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState('')

  // === FASE 3.3.5: Validasi & payload sesuai pollType ===
  const currentPollType = selectedSurvey?.pollType || 'ESSAY'
  const currentOptions = selectedSurvey?.options || []
  const currentLikertScale = selectedSurvey?.likertScale || 5
  const currentLikertLabels = selectedSurvey?.likertLabels || []

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length
  const isAnswerValid = () => {
    if (currentPollType === 'ESSAY') return answer.trim().length >= 10 && wordCount >= 10
    if (currentPollType === 'MULTIPLE_CHOICE') return selectedOption !== ''
    if (currentPollType === 'LIKERT') return selectedLikert !== null
    return false
  }
  const getSubmitPayload = () => {
    if (currentPollType === 'ESSAY') return { answer: answer.trim() }
    if (currentPollType === 'MULTIPLE_CHOICE') return { answer: selectedOption }
    if (currentPollType === 'LIKERT') {
      const label = currentLikertLabels[selectedLikert!] || `Skala ${selectedLikert! + 1}`
      return { answer: `${selectedLikert! + 1}. ${label}` }
    }
    return { answer: answer.trim() }
  }
  const canSubmit = isAnswerValid() && !submitting

  // === Refresh feed ===
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/surveyor-feed/${userId}`)
      const data = await res.json()
      if (data.success) {
        setFeed(data.data)
      }
    } catch (e: any) {
      console.error('Refresh error:', e)
    } finally {
      setRefreshing(false)
    }
  }

  // === Submit response ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSurvey || !canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = getSubmitPayload()
      const res = await fetch(`/api/surveyor-feed/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: selectedSurvey.id,
          ...payload,
          respondentInfo: {
            ageGroup: ageGroup || undefined,
            gender: gender || undefined,
            occupation: occupation || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setSubmitResult(data)
      // Refresh feed untuk update counter
      handleRefresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmitResult(null)
    setSelectedSurvey(null)
    setAnswer('')
    setSelectedOption('')
    setSelectedLikert(null)
    setAgeGroup('')
    setGender('')
    setOccupation('')
    setError(null)
  }

  // === Success screen ===
  if (submitResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Respon Tersimpan!</h1>
            <p className="text-sm text-slate-600">
              Jawaban responden ({submitResult.data?.pollTitle?.substring(0, 50)}) berhasil dikirim & dianalisis AI.
            </p>
          </div>

          {submitResult.data && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Hasil Analisis AI</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Sentimen:</span>
                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                  submitResult.data.aiSentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' :
                  submitResult.data.aiSentiment === 'NEGATIVE' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {submitResult.data.aiSentiment}
                </span>
                <span className="text-xs text-slate-400">({submitResult.data.aiProvider})</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Total respon Anda:</span>
                <span className="font-semibold text-slate-800">{submitResult.data.responsesCount}</span>
              </div>
            </div>
          )}

          {submitResult.rateLimit && (
            <div className="text-xs text-slate-400 text-center mb-4">
              Sisa kesempatan submit: {submitResult.rateLimit.remaining} (reset dalam {Math.ceil(submitResult.rateLimit.resetInMs / 60000)} menit)
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
            >
              Kerjakan Survei Lain
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Feed
            </button>
          </div>
        </div>
      </div>
    )
  }

  // === Submit form for selected survey ===
  if (selectedSurvey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => { setSelectedSurvey(null); setAnswer(''); setSelectedOption(''); setSelectedLikert(null); setAgeGroup(''); setGender(''); setOccupation(''); setError(null) }}
            className="mb-4 flex items-center gap-1 text-sm text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Survei
          </button>

          {/* Survey header */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4">
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white">
              <div className="text-xs opacity-80 mb-1">📋 Tugas Survei Lapangan</div>
              <h1 className="text-xl font-bold mb-2">{selectedSurvey.title}</h1>
              {selectedSurvey.description && (
                <p className="text-sm opacity-90">{selectedSurvey.description}</p>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">Pertanyaan:</label>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-800 leading-relaxed">
                {selectedSurvey.question}
              </div>
            </div>

            {/* === FASE 3.3.5: Answer — render sesuai pollType === */}
            {currentPollType === 'ESSAY' && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Jawaban Responden <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={6}
                  maxLength={5000}
                  placeholder="Tulis jawaban responden di sini... (minimal 10 kata)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y text-sm"
                  required
                  disabled={submitting}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500">
                    {wordCount} kata {wordCount < 10 && '(minimal 10 kata)'}
                  </span>
                  <span className="text-xs text-slate-400">{answer.length}/5000 karakter</span>
                </div>
              </div>
            )}

            {currentPollType === 'MULTIPLE_CHOICE' && currentOptions.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Pilih Jawaban Responden <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {currentOptions.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedOption === opt
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mc-option"
                        value={opt}
                        checked={selectedOption === opt}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        disabled={submitting}
                        className="w-4 h-4 text-orange-600"
                      />
                      <span className="text-sm text-slate-800">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {currentPollType === 'LIKERT' && (
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-3">
                  Rating Responden <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {Array.from({ length: currentLikertScale }, (_, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedLikert === i
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="likert-option"
                        value={i}
                        checked={selectedLikert === i}
                        onChange={() => setSelectedLikert(i)}
                        disabled={submitting}
                        className="w-4 h-4 text-orange-600"
                      />
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-800">
                          {currentLikertLabels[i] || `Skala ${i + 1}`}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Demografi responden */}
            <details className="border border-slate-200 rounded-lg">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50">
                📋 Data Demografi Responden (Opsional)
              </summary>
              <div className="p-4 pt-2 space-y-3 bg-slate-50/50">
                <div className="text-xs text-slate-500 italic">
                  Data ini anonim. Hanya untuk analisis agregat (mis. "mayoritas responden usia 26-35").
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Usia</label>
                    <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" disabled={submitting}>
                      <option value="">—</option>
                      <option value="18-25">18-25</option>
                      <option value="26-35">26-35</option>
                      <option value="36-50">36-50</option>
                      <option value="51+">51+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Kelamin</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" disabled={submitting}>
                      <option value="">—</option>
                      <option value="LAKI-LAKI">Laki-laki</option>
                      <option value="PEREMPUAN">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Pekerjaan</label>
                    <select value={occupation} onChange={(e) => setOccupation(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" disabled={submitting}>
                      <option value="">—</option>
                      <option value="PETANI">Petani</option>
                      <option value="NELAYAN">Nelayan</option>
                      <option value="UMKM">UMKM</option>
                      <option value="PELAJAR">Pelajar</option>
                      <option value="MAHASISWA">Mahasiswa</option>
                      <option value="GURU">Guru</option>
                      <option value="PNS">PNS</option>
                      <option value="TNI_POLRI">TNI/Polri</option>
                      <option value="PEDAGANG">Pedagang</option>
                      <option value="BURUH">Buruh</option>
                      <option value="SWASTA">Swasta</option>
                      <option value="IRT">IRT</option>
                      <option value="LAINNYA">Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>
            </details>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-red-700"><strong>Gagal:</strong> {error}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                canSubmit ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700' : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengirim & Menganalisis...
                </span>
              ) : (
                'Kirim Jawaban Responden'
              )}
            </button>

            <div className="text-xs text-center text-slate-400">
              Rate limit: 30 respon per jam. IP disimpan sebagai marker anonim (bukan real IP).
            </div>
          </form>
        </div>
      </div>
    )
  }

  // === Survey list (default view) ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs text-orange-600 font-semibold mb-1">📱 SURVEYOR LAPANGAN</div>
              <h1 className="text-xl font-bold text-slate-800">{feed.surveyor.fullName}</h1>
              <div className="flex flex-wrap gap-1 mt-2">
                {feed.surveyor.territoryNames.map((name, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    <MapPin className="w-3 h-3" /> {name}
                  </span>
                ))}
              </div>
              {feed.surveyor.notes && (
                <p className="text-xs text-slate-500 italic mt-2">📝 {feed.surveyor.notes}</p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-600">{feed.activeSurveys.length}</div>
              <div className="text-xs text-slate-600">Tugas Aktif</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{feed.surveyor.responsesCount}</div>
              <div className="text-xs text-slate-600">Total Respon</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xs font-semibold text-blue-700 mb-0.5">
                <Clock className="w-3 h-3 inline mr-0.5" />
                Last Sync
              </div>
              <div className="text-[10px] text-slate-600">
                {new Date(feed.lastSyncAt).toLocaleString('id-ID', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Active surveys list */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-600" />
            Daftar Tugas Survei
          </h2>

          {feed.activeSurveys.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-sm text-slate-600 font-medium">Belum ada tugas survei aktif</p>
              <p className="text-xs text-slate-400 mt-1">
                Admin akan menugaskan survei baru. Refresh secara berkala untuk cek update.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {feed.activeSurveys.map((survey) => (
                <button
                  key={survey.id}
                  onClick={() => { setSelectedSurvey(survey); setError(null) }}
                  className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 mb-1">{survey.title}</div>
                      <p className="text-xs text-slate-600 line-clamp-2">{survey.question}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {survey.targetScope === 'NATIONAL' && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">🇮🇩 Nasional</span>
                        )}
                        {survey.targetScope === 'PROVINCE' && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">📍 Provinsi</span>
                        )}
                        {survey.targetScope === 'REGENCY' && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">📍 Kab/Kota</span>
                        )}
                        {survey.targetOccupation && survey.targetOccupation !== 'UMUM' && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                            👥 {survey.targetOccupation}
                          </span>
                        )}
                        {survey.closesAt && (
                          <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                            ⏰ {new Date(survey.closesAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-4 text-xs text-slate-400">
          Feed v{feed.feedVersion} • Sync otomatis saat buka halaman
        </div>
      </div>
    </div>
  )
}
