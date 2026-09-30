# Rebuild the concept-2 export from the chunked use_figma results in this session's transcript.
import json, re, sys
f = '/Users/parashchakmaria/.claude/projects/-Users-parashchakmaria-Desktop/056a163a-f0e4-498d-a72f-b17848890676.jsonl'
def texts(o):
    if isinstance(o, dict):
        for v in o.values(): yield from texts(v)
    elif isinstance(o, list):
        for v in o: yield from texts(v)
    elif isinstance(o, str): yield o
chunks, total = {}, None
for line in open(f):
    if 'C2CHUNK ' not in line: continue
    for t in texts(json.loads(line)):
        m = re.match(r'C2CHUNK (\d+)/(\d+) len=(\d+)', t)
        if not m or not t.endswith('|END'): continue
        i, total, ln = int(m[1]), int(m[2]), int(m[3])
        chunks[i] = t[t.index('|') + 1:-4]
missing = [i for i in range(total) if i not in chunks]
if missing: sys.exit(f'missing {missing}')
payload = ''.join(chunks[i] for i in range(total))
assert len(payload) == ln, (len(payload), ln)
json.dump(json.loads(payload), open('extraction/concept2-export.json', 'w'))
print('ok', ln)
