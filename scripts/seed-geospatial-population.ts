// LAPRA 08 - Seed data Populasi & Demografi untuk Geospatial Voice Mapping
// Berdasarkan data BPS 2024 (estimasi) - 34 provinsi utama Indonesia
// Total pemilih Indonesia: ~204 juta (DPT 2024)

import { db } from '../src/lib/db'

// Data populasi & pemilih per provinsi (estimasi BPS 2024 + DPT KPU 2024)
const PROVINCE_POPULATION = [
  // {code, name, total, voters, v17_21, v22_30, v31_40, v41_60, v61plus, geo}
  { code: '11', name: 'Aceh', total: 5407000, voters: 3740000, geo: { lat: 4.6951, lng: 96.7494 } },
  { code: '12', name: 'Sumatera Utara', total: 15180000, voters: 10830000, geo: { lat: 2.5433, lng: 98.6496 } },
  { code: '13', name: 'Sumatera Barat', total: 5780000, voters: 4120000, geo: { lat: -0.2934, lng: 100.6208 } },
  { code: '14', name: 'Riau', total: 6830000, voters: 4870000, geo: { lat: 0.4709, lng: 101.7894 } },
  { code: '15', name: 'Jambi', total: 3680000, voters: 2610000, geo: { lat: -1.4852, lng: 103.0833 } },
  { code: '16', name: 'Sumatera Selatan', total: 8740000, voters: 6210000, geo: { lat: -3.3194, lng: 104.9145 } },
  { code: '17', name: 'Bengkulu', total: 2030000, voters: 1450000, geo: { lat: -3.8004, lng: 102.3226 } },
  { code: '18', name: 'Lampung', total: 9170000, voters: 6520000, geo: { lat: -4.4584, lng: 105.4068 } },
  { code: '19', name: 'Bangka Belitung', total: 1530000, voters: 1090000, geo: { lat: -2.4443, lng: 106.8576 } },
  { code: '21', name: 'Kepulauan Riau', total: 2170000, voters: 1540000, geo: { lat: 3.9526, lng: 108.1482 } },
  { code: '31', name: 'DKI Jakarta', total: 10680000, voters: 8250000, geo: { lat: -6.2088, lng: 106.8456 } },
  { code: '32', name: 'Jawa Barat', total: 49600000, voters: 35530000, geo: { lat: -7.0051, lng: 107.5191 } },
  { code: '33', name: 'Jawa Tengah', total: 37500000, voters: 26820000, geo: { lat: -7.2575, lng: 110.2038 } },
  { code: '34', name: 'DI Yogyakarta', total: 3760000, voters: 2690000, geo: { lat: -7.7956, lng: 110.4188 } },
  { code: '35', name: 'Jawa Timur', total: 41150000, voters: 29440000, geo: { lat: -7.8753, lng: 112.2602 } },
  { code: '36', name: 'Banten', total: 12030000, voters: 8600000, geo: { lat: -6.4074, lng: 106.1219 } },
  { code: '51', name: 'Bali', total: 4360000, voters: 3120000, geo: { lat: -8.3405, lng: 115.0920 } },
  { code: '52', name: 'Nusa Tenggara Barat', total: 5470000, voters: 3900000, geo: { lat: -8.6529, lng: 117.3616 } },
  { code: '53', name: 'Nusa Tenggara Timur', total: 5560000, voters: 3970000, geo: { lat: -8.6574, lng: 121.0794 } },
  { code: '61', name: 'Kalimantan Barat', total: 5550000, voters: 3960000, geo: { lat: -0.2783, lng: 111.4753 } },
  { code: '62', name: 'Kalimantan Tengah', total: 2740000, voters: 1950000, geo: { lat: -1.6815, lng: 113.3824 } },
  { code: '63', name: 'Kalimantan Selatan', total: 4180000, voters: 2980000, geo: { lat: -3.0926, lng: 115.2838 } },
  { code: '64', name: 'Kalimantan Timur', total: 3970000, voters: 2830000, geo: { lat: 0.5100, lng: 116.4135 } },
  { code: '65', name: 'Kalimantan Utara', total: 723000, voters: 516000, geo: { lat: 3.0727, lng: 116.1637 } },
  { code: '71', name: 'Sulawesi Utara', total: 2640000, voters: 1880000, geo: { lat: 1.2932, lng: 124.8420 } },
  { code: '72', name: 'Sulawesi Tengah', total: 3080000, voters: 2190000, geo: { lat: -1.4300, lng: 121.4456 } },
  { code: '73', name: 'Sulawesi Selatan', total: 9190000, voters: 6550000, geo: { lat: -3.6633, lng: 119.8194 } },
  { code: '74', name: 'Sulawesi Tenggara', total: 2740000, voters: 1950000, geo: { lat: -4.0014, lng: 122.5236 } },
  { code: '75', name: 'Gorontalo', total: 1190000, voters: 848000, geo: { lat: 0.6999, lng: 122.4467 } },
  { code: '76', name: 'Sulawesi Barat', total: 1420000, voters: 1010000, geo: { lat: -2.6781, lng: 119.1407 } },
  { code: '81', name: 'Maluku', total: 1880000, voters: 1340000, geo: { lat: -3.2389, lng: 129.1804 } },
  { code: '82', name: 'Maluku Utara', total: 1320000, voters: 940000, geo: { lat: 0.7293, lng: 127.8456 } },
  { code: '91', name: 'Papua', total: 4360000, voters: 3110000, geo: { lat: -4.2699, lng: 138.0800 } },
  { code: '92', name: 'Papua Barat', total: 1150000, voters: 820000, geo: { lat: -1.4287, lng: 132.9530 } },
]

