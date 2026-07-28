# The grand visual pass

Twelve chapters, twenty-four steps each. 288 steps.

The site is already on one system: paper and ink, Switzer and Author, one
divergent data ramp, radius and elevation zero. This plan is what remains —
the parts the first pass covered by sweep rather than by decision, the parts
that were deferred, and the parts nobody has looked at yet.

**How to read a step.** Every step is one change with one way to tell it
worked. A step that cannot be checked is not a step, it is a wish. Where a
step is a decision rather than a change, it says so and names what the
decision governs.

**Status.** Mark a step `[x]` only when the change is in and verified in a
browser, not when the edit is written. `[-]` means deliberately declined,
with the reason on the line.

**Order.** Chapters run in dependency order: the token layer first, the proof
harness last, because the harness asserts what the earlier chapters decide.
Within a chapter, steps are independent unless numbered consecutively with a
shared subject.

---

## Chapter 1 · Foundations: the token layer

The tokens are the contract. Everything downstream reads them, so an
inconsistency here is an inconsistency everywhere. This chapter makes the set
minimal, owned, and provably closed.

1. [x] 19 tokens; d3, d4 and d6 had no reader.
   Original step: Inventory every `--t-*` token and record where it is defined and every
   place it is read; delete any with no reader.
2. [x] Removed. The site draws two-way contests only; the six-colour order is kept in a comment so a multi-series figure re-opens the palette deliberately.
   Original step: Decide whether `--t-d3`, `--t-d4` and `--t-d6` have a use on this site; give
   them one (multi-series figures) or remove them from the root.
3. [x] Two grounds now, paper and the well. The record's row separation became `--t-row-rule` rather than a third near-paper alpha.
   Original step: Replace the three near-paper values in circulation (`#E9E8E0`, `#E0DFD5`,
   `#fafafa` remnants) with exactly two: paper and the well.
4. [x] `--t-fs-1` to `--t-fs-8`, adopted in theme.css and index.html.
   Original step: Promote the type scale to tokens `--t-fs-1` through `--t-fs-8` and replace
   every literal `rem` size in theme.css.
5. [x] `--t-sp-1` to `--t-sp-6`, adopted.
   Original step: Promote the spacing scale to tokens and replace every literal `px` gap.
6. [x] `--t-w-hair`, `--t-w-rule`, `--t-w-contour`, `--t-w-slab`, adopted.
   Original step: Promote the rule weights to tokens: hairline 1px, rule 1.5px, contour 2px,
   slab 9px. Replace literals.
7. [x] `--t-ink3` at 6.28:1 now carries the decode gate, the source line and the map hint, which were on muted at 4.29:1.
   Original step: Add `--t-ink3` for the third prose level and stop reaching for opacity to
   get it.
8. [x] `scripts/check-tokens.mjs`: colour literals, pure white and black, unread tokens, undefined tokens, missing dark counterparts.
   Original step: Write `scripts/check-tokens.mjs`: fail if any colour literal appears in
   theme.css outside the `:root` blocks.
9. [x] Green. It found the white district strokes on the way.
   Original step: Run the checker; fix what it finds; commit the checker with the fix.
10. [x] Subset to Basic Latin, Latin-1, Latin Extended-A and the system's punctuation: 175,616 to 142,504 bytes, 33,112 saved. Separately, the four retired faces (Eczar, JetBrains Mono, Newsreader, Old Standard TT) were still being shipped and are now deleted: 537,668 bytes.
    Original step: Subset Switzer and Author to the codepoints the site actually uses;
    measure and record the byte saving.
11. [x] `swap`, on evidence. Cumulative layout shift measured at 0.0027 with fonts immediate and 0.0087 with fonts delayed 600ms, both far under the 0.1 threshold, so `optional` would trade a real risk of never showing the tabular figures for nothing.
    Original step: Decide `font-display`: `swap` (current) versus `optional`; test both for
    layout shift on a cold load and keep the measured winner.
12. [x] Two metric-matched fallback faces. The ratios are measured, not guessed: xn0Hg sets 2.9440em in Switzer against 3.2486em in the resolved sans fallback, 2.5110em in Author against 2.7222em in the serif.
    Original step: Add `size-adjust`, `ascent-override` and `descent-override` to the
    fallback stacks so the fallback does not reflow the page.
13. [x] Tabular is the body default and prose opts out; verified only prose contexts do.
    Original step: Verify tabular figures are on in every numeric context and off in prose;
    fix the contexts that inherit the wrong one.
14. [x] Author now carries oldstyle proportional figures in every context it appears, including the landing lede and the project deks.
    Original step: Add `font-variant-numeric: oldstyle-nums proportional-nums` to every
    Author context still rendering lining figures.
15. [x] `color-scheme` follows the ground; light and dark both verified to resolve.
   Original step: Add `color-scheme: light dark` so form controls, scrollbars and the
    caret follow the ground instead of the OS.
16. [x] One block, one line per value, each with its reason.
   Original step: Move every dark-ground override into one block, one line per value, each
    with a note on why it differs from its light counterpart.
17. [x] Measured on the ink ground: d1 3.58:1, d5 3.70:1, d2 11.15:1. All clear 3:1.
   Original step: Verify each data ink still clears 3:1 against the ink ground in dark;
    adjust the dark-only ink values, never the light ones.
18. [x] `prefers-contrast: more` promotes hairlines to rules and lifts muted.
   Original step: Add a `prefers-contrast: more` variant that promotes hairlines to rules
    and muted to ink2.
19. [x] `forced-colors: active` maps the ramp to system colours and keeps the map marks.
   Original step: Add a `forced-colors` block so Windows high-contrast mode does not lose
    the figures entirely.
20. [x] Every token carries its permitted scope.
   Original step: Give every token a one-line comment naming its permitted scope.
21. [x] `data-look` is never set by the app, and `:root:root` overrides every colour `data-palette` sets.
   Original step: Confirm the `:root:root` rebinding still wins against every
    `[data-palette]`, `[data-look]` and `[data-theme]` block in baseline.html.
