-- ============================================================
-- LAPRA 08 - PHASE 1 DATABASE UPGRADE
-- Enable PostGIS + pgvector + pg_trgm + add spatial/vector columns
-- ============================================================
-- Run on Neon SQL Editor:
--   https://console.neon.tech/app/projects/{project_id}/sql_editor
--
-- Idempotent: safe to run multiple times.
-- ============================================================

BEGIN;

-- === 1. Enable PostgreSQL extensions ===
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
-- unaccent is bundled with PostgreSQL contrib; should work on Neon free tier

-- === 2. Add new columns to PublicOpinionLink ===
ALTER TABLE "PublicOpinionLink"
  ADD COLUMN IF NOT EXISTS "geoPoint"        geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS "embedding"       vector(384),
  ADD COLUMN IF NOT EXISTS "tsv"              tsvector,
  ADD COLUMN IF NOT EXISTS "language"        text         DEFAULT 'id',
  ADD COLUMN IF NOT EXISTS "rawPayload"      jsonb,
  ADD COLUMN IF NOT EXISTS "confidenceScore" float         DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "topicCluster"    text;

-- === 3. tsvector trigger (auto-update on INSERT/UPDATE) ===
-- Use 'simple' config (Indonesian stemmer not built-in; can swap to 'indonesian'
-- if a custom FTS config is created in a later phase)
DROP FUNCTION IF EXISTS "PublicOpinionLink_tsv_trigger"() CASCADE;
CREATE FUNCTION "PublicOpinionLink_tsv_trigger"() RETURNS trigger AS $$
BEGIN
  NEW."tsv" :=
    setweight(to_tsvector('simple', coalesce(NEW.title,   '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS "PublicOpinionLink_tsv_update" ON "PublicOpinionLink";
CREATE TRIGGER "PublicOpinionLink_tsv_update"
  BEFORE INSERT OR UPDATE OF "title", "content" ON "PublicOpinionLink"
  FOR EACH ROW EXECUTE FUNCTION "PublicOpinionLink_tsv_trigger"();

-- Backfill existing rows so tsv is populated immediately
UPDATE "PublicOpinionLink"
SET "title" = "title"  -- forces trigger to run
WHERE "tsv" IS NULL;

-- === 4. GIN index for tsvector (full-text search) ===
CREATE INDEX IF NOT EXISTS "PublicOpinionLink_tsv_idx"
  ON "PublicOpinionLink" USING GIN ("tsv");

-- === 5. GIST index for geoPoint (spatial queries: ST_DWithin, ST_Distance) ===
CREATE INDEX IF NOT EXISTS "PublicOpinionLink_geoPoint_idx"
  ON "PublicOpinionLink" USING GIST ("geoPoint");

-- === 6. HNSW index for embedding (cosine similarity, fast KNN) ===
-- HNSW is preferred over IVFFlat for datasets under ~1M rows (no training step)
CREATE INDEX IF NOT EXISTS "PublicOpinionLink_embedding_idx"
  ON "PublicOpinionLink" USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- === 7. GIN trigram index for fuzzy search on title (LIKE '%prabowo%') ===
CREATE INDEX IF NOT EXISTS "PublicOpinionLink_title_trgm_idx"
  ON "PublicOpinionLink" USING GIN ("title" gin_trgm_ops);

-- === 8. Add columns to BroadcastMessage for Baileys tracking ===
ALTER TABLE "BroadcastMessage"
  ADD COLUMN IF NOT EXISTS "baileysMessageId" text,
  ADD COLUMN IF NOT EXISTS "jid"               text;

-- === 9. Add columns to Broadcast for queue tracking ===
ALTER TABLE "Broadcast"
  ADD COLUMN IF NOT EXISTS "queueJobId"  text,
  ADD COLUMN IF NOT EXISTS "queueStatus" text DEFAULT 'PENDING'; -- PENDING | QUEUED | PROCESSING | COMPLETED | FAILED

COMMIT;

-- ============================================================
-- VERIFICATION (run separately after migration)
-- ============================================================
-- SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis','vector','pg_trgm','unaccent');
--
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'PublicOpinionLink'
--   AND column_name IN ('geoPoint','embedding','tsv','language','rawPayload','confidenceScore','topicCluster')
-- ORDER BY column_name;
--
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'PublicOpinionLink' AND indexname LIKE '%_idx';
-- ============================================================
