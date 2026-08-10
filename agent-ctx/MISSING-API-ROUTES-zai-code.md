# Task: Create 11 missing API route files

## Task ID
MISSING-API-ROUTES

## Agent
Z.ai Code (primary)

## Summary
Created 11 missing Next.js API route files at /home/z/my-project/src/app/api/ as specified.

## Files created

1. `src/app/api/organization/upload/route.ts`
   - POST FormData to upload photo (image, 5MB) or idCard (image/PDF, 10MB) for OrgPosition
   - Saves files to /public/uploads/pengurus/
   - Updates `orgPosition.photoUrl` or `orgPosition.idCardUrl`
   - Uses `getUserFromRequest` + `getEditableTerritoryIds` for permission check
   - Deletes old file before overwriting

2. `src/app/api/finance/[id]/route.ts`
   - PUT: Update transaction with editScope check
   - DELETE: Delete transaction with editScope check + cleanup receipt file
   - Uses `FinanceTransaction` model

3. `src/app/api/broadcasts/[id]/route.ts`
   - PUT: Update broadcast (owner or DPN-level only)
   - DELETE: Delete broadcast + cleanup image/video files
   - Uses `Broadcast` model

4. `src/app/api/news/search/route.ts`
   - GET: Returns suggested queries + LAPRA keyword list
   - POST: Searches Google via `zai.functions.invoke('web_search', { query, num: 15 })`
   - Enriches results with `isRelevant` (LAPRA keyword match) & `alreadyAdded` (existing Announcement URLs)
   - Only SUPERADMIN/ADMIN_DPN

5. `src/app/api/news/fetch-content/route.ts`
   - POST: Fetches full article via `zai.functions.invoke('page_reader', { url })`
   - Returns: title, content (plain text from HTML), publishedTime, imageUrl
   - Strips scripts/styles, decodes HTML entities, extracts og:image
   - Only SUPERADMIN/ADMIN_DPN

6. `src/app/api/news/add/route.ts`
   - POST: Add single news to Announcement with `source=WEB_SYNC`
   - Checks duplicate by `sourceUrl` (returns 409 with existingId)
   - Defaults to Indonesia DPN territory if not specified
   - Builds content with attribution + source URL
   - Only SUPERADMIN/ADMIN_DPN

7. `src/app/api/profile-content/route.ts`
   - GET: List all profile content from SystemSetting (category=PROFILE_CONTENT)
   - POST: Create/update content (SUPERADMIN only)
   - DELETE: Delete content by key (SUPERADMIN only)

8. `src/app/api/profile-documents/route.ts`
   - GET: List documents by type (AD_ART|LEGALITAS)
   - POST: Upload document (FormData, PDF/JPG/PNG/DOC, 20MB, SUPERADMIN only)
   - Saves to /public/uploads/profile-docs/

9. `src/app/api/profile-documents/[id]/route.ts`
   - DELETE: Delete document + delete file (SUPERADMIN only)
   - Looks up by key, then by id

10. `src/app/api/sekretariat/[id]/route.ts`
    - PUT: Update location (preserves existing fields via merge)
    - DELETE: Delete location + cleanup photo file

11. `src/app/api/sekretariat/upload/route.ts`
    - POST FormData: upload photo for sekretariat location (image, 10MB)
    - Saves to /public/uploads/sekretariat/
    - Updates `location.photoUrl`, removes old photo

## Schema change
- Added `idCardUrl String?` field to `OrgPosition` model in `prisma/schema.prisma`
- Pushed schema via `bun run db:push` successfully

## Patterns followed
- `import { db } from '@/lib/db'`
- `import { getUserFromRequest, getEditableTerritoryIds, getViewableTerritoryIds } from '@/lib/server-helpers'`
- `import * as fs from 'fs'` / `import * as path from 'path'`
- `import ZAI from 'z-ai-web-dev-sdk'` (server-only)
- Next.js 16 route signature: `{ params }: { params: Promise<{ id: string }> }` with `await params`
- Consistent error response: `{ success: false, error: string }`
- Consistent success response: `{ success: true, data, message }`
