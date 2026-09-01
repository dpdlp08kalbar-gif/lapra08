// LAPRA 08 - Public Survey Page (/survey/[id])
// ============================================================
// Halaman publik untuk responden yang klik link share.
// No auth needed. Anonim (UU PDP compliance).
// ============================================================
import SurveyForm from './form'

export const dynamic = 'force-dynamic'

async function getSurvey(surveyId: string) {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/surveys/${surveyId}/public`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.success ? data.data : null
  } catch { return null }
}

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const survey = await getSurvey(id)

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Survei Tidak Ditemukan</h1>
          <p className="text-sm text-slate-600">Survei tidak tersedia atau sudah ditutup.</p>
        </div>
      </div>
    )
  }

  if (survey.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Survei {survey.status === 'DRAFT' ? 'Belum Dimulai' : 'Sudah Ditutup'}</h1>
          <p className="text-sm text-slate-600">{survey.status === 'DRAFT' ? 'Survei masih dalam persiapan.' : 'Survei sudah selesai.'}</p>
        </div>
      </div>
    )
  }

  return <SurveyForm survey={survey} />
}
