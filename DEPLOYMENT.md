# LAPRA 08 - Deployment Guide (Vercel + Neon PostgreSQL + Resend Email)

## STEP 1: Setup Neon PostgreSQL (FREE)

1. Buka https://neon.tech → Sign up (gratis, pakai GitHub/Google)
2. Buat new project: name = "lapra08", region = Singapore (terdekat Indonesia)
3. Copy connection string: `postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/lapra08?sslmode=require`
4. Simpan connection string untuk Step 3

## STEP 2: Setup Resend Email (FREE 3.000/bulan)

1. Buka https://resend.com → Sign up (gratis)
2. Buka API Keys → Create API Key → Copy key (format: `re_xxxxxxxx`)
3. Setup domain (optional untuk custom sender) atau pakai default `onboarding@resend.dev`
4. Simpan API key untuk Step 3

## STEP 3: Setup Vercel Deployment (FREE)

1. Push kode ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "LAPRA 08 production ready"
   git remote add origin https://github.com/YOUR_USERNAME/lapra08.git
   git push -u origin main
   ```

2. Buka https://vercel.com → Sign up dengan GitHub
3. Import project dari GitHub repository
4. Di Vercel settings → Environment Variables, tambahkan:
   - `DATABASE_URL` = connection string Neon (Step 1)
   - `RESEND_API_KEY` = API key Resend (Step 2)
   - `RESEND_FROM_EMAIL` = `LAPRA 08 <noreply@lapra08.vercel.app>`
   - `NEXTAUTH_SECRET` = random string (generate di https://generate-secret.vercel.app/)
   - `NEXT_PUBLIC_APP_URL` = `https://lapra08.vercel.app`
   - `NODE_ENV` = `production`

5. Deploy → Vercel otomatis build & deploy
6. Akses di `https://lapra08.vercel.app`

## STEP 4: Migrasi Database SQLite → PostgreSQL

Setelah Vercel deployed:

```bash
# Update prisma/schema.prisma — ganti datasource:
# provider = "postgresql" (dari "sqlite")

# Jalankan migrasi ke Neon:
npx prisma db push

# Seed data awal:
npx tsx scripts/seed-territory.ts
npx tsx scripts/seed-users.ts
npx tsx scripts/seed-geospatial-population.ts
npx tsx scripts/setup-wa-gateway-scheduler.ts
npx tsx scripts/sync-gallery-videos.ts
```

## STEP 5: Custom Domain (opsional)

1. Beli domain (cth: lapra08.id) di Namecheap/Niagahoster
2. Di Vercel → Settings → Domains → Add domain
3. Update DNS nameserver di registrar domain
4. Vercel otomatis setup HTTPS

## STEP 6: Konfigurasi Email Sender (opsional)

Untuk custom email sender (cth: noreply@lapra08.id):
1. Di Resend dashboard → Domains → Add domain
2. Tambahkan DNS records yang Resend berikan
3. Setelah verified, update `RESEND_FROM_EMAIL`

## MONITORING

- Vercel Analytics: https://vercel.com/dashboard → Analytics
- Neon Dashboard: https://neon.tech/dashboard (monitor DB usage)
- Resend Dashboard: https://resend.com/dashboard (monitor email sent)

## BACKUP

- Neon auto-backup harian (free tier)
- Manual backup: `npx prisma db pull` untuk export schema
- Atau export via Neon dashboard

## TROUBLESHOOTING

Jika error "prisma/client not found":
```bash
npx prisma generate
```

Jika error "DATABASE_URL not set":
- Pastikan environment variable sudah ditambahkan di Vercel

Jika build error di Vercel:
- Cek log di Vercel dashboard → Functions → Logs
- Pastikan `next build` berjalan tanpa error lokal
