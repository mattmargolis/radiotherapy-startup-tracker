"""Merge existing companies.json with spreadsheet extract to produce final companies.json"""
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('C:/Users/mmarg/Documents/radiotherapy-startup-tracker/data/companies.json', 'r', encoding='utf-8') as f:
    existing = json.load(f)

with open('C:/Users/mmarg/Documents/radiotherapy-startup-tracker/data/spreadsheet_extract.json', 'r', encoding='utf-8') as f:
    spreadsheet = json.load(f)


def normalize(name):
    return name.lower().strip().replace(' ', '').replace('-', '').replace('_', '')


# Map existing companies by normalized name
existing_map = {}
for c in existing:
    existing_map[normalize(c['name'])] = c

# Aliases from spreadsheet name → existing name
name_aliases = {
    'cellectar': 'cellectar biosciences',
    'convergent': 'convergent therapeutics',
    'lantheus': 'lantheus holdings',
    'radiomedix': 'radiomedix',
    'rayzebio': 'rayzebio',
    'artbio': 'artbio',
    'curium': 'curium pharma',
    'itm': 'itm isotope technologies munich',
    'mariana oncology a novartis co': 'mariana oncology',
    'oranomed': 'orano med',
    'precirix': 'precirix',
    'clarity': 'clarity pharmaceuticals',
    'telix': 'telix pharmaceuticals',
    'aktis oncology': 'aktis oncology',
    'alpha-9 oncology': 'alpha-9 oncology',
    'perspective therapeutics': 'perspective therapeutics',
    'radionetics oncology': 'radionetics oncology',
    'ratio therapeutics': 'ratio therapeutics',
    'actithera': 'actithera',
}

# Region assignment for existing-only companies (not in spreadsheet)
existing_region = {
    'Nucleus RadioPharma': 'US-Canada',
    'Fusion Pharmaceuticals': 'US-Canada',
    'RefleXion Medical': 'US-Canada',
    'Mevion Medical Systems': 'US-Canada',
    'Alpha Tau Medical': 'EU-Middle East',
    'POINT Biopharma': 'US-Canada',
    'Accuray': 'US-Canada',
    'NorthStar Medical Radioisotopes': 'US-Canada',
    'IBA (Ion Beam Applications)': 'EU-Middle East',
    'Eckert & Ziegler': 'EU-Middle East',
}

# Stage advancement from spreadsheet (per plan)
stage_updates = {
    'convergent therapeutics': 'Clinical Phase I/II',
    'rayzebio': 'Clinical Phase III',
    'mariana oncology': 'Clinical Phase I',
    'perspective therapeutics': 'Clinical Phase I/II',
}

# Isotope normalization
def normalize_isotope(iso):
    mapping = {
        'AC-225': 'Ac-225',
        'ac-225': 'Ac-225',
        'LU-177': 'Lu-177',
        'lu-177': 'Lu-177',
        'PB-212': 'Pb-212',
        'pb-212': 'Pb-212',
        'I-131': 'I-131',
        'i-131': 'I-131',
        'I-125': 'I-125',
        'i-125': 'I-125',
        'AT-211': 'At-211',
        'at-211': 'At-211',
        'CU-67': 'Cu-67',
        'cu-67': 'Cu-67',
        'CU-64': 'Cu-64',
        'cu-64': 'Cu-64',
        'Y-90': 'Y-90',
        'y-90': 'Y-90',
        'GA-68': 'Ga-68',
        'ga-68': 'Ga-68',
        'F-18': 'F-18',
        'f-18': 'F-18',
        'ZR-89': 'Zr-89',
        'zr-89': 'Zr-89',
        'RA-224': 'Ra-224',
        'ra-224': 'Ra-224',
        'RE-188': 'Re-188',
        'TB-161': 'Tb-161',
        'SM-153': 'Sm-153',
        'SC-47': 'Sc-47',
    }
    return mapping.get(iso, iso)


# Build final list
final = []
matched_existing = set()
next_id = max(c['id'] for c in existing) + 1

