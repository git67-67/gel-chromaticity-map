#!/usr/bin/env python3
"""Write data/colorchecker.json: ColorChecker 24-patch reflectance (Ohta, 380-780 nm, 5 nm) from colour-science.
    pip install colour-science && python3 tools/gen_colorchecker.py
Format: {"w0":380,"s":5,"f":[[id,name,[percent...]],...]}"""
import json, re
from pathlib import Path
import colour
sd = colour.SDS_COLOURCHECKERS["ColorChecker N Ohta"]
rows = []
for i, (k, s) in enumerate(sd.items(), 1):
    s = s.copy().align(colour.SpectralShape(380, 780, 5))
    rows.append([f"cc-{i:02d}", f"{i}. {k.title()}", [round(float(x) * 100, 2) for x in s.values]])
p = Path(__file__).resolve().parent.parent / "data" / "colorchecker.json"
p.write_text(json.dumps({"w0": 380, "s": 5, "f": rows}, separators=(",", ":")))
print(len(rows), "patches ->", p)
