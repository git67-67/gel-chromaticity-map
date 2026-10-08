#!/usr/bin/env python3
"""Turn a plain-text spectra matrix (e.g. the Munsell measurements from the University of Eastern Finland) into the
wide CSV this app imports: first column wavelength_nm, one column per sample.

    python3 tools/spectra_matrix_to_csv.py spectra.txt out.csv [--names names.txt] [--first 380] [--step 1] [--chips-in-rows]

The matrix is whitespace/comma separated numbers. Layout is detected: if the first column looks like wavelengths
(380..800, increasing) it is used; otherwise give --first/--step for the wavelength of row 1 and the step.
--chips-in-rows says each ROW is one sample (columns are wavelengths). --names is one sample name per line
(default: sample-0001, ...). Values are written as read; the app accepts 0-1 fractions or percent.
This was written without access to the real files; check the first lines of the result before importing."""
import argparse, csv, re, sys
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("matrix"); ap.add_argument("out")
ap.add_argument("--names"); ap.add_argument("--first", type=float); ap.add_argument("--step", type=float, default=1.0)
ap.add_argument("--chips-in-rows", action="store_true")
a = ap.parse_args()

rows = []
for line in Path(a.matrix).read_text(errors="replace").splitlines():
    t = [x for x in re.split(r"[\s,;]+", line.strip()) if x]
    if not t or t[0].startswith("#"):
        continue
    try:
        rows.append([float(x) for x in t])
    except ValueError:
        continue                                           # header/text line
if not rows:
    sys.exit("no numeric rows found")
if a.chips_in_rows:
    rows = [list(c) for c in zip(*rows)]                   # now rows = wavelengths, columns = samples
col0 = [r[0] for r in rows]
is_wl = all(300 <= x <= 1100 for x in col0) and all(b > a_ for a_, b in zip(col0, col0[1:])) and len(rows[0]) > 1
if is_wl:
    wl = col0; data = [r[1:] for r in rows]
else:
    if a.first is None:
        sys.exit("first column is not wavelengths: pass --first <nm of row 1> (and --step)")
    wl = [a.first + i * a.step for i in range(len(rows))]; data = rows
n = len(data[0])
names = [l.strip() for l in Path(a.names).read_text().splitlines() if l.strip()] if a.names else []
if names and len(names) != n:
    print(f"warning: {len(names)} names for {n} samples; using generic names", file=sys.stderr); names = []
names = names or [f"sample-{i + 1:04d}" for i in range(n)]
with open(a.out, "w", newline="") as f:
    w = csv.writer(f); w.writerow(["wavelength_nm"] + names)
    for x, r in zip(wl, data):
        w.writerow([f"{x:g}"] + [f"{v:g}" for v in r])
print(f"{n} samples x {len(wl)} wavelengths ({wl[0]:g}-{wl[-1]:g} nm) -> {a.out}")
