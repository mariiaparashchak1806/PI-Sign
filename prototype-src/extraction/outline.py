import json, sys
T = json.load(open('extraction/tree.json'))
idx = {}
def reg(n):
    idx[n['id']] = n
    for k in n.get('k', []) or []: reg(k)
reg(T)
def fmt(n):
    s = f"{n['n']} <{n['t'][:4]}> {n['w']}x{n['h']}"
    if n.get('hidden'): return s + ' HIDDEN'
    if n.get('al'): a=n['al']; s += f" [{a['m'][0]} g{a['gap']} p{a['p']} {a['pa'][:3]}/{a['ca'][:3]}{' wrap' if a['wrap']=='WRAP' else ''}]"
    if n.get('sz'): s += f" sz:{n['sz'][0][:2]}/{n['sz'][1][:2]}"
    if n.get('abs'): s += f" ABS@{n['x']},{n['y']}"
    if n.get('fill'): s += f" bg{n['fill']}"
    if n.get('stroke'): st=n['stroke']; s += f" bd{st['c']}w{st['w']}"
    if n.get('r'): s += f" r{n['r']}"
    if n.get('fx'): s += f" fx{[(e['t'][:4],e['x'],e['y'],e['b'],e['c']) for e in n['fx']]}"
    if n.get('op'): s += f" op{n['op']}"
    if n.get('comp'): s += f" ={n['comp'][:70]}"
    if n.get('icon'): s += " ICON"
    if n.get('txt') is not None:
        segs = ';'.join(f"{g['f'].replace('Poppins ','P')}/{g['s']}/{g['lh']}/{g['c']}{'/'+g['d'] if g.get('d') else ''}" for g in n['seg'])
        s += f' "{n["txt"][:70]}" {segs} {n["ta"][:1]} {n["ar"]}'
    return s
def out(n, d=0, maxd=99, maxk=99, parent=None):
    pos = f" @{n['x']},{n['y']}" if parent is not None and not parent.get('al') else ''
    print('  '*d + fmt(n) + pos)
    if d >= maxd: return
    ks = n.get('k', []) or []
    for i,k in enumerate(ks):
        if i >= maxk: print('  '*(d+1) + f'... +{len(ks)-maxk} more'); break
        out(k, d+1, maxd, maxk, n)
for arg in sys.argv[1:]:
    nid, _, rest = arg.partition(':d')
    nid = nid.replace('-',':')
    md = int(rest.split(':')[0]) if rest else 99
    mk = int(rest.split(':k')[1]) if ':k' in rest else 99
    out(idx[nid], 0, md, mk)
