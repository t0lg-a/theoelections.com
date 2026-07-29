#!/usr/bin/env python3
"""check_a11y.py — read the tree a screen reader is handed.

    python3 -m http.server 8899 &
    python3 scripts/check_a11y.py
    python3 scripts/check_a11y.py --route polls

[10.18] WHAT THIS IS, AND WHAT IT IS NOT

Chapter 10 asked for a VoiceOver pass. There is no VoiceOver on this
machine and there will not be one: it ships with macOS and this harness
runs on Linux. Nothing here is a substitute for sitting down with a screen
reader and using the site, and this file does not claim to be one.

What it does is read the accessibility tree the browser computes and hands
to whatever screen reader is attached — the same tree VoiceOver, NVDA and
Orca all consume. That catches the class of failure a keyboard pass cannot
see and a person with a screen reader hits immediately:

  1  a focusable thing with no accessible name, which is announced as
     "button" or "graphic" and tells the reader nothing
  2  a missing landmark, which is how a screen-reader user skips the
     masthead and gets to the sheet
  3  a heading level skipped, which breaks the same jump list
  4  an image-role node with no name — every figure on this site is one
  5  no live region, so a figure that redraws under the reader's hands
     changes in silence
  6  a page with no title

[10.5] It also runs axe-core over every route, which is the pass chapter 10
recorded as missing. axe is an npm package and it installs here after all:

    npm install --no-save axe-core

If it is not present this skips that half and says so rather than passing
quietly. What axe adds over the checks above is the ARIA relationship rules
— an aria-labelledby pointing at nothing, a role that requires a child it
does not have, a control referenced by two things at once — which is
exactly the gap chapter 10 named.

It still does not catch: whether the announcement is any good, whether the
reading order makes sense out loud, whether a figure's description is
enough to picture it, or anything about VoiceOver's own quirks. Those need
a person. This is the floor, asserted, so the floor cannot quietly drop.
"""

import argparse
import glob
import json
import os
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIGIN = "http://127.0.0.1:8899"
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
ATLAS_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
ATLAS_LOCAL = ROOT / "prerender" / "fixtures" / "states-10m.json"
AXE = ROOT / "node_modules" / "axe-core" / "axe.min.js"

# [10.5] The tags to hold the site to. AAA is not a level this site claims.
AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
# A violation at these impacts fails the build; the rest are printed.
AXE_FAILS_AT = {"critical", "serious"}

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

# The landmarks a screen-reader user navigates by. Every page here has a
# masthead, a sheet and a provenance line, so all three are required.
REQUIRED_LANDMARKS = ["banner", "main", "contentinfo"]
# A navigation landmark is noted rather than required: the three analyses
# and the landing sheet have nothing to navigate, and a nav of one link
# added to satisfy a checker is a landmark that lies.
WANTED_LANDMARKS = ["navigation"]

# Roles that are interactive: a node with one of these and no name is a
# stop the reader cannot identify.
INTERACTIVE = {"button", "link", "checkbox", "radio", "textbox", "combobox",
               "slider", "switch", "tab", "menuitem", "searchbox", "spinbutton"}

# The DOM-side questions the tree cannot answer.
DOM_PROBE = r"""() => {
  const live = [...document.querySelectorAll('[aria-live]')]
    .filter(e => e.getAttribute('aria-live') !== 'off');
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter(h => (h.textContent || '').trim())
    .map(h => ({level: +h.tagName[1], text: h.textContent.trim().slice(0, 40)}));
  return {
    title: (document.title || '').trim(),
    lang: document.documentElement.getAttribute('lang') || '',
    live: live.length,
    headings,
    // A page whose figures cannot change under the reader's hands has
    // nothing to announce, and a live region on one is furniture.
    interactive: !!document.querySelector(
      'main button, main select, main input, main [role=button], ' +
      '.wrap button:not([data-ground-toggle]), .wrap select, .wrap input'),
  };
}"""


def ax_tree(context, page):
    """The full accessibility tree, through CDP.

    Playwright's own `page.accessibility` was removed; the tree itself did
    not go anywhere, so this asks Chrome for it directly. The result is a
    flat list of nodes, which is all this needs — the questions here are
    about what is in the tree, not about its shape."""
    cdp = context.new_cdp_session(page)
    cdp.send("Accessibility.enable")
    nodes = cdp.send("Accessibility.getFullAXTree").get("nodes") or []
    cdp.detach()
    out = []
    for n in nodes:
        if n.get("ignored"):
            continue
        props = {p["name"]: p.get("value", {}).get("value")
                 for p in (n.get("properties") or [])}
        out.append({
            "role": (n.get("role") or {}).get("value") or "",
            "name": (n.get("name") or {}).get("value") or "",
            "disabled": bool(props.get("disabled")),
            "hidden": bool(props.get("hidden")),
        })
    return out


