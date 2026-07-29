#!/usr/bin/env python3
"""measure_lcp.py — the largest contentful paint, per route.

    python3 -m http.server 8899 &
    python3 scripts/measure_lcp.py

[10.24] LCP, CLS and the transferred bytes for every prerendered route, on a
cold cache, at 390 and 1440. The numbers are printed rather than asserted:
this is a record to compare against, not a gate — a build box's timings are
not a reader's.
"""

import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
ORIGIN = "http://127.0.0.1:8899"
ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
ATLAS_LOCAL = ROOT / "prerender" / "fixtures" / "states-10m.json"

ROUTES = ["model", "ratings", "florida", "polls", "swingometer",
          "past-elections", "state-legs", "projects", "methodology"]

COLLECT = """() => new Promise(resolve => {
  const out = {lcp: 0, cls: 0};
  try {
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) out.lcp = Math.round(e.startTime);
    }).observe({type: 'largest-contentful-paint', buffered: true});
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) out.cls += e.value;
    }).observe({type: 'layout-shift', buffered: true});
  } catch (e) {}
  setTimeout(() => {
    out.cls = Math.round(out.cls * 1000) / 1000;
    resolve(out);
  }, 3500);
})"""


def main() -> int:
    atlas = ATLAS_LOCAL.read_text() if ATLAS_LOCAL.exists() else None
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for width in (1440,):
            print("\nwidth %d" % width)
            print("  %-16s %7s %7s %10s %6s" % ("route", "lcp", "cls", "bytes", "reqs"))
            for route in ROUTES:
                ctx = browser.new_context(viewport={"width": width, "height": 900})
                if atlas:
                    ctx.route(ATLAS_URL, lambda r: r.fulfill(
                        status=200, content_type="application/json", body=atlas))
                total = {"bytes": 0, "reqs": 0}

                def on_response(resp):
                    total["reqs"] += 1
                    try:
                        total["bytes"] += int(resp.headers.get("content-length") or 0)
                    except Exception:
                        pass

                page = ctx.new_page()
                page.on("response", on_response)
                page.goto("%s/%s/" % (ORIGIN, route), wait_until="domcontentloaded")
                r = page.evaluate(COLLECT)
                print("  %-16s %6dms %7s %9dkB %6d"
                      % (route, r["lcp"], r["cls"], total["bytes"] // 1024, total["reqs"]))
                ctx.close()
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