22. [x] Deleted.
   Original step: Delete the `[data-palette="foundry"]` and `[data-palette="atlas"]` blocks
    now that nothing can reach them.
23. [x] Deleted. baseline.html 221,427 to 208,950 bytes, 12,477 saved (5.6 per cent).
   Original step: Delete the `html[data-look="riso"]` override blocks for the same reason;
    measure the CSS byte count before and after.
24. [x] Frozen in the header.
   Original step: Freeze the token list in a header comment as the contract, and note that
    changing it means reopening the system rather than iterating it.

---

## Chapter 2 · The masthead and the chrome

The chrome is the first thing rendered and the last thing anyone looks at.
It should be quiet, aligned, and identical on every page including the ones
that are not the app.

1. [x] Written down in `assets/theme.css` §13 [2.1]: wordmark, tagline, nav,
   actions, in that reading order. Everything past those four is removal.
   Original step: Decide the masthead's canonical content: wordmark, tagline, nav, actions.
    Write it down; everything else is removal.
2. [x] `theme.css` owns `.top > .brand + .nav + .actions` — layout, slab and
   type. The landing sheet writes the same markup and deleted its own copy;
   its masthead is now 53px at 1440 and 65px at 390, the same as the app's.
   Original step: Set the wordmark once, in one place, and have the landing page and the app
    read the same rule rather than two copies.
3. [x] `scripts/shoot_masthead.py` asserts `borderBottomWidth == 9px` on
   `.top` at five widths on both grounds, and nothing else draws under it.
   Original step: Verify the slab is the masthead's only bottom rule at every width, with no
    second hairline anywhere near it.
4. [x] Brand and nav share one 1.35 line box. The 1024 wrap is gone: the nav
   takes its own row from 761 to 1199 rather than wrapping ragged inside a
   flex row.
   Original step: Align the brand baseline to the nav baseline at every width, including the
    1024 two-row wrap.
5. [x] It survives to 761, where the two-row masthead gives the brand a line
   it does not have to share, and is dropped below. It never wraps: it used
   to set three lines at 1024 and take the masthead to 81px.
   Original step: Decide whether the tagline survives below 900px or is dropped; implement.
6. [x] A 2px ink rule, reserved as transparent on every label so marking one
   moves none.
   Original step: Give the active nav item a rule, not a colour, and check it reads at a
    glance from two metres.
7. [x] Hover is 700 weight. Each label reserves its own bold width in a
   zero-height `::after` carrying `data-label`, so going bold shifts nothing.
   Original step: Give nav hover a weight change rather than a colour change, and confirm it
    does not shift layout.
8. [x] The markup already carried the middot and the sheet drew a second one
   in a `::before`, so every separator was set twice. The `::before` is gone;
   `drawnDots` is asserted at 0.
   Original step: Set the nav separator as the typographic middot everywhere, and confirm no
    drawn dot survives in any tab.
9. [x] It is the word `dark` or `light` — the ground it will switch to. The
   sun and the crescent were two pictograms in a system that has none.
   Original step: Decide the theme toggle's glyph: currently a moon and a sun. Replace with
    a typographic mark or a word, per the no-pictogram rule.
10. [x] `aria-label="Switch to the … ground"` and `aria-pressed`, in the app
    and in `assets/ground.js` for the pages without React.
    Original step: Give the theme toggle an accessible name and a pressed state.
11. [x] Donate is the only reversed element at rest and on hover; the toggle
    hovers to `--t-paper-2` rather than filling with ink.
    Original step: Make the Donate button the single reversed element in the masthead and
     confirm nothing else competes.
12. [x] `--t-control-h`, 32px and 44px on a phone by rebinding the token.
    `check-tokens.mjs` rule 6 fails the build on a control that sets its own
    height.
    Original step: Set one height for every masthead control and assert it in the checker.
13. [x] Tabbed and recorded: skip link, the nine nav labels in reading order,
    the ground toggle, Donate, then the first control in the sheet.
    Original step: Give the whole masthead a visible focus order that matches its reading
     order; tab through it and record the sequence.
14. [x] `.skiplink` — first in the tab order, off-canvas until focused, drawn
    as a reversed slab. `#main` is the target on both the app and the landing.
    Original step: Add a skip link to the first figure, styled in the system, visible only
     on focus.
15. [x] Decided: it does not stick. It is 53px and a 9px slab at desktop and
    93px at tablet, and sticking it parks that slab over the figure being
    read. Recorded in `theme.css` §13 [2.15].
    Original step: Decide whether the masthead sticks on scroll; if yes, give it a rule that
     only appears once the page has moved.
16. [x] It does, measured: 53px at 1440 and 1920, 65px at 390, same rule and
    same tokens. Two drifts were found doing it — the landing's Donate was an
    `<a>` with an underline, and it was two pixels taller because that page
    does not reset `box-sizing`.
    Original step: Verify the masthead on the landing page, which uses its own markup, now
     matches the app's to the pixel.
17. [~] Partial, on purpose. The three analyses now carry the mark, the
    browser-chrome colour, the card and the title pattern. The masthead
    itself waits for Chapter 11: those pages still run their own palettes
    under their own token names, and giving them the system's masthead
    before converting the sheet would leave the worst of both on one page.
    Original step: Verify it on the three standalone project pages, which have never had it.
18. [x] One pattern everywhere: `<Page> · Theo · Election Forecast`, set in
    `prerender/routes.py`. The three `None` descriptions were placeholders
    that shipped; all nine are now written and every one lands in the
    140–160 character target the module documents. The Methodology
    description still promised a forecast-vs-nowcast distinction that was
    deleted in the first task.
    Original step: Set the page title pattern for every route and check the browser tab text
     for each.
19. [x] `assets/icon.svg`: the ink ground, the wordmark's initial and the
    masthead's slab. It replaced a 58 kB crop of a Senate panel.
    Original step: Replace the favicon with a mark cut from the system: a slab, not a
     photograph.
