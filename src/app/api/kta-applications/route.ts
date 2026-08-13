// LAPRA 08 - API: KTA Applications (Public submission + Admin list)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getViewableTerritoryIds,
  getEditableTerritoryIds,
  generateMemberNumber,
} from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

// Generate application number: APP-LAPRA08-YYYYMMDD-XXXX
async function generateApplicationNumber(): Promise<string> {
  const today = new Date()
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const prefix = `APP-LAPRA08-${dateStr}-`

  // Count today's applications
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  const todayCount = await db.ktaApplication.count({
    where: { createdAt: { gte: todayStart, lt: todayEnd } }
  })

  const seq = String(todayCount + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

// GET /api/kta-applications - List all applications (admin only)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const territoryId = searchParams.get('territoryId')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '100')

  const viewScope = await getViewableTerritoryIds(user)
  const editScope = await getEditableTerritoryIds(user)

  const where: any = {}
  if (status) where.status = status
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { applicationNumber: { contains: search, mode: 'insensitive' } },
      { nik: { contains: search } },
      { phone: { contains: search } },
      { ktaNumber: { contains: search } },
    ]
  }
  // Scope territory
  if (!viewScope.isGlobalView) {
    where.territoryId = { in: viewScope.territoryIds }
  }
  if (territoryId) {
    if (viewScope.isGlobalView || viewScope.territoryIds.includes(territoryId)) {
      where.territoryId = territoryId
    }
  }

  const [apps, total] = await Promise.all([
    db.ktaApplication.findMany({
      where,
      include: { territory: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.ktaApplication.count({ where }),
  ])

  // Add canReview flag
  const appsWithPermissions = apps.map((a) => ({
    ...a,
    canReview: editScope.isGlobalEdit || editScope.territoryIds.includes(a.territoryId),
  }))

  return NextResponse.json({ success: true, data: appsWithPermissions, total })
}

// POST /api/kta-applications - Submit new application (PUBLIC - no login required)
// Supports JSON (without files) or FormData (with files)
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  const user = await getUserFromRequest(request).catch(() => null)

  try {
    let formData: any = {}
    let photoUrl: string | null = null
    let idCardUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      formData = {
        fullName: form.get('fullName') as string,
        gender: form.get('gender') as string || null,
        birthPlace: form.get('birthPlace') as string || null,
        birthDate: form.get('birthDate') as string || null,
        bloodType: form.get('bloodType') as string || null,
        maritalStatus: form.get('maritalStatus') as string || null,
        occupation: form.get('occupation') as string || null,
        shirtSize: form.get('shirtSize') as string || null,
        nik: form.get('nik') as string || null,
        passportNumber: form.get('passportNumber') as string || null,
        phone: form.get('phone') as string,
        email: form.get('email') as string || null,
        address: form.get('address') as string || null,
        territoryId: form.get('territoryId') as string,
        applicantNotes: form.get('applicantNotes') as string || null,
        isInternational: form.get('isInternational') === 'true',
      }
      // Upload files (Vercel-compatible: store as base64 in DB, no filesystem)
      const photoFile = form.get('photo') as File | null
      const idCardFile = form.get('idCard') as File | null

      if (photoFile && photoFile.size > 0) {
        if (!photoFile.type.startsWith('image/')) {
          return NextResponse.json({ success: false, error: 'File foto harus berupa gambar' }, { status: 400 })
        }
        if (photoFile.size > 5 * 1024 * 1024) {
          return NextResponse.json({ success: false, error: 'Ukuran foto maksimal 5MB' }, { status: 400 })
        }
        // Convert to base64 data URL — stored directly in photoUrl column
        const buf = Buffer.from(await photoFile.arrayBuffer())
        const mime = photoFile.type || 'image/jpeg'
        photoUrl = `data:${mime};base64,${buf.toString('base64')}`
      }

      if (idCardFile && idCardFile.size > 0) {
        const allowed = ['image/', 'application/pdf']
        if (!allowed.some(t => idCardFile.type.startsWith(t))) {
          return NextResponse.json({ success: false, error: 'File KTP/Paspor harus gambar atau PDF' }, { status: 400 })
        }
        if (idCardFile.size > 10 * 1024 * 1024) {
          return NextResponse.json({ success: false, error: 'Ukuran KTP/Paspor maksimal 10MB' }, { status: 400 })
        }
        // Convert to base64 data URL
        const buf = Buffer.from(await idCardFile.arrayBuffer())
        const mime = idCardFile.type || 'application/pdf'
        idCardUrl = `data:${mime};base64,${buf.toString('base64')}`
      }
    } else {
      // JSON mode (no files)
      formData = await request.json()
    }

    // Validasi
    if (!formData.fullName || !formData.phone || !formData.territoryId) {
      return NextResponse.json(
        { success: false, error: 'Nama, nomor WhatsApp, dan wilayah wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi isInternational
    if (formData.isInternational) {
      if (!formData.passportNumber) {
        return NextResponse.json({ success: false, error: 'Nomor Paspor wajib untuk pemohon luar negeri' }, { status: 400 })
      }
    } else {
      if (!formData.nik) {
        return NextResponse.json({ success: false, error: 'NIK wajib untuk pemohon domestik' }, { status: 400 })
      }
    }

    // Cek duplikasi phone
    const existingByPhone = await db.ktaApplication.findFirst({
      where: { phone: formData.phone, status: { notIn: ['REJECTED'] } }
    })
    if (existingByPhone) {
      return NextResponse.json(
        { success: false, error: `Nomor WA ${formData.phone} sudah pernah mendaftar. Cek status dengan nomor pendaftaran: ${existingByPhone.applicationNumber}` },
        { status: 400 }
      )
    }

    // Cek duplikasi NIK
    if (formData.nik) {
      const existingNik = await db.ktaApplication.findFirst({
        where: { nik: formData.nik, status: { notIn: ['REJECTED'] } }
      })
      if (existingNik) {
        return NextResponse.json({ success: false, error: 'NIK sudah terdaftar' }, { status: 400 })
      }
    }

    // Cek territory exists
    const territory = await db.territory.findUnique({ where: { id: formData.territoryId } })
    if (!territory) {
      return NextResponse.json({ success: false, error: 'Wilayah tidak ditemukan' }, { status: 400 })
    }

    // Generate application number
    const applicationNumber = await generateApplicationNumber()

    const application = await db.ktaApplication.create({
      data: {
        applicationNumber,
        fullName: formData.fullName,
        gender: formData.gender || null,
        birthPlace: formData.birthPlace || null,
        birthDate: formData.birthDate ? new Date(formData.birthDate) : null,
        bloodType: formData.bloodType || null,
        maritalStatus: formData.maritalStatus || null,
        occupation: formData.occupation || null,
        shirtSize: formData.shirtSize || null,
        nik: formData.nik || null,
        passportNumber: formData.passportNumber || null,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        photoUrl,
        idCardUrl,
        territoryId: formData.territoryId,
        applicantNotes: formData.applicantNotes || null,
        status: 'PENDING',
        submittedById: user?.id || null,
      },
      include: { territory: true },
    })

    return NextResponse.json({
      success: true,
      data: application,
      message: `Permohonan KTA berhasil dikirim. Nomor pendaftaran: ${applicationNumber}. Tim DPC akan menghubungi via WhatsApp dalam 1x24 jam.`,
    })
  } catch (e: any) {
    console.error('[KTA Application Submit Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
