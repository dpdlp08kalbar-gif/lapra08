// LAPRA 08 - API: Message Templates
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const where: any = { isActive: true }
  if (category) where.category = category
  const templates = await db.messageTemplate.findMany({ where, orderBy: { useCount: 'desc' } })
  return NextResponse.json({ success: true, data: templates })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { name, category, subject, content, whatsappContent, facebookContent, instagramContent, defaultImageUrl, variables } = body
    if (!name || !content) return NextResponse.json({ success: false, error: 'Nama dan konten wajib' }, { status: 400 })
    const template = await db.messageTemplate.create({
      data: {
        name, category: category || 'UMUM', subject: subject || null,
        content, whatsappContent, facebookContent, instagramContent,
        defaultImageUrl: defaultImageUrl || null,
        variables: JSON.stringify(variables || []),
        createdById: user.id,
      },
    })
    return NextResponse.json({ success: true, data: template, message: 'Template pesan dibuat' })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}
