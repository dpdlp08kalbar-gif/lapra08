// LAPRA 08 - KTA Digital Card Component
// PERSIS sama dengan KTA asli LAPRA 08
//
// Spesifikasi presisi dari VLM audit 5 screenshot:
// - Background: biru #CFE2EF (atas) + merah #EB424F (bawah) dengan curve
// - Logo: "Laskar" [siluet] "PRABOWO" SEJAJAR satu baris, "08" di bawah
// - Globe depan: KIRI BAWAH, TERPOTONG (hanya kanan atas)
// - Globe belakang: KANAN BAWAH, UTUH (lingkaran penuh)
// - Globe: semua PUTIH (outline, grid, daratan)
// - Texture: garis lengkung tipis putih di area biru
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

const KTA = {
  blueBg: '#CFE2EF',
  redBg: '#EB424F',
  blackText: '#1A1A1A',
  white: '#FFFFFF',
  globeColor: '#FFFFFF',
}

// ============================================================
// MAIN KTACard
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
// KTA SAMPLE CARD
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
          Nomor: <code className="font-mono bg-muted px-1 rounded">08[LEVEL] [WILAYAH].P[URUT]</code>
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

      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <div className="text-xs font-semibold">Format Nomor KTA:</div>
        <div className="font-mono text-sm bg-background p-2 rounded border">
          <span className="text-red-600 font-bold">08</span>
          <span className="text-blue-600 font-bold">[LEVEL]</span>
          <span className="text-emerald-600 font-bold"> [WILAYAH].</span>
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
          <code className="font-mono bg-background px-1.5 py-0.5 rounded border">08DPD 0625.P0017</code>
          {' '}→ Anggota DPD Kalimantan Barat (kode 61), nomor urut 0017
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="text-xs font-semibold">Sumber Data Setiap Field KTA:</div>
        <div className="grid gap-1.5 text-xs md:grid-cols-2">
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Foto</Badge><span className="text-muted-foreground">Dari database biodata → <code className="bg-muted px-1 rounded">photoUrl</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Nama</Badge><span className="text-muted-foreground">Dari database biodata → <code className="bg-muted px-1 rounded">fullName</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Nomor KTA</Badge><span className="text-muted-foreground">Auto-generate → <code className="bg-muted px-1 rounded">08[LEVEL] [WILAYAH].P[URUT]</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">QR Code</Badge><span className="text-muted-foreground">Auto-generate dari data biodata</span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Masa Berlaku</Badge><span className="text-muted-foreground">Otomatis: 1 Januari - 31 Desember tahun berjalan</span></div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SHARED: Background dengan curve
// Depan: cembung ke bawah (senyum/concave)
// Belakang: cembung ke atas (convex)
// ============================================================
function KTABackground({ curve = 'concave' }: { curve?: 'concave' | 'convex' }) {
  const splitY = 250
  const dip = curve === 'concave' ? 35 : -35

  return (
    <div className="absolute inset-0">
      <div style={{ position: 'absolute', inset: 0, backgroundColor: KTA.blueBg }} />
      <svg width="100%" height="100%" viewBox="0 0 340 480" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <path
          d={`M 0 ${splitY - dip} Q 170 ${splitY + dip} 340 ${splitY - dip} L 340 480 L 0 480 Z`}
          fill={KTA.redBg}
        />
      </svg>
      {/* Texture: garis lengkung tipis putih di area biru (kiri atas) */}
      <svg width="140" height="100" viewBox="0 0 140 100" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.4 }}>
        <path d="M -20 80 Q 40 30 90 60 Q 130 75 160 40" fill="none" stroke="white" strokeWidth="1.5" />
        <path d="M -20 95 Q 40 45 90 75 Q 130 90 160 55" fill="none" stroke="white" strokeWidth="1" />
        <path d="M -20 65 Q 40 15 90 45 Q 130 60 160 25" fill="none" stroke="white" strokeWidth="0.8" />
        <path d="M -20 50 Q 40 0 90 30 Q 130 45 160 10" fill="none" stroke="white" strokeWidth="0.6" />
      </svg>
    </div>
  )
}

