// LAPRA 08 - Client-side API helper
import { useAuthStore } from './store'

export async function apiFetch(path: string, options: RequestInit = {}) {
  const user = useAuthStore.getState().user
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (user) {
    headers['x-user-id'] = user.id
  }
  const res = await fetch(path, {
    ...options,
    headers,
  })

  // Handle 401 Unauthorized: auto-logout dan reload ke login page
  if (res.status === 401) {
    console.warn('[API] Session invalid or expired, logging out...')
    useAuthStore.getState().logout()
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
    throw new Error('Session tidak valid. Silakan login kembali.')
  }

  // Ambil text dulu, lalu parse kalau non-empty (hindari "Unexpected end of JSON input")
  const text = await res.text()
  let data: any = null
  if (text.trim().length > 0) {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        data = JSON.parse(text)
      } catch (parseErr) {
        console.error('[API] Failed to parse JSON response from', path, parseErr)
        console.error('[API] Raw response (first 500 chars):', text.slice(0, 500))
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: response bukan JSON valid`)
        }
        // Kalau OK tapi bukan JSON, anggap empty success
        return null
      }
    } else {
      // Response bukan JSON (kemungkinan file/stream/text). Kalau OK, return raw text
      if (res.ok) {
        return text
      }
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
  }

  if (!res.ok || (data && data.success === false)) {
    const errMsg = data?.error || `HTTP ${res.status}`
    // Prefix dengan path + method biar gampang tracking endpoint mana yang bermasalah
    const method = (options.method as string) || 'GET'
    const enrichedErr = new Error(`[${method} ${path}] ${errMsg}`)
    console.error(`[API ${res.status}] ${method} ${path}`, {
      status: res.status,
      serverError: data?.error,
      fullResponse: data,
    })
    throw enrichedErr
  }
  // Kalau response berupa { success: true, data: ... } → return data.data
  // Kalau response langsung objek tanpa wrapper → return objek itu sendiri
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data
  }
  return data
}

export { apiFetch as api }
