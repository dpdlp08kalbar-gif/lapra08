// LAPRA 08 - ZAI SDK initializer (for Vercel serverless compatibility)
// =====================================================
// Problem: z-ai-web-dev-sdk only loads config from filesystem paths
//   (process.cwd()/.z-ai-config, os.homedir()/.z-ai-config, /etc/.z-ai-config)
//   but Vercel serverless doesn't have this file — it only exists in dev.
//
// Solution: On first call, lazy-write `.z-ai-config` from Vercel env vars
//   to process.cwd() (writable during function execution).
//
// Required env vars (set in Vercel Project Settings → Environment Variables):
//   ZAI_BASE_URL  e.g. https://internal-api.z.ai/v1
//   ZAI_API_KEY   e.g. Z.ai
//   ZAI_CHAT_ID   e.g. chat-xxxx-xxxx-xxxx
//   ZAI_TOKEN     e.g. eyJhbGciOi...
//   ZAI_USER_ID   e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//
// In dev environment, /etc/.z-ai-config already exists, so we skip writing.
import fs from 'fs'
import path from 'path'

let _initialized = false

export function ensureZaiConfig(): boolean {
  if (_initialized) return true

  const cwd = process.cwd()
  const targetPath = path.join(cwd, '.z-ai-config')

  // Check if file already exists (dev environment or already written)
  if (fs.existsSync(targetPath)) {
    _initialized = true
    return true
  }

  // Also check home dir & /etc (dev environment)
  const homePath = path.join(require('os').homedir(), '.z-ai-config')
  const etcPath = '/etc/.z-ai-config'
  if (fs.existsSync(homePath) || fs.existsSync(etcPath)) {
    _initialized = true
    return true
  }

  // Production: write config from env vars
  const baseUrl = process.env.ZAI_BASE_URL
  const apiKey = process.env.ZAI_API_KEY
  const chatId = process.env.ZAI_CHAT_ID
  const token = process.env.ZAI_TOKEN
  const userId = process.env.ZAI_USER_ID

  if (!baseUrl || !apiKey) {
    // Cannot init without env vars
    return false
  }

  const config = { baseUrl, apiKey, chatId: chatId || '', token: token || '', userId: userId || '' }

  try {
    fs.writeFileSync(targetPath, JSON.stringify(config), { mode: 0o644 })
    _initialized = true
    console.log('[ZAI Init] Config written to', targetPath)
    return true
  } catch (e) {
    console.error('[ZAI Init] Failed to write config:', e)
    return false
  }
}

// Call this before any ZAI.create() call
export function requireZaiConfig(): boolean {
  return ensureZaiConfig()
}
