// LAPRA 08 - API: Social Listening Sources (Data Ingestion - Rp0)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - List sources with RBAC
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const territory = await db.territory.findUnique({ where: { id: user.territoryId } })
  const where: any = { isActive: true }
  
  // RBAC: DPN=global, DPD=province, DPC=regency
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    if (territory?.level === 'PROVINCE') {
      where.OR = [{ scope: 'NATIONAL' }, { scope: 'PROVINCE', provinceCode: territory.code }]
    } else if (territory?.level === 'REGENCY') {
      where.OR = [{ scope: 'NATIONAL' }, { scope: 'PROVINCE', provinceCode: territory.parentId }, { scope: 'REGENCY', regencyCode: territory.code }]
    }
  }

  const sources = await db.socialSource.findMany({ where, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ success: true, data: sources })
}

// POST - Create source (SUPERADMIN/DPN only)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN') {
    return NextResponse.json({ success: false, error: 'Hanya Super Admin / DPN yang dapat membuat sumber data' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { platform, name, url, keywords, scope, provinceCode, regencyCode } = body
    if (!platform || !name) return NextResponse.json({ success: false, error: 'Platform dan nama wajib' }, { status: 400 })

    const source = await db.socialSource.create({
      data: {
        platform, name, url: url || null,
        keywords: JSON.stringify(keywords || []),
        scope: scope || 'NATIONAL',
        provinceCode: provinceCode || null,
        regencyCode: regencyCode || null,
      },
    })
    return NextResponse.json({ success: true, data: source, message: 'Sumber data ditambahkan' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
