// LAPRA 08 - KTA Digital Card Component
// Render KTA (Kartu Tanda Anggota) digital — depan + belakang
// Format: Portrait, 85.6 × 54mm (credit card size)
// Layout mengikuti desain KTA asli LAPRA 08
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
        scale: 2, // higher resolution
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
      {/* Toggle Depan/Belakang */}
      <div className="flex gap-2 print:hidden">
        <Button
          size="sm"
          variant={side === 'front' ? 'default' : 'outline'}
          onClick={() => setSide('front')}
        >
          Depan
        </Button>
        <Button
          size="sm"
          variant={side === 'back' ? 'default' : 'outline'}
          onClick={() => setSide('back')}
        >
          Belakang
        </Button>
      </div>

      {/* KTA Card */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="kta-card relative shadow-2xl"
          style={{
            width: '340px',
            height: '540px',
            borderRadius: '16px',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {side === 'front' ? (
            <KTACardFront data={data} />
          ) : (
            <KTACardBack data={data} />
          )}
        </div>
      </div>

      {/* Action buttons */}
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
// KTA SAMPLE CARD — preview format KTA (untuk Info Layanan & KTA Digital)
// Tampilkan contoh KTA dengan data dummy supaya user paham formatnya
// ============================================================
export function KTASampleCard({ compact = false }: { compact?: boolean }) {
  const sampleData: KTACardData = {
    ktaNumber: '08DPD 6100 P0001',
    fullName: 'NAMA ANGGOTA CONTOH',
    photoUrl: null,
    level: 'DPD',
    territoryName: 'Kalimantan Barat',
    positionName: 'Anggota',
    validFromString: `1 Januari ${new Date().getFullYear()}`,
    validUntilString: `31 Desember ${new Date().getFullYear()}`,
    qrCodeDataUrl: '', // empty untuk sample
  }

  if (compact) {
    // Compact mode — cuma tampilkan card depan saja, lebih kecil
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
          }}
        >
          <KTACardFront data={sampleData} sample />
        </div>
        <div className="text-xs text-muted-foreground text-center max-w-xs">
          <strong>Contoh format KTA Digital</strong>
          <br />
          Nomor: <code className="font-mono bg-muted px-1 rounded">08DPD 6100 P0001</code>
          <br />
          Masa berlaku: 1 Januari - 31 Desember {new Date().getFullYear()}
        </div>
      </div>
    )
  }

  // Full mode — tampilkan depan + belakang + penjelasan format
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Depan — Template kosong */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="kta-card-sample relative shadow-lg"
            style={{
              width: '240px',
              height: '380px',
              borderRadius: '12px',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <KTATemplateFront />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Sisi Depan (Template)</div>
        </div>
        {/* Belakang */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="kta-card-sample relative shadow-lg"
            style={{
              width: '240px',
              height: '380px',
              borderRadius: '12px',
              overflow: 'hidden',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <KTACardBack data={sampleData} />
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

      {/* Penjelasan sumber data setiap field */}
      <div className="rounded-lg border p-3 space-y-2">
        <div className="text-xs font-semibold">Sumber Data Setiap Field KTA:</div>
        <div className="grid gap-1.5 text-xs md:grid-cols-2">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Foto</Badge>
            <span className="text-muted-foreground">Dari database biodata anggota/pengurus → field <code className="bg-muted px-1 rounded">photoUrl</code></span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Nama</Badge>
            <span className="text-muted-foreground">Dari database biodata → field <code className="bg-muted px-1 rounded">fullName</code></span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-[10px] shrink-0">Jabatan</Badge>
            <span className="text-muted-foreground">Dari database biodata → field <code className="bg-muted px-1 rounded">positionName</code> / <code className="bg-muted px-1 rounded">occupation</code></span>
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
// KTA TEMPLATE FRONT — template kosong dengan label field
// Semua field kosong, cuma tampilkan label dari mana data akan diisi
// ============================================================
function KTATemplateFront() {
  return (
    <div className="relative w-full h-full">
      {/* Background: Biru muda (atas 55%) + Merah (bawah 45%) */}
      <div className="absolute inset-0 flex flex-col">
        <div style={{ height: '55%', backgroundColor: '#BFE3F5' }} />
        <div style={{ height: '45%', backgroundColor: '#EF3340' }} />
      </div>

      {/* Globe graphic (di area merah, opacity 30%) */}
      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{ top: '40%' }}
      >
        <svg width="280" height="220" viewBox="0 0 200 150" style={{ opacity: 0.25 }}>
          <ellipse cx="100" cy="75" rx="80" ry="75" fill="none" stroke="white" strokeWidth="0.8" />
          <ellipse cx="100" cy="75" rx="80" ry="40" fill="none" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="80" ry="20" fill="none" stroke="white" strokeWidth="0.5" />
          <line x1="20" y1="75" x2="180" y2="75" stroke="white" strokeWidth="0.5" />
          <line x1="100" y1="0" x2="100" y2="150" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="40" ry="75" fill="none" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="20" ry="75" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Header: Logo Laskar Prabowo 08 */}
      <div className="relative pt-3 px-4 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          <span
            style={{
              fontFamily: 'Brush Script MT, cursive',
              fontSize: '22px',
              color: '#C62828',
              fontStyle: 'italic',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            Laskar
          </span>
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontSize: '14px',
                fontWeight: 900,
                color: '#1A1A1A',
                letterSpacing: '1px',
              }}
            >
              PRABOWO
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#D32F2F',
              }}
            >
              08
            </span>
          </div>
        </div>
      </div>

      {/* Foto placeholder — KOSONG, label "Foto dari biodata" */}
      <div className="relative flex justify-center mt-3">
        <div
          style={{
            width: '140px',
            height: '170px',
            borderRadius: '10px',
            backgroundColor: '#FF1744',
            padding: '4px',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#FFE0B2',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: '#666',
              fontSize: '9px',
              textAlign: 'center',
              padding: '8px',
              border: '2px dashed #999',
            }}
          >
            <span style={{ fontWeight: 600, marginBottom: '4px' }}>FOTO</span>
            <span style={{ fontSize: '8px', color: '#888' }}>(dari biodata)</span>
          </div>
        </div>
      </div>

      {/* Nama placeholder — KOSONG, label "Nama dari biodata" */}
      <div className="relative text-center mt-2 px-4">
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#1A1A1A',
            letterSpacing: '0.5px',
            lineHeight: 1.2,
            border: '1px dashed #999',
            backgroundColor: 'rgba(255,255,255,0.5)',
            padding: '4px 8px',
            borderRadius: '4px',
            margin: '0 auto',
            maxWidth: '180px',
          }}
        >
          <span style={{ color: '#888', fontSize: '10px' }}>NAMA (dari biodata)</span>
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#555',
            marginTop: '3px',
            border: '1px dashed #999',
            backgroundColor: 'rgba(255,255,255,0.5)',
            padding: '2px 8px',
            borderRadius: '4px',
            margin: '2px auto 0',
            maxWidth: '140px',
          }}
        >
          <span style={{ color: '#888', fontSize: '9px' }}>JABATAN (dari biodata)</span>
        </div>
      </div>

      {/* QR Code placeholder + masa berlaku (di area merah) */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
        <div
          style={{
            width: '60px',
            height: '60px',
            backgroundColor: 'white',
            padding: '2px',
            borderRadius: '4px',
            border: '2px dashed #999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '7px', color: '#888', textAlign: 'center' }}>QR CODE<br />(auto-generate)</span>
        </div>
        <div
          style={{
            fontSize: '8px',
            color: 'white',
            textAlign: 'center',
            fontWeight: 600,
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '2px 4px',
            borderRadius: '3px',
          }}
        >
          Berlaku s/d
          <br />
          31 Desember {new Date().getFullYear()}
        </div>
      </div>

      {/* Nomor KTA placeholder — di kiri bawah (di area merah) */}
      <div className="absolute bottom-3 left-3">
        <div
          style={{
            backgroundColor: '#E63946',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '10px',
            fontSize: '9px',
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '0.5px',
            border: '2px dashed rgba(255,255,255,0.5)',
          }}
        >
          <span style={{ fontSize: '7px', opacity: 0.8 }}>NOMOR KTA</span>
          <br />
          <span style={{ fontSize: '8px', opacity: 0.7 }}>(dari database)</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// KTA CARD FRONT (dengan opsi 'sample' untuk placeholder)
// ============================================================
function KTACardFront({ data, sample = false }: { data: KTACardData; sample?: boolean }) {
  return (
    <div className="relative w-full h-full">
      {/* Background: Biru muda (atas 55%) + Merah (bawah 45%) */}
      <div className="absolute inset-0 flex flex-col">
        <div style={{ height: '55%', backgroundColor: '#BFE3F5' }} />
        <div style={{ height: '45%', backgroundColor: '#EF3340' }} />
      </div>

      {/* Globe graphic (di area merah, opacity 30%) */}
      <div
        className="absolute inset-0 flex items-end justify-center"
        style={{ top: '40%' }}
      >
        <svg width="280" height="220" viewBox="0 0 200 150" style={{ opacity: 0.25 }}>
          {/* Globe wireframe */}
          <ellipse cx="100" cy="75" rx="80" ry="75" fill="none" stroke="white" strokeWidth="0.8" />
          <ellipse cx="100" cy="75" rx="80" ry="40" fill="none" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="80" ry="20" fill="none" stroke="white" strokeWidth="0.5" />
          <line x1="20" y1="75" x2="180" y2="75" stroke="white" strokeWidth="0.5" />
          <line x1="100" y1="0" x2="100" y2="150" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="40" ry="75" fill="none" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="20" ry="75" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Header: Logo Laskar Prabowo 08 */}
      <div className="relative pt-3 px-4 flex items-center justify-center gap-2">
        {/* Logo placeholder (kalau ada logo-lapra08.png) */}
        <div className="flex items-center gap-1">
          <span
            style={{
              fontFamily: 'Brush Script MT, cursive',
              fontSize: '22px',
              color: '#C62828',
              fontStyle: 'italic',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            Laskar
          </span>
          <div className="flex flex-col leading-none">
            <span
              style={{
                fontSize: '14px',
                fontWeight: 900,
                color: '#1A1A1A',
                letterSpacing: '1px',
              }}
            >
              PRABOWO
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#D32F2F',
              }}
            >
              08
            </span>
          </div>
        </div>
      </div>

      {/* Foto anggota — frame merah */}
      <div className="relative flex justify-center mt-3">
        <div
          style={{
            width: '140px',
            height: '170px',
            borderRadius: '10px',
            backgroundColor: '#FF1744',
            padding: '4px',
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
                borderRadius: '6px',
              }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#FFE0B2',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: sample ? '10px' : '12px',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              {sample ? 'Foto 3×4\n(Latar Merah)' : 'Foto'}
            </div>
          )}
        </div>
      </div>

      {/* Nama lengkap */}
      <div className="relative text-center mt-2 px-4">
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#1A1A1A',
            letterSpacing: '0.5px',
            lineHeight: 1.2,
          }}
        >
          {data.fullName}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#555',
            marginTop: '2px',
          }}
        >
          {data.positionName}
        </div>
      </div>

      {/* QR Code + masa berlaku (di area merah) */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
        {data.qrCodeDataUrl && (
          <img
            src={data.qrCodeDataUrl}
            alt="QR Code"
            style={{
              width: '60px',
              height: '60px',
              backgroundColor: 'white',
              padding: '2px',
              borderRadius: '4px',
            }}
            crossOrigin="anonymous"
          />
        )}
        <div
          style={{
            fontSize: '8px',
            color: 'white',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          Berlaku s/d
          <br />
          {data.validUntilString}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// KTA CARD BACK
// ============================================================
function KTACardBack({ data }: { data: KTACardData }) {
  const peraturan = [
    'Pemilik KTA wajib menjunjung tinggi nilai-nilai perjuangan, kedisiplinan dan loyalitas terhadap cita-cita luhur Laskar Prabowo 08.',
    'KTA ini bukan untuk disalahgunakan dan harus dijaga dengan penuh tanggung jawab.',
    'Apabila ditemukan pelanggaran terhadap kode etik dan aturan organisasi, KTA dapat dicabut oleh pengurus pusat atau wilayah.',
    'Setiap anggota wajib aktif berpartisipasi dalam kegiatan organisasi, sosial dan kemasyarakatan demi mendukung visi besar Laskar Prabowo 08 untuk Indonesia Maju.',
  ]

  return (
    <div className="relative w-full h-full">
      {/* Background: Biru muda (atas 60%) + Merah (bawah 40%) */}
      <div className="absolute inset-0 flex flex-col">
        <div style={{ height: '60%', backgroundColor: '#BFE3F5' }} />
        <div style={{ height: '40%', backgroundColor: '#EF3340' }} />
      </div>

      {/* Globe graphic (di area merah, lebih besar) */}
      <div className="absolute inset-0 flex items-end justify-center" style={{ top: '50%' }}>
        <svg width="320" height="250" viewBox="0 0 200 150" style={{ opacity: 0.25 }}>
          <ellipse cx="100" cy="75" rx="80" ry="75" fill="none" stroke="white" strokeWidth="0.8" />
          <ellipse cx="100" cy="75" rx="80" ry="40" fill="none" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="80" ry="20" fill="none" stroke="white" strokeWidth="0.5" />
          <line x1="20" y1="75" x2="180" y2="75" stroke="white" strokeWidth="0.5" />
          <line x1="100" y1="0" x2="100" y2="150" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="40" ry="75" fill="none" stroke="white" strokeWidth="0.5" />
          <ellipse cx="100" cy="75" rx="20" ry="75" fill="none" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Header: Logo Laskar Prabowo 08 */}
      <div className="relative pt-3 px-4 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          <span
            style={{
              fontFamily: 'Brush Script MT, cursive',
              fontSize: '22px',
              color: '#C62828',
              fontStyle: 'italic',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            Laskar
          </span>
          <div className="flex flex-col leading-none">
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#1A1A1A', letterSpacing: '1px' }}>
              PRABOWO
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#D32F2F' }}>08</span>
          </div>
        </div>
      </div>

      {/* Nomor KTA — badge merah pill shape */}
      <div className="relative flex justify-center mt-3">
        <div
          style={{
            backgroundColor: '#E63946',
            color: 'white',
            padding: '6px 16px',
            borderRadius: '14px',
            fontSize: '11px',
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '1px',
          }}
        >
          {data.ktaNumber}
        </div>
      </div>

      {/* Daftar peraturan */}
      <div className="relative mt-3 px-4 space-y-1.5">
        {peraturan.map((p, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#E63946',
                marginTop: '4px',
                flexShrink: 0,
              }}
            />
            <p style={{ fontSize: '8.5px', lineHeight: 1.3, color: '#1A1A1A', textAlign: 'justify' }}>
              {p}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
