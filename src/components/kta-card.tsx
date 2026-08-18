// LAPRA 08 - KTA Digital Card Component
// Render KTA (Kartu Tanda Anggota) digital — depan + belakang
// Format: Portrait, PERSIS sama dengan KTA asli LAPRA 08
// Spesifikasi dari analisis VLM:
// - Background: biru #C5DDE8 (atas ~58%) + merah #E63946 (bawah ~42%) dengan curved separator
// - Logo: "Laskar" (script merah) + "PRABOWO" (condensed bold hitam) + "08" (merah)
// - Foto: rounded rectangle dengan background merah container
// - Globe: bottom-left, opacity 40%
// - QR Code: bottom-right, white background
// - Masa berlaku: below QR, white text
// - Vertical red stripe: right side, 3-4% width, full height
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, Printer, RefreshCw, FileText } from 'lucide-react'
import { useToastStore } from '@/lib/store'

interface KTACardData {
  ktaNumber: string
  fullName: string
  photoUrl: string | null
  level: string // DPN | DPD | DPC
  territoryName: string
  positionName: string
  validFromString: string
  validUntilString: string
  qrCodeDataUrl: string
}

// ============================================================
// CONSTANTS — warna & dimensi KTA (sesuai analisis VLM)
// ============================================================
const KTA_COLORS = {
  blueBg: '#C5DDE8',      // Background biru muda atas
  redBg: '#E63946',        // Background merah bawah
  redBright: '#F52D56',    // Merah container foto (lebih terang)
  redDark: '#C62828',      // Merah untuk teks "Laskar"
  blackText: '#2B2D42',    // Hitam keabu-abuan untuk teks
  white: '#FFFFFF',
  globeLine: '#FF6B7A',    // Garis globe (merah muda)
}

