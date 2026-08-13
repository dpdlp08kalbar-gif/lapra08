// LAPRA 08 - PHASE 1: FOSS WhatsApp Gateway (Baileys)
// =====================================================
// Replaces Math.random() simulation in broadcast-engine.ts.
// Uses @whiskeysockets/baileys — FOSS WhatsApp Web reverse-engineered library.
//
// ⚠️ DEPLOYMENT NOTE:
//   Baileys maintains a persistent WebSocket connection to WhatsApp servers.
//   This is INCOMPATIBLE with Vercel serverless (functions are ephemeral).
//
//   This module is meant to run INSIDE the worker process (Railway/Fly.io/VPS),
//   NOT inside Vercel functions. Vercel functions enqueue send jobs via BullMQ;
//   the worker process picks them up and uses this client to send real messages.
//
// AUTHENTICATION:
//   First-time setup: scan QR code displayed in worker logs (or via /api/whatsapp/qr endpoint).
//   Auth state is persisted to filesystem (BAILEYS_AUTH_DIR) so re-connects don't need re-scan.
//
// RATE LIMITING (anti-banned):
//   Already enforced by BullMQ job scheduling + delay between jobs.
//   Additional client-level rate limit: 5 msgs/min, 100 msgs/hour (configurable).
// =====================================================

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
  type proto,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import P from 'pino'

const AUTH_DIR = process.env.BAILEYS_AUTH_DIR || './baileys-auth'

// === SINGLETON STATE ===
let _sock: WASocket | null = null
let _isConnecting = false
let _qrCode: string | null = null
let _connectionStatus: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'LOGGED_OUT' = 'DISCONNECTED'
let _lastError: string | null = null
let _lastConnectedAt: Date | null = null
let _messageCounter = { minute: 0, hour: 0, day: 0, windowStart: Date.now() }

const MAX_MSG_PER_MIN = 5
const MAX_MSG_PER_HOUR = 100
const MAX_MSG_PER_DAY = 500

const logger = P({ level: process.env.BAILEYS_LOG_LEVEL || 'warn' })

/**
 * Get or initialize the singleton Baileys socket connection.
 * Safe to call from anywhere — returns existing connection if active.
 */
export async function getBaileysClient(): Promise<WASocket | null> {
  if (_sock && _connectionStatus === 'CONNECTED') return _sock
  if (_isConnecting) {
    // Wait for ongoing connection attempt
    while (_isConnecting) await new Promise(r => setTimeout(r, 500))
    return _sock
  }

  _isConnecting = true
  _connectionStatus = 'CONNECTING'

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`[Baileys] Using WA version ${version.join('.')}, isLatest=${isLatest}`)

    _sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false, // we capture QR via event
      logger,
      browser: ['LAPRA 08', 'Chrome', '1.0.0'],
      defaultQueryTimeoutMs: 30000,
      markOnlineOnConnect: false, // don't mark as online (stealth)
    })

    _sock.ev.on('creds.update', saveCreds)

    _sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        _qrCode = qr
        console.log('[Baileys] QR code generated. Scan via /api/whatsapp/qr endpoint.')
        console.log('[Baileys] (Worker log only — QR not printed here for security.)')
      }

      if (connection === 'open') {
        _connectionStatus = 'CONNECTED'
        _qrCode = null
        _lastError = null
        _lastConnectedAt = new Date()
        console.log('[Baileys] WhatsApp connected successfully ✅')
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        _connectionStatus = 'DISCONNECTED'
        _lastError = lastDisconnect?.error?.message || 'Unknown error'

        if (statusCode === DisconnectReason.loggedOut) {
          _connectionStatus = 'LOGGED_OUT'
          console.error('[Baileys] Device logged out. Need to re-scan QR.')
        } else {
          // Reconnect with backoff (5s, then 10s, then 30s)
          const delay = _lastConnectedAt ? 5000 : 30000
          console.log(`[Baileys] Connection closed (status ${statusCode}). Reconnecting in ${delay}ms...`)
          setTimeout(() => {
            _sock = null
            getBaileysClient()
          }, delay)
        }
      }
    })

    return _sock
  } catch (e: any) {
    _connectionStatus = 'DISCONNECTED'
    _lastError = e.message
    console.error('[Baileys] Init failed:', e.message)
    return null
  } finally {
    _isConnecting = false
  }
}

