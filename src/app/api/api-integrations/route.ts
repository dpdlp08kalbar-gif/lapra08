// LAPRA 08 - API: API Integrations (WA Business, FB Page, IG Business)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const integrations = await db.apiIntegration.findMany()
  return NextResponse.json({ success: true, data: integrations })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPERADMIN') return NextResponse.json({ success: false, error: 'Hanya Super Admin' }, { status: 403 })
  try {
    const body = await request.json()
    const { platform, apiKey, apiSecret, phoneNumberId, businessAccountId, pageId, pageAccessToken, igBusinessAccountId, igAccessToken, displayName, phoneNumber, webhookUrl } = body
    if (!platform) return NextResponse.json({ success: false, error: 'Platform wajib' }, { status: 400 })

    // Upsert by platform (unique)
    const existing = await db.apiIntegration.findUnique({ where: { platform } })
    let integration
    if (existing) {
      integration = await db.apiIntegration.update({
        where: { platform },
        data: {
          apiKey: apiKey || undefined,
          apiSecret: apiSecret || undefined,
          phoneNumberId: phoneNumberId || undefined,
          businessAccountId: businessAccountId || undefined,
          pageId: pageId || undefined,
          pageAccessToken: pageAccessToken || undefined,
          igBusinessAccountId: igBusinessAccountId || undefined,
          igAccessToken: igAccessToken || undefined,
          displayName: displayName || undefined,
          phoneNumber: phoneNumber || undefined,
          webhookUrl: webhookUrl || undefined,
          status: 'CONNECTED',
          lastConnectedAt: new Date(),
          lastError: null,
        },
      })
    } else {
      integration = await db.apiIntegration.create({
        data: {
          platform, apiKey, apiSecret, phoneNumberId, businessAccountId,
          pageId, pageAccessToken, igBusinessAccountId, igAccessToken,
          displayName, phoneNumber, webhookUrl,
          status: 'CONNECTED', lastConnectedAt: new Date(),
        },
      })
    }
    return NextResponse.json({ success: true, data: integration, message: `Integrasi ${platform} berhasil dikonfigurasi` })
  } catch (e: any) { return NextResponse.json({ success: false, error: e.message }, { status: 500 }) }
}

// DELETE - Disconnect integration
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPERADMIN') return NextResponse.json({ success: false, error: 'Hanya Super Admin' }, { status: 403 })
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')
  if (!platform) return NextResponse.json({ success: false, error: 'Platform wajib' }, { status: 400 })

  await db.apiIntegration.updateMany({ where: { platform }, data: { status: 'DISCONNECTED', apiKey: null, apiSecret: null, pageAccessToken: null, igAccessToken: null } })
  return NextResponse.json({ success: true, message: `Integrasi ${platform} diputus` })
}
