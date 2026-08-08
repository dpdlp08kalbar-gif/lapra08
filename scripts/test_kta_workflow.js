// Test KTA workflow using built-in FormData (Node 18+) and Buffer
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const BASE = 'http://localhost:3000'

async function main() {
  const prisma = new PrismaClient()
  const superAdmin = await prisma.user.findFirst({ where: { username: 'superadmin' } })
  const adminHeaders = { 'x-user-id': superAdmin.id }

  const territory = await prisma.territory.findFirst({ where: { code: '6171' } })
  console.log('Using territory:', territory.name, territory.id)
  await prisma.$disconnect()

  // Create 1x1 JPEG
  const jpegB64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC0zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgD/9k='
  const jpegBuf = Buffer.from(jpegB64, 'base64')

  // Step 1: Submit KTA application via FormData (built-in)
  console.log('\n=== STEP 1: Submit KTA Application ===')
  const formData = new FormData()
  formData.append('fullName', 'Budi Santoso Test')
  formData.append('gender', 'L')
  formData.append('birthPlace', 'Pontianak')
  formData.append('birthDate', '1990-05-15')
  formData.append('bloodType', 'O')
  formData.append('maritalStatus', 'MENIKAH')
  formData.append('occupation', 'Wiraswasta')
  formData.append('shirtSize', 'L')
  formData.append('nik', '6171011505900002')
  formData.append('phone', '+6281234567892')
  formData.append('email', 'budi.test@example.com')
  formData.append('address', 'Jl. Test No. 123, Pontianak')
  formData.append('territoryId', territory.id)
  formData.append('applicantNotes', 'Mohon info pembuatan KTA')
  // Convert buffer to Blob
  const photoBlob = new Blob([jpegBuf], { type: 'image/jpeg' })
  const idCardBlob = new Blob([jpegBuf], { type: 'image/jpeg' })
  formData.append('photo', photoBlob, 'photo.jpg')
  formData.append('idCard', idCardBlob, 'idcard.jpg')

  const submitRes = await fetch(`${BASE}/api/kta-applications`, {
    method: 'POST',
    headers: { ...adminHeaders },
    body: formData,
  })
  const submitData = await submitRes.json()
  console.log('Submit:', submitData.success ? 'SUCCESS' : 'FAILED', '|', submitData.data?.applicationNumber || submitData.error)
  if (submitData.success) {
    console.log('  Status:', submitData.data.status)
    console.log('  Photo URL:', submitData.data.photoUrl)
    console.log('  ID Card URL:', submitData.data.idCardUrl)
  } else {
    console.error('ERROR:', submitData.error)
    return
  }

  const appId = submitData.data.id
  const appNum = submitData.data.applicationNumber

  // Step 2: Track by application number
  console.log('\n=== STEP 2: Track Application by Number ===')
  const trackRes = await fetch(`${BASE}/api/kta-applications/track?q=${appNum}`, { headers: adminHeaders })
  const trackData = await trackRes.json()
  console.log('Track:', trackData.success ? 'FOUND' : 'NOT FOUND', '|', trackData.data?.fullName)

  // Step 3: Admin marks as REVIEWING
  console.log('\n=== STEP 3: Admin → REVIEWING ===')
  const r1 = await (await fetch(`${BASE}/api/kta-applications/${appId}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ action: 'REVIEWING', reviewNotes: 'Sedang verifikasi dokumen' }),
  })).json()
  console.log('REVIEWING:', r1.success, '| status:', r1.data?.status)

  // Step 4: Admin APPROVE → Auto-generate KTA
  console.log('\n=== STEP 4: Admin → APPROVE & GENERATE KTA ===')
  const r2 = await (await fetch(`${BASE}/api/kta-applications/${appId}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ action: 'APPROVE', reviewNotes: 'Dokumen lengkap & valid. Disetujui.' }),
  })).json()
  console.log('APPROVE:', r2.success)
  if (r2.success) {
    console.log('  KTA Number:', r2.data.ktaNumber)
    console.log('  Status:', r2.data.status)
    console.log('  Member ID:', r2.data.memberId)
    console.log('  Issued At:', r2.data.ktaIssuedAt)
    console.log('  Expiry Date:', r2.data.ktaExpiryDate)
    console.log('\n=== ✅ WORKFLOW SUCCESS ===')
    console.log(`KTA Digital ${r2.data.ktaNumber} berhasil diterbitkan untuk ${r2.data.fullName}`)
    console.log(`Valid until: ${new Date(r2.data.ktaExpiryDate).toLocaleDateString('id-ID')}`)
  } else {
    console.error('ERROR:', r2.error)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
