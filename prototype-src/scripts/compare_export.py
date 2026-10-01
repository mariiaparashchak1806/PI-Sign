# Compare a fresh Bridge dump {tree, icons, png} of a frame with the last saved export.
# usage: python3 scripts/compare_export.py <dump.txt> <last-export.json> <last.png> <new-export.json> <new.png>
import json, base64, io, sys
from PIL import Image, ImageChops
dump, last, lastpng, newjson, newpng = sys.argv[1:6]
raw = json.load(open(dump)); res = raw.get('result', raw)
old = json.load(open(last))
def flat(n, out, hid=False):
    hid = hid or bool(n.get('hidden')); out[n['id']] = (n, hid)
    for k in n.get('k') or []: flat(k, out, hid)
    return out
O, N = flat(old['tree'], {}), flat(res['tree'], {})
vis = lambda d: {k for k, v in d.items() if not v[1]}
add, rem = sorted(vis(N) - vis(O)), sorted(vis(O) - vis(N))
KEYS = ['w', 'h', 'al', 'sz', 'fill', 'stroke', 'r', 'fx', 'txt', 'seg', 'op', 'ar', 'ta']
ch = []
for k in vis(N) & vis(O):
    a, b = O[k][0], N[k][0]
    d = [x for x in KEYS if json.dumps(a.get(x), sort_keys=True) != json.dumps(b.get(x), sort_keys=True)]
    if d and not (set(d) <= {'w', 'h'} and abs(a['w'] - b['w']) < 1.5 and abs(a['h'] - b['h']) < 1.5): ch.append((k, b['n'], d, (a.get('txt'), b.get('txt')) if 'txt' in d else ''))
print('added', len(add), 'removed', len(rem), 'changed', len(ch))
for k in add[:40]: print(' +', k, N[k][0]['n'], repr(N[k][0].get('txt', ''))[:60])
for k in rem[:40]: print(' -', k, O[k][0]['n'], repr(O[k][0].get('txt', ''))[:60])
for c in ch[:60]: print(' ~', c)
img = Image.open(io.BytesIO(base64.b64decode(res['png']))).convert('RGB'); prev = Image.open(lastpng).convert('RGB')
print('png', img.size, 'prev', prev.size, 'diff bbox', ImageChops.difference(img, prev).getbbox() if img.size == prev.size else 'size differs')
json.dump(res, open(newjson, 'w')); img.save(newpng)
