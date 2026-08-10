// LAPRA 08 - API: Broadcast Composer
// GET - List templates or broadcasts
// POST - Save template / Send broadcast (with dynamic contact resolution + queue)
//
// INTEGRATED:
// 1. Dynamic contact resolution dari DB per wilayah (DPN/DPD/DPC) + segment
// 2. Message queuing anti-banned (rate limit + batch + random delay)
// 3. Variable personalization ({nama}, {wilayah}, {tanggal}, {profesi})
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'
import {
  resolveTargetContacts, buildMessageQueue, initDefaultEngineConfig,
  type BroadcastTarget,
} from '@/lib/broadcast-engine'

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
      const { title, content, channels, scheduleAt, imageUrl, videoUrl, linkUrl, attachedEssayPollId, target } = body
      if (!title || !content || !channels || channels.length === 0) {
        return NextResponse.json({ success: false, error: 'Title, content, channels wajib' }, { status: 400 })
      }

      await initDefaultEngineConfig()

      // === STEP 1: Resolve target contacts dari DB berdasarkan wilayah + segment ===
      // Target format: { scope: 'PROVINCE' | 'REGENCY' | 'ALL', territoryCode, ageGroup, occupation, onlyLapraMembers, segmentId }
      const broadcastTarget: BroadcastTarget = target || { scope: 'ALL', onlyOptIn: true }
      const resolved = await resolveTargetContacts(broadcastTarget)

      if (resolved.contacts.length === 0) {
        return NextResponse.json({
          success: false,
          error: `Tidak ada kontak WhatsApp opt-in yang cocok dengan filter: ${resolved.filterDescription}. Total ditemukan: ${resolved.totalFound}, WA opt-in: ${resolved.totalOptIn}.`,
        }, { status: 400 })
      }

      // === STEP 2: Build full content (append essay poll URL if attached) ===
      let fullContent = content
      if (attachedEssayPollId) {
        const poll = await db.essayPoll.findUnique({ where: { id: attachedEssayPollId } })
        if (poll) {
          const pollUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://lapra08.id'}/poll/${poll.id}`
          fullContent = `${content}\n\n📝 Survei Essay: ${poll.title}\n${pollUrl}`
        }
      }

      // === STEP 3: Create broadcast record ===
      const broadcast = await db.broadcast.create({
        data: {
          title: title.substring(0, 200),
          message: fullContent.substring(0, 4000),
          channel: channels[0], // Primary channel
          channels: JSON.stringify(channels),
          status: scheduleAt ? 'QUEUED' : 'PENDING',
          targetScope: JSON.stringify({ target: broadcastTarget, filterDescription: resolved.filterDescription }),
          recipientCount: resolved.contacts.length,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          linkUrl: linkUrl || null,
          scheduledAt: scheduleAt ? new Date(scheduleAt) : null,
          sentById: user.id,
        },
      })

      // === STEP 4: Build message queue (personalized per recipient) ===
      // Hanya build queue untuk WhatsApp channel (FB/IG/Email pakai API masing-masing, tidak perlu queue per-recipient)
      let queueResult = { queued: 0, totalEstimatedMs: 0 }
      if (channels.includes('WHATSAPP')) {
        queueResult = await buildMessageQueue(broadcast.id, resolved.contacts, fullContent)
      }

      // === STEP 5: Update broadcast status ===
      const finalStatus = scheduleAt ? 'QUEUED' : 'PENDING'
      await db.broadcast.update({
        where: { id: broadcast.id },
        data: { status: finalStatus },
      })

      const estMinutes = Math.ceil(queueResult.totalEstimatedMs / 60000)
      return NextResponse.json({
        success: true,
        data: broadcast,
        message: `Broadcast dibuat & ${queueResult.queued} pesan masuk antrian. Target: ${resolved.filterDescription}. Estimasi selesai: ${estMinutes} menit (anti-banned rate limit).`,
        queue: {
          totalQueued: queueResult.queued,
          estimatedMinutes: estMinutes,
          filterDescription: resolved.filterDescription,
          totalFound: resolved.totalFound,
          totalOptIn: resolved.totalOptIn,
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    console.error('[Broadcast POST] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
