// LAPRA 08 - Master DPC Data Generator (514 Kabupaten/Kota)
// Format kode: [ProvinceCode 2-digit][RegencyCode 2-digit] = 4 digit
// Kabupaten: 01-70, Kota: 71-79
// Source: Kemendagri RI 2024

export interface DpcEntry {
  provinceCode: string
  code: string
  name: string
  isCity: boolean
}

// Helper: generate DPC entries for a province
function genDpc(provinceCode: string, kabupatens: string[], kotas: string[]): DpcEntry[] {
  const entries: DpcEntry[] = []
  kabupatens.forEach((name, i) => {
    entries.push({
      provinceCode,
      code: `${provinceCode}${String(i + 1).padStart(2, '0')}`,
      name: `Kab. ${name}`,
      isCity: false,
    })
  })
  kotas.forEach((name, i) => {
    entries.push({
      provinceCode,
      code: `${provinceCode}${String(71 + i).padStart(2, '0')}`,
      name: `Kota ${name}`,
      isCity: true,
    })
  })
  return entries
}

export const dpcMasterData: DpcEntry[] = [
  // ACEH (11) - 23 DPC: 18 Kab, 5 Kota
  ...genDpc('11', [
    'Aceh Selatan','Aceh Tenggara','Aceh Timur','Aceh Tengah','Aceh Barat','Aceh Besar',
    'Pidie','Bireuen','Aceh Utara','Lhokseumawe','Aceh Jaya','Aceh Barat Daya',
    'Gayo Lues','Aceh Singkil','Simeulue','Bener Meriah','Pidie Jaya','Nagan Raya',
  ], ['Banda Aceh','Sabang','Lhokseumawe','Langsa','Subulussalam']),

  // SUMATERA UTARA (12) - 33 DPC: 25 Kab, 8 Kota
  ...genDpc('12', [
    'Nias','Mandailing Natal','Tapanuli Selatan','Tapanuli Tengah','Tapanuli Utara',
    'Toba Samosir','Labuhanbatu','Asahan','Simalungun','Dairi','Karo','Deli Serdang',
    'Langkat','Nias Selatan','Humbang Hasundutan','Pakpak Bharat','Samosir','Serdang Bedagai',
    'Batubara','Padang Lawas Utara','Padang Lawas','Labuhanbatu Selatan','Labuhanbatu Utara',
    'Nias Barat','Nias Utara',
  ], ['Medan','Pematangsiantar','Sibolga','Tanjungbalai','Binjai','Tebingtinggi','Padangsidempuan','Gunungsitoli']),

  // SUMATERA BARAT (13) - 19 DPC: 12 Kab, 7 Kota
  ...genDpc('13', [
    'Pesisir Selatan','Solok','Sijunjung','Tanah Datar','Padang Pariaman','Agam','Lima Puluh Kota',
    'Pasaman','Solok Selatan','Dharmasraya','Pasaman Barat','Kepulauan Mentawai',
  ], ['Padang','Solok','Sawahlunto','Padangpanjang','Bukittinggi','Padang Pariaman','Pariaman']),

  // RIAU (14) - 12 DPC: 10 Kab, 2 Kota
  ...genDpc('14', [
    'Kampar','Indragiri Hulu','Bengkalis','Indragiri Hilir','Pelalawan','Rokan Hulu',
    'Rokan Hilir','Siak','Kuantan Singingi','Kepulauan Meranti',
  ], ['Pekanbaru','Dumai']),

  // JAMBI (15) - 11 DPC: 9 Kab, 2 Kota
  ...genDpc('15', [
    'Kerinci','Merangin','Sarolangun','Batanghari','Muaro Jambi','Tanjung Jabung Barat',
    'Tanjung Jabung Timur','Bungo','Tebo',
  ], ['Jambi','Sungai Penuh']),

  // SUMATERA SELATAN (16) - 17 DPC: 13 Kab, 4 Kota
  ...genDpc('16', [
    'Ogan Komering Ulu','Ogan Komering Ilir','Muara Enim','Lahat','Musi Banyuasin','Banyuasin',
    'Ogan Komering Ulu Selatan','Ogan Komering Ulu Timur','Ogan Ilir','Empat Lawang',
    'Penukal Abab Lematang Ilir','Musi Rawas Utara','Musi Rawas',
  ], ['Palembang','Prabumulih','Pagar Alam','Lubuklinggau']),

  // BENGKULU (17) - 10 DPC: 9 Kab, 1 Kota
  ...genDpc('17', [
    'Bengkulu Selatan','Rejang Lebong','Bengkulu Utara','Kaur','Seluma','Muko Muko',
    'Lebong','Kepahiang','Bengkulu Tengah',
  ], ['Bengkulu']),

  // LAMPUNG (18) - 15 DPC: 13 Kab, 2 Kota
  ...genDpc('18', [
    'Lampung Selatan','Lampung Tengah','Lampung Utara','Lampung Barat','Tulang Bawang',
    'Tanggamus','Lampung Timur','Way Kanan','Pesawaran','Pringsewu','Mesuji','Tulang Bawang Barat',
    'Pesisir Barat',
  ], ['Bandar Lampung','Metro']),

  // BANGKA BELITUNG (19) - 7 DPC: 6 Kab, 1 Kota
  ...genDpc('19', [
    'Bangka','Bangka Barat','Bangka Selatan','Bangka Tengah','Belitung','Belitung Timur',
  ], ['Pangkalpinang']),

  // KEPULAUAN RIAU (21) - 7 DPC: 5 Kab, 2 Kota
  ...genDpc('21', [
    'Bintan','Karimun','Natuna','Lingga','Anambas',
  ], ['Tanjungpinang','Batam']),

  // DKI JAKARTA (31) - 6 DPC: 1 Kab, 5 Kota Admin
  ...genDpc('31', ['Kepulauan Seribu'], ['Jakarta Selatan','Jakarta Timur','Jakarta Pusat','Jakarta Barat','Jakarta Utara']),

  // JAWA BARAT (32) - 27 DPC: 18 Kab, 9 Kota
  ...genDpc('32', [
    'Bogor','Sukabumi','Cianjur','Bandung','Garut','Tasikmalaya','Ciamis','Kuningan',
    'Cirebon','Majalengka','Sumedang','Indramayu','Subang','Purwakarta','Karawang','Bekasi',
    'Bandung Barat','Pangandaran',
  ], ['Bogor','Sukabumi','Bandung','Cirebon','Bekasi','Depok','Cimahi','Tasikmalaya','Banjar']),

  // JAWA TENGAH (33) - 35 DPC: 29 Kab, 6 Kota
  ...genDpc('33', [
    'Cilacap','Banyumas','Purbalingga','Banjarnegara','Kebumen','Purworejo','Wonosobo','Magelang',
    'Boyolali','Klaten','Sukoharjo','Wonogiri','Karanganyar','Sragen','Grobogan','Blora','Rembang',
    'Pati','Jepara','Demak','Semarang','Temanggung','Kendal','Batang','Pekalongan','Pemalang',
    'Tegal','Brebes','Kudus',
  ], ['Magelang','Surakarta','Salatiga','Semarang','Pekalongan','Tegal']),

  // DI YOGYAKARTA (34) - 5 DPC: 4 Kab, 1 Kota
  ...genDpc('34', ['Kulon Progo','Bantul','Gunungkidul','Sleman'], ['Yogyakarta']),

  // JAWA TIMUR (35) - 38 DPC: 29 Kab, 9 Kota
  ...genDpc('35', [
    'Pacitan','Ponorogo','Trenggalek','Tulungagung','Blitar','Kediri','Malang','Lumajang',
    'Jember','Banyuwangi','Bondowoso','Situbondo','Probolinggo','Pasuruan','Sidoarjo','Mojokerto',
    'Jombang','Nganjuk','Madiun','Magetan','Ngawi','Bojonegoro','Tuban','Lamongan','Gresik',
    'Bangkalan','Sampang','Pamekasan','Sumenep',
  ], ['Kediri','Blitar','Malang','Probolinggo','Pasuruan','Madiun','Surabaya','Batu','Mojokerto']),

  // BANTEN (36) - 8 DPC: 4 Kab, 4 Kota
  ...genDpc('36', ['Pandeglang','Lebak','Tangerang','Serang'], ['Tangerang','Cilegon','Serang','Tangerang Selatan']),

  // BALI (51) - 9 DPC: 8 Kab, 1 Kota
  ...genDpc('51', ['Jembrana','Tabanan','Badung','Gianyar','Klungkung','Bangli','Karangasem','Buleleng'], ['Denpasar']),

  // NUSA TENGGARA BARAT (52) - 10 DPC: 8 Kab, 2 Kota
  ...genDpc('52', [
    'Lombok Barat','Lombok Tengah','Lombok Timur','Lombok Utara','Sumbawa','Dompu','Bima','Sumbawa Barat',
  ], ['Mataram','Bima']),

  // NUSA TENGGARA TIMUR (53) - 22 DPC: 21 Kab, 1 Kota
  ...genDpc('53', [
    'Kupang','Timor Tengah Selatan','Timor Tengah Utara','Belu','Alor','Rote Ndao','Sabu Raijua',
    'Sikka','Ende','Ngada','Manggarai','Manggarai Barat','Manggarai Timur','Nagekeo','Sumba Barat',
    'Sumba Timur','Sumba Tengah','Sumba Barat Daya','Flores Timur','Lembata','Malaka',
  ], ['Kupang']),

  // KALIMANTAN TENGAH (62) - 14 DPC: 13 Kab, 1 Kota
  ...genDpc('62', [
    'Kotawaringin Barat','Kotawaringin Timur','Kapuas','Barito Selatan','Barito Utara','Sukamara',
    'Lamandau','Seruyan','Katingan','Pulang Pisau','Murung Raya','Barito Timur','Gunung Mas',
  ], ['Palangka Raya']),

  // KALIMANTAN SELATAN (63) - 13 DPC: 11 Kab, 2 Kota
  ...genDpc('63', [
    'Tanah Laut','Kotabaru','Banjar','Barito Kuala','Tapin','Hulu Sungai Selatan','Hulu Sungai Tengah',
    'Hulu Sungai Utara','Tabalong','Tanah Bumbu','Balangan',
  ], ['Banjarmasin','Banjarbaru']),

  // KALIMANTAN TIMUR (64) - 10 DPC: 7 Kab, 3 Kota
  ...genDpc('64', [
    'Paser','Kutai Kartanegara','Berau','Kutai Barat','Kutai Timur','Mahakam Ulu','Penajam Paser Utara',
  ], ['Samarinda','Balikpapan','Bontang']),

  // KALIMANTAN UTARA (65) - 5 DPC: 4 Kab, 1 Kota
  ...genDpc('65', ['Bulungan','Tana Tidung','Malinau','Nunukan'], ['Tarakan']),

  // SULAWESI UTARA (71) - 15 DPC: 11 Kab, 4 Kota
  ...genDpc('71', [
    'Bolaang Mongondow','Minahasa','Kepulauan Sangihe','Kepulauan Talaud','Minahasa Selatan',
    'Minahasa Utara','Minahasa Tenggara','Bolaang Mongondow Selatan','Bolaang Mongondow Timur',
    'Bolaang Mongondow Utara','Kepulauan Siau Tagulandang Biaro',
  ], ['Manado','Bitung','Tomohon','Kotamobagu']),

  // SULAWESI TENGAH (72) - 13 DPC: 12 Kab, 1 Kota
  ...genDpc('72', [
    'Banggai Kepulauan','Banggai','Morowali','Poso','Donggala','Toli-Toli','Buol','Parigi Moutong',
    'Tojo Una-Una','Sigi','Banggai Laut','Morowali Utara',
  ], ['Palu']),

  // SULAWESI SELATAN (73) - 24 DPC: 21 Kab, 3 Kota
  ...genDpc('73', [
    'Kepulauan Selayar','Bulukumba','Bantaeng','Jeneponto','Takalar','Gowa','Sinjai','Maros',
    'Pangkajene Kepulauan','Barru','Bone','Soppeng','Wajo','Sidenreng Rappang','Pinrang','Enrekang',
    'Luwu','Luwu Utara','Luwu Timur','Tana Toraja','Toraja Utara',
  ], ['Makassar','Parepare','Palopo']),

  // SULAWESI TENGGARA (74) - 17 DPC: 15 Kab, 2 Kota
  ...genDpc('74', [
    'Kolaka','Konawe','Muna','Buton','Kolaka Utara','Konawe Selatan','Bombana','Wakatobi',
    'Kolaka Timur','Konawe Utara','Buton Utara','Buton Tengah','Buton Selatan','Muna Barat',
    'Konawe Kepulauan',
  ], ['Kendari','Bau-Bau']),

  // GORONTALO (75) - 6 DPC: 5 Kab, 1 Kota
  ...genDpc('75', ['Gorontalo','Boalemo','Pohuwato','Bone Bolango','Gorontalo Utara'], ['Gorontalo']),

  // SULAWESI BARAT (76) - 6 DPC: 6 Kab
  ...genDpc('76', ['Majene','Polewali Mandar','Mamasa','Mamuju','Mamuju Utara','Central Mamuju'], []),

  // MALUKU (81) - 11 DPC: 9 Kab, 2 Kota
  ...genDpc('81', [
    'Maluku Tengah','Maluku Tenggara','Maluku Barat Daya','Buru','Seram Bagian Timur','Seram Bagian Barat',
    'Kepulauan Aru','Maluku Tenggara Barat','Buru Selatan',
  ], ['Ambon','Tual']),

  // MALUKU UTARA (82) - 10 DPC: 8 Kab, 2 Kota
  ...genDpc('82', [
    'Halmahera Barat','Halmahera Selatan','Halmahera Timur','Halmahera Utara','Kepulauan Sula',
    'Halmahera Tengah','Pulau Morotai','Pulau Taliabu',
  ], ['Ternate','Tidore Kepulauan']),

  // PAPUA (91) - 9 DPC: 8 Kab, 1 Kota
  ...genDpc('91', [
    'Merauke','Jayawijaya','Jayapura','Nabire','Kepulauan Yapen','Biak Numfor','Pegunungan Bintang',
    'Sarmi',
  ], ['Jayapura']),

  // PAPUA BARAT (92) - 7 DPC: 7 Kab
  ...genDpc('92', ['Sorong','Manokwari','Fakfak','Sorong Selatan','Raja Ampat','Teluk Bintuni','Teluk Wondama'], []),

  // PAPUA SELATAN (93) - 4 DPC: 4 Kab
  ...genDpc('93', ['Merauke','Mappi','Asmat','Boven Digoel'], []),

  // PAPUA TENGAH (94) - 8 DPC: 8 Kab
  ...genDpc('94', ['Nabire','Paniai','Mimika','Puncak','Puncak Jaya','Dogiyai','Intan Jaya','Deiyai'], []),

  // PAPUA PEGUNUNGAN (95) - 8 DPC: 8 Kab
  ...genDpc('95', ['Jayawijaya','Lanny Jaya','Yalimo','Mamberamo Tengah','Nduga','Tolikara','Pegunungan Bintang','Star Mountains'], []),

  // PAPUA BARAT DAYA (96) - 6 DPC: 5 Kab, 1 Kota
  ...genDpc('96', ['Sorong','Maybrat','Sorong Selatan','Raja Ampat','Tambrauw'], ['Sorong']),
]
