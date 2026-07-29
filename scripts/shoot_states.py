#!/usr/bin/env python3
"""shoot_states.py — the eight states of a thing, on one sheet.

    python3 -m http.server 8899 &
    python3 scripts/shoot_states.py

[9.24] Absent, loading, empty, hovered, focused, selected, disabled and
error are eight different claims, and the point of drawing them together is
that no two of them should look alike. This builds a page that puts one
figure into each state, screenshots it on both grounds, and writes
docs/shots/states-<ground>.png.

It is a page rather than a hand-drawn SVG on purpose: the states are drawn
by assets/theme.css, so a sheet drawn any other way would be a picture of
what the states were meant to be rather than of what they are.
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

CASES = [
    ("absent", "there is no datum, and there never will be for this unit",
     '<div class="t-absent">no race this year</div>'),
    ("loading", "there is a datum and it has not arrived yet",
     '<div class="t-loading"></div>'),
    ("empty", "the query ran and returned nothing",
     '<div class="t-empty">no polls yet</div>'),
    ("error", "the fetch failed, which is not the same as absent",
     '<div class="t-error">the poll feed did not answer</div>'),
    ("hovered", "the pointer is over this",
     '<svg viewBox="0 0 120 60" class="stateDemo"><path class="state active hovered"'
     ' d="M10 10 H110 V50 H10 Z" style="fill:var(--t-d5-soft)"/></svg>'),
    ("focused", "the keyboard is on this",
     '<svg viewBox="0 0 120 60" class="stateDemo"><path class="state active focused"'
     ' d="M10 10 H110 V50 H10 Z" style="fill:var(--t-d5-soft)"/></svg>'),
    ("selected", "the reader chose this, and it is still chosen",
     '<button class="chartTab active" type="button">selected</button>'),
    ("disabled", "this control exists but has nothing to act on",
     '<button class="chartTab" type="button" disabled>disabled</button>'),
]

PAGE = """<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/assets/theme.css">
<style>
  body{margin:0;padding:28px;}
  .sheet{max-width:900px;margin:0 auto;}
  h1{font-family:var(--t-data);font-weight:800;font-size:var(--t-fs-6);
     letter-spacing:-.018em;margin:0 0 4px;color:var(--t-ink);}
  .dek{font-family:var(--t-data);font-size:var(--t-fs-3);color:var(--t-muted);
       margin:0 0 24px;}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;}
  .case{border-top:1px solid var(--t-ink);padding-top:12px;}
  .name{font-family:var(--t-data);font-size:var(--t-fs-2);font-weight:700;
        color:var(--t-ink);}
  .says{font-family:var(--t-data);font-size:var(--t-fs-1);color:var(--t-muted);
        margin:2px 0 10px;}
  .stateDemo{width:100%;height:60px;display:block;}
  /* Geometry only: the states themselves come from assets/theme.css, so a
     border or a colour set here would be a picture of the wrong thing. */
  .chartTab{font-family:var(--t-data);font-size:var(--t-fs-2);font-weight:700;
            padding:6px 12px;}
  .chartTab:not(.active):not([disabled]){
    border:1px solid var(--t-ink);background:transparent;color:var(--t-ink);}
</style>
<div class="sheet">
  <h1>Eight states, eight different pictures</h1>
  <p class="dek">Absent, loading and empty are the three that are easy to
  confuse, and they are the three this site used to draw the same way — as a
  50/50 tie, which is a plausible value and therefore a lie.</p>
  <div class="grid">__CASES__</div>
</div>"""


def main() -> int:
    SHOTS.mkdir(parents=True, exist_ok=True)
    cases = "".join(
        f'<div class="case"><div class="name">{name}</div>'
        f'<div class="says">{says}</div>{markup}</div>'
        for name, says, markup in CASES)
    page = PAGE.replace("__CASES__", cases)
    tmp = ROOT / "_states_sheet.html"
    tmp.write_text(page, encoding="utf-8")
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
            for ground in ("light", "dark"):
                ctx = browser.new_context(viewport={"width": 960, "height": 900},
                                          device_scale_factor=2)
                page_ = ctx.new_page()
                page_.add_init_script(
                    'try{localStorage.setItem("theo-theme",%s)}catch(e){}' % json.dumps(ground))
                page_.goto(ORIGIN + "/_states_sheet.html", wait_until="load")
                page_.evaluate('g => document.documentElement.setAttribute("data-theme", g)', ground)
                page_.wait_for_timeout(500)
                out = SHOTS / ("states-%s.png" % ground)
                page_.locator(".sheet").screenshot(path=str(out))
                # The output directory is not always inside the repo:
                # check_shots.py points it at a scratch directory.
                try:
                    print("   %s" % out.relative_to(ROOT))
                except ValueError:
                    print("   %s" % out)
                ctx.close()
            browser.close()
    finally:
        tmp.unlink(missing_ok=True)
    print("\nthe state reference sheet is current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
