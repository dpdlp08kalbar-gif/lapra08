// LAPRA 08 - API: Medsos Keywords & Hashtags (Atur Keyword AI & Hashtag)
// ============================================================
// Menyimpan konfigurasi keyword/hashtag/mention yang dipakai AI untuk:
//   - Memantau percakapan publik di media sosial (Jalur Otomatis Medsos)
//   - Filter feed viral & word cloud (di SurveyOutputDashboard)
//   - Sumber inspirasi untuk AI Generate pertanyaan survei
//
// Storage: SystemSetting key='medsos_keywords' (JSON array)
//   - Avoid DB migration (sesuai constraint Vercel Free Tier)
//   - Sama seperti pattern dpo_assignments
//
// Schema (per item):
//   {
//     id: string (cuid),
//     text: string,             // "Prabowo" / "#LAPRA08" / "@prabowo"
//     type: 'KEYWORD' | 'HASHTAG' | 'MENTION',
//     category: 'POLITIK' | 'EKONOMI' | 'SOSIAL' | 'HANKAM' | 'PEMERINTAHAN' | 'LAINNYA',
//     priority: 'HIGH' | 'MEDIUM' | 'LOW',
//     isActive: boolean,
//     notes?: string,
//     createdAt: string (ISO),
//     updatedAt: string (ISO),
//     createdBy: string (userId),
//   }
//
// RBAC:
//   - GET   : semua admin (DPN/DPD/DPC) — untuk preview saat buat survei
//   - POST  : DPN/SUPERADMIN
//   - PATCH : DPN/SUPERADMIN
//   - DELETE: DPN/SUPERADMIN
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SETTING_KEY = 'medsos_keywords'
const SETTING_CATEGORY = 'MEDSOS_MONITORING'

// === Tipe & Validasi ===
type KeywordType = 'KEYWORD' | 'HASHTAG' | 'MENTION'
type KeywordCategory = 'POLITIK' | 'EKONOMI' | 'SOSIAL' | 'HANKAM' | 'PEMERINTAHAN' | 'LAINNYA'
type KeywordPriority = 'HIGH' | 'MEDIUM' | 'LOW'

const VALID_TYPES: KeywordType[] = ['KEYWORD', 'HASHTAG', 'MENTION']
const VALID_CATEGORIES: KeywordCategory[] = ['POLITIK', 'EKONOMI', 'SOSIAL', 'HANKAM', 'PEMERINTAHAN', 'LAINNYA']
const VALID_PRIORITIES: KeywordPriority[] = ['HIGH', 'MEDIUM', 'LOW']

interface MedsosKeyword {
  id: string
  text: string
  type: KeywordType
  category: KeywordCategory
  priority: KeywordPriority
  isActive: boolean
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

// === Helper: Generate ID (tanpa dependency cuid di edge) ===
function genId(): string {
  return 'kw_' + Date.now().toString(36) + '_' + randomBytes(6).toString('hex')
}

// === Helper: Load keywords dari SystemSetting ===
async function loadKeywords(): Promise<MedsosKeyword[]> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: SETTING_KEY },
      select: { value: true },
    })
    if (!setting) return []
    const parsed = JSON.parse(setting.value)
    if (!Array.isArray(parsed)) return []
    return parsed as MedsosKeyword[]
  } catch {
    return []
  }
}

// === Helper: Save keywords ke SystemSetting ===
async function saveKeywords(keywords: MedsosKeyword[]): Promise<void> {
  const value = JSON.stringify(keywords)
  await db.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value, category: SETTING_CATEGORY, description: 'Medsos keywords/hashtags untuk AI monitoring (Jalur Otomatis Medsos)' },
    create: {
      key: SETTING_KEY,
      value,
      category: SETTING_CATEGORY,
      description: 'Medsos keywords/hashtags untuk AI monitoring (Jalur Otomatis Medsos)',
    },
  })
}

