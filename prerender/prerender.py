"""Build-time prerenderer for the theoelections.com Almanac SPA.

Spins up a local HTTP server pointed at the repo root, walks every Almanac
route declared in routes.py with headless Chromium, waits for the React app
to flag window.__PRERENDER_READY__, and writes the fully-rendered HTML to
<repo-root>/<slug>/index.html. Also rewrites sitemap.xml and robots.txt.

Run from the repo root:

    python3 -m playwright install chromium    # first time only
    python3 prerender/prerender.py

The script is idempotent: re-running overwrites cleanly. Per-route output
lands at <slug>/index.html (each route gets its own directory), so the
existing /baseline.html, /index.html, and the already-static project pages
(primary_turnout_combined.html, etc.) are untouched.

Mechanism:
    1. Before navigating to /baseline.html, an init script sets
       window.__INITIAL_TAB to the route's tab label. assets/app.js reads
       this on mount as the initial activeTab.
    2. assets/app.js sets window.__PRERENDER_READY__ = true after the
       relevant view has rendered (data + maps + teleport flushed).
    3. We capture document.documentElement.outerHTML, then inject SEO
       metadata + <base href="/"> + an inline script that re-sets
       window.__INITIAL_TAB so real users on /<slug>/ get the same tab.

Constraints honored: does not touch React rendering, does not touch the
offscreen-teleport pattern, does not modify d3/SVG code, does not change
the visual output.
"""

from __future__ import annotations

import argparse
import contextlib
import datetime as dt
import html
import json
import os
import re
import socket
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Iterable

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright

from routes import ALMANAC_ROUTES, SITE_ORIGIN, STATIC_ROUTES

REPO_ROOT = Path(__file__).resolve().parent.parent
SHELL_PATH = "baseline.html"
READY_TIMEOUT_MS = 20_000


class _QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args, **_kwargs):  # noqa: D401 - silence access log
        pass


