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

### The lift — the rule that is easiest to get wrong

`HouseholdEvaluation.analysis.dangerZones`, `.verdict`, `.escape` and
`.personal` all describe a curve with **deferred drops removed**.
`analysis.points` is the **real** curve (`evaluate.ts` puts the real points back
on the analysis object). Plotting `analysis.points` under `analysis.dangerZones`
draws two different curves.

So the UI lifts the points itself, the same arithmetic as `immediateCurve()`:
add each `deferred[i].drop` to every point above `deferred[i].startEarnings`.
Both sketches do this in six lines and say so in a comment.

The real curve is then available as a **ghost**: the same line, 1.5px, dashed,
`--ink-3`, labelled *if the later change happens*. It is drawn only when a
deferred drop exceeds 1.5% of the y-range; below that it is a second line drawn
on top of the first and adds nothing. **The caption sentence that describes the
ghost is rendered from the same condition** (S14): when no ghost is drawn, the
caption does not mention one. Today's Colorado curve has no deferred drop and
no ghost; the 2026-09-15 sketch had a $219 drop on a $67,000 range and drew
none either, while its caption said it had.

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
| Deferred cliff | **hollow** dot (2px `--ink-3` stroke, `--surface` fill), **dashed** 2px stub, and the word *later* |
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
   step is exaggerated by a tight crop. This is a rule the crop must satisfy,
   not a hope (S14): compute `need = 2.5 × max(drop)` over the drops in the
   window; if `hi − lo` of the plotted slice, after padding, is less than
   `need`, extend the floor and the ceiling equally until the range equals
   `need`, then snap both outward to the gridline step. Widening the x-window
   first is preferred where it adds real data (a wider crop can raise `hi`),
   but padding is the guarantee — today's full Colorado curve spans $48,806
   against a $25,449 drop (1.92×), so even the caseworker's uncropped axis
   needs the extension, and the citizen crop's 14% padding gave 1.3×.

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

### Phone

The citizen curve **crops to a window** around the household, because 151
points across 340px with eight labels is not a chart, it is a texture. The
window contains the diamond and the household's exit (rule 4 above). The
caseworker curve keeps the full axis: that reader wants the $106,000
premium-subsidy cliff in the same picture.

Below 520px: 3 gridlines, 4 x-ticks, the reference-line label drops to the bare
dollar, the *back to even* label is dropped, the leap keeps its label.

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
gap separates tiles; the selected state gets a 2px ink outline, not a hue change.

**Not interactive on a phone.** At 390px a tile is 26px, and a 26px button breaks
the 44px rule. The map is a figure (`role="img"` — it has no keys); the ranked
list and the table below it are the controls, with 44px rows. On a pointer
device the tiles carry a hover title, which gates nothing.

**The figure box** keeps `--s5` padding on a desktop and drops to `--s3` below
520px, which turns 24px tiles into 27px at 358px (N7). It is not a panel.

**The ranked strip beside it.** A map answers *where*; a ranking answers *how
much*. Both are always on screen, one filter row scopes both, and the selected
state highlights in both. Colour follows the state, never its rank position.

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
