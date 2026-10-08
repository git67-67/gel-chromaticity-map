#!/usr/bin/env python3
"""Generate data/gels.json: ~100 synthetic example colour gels (NOT measurements, NOT any manufacturer's data).

Each gel is a smooth parametric transmission curve (band-pass, long-pass, short-pass, notch, colour-temperature
tilt, neutral density, diffusion). Names are generic descriptions. Deterministic: same output every run.

    python3 tools/make_example_gels.py            # writes data/gels.json
Format: {"w0":380,"s":5,"f":[[id,name,[percent per 5 nm, 380..780]], ...]}
"""
import json, math
from pathlib import Path

W = list(range(380, 781, 5))
sig = lambda x: 1 / (1 + math.exp(-x))
gel = []  # (name, fn)


def add(name, fn):
    gel.append((name, fn))


def band(c, w, tmax, edge=12):      # smooth band-pass, FWHM ~ w
    return lambda l: tmax * sig((l - (c - w / 2)) / edge) * sig(((c + w / 2) - l) / edge)


def longpass(c, tmax, edge=14):
    return lambda l: tmax * sig((l - c) / edge)


def shortpass(c, tmax, edge=14):
    return lambda l: tmax * sig((c - l) / edge)


def notch(c, w, depth, base=0.9, edge=12):
    return lambda l: base * (1 - depth * sig((l - (c - w / 2)) / edge) * sig(((c + w / 2) - l) / edge))


def tilt(k, tmax=0.85):             # colour-temperature style: log-transmission linear in wavelength
    return lambda l: tmax * math.exp(k * (l - 580) / 200)


def nd(t):
    return lambda l: t * (1 + 0.04 * (l - 580) / 200)


# saturated colours: (name, centre, width, tmax)
for nm, c, w, t in [("Deep Violet", 430, 50, .35), ("Royal Blue", 450, 55, .30), ("Deep Blue", 460, 60, .22),
                    ("Sky Blue", 470, 90, .55), ("Light Blue", 480, 140, .70), ("Cyan", 500, 90, .55),
                    ("Teal", 510, 70, .40), ("Blue Green", 520, 80, .45), ("Emerald", 530, 60, .35),
                    ("Primary Green", 535, 55, .45), ("Leaf Green", 545, 70, .50), ("Light Green", 550, 120, .70),
                    ("Lime", 565, 80, .70), ("Yellow Green", 570, 90, .72)]:
    add(nm, band(c, w, t))
for nm, c, t in [("Pale Yellow", 520, .88), ("Light Yellow", 510, .84), ("Medium Yellow", 525, .80), ("Deep Yellow", 535, .74),
                 ("Golden Yellow", 545, .70), ("Amber", 560, .72), ("Light Amber", 545, .80), ("Deep Amber", 575, .68),
                 ("Orange", 585, .72), ("Deep Orange", 595, .66), ("Fire Orange", 605, .66), ("Scarlet", 610, .70),
                 ("Light Red", 620, .72), ("Primary Red", 600, .64), ("Medium Red", 625, .66), ("Deep Red", 635, .55),
                 ("Dark Red", 650, .42)]:
    add(nm, longpass(c, t, 10 if t < .7 else 14))
for nm, c, t in [("Pale Cyan", 600, .80), ("Light Blue Tint", 580, .82), ("Ice Blue", 560, .78), ("Sea Blue", 540, .70),
                 ("Aqua", 560, .68), ("Medium Cyan", 575, .60)]:
    add(nm, shortpass(c, t, 25))