// === Helper: Normalize text berdasarkan type ===
// - HASHTAG : pastikan diawali "#" tanpa spasi, lowercase internal tetap preserve case untuk display
// - MENTION : pastikan diawali "@"
// - KEYWORD : trim, no leading #/@
function normalizeText(text: string, type: KeywordType): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (type === 'HASHTAG') {
    const withoutHash = trimmed.replace(/^#+/, '')
    return '#' + withoutHash.replace(/\s+/g, '')
  }
  if (type === 'MENTION') {
    const withoutAt = trimmed.replace(/^@+/, '')
    return '@' + withoutAt.replace(/\s+/g, '')
  }
  return trimmed.replace(/^[#@]+/, '')
}

// === Helper: Dedupe berdasarkan (text lowercase + type) ===
function isDuplicate(keywords: MedsosKeyword[], text: string, type: KeywordType, excludeId?: string): boolean {
  const normalized = text.toLowerCase()
  return keywords.some(k =>
    k.id !== excludeId &&
    k.text.toLowerCase() === normalized &&
    k.type === type
  )
}

// ============================================================
// GET /api/medsos-keywords — list semua keyword
// Query params:
//   ?type=HASHTAG        — filter by type
//   ?category=POLITIK    — filter by category
//   ?active=true         — hanya yang aktif
//   ?q=prabowo           — search text
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get('type') as KeywordType | null
    const categoryFilter = searchParams.get('category') as KeywordCategory | null
    const activeFilter = searchParams.get('active')
    const q = searchParams.get('q')?.toLowerCase().trim()

    let keywords = await loadKeywords()

    if (typeFilter && VALID_TYPES.includes(typeFilter)) {
      keywords = keywords.filter(k => k.type === typeFilter)
    }
    if (categoryFilter && VALID_CATEGORIES.includes(categoryFilter)) {
      keywords = keywords.filter(k => k.category === categoryFilter)
    }
    if (activeFilter === 'true') keywords = keywords.filter(k => k.isActive)
    if (activeFilter === 'false') keywords = keywords.filter(k => !k.isActive)
    if (q) keywords = keywords.filter(k => k.text.toLowerCase().includes(q) || (k.notes || '').toLowerCase().includes(q))

    // Sort: HIGH > MEDIUM > LOW, lalu by text
    const priorityOrder: Record<KeywordPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    keywords.sort((a, b) => {
      const p = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (p !== 0) return p
      return a.text.localeCompare(b.text)
    })

    // Statistik untuk summary card
    const allKeywords = await loadKeywords()
    const stats = {
      total: allKeywords.length,
      active: allKeywords.filter(k => k.isActive).length,
      byType: {
        KEYWORD: allKeywords.filter(k => k.type === 'KEYWORD').length,
        HASHTAG: allKeywords.filter(k => k.type === 'HASHTAG').length,
        MENTION: allKeywords.filter(k => k.type === 'MENTION').length,
      },
      byCategory: VALID_CATEGORIES.reduce((acc, cat) => {
        acc[cat] = allKeywords.filter(k => k.category === cat).length
        return acc
      }, {} as Record<KeywordCategory, number>),
    }

    return NextResponse.json({
      success: true,
      data: keywords,
      stats,
      message: keywords.length === 0
        ? 'Belum ada keyword/hashtag. Tambahkan preset politik atau buat manual.'
        : `${keywords.length} keyword/hashtag dimuat`,
    })
  } catch (e: any) {
    console.error('[MedsosKeywords GET] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal memuat keyword: ${e.message}` }, { status: 500 })
  }
}

// ============================================================
// POST /api/medsos-keywords — tambah keyword baru
// Body: { text, type, category, priority, notes?, isActive? }
// Atau: { action: 'preset_politik' } untuk import preset
// Atau: { action: 'bulk', items: [...] } untuk bulk add
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!isDPNLevel(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya admin DPN yang bisa mengatur keyword medsos.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const keywords = await loadKeywords()

    // === Action: Preset Politik ===
    // Tambahkan keyword standar untuk monitoring LAPRA 08
    if (body.action === 'preset_politik') {
      const preset: Array<Omit<MedsosKeyword, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>> = [
        // Tokoh utama
        { text: 'Prabowo Subianto', type: 'KEYWORD', category: 'POLITIK', priority: 'HIGH', isActive: true, notes: 'Tokoh utama LAPRA 08' },
        { text: '#Prabowo', type: 'HASHTAG', category: 'POLITIK', priority: 'HIGH', isActive: true },
        { text: '@prabowo', type: 'MENTION', category: 'POLITIK', priority: 'HIGH', isActive: true, notes: 'Akun IG resmi' },
        // Partai
        { text: 'Gerindra', type: 'KEYWORD', category: 'POLITIK', priority: 'HIGH', isActive: true, notes: 'Partai pengusung' },
        { text: '#Gerindra', type: 'HASHTAG', category: 'POLITIK', priority: 'HIGH', isActive: true },
        { text: 'Partai Gerindra', type: 'KEYWORD', category: 'POLITIK', priority: 'MEDIUM', isActive: true },
        // Organisasi
        { text: 'LAPRA 08', type: 'KEYWORD', category: 'POLITIK', priority: 'HIGH', isActive: true, notes: 'Organisasi inti' },
        { text: 'Laskar Prabowo 08', type: 'KEYWORD', category: 'POLITIK', priority: 'HIGH', isActive: true },
        // Pemerintahan
        { text: 'Kabinet Merah Putih', type: 'KEYWORD', category: 'PEMERINTAHAN', priority: 'HIGH', isActive: true },
        { text: '#KabinetMerahPutih', type: 'HASHTAG', category: 'PEMERINTAHAN', priority: 'MEDIUM', isActive: true },
        // Sentimen umum
        { text: 'pilpres 2024', type: 'KEYWORD', category: 'POLITIK', priority: 'MEDIUM', isActive: true },
        { text: 'pemerintahan baru', type: 'KEYWORD', category: 'PEMERINTAHAN', priority: 'MEDIUM', isActive: true },
      ]

      const now = new Date().toISOString()
      const added: MedsosKeyword[] = []
      for (const item of preset) {
        const normalizedText = normalizeText(item.text, item.type)
        if (isDuplicate(keywords, normalizedText, item.type)) continue
        if (isDuplicate(added.map(a => ({ ...a })), normalizedText, item.type)) continue
        added.push({
          ...item,
          text: normalizedText,
          id: genId(),
          createdAt: now,
          updatedAt: now,
          createdBy: actor.id,
        })
      }

      if (added.length === 0) {
        return NextResponse.json({
          success: true,
          data: keywords,
          message: 'Semua preset politik sudah ada di daftar',
        })
      }

      const updated = [...keywords, ...added]
      await saveKeywords(updated)

      await logAccess({
        actor,
        action: 'CREATE',
        resource: 'SYSTEM_SETTING',
        resourceId: SETTING_KEY,
        resourceLabel: 'Medsos Keywords',
        request,
        detail: `Import preset politik: ${added.length} keyword ditambahkan`,
      })

      return NextResponse.json({
        success: true,
        data: updated,
        addedCount: added.length,
        message: `${added.length} preset keyword politik berhasil ditambahkan`,
      })
    }

    // === Action: Bulk Add ===
    if (body.action === 'bulk' && Array.isArray(body.items)) {
      const now = new Date().toISOString()
      const added: MedsosKeyword[] = []
      for (const item of body.items) {
        if (!item.text || !item.type) continue
        if (!VALID_TYPES.includes(item.type)) continue
        const normalizedText = normalizeText(item.text, item.type)
        if (isDuplicate(keywords, normalizedText, item.type)) continue
        if (isDuplicate(added, normalizedText, item.type)) continue
        added.push({
          id: genId(),
          text: normalizedText,
          type: item.type,
          category: VALID_CATEGORIES.includes(item.category) ? item.category : 'LAINNYA',
          priority: VALID_PRIORITIES.includes(item.priority) ? item.priority : 'MEDIUM',
          isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
          notes: item.notes || undefined,
          createdAt: now,
          updatedAt: now,
          createdBy: actor.id,
        })
      }
      if (added.length === 0) {
        return NextResponse.json({ success: true, data: keywords, message: 'Tidak ada keyword baru untuk ditambahkan (semua sudah ada)' })
      }
      const updated = [...keywords, ...added]
      await saveKeywords(updated)
      await logAccess({
        actor, action: 'CREATE', resource: 'SYSTEM_SETTING', resourceId: SETTING_KEY,
        resourceLabel: 'Medsos Keywords', request, detail: `Bulk add: ${added.length} keyword`,
      })
      return NextResponse.json({ success: true, data: updated, addedCount: added.length, message: `${added.length} keyword berhasil ditambahkan` })
    }

    // === Default: Add Single ===
    const { text, type, category, priority, notes, isActive } = body
    if (!text || typeof text !== 'string' || text.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Text keyword minimal 2 karakter' }, { status: 400 })
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ success: false, error: `Type harus salah satu: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const normalizedText = normalizeText(text, type)
    if (isDuplicate(keywords, normalizedText, type)) {
      return NextResponse.json({ success: false, error: `Keyword "${normalizedText}" (${type}) sudah ada` }, { status: 409 })
    }

    const now = new Date().toISOString()
    const newKeyword: MedsosKeyword = {
      id: genId(),
      text: normalizedText,
      type,
      category: VALID_CATEGORIES.includes(category) ? category : 'LAINNYA',
      priority: VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM',
      isActive: typeof isActive === 'boolean' ? isActive : true,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
    }

    const updated = [...keywords, newKeyword]
    await saveKeywords(updated)

    await logAccess({
      actor, action: 'CREATE', resource: 'SYSTEM_SETTING', resourceId: SETTING_KEY,
      resourceLabel: 'Medsos Keywords', request, detail: `Add: ${newKeyword.text} (${newKeyword.type})`,
    })

    return NextResponse.json({
      success: true,
      data: newKeyword,
      message: `Keyword "${newKeyword.text}" ditambahkan`,
    })
  } catch (e: any) {
    console.error('[MedsosKeywords POST] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal menambah keyword: ${e.message}` }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/medsos-keywords — update keyword
// Body: { id, text?, type?, category?, priority?, isActive?, notes? }
// ============================================================
export async function PATCH(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!isDPNLevel(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya admin DPN yang bisa mengubah keyword medsos.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ success: false, error: 'Field wajib: id' }, { status: 400 })

    const keywords = await loadKeywords()
    const idx = keywords.findIndex(k => k.id === id)
    if (idx === -1) return NextResponse.json({ success: false, error: 'Keyword tidak ditemukan' }, { status: 404 })

    const oldKeyword = keywords[idx]
    const newType = updates.type && VALID_TYPES.includes(updates.type) ? updates.type : oldKeyword.type
    const newText = updates.text ? normalizeText(updates.text, newType) : oldKeyword.text

    // Cek dedupe jika text/type berubah
    if ((updates.text || updates.type) && isDuplicate(keywords, newText, newType, id)) {
      return NextResponse.json({ success: false, error: `Keyword "${newText}" (${newType}) sudah ada` }, { status: 409 })
    }

    const updatedKeyword: MedsosKeyword = {
      ...oldKeyword,
      text: newText,
      type: newType,
      category: updates.category && VALID_CATEGORIES.includes(updates.category) ? updates.category : oldKeyword.category,
      priority: updates.priority && VALID_PRIORITIES.includes(updates.priority) ? updates.priority : oldKeyword.priority,
      isActive: typeof updates.isActive === 'boolean' ? updates.isActive : oldKeyword.isActive,
      notes: updates.notes !== undefined ? (updates.notes || undefined) : oldKeyword.notes,
      updatedAt: new Date().toISOString(),
    }

    keywords[idx] = updatedKeyword
    await saveKeywords(keywords)

    await logAccess({
      actor, action: 'UPDATE', resource: 'SYSTEM_SETTING', resourceId: SETTING_KEY,
      resourceLabel: 'Medsos Keywords', request,
      detail: `Update ${oldKeyword.text} → ${updatedKeyword.text} (${updatedKeyword.type})`,
    })

    return NextResponse.json({
      success: true,
      data: updatedKeyword,
      message: `Keyword "${updatedKeyword.text}" diperbarui`,
    })
  } catch (e: any) {
    console.error('[MedsosKeywords PATCH] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal update keyword: ${e.message}` }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/medsos-keywords — hapus keyword
// Body: { id } atau { ids: [...] } untuk bulk delete
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const actor = await getUserFromRequest(request)
    if (!actor) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    if (!isDPNLevel(actor.role)) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Hanya admin DPN yang bisa menghapus keyword medsos.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const idsToDelete: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : [])
    if (idsToDelete.length === 0) {
      return NextResponse.json({ success: false, error: 'Field wajib: id (string) atau ids (array)' }, { status: 400 })
    }

    const keywords = await loadKeywords()
    const deletedKeywords = keywords.filter(k => idsToDelete.includes(k.id))
    const remaining = keywords.filter(k => !idsToDelete.includes(k.id))

    if (deletedKeywords.length === 0) {
      return NextResponse.json({ success: false, error: 'Keyword tidak ditemukan' }, { status: 404 })
    }

    await saveKeywords(remaining)

    await logAccess({
      actor, action: 'DELETE', resource: 'SYSTEM_SETTING', resourceId: SETTING_KEY,
      resourceLabel: 'Medsos Keywords', request,
      detail: `Delete ${deletedKeywords.length} keyword: ${deletedKeywords.map(k => k.text).join(', ')}`,
    })

    return NextResponse.json({
      success: true,
      data: remaining,
      deletedCount: deletedKeywords.length,
      message: `${deletedKeywords.length} keyword dihapus`,
    })
  } catch (e: any) {
    console.error('[MedsosKeywords DELETE] Error:', e)
    return NextResponse.json({ success: false, error: `Gagal hapus keyword: ${e.message}` }, { status: 500 })
  }
}
