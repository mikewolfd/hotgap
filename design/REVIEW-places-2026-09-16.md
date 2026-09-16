# Design review — the journalist page, built — 2026-09-16

Scope: `app/places.html` + `app/src/places/` (merged in `44b35bc`), rendered
through the project's own runner (`npx vite` from `app/`, reading
`/data/summary.json` — the sweep stamped 2026-09-16T20:15:49Z on
policyengine-us 2.6.2) in Chromium (Playwright 1.60) at 390×844 and 1280×900,
light and dark (`data-theme`), print media, and a real Letter PDF; states:
nothing selected, a state selected from the map and from the table, all eleven
households, all six measures, both table orders, keyboard focus on tiles, rows,
selects and buttons, the loading and failed-fetch paths, and the CSV. The mockup
`design/journalist.html` was served from the repo root and rendered beside it,
like for like. Screenshots and the measurement dump are under
`design/review/places/`; the brief reviewed against is `design/README.md`,
`inventory.md`, `charts.md`, `tokens.css` and the audit `AUDIT-2026-09-16.md`.

Contrast figures were computed from the colours the browser painted, with the
audit's WCAG 2.x relative-luminance formula; type, spacing, line lengths and
distances are computed styles and bounding boxes (`review/places/measurements.json`).
The unit tests for the page's modules pass through the project's runner
(`npx vitest run app/src/places`: 25 tests). No console errors at either width.

## Verdict

This is the mockup made real, and in the ways that matter it is better than the
mockup: nothing is typed (the figure's source line already says policyengine-us
2.6.2 while the frozen sketch still says 2.5.0), the four tile states are
distinct in both modes, the no-cliff states leave the bins and print *none*, the
per-state corrections block renders from the coverage record, the URL carries
the view, and the map is the one memorable thing with everything around it
quiet. The four deliberate departures in the merge report — tiles as buttons
under `role="group"`, nothing selected on load, the view in the URL, and the
state names and `$200` floor imported from core — are all right, and a fifth the
report does not name as a decision (a third select, *Table order*) is the one
that should move. What stops it shipping to a reporter is one system defect
this page is the first to expose on paper: the hatch, the design's own honesty
mark, is drawn with a CSS repeating gradient that Chromium's PDF path flattens to
a single smear, so a printed or saved-as-PDF page shows New Jersey and
Washington as pale squares like New Mexico — the exact misreading the README
says the mark exists to prevent. Below that, nine should-fixes, of which three
are consequences of the tile-button decision that the page did not finish
(the ranked list is not the control `charts.md` says it is, selection and focus
share one mark, and a selection made from the table changes something a
viewport or more away with no visible effect), and two are inherited from the
sketch and never caught (count measures print a *0 0 0 1 1 1* scale; the page's
skeleton shows sentences with holes while loading). None needs a design
decision revisited; all are bounded.

Counts: **1 B, 9 S, 10 N.**

---

## Blockers

### B1. The hatch does not survive the PDF path; a printed page says New Jersey has no cliff

- **Where:** `design/tokens.css:273` (`.hg-hatch-incomplete` —
  `repeating-linear-gradient`), used by `app/src/places/render.ts:69` (tile),
  `:93` (legend swatch), `:124` (rank strip); the print block
  `tokens.css:572` already sets `print-color-adjust: exact` on it.
- **What I saw:** printed to Letter through Chromium's PDF backend
  (`review/places/print-letter-from-dark.pdf`, page 1 rasterised as
  `print-letter-from-dark-p1.png`), the WA and NJ tiles and the legend swatch
  are pale squares with a grey smear across two corners. The PDF's drawing
  list for the WA tile holds the label plate fill (`#F1F3F6`), the outline
  stroke and nothing else — the repeating gradient became one axial shading
  with no repeat. Beside them NM, the *no cliff* tile, is a pale square with
  the same outline: on paper the two states are the same mark. The raster
  print emulation (`print-1280-from-dark.png`, and the merge's own proof
  `design/audit/app/journalist-1280-print-from-dark.png`) shows the stripes
  perfectly, because a screenshot rasterises the gradient; the proof script
  never exercises the path a reporter's *Save as PDF* takes, so it could not
  see this. I re-checked with a scratch page printed the same way: an SVG
  data-URI `background-image` and an SVG `mask-image` both print as stripes;
  a repeating gradient over a colour prints as the same smear.
