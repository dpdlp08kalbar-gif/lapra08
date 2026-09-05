-- CreateTable: Umkm (Ekonomi Kreatif & UMKM) — per DPN/DPD/DPC
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

ALTER TABLE "Umkm" ADD CONSTRAINT "Umkm_territoryId_fkey"
    FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Umkm" ADD CONSTRAINT "Umkm_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: UmkmProduct (katalog produk per usaha)
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

ALTER TABLE "UmkmProduct" ADD CONSTRAINT "UmkmProduct_umkmId_fkey"
    FOREIGN KEY ("umkmId") REFERENCES "Umkm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UmkmProduct" ADD CONSTRAINT "UmkmProduct_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
