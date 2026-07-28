#!/usr/bin/env python3
"""check_ramp.py — put the data palette through the tests a map has to pass.

    python3 scripts/check_ramp.py

The maps encode a margin as a fill on a divergent ramp. That only works if
the ramp is perceptually even, if its midpoint reads as neutral rather than
as a weak lean, if the overprint reserved for a contested race cannot be
mistaken for a maximal lead, and if all of that survives a reader who cannot
separate red from green — or from grey, in print.

Everything here is computed from the tokens in assets/theme.css and from the
same `marginFill` rule forecast.js paints with, so the test and the site
cannot drift apart. It writes docs/shots/ramp.svg as the visual record and
prints the numbers; non-zero exit on a failure.

The CVD matrices are Brettel/Viénot-style linear-RGB projections — the usual
approximation, good enough to answer "do these two steps still separate".
"""

import math
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "shots"

# ---- the tokens, read from the sheet -------------------------------------


def tokens():
    css = (ROOT / "assets" / "theme.css").read_text(encoding="utf-8")
    m = re.search(r":root\{(.*?)\n\}", css, re.DOTALL)
    return dict(re.findall(r"(--t-[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})", m.group(1)))


T = tokens()


def h2r(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def r2h(t):
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(round(c)))) for c in t)


PAPER = h2r(T["--t-paper"])
INK = h2r(T["--t-ink"])
D1 = h2r(T["--t-d1"])          # Republican
D5 = h2r(T["--t-d5"])          # Democratic
OVERPRINT = h2r(T["--t-overprint"])

# ---- the fill rule, mirroring forecast.js's marginFill -------------------


def mix(fg, bg, t):
    """fg over bg at t, the same linear mix palMix does."""
    return tuple(bg[i] + (fg[i] - bg[i]) * t for i in range(3))


def margin_fill(m):
    if not math.isfinite(m):
        return PAPER
    a = abs(m)
    if a < 2.0:
        return OVERPRINT
    t = max(0.0, min(1.0, a / 25.0))
    return mix(D1 if m > 0 else D5, PAPER, 0.22 + 0.78 * t)


# ---- colour maths --------------------------------------------------------


def srgb_to_lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb(c):
    c = max(0.0, min(1.0, c))
    return 255.0 * (12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055)


def luminance(rgb):
    r, g, b = (srgb_to_lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    x, y = sorted((luminance(a), luminance(b)), reverse=True)
    return (x + 0.05) / (y + 0.05)


def to_lab(rgb):
    r, g, b = (srgb_to_lin(c) for c in rgb)
    x = 0.4124 * r + 0.3576 * g + 0.1805 * b
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = 0.0193 * r + 0.1192 * g + 0.9505 * b
    wx, wy, wz = 0.95047, 1.0, 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x / wx), f(y / wy), f(z / wz)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(a, b):
    """CIE76. Blunt, but the question here is 'can these be told apart', and
    a ΔE under about 10 answers that on its own."""
    la, lb = to_lab(a), to_lab(b)
    return math.sqrt(sum((la[i] - lb[i]) ** 2 for i in range(3)))


CVD = {
    "deuteranopia": ((0.625, 0.375, 0.0), (0.7, 0.3, 0.0), (0.0, 0.3, 0.7)),
    "protanopia":   ((0.567, 0.433, 0.0), (0.558, 0.442, 0.0), (0.0, 0.242, 0.758)),
    "tritanopia":   ((0.95, 0.05, 0.0), (0.0, 0.433, 0.567), (0.0, 0.475, 0.525)),
}


def simulate(rgb, kind):
    lin = [srgb_to_lin(c) for c in rgb]
    m = CVD[kind]
    out = [sum(m[i][j] * lin[j] for j in range(3)) for i in range(3)]
    return tuple(lin_to_srgb(c) for c in out)


def greyscale(rgb):
    y = luminance(rgb)
    v = lin_to_srgb(y)
    return (v, v, v)


# ---- the tests -----------------------------------------------------------

STEPS = [-25, -20, -15, -10, -6, -3, 0, 3, 6, 10, 15, 20, 25]
failures = []


def report(title):
    print("\n" + title)
    print("-" * len(title))


report("1 · the ramp, step by step  [5.13][5.14]")
fills = [(m, margin_fill(m)) for m in STEPS]
for m, c in fills:
    lab = to_lab(c)
    print(f"  margin {m:>4}   {r2h(c)}   L*={lab[0]:6.2f}  vs paper ΔE={delta_e(c, PAPER):6.2f}")

# [5.13] the midpoint has to read as neutral, not as a weak lean
mid = margin_fill(0)
print(f"\n  the midpoint is the overprint {r2h(mid)}; ΔE to paper {delta_e(mid, PAPER):.2f}")
lean = margin_fill(2.5)
print(f"  the weakest lean drawn is {r2h(lean)}; ΔE from the overprint {delta_e(mid, lean):.2f}")
if delta_e(mid, lean) < 12:
    failures.append("the contested overprint is within ΔE 12 of the weakest lean")