20. [x] `apple-touch-icon.png` at 180 and `assets/icon-maskable.png` at 512
    inside the 80% safe zone, both drawn by `scripts/build_icons.py`, plus
    `site.webmanifest` to name them.
    Original step: Add the apple-touch-icon and the maskable variant.
21. [x] `<meta name="theme-color" data-ground>` on every page, repainted from
    `--t-paper` by `ground.js` when the ground changes.
    Original step: Add `theme-color` for light and dark so the mobile browser chrome matches
     the ground.
22. [x] `preview.png`, drawn: masthead, kicker, the claim at 96px, the lede,
    the source rule. It replaced a 243 kB screenshot that still showed the
    Forecast/Nowcast control deleted in the first task.
    Original step: Add the Open Graph image as a broadcast card drawn in the system rather
     than a screenshot.
23. [x] Rendered and read at 1200×630; the claim fills 17ch at 96px and is
    the one thing that survives the thumbnail.
    Original step: Verify the OG card renders at 1200×630 with the finding legible at
     thumbnail size.
24. [x] `docs/shots/` holds twenty: the app and the landing sheet, five
    widths each, on both grounds, written by `scripts/shoot_masthead.py` —
    which also prints the measurements, so a regression shows up as a number
    and not only as a picture.
    Original step: Take a masthead screenshot at 390, 768, 1024, 1440 and 1920 and put the
     five in `docs/shots/` as the reference.

**Also fixed while here.** The ground was not the ground: `baseline.html`
washed the body with an indigo and a red radial gradient and swapped the ink
ground for a near-black of its own, both `!important`, so the dark sheet was
tinted blue on the left and red on the right. Answered in `theme.css` §3 with
a doubled `:root`; both grounds now sample flat at every x. The ground was
also being decided in a React effect, which flashed paper at a reader who
chose ink — `assets/ground.js` now settles it before the first paint, and the
landing sheet, which had no ground switch at all, reads the same choice.

---

## Chapter 3 · The sheet: grid, measure, rhythm

The three-column sheet is the site's structure. It currently aligns because
two `min-height` reservations force it to. This chapter makes it align because
the grid says so.

1. [x] `.pollsView .cols` now has five rows — head, note, display figure,
   body, source — and each `.col` takes `grid-row:1/-1` with
   `grid-template-rows:subgrid`. Only the body stretches.
   Original step: Replace the `min-height` reservations with a real subgrid: give `.cols` its
    row template and let each `.col` inherit it.
2. [x] Both polls sections wrap their tail in `.colBody`, so subgrid has a
   row to stretch and the source line has one of its own.
   Original step: Wrap everything after `.seats` in one child element in both polls sections
    so subgrid has a row to align.
3. [x] Measured at 981, 1024, 1280, 1440, 1920 and 2560: head tops, head
   rules, notes, display figures, body tops and source lines all agree to
   the pixel, and the three columns finish the same height.
   Original step: Verify the display figures set on one line at 981, 1024, 1280, 1440, 1920.
4. [x] Gone. The reservation cost 30px above the figures at 1280 and up; the
   display figures moved from y=262 to y=232 and the column from 971/980/989
   to a uniform 957.
   Original step: Verify the reserved whitespace above the head rule is gone at 1281+.
5. [x] `--t-sheet`, 1480px, which is three 460px columns after the sheet's
   own padding. Above that the sheet centres rather than grows.
   Original step: Decide the sheet's maximum measure and stop the columns growing past it at
    1920 and above.
6. [x] `--t-gutter`. It is the column's inner padding and the offset every
   rule inside a column is measured from.
   Original step: Set the gutter as a token and use it for the column padding and the rule
    offsets alike.
7. [x] Measured, not eyeballed: the first column's left edge and the last
   column's right edge sit 0px from the masthead's, at all six widths.
   Original step: Align the outer columns to the masthead's outer edge, and prove it with a
    pixel measurement rather than by eye.
8. [x] `--t-baseline`, 8px. The section head is 8 under its dek and 16 to the
   note.
   Original step: Establish a baseline grid unit and snap the section heads to it.
9. [x] Every figure block opens the same way: 16 of air, the hairline, 16
   back to the figure. The record's wrap was a fourth variant of the same
   idea and now shares the rule.
   Original step: Snap the figure blocks to the same unit.
10. [x] The record's row is 24px — three units — and was already on it.
    Original step: Snap the record's row height to the same unit.
11. [x] Counted: 403 horizontal rules on the sheet at 1440, of which 264
    belonged to the record's 44 rows. `polls.js` was drawing a border on
    every `<tr>` and `assets/theme.css` another on every `<td>`, so each row
    line had two owners; the same went for the header rule. 45 rules
    deleted, none of them visible, all of them a second thing to change.
    Original step: Audit every horizontal rule on the sheet and delete the ones that are not
     earned; count before and after.
12. [x] Decided and recorded below: ink opens a column, the hairline
    separates blocks inside one, the row rule is quieter than a hairline,
    and everything else is whitespace.
    Original step: Decide the rule hierarchy: which separations are ink, which are hairline,
     which are whitespace alone.
13. [x] Applied and checked: no two rules survive within 26px of each other
    with nothing between them. The only near-pairs left are the masthead's
    slab and the columns' opening rule, 22px apart at different weights,
    which is a close followed by an open rather than a doubled rule.
    Original step: Apply that hierarchy across all three columns and check no two adjacent
     rules survive.
14. [x] 56ch and 64ch, verified at nine widths from 320 to 2560: no block
    exceeds its measure at any of them.
    Original step: Set the maximum measure for the dek at 56ch and the decode line at 64ch,
     and verify no line exceeds it at any width.
15. [x] "What gubernatorial polling says, state by state" broke as
    "…says, state / by state" at 981 and 1024. Fixed with `text-wrap:balance`
    on the title and `pretty` on the running blocks — by measure, with no
    hard break and no rewritten copy.
    Original step: Fix the two-word widow in the third column title, by measure rather than
     by a hard break.
16. [x] Confirmed: the national picture, then the Senate map, then the
    governor map. The reader wants the country before the chamber.
    Original step: Decide the stacking order on mobile: currently generic ballot, senate,
     governor. Confirm it is the reading order you want.
