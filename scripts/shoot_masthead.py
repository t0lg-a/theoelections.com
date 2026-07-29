#!/usr/bin/env python3
"""shoot_masthead.py — the masthead reference set.

    python3 -m http.server 8899 &
    python3 scripts/shoot_masthead.py

[2.24] Writes docs/shots/masthead-<width>.png for the app and
docs/shots/landing-masthead-<width>.png for the landing sheet, at the five
widths the system is designed against, on both grounds. These are the
reference: a masthead change that moves them is a masthead change that has
to be looked at.

It also prints the measurements the chapter asserts — the slab's weight, the
nav's row count and its centring, one height across the controls — so a
regression shows up as a number and not only as a picture.
"""

import glob
import json
import os
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
# scripts/check_shots.py points this at a scratch directory so it can
# re-shoot the whole set and diff it against the reference without
# overwriting the reference first.
SHOTS = pathlib.Path(os.environ.get("SHOTS_DIR") or (ROOT / "docs" / "shots"))
# The browser, wherever it is. This box keeps one at a pinned path; a
# build box that ran `playwright install` keeps its own somewhere else, and
# hardcoding this one meant every check in the harness failed on any
# machine but this one. None hands the choice back to Playwright.
def _chrome():
    env = os.environ.get("CHROMIUM_PATH")
    if env and os.path.exists(env):
        return env
    for pat in ("/opt/pw-browsers/chromium-*/chrome-linux/chrome",
                os.path.expanduser("~/.cache/ms-playwright/chromium-*/chrome-linux/chrome")):
        hits = sorted(glob.glob(pat))
        if hits:
            return hits[-1]
    return None


CHROME = _chrome()
ORIGIN = "http://127.0.0.1:8899"
WIDTHS = (390, 768, 1024, 1440, 1920)

# The app fetches its geometry from a CDN the build box cannot reach; the
# local copy npm ships is served in its place so the page settles.
ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
ATLAS_LOCAL = ROOT / "prerender" / "fixtures" / "states-10m.json"

MEASURE = """() => {
  const cs = e => getComputedStyle(e);
  const top = document.querySelector('.top');
  const nav = document.querySelector('.nav');
  const controls = [...document.querySelectorAll('.iconbtn, .donate, .donateBtn')];
  const links = nav ? [...nav.querySelectorAll('a')] : [];
  const dots = nav ? [...nav.querySelectorAll('.dot')] : [];
  return {
    topH: Math.round(top.getBoundingClientRect().height),
    slab: cs(top).borderBottomWidth,
    navRows: new Set(links.map(a => Math.round(a.getBoundingClientRect().top))).size,
    navCentred: nav
      ? Math.abs(Math.round(nav.getBoundingClientRect().left) -
                 Math.round(innerWidth - nav.getBoundingClientRect().right)) <= 1
      : null,
    controlHeights: [...new Set(controls.map(
      e => Math.round(e.getBoundingClientRect().height)))],
    // [2.8] one middot per gap: the character in the markup, nothing drawn
    drawnDots: dots.filter(
      d => getComputedStyle(d, '::before').content !== 'none').length,
    sheetScrollsSideways: document.body.scrollWidth > innerWidth,
  };
}"""


def shoot(browser, url, width, ground, out):
    ctx = browser.new_context(viewport={"width": width, "height": 900},
                              device_scale_factor=2)
    if ATLAS_LOCAL.exists():
        body = ATLAS_LOCAL.read_text()
        ctx.route(ATLAS_URL, lambda r: r.fulfill(
            status=200, content_type="application/json", body=body))
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:160]))
    page.add_init_script(
        'window.__INITIAL_TAB="Model";'
        'try{localStorage.setItem("theo-theme",%s);}catch(e){}' % json.dumps(ground))
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_timeout(7000 if "baseline" in url else 1200)
    page.locator(".top").screenshot(path=str(out))
    result = page.evaluate(MEASURE)
    ctx.close()
    return result, errors


def main() -> int:
    SHOTS.mkdir(parents=True, exist_ok=True)
    bad = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for name, path in (("masthead", "/baseline.html"),
                           ("landing-masthead", "/index.html")):
            for ground in ("light", "dark"):
                for width in WIDTHS:
                    suffix = "" if ground == "light" else "-dark"
                    out = SHOTS / f"{name}-{width}{suffix}.png"
                    r, errors = shoot(browser, ORIGIN + path, width, ground, out)
                    flags = []
                    if r["slab"] != "9px":
                        flags.append("slab is not the system's 9px")
                    if r["navRows"] > 1:
                        flags.append(f"nav wraps to {r['navRows']} rows")
                    if len(r["controlHeights"]) > 1:
                        flags.append(f"controls disagree: {r['controlHeights']}")
                    if r["drawnDots"]:
                        flags.append(f"{r['drawnDots']} drawn dots")
                    if r["sheetScrollsSideways"]:
                        flags.append("the sheet scrolls sideways")
                    flags += errors
                    bad += len(flags)
                    mark = "  " if not flags else "! "
                    print(f"{mark}{out.name:<32} {json.dumps(r)}")
                    for f in flags:
                        print(f"      {f}")
        browser.close()
    print("\nfindings:", bad or "none")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
