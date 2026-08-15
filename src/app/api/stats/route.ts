// LAPRA 08 - API: Stats untuk Dashboard
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

// Pastikan route berjalan di Node.js runtime (bukan Edge), selalu dynamic
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/stats - Statistik untuk dashboard
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Defensive: jika getAccessibleTerritoryIds gagal (mis. territory korup), fallback ke scope sendiri
    let scope
    try {
      scope = await getAccessibleTerritoryIds(user)
    } catch (scopeErr: any) {
      console.error('[Stats] getAccessibleTerritoryIds failed:', scopeErr.message)
      if (!user.territoryId) {
        // User tanpa territory → return data kosong agar dashboard tetap render
        return NextResponse.json({
          success: true,
          data: {
            members: { total: 0, pending: 0, verified: 0, active: 0, rejected: 0, byLevel: { dpn: 0, dpd: 0, dpc: 0 } },
            perTerritory: [],
            global: { totalDomestic: 0, totalInternational: 0, totalCountries: 0, totalProvinces: 0, totalRegencies: 0, totalDpdLn: 0, totalTerritoriesDomestic: 0 },
            finance: { totalIncome: 0, totalExpense: 0, balance: 0 },
            events: { upcoming: 0, total: 0 },
            assets: { total: 0 },
            organization: { totalPositions: 0 },
            users: { total: 0 },
            scope: { isGlobal: false, role: user.role, territoryName: user.territory?.name || '-', territoryCode: user.territory?.code || '-' },
          },
        })
      }
      scope = {
        isGlobal: false,
        territoryIds: [user.territoryId],
        primaryTerritoryId: user.territoryId,
      }
    }

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
    try {
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
    } catch (terrErr: any) {
      console.error('[Stats] perTerritory query failed:', terrErr.message)
      // Lanjutkan dengan perTerritory kosong, bukan crash seluruh route
    }

    // Statistik global (untuk DPN) — defensive, kalau gagal fallback ke 0
    let globalStats = {
      totalDomestic: 0,
      totalInternational: 0,
      totalCountries: 0,
      totalProvinces: 0,
      totalRegencies: 0,
      totalDpdLn: 0,
      totalTerritoriesDomestic: 0,
    }
    try {
      const [
        totalDomestic, totalInternational, totalCountries, totalProvinces,
        totalRegencies, totalDpdLn, totalTerritoriesDomestic,
      ] = await Promise.all([
        db.member.count({ where: { territory: { category: 'DOMESTIC' } } }),
        db.member.count({ where: { territory: { category: 'INTERNATIONAL' } } }),
        db.territory.count({ where: { level: 'COUNTRY', isActive: true, category: 'DOMESTIC' } }),
        db.territory.count({ where: { level: 'PROVINCE', isActive: true, category: 'DOMESTIC' } }),
        db.territory.count({ where: { level: 'REGENCY', isActive: true } }),
        db.territory.count({ where: { level: 'PROVINCE', isActive: true, category: 'INTERNATIONAL' } }),
        db.territory.count({ where: { category: 'DOMESTIC', isActive: true } }),
      ])
      globalStats = {
        totalDomestic, totalInternational, totalCountries, totalProvinces,
        totalRegencies, totalDpdLn, totalTerritoriesDomestic,
      }
    } catch (globalErr: any) {
      console.error('[Stats] globalStats query failed:', globalErr.message)
    }

    // Statistik keuangan — defensive
    let financeStats = { totalIncome: 0, totalExpense: 0, balance: 0 }
    try {
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
      const income = totalIncome._sum.amount || 0
      const expense = totalExpense._sum.amount || 0
      financeStats = { totalIncome: income, totalExpense: expense, balance: income - expense }
    } catch (finErr: any) {
      console.error('[Stats] finance query failed:', finErr.message)
    }

    // Statistik event — defensive
    let eventStats = { upcoming: 0, total: 0 }
    try {
      const eventWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
      const [upcomingEvents, totalEvents] = await Promise.all([
        db.event.count({
          where: { ...eventWhere, status: 'SCHEDULED', startDate: { gte: new Date() } },
        }),
        db.event.count({ where: eventWhere }),
      ])
      eventStats = { upcoming: upcomingEvents, total: totalEvents }
    } catch (evErr: any) {
      console.error('[Stats] events query failed:', evErr.message)
    }

    // Statistik asset — defensive
    let totalAssets = 0
    try {
      const assetWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
      totalAssets = await db.asset.count({ where: assetWhere })
    } catch (aErr: any) {
      console.error('[Stats] assets query failed:', aErr.message)
    }

    // Statistik pengurus — defensive
    let totalOrgPositions = 0
    try {
      const orgWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
      totalOrgPositions = await db.orgPosition.count({ where: { ...orgWhere, isActive: true } })
    } catch (oErr: any) {
      console.error('[Stats] orgPositions query failed:', oErr.message)
    }

    // Statistik user — defensive
    let totalUsers = 0
    try {
      const userWhere = scope.isGlobal ? {} : { territoryId: { in: scope.territoryIds } }
      totalUsers = await db.user.count({ where: { ...userWhere, isActive: true } })
    } catch (uErr: any) {
      console.error('[Stats] users query failed:', uErr.message)
    }

    // Statistik anggota per level (DPN/DPD/DPC) - 3 level — defensive
    let byLevel = { dpn: 0, dpd: 0, dpc: 0 }
    try {
      const [dpnMembers, dpdMembers, dpcMembers] = await Promise.all([
        db.member.count({ where: { ...memberWhere, territory: { level: 'COUNTRY' } } }),
        db.member.count({ where: { ...memberWhere, territory: { level: 'PROVINCE' } } }),
        db.member.count({ where: { ...memberWhere, territory: { level: 'REGENCY' } } }),
      ])
      byLevel = { dpn: dpnMembers, dpd: dpdMembers, dpc: dpcMembers }
    } catch (lvlErr: any) {
      console.error('[Stats] byLevel query failed:', lvlErr.message)
    }

    return NextResponse.json({
      success: true,
      data: {
        members: {
          total: totalMembers,
          pending: pendingCount,
          verified: verifiedCount,
          active: activeCount,
          rejected: rejectedCount,
          byLevel,
        },
        perTerritory,
        global: globalStats,
        finance: financeStats,
        events: eventStats,
        assets: { total: totalAssets },
        organization: { totalPositions: totalOrgPositions },
        users: { total: totalUsers },
        scope: {
          isGlobal: scope.isGlobal,
          role: user.role,
          territoryName: user.territory?.name || '-',
          territoryCode: user.territory?.code || '-',
        },
      },
    })
  } catch (e: any) {
    console.error('[Stats GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat statistik: ${e.message}` },
      { status: 500 }
    )
  }
}
