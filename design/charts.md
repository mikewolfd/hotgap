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
the safe exit (`docs/methodology.md` § Honesty; `inventory.md` #10).

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

#### Height is chosen by the biggest drop, and by the screen

The cost of an honest y-range is pixels: the range is the whole curve's now, so
the biggest drop is a much smaller share of it than it was inside a crop. Height
is the only thing left that buys those pixels back, so the plot is **exactly as
tall as the biggest drop needs to stand 24px**, clamped to 260–560px of
drawing area (324–624px with padding).

Since 2026-09-18 there is a **second floor: what is left of the first screen.**
The plot fills the space between its own top and the bottom of the first
viewport, less the room the hint and the readout need. On a phone that is the
difference between a picture a person looks at and one they scroll past, and
it is the same rule that makes `weight.mjs`'s *figure share of screen 1*
reachable. The ceiling is unchanged, so a figure is never taller than a
screen; the drop floor still wins wherever it asks for more; and where the
screen asks for more than the data did, the drop gets those pixels too — the
three households `charts.md` recorded at 22–24px are the ones that gain.

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

### A finger on the curve (2026-09-19)

A horizontal drag on a scrolling plot is two gestures in one coat — a scrub
("what does this pay come to?") and a swipe ("show me further along") — and
they cannot both win. The browser decides: once it recognises a pan it sends
`pointercancel` and no listener hears the finger again.

**The pan wins.** The plot is three to six screens wide, and a gesture that
cannot reach the rest of the axis would make § The scroll rule unreachable by
the one input most readers have. So the plot carries no `touch-action` of its
own and inherits `pan-x pan-y` from `.hg-scroll-x` around it; only the gutter,
which is outside the scroller and has nothing to pan, keeps `pan-y`.

**The readout is not lost to that choice.** It reads the pay under the finger
on touchdown, follows the finger for as long as the browser has not claimed
the gesture, and then — while the finger is still down — re-reads on every
scroll of the plot, because *the pay under a still thumb changes when the
curve travels beneath it*. "Move along the line for any pay" holds on a phone
with the line doing the moving, and no pixel of the axis is walled off.
`pointercancel` deliberately does not end it: it means the browser took the
gesture, not that the thumb left the glass. A mouse never pans, so hover and
drag scrub exactly as before, and the keyboard is untouched
(`lib/chart/draw.ts` `attachCursor`).

The rule that used to sit here, `touch-action: pan-y` on every SVG in a chart,
was right for a fixed crop and outlived the scroll rule by a month: because
`touch-action` is the INTERSECTION of the whole ancestor chain, it beat the
scroller's own `pan-x pan-y` and no finger could move either curve at all,
while a mouse wheel over the same pixel moved it 180px
(`REVIEW-touch-2026-09-19` B1).

### A mark takes 44px, or all the room there is (2026-09-19)

Every cliff mark is a 44px hit square on its dot — **narrowed to the gap to
its nearest neighbour where that gap is less than 44px**, so the marks tile
the axis and two are never stacked (`lib/chart/draw.ts` `markWidths`). The
merge rule above is about drawing; this is about the thumb, and they are
separate numbers on purpose.

44px buttons centred on dots 25px apart overlap by 20, the topmost takes both
taps, and the loser is unreachable — the caseworker's $51,000 cliff measured
0×0 to a hit test while reading as fully compliant from the stylesheet. There
is no floor under the gap: 24px (WCAG 2.5.8's) put two bands back on top of
each other by 3px on that same axis. A cliff's x IS the pay it happens at, so
the dots cannot be moved apart to make room without the picture telling a lie
— WCAG 2.5.5's *Essential* exception — and `app/e2e/touch.spec.ts` allows a
short mark only when its box is exactly the room available and nothing is
covering it, so a mark short for any other reason is still a finding.

### Direct labels (rewritten 2026-09-18)

The old rule was *exactly two on the citizen chart* — the largest drop and the
leap — and it was right for a page whose paragraphs carried the answer. The
paragraphs are gone (`PICTURE-FIRST-2026-09-18.md`), so the labels carry it.
What replaces the count is a **priority list and a collision test**, which is
the thing the count was really protecting: a number on every cliff is still
the anti-pattern.

Drawn in this order, each only if it fits:

1. **`you keep $45,283`** — at the household's diamond, in `--ink`,
   `--w-semi`. The one place the y-axis is named in dollars a person
   recognises, and the fact that left the answer sentence to come here.
2. **`−$3,513` / `food help ends`** — the largest drop, two lines, `--loss-ink`
   at `--w-semi` over a halo. The heaviest ink on the picture: it is the
   thing the page exists to show. The second line is the plain phrase for
   `programsLost[0]` (`inventory.md` § Program phrases), or nothing when the
   cliff names no program.
3. **`back to even`**, and **`safe from here`** when that is a different pay —
   on their rules, `--loss-3`, `--w-med`. Both drop below 520px and the
   caption says them instead.
4. **`later`** over a deferred mark's dashed stub, with that drop's money
   beside it when there is room. Solid means this year, dashed means a later
   renewal, here as everywhere.
5. **`+$7,000`** — the leap, on its bracket, `--w-semi`.
6. **`you keep 12¢ of each extra dollar`** — once, on the road out of poverty
   (`evaluation.road`), in `--ink-3` below the axis, where it cannot be read
   as part of the curve. Sign and cents from `keepRateWords`, never rounded
   locally.
7. Every remaining drop, **biggest first**, while room lasts — at most three
   drop labels on the picture, 2 included. Biggest first and not in axis
   order, because a crowded stretch would otherwise spend the last label on
   the smallest step in it: a $677 drop named beside a $2,387 one that is not.
   **Only marks inside the box the reader is looking through** (caseworker,
   2026-09-18): a label for a mark off the edge of the view is drawn half
   under the scroller's clip, where it reads as broken text rather than as
   "more over there" — two readers, in two languages, stopped on "…o TANF"
   against the left edge — and it spends a label the reader cannot see. 2 is
   exempt: it always draws, wherever its mark is, which is the promise the
   page makes.

**A what-if line's tag comes third**, between 2 and 3 (caseworker,
2026-09-18). It is not a fact about the household's own curve, but a line
nobody can name is a line that lies, and a second curve is a heavier claim on
the reader than any of the rules below it. See § A what-if is a second line.

**A drop's label is two lines**: its money, then what ends there — the plain
phrase for `programsLost[0]`, which is the sentence this page used to spend a
paragraph on. A number with no cause is half a label. Where the two-line box
finds no clear spot and the one-line box does, the money goes alone; the
largest drop keeps both lines even when it has to be forced, because it is the
label the page promises.

**A merged mark's second line is its count**, not a program (caseworker,
2026-09-18): its money is the *sum* of the cliffs under it, and because dots
merge by pixel distance that sum is a different figure at a phone's scale from
the one a laptop prints for the same step — a counselor said she would not
know which number to read out. *2 drops together* says what the figure is; the
rows are where they separate. Naming one of several programs there would be a
half-truth, which is why the citizen review left the line blank; a count is
true and it is the thing that was missing.

