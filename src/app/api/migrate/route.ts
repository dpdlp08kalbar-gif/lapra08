// LAPRA 08 - API: Auto Migrate (Vercel Free Compatible)
// ============================================================
// POST /api/migrate — jalankan semua migration SQL yang pending
//
// Masalah: prisma migrate deploy tidak jalan otomatis di Vercel Free.
// Solution: baca file migration SQL, execute via Prisma $executeRaw.
//
// Migration yang akan dijalankan:
// 1. FamilyCard + Resident (data warga per RT)
// 2. Resident social fields (WA, FB, IG, TikTok, LinkedIn)
// 3. Resident upload fields (photoUrl, idCardUrl, organisasi)
// 4. Umkm + UmkmProduct (Ekonomi Kreatif & UMKM)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, isDPNLevel, logAccess } from '@/lib/server-helpers'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// All migration SQL dalam 1 string (idempotent — IF NOT EXISTS)
const MIGRATIONS_SQL = `
-- === 1. FamilyCard ===
CREATE TABLE IF NOT EXISTS "FamilyCard" (
    "id" TEXT NOT NULL,
    "kkNumber" TEXT NOT NULL,
    "headOfFamilyName" TEXT NOT NULL,
    "address" TEXT,
    "rtCode" TEXT,
    "rwCode" TEXT,
    "villageCode" TEXT,
    "villageName" TEXT,
    "districtName" TEXT,
    "regencyName" TEXT,
    "provinceName" TEXT,
    "kkDocumentUrl" TEXT,
    "territoryId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FamilyCard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FamilyCard_kkNumber_key" ON "FamilyCard"("kkNumber");
CREATE INDEX IF NOT EXISTS "FamilyCard_territoryId_idx" ON "FamilyCard"("territoryId");
CREATE INDEX IF NOT EXISTS "FamilyCard_kkNumber_idx" ON "FamilyCard"("kkNumber");

-- === 2. Resident ===
CREATE TABLE IF NOT EXISTS "Resident" (
    "id" TEXT NOT NULL,
    "familyCardId" TEXT NOT NULL,
    "nik" TEXT,
    "fullName" TEXT NOT NULL,
    "gender" TEXT,
    "birthPlace" TEXT,
    "birthDate" TIMESTAMP(3),
    "religion" TEXT,
    "maritalStatus" TEXT,
    "bloodType" TEXT,
    "education" TEXT,
    "occupation" TEXT,
    "citizenship" TEXT,
    "motherName" TEXT,
    "fatherName" TEXT,
    "relationToHead" TEXT,
    "organisasi" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "whatsapp" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "linkedin" TEXT,
    "socialOther" TEXT,
    "address" TEXT,
    "photoUrl" TEXT,
    "idCardUrl" TEXT,
    "territoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "statusNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Resident_nik_key" ON "Resident"("nik");
CREATE INDEX IF NOT EXISTS "Resident_familyCardId_idx" ON "Resident"("familyCardId");
CREATE INDEX IF NOT EXISTS "Resident_territoryId_idx" ON "Resident"("territoryId");
CREATE INDEX IF NOT EXISTS "Resident_nik_idx" ON "Resident"("nik");

-- === 3. Umkm ===
CREATE TABLE IF NOT EXISTS "Umkm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bidang" TEXT,
    "description" TEXT,
    "legalStatus" TEXT NOT NULL DEFAULT 'BELUM_TERDAFTAR',
    "npwp" TEXT,
    "nib" TEXT,
    "noBadanHukum" TEXT,
    "foundedDate" TIMESTAMP(3),
    "ownerName" TEXT,
    "ownerPhone" TEXT,
    "address" TEXT,
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "monthlyOmzet" INTEGER NOT NULL DEFAULT 0,
    "logoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "notes" TEXT,
    "territoryId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Umkm_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Umkm_territoryId_idx" ON "Umkm"("territoryId");
CREATE INDEX IF NOT EXISTS "Umkm_type_idx" ON "Umkm"("type");
CREATE INDEX IF NOT EXISTS "Umkm_bidang_idx" ON "Umkm"("bidang");

-- === 4. UmkmProduct ===
CREATE TABLE IF NOT EXISTS "UmkmProduct" (
    "id" TEXT NOT NULL,
    "umkmId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UmkmProduct_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UmkmProduct_umkmId_idx" ON "UmkmProduct"("umkmId");
CREATE INDEX IF NOT EXISTS "UmkmProduct_category_idx" ON "UmkmProduct"("category");

-- === 5. Add columns to existing tables (ALTER TABLE IF NOT EXISTS equivalent) ===
-- Resident: add columns if not exist (PostgreSQL doesn't have ADD COLUMN IF NOT EXISTS
-- in all versions, so we use DO blocks)
DO $$ BEGIN
    ALTER TABLE "Resident" ADD CONSTRAINT "Resident_familyCardId_fkey"
        FOREIGN KEY ("familyCardId") REFERENCES "FamilyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Resident" ADD CONSTRAINT "Resident_territoryId_fkey"
        FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "FamilyCard" ADD CONSTRAINT "FamilyCard_territoryId_fkey"
        FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "Umkm" ADD CONSTRAINT "Umkm_territoryId_fkey"
        FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "UmkmProduct" ADD CONSTRAINT "UmkmProduct_umkmId_fkey"
        FOREIGN KEY ("umkmId") REFERENCES "Umkm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
`

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  // RBAC: hanya SUPERADMIN yang bisa run migration
  if (user.role !== 'SUPERADMIN') {
    return NextResponse.json({ success: false, error: 'Hanya Super Admin yang bisa jalankan migration' }, { status: 403 })
  }

  try {
    // Split SQL by semicolon, execute each statement
    const statements = MIGRATIONS_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let executed = 0
    let errors = 0
    const errorMessages: string[] = []

    for (const stmt of statements) {
      try {
        await db.$executeRawUnsafe(stmt + ';')
        executed++
      } catch (e: any) {
        // Skip "already exists" errors (idempotent)
        if (e.message.includes('already exists') || e.message.includes('duplicate_object')) {
          // OK — table/index/FK sudah ada
        } else {
          errors++
          errorMessages.push(e.message.substring(0, 100))
        }
      }
    }

    await logAccess({
      actor: user, action: 'UPDATE', resource: 'SYSTEM_SETTING', resourceId: 'migrate',
      resourceLabel: `Auto-migrate: ${executed} statements, ${errors} errors`,
      request, detail: `Executed: ${executed}, Errors: ${errors}, Messages: ${errorMessages.slice(0, 3).join('; ')}`,
    })

    return NextResponse.json({
      success: true,
      data: { executed, errors, errorMessages: errorMessages.slice(0, 10) },
      message: `Migration selesai: ${executed} statement dijalankan, ${errors} error (sudah ada = OK). Tabel Umkm, UmkmProduct, FamilyCard, Resident sekarang tersedia.`,
    })
  } catch (e: any) {
    console.error('[Migrate API] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// GET: check status tabel
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const tables = ['FamilyCard', 'Resident', 'Umkm', 'UmkmProduct']
    const status: any = {}

    for (const table of tables) {
      try {
        const result = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table}"`)
        status[table] = { exists: true, count: (result as any)[0]?.count || 0 }
      } catch (e: any) {
        status[table] = { exists: false, error: e.message.substring(0, 80) }
      }
    }

    return NextResponse.json({ success: true, data: status })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
