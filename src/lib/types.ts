// LAPRA 08 - Shared Types & Constants
// Hierarki: DPN (Pusat) → DPD (Provinsi) → DPC (Kabupaten/Kota)

export type Role =
  | 'SUPERADMIN'
  | 'ADMIN_DPN'
  | 'ADMIN_DPD'
  | 'ADMIN_DPC'

export type TerritoryLevel =
  | 'COUNTRY'
  | 'PROVINCE'
  | 'REGENCY'
  | 'DISTRICT'
  | 'VILLAGE'

export type TerritoryCategory = 'DOMESTIC' | 'INTERNATIONAL'

export type MemberStatus = 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'REJECTED' | 'INACTIVE'

export type MemberFormType = 'MEMBER_DOMESTIC' | 'MEMBER_INTERNATIONAL'

export interface SessionUser {
  id: string
  username: string
  fullName: string
  role: Role
  territoryId: string
  territoryName: string
  territoryCode: string
  territoryLevel: TerritoryLevel
  avatar?: string | null
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 14 Kabupaten/Kota Kalimantan Barat dengan kode wilayah resmi
// Format: Kode Provinsi 61 (Kalbar), kode kab/kota 2 digit (71-78 untuk Kalbar)
export const KALBAR_REGENCIES = [
  { code: '71', name: 'Kota Pontianak', isCity: true },
  { code: '72', name: 'Kabupaten Pontianak', isCity: false },
  { code: '73', name: 'Kabupaten Landak', isCity: false },
  { code: '74', name: 'Kabupaten Mempawah', isCity: false },
  { code: '75', name: 'Kabupaten Sambas', isCity: false },
  { code: '76', name: 'Kabupaten Bengkayang', isCity: false },
  { code: '77', name: 'Kabupaten Singkawang', isCity: true },
  { code: '78', name: 'Kabupaten Kapuas Hulu', isCity: false },
  { code: '01', name: 'Kabupaten Ketapang', isCity: false },
  { code: '02', name: 'Kabupaten Melawi', isCity: false },
  { code: '03', name: 'Kabupaten Sintang', isCity: false },
  { code: '04', name: 'Kabupaten Sekadau', isCity: false },
  { code: '05', name: 'Kabupaten Sanggau', isCity: false },
  { code: '06', name: 'Kabupaten Tayan', isCity: false },
] as const

// Default 7 Menu (events & finance dihapus sesuai permintaan user)
export const DEFAULT_MENUS = [
  { key: 'pusat-admin', label: 'Pusat Admin', icon: 'ShieldCheck', order: 1, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
  { key: 'territory', label: 'Manajemen Wilayah', icon: 'Map', order: 2, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD' },
  { key: 'membership', label: 'Data Keanggotaan', icon: 'Users', order: 3, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
  { key: 'organization', label: 'Struktur Pengurus & SK', icon: 'Building2', order: 4, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
  { key: 'logistics', label: 'Logistik & Atribut', icon: 'Package', order: 5, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
  { key: 'communication', label: 'Komunikasi & Broadcast', icon: 'Megaphone', order: 7, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
  { key: 'help', label: 'Pusat Bantuan', icon: 'LifeBuoy', order: 9, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
] as const

// Role labels (Bahasa Indonesia)
export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN_DPN: 'Admin DPN (Pusat)',
  ADMIN_DPD: 'Admin DPD (Provinsi)',
  ADMIN_DPC: 'Admin DPC (Kab/Kota)',
}

export const ROLE_COLORS: Record<Role, string> = {
  SUPERADMIN: 'bg-red-100 text-red-700 border-red-200',
  ADMIN_DPN: 'bg-purple-100 text-purple-700 border-purple-200',
  ADMIN_DPD: 'bg-orange-100 text-orange-700 border-orange-200',
  ADMIN_DPC: 'bg-green-100 text-green-700 border-green-200',
}

// Level labels untuk territory
export const TERRITORY_LEVEL_LABELS: Record<string, string> = {
  COUNTRY: 'Negara (DPN)',
  PROVINCE: 'Provinsi (DPD)',
  REGENCY: 'Kabupaten/Kota (DPC)',
  DISTRICT: 'Kecamatan',
  VILLAGE: 'Desa/Kelurahan',
}

export const TERRITORY_LEVEL_COLORS: Record<string, string> = {
  COUNTRY: 'bg-purple-100 text-purple-700 border-purple-200',
  PROVINCE: 'bg-blue-100 text-blue-700 border-blue-200',
  REGENCY: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DISTRICT: 'bg-gray-100 text-gray-700 border-gray-200',
  VILLAGE: 'bg-gray-50 text-gray-600 border-gray-200',
}

// Helper: cek apakah role bisa akses menu
export function canAccess(role: Role, allowedRoles: string): boolean {
  if (role === 'SUPERADMIN') return true
  return allowedRoles.split(',').includes(role)
}

// Helper: dapatkan territory scope untuk query (data isolation)
// SUPERADMIN & ADMIN_DPN: global (semua territory)
// ADMIN_DPD: provinsi + semua DPC di provinsi itu
// ADMIN_DPC: hanya territoryId sendiri
export function getTerritoryScope(role: Role, territoryId: string, territoryLevel?: string): {
  isGlobal: boolean
  territoryId?: string
  parentTerritoryId?: string
} {
  if (role === 'SUPERADMIN' || role === 'ADMIN_DPN') {
    return { isGlobal: true }
  }
  if (role === 'ADMIN_DPD') {
    return { isGlobal: false, parentTerritoryId: territoryId }
  }
  // ADMIN_DPC
  return { isGlobal: false, territoryId }
}