@contextlib.contextmanager
def _local_server(root: Path):
    """Serve `root` over HTTP on an ephemeral port for the duration of the block."""
    os.chdir(root)
    server = ThreadingHTTPServer(("127.0.0.1", 0), _QuietHandler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        # Sanity-poke so we don't race the first navigation.
        with socket.create_connection(("127.0.0.1", port), timeout=2):
            pass
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()
        server.server_close()


def _head_injection(route: dict, build_iso: str) -> str:
    """Build the <head> additions to splice in just after <head>."""
    slug = route["slug"]
    canonical = f"{SITE_ORIGIN}/{slug}/"
    title = route["title"]
    description = route["description"]
    initial_tab = route["tab"]

    if description is None:
        description = (
            f"TODO: write description for {route['page_name']} "
            f"(140-160 chars, page-specific)."
        )

    parts = [
        '<base href="/">',
        f'<title>{html.escape(title)}</title>',
        f'<meta name="description" content="{html.escape(description, quote=True)}">',
        f'<link rel="canonical" href="{canonical}">',
        f'<meta property="og:title" content="{html.escape(title)}">',
        f'<meta property="og:description" content="{html.escape(description, quote=True)}">',
        f'<meta property="og:url" content="{canonical}">',
        '<meta property="og:type" content="website">',
        f'<meta name="prerender-build" content="{build_iso}">',
        # Inline boot hint so React hydrates onto the right tab at runtime.
        f'<script>window.__INITIAL_TAB={json.dumps(initial_tab)};</script>',
    ]
    return "\n".join(parts)


_HEAD_OPEN_RE = re.compile(r"<head(\s[^>]*)?>", re.IGNORECASE)
_TITLE_RE = re.compile(r"<title>.*?</title>", re.IGNORECASE | re.DOTALL)
_EXISTING_BASE_RE = re.compile(r"<base\s[^>]*>", re.IGNORECASE)
_EXISTING_CANONICAL_RE = re.compile(
    r'<link[^>]+rel=["\']canonical["\'][^>]*>', re.IGNORECASE
)
_EXISTING_META_DESC_RE = re.compile(
    r'<meta[^>]+name=["\']description["\'][^>]*>', re.IGNORECASE
)
_EXISTING_OG_RE = re.compile(
    r'<meta[^>]+property=["\']og:(?:title|description|url|type)["\'][^>]*>',
    re.IGNORECASE,
)


def _inject_head(rendered_html: str, head_block: str) -> str:
    # Strip baseline.html's existing title / canonical / description / og so
    # we don't double up after injection.
    cleaned = _TITLE_RE.sub("", rendered_html, count=1)
    cleaned = _EXISTING_BASE_RE.sub("", cleaned, count=1)
    cleaned = _EXISTING_CANONICAL_RE.sub("", cleaned, count=1)
    cleaned = _EXISTING_META_DESC_RE.sub("", cleaned, count=1)
    cleaned = _EXISTING_OG_RE.sub("", cleaned)
    match = _HEAD_OPEN_RE.search(cleaned)
    if not match:
        raise RuntimeError("No <head> tag found in rendered HTML.")
    insert_at = match.end()
    return cleaned[:insert_at] + "\n" + head_block + "\n" + cleaned[insert_at:]


def _write_route(route: dict, html_text: str) -> Path:
    out_dir = REPO_ROOT / route["slug"]
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "index.html"
    out_path.write_text(html_text, encoding="utf-8")
    return out_path


def _prerender_route(page, base_url: str, route: dict, build_iso: str) -> Path:
    page.add_init_script(
        f"window.__INITIAL_TAB = {json.dumps(route['tab'])};"
        " window.__PRERENDER_MODE = true;"
    )
    page.goto(f"{base_url}/{SHELL_PATH}", wait_until="domcontentloaded")
    try:
        page.wait_for_function(
            "window.__PRERENDER_READY__ === true", timeout=READY_TIMEOUT_MS
        )
    except PlaywrightTimeoutError:
        print(
            f"  [warn] {route['slug']}: __PRERENDER_READY__ not set within "
            f"{READY_TIMEOUT_MS} ms; snapshotting anyway.",
            file=sys.stderr,
        )
    # One more rAF tick so any pending paint flushes.
    page.evaluate(
        "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))"
    )
    raw = page.content()
    out_html = _inject_head(raw, _head_injection(route, build_iso))
    return _write_route(route, out_html)


def _write_sitemap(routes: Iterable[dict], build_date: str) -> Path:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for r in STATIC_ROUTES:
        lines.append("  <url>")
        lines.append(f'    <loc>{SITE_ORIGIN}{r["url_path"]}</loc>')
        lines.append(f"    <lastmod>{build_date}</lastmod>")
        lines.append("  </url>")
    for r in routes:
        lines.append("  <url>")
        lines.append(f'    <loc>{SITE_ORIGIN}/{r["slug"]}/</loc>')
        lines.append(f"    <lastmod>{build_date}</lastmod>")
        lines.append("  </url>")
    lines.append("</urlset>")
    out = REPO_ROOT / "sitemap.xml"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out


def _write_robots() -> Path:
    out = REPO_ROOT / "robots.txt"
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        f"Sitemap: {SITE_ORIGIN}/sitemap.xml\n"
    )
    out.write_text(content, encoding="utf-8")
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Prerender the Almanac SPA.")
    parser.add_argument(
        "--only",
        action="append",
        default=None,
        help="Restrict to one or more route slugs (repeat for multiple).",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Print per-step timings."
    )
    args = parser.parse_args()

    routes = ALMANAC_ROUTES
    if args.only:
        wanted = set(args.only)
        routes = [r for r in ALMANAC_ROUTES if r["slug"] in wanted]
        missing = wanted - {r["slug"] for r in routes}
        if missing:
            print(f"Unknown slug(s): {sorted(missing)}", file=sys.stderr)
            return 2

    now = dt.datetime.now(dt.timezone.utc)
    build_iso = now.isoformat(timespec="seconds").replace("+00:00", "Z")
    build_date = now.date().isoformat()

    print(f"Prerendering {len(routes)} route(s) into {REPO_ROOT}")
    todo_descriptions = [r for r in routes if r["description"] is None]
    if todo_descriptions:
        slugs = ", ".join(r["slug"] for r in todo_descriptions)
        print(f"  [note] description=None placeholders for: {slugs}")

    with _local_server(REPO_ROOT) as base_url:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            # ignore_https_errors=True: forecast.js fetches the US topo from
            # cdn.jsdelivr.net at runtime. Some build/CI environments lack a
            # complete CA bundle for chromium and reject the cert, which would
            # block mapsReady() from ever firing.
            context = browser.new_context(
                viewport={"width": 1280, "height": 900},
                ignore_https_errors=True,
            )
            try:
                for route in routes:
                    t0 = time.time()
                    page = context.new_page()
                    try:
                        out_path = _prerender_route(
                            page, base_url, route, build_iso
                        )
                    finally:
                        page.close()
                    rel = out_path.relative_to(REPO_ROOT)
                    if args.verbose:
                        print(f"  {route['slug']:<14} -> {rel} ({time.time() - t0:.1f}s)")
                    else:
                        print(f"  {route['slug']:<14} -> {rel}")
            finally:
                context.close()
                browser.close()

    sitemap = _write_sitemap(routes, build_date)
    robots = _write_robots()
    print(f"  sitemap        -> {sitemap.relative_to(REPO_ROOT)}")
    print(f"  robots         -> {robots.relative_to(REPO_ROOT)}")
    if todo_descriptions:
        print(
            "\nTODO: fill in description=None entries in prerender/routes.py "
            "for: " + ", ".join(r["slug"] for r in todo_descriptions)
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
