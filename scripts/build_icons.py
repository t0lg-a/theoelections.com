#!/usr/bin/env python3
"""build_icons.py — draw the site's marks and its broadcast card in the system.

    python3 scripts/build_icons.py

Every icon and social card this site ships used to be a screenshot of the app:
the favicon was a crop of a Senate panel, the Open Graph image was a full-page
capture that still showed a control we deleted. Both went stale the moment the
UI changed, and neither was legible at the size it is actually seen.

This draws them instead, from the same tokens the sheet uses:

    favicon.png            48x48   the raster fallback for the SVG mark
    apple-touch-icon.png  180x180  ink field, safe margin, no transparency
    assets/icon-maskable.png
                          512x512  the mark inside the 80% maskable safe zone
    preview.png          1200x630  the broadcast card

The mark itself is assets/icon.svg and is authored by hand; this only
rasterises it. The card is templated below so its text lives in one place.

Requires playwright and the repo's own fonts. Run from the repo root.
"""

import base64
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

PAPER = "#E9E8E0"
INK = "#16171A"
MUTED = "#55534A"

# The claim on the card is the landing sheet's claim. One sentence, one place.
CARD_KICKER = "election forecast"
CARD_CLAIM = "Two reads on the same cycle."
CARD_LEDE = (
    "A structural forecast that runs to the precinct, and a polling baseline "
    "that sharpens as the surveys thicken."
)
CARD_SOURCE = "theoelections.com · Senate, Governor and House · 2026"


def font_face(weight: int) -> str:
    path = ROOT / "assets" / "fonts" / f"switzer-{weight}.woff2"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return (
        "@font-face{font-family:Switzer;font-style:normal;font-weight:%d;"
        "font-display:block;src:url(data:font/woff2;base64,%s) format('woff2');}"
        % (weight, b64)
    )


FONTS = "".join(font_face(w) for w in (500, 700, 900))
MARK = (ROOT / "assets" / "icon.svg").read_text(encoding="utf-8")


def icon_page(px: int, safe: float) -> str:
    """The mark on the ink ground, inset to leave `safe` of the box as margin.

    `safe` is the fraction of the box the mark is allowed to occupy: 1.0 for
    the favicon, 0.8 for the maskable variant whose corners a launcher may cut.
    """
    inner = round(px * safe)
    return f"""<!doctype html><meta charset="utf-8"><style>
      html,body{{margin:0;padding:0;background:{INK};}}
      .box{{width:{px}px;height:{px}px;background:{INK};
            display:flex;align-items:center;justify-content:center;}}
      .box svg{{width:{inner}px;height:{inner}px;display:block;}}
    </style><div class="box">{MARK}</div>"""


def card_page() -> str:
    return f"""<!doctype html><meta charset="utf-8"><style>
      {FONTS}
      html,body{{margin:0;padding:0;}}
      .card{{
        width:1200px;height:630px;background:{PAPER};color:{INK};
        font-family:Switzer,system-ui,sans-serif;
        display:flex;flex-direction:column;
        padding:56px 64px;box-sizing:border-box;
      }}
      .mast{{
        display:flex;align-items:baseline;justify-content:space-between;
        border-bottom:14px solid {INK};padding-bottom:18px;
      }}
      .name{{font-weight:900;font-size:44px;letter-spacing:-.03em;}}
      .cycle{{font-weight:700;font-size:22px;color:{MUTED};}}
      .body{{flex:1;display:flex;flex-direction:column;justify-content:center;}}
      .kicker{{font-weight:700;font-size:24px;color:{MUTED};margin-bottom:18px;}}
      /* [2.23] The claim is set to fill the card, because the card is read at
         thumbnail size and the claim is the only thing that survives that. */
      .claim{{font-weight:900;font-size:96px;line-height:1.0;
              letter-spacing:-.042em;max-width:17ch;margin:0;}}
      .lede{{font-weight:500;font-size:28px;line-height:1.45;color:{MUTED};
             max-width:52ch;margin:28px 0 0;}}
      .src{{border-top:2px solid {INK};padding-top:16px;
            font-weight:700;font-size:22px;color:{MUTED};}}
    </style>
    <div class="card">
      <div class="mast"><span class="name">Theo</span>
        <span class="cycle">2026 cycle</span></div>
      <div class="body">
        <div class="kicker">{CARD_KICKER}</div>
        <p class="claim">{CARD_CLAIM}</p>
        <p class="lede">{CARD_LEDE}</p>
      </div>
      <div class="src">{CARD_SOURCE}</div>
    </div>"""


def shoot(page, html: str, width: int, height: int, out: pathlib.Path) -> None:
    page.set_viewport_size({"width": width, "height": height})
    page.set_content(html, wait_until="load")
    page.wait_for_timeout(250)
    page.screenshot(path=str(out), clip={"x": 0, "y": 0, "width": width, "height": height})
    print(f"  {out.relative_to(ROOT)}  {width}x{height}")


def main() -> int:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page(device_scale_factor=1)
        print("drawing:")
        shoot(page, icon_page(48, 1.0), 48, 48, ROOT / "favicon.png")
        shoot(page, icon_page(180, 0.84), 180, 180, ROOT / "apple-touch-icon.png")
        shoot(page, icon_page(512, 0.62), 512, 512, ROOT / "assets" / "icon-maskable.png")
        shoot(page, card_page(), 1200, 630, ROOT / "preview.png")
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
