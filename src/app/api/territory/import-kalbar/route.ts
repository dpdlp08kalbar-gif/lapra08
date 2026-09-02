// LAPRA 08 - API: Import Kalbar Territories (bulk import from JSON)
// ============================================================
// POST /api/territory/import-kalbar
// Body: { data: <kalbar-territories.json content> }
// Import 13 Kab/Kota, 160 Kecamatan, 1982 Desa/Kelurahan ke database
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!isDPNLevel(user.role)) {
    return NextResponse.json({ success: false, error: 'Hanya admin DPN yang bisa import wilayah' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = body.data

    if (!data || !data.kabKota || !Array.isArray(data.kabKota)) {
      return NextResponse.json({ success: false, error: 'Format data tidak valid' }, { status: 400 })
    }

    let created = 0
    let skipped = 0

    // 1. Cek/create COUNTRY: Indonesia
    let country = await db.territory.findFirst({ where: { level: 'COUNTRY', code: 'ID' } })
    if (!country) {
      country = await db.territory.create({ data: { name: 'Indonesia', code: 'ID', level: 'COUNTRY', category: 'DOMESTIC' } })
      created++
    } else { skipped++ }

    // 2. Cek/create PROVINCE: Kalimantan Barat
    let province = await db.territory.findUnique({ where: { code: data.province?.code || '61' } })
    if (!province) {
      province = await db.territory.create({ data: { name: data.province?.name || 'Kalimantan Barat', code: data.province?.code || '61', level: 'PROVINCE', parentId: country.id, category: 'DOMESTIC' } })
      created++
    } else { skipped++ }

    // 3. Import Kab/Kota → Kecamatan → Desa/Kelurahan
    for (const kab of data.kabKota) {
      let kabRecord = await db.territory.findUnique({ where: { code: kab.code } })
      if (!kabRecord) {
        kabRecord = await db.territory.create({ data: { name: kab.name, code: kab.code, level: 'REGENCY', parentId: province.id, category: 'DOMESTIC' } })
        created++
      } else { skipped++ }

      if (kab.kecamatan) {
        for (const kec of kab.kecamatan) {
          let kecRecord = await db.territory.findUnique({ where: { code: kec.code } })
          if (!kecRecord) {
            kecRecord = await db.territory.create({ data: { name: kec.name, code: kec.code, level: 'DISTRICT', parentId: kabRecord.id, category: 'DOMESTIC' } })
            created++
          } else { skipped++ }

          if (kec.desa) {
            for (const desa of kec.desa) {
              const existing = await db.territory.findUnique({ where: { code: desa.code } })
              if (!existing) {
                await db.territory.create({ data: { name: desa.name, code: desa.code, level: 'VILLAGE', parentId: kecRecord.id, category: 'DOMESTIC' } })
                created++
              } else { skipped++ }
            }
          }
        }
      }
    }

    await logAccess({ actor: user, action: 'CREATE', resource: 'SYSTEM_SETTING', resourceId: 'import-kalbar', resourceLabel: `Import Kalbar: ${created} created`, request, detail: `Bulk import: ${created} created, ${skipped} skipped` })

    return NextResponse.json({
      success: true,
      data: { created, skipped },
      message: `Import selesai: ${created} wilayah baru, ${skipped} sudah ada.`,
    })
  } catch (e: any) {
    console.error('[Import Kalbar] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
