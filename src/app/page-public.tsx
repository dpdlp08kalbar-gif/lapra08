// LAPRA 08 - Public Landing Page (read-only, no login required)
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [news, setNews] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/public/berita').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/public/video').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/public/kontak').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([newsRes, videoRes, contactRes]) => {
      setNews(newsRes.data || [])
      setVideos(videoRes.data || [])
      setContacts(contactRes.data || [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-lapra08.png" alt="LAPRA 08" className="w-10 h-10 rounded-lg" />
            <div>
              <div className="font-bold text-base">LAPRA 08</div>
              <div className="text-xs text-muted-foreground">Laskar Prabowo 08</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#berita" className="text-sm font-medium hover:text-orange-600 hidden sm:block">Berita</a>
            <a href="#video" className="text-sm font-medium hover:text-orange-600 hidden sm:block">Video</a>
            <a href="#tentang" className="text-sm font-medium hover:text-orange-600 hidden sm:block">Tentang</a>
            <a href="#kontak" className="text-sm font-medium hover:text-orange-600 hidden sm:block">Kontak</a>
            <Link href="/login" className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-md transition-all">
              Login Operator
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-orange-600 via-red-600 to-orange-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <img src="/logo-lapra08.png" alt="LAPRA 08" className="w-24 h-24 rounded-2xl mx-auto mb-6 shadow-xl" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Laskar Prabowo 08</h1>
          <p className="text-lg md:text-xl opacity-90 mb-2">Perkumpulan Laskar Prabowo 08 (LAPRA 08)</p>
          <p className="text-sm md:text-base opacity-80 max-w-2xl mx-auto">
            Organisasi Kemasyarakatan pendukung visi kebangsaan Prabowo Subianto.
            Terdaftar di 38 Provinsi + IKN + 5 Negara Luar Negeri dengan 514 DPC se-Indonesia.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link href="/login" className="bg-white text-orange-700 px-6 py-3 rounded-lg font-semibold hover:shadow-xl transition-all">
              Login Operator →
            </Link>
            <Link href="/kta" className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-all">
              Pendaftaran KTA
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white py-8 px-4 border-b">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div><div className="text-3xl font-bold text-orange-600">38+</div><div className="text-sm text-muted-foreground">DPD Provinsi</div></div>
          <div><div className="text-3xl font-bold text-orange-600">514</div><div className="text-sm text-muted-foreground">DPC Kab/Kota</div></div>
          <div><div className="text-3xl font-bold text-orange-600">5</div><div className="text-sm text-muted-foreground">DPD Luar Negeri</div></div>
          <div><div className="text-3xl font-bold text-orange-600">1</div><div className="text-sm text-muted-foreground">IKN</div></div>
        </div>
      </section>

      {/* TENTANG */}
      <section id="tentang" className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Tentang LAPRA 08</h2>
          <p className="text-base mb-4 text-muted-foreground leading-relaxed">
            Laskar Prabowo 08 (LAPRA 08) adalah organisasi kemasyarakatan yang berdedikasi
            mendukung visi kebangsaan Presiden Prabowo Subianto. Dengan struktur organisasi
            yang terorganisir dari tingkat pusat (DPN) hingga daerah (DPD) dan cabang (DPC),
            LAPRA 08 hadir di seluruh provinsi Indonesia.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            Visi kami: Menjadi relawan terdepan dalam mendukung Asta Cita Presiden
            dan mewujudkan Indonesia yang maju, adil, dan makmur.
          </p>
        </div>
      </section>

      {/* BERITA */}
      <section id="berita" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Berita Terbaru</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat berita...</div>
          ) : news.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Belum ada berita.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {news.slice(0, 3).map((item: any) => (
                <div key={item.id} className="rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                  <div className="p-4">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 mb-2">{item.source || 'Berita'}</span>
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.content?.substring(0, 120)}</p>
                    <div className="text-xs text-muted-foreground mt-2">{new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* VIDEO */}
      <section id="video" className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Video Kegiatan</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat video...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Belum ada video.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {videos.slice(0, 3).map((video: any) => (
                <div key={video.id} className="rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                  <div className="aspect-video bg-slate-900 relative">
                    {video.thumbnail && <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                    {video.channel && <p className="text-xs text-muted-foreground mt-1">{video.channel}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* KONTAK */}
      <section id="kontak" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Kontak Sekretariat</h2>
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Informasi sekretariat akan ditampilkan di sini.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {contacts.slice(0, 4).map((loc: any) => (
                <div key={loc.id} className="rounded-xl border p-4 bg-white shadow-sm">
                  <h3 className="font-semibold text-sm mb-2">{loc.name}</h3>
                  {loc.address && <p className="text-xs text-muted-foreground mb-1">📍 {loc.address}</p>}
                  {loc.phone && <p className="text-xs text-muted-foreground mb-1">📞 {loc.phone}</p>}
                  {loc.email && <p className="text-xs text-muted-foreground">✉️ {loc.email}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA LOGIN */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Login Operator LAPRA 08</h2>
          <p className="opacity-90 mb-6">Akses sistem informasi internal untuk pengurus DPN, DPD, dan DPC.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-orange-700 px-6 py-3 rounded-lg font-semibold hover:shadow-xl transition-all">
            Masuk Sistem →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <img src="/logo-lapra08.png" alt="LAPRA 08" className="w-12 h-12 rounded-lg mx-auto mb-4" />
          <p className="text-sm font-semibold mb-2">LAPRA 08 — Perkumpulan Laskar Prabowo 08</p>
          <p className="text-xs text-slate-400">© 2026 LAPRA 08. Sistem Informasi Internal Global.</p>
          <p className="text-xs text-slate-500 mt-2">DPN → DPD (38 Provinsi + IKN + 5 LN) → DPC (514 Kab/Kota)</p>
        </div>
      </footer>
    </div>
  )
}
