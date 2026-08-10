// LAPRA 08 - API: Poll Respond (Public vote)
// POST /api/polls/[id]/respond - Public vote on an active poll
//   Anti-duplikasi: same respondentPhone cannot vote twice on same poll
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const poll = await db.poll.findUnique({ where: { id } })

    if (!poll) {
      return NextResponse.json({ success: false, error: 'Poll tidak ditemukan' }, { status: 404 })
    }

    if (poll.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Poll tidak aktif. Hanya poll berstatus ACTIVE yang menerima respons.' },
        { status: 400 }
      )
    }

    // Check closing time
    if (poll.closesAt && new Date() > poll.closesAt) {
      return NextResponse.json(
        { success: false, error: 'Poll sudah ditutup. Waktu respons telah habis.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      optionId,
      respondentName,
      respondentPhone,
      ageGroup,
      gender,
      occupation,
      provinceCode,
      regencyCode,
      districtCode,
      feedback,
    } = body

    if (!optionId) {
      return NextResponse.json(
        { success: false, error: 'optionId wajib diisi' },
        { status: 400 }
      )
    }

    // Parse options and find chosen option
    let optionsArr: any[] = []
    try {
      optionsArr = JSON.parse(poll.options)
    } catch {
      optionsArr = []
    }
    const chosen = optionsArr.find((o: any) => String(o.id) === String(optionId))
    if (!chosen) {
      return NextResponse.json(
        { success: false, error: 'Opsi tidak valid. Pilih salah satu opsi yang tersedia.' },
        { status: 400 }
      )
    }

    // Anti-duplikasi: jika respondentPhone diberikan, cek apakah sudah pernah vote di poll ini
    if (respondentPhone && respondentPhone.trim() !== '') {
      const normalizedPhone = respondentPhone.trim()
      const existing = await db.pollResponse.findFirst({
        where: {
          pollId: id,
          respondentPhone: normalizedPhone,
        },
      })
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: 'Anda sudah memberikan respons untuk polling ini. Satu nomor hanya bisa vote sekali.',
          },
          { status: 409 }
        )
      }
    }

    // Capture IP & user agent
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : null
    const userAgent = request.headers.get('user-agent') || null

    const response = await db.pollResponse.create({
      data: {
        pollId: id,
        respondentPhone: respondentPhone ? respondentPhone.trim() : null,
        respondentName: respondentName || null,
        ageGroup: ageGroup || null,
        gender: gender || null,
        occupation: occupation || null,
        provinceCode: provinceCode || null,
        regencyCode: regencyCode || null,
        districtCode: districtCode || null,
        optionId: String(chosen.id),
        sentiment: chosen.sentiment || 'NEUTRAL',
        feedback: feedback || null,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Terima kasih! Respons Anda telah direkam.',
    })
  } catch (e: any) {
    console.error('[Poll Respond Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
