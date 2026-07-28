#!/usr/bin/env python3
"""check_colour.py — assert the colour law.

    python3 -m http.server 8899 &
    python3 scripts/check_colour.py            # every tab, both grounds
    python3 scripts/check_colour.py polls      # one tab

The law: colour appears only where a datum is. The interface is monochrome;
the data palette is legal inside a figure and nowhere else.

check-tokens.mjs asserts what a person wrote in the sheet. This asserts what
the browser actually paints, which is a different question: the modules draw
inks imperatively, the district SVGs ship their own, and a colour can arrive
from four sheets at once. So it crawls the running site, reads the computed
colour of every element, and fails on:

  1. A saturated colour on an element that is not inside a figure.
  2. A colour that is not in the palette, anywhere.
  3. Text under its contrast floor against the ground it is actually on:
     4.5:1 for body sizes, 3:1 for large text, and 3:1 as a hard floor.
  4. Alpha on a data mark. Alpha manufactures colours the palette does not
     contain, and two overlapping marks make a third.

Exit code 1 on any violation, so it can gate a build.
"""

import json
import pathlib
import re
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIGIN = "http://127.0.0.1:8899"
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
ATLAS_LOCAL = ROOT / "prerender" / "fixtures" / "states-10m.json"

TABS = ["Model", "Ratings", "Florida", "Polls", "Swingometer",
        "Past Elections", "State Legs.", "Projects", "Methodology"]

# The inks that are only legal inside a figure.
DATA_INKS = {"--t-d1", "--t-d2", "--t-d5", "--t-overprint",
             "--t-d1-soft", "--t-d5-soft", "--t-d2-soft"}

# [5.24] What the law does not reach, and why. The list is empty: every
# case that looked like it wanted an exception turned out to be a swatch
# that had not been drawn yet. A legend does not need its words coloured if
# the swatch beside them is.
EXCEPTIONS = set()


def read_tokens():
    css = (ROOT / "assets" / "theme.css").read_text(encoding="utf-8")

    def block(pattern):
        m = re.search(pattern, css, re.DOTALL)
        out = {}
        if m:
            for k, v in re.findall(r"(--t-[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})", m.group(1)):
                out[k] = v
        return out

    light = block(r":root\{(.*?)\n\}")
    dark = block(r':root\[data-theme="dark"\]\{(.*?)\n\}')
    if not light:
        raise SystemExit("check-colour: could not read the :root block; the "
                         "palette is the contract and it has to be readable.")
    return light, dark


def hex2rgb(h):
    s = h.lstrip("#")
    if len(s) == 3:
        s = "".join(c * 2 for c in s)
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def nearest(rgb, palette, tol=10):
    for token, prgb in palette:
        if max(abs(rgb[i] - prgb[i]) for i in range(3)) <= tol:
            return token
    return None


def on_ramp(rgb, tokens, tol=8):
    """A margin fill is a data ink mixed toward the ground, so the map paints
    a continuum rather than seven swatches. A step on that continuum is in
    the palette; a colour off it is not. This is the same linear mix
    forecast.js draws with, tested at every 2%."""
    ground = hex2rgb(tokens["--t-paper"])
    for key in ("--t-d1", "--t-d5", "--t-d2", "--t-overprint", "--t-ink"):
        if key not in tokens:
            continue
        ink = hex2rgb(tokens[key])
        for i in range(0, 101, 2):
            t = i / 100.0
            step = tuple(ground[j] + (ink[j] - ground[j]) * t for j in range(3))
            if max(abs(rgb[j] - step[j]) for j in range(3)) <= tol:
                return key
    return None


def saturation(rgb):
    return max(rgb) - min(rgb)


