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
// HAK AKSES - 4 TINGKAT
// ============================================================
// SUPERADMIN : Akses penuh teknis (debug, security, user mgmt)
// ADMIN_DPN  : EDIT data DPN pusat ( Indonesia ) + LIHAT SEMUA DPD/DPC se-Indonesia & internasional
//              - Bisa input/edit anggota DPN
//              - Bisa LIHAT anggota DPD/DPC tapi TIDAK bisa edit (read-only)
//              - Generate KTA dengan format DPN: LAPRA08.ID.00.00.26.00001
// ADMIN_DPD  : EDIT data DPD provinsi sendiri + DPC di bawahnya + LIHAT data DPN
//              - Bisa input/edit anggota DPD & DPC di provinsinya
//              - Bisa LIHAT anggota DPN pusat tapi TIDAK bisa edit (read-only)
// ADMIN_DPC  : Hanya wilayah DPC sendiri (terisolasi)
// ============================================================

// Cek apakah user adalah admin DPN level (SUPERADMIN atau ADMIN_DPN)
export function isDPNLevel(role: string): boolean {
  return role === 'SUPERADMIN' || role === 'ADMIN_DPN'
}

// Dapatkan territoryId level DPN (COUNTRY untuk domestik Indonesia)
// Untuk ADMIN_DPN, territoryId-nya adalah territory COUNTRY (cth: Indonesia)
export function getDPNTerritoryLevel(user: AuthUser): 'COUNTRY' | 'PROVINCE' | 'REGENCY' | null {
  if (!isDPNLevel(user.role)) return null
  return user.territory.level as 'COUNTRY' | 'PROVINCE' | 'REGENCY'
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

  // ADMIN_DPD: lihat DPN pusat + DPD sendiri + DPC di bawahnya
  if (user.role === 'ADMIN_DPD') {
    // Cari territory COUNTRY (DPN) - parent tertinggi dari provinsi user
    const province = await db.territory.findUnique({
      where: { id: user.territoryId },
      include: { parent: true },
    })
    const countryId = province?.parent?.id || province?.parentId || ''

    // Ambil semua child DPC di provinsi user
    const children = await db.territory.findMany({
      where: { parentId: user.territoryId },
      select: { id: true },
    })

    const territoryIds = [user.territoryId, ...children.map((c) => c.id)]
    // Tambahkan countryId (DPN) agar DPD bisa LIHAT data DPN (read-only)
    if (countryId) territoryIds.push(countryId)

    return {
      isGlobalView: false,
      territoryIds,
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_DPC: hanya wilayah sendiri
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
  // SUPERADMIN: edit semua (untuk maintenance)
  if (user.role === 'SUPERADMIN') {
    return { isGlobalEdit: true, territoryIds: [], primaryTerritoryId: user.territoryId }
  }

  // ADMIN_DPN: edit HANYA territory DPN pusat (COUNTRY tempat dia terdaftar)
  // TIDAK bisa edit DPD/DPC (read-only untuk mereka)
  if (user.role === 'ADMIN_DPN') {
    return {
      isGlobalEdit: false,
      territoryIds: [user.territoryId], // hanya DPN pusat
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_DPD: edit DPD sendiri + semua DPC di bawahnya
  // TIDAK bisa edit DPN pusat
  if (user.role === 'ADMIN_DPD') {
    const children = await db.territory.findMany({
      where: { parentId: user.territoryId },
      select: { id: true },
    })
    return {
      isGlobalEdit: false,
      territoryIds: [user.territoryId, ...children.map((c) => c.id)],
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
// DPN (Pusat Nasional):
//   LAPRA08.ID.00.00.26.00001  (kode provinsi=00, kab/kota=00)
//   LAPRA08.US.00.00.26.00001  (untuk DPN internasional)
//
// DPD (Provinsi):
//   LAPRA08.ID.61.00.26.00001  (kode kab/kota=00)
//
// DPC (Kabupaten/Kota):
//   LAPRA08.ID.61.71.26.00001  (format lengkap)
//   LAPRA08.US.00.LAX.26.00001 (internasional)
// ============================================================
export async function generateMemberNumber(territoryId: string): Promise<string> {
  const territory = await db.territory.findUnique({
    where: { id: territoryId },
    include: { parent: { include: { parent: true } } },
  })
  if (!territory) throw new Error('Territory not found')

  // Kode default
  let countryCode = 'XX'
  let provinceCode = '00'
  let regencyCode = '00' // default 00 untuk DPN & DPD

  // ===== DPN (COUNTRY level) =====
  // Format: LAPRA08.[COUNTRY].00.00.[YEAR].[SEQ]
  if (territory.level === 'COUNTRY') {
    countryCode = territory.code
    provinceCode = '00' // DPN pusat
    regencyCode = '00'  // DPN pusat
  }
  // ===== DPD (PROVINCE level) =====
  // Format: LAPRA08.[COUNTRY].[PROVINCE].00.[YEAR].[SEQ]
  else if (territory.level === 'PROVINCE') {
    provinceCode = territory.code
    regencyCode = '00' // DPD tidak punya kab/kota
    if (territory.parent) {
      countryCode = territory.parent.code
    }
  }
  // ===== DPC (REGENCY level) =====
  // Format: LAPRA08.[COUNTRY].[PROVINCE].[REGENCY].[YEAR].[SEQ]
  else if (territory.level === 'REGENCY' && territory.parent) {
    const parent = territory.parent
    regencyCode = territory.code
    if (parent.level === 'PROVINCE') {
      // Domestik: PROVINCE -> COUNTRY
      provinceCode = parent.code
      if (parent.parent) {
        countryCode = parent.parent.code
      }
    } else if (parent.level === 'COUNTRY') {
      // Internasional: langsung COUNTRY (tanpa province)
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

  // Hitung nomor urut: cari max nomor urut untuk kombinasi ini
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
