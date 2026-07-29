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

1. [x] Audited by measurement: twelve axis constructors across five modules,
   each with its own tick count and its own date format — `ticks(5)`,
   `ticks(4)`, `ticks(min(5, iw/70))`, `ticks(min(6, iw/110))`,
   `ticks(min(8, iw/90))`, and three time formats.
   Original step: Audit every axis on the site: domain path, ticks, labels, gridlines.
2. [x] Every domain path is a hairline at `--t-w-hair`, solid, opaque. The
   only ink rule left inside a figure is the threshold.
   Original step: Set the domain path to hairline everywhere and confirm no ink frame
    competes with a threshold.
3. [x] `--t-tick` and `--t-tick-gap`, read by `window.__axis` in
   `forecast.js`, which every axis on the site is now built through.
   Original step: Set the tick length and offset as tokens and apply them.
4. [x] Replaced. Dashed is not in the system, and the 50% opacity was worse
   than the dash: an alpha on a rule manufactures a colour the palette does
   not contain. A gridline is the record's row rule, solid.
   Original step: Decide the gridline treatment: currently dashed hairline. Dashed is not in
    the system; replace or sanction.
5. [x] `--t-fs-1`, 600, muted, in one rule. The geometry belongs to the axis
   builder and the type belongs to the sheet.
   Original step: Set the axis label size and colour once.
6. [x] Never. The builder falls back to the scale's own domain when a scale
   offers fewer than two ticks, and thinning never cuts below two.
   Original step: Verify the axis never renders fewer than two ticks at any width.
7. [x] Zero collisions across 18 axes at 320, 390, 768, 1024, 1440 and 1920 —
   measured by comparing rendered label boxes, not by eye. Two bugs came out
   of this: d3's `.ticks(n)` is a hint, so asking for five across fourteen
   months returned fifteen; and the label measurement read `--t-fs-1` with a
   bare `parseFloat`, which returned 0.6875 instead of 11px and made every
   label four pixels wide. That is how a chart ends up with fifteen ticks on
   682 pixels and nobody notices until they count them.
   Original step: Verify the axis never renders more ticks than fit without collision.
8. [x] `%b %d` when the ticks are days apart, `%b` when they are months
   apart — on a monthly domain every tick falls on the first and "Jul 01"
   spends four characters saying nothing. The year is printed once, on the
   first tick of each year it appears in, and not at all when the domain
   sits inside one year.
   Original step: Set the date format per width: `%b` narrow, `%b %d` wide.
9. [x] The majority line carries its number; the even-odds rule carries "50".
   Original step: Label every threshold that is currently unlabelled.
10. [x] `--t-w-rule`, solid, opaque, verified across every figure on every
    tab.
    Original step: Verify every threshold is an ink rule at 1.5px, solid, full opacity.
11. [x] One was left: the ratings chart's cursor rule, an ink dash. A
    cursor marks where the reader is, not where a threshold is, so it is
    `--t-ink3` solid at one pixel, and the annotation rule on the
    redistricting chart went the same way.
    Original step: Verify no other ink rule appears inside a figure.
12. [ ] Not done. The polls charts already draw hollow rings for a single
    poll and a solid line for the average — that came out of the first
    task — but it is not written down as a vocabulary, and the ratings and
    past-election charts do not follow it.
    Original step: Set the mark vocabulary: hollow ring for a single observation, solid line
     for an average, solid dot on the datum under the cursor.
13. [ ] Not done; see 12.
    Original step: Apply it to the generic-ballot chart.
14. [ ] Not done; see 12.
    Original step: Apply it to the state chart.
15. [ ] Not done; see 12.
    Original step: Apply it to the past-election charts.
16. [ ] Not done; see 12.
    Original step: Apply it to the swingometer's histogram.
17. [ ] Not done. An average drawn across a gap in the polling is a claim
    the data does not support, and the line currently draws at full weight
    through one.
    Original step: Give the average line a break where there is no data behind it, rather
     than drawing at full weight across a gap.
18. [ ] Not done; the first point of an average is currently drawn the same
    as the hundredth.
    Original step: Mark the first point of an average as provisional when a single poll is
     behind it.
19. [ ] Not done.
    Original step: Set the margin timeline's scale steps as tokens and label the scale.
20. [ ] Not done. The margin timeline is a bar per day with no axis, so a
    bar's height is only readable relative to the others.
    Original step: Give the margin timeline an axis so a bar's height can be read.
21. [x] Five of the six sheets had none: only the polls sheet carried a
    source, from the first task. Every visible figure now does — 23 of 23,
    asserted by measurement.
    Original step: Verify every figure has a source line.
