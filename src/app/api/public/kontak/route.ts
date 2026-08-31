// LAPRA 08 - PUBLIC API: Kontak Sekretariat untuk landing page (no auth, read-only)
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const items = await db.systemSetting.findMany({
      where: { category: 'SEKRETARIAT' },
      take: 10,
    })
    const contacts = items.map(item => {
      try { return JSON.parse(item.value) } catch { return null }
    }).filter(Boolean)
    return NextResponse.json({ success: true, data: contacts })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}
