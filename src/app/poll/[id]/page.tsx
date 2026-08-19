// LAPRA 08 - Public Survey Page (/poll/[id])
// ============================================================
// Halaman publik untuk responden yang klik link share dari medsos/WhatsApp.
// Tidak perlu login. Anonim (PII tidak disimpan - UU PDP compliance).
//
// Flow:
// 1. User buka /poll/[id] dari link share
// 2. Page fetch poll detail (public read, no auth)
// 3. Tampilkan judul, pertanyaan, deskripsi
// 4. Form: textarea jawaban + demografi opsional (anonim)
// 5. Submit → POST /api/essay-polls/[id]/responses (public, rate-limited)
// 6. Tampilkan terima kasih + hasil AI (sentimen, urgency)
//
// Privacy:
// - respondentName & respondentPhone TIDAK diminta di form (anonim penuh)
// - Demografi (ageGroup, gender, occupation) opsional & anonim
// - IP disimpan untuk anti-spam (rate limit 5/jam per IP)
// ============================================================

import { notFound } from 'next/navigation'
import PublicPollForm from './form'

export const dynamic = 'force-dynamic'

// === Public fetch poll (no auth) ===
async function getPublicPoll(pollId: string) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/essay-polls/${pollId}/public`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    return data.data
  } catch (e) {
    console.error('[PublicPoll] fetch error:', e)
    return null
  }
}

export default async function PublicPollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const poll = await getPublicPoll(id)

  if (!poll) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Survei Tidak Ditemukan</h1>
          <p className="text-sm text-slate-600 mb-4">
            Survei yang Anda cari tidak tersedia. Mungkin sudah ditutup, dihapus, atau link salah.
          </p>
          <a href="/" className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    )
  }

  if (poll.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Survei {poll.status === 'DRAFT' ? 'Belum Dimulai' : 'Sudah Ditutup'}</h1>
          <p className="text-sm text-slate-600 mb-4">
            {poll.status === 'DRAFT'
              ? 'Survei ini masih dalam persiapan. Tim admin akan mengaktifkannya segera.'
              : 'Survei ini sudah selesai dan tidak menerima respon baru. Terima kasih atas minat Anda.'}
          </p>
          <p className="text-xs text-slate-400">Judul: {poll.title}</p>
        </div>
      </div>
    )
  }

  return <PublicPollForm poll={poll} />
}
