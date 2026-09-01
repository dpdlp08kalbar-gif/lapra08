'use client'

// LAPRA 08 - Survey Form (client component)
// Form untuk responden publik submit jawaban survei (anonim).

import { useState } from 'react'
import { Loader2, CheckCircle2, AlertTriangle, Shield } from 'lucide-react'

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

  const pollType = survey.pollType || 'ESSAY'
  const options = survey.options || []
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length
  const canSubmit = (pollType === 'ESSAY' ? answer.trim().length >= 10 && wordCount >= 10 : selectedOption !== '') && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true); setError(null)
    try {
      const payload = pollType === 'ESSAY' ? { answer: answer.trim() } : { answer: selectedOption }
      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ageGroup: ageGroup || undefined, gender: gender || undefined, occupation: occupation || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      setResult(data)
    } catch (e: any) { setError(e.message) }
    finally { setSubmitting(false) }
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
            <p className="text-sm text-slate-600">Jawaban Anda telah dikirim & dianalisis AI.</p>
          </div>
          {result.data && (
            <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2">
              <div className="text-xs font-semibold text-slate-700 uppercase">Hasil Analisis</div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">Sentimen:</span>
                <span className={`font-semibold px-2 py-0.5 rounded text-xs ${result.data.aiSentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' : result.data.aiSentiment === 'NEGATIVE' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{result.data.aiSentiment}</span>
              </div>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4">
            <Shield className="w-4 h-4 inline mr-1" /><strong>Privasi:</strong> Jawaban disimpan anonim. Tidak ada nama/telepon yang disimpan.
          </div>
          <button onClick={() => { setResult(null); setAnswer(''); setSelectedOption('') }} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Selesai</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
            <div className="text-xs opacity-80 mb-1">📊 Survei Opini Publik</div>
            <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
            {survey.description && <p className="text-sm opacity-90">{survey.description}</p>}
          </div>
        </div>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div><div className="font-bold text-amber-800 text-sm">Survei Anonim & Netral</div><p className="text-xs text-amber-700 mt-0.5">Jawaban Anda anonim. Tidak ada nama/telepon yang disimpan.</p></div>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">Pertanyaan:</label>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-800 leading-relaxed">{survey.question}</div>
          </div>
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
          <details className="border rounded-lg">
            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-slate-700">Data Demografi (Opsional)</summary>
            <div className="p-4 grid grid-cols-3 gap-3">
              <div><label className="text-xs text-slate-600">Usia</label><select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}><option value="">—</option><option value="17-22">17-22</option><option value="23-42">23-42</option><option value="43-59">43-59</option><option value="60+">60+</option></select></div>
              <div><label className="text-xs text-slate-600">Kelamin</label><select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}><option value="">—</option><option value="LAKI-LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option></select></div>
              <div><label className="text-xs text-slate-600">Pekerjaan</label><select value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={submitting}><option value="">—</option><option value="PETANI">Petani</option><option value="NELAYAN">Nelayan</option><option value="UMKM">UMKM</option><option value="PELAJAR">Pelajar</option><option value="SWASTA">Swasta</option><option value="PNS">PNS</option><option value="LAINNYA">Lainnya</option></select></div>
            </div>
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
