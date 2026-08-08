// LAPRA 08 - API: KTA Application Review (Admin actions)
// PUT /api/kta-applications/[id]/review - Approve / Reject / Mark Reviewing
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getUserFromRequest,
  getEditableTerritoryIds,
  generateMemberNumber,
} from '@/lib/server-helpers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { action, reviewNotes, rejectionReason } = body
    // action: REVIEWING | APPROVE | REJECT | ISSUE_KTA

    const application = await db.ktaApplication.findUnique({
      where: { id },
      include: { territory: true },
    })
    if (!application) {
      return NextResponse.json({ success: false, error: 'Permohonan tidak ditemukan' }, { status: 404 })
    }

    // Cek hak review (admin harus punya hak edit di territory pemohon)
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(application.territoryId)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Anda tidak berhak review permohonan dari wilayah ini' },
        { status: 403 }
      )
    }

    // Action: REVIEWING - admin mulai review
    if (action === 'REVIEWING') {
      const updated = await db.ktaApplication.update({
        where: { id },
        data: {
          status: 'REVIEWING',
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
        include: { territory: true },
      })
      return NextResponse.json({ success: true, data: updated, message: 'Status: Sedang ditinjau' })
    }

    // Action: REJECT - admin tolak permohonan
    if (action === 'REJECT') {
      if (!rejectionReason) {
        return NextResponse.json({ success: false, error: 'Alasan penolakan wajib diisi' }, { status: 400 })
      }
      const updated = await db.ktaApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedById: user.id,
          reviewedAt: new Date(),
          rejectionReason,
          reviewNotes: reviewNotes || null,
        },
        include: { territory: true },
      })
      return NextResponse.json({ success: true, data: updated, message: 'Permohonan ditolak' })
    }

    // Action: APPROVE & ISSUE_KTA - admin setujui + generate KTA digital
    if (action === 'APPROVE' || action === 'ISSUE_KTA') {
      // Validasi dokumen wajib
      if (!application.photoUrl) {
        return NextResponse.json({ success: false, error: 'Pass foto pemohon belum diupload' }, { status: 400 })
      }
      if (!application.idCardUrl) {
        return NextResponse.json({ success: false, error: 'KTP/Paspor pemohon belum diupload' }, { status: 400 })
      }

      // Generate KTA number (format sesuai level territory)
      const ktaNumber = await generateMemberNumber(application.territoryId)

      // Cek apakah member sudah ada (anti-duplikasi)
      const existingMember = await db.member.findFirst({
        where: {
          OR: [
            { nik: application.nik || '___NO_NIK___' },
            { passportNumber: application.passportNumber || '___NO_PASS___' },
            { phone: application.phone },
          ]
        }
      })

      let memberId: string | null = null
      if (existingMember) {
        memberId = existingMember.id
        // Update existing member dengan data dari application
        await db.member.update({
          where: { id: existingMember.id },
          data: {
            photoUrl: application.photoUrl,
            idCardUrl: application.idCardUrl,
            status: 'ACTIVE',
            verifiedAt: new Date(),
            verifiedById: user.id,
          }
        })
      } else {
        // Buat member baru
        const newMember = await db.member.create({
          data: {
            memberNumber: ktaNumber,
            fullName: application.fullName,
            nik: application.nik,
            passportNumber: application.passportNumber,
            phone: application.phone,
            email: application.email,
            address: application.address,
            shirtSize: application.shirtSize,
            profession: application.occupation,
            gender: application.gender,
            birthDate: application.birthDate,
            birthPlace: application.birthPlace,
            bloodType: application.bloodType,
            maritalStatus: application.maritalStatus,
            photoUrl: application.photoUrl,
            idCardUrl: application.idCardUrl,
            territoryId: application.territoryId,
            status: 'ACTIVE',
            verifiedAt: new Date(),
            verifiedById: user.id,
            registeredById: user.id,
            registeredAt: new Date(),
          }
        })
        memberId = newMember.id
      }

      // Update application: APPROVED + link ke member + KTA number
      const updated = await db.ktaApplication.update({
        where: { id },
        data: {
          status: 'ISSUED',
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          memberId,
          ktaNumber,
          ktaIssuedAt: new Date(),
          ktaExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)), // 5 tahun
        },
        include: { territory: true },
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: `KTA digital berhasil diterbitkan. Nomor KTA: ${ktaNumber}. Masa berlaku 5 tahun.`,
      })
    }

    return NextResponse.json({ success: false, error: 'Action tidak valid' }, { status: 400 })
  } catch (e: any) {
    console.error('[KTA Review Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET /api/kta-applications/[id] - Get detail application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const application = await db.ktaApplication.findUnique({
    where: { id },
    include: { territory: true },
  })

  if (!application) {
    return NextResponse.json({ success: false, error: 'Permohonan tidak ditemukan' }, { status: 404 })
  }

  // Cek scope view
  const viewScope = await getViewableTerritoryIds(user)
  if (!viewScope.isGlobalView && !viewScope.territoryIds.includes(application.territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  return NextResponse.json({ success: true, data: application })
}

// Helper import for getViewableTerritoryIds
import { getViewableTerritoryIds } from '@/lib/server-helpers'
