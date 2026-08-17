// LAPRA 08 - API: Profile Content (Tentang, Visi-Misi, dll)
// Stored in SystemSetting category=PROFILE_CONTENT
//
// GET    /api/profile-content             - list all profile content
// POST   /api/profile-content             - create or update content (SUPERADMIN only)
// DELETE /api/profile-content?key=XXX     - delete content by key (SUPERADMIN only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET - List all profile content
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const items = await db.systemSetting.findMany({
      where: { category: 'PROFILE_CONTENT' },
      orderBy: { key: 'asc' },
    })

    const contents = items.map((item) => {
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

    return NextResponse.json({ success: true, data: contents })
  } catch (e: any) {
    console.error('[Profile Content GET] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal memuat konten profil: ${e.message}` },
      { status: 500 }
    )
  }
}

// POST - Create or update content (SUPERADMIN only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat mengelola profile content' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { key, value, description } = body

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'key wajib diisi' },
        { status: 400 }
      )
    }

    if (value === undefined) {
      return NextResponse.json(
        { success: false, error: 'value wajib diisi' },
        { status: 400 }
      )
    }

    // Normalize value: store as JSON string (object/string)
    const valueStr =
      typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))
        ? value
        : typeof value === 'string'
          ? value
          : JSON.stringify(value)

    const setting = await db.systemSetting.upsert({
      where: { key },
      update: {
        value: valueStr,
        category: 'PROFILE_CONTENT',
        description: description || undefined,
      },
      create: {
        key,
        value: valueStr,
        category: 'PROFILE_CONTENT',
        description: description || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: setting.id,
        key: setting.key,
        value,
        description: setting.description,
        updatedAt: setting.updatedAt,
      },
      message: 'Profile content disimpan',
    })
  } catch (e: any) {
    console.error('[Profile Content POST] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal menyimpan: ${e.message}` },
      { status: 500 }
    )
  }
}

// DELETE - Delete content by key
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat menghapus profile content' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "key" wajib diisi' },
        { status: 400 }
      )
    }

    const existing = await db.systemSetting.findUnique({ where: { key } })
    if (!existing || existing.category !== 'PROFILE_CONTENT') {
      return NextResponse.json(
        { success: false, error: 'Profile content tidak ditemukan' },
        { status: 404 }
      )
    }

    await db.systemSetting.delete({ where: { key } })

    return NextResponse.json({
      success: true,
      message: `Profile content "${key}" berhasil dihapus`,
    })
  } catch (e: any) {
    console.error('[Profile Content DELETE] Error:', e)
    return NextResponse.json(
      { success: false, error: `Gagal menghapus: ${e.message}` },
      { status: 500 }
    )
  }
}