**Collisions.** Each label's candidate spots are tested against the dots (with
the open ring's box), the diamond, and every label already placed. The spots
run right of the mark first (beside a tall connector, above the dot, below the
landing), then above it, then left: a flat stretch puts three dots and a
diamond inside sixty pixels, and the right-hand side alone is not room enough
for a label that names a program. A label with no clear spot is **dropped, not
drawn overlapping** — its money is in the readout, the step row and the table,
all of which are a key press away. The single exception is 2, which always
draws, at its first spot. Because placement is in priority order, a crowded
curve loses its last label, never its first.

**A label is nudged inside the box the reader is looking through**, not merely
inside the plot: the initial view when its mark is in that view, the whole
plot when the mark is further along the axis, and the plot on paper, where
there is nothing to scroll. Clamping to the plot alone put "cash help ends"
half off the left edge of a scrolled phone.

**Deleted in the same pass:** the peak rule's dollar. It printed a number two
inches from *you keep* that was within a rounding of it, and it was one of the
three collisions citizen review S3 found. The peak rule itself stays: the band
needs its top edge.

Tick labels take `.hg-tick` (12px); word labels take `.hg-label` (13px) —
never a bare `font-size`.

### A what-if is a second line (2026-09-18)

The caseworker surface is the only one with what-ifs (`README.md` § Where the
personas conflict, 2), and until this pass its comparison was a table: a
counselor met four columns of figures before she met the two curves they came
from. Picture first means the comparison is the picture, so **every what-if
that has an evaluation is drawn on the base household's own plot**, and the
CompareTable is what she opens to read the figures off.

