// LAPRA 08 - API: Audit Logs Viewer (UU PDP No. 27/2022 Pasal 17)
// GET /api/audit-logs?actorId=&action=&resource=&from=&to=&page=&pageSize=
//
// RBAC: Hanya DPO + SUPERADMIN + ADMIN_DPN yang bisa lihat
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, canViewAuditLog, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (!await canViewAuditLog(user)) {
      // Log denied access
      await logAccess({
        actor: user, action: 'DENIED', resource: 'MEMBER',
        request, status: 'DENIED',
        detail: 'Attempted to view audit logs without DPO privilege',
      })
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya DPO/SuperAdmin/Admin DPN yang boleh lihat audit log.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const actorId = searchParams.get('actorId')
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(200, Math.max(10, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE))))

    const where: any = {}
    if (actorId) where.actorId = actorId
    if (action) where.action = action
    if (resource) where.resource = resource
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(to)
    }
    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: 'insensitive' } },
        { resourceLabel: { contains: search, mode: 'insensitive' } },
        { detail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, actorId: true, actorRole: true, actorName: true, actorTerritory: true,
          action: true, resource: true, resourceId: true, resourceLabel: true,
          ipAddress: true, status: true, detail: true, createdAt: true,
        },
      }),
      db.auditLog.count({ where }),
    ])

    // Summary stats untuk header dashboard
    const stats = await db.auditLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _count: { action: true },
    })

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page, pageSize, total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      summary: {
        last30days: stats.reduce((acc: Record<string, number>, s: any) => {
          acc[s.action] = s._count.action
          return acc
        }, {}),
      },
    })
  } catch (e: any) {
    console.error('[AuditLogs GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat audit log: ${e.message}` },
      { status: 500 }
    )
  }
}
