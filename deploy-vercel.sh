#!/bin/bash
# LAPRA 08 - Deploy Script untuk Vercel
# ============================================================
# Cara pakai:
# 1. Buka terminal di komputer Anda
# 2. Pastikan sudah install Node.js (https://nodejs.org)
# 3. Install Vercel CLI: npm install -g vercel
# 4. Login Vercel: vercel login
# 5. Clone repo: git clone https://github.com/dpdlp08kalbar-gif/lapra08.git
# 6. cd lapra08
# 7. Jalankan script ini: bash deploy-vercel.sh
# ============================================================

set -e

echo "🚀 LAPRA 08 - Deploy ke Vercel Production"
echo "============================================"
echo ""

# Cek apakah vercel CLI terinstall
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI belum terinstall"
    echo "   Jalankan: npm install -g vercel"
    exit 1
fi

# Cek apakah sudah login
echo "1️⃣  Cek login status..."
if ! vercel whoami &> /dev/null; then
    echo "❌ Belum login ke Vercel"
    echo "   Jalankan: vercel login"
    exit 1
fi
echo "✅ Sudah login sebagai: $(vercel whoami 2>&1 | tail -1)"
echo ""

# Cek apakah ada koneksi ke project
echo "2️⃣  Cek project link..."
if [ ! -f ".vercel/project.json" ]; then
    echo "⚠️  Project belum di-link. Menjalankan vercel link..."
    vercel link
fi
echo "✅ Project sudah di-link"
echo ""

# Install dependencies
echo "3️⃣  Install dependencies..."
npm install
echo "✅ Dependencies terinstall"
echo ""

# Generate Prisma
echo "4️⃣  Generate Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Deploy ke production
echo "5️⃣  Deploy ke Vercel Production..."
echo "   (ini akan memakan 3-5 menit)"
echo ""
vercel --prod --yes
echo ""

echo "============================================"
echo "🎉 DEPLOY SELESAI!"
echo "============================================"
echo ""
echo "🌐 URL Production: https://lapra08.vercel.app"
echo ""
echo "⚠️  Setelah deploy selesai:"
echo "   1. Buka https://lapra08.vercel.app"
echo "   2. Hard refresh: Ctrl+Shift+R (Windows) atau Cmd+Shift+R (Mac)"
echo "   3. Login dan cek menu Survei & Polling"
echo "   4. Pastikan tombol 'Atur Keyword' SUDAH HILANG"
echo ""