- **How it is drawn.** The same axis, the same scale, mapped through the base
  plot's own `px`/`py`, clipped to the base's earnings axis: two curves on two
  scales are not a comparison. 1.5px against the base's 2px, in `--series-2` —
  the ink the CompareTable already rules its what-if columns with, so a line
  and its column are one mark — and drawn *under* the base line, which is
  never the curve a reader has to hunt for.
- **A raise is not a second line.** A what-if that changes only pay is
  answered with the *same points*: its line would lie exactly under the base's,
  say nothing, and claim there are two curves. It is a second **position** on
  the one curve, and position is a diamond everywhere in this system — hollow
  and in the what-if ink, so it is never the household's own filled one. The
  test is the points, not the diff: the same raise in another state is a real
  second curve and gets a line.
- **How many.** Three. A fourth what-if keeps its column, its keep rate and
  its on-the-way list, and the caption says how many lines are drawn and how
  many are not. A column that is still computing, that failed, or that the
  sweep cannot answer has no evaluation and therefore no line: the picture
  never draws a curve nobody computed.
- **How they are told apart.** By dash and by tag, never by colour alone:
  three patterns (`7 4`, `2 3`, `10 4 2 4`), one tag each, and a key entry
  drawn in the line's own dash inside *How to read this picture*. Greyscale, a
  photocopier and a colour-blind reader keep the distinction; a tag the
  collision rule has to drop costs a reader the name, not the difference.
- **What the tag says.** The answer that changed, in the fewest words that
  name it — the pay figure alone for a pay what-if (`$55,000`), otherwise the
  control's own name (`Housing voucher`, `CCDF subsidy`), which is already the
  shortest name the office uses and the same name the chip, the note and the
  column carry (review S1). It sits at that what-if's own pay, which is where
  that scenario puts the family, and it takes the same spots-and-collision
  test as every other label.
- **What it costs the y range.** A what-if's own nets widen it, so the base's
  drops are shorter in pixels than they would be alone. That is honest and it
  is the price of one scale: the 2.5× floor still holds and the caption prints
  the ratio it actually drew at.

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
**keep ramp** (`--keep-1..5`), the second arm, warm. Six rules:

1. **Zero is always a bin edge**, and it is printed. The span is stretched to
   include zero — a scale whose states all keep starts at zero rather than at
   the lowest state — which is the one place this system bins from zero rather
   than over the observed range, because here zero is the fact a reader is
   looking for and not an empty corner of the scale.
2. **Each arm is cut over its own reach**: equal steps from zero out to the
   furthest state on that side. One width shared by both arms was built first
   and rejected on the page: the arms are wildly asymmetric (105¢ and 30¢ on
   the committed sweep), so the short arm got a single class and half the map
   was one flat colour. The property a shared width buys — depth meaning the
   same distance from zero on either ramp — is one a reader cannot use, because
   comparing depth across two hues is not something the eye does reliably.
3. **Both widths are printed**, for the same reason: "four steps of 26¢ below
   zero and two of 15¢ above it, from −105¢ to +30¢". A step on one arm is not
   a step on the other and the caption must not let a reader think it is.
4. **Six swatches, not five**, because this is two scales meeting. The gap where
   they meet is wider than the gaps inside each arm: the hue change says which
   way is which, the gap says where the turn is.
5. **The two arms partition ONE lightness axis; neither spans it** (the rule
   this section did not have until 2026-09-18 — see below). Six swatches means
   six rungs, darkest for the state that loses most and palest for the one that
   keeps most, and each arm takes a contiguous run of them: the losing arm the
   deep rungs, the keeping arm the pale ones, meeting at zero. Lightness
   carries the whole ranking and hue carries only the sign. An arm alone on the
   scale has nobody to leave a rung for and slides to the five its own ramp can
   draw.