17. [x] Each stacked column keeps its 1px ink opening rule, verified at 320
    and 768.
    Original step: Give the stacked columns a rule between them on mobile so the sections
     stay distinct.
18. [x] Four baseline units, from the token.
    Original step: Set the vertical rhythm between stacked columns as one token.
19. [x] 320 lays out, stacks, and does not scroll sideways; nothing overruns
    the viewport.
    Original step: Verify the sheet at 320px, which nothing has been tested at.
20. [x] 2560 is identical to 1920: the sheet stops at its measure and
    centres.
    Original step: Verify the sheet at 2560px.
21. [x] 1024×1366 portrait holds the three columns and reads.
    Original step: Verify the sheet at 1024 in portrait, which is a real tablet case.
22. [x] `assets/theme.css` §14. The ground is dropped so the stock shows
    through, the chrome goes, the three columns become one, figures avoid a
    page break and keep their titles, the record prints whole rather than the
    260px of it that fits a screen, and a source link's destination is
    written out.
    Original step: Add a print stylesheet: paper ground, ink type, figures at full width, no
     chrome.
23. [x] Both rendered to `docs/shots/polls-print.pdf` and
    `docs/shots/methodology-print.pdf` at A4.
    Original step: Verify the print layout for the polls sheet and the methodology page.
24. [x] Below.
    Original step: Record the grid decisions in this file so the next change has something to
     violate knowingly.

### The grid decisions

**The sheet.** One measure, `--t-sheet` at 1480px, centred. Three columns of
1fr with a 1px hairline between them. The outer columns are flush with the
masthead's outer edge; the gutter is inner padding only. Below 981 the
columns stack in source order.

**The rows.** Five, shared by all three columns through subgrid: the head,
the note, the display figure, the body, the source. Only the body stretches.
Nothing reserves height; if a head is one line shorter than its neighbour,
the difference lands under the dek, where it belongs, and not above the
figures.

**The rule hierarchy.**

| weight | what it means | where |
|---|---|---|
| 9px ink slab | the masthead closes | `.top` |
| 1px ink | a column opens | `.col` |
| 1px hairline | a block ends inside a column | `.secHead`, `.mapBlock`, `.probBlock`, `.pollsListWrap`, `.t-src` |
| 1px row rule | one record from the next, quieter than a hairline | the record's `td` |
| nothing | everything else | |

Two rules never sit within 26px of each other with nothing between them. A
rule has exactly one owner: if the sheet draws it, the module must not.

**The rhythm.** `--t-baseline` is 8px. Section heads, figure blocks, the
record's rows and the gap between stacked columns are all multiples of it.

**The measures.** A dek stops at 56ch, a decode line at 64ch. A title takes
the column it lives in and balances its own lines.

---

## Chapter 4 · Type and the voice

Two faces, three voices: the label, the finding, the prose. This chapter makes
each one consistent everywhere it appears.

1. [x] Enumerated by measurement, not by reading the sheet: seventy-six
   distinct combinations of face, size, weight, tracking and leading across
   the nine tabs. Eleven of the sizes in use were not on the scale at all —
   9, 9.5, 10, 12.5, 13.5, 14, 14.5, 16, 20, 22, 24.
   Original step: Enumerate every text style in use and map each to label, finding or prose.
2. [x] Down to fifty-seven, and every non-SVG element on every tab now sits
   on the scale. The map's own labels are drawn by d3 and belong to
   chapter 7.
   Original step: Delete any style that is none of the three.
3. [x] `assets/theme.css` §15. One rule, read by every label on the site.
   Original step: Set the label voice once — bold, lowercase, no tracking — and have every
    label read it.
4. [x] Twenty-eight in `baseline.html`, four in the app, and one each in
   `forecast.js`, `ratings.js` and `fl_redistricting.js`: the chart toggles,
   the axis labels, the zoom control, the year label, the kickers, and every
   map hint.
   Original step: Find every remaining Title Case label and lowercase it; the map hints, the
    chart toggles, the zoom controls.
5. [x] Ten tracked labels found and untracked. At 10px, the 1.5px on the
   worst of them was 15% of an em — not emphasis, damage.
   Original step: Find every remaining letter-spaced label and remove the tracking.
6. [x] Verified by computed style across all nine tabs: no `text-transform`
   survives, including the ones `state-legs.js` injected at runtime.
   Original step: Verify no `text-transform` survives anywhere, including inline styles in
    the JS modules.
7. [x] None.
   Original step: Verify no `font-variant: small-caps` survives.
8. [x] None: every element resolves `font-style: normal`.
   Original step: Verify no synthesised italic survives; Switzer has no italic and the
    browser's oblique is not a substitute.
9. [x] `assets/theme.css` §15, with `text-wrap: balance` so a finding is
   never left with a two-word last line.
   Original step: Set the finding voice once — 800 weight, tight tracking, 32ch measure.
10. [x] Audited: seven titles named a form. Each now states its finding, and
    each is written from the same numbers the figure draws, so a title can
    never disagree with the picture under it.
    Original step: Audit every figure title: does it state a finding or name a form? Rewrite
     the ones that name a form.
11. [x] It had none at all. `buildSectionData` now carries the central 80%
    interval in seats and the histogram is titled "Eight runs in ten land
    Democrats between 47 and 55".
    Original step: Write the finding for the seat histogram, which currently has none.
12. [x] "Democrats hold the Senate in 54% of runs", and on the other toggle
    "Democrats average 51 of 100, and need 51".
    Original step: Write the finding for the win-probability chart, which says "Win
     probability".
13. [x] "Republicans are rated ahead in 17, Democrats in 15, and 3 are a
    tossup", and on the face-off toggle "3 races are a tossup; the other 32
    are not".
    Original step: Write the finding for the ratings bar.
14. [x] "Republicans take 51 of 100 on a national vote of D+8.0" — which is
    the whole point of a swingometer, and it moves with the slider.
    Original step: Write the finding for the swingometer's map.
