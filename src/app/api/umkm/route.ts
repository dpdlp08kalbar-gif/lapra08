// LAPRA 08 - API: UMKM (Ekonomi Kreatif & UMKM)
// ============================================================
// GET    /api/umkm?territoryId=xxx       — list UMKM di territory
// GET    /api/umkm?territoryId=xxx&stats=1 — stats summary
// GET    /api/umkm?id=xxx                — get one UMKM with products
// POST   /api/umkm                       — create UMKM (RBAC: harus punya akses edit territory)
// PATCH  /api/umkm                      — update UMKM
// DELETE /api/umkm?id=xxx                — delete UMKM (cascade products)
//
// POST   /api/umkm?action=create_product  — create product under UMKM
// PATCH  /api/umkm?action=update_product  — update product
// DELETE /api/umkm?id=xxx&type=product    — delete product
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getViewableTerritoryIds, getEditableTerritoryIds, isDPNLevel, logAccess } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['KOPERASI', 'USHA_KECIL', 'USHA_MENENGAH', 'EKRAF']
const ALLOWED_BIDANG = ['KULINER', 'FASHION', 'KERAJINAN', 'APLIKASI_DIGITAL', 'PERTANIAN', 'JASA', 'PERDAGANGAN', 'LAINNYA']
const ALLOWED_LEGAL = ['BELUM_TERDAFTAR', 'NIB', 'BADAN_HUKUM_PT', 'BADAN_HUKUM_CV', 'YAYASAN', 'KOPERASI_RESMI']
const ALLOWED_STATUS = ['AKTIF', 'NON-AKTIF', 'BERHENTI']