const KTA_DIMENSIONS = {
  width: 340,
  height: 540,
  borderRadius: 16,
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
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error || 'Gagal memuat KTA')
        }
      })
      .catch(e => {
        if (cancelled) return
        setError(e.message || 'Gagal memuat KTA')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [applicationId])

  const handleDownload = async () => {
    if (!cardRef.current) return
    try {
      addToast('Mengunduh KTA...', 'info')
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `KTA_${data?.fullName || 'anggota'}_${data?.ktaNumber || ''}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      addToast('KTA berhasil diunduh', 'success')
    } catch (e: any) {
      addToast(`Gagal unduh: ${e.message}`, 'error')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
      </div>
    )
  }
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
        <Button size="sm" variant={side === 'front' ? 'default' : 'outline'} onClick={() => setSide('front')}>
          Depan
        </Button>
        <Button size="sm" variant={side === 'back' ? 'default' : 'outline'} onClick={() => setSide('back')}>
          Belakang
        </Button>
      </div>
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="kta-card relative shadow-2xl"
          style={{
            width: `${KTA_DIMENSIONS.width}px`,
            height: `${KTA_DIMENSIONS.height}px`,
            borderRadius: `${KTA_DIMENSIONS.borderRadius}px`,
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            border: '3px solid white',
          }}
        >
          {side === 'front' ? <KTACardFront data={data} /> : <KTACardBack data={data} />}
        </div>
      </div>
      <div className="flex gap-2 justify-center print:hidden">
        <Button onClick={handleDownload} className="gap-1">
          <Download className="w-4 h-4" /> Download PNG
        </Button>
        <Button variant="outline" onClick={handlePrint} className="gap-1">
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// KTA SAMPLE CARD — preview template kosong
// ============================================================
export function KTASampleCard({ compact = false }: { compact?: boolean }) {
  const sampleData: KTACardData = {
    ktaNumber: '',
    fullName: '',
    photoUrl: null,
    level: 'DPD',
    territoryName: '',
    positionName: '',
    validFromString: `1 Januari ${new Date().getFullYear()}`,
    validUntilString: `31 Desember ${new Date().getFullYear()}`,
    qrCodeDataUrl: '',
  }

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="kta-card-sample relative shadow-lg"
          style={{
            width: '220px',
            height: '350px',
            borderRadius: '12px',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            border: '2px solid white',
          }}
        >
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
          <div
            className="kta-card-sample relative shadow-lg"
            style={{
              width: '280px',
              height: '445px',
              borderRadius: '14px',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              border: '3px solid white',
            }}
          >
            <KTATemplateFront />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Sisi Depan</div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div
            className="kta-card-sample relative shadow-lg"
            style={{
              width: '280px',
              height: '445px',
              borderRadius: '14px',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              border: '3px solid white',
            }}
          >
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
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Foto</Badge>
            <span className="text-muted-foreground">Dari database biodata → field <code className="bg-muted px-1 rounded">photoUrl</code></span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Nama</Badge>
            <span className="text-muted-foreground">Dari database biodata → field <code className="bg-muted px-1 rounded">fullName</code></span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Jabatan</Badge>
            <span className="text-muted-foreground">Dari database biodata → field <code className="bg-muted px-1 rounded">positionName</code></span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Nomor KTA</Badge>
            <span className="text-muted-foreground">Auto-generate dari database → format <code className="bg-muted px-1 rounded">08[LEVEL][WILAYAH]P[URUT]</code></span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Barcode/QR</Badge>
            <span className="text-muted-foreground">Auto-generate dari data biodata (ktaNumber + nama + wilayah + masa berlaku)</span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Masa Berlaku</Badge>
            <span className="text-muted-foreground">Otomatis: 1 Januari - 31 Desember tahun berjalan</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SHARED: Curved Background (biru atas + merah bawah dengan curve)
// ============================================================
function KTACurvedBackground({ splitPercent = 58 }: { splitPercent?: number }) {
  return (
    <div className="absolute inset-0">
      {/* Background biru (full) */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: KTA_COLORS.blueBg }} />
      {/* Background merah dengan curved top edge */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 340 540"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
      >
        <path
          d={`M 0 ${(splitPercent / 100) * 540 + 20}
              Q 85 ${(splitPercent / 100) * 540 + 50} 170 ${(splitPercent / 100) * 540 + 10}
              Q 255 ${(splitPercent / 100) * 540 - 20} 340 ${(splitPercent / 100) * 540 + 15}
              L 340 540 L 0 540 Z`}
          fill={KTA_COLORS.redBg}
        />
      </svg>
      {/* Decorative curved lines top-left (kontur topografi) */}
      <svg
        width="120"
        height="80"
        viewBox="0 0 120 80"
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.3 }}
      >
        <path d="M -20 60 Q 30 20 80 50 Q 110 65 140 30" fill="none" stroke="#A8C5D4" strokeWidth="1.5" />
        <path d="M -20 75 Q 30 35 80 65 Q 110 80 140 45" fill="none" stroke="#A8C5D4" strokeWidth="1" />
        <path d="M -20 45 Q 30 5 80 35 Q 110 50 140 15" fill="none" stroke="#A8C5D4" strokeWidth="0.8" />
      </svg>
    </div>
  )
}

// ============================================================
// SHARED: Logo Header (Laskar PRABOWO 08)
// ============================================================
function KTALogo() {
  return (
    <div className="relative flex items-center justify-center gap-1 pt-3">
      <span
        style={{
          fontFamily: 'Brush Script MT, "Great Vibes", cursive',
          fontSize: '26px',
          color: KTA_COLORS.redBg,
          fontStyle: 'italic',
          fontWeight: 'bold',
          lineHeight: 1,
        }}
      >
        Laskar
      </span>
      <div className="flex flex-col leading-none items-center">
        <div className="flex items-center gap-1">
          <span
            style={{
              fontSize: '18px',
              fontWeight: 900,
              color: KTA_COLORS.blackText,
              letterSpacing: '-0.5px',
              fontFamily: 'Impact, "Bebas Neue", sans-serif',
            }}
          >
            PRABOWO
          </span>
          {/* Siluet wajah (sederhana) */}
          <svg width="14" height="20" viewBox="0 0 14 20" style={{ flexShrink: 0 }}>
            <path
              d="M 7 0 C 3 0 1 3 1 7 C 1 10 2 12 3 14 C 2 15 2 17 3 18 C 4 19 6 20 7 20 C 8 20 10 19 11 18 C 12 17 12 15 11 14 C 12 12 13 10 13 7 C 13 3 11 0 7 0 Z"
              fill={KTA_COLORS.redBg}
            />
          </svg>
        </div>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: KTA_COLORS.redBg,
          }}
        >
          08
        </span>
      </div>
    </div>
  )
}

// ============================================================
// SHARED: Globe graphic (bottom-left, opacity 40%)
// ============================================================
function KTAGlobe({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  const dims = size === 'large' ? { w: 200, h: 160 } : { w: 160, h: 130 }
  return (
    <svg
      width={dims.w}
      height={dims.h}
      viewBox="0 0 200 160"
      style={{ opacity: 0.4 }}
    >
      {/* Globe wireframe */}
      <ellipse cx="80" cy="80" rx="70" ry="65" fill="none" stroke={KTA_COLORS.globeLine} strokeWidth="0.8" />
      <ellipse cx="80" cy="80" rx="70" ry="35" fill="none" stroke={KTA_COLORS.globeLine} strokeWidth="0.5" />
      <ellipse cx="80" cy="80" rx="70" ry="18" fill="none" stroke={KTA_COLORS.globeLine} strokeWidth="0.5" />
      <line x1="10" y1="80" x2="150" y2="80" stroke={KTA_COLORS.globeLine} strokeWidth="0.5" />
      <line x1="80" y1="15" x2="80" y2="145" stroke={KTA_COLORS.globeLine} strokeWidth="0.5" />
      <ellipse cx="80" cy="80" rx="35" ry="65" fill="none" stroke={KTA_COLORS.globeLine} strokeWidth="0.5" />
      <ellipse cx="80" cy="80" rx="18" ry="65" fill="none" stroke={KTA_COLORS.globeLine} strokeWidth="0.5" />
      {/* Daratan sederhana */}
      <path d="M 50 55 Q 60 45 75 50 Q 85 55 80 65 Q 70 70 55 65 Z" fill="white" opacity="0.3" />
      <path d="M 90 70 Q 105 65 115 75 Q 120 85 110 90 Q 95 88 90 80 Z" fill="white" opacity="0.3" />
    </svg>
  )
}

// ============================================================
// KTA TEMPLATE FRONT — PERSIS sama dengan KTA asli, field kosong
// ============================================================
function KTATemplateFront() {
  return (
    <div className="relative w-full h-full">
      {/* Background dengan curved separator */}
      <KTACurvedBackground splitPercent={58} />

      {/* Vertical red stripe kanan */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '12px',
          height: '100%',
          backgroundColor: KTA_COLORS.redBg,
        }}
      />

      {/* Globe bottom-left */}
      <div style={{ position: 'absolute', bottom: '8%', left: '-5%' }}>
        <KTAGlobe />
      </div>

      {/* Logo header */}
      <KTALogo />

      {/* Foto placeholder — rounded rectangle, background merah container */}
      <div className="relative flex justify-center mt-4">
        <div
          style={{
            width: '120px',
            height: '150px',
            borderRadius: '12px',
            backgroundColor: KTA_COLORS.redBright,
            padding: '3px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#FFE0B2',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              border: '2px dashed #999',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#666' }}>FOTO</span>
            <span style={{ fontSize: '8px', color: '#888' }}>(dari biodata)</span>
          </div>
        </div>
      </div>

      {/* Nama placeholder */}
      <div className="relative text-center mt-2 px-6">
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: KTA_COLORS.blackText,
            letterSpacing: '0.5px',
            border: '1px dashed #999',
            backgroundColor: 'rgba(255,255,255,0.5)',
            padding: '4px 8px',
            borderRadius: '4px',
            margin: '0 auto',
            maxWidth: '200px',
          }}
        >
          <span style={{ color: '#888', fontSize: '10px' }}>NAMA (dari biodata)</span>
        </div>
      </div>

      {/* QR Code placeholder — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            width: '55px',
            height: '55px',
            backgroundColor: 'white',
            padding: '2px',
            borderRadius: '3px',
            border: '2px dashed #999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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
// KTA TEMPLATE BACK — PERSIS sama dengan KTA asli, nomor KTA kosong
// ============================================================
function KTATemplateBack() {
  const peraturan = [
    'Pemilik KTA wajib menjunjung tinggi nilai-nilai perjuangan, kedisiplinan dan loyalitas terhadap cita-cita luhur Laskar Prabowo 08.',
    'KTA ini bukan untuk disalah gunakan dan harus dijaga dengan penuh tanggung jawab.',
    'Apabila ditemukan pelanggaran terhadap kode etik dan aturan organisasi, KTA dapat dicabut oleh pengurus pusat atau wilayah.',
    'Setiap anggota wajib aktif berpartisipasi dalam kegiatan organisasi, sosial dan kemasyarakatan demi mendukung visi besar Laskar Prabowo 08 untuk Indonesia Maju.',
  ]

  return (
    <div className="relative w-full h-full">
      {/* Background dengan curved separator */}
      <KTACurvedBackground splitPercent={55} />

      {/* Vertical red stripe kanan */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '12px',
          height: '100%',
          backgroundColor: KTA_COLORS.redBg,
        }}
      />

      {/* Globe bottom-left (lebih besar) */}
      <div style={{ position: 'absolute', bottom: '5%', left: '-8%' }}>
        <KTAGlobe size="large" />
      </div>

      {/* Logo header */}
      <KTALogo />

      {/* Nomor KTA — badge merah pill shape, KOSONG */}
      <div className="relative flex justify-center mt-3">
        <div
          style={{
            backgroundColor: KTA_COLORS.redBg,
            color: 'white',
            padding: '5px 18px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '1px',
            border: '2px dashed rgba(255,255,255,0.6)',
            minWidth: '150px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '7px', opacity: 0.8, display: 'block' }}>NOMOR KTA</span>
          <span style={{ fontSize: '8px', opacity: 0.7 }}>(dari database)</span>
        </div>
      </div>

      {/* 4 poin peraturan */}
      <div className="relative mt-3 px-5 space-y-1.5">
        {peraturan.map((p, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <div
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: KTA_COLORS.redBg,
                marginTop: '4px',
                flexShrink: 0,
              }}
            />
            <p style={{ fontSize: '8px', lineHeight: 1.4, color: KTA_COLORS.blackText, textAlign: 'justify' }}>
              {p}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// KTA CARD FRONT (dengan data nyata — untuk anggota yang sudah approve)
// ============================================================
function KTACardFront({ data }: { data: KTACardData }) {
  return (
    <div className="relative w-full h-full">
      <KTACurvedBackground splitPercent={58} />

      {/* Vertical red stripe kanan */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '12px',
          height: '100%',
          backgroundColor: KTA_COLORS.redBg,
        }}
      />

      {/* Globe bottom-left */}
      <div style={{ position: 'absolute', bottom: '8%', left: '-5%' }}>
        <KTAGlobe />
      </div>

      {/* Logo header */}
      <KTALogo />

      {/* Foto anggota */}
      <div className="relative flex justify-center mt-4">
        <div
          style={{
            width: '120px',
            height: '150px',
            borderRadius: '12px',
            backgroundColor: KTA_COLORS.redBright,
            padding: '3px',
          }}
        >
          {data.photoUrl ? (
            <img
              src={data.photoUrl}
              alt={data.fullName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '9px',
              }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FFE0B2',
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: '12px',
              }}
            >
              Foto
            </div>
          )}
        </div>
      </div>

      {/* Nama lengkap */}
      <div className="relative text-center mt-2 px-6">
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: KTA_COLORS.blackText,
            letterSpacing: '0.5px',
          }}
        >
          {data.fullName}
        </div>
      </div>

      {/* QR Code + masa berlaku — bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {data.qrCodeDataUrl && (
          <img
            src={data.qrCodeDataUrl}
            alt="QR Code"
            style={{
              width: '55px',
              height: '55px',
              backgroundColor: 'white',
              padding: '2px',
              borderRadius: '3px',
            }}
            crossOrigin="anonymous"
          />
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
    'Setiap anggota wajib aktif berpartisipasi dalam kegiatan organisasi, sosial dan kemasyarakatan demi mendukung visi besar Laskar Prabowo 08 untuk Indonesia Maju.',
  ]

  return (
    <div className="relative w-full h-full">
      <KTACurvedBackground splitPercent={55} />

      {/* Vertical red stripe kanan */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '12px',
          height: '100%',
          backgroundColor: KTA_COLORS.redBg,
        }}
      />

      {/* Globe bottom-left (lebih besar) */}
      <div style={{ position: 'absolute', bottom: '5%', left: '-8%' }}>
        <KTAGlobe size="large" />
      </div>

      {/* Logo header */}
      <KTALogo />

      {/* Nomor KTA — badge merah pill shape */}
      <div className="relative flex justify-center mt-3">
        <div
          style={{
            backgroundColor: KTA_COLORS.redBg,
            color: 'white',
            padding: '5px 18px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '1px',
          }}
        >
          {data.ktaNumber}
        </div>
      </div>

      {/* 4 poin peraturan */}
      <div className="relative mt-3 px-5 space-y-1.5">
        {peraturan.map((p, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <div
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: KTA_COLORS.redBg,
                marginTop: '4px',
                flexShrink: 0,
              }}
            />
            <p style={{ fontSize: '8px', lineHeight: 1.4, color: KTA_COLORS.blackText, textAlign: 'justify' }}>
              {p}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
