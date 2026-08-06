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

// Dapatkan daftar territoryId yang bisa diakses user (untuk isolasi data)
// SUPERADMIN / ADMIN_DPN: semua territory
// ADMIN_DPD: territory sendiri + semua child (DPC di provinsi itu)
// ADMIN_DPC: hanya territory sendiri
export async function getAccessibleTerritoryIds(user: AuthUser): Promise<{
  isGlobal: boolean
  territoryIds: string[]
  primaryTerritoryId: string
}> {
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN') {
    return { isGlobal: true, territoryIds: [], primaryTerritoryId: user.territoryId }
  }

  if (user.role === 'ADMIN_DPD') {
    // Ambil territory sendiri + semua child
    const children = await db.territory.findMany({
      where: { parentId: user.territoryId },
      select: { id: true },
    })
    return {
      isGlobal: false,
      territoryIds: [user.territoryId, ...children.map((c) => c.id)],
      primaryTerritoryId: user.territoryId,
    }
  }

  // ADMIN_DPC
  return {
    isGlobal: false,
    territoryIds: [user.territoryId],
    primaryTerritoryId: user.territoryId,
  }
}

// Build where clause untuk query Member dengan isolasi territory
export async function buildTerritoryWhere(user: AuthUser) {
  const scope = await getAccessibleTerritoryIds(user)
  if (scope.isGlobal) return {}
  return { territoryId: { in: scope.territoryIds } }
}

// ============================================================
// KTA GENERATOR
// Format: LAPRA08.[KODE_NEGARA].[KODE_PROVINSI].[KODE_KAB_KOTA].[TAHUN].[NOMOR_URUT]
// Contoh domestik: LAPRA08.ID.61.71.26.00001
// Contoh internasional: LAPRA08.US.00.LAX.26.00001
// ============================================================
export async function generateMemberNumber(territoryId: string): Promise<string> {
  const territory = await db.territory.findUnique({
    where: { id: territoryId },
    include: { parent: { include: { parent: true } } },
  })
  if (!territory) throw new Error('Territory not found')

  // Kode negara
  let countryCode = 'XX'
  let provinceCode = '00'
  let regencyCode = territory.code

  // Jika territory adalah REGENCY:
  // - Domestik: parent=PROVINCE, grandparent=COUNTRY (contoh: Pontianak -> Kalbar -> Indonesia)
  // - Internasional: parent=COUNTRY langsung (contoh: Los Angeles -> USA)
  if (territory.level === 'REGENCY' && territory.parent) {
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
  } else if (territory.level === 'PROVINCE') {
    provinceCode = territory.code
    if (territory.parent) {
      countryCode = territory.parent.code
    }
  } else if (territory.level === 'COUNTRY') {
    countryCode = territory.code
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
