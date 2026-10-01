# Rebuild src/figma/tree.json — Concept 1 · Option 1 (Figma 19:973) from extraction/c1o1-export.json.
# Re-created / moved nodes get their previous ids back by a name-matched walk against the last tree
# (extraction/tree-c1o1-before.json), so every handler keeps working. The shared Project Details / Agenda
# instances can be pinned to an older version through KEEP (empty = as drawn).
import json, copy, hashlib, re
exp = json.load(open('extraction/c1o1-export.json'))
old = json.load(open('extraction/tree-c1o1-before.json'))
o2 = json.load(open('extraction/c1-option2-export.json'))
def index(n, out):
    out[n['id']] = n
    for k in n.get('k') or []: index(k, out)
    return out
O, O2 = index(old, {}), index(o2['tree'], {})
tree = exp['tree']
# keep the last complete tables (same shared components as Option 2)
KEEP = {}  # tables fixed in Figma (Oct 1) → use them as drawn; fill in name → Option 2 id to keep an older version
def keep(n):
    for i, k in enumerate(n.get('k') or []):
        if k['t'] == 'INSTANCE' and k['n'] in KEEP: n['k'][i] = copy.deepcopy(O2[KEEP[k['n']]])
        else: keep(k)
keep(tree)
N = index(tree, {})
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
left = next(k for k in N['19:1231']['k'] if k['n'] == 'Left column')
inst = {k['n']: k for k in left['k']} if left.get('k') else {}
PAIRS = [('222:12601', '19:1100'), ('222:12600', '19:1070')]
for name, cid in (('Project Details — Filled', '42:10511'), ('Agenda', '42:10916'), ('Activity', '93:4854')):
    n = next((k for k in left['k'] if k['n'] == name), None)
    if n: PAIRS.append((n['id'], cid))
for a, b in PAIRS:
    if a in N and b in O: walk(N[a], O[b])
    else: print('skip', a, b)
walk(tree, old)  # everything else that kept its name/structure
json.dump(tree, open('src/figma/tree.json', 'w'), separators=(',', ':'))
icons = json.load(open('src/figma/icons.json')); added = 0
src_icons = {**o2.get('icons', {}), **exp.get('icons', {})}
for k, v in src_icons.items():
    if not v or v in ('ERR', 'HIDDEN'): continue
    kid = mapped.get(k, k)
    if kid in icons['ref']: continue
    v = re.sub(r'<\?xml[^>]*>\s*', '', v).strip(); h = hashlib.md5(v.encode()).hexdigest()[:10]
    icons['svg'][h] = v; icons['ref'][kid] = h; added += 1
json.dump(icons, open('src/figma/icons.json', 'w'))
print('pairs', PAIRS, 'mapped', len(mapped), 'icons added', added)
