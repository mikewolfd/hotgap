# Chart grammar

Two visuals carry HotGap. Everything else is type in a table. Both were built
against the `dataviz` method: form first, colour by job, palette validated with
`validate_palette.js`, marks and spacers fixed, hover by default, accessibility
last.

---

## 1. The money curve

**Form.** One series — net income after health-insurance premiums — against
earnings. A line, 2px, round caps, no area fill. One series means **no legend
box**; the title names what is plotted. What *does* need a key is the set of
non-series marks (band, cliff, deferred cliff, position), because those are
meanings, not identities.

### One curve — the rule that used to be easiest to get wrong

There is exactly one curve to draw, and it is the real one. Plot
`analysis.points` under `analysis.dangerZones` and they agree, because since
2026-09-17 `analysis` *is* the reading of the real points: a loss a federal
rule defers to a later renewal counts in the verdict, the zones, the leap and
the safe exit (README § Honesty; `inventory.md` #10).

Until then `.dangerZones`, `.verdict`, `.escape` and `.personal` described a
curve with deferred drops removed, so the UI had to redo that arithmetic
itself — add each `deferred[i].drop` to every point above
`deferred[i].startEarnings` — and the real curve came back as a dashed
**ghost** line labelled *if the later change happens*. All of it is gone:
`immediateCurve()`, the six-line lift in each chart, the ghost, its 1.5%-of-
y-range threshold, and the caption sentence rendered from that condition. A
deferred drop is now a drop in the line like any other, and what marks it is
the hollow dot and the dashed stub below — the label, not a second geometry.

If you find yourself computing a y-value the evaluation did not give you, stop:
that is the lift growing back.

### Marks

| Thing | Mark |
|---|---|
| Net income | 2px line, `--series-1`, round join and cap |
| The household's zone | vertical band, `--loss-wash` fill **plus** a 45° hatch at `--loss-hatch` — `personal.zone` and only it |
| Any other zone | the hatch alone: no wash, no peak rule, no label |
| Peak of the household's zone | 1px rule in `--loss-3` across the band only, direct-labelled with the dollar (`personal.zone.peakNet`) |
| Exit | the band's right edge, carried up as a 1px `--loss-3` rule, labelled *back to even* (`personal.escapeEarnings`) |
| The leap | a bracket along the peak rule from the diamond's x to the exit, 1px `--loss-3` with 4px end ticks, direct-labelled once with a plus sign: "+$7,000" (`personal.raiseToClear`) |
| Safe from here | a second vertical rule, 1px `--loss-3`, full height, labelled *safe from here* (`escape.safeExitEarnings`) — see *More than one zone* |
| Immediate cliff | filled dot r4–4.5 in `--loss-4` with a 2px `--surface` ring, and a 2.5px solid connector down to where the line lands |
| Deferred cliff | **hollow** dot (2px `--ink-3` stroke, `--surface` fill), **dashed** 2px stub, and the word *later* — sitting on a real drop in the line, because the loss counts; only the timing is being marked |
| The household | a **diamond** in `--ink` with a 2px surface ring and a drop line to the axis — a different *shape*, so position survives greyscale |
| Reference line | 1px `--rule-strong` (present value) or `--loss-3` (the zone's peak). Solid: it is a real number, not a projection |
| Gridlines | 1px solid, `--grid`, horizontal only, 3 on a phone and 4–5 on a desktop, on nice values (below) |

**Solid means this year. Dashed means a later renewal.** That rule holds across
the whole system — chart, chips, table badges — so a reader learns it once.

### The leap, the exit, and more than one zone (S7)

The system's named derived quantity — the leap — is drawn, not inferred. The
band is `personal.zone`; the exit is its right edge; the leap is the bracket
from the diamond to that edge, and it is the second figure the AnswerSentence
names (`inventory.md` § Verdict catalog). All three come from
`evaluation.personal`, never from the whole-curve `escape`, because the
household's question is "how much more do *I* need", and the archive's
whole-curve exit on the personal door was a reviewed defect.

`analysis.dangerZones` can hold several zones. Today's Colorado curve has four
($6k–$10k, $26k–$30k, $36k–$45k, $46k–$119k); the household's is the third and
the widest begins one step after it ends. The rules:

1. **One band.** Only `personal.zone` gets the wash, the peak rule, the exit
   label and the bracket. Every other zone is drawn as hatch alone, so a
   reader sees that further flat stretches exist without the chart pretending
   they are this household's.
2. **Safe from here** is `escape.safeExitEarnings`: the earnings past which no
   zone exists on the curve. When it equals `personal.escapeEarnings` (the
   household's zone is the last), the one rule carries both labels, *back to
   even, and safe from here*. When it lies beyond, it is a second rule, and
   the answer-sub says so from the data: "It happens again between $45,000
   and $119,000." When it is null (`leapIsLowerBound`), no rule is drawn and
   the caption says the sweep never found it.
3. **A stuck zone** (`personal.raiseIsLowerBound`): the band runs to the
   right edge of the plot with no exit rule, the bracket is open-ended (no end
   tick) and labelled "more than +$X", and the sentence takes the *stuck*
   shape.
4. The citizen window must contain the diamond and the exit; *safe from here*
   need not be in the window and is stated in the caption when it is not.

### Axis honesty

The y-axis does **not** start at zero, because the whole story is a $25,449 step
on an $84,000 level and a zero baseline flattens it to nothing. A line chart may
do this; a bar chart may not. Two obligations follow:

1. The axis floor is printed in the caption, **rendered from the value the code
   computed** — never typed into the copy, where it would drift the first time
   the data moved.
2. **The visible y-range is at least 2.5× the largest plotted drop**, so no
   step is exaggerated by a tight range. This is a rule the range must
   satisfy, not a hope (S14): compute `need = 2.5 × max(drop)` over the drops
   on the curve; if `hi − lo`, after padding, is less than `need`, extend the
   floor and the ceiling equally until the range equals `need`, then snap both
   outward to a quarter of the gridline step. Today's full Colorado curve
   spans $48,806 against a $25,449 drop (1.92×), so even an uncropped axis
   needs the extension.

   Since the curve stopped being cropped (§ The scroll rule) the range is the
   **whole curve's** and the rule almost never bites — the climb from $0 to
   $150,000 is a far wider range than 2.5× any one step. The padding came down
   from 14% to 6% with the crop: the ends of a crop were arbitrary, and a line
   running into an arbitrary edge looks cut off, but the ends of the whole
   curve are real points at real pay. Every dollar of slack here is a dollar
   of range that makes every drop shorter in pixels, which is now the scarce
   thing (§ The scroll rule's 24px floor).

### Gridlines on nice values (N1)

Ticks are never `range / n`. The step is `range / n` snapped to the nearest
of 1, 2, 2.5 or 5 × 10^k, and the ticks are the multiples of that step inside
the range, so gridlines land on $60k and $80k, not $53k and $67k. The same rule
runs on the x-axis in the display unit (below), so an hourly axis ticks at $2
or $5 an hour and a monthly one at $500 or $1,000.

### Pay in the person's unit (M5)

The citizen curve's x-axis is in the unit the person gave — hour, month or
year (`Pay.unit`, `core/src/income.ts`). **Ticks are generated in the display
unit and mapped back to annual dollars for position** (`toAnnual`): ticking in
annual dollars and rounding the label put an hourly label about 25% off its
pixel in the archive, and that defect stays fixed. The title states the unit
once. The y-axis is yearly money on every surface; the caseworker and
journalist x-axes stay annual.

### Cliff marks as controls (M6, S8, S12)

Every cliff dot is also a control, so "what ends *there*?" is answered by
touching the thing, on a phone or with a screen reader, without a hover:

- The wrapper is `.hg-chart` with `role="group"`,
  `aria-roledescription="interactive chart"`, `tabindex="0"`, the
  `aria-label` that states the shape in words, and `aria-describedby` the
  caption. It is **not** `role="img"`: a screen reader announces an image and
  does not expect keys. It is the chart's one tab stop.
- Over the SVG sits `.hg-marks`, and on each cliff a `.hg-mark` `<button>`
  (44px, transparent, centred on the dot by percent of the box, `tabindex="-1"`)
  with `aria-expanded` and a label in the surface's register — citizen: "A
  drop near {pay}. You'd lose about {drop} a year here."; caseworker: "Cliff
  at {start} to {end}: {drop}. {programs lost}." — where {pay} is in the
  person's unit and {drop} is rounded to $100 on the citizen surface.
- Keys on the wrapper: ←/→ step a point, shift +5 or +10, Home/End jump to
  the ends, **`]` and `[` move focus to the next and previous cliff mark**,
  Enter or Space on a mark activates it, Escape closes.
- Activating a mark moves the cursor and readout to that step and opens its
  row: on the caseworker the DropLedger row (which drives BreakdownBars —
  **one selection model**, the row button gets `aria-current="true"`), on the
  citizen the StepList row (`aria-current="true"`, scrolled into view; the
  row *is* the card, there is no popover). `aria-expanded` on the mark mirrors
  whether its row is open.
- Three review rules travel with it: **focus returns to the mark** when its
  row closes; **selection clears** when a recompute (a what-if toggle) no
  longer has that cliff, so a row cannot silently re-open on a different
  step; copy above current pay is conditional ("would").
- **Collision (S8).** Two dots whose x positions are closer than 10px merge
  into one mark: a single `--loss-4` dot r6 with the count in `--surface` ink
  (`.hg-mark__count`), one connector to the lowest landing, and a label "{n}
  drops between {pay₁} and {pay₂}, together about {sum} a year." Activating it
  opens the first cliff's row; the ledger or StepList is where they separate.
  Today's Colorado axis puts three dots within 12px (x = 255, 263, 267 at
  1280px) and the citizen crop overlaps $53k and $54k.

### The scroll rule (2026-09-17)

**Both curves draw the whole earnings axis and scroll it. No viewport decides
which part of the curve exists.** The citizen curve used to crop to a window
around the household — 151 points across 340px with eight labels is a texture,
not a chart — and the crop was the answer to the phone. It was the wrong
answer: a household whose worst cliff sits $55,000 past its exit was shown a
picture the cliff was not in, and a caption that said so is not the same as
letting them look.

The figure is therefore two SVGs side by side in one `.hg-chart--scroll` flex
row:

- **The gutter.** The y-axis and its tick labels, in a fixed 44px (narrow) or
  52px (wide) SVG *outside* the scroller. It cannot scroll away, so the
  reader never sees a curve with no scale beside it.
- **The scroller.** `.hg-chart__scroll` (`.hg-scroll-x`, `touch-action:
  pan-x pan-y`), holding the plot SVG and the marks layer, both sized to the
  plot's own width so a mark travels with its dot. The x-ticks are in here
  and move with the curve.
- **The hint**, `.hg-chart__hint`, *outside* the scroller: "← $0" and
  "$150,000 →", the axis's real ends rendered from the data, in copy. It is
  outside because `.hg-scroll-x`'s own `data-more` hint is a block in the
  scrolling content — right for a table, wrong for an 1,800px plot, where it
  would scroll off the left edge with the curve.

Neither SVG is stretched to its box: both carry a `viewBox` **and** matching
`width`/`height`, because the scale *is* the geometry here.

**`windowFor` is now where the reader starts, not what exists.** The same
function, the same reasons — the household, its danger zone, that zone's exit,
the next cliff, and the biggest drop when it lies within `WINDOW_MARGIN`
($30,000) — but it chooses `scrollLeft`. The window is centred in the viewport,
then the diamond is pulled inside it by 44px, because "you" being on screen is
the one thing the initial view owes. A mark taking focus scrolls itself into
view with the same margin (`scrollToShow`), so `[`, `]`, the arrows and Home
all reach the whole axis; a pointer never scrolls, because the finger is
already on the pixel it named.

**The scale is derived, not fixed.** `scaleFor` gives the window one screen of
scroller: one viewport of scrolling shows the pay the crop used to show, at the
legibility it had, and everything the crop threw away is a swipe either side.
A constant px-per-$1,000 fails both ways — it squeezes a $44,000 window on a
phone, and it stretches the $750,000 axis a caseworker's live curve can reach
to nine thousand pixels, twenty-nine screens of swiping. `MAX_SCREENS = 6`
guards the second case: past six screens the axis is not reachable by hand, so
the scale zooms out until it is, and the initial view then shows *more* pay
than the window, never less.

**Paper cannot scroll**, so the print draw is told so: the whole axis is fitted
into the page's column (640px citizen, 672px caseworker, gutter included), the
x-tick step grows so the type never shrinks below the 9pt floor, the caption
says the whole range is shown, and the hint and the edge fade are off. The
redraw hangs off `beforeprint`; `afterprint` gives the scroller back.

#### Height is chosen by the biggest drop

The cost of an honest y-range is pixels: the range is the whole curve's now, so
the biggest drop is a much smaller share of it than it was inside a crop. Height
is the only thing left that buys those pixels back, so the plot is **exactly as
tall as the biggest drop needs to stand 24px**, clamped to 260–560px of
drawing area (324–624px with padding).

The ceiling bites, and it is honest about where. Measured on the citizen
review's eight households at 390 and 1280 (`app/e2e/scroll-curve-review.mjs`,
`design/review/scroll-curve/`):

| household | plot width @390 / @1280 | height | biggest drop | where it starts |
| --- | --- | --- | --- | --- |
| CA archetype `94110` | 1,083 / 1,889px | 371px | **24.1px** | 0.95 viewports out |
| Wisconsin, no cliff | 1,606 / 2,816px | 324px | — | — |
| CA + Head Start | 1,555 / 2,726px | 324px | **57.5 / 59.5px** | in the initial view |
| CA at $125,000 | 1,254 / 2,192px | 468 / 456px | **24.0 / 24.1px** | in the initial view |
| hourly, $18.50 × 35h | 1,185 / 2,070px | 324px | **62.9px** | in the initial view |
| Massachusetts | 1,185 / 2,070px | 624 / 617px | 23.1 / 24.0px | 0.54 viewports out |
| Texas | 808 / 1,403px | 624px | 23.1 / 22.3px | 0.58 viewports out |
| New Jersey | 1,275 / 2,231px | 624px | 23.7px | 1.26 viewports out |
| caseworker, CA archetype | 1,079 / 2,065px | 405 / 337px | 24.1px | 0.95 viewports out |

Massachusetts, Texas and New Jersey are **at the ceiling and still short of
24px** — 22.3 to 23.7px. Reaching the floor would need plots 600–880px tall,
which is a scrolling page and not a figure. That is the price of never cropping
the curve, and it is paid in the drop's *height*, not in its dollars: the
direct label, the readout, the StepList row and the DataTable all carry the
money in text. The two households whose drop clears the floor easily (Head
Start at 57.5px, hourly at 62.9px) are the ones whose biggest drop is a
deferred cliff, which since 2026-09-17 counts.

**The biggest drop is not promised to be in the initial view.** Three of the
eight land outside it, New Jersey's by 1.26 viewports, because `windowFor`
spends the view on the household's own zone before a cliff $46,000 up the axis
(REVIEW-citizen B2: a half-axis view made a $2,400 step two pixels tall).
There is no upper bound on the distance — a worst cliff can be anywhere on its
axis — so what the reader is owed is reachability: the whole axis is drawn, the
hint says where it runs, and `[` `]` walk to it.

### Phone

Below 520px: 3 gridlines, 4 x-ticks, the reference-line label drops to the bare
dollar, the *back to even* label is dropped, the leap keeps its label. The
gutter is 44px instead of 52px. The caseworker curve is scrolled the same way
as the citizen's, and its compare columns are untouched by any of it.

### Direct labels

Exactly two on the citizen chart (the largest drop and the leap) and two on the
caseworker's. Every other value lives in the ledger, the readout, or the table.
A number on every cliff is the anti-pattern. Tick labels take `.hg-tick`
(12px); word labels take `.hg-label` (13px) — never a bare `font-size`.

### Interaction and the text equivalent

- Crosshair plus a **live readout below the chart** — not a floating tooltip, which
  a screen reader cannot reach and a phone cannot hover. The readout is
  `aria-live="polite"`. Same readout for hover, for the keyboard caret, and
  for a mark just activated.
- The SVG is `aria-hidden`; the marks layer is not.
- Every curve ships a table twin. Citizen: the eight points that matter — the
  peak, each threshold, the household, the exit. Caseworker: every cliff, with the
  four-part breakdown. Tooltips never gate a value.

### The cliff breakdown is not a stacked bar

`CliffBreakdown` has four parts that sum to the drop **and one of them is usually
negative** (a falling tax bill offsets the loss). A stacked bar cannot show that
honestly, and four categorical hues would spend the identity channel on four
labels that are already written on the rows.

So: four rows, one bar each, from a centre zero rule. Right of zero adds to the
loss, left offsets it. One hue — `--loss-4` for positive, `--loss-2` for
negative. Value at the tip. The footer states the sum and the `driver`.

---

## 2. The state map

**Form.** A **tile cartogram** — 51 equal squares, one per state including DC,
each in roughly its geographic place. Equal area is the point: these are 51 sets
of rules, not 51 land masses, and a real choropleth would give Texas twenty times
the visual weight of Connecticut for no reason. It also fits 12 columns into a
phone and includes DC without a callout box.

**Colour.** Sequential — one hue, five equal-width bins over the observed range,
light to dark, from the `--loss-*` ramp. Validated with `--ordinal` in both
modes: monotone lightness, adjacent ΔL ≥ 0.06, light end ≥ 2:1 on its surface.
Five bins, never more: past about seven, adjacent classes blur. **A tile's
postal code is `--ink` on bins 1–2 and `--surface` on bins 3–5**: measured,
`--ink` on bin 3 is 3.24:1 light / 2.92:1 dark and fails AA at 9–12px, while
`--surface` there is 5.37:1 / 5.41:1 (S3).

**Bins are recomputed per measure and their bounds are always printed.** A shade
means nothing across two measures, and the caption says so.

### The diverging ramp, for a measure with a meaningful zero

A measure whose zero is a **fact about the world** — not the bottom of a scale —
takes two ramps, not one. On this site that is the keep rate, where zero is the
line between a family that ends a climb out of poverty poorer than it began and
one that keeps a little of each extra dollar. Below zero is the plum loss ramp,
which already means "money lost" everywhere else on the site; above it the
**keep ramp** (`--keep-1..5`), the second arm, warm. Five rules:

1. **Zero is always a bin edge**, and it is printed. The span is stretched to
   include zero — a scale whose states all keep starts at zero rather than at
   the lowest state — which is the one place this system bins from zero rather
   than over the observed range, because here zero is the fact a reader is
   looking for and not an empty corner of the scale.
2. **Each arm is cut over its own reach**: three equal steps from zero out to
   the furthest state on that side, the arm's ramp end to end, lightest against
   the hinge. One width shared by both arms was built first and rejected on the
   page: the arms are wildly asymmetric (105¢ and 30¢ on the committed sweep),
   so the short arm got a single class and half the map was one flat colour. The
   property a shared width buys — depth meaning the same distance from zero on
   either ramp — is one a reader cannot use, because comparing depth across two
   hues is not something the eye does reliably.
3. **Both widths are printed**, for the same reason: "three steps of 35¢ below
   zero and three of 10¢ above it, from −105¢ to +30¢". A step on one arm is not
   a step on the other and the caption must not let a reader think it is.
4. **Six swatches, not five**, because this is two scales meeting. The gap where
   they meet is wider than the gaps inside each arm: the hue change says which
   way is which, the gap says where the turn is.
5. **The hue is the sign, so the pair has to survive colour blindness.**
   Measured with a Viénot 1999 dichromat simulation, CIE76 ΔE between the arms'
   matching steps, both themes: plum against the warm keep ramp is 38 or better
   under protanopia and deuteranopia; plum against the blue money line collapses
   to 2.4 and plum against teal to 5.6 — both unusable for about one man in
   twelve. Tritanopia loses this pair instead, as it loses every warm/cool
   diverging scale, and that is ~0.01% of readers against ~8%. The sign is
   carried in words as well, three more times: the scale's two ends are named in
   full ("loses 105¢ of each extra dollar"), every tile's own name says its
   rate, and the ranked strip's bars run left of the hinge for a state that
   loses. `app/src/places/model.ts` `divergingBins` is the rule.

**The ranked strip follows the same zero.** The standing rule — a dot on a
shared axis, never a bar, because a bar's length has to be read from a zero the
axis does not have — holds for every measure but this one. The keep rate's axis
CONTAINS zero, so the bar is the right mark: it runs from the hinge, left for a
state that loses and right for one that keeps, with the hinge drawn as one rule
down every row and labelled on the axis above them.

**Fewer than five, for a count.** "Five, never more" is silent on fewer, and a
count measure binned five ways over a range of 0 to 1 printed the scale
*0 0 0 1 1 1* (places review S5). So a measure in whole numbers takes
**classes of whole numbers**: the class width is the smallest whole number
that fits the observed range in five classes or fewer (`width = max(1,
ceil((hi − lo + 1) / 5))`), the classes that exist are the swatches — two
for 0–1, four of four for 4–19, one when every state agrees — each labelled
with what it holds ("0", "1", "4–7"), and they are spread over the ramp so
the two ends of any scale are the ramp's two ends. The caption says "*n*
classes from *lo* to *hi*". A dollar measure keeps its five equal-width
steps and its six printed bounds. `app/src/places/model.ts` `bins` is the
rule.

**Four tile states, and none may be mistaken for another.** This is a required
part of the grammar, not an edge case:

| State | Mark | Meaning |
|---|---|---|
| **Shaded** | a step of the five-bin plum ramp | a comparable value |
| **No cliff** | no fill, solid `--rule-strong` outline, reads *no cliff*; `.hg-tile--none` | `cliffCount === 0` — the model found no step down of $200 or more anywhere on this household's curve. A measurement of zero, and the best news on the map (B4) |
| **Past the axis** | no fill, dashed `--rule-strong` outline, reads *past the axis*; `.hg-tile--past` | the worst zone runs off the top of the sweep, so the figure is a bound, not a value |
| **Not computed** | the 45° hatch, solid outline, reads *figures incomplete*; `.hg-tile--incomplete` + `.hg-hatch-incomplete` | the model returns nothing for a program this household would hold, so its figure is missing a real cliff |

They are distinguished by fill *pattern* and outline *style*, never by hue, so
they survive greyscale and `forced-colors`; the legend entry for each is the
same class as the tile (`.hg-swatch--none`, `--past`, `--incomplete`), so the
legend cannot drift from the map.

### No cliff (B4)

Eleven cells in today's summary have `cliffCount === 0` (New Mexico alone has
eight). Their row is `[0, 0, 0, 0, 0, 0, 0]`, and a page that treats it as a
value paints the lightest bin, ranks it last as "$0", prints "Safe exit: $0",
and lets it set the bin floor to $0 — squeezing every real state into the top
bins. So:

1. **Never shade it and never bin it.** `cliffCount === 0` is excluded from
   the bin computation on every measure.
2. **Its own block under the ranking**, headed *No cliff found (N)*, above the
   not-ranked block; never the tail of the order, where "last" reads as
   "smallest".
3. **Its own legend entry**, drawn with the tile's class.
4. **The table prints *none***, not `$0`, for width, leap and exit; the count
   columns print 0.
5. **A null plotted value is past the axis, whatever the flag says.** Two
   cells today have `safeExit: null` with `leapIsLowerBound: false` (NE
   single-1 and single-2); keying *past* only on the flag sends `null` into
   the bin index and yields an unshaded, untitled tile. `past` is true when
   the plotted value is `null` **or** the flag is set.

### Not computed (B1)

The dangerous one. `coverage[state].unmodeled[]` — present for every state in
`summary.json` — names the programs the model cannot compute there:
the child-care subsidy where PolicyEngine paid $0 at every point to a paying
archetype (`coverage.ts` puts it here whenever the optional
`summary.childcareSubsidyUnmodeled` returns; it is absent from the
2026-09-16 sweep), a state premium program with no upstream variable and no
local ladder (NJ, WA today), and LIHEAP everywhere, which never reaches net
income and is not a reason to hatch. Those states are **not kinder**. Their
largest cliff is simply absent, so a naive ramp paints them the lightest step
and a reader concludes the opposite of the truth. A gap in a sequential ramp
always reads as a low value; the hatch is outside the ramp entirely, and its
`--ink-3` stripes measure 5.11:1 in light and 5.97:1 in dark on the sunk ground,
so the *pattern* — the channel that survives greyscale — is what a reader sees.
The stripes are an SVG mask over a pseudo-element, never a CSS gradient: the
PDF path flattened a repeating gradient to one shading, and a page saved as
PDF showed a hatched state as a pale square (places review B1). The system's
proof reads the PDF's own drawing ops for the hatched tile, because a raster
print check cannot see that path.

Four rules follow, and all four are required:

1. **Never shade an incomplete state.** Hatch it, in place, so a reader still
   finds Texas where Texas is.
2. **Never rank it.** It leaves the ordered list and goes into a separate block
   headed *Not ranked — figures incomplete (N)*, never the tail of the ranking,
   where it would still read as "lowest".
3. **Never let it move the scale.** Bins are computed over the comparable states
   only; a known-wrong number must not set a bound.
4. **Keep the number in the table**, flagged in its own column, because a
   reporter has to be able to see what the model returned.

Two more properties this has to have:

- **Key off the data, never a list in the design.** The field is self-healing:
  a state drops off the day upstream starts modelling it, and the legend's
  count, the prose and the CSV all read from the file. The sketches of
  2026-09-15 carried two hard-coded lists that disagreed with each other and
  with the file; nothing is typed now, including the count.
- **Scope it honestly.** A missing child-care subsidy can only distort a
  household that has a child young enough to need paid care; a missing premium
  program distorts every household. For the childless archetypes the
  child-care entry does not apply and those tiles shade — and the figure says
  why, so a reader who watches the hatched states vanish when they change
  household is not left guessing.

**Readable without colour.** Every tile carries its postal code; a 2px surface
gap separates tiles; the selected state gets a 2px ring, not a hue change.

**The tiles are buttons.** The built page (`app/places.html`) made each tile
a `<button>` under `role="group"` with a roving tabindex — one tab stop,
arrow keys by geography, Enter to open the state's corrections under the
map — because a reporter on a pointer device reaches for the tile, and a
screen reader wants the state's name and value where the mark is. The
sketch's `role="img"` map with no keys is superseded. A tile is sized to its
square, 28px at 390 and 40px at 1280: above WCAG 2.5.8's 24px floor, below
the 44px target. The decision carries two obligations (places review S2,
S4), and both are the page's to keep:

1. **A 44px control beside the map.** The ranked list is that control: each
   row is a `.hg-row-btn` at `--touch` below 62rem and at the list's 26px
   density beside the map above it, one tab stop with the arrow keys moving
   by row, and it opens the same state. The table's rows are the third
   group, 44px everywhere on screen.
2. **A selection mark distinct from the focus ring.** The selected tile
   takes a 2px ring *inside* its square in its label's ink (`box-shadow:
   inset 0 0 0 2px currentColor`); the system focus ring stays outside. Two
   positions, two inks, so a focused tile and the selected tile never show
   the same square.

On a pointer device the tiles also carry a hover title, which gates nothing.

**The figure box** keeps `--s5` padding on a desktop and drops to `--s3` below
520px, which turns 24px tiles into 27px at 358px (N7). It is not a panel.

**The ranked strip beside it.** A map answers *where*; a ranking answers *how
much*. Both are always on screen, one filter row scopes both, and the selected
state highlights in both — on the row, the sunk ground with a 3px ink bar,
never the ground alone (`inventory.md`, the class map's fourth rule). The
axis bounds print above the list, where a reader meets them first. Colour
follows the state, never its rank position.

**Screenshot survival.** Everything a reader out of context needs lives inside
the figure box: title, household shape, what the measure means, the bin bounds,
the units, the source, the policy year, the sweep date, the model version, and
*estimates only*. Nothing that matters is in the surrounding page.

---

## Both charts

- One filter row above everything it scopes. Never a filter inside a chart card.
- Text never wears the series colour. A mark, a rule, or a swatch beside the text
  carries identity — including the compared column in the caseworker table, which
  takes a 3px `--series-2` rule under its header rather than orange text.
- Status colours are never used for money. HotGap ships no good/bad pair; see
  `README.md` § The ramp that is not red and green.
- Motion reads `--dur-draw` and `--ease` (`.hg-draw`); a page never checks
  `prefers-reduced-motion` itself.
