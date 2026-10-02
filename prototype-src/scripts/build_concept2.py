# Build src/figma/tree2.json — Concept 2 (Figma 124:1753) from the Bridge dump extraction/concept2-export.json.
# Widgets shared with Concept 1 get the ids of the same widgets in src/figma/tree.json (Option 1, Figma 19:973)
# through a name-matched walk, so every existing handler applies; concept-2-only nodes keep their Figma ids.
import json, hashlib, re
exp = json.load(open('extraction/concept2-export.json'))
c1 = json.load(open('src/figma/tree.json'))
def index(n, out):
    out[n['id']] = n
    for k in n.get('k') or []: index(k, out)
    return out
C1 = index(c1, {}); tree = exp['tree']; C2 = index(tree, {})
used, mapped = set(), {}
def walk(a, b, depth=99):
    if b['id'] in used: return
    used.add(b['id']); mapped[a['id']] = b['id']; a['id'] = b['id']
    if depth == 0: return
    pool = [x for x in (b.get('k') or []) if x['id'] not in used]
    for k in a.get('k') or []:
        j = next((i for i, x in enumerate(pool) if x['n'] == k['n'] and x['t'] == k['t']), None)
        if j is None: continue
        walk(k, pool.pop(j), depth - 1)
right = C2['124:2986']
by = lambda name: next((k['id'] for k in right['k'] if k['n'].startswith(name)), None)
pd = next((k['id'] for k in right['k'] if k['t'] == 'INSTANCE' and k['n'].startswith('Project Details')), None)
sd = next((n['id'] for n in C2.values() if n['n'].startswith('Signed documents widget') and not n.get('hidden')), None)
PAIRS = [  # (c2, c1, depth) — Oct 2 frame: tabs moved into the right column, Messages widget + Activity under the cards
    ('124:1753', '19:973', 0), ('124:1754', '19:974', 99), ('124:2627', '19:1099', 0), ('124:2618', '19:1070', 99),
    ('124:3395', '19:1100', 99), (by('Tabs') or '132:1828', '19:1210', 99), ('124:2986', '19:1231', 0),   # right column = tab content area
    (pd, '42:10511', 99), (by('Agenda'), '42:10916', 99), (by('Activity'), '93:4854', 99),
    (sd, '179:2999', 99), ('124:3707', '93:7185', 99), ('124:3706', '93:7184', 0),  # Messages: own frame since Oct 2 (334:11136) → handled by its ids
]
for a, b, d in PAIRS:
    if a in C2 and b in C1: walk(C2[a], C1[b], d)
    else: print('skip', a, b)
json.dump(tree, open('src/figma/tree2.json', 'w'), separators=(',', ':'))
icons = json.load(open('src/figma/icons.json')); added = 0
for k, v in exp.get('icons', {}).items():
    if not v or v in ('ERR', 'HIDDEN'): continue
    kid = mapped.get(k, k)
    if kid in icons['ref']: continue
    v = re.sub(r'<\?xml[^>]*>\s*', '', v).strip(); h = hashlib.md5(v.encode()).hexdigest()[:10]
    icons['svg'][h] = v; icons['ref'][kid] = h; added += 1
json.dump(icons, open('src/figma/icons.json', 'w'))
miss = []
def w(n, hid=False):
    hid = hid or n.get('hidden')
    if n.get('icon') and not hid and n['id'] not in icons['ref']: miss.append(n['id'])
    for k in n.get('k') or []: w(k, hid)
w(tree)
print('mapped', len(mapped), 'icons added', added, 'missing icons', len(miss))
json.dump({'missing': miss, 'back': {v: k for k, v in mapped.items()}}, open('extraction/concept2-missing-icons.json', 'w'))
