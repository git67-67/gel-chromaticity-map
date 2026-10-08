#!/usr/bin/env python3
"""Draw the app icons (src/pwa/icons/*.png): the CIE spectral-locus horseshoe on a teal tile. Needs Pillow."""
import re
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
tab = re.search(r"const CMF_TAB=(\[\[.*?\]\]);", (ROOT / "src/js/core/grid-cmf.js").read_text(), re.S).group(1)
cmf = eval(tab)
pts = []
for x_, y_, z_ in cmf[20:321:4]:          # 400-700 nm
    s = x_ + y_ + z_
    pts.append((x_ / s, y_ / s))
S = 4  # supersampling

def draw(size, pad_frac, rounded):
    n = size * S
    im = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    bg = (11, 125, 138, 255)
    if rounded: d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * .22), fill=bg)
    else: d.rectangle([0, 0, n, n], fill=bg)
    lo_x, hi_x, lo_y, hi_y = 0.0, 0.75, 0.0, 0.85
    box = n * (1 - 2 * pad_frac)
    def P(x, y): return (n * pad_frac + (x - lo_x) / (hi_x - lo_x) * box, n * pad_frac + (1 - (y - lo_y) / (hi_y - lo_y)) * box)
    poly = [P(x, y) for x, y in pts]
    d.polygon(poly, fill=(255, 255, 255, 235))
    d.line(poly + [poly[0]], fill=(255, 255, 255, 255), width=max(2, n // 60), joint="curve")
    cx, cy = P(0.3127, 0.329); r = n * .045
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg)
    return im.resize((size, size), Image.LANCZOS)

out = ROOT / "src/pwa/icons"; out.mkdir(exist_ok=True)
draw(192, .16, True).save(out / "icon-192.png")
draw(512, .16, True).save(out / "icon-512.png")
draw(512, .26, False).save(out / "icon-maskable-512.png")      # full-bleed, extra padding for the safe zone
print("icons ->", out)
