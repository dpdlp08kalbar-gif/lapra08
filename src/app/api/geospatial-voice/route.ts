// LAPRA 08 - API: Geospatial Voice Mapping & Demographics Analytics
// GET /api/geospatial-voice - Get overview (NATIONAL + list of all PROVINCE)
// GET /api/geospatial-voice?code=61 - Get detail of specific territory (drill-down to children)
// GET /api/geospatial-voice?code=61&level=PROVINCE - explicit level
//
// Response: heatmap data + raw numbers + drill-down children list + trust index per dimensi
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest } from '@/lib/server-helpers'

const LEVEL_HIERARCHY = ['NATIONAL', 'PROVINCE', 'REGENCY', 'DISTRICT', 'VILLAGE', 'RW', 'RT']
const NEXT_LEVEL_MAP: Record<string, string> = {
  'NATIONAL': 'PROVINCE',
  'PROVINCE': 'REGENCY',
  'REGENCY': 'DISTRICT',
  'DISTRICT': 'VILLAGE',
  'VILLAGE': 'RW',
  'RW': 'RT',
  'RT': '', // leaf - no children
}

// Safe JSON parse helper
function safeParseJSON(s: any): any {
  if (!s) return null
  if (typeof s !== 'string') return s
  try { return JSON.parse(s) } catch { return null }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code') || 'ID' // default: Nasional
  const ageGroup = searchParams.get('ageGroup') // 17-21 | 22-30 | 31-40 | 41-60 | 61+
  const communitySegment = searchParams.get('segment') // INDIGENOUS | RELIGIOUS | PROFESSION | YOUTH

  // Get current territory data
  const currentData = await db.populationData.findUnique({ where: { territoryCode: code } })
  if (!currentData) {
    return NextResponse.json({ success: false, error: `Territory ${code} tidak ditemukan` }, { status: 404 })
  }

  const currentLevel = currentData.level
  const nextLevel = NEXT_LEVEL_MAP[currentLevel]

  // Build breadcrumb (path dari NATIONAL ke current)
  const breadcrumb = await buildBreadcrumb(code)

  // Get children (untuk drill-down)
  let children: any[] = []
  if (nextLevel) {
    children = await getChildren(code, nextLevel)
  }

  // Get trust index for this territory (all dimensions: ALL + per age group + per segment)
  const trustIndices = await getTrustIndices(code, currentLevel)

  // Apply demographic filter jika ada
  let filteredTrustIndex = trustIndices.ALL || null
  if (ageGroup && !communitySegment) {
    filteredTrustIndex = trustIndices[`AGE_${ageGroup}`] || null
  } else if (communitySegment && !ageGroup) {
    filteredTrustIndex = trustIndices[`SEG_${communitySegment}`] || null
  } else if (ageGroup && communitySegment) {
    filteredTrustIndex = trustIndices[`${ageGroup}_${communitySegment}`] || null
  }

  // Get opinion links for this territory
  const opinionLinks = await getOpinionLinksForTerritory(code, currentLevel)

  // Calculate aggregate stats
  const stats = {
    totalPopulation: currentData.totalPopulation,
    totalVoters: currentData.totalVoters,
    ageGroups: {
      '17-21': currentData.voters17to21,
      '22-30': currentData.voters22to30,
      '31-40': currentData.voters31to40,
      '41-60': currentData.voters41to60,
      '61+': currentData.voters61plus,
    },
    communitySegments: {
      INDIGENOUS: currentData.populationIndigenous,
      RELIGIOUS: currentData.populationReligious,
      PROFESSION: currentData.populationProfession,
      YOUTH: currentData.populationYouth,
    },
    geoCenter: currentData.geoCenter ? safeParseJSON(currentData.geoCenter) : null,
  }

  // Build heatmap data from children
  const heatmap = children.map(c => ({
    code: c.code,
    name: c.name,
    level: nextLevel,
    trustScore: c.trustScore || 0,
    totalMentions: c.totalMentions || 0,
    sentimentPositive: c.sentimentPositive || 0,
    sentimentNegative: c.sentimentNegative || 0,
    totalPopulation: c.totalPopulation,
    totalVoters: c.totalVoters,
    geoCenter: typeof c.geoCenter === 'string' ? safeParseJSON(c.geoCenter) : c.geoCenter,
    canDrillDown: NEXT_LEVEL_MAP[nextLevel] !== '',
  }))

  return NextResponse.json({
    success: true,
    data: {
      current: {
        code,
        name: breadcrumb[breadcrumb.length - 1]?.name || code,
        level: currentLevel,
        breadcrumb,
      },
      nextLevel,
      stats,
      heatmap,
      children,
      trustIndex: filteredTrustIndex,
      allTrustIndices: trustIndices,
      opinionLinks,
      filter: { ageGroup, communitySegment },
    },
  })
}

