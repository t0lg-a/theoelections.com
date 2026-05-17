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
DEFAULT_TITLE_SUFFIX = " | theoelections.com"


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
            "Daily forecast for the 2026 Senate, Governor, and House races. "
            "Win probabilities, expected seats, and simulation histograms."
        ),
    },
    {
        "slug": "ratings",
        "tab": "Ratings",
        "page_name": "Ratings",
        "title": _default_title("Ratings"),
        "description": (
            "Race ratings across the 2026 Senate, Governor, and House maps: "
            "Safe, Likely, Lean, and Tossup, drawn from the daily forecast."
        ),
    },
    {
        "slug": "florida",
        "tab": "Florida",
        "page_name": "Florida",
        "title": _default_title("Florida"),
        "description": None,  # TODO: write a Florida-specific description (140-160 chars).
    },
    {
        "slug": "polls",
        "tab": "Polls",
        "page_name": "Polls",
        "title": _default_title("Polls"),
        "description": (
            "Tracked polls for the 2026 cycle: generic ballot, Senate races, "
            "and gubernatorial races, with state-by-state polling charts."
        ),
    },
    {
        "slug": "swingometer",
        "tab": "Swingometer",
        "page_name": "Swingometer",
        "title": _default_title("Swingometer"),
        "description": (
            "Drag a national vote share and watch the 2026 Senate, Governor, "
            "and House maps swing. Live what-if for the U.S. midterm map."
        ),
    },
    {
        "slug": "past-elections",
        "tab": "Past Elections",
        "page_name": "Past Elections",
        "title": _default_title("Past Elections"),
        "description": None,  # TODO: write a Past Elections description (140-160 chars).
    },
    {
        "slug": "state-legs",
        "tab": "State Legs.",
        "page_name": "State Legislatures",
        "title": _default_title("State Legislatures"),
        "description": None,  # TODO: write a State Legislatures description (140-160 chars).
    },
    {
        "slug": "projects",
        "tab": "Projects",
        "page_name": "Projects",
        "title": _default_title("Projects"),
        "description": (
            "Standalone analyses, dashboards, and election-night coverage "
            "from theoelections.com. An index of one-off election projects."
        ),
    },
    {
        "slug": "methodology",
        "tab": "Methodology",
        "page_name": "Methodology",
        "title": _default_title("Methodology"),
        "description": (
            "How the theoelections.com forecast works: signals, weighting, "
            "corrections, simulation, and the forecast-vs-nowcast distinction."
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
        "title": "Primary turnout, combined",
    },
    {
        "url_path": "/nationalization-2.html",
        "title": "Nationalization 2",
    },
    {
        "url_path": "/fundraising-comparison.html",
        "title": "Fundraising comparison",
    },
]
