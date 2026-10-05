#!/usr/bin/env python3
"""
Scrape LEE Filters spectral transmission curves into CSV files.

Each filter page (e.g. https://leefilters.com/colour/247-lee-minus-green/) has an
inline SVG chart with one <circle class="tooltip" title="<span>405</span>Colour: <b>70.336</b>">
per wavelength. This script reads those circles, so no JavaScript rendering is needed
(if it turns out to be needed, use --render, see below).

Usage:
    python lee_scraper.py                      # discover filters via sitemap, scrape all
    python lee_scraper.py --urls-file urls.txt # use your own list of URLs
    python lee_scraper.py --limit 5            # test run with 5 filters
    python lee_scraper.py --render             # use Playwright if plain HTTP finds no data

Output (in ./lee_output):
    spectra_long.csv   filter_id, name, wavelength_nm, transmission_percent, transmission
    spectra_wide.csv   wavelength_nm rows x one column per filter (fraction 0..1)
    metadata.csv       filter_id, name, url, n_points, wl_min, wl_max, plus site-published Y/x/y
    spectra/<id>.csv   one small file per filter
    cache/<id>.html    raw pages, so re-runs don't hit the site again
"""
import argparse
import csv
import html
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

UA = "Mozilla/5.0 (compatible; personal-spectra-scraper/1.0)"
BASE = "https://leefilters.com"
SITEMAP_CANDIDATES = [
    f"{BASE}/sitemap_index.xml",
    f"{BASE}/wp-sitemap.xml",
    f"{BASE}/sitemap.xml",
    f"{BASE}/sitemap/",
]
# Filter pages look like /colour/247-lee-minus-green/
DEFAULT_URL_PATTERN = r"^https://leefilters\.com/colour/[^/]+/?$"

# Tag matcher that respects quoted attribute values, because the title attribute may
# contain raw "<span>...</b>" (unescaped < and >) as well as &lt;-escaped forms.
CIRCLE_RE = re.compile(
    r"<circle\b(?=(?:[^>\"']|\"[^\"]*\"|'[^']*')*?\bclass=[\"']tooltip[\"'])"
    r"(?:[^>\"']|\"[^\"]*\"|'[^']*')*>",
    re.S,
)
TITLE_ATTR_RE = re.compile(r"\btitle=(?:\"([^\"]*)\"|'([^']*)')", re.S)
POINT_RE = re.compile(r"<span>\s*([\d.]+)\s*</span>.*?<b>\s*(-?[\d.]+)\s*</b>", re.S)
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S | re.I)


def fetch(url, retries=3, delay=2.0):
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="replace")
        except (urllib.error.URLError, TimeoutError) as e:
            last = e
            time.sleep(delay * (attempt + 1))
    raise RuntimeError(f"fetch failed for {url}: {last}")


def discover_urls(pattern):
    """Walk sitemap(s) recursively and keep URLs matching pattern."""
    pat = re.compile(pattern)
    seen_maps, found = set(), set()

    def walk(sm_url):
        if sm_url in seen_maps:
            return
        seen_maps.add(sm_url)
        try:
            text = fetch(sm_url)
        except RuntimeError:
            return
        for loc in re.findall(r"<loc>\s*(.*?)\s*</loc>", text, re.S):
            loc = html.unescape(loc)
            if loc.endswith(".xml"):
                walk(loc)
            elif pat.match(loc):
                found.add(loc)

    for c in SITEMAP_CANDIDATES:
        walk(c)
        if found:
            break
    return sorted(found)


def parse_page(page):
    """Return (name, {wavelength: transmission_percent}, site_values)."""
    m = H1_RE.search(page)
    name = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""

    pts = {}
    for tag in CIRCLE_RE.findall(page):
        t = TITLE_ATTR_RE.search(tag)
        if not t:
            continue
        title = html.unescape(t.group(1) or t.group(2))
        pm = POINT_RE.search(title)
        if pm:
            pts[float(pm.group(1))] = float(pm.group(2))

    # Values the site publishes next to the chart (Daylight/Source C, then Tungsten).
    text = re.sub(r"<[^>]+>", " ", page)
    text = re.sub(r"\s+", " ", html.unescape(text))
    site = {}
    for label, key in (("Transmission Y", "Y"), ("x", "x"), ("y", "y")):
        vals = re.findall(rf"(?:^|\s){re.escape(label)}\s+([\d.]+)", text)
        if len(vals) >= 1:
            site[f"{key}_daylight"] = vals[0]
        if len(vals) >= 2:
            site[f"{key}_tungsten"] = vals[1]
    return name, pts, site


