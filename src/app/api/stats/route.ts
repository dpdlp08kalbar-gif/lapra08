// LAPRA 08 - API: Stats untuk Dashboard
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

// GET /api/stats - Statistik untuk dashboard
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const scope = await getAccessibleTerritoryIds(user)

  // Build where clause
  const memberWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }

  // Hitung total member by status
  const [totalMembers, pendingCount, verifiedCount, activeCount, rejectedCount] = await Promise.all([
    db.member.count({ where: memberWhere }),
    db.member.count({ where: { ...memberWhere, status: 'PENDING' } }),
    db.member.count({ where: { ...memberWhere, status: 'VERIFIED' } }),
    db.member.count({ where: { ...memberWhere, status: 'ACTIVE' } }),
    db.member.count({ where: { ...memberWhere, status: 'REJECTED' } }),
  ])

  // Statistik per territory (untuk chart)
  let perTerritory: any[] = []
  if (scope.isGlobal) {
    // Global: ambil semua regency yang aktif
    const territories = await db.territory.findMany({
      where: { level: 'REGENCY', isActive: true },
      include: { parent: true, _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    })
    perTerritory = territories.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      provinceCode: t.parent?.code,
      provinceName: t.parent?.name,
      category: t.category,
      memberCount: t._count.members,
    }))
  } else if (user.role === 'ADMIN_DPD') {
    // DPD: ambil semua DPC di provinsi itu
    const territories = await db.territory.findMany({
      where: { parentId: user.territoryId, level: 'REGENCY' },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    })
    perTerritory = territories.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      memberCount: t._count.members,
    }))
  } else {
    // DPC: hanya dirinya sendiri
    const t = await db.territory.findUnique({
      where: { id: user.territoryId },
      include: { _count: { select: { members: true } } },
    })
    if (t) {
      perTerritory = [{
        id: t.id,
        code: t.code,
        name: t.name,
        memberCount: t._count.members,
      }]
    }
  }

  // Statistik global (untuk DPN)
  const globalStats = {
    totalDomestic: await db.member.count({
      where: { territory: { category: 'DOMESTIC' } },
    }),
    totalInternational: await db.member.count({
      where: { territory: { category: 'INTERNATIONAL' } },
    }),
    totalCountries: await db.territory.count({
      where: { level: 'COUNTRY', isActive: true },
    }),
    totalProvinces: await db.territory.count({
      where: { level: 'PROVINCE', isActive: true },
    }),
    totalRegencies: await db.territory.count({
      where: { level: 'REGENCY', isActive: true },
    }),
  }

  // Statistik keuangan
  const financeWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
  const [totalIncome, totalExpense] = await Promise.all([
    db.financeTransaction.aggregate({
      where: { ...financeWhere, type: 'INCOME' },
      _sum: { amount: true },
    }),
    db.financeTransaction.aggregate({
      where: { ...financeWhere, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
  ])

  // Statistik event
  const eventWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
  const [upcomingEvents, totalEvents] = await Promise.all([
    db.event.count({
      where: { ...eventWhere, status: 'SCHEDULED', startDate: { gte: new Date() } },
    }),
    db.event.count({ where: eventWhere }),
  ])

  // Statistik asset
  const assetWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
  const totalAssets = await db.asset.count({ where: assetWhere })

  // Statistik pengurus
  const orgWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
  const totalOrgPositions = await db.orgPosition.count({ where: { ...orgWhere, isActive: true } })

  // Statistik user
  const userWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
  const totalUsers = await db.user.count({ where: { ...userWhere, isActive: true } })

  // Statistik anggota per level (DPN/DPD/DPC)
  const [dpnMembers, dpdMembers, dpcMembers] = await Promise.all([
    db.member.count({
      where: { ...memberWhere, territory: { level: 'COUNTRY' } },
    }),
    db.member.count({
      where: { ...memberWhere, territory: { level: 'PROVINCE' } },
    }),
    db.member.count({
      where: { ...memberWhere, territory: { level: 'REGENCY' } },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      members: {
        total: totalMembers,
        pending: pendingCount,
        verified: verifiedCount,
        active: activeCount,
        rejected: rejectedCount,
        byLevel: {
          dpn: dpnMembers,
          dpd: dpdMembers,
          dpc: dpcMembers,
        },
      },
      perTerritory,
      global: globalStats,
      finance: {
        totalIncome: totalIncome._sum.amount || 0,
        totalExpense: totalExpense._sum.amount || 0,
        balance: (totalIncome._sum.amount || 0) - (totalExpense._sum.amount || 0),
      },
      events: {
        upcoming: upcomingEvents,
        total: totalEvents,
      },
      assets: { total: totalAssets },
      organization: { totalPositions: totalOrgPositions },
      users: { total: totalUsers },
      scope: {
        isGlobal: scope.isGlobal,
        role: user.role,
        territoryName: user.territory.name,
        territoryCode: user.territory.code,
      },
    },
  })
}
