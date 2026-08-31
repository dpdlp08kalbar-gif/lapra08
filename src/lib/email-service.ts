// LAPRA 08 - Email Service via Resend (FREE 3.000 email/bulan)
// Setup: daftar di resend.com → dapatkan API key → simpan di .env
// 
// USAGE:
// import { sendEmail } from '@/lib/email-service'
// await sendEmail({ to: 'admin@lapra08.id', subject: 'Test', html: '<h1>Hello</h1>' })

export type EmailParams = {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'LAPRA 08 <noreply@lapra08.vercel.app>'

  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured — email not sent')
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

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
    return { success: false, error: e.message }
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
