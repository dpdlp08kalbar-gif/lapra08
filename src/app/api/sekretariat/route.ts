// LAPRA 08 - API: Sekretariat Locations (Lokasi DPN/Koorwil/DPD/DPC)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET /api/sekretariat - List all sekretariat locations
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const items = await db.systemSetting.findMany({
    where: { category: 'SEKRETARIAT' },
    orderBy: { updatedAt: 'desc' },
  })

  const locations = items.map((item) => {
    try { return JSON.parse(item.value) } catch { return null }
  }).filter(Boolean)

  return NextResponse.json({ success: true, data: locations })
}

// POST /api/sekretariat - Create or update location
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const locData = {
      id: body.id || `loc_${Date.now()}`,
      name: body.name || '',
      level: body.level || 'DPC',
      address: body.address || '',
      city: body.city || '',
      province: body.province || '',
      postalCode: body.postalCode || '',
      phone: body.phone || '',
      email: body.email || '',
      lat: body.lat || 0,
      lng: body.lng || 0,
      hours: body.hours || 'Senin-Jumat 08:00-17:00 WIB',
      mapUrl: body.mapUrl || `https://www.google.com/maps?q=${encodeURIComponent(body.address || body.name || '')}`,
      updatedAt: new Date().toISOString(),
    }

    await db.systemSetting.upsert({
      where: { key: locData.id },
      update: { value: JSON.stringify(locData), category: 'SEKRETARIAT' },
      create: {
        key: locData.id,
        value: JSON.stringify(locData),
        category: 'SEKRETARIAT',
        description: `Sekretariat: ${locData.name}`,
      },
    })

    return NextResponse.json({ success: true, data: locData, message: 'Lokasi sekretariat disimpan' })
  } catch (e: any) {
    console.error('[Sekretariat Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
