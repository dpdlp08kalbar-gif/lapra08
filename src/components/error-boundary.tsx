'use client'

// LAPRA 08 - Error Boundary
// ============================================================
// Catch React render errors yang silent (tidak tampil di UI).
// Tampilkan fallback UI dengan info error + tombol retry.
// ============================================================

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 m-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-red-800 text-sm mb-1">
                ⚠️ Terjadi Error saat Render
              </h3>
              <p className="text-xs text-red-700 mb-2">
                Komponen gagal di-render. Ini mungkin karena data tidak sesuai format atau API error.
              </p>
              {this.state.error && (
                <details className="mb-2">
                  <summary className="text-xs text-red-600 cursor-pointer hover:underline">
                    Lihat detail error (untuk debugging)
                  </summary>
                  <pre className="text-[10px] text-red-800 bg-red-100/50 p-2 rounded mt-1 overflow-x-auto max-h-32">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  <RefreshCw className="w-3 h-3" />
                  Coba Lagi
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-300 text-red-700 text-xs rounded hover:bg-red-50"
                >
                  🔄 Refresh Halaman
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
