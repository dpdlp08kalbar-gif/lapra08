// Fix seed data: make poll responses spread across 7 days instead of all in 1 day
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== FIX: Spread poll responses across 7 days ===\n')
  
  // Get all poll responses
  const responses = await prisma.pollResponse.findMany({
    select: { id: true, submittedAt: true, pollId: true }
  })
  console.log(`Total responses: ${responses.length}`)
  
  // Group by poll
  const byPoll = {}
  for (const r of responses) {
    if (!byPoll[r.pollId]) byPoll[r.pollId] = []
    byPoll[r.pollId].push(r)
  }
  
  // For each poll, spread responses across 7 days
  const now = new Date()
  for (const [pollId, pollResponses] of Object.entries(byPoll)) {
    const count = pollResponses.length
    console.log(`Poll ${pollId}: ${count} responses`)
    
    // Distribute: ~15% day-7, 15% day-6, 15% day-5, 15% day-4, 15% day-3, 15% day-2, 10% today
    const distribution = [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.10]
    let idx = 0
    
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const dayCount = Math.floor(count * distribution[6 - dayOffset])
      const dayStart = new Date(now)
      dayStart.setHours(0, 0, 0, 0)
      dayStart.setDate(dayStart.getDate() - dayOffset)
      
      for (let i = 0; i < dayCount && idx < count; i++) {
        const randomHour = Math.floor(Math.random() * 24)
        const randomMin = Math.floor(Math.random() * 60)
        const newDate = new Date(dayStart)
        newDate.setHours(randomHour, randomMin, Math.floor(Math.random() * 60))
        
        await prisma.pollResponse.update({
          where: { id: pollResponses[idx].id },
          data: { submittedAt: newDate }
        })
        idx++
      }
    }
    
    // Remaining go to today
    while (idx < count) {
      const newDate = new Date(now)
      newDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60))
      newDate.setDate(newDate.getDate() - Math.floor(Math.random() * 7))
      await prisma.pollResponse.update({
        where: { id: pollResponses[idx].id },
        data: { submittedAt: newDate }
      })
      idx++
    }
  }
  
  // Fix: "Pidato Kenegaraan" broadcast has empty channelStats
  const emptyBroadcasts = await prisma.broadcast.findMany({
    where: { channelStats: '{}' }
  })
  for (const b of emptyBroadcasts) {
    let channels = []
    try { channels = JSON.parse(b.channels) } catch { channels = [b.channel] }
    
    const stats = {}
    for (const ch of channels) {
      if (ch === 'WHATSAPP') {
        stats.WHATSAPP = { sent: b.recipientCount, delivered: Math.floor(b.recipientCount * 0.95), read: Math.floor(b.recipientCount * 0.72), failed: Math.floor(b.recipientCount * 0.05) }
      } else if (ch === 'FACEBOOK') {
        stats.FACEBOOK = { reach: Math.floor(b.recipientCount * 3.2), likes: Math.floor(b.recipientCount * 0.08), comments: Math.floor(b.recipientCount * 0.02), shares: Math.floor(b.recipientCount * 0.015) }
      } else if (ch === 'INSTAGRAM') {
        stats.INSTAGRAM = { reach: Math.floor(b.recipientCount * 2.8), likes: Math.floor(b.recipientCount * 0.12), comments: Math.floor(b.recipientCount * 0.015), saves: Math.floor(b.recipientCount * 0.04) }
      }
    }
    
    await prisma.broadcast.update({
      where: { id: b.id },
      data: { channelStats: JSON.stringify(stats) }
    })
    console.log(`  ✓ Fixed broadcast "${b.title.substring(0, 40)}..." - stats populated`)
  }
  
  // Fix: Make "Sentimen Milenial Jawa Barat" poll have REAL negative distribution (70% neg)
  // but only in Jawa Barat regencies, not nationally
  const jabarPoll = await prisma.poll.findFirst({
    where: { title: { contains: 'Milenial Jawa Barat' } }
  })
  if (jabarPoll) {
    console.log('\n--- Fixing Milenial Jawa Barat poll ---')
    const responses = await prisma.pollResponse.findMany({
      where: { pollId: jabarPoll.id },
      select: { id: true, provinceCode: true, sentiment: true }
    })
    console.log(`  Total responses: ${responses.length}`)
    
    // Group by province
    const byProv = {}
    for (const r of responses) {
      const prov = r.provinceCode || 'unknown'
      if (!byProv[prov]) byProv[prov] = []
      byProv[prov].push(r)
    }
    
    for (const [prov, provResponses] of Object.entries(byProv)) {
      const total = provResponses.length
      const negative = provResponses.filter(r => r.sentiment === 'NEGATIVE').length
      console.log(`  Prov ${prov}: ${total} total, ${negative} negatif (${(negative/total*100).toFixed(1)}%)`)
    }
    
    // The issue: ALL provinces have high negative because seed script distributed uniformly
    // Fix: For non-Jabar provinces, change most negatives to positive/neutral
    for (const [prov, provResponses] of Object.entries(byProv)) {
      if (prov === '32') continue // Keep Jawa Barat as is (it's supposed to be 70% negative)
      
      const negatives = provResponses.filter(r => r.sentiment === 'NEGATIVE')
      // Keep only 20% negative for other provinces, change rest to POSITIVE
      const keepNeg = Math.floor(negatives.length * 0.2)
      for (let i = keepNeg; i < negatives.length; i++) {
        await prisma.pollResponse.update({
          where: { id: negatives[i].id },
          data: { sentiment: 'POSITIVE' }
        })
      }
    }
    
    // Verify
    const updated = await prisma.pollResponse.findMany({
      where: { pollId: jabarPoll.id },
      select: { sentiment: true, provinceCode: true }
    })
    const jabarResp = updated.filter(r => r.provinceCode === '32')
    const otherResp = updated.filter(r => r.provinceCode !== '32')
    const jabarNeg = jabarResp.filter(r => r.sentiment === 'NEGATIVE').length
    const otherNeg = otherResp.filter(r => r.sentiment === 'NEGATIVE').length
    console.log(`  After fix - Jawa Barat: ${jabarNeg}/${jabarResp.length} (${(jabarNeg/jabarResp.length*100).toFixed(1)}%) negatif`)
    console.log(`  After fix - Other: ${otherNeg}/${otherResp.length} (${(otherNeg/otherResp.length*100).toFixed(1)}%) negatif`)
  }
  
  console.log('\n✅ FIX COMPLETE')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
