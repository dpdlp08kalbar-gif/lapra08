-- Add social media fields to Resident
-- Source: User request untuk tambah kolom isian:
--   - Nomor Telepon (sudah ada: phone)
--   - WhatsApp
--   - Facebook, Instagram, TikTok, LinkedIn
--   - Medsos Lainnya (Telegram, Twitter/X, YouTube, dll)

ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "facebook" TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "tiktok" TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "linkedin" TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "socialOther" TEXT;