def luminance(rgb):
    def f(c):
        c /= 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (f(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    x, y = sorted((luminance(a), luminance(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


PROBE = r"""() => {
  // A figure is a chart, a map, a legend, or a block the system marks as one.
  const FIG = '.histo,.ratingBar,.sldlRatingBar,svg,canvas,.pill,.metricPill,' +
    '.seats,.seatsSide,.mapBlock,.probBlock,.swingCard,.flrSeats,.flrSeatNums,' +
    '.rtgCountStrip,.rtgTossupNote,.pollsHistHost,.sldlSeatLine,.sldlOddsRow,' +
    '.methTable,.methTableA,.rtgLabels,.ratingLabels,.pollsHistLabels,' +
    '.simTip,#tip,.sldlCursorTip,.pollsListHost,.swingMarginVal,.histoCap,' +
    '.rtgBar,.rtgSeg,.rtgSummary,.rtgCountItem,.ratingsSummaryCard,.rtgFace,' +
    '.oddsCard,.panelBody,.flrSimCanvas,.flrMapWrap,.gbMeta';
  const nums = s => { const m = String(s).match(/-?[\d.]+/g); return m ? m.map(Number) : null; };
  const rgb = s => { const m = nums(s); return m ? m.slice(0,3) : null; };
  const alphaOf = s => { const m = nums(s); return m && m.length > 3 ? m[3] : 1; };
  const groundUnder = e => {
    let x = e;
    while (x) {
      const c = getComputedStyle(x).backgroundColor;
      if (c && alphaOf(c) > 0.5 && rgb(c)) return rgb(c);
      x = x.parentElement;
    }
    return rgb(getComputedStyle(document.body).backgroundColor) || [233,232,224];
  };
  const name = e => (e.id ? '#' + e.id : '') +
    (typeof e.className === 'string' && e.className
      ? '.' + e.className.trim().split(/\s+/).slice(0,2).join('.') : '') ||
    e.tagName.toLowerCase();
  const out = [];
  document.querySelectorAll('body *').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const cs = getComputedStyle(e);
    const fig = !!e.closest(FIG);
    const sel = name(e);
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      out.push({kind:'text', sel, fig, fg: rgb(cs.color), bg: groundUnder(e),
                size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight),
                text: (e.textContent||'').trim().slice(0,26)});
    }
    if (cs.backgroundColor && alphaOf(cs.backgroundColor) > 0.02 && rgb(cs.backgroundColor)) {
      out.push({kind:'fill', sel, fig, fg: rgb(cs.backgroundColor), alpha: alphaOf(cs.backgroundColor)});
    }
    for (const side of ['Top','Right','Bottom','Left']) {
      if (parseFloat(cs['border'+side+'Width']) > 0 && cs['border'+side+'Style'] !== 'none') {
        const c = cs['border'+side+'Color'];
        if (alphaOf(c) > 0.02 && rgb(c)) out.push({kind:'rule', sel, fig, fg: rgb(c), alpha: alphaOf(c)});
      }
    }
  });
  document.querySelectorAll('svg *').forEach(e => {
    const cs = getComputedStyle(e);
    const cls = e.getAttribute('class');
    for (const prop of ['fill','stroke']) {
      const v = cs[prop];
      if (!v || v === 'none') continue;
      const m = nums(v);
      if (!m) continue;
      const a = m.length > 3 ? m[3] : 1;
      if (a < 0.02) continue;
      out.push({kind:'svg-'+prop, fig: true,
                sel: e.tagName + (cls ? '.' + String(cls).split(' ')[0] : ''),
                fg: m.slice(0,3), alpha: a});
    }
  });
  return out;
}"""


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    light, dark = read_tokens()
    atlas = ATLAS_LOCAL.read_text() if ATLAS_LOCAL.exists() else None
    failures, seen = [], set()

    def fail(msg):
        if msg not in seen:
            seen.add(msg)
            failures.append(msg)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for ground in ("light", "dark"):
            tokens = dict(light)
            if ground == "dark":
                tokens.update(dark)
            palette = [(k, hex2rgb(v)) for k, v in tokens.items()]

            ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            if atlas:
                ctx.route(ATLAS_URL, lambda r: r.fulfill(
                    status=200, content_type="application/json", body=atlas))
            page = ctx.new_page()
            page.add_init_script(
                'try{localStorage.setItem("theo-theme",%s)}catch(e){}' % json.dumps(ground))
            page.goto(ORIGIN + "/baseline.html", wait_until="domcontentloaded")
            page.wait_for_timeout(7000)

            for tab in TABS:
                if only and only.lower().replace(" ", "") not in tab.lower().replace(" ", "").replace(".", ""):
                    continue
                page.click('.nav a:text-is(%s)' % json.dumps(tab))
                page.wait_for_timeout(1600)
                for row in page.evaluate(PROBE):
                    fg = row.get("fg")
                    if not fg:
                        continue
                    fg = tuple(int(round(c)) for c in fg[:3])
                    sel = row["sel"]
                    if any(x in sel for x in EXCEPTIONS):
                        continue
                    where = "%s/%s %s" % (ground, tab, sel)
                    token = nearest(fg, palette)
                    ramp = token or on_ramp(fg, tokens)

                    if ramp is None and saturation(fg) > 12:
                        fail("%s — %s rgb%s is neither a token nor a step on "
                             "the ramp" % (where, row["kind"], fg))

                    if not row["fig"] and saturation(fg) > 24:
                        fail("%s — %s is coloured outside a figure" % (where, row["kind"]))

                    a = row.get("alpha")
                    if row["fig"] and a is not None and 0.02 < a < 0.99 and token in DATA_INKS:
                        fail("%s — %s draws %s at alpha %s" % (where, row["kind"], token, a))

                    # A separator drawn as a character is a rule, not text:
                    # it carries no meaning and is read as an edge. The
                    # system's quietest neutrals are legal for one.
                    text = row.get("text", "")
                    is_rule_glyph = bool(text) and not re.search(r"[0-9A-Za-z]", text)

                    if row["kind"] == "text" and row.get("bg") and not is_rule_glyph:
                        bg = tuple(int(round(c)) for c in row["bg"][:3])
                        cr = contrast(fg, bg)
                        size, weight = row["size"], row["weight"]
                        large = size >= 24 or (size >= 18.66 and weight >= 700)
                        floor = 3.0 if large else 4.5
                        if cr < 3.0:
                            fail('%s — "%s" at %.2f:1, under the 3:1 floor'
                                 % (where, row["text"], cr))
                        elif cr < floor:
                            fail('%s — "%s" %gpx/%s at %.2f:1, under %.1f:1'
                                 % (where, row["text"], size, weight, cr, floor))
            ctx.close()
        browser.close()

    if failures:
        print("check-colour: %d violation(s)\n" % len(failures), file=sys.stderr)
        for f in failures:
            print("  " + f, file=sys.stderr)
        return 1
    print("check-colour: colour appears only where a datum is.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