# [5.14] perceptually even steps: the ΔE between consecutive steps on one
# side of the ramp should not vary wildly
for side, sign in (("republican", 1), ("democratic", -1)):
    xs = [x for x in (3, 6, 10, 15, 20, 25)]
    cols = [margin_fill(sign * x) for x in xs]
    gaps = [delta_e(cols[i], cols[i + 1]) for i in range(len(cols) - 1)]
    lo, hi = min(gaps), max(gaps)
    print(f"\n  {side} side, ΔE between steps: " +
          " ".join(f"{g:.1f}" for g in gaps))
    print(f"    smallest {lo:.1f}, largest {hi:.1f}, ratio {hi / max(lo, 1e-9):.2f}")
    if hi / max(lo, 1e-9) > 3.0:
        failures.append(f"the {side} side of the ramp steps unevenly "
                        f"(largest gap {hi / lo:.1f}x the smallest)")

report("2 · the overprint against a maximal lead  [5.11][5.12]")
maxR, maxD = margin_fill(25), margin_fill(-25)
for name, other in (("max R", maxR), ("max D", maxD)):
    de = delta_e(OVERPRINT, other)
    ok = "" if de >= 25 else "   <- too close"
    print(f"  overprint {r2h(OVERPRINT)} vs {name} {r2h(other)}   ΔE {de:6.2f}{ok}")
    if de < 25:
        failures.append(f"the overprint is within ΔE 25 of a maximal lead ({name})")
print(f"  overprint vs the ink ground {r2h(INK)}   ΔE {delta_e(OVERPRINT, INK):.2f}")
if delta_e(OVERPRINT, INK) < 8:
    failures.append("on the ink ground the overprint disappears into the ground")

report("3 · colour vision  [5.15][5.16][5.18]")
for kind in CVD:
    print(f"  {kind}")
    sr, sd = simulate(maxR, kind), simulate(maxD, kind)
    de = delta_e(sr, sd)
    print(f"    a maximal R and a maximal D separate by ΔE {de:.2f}"
          f"  ({r2h(sr)} vs {r2h(sd)})")
    if de < 15:
        print("    -> the ramp's direction does not survive; a second cue is required")
    # the ratings scale's seven steps
    scale = [margin_fill(x) for x in (-25, -12, -4, 0, 4, 12, 25)]
    sim = [simulate(c, kind) for c in scale]
    worst = min(delta_e(sim[i], sim[i + 1]) for i in range(len(sim) - 1))
    print(f"    the seven ratings steps: smallest neighbouring ΔE {worst:.2f}")
    if worst < 6:
        failures.append(f"two ratings steps collapse under {kind} (ΔE {worst:.2f})")

report("4 · greyscale, which is what print is  [5.22][5.23]")
g = [(m, greyscale(margin_fill(m))) for m in STEPS]
for m, c in g:
    print(f"  margin {m:>4}   {r2h(c)}   L*={to_lab(c)[0]:6.2f}")
grey_pairs = [(delta_e(greyscale(margin_fill(x)), greyscale(margin_fill(-x))), x)
              for x in (3, 6, 10, 15, 20, 25)]
worst_de, worst_x = min(grey_pairs)
print(f"\n  in greyscale a D lead and an R lead of the same size are the same value:")
print(f"  the closest pair is +/-{worst_x} at ΔE {worst_de:.2f}")
print("  -> value alone cannot carry direction on a divergent ramp; the")
print("     greyscale fallback has to encode direction some other way.")

# ---- the visual record ---------------------------------------------------
SHOTS.mkdir(parents=True, exist_ok=True)
W, H, PAD = 60, 44, 10
rows = [("as drawn", lambda c: c),
        ("greyscale", greyscale),
        ("deuteranopia", lambda c: simulate(c, "deuteranopia")),
        ("protanopia", lambda c: simulate(c, "protanopia")),
        ("tritanopia", lambda c: simulate(c, "tritanopia"))]
width = PAD * 2 + 120 + W * len(STEPS)
height = PAD * 2 + 24 + H * len(rows)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
       f'viewBox="0 0 {width} {height}" font-family="system-ui,sans-serif">',
       f'<rect width="{width}" height="{height}" fill="{r2h(PAPER)}"/>']
for i, m in enumerate(STEPS):
    x = PAD + 120 + i * W + W / 2
    svg.append(f'<text x="{x:.0f}" y="{PAD + 14}" font-size="11" font-weight="700" '
               f'text-anchor="middle" fill="{r2h(INK)}">{m:+d}</text>')
for r, (label, fn) in enumerate(rows):
    y = PAD + 24 + r * H
    svg.append(f'<text x="{PAD}" y="{y + H / 2 + 4:.0f}" font-size="11" font-weight="700" '
               f'fill="{r2h(INK)}">{label}</text>')
    for i, m in enumerate(STEPS):
        c = fn(margin_fill(m))
        svg.append(f'<rect x="{PAD + 120 + i * W}" y="{y}" width="{W - 2}" '
                   f'height="{H - 6}" fill="{r2h(c)}"/>')
svg.append("</svg>")
(SHOTS / "ramp.svg").write_text("\n".join(svg), encoding="utf-8")
print(f"\nwrote {(SHOTS / 'ramp.svg').relative_to(ROOT)}")

if failures:
    print("\ncheck-ramp: %d failure(s)" % len(failures), file=sys.stderr)
    for f in failures:
        print("  " + f, file=sys.stderr)
    sys.exit(1)
print("\ncheck-ramp: the ramp holds.")
