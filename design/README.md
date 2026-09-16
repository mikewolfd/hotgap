# HotGap design system

## The thesis

Everything HotGap knows is **a step**: a thousand dollars more of pay, some
number of dollars more or less kept, and a rule that fired at that point. The
curve is a list of steps. A cliff is one step. A danger zone is a run of steps
that never climbs back. The leap is the width of that run. The 51-state map is
every state's worst step. There is one data primitive, and every audience is
reading the same one at a different resolution:

- **The citizen** reads **one step** — the next one, from where they stand.
- **The caseworker** reads **every step** on this household's curve, with the
  threshold and the citation that causes each.
- **The journalist** reads **every state's worst step**, side by side.

That is why three audiences can share a foundation: not because they want the
same layout, but because they want the same object counted differently — one
step, eleven steps, fifty-one worst steps. A component that shows a step, with
its dollar, its rule and its timing, is reusable across all three. What changes
is the count, and with the count, the density.

They diverge in exactly one place, on purpose: **what is allowed to be
implicit.** The citizen surface leaves the mechanism implicit and makes the
consequence explicit ("child care help ends; you keep about $25,400 less"). The
caseworker surface leaves the consequence implicit and makes the mechanism
explicit ("CCDF, $55,000, driver: benefits, $25,793 of it"). The journalist
surface makes the *method* explicit and the household implicit ("one archetype,
swept, these bins, this vintage, here is what it excludes"). Same step, three
things held constant.

Everything else in this system follows from that: the thresholds are rendered as
rules with a dollar on them, the deferred steps are drawn dashed, the loss ramp
measures step size, and nothing is a card.

## Files

- `tokens.css` — type (with the self-hosted `@font-face`), colour (light and
  dark, print), space, shape, motion, and the shared `hg-*` classes every
  surface uses instead of declaring its own
- `fonts/` — Archivo, weights 400–600, three woff2 subsets and the OFL licence
- `charts.md` — the money curve and the state map
- `inventory.md` — twenty-two components, tagged by persona, with the class
  map, the conventions, the verdict catalog and the program phrases
- `citizen.html`, `caseworker.html`, `journalist.html` — three surface sketches
  rendering the real output of
  `npm run -s hotgap -- curve --state CO --kids 3,7 --earnings 38000 --offline --json`
  and `core/data/summary.json`
- `AUDIT-2026-09-16.md` — the visual audit these rules answer; its screenshots
  are under `audit/`

All three sketches are **frozen to** the sweep stamped
**2026-09-16T16:13:51.445Z** (`summary.generated`), run on policyengine-us
**2.5.0** (`summary.model.version`) — the one that carries a per-state
`coverage` block and eleven archetypes. "Frozen" is the honest word: a sketch
is a snapshot of one file, and the file moves weekly. No number in these files
was typed by hand: the curve is 151 points copied out of the CLI, the 51-state
blob is injected from `summary.json`, and every figure a reader could check
against the data — the axis floor, the bin bounds, the count of incomplete
states, the model version in every `SourceNote` — is rendered from the values
the code computed rather than written into the copy, because a typed number
drifts the first time the data moves. The engine has since moved to 2.6.2; the
source line says 2.5.0 until the file does, because it reports what produced
the numbers, not what is installed.

## Colour

Two ramps and three ink levels, all measured rather than judged. Every value was
run through the `dataviz` skill's `validate_palette.js`, and every contrast
figure below was recomputed on 2026-09-16 from the hex values in `tokens.css`
with the WCAG 2.x relative-luminance formula:

- Categorical, light `#2A6FD0`, `#D2611F`, `#1E8E6A`; dark `#4C8DE0`, `#D4722F`,
  `#22A87C` — all six checks pass in both modes under
  `--pairs all` (worst CVD ΔE 9.1 light / 9.7 dark; worst normal-vision ΔE 20.4 /
  19.3). Three slots only: that is the all-pairs cap, and a fourth series is a
  signal to facet, not to invent a hue.
- Loss ramp, five plum steps, validated `--ordinal` in both modes: monotone
  lightness, adjacent ΔL ≥ 0.06, light end 2.15:1 on the light surface and
  2.27:1 on the dark one. The dark ramp reverses its anchor — on a dark ground
  the *smallest* loss is the step nearest the surface.
- Every ink level clears WCAG AA against both the surface and the plane. The
  lightest, `--ink-3`, measures 5.49:1 on surface and 4.75:1 on plane in light
  (6.60:1 and 7.22:1 in dark), so even captions and axis ticks are AA at small
  sizes.
- `--control-edge` is the boundary of anything that can be pressed: 3.49:1 on
  surface and 3.02:1 on plane in light, 3.74:1 and 4.09:1 in dark, clearing
  the 3:1 that WCAG 1.4.11 asks of a control's only visible edge. `--rule`
  (hairlines) and `--rule-strong` stay on things that cannot be pressed.
- The light set is defined once, plain; the dark set once, as the second
  value of `light-dark()` beside its light twin; print reasserts light with
  one `color-scheme` declaration rather than a third copy of any token. A
  browser without `light-dark()` keeps the plain light set and never goes
  dark, which is the correct degradation: a half-dark page is worse than none.

### The ramp that is not red and green

"You lose money" cannot be red, and "you gain" cannot be green. Red/green fails
outright for about one man in twelve, and — the bigger problem — it is a moral
scale. A family below a threshold has not failed at anything, and a tool that
paints their income red has taken a position it has no business taking.

So severity is **magnitude, not virtue**: one hue, five steps, plum. Plum is not
in the harm vocabulary, and it is far from both the blue money line and the
orange comparison slot under simulated CVD. Direction is carried by the shape of
the line itself, never by hue: the curve goes down, and that is the whole signal.
Three redundant channels always ride together — the line's direction, a 45°
hatch over the band, and a number with a word beside it.

There is deliberately **no good/bad status pair** in the tokens. `--note` and
`--caution` exist, and they describe the *data* — an estimate, a stale sweep, a
suppressed cell — never the household.

### "We cannot compute this" is a value the design has to carry

`coverage[state].unmodeled[]` names, for every state, the programs the model
cannot compute there: the child-care subsidy where the engine paid $0 at every
point to a household that pays for care, a state premium program with no
upstream variable and no local ladder, and LIHEAP everywhere. For a household
that would hold one of the first two, that state's largest cliff may be missing,
so its figures are **floors, not measurements**.

A reader is meant to take a hatched state as *unmeasured*, never as *low*. The
sentence a journalist may write is "this model cannot yet say what a raise costs
in New Jersey." The sentence they may not write is "New Jersey is gentler than
Vermont."

Rendering it as a light step of the loss ramp would say exactly the wrong thing —
a gap in a sequential ramp always reads as a small value — so the treatment sits
outside the ramp: a 45° hatch of `--ink-3` stripes on the sunk ground (5.11:1
light, 5.97:1 dark, so the pattern is legible and survives greyscale), a
separate legend entry that spells out *figures incomplete, not low*, exclusion
from the ranking into its own labelled block, and exclusion from the bin bounds
so a known-wrong number cannot move the scale. The number itself stays in the
table, flagged in its own column, because a reporter must be able to see what
the model returned. The list and its count are read from the data file every
render — never typed, never kept in a page — so a state leaves it the day
upstream starts modelling it. On the 2026-09-16 sweep the child-care entry is
empty (every state pays a paying archetype somewhere) and the marker falls on
the two states whose own premium program is unmodeled; when the child-care gap
returns, it returns here. Full rules in `charts.md` § 2.

The caseworker surface carries the same fact in its own register: a line under
the verdict saying what is not modelled in this household's state, and — when
something is — that every figure on the page is a floor. Beside it sits
`CorrectionsApplied`: which HotGap-side corrections produced this state's
numbers, from `coverage[state].corrections`, because a number without its
correction is not defensible.

## Type

One family: **Archivo**. A squared grotesque with tall, even figures; it reads
like an official form rather than a brochure, which is the register this subject
actually occupies. It is not the system sans and it is not a serif display, so
neither of the two default voices shows up. Scale steps ~1.185 from a 17px body;
the caseworker surface drops the base to 15px because that reader is scanning
thresholds, not reading prose.

Archivo is **self-hosted**: `tokens.css` declares the `@font-face` rules and
the files live in `fonts/`, so a page carries no font `<link>` and no
`preconnect` to a third party. A benefits tool must not send every page view
to Google for a typeface. `font-display: swap` shows the fallback grotesque at
once; the fallbacks are metric-close, so the swap does not reflow the answer.

Two floors: 13px (`--t-micro`) for anything prose-like, including a word on a
chart; 12px (`--t-tick`) for a tick number sized to its axis. The one thing
below both is a map tile's postal code, sized to its tile and repeated in the
table.

Sentence case everywhere. No tracked-out capitals, no eyebrow labels above
headings, no meta strings joined with middle dots, no arrows glued to link text.

## Motion

One orchestrated moment per surface — the citizen curve draws itself once, left
to right, 700ms, through `.hg-draw`. Nothing else moves unless a person moved
it. No scroll reveals, no hover lifts, no card transitions.
`prefers-reduced-motion` zeroes every duration token in `tokens.css`, so there
is one place to honour it, and a page never re-checks the preference itself.

## Where the personas conflict

**1. Precision against reading level.** The caseworker needs "CCDF child care
subsidy, $55,000, deferred under 42 CFR 435.926." The citizen must not meet a
regulation citation. *Resolved:* the same step is one component with two
registers, and the citizen register is not a simplification of the professional
one — it is a different sentence. "Child care help ends. The state stops paying
part of your day care bill." Program names appear on the citizen surface only
after the plain phrase, as an aside ("It is called SNAP"), composed from the
one phrase table in `inventory.md`, never inline. The citizen page is gated at
Flesch-Kincaid ≤ 5.9 (it measured **2.12**, worst single string 7.85 — both
under the repo's corpus and per-string limits — on the 2026-09-15 sketch; the
gate itself is a separate port).

**2. One answer against many what-ifs.** The citizen surface gives one answer and
refuses to offer alternatives, because offering paths reads as advice. The
caseworker's entire job is running four what-ifs in ninety seconds. *Resolved:*
the what-if machinery — `ScenarioBar`, `CompareTable` — exists only on the
caseworker surface. The citizen surface has no controls that change the answer at
all. That is a real feature difference, not a progressive disclosure.

**3. Density against calm.** A 51-row table would frighten a citizen; a citizen's
one-thought-per-screen rhythm would infuriate a caseworker on a call. *Resolved:*
density is a surface-level decision, set once by base font size and the spacing
step, not per-component. The same `DataTable` is generous on the citizen surface
and tight on the other two because the surface sets the scale, not the table.

**4. The chart must be phone-legible and screenshot-proof at once.** The citizen
needs the curve cropped to their own neighbourhood on a 390px screen. The
journalist needs a figure that keeps its meaning after being dragged into a CMS.
*Resolved:* they are different objects. The citizen curve crops and carries its
context in the page around it. The journalist figure never crops and carries
title, units, bin bounds, vintage, model version and *estimates only* **inside**
the figure box. The caseworker's curve keeps the full axis and sits next to its
own ledger.

**5. Reach wants to be a prediction.** Every persona wants to read "68th
percentile" as "she has a 68% chance." *Resolved:* the word *chance* and the word
*odds* do not appear anywhere in the system, the citizen surface phrases reach
only as "about 4 in 10 parents like you in Colorado are paid $38,000 or less,"
and the margin travels with the number in all three registers. `ReachSummary`
returns exactly two points — current and the state's safe exit — and a UI must go
back to `reachCell` for any third, never interpolate one.

**6. An incomplete state.** A journalist wants 51 comparable numbers; the model
cannot always complete all of them for a given household. Dropping the
incomplete ones would hide large states; shading them would publish a
falsehood. *Resolved:* they stay on the map, in place, hatched and outside the
ramp; they leave the ranking into a block that names why; they never move the
bin bounds; and their raw figures stay in the table under a flag. The count is
rendered from `coverage[state].unmodeled[]`, never typed. The caseworker gets
the same fact as a one-line notice about their own client's state. The citizen
surface does not carry it at all — a household in Texas is shown its own curve
with no cross-state claim on the page, so there is nothing to mislead.

**7. Deferred losses.** A caseworker wants a threshold list they can read out; a
deferred threshold is on that list but is not a number the client will feel this
year. *Resolved:* one rule, applied identically on all three surfaces — solid
means this year, dashed means a later renewal — plus the plotting rule in
`charts.md` that the line itself must have deferred drops lifted out of it.

**8. The person's unit against the model's.** The model sweeps annual dollars;
a person paid $14.50 an hour does not think in $30,160 a year. *Resolved:* the
citizen surface shows every pay figure in the unit the person gave — hour,
month or year — rounded to $0.25, $50 or $500, with the chart's ticks generated
in that unit and mapped back to annual for position (`charts.md` § 1). Money
kept stays yearly, because that is what the curve plots. The caseworker and
journalist stay annual: they check the table against the file.

**9. The household's own numbers against an archetype's.** When the live call
fails, core evaluates the state's archetype curve instead
(`HouseholdEvaluation.source === "archetype"`). The page must never claim those
are the household's own. *Resolved:* a `SourceNote` state, not a banner — the
source line changes sentence ("These are numbers for a family like yours in
your state."), gains *Try again*, and the county is dropped from every sentence
because the archetype has none.

## What was deliberately left out

- **A geographic choropleth.** Area would weight Texas twenty times Connecticut
  for no reason. The tile cartogram treats 51 rulebooks as 51 equal squares.
- **An input flow.** The archived system's fourteen-question wizard was built for
  one persona and is what made it too narrow. Input design is a separate brief;
  until it lands, a value chip in the `ScenarioBar` is not a button.
- **Any composite score or ranking badge.** Six measures disagree with each other
  by design; collapsing them would invent a fact.
- **Head Start, employer coverage and the state premium wrap surfaces.** They are
  in the evaluation and in the inventory's reach, but the offline archetype curve
  cannot produce them, and a sketch with invented numbers would be worse than a
  gap. They reuse `StepList` and `ThresholdLedger` unchanged.
- **Icons.** Nothing here is improved by a pictogram, and a benefit has no icon
  that is not a stereotype. The one exception is the hatch and the dashed
  outline, which are patterns rather than pictures and carry meaning colour
  cannot.
- **Shadows and rounded cards.** Panels are defined by a rule and a change of
  ground. `--r-panel` is `0` on purpose.
- **A live tooltip as the primary read.** Values are reachable by keyboard, by
  the readout line, by a cliff mark that is a button, and by the table before
  hover is considered.
- **A popover for a cliff's detail.** The ledger row or the StepList row is the
  card; a mark opens it in place.
