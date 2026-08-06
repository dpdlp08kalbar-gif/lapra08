// LAPRA 08 - Database Seeder
// Menyiapkan data awal: Territory, Users, Menus, Form Fields, Settings

import { db } from '../src/lib/db'

async function main() {
  console.log('🌱 Seeding LAPRA 08 database...')

  // ============================================================
  // 1. TERRITORY - Hierarki Global
  // ============================================================
  console.log('→ Creating territories...')

  // Negara
  const indonesia = await db.territory.create({
    data: {
      code: 'ID',
      name: 'Indonesia',
      level: 'COUNTRY',
      category: 'DOMESTIC',
      isActive: true,
    },
  })

  const usa = await db.territory.create({
    data: {
      code: 'US',
      name: 'Amerika Serikat',
      level: 'COUNTRY',
      category: 'INTERNATIONAL',
      isActive: true,
    },
  })

  const china = await db.territory.create({
    data: {
      code: 'CN',
      name: 'Cina',
      level: 'COUNTRY',
      category: 'INTERNATIONAL',
      isActive: false, // Lapak siap pakai
    },
  })

  // Provinsi di Indonesia
  const kalbar = await db.territory.create({
    data: {
      code: '61',
      name: 'Kalimantan Barat',
      level: 'PROVINCE',
      category: 'DOMESTIC',
      parentId: indonesia.id,
      isActive: true,
    },
  })

  // Provinsi lain (lapak siap pakai)
  const jakarta = await db.territory.create({
    data: {
      code: '31',
      name: 'DKI Jakarta',
      level: 'PROVINCE',
      category: 'DOMESTIC',
      parentId: indonesia.id,
      isActive: false,
    },
  })

  // 14 Kabupaten/Kota Kalimantan Barat
  const regencyCodes = [
    { code: '71', name: 'Kota Pontianak', isCity: true },
    { code: '72', name: 'Kabupaten Pontianak', isCity: false },
    { code: '73', name: 'Kabupaten Landak', isCity: false },
    { code: '74', name: 'Kabupaten Mempawah', isCity: false },
    { code: '75', name: 'Kabupaten Sambas', isCity: false },
    { code: '76', name: 'Kabupaten Bengkayang', isCity: false },
    { code: '77', name: 'Kota Singkawang', isCity: true },
    { code: '78', name: 'Kabupaten Kapuas Hulu', isCity: false },
    { code: '01', name: 'Kabupaten Ketapang', isCity: false },
    { code: '02', name: 'Kabupaten Melawi', isCity: false },
    { code: '03', name: 'Kabupaten Sintang', isCity: false },
    { code: '04', name: 'Kabupaten Sekadau', isCity: false },
    { code: '05', name: 'Kabupaten Sanggau', isCity: false },
    { code: '06', name: 'Kabupaten Tayan', isCity: false },
  ]

  const regencyIds: Record<string, string> = {}
  for (const reg of regencyCodes) {
    const created = await db.territory.create({
      data: {
        code: reg.code,
        name: reg.name,
        level: 'REGENCY',
        category: 'DOMESTIC',
        parentId: kalbar.id,
        isActive: true,
      },
    })
    regencyIds[reg.code] = created.id
  }

  // Kota luar negeri (untuk demo internasional)
  const losAngeles = await db.territory.create({
    data: {
      code: 'LAX',
      name: 'Los Angeles',
      level: 'REGENCY',
      category: 'INTERNATIONAL',
      parentId: usa.id,
      isActive: true,
    },
  })

  // ============================================================
  // 2. USERS - Admin awal (Development Mode, password plain text)
  // ============================================================
  console.log('→ Creating users...')

  // Password sederhana (development mode - sesuai brief tidak ada security ketat)
  const devPassword = 'lapra08admin'

  const superadmin = await db.user.create({
    data: {
      username: 'superadmin',
      password: devPassword,
      fullName: 'Super Administrator Sistem',
      role: 'SUPERADMIN',
      territoryId: indonesia.id,
      isActive: true,
    },
  })

  const adminDpn = await db.user.create({
    data: {
      username: 'dpn',
      password: devPassword,
      fullName: 'Admin DPN Pusat',
      role: 'ADMIN_DPN',
      territoryId: indonesia.id,
      isActive: true,
    },
  })

  const adminDpdKalbar = await db.user.create({
    data: {
      username: 'dpd.kalbar',
      password: devPassword,
      fullName: 'Admin DPD Kalimantan Barat',
      role: 'ADMIN_DPD',
      territoryId: kalbar.id,
      isActive: true,
    },
  })

  // Admin DPC untuk 14 Kab/Kota Kalbar
  for (const reg of regencyCodes) {
    const username = `dpc.${reg.code}`
    await db.user.create({
      data: {
        username,
        password: devPassword,
        fullName: `Admin DPC ${reg.name}`,
        role: 'ADMIN_DPC',
        territoryId: regencyIds[reg.code],
        isActive: true,
      },
    })
  }

  // ============================================================
  // 3. MENU ITEMS - 10 Menu Utama
  // ============================================================
  console.log('→ Creating menus...')

  const menus = [
    { key: 'dashboard', label: 'Dasbor Utama', icon: 'LayoutDashboard', order: 1, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'territory', label: 'Manajemen Wilayah', icon: 'Map', order: 2, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD' },
    { key: 'membership', label: 'Data Keanggotaan', icon: 'Users', order: 3, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'organization', label: 'Struktur Pengurus & SK', icon: 'Building2', order: 4, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'logistics', label: 'Logistik & Atribut', icon: 'Package', order: 5, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'events', label: 'Event & Mobilisasi', icon: 'CalendarDays', order: 6, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'communication', label: 'Komunikasi & Broadcast', icon: 'Megaphone', order: 7, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'finance', label: 'Kas & Keuangan', icon: 'Wallet', order: 8, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
    { key: 'users', label: 'Pengaturan User', icon: 'UserCog', order: 9, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD' },
    { key: 'help', label: 'Pusat Bantuan', icon: 'LifeBuoy', order: 10, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_DPD,ADMIN_DPC' },
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
  // 4. FORM FIELDS - Dynamic fields untuk pendaftaran anggota
  // ============================================================
  console.log('→ Creating form fields...')

  // Domestik (Kalbar)
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

  // Internasional
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
  // 5. SECURITY SETTINGS (Saklar Keamanan - default OFF di dev mode)
  // ============================================================
  console.log('→ Creating security settings...')

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

  // ============================================================
  // 6. SYSTEM SETTINGS
  // ============================================================
  console.log('→ Creating system settings...')

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
  // 7. SAMPLE DATA - Anggota dummy untuk demo
  // ============================================================
  console.log('→ Creating sample members...')

  const pontianakId = regencyIds['71']
  const sampleMembers = [
    { name: 'Budi Santoso', nik: '6101710101900001', phone: '6281234567001', size: 'L', profession: 'Wiraswasta', gender: 'L' },
    { name: 'Ahmad Fauzi', nik: '6101710202900002', phone: '6281234567002', size: 'M', profession: 'PNS', gender: 'L' },
    { name: 'Siti Aminah', nik: '6101710303900003', phone: '6281234567003', size: 'S', profession: 'Guru', gender: 'P' },
    { name: 'Dewi Lestari', nik: '6101710404900004', phone: '6281234567004', size: 'M', profession: 'Karyawan Swasta', gender: 'P' },
    { name: 'Rudi Hartono', nik: '6101710505900005', phone: '6281234567005', size: 'XL', profession: 'Pedagang', gender: 'L' },
  ]

  for (let i = 0; i < sampleMembers.length; i++) {
    const m = sampleMembers[i]
    const seq = String(i + 1).padStart(5, '0')
    const memberNumber = `LAPRA08.ID.61.71.26.${seq}`
    await db.member.create({
      data: {
        memberNumber,
        fullName: m.name,
        nik: m.nik,
        phone: m.phone,
        shirtSize: m.size,
        profession: m.profession,
        gender: m.gender,
        territoryId: pontianakId,
        status: 'ACTIVE',
        registeredById: adminDpdKalbar.id,
        verifiedById: adminDpdKalbar.id,
        verifiedAt: new Date(),
        registeredAt: new Date(),
      },
    })
  }

  // Sample anggota Sambas untuk demo isolasi
  const sambasId = regencyIds['75']
  const sambasMembers = [
    { name: 'Hendra Wijaya', nik: '6101750101900001', phone: '6281234568001', size: 'L', gender: 'L' },
    { name: 'Maya Sari', nik: '6101750202900002', phone: '6281234568002', size: 'M', gender: 'P' },
    { name: 'Joko Susilo', nik: '6101750303900003', phone: '6281234568003', size: 'XL', gender: 'L' },
  ]

  for (let i = 0; i < sambasMembers.length; i++) {
    const m = sambasMembers[i]
    const seq = String(i + 1).padStart(5, '0')
    const memberNumber = `LAPRA08.ID.61.75.26.${seq}`
    await db.member.create({
      data: {
        memberNumber,
        fullName: m.name,
        nik: m.nik,
        phone: m.phone,
        shirtSize: m.size,
        territoryId: sambasId,
        status: 'ACTIVE',
        registeredById: adminDpdKalbar.id,
        verifiedById: adminDpdKalbar.id,
        verifiedAt: new Date(),
        registeredAt: new Date(),
      },
    })
  }

  // Sample anggota DPN (Pusat Nasional) - format KTA: LAPRA08.ID.00.00.26.0000X
  console.log('→ Creating DPN sample members...')
  const dpnMembers = [
    { name: 'Dr. H. Bambang Sutejo, M.Si', nik: '3171010101900001', phone: '628111000001', size: 'L', profession: 'Ketua Umum DPN', gender: 'L' },
    { name: 'Prof. Dr. Siti Rahmawati, Ph.D', nik: '3171020202900002', phone: '628111000002', size: 'M', profession: 'Sekretaris Jenderal DPN', gender: 'P' },
    { name: 'H. Agus Setiawan, S.E., M.M', nik: '3171030303900003', phone: '628111000003', size: 'XL', profession: 'Bendahara Umum DPN', gender: 'L' },
  ]

  for (let i = 0; i < dpnMembers.length; i++) {
    const m = dpnMembers[i]
    const seq = String(i + 1).padStart(5, '0')
    const memberNumber = `LAPRA08.ID.00.00.26.${seq}` // Format DPN: provinsi=00, kab/kota=00
    await db.member.create({
      data: {
        memberNumber,
        fullName: m.name,
        nik: m.nik,
        phone: m.phone,
        shirtSize: m.size,
        profession: m.profession,
        gender: m.gender,
        territoryId: indonesia.id, // Territory DPN = Indonesia (COUNTRY level)
        status: 'ACTIVE',
        registeredById: adminDpn.id,
        verifiedById: adminDpn.id,
        verifiedAt: new Date(),
        registeredAt: new Date(),
      },
    })
  }

  // Sample pengurus DPC Pontianak
  await db.orgPosition.create({
    data: {
      fullName: 'H. Suparman',
      positionName: 'Ketua DPC Kota Pontianak',
      level: 'DPC',
      territoryId: pontianakId,
      phone: '6281234560001',
      isActive: true,
      order: 1,
    },
  })

  await db.orgPosition.create({
    data: {
      fullName: 'Drs. Rahmat',
      positionName: 'Sekretaris DPC Kota Pontianak',
      level: 'DPC',
      territoryId: pontianakId,
      phone: '6281234560002',
      isActive: true,
      order: 2,
    },
  })

  // Sample pengurus DPN (Pusat Nasional)
  const dpnPositions = [
    { name: 'Dr. H. Bambang Sutejo, M.Si', position: 'Ketua Umum DPN', order: 1 },
    { name: 'Prof. Dr. Siti Rahmawati, Ph.D', position: 'Sekretaris Jenderal DPN', order: 2 },
    { name: 'H. Agus Setiawan, S.E., M.M', position: 'Bendahara Umum DPN', order: 3 },
    { name: 'Letjen (Purn) TNI Surya Pratama', position: 'Ketua Harian DPN', order: 4 },
  ]
  for (const p of dpnPositions) {
    await db.orgPosition.create({
      data: {
        fullName: p.name,
        positionName: p.position,
        level: 'DPN',
        territoryId: indonesia.id,
        phone: '6281110000' + String(p.order).padStart(2, '0'),
        isActive: true,
        order: p.order,
      },
    })
  }

  // Sample pengurus DPD Kalbar
  const dpdPositions = [
    { name: 'H. Gustav Hasan', position: 'Ketua DPD Kalbar', order: 1 },
    { name: 'Drs. Eko Prasetyo', position: 'Sekretaris DPD Kalbar', order: 2 },
    { name: 'Maya Anggraini, S.E', position: 'Bendahara DPD Kalbar', order: 3 },
  ]
  for (const p of dpdPositions) {
    await db.orgPosition.create({
      data: {
        fullName: p.name,
        positionName: p.position,
        level: 'DPD',
        territoryId: kalbar.id,
        phone: '6281220000' + String(p.order).padStart(2, '0'),
        isActive: true,
        order: p.order,
      },
    })
  }

  // Sample asset untuk DPD Kalbar
  await db.asset.create({
    data: {
      name: 'Kemeja Seragam Hitam',
      category: 'KEMEJA',
      stock: 500,
      unit: 'pcs',
      minStock: 50,
      territoryId: kalbar.id,
    },
  })

  await db.asset.create({
    data: {
      name: 'Bendera Merah Putih',
      category: 'BENDERA',
      stock: 100,
      unit: 'pcs',
      minStock: 10,
      territoryId: kalbar.id,
    },
  })

  // Sample pengumuman
  await db.announcement.create({
    data: {
      title: 'Selamat Datang di Sistem Informasi LAPRA 08',
      content: 'Sistem informasi internal LAPRA 08 telah aktif. Silakan mulai pengisian data anggota di wilayah masing-masing. Hubungi admin pusat jika ada kendala.',
      type: 'INFO',
      isPinned: true,
      isActive: true,
      territoryId: kalbar.id,
      createdById: adminDpdKalbar.id,
    },
  })

  // Sample finance
  await db.financeTransaction.create({
    data: {
      type: 'INCOME',
      category: 'IURAN',
      amount: 5000000,
      description: 'Iuran bulanan pengurus DPD Kalbar',
      transactionDate: new Date(),
      territoryId: kalbar.id,
      recordedById: adminDpdKalbar.id,
    },
  })

  await db.financeTransaction.create({
    data: {
      type: 'EXPENSE',
      category: 'SEWA',
      amount: 1500000,
      description: 'Sewa sekretariat bulan ini',
      transactionDate: new Date(),
      territoryId: kalbar.id,
      recordedById: adminDpdKalbar.id,
    },
  })

  // Sample event
  await db.event.create({
    data: {
      title: 'Pelantikan Pengurus DPC Kota Pontianak',
      description: 'Acara pelantikan resmi pengurus DPC Kota Pontianak periode baru',
      type: 'PELANTIKAN',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: 'Aula Kantor Walikota Pontianak',
      territoryId: pontianakId,
      createdById: adminDpdKalbar.id,
      status: 'SCHEDULED',
      targetAttendance: 200,
    },
  })

  console.log('\n✅ Seeding completed!')
  console.log('\n📋 Login credentials (Development Mode):')
  console.log('   Username: superadmin | Password: lapra08admin')
  console.log('   Username: dpn | Password: lapra08admin')
  console.log('   Username: dpd.kalbar | Password: lapra08admin')
  console.log('   Username: dpc.71 (Pontianak) | Password: lapra08admin')
  console.log('   Username: dpc.75 (Sambas) | Password: lapra08admin')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
