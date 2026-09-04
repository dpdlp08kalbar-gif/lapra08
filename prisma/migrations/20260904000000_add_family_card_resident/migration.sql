-- CreateTable: FamilyCard (Kartu Keluarga) — data warga per RT
-- Untuk input data warga dengan pengelompokan KK (Kartu Keluarga)
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
    "territoryId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FamilyCard_kkNumber_key" ON "FamilyCard"("kkNumber");
CREATE INDEX IF NOT EXISTS "FamilyCard_territoryId_idx" ON "FamilyCard"("territoryId");
CREATE INDEX IF NOT EXISTS "FamilyCard_kkNumber_idx" ON "FamilyCard"("kkNumber");

-- Add FK relation (deferred — use raw territoryId string)
-- Prisma akan handle FK di runtime jika relation aktif
ALTER TABLE "FamilyCard" ADD CONSTRAINT "FamilyCard_territoryId_fkey"
    FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Optional: link createdById → User
ALTER TABLE "FamilyCard" ADD CONSTRAINT "FamilyCard_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: Resident (Warga) — individu anggota KK
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
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
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

ALTER TABLE "Resident" ADD CONSTRAINT "Resident_familyCardId_fkey"
    FOREIGN KEY ("familyCardId") REFERENCES "FamilyCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Resident" ADD CONSTRAINT "Resident_territoryId_fkey"
    FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Resident" ADD CONSTRAINT "Resident_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