22. [x] Same five sheets, same fix: 23 of 23. The histogram, the odds chart,
    the ratings bar, the ratings chart, the swingometer's map, the
    hindcast and the two Florida maps each gained a one-line decode.
    Original step: Verify every novel form has a one-line decode gate.
23. [x] Every figure host carries `role="img"` and a label. The label sits
    on the host rather than inside the drawn SVG, because the SVG is
    replaced wholesale on every repaint.
    Original step: Add alt text to every figure stating its finding.
24. [x] `scripts/shoot_figures.py` writes twenty: ten forms on both grounds.
    Original step: Screenshot each figure form at its reference width into `docs/shots/`.

**Carried forward.** Steps 12 to 20 are the mark vocabulary and the margin
timeline's axis. They are module work inside four d3 renderers rather than
sheet work, and they are the next thing this chapter owes.

---

## Chapter 7 · Maps as figures

Geography obeys the colour law: hairline boundaries, fills from the data
palette, overprint for contested, paper for absent, no basemap, direct labels.

1. [x] They do. An absent unit takes `--t-paper`, not a grey, on every map.
   Original step: Verify every map fills absent units with paper, not a grey.
2. [x] `--t-hair` at 0.5 to 0.75px on all of them, measured.
   Original step: Verify every map draws boundaries as hairlines in faint.
3. [x] None carries one.
   Original step: Verify no map carries a basemap, graticule or relief.
4. [x] Done, through a shared helper rather than a fourth copy. The polls
   maps got direct labels, a contrast flip, a hover mark and keyboard access
   in the first task; the model, ratings and swingometer maps had zero
   labels and zero focusable units between them, so a reader on a keyboard
   could not reach a state and a reader without a mouse could not name one.
   Original step: Extend direct labels from the polls maps to the model maps.
5. [x] Same helper, same result: 35 labels and 36 reachable units on each.
   Original step: Extend direct labels to the ratings maps.
6. [x] Decided: skipped on the map, carried in the inset. A leader line
   across a map this dense is a second figure drawn over the first.
   Original step: Decide the label rule for units too small to hold one: currently skipped.
    Add leader lines or an inset, or sanction the omission.
7. [x] Added. Measured at 390, sixteen of the thirty-five states with a race
   are under 24px on their longest side and Rhode Island is four pixels by
   six — no projection fixes that, the states are that shape. The units the
   map declines to label now sit under it as chips, by the same test and in
   the same units, so every state either has its name on the map or has a
   chip: never both, never neither.
   Original step: Add the small-state inset column that every US map of this kind needs.
8. [x] On every map now, and painted after the fills rather than with them —
   a label can only know what to flip to once it knows what it is sitting on.
   Original step: Verify the label flips to paper on a dark fill on every map, not just the
    polls maps.
9. [x] The label's size and colour come from the figure rule in §15; its
   placement threshold is `MIN_W`/`MIN_H` in the helper, in viewBox units so
   it does not change with the sheet's width.
   Original step: Set the label size per map scale as a token.
10. [x] `geoAlbersUsa` places both deliberately; verified in the shots.
    Original step: Verify Alaska and Hawaii are positioned deliberately rather than by the
     projection's default.
11. [x] `GEO.markHover`, applied by all four maps.
    Original step: Set the hover mark once and apply it to every map.
12. [x] The polls map is the only one with selection; its mark is unchanged
    and now shares the hover helper.
    Original step: Set the selection mark once and apply it to every map that has selection.
13. [x] It does: `markHover` sets `onDark` from the unit's own fill.
    Original step: Verify the hover mark reverses on a dark fill on every map.
14. [x] The selected unit's contour is drawn at 3px and raised; measured on
    the polls map at every width.
    Original step: Verify the selected unit is raised above its neighbours so its contour is
     never clipped.
15. [x] Every unit carrying a datum is focusable, announces itself, and
    responds to Enter and Space where there is something to activate. The
    district maps are deliberately not focusable unit by unit: 435 tab stops
    is a keyboard trap, and the decode gate and the hover card carry them.
    Original step: Give every interactive map keyboard access: focusable units, Enter and
     Space, and a visible focus contour.
16. [x] Each map's name says what its fill means rather than that it is a
    map: "each unit is filled by the party it leans to and darkened with the
    margin; a race inside two points is overprinted, and an unpolled unit
    stays paper."
    Original step: Give every map an accessible name and a description of what its fill
     means.
17. [ ] Not done. The per-unit labels announce each state's name and datum,
    which is most of what a table would carry, but a table of the same data
    is a different thing and is not there.
    Original step: Add a text alternative to every map: a table of the same data, visually
     hidden.
