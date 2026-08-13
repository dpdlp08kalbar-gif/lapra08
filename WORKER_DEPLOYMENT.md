# LAPRA 08 - Worker Deployment Guide (PHASE 1)

The worker process is required to:
1. Process opinion-scrape jobs (Invidious + Google News + Xenova AI)
2. Process broadcast-send jobs (Baileys WhatsApp gateway)
3. Maintain persistent Baileys WebSocket connection to WhatsApp servers

Vercel serverless **cannot** run the worker (no persistent processes, no filesystem).
Deploy the worker separately on Railway / Fly.io / Render / VPS.

---

## 🚀 Quick Deploy on Railway (recommended, free $5/mo credit)

### Step 1: Provision Upstash Redis (free tier)
1. Go to https://console.upstash.com/
2. Create new Redis database (region: same as your Neon DB → Singapore)
3. Copy the **`UPSTASH_REDIS_URL`** (format: `redis://default:xxx@xxx.upstash.io:6379`)
   - Note: BullMQ needs the **native Redis URL**, NOT the REST URL.

### Step 2: Deploy Worker on Railway
1. Go to https://railway.app → New Project → Deploy from GitHub repo
2. Select `dpdlp08kalbar-gif/lapra08` repo
3. Railway auto-detects Node.js. Configure:
   - **Build Command**: `npm install && npm run build:worker`
   - **Start Command**: `npm run worker:prod`
4. Set Environment Variables:
   ```
   UPSTASH_REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
   DATABASE_URL=postgresql://neondb_owner:xxx@ep-lingering-unit-az9uc0ms-pooler...neon.tech/neondb?sslmode=require
   BAILEYS_AUTH_DIR=/data/baileys-auth
   TRANSFORMERS_CACHE=/data/models
   INVIDIOUS_HOST=https://your-invidious.example.com  (optional, self-host for reliability)
   ```
5. Add a **Volume** (Mount Path: `/data`, Size: 5GB) for persistent Baileys auth + model cache.
6. Deploy. Worker will start and listen for jobs.

### Step 3: Set Vercel Environment Variables
Go to https://vercel.com/dpdlp08kalbar-gif/lapra08/settings/environment-variables and add:
```
UPSTASH_REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
```
*(Same value as Railway worker.)*
Trigger redeploy on Vercel.

### Step 4: First-time WhatsApp Authentication
1. Worker is running but Baileys is NOT connected (no auth yet).
2. To get the QR code: SSH into Railway worker container, or call the (future) `/api/whatsapp/qr` endpoint.
3. Scan QR with your phone (WhatsApp → Settings → Linked Devices → Link a Device).
4. Auth state is saved to `/data/baileys-auth/` (persistent volume).
5. Worker is now ready to send WhatsApp messages.

---

## 🪰 Alternative: Fly.io Deploy

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Create app
fly launch --no-deploy --name lapra08-worker

# Configure fly.toml:
# [mount]
#   source = "data"
#   destination = "/data"

# Set secrets
fly secrets set UPSTASH_REDIS_URL="redis://..."
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set BAILEYS_AUTH_DIR="/data/baileys-auth"
fly secrets set TRANSFORMERS_CACHE="/data/models"

# Deploy
fly deploy
```

---

## 🖥️ Alternative: VPS Deploy (DigitalOcean / Hetzner / Vultr)

### Step 1: SSH into VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Install Node 20+ & git clone
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

cd /opt
git clone https://github.com/dpdlp08kalbar-gif/lapra08.git
cd lapra08
npm install
npm run build:worker

mkdir -p /var/lib/lapra08/baileys-auth
mkdir -p /var/lib/lapra08/models
```

### Step 3: Create `.env` file
```bash
cat > /opt/lapra08/.env << 'EOF'
UPSTASH_REDIS_URL=redis://default:xxx@xxx.upstash.io:6379
DATABASE_URL=postgresql://neondb_owner:xxx@ep-lingering-unit-az9uc0ms-pooler...neon.tech/neondb?sslmode=require
BAILEYS_AUTH_DIR=/var/lib/lapra08/baileys-auth
TRANSFORMERS_CACHE=/var/lib/lapra08/models
EOF
```

### Step 4: Setup systemd service
```bash
cat > /etc/systemd/system/lapra08-worker.service << 'EOF'
[Unit]
Description=LAPRA 08 Worker (BullMQ + Baileys + Xenova)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/lapra08
EnvironmentFile=/opt/lapra08/.env
ExecStart=/usr/bin/node /opt/lapra08/dist/worker/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/lapra08-worker.log
StandardError=append:/var/log/lapra08-worker.error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable lapra08-worker
systemctl start lapra08-worker
systemctl status lapra08-worker
tail -f /var/log/lapra08-worker.log
```

---

## 🧪 Verify Worker is Running

### Health Check
Once worker is running, you should see logs:
```
🚀 LAPRA 08 Worker starting...
   Redis: redis://default:****@xxx.upstash.io:6379
📋 Worker ready. Waiting for jobs...
   - opinion-scrape queue: listening
   - broadcast-send queue: listening (concurrency=5)
   - broadcast-bulk queue: listening
   - Baileys client: will initialize on first broadcast job
```

