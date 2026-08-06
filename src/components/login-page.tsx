'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldOff, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const DEMO_ACCOUNTS = [
  { username: 'superadmin', role: 'Super Admin (Pusat)', territory: 'Global' },
  { username: 'dpn', role: 'Admin DPN (Pusat)', territory: 'Global' },
  { username: 'dpd.kalbar', role: 'Admin DPD', territory: 'Kalimantan Barat' },
  { username: 'dpc.71', role: 'Admin DPC', territory: 'Kota Pontianak' },
  { username: 'dpc.75', role: 'Admin DPC', territory: 'Kab. Sambas' },
]

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await api('/api/auth', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      login(user)
      // Reload untuk load ulang page dengan session
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Gagal login')
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(uname: string) {
    setUsername(uname)
    setPassword('lapra08admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col gap-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
              <Shield className="w-9 h-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                LAPRA 08
              </h1>
              <p className="text-sm text-muted-foreground">
                Perkumpulan Laskar Prabowo 08
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">
              Sistem Informasi Internal Global
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Platform terpadu untuk manajemen keanggotaan, logistik, event, dan
              komunikasi lintas wilayah DPN, DPD, dan DPC. Saat ini fokus pada
              DPD Kalimantan Barat dengan 14 Kabupaten/Kota.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="text-2xl font-black text-orange-700">14</div>
                <div className="text-xs text-orange-600 font-medium">
                  Kab/Kota Kalbar
                </div>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="text-2xl font-black text-red-700">3</div>
                <div className="text-xs text-red-600 font-medium">
                  Tingkat Admin (DPN/DPD/DPC)
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-2xl font-black text-emerald-700">10</div>
                <div className="text-xs text-emerald-600 font-medium">
                  Menu Operasional
                </div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <div className="text-2xl font-black text-purple-700">100%</div>
                <div className="text-xs text-purple-600 font-medium">
                  Arsitektur Dinamis
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <ShieldOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-amber-900">
                Mode Akses Terbuka (Development)
              </div>
              <div className="text-amber-700 mt-1">
                Keamanan ketat (MFA, IP Whitelisting, Auto-Logout) sementara
                dinonaktifkan selama masa pengisian data awal.
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <Card className="shadow-xl border-orange-200">
          <CardHeader className="space-y-3">
            <div className="lg:hidden flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  LAPRA 08
                </div>
                <div className="text-xs text-muted-foreground">
                  Sistem Informasi Internal
                </div>
              </div>
            </div>
            <CardTitle className="text-2xl">Masuk Sistem</CardTitle>
            <CardDescription>
              Gunakan akun yang diberikan oleh admin pusat untuk mulai bekerja.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cth: dpd.kalbar"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...
                  </>
                ) : (
                  'Masuk Sistem'
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Akun Demo (Klik untuk isi otomatis)
              </div>
              <div className="grid gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    onClick={() => quickLogin(acc.username)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:border-orange-300 hover:bg-orange-50 transition-colors text-left"
                  >
                    <div>
                      <div className="text-sm font-medium">{acc.username}</div>
                      <div className="text-xs text-muted-foreground">{acc.role}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {acc.territory}
                    </Badge>
                  </button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Password semua akun demo:{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono">
                  lapra08admin
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
