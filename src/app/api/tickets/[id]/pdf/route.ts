// LAPRA 08 - API: Generate PDF Bukti Laporan Tiket
// GET /api/tickets/[id]/pdf — generate PDF bukti laporan (any authenticated user, but pelapor/admin only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import { formatDateTimeID } from '@/lib/format'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        reporter: { include: { territory: true } },
        replies: {
          include: { user: { include: { territory: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Tiket tidak ditemukan' }, { status: 404 })
    }

    // Akses: pelapor sendiri, atau admin (SuperAdmin/DPN)
    const isReporter = ticket.reporterId === user.id
    const isAdmin = user.role === 'SUPERADMIN' || user.role === 'ADMIN_DPN'
    if (!isReporter && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
    }

    // === Generate HTML untuk PDF ===
    // Karena environment ini tidak punya library PDF yang kompleks, kita generate HTML
    // yang user bisa print via browser (Ctrl+P → Save as PDF)
    const categoryLabels: Record<string, string> = {
      BUG: 'Bug / Error Sistem',
      QUESTION: 'Pertanyaan',
      FEATURE_REQUEST: 'Permintaan Fitur',
      OTHER: 'Lainnya',
    }
    const priorityLabels: Record<string, string> = {
      LOW: 'Rendah', MEDIUM: 'Sedang', HIGH: 'Tinggi', URGENT: 'Mendesak',
    }
    const statusLabels: Record<string, string> = {
      OPEN: 'Terbuka', IN_PROGRESS: 'Diproses', RESOLVED: 'Selesai', CLOSED: 'Ditutup',
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Bukti Laporan ${ticket.ticketNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; color: #1f2937; padding: 40px; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; }
    .logo-section { display: flex; align-items: center; gap: 12px; }
    .logo { width: 60px; height: 60px; background: #ea580c; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; }
    .org-name { font-size: 18px; font-weight: bold; color: #1f2937; }
    .org-subtitle { font-size: 12px; color: #6b7280; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 18px; color: #ea580c; margin-bottom: 4px; }
    .doc-title p { font-size: 12px; color: #6b7280; }
    .ticket-number-box { background: #fff7ed; border: 2px dashed #ea580c; padding: 16px 24px; border-radius: 8px; text-align: center; margin-bottom: 24px; }
    .ticket-number-box .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
    .ticket-number-box .value { font-size: 24px; font-weight: bold; color: #ea580c; font-family: monospace; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-card { background: #f9fafb; padding: 14px 16px; border-radius: 6px; border-left: 4px solid #ea580c; }
    .info-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 600; color: #1f2937; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-OPEN { background: #fef3c7; color: #92400e; }
    .status-IN_PROGRESS { background: #dbeafe; color: #1e40af; }
    .status-RESOLVED { background: #d1fae5; color: #065f46; }
    .status-CLOSED { background: #f3f4f6; color: #4b5563; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: bold; color: #ea580c; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .description-box { background: #f9fafb; padding: 16px; border-radius: 6px; font-size: 14px; color: #374151; white-space: pre-wrap; }
    .reply { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; margin-bottom: 8px; }
    .reply-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dashed #e5e7eb; }
    .reply-author { font-weight: 600; font-size: 13px; color: #1f2937; }
    .reply-date { font-size: 11px; color: #6b7280; }
    .reply-message { font-size: 13px; color: #374151; white-space: pre-wrap; }
    .reply.admin { border-left: 4px solid #ea580c; background: #fffbeb; }
    .reply.reporter { border-left: 4px solid #3b82f6; background: #eff6ff; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
    .signature { margin-top: 30px; text-align: center; }
    .signature-line { margin-top: 60px; border-top: 1px solid #1f2937; width: 200px; margin-left: auto; margin-right: auto; padding-top: 6px; }
    .signature-label { font-size: 11px; color: #6b7280; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
    .print-btn { position: fixed; top: 20px; right: 20px; background: #ea580c; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .print-btn:hover { background: #c2410c; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨 Cetak / Save PDF</button>

  <div class="header">
    <div class="logo-section">
      <div class="logo">08</div>
      <div>
        <div class="org-name">LAPRA 08</div>
        <div class="org-subtitle">Laskar Prabowo 08<br>Sistem Informasi Internal</div>
      </div>
    </div>
    <div class="doc-title">
      <h1>BUKTI LAPORAN TIKET</h1>
      <p>Dokumen resmi tanda terima pengaduan/laporan</p>
    </div>
  </div>

  <div class="ticket-number-box">
    <div class="label">Nomor Tiket</div>
    <div class="value">${ticket.ticketNumber}</div>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">Judul Laporan</div>
      <div class="info-value">${ticket.title}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Status</div>
      <div class="info-value">
        <span class="status-badge status-${ticket.status}">${statusLabels[ticket.status]}</span>
      </div>
    </div>
    <div class="info-card">
      <div class="info-label">Kategori</div>
      <div class="info-value">${categoryLabels[ticket.category] || ticket.category}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Prioritas</div>
      <div class="info-value">${priorityLabels[ticket.priority] || ticket.priority}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Pelapor</div>
      <div class="info-value">${ticket.reporter.fullName}</div>
      <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Wilayah: ${ticket.reporter.territory?.name || '-'}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Tanggal Lapor</div>
      <div class="info-value">${formatDateTimeID(ticket.createdAt)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Deskripsi Laporan</div>
    <div class="description-box">${ticket.description}</div>
  </div>

  ${ticket.replies.length > 0 ? `
  <div class="section">
    <div class="section-title">Riwayat Tindak Lanjut (${ticket.replies.length} balasan)</div>
    ${ticket.replies.map((r: any) => {
      const isReporter = r.userId === ticket.reporterId
      return `
      <div class="reply ${isReporter ? 'reporter' : 'admin'}">
        <div class="reply-header">
          <span class="reply-author">${r.user.fullName} ${isReporter ? '(Pelapor)' : '(Admin)'}</span>
          <span class="reply-date">${formatDateTimeID(r.createdAt)}</span>
        </div>
        <div class="reply-message">${r.message}</div>
      </div>
      `
    }).join('')}
  </div>
  ` : ''}

  <div class="signature">
    <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Dokumen ini diterbitkan secara otomatis oleh sistem pada:</p>
    <p style="font-size: 13px; font-weight: 600;">${formatDateTimeID(new Date())}</p>
    <div class="signature-line">
      <div class="signature-label">Tanda Tangan / Stempel Resmi</div>
    </div>
  </div>

  <div class="footer">
    <div>© ${new Date().getFullYear()} LAPRA 08 — Perkumpulan Laskar Prabowo 08</div>
    <div>Sistem Informasi Internal Global</div>
  </div>

  <script>
    // Auto-trigger print dialog after page load
    window.onload = function() {
      setTimeout(function() {
        // Uncomment baris di bawah untuk auto-print
        // window.print();
      }, 500);
    };
  </script>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (e: any) {
    console.error('[Ticket PDF Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
