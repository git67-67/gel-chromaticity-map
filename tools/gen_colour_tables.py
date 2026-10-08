#!/usr/bin/env python3
"""Export the colour-science tables the CRI / TM-30 modules need into data/colour-tables.json.

    pip install colour-science && python3 tools/gen_colour_tables.py

All tables are on the 380-780 nm, 5 nm grid (81 values). Only needed when the tables change; the JSON is committed."""
import json, numpy as np, colour
from colour.quality.cfi2017 import load_TCS_CIE2017
from colour import SpectralShape, SDS_ILLUMINANTS
from pathlib import Path

shape = SpectralShape(380, 780, 5)
r = lambda a, n=6: [round(float(x), n) for x in a]

ces = load_TCS_CIE2017(shape)
cmf10 = colour.MSDS_CMFS['CIE 1964 10 Degree Standard Observer'].copy().align(shape)
cmf2 = colour.MSDS_CMFS['CIE 1931 2 Degree Standard Observer'].copy().align(shape)
from colour.colorimetry import SDS_ILLUMINANTS
# CIE D-series basis vectors S0,S1,S2 (CIE 15)
from colour.temperature import CCT_to_xy_CIE_D  # noqa (for reference only)
from colour.colorimetry import SDS_BASIS_FUNCTIONS_CIE_ILLUMINANT_D_SERIES as S
S = {k: S[k].copy().align(shape) for k in S}
# CRI test colour samples TCS01-14 (CIE 13.3-1995)
from colour.quality.cri import SDS_TCS
tcs = [SDS_TCS['CIE 1995']['TCS%02d' % i].copy().align(shape) for i in range(1, 15)]

out = {
  'wl': r(shape.wavelengths, 0),
  'ces': [r(s.values, 5) for s in ces.to_sds()],
  'tcs': [r(s.values, 5) for s in tcs],
  'cmf10': [r(cmf10.values[:, i], 6) for i in range(3)],
  'S': [r(S[k].values, 4) for k in ('S0', 'S1', 'S2')],
}
Path(__file__).resolve().parent.parent.joinpath('data', 'colour-tables.json').write_text(json.dumps(out, separators=(',', ':')))
print('ces', len(out['ces']), 'tcs', len(out['tcs']), 'S', [len(s) for s in out['S']])