for sc in spreadsheet:
    sc_norm = normalize(sc['name'])
    alias_key = sc['name'].lower().strip()
    target_norm = normalize(name_aliases.get(alias_key, sc['name']))

    # Check if this matches an existing company
    ex = existing_map.get(sc_norm) or existing_map.get(target_norm)

    if ex:
        # Merge: keep existing data, add new fields
        merged = dict(ex)
        matched_existing.add(normalize(ex['name']))

        # Add new fields
        merged['region'] = sc['region']
        merged['isotopes'] = sorted(list(set(
            [normalize_isotope(i) for i in sc.get('isotopes', [])]
        )))
        merged['targets'] = sc.get('targets', [])
        merged['moa'] = sc.get('moa')

        # Stage updates per plan
        ex_norm = normalize(ex['name'])
        if ex_norm in {normalize(k): k for k in stage_updates}:
            for k, v in stage_updates.items():
                if normalize(k) == ex_norm:
                    merged['stage'] = v
                    break

        final.append(merged)
    else:
        # New company from spreadsheet
        new = {
            'id': next_id,
            'name': sc['name'],
            'website': sc.get('website', ''),
            'hq': None,
            'founded': None,
            'description': None,
            'modality': 'Radioligand Therapy (RLT)',
            'technology': None,
            'indication': None,
            'stage': sc['stage'],
            'funding_stage': None,
            'total_funding_usd_m': None,
            'last_funding_date': None,
            'key_investors': [],
            'pipeline': sc.get('pipeline_raw', []),
            'partnerships': [],
            'notes': None,
            'source': sc.get('website', ''),
            'region': sc['region'],
            'isotopes': sorted(list(set([normalize_isotope(i) for i in sc.get('isotopes', [])]))),
            'targets': sc.get('targets', []),
            'moa': sc.get('moa'),
        }
        next_id += 1
        final.append(new)

# Add existing-only companies (not in spreadsheet)
for c in existing:
    cn = normalize(c['name'])
    if cn not in matched_existing:
        merged = dict(c)
        merged['region'] = existing_region.get(c['name'], 'US-Canada')
        # Derive isotopes/targets/moa from existing data where possible
        merged['isotopes'] = []
        merged['targets'] = []
        merged['moa'] = None

        # Extract isotopes from technology field
        tech = (c.get('technology') or '').lower()
        if 'ac-225' in tech or 'actinium-225' in tech:
            merged['isotopes'].append('Ac-225')
        if 'lu-177' in tech or 'lutetium-177' in tech:
            merged['isotopes'].append('Lu-177')
        if 'pb-212' in tech or 'lead-212' in tech:
            merged['isotopes'].append('Pb-212')
        if 'cu-67' in tech or 'copper-67' in tech:
            merged['isotopes'].append('Cu-67')
        if 'cu-64' in tech or 'copper-64' in tech:
            merged['isotopes'].append('Cu-64')
        if 'i-131' in tech or 'iodine-131' in tech:
            merged['isotopes'].append('I-131')
        if 'f-18' in tech:
            merged['isotopes'].append('F-18')
        if 'ga-68' in tech:
            merged['isotopes'].append('Ga-68')
        if 'zr-89' in tech:
            merged['isotopes'].append('Zr-89')
        if 'ra-224' in tech:
            merged['isotopes'].append('Ra-224')
        if 'y-90' in tech:
            merged['isotopes'].append('Y-90')
        if 'sm-153' in tech:
            merged['isotopes'].append('Sm-153')

        merged['isotopes'] = sorted(list(set(merged['isotopes'])))

        final.append(merged)

# Sort by name
final.sort(key=lambda c: c['name'].lower())

# Reassign IDs sequentially
for i, c in enumerate(final, 1):
    c['id'] = i

# Remove pipeline_raw if it snuck in
for c in final:
    c.pop('pipeline_raw', None)
    c.pop('best_phase_raw', None)

# Write output
with open('C:/Users/mmarg/Documents/radiotherapy-startup-tracker/data/companies.json', 'w', encoding='utf-8') as f:
    json.dump(final, f, indent=2, ensure_ascii=False)

print(f"Total companies: {len(final)}")
print(f"Existing merged: {len(matched_existing)}")
print(f"New from spreadsheet: {len(final) - len(existing)}")
