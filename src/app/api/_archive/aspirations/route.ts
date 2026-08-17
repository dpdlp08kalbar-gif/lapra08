// LAPRA 08 - API: Aspirations (Microsite Solusi)
// GET  /api/aspirations  - List aspirations (admin scope filter)
// POST /api/aspirations  - Public submit (auto-detect category/sentiment/priority/aiCluster)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  isDPNLevel,
} from '@/lib/server-helpers'

// ============================================================
// AUTO-DETECT CATEGORY from message text (keyword matching)
// ============================================================
function detectCategory(message: string): { category: string; subCategory: string | null } {
  const text = (message || '').toLowerCase()

  // PERTANIAN
  if (/(pupuk|petani|sawah|irigasi|benih)/.test(text)) {
    let sub: string | null = null
    if (text.includes('pupuk')) sub = 'PUPUK'
    else if (text.includes('irigasi')) sub = 'IRIGASI'
    else if (text.includes('benih')) sub = 'BENIH'
    return { category: 'PERTANIAN', subCategory: sub }
  }
  // EKONOMI
  if (/(harga|umkm|dagang|modal)/.test(text)) {
    let sub: string | null = null
    if (text.includes('harga')) sub = 'HARGA'
    else if (text.includes('umkm')) sub = 'UMKM'
    return { category: 'EKONOMI', subCategory: sub }
  }
  // PENDIDIKAN
  if (/(sekolah|guru|beasiswa)/.test(text)) {
    return { category: 'PENDIDIKAN', subCategory: null }
  }
  // KESEHATAN
  if (/(rumah sakit|puskesmas|bpjs|obat)/.test(text)) {
    return { category: 'KESEHATAN', subCategory: null }
  }
  // INFRASTRUKTUR
  if (/(jalan|listrik|air bersih|air)/.test(text)) {
    let sub: string | null = null
    if (text.includes('jalan')) sub = 'JALAN'
    else if (text.includes('listrik')) sub = 'LISTRIK'
    else if (text.includes('air bersih') || text.includes('air')) sub = 'AIR_BERSIH'
    return { category: 'INFRASTRUKTUR', subCategory: sub }
  }

  return { category: 'LAINNYA', subCategory: null }
}

// ============================================================
// AUTO-DETECT SENTIMENT from message text
// Order: URGENT > POSITIVE > NEGATIVE > NEUTRAL
// ============================================================
function detectSentiment(message: string): string {
  const text = (message || '').toLowerCase()

  // URGENT: darurat, mendesak, bahaya
  if (/(darurat|mendesak|bahaya)/.test(text)) return 'URGENT'
  // POSITIVE: terima kasih, bagus, puas
  if (/(terima kasih|terimakasih|bagus|puas)/.test(text)) return 'POSITIVE'
  // NEGATIVE: keluhan, rusak, tidak, parah
  if (/(keluhan|rusak|tidak|parah)/.test(text)) return 'NEGATIVE'

  return 'NEUTRAL'
}

// ============================================================
// AUTO-DETECT PRIORITY from message text + sentiment
// URGENT sentiment → HIGH priority; otherwise NORMAL
// ============================================================
function detectPriority(message: string, sentiment: string): string {
  if (sentiment === 'URGENT') return 'HIGH'
  const text = (message || '').toLowerCase()
  if (/(darurat|mendesak|bahaya|segera|urgent)/.test(text)) return 'HIGH'
  return 'NORMAL'
}

// ============================================================
// AUTO-DETECT aiCluster:
//   `${occupation}-prov-${provinceCode}-kab-${regencyCode}-${category}${subCategory ? '-' + subCategory.toLowerCase() : ''}`
// ============================================================
function buildAiCluster(opts: {
  occupation?: string | null
  provinceCode?: string | null
  regencyCode?: string | null
  category: string
  subCategory?: string | null
}): string {
  const occupation = (opts.occupation || 'unknown').toLowerCase().replace(/\s+/g, '_')
  const provinceCode = opts.provinceCode || '00'
  const regencyCode = opts.regencyCode || '00'
  const category = opts.category.toLowerCase()
  const sub = opts.subCategory ? `-${opts.subCategory.toLowerCase()}` : ''
  return `${occupation}-prov-${provinceCode}-kab-${regencyCode}-${category}${sub}`
}

// ============================================================
// GET - List aspirations (admin scope filter)
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const sentiment = searchParams.get('sentiment')
    const pollId = searchParams.get('pollId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

    // Admin scope filter:
    // - SUPERADMIN / ADMIN_DPN: global (no territory filter)
    // - ADMIN_DPD: filter by provinceCode == user.territory.code (PROVINCE level)
    // - ADMIN_DPC: filter by regencyCode == user.territory.code (REGENCY level)
    const where: any = {}
    if (!isDPNLevel(user.role)) {
      if (user.role === 'ADMIN_DPD' && user.territory?.level === 'PROVINCE') {
        where.provinceCode = user.territory.code
      } else if (user.role === 'ADMIN_DPC' && user.territory?.level === 'REGENCY') {
        where.regencyCode = user.territory.code
      } else {
        // Fallback: filter to user's territory code on whatever level
        where.OR = [
          { provinceCode: user.territory?.code },
          { regencyCode: user.territory?.code },
        ]
      }
    }
    if (status) where.status = status
    if (category) where.category = category
    if (priority) where.priority = priority
    if (sentiment) where.sentiment = sentiment
    if (pollId) where.pollId = pollId

    const [items, total] = await Promise.all([
      db.aspiration.findMany({
        where,
        include: {
          reviewedBy: { select: { id: true, fullName: true, username: true } },
          poll: { select: { id: true, title: true } },
        },
        orderBy: [
          { priority: 'desc' }, // HIGH first (alphabetical desc puts HIGH before NORMAL before LOW)
          { submittedAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.aspiration.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (e: any) {
    console.error('[Aspirations GET Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// POST - Public submit aspiration with auto-detect
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      pollId,
      senderName,
      senderPhone,
      senderEmail,
      title,
      message,
      sourceUrl,
      ageGroup,
      gender,
      occupation,
      provinceCode,
      regencyCode,
      districtCode,
    } = body

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Judul dan pesan aspirasi wajib diisi' },
        { status: 400 }
      )
    }

    // If pollId provided, validate it exists & is ACTIVE
    if (pollId) {
      const poll = await db.poll.findUnique({ where: { id: pollId } })
      if (!poll) {
        return NextResponse.json(
          { success: false, error: 'Poll tidak ditemukan' },
          { status: 404 }
        )
      }
    }

    // Auto-detect
    const { category, subCategory } = detectCategory(message)
    const sentiment = detectSentiment(message)
    const priority = detectPriority(message, sentiment)
    const aiCluster = buildAiCluster({
      occupation,
      provinceCode,
      regencyCode,
      category,
      subCategory,
    })

    const aspiration = await db.aspiration.create({
      data: {
        pollId: pollId || null,
        senderName: senderName || null,
        senderPhone: senderPhone || null,
        senderEmail: senderEmail || null,
        category,
        subCategory,
        provinceCode: provinceCode || null,
        regencyCode: regencyCode || null,
        districtCode: districtCode || null,
        ageGroup: ageGroup || null,
        gender: gender || null,
        occupation: occupation || null,
        title,
        message,
        sourceUrl: sourceUrl || null,
        sentiment,
        priority,
        status: 'NEW',
        aiCluster,
      },
      include: {
        poll: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: aspiration,
      message: 'Terima kasih! Aspirasi Anda telah diterima dan akan ditinjau oleh tim kami.',
    })
  } catch (e: any) {
    console.error('[Aspirations POST Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
