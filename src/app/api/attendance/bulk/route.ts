// LAPRA 08 - API: Bulk Attendance (Acara Dadakan + Manual Input + CSV Upload)
// =====================================================
// POST /api/attendance/bulk
//
// Modes:
//   1. quick_event — Buat acara dadakan + catat absensi manual dalam 1 request
//      body: { mode: 'quick_event', event: { title, date, location, type, notes }, attendees: [{ name, phone, territoryId?, status }] }
//   2. manual_names — Catat absensi berdasarkan daftar nama (satu per baris)
//      body: { mode: 'manual_names', eventId, namesText: "Budi\nSiti\nAhmad", status: 'PRESENT' }
//   3. csv_upload — Parse CSV (Nama, WhatsApp, Wilayah) → bulk insert
//      body: { mode: 'csv_upload', eventId, rows: [{ name, phone, territoryName }] }
//
// Peserta yang belum terdaftar sebagai Member akan auto-create dengan
// status='ACTIVE' (not PENDING — karena sudah hadir di acara lapangan).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getUserFromRequest, getAccessibleTerritoryIds } from '@/lib/server-helpers'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { mode } = body

    if (mode === 'quick_event') {
      return await handleQuickEvent(body, user)
    } else if (mode === 'manual_names') {
      return await handleManualNames(body, user)
    } else if (mode === 'csv_upload') {
      return await handleCsvUpload(body, user)
    }

    return NextResponse.json(
      { success: false, error: 'Mode tidak valid. Gunakan: quick_event | manual_names | csv_upload' },
      { status: 400 }
    )
  } catch (e: any) {
    console.error('[Bulk Attendance Error]', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// === MODE 1: QUICK EVENT (Acara Dadakan) ===
// Buat event baru + catat semua peserta hadir dalam 1 request
async function handleQuickEvent(body: any, user: any) {
  const { event: eventData, attendees } = body

  if (!eventData?.title || !eventData?.date) {
    return NextResponse.json(
      { success: false, error: 'Nama acara dan tanggal wajib diisi' },
      { status: 400 }
    )
  }

  if (!Array.isArray(attendees) || attendees.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Daftar peserta wajib diisi (minimal 1 orang)' },
      { status: 400 }
    )
  }

  const scope = await getAccessibleTerritoryIds(user)
  const territoryId = eventData.territoryId || (scope.isGlobal ? (await getIndonesiaTerritoryId()) : scope.territoryIds[0])

  if (!territoryId) {
    return NextResponse.json({ success: false, error: 'Territory tidak ditemukan' }, { status: 400 })
  }

  // 1. Create Event
  const event = await db.event.create({
    data: {
      title: eventData.title.substring(0, 200),
      description: eventData.notes || `Acara dadakan — dibuat via Absensi Lapangan (${new Date().toLocaleString('id-ID')})`,
      type: eventData.type || 'LAINNYA',
      startDate: new Date(eventData.date),
      endDate: eventData.endDate ? new Date(eventData.endDate) : null,
      location: eventData.location || null,
      territoryId,
      createdById: user.id,
      status: 'ONGOING',
      targetAttendance: attendees.length,
    },
  })

  // 2. Resolve & create members + record attendance
  const results = await resolveAndRecordAttendance(event.id, attendees, user.id, scope)

  return NextResponse.json({
    success: true,
    data: {
      event,
      attendance: results,
      summary: {
        total: results.length,
        present: results.filter((r: any) => r.status === 'PRESENT').length,
        absent: results.filter((r: any) => r.status === 'ABSENT').length,
        excused: results.filter((r: any) => r.status === 'EXCUSED').length,
        newMembers: results.filter((r: any) => r.isNewMember).length,
      },
    },
    message: `Acara "${event.title}" dibuat & ${results.length} peserta dicatat. ${results.filter((r: any) => r.isNewMember).length} anggota baru otomatis ditambahkan.`,
  })
}

// === MODE 2: MANUAL NAMES (Ketik Nama) ===
// Catat absensi untuk event existing berdasarkan daftar nama (text area)
async function handleManualNames(body: any, user: any) {
  const { eventId, namesText, status = 'PRESENT' } = body

  if (!eventId) {
    return NextResponse.json({ success: false, error: 'eventId wajib diisi' }, { status: 400 })
  }

  if (!namesText || typeof namesText !== 'string') {
    return NextResponse.json({ success: false, error: 'Daftar nama wajib diisi' }, { status: 400 })
  }

  // Parse names: satu per baris, trim, skip empty
  const names = namesText
    .split('\n')
    .map((n: string) => n.trim())
    .filter((n: string) => n.length >= 2)

  if (names.length === 0) {
    return NextResponse.json({ success: false, error: 'Tidak ada nama valid' }, { status: 400 })
  }

  // Check event exists + access
  const event = await db.event.findUnique({ where: { id: eventId }, include: { territory: true } })
  if (!event) {
    return NextResponse.json({ success: false, error: 'Event tidak ditemukan' }, { status: 404 })
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(event.territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  // Build attendees array (just names, no phone — will be auto-created)
  const attendees = names.map((name: string) => ({
    name,
    phone: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, // placeholder unique
    status,
  }))

  const results = await resolveAndRecordAttendance(eventId, attendees, user.id, scope)

  return NextResponse.json({
    success: true,
    data: { attendance: results, summary: {
      total: results.length,
      present: results.filter((r: any) => r.status === 'PRESENT').length,
      newMembers: results.filter((r: any) => r.isNewMember).length,
    }},
    message: `${results.length} peserta dicatat untuk event "${event.title}". ${results.filter((r: any) => r.isNewMember).length} anggota baru ditambahkan (status ACTIVE, perlu dilengkapi data WA & NIK nanti).`,
  })
}

// === MODE 3: CSV UPLOAD ===
// Parse CSV rows: [{ name, phone, territoryName }]
async function handleCsvUpload(body: any, user: any) {
  const { eventId, rows } = body

  if (!eventId) {
    return NextResponse.json({ success: false, error: 'eventId wajib diisi' }, { status: 400 })
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ success: false, error: 'rows[] wajib diisi' }, { status: 400 })
  }

  const event = await db.event.findUnique({ where: { id: eventId }, include: { territory: true } })
  if (!event) {
    return NextResponse.json({ success: false, error: 'Event tidak ditemukan' }, { status: 404 })
  }

  const scope = await getAccessibleTerritoryIds(user)
  if (!scope.isGlobal && !scope.territoryIds.includes(event.territoryId)) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 })
  }

  const attendees = rows.map((r: any) => ({
    name: r.name,
    phone: r.phone || `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    territoryName: r.territoryName,
    status: 'PRESENT',
  }))

  const results = await resolveAndRecordAttendance(eventId, attendees, user.id, scope)

  return NextResponse.json({
    success: true,
    data: { attendance: results, summary: {
      total: results.length,
      present: results.filter((r: any) => r.status === 'PRESENT').length,
      newMembers: results.filter((r: any) => r.isNewMember).length,
    }},
    message: `${results.length} peserta diimpor dari CSV untuk event "${event.title}".`,
  })
}

// === HELPER: Resolve members + record attendance ===
// - Match by phone (if provided)
// - Match by name + territory (fallback)
// - Auto-create new Member if not found (status=ACTIVE)
async function resolveAndRecordAttendance(
  eventId: string,
  attendees: any[],
  userId: string,
  scope: any
): Promise<any[]> {
  const results: any[] = []

  for (const att of attendees) {
    try {
      let member: any = null
      let isNewMember = false

      // 1. Try to find by phone (if phone is real, not placeholder)
      if (att.phone && !att.phone.startsWith('pending_')) {
        member = await db.member.findUnique({ where: { phone: att.phone } })
      }

      // 2. Fallback: find by name + territory
      if (!member && att.name) {
        const nameFilter: any = { fullName: { equals: att.name, mode: 'insensitive' } }
        if (att.territoryName) {
          nameFilter.territory = { name: { contains: att.territoryName, mode: 'insensitive' } }
        }
        member = await db.member.findFirst({ where: nameFilter })
      }

      // 3. Auto-create new member if not found
      if (!member) {
        const territoryId = scope.isGlobal
          ? (await getIndonesiaTerritoryId())
          : (scope.territoryIds[0] || (await getIndonesiaTerritoryId()))

        const phone = att.phone && !att.phone.startsWith('pending_')
          ? att.phone
          : `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

        const memberNumber = `LAPRA08.TEMP.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`

        try {
          member = await db.member.create({
            data: {
              memberNumber,
              fullName: att.name,
              phone,
              territoryId,
              status: 'ACTIVE', // directly active (already attended an event)
              verifiedAt: new Date(),
              verifiedById: userId,
            },
          })
          isNewMember = true
        } catch (createErr: any) {
          // Phone collision: try with placeholder phone
          if (createErr.message?.includes('phone')) {
            member = await db.member.create({
              data: {
                memberNumber: `LAPRA08.TEMP.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`,
                fullName: att.name,
                phone: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                territoryId,
                status: 'ACTIVE',
                verifiedAt: new Date(),
                verifiedById: userId,
              },
            })
            isNewMember = true
          } else {
            throw createErr
          }
        }
      }

      // 4. Upsert attendance record
      const existing = await db.eventAttendance.findFirst({
        where: { eventId, memberId: member.id },
      })

      let attendance: any
      if (existing) {
        attendance = await db.eventAttendance.update({
          where: { id: existing.id },
          data: {
            status: att.status || 'PRESENT',
            checkInTime: att.status === 'PRESENT' ? new Date() : null,
            recordedById: userId,
          },
        })
      } else {
        attendance = await db.eventAttendance.create({
          data: {
            eventId,
            memberId: member.id,
            status: att.status || 'PRESENT',
            checkInTime: att.status === 'PRESENT' ? new Date() : null,
            recordedById: userId,
          },
        })
      }

      results.push({
        memberId: member.id,
        memberName: member.fullName,
        status: attendance.status,
        isNewMember,
      })
    } catch (e: any) {
      results.push({
        name: att.name,
        status: 'FAILED',
        error: e.message.substring(0, 200),
        isNewMember: false,
      })
    }
  }

  return results
}

async function getIndonesiaTerritoryId(): Promise<string> {
  const t = await db.territory.findFirst({ where: { code: 'ID', level: 'COUNTRY' } })
  return t?.id || ''
}
