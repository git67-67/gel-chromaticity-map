#!/usr/bin/env python3
"""Build dist/index.html (one self-contained file) from src/.

    python3 tools/build.py            # writes dist/index.html
    python3 tools/build.py --check    # exit 1 if any module has a JS syntax error (needs node)

No dependencies beyond Python 3. See docs/ARCHITECTURE.md.
"""
import hashlib, json, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def read(p):
    return Path(p).read_text(encoding="utf-8")


def js_bundle():
    parts = []
    for raw in read(SRC / "js" / "manifest.txt").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("data"):
            head, name, rel = line.split()
            f = ROOT / rel
            if head == "data?" and not f.exists():      # optional data (e.g. your own LEE file): absent -> null
                parts.append(f"/* ---- data: {rel} (absent) ---- */\nconst {name}=null;\n")
                continue
            obj = json.loads(read(f))                   # validates the JSON
            parts.append(f"/* ---- data: {rel} ---- */\nconst {name}={json.dumps(obj, separators=(',', ':'))};\n")
        else:
            parts.append(f"/* ---- {line} ---- */\n" + read(SRC / "js" / line).rstrip() + "\n")
    return "\n".join(parts)


def css_bundle():
    return "\n".join(read(p).rstrip() for p in sorted((SRC / "css").glob("*.css"), key=lambda p: (p.name != "base.css", p.name)))


def build():
    html = read(SRC / "index.html")
    html = re.sub(r"<!--@include (.+?)-->", lambda m: read(SRC / m.group(1)).rstrip(), html)
    html = html.replace("<!--@css-->", css_bundle()).replace("<!--@js-->", js_bundle())
    return html


def standalone(fragment):
    """The template is a fragment (title, styles, body) so it can also be pasted into hosts that add their own
    document skeleton. For hosting on its own it needs a doctype, <html>, <head> and <body>."""
    i = fragment.index("</style>") + len("</style>")
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' + fragment[:i] +
            '\n</head>\n<body>' + fragment[i:] + '\n</body>\n</html>\n')


def main():
    html = build()
    if "--check" in sys.argv:
        for i, s in enumerate(re.findall(r"<script>(.*?)</script>", html, re.S)):
            with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
                f.write(s)
            r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
            if r.returncode:
                print(r.stderr); sys.exit(1)
        print("syntax ok")
        return
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    page = standalone(html)
    (dist / "index.html").write_text(page, encoding="utf-8")
    # web-app files: manifest, icons, service worker (cache name carries a hash of the page so updates refresh it)
    shutil.copy(SRC / "pwa" / "manifest.webmanifest", dist / "manifest.webmanifest")
    shutil.copytree(SRC / "pwa" / "icons", dist / "icons", dirs_exist_ok=True)
    version = hashlib.sha256(page.encode("utf-8")).hexdigest()[:10]
    (dist / "sw.js").write_text(read(SRC / "pwa" / "sw.js").replace("__VERSION__", version), encoding="utf-8")
    print(f"wrote dist/ (index.html {len(page)/1024:.0f} KB, app files, cache version {version})")


if __name__ == "__main__":
    main()
