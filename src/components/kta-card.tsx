// LAPRA 08 - KTA Digital Card Component
// PERSIS 100% sama dengan KTA asli LAPRA 08
// Logo pakai file asli logo-lapra08.png (bukan SVG re-create)
//
// Koordinat presisi dari VLM audit:
// - Blue bg: #D4E6F1 (atas 0-62%) + Red bg: #E31E24 (bawah 62-100%)
// - Curve: arch cembung ke atas (front), blue dominant (back)
// - Logo: X50% Y8%, pakai PNG asli
// - Foto: X28% Y22%, W44% H32%, rounded pill, red container
// - Globe: X25% Y78%, 70% width, putih solid, cropped bawah
// - QR: X72% Y80%, 20% width
// - Validity: X75% Y92%, putih
// - Decorative: front KIRI atas, back KANAN atas, #5DADE2
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

// Warna presisi dari VLM
const C = {
  blue: '#D4E6F1',
  red: '#E31E24',
  black: '#000000',
  grey: '#2C3E50',
  white: '#FFFFFF',
  decoBlue: '#5DADE2',
}

// Dimensi kartu (ratio portrait ~2:3)
const W = 340
const H = 510

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
      const canvas = await html2canvas(cardRef.current, { scale: 3, backgroundColor: null, useCORS: true, logging: false })
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
        <div ref={cardRef} className="kta-card relative shadow-2xl" style={{ width: `${W}px`, height: `${H}px`, borderRadius: '16px', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
        <div className="kta-card-sample relative shadow-lg" style={{ width: '220px', height: '330px', borderRadius: '12px', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
          <div className="kta-card-sample relative shadow-lg" style={{ width: '280px', height: '420px', borderRadius: '14px', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <KTATemplateFront />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Sisi Depan</div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="kta-card-sample relative shadow-lg" style={{ width: '280px', height: '420px', borderRadius: '14px', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
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
          <div><code className="text-blue-600 font-bold">LEVEL</code> = DPN / DPD / DPC</div>
          <div><code className="text-emerald-600 font-bold">WILAYAH</code> = 4 digit (2 provinsi + 2 kab/kota)</div>
          <div><code className="text-purple-600 font-bold">P</code> = Person (Anggota)</div>
          <div><code className="text-orange-600 font-bold">URUT</code> = 4 digit urut</div>
        </div>
        <div className="text-xs border-t pt-2 mt-2">
          <strong>Contoh:</strong>{' '}
          <code className="font-mono bg-background px-1.5 py-0.5 rounded border">08DPD 0625.P0017</code>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <div className="text-xs font-semibold">Sumber Data:</div>
        <div className="grid gap-1.5 text-xs md:grid-cols-2">
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Foto</Badge><span className="text-muted-foreground">Database → <code className="bg-muted px-1 rounded">photoUrl</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Nama</Badge><span className="text-muted-foreground">Database → <code className="bg-muted px-1 rounded">fullName</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Nomor KTA</Badge><span className="text-muted-foreground">Auto-generate → <code className="bg-muted px-1 rounded">08[LEVEL] [WILAYAH].P[URUT]</code></span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">QR Code</Badge><span className="text-muted-foreground">Auto-generate dari biodata</span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Masa Berlaku</Badge><span className="text-muted-foreground">Otomatis: 1 Jan - 31 Des tahun berjalan</span></div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SHARED: Background dengan curve arch
// Front: arch cembung ke atas (red area mulai dari ~62%)
// Back: blue dominant, red area di bawah dengan globe
// ============================================================
function KTABg({ variant = 'front' }: { variant?: 'front' | 'back' }) {
  const splitPct = variant === 'front' ? 0.62 : 0.68
  const archHeight = variant === 'front' ? 20 : 12
  const splitY = H * splitPct

  return (
    <div className="absolute inset-0">
      <div style={{ position: 'absolute', inset: 0, backgroundColor: C.blue }} />
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <path
          d={`M 0 ${splitY}
              C ${W * 0.25} ${splitY - archHeight * 1.5}, ${W * 0.75} ${splitY - archHeight * 1.5}, ${W} ${splitY}
              L ${W} ${H} L 0 ${H} Z`}
          fill={C.red}
        />
      </svg>
    </div>
  )
}

// ============================================================
// SHARED: Logo — pakai PNG asli, ukuran compact
// ============================================================
function KTALogo() {
  return (
    <div style={{
      position: 'absolute',
      top: '4%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '32%',
      zIndex: 10,
    }}>
      <img
        src="/logo-lapra08.png"
        alt="Laskar Prabowo 08"
        style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
      />
    </div>
  )
}

// ============================================================
// SHARED: Decorative lines
// Front: KIRI atas, Back: KANAN atas (mirror)
// ============================================================
function KTADeco({ side = 'left' }: { side?: 'left' | 'right' }) {
  const pos = side === 'left' ? { left: 0 } : { right: 0 }
  const transform = side === 'right' ? 'scaleX(-1)' : 'none'

  return (
    <svg
      width="130"
      height="110"
      viewBox="0 0 130 110"
      style={{ position: 'absolute', top: 0, ...pos, opacity: 0.5, transform }}
    >
      <path d="M -20 90 Q 35 35 85 65 Q 120 80 150 45" fill="none" stroke={C.decoBlue} strokeWidth="1.5" />
      <path d="M -20 105 Q 35 50 85 80 Q 120 95 150 60" fill="none" stroke={C.decoBlue} strokeWidth="1" />
      <path d="M -20 75 Q 35 20 85 50 Q 120 65 150 30" fill="none" stroke={C.decoBlue} strokeWidth="0.8" />
      <path d="M -20 60 Q 35 5 85 35 Q 120 50 150 15" fill="none" stroke={C.decoBlue} strokeWidth="0.6" />
      <path d="M -20 45 Q 35 -10 85 20 Q 120 35 150 0" fill="none" stroke={C.decoBlue} strokeWidth="0.5" />
      <path d="M -20 30 Q 35 -25 85 5 Q 120 20 150 -15" fill="none" stroke={C.decoBlue} strokeWidth="0.4" />
    </svg>
  )
}

// ============================================================
// SHARED: Globe — putih solid, cropped di bawah
// Posisi: X25% Y78%, 70% width
// ============================================================
function KTAGlobe({ variant = 'front' }: { variant?: 'front' | 'back' }) {
  const size = variant === 'front' ? 300 : 320
  const bottom = variant === 'front' ? '-30%' : '-25%'
  const left = '-22%'

  return (
    <div style={{ position: 'absolute', bottom, left, zIndex: 1 }}>
      <svg width={size} height={size} viewBox="0 0 200 200">
        {/* Lingkaran globe */}
        <circle cx="100" cy="100" r="95" fill="none" stroke={C.white} strokeWidth="0.5" />
        {/* Grid halus */}
        <ellipse cx="100" cy="100" rx="95" ry="48" fill="none" stroke={C.white} strokeWidth="0.2" />
        <ellipse cx="100" cy="100" rx="95" ry="24" fill="none" stroke={C.white} strokeWidth="0.15" />
        <ellipse cx="100" cy="100" rx="95" ry="70" fill="none" stroke={C.white} strokeWidth="0.15" />
        <line x1="5" y1="100" x2="195" y2="100" stroke={C.white} strokeWidth="0.15" />
        <line x1="100" y1="5" x2="100" y2="195" stroke={C.white} strokeWidth="0.15" />
        <ellipse cx="100" cy="100" rx="48" ry="95" fill="none" stroke={C.white} strokeWidth="0.2" />
        <ellipse cx="100" cy="100" rx="24" ry="95" fill="none" stroke={C.white} strokeWidth="0.15" />
        <ellipse cx="100" cy="100" rx="70" ry="95" fill="none" stroke={C.white} strokeWidth="0.15" />

        {/* === PETA: dot-matrix style (titik-titik putih membentuk benua) === */}
        {/* Asia - utara besar */}
        <g fill={C.white}>
          {/* Asia Tengah & Timur */}
          <circle cx="55" cy="40" r="1.5"/><circle cx="62" cy="38" r="1.5"/><circle cx="70" cy="37" r="1.5"/>
          <circle cx="78" cy="36" r="1.5"/><circle cx="86" cy="37" r="1.5"/><circle cx="94" cy="38" r="1.5"/>
          <circle cx="102" cy="39" r="1.5"/><circle cx="110" cy="40" r="1.5"/><circle cx="118" cy="42" r="1.5"/>
          <circle cx="58" cy="46" r="1.5"/><circle cx="66" cy="44" r="1.5"/><circle cx="74" cy="43" r="1.5"/>
          <circle cx="82" cy="42" r="1.5"/><circle cx="90" cy="43" r="1.5"/><circle cx="98" cy="44" r="1.5"/>
          <circle cx="106" cy="45" r="1.5"/><circle cx="114" cy="46" r="1.5"/>
          {/* India */}
          <circle cx="48" cy="50" r="1.5"/><circle cx="52" cy="54" r="1.5"/><circle cx="50" cy="58" r="1.5"/>
          <circle cx="48" cy="62" r="1.5"/>
          {/* Asia Tenggara daratan */}
          <circle cx="68" cy="52" r="1.5"/><circle cx="72" cy="56" r="1.5"/><circle cx="74" cy="60" r="1.5"/>
          <circle cx="76" cy="64" r="1.5"/>
          {/* Sumatra */}
          <circle cx="68" cy="68" r="1.2"/><circle cx="70" cy="72" r="1.2"/><circle cx="72" cy="76" r="1.2"/>
          {/* Kalimantan */}
          <circle cx="80" cy="70" r="1.2"/><circle cx="84" cy="72" r="1.2"/><circle cx="82" cy="76" r="1.2"/>
          {/* Jawa */}
          <circle cx="78" cy="82" r="1.2"/><circle cx="84" cy="83" r="1.2"/><circle cx="90" cy="84" r="1.2"/>
          {/* Sulawesi */}
          <circle cx="92" cy="72" r="1.2"/><circle cx="94" cy="76" r="1.2"/>
          {/* Papua */}
          <circle cx="100" cy="76" r="1.5"/><circle cx="108" cy="77" r="1.5"/><circle cx="116" cy="78" r="1.5"/>
          <circle cx="124" cy="79" r="1.5"/>
          {/* Filipina */}
          <circle cx="96" cy="60" r="1"/><circle cx="98" cy="64" r="1"/>
          {/* Australia */}
          <circle cx="100" cy="108" r="1.5"/><circle cx="108" cy="106" r="1.5"/><circle cx="116" cy="105" r="1.5"/>
          <circle cx="124" cy="106" r="1.5"/><circle cx="132" cy="108" r="1.5"/><circle cx="138" cy="112" r="1.5"/>
          <circle cx="104" cy="114" r="1.5"/><circle cx="112" cy="112" r="1.5"/><circle cx="120" cy="112" r="1.5"/>
          <circle cx="128" cy="114" r="1.5"/><circle cx="134" cy="118" r="1.5"/>
          <circle cx="108" cy="120" r="1.5"/><circle cx="116" cy="120" r="1.5"/><circle cx="124" cy="122" r="1.5"/>
          {/* Jepang */}
          <circle cx="118" cy="44" r="1"/><circle cx="120" cy="48" r="1"/>
        </g>
      </svg>
    </div>
  )
}

// ============================================================
// KTA TEMPLATE FRONT — PERSIS KTA asli
// ============================================================
function KTATemplateFront() {
  return (
    <div className="relative w-full h-full">
      <KTABg variant="front" />
      
      <KTAGlobe variant="front" />
      <KTALogo />

      {/* Foto — center, di bawah logo */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '38%',
        height: '28%',
        zIndex: 5,
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          backgroundColor: C.red,
          padding: '4px',
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#666', textAlign: 'center' }}>
              [ INPUT FOTO<br />SISTEM ]
            </span>
          </div>
        </div>
      </div>

      {/* Nama — tepat di bawah foto, jarak minimal */}
      <div style={{
        position: 'absolute',
        top: '49%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        textAlign: 'center',
        zIndex: 5,
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#999',
          borderBottom: '1px solid #999',
          paddingBottom: '1px',
          display: 'inline-block',
        }}>
          [ NAMA DATABASE ]
        </div>
      </div>

      {/* QR Code — bottom-right dengan margin */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        right: '10%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        zIndex: 5,
      }}>
        <div style={{
          width: '55px',
          height: '55px',
          backgroundColor: 'white',
          padding: '3px',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
// Logo top center, badge pill shape di bawah logo, globe besar kiri bawah
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
      <KTABg variant="back" />
      
      <KTAGlobe variant="back" />
      <KTALogo />

      {/* Badge nomor KTA — pill shape penuh, di bawah logo dengan jarak cukup */}
      <div className="kta-number-box" style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
      }}>
        <div style={{
          backgroundColor: C.red,
          color: 'white',
          padding: '7px 24px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'monospace',
          letterSpacing: '1.5px',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>
          [ NOMOR KTA DATABASE ]
        </div>
      </div>

      {/* 4 poin peraturan */}
      <div style={{
        position: 'absolute',
        top: '26%',
        left: '8%',
        right: '8%',
        zIndex: 5,
      }}>
        {peraturan.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '7px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: C.red,
              marginTop: '4px',
              flexShrink: 0,
            }} />
            <p style={{ fontSize: '8.5px', lineHeight: 1.4, color: C.grey, textAlign: 'justify', margin: 0 }}>
              {p}
            </p>
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
      <KTABg variant="front" />
      
      <KTAGlobe variant="front" />
      <KTALogo />

      {/* Foto */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '38%',
        height: '28%',
        zIndex: 5,
      }}>
        <div style={{ width: '100%', height: '100%', borderRadius: '12px', backgroundColor: C.red, padding: '4px' }}>
          {data.photoUrl ? (
            <img src={data.photoUrl} alt={data.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#FFE0B2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>Foto</div>
          )}
        </div>
      </div>

      {/* Nama */}
      <div style={{
        position: 'absolute',
        top: '49%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        textAlign: 'center',
        zIndex: 5,
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.black }}>{data.fullName}</div>
      </div>

      {/* QR + validity */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        right: '10%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        zIndex: 5,
      }}>
        {data.qrCodeDataUrl && (
          <img src={data.qrCodeDataUrl} alt="QR" style={{ width: '55px', height: '55px', backgroundColor: 'white', padding: '3px', borderRadius: '3px' }} crossOrigin="anonymous" />
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
      <KTABg variant="back" />
      
      <KTAGlobe variant="back" />
      <KTALogo />

      <div className="kta-number-box" style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
      }}>
        <div style={{
          backgroundColor: C.red,
          color: 'white',
          padding: '7px 24px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'monospace',
          letterSpacing: '1.5px',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}>
          {data.ktaNumber}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: '28%',
        left: '8%',
        right: '8%',
        zIndex: 5,
      }}>
        {peraturan.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '7px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: C.red, marginTop: '4px', flexShrink: 0 }} />
            <p style={{ fontSize: '8.5px', lineHeight: 1.4, color: C.grey, textAlign: 'justify', margin: 0 }}>{p}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
