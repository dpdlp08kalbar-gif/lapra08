// LAPRA 08 - Surveyor Feed Page (/surveyor/[userId])
// ============================================================
// Halaman UI untuk surveyor lapangan mengakses & mengerjakan tugas survei.
// Dipanggil dari QR code atau URL yang dibagikan admin.
//
// Flow:
// 1. Surveyor buka /surveyor/[userId] (dari QR/URL)
// 2. Page fetch /api/surveyor-feed/[userId] (public, no auth)
// 3. Tampilkan info surveyor + daftar survei aktif
// 4. Surveyor pilih survei → isi jawaban + demografi responden
// 5. Submit → POST /api/surveyor-feed/[userId] (rate-limited 30/jam)
// 6. Tampilkan terima kasih + AI analysis result
//
// Privacy:
// - Surveyor submit atas nama responden (anonim)
// - Tidak minta nama/telepon responden
// - Demografi opsional (anonim)
// - IP disimpan sebagai marker "FIELD:[assignmentId]" (tidak expose real IP)
// ============================================================

import { notFound } from 'next/navigation'
import SurveyorFeedApp from './app'

export const dynamic = 'force-dynamic'

// === Server-side fetch surveyor feed (no auth) ===
async function getSurveyorFeed(userId: string) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/surveyor-feed/${userId}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return { error: data.error, status: res.status }
    return data.data
  } catch (e) {
    console.error('[SurveyorFeedPage] fetch error:', e)
    return null
  }
}

export default async function SurveyorFeedPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const feed = await getSurveyorFeed(userId)

  // Handle errors (not registered, inactive, etc.)
  if (!feed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">📡</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Gagal Memuat Feed</h1>
          <p className="text-sm text-slate-600">
            Terjadi kesalahan saat memuat data surveyor. Coba refresh halaman atau hubungi admin.
          </p>
        </div>
      </div>
    )
  }

  if ('error' in feed && feed.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h1>
          <p className="text-sm text-slate-600 mb-4">{feed.error}</p>
          <p className="text-xs text-slate-400">
            Hubungi admin DPN/DPD untuk pendaftaran surveyor atau aktivasi akun.
          </p>
        </div>
      </div>
    )
  }

  return <SurveyorFeedApp userId={userId} initialFeed={feed} />
}
