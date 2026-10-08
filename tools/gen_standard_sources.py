#!/usr/bin/env python3
"""Export the CIE standard illuminants used as built-in light sources into data/standard-sources.json
(380-780 nm, 5 nm, relative values, peak 1). Dev tool: pip install colour-science && python3 tools/gen_standard_sources.py"""
import json, colour, numpy as np
from colour import SpectralShape, SDS_ILLUMINANTS
from pathlib import Path
shape = SpectralShape(380, 780, 5)
groups = [
  ('CIE LED series', ['LED-B1','LED-B2','LED-B3','LED-B4','LED-B5','LED-BH1','LED-RGB1','LED-V1','LED-V2'], lambda n: n),
  ('CIE F series (fluorescent)', [f'FL{i}' for i in range(1, 13)], lambda n: 'F' + n[2:]),
  ('CIE FL3.x (fluorescent, extended)', [f'FL3.{i}' for i in range(1, 16)], lambda n: 'F' + n[2:]),
  ('CIE standard illuminants', ['A', 'D65'], lambda n: n),
]
out = []
for g, names, label in groups:
    for n in names:
        if n not in SDS_ILLUMINANTS: continue
        v = SDS_ILLUMINANTS[n].copy().align(shape).values; v = v / v.max()
        out.append({'id': 'std:' + n, 'name': label(n), 'group': g, 'spd5': [round(float(x), 5) for x in v]})
Path(__file__).resolve().parent.parent.joinpath('data', 'standard-sources.json').write_text(json.dumps(out, separators=(',', ':')))
print(len(out), 'sources')
