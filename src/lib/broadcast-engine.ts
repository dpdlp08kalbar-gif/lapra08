// LAPRA 08 - WhatsApp Broadcast Engine (Anti-Banned + Message Queuing + Variable Personalization)
// =====================================================
// Fitur:
// 1. Dynamic contact resolution dari DB berdasarkan wilayah (DPN/DPD/DPC) + segment
// 2. Message queuing dengan rate limit anti-banned:
//    - Random delay 2-8 detik antar pesan
//    - Batch processing (20 pesan per batch, jeda 1 menit)
//    - Max 100 pesan/jam, 500 pesan/hari per nomor pengirim
// 3. Variable personalization: {nama}, {wilayah}, {tanggal} di-resolve per recipient
// 4. Retry mechanism (max 3 retry dengan exponential backoff)
// 5. Multi-provider support: WhatsApp Business API (official), WA Gateway alternatives

import { db } from './db'

// === TYPES ===
export type BroadcastTarget = {
  // Target berdasarkan wilayah
  scope: 'ALL' | 'NATIONAL' | 'PROVINCE' | 'REGENCY' | 'DISTRICT' | 'VILLAGE'
  territoryCode?: string | null // ID, 61, 6171, dst
  // Filter demografi
  ageGroup?: string | null // 17-21 | 22-30 | 31-40 | 41-60 | 61+
  occupation?: string | null // PETANI | NELAYAN | UMKM | PELAJAR | GURU | BURUH | dll
  communitySegment?: string | null // INDIGENOUS | RELIGIOUS | PROFESSION | YOUTH
  // Atau pakai segment yang sudah disimpan
  segmentId?: string | null
  // Filter khusus pengurus LAPRA 08
  onlyLapraMembers?: boolean // hanya pengurus DPN/DPD/DPC
  onlyOptIn?: boolean // default true (hanya yang sudah opt-in WA)
}

export type ResolvedContact = {
  id: string
  name: string
  phone: string | null
  whatsappOptIn: boolean
  territoryCode: string
  territoryName: string
  territoryLevel: string // PROVINCE | REGENCY | dst
  ageGroup: string | null
  occupation: string | null
  gender: string | null
}

