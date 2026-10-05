#!/usr/bin/env python3
"""Build dist/index.html (one self-contained file) from src/.

    python3 tools/build.py            # writes dist/index.html
    python3 tools/build.py --check    # exit 1 if any module has a JS syntax error (needs node)

No dependencies beyond Python 3. See docs/ARCHITECTURE.md.
"""
import json, re, subprocess, sys, tempfile
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
        if line.startswith("data "):
            _, name, rel = line.split()
            obj = json.loads(read(ROOT / rel))          # validates the JSON
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
    out = ROOT / "dist" / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({len(html)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
