// LAPRA 08 - Email Service (Vercel Free Compliant)
// =====================================================
// STRATEGI: Dua-mode fallback, 100% gratis:
//
// Mode 1 (PRODUCTION, opsional): Resend.com API
//   - FREE tier selamanya: 3,000 email/bulan, 100 email/hari
//   - Daftar di resend.com → dapatkan API key → simpan RESEND_API_KEY
//   - Jika TIDAK diset, otomatis fallback ke Mode 2
//
// Mode 2 (FALLBACK, selalu jalan): mailto: link
//   - Generate HTML mailto: link dengan subject + body pre-filled
//   - User klik link → buka email client default → kirim manual
//   - 100% gratis, no API, no registration
//
// Vercel Free compliant: tidak ada service berbayar, tidak ada trial
// =====================================================

export type EmailParams = {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string; mailtoLink?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'LAPRA 08 <noreply@lapra08.vercel.app>'

  // Mode 1: Resend API (jika API key diset)
  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.message || data.error || 'Failed to send email' }
      }

      return { success: true, messageId: data.id }
    } catch (e: any) {
      console.warn('[Email] Resend API gagal, fallback ke mailto:', e.message)
      // Fallback ke Mode 2 jika Resend gagal
    }
  }

  // Mode 2: mailto: link (100% gratis, no API)
  // Strip HTML tags untuk body plain text
  const plainTextBody = html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1500) // limit panjang URL

  const toStr = Array.isArray(to) ? to.join(',') : to
  const mailtoLink = `mailto:${toStr}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainTextBody)}`

  console.log('[Email] Fallback ke mailto: link (no RESEND_API_KEY atau Resend gagal)')
  return {
    success: true, // dianggap sukses karena user bisa kirim manual
    mailtoLink,
    messageId: `mailto_${Date.now()}`,
    error: 'Email dibuka via mailto: link — kirim manual dari email client',
  }
}

// Template: Welcome email
export function welcomeEmailTemplate(name: string, username: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://lapra08.vercel.app/logo-lapra08.png" alt="LAPRA 08" style="width: 80px; height: 80px; border-radius: 12px;" />
      </div>
      <h1 style="color: #ea580c; text-align: center;">Selamat Datang di LAPRA 08!</h1>
      <p>Halo <strong>${name}</strong>,</p>
      <p>Akun Anda di Sistem Informasi Internal LAPRA 08 telah berhasil dibuat.</p>
      <p><strong>Username:</strong> ${username}</p>
      <p>Silakan login di <a href="https://lapra08.vercel.app/login" style="color: #ea580c;">lapra08.vercel.app/login</a></p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        © 2026 LAPRA 08 — Perkumpulan Laskar Prabowo 08<br>
        Email ini dikirim otomatis, mohon tidak membalas.
      </p>
    </div>
  `
}

// Template: Notification email
export function notificationEmailTemplate(title: string, message: string, actionUrl?: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://lapra08.vercel.app/logo-lapra08.png" alt="LAPRA 08" style="width: 60px; height: 60px; border-radius: 8px;" />
      </div>
      <h2 style="color: #ea580c;">${title}</h2>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #374151; line-height: 1.6;">${message}</p>
      </div>
      ${actionUrl ? `<a href="${actionUrl}" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Lihat Detail →</a>` : ''}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #6b7280; text-align: center;">
        © 2026 LAPRA 08 — Perkumpulan Laskar Prabowo 08
      </p>
    </div>
  `
}
