// LAPRA 08 - Instrumentation file
// Auto-starts background scheduler saat Next.js server start
// File ini otomatis dipanggil oleh Next.js saat server boot

export async function register() {
  // Only run on server side (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] LAPRA 08 server starting...')
    
    try {
      // Dynamic import to avoid loading during build
      const { startBackgroundScheduler, initializeDefaultJobs, runScheduledJobs } = await import('@/lib/agent-orchestrator')
      const { initDefaultEngineConfig } = await import('@/lib/broadcast-engine')
      
      // Initialize default jobs if not exist
      await initializeDefaultJobs()
      console.log('[Instrumentation] ✅ Background jobs initialized')
      
      // Initialize broadcast engine config
      await initDefaultEngineConfig()
      console.log('[Instrumentation] ✅ Broadcast engine config initialized')
      
      // Start background scheduler (auto-scrape every hour, recompute trust every 30min)
      startBackgroundScheduler()
      console.log('[Instrumentation] ✅ Background scheduler started (checking jobs every 5 minutes)')
      
      // Run due jobs immediately on startup (check if any are overdue)
      setTimeout(async () => {
        try {
          const result = await runScheduledJobs()
          if (result.jobsRun > 0) {
            console.log(`[Instrumentation] ✅ Initial job run: ${result.jobsRun} jobs executed`)
          } else {
            console.log('[Instrumentation] ℹ️ No due jobs at startup (next run scheduled)')
          }
        } catch (e: any) {
          console.error('[Instrumentation] Initial job run failed:', e.message)
        }
      }, 10000) // Wait 10s after startup for DB to be ready
      
    } catch (e: any) {
      console.error('[Instrumentation] ❌ Failed to start background scheduler:', e.message)
    }
  }
}