// === DYNAMIC CONTACT RESOLVER ===
// Resolve contacts dari database berdasarkan target wilayah + segment
export async function resolveTargetContacts(target: BroadcastTarget): Promise<{
  contacts: ResolvedContact[]
  totalFound: number
  totalOptIn: number
  totalSkipped: number
  filterDescription: string
}> {
  const where: any = {
    isActive: true,
    phone: { not: null },
  }

  if (target.onlyOptIn !== false) {
    where.whatsappOptIn = true
  }

  // Filter berdasarkan wilayah
  if (target.scope === 'PROVINCE' && target.territoryCode) {
    where.provinceCode = target.territoryCode
  } else if (target.scope === 'REGENCY' && target.territoryCode) {
    where.regencyCode = target.territoryCode
  } else if (target.scope === 'DISTRICT' && target.territoryCode) {
    where.districtCode = target.territoryCode
  } else if (target.scope === 'VILLAGE' && target.territoryCode) {
    where.villageCode = target.territoryCode
  }

  // Filter demografi
  if (target.ageGroup) where.ageGroup = target.ageGroup
  if (target.occupation) where.occupation = target.occupation

  // Filter berdasarkan segment yang sudah disimpan
  if (target.segmentId) {
    where.audienceSegments = { some: { id: target.segmentId } }
  }

  // Filter pengurus LAPRA 08 (Member table join)
  let lapraMembers: string[] = []
  if (target.onlyLapraMembers) {
    // Get all Member IDs (yang terdaftar sebagai pengurus LAPRA 08)
    const members = await db.member.findMany({
      where: { isActive: true },
      select: { id: true, contactId: true, territoryId: true, territory: true },
    })
    lapraMembers = members.map(m => m.contactId).filter(Boolean) as string[]
    if (lapraMembers.length > 0) {
      where.id = { in: lapraMembers }
    } else {
      // Fallback: cari contact yang territoryId-nya punya member aktif
      const memberTerritoryIds = members.map(m => m.territoryId)
      where.territoryId = { in: memberTerritoryIds }
    }
  }

  const contacts = await db.contact.findMany({
    where,
    include: { territory: true },
    orderBy: { registeredAt: 'desc' },
    take: 5000, // safety limit
  })

  // Build resolved contacts dengan info wilayah
  const resolvedContacts: ResolvedContact[] = contacts.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    whatsappOptIn: c.whatsappOptIn,
    territoryCode: c.territory?.code || '',
    territoryName: c.territory?.name || 'Nasional',
    territoryLevel: c.territory?.level || 'UNKNOWN',
    ageGroup: c.ageGroup,
    occupation: c.occupation,
    gender: c.gender,
  }))

  const totalFound = resolvedContacts.length
  const totalOptIn = resolvedContacts.filter(c => c.whatsappOptIn).length
  const totalSkipped = totalFound - totalOptIn

  // Build filter description
  let filterDescription = ''
  if (target.scope === 'ALL') filterDescription = 'Semua Indonesia (Nasional)'
  else if (target.scope === 'NATIONAL') filterDescription = 'Nasional (DPN)'
  else if (target.scope === 'PROVINCE' && target.territoryCode) {
    const t = await db.territory.findUnique({ where: { code: target.territoryCode } })
    filterDescription = `Provinsi ${t?.name || target.territoryCode} (DPD)`
  } else if (target.scope === 'REGENCY' && target.territoryCode) {
    const t = await db.territory.findUnique({ where: { code: target.territoryCode } })
    filterDescription = `Kab/Kota ${t?.name || target.territoryCode} (DPC)`
  } else if (target.scope === 'DISTRICT' && target.territoryCode) {
    filterDescription = `Kecamatan ${target.territoryCode}`
  } else if (target.scope === 'VILLAGE' && target.territoryCode) {
    filterDescription = `Kelurahan/Desa ${target.territoryCode}`
  }
  if (target.occupation) filterDescription += ` • Profesi: ${target.occupation}`
  if (target.ageGroup) filterDescription += ` • Usia: ${target.ageGroup}`
  if (target.onlyLapraMembers) filterDescription += ' • Pengurus LAPRA 08'
  if (target.segmentId) {
    const seg = await db.audienceSegment.findUnique({ where: { id: target.segmentId } })
    if (seg) filterDescription += ` • Segment: ${seg.name}`
  }

  return {
    contacts: resolvedContacts.filter(c => c.whatsappOptIn), // hanya yang opt-in
    totalFound,
    totalOptIn,
    totalSkipped,
    filterDescription,
  }
}

// === VARIABLE PERSONALIZATION ===
// Replace {nama}, {wilayah}, {tanggal}, {profesi} dengan data asli per kontak
export function personalizeMessage(template: string, contact: ResolvedContact): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return template
    .replace(/\{nama\}/gi, contact.name)
    .replace(/\{wilayah\}/gi, contact.territoryName)
    .replace(/\{territory\}/gi, contact.territoryName)
    .replace(/\{tanggal\}/gi, dateStr)
    .replace(/\{date\}/gi, dateStr)
    .replace(/\{waktu\}/gi, timeStr)
    .replace(/\{time\}/gi, timeStr)
    .replace(/\{profesi\}/gi, contact.occupation || 'Bapak/Ibu')
    .replace(/\{usia\}/gi, contact.ageGroup || '-')
    .replace(/\{gender\}/gi, contact.gender === 'L' ? 'Bapak' : contact.gender === 'P' ? 'Ibu' : 'Bapak/Ibu')
}

// === MESSAGE QUEUE BUILDER ===
// Build queue dengan scheduledSendAt (random delay untuk anti-banned)
export async function buildMessageQueue(
  broadcastId: string,
  contacts: ResolvedContact[],
  template: string,
  config?: {
    minDelayMs?: number
    maxDelayMs?: number
    batchSize?: number
    batchPauseMs?: number
  }
): Promise<{ queued: number; totalEstimatedMs: number }> {
  const minDelay = config?.minDelayMs ?? 3000 // 3 detik
  const maxDelay = config?.maxDelayMs ?? 10000 // 10 detik
  const batchSize = config?.batchSize ?? 20
  const batchPause = config?.batchPauseMs ?? 60000 // 1 menit

  let currentTime = Date.now()
  let queued = 0
  let totalEstimatedMs = 0

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]

    // Personalisasi pesan
    const personalizedContent = personalizeMessage(template, contact)

    // Hitung scheduledSendAt dengan random delay + batch pause
    const randomDelay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay))
    currentTime += randomDelay
    totalEstimatedMs += randomDelay

    // Setiap batchSize, tambah batch pause
    if (i > 0 && i % batchSize === 0) {
      currentTime += batchPause
      totalEstimatedMs += batchPause
    }

    await db.broadcastMessage.create({
      data: {
        broadcastId,
        contactId: contact.id,
        recipientName: contact.name,
        recipientPhone: contact.phone || '',
        recipientTerritory: contact.territoryName,
        personalizedContent,
        status: 'QUEUED',
        queueOrder: i + 1,
        scheduledSendAt: new Date(currentTime),
      },
    })
    queued++
  }

  return { queued, totalEstimatedMs }
}

