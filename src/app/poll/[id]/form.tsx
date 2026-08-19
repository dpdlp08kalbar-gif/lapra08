'use client'

// LAPRA 08 - Public Poll Form (client component)
// Form untuk responden publik submit jawaban essay survei.
// Anonim: tidak minta nama/telepon. Hanya demografi opsional.

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, Shield } from 'lucide-react'

interface PublicPoll {
  id: string
  title: string
  question: string
  description?: string | null
  closesAt?: string | null
  targetScope: string
  provinceName?: string | null
  regencyName?: string | null
  targetAgeGroup?: string | null
  targetOccupation?: string | null
  // === FASE 3.3.4: poll type config ===
  pollType?: 'ESSAY' | 'MULTIPLE_CHOICE' | 'LIKERT' | null
  options?: string[] | null
  likertScale?: number | null
  likertLabels?: string[] | null
}

export default function PublicPollForm({ poll }: { poll: PublicPoll }) {
  const [answer, setAnswer] = useState('') // untuk ESSAY
  const [selectedOption, setSelectedOption] = useState('') // untuk MULTIPLE_CHOICE
  const [selectedLikert, setSelectedLikert] = useState<number | null>(null) // untuk LIKERT
  const [ageGroup, setAgeGroup] = useState('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const pollType = poll.pollType || 'ESSAY'
  const options = poll.options || []
  const likertScale = poll.likertScale || 5
  const likertLabels = poll.likertLabels || []

  // Validasi jawaban sesuai pollType
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length
  const minWords = 10

  const isAnswerValid = () => {
    if (pollType === 'ESSAY') return answer.trim().length >= 10 && wordCount >= minWords
    if (pollType === 'MULTIPLE_CHOICE') return selectedOption !== ''
    if (pollType === 'LIKERT') return selectedLikert !== null
    return false
  }

  const getSubmitPayload = () => {
    if (pollType === 'ESSAY') return { answer: answer.trim() }
    if (pollType === 'MULTIPLE_CHOICE') return { answer: selectedOption }
    if (pollType === 'LIKERT') {
      // Untuk Likert, simpan label + index
      const label = likertLabels[selectedLikert!] || `Skala ${selectedLikert! + 1}`
      return { answer: `${selectedLikert! + 1}. ${label}` }
    }
    return { answer: answer.trim() }
  }

  const canSubmit = isAnswerValid() && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = getSubmitPayload()
      const res = await fetch(`/api/essay-polls/${poll.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          // Anonim: tidak kirim respondentName/Phone
          ageGroup: ageGroup || undefined,
          gender: gender || undefined,
          occupation: occupation || undefined,
          // Location: biarkan API detect dari IP/answer
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Reset all form state
  const resetForm = () => {
    setResult(null)
    setAnswer('')
    setSelectedOption('')
    setSelectedLikert(null)
    setAgeGroup('')
    setGender('')
    setOccupation('')
  }

  // === Success screen ===
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Terima Kasih!</h1>
            <p className="text-sm text-slate-600">
              Jawaban Anda ({result.data?.wordCount || wordCount} kata) telah kami terima dan dianalisis AI.
            </p>
          </div>

          {/* AI Analysis Result */}
          {result.data && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Hasil Analisis AI</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Sentimen:</span>
                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                  result.data.aiSentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' :
                  result.data.aiSentiment === 'NEGATIVE' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {result.data.aiSentiment}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Urgency Score:</span>
                <span className="font-semibold text-slate-800">{result.data.aiScore}/100</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Kategori:</span>
                <span className="font-semibold text-slate-800">{result.data.aiCategory}</span>
              </div>
            </div>
          )}

          {result.rateLimit && (
            <div className="text-xs text-slate-400 text-center mb-4">
              Sisa kesempatan submit: {result.rateLimit.remaining} (reset dalam {Math.ceil(result.rateLimit.resetInMs / 60000)} menit)
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4">
            <Shield className="w-4 h-4 inline mr-1" />
            <strong>Privasi Anda:</strong> Jawaban disimpan anonim. Sistem tidak menyimpan nama atau nomor telepon Anda.
            Demografi (usia/jenis kelamin/pekerjaan) hanya untuk analisis agregat.
          </div>

          <button
            onClick={resetForm}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            Isi Lagi (Survei Lain?)
          </button>
        </div>
      </div>
    )
  }

  // === Form ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
            <div className="text-xs opacity-80 mb-1">📊 Survei Opini Publik</div>
            <h1 className="text-2xl font-bold mb-2">{poll.title}</h1>
            {poll.description && (
              <p className="text-sm opacity-90">{poll.description}</p>
            )}
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-amber-800 text-sm">🔒 Survei Anonim & Netral</div>
            <p className="text-xs text-amber-700 mt-1">
              Jawaban Anda <strong>anonim</strong> — kami tidak meminta nama atau nomor telepon.
              Pertanyaan survei bersifat <strong>netral</strong> dan tidak memihak. Silakan jawab jujur sesuai pendapat Anda.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Pertanyaan Survei:
            </label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-800 leading-relaxed">
              {poll.question}
            </div>
          </div>

          {/* Answer — render sesuai pollType */}
          {pollType === 'ESSAY' && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Jawaban Anda <span className="text-red-500">*</span>
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                maxLength={5000}
                placeholder="Tulis jawaban Anda di sini... (minimal 10 kata)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y text-sm"
                required
                disabled={submitting}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-slate-500">
                  {wordCount} kata {wordCount < minWords && `(minimal ${minWords} kata)`}
                </span>
                <span className="text-xs text-slate-400">{answer.length}/5000 karakter</span>
              </div>
            </div>
          )}

          {pollType === 'MULTIPLE_CHOICE' && options.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Pilih Jawaban <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOption === opt
                        ? 'border-purple-500 bg-purple-50'
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
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-sm text-slate-800">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {pollType === 'LIKERT' && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-3">
                Berikan Rating Anda <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {Array.from({ length: likertScale }, (_, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLikert === i
                        ? 'border-purple-500 bg-purple-50'
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
                      className="w-4 h-4 text-purple-600"
                    />
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-800">
                        {likertLabels[i] || `Skala ${i + 1}`}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Demografi (opsional, anonim) */}
          <details className="border border-slate-200 rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-50">
              📋 Data Demografi (Opsional — Membantu Analisis Agregat)
            </summary>
            <div className="p-4 pt-2 space-y-3 bg-slate-50/50">
              <div className="text-xs text-slate-500 italic">
                Data ini bersifat opsional dan anonim. Hanya digunakan untuk analisis kelompok (mis. "mayoritas responden usia 26-35 tahun").
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Kelompok Usia</label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    disabled={submitting}
                  >
                    <option value="">— Pilih —</option>
                    <option value="18-25">18-25 tahun</option>
                    <option value="26-35">26-35 tahun</option>
                    <option value="36-50">36-50 tahun</option>
                    <option value="51+">51+ tahun</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    disabled={submitting}
                  >
                    <option value="">— Pilih —</option>
                    <option value="LAKI-LAKI">Laki-laki</option>
                    <option value="PEREMPUAN">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Pekerjaan</label>
                  <select
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                    disabled={submitting}
                  >
                    <option value="">— Pilih —</option>
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
                    <option value="IRT">Ibu Rumah Tangga</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </div>
            </div>
          </details>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-red-700">
                <strong>Gagal submit:</strong> {error}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
              canSubmit
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Mengirim & Menganalisis...
              </span>
            ) : (
              'Kirim Jawaban'
            )}
          </button>

          <div className="text-xs text-center text-slate-400">
            Dengan mengirim, Anda menyetujui jawaban Anda dianalisis AI untuk sentimen & kategori.
            Rate limit: 5 respon per jam per IP (anti-spam).
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-400">
          {poll.targetScope === 'NATIONAL' ? '🇮🇩 Survei Nasional' :
           poll.targetScope === 'PROVINCE' ? `📍 Survei Provinsi ${poll.provinceName || ''}` :
           `📍 Survei Kab/Kota ${poll.regencyName || ''}`}
          {poll.closesAt && ` • Berakhir: ${new Date(poll.closesAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        </div>
      </div>
    </div>
  )
}
