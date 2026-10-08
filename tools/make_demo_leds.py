#!/usr/bin/env python3
"""Write N synthetic white-LED spectra (blue pump + broad phosphor + optional red phosphor) as one CSV per LED, in the same
layout as an instrument export ("# key,value" header, then wavelength,intensity 350-850 nm, 1 nm). For tests, demos and for
trying the LED library with a large set:   python3 tools/make_demo_leds.py 1000 out_dir"""
import sys, numpy as np
from pathlib import Path
n = int(sys.argv[1]) if len(sys.argv) > 1 else 100
out = Path(sys.argv[2] if len(sys.argv) > 2 else 'demo_leds'); out.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)
w = np.arange(350, 851)
g = lambda m, s: np.exp(-0.5 * ((w - m) / s) ** 2)
for i in range(n):
    pump = g(rng.uniform(438, 465), rng.uniform(7, 12)) * rng.uniform(0.6, 1.2)
    ph_mu, ph_s = rng.uniform(535, 600), rng.uniform(38, 70)
    phos = (g(ph_mu, ph_s) + 0.35 * g(ph_mu + 45, ph_s * 1.2)) * rng.uniform(0.3, 0.9)
    red = g(rng.uniform(615, 660), rng.uniform(8, 35)) * (rng.uniform(0.15, 0.9) if rng.random() < 0.6 else 0)
    v = pump + phos + red + rng.normal(0, 2e-4, w.size) + 1e-4
    v = np.clip(v / v.max(), 0, None)
    (out / f'led_{i:04d}.csv').write_text('# status,normal\n# device,DEMO-%04d\nWavelength (nm),Intensity\n' % i +
        '\n'.join(f'{a},{b:.7f}' for a, b in zip(w, v)) + '\n')
print('wrote', n, 'files to', out)