18. [x] It does. `scripts/check_colour.py` fails on any fill that is neither
    a token nor a step on the ramp, and the county zoom passes.
    Original step: Verify the county zoom's fills follow the same ramp as the state fills.
19. [x] Same check, same result.
    Original step: Verify the district maps follow the same ramp.
20. [x] Same check, same result.
    Original step: Verify the state-legislature maps follow the same ramp.
21. [x] One policy: the maps keep the projection's own ratio and take a
    minimum height of 280px below 761, which is what keeps the smallest
    units drawable at all.
    Original step: Set one aspect ratio policy for maps and a minimum height that keeps
     small units tappable on a phone.
22. [x] The chips are 52 by 44 on a phone. The map cannot give Rhode Island
    a tap target — it is four pixels wide — so the chip does.
    Original step: Verify tap targets on the smallest states at 390px.
23. [ ] Not done; the tooltip still follows the cursor.
    Original step: Decide whether the map tooltip follows the cursor or docks; docking is
     steadier on touch.
24. [x] Five maps on both grounds in `docs/shots/`, written by
    `scripts/shoot_figures.py` alongside the figure forms.
    Original step: Screenshot every map at its reference width into `docs/shots/`.

**Carried forward.** Step 17 (the hidden table alternative) and step 23 (the
docking tooltip).

---

## Chapter 8 · The record

Density lives in text. The record is the tables and the agate, and it should
be the easiest thing on the site to read.

1. [x] `assets/theme.css` §18. It was written inline in a template string,
   with its type, padding, alignment and colours set per cell — five places
   to change one decision. `polls.js` now writes structure and nothing else.
   Original step: Set the record's type size, weight and line height once.
2. [x] One hairline per row, at `--t-row-rule`, and nothing else. Chapter 3
   had already found the row line was being drawn twice.
   Original step: Set the row rule as a hairline at the system's opacity and remove the
    others.
3. [x] None survive: measured, the only background in either table is the
   sticky header's paper, which is there to stop the rows showing through.
   Original step: Remove every tinted header, every zebra stripe and every fill used to
    group.
4. [x] A label is left, a figure is right, always.
   Original step: Set the column alignment rule: label left, figure right, always.
5. [x] Done.
   Original step: Apply it to the polls record.
6. [x] Nothing to do: the model tab has no visible bucket table. It was
   folded into the ratings strip.
   Original step: Apply it to the bucket tables on the model tab.
7. [x] Done; its margin column is a figure and reads right.
   Original step: Apply it to the methodology's ratings table.
8. [x] Paper, and it does not smear: measured at every width.
   Original step: Set the sticky header's ground to paper and verify it does not smear.
9. [x] They were `font-variant-numeric: normal`, which is why the decimals
   did not line up. Every numeric column is tabular now, in both tables.
   Original step: Set the numeric columns to tabular figures and verify the decimal points
    line up.
10. [x] By measure: 14ch narrow, 22ch from 981, 18ch at 320 where two columns
    are dropped. No character count anywhere in the template.
    Original step: Decide the pollster column's truncation: by measure, never by a character
     count in a template string.
11. [x] Every truncated name carries its full text in a `title`.
    Original step: Add a title attribute or a tooltip for a truncated name.
12. [x] It does, and at 320 it does not scroll at all — it flows into the
    page, because a scroll inside a scroll is a trap on a touch screen.
    Original step: Verify the record scrolls inside its own container and never the page.
13. [x] An ink rule at the foot of the well, not a fade: a fade is a
    gradient and the system has none.
    Original step: Give the scroll container a visible edge so the reader knows there is
     more.
14. [x] Eleven whole rows above 980 — a round number of pixels cut one in
    half — and no ceiling below it.
    Original step: Set the record's maximum height per breakpoint.
15. [x] Decided: not sortable. The record is ordered by date because that is
    what makes it a record; a sort by margin turns it into a ranking, which
    is a different claim and one the figure above it already makes.
    Original step: Decide whether the record is sortable; if yes, design the affordance in
     the system.
16. [ ] Not done.
    Original step: Add the agate form from the kit for the dense list cases the tables
     currently handle badly.
17. [ ] Not done; see 16.
    Original step: Use it for the ratings list.
18. [ ] Not done; see 16.
    Original step: Use it for the state list on the polls tab.
19. [x] Nothing to do: no table marks a row. If one does, §18's rule is
    reverse it, not tint it.
    Original step: Give the marked rows the reversed treatment rather than a tint.
20. [x] Both captions state what the table is a record of: "Every poll behind
    this average, most recent first" and "The seven tiers, and the margin each
    one starts at". They are read, not seen — the finding above the figure
    already carries the claim.
    Original step: Verify no table has a caption that names its form instead of its finding.
