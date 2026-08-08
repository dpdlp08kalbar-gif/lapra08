// LAPRA 08 - Database Seeder v3
// Hierarki: DPN (Country) → DPD (Province) → DPC (Regency)
// 38 Provinsi resmi Indonesia 2024 (termasuk 4 DOB Papua baru) + 5 DPD Luar Negeri
// 14 DPC Kalbar (12 Kabupaten + 2 Kota)

import { db } from '../src/lib/db'

async function main() {
  console.log('🧹 Cleaning existing data...')
  await db.supportTicketReply.deleteMany()
  await db.supportTicket.deleteMany()
  await db.eventAttendance.deleteMany()
  await db.eventReport.deleteMany()
  await db.event.deleteMany()
  await db.financeTransaction.deleteMany()
  await db.announcement.deleteMany()
  await db.broadcast.deleteMany()
  await db.distribution.deleteMany()
  await db.asset.deleteMany()
  await db.sKDocument.deleteMany()
  await db.orgPosition.deleteMany()
  await db.member.deleteMany()
  await db.formField.deleteMany()
  await db.menuItem.deleteMany()
  await db.securitySetting.deleteMany()
  await db.systemSetting.deleteMany()
  await db.user.deleteMany()
  await db.territory.deleteMany()
  console.log('✓ Data cleaned')

  console.log('🌱 Seeding LAPRA 08 v3 (Hierarki 3 Level: DPN → DPD → DPC)...')

  // ============================================================
  // 1. COUNTRY (DPN) - Indonesia & negara LN
  // ============================================================
  console.log('→ Creating countries (DPN)...')

  const indonesia = await db.territory.create({
    data: { code: 'ID', name: 'Indonesia', level: 'COUNTRY', category: 'DOMESTIC', isActive: true },
  })
  const usa = await db.territory.create({
    data: { code: 'US', name: 'Amerika Serikat', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: true },
  })
  await db.territory.create({ data: { code: 'CN', name: 'Cina', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: false } })
  await db.territory.create({ data: { code: 'MY', name: 'Malaysia', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: false } })
  await db.territory.create({ data: { code: 'SA', name: 'Saudi Arabia', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: false } })
  await db.territory.create({ data: { code: 'AU', name: 'Australia', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: false } })

  // ============================================================
  // 2. PROVINCE (DPD) - 38 Provinsi Resmi Indonesia 2024
  //    Source: Kemendagri RI - 38 Provinsi (termasuk 4 DOB Papua: Papua Selatan, Papua Tengah, Papua Pegunungan, Papua Barat Daya)
  // ============================================================
  console.log('→ Creating 38 provinces Indonesia (DPD)...')

  // Data resmi 38 provinsi Indonesia (2024)
  const provincesData = [
    // Sumatera (10)
    { code: '11', name: 'Aceh' },
    { code: '12', name: 'Sumatera Utara' },
    { code: '13', name: 'Sumatera Barat' },
    { code: '14', name: 'Riau' },
    { code: '15', name: 'Jambi' },
    { code: '16', name: 'Sumatera Selatan' },
    { code: '17', name: 'Bengkulu' },
    { code: '18', name: 'Lampung' },
    { code: '19', name: 'Kepulauan Bangka Belitung' },
    { code: '21', name: 'Kepulauan Riau' },
    // Jawa (6)
    { code: '31', name: 'DKI Jakarta' },
    { code: '32', name: 'Jawa Barat' },
    { code: '33', name: 'Jawa Tengah' },
    { code: '34', name: 'DI Yogyakarta' },
    { code: '35', name: 'Jawa Timur' },
    { code: '36', name: 'Banten' },
    // Bali-Nusa (3)
    { code: '51', name: 'Bali' },
    { code: '52', name: 'Nusa Tenggara Barat' },
    { code: '53', name: 'Nusa Tenggara Timur' },
    // Kalimantan (5) - termasuk IKN
    { code: '61', name: 'Kalimantan Barat' },
    { code: '62', name: 'Kalimantan Tengah' },
    { code: '63', name: 'Kalimantan Selatan' },
    { code: '64', name: 'Kalimantan Timur' },
    { code: '65', name: 'Kalimantan Utara' },
    // IKN sebagai wilayah khusus setara DPD
    { code: 'IKN', name: 'Ibu Kota Nusantara (IKN)' },
    // Sulawesi (6)
    { code: '71', name: 'Sulawesi Utara' },
    { code: '72', name: 'Sulawesi Tengah' },
    { code: '73', name: 'Sulawesi Selatan' },
    { code: '74', name: 'Sulawesi Tenggara' },
    { code: '75', name: 'Gorontalo' },
    { code: '76', name: 'Sulawesi Barat' },
    // Maluku (2)
    { code: '81', name: 'Maluku' },
    { code: '82', name: 'Maluku Utara' },
    // Papua (6) - termasuk 4 DOB Papua baru
    { code: '91', name: 'Papua' },
    { code: '92', name: 'Papua Barat' },
    { code: '93', name: 'Papua Selatan' },
    { code: '94', name: 'Papua Tengah' },
    { code: '95', name: 'Papua Pegunungan' },
    { code: '96', name: 'Papua Barat Daya' },
  ]

  const provinceMap: Record<string, string> = {}
  for (const p of provincesData) {
    const created = await db.territory.create({
      data: {
        code: p.code,
        name: p.name,
        level: 'PROVINCE',
        category: 'DOMESTIC',
        parentId: indonesia.id,
        isActive: true,
      },
    })
    provinceMap[p.code] = created.id
  }
  console.log(`  ✓ ${provincesData.length} provinsi Indonesia`)

  // DPD Luar Negeri (5 negara)
  const dpdLn = [
    { code: 'LN_US', name: 'DPD Amerika Serikat' },
    { code: 'LN_CN', name: 'DPD Cina' },
    { code: 'LN_MY', name: 'DPD Malaysia' },
    { code: 'LN_SA', name: 'DPD Saudi Arabia' },
    { code: 'LN_AU', name: 'DPD Australia' },
  ]
  for (const d of dpdLn) {
    const created = await db.territory.create({
      data: {
        code: d.code,
        name: d.name,
        level: 'PROVINCE',
        category: 'INTERNATIONAL',
        parentId: usa.id, // untuk demo, semua LN di bawah USA; produksi bisa beda parent
        isActive: true,
      },
    })
    provinceMap[d.code] = created.id
  }
  console.log(`  ✓ 5 DPD Luar Negeri`)

  // ============================================================
  // 3. REGENCY (DPC) - 14 DPC Kalbar (12 Kabupaten + 2 Kota)
  //    Source: Pemprov Kalbar (PPID) - 14 Kab/Kota resmi
  // ============================================================
  console.log('→ Creating 14 DPC Kalimantan Barat (12 Kab + 2 Kota)...')

  const kalbarId = provinceMap['61']
  // 14 DPC Kalbar - data resmi (12 Kabupaten + 2 Kota)
  const kalbarDpc = [
    // 2 Kota
    { code: '6171', name: 'Kota Pontianak', isCity: true },
    { code: '6172', name: 'Kota Singkawang', isCity: true },
    // 12 Kabupaten
    { code: '6173', name: 'Kabupaten Sambas' },
    { code: '6174', name: 'Kabupaten Bengkayang' },
    { code: '6175', name: 'Kabupaten Landak' },
    { code: '6176', name: 'Kabupaten Mempawah' },
    { code: '6177', name: 'Kabupaten Sanggau' },
    { code: '6178', name: 'Kabupaten Ketapang' },
    { code: '6101', name: 'Kabupaten Sintang' },
    { code: '6102', name: 'Kabupaten Kapuas Hulu' },
    { code: '6103', name: 'Kabupaten Sekadau' },
    { code: '6104', name: 'Kabupaten Melawi' },
    { code: '6105', name: 'Kabupaten Kubu Raya' },
    { code: '6106', name: 'Kabupaten Kayong Utara' },
  ]

  const dpcMap: Record<string, string> = {}
  for (const r of kalbarDpc) {
    const created = await db.territory.create({
      data: {
        code: r.code,
        name: r.name,
        level: 'REGENCY',
        category: 'DOMESTIC',
        parentId: kalbarId,
        isActive: true,
        metadata: JSON.stringify({ isCity: r.isCity || false, province: 'Kalimantan Barat' }),
      },
    })
    dpcMap[r.code] = created.id
  }
  console.log(`  ✓ 14 DPC Kalbar (2 Kota + 12 Kabupaten)`)

  // DPC Luar Negeri - Los Angeles
  const dpcLosAngeles = await db.territory.create({
    data: {
      code: 'LAX',
      name: 'Los Angeles',
      level: 'REGENCY',
      category: 'INTERNATIONAL',
      parentId: provinceMap['LN_US'],
      isActive: true,
    },
  })

  // ============================================================
  // 4. USERS - 4 Role (tanpa Koorwil & Koor DPD)
  // ============================================================
  console.log('→ Creating users (4 roles)...')

  const devPassword = 'lapra08admin'

  const superadmin = await db.user.create({
    data: { username: 'superadmin', password: devPassword, fullName: 'Super Administrator Sistem', role: 'SUPERADMIN', territoryId: indonesia.id, isActive: true },
  })
  const adminDpn = await db.user.create({
    data: { username: 'dpn', password: devPassword, fullName: 'Admin DPN Pusat', role: 'ADMIN_DPN', territoryId: indonesia.id, isActive: true },
  })
  const adminDpdKalbar = await db.user.create({
    data: { username: 'dpd.kalbar', password: devPassword, fullName: 'Admin DPD Kalimantan Barat', role: 'ADMIN_DPD', territoryId: kalbarId, isActive: true },
  })

  // Admin DPD lain (contoh beberapa provinsi)
  const dpdSampleProvinces = [
    { code: '31', username: 'dpd.jakarta', name: 'DKI Jakarta' },
    { code: '32', username: 'dpd.jabar', name: 'Jawa Barat' },
    { code: '35', username: 'dpd.jatim', name: 'Jawa Timur' },
    { code: '73', username: 'dpd.sulsel', name: 'Sulawesi Selatan' },
    { code: 'IKN', username: 'dpd.ikn', name: 'IKN' },
  ]
  for (const p of dpdSampleProvinces) {
    await db.user.create({
      data: {
        username: p.username,
        password: devPassword,
        fullName: `Admin DPD ${p.name}`,
        role: 'ADMIN_DPD',
        territoryId: provinceMap[p.code],
        isActive: true,
      },
    })
  }

  // 14 Admin DPC Kalbar
  for (const r of kalbarDpc) {
    const username = `dpc.${r.code}`
    await db.user.create({
      data: {
        username,
        password: devPassword,
        fullName: `Admin DPC ${r.name}`,
        role: 'ADMIN_DPC',
        territoryId: dpcMap[r.code],
        isActive: true,
      },
    })
  }

  // Admin DPD Luar Negeri
  await db.user.create({
    data: {
      username: 'dpd.usa',
      password: devPassword,
      fullName: 'Admin DPD Amerika Serikat',
      role: 'ADMIN_DPD',
      territoryId: provinceMap['LN_US'],
      isActive: true,
    },
  })

  // ============================================================
  // 5. MENU ITEMS - 8 Menu (konsolidasi)
  // ============================================================
  console.log('→ Creating 8 menus (konsolidasi)...')

  const menus = [
    // 6 Menu Portal (struktur baru)
    { key: 'beranda', label: 'Beranda', icon: 'Home', order: 1, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'profil', label: 'Profil', icon: 'Building2', order: 2, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'pusat-media', label: 'Pusat Media', icon: 'Newspaper', order: 3, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'program', label: 'Program & Kegiatan', icon: 'CalendarDays', order: 4, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'layanan', label: 'Layanan & Advokasi', icon: 'ShieldCheck', order: 5, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'kontak', label: 'Kontak & Sekretariat', icon: 'MapPin', order: 6, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    // Menu Admin Internal (hidden dari nav publik, accessible dari Dashboard)
    { key: 'dashboard', label: 'Dashboard Admin', icon: 'LayoutDashboard', order: 7, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'logistics', label: 'Logistik & Atribut', icon: 'Package', order: 8, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'communication', label: 'Komunikasi & Broadcast', icon: 'Megaphone', order: 9, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'finance', label: 'Kas & Keuangan', icon: 'Wallet', order: 10, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'users', label: 'Pengaturan User', icon: 'UserCog', order: 11, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD' },
  ]

  for (const menu of menus) {
    await db.menuItem.create({
      data: {
        key: menu.key,
        label: menu.label,
        icon: menu.icon,
        order: menu.order,
        roles: menu.roles,
        isVisible: true,
        isActive: true,
      },
    })
  }

  // ============================================================
  // 6. FORM FIELDS - Dynamic fields untuk pendaftaran anggota
  // ============================================================
  console.log('→ Creating form fields...')

  const domesticFields = [
    { fieldKey: 'fullName', fieldLabel: 'Nama Lengkap (sesuai KTP)', fieldType: 'text', isRequired: true, order: 1, placeholder: 'Masukkan nama lengkap' },
    { fieldKey: 'nik', fieldLabel: 'NIK KTP (16 digit)', fieldType: 'text', isRequired: true, order: 2, placeholder: '16 digit NIK', validation: '{"minLength":16,"maxLength":16,"pattern":"^[0-9]{16}$"}' },
    { fieldKey: 'phone', fieldLabel: 'Nomor WhatsApp', fieldType: 'text', isRequired: true, order: 3, placeholder: '628xxx', helpText: 'Wajib awalan 62' },
    { fieldKey: 'gender', fieldLabel: 'Jenis Kelamin', fieldType: 'radio', isRequired: true, order: 4, fieldOptions: '["L","P"]' },
    { fieldKey: 'birthPlace', fieldLabel: 'Tempat Lahir', fieldType: 'text', isRequired: false, order: 5 },
    { fieldKey: 'birthDate', fieldLabel: 'Tanggal Lahir', fieldType: 'date', isRequired: false, order: 6 },
    { fieldKey: 'address', fieldLabel: 'Alamat', fieldType: 'textarea', isRequired: false, order: 7 },
    { fieldKey: 'shirtSize', fieldLabel: 'Ukuran Kemeja', fieldType: 'select', isRequired: true, order: 8, fieldOptions: '["S","M","L","XL","XXL","XXXL"]' },
    { fieldKey: 'profession', fieldLabel: 'Profesi', fieldType: 'text', isRequired: false, order: 9 },
    { fieldKey: 'bloodType', fieldLabel: 'Golongan Darah', fieldType: 'select', isRequired: false, order: 10, fieldOptions: '["A","B","AB","O","Tidak Tahu"]' },
    { fieldKey: 'maritalStatus', fieldLabel: 'Status Pernikahan', fieldType: 'select', isRequired: false, order: 11, fieldOptions: '["Belum Menikah","Menikah","Cerai Hidup","Cerai Mati"]' },
    { fieldKey: 'photoUrl', fieldLabel: 'Pasfoto', fieldType: 'file', isRequired: false, order: 12 },
    { fieldKey: 'idCardUrl', fieldLabel: 'Foto KTP', fieldType: 'file', isRequired: true, order: 13 },
  ]
  for (const f of domesticFields) {
    await db.formField.create({ data: { formType: 'MEMBER_DOMESTIC', ...f } })
  }

  const intlFields = [
    { fieldKey: 'fullName', fieldLabel: 'Full Name (as in Passport)', fieldType: 'text', isRequired: true, order: 1 },
    { fieldKey: 'passportNumber', fieldLabel: 'Passport Number / Local ID', fieldType: 'text', isRequired: true, order: 2 },
    { fieldKey: 'phone', fieldLabel: 'Phone Number (E.164 format)', fieldType: 'text', isRequired: true, order: 3, placeholder: '+1, +86, etc', helpText: 'Format E.164' },
    { fieldKey: 'email', fieldLabel: 'Email', fieldType: 'text', isRequired: false, order: 4 },
    { fieldKey: 'residenceCountry', fieldLabel: 'Country of Residence', fieldType: 'text', isRequired: true, order: 5 },
    { fieldKey: 'address', fieldLabel: 'Address', fieldType: 'textarea', isRequired: false, order: 6 },
    { fieldKey: 'photoUrl', fieldLabel: 'Photo', fieldType: 'file', isRequired: false, order: 7 },
    { fieldKey: 'idCardUrl', fieldLabel: 'Passport Document', fieldType: 'file', isRequired: true, order: 8 },
  ]
  for (const f of intlFields) {
    await db.formField.create({ data: { formType: 'MEMBER_INTERNATIONAL', ...f } })
  }

  // ============================================================
  // 7. SECURITY & SYSTEM SETTINGS
  // ============================================================
  console.log('→ Creating security & system settings...')

  const securitySettings = [
    { key: 'MFA_ENABLED', value: 'false', description: 'Multi-Factor Authentication (OTP)' },
    { key: 'IP_WHITELIST_ENABLED', value: 'false', description: 'IP Whitelisting' },
    { key: 'DEVICE_TOKEN_ENABLED', value: 'false', description: 'Device Token Binding' },
    { key: 'AUTO_LOGOUT_5MIN', value: 'false', description: 'Auto Logout 5 menit idle' },
    { key: 'DB_ENCRYPTION_ENABLED', value: 'false', description: 'Database Encryption at Rest' },
    { key: 'PASSWORD_COMPLEXITY', value: 'false', description: 'Password Complexity Check' },
    { key: 'LOGIN_ATTEMPT_LIMIT', value: 'false', description: 'Login Attempt Limiting' },
  ]
  for (const s of securitySettings) {
    await db.securitySetting.create({ data: { ...s, isActive: false } })
  }

  const systemSettings = [
    { key: 'ORG_NAME', value: 'Perkumpulan Laskar Prabowo 08', category: 'GENERAL' },
    { key: 'ORG_SHORT_NAME', value: 'LAPRA 08', category: 'GENERAL' },
    { key: 'DEV_MODE', value: 'true', category: 'SYSTEM', description: 'Mode akses terbuka selama pembangunan' },
    { key: 'KTA_PREFIX', value: 'LAPRA08', category: 'KTA' },
    { key: 'PILOT_PROVINCE_CODE', value: '61', category: 'SYSTEM', description: 'Fokus pilot project: Kalimantan Barat' },
    { key: 'DEFAULT_COUNTRY_CODE', value: 'ID', category: 'SYSTEM' },
    { key: 'BROADCAST_RATE_LIMIT', value: '50', category: 'BROADCAST', description: 'Maksimal pesan per menit' },
  ]
  for (const s of systemSettings) {
    await db.systemSetting.create({ data: s })
  }

  // ============================================================
  // 8. SAMPLE DATA - Pengurus DPN asli + Anggota + SK
  // ============================================================
  console.log('→ Creating sample members & pengurus...')

  // Pengurus DPN asli (Berdasarkan riset web LAPRA 08 Periode 2024-2029 + Update Maret 2026)
  const dpnPositions = [
    { name: 'Dr. (HC) Hashim S. Djojohadikusumo', position: 'Ketua Dewan Pembina', order: 1, phone: '628111000001', email: 'pembina@laskarprabowo-08.com' },
    { name: 'Devi Taurisa, S.H., M.H., C.L.D.', position: 'Ketua Umum DPN', order: 2, phone: '628111000002', email: 'ketum@laskarprabowo-08.com' },
    { name: 'Hisar Tambunan, S.H., M.H.', position: 'Ketua Harian DPN', order: 3, phone: '628111000003', email: 'harian@laskarprabowo-08.com' },
    { name: 'Brigjen. Pol. (Purn) Dr. R. Nurhadi, S.I.K., M.Si., CHRMP', position: 'Sekretaris Jenderal DPN', order: 4, phone: '628111000004', email: 'sekjen@laskarprabowo-08.com' },
    { name: 'Timmy Rorimpandey, S.E., M.M.', position: 'Bendahara Umum DPN', order: 5, phone: '628111000005', email: 'bendahara@laskarprabowo-08.com' },
  ]
  for (const p of dpnPositions) {
    await db.orgPosition.create({
      data: {
        fullName: p.name,
        positionName: p.position,
        level: 'DPN',
        territoryId: indonesia.id,
        phone: p.phone,
        email: p.email,
        isActive: true,
        order: p.order,
        startDate: new Date('2024-11-28'),
      },
    })
  }

  // Pengurus DPD Kalbar
  const dpdKalbarPositions = [
    { name: 'H. Gustav Hasan', position: 'Ketua DPD Kalbar', order: 1 },
    { name: 'Drs. Eko Prasetyo', position: 'Sekretaris DPD Kalbar', order: 2 },
    { name: 'Maya Anggraini, S.E', position: 'Bendahara DPD Kalbar', order: 3 },
  ]
  for (const p of dpdKalbarPositions) {
    await db.orgPosition.create({
      data: {
        fullName: p.name,
        positionName: p.position,
        level: 'DPD',
        territoryId: kalbarId,
        phone: '6281220000' + String(p.order).padStart(2, '0'),
        isActive: true,
        order: p.order,
      },
    })
  }

  // Pengurus DPC Pontianak (Kota)
  await db.orgPosition.create({
    data: {
      fullName: 'H. Suparman', positionName: 'Ketua DPC Kota Pontianak', level: 'DPC',
      territoryId: dpcMap['6171'], phone: '6281234560001', isActive: true, order: 1,
    },
  })

  // Sample anggota DPN (format KTA: LAPRA08.ID.00.00.26.0000X)
  const dpnMembers = [
    { name: 'Devi Taurisa, S.H., M.H., C.L.D.', nik: '3171010101900001', phone: '628111000002', profession: 'Ketua Umum DPN', gender: 'P' },
    { name: 'Brigjen. Pol. (Purn) Dr. R. Nurhadi', nik: '3171020202900002', phone: '628111000004', profession: 'Sekretaris Jenderal DPN', gender: 'L' },
    { name: 'Timmy Rorimpandey, S.E., M.M.', nik: '3171030303900003', phone: '628111000005', profession: 'Bendahara Umum DPN', gender: 'L' },
  ]
  for (let i = 0; i < dpnMembers.length; i++) {
    const m = dpnMembers[i]
    const seq = String(i + 1).padStart(5, '0')
    await db.member.create({
      data: {
        memberNumber: `LAPRA08.ID.00.00.26.${seq}`,
        fullName: m.name, nik: m.nik, phone: m.phone, profession: m.profession, gender: m.gender,
        territoryId: indonesia.id, status: 'ACTIVE',
        registeredById: adminDpn.id, verifiedById: adminDpn.id,
        verifiedAt: new Date(), registeredAt: new Date(),
      },
    })
  }

  // Sample anggota DPC Kota Pontianak (5 anggota)
  const pontianakId = dpcMap['6171']
  const pontianakMembers = [
    { name: 'Budi Santoso', nik: '6101710101900001', phone: '6281234567001', size: 'L', profession: 'Wiraswasta', gender: 'L' },
    { name: 'Ahmad Fauzi', nik: '6101710202900002', phone: '6281234567002', size: 'M', profession: 'PNS', gender: 'L' },
    { name: 'Siti Aminah', nik: '6101710303900003', phone: '6281234567003', size: 'S', profession: 'Guru', gender: 'P' },
    { name: 'Dewi Lestari', nik: '6101710404900004', phone: '6281234567004', size: 'M', profession: 'Karyawan Swasta', gender: 'P' },
    { name: 'Rudi Hartono', nik: '6101710505900005', phone: '6281234567005', size: 'XL', profession: 'Pedagang', gender: 'L' },
  ]
  for (let i = 0; i < pontianakMembers.length; i++) {
    const m = pontianakMembers[i]
    const seq = String(i + 1).padStart(5, '0')
    await db.member.create({
      data: {
        memberNumber: `LAPRA08.ID.61.6171.26.${seq}`,
        fullName: m.name, nik: m.nik, phone: m.phone, shirtSize: m.size, profession: m.profession, gender: m.gender,
        territoryId: pontianakId, status: 'ACTIVE',
        registeredById: adminDpdKalbar.id, verifiedById: adminDpdKalbar.id,
        verifiedAt: new Date(), registeredAt: new Date(),
      },
    })
  }

  // Sample anggota DPC Sambas (3 anggota untuk demo isolasi)
  const sambasId = dpcMap['6173']
  const sambasMembers = [
    { name: 'Hendra Wijaya', nik: '6101730101900001', phone: '6281234568001', size: 'L', gender: 'L' },
    { name: 'Maya Sari', nik: '6101730202900002', phone: '6281234568002', size: 'M', gender: 'P' },
    { name: 'Joko Susilo', nik: '6101730303900003', phone: '6281234568003', size: 'XL', gender: 'L' },
  ]
  for (let i = 0; i < sambasMembers.length; i++) {
    const m = sambasMembers[i]
    const seq = String(i + 1).padStart(5, '0')
    await db.member.create({
      data: {
        memberNumber: `LAPRA08.ID.61.6173.26.${seq}`,
        fullName: m.name, nik: m.nik, phone: m.phone, shirtSize: m.size,
        territoryId: sambasId, status: 'ACTIVE',
        registeredById: adminDpdKalbar.id, verifiedById: adminDpdKalbar.id,
        verifiedAt: new Date(), registeredAt: new Date(),
      },
    })
  }

  // Sample SK Dokumen DPN
  await db.sKDocument.create({
    data: {
      skNumber: 'SK-PEMBINA/LAPRA08/2024/001',
      title: 'SK Pelantikan Pengurus DPN LAPRA 08 Periode 2024-2029',
      description: 'Surat Keputusan Ketua Dewan Pembina Hashim Djojohadikusumo tentang Pengurusan DPN LAPRA 08 Periode 2024-2029',
      fileUrl: 'https://laskarprabowo-08.com/sk/dpn-2024-2029.pdf',
      fileName: 'SK-DPN-LAPRA08-2024-2029.pdf',
      fileType: 'pdf',
      fileSize: 245678,
      ocrStatus: 'COMPLETED',
      extractedText: 'Surat Keputusan Nomor: SK-PEMBINA/LAPRA08/2024/001. Tentang Pengurusan DPN Laskar Prabowo 08 Periode 2024-2029. Diterbitkan: 28 November 2024. Oleh: Dr. (HC) Hashim S. Djojohadikusumo, Ketua Dewan Pembina.',
      ocrMetadata: JSON.stringify({
        nomorSK: 'SK-PEMBINA/LAPRA08/2024/001',
        tanggalTerbit: '2024-11-28',
        penerbit: 'Dr. (HC) Hashim S. Djojohadikusumo',
        jabatanPenerbit: 'Ketua Dewan Pembina',
        masaBakti: '2024-2029',
        autoDetected: true,
      }),
      issuedAt: new Date('2024-11-28'),
      issuedBy: 'Dr. (HC) Hashim S. Djojohadikusumo',
      territoryId: indonesia.id,
    },
  })

  // Sample pengumuman
  await db.announcement.create({
    data: {
      title: 'Selamat Datang di Sistem Informasi LAPRA 08',
      content: 'Sistem informasi internal LAPRA 08 telah aktif dengan struktur hierarki: DPN (Pusat) → DPD (Provinsi) → DPC (Kabupaten/Kota). DPN membawahi semua DPD seluruh Indonesia & luar negeri. Setiap DPD membawahi DPC-DPC di provinsinya.',
      type: 'INFO', isPinned: true, isActive: true,
      territoryId: kalbarId, createdById: adminDpdKalbar.id,
    },
  })

  // Sample finance
  await db.financeTransaction.create({
    data: { type: 'INCOME', category: 'IURAN', amount: 5000000, description: 'Iuran bulanan pengurus DPD Kalbar', transactionDate: new Date(), territoryId: kalbarId, recordedById: adminDpdKalbar.id },
  })
  await db.financeTransaction.create({
    data: { type: 'EXPENSE', category: 'SEWA', amount: 1500000, description: 'Sewa sekretariat bulan ini', transactionDate: new Date(), territoryId: kalbarId, recordedById: adminDpdKalbar.id },
  })

  // Sample asset
  await db.asset.create({
    data: { name: 'Kemeja Seragam Hitam', category: 'KEMEJA', stock: 500, unit: 'pcs', minStock: 50, territoryId: kalbarId },
  })

  // Sample event
  await db.event.create({
    data: {
      title: 'Pelantikan Pengurus DPC Kota Pontianak',
      description: 'Acara pelantikan resmi pengurus DPC Kota Pontianak periode baru',
      type: 'PELANTIKAN',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: 'Aula Kantor Walikota Pontianak',
      territoryId: pontianakId, createdById: adminDpdKalbar.id, status: 'SCHEDULED', targetAttendance: 200,
    },
  })

  console.log('\n✅ Seeding v3 completed!')
  console.log('\n📋 STRUKTUR HIERARKI (3 Level):')
  console.log('   DPN (Pusat Nasional) - Indonesia')
  console.log('   ├── 38 Provinsi Indonesia (DPD)')
  console.log('   │   └── DPD Kalbar (61) membawahi 14 DPC:')
  console.log('   │       ├── 2 Kota: Pontianak, Singkawang')
  console.log('   │       └── 12 Kabupaten: Sambas, Bengkayang, Landak, Mempawah,')
  console.log('   │           Sanggau, Ketapang, Sintang, Kapuas Hulu, Sekadau,')
  console.log('   │           Melawi, Kubu Raya, Kayong Utara')
  console.log('   └── 5 DPD Luar Negeri (USA, CN, MY, SA, AU)')
  console.log('\n📋 Login credentials (Dev Mode - password: lapra08admin):')
  console.log('   superadmin | dpn | dpd.kalbar | dpd.ikn | dpd.usa')
  console.log('   dpc.6171 (Kota Pontianak) | dpc.6173 (Sambas) | ... dpc.6106')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
