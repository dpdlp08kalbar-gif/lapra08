// LAPRA 08 - Server-side helpers (API routes)

import { db } from './db'
import type { Role, TerritoryLevel } from './types'

// Ambil user dari header X-User-Id yang dikirim client
// (Development mode: tidak ada JWT/session, cukup client-side state)
export async function getUserFromRequest(request: Request) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return null
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { territory: true },
  })
  if (!user || !user.isActive) return null
  return user
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getUserFromRequest>>>

// ============================================================
// HAK AKSES - 6 TINGKAT (Hierarki Baru)
// ============================================================
// SUPERADMIN        : Akses penuh teknis (debug, security, user mgmt)
// ADMIN_DPN         : EDIT DPN pusat + LIHAT SEMUA (Koorwil/DPD/Koor DPD/DPC)
// ADMIN_KOORWIL     : EDIT Koorwil sendiri + LIHAT DPN & SEMUA DPD/DPC di wilayahnya
// ADMIN_DPD          : EDIT DPD sendiri + Koor DPD + DPC di bawahnya + LIHAT DPN & Koorwil
// ADMIN_KOOR_DPD    : EDIT Koor DPD sendiri + LIHAT DPN, Koorwil, DPD, DPC di bawahnya
// ADMIN_DPC         : Hanya DPC sendiri (terisolasi)
// ============================================================

// Cek apakah user adalah admin DPN level (SUPERADMIN atau ADMIN_DPN)
export function isDPNLevel(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'ADMIN_DPN'
}

// Helper rekursif: dapatkan semua descendant territoryId dari sebuah territory
async function getAllDescendants(territoryId: string): Promise<string[]> {
  const result: string[] = []
  const queue = [territoryId]
  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = await db.territory.findMany({
      where: { parentId: currentId },
      select: { id: true },
    })
    for (const child of children) {
      if (!result.includes(child.id)) {
        result.push(child.id)
        queue.push(child.id)
      }
    }
  }
  return result
}

// Helper: dapatkan semua ancestor territoryId dari sebuah territory (untuk view DPN/Koorwil)
async function getAllAncestors(territoryId: string): Promise<string[]> {
  const result: string[] = []
  let current = await db.territory.findUnique({
    where: { id: territoryId },
    select: { id: true, parentId: true },
  })
  while (current?.parentId) {
    if (!result.includes(current.parentId)) {
      result.push(current.parentId)
    }
    current = await db.territory.findUnique({
      where: { id: current.parentId },
      select: { id: true, parentId: true },
    })
  }
  return result
}