15. [x] "The old lines give Republicans 18 of 28" / "The new lines give
    Republicans 20 of 28", recomputed on every slider move. They read "Old
    map · Forecast" before, which the sub-line already said.
    Original step: Write the finding for each Florida panel.
16. [x] `assets/theme.css` §15.
    Original step: Set the prose voice once — Author, oldstyle figures, 1.62 line height,
     64ch measure.
17. [x] The methodology body, lede, notes and rating descriptions, both
    project card deks and the landing lede are all on it; none is Switzer.
    Original step: Move the methodology body, the project deks and the landing lede onto it
     and check none of them is still Switzer.
18. [x] `--t-fs-8`, `clamp(2.2rem, 6vw, 3.9rem)`. The floor puts two
    four-glyph numbers inside a 288px column with room to spare.
    Original step: Set the display figure's scale as a clamp with a floor that survives 320px.
19. [x] It does not: -.05em closes the counters at 35px. Two values, split at
    the same 980 the sheet stacks at.
    Original step: Check the display figure's tracking at its smallest and largest size; one
     value will not serve both.
20. [x] The row is three baseline units, so the well is eleven whole rows
    rather than a round 260px that cut one in half. On a phone there is no
    well: a scroll inside a scroll is a trap on a touch screen, and the
    record flows into the page.
    Original step: Set the record's type size and line height so twenty rows fit a phone
     screen without scrolling inside a scroll.
21. [x] `text-wrap: pretty` on the deks, the decode lines and the source
    lines; verified at nine widths from 320 to 2560 with no block over its
    measure.
    Original step: Verify hyphenation and wrapping in the deks at narrow widths; add
     `text-wrap: pretty` where it helps.
22. [x] Checked at 390, 768, 1024, 1440 and 1920. What the check flags at
    the narrow end are two-word titles in a one-word-wide column — "Virginia
    / Governor" — which is a balanced wrap, not a widow. No heading is left
    with a short line under a long one.
    Original step: Verify no orphan or widow in any heading at the five reference widths.
23. [x] `lang="en"` on all six hand-written documents and all nine
    prerendered routes; no element carries another language.
    Original step: Add `lang` to every document and to any element carrying another language.
24. [x] Below, and in `assets/theme.css` §15.
    Original step: Record the three voices and their measures in this file.

### The three voices

| voice | face | size | weight | tracking | measure | for |
|---|---|---|---|---|---|---|
| label | Switzer | `--t-fs-2`, `--t-fs-1` at its smallest | 700 | 0 | — | naming a thing |
| finding | Switzer | `--t-fs-6`, `--t-fs-4` inside a figure | 800 | -.018em | the column | stating what was found |
| prose | Author | `--t-fs-4` | 400 | 0 | 64ch | running to a paragraph |

A label is never Title Case, never tracked, never a sentence. A finding is
the only voice allowed to be a claim, and it is always written from the
numbers the figure draws. Prose is the only serif and the only voice with
oldstyle figures; every other number on the site is tabular.

The display figure is not a voice. It is a datum, set in Switzer 900 on the
`--t-fs-8` clamp, and it is the only type on the site allowed past
`--t-fs-6`.

---

## Chapter 5 · Colour and the data palette

Colour appears only where a datum is. The site now obeys that. This chapter
proves it and settles the cases the sweep left ambiguous.

1. [x] `scripts/check_colour.py`. It crawls the running site with a real
   browser on both grounds and reads the computed colour of every element,
   because `check-tokens.mjs` asserts what a person wrote and this has to
   assert what the browser paints — the modules draw inks imperatively and a
   colour can arrive from four sheets at once.
   Original step: Write `scripts/check-colour.mjs`: crawl every route and fail on any colour
    outside the palette appearing outside a figure.
2. [x] 5,225 violations on the first run; zero now. The run also found two
   bugs in the checker itself: a margin fill is a data ink mixed toward the
   ground, so the map paints a continuum rather than seven swatches, and a
   separator drawn as a middot is a rule rather than text.
   Original step: Run it; record the violations; fix them one at a time.
3. [x] It does not stand. Muted was #6E6C61 at 4.29:1 and it carries every
   label on the site at 11 to 13 pixels — the smallest type here. "It is
   only a label" is not an argument when the label is what tells you what
   the number is.
   Original step: Settle the contrast question the audit raised: muted at 4.29:1 carries
    labels. Decide whether that stands or whether labels move to ink2.
4. [x] Moved instead, to #646257: 4.99:1 on the ground and 4.58:1 inside a
   well, so it clears the floor on both of the grounds it is ever set on
   rather than only the lighter one.
   Original step: If it stands, document why, naming the sizes and weights it is allowed at.
5. [x] Every text colour on nine tabs on two grounds, against the ground it
   is actually on rather than the one it was designed against — the checker
   walks up the tree for the first opaque background.
   Original step: Audit every text colour against its actual ground and record the ratio.
6. [x] 623 of them. Almost all were one mistake made in five places: a
   number set in a party ink. A party ink is 3.94:1 (D) and 4.07:1 (R) on
   paper, which clears the 3:1 floor for a display figure and nothing
   smaller — and every one of these already carried the letter D or R
   beside it, so the colour was saying the same thing twice at the cost of
   the number's legibility.
   Original step: Fix every ratio under 4.5:1 that carries meaning.
7. [x] 260 of them, all in the ratings bar: the count was set inside its own
   segment. On the two deepest tiers no foreground clears 4.5:1 against a
   data ink at 10px; on the pale tiers it read at 1.02:1, which is
   invisible. The number left the bar — the strip above it already carries
   the counts in ink with its own swatch — and the bar now shows the
   proportion, which is what a bar is for.
   Original step: Fix every ratio under 3:1 regardless of what it carries.
8. [x] Both grounds on every run. The ink ground's own failures were the
   same five, at 3.70:1 and 3.58:1.
   Original step: Verify the same ratios on the ink ground, which has different maths.
9. [x] Confirmed, not replaced. A reader who sees red and blue on an
   approval chart reads a partisan split that is not in the data.
   Original step: Decide the approval series' inks: currently ink and muted, deliberately not
    party colours. Confirm or replace.
