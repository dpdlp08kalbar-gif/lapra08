// LAPRA 08 - API: Data Access Request (UU PDP No. 27/2022 Pasal 5-13)
// GET  /api/data-access-requests — list DAR (requestor lihat sendiri, DPO lihat semua)
// POST /api/data-access-requests — anggota ajukan DAR baru
//
// Hak subjek data (Pasal 5-13 UU PDP):
// - ACCESS (Pasal 5): lihat data yang organisasi simpan tentang saya
// - CORRECT (Pasal 9): koreksi data yang salah/kedaluwarsa
// - DELETE (Pasal 10): hapus data saya
// - RESTRICT (Pasal 11): batasi pemrosesan
// - PORTABILITY (Pasal 13): minta data dalam format terstruktur
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, generateDARNumber, isDPO, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_TYPES = ['ACCESS', 'CORRECT', 'DELETE', 'RESTRICT', 'PORTABILITY']

// GET - list DAR
// User biasa: lihat DAR sendiri
// DPO/SuperAdmin/DPN: lihat semua DAR
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: any = {}
    // RBAC: user biasa hanya lihat DAR sendiri
    if (!isDPO(user) && user.role !== 'ADMIN_DPN') {
      where.requestorId = user.id
    }
    if (status) where.status = status
    if (type) where.type = type

    const requests = await db.dataAccessRequest.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        handler: { select: { id: true, fullName: true } },
      },
      take: 100,
    })

    // Stats untuk DPO dashboard
    let stats = null
    if (isDPO(user) || user.role === 'ADMIN_DPN') {
      const all = await db.dataAccessRequest.groupBy({
        by: ['status'],
        _count: { status: true },
      })
      stats = all.reduce((acc: Record<string, number>, s: any) => {
        acc[s.status] = s._count.status
        return acc
      }, {})
    }

    return NextResponse.json({
      success: true,
      data: requests,
      stats,
      isDPOView: isDPO(user) || user.role === 'ADMIN_DPN',
    })
  } catch (e: any) {
    console.error('[DataAccessRequest GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat permintaan: ${e.message}` },
      { status: 500 }
    )
  }
}

// POST - ajukan DAR baru
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, description } = body

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Type tidak valid. Pilih: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    if (!description || description.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Deskripsi minimal 10 karakter (jelaskan data yang diminta)' },
        { status: 400 }
      )
    }

    // Rate limit: 1 DAR per type per 24 jam per user
    const last24h = await db.dataAccessRequest.findFirst({
      where: {
        requestorId: user.id,
        type,
        submittedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { requestNumber: true },
    })
    if (last24h) {
      return NextResponse.json(
        { success: false, error: `Anda sudah mengajukan permintaan ${type} dalam 24 jam terakhir (${last24h.requestNumber}). Tunggu respons DPO terlebih dahulu.` },
        { status: 429 }
      )
    }

    const requestNumber = await generateDARNumber()
    const dar = await db.dataAccessRequest.create({
      data: {
        requestNumber,
        requestorId: user.id,
        requestorName: user.fullName,
        requestorPhone: user.phone,
        requestorEmail: user.email,
        type,
        description: description.trim().substring(0, 2000),
        status: 'PENDING',
      },
      select: {
        id: true, requestNumber: true, type: true, description: true,
        status: true, submittedAt: true,
      },
    })

    // Audit log
    await logAccess({
      actor: user,
      action: 'CREATE',
      resource: 'DATA_ACCESS_REQUEST',
      resourceId: dar.id,
      resourceLabel: `${requestNumber} (${type})`,
      request,
    })

    return NextResponse.json({
      success: true,
      data: dar,
      message: `Permintaan ${requestNumber} berhasil diajukan. DPO akan menghubungi Anda dalam 3×24 jam (UU PDP Pasal 46).`,
    }, { status: 201 })
  } catch (e: any) {
    console.error('[DataAccessRequest POST] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal mengajukan permintaan: ${e.message}` },
      { status: 500 }
    )
  }
}