21. [x] `scope="col"` on 5 of 5 and 3 of 3, and a caption on both. Neither
    had either.
    Original step: Add `scope` to every header cell and a caption to every table.
22. [x] Header, then rows in date order, with each row's cells in the order
    they are set. The caption names the table before the reader enters it.
    Original step: Verify a screen reader reads every table in a sensible order.
23. [x] Verified at 320: three columns, no sideways scroll anywhere on the
    page.
    Original step: Verify the record at 320px, where five columns cannot fit.
24. [x] Decided: neither. It drops the two columns a reader can reconstruct —
    each side's share, which the margin already states — and keeps the date,
    the pollster and the margin. A table that scrolls sideways inside a page
    that does not is a trap, and a stacked form is a different figure.
    Original step: Decide the narrow-width record: horizontal scroll, or a stacked form.

**Carried forward.** Steps 16 to 18, the agate form.

---

## Chapter 9 · The states of a thing

Absent, loading, empty, hovered, selected, focused, disabled, error. Each is a
different claim and each should look like a different claim.

1. [x] Written down in `assets/theme.css` §19 and drawn together in
   `docs/shots/states-light.png`. The three that are easy to confuse are
   absent, loading and empty, and they are the three this site used to draw
   the same way — as a 50/50 tie, which is a plausible value and therefore a
   lie.
   Original step: Write down the eight states and what each one asserts.
2. [x] `.t-absent`: a two-unit ink contour with its word inside, and nothing
   else. It is not a chart with no bars; it is a statement that there is no
   chart to draw.
   Original step: Design the absent vessel once: a two-unit ink contour with its word inside.
3. [x] Applied.
   Original step: Apply it everywhere a figure has no data.
4. [x] `.t-loading`: hatched, which is a texture no datum ever has, so it
   cannot be read as one.
   Original step: Design the loading state as hatching, distinct from absent.
5. [x] Applied.
   Original step: Apply it everywhere a figure is still fetching.
6. [x] Audited: the 50/50 tie was fixed in the first task, and no other
   loading path invents a value. The loading section builds a flat
   histogram and an em dash, not a number.
   Original step: Verify no loading state invents a plausible value; the 50/50 tie is fixed
    but audit for others.
7. [x] None does.
   Original step: Verify no loading state renders a display-size dash.
8. [x] `.t-error`: the absent vessel with the ink reversed. Absent says
   "there is nothing here"; error says "there is something here and we could
   not get it", which is a claim about us rather than about the race.
   Original step: Design the error state and apply it where a fetch fails.
9. [x] It draws the absent vessel when the SVG will not load, which is the
   honest reading of that failure: the shapes are missing, not the data.
   Original step: Verify the ratings house map's failure path uses it.
10. [x] Same.
    Original step: Verify the past-election maps' failure path uses it.
11. [x] `.t-empty`: a rule and a line of agate. The query ran and came back
    with nothing, which is a fact about today rather than about the race.
    Original step: Design the empty-result state for the record, distinct from absent.
12. [x] Every one by rule or weight; the colour checker fails a build on a
    hover that is a colour change.
    Original step: Set the hover mark for every interactive element, by weight or rule, never
     by colour alone.
13. [x] Found by tabbing: six focusable map units per tab had no focus mark
    at all on the model, ratings and swingometer maps. An SVG path is not a
    button, an anchor or an input, so the sheet's `:focus-visible` rule
    never reached it — and the units only became focusable in chapter 7, so
    the gap arrived with the fix. Focus is now a heavier rule than hover,
    set from the same place the hover mark is.
    Original step: Set the focus mark once: a 1px ink outline offset 2, and verify it is
     visible on every ground.
14. [x] Tabbed through all eight tabs on both grounds: 3 to 21 stops each,
    and every one of them now carries a visible mark. Zero unnamed stops —
    a focusable thing with no name is a stop a screen reader announces as
    "graphic", which is worse than not being able to reach it.
    Original step: Verify every interactive element is reachable by keyboard.
15. [x] Skip link, nav in reading order, the ground toggle, Donate, then the
    sheet's own controls in the order they are set.
    Original step: Verify the focus order matches the reading order on every tab.
16. [x] None: the mark is a stroke on an SVG path or an outline on a
    control, and neither takes a pixel of layout.
    Original step: Verify no element has a focus mark that shifts layout.
17. [x] One treatment: the reversed slab, on the year bar, the chart
    toggles, the chamber toggle and the page tabs alike.
    Original step: Design the selected state for the maps, the year bar, the chart toggles
     and the chamber toggle as one treatment.
