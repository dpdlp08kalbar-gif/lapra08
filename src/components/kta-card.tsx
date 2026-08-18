// LAPRA 08 - KTA Digital Card Component
// Render KTA (Kartu Tanda Anggota) digital — PERSIS sama dengan KTA asli LAPRA 08
//
// Spesifikasi dari analisis VLM presisi:
// - Background: biru #D4E8F0 (atas ~60-65%) + merah #ED1C24 (bawah ~35-40%)
// - Garis pemisah: CONCAVE curve (depan) / CONVEX curve (belakang)
// - NO vertical stripe, NO border putih (edge-to-edge)
// - Logo: "Laskar" (script merah) + "PRABOWO" (Impact hitam) + "08" (merah) + siluet wajah
// - Foto: rounded rect, bg merah #ED1C24, lebar ~40-45% kartu
// - Globe: bottom-left, putih SOLID 100% opacity (bukan 40%)
// - QR: bottom-right, border putih 3px
// - Decorative lines: kiri atas (depan), kanan atas (belakang) — simetri diagonal
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, Printer, RefreshCw } from 'lucide-react'
import { useToastStore } from '@/lib/store'

interface KTACardData {
  ktaNumber: string
  fullName: string
  photoUrl: string | null
  level: string
  territoryName: string
  positionName: string
  validFromString: string
  validUntilString: string
  qrCodeDataUrl: string
}

// ============================================================
// CONSTANTS — warna & dimensi PERSIS dari VLM
// ============================================================
const KTA = {
  blueBg: '#C5DDE8',
  redBg: '#E6262C',
  blackText: '#1A1A1A',
  white: '#FFFFFF',
  decorativeLine: '#A8C5D4',
  globeLine: '#FFFFFF',
  globeLand: '#FFF0E8',
}

