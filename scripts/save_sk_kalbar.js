// Save SK Document + 41 Pengurus DPD Kalbar to DB
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')
const prisma = new PrismaClient()

async function main() {
  // Load extracted data
  const extracted = JSON.parse(fs.readFileSync('/tmp/sk_extracted.json', 'utf8'))
  console.log('SK Info:', JSON.stringify(extracted.skInfo, null, 2))
  console.log(`Total pengurus to save: ${extracted.pengurus.length}`)

  // Get DPD Kalimantan Barat territory
  const kalbar = await prisma.territory.findFirst({
    where: { code: '61', level: 'PROVINCE' }
  })
  if (!kalbar) throw new Error('DPD Kalimantan Barat tidak ditemukan')
  console.log(`DPD Kalbar: ${kalbar.name} (id=${kalbar.id})`)

  // Get superadmin user
  const admin = await prisma.user.findFirst({ where: { username: 'superadmin' } })
  if (!admin) throw new Error('Superadmin user tidak ditemukan')

  // Copy PDF to /public/uploads/sk/
  const sourcePdf = '/home/z/my-project/upload/016 SK LP08 DPD KALIMANTAN BARAT (Rev)(1) 2.pdf'
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sk')
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
  const targetFileName = `016-SK-LP08-DPD-KALBAR-2025-11-04.pdf`
  const targetPath = path.join(uploadDir, targetFileName)
  fs.copyFileSync(sourcePdf, targetPath)
  const fileUrl = `/uploads/sk/${targetFileName}`
  const fileSize = fs.statSync(targetPath).size
  console.log(`PDF disalin ke: ${fileUrl} (${fileSize} bytes)`)

  // Check if SK with same number already exists
  const skNumber = extracted.skInfo.nomorSK || `016/Kep/DPN/XI/2025`
  const existingSK = await prisma.sKDocument.findUnique({ where: { skNumber } })
  if (existingSK) {
    console.log(`SK dengan nomor ${skNumber} sudah ada, akan di-update`)
    // Delete existing pengurus for this territory (clear previous data)
    await prisma.orgPosition.deleteMany({
      where: { territoryId: kalbar.id, level: 'DPD' }
    })
    console.log('  → Pengurus lama DPD Kalbar dihapus')
  }

  // Create/update SK Document
  const skDoc = await prisma.sKDocument.upsert({
    where: { skNumber },
    update: {
      title: extracted.skInfo.tentang || 'Pelantikan Pengurus DPD Kalimantan Barat',
      description: `SK Pengurus DPD Kalimantan Barat Periode 2024-2029. Sekretariat: Gedung Rhema Lt. 3, Jln. K.H. Noer Ali Bekasi.`,
      fileUrl, fileName: targetFileName, fileType: 'pdf', fileSize,
      ocrStatus: 'COMPLETED',
      extractedText: JSON.stringify(extracted, null, 2),
      ocrMetadata: JSON.stringify({
        ...extracted.skInfo,
        pengurusCount: extracted.pengurus.length,
        notes: extracted.notes,
        autoDetected: true,
        processedAt: new Date().toISOString(),
      }),
      issuedAt: new Date(extracted.skInfo.tanggalTerbit || '2025-11-04'),
      issuedBy: extracted.skInfo.penerbit || 'Dewan Pimpinan Nasional Laskar Prabowo 08',
      territoryId: kalbar.id,
    },
    create: {
      skNumber,
      title: extracted.skInfo.tentang || 'Pelantikan Pengurus DPD Kalimantan Barat',
      description: `SK Pengurus DPD Kalimantan Barat Periode 2024-2029. Sekretariat: Gedung Rhema Lt. 3, Jln. K.H. Noer Ali Bekasi.`,
      fileUrl, fileName: targetFileName, fileType: 'pdf', fileSize,
      ocrStatus: 'COMPLETED',
      extractedText: JSON.stringify(extracted, null, 2),
      ocrMetadata: JSON.stringify({
        ...extracted.skInfo,
        pengurusCount: extracted.pengurus.length,
        notes: extracted.notes,
        autoDetected: true,
        processedAt: new Date().toISOString(),
      }),
      issuedAt: new Date(extracted.skInfo.tanggalTerbit || '2025-11-04'),
      issuedBy: extracted.skInfo.penerbit || 'Dewan Pimpinan Nasional Laskar Prabowo 08',
      territoryId: kalbar.id,
    },
  })
  console.log(`✅ SK Document saved: ${skDoc.id} | No: ${skDoc.skNumber}`)

  // Add pengurus
  console.log('\n=== Saving pengurus ===')
  let created = 0, skipped = 0
  for (let i = 0; i < extracted.pengurus.length; i++) {
    const p = extracted.pengurus[i]
    if (!p.fullName || !p.positionName) {
      console.log(`  SKIP ${i+1}: missing fullName or positionName`)
      skipped++
      continue
    }
    // Normalize phone
    let phone = p.phone
    if (phone) {
      phone = phone.replace(/[^0-9+]/g, '')
      if (phone.startsWith('0')) phone = '+62' + phone.substring(1)
      else if (phone.startsWith('8')) phone = '+62' + phone
    }

    await prisma.orgPosition.create({
      data: {
        fullName: p.fullName,
        positionName: p.positionName,
        level: 'DPD',
        territoryId: kalbar.id,
        phone,
        email: p.email || null,
        startDate: new Date(extracted.skInfo.tanggalTerbit || '2025-11-04'),
        endDate: new Date('2029-12-31'),
        isActive: true,
        approvalStatus: 'APPROVED',
        approvedById: admin.id,
        approvedAt: new Date(),
        source: 'OCR_EXTRACT',
        order: i + 1,
      }
    })
    console.log(`  ${i+1}. ✅ ${p.positionName}: ${p.fullName}${phone ? ' | ' + phone : ''}`)
    created++
  }

  console.log(`\n=== SELESAI ===`)
  console.log(`✅ SK Document: ${skDoc.skNumber} (terbit ${extracted.skInfo.tanggalTerbit})`)
  console.log(`✅ Pengurus disimpan: ${created}`)
  if (skipped > 0) console.log(`⚠ Skipped: ${skipped}`)
  
  // Verify total pengurus DPD Kalbar
  const totalPengurus = await prisma.orgPosition.count({
    where: { territoryId: kalbar.id, level: 'DPD' }
  })
  console.log(`\n📊 Total pengurus DPD Kalbar di DB: ${totalPengurus}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
