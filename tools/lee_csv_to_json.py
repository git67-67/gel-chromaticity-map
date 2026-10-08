#!/usr/bin/env python3
"""Convert the scraper output (spectra_long.csv + metadata.csv) into data/lee.json.

    python3 tools/lee_scraper.py                # writes lee_output/
    python3 tools/lee_csv_to_json.py lee_output/spectra_long.csv lee_output/metadata.csv -o data/lee.json

Output: {"w":[405..700 step 5], "f":[[id, name, [percent or null per wavelength]], ...]}
"""
import argparse, collections, csv, json
ap = argparse.ArgumentParser()
ap.add_argument("long_csv"); ap.add_argument("metadata_csv"); ap.add_argument("-o", "--out", default="data/lee.json")
ap.add_argument("--start", type=int, default=405); ap.add_argument("--stop", type=int, default=700); ap.add_argument("--step", type=int, default=5)
a = ap.parse_args()
meta = collections.OrderedDict((r["filter_id"], r["name"]) for r in csv.DictReader(open(a.metadata_csv, encoding="utf-8-sig")))
spec = collections.defaultdict(dict)
for r in csv.DictReader(open(a.long_csv, encoding="utf-8-sig")):
    spec[r["filter_id"]][int(float(r["wavelength_nm"]))] = round(float(r["transmission_percent"]), 3)
grid = list(range(a.start, a.stop + 1, a.step))
data = {"w": grid, "f": [[fid, meta[fid], [spec[fid].get(w) for w in grid]] for fid in meta if fid in spec]}
open(a.out, "w", encoding="utf-8").write(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n")
print(f"{len(data['f'])} filters -> {a.out}")
