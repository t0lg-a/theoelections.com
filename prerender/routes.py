"""Route configuration for build-time prerendering.

Single source of truth for which Almanac tabs get prerendered, the URL slug
each lives at, and the per-route SEO metadata that gets injected into the
prerendered <head>.

Each entry:
    slug         URL path segment. The prerendered file is written to
                 <repo-root>/<slug>/index.html. The route's canonical URL is
                 https://theoelections.com/<slug>/.
    tab          Exact tab label string the React App uses for state. The
                 prerender script sets window.__INITIAL_TAB to this value
                 before navigating, so the SPA renders that tab first.
    title        <title> + og:title text. Default pattern is
                 "<Page Name> | theoelections.com" via DEFAULT_TITLE; per
                 route can override with an explicit string.
    description  <meta name="description"> + og:description. Target 140-160
                 characters, page-specific. None means TODO (script will
                 leave a placeholder and warn).

Add or rename routes here only; the prerender script reads this file.
"""

SITE_ORIGIN = "https://theoelections.com"
DEFAULT_TITLE_SUFFIX = " · Theo · Election Forecast"


def _default_title(page_name: str) -> str:
    return f"{page_name}{DEFAULT_TITLE_SUFFIX}"


# Order = order in sitemap.xml + order the prerender script walks them.
ALMANAC_ROUTES = [
    {
        "slug": "model",
        "tab": "Model",
        "page_name": "Model",
        "title": _default_title("Model"),
        "description": (
            "The daily forecast for the 2026 Senate, Governor and House "
            "races: win probabilities, expected seats, the seat histogram, "
            "and the map behind each."
        ),
    },
    {
        "slug": "ratings",
        "tab": "Ratings",
        "page_name": "Ratings",
        "title": _default_title("Ratings"),
        "description": (
            "Race ratings across the 2026 Senate, Governor and House maps — "
            "Safe, Likely, Lean and Tossup — drawn from the daily forecast "
            "rather than assigned by hand."
        ),
    },
    {
        "slug": "florida",
        "tab": "Florida",
        "page_name": "Florida",
        "title": _default_title("Florida"),
        "description": (
            "Florida's mid-decade congressional redistricting, district by "
            "district: the old lines, the new lines, and what each seat did "
            "the last time it was asked."
        ),
    },
    {
        "slug": "polls",
        "tab": "Polls",
        "page_name": "Polls",
        "title": _default_title("Polls"),
        "description": (
            "Every tracked poll of the 2026 cycle: the generic ballot, the "
            "Senate races and the governor races, with a state-by-state "
            "chart and the full polling record."
        ),
    },
    {
        "slug": "swingometer",
        "tab": "Swingometer",
        "page_name": "Swingometer",
        "title": _default_title("Swingometer"),
        "description": (
            "Drag a national vote share and watch the 2026 Senate, Governor "
            "and House maps swing with it — a live what-if over the whole "
            "midterm map, seat by seat."
        ),
    },
    {
        "slug": "past-elections",
        "tab": "Past Elections",
        "page_name": "Past Elections",
        "title": _default_title("Past Elections"),
        "description": (
            "How the forecast finished against the result, cycle by cycle: "
            "the past Senate, Governor and House calls set beside what "
            "actually happened on the night."
        ),
    },
    {
        "slug": "state-legs",
        "tab": "State Legs.",
        "page_name": "State Legislatures",
        "title": _default_title("State Legislatures"),
        "description": (
            "Party control of all ninety-nine state legislative chambers, "
            "with the House, Senate and split-control maps and what the "
            "2026 cycle puts on the table."
        ),
    },
    {
        "slug": "projects",
        "tab": "Projects",
        "page_name": "Projects",
        "title": _default_title("Projects"),
        "description": (
            "Standalone analyses, dashboards and election-night coverage "
            "from theoelections.com — an index of the one-off projects that "
            "sit outside the daily forecast."
        ),
    },
    {
        "slug": "methodology",
        "tab": "Methodology",
        "page_name": "Methodology",
        "title": _default_title("Methodology"),
        "description": (
            "How the theoelections.com forecast works: the signals it reads, "
            "the weighting it applies, the corrections it makes, and how the "
            "simulation is run."
        ),
    },
]


# Already-static, already-indexed pages. NOT prerendered (they're hand-built
# HTML at the repo root). Listed here so sitemap.xml can include them.
STATIC_ROUTES = [
    {
        "url_path": "/",
        "title": "Theo · Election Forecast 2026",
    },
    {
        "url_path": "/primary_turnout_combined.html",
        "title": "Primary turnout · Theo · Election Forecast",
    },
    {
        "url_path": "/nationalization-2.html",
        "title": "Nationalization · Theo · Election Forecast",
    },
    {
        "url_path": "/fundraising-comparison.html",
        "title": "Texas Senate fundraising · Theo · Election Forecast",
    },
]
