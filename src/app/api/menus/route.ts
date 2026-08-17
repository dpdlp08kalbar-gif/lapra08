// LAPRA 08 - API: Menus (Dynamic Menu Builder)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { canAccess, DEFAULT_MENUS } from '@/lib/types'

// Pastikan route berjalan di Node.js runtime (bukan Edge)
export const runtime = 'nodejs'
// Hindari cache statis — selalu fresh
export const dynamic = 'force-dynamic'

// === AUTO-MIGRATE: kalau menu lama (dashboard/users/events/finance) masih ada di DB, hapus + ganti ke pusat-admin ===
// Idempotent: cek dulu apakah 'pusat-admin' sudah ada; kalau belum, jalankan migrasi
// Cache in-memory 5 menit supaya tidak query terus setiap GET
let _migrationCache: { ts: number; migrated: boolean } | null = null
const MIGRATION_CACHE_TTL = 5 * 60 * 1000

// Menu yang sudah tidak dipakai (akan dihapus dari DB saat auto-migrate)
const DEPRECATED_MENU_KEYS = ['dashboard', 'users', 'events', 'finance', 'logistics', 'membership', 'organization', 'territory']

async function autoMigrateMenus(): Promise<void> {
  // Cek cache — kalau sudah di-migrate dalam 5 menit, skip
  if (_migrationCache && Date.now() - _migrationCache.ts < MIGRATION_CACHE_TTL) {
    return
  }

  try {
    // Cek apakah 'pusat-admin' sudah ada di DB
    const hasPusatAdmin = await db.menuItem.findUnique({
      where: { key: 'pusat-admin' },
      select: { key: true },
    })
    if (hasPusatAdmin) {
      // Pusat-admin sudah ada, tapi tetap cek apakah ada menu deprecated yang belum dihapus
      const deprecated = await db.menuItem.findMany({
        where: { key: { in: DEPRECATED_MENU_KEYS } },
        select: { key: true },
      })
      if (deprecated.length === 0) {
        _migrationCache = { ts: Date.now(), migrated: false }
        return
      }
      // Hapus menu deprecated yang tersisa
      console.log(`[Menus] Cleaning up ${deprecated.length} deprecated menu items:`, deprecated.map(d => d.key).join(', '))
      await db.menuItem.deleteMany({
        where: { key: { in: DEPRECATED_MENU_KEYS } },
      })
      _migrationCache = { ts: Date.now(), migrated: true }
      return
    }

    // Kalau belum ada pusat-admin, jalankan migrasi penuh
    console.log('[Menus] Auto-migrating: dashboard+users+events+finance → pusat-admin')

    // Hapus menu lama kalau masih ada
    await db.menuItem.deleteMany({
      where: { key: { in: DEPRECATED_MENU_KEYS } },
    })

    // Upsert semua menu dari DEFAULT_MENUS
    for (const m of DEFAULT_MENUS) {
      await db.menuItem.upsert({
        where: { key: m.key },
        update: {
          label: m.label,
          icon: m.icon,
          order: m.order,
          roles: m.roles,
        },
        create: {
          key: m.key,
          label: m.label,
          icon: m.icon,
          order: m.order,
          roles: m.roles,
          isVisible: true,
          isActive: true,
          parentId: null,
        },
      })
    }
    console.log('[Menus] Auto-migrate complete')
    _migrationCache = { ts: Date.now(), migrated: true }
  } catch (e: any) {
    console.error('[Menus] Auto-migrate failed:', e.message)
    // Set cache pendek supaya tidak retry terus
    _migrationCache = { ts: Date.now(), migrated: false }
  }
}

// GET /api/menus - List menu yang bisa diakses user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // === AUTO-MIGRATE: pastikan menu 'pusat-admin' sudah ada di DB ===
    await autoMigrateMenus()

    const menus = await db.menuItem.findMany({
      where: { isActive: true, isVisible: true, parentId: null },
      include: {
        children: {
          where: { isActive: true, isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    })

    // Filter berdasarkan role
    const filtered = menus
      .filter((m) => canAccess(user.role as any, m.roles))
      .map((m) => ({
        ...m,
        children: m.children.filter((c) => canAccess(user.role as any, c.roles)),
      }))

    return NextResponse.json({ success: true, data: filtered })
  } catch (e: any) {
    console.error('[Menus GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat menu: ${e.message}` },
      { status: 500 }
    )
  }
}

// POST /api/menus - Tambah menu baru (SUPERADMIN/ADMIN_DPN only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN')) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { key, label, icon, order, parentId, roles, isVisible = true } = body

    if (!key || !label) {
      return NextResponse.json({ success: false, error: 'Key dan label wajib diisi' }, { status: 400 })
    }

    const menu = await db.menuItem.create({
      data: {
        key,
        label,
        icon: icon || 'Circle',
        order: order || 0,
        parentId: parentId || null,
        roles: roles || 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC',
        isVisible,
      },
    })

    return NextResponse.json({ success: true, data: menu })
  } catch (e: any) {
    console.error('[Menus POST] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal menambah menu: ${e.message}` },
      { status: 500 }
    )
  }
}
