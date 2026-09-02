#!/usr/bin/env python3
"""
Robust parser untuk file wilayah Kalbar.
Handle multiple format:
- "1. Kecamatan X" / "Kecamatan X"
- "• Kelurahan Y" / "• Desa Y" / "1. Desa Y"
- "KABUPATEN X" / "Kota X"
"""

import re
import json

FILE = '/home/z/my-project/upload/Pasted Content_1788324899363.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')

KAB_KOTA_CODES = {
    'pontianak': ('6171', 'Kota Pontianak'),
    'kubu raya': ('6172', 'Kabupaten Kubu Raya'),
    'mempawah': ('6173', 'Kabupaten Mempawah'),
    'bengkayang': ('6174', 'Kabupaten Bengkayang'),
    'sambas': ('6175', 'Kabupaten Sambas'),
    'singkawang': ('6177', 'Kota Singkawang'),
    'landak': ('6101', 'Kabupaten Landak'),
    'ketapang': ('6103', 'Kabupaten Ketapang'),
    'sanggau': ('6104', 'Kabupaten Sanggau'),
    'sintang': ('6106', 'Kabupaten Sintang'),
    'kapuas hulu': ('6107', 'Kabupaten Kapuas Hulu'),
    'sekadau': ('6108', 'Kabupaten Sekadau'),
    'melawi': ('6109', 'Kabupaten Melawi'),
    'kayong utara': ('6110', 'Kabupaten Kayong Utara'),
}

# State
current_kab = None
current_kec = None
result = []
seen_kab = set()
kec_counter = 0
desa_counter = 0

for line in lines:
    line = line.strip()
    if not line:
        continue
    
    # Detect kab/kota
    lower = line.lower()
    for key, (code, name) in KAB_KOTA_CODES.items():
        if key in lower and code not in seen_kab:
            # Check if this line is a kab/kota header (not just mentioning it)
            if any(w in lower for w in ['terbagi', 'terdiri', 'pembagian', 'rincian', 'daftar lengkap', 'rincian pembagian']):
                current_kab = {'code': code, 'name': name, 'level': 'REGENCY', 'kecamatan': []}
                result.append(current_kab)
                seen_kab.add(code)
                kec_counter = 0
                break
            elif 'KABUPATEN' in line.upper() or 'KOTA' in line.upper():
                # Standalone header like "KABUPATEN BENGKAYANG"
                current_kab = {'code': code, 'name': name, 'level': 'REGENCY', 'kecamatan': []}
                result.append(current_kab)
                seen_kab.add(code)
                kec_counter = 0
                break
    
    # Detect kecamatan: "1. Kecamatan X" or "Kecamatan X" or "1. KECAMATAN X"
    kec_match = re.match(r'^\d+\.\s*(Kecamatan\s+.+)', line, re.IGNORECASE)
    if not kec_match:
        kec_match = re.match(r'^(Kecamatan\s+.+)', line, re.IGNORECASE)
    if not kec_match:
        kec_match = re.match(r'^\d+\.\s*(KECAMATAN\s+.+)', line)
    
    if kec_match and current_kab:
        kec_name = kec_match.group(1).strip()
        # Clean up
        kec_name = re.sub(r'\s*\(\d+\s*Desa\)', '', kec_name, flags=re.IGNORECASE)
        kec_name = re.sub(r'\s*\(\d+\s*Kelurahan\)', '', kec_name, flags=re.IGNORECASE)
        kec_name = kec_name.title().replace('Kecamatan', 'Kecamatan')
        kec_counter += 1
        current_kec = {
            'code': f"{current_kab['code']}{kec_counter:02d}",
            'name': kec_name,
            'level': 'DISTRICT',
            'desa': [],
        }
        current_kab['kecamatan'].append(current_kec)
        desa_counter = 0
    
    # Detect desa/kelurahan: "• Kelurahan X" or "• Desa X" or "1. Desa X"
    desa_match = re.match(r'^[•\-]\s*(Kelurahan|Desa)\s+(.+)', line, re.IGNORECASE)
    if not desa_match:
        desa_match = re.match(r'^\d+\.\s*(Kelurahan|Desa)\s+(.+)', line, re.IGNORECASE)
    
    if desa_match and current_kec:
        desa_type = desa_match.group(1).capitalize()
        desa_name = desa_match.group(2).strip().rstrip(' [')
        desa_counter += 1
        current_kec['desa'].append({
            'code': f"{current_kec['code']}{desa_counter:03d}",
            'name': f"{desa_type} {desa_name}",
            'type': desa_type.upper(),
            'level': 'VILLAGE',
        })

# Print summary
print(f"Kabupaten/Kota: {len(result)}")
total_kec = sum(len(k['kecamatan']) for k in result)
total_desa = sum(len(kec['desa']) for k in result for kec in k['kecamatan'])
print(f"Kecamatan: {total_kec}")
print(f"Desa/Kelurahan: {total_desa}")
print()
for k in result:
    kec_count = len(k['kecamatan'])
    desa_count = sum(len(kec['desa']) for kec in k['kecamatan'])
    print(f"  {k['name']} ({k['code']}): {kec_count} kec, {desa_count} desa/kel")

# Save JSON
OUTPUT = '/home/z/my-project/upload/kalbar-territories.json'
with open(OUTPUT, 'w', encoding='utf-8') as f:
    json.dump({'province': {'code': '61', 'name': 'Kalimantan Barat'}, 'kabKota': result}, f, ensure_ascii=False, indent=2)
print(f"\nSaved to: {OUTPUT}")
print(f"Total entries: {1 + len(result) + total_kec + total_desa}")
