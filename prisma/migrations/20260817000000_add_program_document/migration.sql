-- CreateTable
CREATE TABLE IF NOT EXISTS "ProgramDocument" (
    "id" TEXT NOT NULL,
    "docKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "territoryId" TEXT,
    "territoryCode" TEXT,
    "territoryName" TEXT,
    "location" TEXT,
    "eventDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DIRENCANAKAN',
    "fileName" TEXT,
    "fileType" TEXT,
    "fileMimeType" TEXT,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "fileHash" TEXT,
    "fileData" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProgramDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProgramDocument_category_level_idx" ON "ProgramDocument"("category", "level");
CREATE INDEX IF NOT EXISTS "ProgramDocument_territoryId_idx" ON "ProgramDocument"("territoryId");
CREATE INDEX IF NOT EXISTS "ProgramDocument_uploadedById_idx" ON "ProgramDocument"("uploadedById");
CREATE INDEX IF NOT EXISTS "ProgramDocument_status_idx" ON "ProgramDocument"("status");
CREATE INDEX IF NOT EXISTS "ProgramDocument_fileHash_idx" ON "ProgramDocument"("fileHash");
CREATE INDEX IF NOT EXISTS "ProgramDocument_category_level_status_idx" ON "ProgramDocument"("category", "level", "status");

-- CreateIndex (unique)
CREATE UNIQUE INDEX IF NOT EXISTS "ProgramDocument_docKey_key" ON "ProgramDocument"("docKey");

-- AddForeignKey
ALTER TABLE "ProgramDocument" ADD CONSTRAINT "ProgramDocument_territoryId_fkey"
    FOREIGN KEY ("territoryId") REFERENCES "Territory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramDocument" ADD CONSTRAINT "ProgramDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