// ============================================================
// SHARED: Logo — "Laskar" [siluet] "PRABOWO" SEJAJAR satu baris
// "08" di bawah PRABOWO
// ============================================================
function KTALogo() {
  return (
    <div className="relative flex flex-col items-center pt-4">
      {/* Baris utama: Laskar [siluet] PRABOWO — sejajar */}
      <div className="flex items-center gap-1">
        <span style={{
          fontFamily: '"Great Vibes", "Brush Script MT", cursive',
          fontSize: '24px',
          color: KTA.redBg,
          fontStyle: 'italic',
          fontWeight: 'bold',
          lineHeight: 1,
        }}>
          Laskar
        </span>
        {/* Siluet wajah di TENGAH — pemisah Laskar dan PRABOWO */}
        <svg width="20" height="26" viewBox="0 0 20 26" style={{ flexShrink: 0 }}>
          {/* Peci */}
          <ellipse cx="10" cy="5" rx="7" ry="3.5" fill={KTA.redBg} />
          <rect x="3.5" y="4" width="13" height="2.5" fill={KTA.redBg} />
          {/* Wajah profil menghadap kanan */}
          <path d="M 10 7 C 6 7 4 10 4 15 C 4 18 5 21 6 22.5 C 7 24 8.5 25 10 25 C 11.5 25 13 24 14 22.5 C 15 21 16 18 16 15 C 16 10 14 7 10 7 Z" fill={KTA.redBg} />
          {/* Hidung */}
          <path d="M 15 13 L 17 16 L 15 17 Z" fill={KTA.redBg} />
        </svg>
        <span style={{
          fontSize: '20px',
          fontWeight: 900,
          color: '#000000',
          letterSpacing: '-0.5px',
          fontFamily: 'Impact, "Bebas Neue", "Arial Black", sans-serif',
        }}>
          PRABOWO
        </span>
      </div>
      {/* "08" di bawah PRABOWO */}
      <span style={{
        fontSize: '15px',
        fontWeight: 700,
        color: KTA.redBg,
        marginTop: '-2px',
      }}>
        08
      </span>
    </div>
  )
}

// ============================================================
// SHARED: Globe — SEMUA PUTIH (outline, grid, daratan)
// variant: 'cropped-left' (depan, kiri bawah, terpotong)
//          'full-right' (belakang, kanan bawah, utuh)
// ============================================================
function KTAGlobe({ variant = 'cropped-left' }: { variant?: 'cropped-left' | 'full-right' }) {
  const positionStyle: any = variant === 'cropped-left'
    ? { position: 'absolute', bottom: '-15%', left: '-25%' }  // Kiri bawah, terpotong
    : { position: 'absolute', bottom: '-10%', right: '-15%' } // Kanan bawah, utuh

  return (
    <div style={positionStyle}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {/* Lingkaran globe utuh — putih */}
        <circle cx="100" cy="100" r="95" fill="none" stroke={KTA.globeColor} strokeWidth="1.2" />
        {/* Grid garis lintang (horizontal) */}
        <ellipse cx="100" cy="100" rx="95" ry="50" fill="none" stroke={KTA.globeColor} strokeWidth="0.7" />
        <ellipse cx="100" cy="100" rx="95" ry="25" fill="none" stroke={KTA.globeColor} strokeWidth="0.5" />
        <line x1="5" y1="100" x2="195" y2="100" stroke={KTA.globeColor} strokeWidth="0.5" />
        {/* Grid garis bujur (vertical) */}
        <line x1="100" y1="5" x2="100" y2="195" stroke={KTA.globeColor} strokeWidth="0.5" />
        <ellipse cx="100" cy="100" rx="50" ry="95" fill="none" stroke={KTA.globeColor} strokeWidth="0.5" />
        <ellipse cx="100" cy="100" rx="25" ry="95" fill="none" stroke={KTA.globeColor} strokeWidth="0.4" />
        {/* Daratan Asia-Australia — putih solid */}
        <path d="M 55 60 Q 70 50 85 55 Q 100 60 95 75 Q 85 82 70 75 Z" fill={KTA.globeColor} />
        <path d="M 100 80 Q 115 75 130 85 Q 140 95 125 105 Q 110 100 103 88 Z" fill={KTA.globeColor} />
        <path d="M 110 115 Q 125 110 135 120 Q 130 130 120 125 Z" fill={KTA.globeColor} />
        <path d="M 70 95 Q 80 90 88 100 Q 83 108 73 103 Z" fill={KTA.globeColor} />
      </svg>
    </div>
  )
}