// Distribusi usia pemilih Indonesia (BPS 2024)
// 17-21: 8% (pemilih pemula)
// 22-30: 22% (pemilih muda)
// 31-40: 24% (pemilih dewasa)
// 41-60: 33% (paruh baya)
// 61+: 13% (lansia)
const AGE_DISTRIBUTION = {
  '17-21': 0.08,
  '22-30': 0.22,
  '31-40': 0.24,
  '41-60': 0.33,
  '61+': 0.13,
}

// Distribusi community segments (estimasi)
// INDIGENOUS (suku adat): var per provinsi
// RELIGIOUS (komunitas agama): 95% populasi (religius)
// PROFESSION (petani/nelayan/buruh/guru/UMKM/mahasiswa): 60% dari populasi produktif
// YOUTH (ormas pemuda): 25% dari pemilih muda (17-40)
const RELIGIOUS_PCT = 0.95
const PROFESSION_PCT = 0.55
const YOUTH_PCT = 0.30

async function main() {
  console.log('=== Seed Population Data untuk Geospatial Voice Mapping ===\n')
  
  // Clear existing
  await db.populationData.deleteMany({})
  console.log('Cleared existing PopulationData')
  
  // Insert NATIONAL level (Indonesia)
  const nationalTotal = PROVINCE_POPULATION.reduce((sum, p) => sum + p.total, 0)
  const nationalVoters = PROVINCE_POPULATION.reduce((sum, p) => sum + p.voters, 0)
  
  await db.populationData.create({
    data: {
      territoryCode: 'ID',
      level: 'NATIONAL',
      totalPopulation: nationalTotal,
      totalVoters: nationalVoters,
      voters17to21: Math.round(nationalVoters * AGE_DISTRIBUTION['17-21']),
      voters22to30: Math.round(nationalVoters * AGE_DISTRIBUTION['22-30']),
      voters31to40: Math.round(nationalVoters * AGE_DISTRIBUTION['31-40']),
      voters41to60: Math.round(nationalVoters * AGE_DISTRIBUTION['41-60']),
      voters61plus: Math.round(nationalVoters * AGE_DISTRIBUTION['61+']),
      populationIndigenous: Math.round(nationalTotal * 0.08), // ~8% suku adat
      populationReligious: Math.round(nationalTotal * RELIGIOUS_PCT),
      populationProfession: Math.round(nationalVoters * PROFESSION_PCT),
      populationYouth: Math.round(nationalVoters * (AGE_DISTRIBUTION['17-21'] + AGE_DISTRIBUTION['22-30']) * YOUTH_PCT),
      geoCenter: JSON.stringify({ lat: -2.5489, lng: 118.0149 }), // Pusat Indonesia
    },
  })
  console.log(`✓ NATIONAL: ${nationalTotal.toLocaleString()} pop, ${nationalVoters.toLocaleString()} voters`)
  
  // Insert all provinces
  for (const p of PROVINCE_POPULATION) {
    await db.populationData.create({
      data: {
        territoryCode: p.code,
        level: 'PROVINCE',
        totalPopulation: p.total,
        totalVoters: p.voters,
        voters17to21: Math.round(p.voters * AGE_DISTRIBUTION['17-21']),
        voters22to30: Math.round(p.voters * AGE_DISTRIBUTION['22-30']),
        voters31to40: Math.round(p.voters * AGE_DISTRIBUTION['31-40']),
        voters41to60: Math.round(p.voters * AGE_DISTRIBUTION['41-60']),
        voters61plus: Math.round(p.voters * AGE_DISTRIBUTION['61+']),
        populationIndigenous: Math.round(p.total * (0.05 + Math.random() * 0.10)), // 5-15% suku adat lokal
        populationReligious: Math.round(p.total * RELIGIOUS_PCT),
        populationProfession: Math.round(p.voters * PROFESSION_PCT),
        populationYouth: Math.round(p.voters * (AGE_DISTRIBUTION['17-21'] + AGE_DISTRIBUTION['22-30']) * YOUTH_PCT),
        geoCenter: JSON.stringify(p.geo),
      },
    })
  }
  console.log(`✓ ${PROVINCE_POPULATION.length} PROVINCE records seeded`)
  
  // Untuk DPC (REGENCY), generate estimasi dari data provinsi
  const regencies = await db.territory.findMany({
    where: { level: 'REGENCY' },
    include: { parent: true },
  })
  console.log(`\nProcessing ${regencies.length} DPC (regencies)...`)
  
  let regencyCount = 0
  for (const r of regencies) {
    // Find parent province population
    const parentCode = r.parent?.code
    if (!parentCode) continue
    
    const provinceData = await db.populationData.findUnique({ where: { territoryCode: parentCode } })
    if (!provinceData) continue
    
    // Estimate regency population as fraction of province (rata-rata)
    const provinceRegencyCount = regencies.filter(reg => reg.parent?.code === parentCode).length
    const factor = 1 / Math.max(1, provinceRegencyCount)
    
    const regencyTotal = Math.round(provinceData.totalPopulation * factor * (0.5 + Math.random()))
    const regencyVoters = Math.round(provinceData.totalVoters * factor * (0.5 + Math.random()))
    
    await db.populationData.create({
      data: {
        territoryCode: r.code,
        level: 'REGENCY',
        totalPopulation: regencyTotal,
        totalVoters: regencyVoters,
        voters17to21: Math.round(regencyVoters * AGE_DISTRIBUTION['17-21']),
        voters22to30: Math.round(regencyVoters * AGE_DISTRIBUTION['22-30']),
        voters31to40: Math.round(regencyVoters * AGE_DISTRIBUTION['31-40']),
        voters41to60: Math.round(regencyVoters * AGE_DISTRIBUTION['41-60']),
        voters61plus: Math.round(regencyVoters * AGE_DISTRIBUTION['61+']),
        populationIndigenous: Math.round(regencyTotal * 0.05),
        populationReligious: Math.round(regencyTotal * RELIGIOUS_PCT),
        populationProfession: Math.round(regencyVoters * PROFESSION_PCT),
        populationYouth: Math.round(regencyVoters * 0.30 * 0.30),
      },
    })
    regencyCount++
    if (regencyCount % 100 === 0) console.log(`  Processed ${regencyCount}/${regencies.length} regencies`)
  }
  console.log(`✓ ${regencyCount} REGENCY records seeded`)
  
  // Generate sample DISTRICT, VILLAGE, RW, RT untuk demo drill-down di Pontianak (6171)
  await generateSampleDrillDown()
  
  // Final summary
  const total = await db.populationData.count()
  const byLevel = await db.populationData.groupBy({ by: ['level'], _count: { _all: true } })
  console.log('\n=== Final Summary ===')
  console.log('Total PopulationData records:', total)
  byLevel.forEach(l => console.log(`  - ${l.level}: ${l._count._all}`))
}

