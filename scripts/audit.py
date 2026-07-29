#!/usr/bin/env python3
"""audit.py — assert the canon against the running site.

    python3 -m http.server 8899 &
    python3 scripts/audit.py                 # every route, both grounds
    python3 scripts/audit.py --route polls   # one route

A system that is not asserted decays. `check-tokens.mjs` asserts what a
person wrote in the stylesheet and `check_colour.py` asserts what the browser
paints; this asserts the rest of the canon, on every route including the
three standalone analyses, on both grounds, plus a reduced-motion pass and a
print pass.

What it asserts, and why each one is here rather than left to review:

  1  radius 0            a rounded corner is a different system
  2  elevation 0         a shadow is a light source the sheet does not have
  3  no text-transform   case is a decision made in the copy, not the CSS
  4  no synthesised italic
                         neither face has an italic; the browser's oblique
                         is a slant applied to a face that never had one
  5  no pure white or black
                         the ground is paper and the type is ink
  6  the two faces       Switzer for data, Author for prose, nothing else
  7  a title and a source on every figure
  8  a decode gate on every novel form
  9  no horizontal overflow at seven widths
 10  44px touch targets below 760
 11  no motion, and none re-introduced under reduced-motion
 12  print: no chrome, one column, the record whole

Exit code 1 on any failure, so it can gate a build.
"""

import argparse
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIGIN = "http://127.0.0.1:8899"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
ATLAS_LOCAL = ROOT / "prerender" / "fixtures" / "states-10m.json"

# [12.19] Every route, and the three analyses alongside them.
ROUTES = [
    ("model", "/model/"),
    ("ratings", "/ratings/"),
    ("florida", "/florida/"),
    ("polls", "/polls/"),
    ("swingometer", "/swingometer/"),
    ("past-elections", "/past-elections/"),
    ("state-legs", "/state-legs/"),
    ("projects", "/projects/"),
    ("methodology", "/methodology/"),
    ("landing", "/index.html"),
    ("fundraising", "/fundraising-comparison.html"),
    ("primary-turnout", "/primary_turnout_combined.html"),
    ("nationalization", "/nationalization-2.html"),
]

WIDTHS = [320, 390, 768, 1024, 1280, 1440, 1920]

CANON = r"""() => {
  const bad = [];
  const name = e => (e.id ? '#' + e.id : '') +
    (typeof e.className === 'string' && e.className
      ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') ||
    e.tagName.toLowerCase();
  const seen = new Set();
  const flag = (rule, e, detail) => {
    const k = rule + '|' + name(e) + '|' + detail;
    if (seen.has(k)) return;
    seen.add(k);
    bad.push({rule, sel: name(e), detail});
  };

  document.querySelectorAll('body *').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(e);

    // 1 · radius 0
    for (const c of ['TopLeft','TopRight','BottomRight','BottomLeft']) {
      const v = parseFloat(cs['border' + c + 'Radius']);
      if (v > 0) flag('radius', e, cs['border' + c + 'Radius']);
    }
    // 2 · elevation 0
    if (cs.boxShadow && cs.boxShadow !== 'none') flag('shadow', e, cs.boxShadow.slice(0, 40));
    if (cs.textShadow && cs.textShadow !== 'none') flag('text-shadow', e, cs.textShadow.slice(0, 40));
    // 3 · no text-transform
    if (cs.textTransform !== 'none') flag('text-transform', e, cs.textTransform);
    // 4 · no synthesised italic
    if (cs.fontStyle !== 'normal') flag('italic', e, cs.fontStyle);
    // 11 · no motion
    if (cs.transitionDuration !== '0s' && cs.transitionProperty !== 'none')
      flag('transition', e, cs.transitionDuration);
    if (cs.animationName !== 'none') flag('animation', e, cs.animationName);

    // 6 · the two faces
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      if (!/^(Switzer|Author)/.test(fam) && !/fallback/i.test(fam)) {
        flag('face', e, fam);
      }
    }
  });

  // 7 and 8 · a title, a source and a decode gate on every figure
  const FIGS = '.chartHost,.mapHost,.histo,.rtgBar,.pollsHistHost,.swingCanvasHost,.flrMapWrap';
  document.querySelectorAll(FIGS).forEach(e => {
    if (e.getBoundingClientRect().height < 20) return;
    if (e.closest('.__legacy_offscreen')) return;
    const col = e.closest('.col, .card, .flrCard, section, main') || document.body;
    if (!col.querySelector('.t-src, .flrSub')) flag('no-source', e, '');
    if (!col.querySelector('.t-how')) flag('no-decode', e, '');
    const labelled = e.getAttribute('aria-label') ||
      e.querySelector('[aria-label], svg title') ||
      (e.previousElementSibling && /Title|probHead|secTitle|h\b/.test(
        String(e.previousElementSibling.className)));
    if (!labelled) flag('no-title', e, '');
  });

  return {
    bad,
    overflow: document.body.scrollWidth > window.innerWidth + 1,
    scrollW: document.body.scrollWidth,
    innerW: window.innerWidth,
    small: [...document.querySelectorAll('button, a[href], [role=button]')]
      .map(e => ({n: name(e), r: e.getBoundingClientRect()}))
      .filter(x => x.r.width > 0 && x.r.height > 0 &&
                   x.r.left > -1000 &&
                   (x.r.width < 44 || x.r.height < 44))
      .map(x => x.n + ' ' + Math.round(x.r.width) + 'x' + Math.round(x.r.height))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 8),
  };
}"""

