// LAPRA 08 - API: KTA Card Data
// GET /api/kta-card/[id] — generate KTA card data (untuk KtaApplication ATAU Member)
//
// [id] bisa:
//   - KtaApplication ID (cuid) → ambil data dari permohonan KTA yang sudah APPROVED/ISSUED
//   - Member ID (cuid) → ambil data dari tabel Member langsung
//
// Response: {
//   ktaNumber, fullName, photoUrl, level, territoryName, positionName,
//   validFrom, validUntil, validUntilString, qrCodeDataUrl, jabatan
// }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, generateKTANumber, getKTAValidityPeriod, generateQRCodeDataURL, buildKTAQRData } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Cek apakah id adalah KtaApplication atau Member
    let ktaApp = await db.ktaApplication.findUnique({
      where: { id },
      include: { territory: { include: { parent: true } } },
    })

    let member: any = null
    if (!ktaApp) {
      member = await db.member.findUnique({
        where: { id },
        include: { territory: { include: { parent: true } } },
      })
    }

    if (!ktaApp && !member) {
      return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 })
    }

    // Ambil data dari salah satu sumber
    let fullName: string
    let photoUrl: string | null
    let territoryId: string
    let territoryName: string
    let territoryLevel: string
    let level: string // DPN/DPD/DPC
    let positionName: string | null = null
    let ktaNumber: string | null = null
    let existingValidUntil: Date | null = null

    if (ktaApp) {
      // Dari KtaApplication
      if (ktaApp.status !== 'APPROVED' && ktaApp.status !== 'ISSUED') {
        return NextResponse.json(
          { success: false, error: `KTA belum issued. Status: ${ktaApp.status}` },
          { status: 400 }
        )
      }
      fullName = ktaApp.fullName
      photoUrl = ktaApp.photoUrl
      territoryId = ktaApp.territoryId
      territoryName = ktaApp.territory?.name || '-'
      territoryLevel = ktaApp.territory?.level || 'REGENCY'

      // Tentukan level DPN/DPD/DPC berdasarkan territory level
      if (territoryLevel === 'COUNTRY') level = 'DPN'
      else if (territoryLevel === 'PROVINCE') level = 'DPD'
      else level = 'DPC'

      // Jabatan dari occupation field (kalau ada)
      positionName = ktaApp.occupation || 'Anggota'

      ktaNumber = ktaApp.ktaNumber
      existingValidUntil = ktaApp.ktaExpiryDate
    } else if (member) {
      // Dari Member
      fullName = member.fullName
      photoUrl = member.photoUrl
      territoryId = member.territoryId
      territoryName = member.territory?.name || '-'
      territoryLevel = member.territory?.level || 'REGENCY'

      if (territoryLevel === 'COUNTRY') level = 'DPN'
      else if (territoryLevel === 'PROVINCE') level = 'DPD'
      else level = 'DPC'

      positionName = 'Anggota'
      ktaNumber = member.memberNumber // fallback ke memberNumber kalau belum ada KTA number
      existingValidUntil = null
    } else {
      return NextResponse.json({ success: false, error: 'Data tidak valid' }, { status: 400 })
    }

    // Generate nomor KTA kalau belum ada
    if (!ktaNumber) {
      try {
        ktaNumber = await generateKTANumber(territoryId)
      } catch (e: any) {
        console.error('[KTA Card] generateKTANumber failed:', e.message)
        ktaNumber = `08${level} 0000 P0001` // fallback
      }
    }

    // Masa berlaku: 1 Januari - 31 Desember tahun berjalan
    // Kalau sudah ada existingValidUntil dan masih tahun ini, pakai itu
    const currentYear = new Date().getFullYear()
    let validUntil: Date
    let validFromString: string
    let validUntilString: string

    if (existingValidUntil && existingValidUntil.getFullYear() === currentYear) {
      validUntil = existingValidUntil
      const validity = getKTAValidityPeriod()
      validFromString = validity.startString
      validUntilString = validity.endString
    } else {
      const validity = getKTAValidityPeriod()
      validUntil = validity.end
      validFromString = validity.startString
      validUntilString = validity.endString
    }

    // Generate QR code
    const qrData = buildKTAQRData({
      ktaNumber,
      fullName,
      territoryName,
      level,
      validUntil: validUntilString,
    })
    const qrCodeDataUrl = await generateQRCodeDataURL(qrData)

    return NextResponse.json({
      success: true,
      data: {
        ktaNumber,
        fullName,
        photoUrl,
        level,
        territoryName,
        positionName: positionName || 'Anggota',
        validFromString,
        validUntilString,
        validFrom: new Date(currentYear, 0, 1).toISOString(),
        validUntil: validUntil.toISOString(),
        qrCodeDataUrl,
        qrData,
      },
    })
  } catch (e: any) {
    console.error('[KTA Card GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal generate KTA card: ${e.message}` },
      { status: 500 }
    )
  }
}
