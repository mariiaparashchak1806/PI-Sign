# Build src/figma/tree-c1o2.json — Concept 1 · Option 2 (Figma 184:3568) from extraction/c1-option2-export.json.
# Shared widgets get the ids of the same widgets in Concept 1 (tree.json, Figma 19:973) through a
# name-matched walk, so every existing handler applies; new blocks keep their Figma ids. New icons are merged.
import json, hashlib, re
exp = json.load(open('extraction/c1-option2-export.json'))
c1 = json.load(open('src/figma/tree.json'))
def index(n, out):
    out[n['id']] = n
    for k in n.get('k') or []: index(k, out)
    return out
C1 = index(c1, {})
tree = exp['tree']; C2 = index(tree, {})
mapped = {}
def walk(a, b, depth=99):
    mapped[a['id']] = b['id']; a['id'] = b['id']
    if depth == 0: return
    pool = list(b.get('k') or [])
    for k in a.get('k') or []:
        j = next((i for i, x in enumerate(pool) if x['n'] == k['n'] and x['t'] == k['t']), None)
        if j is None: continue
        walk(k, pool.pop(j), depth - 1)
PAIRS = [
    ('184:3568', '19:973', 0), ('184:3569', '19:974', 99), ('184:6761', '19:1099', 0), ('184:6752', '19:1070', 99),
    ('184:6763', '19:1100', 99), ('184:6968', '19:1210', 99), ('184:6989', '19:1231', 0), ('184:6990', '19:1232', 0), ('184:7399', '19:1233', 0),
    # left column is a component since Oct 1 (226:16901): Project Details / Agenda / Activity instances
    ('226:16902', '42:10511', 99), ('226:16903', '42:10916', 99), ('226:16904', '93:4854', 99),
    ('184:7400', '179:2999', 99), ('184:7427', '93:7184', 99), ('184:7467', '72:8984', 99),
    ('206:5973', '85:5281', 99), ('206:5986', '85:5353', 99), ('206:5995', '85:5385', 99),
]
for a, b, d in PAIRS:
    if a in C2 and b in C1: walk(C2[a], C1[b], d)
    else: print('skip', a, b)
json.dump(tree, open('src/figma/tree-c1o2.json', 'w'), separators=(',', ':'))
icons = json.load(open('src/figma/icons.json')); added = 0
for k, v in exp['icons'].items():
    if not v or v in ('ERR', 'HIDDEN'): continue
    kid = mapped.get(k, k)
    if kid in icons['ref']: continue
    v = re.sub(r'<\?xml[^>]*>\s*', '', v).strip(); h = hashlib.md5(v.encode()).hexdigest()[:10]
    icons['svg'][h] = v; icons['ref'][kid] = h; added += 1
json.dump(icons, open('src/figma/icons.json', 'w'))
print('mapped', len(mapped), 'icons added', added)
