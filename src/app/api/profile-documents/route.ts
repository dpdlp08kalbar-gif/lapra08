// LAPRA 08 - API: Profile Documents (AD/ART, Legalitas)
// Stored in SystemSetting category=PROFILE_DOCUMENT
//
// GET    /api/profile-documents?type=AD_ART|LEGALITAS  - list documents by type
// POST   /api/profile-documents  - upload document (FormData, PDF/JPG/PNG/DOC, 20MB, SUPERADMIN only)
//        Save to /public/uploads/profile-docs/
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import * as fs from 'fs'
import * as path from 'path'

const MAX_SIZE = 20 * 1024 * 1024 // 20MB

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // MS Word .doc legacy
  'application/msword',
  // .docx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.doc', '.docx']

const VALID_TYPES = ['AD_ART', 'LEGALITAS']

function getExtFromName(name: string): string {
  const m = name.toLowerCase().match(/(\.[a-z0-9]+)$/)
  return m ? m[1] : ''
}

// GET - list documents by type
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // AD_ART | LEGALITAS

  const where: any = { category: 'PROFILE_DOCUMENT' }
  // We also filter by docType stored in the JSON value (post-fetch filter below)
  const items = await db.systemSetting.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })

  let docs = items.map((item) => {
    try {
      const parsed = JSON.parse(item.value)
      return {
        id: item.id,
        key: item.key,
        ...parsed,
        description: item.description,
        updatedAt: item.updatedAt,
      }
    } catch {
      return null
    }
  }).filter(Boolean)

  if (type) {
    docs = docs.filter((d: any) => d.docType === type)
  }

  return NextResponse.json({ success: true, data: docs })
}

// POST - upload document (FormData)
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role !== 'SUPERADMIN') {
    return NextResponse.json(
      { success: false, error: 'Hanya Super Admin yang dapat mengupload dokumen profil' },
      { status: 403 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string | null) || ''
    const description = (formData.get('description') as string | null) || ''
    const docType = ((formData.get('docType') as string | null) || 'AD_ART').toUpperCase()

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File dokumen wajib diupload' },
        { status: 400 }
      )
    }

    if (!VALID_TYPES.includes(docType)) {
      return NextResponse.json(
        { success: false, error: 'docType harus "AD_ART" atau "LEGALITAS"' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file maksimal 20MB' },
        { status: 400 }
      )
    }

    // Validate type/extension
    const ext = getExtFromName(file.name)
    if (!ALLOWED_MIME.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { success: false, error: 'Format file tidak didukung. Gunakan PDF, JPG, PNG, atau DOC/DOCX' },
        { status: 400 }
      )
    }

    // === Vercel-compatible: convert file to base64 data URL (no filesystem) ===
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const extClean = ext.replace(/^\./, '')
    const mimeType = file.type || (extClean === 'pdf' ? 'application/pdf' : extClean === 'png' ? 'image/png' : 'image/jpeg')
    const base64DataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`

    // Build doc metadata — fileUrl is the data URL itself (works in <a href> + <img src>)
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const docData = {
      id: docId,
      docType,
      title: title || file.name,
      description,
      fileUrl: base64DataUrl, // direct data URL
      fileName: file.name,
      fileType: extClean || 'unknown',
      fileSize: fileBuffer.length,
      uploadedBy: user.fullName,
      uploadedById: user.id,
      uploadedAt: new Date().toISOString(),
    }

    await db.systemSetting.create({
      data: {
        key: docId,
        value: JSON.stringify(docData),
        category: 'PROFILE_DOCUMENT',
        description: `${docType}: ${docData.title}`,
      },
    })

    // Return without huge base64 payload in response
    return NextResponse.json({
      success: true,
      data: { ...docData, fileUrl: `[base64 data, ${fileBuffer.length} bytes]` },
      message: `Dokumen ${docType} berhasil diupload`,
    })
  } catch (e: any) {
    console.error('[Profile Documents POST Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
