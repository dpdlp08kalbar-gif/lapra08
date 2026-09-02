import { db } from '../src/lib/db'

async function main() {
  try {
    // Find Pontianak Selatan kecamatan (code starts with 6171010 or 617110 or similar)
    const pontianakSelatan = await db.territory.findMany({
      where: { 
        OR: [
          { code: '6171010' },
          { name: { contains: 'Pontianak Selatan' } },
        ]
      },
      include: { children: true }
    })
    console.log('Pontianak Selatan found:', pontianakSelatan.length)
    for (const ps of pontianakSelatan) {
      console.log(`  ${ps.code} | ${ps.name} | level=${ps.level} | children=${ps.children.length}`)
    }
    
    // Find any kelurahan BMD
    const bmd = await db.territory.findMany({
      where: { name: { contains: 'Benua' } }
    })
    console.log('\nBMD/BML found:', bmd.length)
    for (const b of bmd) {
      console.log(`  ${b.code} | ${b.name} | level=${b.level}`)
    }
    
    // Find existing RT/RW
    const rwRt = await db.territory.findMany({
      where: { level: { in: ['RW', 'RT', 'VILLAGE'] } },
      take: 20
    })
    console.log('\nVILLAGE/RW/RT sample:', rwRt.length)
    for (const t of rwRt) {
      console.log(`  ${t.code} | ${t.name} | level=${t.level}`)
    }
  } catch (e) {
    console.error('Error:', e)
  }
}
main().finally(() => db.$disconnect())