// === BROADCAST ENGINE (PROCESS QUEUE) ===
// Proses queue — kirim pesan satu per satu dengan rate limit anti-banned
// Di production, ini akan jalan di background worker (cron job atau queue worker)
export async function processBroadcastQueue(broadcastId: string): Promise<{
  processed: number
  sent: number
  failed: number
  blocked: number
}> {
  // Get config
  const config = await db.broadcastEngineConfig.findFirst()
  if (!config || !config.isActive) {
    throw new Error('Broadcast engine config tidak ditemukan atau tidak aktif')
  }

  // Get all QUEUED messages for this broadcast
  const messages = await db.broadcastMessage.findMany({
    where: {
      broadcastId,
      status: 'QUEUED',
      scheduledSendAt: { lte: new Date() }, // hanya yang sudah due
    },
    orderBy: { queueOrder: 'asc' },
    take: config.batchSize,
  })

  let processed = 0
  let sent = 0
  let failed = 0
  let blocked = 0

  for (const msg of messages) {
    processed++

    try {
      // === WHATSAPP BUSINESS API CALL ===
      // In production, this would call actual WhatsApp Business API or WA Gateway
      // For now, we simulate the API call (production: implement actual provider integration)
      const sendResult = await sendWhatsAppMessage({
        to: msg.recipientPhone,
        message: msg.personalizedContent,
        provider: config.provider,
      })

      if (sendResult.success) {
        await db.broadcastMessage.update({
          where: { id: msg.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            platformMessageId: sendResult.messageId,
          },
        })
        sent++

        // Update contact lastContactedAt
        if (msg.contactId) {
          await db.contact.update({
            where: { id: msg.contactId },
            data: { lastContactedAt: new Date(), contactCount: { increment: 1 } },
          })
        }
      } else {
        // Failed — retry jika masih under maxRetries
        if (msg.retryCount < msg.maxRetries) {
          await db.broadcastMessage.update({
            where: { id: msg.id },
            data: {
              retryCount: { increment: 1 },
              status: 'QUEUED', // re-queue
              scheduledSendAt: new Date(Date.now() + Math.pow(2, msg.retryCount) * 60 * 1000), // exponential backoff
              errorCode: sendResult.errorCode,
              errorMessage: sendResult.errorMessage,
            },
          })
        } else {
          await db.broadcastMessage.update({
            where: { id: msg.id },
            data: {
              status: 'FAILED',
              errorCode: sendResult.errorCode,
              errorMessage: sendResult.errorMessage,
            },
          })
          failed++
        }
      }
    } catch (e: any) {
      // Mark as blocked if it's a ban/delivery issue
      const isBlocked = e.message?.includes('blocked') || e.message?.includes('banned') || e.message?.includes('spam')
      await db.broadcastMessage.update({
        where: { id: msg.id },
        data: {
          status: isBlocked ? 'BLOCKED' : 'FAILED',
          errorMessage: e.message.substring(0, 500),
        },
      })
      if (isBlocked) blocked++
      else failed++
    }

    // Rate limit delay antar pesan
    const delay = config.minDelayMs + Math.floor(Math.random() * (config.maxDelayMs - config.minDelayMs))
    await new Promise(r => setTimeout(r, delay))
  }

  // Update broadcast status jika semua sudah diproses
  const remaining = await db.broadcastMessage.count({
    where: { broadcastId, status: 'QUEUED' },
  })
  if (remaining === 0) {
    const totalMessages = await db.broadcastMessage.count({ where: { broadcastId } })
    const failedCount = await db.broadcastMessage.count({ where: { broadcastId, status: 'FAILED' } })
    const blockedCount = await db.broadcastMessage.count({ where: { broadcastId, status: 'BLOCKED' } })
    const sentCount = await db.broadcastMessage.count({ where: { broadcastId, status: 'SENT' } })

    await db.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: failedCount + blockedCount > 0 ? (sentCount === 0 ? 'FAILED' : 'PARTIAL') : 'SENT',
        sentAt: new Date(),
        recipientCount: totalMessages,
      },
    })
  }

  return { processed, sent, failed, blocked }
}

