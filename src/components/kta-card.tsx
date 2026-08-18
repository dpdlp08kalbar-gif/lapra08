// LAPRA 08 - KTA Digital Card Component
// Pakai gambar KTA asli sebagai background
// Field kosong sebagai placeholder (akan diisi dari database)
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
        <div ref={cardRef} className="kta-card relative shadow-2xl" style={{ width: '340px', height: '510px', borderRadius: '16px', overflow: 'hidden' }}>
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
// KTA SAMPLE CARD — template kosong dengan placeholder
// Gambar asli sebagai background, field kosong untuk diisi database
// ============================================================
export function KTASampleCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div style={{ width: '220px', height: '330px', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
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
          <div style={{ width: '300px', height: '450px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <KTATemplateFront />
          </div>
          <div className="text-xs font-medium text-muted-foreground">Sisi Depan</div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div style={{ width: '300px', height: '450px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
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
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Barcode</Badge><span className="text-muted-foreground">Auto-generate dari sistem barcode KTA</span></div>
          <div className="flex items-start gap-2"><Badge variant="outline" className="text-[10px] shrink-0">Masa Berlaku</Badge><span className="text-muted-foreground">Otomatis: 1 Jan - 31 Des tahun berjalan</span></div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// KTA TEMPLATE FRONT — gambar asli + field kosong
// Foto, nama, masa berlaku, barcode = KOSONG (placeholder)
// ============================================================
function KTATemplateFront() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Background: gambar KTA asli */}
      <img src="/kta-front.png" alt="KTA Depan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Placeholder: FOTO — tutup area foto asli dengan kotak kosong */}
      <div style={{
        position: 'absolute',
        top: '19%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '36%',
        height: '27%',
        backgroundColor: 'rgba(255, 224, 178, 0.95)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed #999',
      }}>
        <span style={{ fontSize: '9px', color: '#888', textAlign: 'center' }}>
          [ INPUT FOTO<br />SISTEM ]
        </span>
      </div>

      {/* Placeholder: NAMA — tutup area nama asli */}
      <div style={{
        position: 'absolute',
        top: '47%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60%',
        height: '4%',
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: '8px', color: '#999' }}>[ NAMA DATABASE ]</span>
      </div>

      {/* Placeholder: BARCODE/QR — tutup area QR asli */}
      <div style={{
        position: 'absolute',
        bottom: '8%',
        right: '9%',
        width: '52px',
        height: '52px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed #999',
      }}>
        <span style={{ fontSize: '6px', color: '#999', textAlign: 'center' }}>
          [ BARCODE ]
        </span>
      </div>

      {/* Placeholder: MASA BERLAKU — tutup teks berlaku asli */}
      <div style={{
        position: 'absolute',
        bottom: '3%',
        right: '8%',
        width: '60px',
        height: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: '5px', color: '#999' }}>[ BERLAKU ]</span>
      </div>
    </div>
  )
}

// ============================================================
// KTA TEMPLATE BACK — gambar asli + nomor KTA kosong
// ============================================================
function KTATemplateBack() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Background: gambar KTA asli */}
      <img src="/kta-back.png" alt="KTA Belakang" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Placeholder: NOMOR KTA — tutup badge nomor asli */}
      <div className="kta-number-box" style={{
        position: 'absolute',
        top: '18.5%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#E31E24',
        padding: '4px 16px',
        borderRadius: '999px',
        minWidth: '120px',
        textAlign: 'center',
      }}>
        <span style={{ color: 'white', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>
          [ NOMOR KTA ]
        </span>
      </div>
    </div>
  )
}

// ============================================================
// KTA CARD FRONT (dengan data nyata dari database)
// ============================================================
function KTACardFront({ data }: { data: KTACardData }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Background: gambar KTA asli */}
      <img src="/kta-front.png" alt="KTA Depan" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Foto anggota dari database */}
      {data.photoUrl && (
        <img
          src={data.photoUrl}
          alt={data.fullName}
          style={{
            position: 'absolute',
            top: '19%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '36%',
            height: '27%',
            objectFit: 'cover',
            borderRadius: '10px',
          }}
          crossOrigin="anonymous"
        />
      )}

      {/* Nama dari database */}
      <div style={{
        position: 'absolute',
        top: '47%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '80%',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: 600,
        color: '#1A1A1A',
      }}>
        {data.fullName}
      </div>

      {/* Barcode/QR dari sistem */}
      {data.qrCodeDataUrl && (
        <img
          src={data.qrCodeDataUrl}
          alt="QR"
          style={{
            position: 'absolute',
            bottom: '8%',
            right: '9%',
            width: '52px',
            height: '52px',
            backgroundColor: 'white',
            padding: '2px',
            borderRadius: '3px',
          }}
          crossOrigin="anonymous"
        />
      )}

      {/* Masa berlaku otomatis */}
      <div style={{
        position: 'absolute',
        bottom: '3%',
        right: '8%',
        fontSize: '7px',
        color: 'white',
        fontWeight: 500,
        textAlign: 'center',
      }}>
        Berlaku s/d<br />{data.validUntilString}
      </div>
    </div>
  )
}

// ============================================================
// KTA CARD BACK (dengan data nyata dari database)
// ============================================================
function KTACardBack({ data }: { data: KTACardData }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Background: gambar KTA asli */}
      <img src="/kta-back.png" alt="KTA Belakang" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Nomor KTA dari database */}
      <div className="kta-number-box" style={{
        position: 'absolute',
        top: '18.5%',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#E31E24',
        color: 'white',
        padding: '4px 16px',
        borderRadius: '999px',
        fontSize: '9px',
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
      }}>
        {data.ktaNumber}
      </div>
    </div>
  )
}
