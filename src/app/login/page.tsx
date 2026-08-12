// LAPRA 08 - Login Page (separate route /login)
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginPage } from '@/components/login-page'
import { useAuthStore } from '@/lib/store'

export default function LoginRoute() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.push('/')
    }
  }, [hasHydrated, isAuthenticated, router])

  if (hasHydrated && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Mengalihkan ke sistem internal...</div>
      </div>
    )
  }

  return <LoginPage />
}
