#!/usr/bin/env python3
"""shoot_figures.py — the figure reference set.

    python3 -m http.server 8899 &
    python3 scripts/shoot_figures.py

[6.24] One shot per figure form, at the width it is designed against, on
both grounds, into docs/shots/. These are the reference: a change to a
figure that moves them is a change that has to be looked at.
"""

import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "shots"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
ORIGIN = "http://127.0.0.1:8899"
ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
ATLAS_LOCAL = ROOT / "prerender" / "fixtures" / "states-10m.json"

# form, tab, selector
FORMS = [
    ("histogram", "Model", ".histo"),
    ("odds-chart", "Model", ".chartHost"),
    ("us-map", "Model", ".mapHost"),
    ("ratings-bar", "Ratings", ".rtgBar"),
    ("ratings-strip", "Ratings", ".rtgCountStrip"),
    ("swing-curve", "Swingometer", ".swingCanvasHost"),
    ("polls-scatter", "Polls", ".chartHost"),
    ("polls-margin", "Polls", ".pollsHistHost"),
    ("record", "Polls", ".pollsListWrap"),
    ("florida-panel", "Florida", ".flrCard"),
    # [7.24] The maps, each at the width its sheet gives it.
    ("map-state-inset", "Model", ".mapBlock"),
    ("map-ratings", "Ratings", ".mapHost"),
    ("map-swing", "Swingometer", ".mapHost"),
    ("map-polls", "Polls", ".mapHost"),
    ("map-districts", "Ratings", ".col:nth-child(5) .mapHost"),
]


def main() -> int:
    SHOTS.mkdir(parents=True, exist_ok=True)
    atlas = ATLAS_LOCAL.read_text() if ATLAS_LOCAL.exists() else None
    missing = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for ground in ("light", "dark"):
            ctx = browser.new_context(viewport={"width": 1440, "height": 1100},
                                      device_scale_factor=2)
            if atlas:
                ctx.route(ATLAS_URL, lambda r: r.fulfill(
                    status=200, content_type="application/json", body=atlas))
            page = ctx.new_page()
            page.add_init_script(
                'window.__INITIAL_TAB="Model";'
                'try{localStorage.setItem("theo-theme",%s)}catch(e){}' % json.dumps(ground))
            page.goto(ORIGIN + "/baseline.html", wait_until="domcontentloaded")
            page.wait_for_timeout(8000)
            tab = "Model"
            for form, want_tab, sel in FORMS:
                if want_tab != tab:
                    page.click('.nav a:text-is(%s)' % json.dumps(want_tab))
                    page.wait_for_timeout(2500)
                    tab = want_tab
                el = page.query_selector(sel)
                suffix = "" if ground == "light" else "-dark"
                if not el or el.bounding_box() is None:
                    missing.append(form + suffix)
                    print("!  %-16s %s not found" % (form, sel))
                    continue
                out = SHOTS / ("figure-%s%s.png" % (form, suffix))
                el.screenshot(path=str(out))
                box = el.bounding_box()
                print("   %-24s %4dx%-4d %s" % (out.name, box["width"], box["height"], sel))
            ctx.close()
        browser.close()
    if missing:
        print("\nmissing:", ", ".join(missing))
        return 1
    print("\nthe figure reference set is current.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