- **Who it hurts:** the journalist — the README's one forbidden sentence
  ("New Jersey is gentler") is what a printout now invites — and the design
  system, whose README says the pattern "survives greyscale and a CMS
  re-compression".
- **Smallest fix:** in `tokens.css`, draw the stripes as an SVG: a
  `::after` pseudo-element with `background: var(--ink-3)` and a 6px SVG
  `mask-image` (so the token still flows and the label plate stays on top),
  or, smaller still, a print-only rule that swaps the gradient for an SVG
  data-URI at the light `--ink-3` (`#5E6871`), since paper is always light.
  Then add a `page.pdf()` check to `app/e2e/places.mjs` that inspects the WA
  tile's drawing ops, because the screenshot check is blind here.

---

## Should fix

### S1. Selecting from the table changes something a viewport or more away, and nothing on screen says so

`app/src/places/main.ts:99` (`select` → `renderDetail` only). At 1280 the CO
row sits 1,307px below the corrections block it drives (row top y=2401, block
top y=1094); at 390 it is 2,743px (`measurements.json` `tableToDetail`). After
the click the only change in the viewport is the row's tint (S3)
(`review/places/viewport-1280-light-CO-after-table-click.png`). The line under
the table promises "read the corrections behind its numbers under the map"
and the page does not take the reader there. Fix: when the selection comes
from the table, scroll `#stateDetail` into view and move focus to its heading
(`tabindex="-1"`, `scroll-margin-top: var(--s7)`) — the same rule `charts.md`
§ M6 uses when a mark opens its row — and keep `aria-current` on the row so
the table's one tab stop is still that row on the way back.

### S2. The ranked list is not the control `charts.md` says it is, so a phone has no 44px control near the map

`charts.md` § 2: "Not interactive on a phone … the ranked list and the table
below it are the controls, with 44px rows." Built: the rank rows are inert
`<li>`s at 26px (`app/src/places/places.css:74`), the tiles are 28.7×28.7px
buttons at 390 (`targets.tile`), and the 44px row the page names as the
equivalent control (`places.css:40`, WCAG 2.5.8) starts at y=3,228 — seven
screens down. The tile-button decision is fine (it is the merge's stated
choice, and 28.7px clears 2.5.8's 24px floor); its obligation was to keep a
full-size control beside the map, and the ranked list is already there
(y=1,479 at 390), already carries `data-st`, and `applySelection`
(`render.ts:248`) already toggles `.sel` on any `[data-st]` and the roving
tabindex on any button. Fix: make each rank row's contents a `.hg-row-btn`
(`min-height: var(--touch)` below 62rem, the 26px density above it) and
record the decision in `charts.md` (TODO(system) 2).

### S3. The selected row and rank row are marked by a 1.08:1 tint

`tokens.css:515` (`.hg-table tr:has(> * > [aria-current="true"])`) and
`places.css:86` (`.rank li.sel`) both paint `--surface-sunk` on the plane:
measured **1.08:1** light, **1.21:1** dark; the same ground on `--surface` is
1.07:1 / 1.10:1, so it is not the plane's fault. The tile gets a 2px ink ring;
the row — the control a reporter actually uses on the table — gets a tint below
any threshold (`review/places/table-1280-light-CO-selected.png`,
`rank-1280-light-TX.png`). Fix: a second channel in ink, the same mark the
tile uses — `box-shadow: inset 3px 0 0 var(--ink)` on the selected row's `th`
and on `.rank li.sel` (an incomplete row's `--rule-strong` bar in the same slot
is overridden by ink when selected, which is the right precedence). The
system's open-row ground has the same number everywhere (TODO(system) 3).

### S4. Focus and selection are one mark on a tile

`places.css:57–58`: `.tile.sel` is a 2px ink outline at 1px offset;
`.tile:focus-visible` is a 2px ink outline at 2px offset. With NY focused and
CO selected the map shows two identical ink squares
(`review/places/focus-1280-light-tile-b5-NY.png`; dark,
`focus-1280-dark-tile-b5-NY.png`), and when the selected tile takes focus one
ring simply replaces the other (`focus-1280-light-tile-sel-CO.png`). The mockup
had no focusable tiles, so this is a consequence of the deliberate change, not
a drift. Fix: keep the system focus ring outside and move the selection
inside — `box-shadow: inset 0 0 0 2px currentColor` — so it takes the label
ink already chosen for contrast (`--surface` on bins 3–5, `--ink` on 1–2,
`--ink-2` on the three special tiles): two positions, two inks.

### S5. Count measures print a scale that is not a sentence

*Deferred cliffs*: scale labels `0 0 0 1 1 1`, caption "five equal-width steps
from 0 to 1", a map with two classes (`review/places/figure-1280-light-m-deferredCliffCount.png`).
`model.ts:126` `bins()` divides any range into five and rounds the bounds; the
sketch does the same (`journalist.html` `bins`) and the audit's screenshots
never showed a count measure. *Number of cliffs* (`4 7 10 13 16 19`) happens
to land on integers. A figure whose printed bounds repeat is not
screenshot-proof. Fix: for `unit === ""`, integer bins — `step = max(1,
ceil((hi−lo)/5))`, `n = ceil((hi−lo+1)/step)` (≤ 5) — the scale draws the `n`
swatches that exist, the caption says "`n` classes from `lo` to `hi`", and
`charts.md` gets the rule (TODO(system) 4).

### S6. The page's skeleton shows sentences with holes while loading and after a failure

`places.html:16, 97, 125`: with the fetch delayed the reader sees " sets of
rules,  household shapes, one axis.", "All , every measure", "microsimulation
at  rules", three empty selects and an empty figure box
(`review/places/page-390-light-loading.png`); on a 404 the same skeleton stays
under the alert (`page-1280-light-error.png`). The alert line itself is right
in tone and says what to do. Fix: mark the second `.page` `hidden` in the
markup and clear it in `main()`, so the loading and failed states are the
masthead and one line; render the lede's counted sentence from the data
rather than around empty spans (the second sentence can stand). The error's
"summary.json" is a system name — "the data file" is the reader's word, with
the status kept.

### S7. *Table order* scopes only the table but sits above the map and ranking, and costs 80px on a phone

`inventory.md` #21: "One row of `<select>`s above everything it scopes." The
third select (`places.html:34–40`) changes only the table (`main.ts:79`),
3,228px below at 390. The filter block is 317px tall at 390 against the
mockup's 237px (`review/places/filters-390-light.png`,
`mock-filters-390-light.png`); the first tile row starts at y=709. Fix: move
the order control to the table it orders — a second, small filter row under
the "All 51" heading — and leave the top row to the two scopes the map, the
ranking and the table share.