### Test Opinion Scrape
1. Login to LAPRA 08 (https://lapra08.vercel.app) as `superadmin`.
2. Go to Komunikasi & Command Center → Tab 1 "Opini Publik Auto-Scanner".
3. Click "Mulai Scan Sekarang".
4. Should see response: "Scan dijadwalkan. Worker akan memproses dalam beberapa detik..."
5. Check worker logs — should show `[ScrapeWorker] Job xxx | trigger=manual`.
6. After ~10-20s (first-time model download), refresh page → new opinion links should appear.

### Test Broadcast Send
1. Add at least 1 Contact with `whatsappOptIn=true` and valid Indonesian phone.
2. Go to Komunikasi & Command Center → Tab 3 "Broadcast Composer".
3. Create a broadcast targeting that contact.
4. Click "Proses Antrian".
5. Worker should pick up the send job → Baileys sends → BroadcastMessage.status becomes `SENT`.

---

## 🐛 Troubleshooting

### Worker can't connect to Redis
- Verify `UPSTASH_REDIS_URL` format: must start with `redis://` (not `https://`).
- For TLS-enabled Upstash: use `rediss://` (with double s).
- Check Upstash dashboard → allowed IPs (should allow all, or add your worker IP).

### Xenova model download fails
- Worker needs internet access to `huggingface.co`.
- Models are ~125MB (sentiment) + ~120MB (embedding quantized) on first run.
- After download, cached in `TRANSFORMERS_CACHE` directory.

### Baileys won't connect
- First time: scan QR code from worker logs (or `/api/whatsapp/qr` once implemented).
- Auth state must persist between worker restarts (BAILEYS_AUTH_DIR must be on a persistent volume).
- If auth state lost: re-scan QR.

### YouTube scraping fails
- Invidious public instances are often down.
- **Best solution**: self-host Invidious on Railway (one-click deploy: https://github.com/iv-org/invidious).
- Set `INVIDIOUS_HOST=https://your-invidious.app` env var on worker.

### Database connection issues
- Verify `DATABASE_URL` matches Vercel's (same Neon DB).
- Connection pooler URL (`-pooler` suffix) is fine for worker too.
- For high-concurrency workers, increase Neon's max connections (paid plan).

---

## 📋 Phase 1 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Web App)                          │
│                                                              │
│  Next.js App Router                                          │
│  ├── /api/opinion-links    POST → enqueue → return 202      │
│  ├── /api/audit-ai/scans  POST → enqueue → return 202      │
│  ├── /api/broadcast-*     POST → enqueue → return 202      │
│  └── GET endpoints → read from Neon DB directly             │
│                                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ BullMQ enqueue
                   ▼
┌──────────────────────────────────────────────────────────────┐
│              UPSTASH REDIS (Free Tier)                       │
│                                                              │
│  Queues: opinion-scrape, broadcast-send, broadcast-bulk      │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ BullMQ dequeue
                   ▼
┌──────────────────────────────────────────────────────────────┐
│              WORKER (Railway / Fly.io / VPS)                 │
│                                                              │
│  src/worker/index.ts                                         │
│  ├── ScrapeWorker: scrapeAuto() → Xenova AI → DB save       │
│  ├── BroadcastWorker: Baileys send → DB update              │
│  └── BulkWorker: iterate QUEUED messages → enqueue sends     │
│                                                              │
│  Persistent state:                                            │
│  ├── Baileys auth (./baileys-auth/)                          │
│  └── Xenova model cache (./models/)                          │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│            NEON POSTGRESQL (+ extensions)                    │
│                                                              │
│  Extensions: postgis, vector, pg_trgm, unaccent              │
│                                                              │
│  Tables: PublicOpinionLink (with geoPoint, embedding, tsv),  │
│          Broadcast, BroadcastMessage (with jid, baileysId),  │
│          AuditScan, AuditComplaint, Contact, etc.            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Phase 1 Acceptance Criteria Checklist

- [ ] SQL migration run successfully on Neon (4 extensions enabled, 7 columns added, 4 indexes created)
- [ ] Prisma schema updated and `prisma generate` succeeds
- [ ] `@xenova/transformers` installed and `xenova-engine.ts` compiles
- [ ] `bullmq` + `ioredis` installed and `queue.ts` compiles
- [ ] `@whiskeysockets/baileys` installed and `baileys-client.ts` compiles
- [ ] `rss-parser` installed and `auto-scraper.ts` no longer references `/home/z/.venv/bin/yt-dlp`
- [ ] `broadcast-engine.ts` no longer contains `Math.random()` simulation
- [ ] Worker `src/worker/index.ts` compiles via `npm run build:worker`
- [ ] Vercel `POST /api/opinion-links` returns 202 with `jobId` when Redis configured
- [ ] Vercel `POST /api/audit-ai/scans` returns 202 with `jobId` when Redis configured
- [ ] Worker deployed on Railway/Fly.io and logs show "Worker ready"
- [ ] Manual scan test: clicking "Mulai Scan Sekarang" triggers worker job within 5s
- [ ] Manual broadcast test: sending to a test contact triggers Baileys send (after QR auth)
- [ ] Vercel build still succeeds (no new TypeScript errors introduced)