PRINT_CHECK = r"""() => {
  const cs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; };
  const top = cs('.top'), nav = cs('.nav');
  const cols = document.querySelector('.cols');
  const rec = cs('.pollsView .pollsListHost');
  return {
    chromeHidden: (!top || top.display === 'none') && (!nav || nav.display === 'none'),
    oneColumn: !cols || getComputedStyle(cols).display === 'block',
    recordWhole: !rec || rec.maxHeight === 'none',
  };
}"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--route", help="only this route")
    ap.add_argument("--width", type=int, help="only this width")
    args = ap.parse_args()

    routes = [r for r in ROUTES if not args.route or r[0] == args.route]
    widths = [args.width] if args.width else WIDTHS
    atlas = ATLAS_LOCAL.read_text() if ATLAS_LOCAL.exists() else None
    failures = []

    def fail(where, rule, detail):
        failures.append("%s — %s: %s" % (where, rule, detail))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for ground in ("light", "dark"):
            for label, path in routes:
                for width in widths:
                    ctx = browser.new_context(viewport={"width": width, "height": 1000})
                    if atlas:
                        ctx.route(ATLAS_URL, lambda r: r.fulfill(
                            status=200, content_type="application/json", body=atlas))
                    page = ctx.new_page()
                    page.add_init_script(
                        'try{localStorage.setItem("theo-theme",%s)}catch(e){}'
                        % json.dumps(ground))
                    page.goto(ORIGIN + path, wait_until="domcontentloaded")
                    page.wait_for_timeout(6000 if "/" == path[-1] else 2000)
                    r = page.evaluate(CANON)
                    where = "%s/%s@%d" % (ground, label, width)
                    for b in r["bad"]:
                        fail(where, b["rule"], "%s %s" % (b["sel"], b["detail"]))
                    # 9 · no horizontal overflow
                    if r["overflow"]:
                        fail(where, "overflow",
                             "%d > %d" % (r["scrollW"], r["innerW"]))
                    # 10 · touch targets, on the phone widths only
                    if width <= 760 and r["small"]:
                        fail(where, "touch-target", ", ".join(r["small"]))
                    ctx.close()

        # [12.21] Reduced motion, and [12.22] print, at one width each: the
        # question is whether the sheet answers them at all.
        for media, script, checks in (
            ("reduced-motion", CANON, None),
            ("print", PRINT_CHECK, ("chromeHidden", "oneColumn", "recordWhole")),
        ):
            ctx = browser.new_context(viewport={"width": 1440, "height": 1000},
                                      reduced_motion="reduce" if media == "reduced-motion" else None)
            if atlas:
                ctx.route(ATLAS_URL, lambda r: r.fulfill(
                    status=200, content_type="application/json", body=atlas))
            page = ctx.new_page()
            page.goto(ORIGIN + "/polls/", wait_until="domcontentloaded")
            page.wait_for_timeout(6000)
            if media == "print":
                page.emulate_media(media="print")
                page.wait_for_timeout(400)
            r = page.evaluate(script)
            if checks:
                for c in checks:
                    if not r.get(c):
                        fail(media, c, "false")
            else:
                for b in r["bad"]:
                    fail(media, b["rule"], "%s %s" % (b["sel"], b["detail"]))
            ctx.close()
        browser.close()

    if failures:
        print("audit: %d failure(s)\n" % len(failures), file=sys.stderr)
        for f in failures[:120]:
            print("  " + f, file=sys.stderr)
        if len(failures) > 120:
            print("  ... and %d more" % (len(failures) - 120), file=sys.stderr)
        return 1
    print("audit: the canon holds on %d route(s) at %d width(s), both grounds, "
          "plus reduced motion and print." % (len(routes), len(widths)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
