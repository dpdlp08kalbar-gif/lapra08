// LAPRA 08 - Migration Script: SystemSetting (PROGRAM_DOCUMENT) → ProgramDocument table
// Jalankan dengan: npx tsx scripts/migrate-program-docs.ts
//
// Sumber: SystemSetting where category=PROGRAM_DOCUMENT, value=JSON (incl. base64 fileData)
// Target: ProgramDocument table dengan kolom terstruktur
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('=== Migration: SystemSetting.PROGRAM_DOCUMENT → ProgramDocument ===')

  const legacyItems = await db.systemSetting.findMany({
    where: { category: 'PROGRAM_DOCUMENT' },
  })
  console.log(`Found ${legacyItems.length} legacy items to migrate`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const item of legacyItems) {
    try {
      const data = JSON.parse(item.value)

      // Skip jika data tidak lengkap
      if (!data.title || !data.category || !data.level) {
        console.warn(`Skip ${item.key}: missing required fields`)
        skipped++
        continue
      }

      // Cek apakah sudah pernah dimigrasi (cari by docKey)
      const existing = await db.programDocument.findUnique({
        where: { docKey: item.key },
        select: { id: true },
      })
      if (existing) {
        console.log(`Skip ${item.key}: already migrated`)
        skipped++
        continue
      }

      // Cari user yang upload (jika ada uploadedById)
      let uploadedById = data.uploadedById
      if (!uploadedById) {
        // Fallback: cari SuperAdmin pertama
        const admin = await db.user.findFirst({
          where: { role: 'SUPERADMIN', isActive: true },
          select: { id: true },
        })
        if (!admin) {
          console.error(`Fail ${item.key}: no SUPERADMIN user found as fallback uploader`)
          failed++
          continue
        }
        uploadedById = admin.id
      }

      const created = await db.programDocument.create({
        data: {
          docKey: item.key,
          title: String(data.title).substring(0, 500),
          description: data.description ? String(data.description).substring(0, 5000) : null,
          category: data.category,
          level: data.level,
          territoryId: data.territoryId || null,
          territoryCode: data.territoryCode || null,
          territoryName: data.territoryName || null,
          location: data.location ? String(data.location).substring(0, 200) : null,
          eventDate: data.date ? new Date(data.date) : null,
          status: data.status || 'DIRENCANAKAN',
          fileName: data.fileName || null,
          fileType: data.fileType || null,
          fileMimeType: data.fileMimeType || null,
          fileSize: data.fileSize || 0,
          fileHash: data.fileHash || null,
          fileData: data.fileData || null,
          uploadedById,
          uploadedAt: data.uploadedAt ? new Date(data.uploadedAt) : new Date(item.updatedAt),
        },
      })
      console.log(`✓ Migrated ${item.key} → ${created.id}`)
      migrated++
    } catch (e: any) {
      console.error(`Fail ${item.key}: ${e.message}`)
      failed++
    }
  }

  // Juga migrasi PROGRAM_CONTENT lama (dari /api/gallery) — lebih sederhana, tanpa file
  const programContentItems = await db.systemSetting.findMany({
    where: { category: 'PROGRAM_CONTENT' },
  })
  console.log(`\nFound ${programContentItems.length} PROGRAM_CONTENT items (no file)`)

  let pcMigrated = 0
  let pcSkipped = 0
  for (const item of programContentItems) {
    try {
      const data = JSON.parse(item.value)
      if (!data.title || !data.category || !data.level) {
        pcSkipped++
        continue
      }

      const existing = await db.programDocument.findUnique({
        where: { docKey: item.key },
        select: { id: true },
      })
      if (existing) {
        pcSkipped++
        continue
      }

      let uploadedById = data.uploadedById
      if (!uploadedById) {
        const admin = await db.user.findFirst({
          where: { role: 'SUPERADMIN', isActive: true },
          select: { id: true },
        })
        if (!admin) {
          pcSkipped++
          continue
        }
        uploadedById = admin.id
      }

      await db.programDocument.create({
        data: {
          docKey: item.key,
          title: String(data.title).substring(0, 500),
          description: data.description ? String(data.description).substring(0, 5000) : null,
          category: data.category,
          level: data.level,
          territoryId: data.territoryId || null,
          territoryCode: data.territoryCode || null,
          territoryName: data.territoryName || null,
          location: data.location ? String(data.location).substring(0, 200) : null,
          eventDate: data.date ? new Date(data.date) : null,
          status: data.status || 'DIRENCANAKAN',
          fileName: null,
          fileType: null,
          fileSize: 0,
          fileData: null,
          uploadedById,
          uploadedAt: data.uploadedAt ? new Date(data.uploadedAt) : new Date(item.updatedAt),
        },
      })
      pcMigrated++
    } catch (e: any) {
      console.error(`Fail ${item.key}: ${e.message}`)
    }
  }

  console.log('\n=== Summary ===')
  console.log(`PROGRAM_DOCUMENT: ${migrated} migrated, ${skipped} skipped, ${failed} failed`)
  console.log(`PROGRAM_CONTENT: ${pcMigrated} migrated, ${pcSkipped} skipped`)
  console.log('\nDone. Data lama TIDAK dihapus dari SystemSetting (silakan hapus manual kalau sudah OK).')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
