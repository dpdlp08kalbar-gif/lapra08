# REFERENSI: Menu Komunikasi & Broadcast (untuk pembuatan ulang)

## Struktur Saat Ini (sebelum dihapus)

### Komponen Utama
- File: `src/components/menus/communication-menu.tsx`
- Export: `CommunicationMenu`
- Import oleh: `src/app/page.tsx` dan `src/components/menus/portal-menus.tsx`

### 3 Tab di Menu Ini:

#### Tab 1: Siaran & Broadcast (`BroadcastComposerTab`)
- **Fungsi:** Multi-channel broadcast (WA, FB, IG, Email)
- **Fitur:**
  - Template siap pakai
  - Audience segment
  - 8 gateway provider (Fonnte, Waboo, Wootalk, dll)
  - Konter isu dari opinion links
  - Queue processing + anti-banned tips
- **API:**
  - `/api/broadcast-composer` (GET templates, broadcasts, contacts_count)
  - `/api/broadcast-composer/[id]/stats`
  - `/api/broadcast-composer/[id]/queue`
  - `/api/broadcast-composer/gateway-providers`
  - `/api/broadcast-composer/targets`
  - `/api/message-templates`
  - `/api/audience-segments`

#### Tab 2: Dashboard Pemenangan (`DecisionDashboardTab`)
- **Fungsi:** Sintesis data untuk pengambil keputusan
- **Fitur:**
  - Status Elektoral (sentiment index)
  - KPI Cards (Total Berita, Positif, Negatif)
  - Tabel Ringkasan + Bar Chart
  - Auto-refresh 30 detik dengan Live badge
- **API:**
  - `/api/decision-dashboard`

#### Tab 3: Monitoring Berita (`OpinionScannerTab`)
- **Fungsi:** Scan berita LAPRA 08 dari 9 platform
- **Fitur:**
  - 9 platform: Google, Yahoo, Facebook, Instagram, TikTok, Twitter/X, LinkedIn, Pers Indonesia, YouTube
  - Platform selection grid (toggle)
  - Scan button (parallel scrape)
  - List berita dengan: platform icon, sentimen, priority, lokasi
  - Tombol per berita: Detail, Konter Isu, Auto-draft Survei, Hapus
  - Bulk Triage
  - Auto-Survey Batch + Preview
- **API:**
  - `/api/opinion-links` (GET list, POST scrape)
  - `/api/opinion-links/[id]` (PUT review, DELETE)
  - `/api/opinion-links/[id]/counter-issue` (POST generate draft konter isu)
  - `/api/opinion-links/bulk-triage` (POST)

### Helper Components (di file yang sama):
- `BroadcastStatsDialog` — dialog progress broadcast
- `GatewayProvidersDialog` — dialog kelola gateway provider

### Pre-warm API (fire saat mount):
```
/api/opinion-links?limit=100
/api/broadcast-composer?type=templates
/api/broadcast-composer?type=broadcasts
/api/broadcast-composer?type=contacts_count
/api/decision-dashboard
```

### Scraper (di `src/lib/`):
- `social-scraper.ts` — Google News RSS dengan site: filter untuk 8 platform
- `auto-scraper.ts` — YouTube via Invidious + Google News

### Sentiment Analysis:
- `src/lib/ai-engine.ts` — rule-based lexicon (NO Z.AI, NO API berbayar)
- `analyzeSentiment()`, `calculatePriority()`, `extractKeywords()`

### Share (di `src/lib/share-social.ts`):
- 8 platform: WhatsApp, Telegram, Facebook, Twitter/X, Instagram, Email, LinkedIn, Copy Link
- 13 popular groups (WA/Telegram)

### RBAC:
- SUPERADMIN/ADMIN_DPN: global
- ADMIN_DPD: provinsi sendiri
- ADMIN_DPC: kab/kota sendiri

### Constraint:
- 100% Vercel Free
- No external API berbayar (no Z.AI/GPT/Claude)
- No DB migration (SystemSetting pattern)
- UU PDP compliance (PII hashed/masked)
