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
same layout, but because they want the same object at one, fifty, or fifty-one
of resolution. A component that shows a step — its dollar, its rule, its timing
— is reusable across all three. Only the count changes, and with it the density.

They diverge in exactly one place, on purpose: **what is allowed to be
implicit.** The citizen surface leaves the mechanism implicit and makes the
consequence explicit ("child care help ends; you keep $9,390 less"). The
caseworker surface leaves the consequence implicit and makes the mechanism
explicit ("CCDF, $54,000, driver: benefits, $9,733 of it"). The journalist
surface makes the *method* explicit and the household implicit ("one archetype,
swept, these bins, this vintage, here is what it excludes"). Same step, three
things held constant.

Everything else in this system follows from that: the thresholds are rendered as
rules with a dollar on them, the deferred steps are drawn dashed, the loss ramp
measures step size, and nothing is a card.

## Files

- `tokens.css` — type, colour (light and dark), space, shape, motion
- `charts.md` — the money curve and the state map
- `inventory.md` — sixteen components, tagged by persona
- `citizen.html` · `caseworker.html` · `journalist.html` — three surface sketches
  rendering the real output of
  `npx tsx core/src/cli.ts curve --state CO --kids 3,7 --earnings 38000 --offline --json`
  and `core/data/summary.json`

## Colour

Two ramps and three ink levels, all measured rather than judged. Every value was
run through the `dataviz` skill's `validate_palette.js`:

- Categorical, light `#2A6FD0 · #D2611F · #1E8E6A` and dark
  `#4C8DE0 · #D4722F · #22A87C` — all six checks pass in both modes under
  `--pairs all` (worst CVD ΔE 9.1 light / 9.7 dark; worst normal-vision ΔE 20.4 /
  19.3). Three slots only: that is the all-pairs cap, and a fourth series is a
  signal to facet, not to invent a hue.
- Loss ramp, five plum steps, validated `--ordinal` in both modes: monotone
  lightness, adjacent ΔL ≥ 0.06, light end 2.15:1 on the light surface and
  2.27:1 on the dark one. The dark ramp reverses its anchor — on a dark ground
  the *smallest* loss is the step nearest the surface.
- Every ink level clears WCAG AA against both the surface and the plane. The
  lightest, `--ink-3`, measures 5.5:1 on surface and 4.8:1 on plane, so even
  captions and axis ticks are AA at small sizes.

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

## Type

One family: **Archivo**. A squared grotesque with tall, even figures; it reads
like an official form rather than a brochure, which is the register this subject
actually occupies. It is not the system sans and it is not a serif display, so
neither of the two default voices shows up. Scale steps ~1.185 from a 17px body;
the caseworker surface drops the base to 15px because that reader is scanning
thresholds, not reading prose.

Sentence case everywhere. No tracked-out capitals, no eyebrow labels above
headings, no meta strings joined with middle dots, no arrows glued to link text.

## Motion

One orchestrated moment per surface — the citizen curve draws itself once, left
to right, 700ms. Nothing else moves unless a person moved it. No scroll reveals,
no hover lifts, no card transitions. `prefers-reduced-motion` zeroes every
duration token, so there is one place to honour it.

## Where the personas conflict

**1. Precision against reading level.** The caseworker needs "CCDF child care
subsidy, $54,000, deferred under 42 CFR 435.926." The citizen must not meet a
regulation citation. *Resolved:* the same step is one component with two
registers, and the citizen register is not a simplification of the professional
one — it is a different sentence. "Child care help ends. The state stops paying
part of your day care bill." Program names appear on the citizen surface only
after the plain phrase, as an aside ("It is called SNAP"), so a client who hears
the acronym from an office later can match it up. The citizen page is gated at
Flesch-Kincaid ≤ 5.9 (it measures **2.12**, worst single string 7.85 — both
under the repo's corpus and per-string limits).

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
title, units, bin bounds, vintage and *estimates only* **inside** the figure box.
The caseworker's curve keeps the full axis and sits next to its own ledger.

**5. Reach wants to be a prediction.** Every persona wants to read "68th
percentile" as "she has a 68% chance." *Resolved:* the word *chance* and the word
*odds* do not appear anywhere in the system, the citizen surface phrases reach
only as "about 4 in 10 parents like you in Colorado are paid $38,000 or less,"
and the margin travels with the number in all three registers. `ReachSummary`
returns exactly two points — current and the state's safe exit — and a UI must go
back to `reachCell` for any third, never interpolate one.

**6. Deferred losses.** A caseworker wants a threshold list they can read out; a
deferred threshold is on that list but is not a number the client will feel this
year. *Resolved:* one rule, applied identically on all three surfaces — solid
means this year, dashed means a later renewal — plus the plotting rule in
`charts.md` that the line itself must have deferred drops lifted out of it.

## What was deliberately left out

- **A geographic choropleth.** Area would weight Texas twenty times Connecticut
  for no reason. The tile cartogram treats 51 rulebooks as 51 equal squares.
- **An input flow.** The archived system's fourteen-question wizard was built for
  one persona and is what made it too narrow. Input design is a separate brief.
- **Any composite score or ranking badge.** Six measures disagree with each other
  by design; collapsing them would invent a fact.
- **Head Start, employer coverage and the state premium wrap surfaces.** They are
  in the evaluation and in the inventory's reach, but the offline archetype curve
  cannot produce them, and a sketch with invented numbers would be worse than a
  gap. They reuse `StepList` and `ThresholdLedger` unchanged.
- **Icons.** Nothing here is improved by a pictogram, and a benefit has no icon
  that is not a stereotype.
- **Shadows and rounded cards.** Panels are defined by a rule and a change of
  ground. `--r-panel` is `0` on purpose.
- **A live tooltip as the primary read.** Values are reachable by keyboard, by
  the readout line, and by the table before hover is considered.
