-- CreateTable: AuditLog (UU PDP No. 27/2022 Pasal 17)
-- NOTE: Tidak ada ALTER TABLE User karena isDPO field dihapus dari schema
-- DPO assignments disimpan di SystemSetting key='dpo_assignments'
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

-- CreateTable: DataAccessRequest (UU PDP No. 27/2022 Pasal 5-13)
-- NOTE: Tidak ada FK relation ke User — raw userId string untuk avoid migration complexity
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
