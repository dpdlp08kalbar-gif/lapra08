// LAPRA 08 - API: FAQ (Frequently Asked Questions)
// Stored in SystemSetting category=FAQ
//
// GET    /api/faq             - list all FAQ (any authenticated user)
// POST   /api/faq             - create or update FAQ (SUPERADMIN only)
// DELETE /api/faq?id=XXX      - delete FAQ by id (SUPERADMIN only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - List all FAQ (any authenticated user can view)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const items = await db.systemSetting.findMany({
    where: { category: 'FAQ' },
    orderBy: { key: 'asc' },
  })

  const faqs = items.map((item) => {
    let value: any = item.value
    try {
      value = JSON.parse(item.value)
    } catch {
      // keep as raw string
    }
    return {
      id: item.id,
      key: item.key,
      value,
      description: item.description || null,
      updatedAt: item.updatedAt,
    }
  })

  return NextResponse.json({ success: true, data: faqs })
}

// POST - Create or update FAQ (SUPERADMIN only)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // === HANYA SUPERADMIN yang bisa edit FAQ ===
  if (user.role !== 'SUPERADMIN') {
    return NextResponse.json({
      success: false,
      error: 'Akses ditolak. Hanya Super Admin yang dapat mengelola FAQ.'
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, category, q, a } = body

    if (!id || !category || !q || !a) {
      return NextResponse.json({
        success: false,
        error: 'Field wajib: id, category, q (pertanyaan), a (jawaban)'
      }, { status: 400 })
    }

    const value = JSON.stringify({ id, category, q, a })

    // Upsert: jika key sudah ada -> update, jika belum -> create
    const result = await db.systemSetting.upsert({
      where: { key: id },
      update: {
        value,
        description: `FAQ: ${q.substring(0, 80)}${q.length > 80 ? '...' : ''}`,
      },
      create: {
        key: id,
        value,
        category: 'FAQ',
        description: `FAQ: ${q.substring(0, 80)}${q.length > 80 ? '...' : ''}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: { id: result.key, value: JSON.parse(result.value) },
      message: 'FAQ berhasil disimpan',
    })
  } catch (e: any) {
    console.error('[FAQ POST Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// DELETE - Delete FAQ by id (SUPERADMIN only)
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // === HANYA SUPERADMIN yang bisa hapus FAQ ===
  if (user.role !== 'SUPERADMIN') {
    return NextResponse.json({
      success: false,
      error: 'Akses ditolak. Hanya Super Admin yang dapat menghapus FAQ.'
    }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Parameter id wajib' }, { status: 400 })
    }

    await db.systemSetting.deleteMany({
      where: { key: id, category: 'FAQ' },
    })

    return NextResponse.json({
      success: true,
      message: 'FAQ berhasil dihapus',
    })
  } catch (e: any) {
    console.error('[FAQ DELETE Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
