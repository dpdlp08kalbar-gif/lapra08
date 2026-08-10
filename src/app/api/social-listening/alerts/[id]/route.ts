// LAPRA 08 - API: Alert [id] - Update status & Create AI Recommendation
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// PUT - Update alert status (acknowledge/resolve)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const body = await request.json()
    const updated = await db.alertNotification.update({
      where: { id },
      data: { status: body.status || undefined },
      include: { recommendations: true },
    })
    return NextResponse.json({ success: true, data: updated, message: 'Alert diperbarui' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

// POST - Generate AI Recommendation for this alert
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  try {
    const alert = await db.alertNotification.findUnique({ where: { id } })
    if (!alert) return NextResponse.json({ success: false, error: 'Alert tidak ditemukan' }, { status: 404 })

    // Generate recommendation based on alert type & context
    // In production: use Ollama (Llama 3 / Mistral) local AI
    // For now: template-based recommendation generator
    
    let actionType = 'MONITOR'
    let priority = alert.severity === 'CRITICAL' ? 'URGENT' : alert.severity === 'HIGH' ? 'HIGH' : 'MEDIUM'
    let recommendation = ''

    const location = alert.regencyCode ? `Kab/Kota ${alert.regencyCode}` : alert.provinceCode ? `Provinsi ${alert.provinceCode}` : 'Nasional'
    const negPct = alert.negativePercentage ? `${alert.negativePercentage.toFixed(1)}%` : 'signifikan'

    if (alert.type === 'SENTIMENT_SPIKE') {
      actionType = 'FIELD_VISIT'
      recommendation = `Terjadi lonjakan sentimen negatif sebesar ${negPct} di ${location} (${alert.mentionCount} mention dalam 2 jam terakhir). Saran Tindakan: Tim Laskar Prabowo ${location} disarankan segera turun ke lapangan untuk verifikasi isu, melakukan advokasi langsung ke masyarakat, dan melaporkan data temuan ke DPD/DPN dalam 1x24 jam.`
    } else if (alert.type === 'VOLUME_SPIKE') {
      actionType = 'COORDINATE'
      recommendation = `Volume pembicaraan meningkat tajam di ${location} (${alert.mentionCount} mention). Saran Tindakan: Koordinasikan dengan tim komunikasi DPD/DPC untuk memantau perkembangan isu dan siapkan statement klarifikasi jika diperlukan.`
    } else if (alert.type === 'KEYWORD_MATCH') {
      actionType = 'CLARIFICATION'
      recommendation = `Terdeteksi keyword sensitif di ${location}. Saran Tindakan: Segera verifikasi informasi dengan sumber terpercaya, siapkan klarifikasi resmi, dan koordinasikan dengan tim media untuk publikasi.`
    } else {
      recommendation = `Peringatan dini di ${location}. Saran Tindakan: Monitor perkembangan isu dan laporkan jika eskalasi meningkat.`
    }

    const aiRec = await db.aIRecommendation.create({
      data: {
        alertId: id,
        context: `${alert.title}: ${alert.message}`,
        scope: alert.regencyCode ? 'REGENCY' : alert.provinceCode ? 'PROVINCE' : 'NATIONAL',
        provinceCode: alert.provinceCode,
        regencyCode: alert.regencyCode,
        recommendation,
        actionType,
        priority,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      data: aiRec,
      message: 'Rekomendasi AI dihasilkan (mode template - produksi: Ollama Llama 3 lokal)',
    })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
