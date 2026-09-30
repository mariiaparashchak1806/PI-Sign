# Pull a Figma payload "<len>|<json>" out of this session's transcript (tool results < 20 KB aren't saved to disk).
import json, sys
f = '/Users/parashchakmaria/.claude/projects/-Users-parashchakmaria-Desktop/056a163a-f0e4-498d-a72f-b17848890676.jsonl'
marker, out = sys.argv[1], sys.argv[2]   # e.g. '"id":"109:3765"'  extraction/x.json
def texts(o):
    if isinstance(o, dict):
        for v in o.values(): yield from texts(v)
    elif isinstance(o, list):
        for v in o: yield from texts(v)
    elif isinstance(o, str): yield o
best = None
for line in open(f):
    if '|{' not in line: continue
    for t in texts(json.loads(line)):
        if marker in t and '|{' in t:
            j = t[t.index('|{') + 1:]
            try: best = json.loads(j[: j.rindex('}') + 1])
            except Exception as e: pass
if best is None: sys.exit('not found')
json.dump(best, open(out, 'w')); print('saved', best['id'], best['n'])
