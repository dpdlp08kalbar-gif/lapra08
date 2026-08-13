// LAPRA 08 - API: Bulk Create Pengurus dari Daftar Manual (FOSS, no OCR/ZAI needed)
// =====================================================
// POST /api/organization/bulk
//
// Body:
//   territoryId  — String (cuid) — required
//   level        — String — required ('DPN' | 'DPD' | 'DPC')
//   pengurusText — String — required (multiline text, format bebas)
//
// Supported text formats (auto-detected per line):
//   "Budi Santoso - Ketua"
//   "Budi Santoso, Ketua"
//   "Budi Santoso (Ketua)"
//   "1. Budi Santoso - Ketua"
//   "Ketua: Budi Santoso"
//   "Budi Santoso Ketua DPD Kalbar"
//
// Returns:
//   { success, data: { created, skipped, errors }, message }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

// === PARSER: extract name + position from a single line ===
function parsePengurusLine(line: string): { name: string; position: string } | null {
  const cleaned = line.trim()
    .replace(/^\d+\.\s*/, '')        // remove "1. " prefix
    .replace(/^[-•*]\s*/, '')         // remove "- " prefix
    .trim()
  if (!cleaned || cleaned.length < 3) return null

  // Pattern 1: "Name - Position" or "Name — Position"
  let m = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (m) return { name: m[1].trim(), position: m[2].trim() }

  // Pattern 2: "Name, Position"
  m = cleaned.match(/^(.+?),\s*(.+)$/)
  if (m) return { name: m[1].trim(), position: m[2].trim() }

  // Pattern 3: "Name (Position)"
  m = cleaned.match(/^(.+?)\s*\((.+?)\)\s*$/)
  if (m) return { name: m[1].trim(), position: m[2].trim() }

  // Pattern 4: "Position: Name"
  m = cleaned.match(/^([^:]+?)\s*:\s*(.+)$/)
  if (m) {
    const part1 = m[1].trim()
    const part2 = m[2].trim()
    // Heuristic: if part1 is short (1-3 words), it's likely a position
    const part1WordCount = part1.split(/\s+/).length
    if (part1WordCount <= 3) {
      return { name: part2, position: part1 }
    }
    return { name: part1, position: part2 }
  }

  // Pattern 5: Single name only (no position detected) — set position as 'Pengurus'
  if (cleaned.length >= 3) {
    return { name: cleaned, position: 'Pengurus' }
  }
  return null
}

// === Validate parsed position against known LAPRA 08 positions ===
const KNOWN_POSITIONS = [
  'ketua', 'wakil ketua', 'sekretaris', 'wakil sekretaris', 'bendahara', 'wakil bendahara',
  'koordinator', 'koordinator wilayah', 'ketua koordinator', 'departemen',
  'ketua departemen', 'sekretaris departemen', 'bidang', 'ketua bidang', 'sekretaris bidang',
  'ketua umum', 'ketua harian', 'anggota', 'penasihat', 'dewan pembina', 'dewan penasihat',
  'pembina', 'pelindung', 'humas', 'propaganda', 'kaderisasi', 'pemberdayaan perempuan',
  'pemuda', 'tani', 'nelayan', 'buruh', 'umkm', 'profesi', 'media', 'teknologi',
  'pengurus', 'staf', 'eksekutif', 'operasional',
]

function normalizePosition(raw: string): string {
  const lower = raw.toLowerCase().trim()
  // Find best match in KNOWN_POSITIONS
  const match = KNOWN_POSITIONS.find(p => lower.includes(p))
  if (match) {
    // Capitalize first letter of each word
    return match.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  // Default: just capitalize first letter
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { territoryId, level, pengurusText } = body

    if (!territoryId || !level || !pengurusText) {
      return NextResponse.json(
        { success: false, error: 'territoryId, level, dan pengurusText wajib diisi' },
        { status: 400 }
      )
    }

    if (!['DPN', 'DPD', 'DPC'].includes(level)) {
      return NextResponse.json(
        { success: false, error: 'level harus DPN, DPD, atau DPC' },
        { status: 400 }
      )
    }

    // === RBAC: hanya admin dengan akses territory tsb yang bisa bulk create ===
    const scope = await getAccessibleTerritoryIds(user)
    if (!scope.isGlobal && !scope.territoryIds.includes(territoryId)) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    // === Parse multiline text ===
    const lines = pengurusText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)

    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada baris valid. Pastikan format: "Nama - Jabatan" satu per baris.' },
        { status: 400 }
      )
    }

    const parsed: { name: string; position: string }[] = []
    const errors: { line: string; error: string }[] = []

    for (const line of lines) {
      const result = parsePengurusLine(line)
      if (!result) {
        errors.push({ line, error: 'Format tidak dikenali' })
        continue
      }
      if (!result.name || result.name.length < 3) {
        errors.push({ line, error: 'Nama terlalu pendek' })
        continue
      }
      parsed.push({
        name: result.name,
        position: normalizePosition(result.position),
      })
    }

    if (parsed.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Tidak ada pengurus valid. ${errors.length} baris gagal parse. Contoh format: "Budi Santoso - Ketua"`,
        data: { errors },
      }, { status: 400 })
    }

    // === Bulk create OrgPosition records ===
    const created: any[] = []
    const skipped: any[] = []
    let order = 1

    for (const p of parsed) {
      try {
        // Skip if same fullName + position + territory already exists
        const existing = await db.orgPosition.findFirst({
          where: {
            fullName: { equals: p.name, mode: 'insensitive' },
            positionName: { equals: p.position, mode: 'insensitive' },
            territoryId,
          },
          select: { id: true },
        })
        if (existing) {
          skipped.push({ name: p.name, position: p.position, reason: 'sudah ada' })
          continue
        }

        // Approval status: superadmin/dpn → APPROVED; lainnya → PENDING
        const approvalStatus = (user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN')
          ? 'APPROVED'
          : 'PENDING'

        const pos = await db.orgPosition.create({
          data: {
            fullName: p.name,
            positionName: p.position,
            level,
            territoryId,
            order: order++,
            startDate: new Date(),
            approvalStatus,
            approvedById: approvalStatus === 'APPROVED' ? user.id : null,
            approvedAt: approvalStatus === 'APPROVED' ? new Date() : null,
          },
          include: { territory: true },
        })
        created.push(pos)
      } catch (e: any) {
        errors.push({ line: `${p.name} - ${p.position}`, error: e.message.substring(0, 100) })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created: created.map(p => ({
          id: p.id,
          fullName: p.fullName,
          positionName: p.positionName,
          level: p.level,
          territory: p.territory?.name,
          approvalStatus: p.approvalStatus,
        })),
        skipped,
        errors,
        totalParsed: parsed.length,
        totalCreated: created.length,
        totalSkipped: skipped.length,
        totalErrors: errors.length,
      },
      message: created.length > 0
        ? `Berhasil! ${created.length} pengurus ${level} ditambahkan ke struktur organisasi. ${skipped.length} duplikat di-skip. ${errors.length} error.`
        : `Tidak ada pengurus baru dibuat. ${skipped.length} sudah ada, ${errors.length} error.`,
    })
  } catch (e: any) {
    console.error('[Bulk Organization Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
