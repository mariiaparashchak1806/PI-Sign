# side-by-side crop: figma | render | diff   usage: python3 scripts/crop.py x y w h out.png
import sys
from PIL import Image
x,y,w,h = map(int, sys.argv[1:5]); out = sys.argv[5]
ims = [Image.open(p).crop((x,y,x+w,y+h)) for p in ['extraction/figma-lead-overview.png','extraction/diff-render.png','extraction/diff-diff.png']]
W = Image.new('RGB', (w*3+20, h), 'white')
for i,im in enumerate(ims): W.paste(im, (i*(w+10), 0))
W.save(out)
