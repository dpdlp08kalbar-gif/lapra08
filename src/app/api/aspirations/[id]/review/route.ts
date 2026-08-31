// LAPRA 08 - API: Aspiration Review (Admin action)
// PUT /api/aspirations/[id]/review - Admin review aspiration
//   Body: { status, priority, category, reviewNotes }
//   - Set reviewedById + reviewedAt
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel } from '@/lib/server-helpers'

const VALID_STATUSES = ['NEW', 'REVIEWING', 'ADDRESSED', 'RESOLVED', 'ARCHIVED']
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const VALID_CATEGORIES = [
  'PERTANIAN',
  'EKONOMI',
  'PENDIDIKAN',
  'KESEHATAN',
  'INFRASTRUKTUR',
  'LAINNYA',
]

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { status, priority, category, reviewNotes } = body

    const existing = await db.aspiration.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Aspirasi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Admin scope check:
    // - SUPERADMIN/ADMIN_DPN: full access
    // - ADMIN_DPD: only aspirations from their provinceCode
    // - ADMIN_DPC: only aspirations from their regencyCode
    if (!isDPNLevel(user.role)) {
      const userCode = user.territory?.code
      if (!userCode) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Wilayah admin tidak terdefinisi' },
          { status: 403 }
        )
      }
      const isProvinceMatch = existing.provinceCode === userCode
      const isRegencyMatch = existing.regencyCode === userCode
      if (user.role === 'ADMIN_DPD' && !isProvinceMatch) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Aspirasi di luar provinsi Anda' },
          { status: 403 }
        )
      }
      if (user.role === 'ADMIN_DPC' && !isRegencyMatch) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak: Aspirasi di luar kabupaten/kota Anda' },
          { status: 403 }
        )
      }
    }

    // Validate inputs
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Status tidak valid. Pilihan: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { success: false, error: `Prioritas tidak valid. Pilihan: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      )
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Kategori tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (category) {
      updateData.category = category
      // Clear subCategory if category changed (subCategory depends on category)
      if (existing.category !== category) updateData.subCategory = null
    }
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes || null
    updateData.reviewedById = user.id
    updateData.reviewedAt = new Date()

    const updated = await db.aspiration.update({
      where: { id },
      data: updateData,
      include: {
        reviewedBy: { select: { id: true, fullName: true, username: true } },
        poll: { select: { id: true, title: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Aspirasi berhasil ditinjau dan diperbarui.',
    })
  } catch (e: any) {
    console.error('[Aspiration Review Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
