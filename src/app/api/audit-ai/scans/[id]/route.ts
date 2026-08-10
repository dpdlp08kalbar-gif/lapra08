// LAPRA 08 - API: Audit Scan [id] - Get detail complaints
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const priority = searchParams.get('priority')
  const responseStatus = searchParams.get('responseStatus')

  const where: any = { scanId: id }
  if (priority) where.priority = priority
  if (responseStatus) where.responseStatus = responseStatus

  const complaints = await db.auditComplaint.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { urgencyScore: 'desc' }],
  })

  // Group by wilayah for "Daftar Keluhan Terabaikan"
  const byWilayah: Record<string, any> = {}
  for (const c of complaints) {
    if (c.responseStatus === 'IGNORED') {
      const key = `${c.provinceName || 'Nasional'}|${c.regencyName || '-'}`
      if (!byWilayah[key]) {
        byWilayah[key] = {
          provinceName: c.provinceName || 'Nasional',
          regencyName: c.regencyName || '-',
          provinceCode: c.provinceCode,
          regencyCode: c.regencyCode,
          total: 0,
          high: 0,
          medium: 0,
          low: 0,
          complaints: [],
        }
      }
      byWilayah[key].total++
      if (c.priority === 'HIGH') byWilayah[key].high++
      else if (c.priority === 'MEDIUM') byWilayah[key].medium++
      else byWilayah[key].low++
      byWilayah[key].complaints.push({
        id: c.id,
        platform: c.platform,
        author: c.author,
        content: c.content.substring(0, 100) + '...',
        priority: c.priority,
        category: c.category,
        urgencyScore: c.urgencyScore,
      })
    }
  }

  const ignoredByWilayah = Object.values(byWilayah).sort((a: any, b: any) => b.high - a.high || b.total - a.total)

  return NextResponse.json({
    success: true,
    data: {
      complaints,
      stats: {
        total: complaints.length,
        high: complaints.filter(c => c.priority === 'HIGH').length,
        medium: complaints.filter(c => c.priority === 'MEDIUM').length,
        low: complaints.filter(c => c.priority === 'LOW').length,
        ignored: complaints.filter(c => c.responseStatus === 'IGNORED').length,
        responded: complaints.filter(c => c.responseStatus === 'RESPONDED').length,
      },
      ignoredByWilayah,
    },
  })
}
