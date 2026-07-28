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
10. Subset Switzer and Author to the codepoints the site actually uses;
    measure and record the byte saving.
11. Decide `font-display`: `swap` (current) versus `optional`; test both for
    layout shift on a cold load and keep the measured winner.
12. Add `size-adjust`, `ascent-override` and `descent-override` to the
    fallback stacks so the fallback does not reflow the page.
13. Verify tabular figures are on in every numeric context and off in prose;
    fix the contexts that inherit the wrong one.
14. Add `font-variant-numeric: oldstyle-nums proportional-nums` to every
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

1. Decide the masthead's canonical content: wordmark, tagline, nav, actions.
   Write it down; everything else is removal.
2. Set the wordmark once, in one place, and have the landing page and the app
   read the same rule rather than two copies.
3. Verify the slab is the masthead's only bottom rule at every width, with no
   second hairline anywhere near it.
4. Align the brand baseline to the nav baseline at every width, including the
   1024 two-row wrap.
5. Decide whether the tagline survives below 900px or is dropped; implement.
6. Give the active nav item a rule, not a colour, and check it reads at a
   glance from two metres.
7. Give nav hover a weight change rather than a colour change, and confirm it
   does not shift layout.
8. Set the nav separator as the typographic middot everywhere, and confirm no
   drawn dot survives in any tab.
9. Decide the theme toggle's glyph: currently a moon and a sun. Replace with
   a typographic mark or a word, per the no-pictogram rule.
10. Give the theme toggle an accessible name and a pressed state.
11. Make the Donate button the single reversed element in the masthead and
    confirm nothing else competes.
12. Set one height for every masthead control and assert it in the checker.
13. Give the whole masthead a visible focus order that matches its reading
    order; tab through it and record the sequence.
14. Add a skip link to the first figure, styled in the system, visible only
    on focus.
15. Decide whether the masthead sticks on scroll; if yes, give it a rule that
    only appears once the page has moved.
16. Verify the masthead on the landing page, which uses its own markup, now
    matches the app's to the pixel.
17. Verify it on the three standalone project pages, which have never had it.
18. Set the page title pattern for every route and check the browser tab text
    for each.
19. Replace the favicon with a mark cut from the system: a slab, not a
    photograph.
20. Add the apple-touch-icon and the maskable variant.
21. Add `theme-color` for light and dark so the mobile browser chrome matches
    the ground.
22. Add the Open Graph image as a broadcast card drawn in the system rather
    than a screenshot.
23. Verify the OG card renders at 1200×630 with the finding legible at
    thumbnail size.
24. Take a masthead screenshot at 390, 768, 1024, 1440 and 1920 and put the
    five in `docs/shots/` as the reference.

---

## Chapter 3 · The sheet: grid, measure, rhythm

The three-column sheet is the site's structure. It currently aligns because
two `min-height` reservations force it to. This chapter makes it align because
the grid says so.

1. Replace the `min-height` reservations with a real subgrid: give `.cols` its
   row template and let each `.col` inherit it.
2. Wrap everything after `.seats` in one child element in both polls sections
   so subgrid has a row to align.
3. Verify the display figures set on one line at 981, 1024, 1280, 1440, 1920.
4. Verify the reserved whitespace above the head rule is gone at 1281+.
5. Decide the sheet's maximum measure and stop the columns growing past it at
   1920 and above.
6. Set the gutter as a token and use it for the column padding and the rule
   offsets alike.
7. Align the outer columns to the masthead's outer edge, and prove it with a
   pixel measurement rather than by eye.
8. Establish a baseline grid unit and snap the section heads to it.
9. Snap the figure blocks to the same unit.
10. Snap the record's row height to the same unit.
11. Audit every horizontal rule on the sheet and delete the ones that are not
    earned; count before and after.
12. Decide the rule hierarchy: which separations are ink, which are hairline,
    which are whitespace alone.
13. Apply that hierarchy across all three columns and check no two adjacent
    rules survive.
14. Set the maximum measure for the dek at 56ch and the decode line at 64ch,
    and verify no line exceeds it at any width.
15. Fix the two-word widow in the third column title, by measure rather than
    by a hard break.
16. Decide the stacking order on mobile: currently generic ballot, senate,
    governor. Confirm it is the reading order you want.
17. Give the stacked columns a rule between them on mobile so the sections
    stay distinct.