async function generateSampleDrillDown() {
  console.log('\n=== Generate sample DISTRICT/VILLAGE/RW/RT untuk Pontianak (6171) ===')
  
  const districts = [
    { code: '6171010', name: 'Pontianak Selatan' },
    { code: '6171020', name: 'Pontianak Timur' },
    { code: '6171030', name: 'Pontianak Barat' },
    { code: '6171040', name: 'Pontianak Utara' },
    { code: '6171050', name: 'Pontianak Kota' },
    { code: '6171060', name: 'Pontianak Tenggara' },
  ]
  
  for (const d of districts) {
    const distTotal = 80000 + Math.floor(Math.random() * 40000)
    const distVoters = Math.round(distTotal * 0.65)
    await db.populationData.create({
      data: {
        territoryCode: d.code,
        level: 'DISTRICT',
        totalPopulation: distTotal,
        totalVoters: distVoters,
        voters17to21: Math.round(distVoters * AGE_DISTRIBUTION['17-21']),
        voters22to30: Math.round(distVoters * AGE_DISTRIBUTION['22-30']),
        voters31to40: Math.round(distVoters * AGE_DISTRIBUTION['31-40']),
        voters41to60: Math.round(distVoters * AGE_DISTRIBUTION['41-60']),
        voters61plus: Math.round(distVoters * AGE_DISTRIBUTION['61+']),
        populationIndigenous: Math.round(distTotal * 0.05),
        populationReligious: Math.round(distTotal * RELIGIOUS_PCT),
        populationProfession: Math.round(distVoters * PROFESSION_PCT),
        populationYouth: Math.round(distVoters * 0.30 * 0.30),
      },
    })
    
    // Generate villages per district (4-5 kelurahan per kecamatan)
    const villagesPerDistrict = 4
    for (let i = 1; i <= villagesPerDistrict; i++) {
      const villageCode = `${d.code}${String(i).padStart(2, '0')}`
      const villageName = `Kelurahan ${d.name.split(' ')[1] || 'X'} ${i}`
      const vTotal = Math.round(distTotal / villagesPerDistrict * (0.7 + Math.random() * 0.6))
      const vVoters = Math.round(vTotal * 0.65)
      
      await db.populationData.create({
        data: {
          territoryCode: villageCode,
          level: 'VILLAGE',
          totalPopulation: vTotal,
          totalVoters: vVoters,
          voters17to21: Math.round(vVoters * AGE_DISTRIBUTION['17-21']),
          voters22to30: Math.round(vVoters * AGE_DISTRIBUTION['22-30']),
          voters31to40: Math.round(vVoters * AGE_DISTRIBUTION['31-40']),
          voters41to60: Math.round(vVoters * AGE_DISTRIBUTION['41-60']),
          voters61plus: Math.round(vVoters * AGE_DISTRIBUTION['61+']),
          populationIndigenous: Math.round(vTotal * 0.05),
          populationReligious: Math.round(vTotal * RELIGIOUS_PCT),
          populationProfession: Math.round(vVoters * PROFESSION_PCT),
          populationYouth: Math.round(vVoters * 0.30 * 0.30),
        },
      })
      
      // Generate RW (5-8 per village)
      const rwCount = 5
      for (let rw = 1; rw <= rwCount; rw++) {
        const rwCode = `${villageCode}RW${String(rw).padStart(2, '0')}`
        const rwTotal = Math.round(vTotal / rwCount * (0.8 + Math.random() * 0.4))
        const rwVoters = Math.round(rwTotal * 0.65)
        
        await db.populationData.create({
          data: {
            territoryCode: rwCode,
            level: 'RW',
            totalPopulation: rwTotal,
            totalVoters: rwVoters,
            voters17to21: Math.round(rwVoters * AGE_DISTRIBUTION['17-21']),
            voters22to30: Math.round(rwVoters * AGE_DISTRIBUTION['22-30']),
            voters31to40: Math.round(rwVoters * AGE_DISTRIBUTION['31-40']),
            voters41to60: Math.round(rwVoters * AGE_DISTRIBUTION['41-60']),
            voters61plus: Math.round(rwVoters * AGE_DISTRIBUTION['61+']),
            populationIndigenous: Math.round(rwTotal * 0.05),
            populationReligious: Math.round(rwTotal * RELIGIOUS_PCT),
            populationProfession: Math.round(rwVoters * PROFESSION_PCT),
            populationYouth: Math.round(rwVoters * 0.30 * 0.30),
          },
        })
        
        // Generate RT (5-7 per RW)
        const rtCount = 5
        for (let rt = 1; rt <= rtCount; rt++) {
          const rtCode = `${rwCode}RT${String(rt).padStart(2, '0')}`
          const rtTotal = Math.round(rwTotal / rtCount * (0.8 + Math.random() * 0.4))
          const rtVoters = Math.round(rtTotal * 0.65)
          
          await db.populationData.create({
            data: {
              territoryCode: rtCode,
              level: 'RT',
              totalPopulation: rtTotal,
              totalVoters: rtVoters,
              voters17to21: Math.round(rtVoters * AGE_DISTRIBUTION['17-21']),
              voters22to30: Math.round(rtVoters * AGE_DISTRIBUTION['22-30']),
              voters31to40: Math.round(rtVoters * AGE_DISTRIBUTION['31-40']),
              voters41to60: Math.round(rtVoters * AGE_DISTRIBUTION['41-60']),
              voters61plus: Math.round(rtVoters * AGE_DISTRIBUTION['61+']),
              populationIndigenous: Math.round(rtTotal * 0.05),
              populationReligious: Math.round(rtTotal * RELIGIOUS_PCT),
              populationProfession: Math.round(rtVoters * PROFESSION_PCT),
              populationYouth: Math.round(rtVoters * 0.30 * 0.30),
            },
          })
        }
      }
    }
    console.log(`  ✓ ${d.name}: ${districts.indexOf(d) + 1}/${districts.length} districts + villages + RW + RT`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
.finally(async () => { await db.$disconnect() })
