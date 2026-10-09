"""Every file in examples/templates imports.  python3 tools/build.py && python3 tests/templates.py"""
import pathlib, sys
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
T = ROOT / "examples" / "templates"
fails = []
def check(n, c, i=""):
    print(("PASS " if c else "FAIL ") + n + (f"  {i}" if i else ""))
    if not c: fails.append(n)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto((ROOT / "dist" / "index.html").as_uri()); pg.wait_for_timeout(500)
    for f in sorted(T.glob("*.csv")):
        txt = f.read_text()
        if f.name.startswith("led_"):
            r = pg.evaluate("([t,n])=>{const r=ingestLED(t,n);return r&&{kind:r.kind,n:(r.items||[...r.map]).length,pts:r.items?r.items[0].wl.length:0}}", [txt, f.name])
            exp = {"led_metadata.csv": ("meta", 2), "led_single.csv": ("spectra", 1)}.get(f.name, ("spectra", 2))
        else:
            r = pg.evaluate("([t,n])=>{const r=ingest(t,n);return r&&{kind:r.kind,n:r.items?r.items.length:r.map.size,pts:r.items?r.items[0].wl.length:0}}", [txt, f.name])
            exp = {"filter_names.csv": ("meta", 2), "filter_single_my-red.csv": ("filters", 1)}.get(f.name, ("filters", 2))
        check(f.name, r is not None and (r["kind"], r["n"]) == exp and (r["kind"] == "meta" or r["pts"] >= 20), str(r))
    b.close()
print("\n%d FAILED" % len(fails) if fails else "\nall passed"); sys.exit(1 if fails else 0)
