"""Checks the installable/offline behaviour over http:  python3 tools/build.py && python3 tests/pwa.py"""
import http.server, json, pathlib, socketserver, sys, threading
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=str(ROOT / "dist"), **k)
    def log_message(s, *a): pass
srv = socketserver.TCPServer(("127.0.0.1", 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
fails = []
def check(n, c, i=""):
    print(("PASS " if c else "FAIL ") + n + (f"  {i}" if i else ""))
    if not c: fails.append(n)
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(); pg = ctx.new_page()
    pg.goto(f"http://127.0.0.1:{port}/"); pg.wait_for_timeout(800)
    m = json.loads(pg.evaluate("fetch('manifest.webmanifest').then(r=>r.text())"))
    check("manifest loads and is standalone", m["display"] == "standalone" and len(m["icons"]) == 3)
    for ic in m["icons"]:
        check("icon " + ic["src"], pg.evaluate(f"fetch('{ic['src']}').then(r=>r.ok)"))
    pg.evaluate("navigator.serviceWorker.ready.then(()=>1)"); pg.wait_for_timeout(500)
    check("service worker active", pg.evaluate("navigator.serviceWorker.controller!==null||navigator.serviceWorker.ready.then(r=>!!r.active)"))
    pg.reload(); pg.wait_for_timeout(600)
    ctx.set_offline(True)
    pg.reload(); pg.wait_for_timeout(800)
    check("opens offline with data", "97" in pg.inner_text("#count"), pg.inner_text("#count"))
    check("standards mode (doctype present)", pg.evaluate("document.compatMode") == "CSS1Compat")
    b.close()
srv.shutdown()
print("\n%d FAILED" % len(fails) if fails else "\nall passed"); sys.exit(1 if fails else 0)