// ============================================================
// GET
// ============================================================
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const territoryId = searchParams.get('territoryId')
    const umkmId = searchParams.get('id')
    const statsOnly = searchParams.get('stats') === '1'
    const typeFilter = searchParams.get('type')
    const bidangFilter = searchParams.get('bidang')

    // Get one UMKM with products
    if (umkmId) {
      const umkm = await db.umkm.findUnique({
        where: { id: umkmId },
        include: {
          products: { orderBy: { name: 'asc' } },
          territory: { select: { name: true, code: true, level: true } },
          createdBy: { select: { fullName: true } },
        },
      })
      if (!umkm) return NextResponse.json({ success: false, error: 'UMKM tidak ditemukan' }, { status: 404 })

      // RBAC check: user must be able to view this territory
      const { territoryIds, isGlobalView } = await getViewableTerritoryIds(user)
      if (!isGlobalView && !territoryIds.includes(umkm.territoryId)) {
        await logAccess({ actor: user, action: 'DENIED', resource: 'UMKM', resourceId: umkmId, request, detail: 'No view access' })
        return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
      }

      await logAccess({
        actor: user, action: 'VIEW', resource: 'UMKM', resourceId: umkmId,
        resourceLabel: umkm.name, request, detail: `Type: ${umkm.type}`,
      })

      return NextResponse.json({ success: true, data: umkm })
    }

    // Determine territory scope
    let targetTerritoryIds: string[] = []
    let isGlobal = false
    if (territoryId) {
      // User explicitly requested a specific territory — verify view access
      const { territoryIds, isGlobalView } = await getViewableTerritoryIds(user)
      if (!isGlobalView && !territoryIds.includes(territoryId)) {
        return NextResponse.json({ success: false, error: 'Akses ditolak ke territory ini' }, { status: 403 })
      }
      targetTerritoryIds = [territoryId]
      isGlobal = false
    } else {
      // Use user's accessible territories
      const { territoryIds, isGlobalView } = await getViewableTerritoryIds(user)
      targetTerritoryIds = territoryIds
      isGlobal = isGlobalView
    }

    // Stats only
    if (statsOnly) {
      const where: any = {}
      if (!isGlobal) where.territoryId = { in: targetTerritoryIds }
      if (typeFilter) where.type = typeFilter
      if (bidangFilter) where.bidang = bidangFilter

      const [totalCount, byType, byBidang, byLegal, totalOmzet, byStatus] = await Promise.all([
        db.umkm.count({ where }),
        db.umkm.groupBy({ by: ['type'], where, _count: true }),
        db.umkm.groupBy({ by: ['bidang'], where, _count: true }),
        db.umkm.groupBy({ by: ['legalStatus'], where, _count: true }),
        db.umkm.aggregate({ where, _sum: { monthlyOmzet: true } }),
        db.umkm.groupBy({ by: ['status'], where, _count: true }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          totalCount, byType, byBidang, byLegal, byStatus,
          totalOmzet: totalOmzet._sum.monthlyOmzet || 0,
        },
      })
    }

    // Full list with products count
    const where: any = {}
    if (!isGlobal) where.territoryId = { in: targetTerritoryIds }
    if (typeFilter) where.type = typeFilter
    if (bidangFilter) where.bidang = bidangFilter

    const umkms = await db.umkm.findMany({
      where,
      include: {
        territory: { select: { name: true, code: true, level: true } },
        _count: { select: { products: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    })

    await logAccess({
      actor: user, action: 'VIEW', resource: 'UMKM', resourceId: 'list',
      resourceLabel: `${umkms.length} UMKM`, request, detail: isGlobal ? 'global' : `territoryIds=${targetTerritoryIds.length}`,
    })

    return NextResponse.json({ success: true, data: umkms })
  } catch (e: any) {
    console.error('[UMKM GET] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// POST — create UMKM or Product
// ============================================================
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const action = body.action || 'create_umkm'

    // ============================================================
    // CREATE UMKM
    // ============================================================
    if (action === 'create_umkm') {
      const { name, type, bidang, description, legalStatus, npwp, nib, noBadanHukum, foundedDate, ownerName, ownerPhone, address, employeeCount, monthlyOmzet, logoUrl, status, notes, territoryId } = body

      if (!name?.trim() || !type || !territoryId) {
        return NextResponse.json({ success: false, error: 'name, type, territoryId wajib diisi' }, { status: 400 })
      }
      if (!ALLOWED_TYPES.includes(type)) {
        return NextResponse.json({ success: false, error: `Type tidak valid: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 })
      }
      if (bidang && !ALLOWED_BIDANG.includes(bidang)) {
        return NextResponse.json({ success: false, error: `Bidang tidak valid: ${ALLOWED_BIDANG.join(', ')}` }, { status: 400 })
      }
      if (legalStatus && !ALLOWED_LEGAL.includes(legalStatus)) {
        return NextResponse.json({ success: false, error: `Legal status tidak valid: ${ALLOWED_LEGAL.join(', ')}` }, { status: 400 })
      }

      // RBAC: user must have edit access to this territory
      const { territoryIds, isGlobalEdit } = await getEditableTerritoryIds(user)
      if (!isGlobalEdit && !territoryIds.includes(territoryId)) {
        await logAccess({ actor: user, action: 'DENIED', resource: 'UMKM', resourceId: 'create', request, detail: `No edit access to territory ${territoryId}` })
        return NextResponse.json({ success: false, error: 'Akses edit ditolak ke territory ini' }, { status: 403 })
      }

      const umkm = await db.umkm.create({
        data: {
          name: name.trim(),
          type,
          bidang: bidang || null,
          description: description?.trim() || null,
          legalStatus: legalStatus || 'BELUM_TERDAFTAR',
          npwp: npwp?.trim() || null,
          nib: nib?.trim() || null,
          noBadanHukum: noBadanHukum?.trim() || null,
          foundedDate: foundedDate ? new Date(foundedDate) : null,
          ownerName: ownerName?.trim() || null,
          ownerPhone: ownerPhone?.trim() || null,
          address: address?.trim() || null,
          employeeCount: parseInt(employeeCount) || 0,
          monthlyOmzet: parseInt(monthlyOmzet) || 0,
          logoUrl: logoUrl || null,
          status: status || 'AKTIF',
          notes: notes?.trim() || null,
          territoryId,
          createdById: user.id,
        },
        include: { territory: { select: { name: true, code: true } } },
      })

      await logAccess({
        actor: user, action: 'CREATE', resource: 'UMKM', resourceId: umkm.id,
        resourceLabel: `${umkm.name} (${umkm.type})`, request,
        detail: `Territory: ${umkm.territory.name}; Bidang: ${umkm.bidang || '-'}`,
      })

      return NextResponse.json({
        success: true, data: umkm,
        message: `UMKM "${umkm.name}" berhasil dibuat`,
      })
    }

    // ============================================================
    // CREATE PRODUCT
    // ============================================================
    if (action === 'create_product') {
      const { umkmId, name, description, price, unit, stock, category, photoUrl, isActive } = body

      if (!umkmId || !name?.trim()) {
        return NextResponse.json({ success: false, error: 'umkmId dan name wajib diisi' }, { status: 400 })
      }

      // Validate UMKM exists + user has edit access
      const umkm = await db.umkm.findUnique({ where: { id: umkmId }, select: { id: true, name: true, territoryId: true } })
      if (!umkm) return NextResponse.json({ success: false, error: 'UMKM tidak ditemukan' }, { status: 404 })

      const { territoryIds, isGlobalEdit } = await getEditableTerritoryIds(user)
      if (!isGlobalEdit && !territoryIds.includes(umkm.territoryId)) {
        return NextResponse.json({ success: false, error: 'Akses edit ditolak' }, { status: 403 })
      }

      const product = await db.umkmProduct.create({
        data: {
          umkmId,
          name: name.trim(),
          description: description?.trim() || null,
          price: parseInt(price) || 0,
          unit: unit?.trim() || null,
          stock: parseInt(stock) || 0,
          category: category?.trim() || null,
          photoUrl: photoUrl || null,
          isActive: isActive !== false,
          createdById: user.id,
        },
      })

      await logAccess({
        actor: user, action: 'CREATE', resource: 'UMKM_PRODUCT', resourceId: product.id,
        resourceLabel: `${product.name} (UMKM: ${umkm.name})`, request,
        detail: `Price: ${product.price}`,
      })

      return NextResponse.json({
        success: true, data: product,
        message: `Produk "${product.name}" ditambahkan ke ${umkm.name}`,
      })
    }

    return NextResponse.json({ success: false, error: `Action tidak dikenal: ${action}` }, { status: 400 })
  } catch (e: any) {
    console.error('[UMKM POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// PATCH — update UMKM or Product
// ============================================================
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const action = body.action || 'update_umkm'

    if (action === 'update_umkm') {
      const { id, ...updates } = body
      if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })

      const existing = await db.umkm.findUnique({ where: { id }, select: { id: true, name: true, territoryId: true } })
      if (!existing) return NextResponse.json({ success: false, error: 'UMKM tidak ditemukan' }, { status: 404 })

      // RBAC check
      const { territoryIds, isGlobalEdit } = await getEditableTerritoryIds(user)
      if (!isGlobalEdit && !territoryIds.includes(existing.territoryId)) {
        return NextResponse.json({ success: false, error: 'Akses edit ditolak' }, { status: 403 })
      }

      // Validate enum fields if provided
      if (updates.type && !ALLOWED_TYPES.includes(updates.type)) {
        return NextResponse.json({ success: false, error: `Type tidak valid` }, { status: 400 })
      }
      if (updates.bidang && !ALLOWED_BIDANG.includes(updates.bidang)) {
        return NextResponse.json({ success: false, error: `Bidang tidak valid` }, { status: 400 })
      }
      if (updates.legalStatus && !ALLOWED_LEGAL.includes(updates.legalStatus)) {
        return NextResponse.json({ success: false, error: `Legal status tidak valid` }, { status: 400 })
      }
      if (updates.status && !ALLOWED_STATUS.includes(updates.status)) {
        return NextResponse.json({ success: false, error: `Status tidak valid` }, { status: 400 })
      }

      // Build safe update object
      const data: any = {}
      const fields = ['name', 'type', 'bidang', 'description', 'legalStatus', 'npwp', 'nib', 'noBadanHukum',
                      'ownerName', 'ownerPhone', 'address', 'logoUrl', 'status', 'notes']
      for (const f of fields) {
        if (updates[f] !== undefined) data[f] = typeof updates[f] === 'string' ? updates[f].trim() || null : updates[f]
      }
      if (updates.foundedDate !== undefined) data.foundedDate = updates.foundedDate ? new Date(updates.foundedDate) : null
      if (updates.employeeCount !== undefined) data.employeeCount = parseInt(updates.employeeCount) || 0
      if (updates.monthlyOmzet !== undefined) data.monthlyOmzet = parseInt(updates.monthlyOmzet) || 0

      const updated = await db.umkm.update({ where: { id }, data })

      await logAccess({
        actor: user, action: 'UPDATE', resource: 'UMKM', resourceId: id,
        resourceLabel: updated.name, request,
        detail: `Fields: ${Object.keys(data).join(', ')}`,
      })

      return NextResponse.json({ success: true, data: updated, message: 'UMKM diperbarui' })
    }

    if (action === 'update_product') {
      const { id, ...updates } = body
      if (!id) return NextResponse.json({ success: false, error: 'id wajib diisi' }, { status: 400 })

      const existing = await db.umkmProduct.findUnique({ where: { id }, include: { umkm: { select: { territoryId: true, name: true } } } })
      if (!existing) return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404 })

      // RBAC check via parent UMKM
      const { territoryIds, isGlobalEdit } = await getEditableTerritoryIds(user)
      if (!isGlobalEdit && !territoryIds.includes(existing.umkm.territoryId)) {
        return NextResponse.json({ success: false, error: 'Akses edit ditolak' }, { status: 403 })
      }

      const data: any = {}
      const fields = ['name', 'description', 'unit', 'category', 'photoUrl']
      for (const f of fields) {
        if (updates[f] !== undefined) data[f] = typeof updates[f] === 'string' ? updates[f].trim() || null : updates[f]
      }
      if (updates.price !== undefined) data.price = parseInt(updates.price) || 0
      if (updates.stock !== undefined) data.stock = parseInt(updates.stock) || 0
      if (updates.isActive !== undefined) data.isActive = !!updates.isActive

      const updated = await db.umkmProduct.update({ where: { id }, data })

      await logAccess({
        actor: user, action: 'UPDATE', resource: 'UMKM_PRODUCT', resourceId: id,
        resourceLabel: updated.name, request, detail: `Fields: ${Object.keys(data).join(', ')}`,
      })

      return NextResponse.json({ success: true, data: updated, message: 'Produk diperbarui' })
    }

    return NextResponse.json({ success: false, error: `Action tidak dikenal: ${action}` }, { status: 400 })
  } catch (e: any) {
    console.error('[UMKM PATCH] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// ============================================================
// DELETE
// ============================================================
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type') // 'umkm' | 'product'

    if (!id || !type) {
      return NextResponse.json({ success: false, error: 'id dan type wajib diisi' }, { status: 400 })
    }

    if (type === 'umkm') {
      const umkm = await db.umkm.findUnique({ where: { id }, include: { products: true } })
      if (!umkm) return NextResponse.json({ success: false, error: 'UMKM tidak ditemukan' }, { status: 404 })

      const { territoryIds, isGlobalEdit } = await getEditableTerritoryIds(user)
      if (!isGlobalEdit && !territoryIds.includes(umkm.territoryId)) {
        return NextResponse.json({ success: false, error: 'Akses edit ditolak' }, { status: 403 })
      }

      const productCount = umkm.products.length
      await db.umkm.delete({ where: { id } }) // cascade delete products

      await logAccess({
        actor: user, action: 'DELETE', resource: 'UMKM', resourceId: id,
        resourceLabel: umkm.name, request, detail: `Deleted + ${productCount} products`,
      })

      return NextResponse.json({ success: true, message: `UMKM "${umkm.name}" dihapus (${productCount} produk turut terhapus)` })
    }

    if (type === 'product') {
      const product = await db.umkmProduct.findUnique({ where: { id }, include: { umkm: { select: { territoryId: true, name: true } } } })
      if (!product) return NextResponse.json({ success: false, error: 'Produk tidak ditemukan' }, { status: 404 })

      const { territoryIds, isGlobalEdit } = await getEditableTerritoryIds(user)
      if (!isGlobalEdit && !territoryIds.includes(product.umkm.territoryId)) {
        return NextResponse.json({ success: false, error: 'Akses edit ditolak' }, { status: 403 })
      }

      await db.umkmProduct.delete({ where: { id } })

      await logAccess({
        actor: user, action: 'DELETE', resource: 'UMKM_PRODUCT', resourceId: id,
        resourceLabel: product.name, request, detail: `Deleted product`,
      })

      return NextResponse.json({ success: true, message: `Produk "${product.name}" dihapus` })
    }

    return NextResponse.json({ success: false, error: `Type tidak dikenal: ${type}` }, { status: 400 })
  } catch (e: any) {
    console.error('[UMKM DELETE] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
