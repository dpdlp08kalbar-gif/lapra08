// LAPRA 08 - API: Track KTA Application Status (PUBLIC - by application number or phone)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/kta-applications/track?q=APP-LAPRA08-XXXX or phone
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (!q || q.length < 4) {
    return NextResponse.json({ success: false, error: 'Masukkan nomor pendaftaran atau nomor WhatsApp' }, { status: 400 })
  }

  // Search by applicationNumber OR phone OR nik OR ktaNumber
  const application = await db.ktaApplication.findFirst({
    where: {
      OR: [
        { applicationNumber: { contains: q.toUpperCase() } },
        { phone: { contains: q } },
        { nik: { contains: q } },
        { ktaNumber: { contains: q.toUpperCase() } },
      ]
    },
    include: { territory: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!application) {
    return NextResponse.json({ success: false, error: 'Permohonan tidak ditemukan. Periksa kembali nomor pendaftaran atau WA Anda.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: application })
}