def render_with_playwright(urls_to_html):
    """Fallback: fetch pages with a headless browser (pip install playwright; playwright install chromium)."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        for url in list(urls_to_html):
            page.goto(url, wait_until="networkidle")
            page.wait_for_selector("circle.tooltip", state="attached", timeout=15000)
            urls_to_html[url] = page.content()
        browser.close()


def slug_of(url):
    return url.rstrip("/").rsplit("/", 1)[-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--urls-file", help="text file with one filter URL per line")
    ap.add_argument("--pattern", default=DEFAULT_URL_PATTERN, help="regex for sitemap URLs to keep")
    ap.add_argument("--out", default="lee_output")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--delay", type=float, default=1.0, help="seconds between requests")
    ap.add_argument("--render", action="store_true", help="use Playwright when plain HTML has no data")
    args = ap.parse_args()

    out = Path(args.out)
    (out / "cache").mkdir(parents=True, exist_ok=True)
    (out / "spectra").mkdir(exist_ok=True)

    if args.urls_file:
        urls = [u.strip() for u in Path(args.urls_file).read_text().splitlines() if u.strip()]
    else:
        print("Discovering filter URLs from sitemap ...")
        urls = discover_urls(args.pattern)
        print(f"  found {len(urls)} URLs")
        if not urls:
            sys.exit("No URLs found. Put URLs in a text file and use --urls-file.")
    if args.limit:
        urls = urls[: args.limit]

    results = {}  # slug -> dict
    failures = []
    for i, url in enumerate(urls, 1):
        slug = slug_of(url)
        cache = out / "cache" / f"{slug}.html"
        if cache.exists():
            page = cache.read_text(encoding="utf-8")
        else:
            try:
                page = fetch(url)
            except RuntimeError as e:
                print(f"[{i}/{len(urls)}] {slug}: {e}")
                failures.append((url, "fetch error"))
                continue
            cache.write_text(page, encoding="utf-8")
            time.sleep(args.delay)

        name, pts, site = parse_page(page)
        if not pts and args.render:
            holder = {url: None}
            render_with_playwright(holder)
            page = holder[url]
            cache.write_text(page, encoding="utf-8")
            name, pts, site = parse_page(page)
        if not pts:
            print(f"[{i}/{len(urls)}] {slug}: no spectral data (not a filter page?)")
            failures.append((url, "no data"))
            continue
        print(f"[{i}/{len(urls)}] {slug}: {len(pts)} points ({min(pts):.0f}-{max(pts):.0f} nm)")
        results[slug] = {"name": name, "url": url, "pts": pts, "site": site}

    if not results:
        sys.exit("Nothing scraped. If pages had no data, try --render.")

    # per-filter files + long CSV
    with open(out / "spectra_long.csv", "w", newline="", encoding="utf-8") as fl:
        w = csv.writer(fl)
        w.writerow(["filter_id", "name", "wavelength_nm", "transmission_percent", "transmission"])
        for slug, r in results.items():
            with open(out / "spectra" / f"{slug}.csv", "w", newline="", encoding="utf-8") as f1:
                w1 = csv.writer(f1)
                w1.writerow(["wavelength_nm", "transmission"])
                for wl in sorted(r["pts"]):
                    v = r["pts"][wl]
                    w.writerow([slug, r["name"], f"{wl:g}", v, round(v / 100, 6)])
                    w1.writerow([f"{wl:g}", round(v / 100, 6)])

    # wide CSV (fractions 0..1)
    all_wl = sorted({wl for r in results.values() for wl in r["pts"]})
    slugs = list(results)
    with open(out / "spectra_wide.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["wavelength_nm"] + slugs)
        for wl in all_wl:
            w.writerow([f"{wl:g}"] + [
                round(results[s]["pts"][wl] / 100, 6) if wl in results[s]["pts"] else "" for s in slugs
            ])

    # metadata
    site_keys = sorted({k for r in results.values() for k in r["site"]})
    with open(out / "metadata.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["filter_id", "name", "url", "n_points", "wl_min", "wl_max"] + site_keys)
        for s, r in results.items():
            w.writerow([s, r["name"], r["url"], len(r["pts"]), f"{min(r['pts']):g}", f"{max(r['pts']):g}"]
                       + [r["site"].get(k, "") for k in site_keys])

    print(f"\nDone: {len(results)} filters -> {out}/")
    if failures:
        print(f"{len(failures)} URLs skipped:")
        for u, why in failures:
            print(f"  {why}: {u}")


if __name__ == "__main__":
    main()
