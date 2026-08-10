// LAPRA 08 - API: Upload PDF Program Kerja + OCR + AI Analisis
// POST /api/program-kerja/upload-pdf
// Terima PDF → OCR via VLM (z-ai-web-dev-sdk) → AI analisis → return extracted data
//
// Flow:
// 1. DPN/DPD/DPC upload PDF Program Kerja
// 2. Sistem convert PDF ke gambar (atau langsung VLM baca PDF)
// 3. VLM OCR: extract struktur program kerja dari PDF
// 4. AI analisis: prioritas, timeline, target, anggaran, kategori
// 5. Return hasil untuk preview → user konfirmasi → simpan
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import ZAI from 'z-ai-web-dev-sdk'
import * as fs from 'fs'
import * as path from 'path'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const level = formData.get('level') as string // DPN | DPD | DPC
    const territoryCode = formData.get('territoryCode') as string // kode wilayah

    if (!file) return NextResponse.json({ success: false, error: 'File PDF wajib' }, { status: 400 })
    if (!file.type.includes('pdf')) return NextResponse.json({ success: false, error: 'File harus PDF' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ success: false, error: 'Ukuran PDF maksimal 20MB' }, { status: 400 })

    // Save PDF to temp
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'program-kerja')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    const fileName = `prog-kerja-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = path.join(uploadDir, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, fileBuffer)

    const fileUrl = `/uploads/program-kerja/${fileName}`

    // === OCR + AI ANALISIS via VLM ===
    // Convert PDF pages ke base64 images untuk VLM
    // Untuk PDF, kita kirim sebagai file_url ke VLM
    const base64Pdf = fileBuffer.toString('base64')
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`

    const zai = await ZAI.create()

    const completion = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Anda adalah ahli analisis program kerja organisasi LAPRA 08 (Laskar Prabowo 08).

Baca dokumen PDF Program Kerja ini dengan teliti dan extract informasi berikut:

1. **Judul Program Kerja**: Judul lengkap dokumen
2. **Tingkat**: DPN (Nasional) / DPD (Provinsi) / DPC (Kabupaten/Kota)
3. **Wilayah**: Nama wilayah (cth: "Kalimantan Barat" atau "Kota Pontianak")
4. **Periode**: Tahun/periode program kerja (cth: "2026-2031")
5. **Program Utama**: Daftar program kerja utama (max 10 program, masing-masing dengan:
   - Nama program
   - Deskripsi singkat
   - Timeline/pelaksanaan
   - Target/peserta
   - Anggaran estimasi (jika ada)
6. **Prioritas**: Program prioritas utama (urutan 1-5)
7. **Kategori**: Kategori program (PEMBANGUNAN/SOSIAL/POLITIK/KADERISASI/MITRA/DLL)
8. **Ringkasan AI**: Analisis singkat tentang strategi program kerja

Kembalikan HANYA JSON valid:
{
  "title": "judul dokumen program kerja",
  "level": "DPN|DPD|DPC",
  "territoryName": "nama wilayah",
  "period": "periode program",
  "programs": [
    {
      "name": "nama program",
      "description": "deskripsi singkat",
      "timeline": "timeline pelaksanaan",
      "target": "target peserta",
      "budget": "anggaran estimasi atau null",
      "priority": 1
    }
  ],
  "topPriorities": ["prioritas 1", "prioritas 2", ...],
  "categories": ["PEMBANGUNAN", "SOSIAL", ...],
  "aiSummary": "analisis AI singkat tentang strategi program kerja"
}`
            },
            {
              type: 'file_url',
              file_url: { url: dataUrl }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    })

    const rawContent = completion.choices[0]?.message?.content || ''
    
    // Extract JSON dari response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Fallback: return raw text
      return NextResponse.json({
        success: true,
        data: {
          title: file.name.replace('.pdf', ''),
          level: level || 'UNKNOWN',
          territoryName: territoryCode || '',
          period: '',
          programs: [],
          topPriorities: [],
          categories: [],
          aiSummary: 'OCR berhasil tapi tidak bisa parse JSON. Raw: ' + rawContent.substring(0, 500),
          rawOcrText: rawContent.substring(0, 2000),
        },
        fileUrl,
        message: 'PDF di-upload & OCR berhasil (parsing manual mungkin diperlukan)',
      })
    }

    const result = JSON.parse(jsonMatch[0])

    // Override level & territory dari form input
    if (level) result.level = level
    if (territoryCode) result.territoryCode = territoryCode

    return NextResponse.json({
      success: true,
      data: result,
      fileUrl,
      message: `PDF "${result.title}" berhasil di-OCR & dianalisis AI. ${result.programs?.length || 0} program terdeteksi.`,
    })
  } catch (e: any) {
    console.error('[Program Kerja Upload Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