10. [x] Decided: none, on purpose. The site draws two-way contests only, so
    `--t-d2` is reserved for a third position and used by nothing; an
    undecided share is not drawn at all, because the forecast no longer
    allocates it and absent is absent, not zero. A three-way race would open
    `--t-d2` deliberately rather than by reaching for a colour.
    Original step: Decide the third-party and undecided treatment, which currently has none.
11. [x] ΔE 88 from a maximal R and ΔE 66 from a maximal D. It is not a step
    on the ramp at all, which is the point: a contested race is a different
    claim, not a weak one.
    Original step: Verify the overprint is distinguishable from a maximal lead at a glance,
     with a side-by-side swatch test.
12. [x] On the ink ground it is ΔE 11.3 from the ground itself — thin, and
    recorded as the one place the overprint is doing least work.
    Original step: Verify the overprint is distinguishable in dark, where it inverts to a
     pale lilac.
13. [x] The midpoint is not a pale tint of either side: it is the overprint,
    ΔE 73 from the weakest lean the ramp draws. Nothing on this ramp reads
    as a neutral lean, because nothing on it is one.
    Original step: Check the divergent ramp for a perceptual midpoint that reads as neutral
     rather than as a weak lean.
14. [x] Measured in Lab: the R side steps 8.7, 11.8, 15.1, 14.9, 14.2 and
    the D side 7.6, 10.1, 12.8, 13.2, 13.9. Largest gap under 1.9x the
    smallest, well inside the 3x the check fails at.
    Original step: Check the ramp's steps are perceptually even, not evenly numbered.
15. [x] Nothing is lost. A maximal D and a maximal R separate by ΔE 148
    under deuteranopia, and the seven ratings steps keep a smallest
    neighbouring ΔE of 18.
    Original step: Simulate deuteranopia across the maps and record what is lost.
16. [x] ΔE 135 under protanopia and 114 under tritanopia; smallest ratings
    step 16.9 and 12.7. `docs/shots/ramp.svg` is the record.
    Original step: Simulate protanopia and tritanopia.
17. [x] The cue is needed, but not for the reason the step assumed. The ramp
    survives all three dichromacies. What it does not survive is losing hue
    altogether — greyscale — where a D lead and an R lead of the same size
    are the same value to within ΔE 0.89. `forecast.js` now writes the lean
    onto each shape as `data-lean`, and where hue is gone the contour
    carries direction: a Republican lean is outlined and dashed, a
    Democratic lean is not.
    Original step: Decide the redundant encoding for colour-blind readers: direct labels
     already help, but the ramp's direction does not survive. Add a second cue.
18. [x] Yes, under all three; the tightest is tritanopia at ΔE 12.7 between
    neighbours.
    Original step: Verify the ratings scale's seven steps remain distinguishable under
     simulation.
19. [x] The checker fails on any colour that is neither a token nor a step
    on the ramp, so an inverted or invented ink cannot survive a run. None
    did.
    Original step: Verify the two-way inks are used for the same meaning in every figure, and
     fix any inversion.
20. [x] The Florida sliders' D and R labels were the last of them. A slider
    is a control and a control's label is a label.
    Original step: Verify no tint of a data ink appears outside a figure.
21. [x] None. The checker asserts it on every element and every SVG fill and
    stroke.
    Original step: Verify no alpha is used on a data mark anywhere; alpha manufactures
     colours the palette does not contain.
22. [x] It survives as value; it does not survive as direction. That is a
    property of divergent ramps, not of this one, and the measurement is in
    `scripts/check_ramp.py`.
    Original step: Check the print stylesheet's colour: the ramp must survive greyscale.
23. [x] Added, but not "by value alone" — the measurement says value alone
    cannot carry direction on a divergent ramp, and a fallback that says
    "big margin" without saying whose is worse than no fallback. Direction
    is carried by the contour instead, in `@media print` and in
    `forced-colors: active`.
    Original step: Add a greyscale fallback for the maps that reads by value alone.
24. [x] None survive. Every case that looked like it wanted an exception
    turned out to be a swatch that had not been drawn yet: the ratings bar's
    legend, the counts strip, the methodology's rating table. The checker's
    exception list is empty and stays that way.
    Original step: Record the colour law's exceptions, if any survive, with their reasons.

### The colour law, as enforced

1. A colour is legal if it is a token, or a step on the ramp between a data
   ink and the ground. Nothing else is.
2. A saturated colour is legal only inside a figure.
3. A data ink may be a fill or a swatch at any size. As *text* it clears the
   3:1 floor only at display size; below that the number is ink and the
   swatch or the letter carries the party.
4. Text clears 4.5:1 against the ground it is actually on, 3:1 at display
   size, and 3:1 always. A glyph that is punctuation only is a rule, not
   text, and may be drawn in the quiet neutrals.
5. No alpha on a data mark. Two overlapping marks would make a third colour
   the palette does not contain.
6. Where hue is unavailable, direction is carried by the contour.

`python3 scripts/check_colour.py` asserts 1, 2, 4 and 5 against the running
site. `python3 scripts/check_ramp.py` asserts the ramp's evenness, its
midpoint, the overprint's separation and the three dichromacies, and writes
`docs/shots/ramp.svg`.

---

## Chapter 6 · The figure vessel

Axes, thresholds, marks, and the frame around them. The system reserves ink
inside a figure for the threshold; everything else is hairline.

1. Audit every axis on the site: domain path, ticks, labels, gridlines.
2. Set the domain path to hairline everywhere and confirm no ink frame
   competes with a threshold.
3. Set the tick length and offset as tokens and apply them.
4. Decide the gridline treatment: currently dashed hairline. Dashed is not in
   the system; replace or sanction.
5. Set the axis label size and colour once.
6. Verify the axis never renders fewer than two ticks at any width.
7. Verify the axis never renders more ticks than fit without collision.
8. Set the date format per width: `%b` narrow, `%b %d` wide.
9. Label every threshold that is currently unlabelled.
10. Verify every threshold is an ink rule at 1.5px, solid, full opacity.
11. Verify no other ink rule appears inside a figure.
12. Set the mark vocabulary: hollow ring for a single observation, solid line
    for an average, solid dot on the datum under the cursor.
