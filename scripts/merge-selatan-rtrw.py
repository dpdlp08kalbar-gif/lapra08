#!/usr/bin/env python3
"""
Merge RT/RW data from pontianak-selatan-rtrw.json into kalbar-territories.json
for the 4 kelurahan (besides BMD) in Pontianak Selatan:
  - Akcaya (617103001)
  - Benuamelayu Laut (617103003)
  - Kotabaru (617103004)
  - Parittokaya (617103005)

BMD (617103002) is already populated in kalbar-territories.json.
"""
import json
from pathlib import Path

PUBLIC = Path('/home/z/my-project/public')
KALBAR_PATH = PUBLIC / 'kalbar-territories.json'
RTRW_PATH = PUBLIC / 'pontianak-selatan-rtrw.json'

# Mapping kelurahan name -> code in kalbar-territories.json
KELURAHAN_MAP = {
    'AKCAYA': '617103001',
    'BENUA MELAYU LAUT': '617103003',
    'KOTA BARU': '617103004',
    'PARIT TOKAYA': '617103005',
    # BMD already populated, skip
    'BENUA MELAYU DARAT': '617103002',
}

def main():
    # Load source files
    with open(KALBAR_PATH, encoding='utf-8') as f:
        kalbar = json.load(f)
    with open(RTRW_PATH, encoding='utf-8') as f:
        rtrw = json.load(f)

    # Locate Pontianak Selatan (617103) kecamatan in kalbar
    pontianak = next((k for k in kalbar['kabKota'] if k['code'] == '6171'), None)
    if not pontianak:
        print('ERROR: Kota Pontianak (6171) not found')
        return

    selatan = next((k for k in pontianak['kecamatan'] if k['code'] == '617103'), None)
    if not selatan:
        print('ERROR: Kecamatan Pontianak Selatan (617103) not found')
        return

    print(f'Kecamatan {selatan["code"]} {selatan["name"]}: {len(selatan["desa"])} kelurahan')

    # For each kelurahan in selatan.desa, populate RW/RT if empty
    populated = 0
    for desa in selatan['desa']:
        code = desa['code']
        name = desa['name'].upper().strip()

        # Find matching key in rtrw
        rtrw_key = None
        for k in KELURAHAN_MAP:
            if KELURAHAN_MAP[k] == code:
                rtrw_key = k
                break

        if not rtrw_key or rtrw_key not in rtrw:
            print(f'  SKIP {code} {desa["name"]}: no RT/RW source')
            continue

        # Already has RW?
        if desa.get('rw') and len(desa['rw']) > 0:
            print(f'  SKIP {code} {desa["name"]}: already has {len(desa["rw"])} RW')
            continue

        # Build RW list with RT
        rw_list = []
        rtrw_data = rtrw[rtrw_key]  # dict: {'RW 001': ['RT 001', 'RT 002', ...], ...}
        for rw_name, rt_list in rtrw_data.items():
            # Extract RW number from name "RW 001"
            rw_num = rw_name.replace('RW', '').strip()
            rw_code = f'{code}_RW{rw_num}'
            rt_arr = []
            for rt_name in rt_list:
                rt_num = rt_name.replace('RT', '').strip()
                rt_code = f'{rw_code}_RT{rt_num}'
                rt_arr.append({
                    'code': rt_code,
                    'name': f'RT {rt_num}',
                    'level': 'RT',
                })
            rw_list.append({
                'code': rw_code,
                'name': f'RW {rw_num}',
                'level': 'RW',
                'rt': rt_arr,
            })

        desa['rw'] = rw_list
        rw_count = len(rw_list)
        rt_count = sum(len(rw['rt']) for rw in rw_list)
        print(f'  POPULATE {code} {desa["name"]}: {rw_count} RW, {rt_count} RT')
        populated += 1

    # Write back
    with open(KALBAR_PATH, 'w', encoding='utf-8') as f:
        json.dump(kalbar, f, ensure_ascii=False, indent=2)

    print(f'\nDone. Populated {populated} kelurahan.')
    print(f'File: {KALBAR_PATH}')

    # Verify
    with open(KALBAR_PATH, encoding='utf-8') as f:
        verify = json.load(f)
    pontianak = next((k for k in verify['kabKota'] if k['code'] == '6171'), None)
    selatan = next((k for k in pontianak['kecamatan'] if k['code'] == '617103'), None)
    print('\nVerification — Pontianak Selatan kelurahan:')
    for desa in selatan['desa']:
        rw_count = len(desa.get('rw', []))
        rt_count = sum(len(rw.get('rt', [])) for rw in desa.get('rw', []))
        print(f'  {desa["code"]} {desa["name"]}: {rw_count} RW, {rt_count} RT')

if __name__ == '__main__':
    main()
