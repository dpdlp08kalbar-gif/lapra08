// LAPRA 08 - Server-side helpers (API routes)
// Hierarki: DPN (Pusat) → DPD (Provinsi) → DPC (Kabupaten/Kota)

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
// HAK AKSES - 4 TINGKAT (Hierarki 3 Level: DPN → DPD → DPC)
// ============================================================
// SUPERADMIN : Akses penuh teknis (debug, security, user mgmt)
// ADMIN_DPN  : EDIT DPN pusat + LIHAT SEMUA DPD/DPC se-Indonesia & LN
//              - DPN membawahi semua DPD seluruh Indonesia dan luar negeri
// ADMIN_DPD  : EDIT DPD sendiri (provinsi) + SEMUA DPC di bawahnya
//              - Setiap DPD membawahi DPC-DPC di provinsi tersebut
// ADMIN_DPC  : Hanya DPC sendiri (terisolasi)
// ============================================================

// Cek apakah user adalah admin DPN level (SUPERADMIN atau ADMIN_DPN)
export function isDPNLevel(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'ADMIN_DPN'
}

// Helper rekursif: dapatkan semua descendant territoryId dari sebuah territory
// Untuk DPD (provinsi), ini akan return semua DPC di provinsi tersebut
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

// Helper: dapatkan semua ancestor territoryId dari sebuah territory
// Untuk DPC, ini akan return [DPD, DPN] agar DPC bisa lihat data DPD & DPN (read-only)
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
  // SUPERADMIN & ADMIN_DPN: lihat SEMUA wilayah global (Indonesia + LN)
  if (isDPNLevel(user.role)) {
    return { isGlobalView: true, territoryIds: [], primaryTerritoryId: user.territoryId }
  }

  // ADMIN_DPD: lihat DPN pusat (ancestor) + DPD sendiri + SEMUA DPC di provinsinya
  if (user.role === 'ADMIN_DPD') {
    const ancestors = await getAllAncestors(user.territoryId)
    const descendants = await getAllDescendants(user.territoryId)
    return {
      isGlobalView: false,
      territoryIds: [user.territoryId, ...ancestors, ...descendants],
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_DPC: lihat semua ancestor (DPD + DPN) + DPC sendiri
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
  // SUPERADMIN & ADMIN_DPN: edit SEMUA wilayah (untuk manajemen struktur)
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN') {
    return { isGlobalEdit: true, territoryIds: [], primaryTerritoryId: user.territoryId }
  }

  // ADMIN_DPD: edit DPD sendiri + SEMUA DPC di bawahnya
  if (user.role === 'ADMIN_DPD') {
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
// Return object dengan alias isGlobal = isGlobalView untuk kompatibilitas backward
export async function getAccessibleTerritoryIds(user: AuthUser) {
  const scope = await getViewableTerritoryIds(user)
  return {
    ...scope,
    isGlobal: scope.isGlobalView, // alias untuk backward compat
  }
}

// Build where clause untuk query (VIEW) dengan isolasi territory
export async function buildTerritoryWhere(user: AuthUser) {
  const scope = await getViewableTerritoryIds(user)
  if (scope.isGlobalView) return {}
  return { territoryId: { in: scope.territoryIds } }
}

// ============================================================
// KTA GENERATOR - Format per Tingkat (3 Level + Internasional)
// ============================================================
// Format umum: LAPRA08.[KODE_NEGARA].[KODE_PROVINSI].[KODE_KAB_KOTA].[TAHUN].[NOMOR_URUT]
//
// DPN (Pusat Nasional, level COUNTRY):
//   LAPRA08.ID.00.00.26.00001  (kode provinsi=00, kab/kota=00)
//
// DPD (Provinsi, level PROVINCE):
//   LAPRA08.ID.61.00.26.00001  (kode kab/kota=00)
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
    include: { parent: true },
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
  // ===== DPD (PROVINCE level) =====
  // Format: LAPRA08.[COUNTRY].[PROVINCE].00.[YEAR].[SEQ]
  else if (territory.level === 'PROVINCE') {
    provinceCode = territory.code
    regencyCode = '00'
    if (territory.parent) {
      countryCode = territory.parent.code
    }
  }
  // ===== DPC (REGENCY level) =====
  // Format: LAPRA08.[COUNTRY].[PROVINCE].[REGENCY].[YEAR].[SEQ]
  else if (territory.level === 'REGENCY' && territory.parent) {
    regencyCode = territory.code
    const parent = territory.parent
    if (parent.level === 'PROVINCE') {
      provinceCode = parent.code
      if (parent.parent) {
        countryCode = parent.parent.code
      }
    } else if (parent.level === 'COUNTRY') {
      // Internasional: DPC langsung di bawah COUNTRY (cth: Los Angeles di bawah USA)
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

// ============================================================
// AUDIT LOG — UU PDP No. 27/2022 Pasal 17 (akuntabilitas)
// Helper untuk catat akses ke data pribadi anggota
// ============================================================

export type AuditAction = 'VIEW' | 'EXPORT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'LOGIN' | 'DOWNLOAD' | 'DENIED'
export type AuditResource = 'MEMBER' | 'USER' | 'KTA_APPLICATION' | 'PROGRAM_DOCUMENT' | 'SEKRETARIAT_MESSAGE' | 'DATA_ACCESS_REQUEST'

/**
 * Catat aksi akses ke data pribadi — wajib dipanggil di setiap endpoint yang menyentuh data anggota.
 *
 * @example
 * await logAccess({
 *   actor: user,
 *   action: 'VIEW',
 *   resource: 'MEMBER',
 *   resourceId: member.id,
 *   resourceLabel: `${member.fullName} (${member.memberNumber})`,
 *   request,
 * })
 */
export async function logAccess(params: {
  actor: AuthUser
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  resourceLabel?: string
  request?: Request
  status?: 'SUCCESS' | 'DENIED' | 'ERROR'
  detail?: string
}): Promise<void> {
  try {
    const { actor, action, resource, resourceId, resourceLabel, request, status = 'SUCCESS', detail } = params
    // Best-effort logging — jangan crash endpoint utama kalau log gagal
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        actorName: actor.fullName,
        actorTerritory: actor.territory?.code || null,
        action,
        resource,
        resourceId: resourceId || null,
        resourceLabel: resourceLabel || null,
        ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: request?.headers.get('user-agent')?.substring(0, 500) || null,
        status,
        detail: detail || null,
      },
    })
  } catch (e: any) {
    // Log error tapi jangan throw — audit log tidak boleh break flow utama
    console.error('[logAccess] failed:', e.message)
  }
}

/**
 * Cek apakah user adalah DPO (Data Protection Officer)
 * DPO bisa: lihat audit log, handle data access request, export data untuk compliance
 */
export function isDPO(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  return Boolean((user as any).isDPO) || user.role === 'SUPERADMIN'
}

/**
 * Cek apakah user boleh akses audit log
 * Hanya DPO + SUPERADMIN + ADMIN_DPN yang boleh
 */
export function canViewAuditLog(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN') return true
  return isDPO(user)
}

/**
 * Generate nomor tiket untuk DataAccessRequest
 * Format: DAR-YYYYMMDD-XXX
 */
export async function generateDARNumber(): Promise<string> {
  const today = new Date()
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
  const count = await db.dataAccessRequest.count({
    where: { requestNumber: { startsWith: `DAR-${dateStr}` } },
  })
  return `DAR-${dateStr}-${String(count + 1).padStart(3, '0')}`
}