// ============================================================
// KTA TEMPLATE FRONT — PERSIS KTA asli
// Globe: KIRI BAWAH TERPOTONG
// ============================================================
function KTATemplateFront() {
  return (
    <div className="relative w-full h-full">
      <KTABackground curve="concave" />
      <KTAGlobe variant="cropped-left" />
      <KTALogo />

      {/* Foto — placeholder [ INPUT FOTO SISTEM ] */}
      <div className="relative flex justify-center mt-5">
        <div style={{ width: '125px', height: '155px', borderRadius: '18px', backgroundColor: KTA.redBg, padding: '4px' }}>
          <div style={{
            width: '100%', height: '100%',
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#666', textAlign: 'center' }}>
              [ INPUT FOTO<br />SISTEM ]
            </span>
          </div>
        </div>
      </div>

      {/* Nama — placeholder [ NAMA DATABASE ] */}
      <div className="relative text-center mt-3 px-6">
        <div style={{
          fontSize: '13px', fontWeight: 600, color: '#999',
          borderBottom: '1px solid #999', paddingBottom: '2px',
          margin: '0 auto', maxWidth: '220px',
        }}>
          [ NAMA DATABASE ]
        </div>
      </div>

      {/* QR Code — placeholder [ QR ] AUTO */}
      <div style={{ position: 'absolute', bottom: '15px', right: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{
          width: '55px', height: '55px', backgroundColor: 'white',
          padding: '3px', borderRadius: '3px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #ccc',
        }}>
          <span style={{ fontSize: '7px', color: '#999', textAlign: 'center', fontWeight: 600 }}>
            [ QR ]<br />AUTO
          </span>
        </div>
        <span style={{ fontSize: '8px', color: 'white', fontWeight: 500, textAlign: 'center' }}>
          Berlaku s/d<br />31 Desember {new Date().getFullYear()}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// KTA TEMPLATE BACK — PERSIS KTA asli
// Globe: KANAN BAWAH UTUH
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
      <KTAGlobe variant="full-right" />
      <KTALogo />

      {/* Badge nomor KTA — [ NOMOR KTA DATABASE ] */}
      <div className="kta-number-box relative flex justify-center mt-4">
        <div style={{
          backgroundColor: KTA.redBg, color: 'white',
          padding: '6px 20px', borderRadius: '16px',
          fontSize: '12px', fontWeight: 700, fontFamily: 'monospace',
          letterSpacing: '1px', minWidth: '180px', textAlign: 'center',
        }}>
          [ NOMOR KTA DATABASE ]
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
      <KTAGlobe variant="cropped-left" />
      <KTALogo />

      <div className="relative flex justify-center mt-5">
        <div style={{ width: '125px', height: '155px', borderRadius: '18px', backgroundColor: KTA.redBg, padding: '4px' }}>
          {data.photoUrl ? (
            <img src={data.photoUrl} alt={data.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#FFE0B2', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>Foto</div>
          )}
        </div>
      </div>

      <div className="relative text-center mt-3 px-6">
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
      <KTAGlobe variant="full-right" />
      <KTALogo />

      <div className="kta-number-box relative flex justify-center mt-4">
        <div style={{
          backgroundColor: KTA.redBg, color: 'white',
          padding: '6px 20px', borderRadius: '16px',
          fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '1px',
        }}>
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