6. **The hue is the sign, so the pair has to survive colour blindness.**
   Measured with a Viénot 1999 dichromat simulation, CIE76 ΔE in both themes,
   and re-derived with the Machado 2009 matrices and with the same Viénot
   matrix applied in gamma space — three derivations, agreeing within 2 ΔE — so
   the figure is not one implementation agreeing with itself. Plum against the
   warm keep arm, rung for rung: **38.1 light, 33.4 dark**, the weakest pair
   either way. Across the hinge, where the two arms actually meet on a map, the
   weakest pair over every split the data produces is **37.3 light and 30.4
   dark**. Plum against the blue money line collapses to 2.4 and plum against
   teal to 5.6 — both unusable for about one man in twelve. Tritanopia loses
   this pair instead, as it loses every warm/cool diverging scale, and that is
   ~0.01% of readers against ~8%. The sign is carried in words as well, three
   more times: the scale's two ends are named in full ("loses 105¢ of each
   extra dollar"), every tile's own name says its rate, and the ranked strip's
   bars run left of the hinge for a state that loses.
   `app/src/places/model.ts` `divergingBins` is the rule.

   *The figure this rule carried until 2026-09-18 was "38 or better under
   protanopia and deuteranopia" in **both** themes. It was a light-mode
   measurement written as if it were both: dark's palest pair measured 19.2,
   because `--keep-5` dark had fallen to C\* 12.8 and both pale ends were
   near-grey. That token took chroma in the same pass (C\* 25.9, same hue, same
   L\*), which is what makes the dark figures above hold.*

#### Lightness is the ranking (2026-09-18)

Both arms used to run pale at the hinge and deep at their own far end — the
standard diverging form, and what rule 2 used to say. Measured off the built
page, **the two ends came out at L\* 19.7 and 19.6**. The best state in the
country and the worst were the same darkness. Every contrast floor on this page
passed, because both ends are 12.8:1 on the same ground; the map still said
nothing in greyscale, and to a reader using the near-universal *dark means
severe* convention it said the opposite of the truth — that Texas and New
Mexico are among the worst states in America
(`REVIEW-picture-first-places-2026-09-18.md` B1). Lightness was the one axis
the rule had never considered, and the map is now the page.

**The axis, and how a class finds its rung.** One ramp step sits on each rung,
at the same darkness in either hue, so `--loss-6` and `--keep-1` are the two
ends of a single scale rather than the ends of two:

| rung | 1 worst | 2 | 3 | 4 | 5 | 6 best |
| --- | --- | --- | --- | --- | --- | --- |
| plum | `--loss-6` | `--loss-5` | `--loss-4` | `--loss-3` | `--loss-2` | — |
| keep | — | `--keep-5` | `--keep-4` | `--keep-3` | `--keep-2` | `--keep-1` |
| L\* light | 11.2 | 19.7 / 19.6 | 31.4 / 31.5 | 44.1 / 43.9 | 57.1 / 57.4 | 70.8 |
| L\* dark | 91.9 | 84.9 / 85.2 | 72.8 / 72.8 | 59.7 / 59.8 | 47.3 / 46.4 | 35.5 |
| on the ground | 16.1 / 14.1 | 12.8 / 11.7 | 8.6 / 8.2 | 5.4 / 5.4 | 3.4 / 3.4 | 2.16 / 2.27 |
| label | `--surface` | `--surface` | `--surface` | `--surface` | `--ink` | `--ink` |
| label contrast | 16.1 / 14.1 | 12.8 / 11.7 | 8.6 / 8.2 | 5.4 / 5.4 | 5.16 / 4.51 | 8.06 / 6.98 |

The ramp step a class draws with is its rung counted from the far end
(`rungRamp`), so a diverging scale's classes run 5, 4, 3, 2, 1, 0 from the
worst state to the best whatever the split is, and the step a class carries is
**also** how its label is inked: **the two steps nearest the page's own ground
take `--ink`, the rest `--surface`** — one rule, both ramps, both themes,
unchanged from the sequential scale's. It works because the palette is built to
dodge the band where neither ink reaches 4.5:1: L\* 49–53 in light and 47–54 in
dark. **No rung's L\* may land in it.** The floor measured on the map is 4.51:1.