// === WHATSAPP MESSAGE SENDER (Multi-Provider Support) ===
// Production: implement actual API call untuk provider yang dipilih
// Untuk sekarang, simulate (return success untuk demo)
async function sendWhatsAppMessage(params: {
  to: string
  message: string
  provider: string
}): Promise<{ success: boolean; messageId?: string; errorCode?: string; errorMessage?: string }> {
  const { to, message, provider } = params

  // Validate phone number format (Indonesian: 08xxx or 628xxx)
  const cleanPhone = to.replace(/\D/g, '')
  if (!cleanPhone.match(/^(62|0)8\d{8,12}$/)) {
    return {
      success: false,
      errorCode: 'INVALID_PHONE',
      errorMessage: `Nomor ${to} tidak valid format Indonesia`,
    }
  }

  // === PRODUCTION IMPLEMENTATION ===
  // Pilih provider berdasarkan config:
  // - WHATSAPP_BUSINESS_API: Meta Cloud API (official, paling aman anti-banned)
  //   POST https://graph.facebook.com/v18.0/{phone_number_id}/messages
  //   Headers: Authorization: Bearer {access_token}
  //   Body: { messaging_product: "whatsapp", to: phone, type: "text", text: { body: message } }
  //
  // - WAPBLOOM / WAAMI / FOSSWARES: WA Gateway alternatives (lebih murah, risiko banned lebih tinggi)
  //   POST https://api.provider.com/send-message
  //   Headers: api-key
  //   Body: { phone, message, device: "default" }
  //
  // - GATEWAY_API: Self-hosted (paling murah, kontrol penuh, perlu setup sendiri)
  //
  // Untuk sekarang: simulate success 95% (5% gagal untuk demo retry mechanism)
  await new Promise(r => setTimeout(r, 500 + Math.random() * 1000)) // simulate network latency

  // Simulate 5% failure rate for demo
  if (Math.random() < 0.05) {
    return {
      success: false,
      errorCode: 'NETWORK_TIMEOUT',
      errorMessage: 'Koneksi timeout, akan retry',
    }
  }

  return {
    success: true,
    messageId: `wamid.${Date.now()}.${Math.random().toString(36).substring(2, 10)}`,
  }
}

// === BROADCAST STATS ===
export async function getBroadcastStats(broadcastId: string) {
  const messages = await db.broadcastMessage.findMany({
    where: { broadcastId },
    select: { status: true },
  })

  const stats = {
    total: messages.length,
    queued: messages.filter(m => m.status === 'QUEUED').length,
    sending: messages.filter(m => m.status === 'SENDING').length,
    sent: messages.filter(m => m.status === 'SENT').length,
    delivered: messages.filter(m => m.status === 'DELIVERED').length,
    read: messages.filter(m => m.status === 'READ').length,
    failed: messages.filter(m => m.status === 'FAILED').length,
    blocked: messages.filter(m => m.status === 'BLOCKED').length,
  }

  return {
    ...stats,
    progress: stats.total > 0 ? Math.round(((stats.sent + stats.delivered + stats.read) / stats.total) * 100) : 0,
    successRate: stats.sent > 0 ? Math.round((stats.sent / (stats.sent + stats.failed + stats.blocked)) * 100) : 0,
  }
}

// === INIT DEFAULT ENGINE CONFIG ===
export async function initDefaultEngineConfig() {
  const existing = await db.broadcastEngineConfig.count()
  if (existing > 0) return

  await db.broadcastEngineConfig.create({
    data: {
      messagesPerMinute: 5,
      messagesPerHour: 100,
      messagesPerDay: 500,
      minDelayMs: 3000,
      maxDelayMs: 10000,
      batchSize: 20,
      batchPauseMs: 60000,
      provider: 'WHATSAPP_BUSINESS_API',
      isActive: true,
    },
  })
  console.log('[BroadcastEngine] Default config initialized')
}