18. [x] It is built from the two ground tokens, so it inverts with them.
    Original step: Verify the selected state survives a theme change.
19. [x] Faint at full opacity. Nothing in this system fades: an opacity is a
    colour the palette does not contain, and a half-drawn control reads as a
    rendering fault rather than as a decision.
    Original step: Design the disabled state as faint at full opacity; nothing in the system
     fades.
20. [x] Applied through the shared rule.
    Original step: Apply it to the zoom controls when nothing is zoomable.
21. [x] One vessel, measured on both: paper ground, a two-unit ink contour,
    radius 0, no shadow, Switzer.
    Original step: Verify the tooltip's form is one vessel, on every surface.
22. [ ] Not done; the tooltip still follows the cursor, and on touch that
    means it follows a finger that is covering the thing it describes.
    Original step: Decide the tooltip's behaviour on touch, where hover does not exist.
23. [x] Absent, loading, empty and error each carry their word as text.
    Hover, focus and selection are announced by the unit's own name and
    role; disabled by the attribute.
    Original step: Verify every state has a text alternative for a screen reader.
24. [x] `scripts/shoot_states.py` writes `docs/shots/states-light.png` and
    `states-dark.png`. It builds a page and screenshots it rather than
    drawing the sheet by hand, because the states are drawn by the
    stylesheet and a hand-drawn sheet would be a picture of what they were
    meant to be.
    Original step: Screenshot all eight states of one figure into `docs/shots/` as the
     reference sheet.

**Carried forward.** Step 22, the touch tooltip — shared with chapter 7's
step 23.

---

## Chapter 10 · Motion, input and access

The system has almost no motion by design. What is left should be deliberate,
and everything should work without a mouse.

1. [x] None survives. Measured across all nine tabs at two widths: zero
   elements with a transition duration and zero with an animation name.
   Chapter 1's canon sweep took them all.
   Original step: Verify no transition or animation survives outside a sanctioned case.
2. [x] Decided: none are. A system whose structure comes from rules has
   nothing that needs to move to be understood.
   Original step: Decide which cases are sanctioned; currently none are.
3. [x] Nothing survives, so there is nothing to reduce.
   Original step: Add `prefers-reduced-motion` handling for anything that survives.
4. [x] `scroll-behavior: auto` everywhere; nothing smooths it.
   Original step: Verify scroll behaviour is not smoothed against the reader's preference.
5. [~] Not axe — it is not installed here and a build box's npm is not the
   place to add it mid-pass. The same ground was covered by measurement
   instead: computed contrast on every element (chapter 5), every control's
   name, the landmark set, the heading order, the tab order and every touch
   target. What that misses is the checks axe does on ARIA relationships,
   and that is the gap.
   Original step: Run an axe pass on every route and record the violations.
6. [x] `scripts/check_colour.py` gates them: zero failures on both grounds.
   Original step: Fix every violation of a colour-contrast rule.
7. [x] Zero controls without an accessible name, and zero focus stops
   without one.
   Original step: Fix every violation of a name-role-value rule.
8. [x] Both, below.
   Original step: Fix every violation of a landmark or heading-order rule.
9. [x] `main` was added in chapter 2. The masthead is now a `header` and the
   foot a `footer`; seven of the nine tabs had neither.
   Original step: Add the landmark elements each page is missing: main, nav, contentinfo.
10. [x] Seven of the nine tabs had no headings at all — the section titles
    were divs, so a screen reader could not navigate by them. They are `h2`
    now, under an `h1` naming each sheet that is read rather than seen.
    Projects jumped h1 to h3; its section labels are the missing h2.
    Original step: Verify the heading order on every route is sequential.
11. [x] Done in chapter 2, when the sun and the crescent became a word.
    Original step: Add an accessible name to every control that is currently a glyph.
12. [x] There were none. The polls sheet redraws its state chart on a click
    and the swingometer redraws three maps and a histogram on a drag, and
    neither said anything — a reader who could not see the change had no way
    to know one had happened. One polite region, one sentence, throttled so
    a slider drag does not read out sixty times.
    Original step: Add live-region announcements for the figures that update on interaction.
13. [x] Sixteen stops in source order: skip link, nav, the ground toggle,
    Donate, then each column's controls in the order the column reads.
    Original step: Verify the tab order on the polls sheet, which has three parallel columns.
14. [x] Same, and the map units are reachable now.
    Original step: Verify the tab order on the model sheet.
15. [x] They do now. The nav's links were 40px tall, the ground toggle was
    44 tall and 30 wide — a height alone is not a target — and the chamber
    toggle was 28.
    Original step: Verify every touch target clears 44px on a phone.
