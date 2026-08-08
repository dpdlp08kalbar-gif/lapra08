// LAPRA 08 - API: Auto-Generate DPC Master for DPD
// Saat Admin DPD mengakses DPC provinsinya untuk pertama kali, sistem auto-generate DPC master
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getEditableTerritoryIds } from '@/lib/server-helpers'

// POST /api/territory/auto-generate-dpc
// Body: { dpdId: string } — ID DPD yang akan di-generate DPC-nya
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { dpdId } = body

    if (!dpdId) {
      return NextResponse.json(
        { success: false, error: 'dpdId wajib diisi' },
        { status: 400 }
      )
    }

    // Cek DPD exists
    const dpd = await db.territory.findUnique({ where: { id: dpdId } })
    if (!dpd || dpd.level !== 'PROVINCE') {
      return NextResponse.json(
        { success: false, error: 'DPD tidak ditemukan atau bukan level PROVINCE' },
        { status: 404 }
      )
    }

    // Cek hak akses
    const editScope = await getEditableTerritoryIds(user)
    if (!editScope.isGlobalEdit && !editScope.territoryIds.includes(dpdId)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: tidak bisa generate DPC di DPD ini' },
        { status: 403 }
      )
    }

    // Cek DPC yang sudah ada
    const existingDpc = await db.territory.findMany({
      where: { parentId: dpdId, level: 'REGENCY' },
      select: { code: true },
    })
    const existingCodes = new Set(existingDpc.map((d) => d.code))

    if (existingDpc.length > 0) {
      return NextResponse.json({
        success: true,
        data: { existing: existingDpc.length, created: 0 },
        message: `DPD "${dpd.name}" sudah memiliki ${existingDpc.length} DPC. Tidak perlu generate ulang.`,
      })
    }

    // Import master data dan filter untuk DPD ini
    const { dpcMasterData } = await import('./../../../../../scripts/dpc-master-data')
    const dpcForThisDpd = dpcMasterData.filter((d) => d.provinceCode === dpd.code)

    if (dpcForThisDpd.length === 0) {
      return NextResponse.json({
        success: true,
        data: { existing: 0, created: 0 },
        message: `Tidak ada master DPC untuk DPD "${dpd.name}" (kode: ${dpd.code}). Mungkin ini wilayah khusus seperti IKN.`,
      })
    }

    // Generate DPC
    let created = 0
    for (const dpc of dpcForThisDpd) {
      if (existingCodes.has(dpc.code)) continue
      await db.territory.create({
        data: {
          code: dpc.code,
          name: dpc.name,
          level: 'REGENCY',
          category: 'DOMESTIC',
          parentId: dpdId,
          isActive: true,
          metadata: JSON.stringify({
            isCity: dpc.isCity,
            provinceCode: dpd.code,
            source: 'AUTO_GENERATE_DPD',
          }),
        },
      })
      created++
    }

    return NextResponse.json({
      success: true,
      data: { existing: existingDpc.length, created },
      message: `Berhasil auto-generate ${created} DPC untuk DPD "${dpd.name}". Total: ${existingDpc.length + created} DPC.`,
    })
  } catch (e: any) {
    console.error('[Auto-Generate DPC Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
