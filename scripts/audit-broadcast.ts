import { db } from '../src/lib/db'

async function main() {
  const total = await db.broadcastMessage.count()
  const sent = await db.broadcastMessage.count({ where: { status: 'SENT' } })
  const queued = await db.broadcastMessage.count({ where: { status: 'QUEUED' } })
  const failed = await db.broadcastMessage.count({ where: { status: 'FAILED' } })
  console.log(`  Total: ${total}, Sent: ${sent}, Queued: ${queued}, Failed: ${failed}`)
  
  const broadcasts = await db.broadcast.findMany({ select: { title: true, status: true, recipientCount: true } })
  console.log('  Broadcasts:')
  broadcasts.forEach(b => console.log(`    - ${b.title} | status: ${b.status} | recipients: ${b.recipientCount}`))

  // Check personalized content sample
  const sample = await db.broadcastMessage.findFirst({ where: { status: 'SENT' }, select: { recipientName: true, recipientTerritory: true, personalizedContent: true } })
  if (sample) {
    console.log('\n  Sample personalized message:')
    console.log(`    To: ${sample.recipientName} (${sample.recipientTerritory})`)
    console.log(`    Content: ${sample.personalizedContent.substring(0, 150)}...`)
  }

  // Check essay polls
  const polls = await db.essayPoll.count()
  const responses = await db.essayResponse.count()
  console.log(`\n  Essay polls: ${polls}, Responses: ${responses}`)
  
  const aiPolls = await db.essayPoll.count({ where: { isAiGenerated: true } })
  console.log(`  AI-generated polls: ${aiPolls}`)
}

main().catch(e => { console.error(e); process.exit(1) })
.finally(async () => { await db.$disconnect() })