16. [~] Twelve pairs sit closer than 8px, all of them nav links separated by
    a middot that is not itself a target. Forcing 8px between them would
    break the one-line nav chapter 2 measured for, and at 44px tall they
    clear the size threshold that WCAG offers as the alternative. Recorded
    rather than changed.
    Original step: Verify no two touch targets are closer than 8px.
17. [x] Tabbed through every tab on both grounds; the breaks it found are in
    chapter 9's record.
    Original step: Test the whole site with a keyboard only and record where it breaks.
18. [ ] Not done: there is no VoiceOver on this machine. The structural work
    it would test — landmarks, headings, names, live regions — is done and
    measured, but a real screen-reader pass is not the same thing and this
    is not a substitute for it.
    Original step: Test the whole site with VoiceOver and record where it breaks.
19. [x] At a 32px root the page does not scroll sideways and nothing is
    lost. Three things clipped rather than grew — the ground toggle, the
    small-state chips and the display figures — because they were sized for
    one word at one size.
    Original step: Verify text scales to 200% without loss of content or function.
20. [x] 320px at a 400% zoom: no sideways scroll, nothing clipped.
    Original step: Verify the site works at 400% zoom on a phone-width viewport.
21. [x] Chapter 5 settled it: the maps were the risk, and where hue is
    unavailable the contour carries direction.
    Original step: Verify no information is conveyed by colour alone; the maps are the risk.
22. [x] None does: every control is visible at rest, and every map unit is
    reachable by keyboard and named.
    Original step: Verify no control depends on hover to be discoverable.
23. [x] The largest single fix in this chapter, and it was three bugs at
    once. The prerendered snapshots inlined the district shapes, so
    `/ratings/` was a 14.5MB document before a byte of data. Three modules
    each held their own check-then-fetch against one shared variable, so
    when two ran in the same tick both fetched and the reader paid 12.3MB
    for one 6.2MB file. And the request said `cache: no-store` on a static
    asset that changes once a cycle.
    Original step: Add the reduced-data path: the 6MB district SVG should not load unless the
     tab needs it.
24. [x] Measured on a cold cache at 1440, before and after:

| route | LCP before | LCP after | bytes before | bytes after |
|---|---|---|---|---|
| model | 548ms | 244ms | 16.0MB | 10.0MB |
| ratings | 716ms | 292ms | 29.1MB | 10.6MB |
| florida | 420ms | 228ms | 19.0MB | 13.0MB |
| polls | 396ms | 220ms | 16.0MB | 10.0MB |
| swingometer | 620ms | 176ms | 22.4MB | 10.4MB |
| past-elections | 344ms | 164ms | 16.0MB | 10.0MB |
| state-legs | 832ms | 164ms | 28.8MB | 16.7MB |
| projects | 196ms | 180ms | 8.9MB | 8.9MB |
| methodology | 208ms | 148ms | 8.9MB | 8.9MB |

    LCP roughly halved on every data route and the nine routes together
    dropped from 165MB to 98MB. `scripts/measure_lcp.py` prints this rather
    than asserting it: a build box's timings are not a reader's.
    Original step: Measure and record the largest contentful paint per route before and
     after.

**Carried forward.** Step 18, the VoiceOver pass, which needs a machine this
is not. Step 5's ARIA-relationship checks, and step 16's target spacing,
which is recorded as a knowing exception.

---

## Chapter 11 · The outer pages

The app is on the system. The pages around it are not, or only partly.

1. [x] Six: `baseline.html` (app), `index.html` (landing), three analyses,
   and `index-1.html` (dead).
   Original step: Inventory every HTML file in the repo and mark each as app, landing,
    project, or dead.
2. [x] `index-old.html` went in chapter 1; `index-1.html` goes here. Nothing
   linked it — the only two mentions were comments in `baseline.html`
   marking where its CSS was pasted in.
   Original step: Delete the dead ones: `index-1.html` and `index-old.html` if nothing links
    them.
3. [x] Chapter 2 did it and measured it: 53px at 1440 and 1920, 65px at 390,
   same rule and same tokens.
   Original step: Verify the landing page's masthead matches the app's exactly.
4. [x] It reads `assets/theme.css` and holds no scale of its own.
   Original step: Verify the landing page's type scale reads from the same tokens.
5. [x] 18ch on the hero, and `text-wrap: balance` from chapter 3 covers the
   widow.
   Original step: Set the landing hero's measure and check the widow at every width.
6. [x] Confirmed: the second CTA. The first is a keyline, and nothing else
   on the page reverses.
   Original step: Decide the landing page's one reversed element; currently the second CTA.
7. [x] No sideways scroll at 320, 390, 768, 1024, 1440 or 1920.
   Original step: Verify the landing page at 320px.