**`--loss-6` is the price.** Six rungs need six plum steps and the loss ramp had
five, because the sequential ramp spends all five on one arm and its palest is
already at the 2.15:1 floor against the page. So the loss ramp gained a sixth,
deeper step, used by diverging scales alone. Nothing else moved: every other
ramp value on this page is the one it was, and a sequential measure — the
worst drop, the leap, the safe exit, the counts — draws exactly as before.

**What greyscale keeps, and what it drops.** The map now reads as one severity
ramp: dark is worse, all the way across, in either theme (in dark the ramp
reverses with the rest of the system, so severity is distance from the ground).
Measured on the rendered page, converted with Rec. 601 luma, the six rungs land
at **11.3 → 19.9 → 31.9 → 45.2 → 55.9 → 70.7 L\*** in light and **92.7 → 86.3
→ 74.4 → 61.3 → 45.2 → 34.9** in dark: best against worst is 59.5 and 57.8 L\*
apart, against a floor of 25, and the smallest gap between neighbours is 8.6.

What it drops is the pale hinge. Zero used to be the lightest band on the map,
so "near the line" was a place a reader could see; it is now a mid-tone where
the hue turns. That is the trade this rule takes on purpose, because in
greyscale the hue is gone and the sign with it, so a pale hinge would mark a
turn a reader cannot follow, while the order is the thing a greyscale map is
actually read for. Zero is still a printed bound, still the widest gap in the
legend, and still said in words on every tile and at both ends of the scale.

**The check is the conversion, not the colours** (`app/e2e/places.spec.ts`).
Contrast ratios could not see this defect and neither could a reading of the
computed fills, so the proof screenshots the tiles, hands the PNG back to the
browser's own decoder, converts the raster with Rec. 601 luma and reads the
tones off it. Two things are asserted, because the end-to-end gap alone would
not have caught the interior: the two ends stand ≥ 25 L\* apart, and **the
greyscale never inverts the ranking** — over every pair of shaded states, a
state that keeps more is never drawn as the worse tone.

**The hatch is not on this axis and must not be.** An incomplete state is never
shaded (§ Not computed rule 1), and the measurement says why it cannot be: the
`--ink-3` stripes measure 5.11:1 light and 5.97:1 dark on their own
`--surface-sunk` ground, but over a rung of the ramp they would fall to
1.02–2.94 in light and 1.21–2.91 in dark — invisible over the middle of the
scale. The hatched tile's mean luminance is 0.641 light and 0.128 dark, still
outside the ramp's 0.013–0.422 in light and just under its 0.087–0.805 in dark,
so what separates it is the *pattern* and the solid outline, as before.

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

### The map is the picture (2026-09-18)

The rule the picture-first pass added, and the map's half of
`inventory.md` § The page is its picture. The money curve's own half is
§ Direct labels and § The scroll rule above.

**Everything the map needs is inside the `<figure>`, and nothing that is not
about the map is.** In this order:

1. **The sentence, as `<figcaption>`, first child.** The national reading of
   the selected measure — the extreme state and its figure, and how far across
   the country the thing goes — so the picture's accessible name is the answer
   and nothing stands between the masthead and the two of them. The one figure
   it underlines is the one drawn on the loss ramp, which makes the sentence
   the map's first key.
2. **The tiles**, full-bleed on a phone and as large as the width allows. They
   are the one child that gives back the page's gutter: on a twelve-column
   cartogram 32px of gutter is more than a tile.
3. **The legend, as one strip**: the ramp, its printed bounds, and only the
   tile states that are on THIS map. The other three are drawn again, with the
   tiles' own classes, inside *How to read this map* — a key is not a lesson,
   and a reader who needs the whole grammar is one press away.
4. **The one caution the map on the screen has earned**, in one line, in the
   open. The two boxed warnings live in full inside the disclosure; the one
   that is true of the tiles a reader is looking at comes out of it, because
   then it is not a rule but a warning, and nothing that warns hides.
5. **The readout — the map's caption.** The selected state's sentences,
   directly under the tiles. Never a block a screen away with a link to it.
6. **That state's provenance**, closed, named for what is inside it (*Where
   {state}'s numbers come from*), and absent until a state is chosen. It says
   where the numbers came from and never repeats the readout above it.
