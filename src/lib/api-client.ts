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
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return data.data
}

export { apiFetch as api }
