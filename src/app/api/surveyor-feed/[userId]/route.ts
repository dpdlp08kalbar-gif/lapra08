// LAPRA 08 - API: Surveyor Feed (JSON feed untuk HP Surveyor)
// ============================================================
// Endpoint ini diakses oleh aplikasi HP surveyor di lapangan untuk:
//   1. Pull daftar survei aktif yang ditugaskan ke surveyor
//   2. POST untuk record sync event + kirim respon survei
//
// URL format: /api/surveyor-feed/[userId]
//
// Keamanan:
//   - Endpoint publik (tidak perlu x-user-id header)
//   - Tapi userId harus terdaftar sebagai surveyor aktif
//   - Rate limit alami: hanya surveyor terdaftar yang dapat data
//
// Response GET:
//   {
//     success: true,
//     data: {
//       surveyor: { ... },
//       activeSurveys: [...],
//       lastSyncAt,
//       serverTime,
//       feedVersion: '1.0',
//     }
//   }
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SETTING_KEY = 'surveyor_assignments'

interface SurveyorAssignment {
  id: string
  userId: string
  fullName: string
  phone: string | null
  territoryIds: string[]
  territoryNames: string[]
  assignedPollIds: string[]
  isActive: boolean
  deviceInfo?: { userAgent?: string; platform?: string; lastSeen?: string }
  lastSyncAt?: string
  responsesCount: number
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

async function loadAssignments(): Promise<SurveyorAssignment[]> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY },
      select: { value: true },
    })
    if (!setting) return []
    const parsed = JSON.parse(setting.value)
    if (!Array.isArray(parsed)) return []
    return parsed as SurveyorAssignment[]
  } catch {
    return []
  }
}

async function saveAssignments(items: SurveyorAssignment[]): Promise<void> {
  const value = JSON.stringify(items)
  await db.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value, category: 'SURVEYOR', description: 'Surveyor assignments (akun + wilayah + survei yang ditugaskan)' },
    create: {
      key: SETTING_KEY,
      value,
      category: 'SURVEYOR',
      description: 'Surveyor assignments (akun + wilayah + survei yang ditugaskan)',
    },
  })
}