/**
 * Send a WhatsApp message to a JID (recipient ID).
 *
 * @param jid   Format: "6281234567890@s.whatsapp.net" (personal) or
 *                     "6281234567890-1234567890@g.us" (group)
 * @param message  Plain text message (variables already resolved by caller)
 */
export async function sendWhatsAppMessage(
  jid: string,
  message: string
): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  // === Rate limit check (per-instance, basic) ===
  const now = Date.now()
  const oneMinAgo = now - 60 * 1000
  const oneHourAgo = now - 60 * 60 * 1000
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  // Reset windows if needed
  if (_messageCounter.windowStart < oneHourAgo) {
    _messageCounter = { minute: 0, hour: 0, day: 0, windowStart: now }
  } else if (_messageCounter.windowStart < oneMinAgo) {
    _messageCounter.minute = 0
    _messageCounter.windowStart = now
  }

  if (_messageCounter.minute >= MAX_MSG_PER_MIN) {
    return { success: false, error: `Rate limit: max ${MAX_MSG_PER_MIN} msgs/min. Retry in ${(60 - Math.floor((now - _messageCounter.windowStart) / 1000))}s.` }
  }
  if (_messageCounter.hour >= MAX_MSG_PER_HOUR) {
    return { success: false, error: `Rate limit: max ${MAX_MSG_PER_HOUR} msgs/hour. Retry later.` }
  }
  if (_messageCounter.day >= MAX_MSG_PER_DAY) {
    return { success: false, error: `Rate limit: max ${MAX_MSG_PER_DAY} msgs/day. Come back tomorrow.` }
  }

  const sock = await getBaileysClient()
  if (!sock || _connectionStatus !== 'CONNECTED') {
    return {
      success: false,
      error: `WhatsApp not connected. Status: ${_connectionStatus}${_qrCode ? '. Scan QR first.' : ''}`,
    }
  }

  try {
    const result = await sock.sendMessage(jid, { text: message }) as proto.IWebMessageInfo | undefined
    _messageCounter.minute++
    _messageCounter.hour++
    _messageCounter.day++
    return {
      success: true,
      messageId: result?.key?.id || `msg_${Date.now()}`,
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// === STATUS / INFO ENDPOINTS ===
export function getQRCode(): string | null {
  return _qrCode
}

export function getConnectionStatus(): {
  status: typeof _connectionStatus
  lastError: string | null
  lastConnectedAt: Date | null
  qrAvailable: boolean
} {
  return {
    status: _connectionStatus,
    lastError: _lastError,
    lastConnectedAt: _lastConnectedAt,
    qrAvailable: !!_qrCode,
  }
}

export function getMessageStats() {
  return {
    ..._messageCounter,
    limits: { minute: MAX_MSG_PER_MIN, hour: MAX_MSG_PER_HOUR, day: MAX_MSG_PER_DAY },
  }
}

/**
 * Convert a phone number (e.g. "081234567890") to WhatsApp JID format.
 * Indonesian numbers: 08 → 628, then add @s.whatsapp.net
 */
export function phoneToJid(phone: string): string {
  let normalized = phone.replace(/\D/g, '') // digits only
  if (normalized.startsWith('0')) normalized = '62' + normalized.substring(1)
  else if (normalized.startsWith('8')) normalized = '62' + normalized
  else if (!normalized.startsWith('62')) normalized = '62' + normalized
  return `${normalized}@s.whatsapp.net`
}

/**
 * Graceful shutdown — close WebSocket cleanly.
 * Used by worker process on SIGTERM/SIGINT.
 */
export async function closeBaileysClient(): Promise<void> {
  if (_sock) {
    try {
      await _sock.logout()
      console.log('[Baileys] Logged out.')
    } catch (e) {
      console.error('[Baileys] Logout error:', e)
    }
    _sock = null
    _connectionStatus = 'DISCONNECTED'
  }
}
