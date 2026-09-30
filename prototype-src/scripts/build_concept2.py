# Build src/figma/tree2.json (concept 2, Figma 124:1753) from extraction/concept2-export.json.
# - {ref: <c1 id>} placeholders become copies of the concept-1 subtree (same ids → same handlers)
# - widgets that exist in both concepts get concept-1 ids by a name-matched parallel walk
# - new icons are merged into src/figma/icons.json
import json, copy, hashlib, re
exp = json.load(open('extraction/concept2-export.json'))
c1 = json.load(open('src/figma/tree.json'))
def index(n, out):
    out[n['id']] = n
    for k in n.get('k') or []: index(k, out)
    return out
C1 = index(c1, {})
def deref(n):
    if 'ref' in n:
        m = copy.deepcopy(C1[n['ref']]); m['x'], m['y'] = n['x'], n['y']; return m
    if n.get('k'): n['k'] = [deref(k) for k in n['k']]
    return n
tree = deref(exp['tree'])
C2 = index(tree, {})

mapped = {}
def walk(a, b, depth=99):
    """give c2 node `a` (and matching descendants) the id of c1 node `b`"""
    mapped[a['id']] = b['id']; a['id'] = b['id']
    if depth == 0: return
    pool = list(b.get('k') or [])
    for k in a.get('k') or []:
        j = next((i for i, x in enumerate(pool) if x['n'] == k['n'] and x['t'] == k['t']), None)
        if j is None: continue
        walk(k, pool.pop(j), depth - 1)

PAIRS = [  # (c2, c1, depth)
    ('124:1753', '19:973', 0), ('124:1754', '19:974', 99), ('124:2627', '19:1099', 0), ('124:2618', '19:1070', 0),
    ('124:2619', '19:1071', 99), ('124:3395', '19:1100', 99), ('132:1828', '19:1210', 99),
    ('124:2986', '19:1231', 0),            # right column = tab content area in concept 2
    ('124:2988', '93:8342', 99), ('124:3006', '93:8360', 99), ('124:3021', '93:8375', 99), ('124:3072', '42:10752', 99),
    ('132:1850', '42:10684', 99), ('124:2987', '42:10511', 0),
    ('124:3450', '93:4854', 1), ('124:3451', '93:4855', 99), ('124:3456', '93:5083', 0),
    ('124:3637', '72:8984', 99), ('124:3664', '72:9002', 99),
    ('124:3706', '93:7184', 0), ('124:3707', '93:7185', 99),
]
for a, b, d in PAIRS:
    if a in C2 and b in C1: walk(C2[a], C1[b], d)
    else: print('skip pair', a, b)
json.dump(tree, open('src/figma/tree2.json', 'w'), separators=(',', ':'))

icons = json.load(open('src/figma/icons.json'))
added = 0
for k, v in exp['icons'].items():
    if not v or v in ('ERR', 'HIDDEN'): continue
    kid = mapped.get(k, k)
    if kid in icons['ref']: continue
    v = re.sub(r'<\?xml[^>]*>\s*', '', v).strip(); h = hashlib.md5(v.encode()).hexdigest()[:10]
    icons['svg'][h] = v; icons['ref'][kid] = h; added += 1
json.dump(icons, open('src/figma/icons.json', 'w'))
print('mapped', len(mapped), 'icons added', added, 'refs', exp['refs'])