// Dapatkan daftar territoryId yang bisa DILIHAT (view) user
export async function getViewableTerritoryIds(user: AuthUser): Promise<{
  isGlobalView: boolean
  territoryIds: string[]
  primaryTerritoryId: string
}> {
  // SUPERADMIN & ADMIN_DPN: lihat SEMUA wilayah global
  if (isDPNLevel(user.role)) {
    return { isGlobalView: true, territoryIds: [], primaryTerritoryId: user.territoryId }
  }

  // ADMIN_KOORWIL: lihat DPN (parent) + Koorwil sendiri + SEMUA descendant (DPD, Koor DPD, DPC)
  if (user.role === 'ADMIN_KOORWIL') {
    const ancestors = await getAllAncestors(user.territoryId)
    const descendants = await getAllDescendants(user.territoryId)
    return {
      isGlobalView: false,
      territoryIds: [user.territoryId, ...ancestors, ...descendants],
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_DPD: lihat DPN + Koorwil (ancestors) + DPD sendiri + SEMUA descendant (Koor DPD, DPC)
  if (user.role === 'ADMIN_DPD') {
    const ancestors = await getAllAncestors(user.territoryId)
    const descendants = await getAllDescendants(user.territoryId)
    return {
      isGlobalView: false,
      territoryIds: [user.territoryId, ...ancestors, ...descendants],
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_KOOR_DPD: lihat DPN + Koorwil + DPD (ancestors) + Koor DPD sendiri + SEMUA DPC di bawahnya
  if (user.role === 'ADMIN_KOOR_DPD') {
    const ancestors = await getAllAncestors(user.territoryId)
    const descendants = await getAllDescendants(user.territoryId)
    return {
      isGlobalView: false,
      territoryIds: [user.territoryId, ...ancestors, ...descendants],
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_DPC: lihat semua ancestor (DPN, Koorwil, DPD, Koor DPD) + DPC sendiri
  if (user.role === 'ADMIN_DPC') {
    const ancestors = await getAllAncestors(user.territoryId)
    return {
      isGlobalView: false,
      territoryIds: [user.territoryId, ...ancestors],
      primaryTerritoryId: user.territoryId,
    }
  }

  // Default
  return {
    isGlobalView: false,
    territoryIds: [user.territoryId],
    primaryTerritoryId: user.territoryId,
  }
}

// Dapatkan daftar territoryId yang bisa DIEDIT user
export async function getEditableTerritoryIds(user: AuthUser): Promise<{
  isGlobalEdit: boolean
  territoryIds: string[]
  primaryTerritoryId: string
}> {
  // SUPERADMIN & ADMIN_DPN: edit SEMUA wilayah (untuk manajemen struktur wilayah)
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN') {
    return { isGlobalEdit: true, territoryIds: [], primaryTerritoryId: user.territoryId }
  }

  // ADMIN_KOORWIL: edit HANYA territory Koorwil sendiri (COORDINATOR)
  if (user.role === 'ADMIN_KOORWIL') {
    return {
      isGlobalEdit: false,
      territoryIds: [user.territoryId],
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_DPD: edit DPD sendiri + SEMUA DPC di bawahnya (termasuk via Koor DPD)
  if (user.role === 'ADMIN_DPD') {
    const descendants = await getAllDescendants(user.territoryId)
    return {
      isGlobalEdit: false,
      territoryIds: [user.territoryId, ...descendants],
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_KOOR_DPD: edit Koor DPD sendiri + SEMUA DPC di bawahnya
  if (user.role === 'ADMIN_KOOR_DPD') {
    const descendants = await getAllDescendants(user.territoryId)
    return {
      isGlobalEdit: false,
      territoryIds: [user.territoryId, ...descendants],
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_DPC: hanya wilayah sendiri
  return {
    isGlobalEdit: false,
    territoryIds: [user.territoryId],
    primaryTerritoryId: user.territoryId,
  }
}

// Cek apakah user bisa EDIT territory tertentu
export async function canEditTerritory(user: AuthUser, territoryId: string): Promise<boolean> {
  const editScope = await getEditableTerritoryIds(user)
  if (editScope.isGlobalEdit) return true
  return editScope.territoryIds.includes(territoryId)
}

// Cek apakah user bisa LIHAT territory tertentu
export async function canViewTerritory(user: AuthUser, territoryId: string): Promise<boolean> {
  const viewScope = await getViewableTerritoryIds(user)
  if (viewScope.isGlobalView) return true
  return viewScope.territoryIds.includes(territoryId)
}

// Backward compatibility - gunakan viewable untuk query
export async function getAccessibleTerritoryIds(user: AuthUser) {
  return getViewableTerritoryIds(user)
}

// Build where clause untuk query (VIEW) dengan isolasi territory
export async function buildTerritoryWhere(user: AuthUser) {
  const scope = await getViewableTerritoryIds(user)
  if (scope.isGlobalView) return {}
  return { territoryId: { in: scope.territoryIds } }
}

// ============================================================
// KTA GENERATOR - Format per Tingkat Admin
// ============================================================
// Format umum: LAPRA08.[KODE_NEGARA].[KODE_PROVINSI].[KODE_KAB_KOTA].[TAHUN].[NOMOR_URUT]
//
// DPN (Pusat Nasional, level COUNTRY):
//   LAPRA08.ID.00.00.26.00001  (kode provinsi=00, kab/kota=00)
//
// KOORWIL (Koordinator Wilayah, level COORDINATOR):
//   LAPRA08.ID.KW1.00.26.00001 (kode kab/kota=00, provinsi diganti kode koorwil)
//
// DPD (Provinsi, level PROVINCE):
//   LAPRA08.ID.61.00.26.00001  (kode kab/kota=00)
//
// KOOR_DPD (Koordinator DPD, level COORD_DPD):
//   LAPRA08.ID.61.KR1.26.00001 (kab/kota diganti kode koor_dpd)
//
// DPC (Kabupaten/Kota, level REGENCY):
//   LAPRA08.ID.61.6171.26.00001 (format lengkap, kode 4 digit)
//
// Internasional:
//   LAPRA08.US.00.LAX.26.00001
// ============================================================
export async function generateMemberNumber(territoryId: string): Promise<string> {
  const territory = await db.territory.findUnique({
    where: { id: territoryId },
    include: { parent: { include: { parent: { include: { parent: true } } } } },
  })
  if (!territory) throw new Error('Territory not found')

  // Kode default
  let countryCode = 'XX'
  let provinceCode = '00'
  let regencyCode = '00'

  // ===== DPN (COUNTRY level) =====
  // Format: LAPRA08.[COUNTRY].00.00.[YEAR].[SEQ]
  if (territory.level === 'COUNTRY') {
    countryCode = territory.code
    provinceCode = '00'
    regencyCode = '00'
  }
  // ===== KOORWIL (COORDINATOR level) =====
  // Format: LAPRA08.[COUNTRY].[KW1].00.[YEAR].[SEQ]
  else if (territory.level === 'COORDINATOR') {
    regencyCode = '00'
    if (territory.parent) {
      countryCode = territory.parent.code
      provinceCode = territory.code // pakai code koorwil (KW1, KW2, dll)
    }
  }
  // ===== DPD (PROVINCE level) =====
  // Format: LAPRA08.[COUNTRY].[PROVINCE].00.[YEAR].[SEQ]
  else if (territory.level === 'PROVINCE') {
    provinceCode = territory.code
    regencyCode = '00'
    if (territory.parent) {
      // Parent bisa COUNTRY (untuk luar negeri) atau COORDINATOR (untuk domestik)
      if (territory.parent.level === 'COORDINATOR') {
        // Lewati COORDINATOR, ambil COUNTRY dari grandparent
        countryCode = territory.parent.parent?.code || 'XX'
      } else {
        countryCode = territory.parent.code
      }
    }
  }
  // ===== KOOR_DPD (COORD_DPD level) =====
  // Format: LAPRA08.[COUNTRY].[PROVINCE].[KR1].[YEAR].[SEQ]
  else if (territory.level === 'COORD_DPD') {
    regencyCode = territory.code // pakai code koor_dpd (KR1, KR2, dll)
    if (territory.parent) {
      // Parent = PROVINCE
      provinceCode = territory.parent.code
      if (territory.parent.parent) {
        // Grandparent = COORDINATOR atau COUNTRY
        if (territory.parent.parent.level === 'COORDINATOR') {
          countryCode = territory.parent.parent.parent?.code || 'XX'
        } else {
          countryCode = territory.parent.parent.code
        }
      }
    }
  }
  // ===== DPC (REGENCY level) =====
  // Format: LAPRA08.[COUNTRY].[PROVINCE].[REGENCY].[YEAR].[SEQ]
  else if (territory.level === 'REGENCY' && territory.parent) {
    regencyCode = territory.code
    const parent = territory.parent
    if (parent.level === 'COORD_DPD') {
      // Parent = COORD_DPD, grandparent = PROVINCE, great-grandparent = COORDINATOR/COUNTRY
      provinceCode = parent.parent?.code || '00'
      const grandparent = parent.parent
      if (grandparent?.parent) {
        if (grandparent.parent.level === 'COORDINATOR') {
          countryCode = grandparent.parent.parent?.code || 'XX'
        } else {
          countryCode = grandparent.parent.code
        }
      }
    } else if (parent.level === 'PROVINCE') {
      // Parent = PROVINCE (untuk DPC luar negeri)
      provinceCode = parent.code
      if (parent.parent) {
        if (parent.parent.level === 'COORDINATOR') {
          countryCode = parent.parent.parent?.code || 'XX'
        } else {
          countryCode = parent.parent.code
        }
      }
    } else if (parent.level === 'COUNTRY') {
      // Internasional: DPC langsung di bawah COUNTRY
      countryCode = parent.code
      provinceCode = '00'
    }
  }
  // Level lain (DISTRICT/VILLAGE) - fallback ke parent
  else if (territory.parent) {
    return generateMemberNumber(territory.parent.id)
  }

  // Tahun daftar (2 digit terakhir)
  const yearCode = String(new Date().getFullYear()).slice(-2)

  // Hitung nomor urut
  const prefix = `LAPRA08.${countryCode}.${provinceCode}.${regencyCode}.${yearCode}.`
  const existing = await db.member.findMany({
    where: { memberNumber: { startsWith: prefix } },
    select: { memberNumber: true },
  })

  let maxSeq = 0
  for (const m of existing) {
    const seqStr = m.memberNumber.slice(prefix.length)
    const seq = parseInt(seqStr, 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }

  const nextSeq = String(maxSeq + 1).padStart(5, '0')
  return `${prefix}${nextSeq}`
}

// Format currency IDR
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date Indonesia
export function formatDateID(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatDateTimeID(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
