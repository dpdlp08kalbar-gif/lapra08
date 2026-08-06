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
  const data = await res.json()

  // Handle 401 Unauthorized: auto-logout dan reload ke login page
  if (res.status === 401) {
    console.warn('[API] Session invalid or expired, logging out...')
    useAuthStore.getState().logout()
    // Hanya reload jika bukan di halaman login
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
    throw new Error('Session tidak valid. Silakan login kembali.')
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data.data
}

export { apiFetch as api }
