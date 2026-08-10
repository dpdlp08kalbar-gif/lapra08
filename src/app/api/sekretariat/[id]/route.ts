// LAPRA 08 - API: Sekretariat [id] - Update & Delete Location
// Stored in SystemSetting category=SEKRETARIAT
//
// PUT    /api/sekretariat/[id]  - update location (preserve existing fields)
// DELETE /api/sekretariat/[id]  - delete location + cleanup photo
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

// PUT - update location
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

    // Find existing
    const existing = await db.systemSetting.findUnique({ where: { key: id } })
    if (!existing || existing.category !== 'SEKRETARIAT') {
      return NextResponse.json(
        { success: false, error: 'Lokasi sekretariat tidak ditemukan' },
        { status: 404 }
      )
    }

    let prev: any = {}
    try {
      prev = JSON.parse(existing.value)
    } catch {
      prev = {}
    }

    // Merge: preserve existing fields, override with provided ones
    const merged: any = {
      id: prev.id || id,
      name: body.name !== undefined ? body.name : prev.name || '',
      level: body.level !== undefined ? body.level : prev.level || 'DPC',
      address: body.address !== undefined ? body.address : prev.address || '',
      city: body.city !== undefined ? body.city : prev.city || '',
      province: body.province !== undefined ? body.province : prev.province || '',
      postalCode: body.postalCode !== undefined ? body.postalCode : prev.postalCode || '',
      phone: body.phone !== undefined ? body.phone : prev.phone || '',
      email: body.email !== undefined ? body.email : prev.email || '',
      lat: body.lat !== undefined ? body.lat : prev.lat || 0,
      lng: body.lng !== undefined ? body.lng : prev.lng || 0,
      hours: body.hours !== undefined ? body.hours : prev.hours || 'Senin-Jumat 08:00-17:00 WIB',
      mapUrl:
        body.mapUrl !== undefined
          ? body.mapUrl
          : prev.mapUrl ||
            `https://www.google.com/maps?q=${encodeURIComponent(body.address || prev.address || prev.name || '')}`,
      photoUrl: body.photoUrl !== undefined ? body.photoUrl : prev.photoUrl || null,
      updatedAt: new Date().toISOString(),
      createdAt: prev.createdAt || new Date().toISOString(),
    }

    const updated = await db.systemSetting.update({
      where: { key: id },
      data: {
        value: JSON.stringify(merged),
        category: 'SEKRETARIAT',
        description: `Sekretariat: ${merged.name}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: merged,
      message: 'Lokasi sekretariat diperbarui',
    })
  } catch (e: any) {
    console.error('[Sekretariat PUT Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - delete location + cleanup photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const existing = await db.systemSetting.findUnique({ where: { key: id } })
    if (!existing || existing.category !== 'SEKRETARIAT') {
      return NextResponse.json(
        { success: false, error: 'Lokasi sekretariat tidak ditemukan' },
        { status: 404 }
      )
    }

    // Delete photo file if exists
    try {
      const data = JSON.parse(existing.value)
      if (data && data.photoUrl) {
        const filePath = path.join(
          process.cwd(),
          'public',
          data.photoUrl.replace(/^\//, '')
        )
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }
    } catch {
      // ignore parse / file errors
    }

    await db.systemSetting.delete({ where: { key: id } })

    return NextResponse.json({
      success: true,
      message: 'Lokasi sekretariat berhasil dihapus',
    })
  } catch (e: any) {
    console.error('[Sekretariat DELETE Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
