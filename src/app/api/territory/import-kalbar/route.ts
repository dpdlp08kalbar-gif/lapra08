// LAPRA 08 - API: Import Kalbar Territories (bulk import from JSON)
// ============================================================
// POST /api/territory/import-kalbar
// Body: { data: <kalbar-territories.json content> }
// Import 13 Kab/Kota, 160 Kecamatan, 1982 Desa/Kelurahan ke database
// Plus: RW & RT (recursive) jika field 'rw' ada di desa/kelurahan
//
// Hierarki:
//   COUNTRY (Indonesia)
//     └─ PROVINCE (Kalbar)
//          └─ REGENCY (Kab/Kota)
//               └─ DISTRICT (Kecamatan)
//                    └─ VILLAGE (Desa/Kelurahan)
//                         └─ RW (Rukun Warga)
//                              └─ RT (Rukun Tetangga)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Helper: get-or-create territory by code (idempotent import)
async function getOrCreate(
  code: string,
  name: string,
  level: 'COUNTRY' | 'PROVINCE' | 'REGENCY' | 'DISTRICT' | 'VILLAGE' | 'RW' | 'RT',
  parentId: string | null,
  category: 'DOMESTIC' | 'INTERNATIONAL' = 'DOMESTIC'
): Promise<{ record: any; wasCreated: boolean }> {
  const existing = await db.territory.findUnique({ where: { code } })
  if (existing) return { record: existing, wasCreated: false }
  const record = await db.territory.create({
    data: parentId ? { name, code, level, parentId, category } : { name, code, level, category },
  })
  return { record, wasCreated: true }
}

// Recursive import for RW → RT
async function importRwRt(
  rwList: any[],
  parentId: string
): Promise<{ created: number; skipped: number }> {
  let created = 0
  let skipped = 0
  for (const rw of rwList) {
    if (!rw || !rw.code || !rw.name) continue
    const { record: rwRec, wasCreated: rwCreated } = await getOrCreate(
      rw.code,
      rw.name,
      'RW',
      parentId
    )
    if (rwCreated) created++
    else skipped++

    // Import RT under this RW
    if (Array.isArray(rw.rt)) {
      for (const rt of rw.rt) {
        if (!rt || !rt.code || !rt.name) continue
        const { wasCreated: rtCreated } = await getOrCreate(
          rt.code,
          rt.name,
          'RT',
          rwRec.id
        )
        if (rtCreated) created++
        else skipped++
      }
    }
  }
  return { created, skipped }
}

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
    let rwRtCreated = 0

    // 1. Cek/create COUNTRY: Indonesia
    const { wasCreated: cCreated } = await getOrCreate('ID', 'Indonesia', 'COUNTRY', null)
    if (cCreated) created++
    else skipped++
    const country = await db.territory.findUnique({ where: { code: 'ID' } })
    if (!country) {
      return NextResponse.json({ success: false, error: 'Gagal membuat/menemukan COUNTRY Indonesia' }, { status: 500 })
    }

    // 2. Cek/create PROVINCE: Kalimantan Barat
    const provCode = data.province?.code || '61'
    const provName = data.province?.name || 'Kalimantan Barat'
    const { wasCreated: pCreated } = await getOrCreate(provCode, provName, 'PROVINCE', country.id)
    if (pCreated) created++
    else skipped++
    const province = await db.territory.findUnique({ where: { code: provCode } })
    if (!province) {
      return NextResponse.json({ success: false, error: 'Gagal membuat/menemukan PROVINCE Kalbar' }, { status: 500 })
    }

    // 3. Import Kab/Kota → Kecamatan → Desa/Kelurahan → RW → RT
    for (const kab of data.kabKota) {
      if (!kab || !kab.code || !kab.name) continue
      const { record: kabRec, wasCreated: kabCreated } = await getOrCreate(
        kab.code,
        kab.name,
        'REGENCY',
        province.id
      )
      if (kabCreated) created++
      else skipped++

      if (!kab.kecamatan) continue
      for (const kec of kab.kecamatan) {
        if (!kec || !kec.code || !kec.name) continue
        const { record: kecRec, wasCreated: kecCreated } = await getOrCreate(
          kec.code,
          kec.name,
          'DISTRICT',
          kabRec.id
        )
        if (kecCreated) created++
        else skipped++

        if (!kec.desa) continue
        for (const desa of kec.desa) {
          if (!desa || !desa.code || !desa.name) continue
          const { record: desaRec, wasCreated: desaCreated } = await getOrCreate(
            desa.code,
            desa.name,
            'VILLAGE',
            kecRec.id
          )
          if (desaCreated) created++
          else skipped++

          // === Recursive RW → RT import ===
          if (Array.isArray(desa.rw) && desa.rw.length > 0) {
            const rtrwResult = await importRwRt(desa.rw, desaRec.id)
            rwRtCreated += rtrwResult.created
            skipped += rtrwResult.skipped
          }
        }
      }
    }

    await logAccess({
      actor: user,
      action: 'CREATE',
      resource: 'SYSTEM_SETTING',
      resourceId: 'import-kalbar',
      resourceLabel: `Import Kalbar: ${created} wilayah + ${rwRtCreated} RW/RT`,
      request,
      detail: `Bulk import: ${created} wilayah + ${rwRtCreated} RW/RT created, ${skipped} skipped`,
    })

    return NextResponse.json({
      success: true,
      data: {
        created,
        skipped,
        rwRtCreated,
      },
      message: `Import selesai: ${created} wilayah + ${rwRtCreated} RW/RT baru, ${skipped} sudah ada.`,
    })
  } catch (e: any) {
    console.error('[Import Kalbar] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
