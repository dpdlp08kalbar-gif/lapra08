// LAPRA 08 - API: Contacts (Real Contact Database)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds } from '@/lib/server-helpers'

// Pastikan route berjalan di Node.js runtime (bukan Edge), selalu dynamic
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/contacts - List contacts with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const provinceCode = searchParams.get('provinceCode')
    const optInOnly = searchParams.get('optInOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    let scope
    try {
      scope = await getViewableTerritoryIds(user)
    } catch (scopeErr: any) {
      console.error('[Contacts GET] getViewableTerritoryIds failed:', scopeErr.message)
      if (!user.territoryId) return NextResponse.json({ success: true, data: [], total: 0, stats: { totalContacts: 0, optInCount: 0, verifiedCount: 0 } })
      scope = { isGlobalView: false, territoryIds: [user.territoryId], primaryTerritoryId: user.territoryId }
    }

    const where: any = {}
    if (!scope.isGlobalView) where.territoryId = { in: scope.territoryIds }
    if (optInOnly) { where.whatsappOptIn = true; where.isActive = true }
    if (provinceCode) where.provinceCode = provinceCode
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [contacts, total] = await Promise.all([
      db.contact.findMany({ where, include: { territory: true }, orderBy: { registeredAt: 'desc' }, take: limit }),
      db.contact.count({ where }),
    ])

    // Stats — defensive (jangan crash kalau salah satu count gagal)
    let stats = { totalContacts: 0, optInCount: 0, verifiedCount: 0 }
    try {
      const totalContacts = await db.contact.count({ where: scope.isGlobalView ? {} : { territoryId: { in: scope.territoryIds } } })
      const optInCount = await db.contact.count({ where: { ...where, whatsappOptIn: true, isActive: true } })
      const verifiedCount = await db.contact.count({ where: { ...where, isVerified: true } })
      stats = { totalContacts, optInCount, verifiedCount }
    } catch (statErr: any) {
      console.error('[Contacts GET] stats query failed:', statErr.message)
    }

    return NextResponse.json({ success: true, data: contacts, total, stats })
  } catch (e: any) {
    console.error('[Contacts GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat kontak: ${e.message}` },
      { status: 500 }
    )
  }
}

// POST /api/contacts - Add single contact
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, phone, email, ageGroup, gender, occupation, territoryId, whatsappOptIn, tags, source } = body

    if (!name || !territoryId) return NextResponse.json({ success: false, error: 'Nama dan wilayah wajib' }, { status: 400 })

    // Check duplicate phone
    if (phone) {
      const existing = await db.contact.findUnique({ where: { phone } })
      if (existing) return NextResponse.json({ success: false, error: 'Nomor WA sudah terdaftar' }, { status: 400 })
    }

    const territory = await db.territory.findUnique({ where: { id: territoryId } })
    if (!territory) return NextResponse.json({ success: false, error: 'Wilayah tidak ditemukan' }, { status: 400 })

    const path = `ID.${territory.code}` // Simplified path

    const contact = await db.contact.create({
      data: {
        name, phone, email, ageGroup, gender, occupation, territoryId,
        whatsappOptIn: whatsappOptIn || false,
        optInDate: whatsappOptIn ? new Date() : null,
        optInSource: source || 'MANUAL',
        tags: JSON.stringify(tags || []),
        path,
        provinceCode: territory.level === 'PROVINCE' ? territory.code : undefined,
        source: source || 'MANUAL',
      },
      include: { territory: true },
    })

    return NextResponse.json({ success: true, data: contact, message: 'Kontak berhasil ditambahkan' })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST /api/contacts/import - Import from CSV (JSON array)
export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { contacts, territoryId } = body

    if (!Array.isArray(contacts) || !territoryId) {
      return NextResponse.json({ success: false, error: 'Format: { contacts: [...], territoryId: "..." }' }, { status: 400 })
    }

    const territory = await db.territory.findUnique({ where: { id: territoryId } })
    if (!territory) return NextResponse.json({ success: false, error: 'Wilayah tidak ditemukan' }, { status: 400 })

    const path = `ID.${territory.code}`
    let imported = 0, skipped = 0

    for (const c of contacts) {
      if (!c.name || !c.phone) { skipped++; continue }
      try {
        await db.contact.create({
          data: {
            name: c.name,
            phone: c.phone,
            email: c.email || null,
            ageGroup: c.ageGroup || null,
            gender: c.gender || null,
            occupation: c.occupation || null,
            territoryId,
            whatsappOptIn: c.whatsappOptIn || false,
            optInDate: c.whatsappOptIn ? new Date() : null,
            optInSource: 'IMPORT_CSV',
            tags: JSON.stringify(c.tags || []),
            path,
            provinceCode: territory.level === 'PROVINCE' ? territory.code : (c.provinceCode || null),
            regencyCode: c.regencyCode || null,
            source: 'IMPORT_CSV',
          },
        })
        imported++
      } catch { skipped++ }
    }

    return NextResponse.json({ success: true, data: { imported, skipped, total: contacts.length }, message: `Import selesai: ${imported} berhasil, ${skipped} di-skip (duplikat/invalid)` })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
