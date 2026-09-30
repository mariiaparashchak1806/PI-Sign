# Apply a Desktop Bridge dump {tree, icons, png} to the prototype and report what changed.
# usage: python3 scripts/sync.py <bridge-result.txt>
import json, sys, hashlib, re, base64
res = json.load(open(sys.argv[1]))['result']
old = json.load(open('src/figma/tree.json'))
def flat(n, out, hid=False):
    hid = hid or bool(n.get('hidden')); out[n['id']] = (n, hid)
    for k in n.get('k', []) or []: flat(k, out, hid)
    return out
O, N = flat(old, {}), flat(res['tree'], {})
vis = lambda d: {k for k, v in d.items() if not v[1]}
added, removed = sorted(vis(N) - vis(O)), sorted(vis(O) - vis(N))
KEYS = ['w','h','al','sz','fill','stroke','r','fx','txt','seg','op','ar','ta']
changed = []
for k in vis(N) & vis(O):
    a, b = O[k][0], N[k][0]
    d = [x for x in KEYS if json.dumps(a.get(x), sort_keys=True) != json.dumps(b.get(x), sort_keys=True)]
    if d and not (set(d) <= {'w','h'} and abs(a['w']-b['w']) < 1.5 and abs(a['h']-b['h']) < 1.5): changed.append((k, b['n'], d))
uniq, ref = {}, {}
for k, v in res['icons'].items():
    if not v or v.startswith('ERR'): continue
    v = re.sub(r'<\?xml[^>]*>\s*', '', v).strip(); h = hashlib.md5(v.encode()).hexdigest()[:10]; uniq[h] = v; ref[k] = h
json.dump(res['tree'], open('extraction/tree.json', 'w'))
json.dump(res['tree'], open('src/figma/tree.json', 'w'), separators=(',', ':'))
json.dump({'svg': uniq, 'ref': ref}, open('src/figma/icons.json', 'w'))
open('extraction/figma-lead-overview.png', 'wb').write(base64.b64decode(res['png']))
print(f"added {len(added)}, removed {len(removed)}, changed {len(changed)}; icons {len(ref)}")
for k in added[:30]: print('  +', k, N[k][0]['n'], repr(N[k][0].get('txt', ''))[:40])
for k in removed[:30]: print('  -', k, O[k][0]['n'], repr(O[k][0].get('txt', ''))[:40])
for c in changed[:30]: print('  ~', c)