# pinks / magentas / lavenders: notch in green
for nm, c, w, d, b in [("Pale Pink", 540, 90, .20, .90), ("Light Pink", 545, 100, .35, .88), ("Rose", 545, 100, .55, .84),
                       ("Deep Rose", 545, 90, .75, .78), ("Hot Pink", 550, 90, .85, .76), ("Magenta", 550, 100, .93, .74),
                       ("Deep Magenta", 550, 110, .97, .66), ("Purple", 540, 130, .96, .55), ("Light Lavender", 560, 110, .25, .90),
                       ("Lavender", 560, 110, .45, .85), ("Orchid", 555, 110, .70, .78), ("Violet Pink", 545, 120, .85, .70),
                       ("Salmon", 490, 80, .40, .88), ("Peach", 480, 90, .30, .88), ("Coral", 500, 90, .55, .80),
                       ("Minus Green (light)", 545, 90, .30, .90), ("Minus Green (medium)", 545, 90, .55, .88),
                       ("Minus Green (deep)", 545, 90, .80, .86), ("Minus Red", 640, 110, .85, .85),
                       ("Minus Blue", 450, 80, .80, .85)]:
    add(nm, notch(c, w, d, b))
# colour temperature conversion
for i, k in enumerate([-1.6, -1.2, -0.8, -0.5, -0.25], 1):
    add(["Warm Correction Full", "Warm Correction ¾", "Warm Correction ½", "Warm Correction ¼", "Warm Correction ⅛"][i - 1], tilt(k, .78))
for i, k in enumerate([1.6, 1.2, .8, .5, .25]):
    add(["Cool Correction Full", "Cool Correction ¾", "Cool Correction ½", "Cool Correction ¼", "Cool Correction ⅛"][i], tilt(k, .62))
for nm, k in [("Straw Warm", -1.0), ("Sunset Warm", -2.0), ("Candle Warm", -2.6), ("Daylight Blue Tint", 1.0), ("Overcast Cool", 2.0), ("Moonlight Cool", 2.8)]:
    add(nm, tilt(k, .70))
# neutral density, with slight tint
for nm, t in [("Neutral Grey 0.15", .70), ("Neutral Grey 0.3", .50), ("Neutral Grey 0.6", .25), ("Neutral Grey 0.9", .125), ("Neutral Grey 1.2", .063), ("Neutral Grey 1.8", .016)]:
    add(nm, nd(t))
add("Warm Grey", lambda l: .35 * math.exp(-.35 * (l - 580) / 200))
add("Cool Grey", lambda l: .35 * math.exp(.35 * (l - 580) / 200))
# diffusion / frost: nearly clear, mild scatter loss at the blue end
for nm, t, k in [("Light Frost", .92, .15), ("Medium Frost", .85, .20), ("Heavy Frost", .72, .25), ("Opal Diffusion", .62, .30), ("Clear", .94, .0)]:
    add(nm, lambda l, t=t, k=k: t * math.exp(k * (l - 580) / 400))
# special: twin-band / dichroic-like
add("Dichroic Blue", lambda l: .85 * sig((500 - l) / 8) + .08)
add("Dichroic Amber", lambda l: .85 * sig((l - 565) / 8) + .05)
add("Dichroic Magenta", lambda l: .85 * (1 - sig((l - 505) / 8) * sig((585 - l) / 8)) + .02)
add("Dichroic Green", band(540, 70, .8, 7))
add("Dichroic Cyan", lambda l: .85 * sig((590 - l) / 8) + .05)
add("Twin Peak Blue-Red", lambda l: .6 * (math.exp(-((l - 450) / 25) ** 2) + math.exp(-((l - 640) / 30) ** 2)))
add("Twin Peak Green-Violet", lambda l: .55 * (math.exp(-((l - 420) / 25) ** 2) + math.exp(-((l - 540) / 28) ** 2)))
add("UV Block Clear", longpass(405, .92, 6))
add("Wide Cyan Green", band(510, 150, .65))
add("Wide Orange Yellow", band(600, 170, .75))
add("Violet Blue Long", band(445, 40, .45, 8))

rows = []
for i, (nm, fn) in enumerate(gel, 1):
    v = [round(max(0.0, min(1.0, fn(l))) * 100, 1) for l in W]
    rows.append([f"gel-{i:03d}", nm, v])
out = {"w0": 380, "s": 5, "f": rows}
p = Path(__file__).resolve().parent.parent / "data" / "gels.json"
p.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
print(len(rows), "gels ->", p)
