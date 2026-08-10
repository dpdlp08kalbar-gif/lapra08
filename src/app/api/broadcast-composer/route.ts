// LAPRA 08 - API: Broadcast Composer
// GET - List templates or broadcasts
// POST - Save template / Send broadcast
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

// GET - List templates or recent broadcasts
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'templates'

  if (type === 'templates') {
    const templates = await db.messageTemplate.findMany({
      where: { createdById: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    })
    return NextResponse.json({ success: true, data: templates })
  }

  if (type === 'broadcasts') {
    const broadcasts = await db.broadcast.findMany({
      where: { sentById: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({ success: true, data: broadcasts })
  }

  if (type === 'contacts_count') {
    const totalContacts = await db.contact.count()
    const optInContacts = await db.contact.count({ where: { whatsappOptIn: true } })
    return NextResponse.json({
      success: true,
      data: { total: totalContacts, optIn: optInContacts },
    })
  }

  return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
}

// POST - Save template or send broadcast
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // === Save template mode ===
    if (body.action === 'save_template') {
      const { name, channel, content, variables } = body
      if (!name || !channel || !content) {
        return NextResponse.json({ success: false, error: 'Name, channel, content wajib' }, { status: 400 })
      }
      const template = await db.messageTemplate.create({
        data: {
          name: name.substring(0, 200),
          category: channel,
          content: content.substring(0, 4000),
          variables: JSON.stringify(variables || []),
          createdById: user.id,
        },
      })
      return NextResponse.json({ success: true, data: template, message: 'Template disimpan' })
    }

    // === Send broadcast mode ===
    if (body.action === 'send') {
      const { title, content, channels, segmentId, scheduleAt, imageUrl, videoUrl, linkUrl, attachedEssayPollId } = body
      if (!title || !content || !channels || channels.length === 0) {
        return NextResponse.json({ success: false, error: 'Title, content, channels wajib' }, { status: 400 })
      }

      // Count recipients
      let recipientCount = 0
      if (segmentId) {
        recipientCount = await db.contact.count({
          where: { audienceSegments: { some: { id: segmentId } }, whatsappOptIn: true },
        })
      } else {
        recipientCount = await db.contact.count({ where: { whatsappOptIn: true } })
      }

      // Build full content (append essay poll URL if attached)
      let fullContent = content
      if (attachedEssayPollId) {
        const poll = await db.essayPoll.findUnique({ where: { id: attachedEssayPollId } })
        if (poll) {
          const pollUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://lapra08.id'}/poll/${poll.id}`
          fullContent = `${content}\n\n📝 Survei Essay: ${poll.title}\n${pollUrl}`
        }
      }

      const broadcast = await db.broadcast.create({
        data: {
          title: title.substring(0, 200),
          message: fullContent.substring(0, 4000),
          channel: channels[0], // Primary channel
          channels: JSON.stringify(channels),
          status: scheduleAt ? 'QUEUED' : 'PENDING',
          targetScope: JSON.stringify({ segmentId: segmentId || null, scope: 'all' }),
          recipientCount,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          linkUrl: linkUrl || null,
          scheduledAt: scheduleAt ? new Date(scheduleAt) : null,
          sentById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        data: broadcast,
        message: `Broadcast ${scheduleAt ? 'dijadwalkan' : 'dibuat'}. Target: ${recipientCount} penerima.`,
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('[Broadcast POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
