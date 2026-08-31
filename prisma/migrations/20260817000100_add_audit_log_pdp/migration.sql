-- AlterTable: tambah kolom isDPO di User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDPO" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorTerritory" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceLabel" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_status_idx" ON "AuditLog"("status");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: DataAccessRequest
CREATE TABLE IF NOT EXISTS "DataAccessRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "requestorId" TEXT NOT NULL,
    "requestorName" TEXT NOT NULL,
    "requestorPhone" TEXT,
    "requestorEmail" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "handlerId" TEXT,
    "handlerNotes" TEXT,
    "response" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DataAccessRequest_requestNumber_key" ON "DataAccessRequest"("requestNumber");
CREATE INDEX IF NOT EXISTS "DataAccessRequest_requestorId_idx" ON "DataAccessRequest"("requestorId");
CREATE INDEX IF NOT EXISTS "DataAccessRequest_handlerId_idx" ON "DataAccessRequest"("handlerId");
CREATE INDEX IF NOT EXISTS "DataAccessRequest_status_idx" ON "DataAccessRequest"("status");
CREATE INDEX IF NOT EXISTS "DataAccessRequest_type_idx" ON "DataAccessRequest"("type");

ALTER TABLE "DataAccessRequest" ADD CONSTRAINT "DataAccessRequest_requestorId_fkey"
    FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DataAccessRequest" ADD CONSTRAINT "DataAccessRequest_handlerId_fkey"
    FOREIGN KEY ("handlerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
