// LAPRA 08 - KTA Digital Card Component
// Render KTA (Kartu Tanda Anggota) digital — depan + belakang
// Format: Portrait, 85.6 × 54mm (credit card size)
// Layout mengikuti desain KTA asli LAPRA 08
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Download, Printer, RefreshCw } from 'lucide-react'
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
// KTA CARD FRONT
// ============================================================
function KTACardFront({ data }: { data: KTACardData }) {
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
                fontSize: '12px',
              }}
            >
              Foto
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