8. [x] It reads the sheet now: its palette, its two faces and its ground are
   the system's, and the Google Fonts link is gone. Its `.card` was a
   keylined box with a 6px offset shadow — two vessels around one figure and
   an elevation the canon does not have — and is a rule now.
   Original step: Put `fundraising-comparison.html` on the system: link the stylesheet, remove
    its own palette.
9. [x] Its four series read `--t-d1`, `--t-d2`, `--t-d5` and `--t-d6` from
   the sheet, so they follow the ground rather than being fixed at build
   time. This is the case §1 reserved the other three of the six for: a
   multi-series figure re-opens the palette deliberately.
   Original step: Rebuild its chart on the system's marks and ramp.
10. [x] "Talarico is leading the pack — for now" was already a finding; its
    source line was already there. Its kicker was a tracked, uppercase label
    in a data ink and is a label now.
    Original step: Give it a finding as its title and a source line.
11. [x] Same conversion: one `:root` block mapped onto the tokens, the two
    shadow tokens set to `none`, the ground wash removed, the external font
    dropped.
    Original step: Put `primary_turnout_combined.html` on the system.
12. [ ] Not done. Its two figures still draw their own marks and set their
    labels in a monospace the system does not have.
    Original step: Rebuild its figures on the system's marks.
13. [~] It has a source line. Its titles name their form — "Primary vs
    General Election Vote, by Party" — and have not been rewritten as
    findings.
    Original step: Give it a finding and a source line.
14. [x] Same conversion, plus its own `html.dark` variant removed: there is
    one ground switch on this site and `assets/ground.js` owns it. Its
    figure's palette is read from the sheet.
    Original step: Put `nationalization-2.html` on the system.
15. [ ] Not done; see 12.
    Original step: Rebuild its figures on the system's marks.
16. [~] It has a method note that serves as a source. Its title names its
    form.
    Original step: Give it a finding and a source line.
17. [x] All three carry the masthead, with a link back to the projects index
    where each had its own hand-rolled bar.
    Original step: Give all three the masthead and the footer so they stop feeling orphaned.
18. [x] No sideways scroll on any of the three at 320, 390, 768, 1024, 1440
    or 1920.
    Original step: Verify all three at the five reference widths.
19. [x] All three, and two of them had no dark ground at all before this.
    Original step: Verify all three in dark.
20. [x] Already in `STATIC_ROUTES`; chapter 2 gave each a title on the
    site's pattern.
    Original step: Add each to the sitemap with a real description.
21. [x] The projects index links all three and nothing that is gone.
    Original step: Verify the projects index links every one of them and nothing that is
     gone.
22. [x] The fundraising card is grade 1. The other two lost their shadows;
    their inner boxes keep a keyline.
    Original step: Set the projects index's card treatment to grade 1 and remove any box.
23. [x] Nothing to do: the cards carry no arrow, and the landing's two CTAs
    already use the guillemet.
    Original step: Replace the arrow glyph with the guillemet on every card.
24. [x] `docs/shots/page-*.png`, all three on both grounds.
    Original step: Screenshot all three into `docs/shots/`.

**The checker's exemption list is empty.** The three analyses were named in
`PENDING_CONVERSION` so the token contract could guard the app without them.
They are guarded like everything else now.

**Carried forward.** Steps 12 and 15: the figures inside the two dense
analyses still draw their own marks. The pages are on the system; the
figures on them are not yet, and steps 13 and 16 wait on the same work.

---

## Chapter 12 · Proof

A system that is not asserted decays. This chapter builds the harness that
makes the previous eleven chapters hold.

1. [x] `scripts/audit.py` rather than `.mjs`: the rest of this repo's
   tooling is Python and Playwright's Python binding is what is installed.
   It loads all thirteen routes on both grounds and asserts the canon.
   Original step: Write `scripts/audit.mjs`: load every route headless and assert the canon.
2. [x] Asserted, on every element with a box.
   Original step: Assert: no nonzero border radius anywhere.
3. [x] Asserted, box-shadow and text-shadow alike.
   Original step: Assert: no box-shadow anywhere.
4. [x] Asserted.
   Original step: Assert: no `text-transform` anywhere.
5. [x] Asserted: `font-style` is `normal` on every element. Neither face has
   an italic, so the browser's oblique is a slant applied to a face that
   never had one.
   Original step: Assert: no synthesised italic anywhere.
6. [x] `check-tokens.mjs` rule 2, across every authored file.
   Original step: Assert: no pure white and no pure black.
7. [x] `check_colour.py`, which is the chapter 5 harness.
   Original step: Assert: no colour outside the palette outside a figure.