// Build breadcrumb dari NATIONAL ke current territory
async function buildBreadcrumb(code: string): Promise<{ code: string; name: string; level: string }[]> {
  const breadcrumb: { code: string; name: string; level: string }[] = []
  
  // Cari di PopulationData dulu
  const data = await db.populationData.findUnique({ where: { territoryCode: code } })
  if (!data) return [{ code, name: code, level: 'UNKNOWN' }]
  
  // Add NATIONAL if not already
  if (code !== 'ID') {
    const national = await db.populationData.findUnique({ where: { territoryCode: 'ID' } })
    if (national) {
      // Find name from Territory
      const nationalTerritory = await db.territory.findUnique({ where: { code: 'ID' } })
      breadcrumb.push({ code: 'ID', name: nationalTerritory?.name || 'Indonesia', level: 'NATIONAL' })
    }
  }
  
  // Find territory
  const territory = await db.territory.findUnique({
    where: { code },
    include: { parent: { include: { parent: { include: { parent: true } } } } },
  })
  
  if (territory) {
    // Build path: PROVINCE → REGENCY → current
    const provinces: any[] = []
    let t = territory
    while (t) {
      provinces.unshift({ code: t.code, name: t.name, level: t.level })
      t = t.parent as any
    }
    // Filter yang ada di breadcrumb (skip NATIONAL karena sudah ditambah)
    for (const p of provinces) {
      if (p.level !== 'COUNTRY' && !breadcrumb.find(b => b.code === p.code)) {
        breadcrumb.push(p)
      }
    }
  } else {
    // For DISTRICT/VILLAGE/RW/RT yang tidak ada di Territory table
    // Parse dari code
    if (data.level === 'DISTRICT') {
      // code: 6171010 → parent regency: 6171
      const regencyCode = code.substring(0, 4)
      const regency = await db.territory.findUnique({ where: { code: regencyCode } })
      if (regency) {
        const province = regency.parent
        if (province) breadcrumb.push({ code: province.code, name: province.name, level: 'PROVINCE' })
        breadcrumb.push({ code: regency.code, name: regency.name, level: 'REGENCY' })
      }
      breadcrumb.push({ code, name: `Kecamatan ${code}`, level: 'DISTRICT' })
    } else if (data.level === 'VILLAGE') {
      // code: 617101001 → parent kec: 6171010, regency: 6171
      const districtCode = code.substring(0, 7)
      const regencyCode = code.substring(0, 4)
      const regency = await db.territory.findUnique({ where: { code: regencyCode } })
      if (regency) {
        const province = regency.parent
        if (province) breadcrumb.push({ code: province.code, name: province.name, level: 'PROVINCE' })
        breadcrumb.push({ code: regency.code, name: regency.name, level: 'REGENCY' })
      }
      breadcrumb.push({ code: districtCode, name: `Kecamatan ${districtCode}`, level: 'DISTRICT' })
      breadcrumb.push({ code, name: `Kelurahan ${code}`, level: 'VILLAGE' })
    } else if (data.level === 'RW') {
      const villageCode = code.split('RW')[0]
      const districtCode = villageCode.substring(0, 7)
      const regencyCode = villageCode.substring(0, 4)
      const regency = await db.territory.findUnique({ where: { code: regencyCode } })
      if (regency) {
        const province = regency.parent
        if (province) breadcrumb.push({ code: province.code, name: province.name, level: 'PROVINCE' })
        breadcrumb.push({ code: regency.code, name: regency.name, level: 'REGENCY' })
      }
      breadcrumb.push({ code: districtCode, name: `Kecamatan ${districtCode}`, level: 'DISTRICT' })
      breadcrumb.push({ code: villageCode, name: `Kelurahan ${villageCode}`, level: 'VILLAGE' })
      breadcrumb.push({ code, name: `RW ${code.split('RW')[1]}`, level: 'RW' })
    } else if (data.level === 'RT') {
      const rwCode = code.split('RT')[0]
      const villageCode = rwCode.split('RW')[0]
      const districtCode = villageCode.substring(0, 7)
      const regencyCode = villageCode.substring(0, 4)
      const regency = await db.territory.findUnique({ where: { code: regencyCode } })
      if (regency) {
        const province = regency.parent
        if (province) breadcrumb.push({ code: province.code, name: province.name, level: 'PROVINCE' })
        breadcrumb.push({ code: regency.code, name: regency.name, level: 'REGENCY' })
      }
      breadcrumb.push({ code: districtCode, name: `Kecamatan ${districtCode}`, level: 'DISTRICT' })
      breadcrumb.push({ code: villageCode, name: `Kelurahan ${villageCode}`, level: 'VILLAGE' })
      breadcrumb.push({ code: rwCode, name: `RW ${rwCode.split('RW')[1]}`, level: 'RW' })
      breadcrumb.push({ code, name: `RT ${code.split('RT')[1]}`, level: 'RT' })
    }
  }
  
  return breadcrumb
}

