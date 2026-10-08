"""Browser smoke test:  python3 tools/build.py && python3 tests/smoke.py
Needs: pip install playwright && playwright install chromium"""
import sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "dist" / "index.html").as_uri()
EX = ROOT / "examples"
fails = []
def check(name, cond, info=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  {info}" if info else ""))
    if not cond: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    for scheme, width in (("light", 1200), ("dark", 390)):
        pg = b.new_page(viewport={"width": width, "height": 900}, color_scheme=scheme)
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append(m.text))
        pg.goto(URL); pg.wait_for_timeout(500)
        tag = f"[{scheme} {width}px] "
        count = lambda: pg.inner_text("#count")
        check(tag + "example gels load", "97" in count(), count())
        check(tag + "no horizontal overflow", pg.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        # spectrum plot is drawn (not blank)
        pg.evaluate("select('gel-053',true)"); pg.wait_for_timeout(200)
        drawn = pg.evaluate("(()=>{const c=document.getElementById('sp'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n})()")
        check(tag + "spectrum plot has content", drawn > 500, str(drawn))
        # dataset switch
        pg.click("[data-ds=pig]"); pg.wait_for_timeout(300)
        check(tag + "pigment set loads", "82" in count(), count())
        check(tag + "pigment wording", "PIGMENTS" in pg.inner_text("h2:has(#count)").upper() and "REFLECTANCE" in pg.inner_text("#detail").upper())
        # reflectance sets and import-only sets
        for ds, n in (("tcs", "14"), ("ces", "99"), ("cc", "24")):
            pg.click(f"[data-ds={ds}]"); pg.wait_for_timeout(300)
            check(tag + f"{ds} set loads {n}", n in count(), count())
        check(tag + "LEE and Munsell are import-only (no header button)", pg.evaluate("!document.querySelector('[data-ds=lee]') && !document.querySelector('[data-ds=mun]')"))
        check(tag + "LEE/Munsell offered in the import selector", pg.evaluate("[...document.querySelectorAll('#imp-kind option')].map(o=>o.value).includes('lee') && [...document.querySelectorAll('#imp-kind option')].map(o=>o.value).includes('mun')"))
        pg.click("[data-ds=pig]"); pg.wait_for_timeout(300)
        # metrics plug-in shows up
        check(tag + "metric row in detail panel", "PEAK" in pg.inner_text("#detail").upper())
        check(tag + "metric in sort menu", pg.evaluate("[...document.querySelectorAll('#s-sort option')].some(o=>o.value==='m:peakNm')"))
        pg.select_option("#s-sort", "m:peakNm"); pg.wait_for_timeout(100)
        # CSV export includes metric column
        pg.evaluate("()=>{navigator.clipboard.writeText=()=>Promise.reject(new Error('blocked'));}"); pg.click("#b-copy"); pg.wait_for_timeout(200)
        csv = pg.input_value("#csvout")
        check(tag + "CSV has pigment_id + peakNm columns", csv.startswith("pigment_id,name,reflectance_percent") and "peakNm" in csv.split("\n")[0] and "Rf" in csv.split("\n")[0], csv.split("\n")[0])
        # lab
        pg.click("#t-lab"); pg.wait_for_timeout(700)
        check(tag + "lab leaderboard lists pigments", "pigments" in pg.inner_text("#lb-n").lower(), pg.inner_text("#lb-n")[:60])
        pg.click("#t-map"); pg.wait_for_timeout(200)
        # import: replace with wide csv
        pg.click("[data-ds=gel]"); pg.wait_for_timeout(200)
        pg.set_input_files("#f-files", [str(EX / "custom_wide.csv"), str(EX / "metadata_example.csv")]); pg.wait_for_timeout(500)
        check(tag + "import replaces the set", "(3)" in count() and "example red" in pg.inner_text("#list").lower(), count())
        # import: add long csv
        pg.select_option("#imp-mode", "add")
        pg.set_input_files("#f-files", [str(EX / "custom_single_pigment.csv")]); pg.wait_for_timeout(400)
        check(tag + "import can add to the set", "(4)" in count(), count())
        pg.set_input_files("#f-files", [str(EX / "custom_space_separated.txt")]); pg.wait_for_timeout(400)
        check(tag + "space-separated text file imports", "(5)" in count(), count())
        # kind selector
        pg.select_option("#imp-kind", "pig"); pg.wait_for_timeout(200)
        check(tag + "kind selector changes wording without reloading data", "(5)" in count() and "PIGMENTS" in pg.inner_text("h2:has(#count)").upper())
        # subset keep list on the built-in set
        pg.select_option("#imp-mode", "replace"); pg.click("[data-ds=gel]"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('details.sub').open=true")
        pg.fill("#subset-text", "Deep Red\ngel-053\n# comment\nnot a real filter"); pg.click("#b-subset"); pg.wait_for_timeout(300)
        check(tag + "subset keeps listed filters", "(2)" in count() and pg.inner_text("#status").startswith("Kept 2"), count() + " " + pg.inner_text("#status"))
        check(tag + "subset reports names not found", "Not found: not a real filter" in pg.inner_text("#status"))
        check(tag + "no page errors", not errs, "; ".join(errs[:3]))
        pg.close()
    b.close()
print("\n%d FAILED" % len(fails) if fails else "\nall passed"); sys.exit(1 if fails else 0)
