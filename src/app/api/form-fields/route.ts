// LAPRA 08 - API: Form Fields (Dynamic Form Builder)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET /api/form-fields?formType=MEMBER_DOMESTIC
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const formType = searchParams.get('formType')

  const where: any = { isVisible: true }
  if (formType) where.formType = formType

  const fields = await db.formField.findMany({
    where,
    orderBy: { order: 'asc' },
  })

  return NextResponse.json({ success: true, data: fields })
}

// POST - Tambah field baru
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_DPN')) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await request.json()
  const {
    formType,
    fieldKey,
    fieldLabel,
    fieldType,
    fieldOptions,
    isRequired = false,
    isVisible = true,
    order = 0,
    placeholder,
    helpText,
    validation,
  } = body

  if (!formType || !fieldKey || !fieldLabel || !fieldType) {
    return NextResponse.json(
      { success: false, error: 'formType, fieldKey, fieldLabel, fieldType wajib diisi' },
      { status: 400 }
    )
  }

  const field = await db.formField.create({
    data: {
      formType,
      fieldKey,
      fieldLabel,
      fieldType,
      fieldOptions: fieldOptions ? JSON.stringify(fieldOptions) : null,
      isRequired,
      isVisible,
      order,
      placeholder,
      helpText,
      validation: validation ? JSON.stringify(validation) : null,
    },
  })

  return NextResponse.json({ success: true, data: field })
}
