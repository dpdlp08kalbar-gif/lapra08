// LAPRA 08 - Seed sekretariat locations directly into DB
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const locations = [
  { id: 'loc_dpn', name: 'Sekretariat DPN LAPRA 08', level: 'DPN', address: 'Jl. Medan Merdeka Barat No. 12, Gambir, Jakarta Pusat', city: 'Jakarta Pusat', province: 'DKI Jakarta', postalCode: '10110', phone: '+62 21 3456 7890', email: 'sekretariat@lapra08.id', lat: -6.1754, lng: 106.8272, hours: 'Senin-Jumat 08:00-17:00 WIB', mapUrl: 'https://www.google.com/maps?q=Medan+Merdeka+Barat+Jakarta' },
  { id: 'loc_kw3', name: 'Sekretariat Koorwil III Kalimantan', level: 'KOORWIL', address: 'Jl. Ahmad Yani No. 1, Banjarmasin', city: 'Banjarmasin', province: 'Kalimantan Selatan', postalCode: '70111', phone: '+62 511 234 5678', email: 'koorwil3@lapra08.id', lat: -3.3194, lng: 114.5908, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Banjarmasin' },
  { id: 'loc_dpd_kalbar', name: 'Sekretariat DPD Kalimantan Barat', level: 'DPD', address: 'Jl. Sisingamangaraja No. 5, Pontianak Kota', city: 'Pontianak', province: 'Kalimantan Barat', postalCode: '78111', phone: '+62 561 732 456', email: 'dpd.kalbar@lapra08.id', lat: -0.0263, lng: 109.3425, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Pontianak' },
  { id: 'loc_dpc_6171', name: 'Sekretariat DPC Pontianak Kota', level: 'DPC', address: 'Jl. Tanjungpura No. 22, Pontianak Kota', city: 'Pontianak', province: 'Kalimantan Barat', postalCode: '78112', phone: '+62 561 745 111', email: 'dpc.6171@lapra08.id', lat: -0.0193, lng: 109.3218, hours: 'Senin-Sabtu 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Jl+Tanjungpura+Pontianak' },
  { id: 'loc_dpc_6175', name: 'Sekretariat DPC Sambas', level: 'DPC', address: 'Jl. Sebatang No. 14, Sambas', city: 'Sambas', province: 'Kalimantan Barat', postalCode: '79453', phone: '+62 561 888 999', email: 'dpc.6175@lapra08.id', lat: 1.2867, lng: 109.3425, hours: 'Senin-Sabtu 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Sambas+Kalbar' },
  { id: 'loc_dpdbabel', name: 'Sekretariat DPD Bangka Belitung', level: 'DPD', address: 'Jl. Mayor Syafrie Rizal No. 7, Pangkalpinang', city: 'Pangkalpinang', province: 'Bangka Belitung', postalCode: '33121', phone: '+62 717 432 100', email: 'dpd.babel@lapra08.id', lat: -2.1290, lng: 106.1143, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Pangkalpinang' },
  { id: 'loc_kw1', name: 'Sekretariat Koorwil I Sumatera', level: 'KOORWIL', address: 'Jl. Jenderal Sudirman No. 100, Medan', city: 'Medan', province: 'Sumatera Utara', postalCode: '20151', phone: '+62 61 789 0123', email: 'koorwil1@lapra08.id', lat: 3.5952, lng: 98.6722, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Medan' },
  { id: 'loc_kw2', name: 'Sekretariat Koorwil II Jawa', level: 'KOORWIL', address: 'Jl. Pemuda No. 45, Semarang', city: 'Semarang', province: 'Jawa Tengah', postalCode: '50139', phone: '+62 24 354 6789', email: 'koorwil2@lapra08.id', lat: -6.9667, lng: 110.4167, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Semarang' },
  { id: 'loc_kw4', name: 'Sekretariat Koorwil IV Sulawesi', level: 'KOORWIL', address: 'Jl. Jenderal Sudirman No. 12, Makassar', city: 'Makassar', province: 'Sulawesi Selatan', postalCode: '90111', phone: '+62 411 876 5432', email: 'koorwil4@lapra08.id', lat: -5.1477, lng: 119.4327, hours: 'Senin-Jumat 08:00-16:00 WIB', mapUrl: 'https://www.google.com/maps?q=Makassar' },
  { id: 'loc_kw7', name: 'Sekretariat Koorwil VII Luar Negeri', level: 'KOORWIL', address: 'Indonesian Embassy, 2020 Massachusetts Ave NW, Washington DC, USA', city: 'Washington DC', province: 'USA', postalCode: '20036', phone: '+1 202 775 5300', email: 'koorwil7@lapra08.id', lat: 38.9101, lng: -77.0457, hours: 'Mon-Fri 09:00-17:00 EST', mapUrl: 'https://www.google.com/maps?q=Indonesian+Embassy+Washington+DC' },
];

(async () => {
  try {
    // Delete test entry first
    await prisma.systemSetting.deleteMany({ where: { category: 'SEKRETARIAT' } }).catch(() => {});
    let created = 0;
    for (const loc of locations) {
      const data = { ...loc, updatedAt: new Date().toISOString() };
      await prisma.systemSetting.upsert({
        where: { key: loc.id },
        update: { value: JSON.stringify(data), category: 'SEKRETARIAT' },
        create: {
          key: loc.id,
          value: JSON.stringify(data),
          category: 'SEKRETARIAT',
          description: `Sekretariat: ${loc.name}`,
        }
      });
      console.log(`✓ ${loc.id} | ${loc.level} | ${loc.name}`);
      created++;
    }
    console.log(`\nTotal: ${created} sekretariat locations seeded`);
  } catch(e) { console.error(e); process.exit(1); }
  finally { await prisma.$disconnect(); }
})();