// GET /api/surveyor-feed/[userId] — pull feed
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    if (!userId) return NextResponse.json({ success: false, error: 'userId wajib' }, { status: 400 })

    const items = await loadAssignments()
    const assignment = items.find(a => a.userId === userId)

    if (!assignment) {
      return NextResponse.json({
        success: false,
        error: 'Anda belum terdaftar sebagai surveyor. Hubungi admin DPN/DPD untuk pendaftaran.',
      }, { status: 403 })
    }

    if (!assignment.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Akun surveyor Anda dinonaktifkan. Hubungi admin.',
      }, { status: 403 })
    }

    // Update lastSyncAt & deviceInfo
    const now = new Date().toISOString()
    const userAgent = request.headers.get('user-agent') || undefined
    assignment.lastSyncAt = now
    assignment.deviceInfo = {
      userAgent: userAgent?.substring(0, 500),
      platform: assignment.deviceInfo?.platform,
      lastSeen: now,
    }
    assignment.updatedAt = now
    const idx = items.findIndex(a => a.id === assignment.id)
    items[idx] = assignment
    await saveAssignments(items)

    // Fetch active surveys untuk surveyor ini
    const activePolls = assignment.assignedPollIds.length > 0
      ? await db.essayPoll.findMany({
          where: {
            id: { in: assignment.assignedPollIds },
            status: 'ACTIVE',
          },
          select: {
            id: true,
            title: true,
            question: true,
            description: true,
            targetScope: true,
            targetAgeGroup: true,
            targetOccupation: true,
            provinceCode: true,
            regencyCode: true,
            closesAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    return NextResponse.json({
      success: true,
      data: {
        surveyor: {
          id: assignment.id,
          userId: assignment.userId,
          fullName: assignment.fullName,
          phone: assignment.phone,
          territoryNames: assignment.territoryNames,
          notes: assignment.notes,
          responsesCount: assignment.responsesCount,
        },
        activeSurveys: activePolls.map(p => ({
          ...p,
          // Hint untuk HP surveyor: ini poll tipe essay (model saat ini hanya essay)
          pollType: 'ESSAY',
          expiresAt: p.closesAt,
        })),
        lastSyncAt: now,
        serverTime: now,
        feedVersion: '1.0',
      },
      message: `Sync berhasil. ${activePolls.length} survei aktif menunggu.`,
    })
  } catch (e: any) {
    console.error('[SurveyorFeed GET] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal sync: ${e.message}` }, { status: 500 })
  }
}

// POST /api/surveyor-feed/[userId] — submit response from surveyor
// Body: {
//   pollId,
//   answer,                    // jawaban essay
//   respondentInfo?: {
//     ageGroup?,               // 18-25 | 26-35 | 36-50 | 51+
//     gender?,                 // LAKI-LAKI | PEREMPUAN
//     occupation?,             // PETANI | NELAYAN | UMKM | PELAJAR | etc
//     provinceCode?,
//     regencyCode?,
//     districtCode?,
//   }
// }
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    if (!userId) return NextResponse.json({ success: false, error: 'userId wajib' }, { status: 400 })

    const items = await loadAssignments()
    const assignment = items.find(a => a.userId === userId)
    if (!assignment) {
      return NextResponse.json({ success: false, error: 'Bukan surveyor terdaftar' }, { status: 403 })
    }
    if (!assignment.isActive) {
      return NextResponse.json({ success: false, error: 'Akun surveyor nonaktif' }, { status: 403 })
    }

    const body = await request.json()
    const { pollId, answer, respondentInfo } = body
    if (!pollId) return NextResponse.json({ success: false, error: 'Field wajib: pollId' }, { status: 400 })
    if (!answer || typeof answer !== 'string' || answer.trim().length < 3) {
      return NextResponse.json({ success: false, error: 'Field wajib: answer (minimal 3 karakter)' }, { status: 400 })
    }

    // Cek poll exists & aktif
    const poll = await db.essayPoll.findUnique({
      where: { id: pollId },
      select: { id: true, status: true, title: true },
    })
    if (!poll) return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    if (poll.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: `Poll status: ${poll.status}. Tidak menerima respon.` }, { status: 400 })
    }

    // Cek apakah surveyor ditugaskan untuk poll ini
    if (!assignment.assignedPollIds.includes(pollId)) {
      return NextResponse.json({ success: false, error: 'Anda tidak ditugaskan untuk poll ini' }, { status: 403 })
    }

    // Hitung word count
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length

    // Simpan response — pakai schema EssayResponse yang ada
    // Identitas responden lapangan disimpan anonymous (tidak ada nama/NIK/phone)
    await db.essayResponse.create({
      data: {
        pollId,
        answer,
        wordCount,
        // Identitas responden — anonim untuk PDP compliance
        respondentName: null,
        respondentPhone: null,
        ageGroup: respondentInfo?.ageGroup || null,
        gender: respondentInfo?.gender || null,
        occupation: respondentInfo?.occupation || null,
        provinceCode: respondentInfo?.provinceCode || null,
        regencyCode: respondentInfo?.regencyCode || null,
        districtCode: respondentInfo?.districtCode || null,
        // Tandai channel sebagai field surveyor (pakai ipAddress field, karena tidak ada field khusus)
        ipAddress: `FIELD:${assignment.id}`,
      },
    })

    // Update counter surveyor
    const idx = items.findIndex(a => a.id === assignment.id)
    items[idx].responsesCount = (items[idx].responsesCount || 0) + 1
    items[idx].updatedAt = new Date().toISOString()
    await saveAssignments(items)

    return NextResponse.json({
      success: true,
      data: {
        pollId,
        pollTitle: poll.title,
        responsesCount: items[idx].responsesCount,
      },
      message: 'Respon berhasil dikirim. Terima kasih.',
    })
  } catch (e: any) {
    console.error('[SurveyorFeed POST] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal kirim respon: ${e.message}` }, { status: 500 })
  }
}
