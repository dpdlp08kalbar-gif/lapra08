// LAPRA 08 - Konfigurasi WA Gateway (Fonnte) + Background Scheduler startup
import { db } from '../src/lib/db'
import { initDefaultEngineConfig } from '../src/lib/broadcast-engine'

async function main() {
  console.log('=== KONFIGURASI WA GATEWAY + BACKGROUND SCHEDULER ===\n')

  // 1. Init broadcast engine config
  await initDefaultEngineConfig()
  
  // 2. Set Fonnte sebagai active provider
  const config = await db.broadcastEngineConfig.findFirst()
  if (config) {
    await db.broadcastEngineConfig.update({
      where: { id: config.id },
      data: { provider: 'FONNTE' },
    })
    console.log('✅ Active WA Gateway provider: FONNTE')
  }

  // 3. Simpan API key Fonnte (simulasi — user ganti dengan token asli dari fonnte.com)
  const existingFonnte = await db.apiIntegration.findUnique({ where: { platform: 'FONNTE' } })
  if (!existingFonnte) {
    await db.apiIntegration.create({
      data: {
        platform: 'FONNTE',
        apiKey: 'PLACEHOLDER_REPLACE_WITH_REAL_FONNTE_TOKEN',
        displayName: 'Fonnte WA Gateway (Indonesia)',
        status: 'CONNECTED',
        lastConnectedAt: new Date(),
        webhookUrl: 'https://fonnte.com/api/send_message.php',
      },
    })
    console.log('✅ Fonnte API key placeholder saved (replace with real token from fonnte.com)')
  } else {
    console.log('ℹ️ Fonnte integration already exists')
  }

  // 4. Also save Waboo sebagai backup
  const existingWaboo = await db.apiIntegration.findUnique({ where: { platform: 'WABOO' } })
  if (!existingWaboo) {
    await db.apiIntegration.create({
      data: {
        platform: 'WABOO',
        apiKey: 'PLACEHOLDER_REPLACE_WITH_REAL_WABOO_KEY',
        displayName: 'Waboo WA Gateway (Indonesia)',
        status: 'CONNECTED',
        lastConnectedAt: new Date(),
      },
    })
    console.log('✅ Waboo API key placeholder saved (backup provider)')
  }

  // 5. Verify config
  const finalConfig = await db.broadcastEngineConfig.findFirst()
  const integrations = await db.apiIntegration.findMany()
  console.log('\n=== VERIFICATION ===')
  console.log('Active provider:', finalConfig?.provider)
  console.log('Rate limit:', `${finalConfig?.messagesPerMinute}/min, ${finalConfig?.messagesPerHour}/hour, ${finalConfig?.messagesPerDay}/day`)
  console.log('Anti-banned delay:', `${finalConfig?.minDelayMs}-${finalConfig?.maxDelayMs}ms random, batch ${finalConfig?.batchSize} pause ${finalConfig?.batchPauseMs}ms`)
  console.log('API integrations:')
  integrations.forEach(i => {
    console.log(`  - ${i.platform}: ${i.status} | key: ${i.apiKey?.substring(0, 20)}... | name: ${i.displayName}`)
  })

  console.log('\n=== BACKGROUND JOBS ===')
  const jobs = await db.backgroundJob.findMany()
  jobs.forEach(j => {
    console.log(`  - ${j.isActive ? '🟢 ACTIVE' : '🔴 PAUSED'} ${j.jobName} (every ${j.intervalMinutes}min)`)
  })
  console.log('\n✅ Semua konfigurasi tersimpan. Background scheduler akan otomatis berjalan saat server start.')
  console.log('ℹ️ Ganti PLACEHOLDER Fonnte/Waboo API key dengan token asli dari fonnte.com / waboo.id')
}

main().catch(e => { console.error(e); process.exit(1) })
.finally(async () => { await db.$disconnect() })