// Get children untuk drill-down
async function getChildren(parentCode: string, childLevel: string): Promise<any[]> {
  // Untuk PROVINCE children: query Territory level REGENCY
  if (childLevel === 'PROVINCE') {
    // List all provinces
    const provinces = await db.territory.findMany({
      where: { level: 'PROVINCE' },
      select: { code: true, name: true, level: true },
      orderBy: { name: 'asc' },
    })
    const result: any[] = []
    for (const p of provinces) {
      const pop = await db.populationData.findUnique({ where: { territoryCode: p.code } })
      const trust = await db.trustIndex.findUnique({
        where: { territoryCode_ageGroup_communitySegment: { territoryCode: p.code, ageGroup: '', communitySegment: '' } },
      }).catch(() => null)
      result.push({
        code: p.code, name: p.name, level: 'PROVINCE',
        totalPopulation: pop?.totalPopulation || 0,
        totalVoters: pop?.totalVoters || 0,
        voters17to21: pop?.voters17to21 || 0,
        voters22to30: pop?.voters22to30 || 0,
        voters31to40: pop?.voters31to40 || 0,
        voters41to60: pop?.voters41to60 || 0,
        voters61plus: pop?.voters61plus || 0,
        populationIndigenous: pop?.populationIndigenous || 0,
        populationReligious: pop?.populationReligious || 0,
        populationProfession: pop?.populationProfession || 0,
        populationYouth: pop?.populationYouth || 0,
        geoCenter: safeParseJSON(pop?.geoCenter),
        trustScore: trust?.trustScore || 0,
        totalMentions: trust?.totalMentions || 0,
        sentimentPositive: trust?.sentimentPositive || 0,
        sentimentNegative: trust?.sentimentNegative || 0,
        canDrillDown: true,
      })
    }
    return result
  }
  
  if (childLevel === 'REGENCY') {
    // List regencies in province
    const regencies = await db.territory.findMany({
      where: { level: 'REGENCY', parentId: parentCode },
      select: { code: true, name: true, level: true },
      orderBy: { name: 'asc' },
    })
    // parentId in Territory table is territory.id, not code — so we need different approach
    // Get parent territory
    const parent = await db.territory.findUnique({ where: { code: parentCode } })
    const regenciesByParent = parent ? await db.territory.findMany({
      where: { level: 'REGENCY', parentId: parent.id },
      select: { code: true, name: true, level: true },
      orderBy: { name: 'asc' },
    }) : []
    
    const result: any[] = []
    for (const r of regenciesByParent) {
      const pop = await db.populationData.findUnique({ where: { territoryCode: r.code } })
      const trust = await db.trustIndex.findUnique({
        where: { territoryCode_ageGroup_communitySegment: { territoryCode: r.code, ageGroup: '', communitySegment: '' } },
      }).catch(() => null)
      result.push({
        code: r.code, name: r.name, level: 'REGENCY',
        totalPopulation: pop?.totalPopulation || 0,
        totalVoters: pop?.totalVoters || 0,
        voters17to21: pop?.voters17to21 || 0,
        voters22to30: pop?.voters22to30 || 0,
        voters31to40: pop?.voters31to40 || 0,
        voters41to60: pop?.voters41to60 || 0,
        voters61plus: pop?.voters61plus || 0,
        populationIndigenous: pop?.populationIndigenous || 0,
        populationReligious: pop?.populationReligious || 0,
        populationProfession: pop?.populationProfession || 0,
        populationYouth: pop?.populationYouth || 0,
        geoCenter: null,
        trustScore: trust?.trustScore || 0,
        totalMentions: trust?.totalMentions || 0,
        sentimentPositive: trust?.sentimentPositive || 0,
        sentimentNegative: trust?.sentimentNegative || 0,
        canDrillDown: true,
      })
    }
    return result
  }
  
  // For DISTRICT, VILLAGE, RW, RT — children ada di PopulationData
  const prefix = parentCode
  const allData = await db.populationData.findMany({
    where: { level: childLevel },
    select: { territoryCode: true, level: true, totalPopulation: true, totalVoters: true,
              voters17to21: true, voters22to30: true, voters31to40: true, voters41to60: true, voters61plus: true,
              populationIndigenous: true, populationReligious: true, populationProfession: true, populationYouth: true,
              geoCenter: true },
  })
  
  // Filter by prefix matching parent code
  let prefixMatch = ''
  if (childLevel === 'DISTRICT') prefixMatch = parentCode // regency code, cth: 6171
  else if (childLevel === 'VILLAGE') prefixMatch = parentCode // district code, cth: 6171010
  else if (childLevel === 'RW') prefixMatch = parentCode.split('RW')[0] // village code
  else if (childLevel === 'RT') prefixMatch = parentCode.split('RT')[0] // rw code
  
  const filtered = allData.filter(d => d.territoryCode.startsWith(prefixMatch) && d.territoryCode !== parentCode)
  
  const result: any[] = []
  for (const d of filtered) {
    const trust = await db.trustIndex.findUnique({
      where: { territoryCode_ageGroup_communitySegment: { territoryCode: d.territoryCode, ageGroup: '', communitySegment: '' } },
    }).catch(() => null)
    
    // Generate display name
    let displayName = d.territoryCode
    if (childLevel === 'DISTRICT') displayName = `Kecamatan ${d.territoryCode.substring(4, 7)}`
    else if (childLevel === 'VILLAGE') displayName = `Kelurahan ${d.territoryCode.substring(7, 9)}`
    else if (childLevel === 'RW') displayName = `RW ${d.territoryCode.split('RW')[1]}`
    else if (childLevel === 'RT') displayName = `RT ${d.territoryCode.split('RT')[1]}`
    
    result.push({
      code: d.territoryCode, name: displayName, level: childLevel,
      totalPopulation: d.totalPopulation,
      totalVoters: d.totalVoters,
      voters17to21: d.voters17to21,
      voters22to30: d.voters22to30,
      voters31to40: d.voters31to40,
      voters41to60: d.voters41to60,
      voters61plus: d.voters61plus,
      populationIndigenous: d.populationIndigenous,
      populationReligious: d.populationReligious,
      populationProfession: d.populationProfession,
      populationYouth: d.populationYouth,
      geoCenter: safeParseJSON(d.geoCenter),
      trustScore: trust?.trustScore || 0,
      totalMentions: trust?.totalMentions || 0,
      sentimentPositive: trust?.sentimentPositive || 0,
      sentimentNegative: trust?.sentimentNegative || 0,
      canDrillDown: NEXT_LEVEL_MAP[childLevel] !== '',
    })
  }
  return result
}

