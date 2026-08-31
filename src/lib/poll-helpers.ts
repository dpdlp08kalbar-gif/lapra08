// LAPRA 08 - Poll Helpers (shared validation & payload logic)
// ============================================================
// Dipakai oleh:
//   - /api/essay-polls/[id]/responses/route.ts (public submit)
//   - /api/surveyor-feed/[userId]/route.ts (surveyor submit)
//
// Validasi jawaban sesuai pollType:
//   - ESSAY: minimal 10 karakter, bukan spam
//   - MULTIPLE_CHOICE: jawaban harus ada di options[]
//   - LIKERT: jawaban format "N. Label" (N = 1..likertScale)
// ============================================================

export type PollType = 'ESSAY' | 'MULTIPLE_CHOICE' | 'LIKERT'

export interface PollConfig {
  pollType: PollType
  options?: string[] | null
  likertScale?: number | null
  likertLabels?: string[] | null
}

// === Load poll config dari DB (inline, untuk dipakai di API routes) ===
import { db } from './db'

export async function loadPollConfig(pollId: string): Promise<PollConfig> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: `poll_config_${pollId}` },
      select: { value: true },
    })
    if (!setting) return { pollType: 'ESSAY' }
    const parsed = JSON.parse(setting.value)
    return {
      pollType: parsed.pollType || 'ESSAY',
      options: parsed.options || null,
      likertScale: parsed.likertScale || null,
      likertLabels: parsed.likertLabels || null,
    }
  } catch {
    return { pollType: 'ESSAY' }
  }
}

// === Validasi jawaban sesuai pollType ===
// Return: { valid: boolean, error?: string, normalizedAnswer?: string }
export function validateAnswerByPollType(
  answer: string,
  config: PollConfig
): { valid: boolean; error?: string; normalizedAnswer?: string } {
  if (!answer || typeof answer !== 'string') {
    return { valid: false, error: 'Jawaban wajib diisi' }
  }

  const trimmed = answer.trim()

  switch (config.pollType) {
    case 'ESSAY': {
      if (trimmed.length < 10) {
        return { valid: false, error: 'Jawaban minimal 10 karakter' }
      }
      return { valid: true, normalizedAnswer: trimmed.substring(0, 5000) }
    }

    case 'MULTIPLE_CHOICE': {
      const options = config.options || []
      if (options.length === 0) {
        return { valid: false, error: 'Poll multiple choice tidak punya opsi (config error)' }
      }
      // Cek exact match (case-sensitive)
      if (!options.includes(trimmed)) {
        return {
          valid: false,
          error: `Jawaban tidak valid. Harus salah satu: ${options.join(', ')}`,
        }
      }
      return { valid: true, normalizedAnswer: trimmed }
    }

    case 'LIKERT': {
      const scale = config.likertScale || 5
      // Parse format "N. Label" atau "N"
      const match = trimmed.match(/^(\d+)(?:\.\s*(.+))?$/)
      if (!match) {
        return {
          valid: false,
          error: `Format jawaban Likert tidak valid. Harus: "N. Label" (N = 1..${scale})`,
        }
      }
      const idx = parseInt(match[1], 10)
      if (idx < 1 || idx > scale) {
        return {
          valid: false,
          error: `Skala Likert harus antara 1 dan ${scale}`,
        }
      }
      // Normalize: gunakan label dari config jika ada
      const labels = config.likertLabels || []
      const label = labels[idx - 1] || match[2] || `Skala ${idx}`
      return { valid: true, normalizedAnswer: `${idx}. ${label}` }
    }

    default:
      return { valid: false, error: `Unknown pollType: ${config.pollType}` }
  }
}

// === Get submit success message sesuai pollType ===
export function getSubmitSuccessMessage(
  pollType: PollType,
  wordCount: number,
  aiProvider: string,
  sentiment: string,
  score: number
): string {
  const base = `Terima kasih! Jawaban Anda`
  const aiPart = `telah dikirim & dianalisis AI (${aiProvider}). Sentimen: ${sentiment}, urgency: ${score}/100.`

  if (pollType === 'ESSAY') {
    return `${base} (${wordCount} kata) ${aiPart}`
  }
  if (pollType === 'MULTIPLE_CHOICE') {
    return `${base} ${aiPart}`
  }
  if (pollType === 'LIKERT') {
    return `${base} ${aiPart}`
  }
  return `${base} ${aiPart}`
}