// ============================================================
// MAIN KTACard COMPONENT
// ============================================================
export function KTACard({ applicationId }: { applicationId: string }) {
  const addToast = useToastStore((s) => s.addToast)
  const [data, setData] = useState<KTACardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [side, setSide] = useState<'front' | 'back'>('front')
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/kta-card/${applicationId}`, {
      headers: { 'x-user-id': localStorage.getItem('auth-storage')
        ? JSON.parse(localStorage.getItem('auth-storage') || '{}').state?.user?.id || ''
        : '' },
    })
      .then(res => res.json())
      .then(json => {
        if (cancelled) return
        if (json.success) setData(json.data)
        else setError(json.error || 'Gagal memuat KTA')
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Gagal memuat KTA') })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [applicationId])

  const handleDownload = async () => {
    if (!cardRef.current) return
    try {
      addToast('Mengunduh KTA...', 'info')
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false })
      const link = document.createElement('a')
      link.download = `KTA_${data?.fullName || 'anggota'}_${data?.ktaNumber || ''}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      addToast('KTA berhasil diunduh', 'success')
    } catch (e: any) {
      addToast(`Gagal unduh: ${e.message}`, 'error')
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-600" /></div>
  if (error || !data) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-sm text-red-600">{error || 'Data KTA tidak tersedia'}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-1">
          <RefreshCw className="w-3 h-3" /> Coba Lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 print:space-y-0">
      <div className="flex gap-2 print:hidden">
        <Button size="sm" variant={side === 'front' ? 'default' : 'outline'} onClick={() => setSide('front')}>Depan</Button>
        <Button size="sm" variant={side === 'back' ? 'default' : 'outline'} onClick={() => setSide('back')}>Belakang</Button>
      </div>
      <div className="flex justify-center">
        <div ref={cardRef} className="kta-card relative shadow-2xl" style={{ width: '340px', height: '480px', borderRadius: '14px', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {side === 'front' ? <KTACardFront data={data} /> : <KTACardBack data={data} />}
        </div>
      </div>
      <div className="flex gap-2 justify-center print:hidden">
        <Button onClick={handleDownload} className="gap-1"><Download className="w-4 h-4" /> Download PNG</Button>
        <Button variant="outline" onClick={() => window.print()} className="gap-1"><Printer className="w-4 h-4" /> Print</Button>
      </div>
    </div>
  )
}

// ============================================================
// KTA SAMPLE CARD — template kosong untuk preview
// ============================================================
export function KTASampleCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="kta-card-sample relative shadow-lg" style={{ width: '220px', height: '310px', borderRadius: '10px', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <KTATemplateFront />
        </div>
        <div className="text-xs text-muted-foreground text-center max-w-xs">
          <strong>Template KTA Digital</strong>
          <br />
          Nomor: <code className="font-mono bg-muted px-1 rounded">08[LEVEL][WILAYAH]P[URUT]</code>
          <br />
          Masa berlaku: 1 Januari - 31 Desember {new Date().getFullYear()}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col items-center gap-2">
          <div className="kta-card-sample relative shadow-lg" style={{ width: '280px', height: '395px', borderRadius: '12px', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <KTATemplateFront />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Sisi Depan</div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="kta-card-sample relative shadow-lg" style={{ width: '280px', height: '395px', borderRadius: '12px', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <KTATemplateBack />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Sisi Belakang</div>
        </div>
      </div>

      {/* Penjelasan format nomor KTA */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="text-xs font-semibold">Format Nomor KTA:</div>
        <div className="font-mono text-sm bg-background p-2 rounded border">
          <span className="text-red-600 font-bold">08</span>
          <span className="text-blue-600 font-bold">[LEVEL]</span>
          <span className="text-emerald-600 font-bold">[WILAYAH]</span>
          <span className="text-purple-600 font-bold">P</span>
          <span className="text-orange-600 font-bold">[URUT]</span>
        </div>
        <div className="text-xs space-y-1">
          <div><code className="text-red-600 font-bold">08</code> = Kode LAPRA 08</div>
          <div><code className="text-blue-600 font-bold">LEVEL</code> = DPN / DPD / DPC (tingkat pengurus)</div>
          <div><code className="text-emerald-600 font-bold">WILAYAH</code> = 4 digit (2 digit provinsi + 2 digit kab/kota)</div>
          <div><code className="text-purple-600 font-bold">P</code> = Person (Anggota)</div>
          <div><code className="text-orange-600 font-bold">URUT</code> = 4 digit nomor urut anggota</div>
        </div>
        <div className="text-xs border-t pt-2 mt-2">
          <strong>Contoh:</strong>{' '}
          <code className="font-mono bg-background px-1.5 py-0.5 rounded border">08DPD 6100 P0001</code>
          {' '}→ Anggota DPD Kalimantan Barat (kode 61), nomor urut 0001
        </div>
      </div>

      {/* Sumber data */}
      <div className="rounded-lg border p-3 space-y-2">
        <div className="text-xs font-semibold">Sumber Data Setiap Field KTA:</div>
        <div className="grid gap-1.5 text-xs md:grid-cols-2">
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Foto</Badge><span className="text-muted-foreground">Dari database biodata → <code className="bg-muted px-1 rounded">photoUrl</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Nama</Badge><span className="text-muted-foreground">Dari database biodata → <code className="bg-muted px-1 rounded">fullName</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Nomor KTA</Badge><span className="text-muted-foreground">Auto-generate → <code className="bg-muted px-1 rounded">08[LEVEL][WILAYAH]P[URUT]</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">QR Code</Badge><span className="text-muted-foreground">Auto-generate dari data biodata</span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Masa Berlaku</Badge><span className="text-muted-foreground">Otomatis: 1 Januari - 31 Desember tahun berjalan</span></div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SHARED: Background dengan curve "senyum" (concave ke bawah)
// ============================================================
function KTABackground({ curve = 'concave' }: { curve?: 'concave' | 'convex' }) {
  // concave = melengkung ke bawah (senyum) — untuk DEPAN
  // convex = melengkung ke atas (kebalikan) — untuk BELAKANG
  const splitY = curve === 'concave' ? 260 : 270
  const dip = curve === 'concave' ? 30 : -30

  return (
    <div className="absolute inset-0">
      {/* Background biru full */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: KTA.blueBg }} />
      {/* Background merah dengan curved top — bentuk "senyum" */}
      <svg width="100%" height="100%" viewBox="0 0 340 480" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <path
          d={`M 0 ${splitY - dip}
              Q 170 ${splitY + dip} 340 ${splitY - dip}
              L 340 480 L 0 480 Z`}
          fill={KTA.redBg}
        />
      </svg>
    </div>
  )
}

// ============================================================
// SHARED: Decorative curved lines (kiri atas untuk depan, kanan atas untuk belakang)
// ============================================================
function KTADecorativeLines({ position = 'left' }: { position?: 'left' | 'right' }) {
  const style: any = {
    position: 'absolute',
    top: 0,
    opacity: 0.4,
  }
  if (position === 'left') style.left = 0
  else style.right = 0
  style.transform = position === 'right' ? 'scaleX(-1)' : 'none'

  return (
    <svg width="130" height="90" viewBox="0 0 130 90" style={style}>
      <path d="M -20 70 Q 35 25 90 55 Q 120 70 150 35" fill="none" stroke={KTA.decorativeLine} strokeWidth="1.5" />
      <path d="M -20 85 Q 35 40 90 70 Q 120 85 150 50" fill="none" stroke={KTA.decorativeLine} strokeWidth="1" />
      <path d="M -20 55 Q 35 10 90 40 Q 120 55 150 20" fill="none" stroke={KTA.decorativeLine} strokeWidth="0.8" />
      <path d="M -20 40 Q 35 -5 90 25 Q 120 40 150 5" fill="none" stroke={KTA.decorativeLine} strokeWidth="0.6" />
    </svg>
  )
}

// ============================================================
// SHARED: Logo Laskar PRABOWO 08
// Siluet wajah di sebelah KANAN "Laskar" (bukan PRABOWO)
// ============================================================
function KTALogo() {
  return (
    <div className="relative flex items-center justify-center gap-1 pt-4">
      <span style={{ fontFamily: '"Great Vibes", "Brush Script MT", cursive', fontSize: '26px', color: KTA.redBg, fontStyle: 'italic', fontWeight: 'bold', lineHeight: 1 }}>
        Laskar
      </span>
      {/* Siluet wajah menghadap kanan — di sebelah KANAN "Laskar" */}
      <svg width="18" height="24" viewBox="0 0 18 24" style={{ flexShrink: 0, marginLeft: '-2px' }}>
        {/* Peci/songkok */}
        <ellipse cx="9" cy="5" rx="7" ry="3.5" fill={KTA.redBg} />
        <rect x="3" y="4" width="12" height="2.5" fill={KTA.redBg} />
        {/* Wajah profil menghadap kanan */}
        <path d="M 9 7 C 5 7 3 10 3 14 C 3 17 4 19 5 20.5 C 6 22 7.5 23 9 23 C 10.5 23 12 22 13 20.5 C 14 19 15 17 15 14 C 15 10 13 7 9 7 Z" fill={KTA.redBg} />
        {/* Hidung profil (ke kanan) */}
        <path d="M 14 12 L 15.5 14 L 14 15 Z" fill={KTA.redBg} />
      </svg>
      <div className="flex flex-col items-center leading-none" style={{ marginLeft: '4px' }}>
        <span style={{ fontSize: '20px', fontWeight: 900, color: '#000000', letterSpacing: '-0.5px', fontFamily: 'Impact, "Bebas Neue", "Arial Black", sans-serif' }}>
          PRABOWO
        </span>
        <span style={{ fontSize: '15px', fontWeight: 700, color: KTA.redBg }}>08</span>
      </div>
    </div>
  )
}

// ============================================================
// SHARED: Globe (bottom-left, putih SOLID 100% opacity)
// ============================================================
function KTAGlobe({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  const dims = size === 'large' ? { w: 220, h: 180 } : { w: 180, h: 150 }
  return (
    <svg width={dims.w} height={dims.h} viewBox="0 0 200 160" style={{ opacity: 0.85 }}>
      {/* Globe wireframe — putih dengan opacity tinggi */}
      <ellipse cx="80" cy="80" rx="75" ry="70" fill="none" stroke={KTA.globeLine} strokeWidth="1" />
      <ellipse cx="80" cy="80" rx="75" ry="38" fill="none" stroke={KTA.globeLine} strokeWidth="0.7" />
      <ellipse cx="80" cy="80" rx="75" ry="20" fill="none" stroke={KTA.globeLine} strokeWidth="0.5" />
      <line x1="5" y1="80" x2="155" y2="80" stroke={KTA.globeLine} strokeWidth="0.5" />
      <line x1="80" y1="10" x2="80" y2="150" stroke={KTA.globeLine} strokeWidth="0.5" />
      <ellipse cx="80" cy="80" rx="38" ry="70" fill="none" stroke={KTA.globeLine} strokeWidth="0.5" />
      <ellipse cx="80" cy="80" rx="20" ry="70" fill="none" stroke={KTA.globeLine} strokeWidth="0.5" />
      {/* Daratan Asia-Australia — putih krem */}
      <path d="M 45 50 Q 55 40 70 45 Q 85 50 80 60 Q 70 65 55 60 Z" fill={KTA.globeLand} />
      <path d="M 85 65 Q 100 60 115 70 Q 125 80 110 88 Q 95 85 88 75 Z" fill={KTA.globeLand} />
      <path d="M 95 95 Q 105 90 115 100 Q 110 110 100 105 Z" fill={KTA.globeLand} />
    </svg>
  )
}

// ============================================================
// KTA TEMPLATE FRONT — PERSIS KTA asli, field kosong
// ============================================================
function KTATemplateFront() {
  return (
    <div className="relative w-full h-full">
      <KTABackground curve="concave" />
      <KTADecorativeLines position="left" />

      {/* Globe bottom-left, SOLID */}
      <div style={{ position: 'absolute', bottom: '-5%', left: '-8%' }}>
        <KTAGlobe />
      </div>

      <KTALogo />

      {/* Foto — rounded rect, bg merah, KOSONG */}
      <div className="relative flex justify-center mt-5">
        <div style={{ width: '130px', height: '160px', borderRadius: '20px', backgroundColor: KTA.redBg, padding: '4px' }}>
          <div style={{ width: '100%', height: '100%', backgroundColor: '#FFE0B2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: '2px dashed #999' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#666' }}>FOTO</span>
            <span style={{ fontSize: '9px', color: '#888' }}>(dari biodata)</span>
          </div>
        </div>
      </div>

      {/* Nama — KOSONG */}
      <div className="relative text-center mt-2 px-6">
        <div style={{ fontSize: '14px', fontWeight: 600, color: KTA.blackText, border: '1px dashed #999', backgroundColor: 'rgba(255,255,255,0.5)', padding: '4px 10px', borderRadius: '4px', margin: '0 auto', maxWidth: '220px' }}>
          <span style={{ color: '#888', fontSize: '11px' }}>NAMA (dari biodata)</span>
        </div>
      </div>

      {/* QR Code — bottom-right, border putih */}
      <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: '55px', height: '55px', backgroundColor: 'white', padding: '3px', borderRadius: '3px', border: '2px dashed #999', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '7px', color: '#888', textAlign: 'center' }}>QR CODE<br />(auto)</span>
        </div>
        <span style={{ fontSize: '8px', color: 'white', fontWeight: 500, textAlign: 'center' }}>
          Berlaku s/d<br />31 Desember {new Date().getFullYear()}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// KTA TEMPLATE BACK — PERSIS KTA asli, nomor KTA KOSONG
// ============================================================
function KTATemplateBack() {
  const peraturan = [
    'Pemilik KTA wajib menjunjung tinggi nilai-nilai perjuangan, kedisiplinan dan loyalitas terhadap cita-cita luhur Laskar Prabowo 08.',
    'KTA ini bukan untuk disalah gunakan dan harus dijaga dengan penuh tanggung jawab.',
    'Apabila ditemukan pelanggaran terhadap kode etik dan aturan organisasi, KTA dapat dicabut oleh pengurus pusat atau wilayah.',
    'Setiap anggota wajib aktif berpartisipasi dalam kegiatan organisasi, sosial dan kemasyarakatan demi mendukung visi besar "lanjutkan Laskar Prabowo 08 untuk Indonesia Maju."',
  ]

  return (
    <div className="relative w-full h-full">
      <KTABackground curve="convex" />
      <KTADecorativeLines position="right" />

      {/* Globe bottom-left */}
      <div style={{ position: 'absolute', bottom: '-3%', left: '-10%' }}>
        <KTAGlobe size="large" />
      </div>

      <KTALogo />

      {/* Badge nomor KTA — pill shape merah, KOSONG */}
      <div className="relative flex justify-center mt-4">
        <div style={{ backgroundColor: KTA.redBg, color: 'white', padding: '6px 20px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px', border: '2px dashed rgba(255,255,255,0.6)', minWidth: '160px', textAlign: 'center' }}>
          <span style={{ fontSize: '8px', opacity: 0.8, display: 'block' }}>NOMOR KTA</span>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>(dari database)</span>
        </div>
      </div>

      {/* 4 poin peraturan */}
      <div className="relative mt-4 px-5 space-y-2">
        {peraturan.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: KTA.redBg, marginTop: '5px', flexShrink: 0 }} />
            <p style={{ fontSize: '9px', lineHeight: 1.4, color: '#000000', textAlign: 'justify' }}>{p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// KTA CARD FRONT (dengan data nyata)
// ============================================================
function KTACardFront({ data }: { data: KTACardData }) {
  return (
    <div className="relative w-full h-full">
      <KTABackground curve="concave" />
      <KTADecorativeLines position="left" />

      <div style={{ position: 'absolute', bottom: '-5%', left: '-8%' }}>
        <KTAGlobe />
      </div>

      <KTALogo />

      <div className="relative flex justify-center mt-5">
        <div style={{ width: '130px', height: '160px', borderRadius: '20px', backgroundColor: KTA.redBg, padding: '4px' }}>
          {data.photoUrl ? (
            <img src={data.photoUrl} alt={data.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#FFE0B2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>Foto</div>
          )}
        </div>
      </div>

      <div className="relative text-center mt-2 px-6">
        <div style={{ fontSize: '14px', fontWeight: 600, color: KTA.blackText }}>{data.fullName}</div>
      </div>

      <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        {data.qrCodeDataUrl && (
          <img src={data.qrCodeDataUrl} alt="QR Code" style={{ width: '55px', height: '55px', backgroundColor: 'white', padding: '3px', borderRadius: '3px' }} crossOrigin="anonymous" />
        )}
        <span style={{ fontSize: '8px', color: 'white', fontWeight: 500, textAlign: 'center' }}>
          Berlaku s/d<br />{data.validUntilString}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// KTA CARD BACK (dengan data nyata)
// ============================================================
function KTACardBack({ data }: { data: KTACardData }) {
  const peraturan = [
    'Pemilik KTA wajib menjunjung tinggi nilai-nilai perjuangan, kedisiplinan dan loyalitas terhadap cita-cita luhur Laskar Prabowo 08.',
    'KTA ini bukan untuk disalah gunakan dan harus dijaga dengan penuh tanggung jawab.',
    'Apabila ditemukan pelanggaran terhadap kode etik dan aturan organisasi, KTA dapat dicabut oleh pengurus pusat atau wilayah.',
    'Setiap anggota wajib aktif berpartisipasi dalam kegiatan organisasi, sosial dan kemasyarakatan demi mendukung visi besar "lanjutkan Laskar Prabowo 08 untuk Indonesia Maju."',
  ]

  return (
    <div className="relative w-full h-full">
      <KTABackground curve="convex" />
      <KTADecorativeLines position="right" />

      <div style={{ position: 'absolute', bottom: '-3%', left: '-10%' }}>
        <KTAGlobe size="large" />
      </div>

      <KTALogo />

      <div className="relative flex justify-center mt-4">
        <div style={{ backgroundColor: KTA.redBg, color: 'white', padding: '6px 20px', borderRadius: '16px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px' }}>
          {data.ktaNumber}
        </div>
      </div>

      <div className="relative mt-4 px-5 space-y-2">
        {peraturan.map((p, i) => (
          <div key={i} className="flex items-start gap-2">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: KTA.redBg, marginTop: '5px', flexShrink: 0 }} />
            <p style={{ fontSize: '9px', lineHeight: 1.4, color: '#000000', textAlign: 'justify' }}>{p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