13. Apply it to the generic-ballot chart.
14. Apply it to the state chart.
15. Apply it to the past-election charts.
16. Apply it to the swingometer's histogram.
17. Give the average line a break where there is no data behind it, rather
    than drawing at full weight across a gap.
18. Mark the first point of an average as provisional when a single poll is
    behind it.
19. Set the margin timeline's scale steps as tokens and label the scale.
20. Give the margin timeline an axis so a bar's height can be read.
21. Verify every figure has a source line.
22. Verify every novel form has a one-line decode gate.
23. Add alt text to every figure stating its finding.
24. Screenshot each figure form at its reference width into `docs/shots/`.

---

## Chapter 7 · Maps as figures

Geography obeys the colour law: hairline boundaries, fills from the data
palette, overprint for contested, paper for absent, no basemap, direct labels.

1. Verify every map fills absent units with paper, not a grey.
2. Verify every map draws boundaries as hairlines in faint.
3. Verify no map carries a basemap, graticule or relief.
4. Extend direct labels from the polls maps to the model maps.
5. Extend direct labels to the ratings maps.
6. Decide the label rule for units too small to hold one: currently skipped.
   Add leader lines or an inset, or sanction the omission.
7. Add the small-state inset column that every US map of this kind needs.
8. Verify the label flips to paper on a dark fill on every map, not just the
   polls maps.
9. Set the label size per map scale as a token.
10. Verify Alaska and Hawaii are positioned deliberately rather than by the
    projection's default.
11. Set the hover mark once and apply it to every map.
12. Set the selection mark once and apply it to every map that has selection.
13. Verify the hover mark reverses on a dark fill on every map.
14. Verify the selected unit is raised above its neighbours so its contour is
    never clipped.
15. Give every interactive map keyboard access: focusable units, Enter and
    Space, and a visible focus contour.
16. Give every map an accessible name and a description of what its fill
    means.
17. Add a text alternative to every map: a table of the same data, visually
    hidden.
18. Verify the county zoom's fills follow the same ramp as the state fills.
19. Verify the district maps follow the same ramp.
20. Verify the state-legislature maps follow the same ramp.
21. Set one aspect ratio policy for maps and a minimum height that keeps
    small units tappable on a phone.
22. Verify tap targets on the smallest states at 390px.
23. Decide whether the map tooltip follows the cursor or docks; docking is
    steadier on touch.
24. Screenshot every map at its reference width into `docs/shots/`.

---

## Chapter 8 · The record

Density lives in text. The record is the tables and the agate, and it should
be the easiest thing on the site to read.

1. Set the record's type size, weight and line height once.
2. Set the row rule as a hairline at the system's opacity and remove the
   others.
3. Remove every tinted header, every zebra stripe and every fill used to
   group.
4. Set the column alignment rule: label left, figure right, always.
5. Apply it to the polls record.
6. Apply it to the bucket tables on the model tab.
7. Apply it to the methodology's ratings table.
8. Set the sticky header's ground to paper and verify it does not smear.
9. Set the numeric columns to tabular figures and verify the decimal points
   line up.
10. Decide the pollster column's truncation: by measure, never by a character
    count in a template string.
11. Add a title attribute or a tooltip for a truncated name.
12. Verify the record scrolls inside its own container and never the page.
13. Give the scroll container a visible edge so the reader knows there is
    more.
14. Set the record's maximum height per breakpoint.
15. Decide whether the record is sortable; if yes, design the affordance in
    the system.
16. Add the agate form from the kit for the dense list cases the tables
    currently handle badly.
17. Use it for the ratings list.
18. Use it for the state list on the polls tab.
19. Give the marked rows the reversed treatment rather than a tint.
20. Verify no table has a caption that names its form instead of its finding.
21. Add `scope` to every header cell and a caption to every table.
22. Verify a screen reader reads every table in a sensible order.
23. Verify the record at 320px, where five columns cannot fit.
24. Decide the narrow-width record: horizontal scroll, or a stacked form.

---

## Chapter 9 · The states of a thing

Absent, loading, empty, hovered, selected, focused, disabled, error. Each is a
different claim and each should look like a different claim.

1. Write down the eight states and what each one asserts.
2. Design the absent vessel once: a two-unit ink contour with its word inside.
3. Apply it everywhere a figure has no data.
4. Design the loading state as hatching, distinct from absent.
5. Apply it everywhere a figure is still fetching.
6. Verify no loading state invents a plausible value; the 50/50 tie is fixed
   but audit for others.
7. Verify no loading state renders a display-size dash.
8. Design the error state and apply it where a fetch fails.
9. Verify the ratings house map's failure path uses it.
10. Verify the past-election maps' failure path uses it.
11. Design the empty-result state for the record, distinct from absent.
12. Set the hover mark for every interactive element, by weight or rule, never
    by colour alone.
13. Set the focus mark once: a 1px ink outline offset 2, and verify it is
    visible on every ground.
14. Verify every interactive element is reachable by keyboard.
15. Verify the focus order matches the reading order on every tab.
16. Verify no element has a focus mark that shifts layout.
17. Design the selected state for the maps, the year bar, the chart toggles
    and the chamber toggle as one treatment.
18. Verify the selected state survives a theme change.
19. Design the disabled state as faint at full opacity; nothing in the system
    fades.
20. Apply it to the zoom controls when nothing is zoomable.
21. Verify the tooltip's form is one vessel, on every surface.
22. Decide the tooltip's behaviour on touch, where hover does not exist.
23. Verify every state has a text alternative for a screen reader.
24. Screenshot all eight states of one figure into `docs/shots/` as the
    reference sheet.

---

## Chapter 10 · Motion, input and access

The system has almost no motion by design. What is left should be deliberate,
and everything should work without a mouse.