8. [x] Asserted on every chart, map and bar.
   Original step: Assert: every figure has a title and a source.
9. [x] Asserted alongside it.
   Original step: Assert: every novel form has a decode gate.
10. [x] Asserted: every element with its own text resolves to Switzer or
    Author, or to one of their metric-matched fallbacks.
    Original step: Assert: the body face is Switzer and the prose face is Author.
11. [x] `check_colour.py` rule 3, against the ground each element is
    actually on.
    Original step: Assert: every text colour clears its required ratio.
12. [x] Folded into `audit.py` rather than split into a second script: it
    loads each route once and asserts everything about it, which is faster
    than loading it twice. Seven widths, 320 through 1920.
    Original step: Write `scripts/layout.mjs`: assert no horizontal overflow at 320, 390,
     768, 1024, 1280, 1440, 1920.
13. [x] Chapter 3's subgrid made this structural rather than reserved;
    `scripts/` measures it and the plan records the numbers.
    Original step: Assert: the display figures align across columns at every desktop width.
14. [x] Asserted below 760 on every route.
    Original step: Assert: every touch target clears 44px below 760px.
15. [x] `.github/workflows/canon.yml`, on pull requests and on pushes to
    main.
    Original step: Wire both scripts into a GitHub Action on pull requests.
16. [x] It fails the build. A check that only warns is a check nobody reads.
    Original step: Make the action fail the build rather than warn.
17. [~] `docs/shots/` holds the reference — 20 masthead shots, 30 figure
    shots, 2 state sheets, 6 analysis pages — and `make shots` regenerates
    them, so a change that moves one shows up in the diff of the commit. A
    pixel-diffing step that fails the build on a threshold is not wired in.
    Original step: Add a visual regression pass: screenshot every route and diff against
     `docs/shots/`.
18. [ ] Not done; see 17.
    Original step: Set the diff threshold so antialiasing does not trip it.
19. [x] All three, plus the landing sheet: thirteen routes in the harness.
    Original step: Add a route to the harness for each of the three project pages.
20. [x] Every assertion runs on both grounds.
    Original step: Add a dark-ground pass to the harness.
21. [x] A `reduced-motion: reduce` context, asserting nothing re-appears
    under it.
    Original step: Add a reduced-motion pass.
22. [x] A print pass: the chrome is hidden, the columns are one, and the
    record prints whole rather than the eleven rows that fit a screen.
    Original step: Add a print pass.
23. [x] `make check`. It starts a server if nothing is listening, runs the
    token contract, the ramp, the colour law and the canon, and stops the
    server again.
    Original step: Document how to run the harness locally in one command.
24. [x] Below.
    Original step: Record the canon in this file as the thing the harness asserts, so the two
     cannot drift apart.

### The canon, as the harness asserts it

| # | rule | asserted by |
|---|---|---|
| 1 | colour appears only where a datum is | `check_colour.py` |
| 2 | a colour is a token or a step on the ramp | `check_colour.py` |
| 3 | text clears 4.5:1, or 3:1 at display size | `check_colour.py` |
| 4 | no alpha on a data mark | `check_colour.py` |
| 5 | no colour written outside `:root` | `check-tokens.mjs` |
| 6 | no pure white, no pure black | `check-tokens.mjs` |
| 7 | every token is defined, read, and has a dark counterpart | `check-tokens.mjs` |
| 8 | one height for every masthead control | `check-tokens.mjs` |
| 9 | radius 0 | `audit.py` |
| 10 | elevation 0 | `audit.py` |
| 11 | no `text-transform`, no synthesised italic | `audit.py` |
| 12 | two faces and no third | `audit.py` |
| 13 | every figure has a title, a source and a decode gate | `audit.py` |
| 14 | no horizontal overflow at seven widths | `audit.py` |
| 15 | 44px touch targets below 760 | `audit.py` |
| 16 | no motion, and none under reduced-motion | `audit.py` |
| 17 | print drops the chrome and keeps the record whole | `audit.py` |
| 18 | the ramp steps evenly and its midpoint is not a lean | `check_ramp.py` |
| 19 | the overprint is not a maximal lead | `check_ramp.py` |
| 20 | the ramp survives all three dichromacies | `check_ramp.py` |

`make check` runs all four. The rules that are *not* in this table — a
finding rather than a form as a title, a label that is bold lowercase, a
threshold that is an ink rule — are the ones a person still has to read for,
and they are what the next pass should try to assert.

**Carried forward.** Steps 17 and 18: a pixel-diffing regression pass. The
reference shots exist and regenerate with one command, but nothing fails a
build on a threshold yet.

---