7. **The controls that change the picture**, under it, never above: a filter
   above the fold is the thing the contract forbids, and the default view
   answers without them.
8. **The estimates line**, which never hides.
9. ***How to read this map***, the figure's own disclosure: what the map
   shades, all four tile states with their marks, the bin bounds, the keyboard,
   the two warnings in full, and the glossary.

**The map's width is the map's, not the figure's.** The shared `.hg-picture`
centres a figure at `--figure-max` so a curve's x axis can have every pixel. A
cartogram is square and eight rows deep, so the same licence costs it its own
key: at 56rem the tile is 73px and at 1280 the scale and legend fall past the
fold. The figure keeps the page's column — one left edge for the whole document
— and the map takes 48rem, a 64px tile, measured so the sentence, the tiles,
the scale, the bounds and the key are all inside one 900px screen.

### A tile is a 44px control, and the phone map swipes (2026-09-19)

Until 2026-09-19 a tile was a 27–64px square and the ranked row was its
44px equivalent (WCAG 2.5.8's exception). The owner overruled that: *"the
hitboxes are the right size"* means the tiles themselves. The arithmetic then
settles the rest — **the cartogram is twelve columns, so twelve 44px tiles and
eleven 2px gaps are 550px, and a phone is 390 to 412.** The whole country at
44px and the whole country on one screen cannot both be true.

Two ways out were measured and dropped. Enlarging the hit area through the gap
is dead on arrival: 12 × 44 is 528 however the pixels are arranged, so
adjacent hit areas must overlap — by eleven pixels each way at the current
gap. Re-flowing the grid to eight columns by twelve rows does fit 390px, and
nobody would recognise it; a cartogram's whole value is that it looks like the
country.

**So the map swipes, at a 44px tile, below 550px** — which is what the owner
asked for. The column is `minmax(var(--touch), 1fr)`, so above 550px nothing
changes: at 48rem the tile is still 64px and the map does not scroll. Below
it the columns hold at 44px and `.hg-scroll-x` on the grid makes the overflow
a swipe, with the edge fade and the `overscroll-behavior` every wide table
here already has.

**It opens at its left edge**, and nothing sets `scrollLeft`. A centred start
was written, rendered and thrown away: it hides the entire Pacific column —
Alaska, Washington, Oregon, California, Hawaii — and it opens the picture on
an *empty first row*, because Alaska and Maine are the only tiles in that row
and centring cuts them both off. Left-aligned, the map starts in the corner
where Alaska is, reads west to east the way the country is drawn, keeps
California on the first screen, and clips a tile at the right edge, which is
the same "there is more this way" a clipped column gives every wide table.

**And it says so, in four words, only while it does.** A thumb reader given
nothing but the URL concluded that Maine is not on this map: the top row is
Alaska and then white space to the screen's edge, so the one wordless cue a
swiping figure has — a tile clipped at the edge — is missing in exactly the
row she was searching. *"No scrollbar at rest, no arrow, and not one word
telling me to swipe."* So `.mapSwipe` sits under the tiles and outside the
scroller, where `.hg-chart__hint` sits on the curve, carrying the table's own
`table.swipe` words. It is absent at every width where the map fits, so it is
never a rule about a gesture the reader cannot make. A selected tile is also
brought inside the scroller (`revealTile`), because tapping the four visible
pixels of New York used to leave its selection ring cut in half by the screen
edge.

The cost is named rather than hidden: about three of twelve columns are off
screen at any moment on a 390px phone, so the smallest screen no longer shows
all fifty-one states at one glance. The ranked row and the table row remain
the same state's other controls, which is now a convenience rather than an
obligation. The postal code's floor rose with the square — 10px in a 33px tile
was the one type on the site below `--t-tick`, and in a 44px tile it read as a
tile that had lost its label, so the clamp starts at the tick floor.

Measured in `design/REVIEW-touch-2026-09-19.md`; proved by
`app/e2e/touch.spec.ts`.

**On paper the map does not break, and the figure may.** A figure whose
disclosures are open is taller than a page, so `break-inside: avoid` on it is
an instruction the engine cannot follow and spends a page refusing to. What
must not break is the tiles and the strip that reads them; the sentence stays
with them by `break-after: avoid`.

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