1. Verify no transition or animation survives outside a sanctioned case.
2. Decide which cases are sanctioned; currently none are.
3. Add `prefers-reduced-motion` handling for anything that survives.
4. Verify scroll behaviour is not smoothed against the reader's preference.
5. Run an axe pass on every route and record the violations.
6. Fix every violation of a colour-contrast rule.
7. Fix every violation of a name-role-value rule.
8. Fix every violation of a landmark or heading-order rule.
9. Add the landmark elements each page is missing: main, nav, contentinfo.
10. Verify the heading order on every route is sequential.
11. Add an accessible name to every control that is currently a glyph.
12. Add live-region announcements for the figures that update on interaction.
13. Verify the tab order on the polls sheet, which has three parallel columns.
14. Verify the tab order on the model sheet.
15. Verify every touch target clears 44px on a phone.
16. Verify no two touch targets are closer than 8px.
17. Test the whole site with a keyboard only and record where it breaks.
18. Test the whole site with VoiceOver and record where it breaks.
19. Verify text scales to 200% without loss of content or function.
20. Verify the site works at 400% zoom on a phone-width viewport.
21. Verify no information is conveyed by colour alone; the maps are the risk.
22. Verify no control depends on hover to be discoverable.
23. Add the reduced-data path: the 6MB district SVG should not load unless the
    tab needs it.
24. Measure and record the largest contentful paint per route before and
    after.

---

## Chapter 11 · The outer pages

The app is on the system. The pages around it are not, or only partly.

1. Inventory every HTML file in the repo and mark each as app, landing,
   project, or dead.
2. Delete the dead ones: `index-1.html` and `index-old.html` if nothing links
   them.
3. Verify the landing page's masthead matches the app's exactly.
4. Verify the landing page's type scale reads from the same tokens.
5. Set the landing hero's measure and check the widow at every width.
6. Decide the landing page's one reversed element; currently the second CTA.
7. Verify the landing page at 320px.
8. Put `fundraising-comparison.html` on the system: link the stylesheet, remove
   its own palette.
9. Rebuild its chart on the system's marks and ramp.
10. Give it a finding as its title and a source line.
11. Put `primary_turnout_combined.html` on the system.
12. Rebuild its figures on the system's marks.
13. Give it a finding and a source line.
14. Put `nationalization-2.html` on the system.
15. Rebuild its figures on the system's marks.
16. Give it a finding and a source line.
17. Give all three the masthead and the footer so they stop feeling orphaned.
18. Verify all three at the five reference widths.
19. Verify all three in dark.
20. Add each to the sitemap with a real description.
21. Verify the projects index links every one of them and nothing that is
    gone.
22. Set the projects index's card treatment to grade 1 and remove any box.
23. Replace the arrow glyph with the guillemet on every card.
24. Screenshot all three into `docs/shots/`.

---

## Chapter 12 · Proof

A system that is not asserted decays. This chapter builds the harness that
makes the previous eleven chapters hold.

1. Write `scripts/audit.mjs`: load every route headless and assert the canon.
2. Assert: no nonzero border radius anywhere.
3. Assert: no box-shadow anywhere.
4. Assert: no `text-transform` anywhere.
5. Assert: no synthesised italic anywhere.
6. Assert: no pure white and no pure black.
7. Assert: no colour outside the palette outside a figure.
8. Assert: every figure has a title and a source.
9. Assert: every novel form has a decode gate.
10. Assert: the body face is Switzer and the prose face is Author.
11. Assert: every text colour clears its required ratio.
12. Write `scripts/layout.mjs`: assert no horizontal overflow at 320, 390,
    768, 1024, 1280, 1440, 1920.
13. Assert: the display figures align across columns at every desktop width.
14. Assert: every touch target clears 44px below 760px.
15. Wire both scripts into a GitHub Action on pull requests.
16. Make the action fail the build rather than warn.
17. Add a visual regression pass: screenshot every route and diff against
    `docs/shots/`.
18. Set the diff threshold so antialiasing does not trip it.
19. Add a route to the harness for each of the three project pages.
20. Add a dark-ground pass to the harness.
21. Add a reduced-motion pass.
22. Add a print pass.
23. Document how to run the harness locally in one command.
24. Record the canon in this file as the thing the harness asserts, so the two
    cannot drift apart.

---

## Found while working

**The district shapes shipped with a white stroke.** `svg/house.svg` and its
siblings carry `stroke:#ffffff` and the original author's reds and blues in
inline style attributes. The fills were replaced at runtime; the stroke was
not, so every district map drew a white grid — quiet enough on paper, a bright
lattice on the ink ground. The token checker found it.

**`index-old.html` was dead.** 155KB, zero inbound links, absent from the
sitemap. Deleted, which is Chapter 11 step 2 arriving early because it was the
largest source of pure-white violations. `index-1.html` stays: every route
links it as a redirect.

**The site was still shipping four retired faces.** Eczar, JetBrains Mono,
Newsreader and Old Standard TT were replaced in the type system but never
removed: 537,668 bytes of woff2 and 71 `@font-face` blocks, for faces nothing
referenced any more. Deleted. With the subsetting and the dead CSS, Chapter 1
takes 763,526 bytes off the site.

**The three standalone analyses are exempt by name.** `check-tokens.mjs` lists
them in `PENDING_CONVERSION` so it can guard the app today; Chapter 11
converts them, and the list can only shrink.

## Notes carried from the first pass

Two decisions were deferred rather than made, and both belong to Chapter 5:

- **Muted at 4.29:1.** The kit sanctions muted for labels and says it must
  never carry an essential value. Sources and decode gates were moved off
  faint onto muted, which passes for large text but not for normal text at
  11px. Step 5.3 settles it.
- **Subgrid versus reserved height.** The three columns align because two
  `min-height` reservations force them to, which costs about 20px of paper at
  1281px and above. Step 3.1 replaces it with the structural fix.

Two things are known broken and outside the visual scope:

- The VoteHub state-poll fetch returned nothing usable on its first live run.
  Diagnostics and a hardened normalizer are in; the next scheduled run is the
  test.
- Six stale branches could not be deleted from this environment and need
  removing by hand.
