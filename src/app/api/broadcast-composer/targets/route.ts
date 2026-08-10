// LAPRA 08 - API: Resolve Target Contacts (Dynamic Database Resolution)
// POST /api/broadcast-composer/targets - Resolve contacts dari DB by wilayah + segment
// Returns: contacts list + stats + filter description
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/server-helpers'
import { resolveTargetContacts, type BroadcastTarget } from '@/lib/broadcast-engine'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json() as BroadcastTarget
    const result = await resolveTargetContacts(body)

    // Get sample contacts (first 5) untuk preview
    const sampleContacts = result.contacts.slice(0, 5).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone ? c.phone.replace(/(\d{4})\d{4}(\d{4})/, '$1****$2') : null, // mask phone for privacy
      territoryName: c.territoryName,
      territoryLevel: c.territoryLevel,
      ageGroup: c.ageGroup,
      occupation: c.occupation,
    }))

    // Get all unique territories covered
    const territories = Array.from(new Set(result.contacts.map(c => `${c.territoryName} (${c.territoryLevel})`)))

    // Get demographic breakdown
    const ageGroups = result.contacts.reduce((acc: Record<string, number>, c) => {
      const ag = c.ageGroup || 'UNKNOWN'
      acc[ag] = (acc[ag] || 0) + 1
      return acc
    }, {})
    const occupations = result.contacts.reduce((acc: Record<string, number>, c) => {
      const occ = c.occupation || 'LAINNYA'
      acc[occ] = (acc[occ] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      data: {
        totalFound: result.totalFound,
        totalOptIn: result.totalOptIn,
        totalSkipped: result.totalSkipped,
        filterDescription: result.filterDescription,
        sampleContacts,
        territoriesCovered: territories,
        demographics: { ageGroups, occupations },
      },
    })
  } catch (e: any) {
    console.error('[Targets API] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET - List available territories (untuk dropdown filter)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level') || 'PROVINCE'

  // Get territories by level
  const territories = await db.territory.findMany({
    where: { level, isActive: true },
    select: { code: true, name: true, level: true },
    orderBy: { name: 'asc' },
  })

  // Get total contacts per territory
  const territoriesWithCounts = await Promise.all(
    territories.map(async t => {
      const count = await db.contact.count({
        where: {
          isActive: true,
          whatsappOptIn: true,
          phone: { not: null },
          OR: [
            level === 'PROVINCE' ? { provinceCode: t.code } : {},
            level === 'REGENCY' ? { regencyCode: t.code } : {},
            level === 'DISTRICT' ? { districtCode: t.code } : {},
            level === 'VILLAGE' ? { villageCode: t.code } : {},
          ].filter(c => Object.keys(c).length > 0),
        },
      })
      return { ...t, contactCount: count }
    })
  )

  return NextResponse.json({
    success: true,
    data: territoriesWithCounts,
    level,
  })
}
