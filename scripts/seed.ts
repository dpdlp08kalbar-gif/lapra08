// LAPRA 08 - Database Seeder v2
// Hierarki: DPN (Country) → Koorwil (Coordinator) → DPD (Province) → Koor DPD (Coord_DPD) → DPC (Regency)

import { db } from '../src/lib/db'

async function main() {
  console.log('🧹 Cleaning existing data...')
  // Hapus semua data dulu untuk hindari konflik unique constraint
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

  console.log('🌱 Seeding LAPRA 08 database v2 (with Koorwil & Koor DPD)...')

  // ============================================================
  // 1. COUNTRY (DPN) - Indonesia & negara lain
  // ============================================================
  console.log('→ Creating countries (DPN)...')

  const indonesia = await db.territory.create({
    data: { code: 'ID', name: 'Indonesia', level: 'COUNTRY', category: 'DOMESTIC', isActive: true },
  })

  const usa = await db.territory.create({
    data: { code: 'US', name: 'Amerika Serikat', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: true },
  })

  await db.territory.create({
    data: { code: 'CN', name: 'Cina', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: false },
  })
  await db.territory.create({
    data: { code: 'MY', name: 'Malaysia', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: false },
  })
  await db.territory.create({
    data: { code: 'SA', name: 'Saudi Arabia', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: false },
  })
  await db.territory.create({
    data: { code: 'AU', name: 'Australia', level: 'COUNTRY', category: 'INTERNATIONAL', isActive: false },
  })

  // ============================================================
  // 2. KOORWIL (Koordinator Wilayah) - 7 wilayah bantu DPN
  // ============================================================
  console.log('→ Creating Koorwil (coordinators under DPN)...')

  const koorwilData = [
    { code: 'KW1', name: 'Koorwil Wilayah I (Sumatera)', provinces: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '31', '32', '33', '34', '35', '36', '52', '53', '61', '62', '63', '64', '65'] },
    { code: 'KW2', name: 'Koorwil Wilayah II (Jawa)', provinces: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36'] },
    { code: 'KW3', name: 'Koorwil Wilayah III (Kalimantan)', provinces: ['61', '62', '63', '64'] },
    { code: 'KW4', name: 'Koorwil Wilayah IV (Sulawesi)', provinces: ['71', '72', '73', '74', '75', '76'] },
    { code: 'KW5', name: 'Koorwil Wilayah V (Bali-Nusa Tenggara)', provinces: ['51', '52', '53'] },
    { code: 'KW6', name: 'Koorwil Wilayah VI (Maluku-Papua)', provinces: ['81', '82', '91', '92', '93', '94'] },
    { code: 'KW7', name: 'Koorwil Wilayah VII (Luar Negeri)', provinces: [], international: true },
  ]

  const koorwilMap: Record<string, string> = {}
  for (const kw of koorwilData) {
    const parent = kw.international ? null : indonesia.id
    const created = await db.territory.create({
      data: {
        code: kw.code,
        name: kw.name,
        level: 'COORDINATOR',
        category: kw.international ? 'INTERNATIONAL' : 'DOMESTIC',
        parentId: parent,
        isActive: true,
        metadata: JSON.stringify({ description: kw.name }),
      },
    })
    koorwilMap[kw.code] = created.id
  }

  // ============================================================
  // 3. PROVINCES (DPD) - 38 provinsi Indonesia + DPD luar negeri
  // ============================================================
  console.log('→ Creating 38 provinces (DPD)...')

  // 38 provinsi Indonesia (data lengkap 2024 - include 4 DOB baru)
  const provinces = [
    // Sumatera (KW1)
    { code: '11', name: 'Aceh', kw: 'KW1' },
    { code: '12', name: 'Sumatera Utara', kw: 'KW1' },
    { code: '13', name: 'Sumatera Barat', kw: 'KW1' },
    { code: '14', name: 'Riau', kw: 'KW1' },
    { code: '15', name: 'Jambi', kw: 'KW1' },
    { code: '16', name: 'Sumatera Selatan', kw: 'KW1' },
    { code: '17', name: 'Bengkulu', kw: 'KW1' },
    { code: '18', name: 'Lampung', kw: 'KW1' },
    { code: '19', name: 'Bangka Belitung', kw: 'KW1' },
    { code: '21', name: 'Kepulauan Riau', kw: 'KW1' },
    // Jawa (KW2)
    { code: '01', name: 'DKI Jakarta', kw: 'KW2' },
    { code: '02', name: 'Jawa Barat', kw: 'KW2' },
    { code: '03', name: 'Jawa Tengah', kw: 'KW2' },
    { code: '04', name: 'DI Yogyakarta', kw: 'KW2' },
    { code: '05', name: 'Jawa Timur', kw: 'KW2' },
    { code: '06', name: 'Banten', kw: 'KW2' },
    { code: '07', name: 'Bali', kw: 'KW2' },
    // Kalimantan (KW3) - IKN masuk sini sebagai wilayah khusus
    { code: '61', name: 'Kalimantan Barat', kw: 'KW3' },
    { code: '62', name: 'Kalimantan Tengah', kw: 'KW3' },
    { code: '63', name: 'Kalimantan Selatan', kw: 'KW3' },
    { code: '64', name: 'Kalimantan Timur', kw: 'KW3' },
    { code: 'IKN', name: 'Ibu Kota Nusantara (IKN)', kw: 'KW3' },
    // Sulawesi (KW4)
    { code: '71', name: 'Sulawesi Utara', kw: 'KW4' },
    { code: '72', name: 'Sulawesi Tengah', kw: 'KW4' },
    { code: '73', name: 'Sulawesi Selatan', kw: 'KW4' },
    { code: '74', name: 'Sulawesi Tenggara', kw: 'KW4' },
    { code: '75', name: 'Gorontalo', kw: 'KW4' },
    { code: '76', name: 'Sulawesi Barat', kw: 'KW4' },
    // Bali-Nusa (KW5)
    { code: '51', name: 'Nusa Tenggara Barat', kw: 'KW5' },
    { code: '52', name: 'Nusa Tenggara Timur', kw: 'KW5' },
    // Maluku-Papua (KW6)
    { code: '81', name: 'Maluku', kw: 'KW6' },
    { code: '82', name: 'Maluku Utara', kw: 'KW6' },
    { code: '91', name: 'Papua', kw: 'KW6' },
    { code: '92', name: 'Papua Barat', kw: 'KW6' },
    { code: '93', name: 'Papua Selatan', kw: 'KW6' },
    { code: '94', name: 'Papua Tengah', kw: 'KW6' },
    { code: '95', name: 'Papua Pegunungan', kw: 'KW6' },
    { code: '96', name: 'Papua Barat Daya', kw: 'KW6' },
  ]

  const provinceMap: Record<string, string> = {}
  for (const p of provinces) {
    const created = await db.territory.create({
      data: {
        code: p.code,
        name: p.name,
        level: 'PROVINCE',
        category: 'DOMESTIC',
        parentId: koorwilMap[p.kw],
        isActive: true,
      },
    })
    provinceMap[p.code] = created.id
  }

  // DPD luar negeri (di bawah Koorwil VII)
  // Note: code DPD LN pakai prefix "LN_" untuk bedakan dari COUNTRY
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
        parentId: koorwilMap['KW7'],
        isActive: true,
      },
    })
    provinceMap[d.code] = created.id
  }

  // ============================================================
  // 4. KOOR_DPD (Koordinator DPD) untuk Kalbar
  // Pembagian wilayah Kalbar menjadi 4 region koordinator
  // ============================================================
  console.log('→ Creating Koor DPD for Kalimantan Barat (4 regions)...')

  const kalbarId = provinceMap['61']
  const koorDpdData = [
    {
      code: 'KR1',
      name: 'Koord DPD Kalbar Region I (Pontianak Raya)',
      regencies: [
        { code: '6171', name: 'Kota Pontianak', isCity: true },
        { code: '6172', name: 'Kabupaten Pontianak' },
        { code: '6173', name: 'Kabupaten Landak' },
        { code: '6174', name: 'Kabupaten Mempawah' },
      ],
    },
    {
      code: 'KR2',
      name: 'Koord DPD Kalbar Region II (Pesisir Utara)',
      regencies: [
        { code: '6175', name: 'Kabupaten Sambas' },
        { code: '6176', name: 'Kabupaten Bengkayang' },
        { code: '6177', name: 'Kota Singkawang' },
      ],
    },
    {
      code: 'KR3',
      name: 'Koord DPD Kalbar Region III (Hulu Kapuas)',
      regencies: [
        { code: '6178', name: 'Kabupaten Kapuas Hulu' },
      ],
    },
    {
      code: 'KR4',
      name: 'Koord DPD Kalbar Region IV (Selatan)',
      regencies: [
        { code: '6101', name: 'Kabupaten Ketapang' },
        { code: '6102', name: 'Kabupaten Melawi' },
        { code: '6103', name: 'Kabupaten Sintang' },
        { code: '6104', name: 'Kabupaten Sekadau' },
        { code: '6105', name: 'Kabupaten Sanggau' },
        { code: '6106', name: 'Kabupaten Tayan' },
      ],
    },
  ]

  const koorDpdMap: Record<string, string> = {}
  const regencyIds: Record<string, string> = {}
  for (const kr of koorDpdData) {
    const created = await db.territory.create({
      data: {
        code: kr.code,
        name: kr.name,
        level: 'COORD_DPD',
        category: 'DOMESTIC',
        parentId: kalbarId,
        isActive: true,
        metadata: JSON.stringify({ description: kr.name }),
      },
    })
    koorDpdMap[kr.code] = created.id

    // Buat regency (DPC) di bawah koordinator ini
    for (const reg of kr.regencies) {
      const regCreated = await db.territory.create({
        data: {
          code: reg.code,
          name: reg.name,
          level: 'REGENCY',
          category: 'DOMESTIC',
          parentId: created.id,
          isActive: true,
        },
      })
      regencyIds[reg.code] = regCreated.id
    }
  }

  // Untuk DPD luar negeri, buat 1 DPC contoh di DPD USA
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
  // 5. USERS - Admin awal (Development Mode)
  // ============================================================
  console.log('→ Creating users...')

  const devPassword = 'lapra08admin'

  const superadmin = await db.user.create({
    data: { username: 'superadmin', password: devPassword, fullName: 'Super Administrator Sistem', role: 'SUPERADMIN', territoryId: indonesia.id, isActive: true },
  })
  const adminDpn = await db.user.create({
    data: { username: 'dpn', password: devPassword, fullName: 'Admin DPN Pusat', role: 'ADMIN_DPN', territoryId: indonesia.id, isActive: true },
  })

  // 7 admin koorwil (1 untuk setiap wilayah)
  const koorwilUsers: Record<string, string> = {}
  for (const kw of koorwilData) {
    const username = `koorwil.${kw.code.toLowerCase()}`
    const user = await db.user.create({
      data: {
        username,
        password: devPassword,
        fullName: `Admin Koorwil ${kw.code} - ${kw.name.split('(')[1]?.replace(')', '') || kw.name}`,
        role: 'ADMIN_KOORWIL',
        territoryId: koorwilMap[kw.code],
        isActive: true,
      },
    })
    koorwilUsers[kw.code] = user.id
  }

  // Admin DPD Kalbar
  const adminDpdKalbar = await db.user.create({
    data: { username: 'dpd.kalbar', password: devPassword, fullName: 'Admin DPD Kalimantan Barat', role: 'ADMIN_DPD', territoryId: kalbarId, isActive: true },
  })

  // 4 admin koor_dpd Kalbar
  for (const kr of koorDpdData) {
    const username = `koor.${kr.code.toLowerCase()}`
    await db.user.create({
      data: {
        username,
        password: devPassword,
        fullName: `Admin Koord ${kr.code} - ${kr.name.split('(')[1]?.replace(')', '') || kr.name}`,
        role: 'ADMIN_KOOR_DPD',
        territoryId: koorDpdMap[kr.code],
        isActive: true,
      },
    })
  }

  // Admin DPC untuk 14 Kab/Kota Kalbar
  for (const kr of koorDpdData) {
    for (const reg of kr.regencies) {
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
  }

  // ============================================================
  // 6. MENU ITEMS - 10 Menu Utama (with new roles)
  // ============================================================
  console.log('→ Creating menus...')

  const menus = [
    { key: 'dashboard', label: 'Dasbor Utama', icon: 'LayoutDashboard', order: 1, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD,ADMIN_DPC' },
    { key: 'territory', label: 'Manajemen Wilayah', icon: 'Map', order: 2, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD' },
    { key: 'membership', label: 'Data Keanggotaan', icon: 'Users', order: 3, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD,ADMIN_DPC' },
    { key: 'organization', label: 'Struktur Pengurus & SK', icon: 'Building2', order: 4, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD,ADMIN_DPC' },
    { key: 'logistics', label: 'Logistik & Atribut', icon: 'Package', order: 5, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD,ADMIN_DPC' },
    { key: 'events', label: 'Event & Mobilisasi', icon: 'CalendarDays', order: 6, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD,ADMIN_DPC' },
    { key: 'communication', label: 'Komunikasi & Broadcast', icon: 'Megaphone', order: 7, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD,ADMIN_DPC' },
    { key: 'finance', label: 'Kas & Keuangan', icon: 'Wallet', order: 8, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD,ADMIN_DPC' },
    { key: 'users', label: 'Pengaturan User', icon: 'UserCog', order: 9, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD' },
    { key: 'help', label: 'Pusat Bantuan', icon: 'LifeBuoy', order: 10, roles: 'SUPERADMIN,ADMIN_DPN,ADMIN_KOORWIL,ADMIN_DPD,ADMIN_KOOR_DPD,ADMIN_DPC' },
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
  // 7. FORM FIELDS
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
  // 8. SECURITY SETTINGS
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
  // 9. SYSTEM SETTINGS
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
  // 10. SAMPLE DATA
  // ============================================================
  console.log('→ Creating sample members & data...')

  // Sample anggota DPN (format KTA: LAPRA08.ID.00.00.26.0000X)
  const dpnMembers = [
    { name: 'Dr. H. Bambang Sutejo, M.Si', nik: '3171010101900001', phone: '628111000001', profession: 'Ketua Umum DPN', gender: 'L' },
    { name: 'Prof. Dr. Siti Rahmawati, Ph.D', nik: '3171020202900002', phone: '628111000002', profession: 'Sekretaris Jenderal DPN', gender: 'P' },
    { name: 'H. Agus Setiawan, S.E., M.M', nik: '3171030303900003', phone: '628111000003', profession: 'Bendahara Umum DPN', gender: 'L' },
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

  // Sample anggota DPC Pontianak
  const pontianakId = regencyIds['6171']
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
    await db.member.create({
      data: {
        memberNumber: `LAPRA08.ID.61.71.26.${seq}`,
        fullName: m.name, nik: m.nik, phone: m.phone, shirtSize: m.size, profession: m.profession, gender: m.gender,
        territoryId: pontianakId, status: 'ACTIVE',
        registeredById: adminDpdKalbar.id, verifiedById: adminDpdKalbar.id,
        verifiedAt: new Date(), registeredAt: new Date(),
      },
    })
  }

  // Sample anggota DPC Sambas (untuk demo isolasi)
  const sambasId = regencyIds['6175']
  const sambasMembers = [
    { name: 'Hendra Wijaya', nik: '6101750101900001', phone: '6281234568001', size: 'L', gender: 'L' },
    { name: 'Maya Sari', nik: '6101750202900002', phone: '6281234568002', size: 'M', gender: 'P' },
    { name: 'Joko Susilo', nik: '6101750303900003', phone: '6281234568003', size: 'XL', gender: 'L' },
  ]
  for (let i = 0; i < sambasMembers.length; i++) {
    const m = sambasMembers[i]
    const seq = String(i + 1).padStart(5, '0')
    await db.member.create({
      data: {
        memberNumber: `LAPRA08.ID.61.75.26.${seq}`,
        fullName: m.name, nik: m.nik, phone: m.phone, shirtSize: m.size,
        territoryId: sambasId, status: 'ACTIVE',
        registeredById: adminDpdKalbar.id, verifiedById: adminDpdKalbar.id,
        verifiedAt: new Date(), registeredAt: new Date(),
      },
    })
  }

  // Sample pengurus DPN
  const dpnPositions = [
    { name: 'Dr. H. Bambang Sutejo, M.Si', position: 'Ketua Umum DPN', order: 1 },
    { name: 'Prof. Dr. Siti Rahmawati, Ph.D', position: 'Sekretaris Jenderal DPN', order: 2 },
    { name: 'H. Agus Setiawan, S.E., M.M', position: 'Bendahara Umum DPN', order: 3 },
  ]
  for (const p of dpnPositions) {
    await db.orgPosition.create({
      data: { fullName: p.name, positionName: p.position, level: 'DPN', territoryId: indonesia.id, phone: '6281110000' + String(p.order).padStart(2, '0'), isActive: true, order: p.order },
    })
  }

  // Sample pengurus Koorwil Kalimantan (KW3)
  await db.orgPosition.create({
    data: {
      fullName: 'Letjen (Purn) TNI Surya Pratama',
      positionName: 'Ketua Koorwil III Kalimantan',
      level: 'KOORWIL',
      territoryId: koorwilMap['KW3'],
      phone: '628133000001',
      isActive: true,
      order: 1,
    },
  })

  // Sample pengurus untuk semua Koorwil (KW1, KW2, KW4, KW5, KW6, KW7)
  const koorwilPengurus = [
    { kw: 'KW1', name: 'Mayor Jenderal TNI (Purn) Bambang Triwulan', phone: '628131000001' },
    { kw: 'KW2', name: 'Prof. Dr. H. Sutrisno, M.Si', phone: '628132000001' },
    { kw: 'KW4', name: 'Brigjen TNI (Purn) Andi Mappangara', phone: '628134000001' },
    { kw: 'KW5', name: 'Dr. Made Suryawan, S.E., M.M', phone: '628135000001' },
    { kw: 'KW6', name: 'Pdt. Yermias Rumbiak, M.Th', phone: '628136000001' },
    { kw: 'KW7', name: 'H. Ridwan Kamal, S.H., M.H', phone: '628137000001' },
  ]
  for (const k of koorwilPengurus) {
    await db.orgPosition.create({
      data: {
        fullName: k.name,
        positionName: `Ketua ${koorwilData.find((kw) => kw.code === k.kw)?.name || k.kw}`,
        level: 'KOORWIL',
        territoryId: koorwilMap[k.kw],
        phone: k.phone,
        isActive: true,
        order: 1,
      },
    })
  }

  // Sample pengurus DPD IKN (Ibu Kota Nusantara)
  const iknId = provinceMap['IKN']
  const iknPositions = [
    { name: 'Dr. H. Basuki Purnama', position: 'Ketua DPD IKN', order: 1 },
    { name: 'Ir. Hendra Wijaya, M.T', position: 'Wakil Ketua DPD IKN', order: 2 },
    { name: 'Siti Nurhaliza, S.E., M.M', position: 'Sekretaris DPD IKN', order: 3 },
    { name: 'Bambang Sutrisno, S.E', position: 'Bendahara DPD IKN', order: 4 },
  ]
  for (const p of iknPositions) {
    await db.orgPosition.create({
      data: {
        fullName: p.name,
        positionName: p.position,
        level: 'DPD',
        territoryId: iknId,
        phone: '6281280000' + String(p.order).padStart(2, '0'),
        isActive: true,
        order: p.order,
      },
    })
  }

  // Sample anggota DPD IKN (format KTA: LAPRA08.ID.IKN.00.26.0000X)
  for (let i = 0; i < 3; i++) {
    const seq = String(i + 1).padStart(5, '0')
    await db.member.create({
      data: {
        memberNumber: `LAPRA08.ID.IKN.00.26.${seq}`,
        fullName: ['H. Andi Wijaya', 'Dra. Maria Ulfa', 'Ir. Bambang Supono'][i],
        nik: '649901010190' + String(i + 1).padStart(4, '0'),
        phone: '62812800' + String(i + 1).padStart(4, '0'),
        profession: ['Pejabat Otorita IKN', 'Arsitek IKN', 'Kontraktor'][i],
        gender: i === 1 ? 'P' : 'L',
        territoryId: iknId,
        status: 'ACTIVE',
        registeredById: adminDpn.id,
        verifiedById: adminDpn.id,
        verifiedAt: new Date(),
        registeredAt: new Date(),
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
      data: { fullName: p.name, positionName: p.position, level: 'DPD', territoryId: kalbarId, phone: '6281220000' + String(p.order).padStart(2, '0'), isActive: true, order: p.order },
    })
  }

  // Sample pengurus Koor DPD Kalbar Region I (KR1)
  await db.orgPosition.create({
    data: {
      fullName: 'Drs. Hartono, M.Si',
      positionName: 'Koord DPD Kalbar Region I',
      level: 'KOOR_DPD',
      territoryId: koorDpdMap['KR1'],
      phone: '628124000001',
      isActive: true,
      order: 1,
    },
  })

  // Sample pengurus DPC Pontianak
  await db.orgPosition.create({
    data: {
      fullName: 'H. Suparman', positionName: 'Ketua DPC Kota Pontianak', level: 'DPC',
      territoryId: pontianakId, phone: '6281234560001', isActive: true, order: 1,
    },
  })

  // Sample asset
  await db.asset.create({
    data: { name: 'Kemeja Seragam Hitam', category: 'KEMEJA', stock: 500, unit: 'pcs', minStock: 50, territoryId: kalbarId },
  })
  await db.asset.create({
    data: { name: 'Bendera Merah Putih', category: 'BENDERA', stock: 100, unit: 'pcs', minStock: 10, territoryId: kalbarId },
  })

  // Sample pengumuman
  await db.announcement.create({
    data: {
      title: 'Selamat Datang di Sistem Informasi LAPRA 08',
      content: 'Sistem informasi internal LAPRA 08 telah aktif dengan struktur hierarki baru: DPN → Koorwil → DPD → Koor DPD → DPC. Silakan mulai pengisian data anggota di wilayah masing-masing.',
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

  console.log('\n✅ Seeding v2 completed!')
  console.log('\n📋 Struktur Hierarki:')
  console.log('   DPN (Indonesia)')
  console.log('   ├── Koorwil I (Sumatera) - 10 provinsi')
  console.log('   ├── Koorwil II (Jawa) - 6 provinsi')
  console.log('   ├── Koorwil III (Kalimantan) - 4 provinsi')
  console.log('   │   └── DPD Kalbar (61)')
  console.log('   │       ├── Koor DPD Region I (Pontianak Raya) - 4 DPC')
  console.log('   │       │   ├── DPC Kota Pontianak (71)')
  console.log('   │       │   ├── DPC Kab. Pontianak (72)')
  console.log('   │       │   ├── DPC Kab. Landak (73)')
  console.log('   │       │   └── DPC Kab. Mempawah (74)')
  console.log('   │       ├── Koor DPD Region II (Pesisir Utara) - 3 DPC')
  console.log('   │       │   ├── DPC Kab. Sambas (75)')
  console.log('   │       │   ├── DPC Kab. Bengkayang (76)')
  console.log('   │       │   └── DPC Kota Singkawang (77)')
  console.log('   │       ├── Koor DPD Region III (Hulu Kapuas) - 1 DPC')
  console.log('   │       │   └── DPC Kab. Kapuas Hulu (78)')
  console.log('   │       └── Koor DPD Region IV (Selatan) - 6 DPC')
  console.log('   │           ├── DPC Kab. Ketapang (01)')
  console.log('   │           ├── DPC Kab. Melawi (02)')
  console.log('   │           ├── DPC Kab. Sintang (03)')
  console.log('   │           ├── DPC Kab. Sekadau (04)')
  console.log('   │           ├── DPC Kab. Sanggau (05)')
  console.log('   │           └── DPC Kab. Tayan (06)')
  console.log('   ├── Koorwil IV (Sulawesi) - 6 provinsi')
  console.log('   ├── Koorwil V (Bali-Nusa) - 3 provinsi')
  console.log('   ├── Koorwil VI (Maluku-Papua) - 6 provinsi')
  console.log('   └── Koorwil VII (Luar Negeri) - DPD USA/CN/MY/SA/AU')
  console.log('\n📋 Login credentials (Development Mode):')
  console.log('   superadmin / lapra08admin (Super Admin)')
  console.log('   dpn / lapra08admin (Admin DPN Pusat)')
  console.log('   koorwil.kw1..kw7 / lapra08admin (7 Koorwil)')
  console.log('   dpd.kalbar / lapra08admin (DPD Kalbar)')
  console.log('   koor.kr1..kr4 / lapra08admin (4 Koor DPD Kalbar)')
  console.log('   dpc.71..dpc.06 / lapra08admin (14 DPC Kalbar)')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
