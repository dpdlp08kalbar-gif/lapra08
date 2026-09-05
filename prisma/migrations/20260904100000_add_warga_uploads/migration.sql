-- Add new columns for FamilyCard & Resident
-- Source: User request untuk update struktur form Data Warga
--   - Upload Dokumen KK (PDF/JPG) per KK
--   - Upload Pas Foto (preview) per anggota
--   - Upload KTP (PDF/JPG) per anggota
--   - Kegiatan Organisasi yang Diikuti per anggota
--   - Usia dihitung otomatis (computed in UI from birthDate, no DB column)

-- FamilyCard: kkDocumentUrl (TEXT, base64 data URL)
ALTER TABLE "FamilyCard" ADD COLUMN IF NOT EXISTS "kkDocumentUrl" TEXT;

-- Resident: photoUrl, idCardUrl, organisasi
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "idCardUrl" TEXT;
ALTER TABLE "Resident" ADD COLUMN IF NOT EXISTS "organisasi" TEXT;
