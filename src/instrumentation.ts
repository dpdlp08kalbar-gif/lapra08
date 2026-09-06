// LAPRA 08 - Instrumentation file
// Auto-starts background scheduler + auto-migrate saat Next.js server start
// File ini otomatis dipanggil oleh Next.js saat server boot

// === AUTO-MIGRATE: jalankan CREATE TABLE IF NOT EXISTS saat server start ===
// Fix: tabel Umkm, FamilyCard, Resident belum ada di production Neon PostgreSQL
const AUTO_MIGRATE_SQL = `
CREATE TABLE IF NOT EXISTS "FamilyCard" (
    "id" TEXT NOT NULL, "kkNumber" TEXT NOT NULL, "headOfFamilyName" TEXT NOT NULL,
    "address" TEXT, "rtCode" TEXT, "rwCode" TEXT, "villageCode" TEXT, "villageName" TEXT,
    "districtName" TEXT, "regencyName" TEXT, "provinceName" TEXT, "kkDocumentUrl" TEXT,
    "territoryId" TEXT NOT NULL, "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FamilyCard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FamilyCard_kkNumber_key" ON "FamilyCard"("kkNumber");
CREATE INDEX IF NOT EXISTS "FamilyCard_territoryId_idx" ON "FamilyCard"("territoryId");
CREATE INDEX IF NOT EXISTS "FamilyCard_kkNumber_idx" ON "FamilyCard"("kkNumber");

CREATE TABLE IF NOT EXISTS "Resident" (
    "id" TEXT NOT NULL, "familyCardId" TEXT NOT NULL, "nik" TEXT, "fullName" TEXT NOT NULL,
    "gender" TEXT, "birthPlace" TEXT, "birthDate" TIMESTAMP(3), "religion" TEXT,
    "maritalStatus" TEXT, "bloodType" TEXT, "education" TEXT, "occupation" TEXT,
    "citizenship" TEXT, "motherName" TEXT, "fatherName" TEXT, "relationToHead" TEXT,
    "organisasi" TEXT, "phone" TEXT, "email" TEXT, "whatsapp" TEXT, "facebook" TEXT,
    "instagram" TEXT, "tiktok" TEXT, "linkedin" TEXT, "socialOther" TEXT,
    "address" TEXT, "photoUrl" TEXT, "idCardUrl" TEXT, "territoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "statusNote" TEXT, "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Resident_nik_key" ON "Resident"("nik");
CREATE INDEX IF NOT EXISTS "Resident_familyCardId_idx" ON "Resident"("familyCardId");
CREATE INDEX IF NOT EXISTS "Resident_territoryId_idx" ON "Resident"("territoryId");
CREATE INDEX IF NOT EXISTS "Resident_nik_idx" ON "Resident"("nik");

CREATE TABLE IF NOT EXISTS "Umkm" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL,
    "bidang" TEXT, "description" TEXT, "legalStatus" TEXT NOT NULL DEFAULT 'BELUM_TERDAFTAR',
    "npwp" TEXT, "nib" TEXT, "noBadanHukum" TEXT, "foundedDate" TIMESTAMP(3),
    "ownerName" TEXT, "ownerPhone" TEXT, "address" TEXT,
    "employeeCount" INTEGER NOT NULL DEFAULT 0, "monthlyOmzet" INTEGER NOT NULL DEFAULT 0,
    "logoUrl" TEXT, "status" TEXT NOT NULL DEFAULT 'AKTIF', "notes" TEXT,
    "territoryId" TEXT NOT NULL, "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Umkm_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Umkm_territoryId_idx" ON "Umkm"("territoryId");
CREATE INDEX IF NOT EXISTS "Umkm_type_idx" ON "Umkm"("type");
CREATE INDEX IF NOT EXISTS "Umkm_bidang_idx" ON "Umkm"("bidang");

CREATE TABLE IF NOT EXISTS "UmkmProduct" (
    "id" TEXT NOT NULL, "umkmId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "description" TEXT, "price" INTEGER NOT NULL DEFAULT 0, "unit" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0, "category" TEXT, "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UmkmProduct_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UmkmProduct_umkmId_idx" ON "UmkmProduct"("umkmId");
CREATE INDEX IF NOT EXISTS "UmkmProduct_category_idx" ON "UmkmProduct"("category");

DO $$ BEGIN ALTER TABLE "Resident" ADD CONSTRAINT "Resident_familyCardId_fkey" FOREIGN KEY ("familyCardId") REFERENCES "FamilyCard"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Resident" ADD CONSTRAINT "Resident_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "FamilyCard" ADD CONSTRAINT "FamilyCard_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Umkm" ADD CONSTRAINT "Umkm_territoryId_fkey" FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "UmkmProduct" ADD CONSTRAINT "UmkmProduct_umkmId_fkey" FOREIGN KEY ("umkmId") REFERENCES "Umkm"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
`

async function autoMigrate() {
  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const statements = AUTO_MIGRATE_SQL.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0 && !s.startsWith('--'))
    let executed = 0
    for (const stmt of statements) {
      try {
        await prisma.$executeRawUnsafe(stmt + ';')
        executed++
      } catch (e: any) {
        // Skip "already exists" errors (idempotent)
        if (!e.message.includes('already exists') && !e.message.includes('duplicate_object')) {
          console.warn('[Auto-Migrate] Statement error:', e.message.substring(0, 80))
        }
      }
    }
    console.log(`[Instrumentation] ✅ Auto-migrate: ${executed} statements executed`)
    await prisma.$disconnect()
  } catch (e: any) {
    console.error('[Instrumentation] ❌ Auto-migrate failed:', e.message?.substring(0, 100))
  }
}

export async function register() {
  // Only run on server side (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] LAPRA 08 server starting...')

    // === AUTO-MIGRATE: jalankan saat server start (no user intervensi) ===
    await autoMigrate()

    try {
      // Dynamic import to avoid loading during build
      const { startBackgroundScheduler, initializeDefaultJobs, runScheduledJobs } = await import('@/lib/agent-orchestrator')
      const { initDefaultEngineConfig } = await import('@/lib/broadcast-engine')

      // Initialize default jobs if not exist
      await initializeDefaultJobs()
      console.log('[Instrumentation] ✅ Background jobs initialized')

      // Initialize broadcast engine config
      await initDefaultEngineConfig()
      console.log('[Instrumentation] ✅ Broadcast engine config initialized')

      // Start background scheduler (auto-scrape every hour, recompute trust every 30min)
      startBackgroundScheduler()
      console.log('[Instrumentation] ✅ Background scheduler started (checking jobs every 5 minutes)')

      // Run due jobs immediately on startup (check if any are overdue)
      setTimeout(async () => {
        try {
          const result = await runScheduledJobs()
          if (result.jobsRun > 0) {
            console.log(`[Instrumentation] ✅ Initial job run: ${result.jobsRun} jobs executed`)
          } else {
            console.log('[Instrumentation] ℹ️ No due jobs at startup (next run scheduled)')
          }
        } catch (e: any) {
          console.error('[Instrumentation] Initial job run failed:', e.message)
        }
      }, 10000) // Wait 10s after startup for DB to be ready

    } catch (e: any) {
      console.error('[Instrumentation] ❌ Failed to start background scheduler:', e.message)
    }
  }
}