18. Set the vertical rhythm between stacked columns as one token.
19. Verify the sheet at 320px, which nothing has been tested at.
20. Verify the sheet at 2560px.
21. Verify the sheet at 1024 in portrait, which is a real tablet case.
22. Add a print stylesheet: paper ground, ink type, figures at full width, no
    chrome.
23. Verify the print layout for the polls sheet and the methodology page.
24. Record the grid decisions in this file so the next change has something to
    violate knowingly.

---

## Chapter 4 · Type and the voice

Two faces, three voices: the label, the finding, the prose. This chapter makes
each one consistent everywhere it appears.

1. Enumerate every text style in use and map each to label, finding or prose.
2. Delete any style that is none of the three.
3. Set the label voice once — bold, lowercase, no tracking — and have every
   label read it.
4. Find every remaining Title Case label and lowercase it; the map hints, the
   chart toggles, the zoom controls.
5. Find every remaining letter-spaced label and remove the tracking.
6. Verify no `text-transform` survives anywhere, including inline styles in
   the JS modules.
7. Verify no `font-variant: small-caps` survives.
8. Verify no synthesised italic survives; Switzer has no italic and the
   browser's oblique is not a substitute.
9. Set the finding voice once — 800 weight, tight tracking, 32ch measure.
10. Audit every figure title: does it state a finding or name a form? Rewrite
    the ones that name a form.
11. Write the finding for the seat histogram, which currently has none.
12. Write the finding for the win-probability chart, which says "Win
    probability".
13. Write the finding for the ratings bar.
14. Write the finding for the swingometer's map.
15. Write the finding for each Florida panel.
16. Set the prose voice once — Author, oldstyle figures, 1.62 line height,
    64ch measure.
17. Move the methodology body, the project deks and the landing lede onto it
    and check none of them is still Switzer.
18. Set the display figure's scale as a clamp with a floor that survives 320px.
19. Check the display figure's tracking at its smallest and largest size; one
    value will not serve both.
20. Set the record's type size and line height so twenty rows fit a phone
    screen without scrolling inside a scroll.
21. Verify hyphenation and wrapping in the deks at narrow widths; add
    `text-wrap: pretty` where it helps.
22. Verify no orphan or widow in any heading at the five reference widths.
23. Add `lang` to every document and to any element carrying another language.
24. Record the three voices and their measures in this file.

---

## Chapter 5 · Colour and the data palette

Colour appears only where a datum is. The site now obeys that. This chapter
proves it and settles the cases the sweep left ambiguous.

1. Write `scripts/check-colour.mjs`: crawl every route and fail on any colour
   outside the palette appearing outside a figure.
2. Run it; record the violations; fix them one at a time.
3. Settle the contrast question the audit raised: muted at 4.29:1 carries
   labels. Decide whether that stands or whether labels move to ink2.
4. If it stands, document why, naming the sizes and weights it is allowed at.
5. Audit every text colour against its actual ground and record the ratio.
6. Fix every ratio under 4.5:1 that carries meaning.
7. Fix every ratio under 3:1 regardless of what it carries.
8. Verify the same ratios on the ink ground, which has different maths.
9. Decide the approval series' inks: currently ink and muted, deliberately not
   party colours. Confirm or replace.
10. Decide the third-party and undecided treatment, which currently has none.
11. Verify the overprint is distinguishable from a maximal lead at a glance,
    with a side-by-side swatch test.
12. Verify the overprint is distinguishable in dark, where it inverts to a
    pale lilac.
13. Check the divergent ramp for a perceptual midpoint that reads as neutral
    rather than as a weak lean.
14. Check the ramp's steps are perceptually even, not evenly numbered.
15. Simulate deuteranopia across the maps and record what is lost.
16. Simulate protanopia and tritanopia.
17. Decide the redundant encoding for colour-blind readers: direct labels
    already help, but the ramp's direction does not survive. Add a second cue.
18. Verify the ratings scale's seven steps remain distinguishable under
    simulation.
19. Verify the two-way inks are used for the same meaning in every figure, and
    fix any inversion.
20. Verify no tint of a data ink appears outside a figure.
21. Verify no alpha is used on a data mark anywhere; alpha manufactures
    colours the palette does not contain.
22. Check the print stylesheet's colour: the ramp must survive greyscale.
23. Add a greyscale fallback for the maps that reads by value alone.
24. Record the colour law's exceptions, if any survive, with their reasons.

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