### S8. The table's header scrolls away after nineteen rows

The table is 2,363px tall at 45px a row; at 900px the header serves rows
1–19 and rows 20–51 are eight columns of numbers with no names
(`review/places/viewport-1280-light-table-mid.png`: which of $110,000 and
$52,000 is the leap?). `position: sticky` on `thead` cannot work inside
`.hg-scroll-x`, which is a scroll container. But at ≥62rem the table's 48rem
minimum fits the 1,056px page without a scroller. Fix: make `.hg-scroll-x`
scroll only below 62rem and above it `thead th { position: sticky; top: 0;
background: var(--plane) }`.

### S9. core's provenance strings are engineering notes, and the page is bound to print them verbatim

`inventory.md` § CorrectionsApplied: "note — one sentence, written by core,
never retyped." The page obeys, so Texas's block reads "Computed by
PolicyEngine but dropped from household_net_income here, so HotGap adds it
back (parse.ts) — WORKAROUND until this endpoint carries policyengine-us #9503
(issue #9405)." and "(evaluate.ts applyCoverageGap) — WORKAROUND …"
(`core/src/coverage.ts:91, 96, 73`;
`review/places/detail-1280-light-TX.png`). The state's SourceNote reads
"Rent: HUD Office of Policy Development and Research, FY2026 Fair Market Rents,
county level, revised schedule (fmr_2); FY2026 (effective 2025-10-01), revised
schedule, which supersedes the unrevised FY26_FMRs.xlsx." — "revised schedule"
twice and a filename. The audit's S13 named the same defect on the caseworker
cite. Fix in core, not in the page: write each `note` and vintage as the
sentence a reporter can quote — what HotGap did, why, and the issue number as
the cite — and keep the code pointer in a separate field if it is wanted.

---

## Nits

- **N1.** With nothing selected the left column ends at y=1,171 and the right
  at y=2,023: an h3 reading *Corrections applied* and one sentence above 850px
  of plane (`review/places/split-1280-light-unselected.png`). The invitation is
  right; the heading reads as a template. Let the heading carry the state
  ("Corrections applied — choose a state") or let the sentence be the heading.
- **N2.** Three names for one tile state: "past axis" (rank value,
  `render.ts:109`), "past the axis" (table, `:149`), "Runs past the top of
  the axis" (legend and title, `:92, :32`). Inherited from the sketch. One
  phrase everywhere but the legend.
- **N3.** The rank strip's bounds print only under the list, 1,248px below its
  top at both widths (`review/places/rank-390-light-TX.png`). Print them above
  it too, or only above.
- **N4.** The theme control is the last thing on the page — y=5,855 of 5,979
  at 1280, y=8,050 at 390 (`spacing.themeBtnTop`) — and the choice does not
  survive a reload. If it is a control it belongs in the masthead's end slot;
  if it is the sketch's demo control, drop it and let `prefers-color-scheme`
  rule.
- **N5.** On paper the row button keeps `min-height: var(--touch)`, so the
  table spends three of the PDF's seven Letter pages at 44px a row
  (`review/places/print-letter-from-dark-p3.png`). `@media print {
  .hg-row-btn { min-height: 0 } }`, in `tokens.css` since the rule is the
  system's (TODO(system) 9).
- **N6.** The measures overshoot in Archivo: `--measure-wide: 76ch` gives 96
  characters a line on the 13px note under the table, 91 on the callout and 85
  on the method list; `--measure: 60ch` gives 77 on the lede
  (`measurements.json` `1280.lineLength`) — `ch` is Archivo's wide zero
  (TODO(system) 6).
- **N7.** The CSV is named by the archetype id — `hotgap-single-2-2026-09-16.csv`
  — a system name where the file's own `archetype` column has the reader's
  ("1 adult, 2 children (3 and 7)"). Slug the label, or keep the id and say so
  in the button.
- **N8.** Three rules for when a missing child-care subsidy bites:
  `inventory.md:217` "under 6", `model.ts:70` `age <= 12` (core's
  `CHILDCARE_MAX_AGE`, with a stated reason), `app/e2e/places.mjs:207`
  `age < 6`. The e2e's hatch check passes only because this sweep's child-care
  entry is empty — it cannot see the disagreement. One rule, cited in the
  inventory, and the e2e derived from it (TODO(system) 5).
- **N9.** At 390 the two incomplete rows are 90px tall — the *Figures* cell
  wraps inside the 768px table — and the reason is 500px off-screen to the
  right, so the reader sees a tall row with a grey bar
  (`review/places/table-390-light-CO-selected.png`). `white-space: nowrap` on
  `.flag`; the table already scrolls.
- **N10.** In dark mode the *no cliff* tile is the least visible mark on the map:
  `--rule-strong` measures 1.91:1 on the surface (1.96:1 light), and NM is a
  black square with a faint edge (`review/places/figure-390-dark-default.png`).
  Now that a tile is a button, `tokens.css`'s reason for the weak edge ("a
  stronger edge on a thing that cannot be pressed would promise a control")
  no longer holds for it; `--control-edge` (3.74:1 dark, 3.49:1 light) is the
  honest edge for the no-cliff and past-the-axis tiles (TODO(system) 10).

---

## What is right and should not be touched

- **Nothing is typed.** The figure's source line reads policyengine-us 2.6.2
  and the sweep of 2026-09-16 from the file while the frozen mockup still
  prints 2.5.0; the lede's "Fifty-one" and "eleven", the heading's 51, the bin
  bounds, the hatched set and its count, the `$200` floor (core's
  `CLIFF_MIN`) and the state names (core's `STATE_NAMES`) all come from data.
  A fixer must not introduce a typed number anywhere.
- **The four tile states**, distinct by pattern and edge in both modes and in
  the raster print (`review/places/figure-1280-light-m-safeExit.png`: shaded,
  empty NM, dashed NY/NE/MD, hatched WA/NJ); the legend entries are the tile
  classes; hatch stripe 5.11:1 light / 5.97:1 dark; the label ink switches at
  bin 3 and every bin's label is ≥4.51:1 (light 8.11 / 5.16 / 5.37 / 8.56 /
  12.81; dark 6.99 / 4.51 / 5.41 / 8.22 / 11.68).
- **No cliff is not $0** (B4 done): the childless safe-exit view bins from
  $23,000 to $76,000 over 46 states, MD/NM/WI sit in their own block, and the
  table prints *none*
  (`review/places/split-1280-light-childless-safe-exit.png`). Past-the-axis
  keys on the null value as well as the flag (`model.ts:106`).
- **Screenshot survival.** Title, household, measure sentence, bin bounds,
  vintage, model version and *estimates only* are all inside the figure box at
  both widths; the box bleeds to the phone's edge (N7 of the audit, done).
- **CorrectionsApplied** under the map, scoped to the selection, in the
  inventory's row shape with the source word as a tag and the note as the
  cite; the state's SourceNote from `vintages` and `model`; the empty state
  invites rather than apologises.
- **Keyboard.** One tab stop in the map and one in the table (12 stops to the
  theme button, against the audit's 55); arrows move by geography on the map
  and by row in the table; Enter selects; the row's focus ring is intact
  inside the scroller (4px clearance, `review/places/focus-390-light-row-after-2-down.png`);
  selects and buttons take the system ring.
- **The URL** carries household, measure, sort and state, written only after a
  change, so a bare link never moves with the sweep.
- **The CSV**: 51 rows equal to the table cell for cell, 25 columns including
  the sweep stamp, endpoint, model version and every state's vintages, RFC 4180
  with a BOM; the button says what it does ("Download these rows (CSV)").
- **Copy** is in the journalist register: sentence case, no eyebrows, no
  icons, no middle dots, no arrows on links; the hatch caution led by a word;
  the error line says what happened and what to do.
- **Type and space.** One family; a 15px base with a 13px floor honoured
  everywhere except the tile's postal code (the stated exception, 12px at 1280
  and 10px at 390); h1 24 / h2 19 / h3 17 / h4 15; every margin and padding
  on the `--s*` scale (masthead 16, h2 48/12, filters 16, split gap 32,
  figure 24 → 12 below 520px, state block 32, rank groups 24). No horizontal
  scroll at either width.
- **Dark and print.** The ramp reverses its anchor in dark; print from dark is
  light and readable (B2 holds); `thead` repeats on every printed page.
  No motion anywhere, so reduced-motion has nothing to zero, as the README
  allows for this surface.
- **The deliberate changes** — tiles as buttons under `role="group"` with the
  long description updated, nothing selected on load, the view in the URL,
  runtime imports from core — stand; S2 and S4 are what finishing the first
  one costs.

---

## TODO(system)

1. `tokens.css` `.hg-hatch-incomplete`: the stripes must be an SVG (mask on a
   pseudo-element, or a print-only data-URI), and the system's proof must
   include a `page.pdf()` inspection — a raster print check cannot see the
   PDF path (B1).
2. `charts.md` § 2 still says the map is `role="img"` and "not interactive on
   a phone"; the built page's tiles are buttons under `role="group"`. Record
   the decision and its two obligations: a 44px control beside the map (the
   ranked list), and a selection mark distinct from the focus ring (S2, S4).
3. The open-row ground `--surface-sunk` measures 1.07:1 on `--surface` and
   1.08:1 on `--plane` (1.10 / 1.21 dark). Wherever it is the only indicator
   of a selected row (`.hg-table tr:has([aria-current])`, `.hg-rows >
   [aria-current]`), pair it with an ink channel (S3).
4. `charts.md` needs a binning rule for integer measures and for ranges
   narrower than five steps; "five bins, never more" is silent on fewer (S5).
5. `inventory.md` § IncompleteMarker says the child-care entry bites "under
   6"; core prices care through 12 (`CHILDCARE_MAX_AGE`) and the page follows
   core. One rule, in both (N8).
6. `--measure` and `--measure-wide` in `ch` run 25% long in Archivo; express
   them in rem, or as 48ch / 62ch, so prose lands under 80 characters (N6).
7. core's `coverage.ts` notes and the vintage strings are written for a log;
   the inventory binds every surface to print them verbatim, so they must be
   written for the reader (S9; the audit's S13 caseworker cite is the same).
8. FilterRow (#21): a control that scopes one component sits with that
   component, not in the shared row (S7).
9. `.hg-row-btn` should drop its 44px floor on paper (N5).
10. With tiles now pressable, the no-cliff and past-the-axis tiles' edge should
    be `--control-edge`, not `--rule-strong`; the legend swatches follow the
    tile classes and would come along (N10).
