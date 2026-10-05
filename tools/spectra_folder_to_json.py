#!/usr/bin/env python3
"""Turn a folder of two-column spectra files (wavelength, value) into a data-set JSON for data/.

    python3 tools/spectra_folder_to_json.py my_pigments/ -o data/pigments.json
    python3 tools/spectra_folder_to_json.py my_pigments/ -o data/pigments.json --tidy-pigment-names --names names.json

Input files: .txt/.csv/.tsv, any of tab, space, semicolon or comma between columns, comma or dot decimals.
The value column is taken as percent (0-100); use --fraction if it is 0-1.
Output (percent, rounded to 0.1, on a 1 nm grid):  {"w0":380,"s":1,"f":[[id, name, [values...]], ...]}
Spectra must cover 380-780 nm (use --min-wl / --max-wl to relax that, the ends are then held).
"""
import argparse, json, os, re, sys
from pathlib import Path
import numpy as np

EXPAND = {}   # optional {"file stem": "Display name"} from --names


def tidy_pigment(stem):
    """'PR 264 - pyrrole red' -> 'Pyrrole red (PR 264)'"""
    m = re.match(r"^([A-Z][A-Za-z]{1,2}\s\d+)\s-\s(.+)$", stem)
    code, name = (m.group(1), m.group(2)) if m else ("", stem)
    name = name[0].upper() + name[1:]
    return f"{name} ({code})" if code else name


def read_spectrum(path):
    rows = []
    for line in open(path, errors="replace"):
        parts = [p for p in re.split(r"[\s;]+", line.strip().replace(",", ".")) if p]
        if len(parts) >= 2:
            try:
                rows.append((float(parts[0]), float(parts[1])))
            except ValueError:
                pass          # header or junk line
    a = np.array(rows)
    return a[np.argsort(a[:, 0])]


def to_grid(a, lo, hi):
    out = []
    for l in range(380, 781):
        s = (a[:, 0] >= l - .5) & (a[:, 0] < l + .5)          # bin-average if the data is denser than 1 nm
        out.append(a[s, 1].mean() if s.any() else np.interp(l, a[:, 0], a[:, 1]))
    return np.array(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder"); ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--fraction", action="store_true", help="values are 0-1 instead of percent")
    ap.add_argument("--tidy-pigment-names", action="store_true")
    ap.add_argument("--names", help="JSON {file stem: display name}")
    ap.add_argument("--min-wl", type=float, default=380.5); ap.add_argument("--max-wl", type=float, default=779.5)
    args = ap.parse_args()
    names = json.load(open(args.names)) if args.names else {}
    files = sorted([p for p in Path(args.folder).iterdir() if p.suffix.lower() in (".txt", ".csv", ".tsv")], key=lambda p: p.name.lower())
    out, seen = [], set()
    for p in files:
        a = read_spectrum(p)
        if len(a) < 5: print("skipped (no data):", p.name); continue
        if a[0, 0] > args.min_wl or a[-1, 0] < args.max_wl:
            sys.exit(f"{p.name}: covers {a[0,0]:g}-{a[-1,0]:g} nm, need 380-780 (relax with --min-wl/--max-wl)")
        v = to_grid(a, 380, 780) * (100 if args.fraction else 1)
        stem = p.stem
        name = names.get(stem) or (tidy_pigment(stem) if args.tidy_pigment_names else stem)
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        assert slug not in seen, f"duplicate id {slug}"; seen.add(slug)
        v = np.round(v, 1)
        out.append([slug, name, [float(x) if x % 1 else int(x) for x in v]])
    Path(args.out).write_text(json.dumps({"w0": 380, "s": 1, "f": out}, separators=(",", ":")) + "\n")
    print(f"{len(out)} spectra -> {args.out} ({os.path.getsize(args.out)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
