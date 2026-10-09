"""Imported spectra and LEDs survive a reload; backup file round trip.  python3 tools/build.py && python3 tests/persist.py"""
import http.server, pathlib, socketserver, sys, tempfile, threading
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
EX = ROOT / "examples"
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=str(ROOT / "dist"), **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), H); URL = f"http://127.0.0.1:{srv.server_address[1]}/"
threading.Thread(target=srv.serve_forever, daemon=True).start()
fails = []
def check(n, c, i=""):
    print(("PASS " if c else "FAIL ") + n + (f"  {i}" if i else ""))
    if not c: fails.append(n)
count = lambda pg: pg.inner_text("#count")
with sync_playwright() as p, tempfile.TemporaryDirectory() as prof:
    ctx = p.chromium.launch_persistent_context(prof, viewport={"width": 1200, "height": 900}); pg = ctx.new_page()
    errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(600)
    check("starts on example gels", "97" in count(pg), count(pg))
    check("LEE not in header before import", pg.evaluate("!document.querySelector('[data-ds=lee]')"))
    # import as LEE
    pg.select_option("#imp-kind", "lee"); pg.set_input_files("#f-files", [str(EX / "custom_wide.csv"), str(EX / "metadata_example.csv")]); pg.wait_for_timeout(900)
    check("import shows 3", "(3)" in count(pg), count(pg))
    check("LEE button appears", pg.evaluate("!!document.querySelector('[data-ds=lee]')"))
    pg.click("[data-ds=pig]"); pg.wait_for_timeout(300)
    check("pigments still built in", "82" in count(pg), count(pg))
    pg.click("[data-ds=lee]"); pg.wait_for_timeout(300)
    check("switching back keeps imported set (no re-upload)", "(3)" in count(pg) and "example red" in pg.inner_text("#list").lower(), count(pg))
    # LEDs
    pg.click("#t-leds"); pg.wait_for_timeout(300)
    leds = sorted(str(f) for f in (pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else EX / "leds").glob("*.csv"))
    pg.set_input_files("#ld-files", leds); pg.wait_for_timeout(1500)
    n_led = pg.evaluate("ledUser().length")
    check("LEDs imported", n_led > 0, str(n_led))
    pg.wait_for_timeout(800)
    # reload: everything is still there
    pg.reload(); pg.wait_for_timeout(1200)
    check("after reload: opens on LEE set", "(3)" in count(pg) and pg.evaluate("st.kind") == "lee", count(pg))
    check("after reload: LEE button present", pg.evaluate("!!document.querySelector('[data-ds=lee]')"))
    check("after reload: LEDs still there", pg.evaluate("ledUser().length") == n_led, str(pg.evaluate("ledUser().length")))
    check("note says saved", "Saved in this browser" in pg.inner_text("#us-note"), pg.inner_text("#us-note"))
    # backup text
    pg.evaluate("()=>{navigator.clipboard.writeText=()=>Promise.reject(new Error('x'));}")
    pg.click("#t-map"); pg.click("[data-bk=copy]"); pg.wait_for_timeout(300)
    bk = pg.input_value(".bk-box .bk-out")
    check("backup text has sets and leds", '"gel-chromaticity-map-library"' in bk and '"example-red"' in bk and '"usr:' in bk, bk[:80])
    # delete the saved set -> back to gels
    pg.once("dialog", lambda d: d.accept())
    pg.click("#b-lee"); pg.wait_for_timeout(500)
    check("delete restores example gels and hides LEE", "97" in count(pg) and pg.evaluate("!document.querySelector('[data-ds=lee]')"), count(pg))
    pg.reload(); pg.wait_for_timeout(1000)
    check("deleted set stays deleted", "97" in count(pg), count(pg))
    # restore from backup file
    f = pathlib.Path(prof) / "bk.json"; f.write_text(bk)
    with pg.expect_file_chooser() as fc: pg.click("[data-bk=load]")
    fc.value.set_files(str(f)); pg.wait_for_timeout(900)
    check("restore brings LEE back", pg.evaluate("st.kind") == "lee" and "(3)" in count(pg), count(pg))
    bad = pathlib.Path(prof) / "bad.json"; bad.write_text("{}")
    with pg.expect_file_chooser() as fc: pg.click("[data-bk=load]")
    fc.value.set_files(str(bad)); pg.wait_for_timeout(300)
    check("bad backup is refused with a message", "not a backup" in pg.inner_text(".bk-box .bk-msg").lower(), pg.inner_text(".bk-box .bk-msg"))
    check("no page errors", not errs, "; ".join(errs[:3]))
    ctx.close()
print("\n%d FAILED" % len(fails) if fails else "\nall passed"); sys.exit(1 if fails else 0)
