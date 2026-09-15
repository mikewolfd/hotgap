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
`--ink-3`, labelled *if the later change happens*. Render it only when the
deferred drop exceeds ~1.5% of the y-range; below that it is a second line
drawn on top of the first and adds nothing.

### Marks

| Thing | Mark |
|---|---|
| Net income | 2px line, `--series-1`, round join and cap |
| Danger zone | vertical band, `--loss-wash` fill **plus** a 45° hatch at `--loss-hatch` |
| Peak of that zone | 1px rule in `--loss-3` across the band only, direct-labelled with the dollar |
| Immediate cliff | filled dot r4–4.5 in `--loss-4` with a 2px `--surface` ring, and a 2.5px solid connector down to where the line lands |
| Deferred cliff | **hollow** dot (2px `--ink-3` stroke, `--surface` fill), **dashed** 2px stub, and the word *later* |
| The household | a **diamond** in `--ink` with a 2px surface ring and a drop line to the axis — a different *shape*, so position survives greyscale |
| Reference line | 1px `--rule-strong` (present value) or `--loss-3` (the zone's peak). Solid: it is a real number, not a projection |
| Gridlines | 1px solid, `--grid`, horizontal only, 3 on a phone and 4–5 on a desktop |

**Solid means this year. Dashed means a later renewal.** That rule holds across
the whole system — chart, chips, table badges — so a reader learns it once.

### Axis honesty

The y-axis does **not** start at zero, because the whole story is a $9,390 step
on a $68,000 level and a zero baseline flattens it to nothing. A line chart may
do this; a bar chart may not. Two obligations follow, and the sketches meet both:

1. The axis floor is printed in the caption, **rendered from the value the code
   computed** — never typed into the copy, where it would drift the first time
   the data moved.
2. The visible y-range is at least 2.5× the largest plotted drop, so no step is
   exaggerated by a tight crop.

### Phone

The citizen curve **crops to a window** around the household — here $24,000 to
$96,000 out of a $150,000 axis — because 151 points across 340px with eight
labels is not a chart, it is a texture. The caseworker curve keeps the full axis:
that reader wants the $106,000 premium-subsidy cliff in the same picture.

Below 520px: 3 gridlines, 4 x-ticks, the reference-line label drops to the bare
dollar, the *back to even* label is dropped.

### Direct labels

Exactly one on the citizen chart (the largest drop) and one on the caseworker's.
Every other value lives in the ledger, the readout, or the table. A number on
every cliff is the anti-pattern.

### Interaction and the text equivalent

- Crosshair plus a **live readout below the chart** — not a floating tooltip, which
  a screen reader cannot reach and a phone cannot hover. The readout is
  `aria-live="polite"`.
- The chart wrapper is `tabindex="0"`; ←/→ step a point, shift +5 or +10,
  Home/End jump to the ends. Same readout for hover and for focus.
- The SVG is `aria-hidden`; the wrapper is `role="img"` with an `aria-label` that
  states the shape in words, and `aria-describedby` the caption.
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
Five bins, never more: past about seven, adjacent classes blur.

**Bins are recomputed per measure and their bounds are always printed.** A shade
means nothing across two measures, and the caption says so.

**Three tile states, and none may be mistaken for another.** This is a required
part of the grammar, not an edge case:

| State | Mark | Meaning |
|---|---|---|
| **Shaded** | a step of the five-bin plum ramp | a comparable value |
| **Past the axis** | no fill, dashed `--rule-strong` outline, reads *past the axis* | `leapIsLowerBound` — the worst zone runs off the top of the sweep, so the figure is a bound, not a value |
| **Not computed** | grey 45° hatch, solid outline, reads *figures incomplete* | the model returns nothing for this state, so its figure is missing a real cliff |

The third is the dangerous one. `summary.childcareSubsidyUnmodeled` lists the
states where PolicyEngine returns no child-care subsidy at all — 23 of them in
the sweep of 2026-09-15, including Texas, California, New York, Illinois and
Ohio. Those states are **not kinder**. Their largest cliff is simply absent, so a
naive ramp paints them the lightest step and a reader concludes the opposite of
the truth. A gap in a sequential ramp always reads as a low value; the grey hatch
is outside the ramp entirely, and it is deliberately *not* the lightest step.

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

- **Key off the data, never a list in the design.** The field is self-healing: a
  state drops off the day upstream starts modelling it, and the legend's count,
  the prose and the CSV all read from the file.
- **Scope it honestly.** A missing child-care subsidy can only distort a
  household that has a child young enough to need paid care. For the two
  childless archetypes the flag does not apply and the whole treatment
  disappears — and the figure says why, so a reader who watches 23 hatched
  states vanish when they change household is not left guessing.

**Readable without colour.** Every tile carries its postal code; a 2px surface
gap separates tiles; the selected state gets a 2px ink outline, not a hue change.
The three states above are distinguished by fill *pattern* and outline *style*,
not by hue, so they survive greyscale and `forced-colors`.

**Not interactive on a phone.** At 390px a tile is 26px, and a 26px button breaks
the 44px rule. The map is a figure (`role="img"`); the ranked list and the table
below it are the controls, with 44px rows. On a pointer device the tiles carry a
hover title, which gates nothing.

**The ranked strip beside it.** A map answers *where*; a ranking answers *how
much*. Both are always on screen, one filter row scopes both, and the selected
state highlights in both. Colour follows the state, never its rank position.

**Screenshot survival.** Everything a reader out of context needs lives inside
the figure box: title, household shape, what the measure means, the bin bounds,
the units, the source, the policy year, the sweep date, and *estimates only*.
Nothing that matters is in the surrounding page.

---

## Both charts

- One filter row above everything it scopes. Never a filter inside a chart card.
- Text never wears the series colour. A mark, a rule, or a swatch beside the text
  carries identity — including the compared column in the caseworker table, which
  takes a 3px `--series-2` rule under its header rather than orange text.
- Status colours are never used for money. HotGap ships no good/bad pair; see
  `README.md` § The ramp that is not red and green.
