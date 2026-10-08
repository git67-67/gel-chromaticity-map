#!/usr/bin/env python3
"""Make tests/reference-quality.json: CRI / TM-30 values from colour-science for a set of spectra, so tests/maths.mjs can
check the JavaScript implementation. Dev tool (needs `pip install colour-science`). Optional extra spectra: pass CSV files
(wavelength, intensity) as arguments - they are used as extra test cases.

    python3 tools/gen_quality_reference.py [led1.csv led2.csv ...]
"""
import json, sys, numpy as np, colour
from pathlib import Path
from colour import SpectralDistribution, SpectralShape, SDS_ILLUMINANTS, sd_blackbody
from colour.quality import colour_rendering_index, colour_fidelity_index_CIE2017

shape = SpectralShape(380, 780, 5)
cases = {}
for name in ['FL1','FL2','FL3','FL4','FL5','FL6','FL7','FL8','FL9','FL10','FL11','FL12','FL3.1','FL3.5','FL3.10','FL3.15',
             'LED-B1','LED-B2','LED-B3','LED-B4','LED-B5','LED-BH1','LED-RGB1','LED-V1','LED-V2','D65','A']:
    if name in SDS_ILLUMINANTS:
        cases[name] = SDS_ILLUMINANTS[name].copy().align(shape).values
for T in (2200, 2700, 3000, 3500, 4000, 4500, 5000, 5500, 6500, 10000):
    cases[f'Planck {T}'] = sd_blackbody(T, shape).values
w = shape.wavelengths
g = lambda m, s: np.exp(-0.5 * ((w - m) / s) ** 2)
cases['gauss RGB'] = g(455, 10) + 0.9 * g(530, 18) + 1.1 * g(630, 10)
cases['pc-white 5600'] = 1.0 * g(450, 9) + 0.55 * g(560, 55) + 0.25 * g(620, 45)
cases['pc-white 2700'] = 0.5 * g(450, 9) + 0.55 * g(580, 60) + 0.55 * g(640, 45)
for f in sys.argv[1:]:
    rows = [l.split(',') for l in Path(f).read_text(encoding='utf-8', errors='ignore').splitlines()]
    d = np.array([[float(a), float(b)] for a, b, *_ in (r for r in rows if len(r) > 1 and r[0].replace('.', '', 1).isdigit())])
    cases['file ' + Path(f).stem] = np.interp(w, d[:, 0], d[:, 1], left=0, right=0)

out = []
for name, v in cases.items():
    v = np.asarray(v, float); v = v / v.max()
    sd = SpectralDistribution(v, w, name=name)
    rec = {'name': name, 'spd5': [round(float(x), 7) for x in v]}
    try:
        f = colour_fidelity_index_CIE2017(sd, additional_data=True)
        rec.update(cct=float(f.CCT), duv=float(f.D_uv), Rf=float(f.R_f), Rfi=[float(x) for x in f.R_s])
        # bin statistics (same formulas as the JS, from colour-science's own CAM02-UCS values)
        t, r = f.colorimetry_data
        ap_t, bp_t = t.Jpapbp[:, 1], t.Jpapbp[:, 2]; ap_r, bp_r = r.Jpapbp[:, 1], r.Jpapbp[:, 2]
        hue = r.JMh[:, 2]; b = np.minimum(15, np.floor(hue / 22.5).astype(int))
        m = lambda a: np.array([a[b == k].mean() for k in range(16)])
        at, bt, ar, br = m(ap_t), m(bp_t), m(ap_r), m(bp_r)
        area = lambda x, y: abs(sum(x[i] * y[(i + 1) % 16] - x[(i + 1) % 16] * y[i] for i in range(16))) / 2
        rec['Rg'] = float(100 * area(at, bt) / area(ar, br))
        rec['Rcs'] = [float(x) for x in (np.hypot(at, bt) - np.hypot(ar, br)) / np.hypot(ar, br)]
    except Exception as e:
        rec['fid_error'] = str(e)
    try:
        c = colour_rendering_index(sd, additional_data=True)
        rec.update(Ra=float(c.Q_a), R=[float(c.Q_as[i].Q_a) for i in range(1, 15)])
    except Exception as e:
        rec['cri_error'] = str(e)
    out.append(rec)
Path(__file__).resolve().parent.parent.joinpath('tests', 'reference-quality.json').write_text(json.dumps(out).replace('NaN', 'null'))
print(len(out), 'cases;', sum('Ra' in r for r in out), 'with CRI;', sum('Rf' in r for r in out), 'with TM-30')