// Get all trust indices for a territory
async function getTrustIndices(code: string, level: string): Promise<Record<string, any>> {
  const indices: Record<string, any> = {}
  
  // ALL (no demographic filter)
  const allTrust = await db.trustIndex.findUnique({
    where: { territoryCode_ageGroup_communitySegment: { territoryCode: code, ageGroup: '', communitySegment: '' } },
  }).catch(() => null)
  if (allTrust) indices.ALL = allTrust
  
  // Per age group
  const ageGroups = ['17-21', '22-30', '31-40', '41-60', '61+']
  for (const ag of ageGroups) {
    const t = await db.trustIndex.findUnique({
      where: { territoryCode_ageGroup_communitySegment: { territoryCode: code, ageGroup: ag, communitySegment: '' } },
    }).catch(() => null)
    if (t) indices[`AGE_${ag}`] = t
  }
  
  // Per community segment
  const segments = ['INDIGENOUS', 'RELIGIOUS', 'PROFESSION', 'YOUTH']
  for (const seg of segments) {
    const t = await db.trustIndex.findUnique({
      where: { territoryCode_ageGroup_communitySegment: { territoryCode: code, ageGroup: '', communitySegment: seg } },
    }).catch(() => null)
    if (t) indices[`SEG_${seg}`] = t
  }
  
  return indices
}

// Get opinion links for territory
async function getOpinionLinksForTerritory(code: string, level: string): Promise<any[]> {
  if (level === 'NATIONAL') {
    return await db.publicOpinionLink.findMany({
      take: 10, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, url: true, platform: true, sentiment: true, priority: true, category: true, provinceName: true, regencyName: true, aiSummary: true, engagementCount: true, createdAt: true },
    })
  }
  if (level === 'PROVINCE') {
    return await db.publicOpinionLink.findMany({
      where: { provinceCode: code },
      take: 10, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, url: true, platform: true, sentiment: true, priority: true, category: true, provinceName: true, regencyName: true, aiSummary: true, engagementCount: true, createdAt: true },
    })
  }
  if (level === 'REGENCY') {
    return await db.publicOpinionLink.findMany({
      where: { regencyCode: code },
      take: 10, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, url: true, platform: true, sentiment: true, priority: true, category: true, provinceName: true, regencyName: true, aiSummary: true, engagementCount: true, createdAt: true },
    })
  }
  return []
}