def axe_run(page):
    """[10.5] axe-core, in the page. Returns its violations."""
    page.add_script_tag(path=str(AXE))
    return page.evaluate(
        """tags => axe.run(document, {
             resultTypes: ['violations'],
             runOnly: {type: 'tag', values: tags},
           }).then(r => r.violations.map(v => ({
             id: v.id, impact: v.impact, help: v.help,
             n: v.nodes.length,
             where: v.nodes.slice(0, 3).map(n => (n.target || []).join(' ')),
           })))""", AXE_TAGS)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--route", help="only this route")
    ap.add_argument("--dump", action="store_true",
                    help="print the tree instead of asserting against it")
    ap.add_argument("--no-axe", action="store_true",
                    help="the tree checks only")
    args = ap.parse_args()

    axe_available = AXE.exists() and not args.no_axe
    if not args.no_axe and not AXE.exists():
        print("check-a11y: axe-core is not installed, so the ARIA "
              "relationship rules are not being checked. `npm install "
              "--no-save axe-core` to close that gap.", file=sys.stderr)
    notes = []

    routes = [r for r in ROUTES if not args.route or r[0] == args.route]
    atlas = ATLAS_LOCAL.read_text() if ATLAS_LOCAL.exists() else None
    failures = []

    def fail(where, what):
        failures.append("%s — %s" % (where, what))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        for label, path in routes:
            ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
            if atlas:
                ctx.route(ATLAS_URL, lambda r: r.fulfill(
                    status=200, content_type="application/json", body=atlas))
            page = ctx.new_page()
            page.goto(ORIGIN + path, wait_until="domcontentloaded")
            page.wait_for_timeout(6000 if path.endswith("/") else 2500)

            nodes = ax_tree(ctx, page)
            dom = page.evaluate(DOM_PROBE)

            if args.dump:
                print(label)
                print(json.dumps(nodes))
                ctx.close()
                continue

            roles = [n["role"] for n in nodes]

            # 6 · a title, and a language for the voice to pick
            if not dom["title"]:
                fail(label, "the page has no title")
            if not dom["lang"]:
                fail(label, "the document declares no language")

            # 2 · landmarks
            for want in REQUIRED_LANDMARKS:
                if want not in roles:
                    fail(label, "there is no %s landmark" % want)
            for w in WANTED_LANDMARKS:
                if w not in roles:
                    notes.append("%s — no %s landmark" % (label, w))

            # 1 and 4 · a name on everything that is a stop or a figure
            unnamed = []
            for n in nodes:
                role, name = n["role"], n["name"].strip()
                if name or n["hidden"]:
                    continue
                if role in INTERACTIVE or role == "image":
                    # A control with nothing to act on is a control a reader
                    # is told about and told to leave alone; it is allowed
                    # to be nameless in the same way it is allowed to be
                    # unreachable.
                    if n["disabled"]:
                        continue
                    unnamed.append(role)
            if unnamed:
                seen = sorted(set(unnamed))
                fail(label, "%d node(s) with a role and no name: %s"
                     % (len(unnamed), ", ".join(seen)))

            # 3 · heading levels
            levels = [h["level"] for h in dom["headings"]]
            if not levels:
                fail(label, "the page has no headings")
            else:
                if levels[0] != 1:
                    fail(label, "the first heading is an h%d, not an h1" % levels[0])
                for i in range(1, len(levels)):
                    if levels[i] - levels[i - 1] > 1:
                        fail(label, "heading level jumps h%d to h%d at \"%s\""
                             % (levels[i - 1], levels[i], dom["headings"][i]["text"]))
                        break

            # 5 · a live region, where there is anything to announce
            if dom["interactive"] and not dom["live"]:
                fail(label, "there is no live region, so a figure that "
                            "redraws changes in silence")

            # [10.5] and then axe, for the relationships the tree alone does
            # not answer.
            if axe_available:
                for v in axe_run(page):
                    line = "%s (%s) on %d node(s): %s" % (
                        v["id"], v["impact"], v["n"], "; ".join(v["where"]))
                    if v["impact"] in AXE_FAILS_AT:
                        fail(label, "axe · " + line)
                    else:
                        notes.append("%s — axe · %s" % (label, line))
            ctx.close()
        browser.close()

    if args.dump:
        return 0
    for n in notes:
        print("  note · " + n)
    if failures:
        print("check-a11y: %d failure(s)\n" % len(failures), file=sys.stderr)
        for f in failures:
            print("  " + f, file=sys.stderr)
        return 1
    print("check-a11y: the tree holds on %d route(s)%s. This is the floor, "
          "not a screen-reader pass."
          % (len(routes), ", axe included" if axe_available else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
