# Component inventory

Twenty-two components. C = citizen, W = caseworker, J = journalist. The tags
were checked against the three sketches on 2026-09-16 (S13): a tag means the
surface renders the component, not that it could.

| # | Component | What it is | C | W | J |
|---|---|---|:-:|:-:|:-:|
| 1 | **AnswerSentence** | The verdict written as one sentence at display size, with each dollar figure underlined in the colour of the mark it names — so the sentence doubles as the chart's key. One sentence shape per curve shape (§ Verdict catalog); the second figure it names is the leap (S7). | ● | | |
| 2 | **StatTile** | Label, one number, one qualifying line. Proportional figures, same sans, no sparkline unless the trend is the point. | | ● | |
| 3 | **MoneyCurve** | The line of net income against earnings, with the household's band, the exit and the leap bracket, cliffs as controls, deferred cliffs, a reference line and the household's position. Lifts deferred drops before plotting. Rules in `charts.md` § 1. | ● | ● | |
| 4 | **CurveReadout** | The live `aria-live` line under the curve that reports the point under the cursor, the keyboard caret, or the cliff mark just activated. Replaces a floating tooltip. | ● | ● | |
| 5 | **MarkKey** | The non-series key: band, immediate cliff, deferred cliff, position. Never a colour swatch alone — each entry draws the actual mark. | ● | ● | |
| 6 | **StepList** | The citizen reading of thresholds: a dollar in a fixed left column, a plain sentence beside it, one rule per step. Rendered from the cliff list under the one threshold convention (§ Where a program ends). A row is the card a cliff mark opens (M6). | ● | | |
| 7 | **ThresholdLedger** | The professional reading of the same data: earnings, program, who holds it (adult or child), and the citation that governs it. Same convention and same source as StepList. | | ● | |
| 8 | **DropLedger** | Every cliff as a row — step, drop, programs lost, driver, deferred badge. Selecting a row, or its cliff mark on the chart, drives the breakdown: one selection, not two. | | ● | |
| 9 | **BreakdownBars** | Four signed bars from a centre zero showing where a drop came from: benefits, credits, premiums, other. States the sum. | | ● | |
| 10 | **DeferredBadge** | The dashed-outline chip that marks a loss landing at a future renewal, with its rule and citation. Dashed everywhere, always. One declaration: `.hg-badge`. | ● | ● | |
| 11 | **ScenarioBar** | The household's inputs as chips — state, county, shape, earnings, rent, childcare, and the take-up toggles — plus *add a what-if* and *print*. Phone behaviour and chip semantics in § ScenarioBar. | | ● | |
| 12 | **CompareTable** | Two or three scenarios in columns against the same rows. Column identity is a rule under the header, never coloured text. | | ● | |
| 13 | **StateTiles** | The 51-tile cartogram: equal squares, postal code on every tile, printed bins, and **four** mutually distinct tile states — shaded, *no cliff*, *past the axis*, *not computed* (`charts.md` § 2). Each tile is a button that opens its state; the group is one tab stop. | | | ● |
| 14 | **RankStrip** | The sorted companion to the map — state, dot on a shared axis, value — answering *how much* where the map answers *where*, with the axis bounds above the list. Each row is a `.hg-row-btn` that opens its state: the 44px control beside the map that a tile sized to its square cannot be (`charts.md` § 2). States with no cliff and states the model cannot complete are each lifted out into their own labelled block, never left at the bottom of the order. | | | ● |
| 15 | **DataTable** | The text equivalent and the thing a reporter copies: every row, every measure, in its own horizontal scroller, with a CSV export carrying its own provenance columns. A no-cliff cell prints *none*, never `$0`. | ● | ● | ● |
| 16 | **IncompleteMarker** | The 45° hatch (`.hg-hatch-incomplete`) and its companions — the legend entry that says *figures incomplete, not low*, the not-ranked block, the flag column, the caseworker's one-line state notice. Rendered from `coverage[state].unmodeled[]` on every pass (§ IncompleteMarker). | | ● | ● |
| 17 | **SourceNote** | The provenance line that closes every figure and table: publisher, vintages, model version, date read, policy year, and *estimates only* — all from the data. Has an *archetype* state (§ SourceNote). | ● | ● | ● |
| 18 | **CorrectionsApplied** | The HotGap-side corrections behind this state's numbers, from `coverage[state].corrections` (§ CorrectionsApplied). | | ● | ● |
| 19 | **Callout** | One shape for an aside about the data: a 3px left rule, `--note` or `--caution` or neutral, always led by a word. `.hg-callout`. Never a banner, toast or modal. | ● | ● | ● |
| 20 | **Button** | One declaration, `.hg-button`; `--primary` for the one action a surface leads with; `--small` inside a source line. The CSV download and *Try again* are the base. The sketches' theme toggle is a demo control and no built surface carries one: `prefers-color-scheme` rules, and print is always light. | ● | ● | ● |
| 21 | **FilterRow** | One row of `<select>`s above everything it scopes, plus the row's end slot for a download. `.hg-filters`. A control that scopes one component sits with that component in its own row — the table's order control under the table's heading — never in the shared row (places review S7). Never a filter inside a chart card. | | | ● |
| 22 | **SkipLink** | The first focusable thing on the page, to the answer, the ledger or the table. `.hg-skip`. | ● | ● | ● |

## Class map

What a page uses instead of declaring its own (S13). A page keeps only
layout that is genuinely its own (its column grid, its masthead).

| Component | Classes in `tokens.css` |
|---|---|
| DeferredBadge | `.hg-badge` |
| CorrectionsApplied, ThresholdLedger cite | `.hg-rows` (set `--col`), `.hg-rows__at`, `.hg-tag`, `.hg-cite` |
| StepList | `.hg-rows`, `.hg-rows__at`, `.hg-rows__loss` (the drop line); `[aria-current="true"]` on the open row |
| MarkKey | `.hg-key` |
| CurveReadout | `.hg-readout` |
| MoneyCurve | `.hg-chart` (wrapper), `.hg-marks` + `.hg-mark` + `.hg-mark__count` (cliff controls), `.hg-tick`, `.hg-label` with `--loss`, `--ink`, `--halo` (a word in a mark's ink; a halo over the hatch), `.hg-draw` |
| StateTiles, RankStrip legend | `.hg-tile--none`, `.hg-tile--past`, `.hg-tile--incomplete` + `.hg-hatch-incomplete` (an SVG mask on a pseudo-element, so it prints — B1 of the places review); `.hg-swatch` with the same modifiers |
| Callout | `.hg-callout`, `--note`, `--caution` |
| Button | `.hg-button`, `--primary`, `--small` |
| ScenarioBar | `.hg-scenario` (+ `--sticky` on the block that holds the top row), `__top`, `__actions`, `__inputs`, `__note`, `__summary`; `.hg-chip`, `.hg-chip__k`, `.hg-chip__v` |
| FilterRow | `.hg-filters`, `.hg-filters__end`, `.hg-select` (or a bare `<select>` inside the row) |
| SkipLink | `.hg-skip` |
| DataTable, DropLedger, CompareTable | `.hg-table` with `.num` and `.money`; `.hg-row-btn` for a row that is a control (44px on screen, its own rhythm on paper); `.hg-scroll-x` around a wide table — an edge shadow on whichever side still has content, by CSS alone, and `data-more` for a page's own "swipe" words while it finds an overflow (places context-blind S10); `details.hg-disclosure` around a table that opens on demand |
| SourceNote | `.hg-source` |
| Panels, print | `.hg-panel`; `.hg-print-only`, `.hg-no-print` |
| Anything | `[hidden]` wins over every display a class sets — a page never re-declares it |

Four rules that go with the map:

- **Motion** reads `--dur-draw` and `--ease` — through `.hg-draw` for the
  curve, or `getComputedStyle` for anything scripted. A page never calls
  `matchMedia("(prefers-reduced-motion…")`; `tokens.css` zeroes the durations
  and that is the one place the preference is honoured.
- **Type floors.** An SVG tick label takes `.hg-tick` (12px); any label that
  is a word takes `.hg-label` (13px, the same floor as prose). A bare
  `font-size` attribute on `<text>` is a defect.
- **Panel padding** is `--s4`, once. Both surfaces that use panels set a
  15px base, where 16px is one line-height, so the block sits on the same
  rhythm as the rules around it. The journalist *figure box* is not a panel
  and keeps its own padding (`charts.md` § 2).
- **A selected or open row is never marked by ground alone.**
  `--surface-sunk` measures 1.07:1 on `--surface` and 1.08:1 on `--plane`
  (1.10 / 1.21 dark), below any threshold, so `tokens.css` pairs it with a
  3px ink bar wherever `[aria-current="true"]` marks a row — the `.hg-rows`
  row, the `.hg-table` row's first cell — and a page's row control does the
  same (places review S3). Selection and focus are two marks in two places:
  the system focus ring outside, the selection mark inside (S4).

## `--control-edge`

The boundary of anything a person can press or change (S11): `.hg-chip`,
`.hg-select`, `.hg-button`, the filter row's `<select>`, and the map's three
outlined tile states, which are buttons (places review N10; the legend
swatches share the class and come along). It measures 3.49:1 on
`--surface` and 3.02:1 on `--plane` in light, 3.74:1 and 4.09:1 in dark, so
it clears WCAG 1.4.11 as a control's only visible edge. Nothing
non-interactive uses it: table hairlines stay `--rule`, because a stronger
edge on a thing that cannot be pressed would promise a control that is not
there.

## ScenarioBar

**Phone.** Below 720px only the top row — the wordmark and the two actions —
stays sticky, and it is the only sticky thing at any width (one rule, no
magic offset; the verdict a what-if changes is directly under it). The top
row sits in its own `.hg-scenario.hg-scenario--sticky` block and the summary
and inputs in a second `.hg-scenario` after it: a sticky child cannot outlive
its parent's box, so a top row that shared a block with the inputs scrolled
away with them (the caseworker page measured `top: -556`). The
input chips collapse to one summary line, rendered from `answers`:

> CO · El Paso · 1 adult, kids 3 & 7 · $38,000 — **Edit**

*Edit* is a `.hg-button--small` with `aria-expanded` and `aria-controls`
pointing at the inputs row; pressing it sets `data-open="true"` on
`.hg-scenario__inputs`, which shows the chips below the summary. At 720px
and above the summary is hidden and the chips are always shown, not sticky.
Adding the newer answers — status, years in the US, savings, self-employment,
hours, spouse earnings, disability, employer coverage — adds chips to the
row and words to nothing else; the summary line stays four facts.

**What a chip does when pressed.** Two kinds, and the element says which:

- A **toggle** (CCDF subsidy, Head Start, housing — the take-up answers) is
  a `<button aria-pressed>`. Pressing it flips take-up, re-evaluates, and the
  `.hg-chip__v` reads *on* or *off*. That is the whole behaviour. A sentence
  the toggle answers with (what a take-up state means for this household)
  is a `.hg-scenario__note`: a full-width line inside the inputs row.
- A **value** (state, county, household, earnings, rent, child care) is a
  `<button>` only when pressing it opens that input's editor. Input design
  is a separate brief (`README.md` § What was deliberately left out), so
  until an editor exists the value chips are `<span>`s with no `aria-pressed`
  and no cursor: a button that does nothing is a lie, and a screen reader
  would announce six of them.

## Where a program ends — the one convention

**A program ends at the first pay at which it is gone.** That is the figure
every surface shows for a threshold: the tile ("at $54,000 → $55,000" names
the step; the end of the step is the threshold), the ledger, the StepList
and the handout all print **$55,000** for the child-care subsidy, never the
$54,000 the sketch's ledger carried (S5).

Where the figure comes from:

- The **cliff list** (`analysis.cliffs`) is the source for every program that
  appears in a cliff's `programsLost`: the threshold is `cliff.endEarnings`,
  the landing point of the step. ThresholdLedger and StepList are rendered
  from the cliff list, so the tile, the ledger and the handout derive the
  same figure from the same object.
- `escape.programEnds[id]` (and `programEndsByAge`) is the **last** pay at
  which the program is still received — `core/src/escape.ts` `lastAbove`
  returns the last point above `PROGRAM_END_MIN`. So for a program that ends
  without a cliff of $200 or more (EITC here) the displayed figure is
  `programEnds[id] + step`, where `step` is the difference between
  consecutive `curve.points[].earnings` ($1,000 on the sweep). Never print
  `programEnds[id]` bare.
- The two sources can disagree for one program: `programsLost` also fires
  when a program *halves* in one step (`analyze.ts`), so today SNAP is "lost"
  at the $53,000 → $54,000 step while $713 of it is still paid until
  $55,000. The ledger shows the cliff's figure, because that is the step the
  chart, the tile and the breakdown name, and the cite line may say what
  remains ("$713 of SNAP continues to $55,000"). The asymmetry itself is
  filed against `core/src/escape.ts`, not patched in a page.

## CorrectionsApplied (#18)

A list rendered from `coverage[state].corrections` — the shape is
`StateCoverage` in `core/src/data.ts`, built by `core/src/coverage.ts` — kept
to the entries whose `applies === true`. Each row is a `.hg-rows` row with
`--col: 11rem`:

| Column | From | Rendered as |
|---|---|---|
| program | the key (`premiumAssistance`, `childcareSubsidy`, `coverageGap`, `maTafdc`) or, for each `policyOverrides[]` record, its `parameter`'s program (the parent Medicaid limit; the BHP list) | `.hg-rows__at` |
| source | `corrections.premiumAssistance.source` (*modeled* or *ladder*), `corrections.childcareSubsidy.source` (*added by HotGap*); a `policyOverrides[]` record reads *overridden*, since its `source` is a URL; `coverageGap` and `maTafdc` carry no source word and show no chip | `.hg-tag` |
| note | `note` — one sentence, written by core for the reader who will quote it (what HotGap did, why, and the upstream issue as the cite; places review S9), never retyped; the code pointer is core's `code` field and is not printed; for an override the `source` URL, and for another correction its `cite`, is the cite's link | `.hg-cite`, the same shape as ThresholdLedger's cite |

Rules:

- Empty when nothing applies. Colorado today has one row (premium
  assistance, *modeled*); Texas has three (parent limit override, coverage
  gap, child-care subsidy *added by HotGap*); Massachusetts has three (TAFDC,
  ladder, child care). The count is rendered, never typed.
- `coverage[state].unmodeled[]` and `otherBenefits[]` are rendered by
  IncompleteMarker and SourceNote respectively, not here.
- **Placement.** Caseworker: directly under the verdict, before the columns,
  headed *Corrections applied in {state}*; a caseworker defending "$25,449"
  reads it before the chart. Journalist: under the map, scoped to the
  selected state and re-rendered on selection; the "How these numbers were
  made" panel keeps the global method and loses its per-state prose.
- The caseworker's ledger footnote no longer says "No state $0-premium wrap
  applies" from copy; it says what `premiumAssistance` says.

## SourceNote (#17)

Takes `vintages` and `model` (`coverage[state].vintages`, whose `model` is
`summary.model` or the state file's) and renders, from the data:

> Estimates only. Rules: {year}. Rent: {vintages.rent.publisher}; {vintages.rent.vintage}. Child-care price: {vintages.childcare.preschool}, carried to {year} dollars by the BLS Employment Cost Index. Reach: {vintages.reach.vintages joined}. Model: policyengine-us {model.version}. Sweep generated {generated}.

The publisher and vintage strings are printed verbatim, so they are written
for the reader at their source (`scripts/build-state-defaults.mjs` →
`state-defaults.json` `sources`): "HUD Office of Policy Development and
Research, Fair Market Rents; FY2026 revised schedule (effective
2025-10-01)". The file and column read live in the source's `note`, which
no surface prints (places review S9).

Colorado today: "child-care price: county 2015 · ACS 2024 1-yr ·
policyengine-us 2.5.0" — the 2015 price and the model version are facts a
caseworker has to be able to say, and both differ by state and by sweep
(DC is `county 2012`; Indiana and New Mexico are a national median; ten
states' reach uses the 5-year PUMS). `model.version` is read from the file
(N9): `summary.json` records 2.5.0 while the engine is on 2.6.2, and the
line must say what produced the numbers, not what is installed. When
`model.version` is null (public API) the line names `model.endpoint`.

**The archetype state (M4).** `HouseholdEvaluation.source` is `"live"` or
`"archetype"`. When it is `"archetype"` on the citizen surface, the source
line becomes:

> We could not get your exact numbers right now. These are numbers for a family like yours in your state. **Try again**

with *Try again* as a `.hg-button--small` inside the line that re-runs the
live call. Two rules ride with it: the county phrase is dropped from the
masthead and from every sentence ("in El Paso County" would be false — the
archetype has no county), and when earnings were clamped to the sweep's top
(`analysis.currentEarnings !== answers.annualEarnings`) the line adds the
CLI's own fact in the citizen register: "Your pay is above the range we
checked. These numbers are for {currentEarnings}, the top of that range."
This is provenance, not a banner: same place, different sentence, nothing
interrupts. The caseworker register already has its sentence ("committed
archetype sweep — not this family's own live call").

## IncompleteMarker (#16)

Keyed off `coverage[state].unmodeled[]` — present for every state in
`summary.json` today — never off `summary.childcareSubsidyUnmodeled`, which
the pipeline omits when empty and which is absent from the 2026-09-16 sweep
(B1). `coverage.ts` puts the child-care gap into `unmodeled[]` whenever that
optional field returns, so keying here covers it and also covers the two
states whose own premium program is unmodeled (NJ Health Plan Savings,
Cascade Care Savings). The rule: a state is *incomplete* for a household
when any `unmodeled[]` entry other than LIHEAP could move that household's
figures — the child-care entry only where a child is of child-care age
(through 12: core's `CHILDCARE_MAX_AGE`, the CCDF ceiling, which the sweep
prices care to) and every parent works, the premium entries for every
household. That is the one rule; the page's `paysForCare` and the proof's
`expectIncompleteFor` both derive from the constant (places review N8). The count of such
states is **rendered** into the legend, the caption and the caseworker
notice; it is never typed. LIHEAP is listed for all 51 states and is not a
reason to hatch: it never reaches net income for anyone.

## Verdict catalog (M2)

`AnswerSentence` has one shape per `analysis.verdict`, wired to
`evaluation.personal` (the household's own zone), never to the whole-curve
`escape`. Slots in braces are rendered from the evaluation; `{pay}` is the
household's earnings in its own unit (§ Pay in the person's unit), `{kept}`
is `analysis.currentNet`. The archive's reviewed strings (Flesch–Kincaid
1.9–3.2) are the seed; every string here goes through the readability gate.

| `verdict` | Sentence | Slots |
|---|---|---|
| `always_up` | You are paid {pay}. You keep {kept}. When you earn more, you keep more. We did not find a spot where more pay leaves you with less. | pay, kept |
| `cliff_ahead` | You are paid {pay}. You keep {kept}. Near {wage}, more pay can mean less money: past it you would keep about {drop} less a year. People call this a benefits cliff. | pay, kept, wage = `nextCliff.endEarnings` (the convention above), drop = `nextCliff.drop` |
| `in_danger_zone`, exit known | You are paid {pay}. You keep {kept}. More pay does not add to that until you are paid {exit}: a raise of {leap}. | pay, kept, exit = `personal.escapeEarnings`, leap = `personal.raiseToClear` (keyed to the bracket, S7) |
| `in_danger_zone`, stuck (`personal.raiseIsLowerBound`) | You are paid {pay}. You keep {kept}. More pay does not add to that in the pay range we checked, up to {top}. We did not find a spot where you come out ahead again. | pay, kept, top = the last `curve.points[].earnings` |
| `cliff_behind` | You are paid {pay}. You keep {kept}. The big drop is below your pay now. From here, more pay means more for you. | pay, kept |

The keyed underlines follow the marks: {kept} in `--series-1` (the line),
{exit} and {leap} in `--loss-3` (the exit rule and the bracket), {wage} in
`--loss-4` (the cliff dot). "People call this a benefits cliff." is kept on
purpose: it is the one sentence that lets a client match what the office
says to what the page showed. When more zones lie beyond the household's
(`escape.safeExitEarnings` differs from `personal.escapeEarnings`), the
answer-sub carries one more sentence, from the data: "It happens again
between {exit} and {safeExit}." — see `charts.md` § 1 for the drawn rule.

## Program phrases (M3)

One table, two registers, thirteen ids (`core/src/types.ts` `PROGRAM_IDS`).
A page never inlines a program phrasing: the citizen surface composes
"{Phrase} ends. It is called {name}." (or "…would end…" above current pay),
the caseworker and journalist use `name`. Every `phrase` is citizen copy and
goes through the readability gate; `name` is what the office calls it and
is not gated. The archive's twelve reviewed phrases are the seed, split so
the acronym is the aside the README's two-register rule asks for.

| id | phrase (citizen, gated) | name (neutral) |
|---|---|---|
| snap | food help | SNAP |
| medicaid | a free state health plan | Medicaid |
| chip | a health plan for kids | CHIP |
| eitc | a tax break for workers | Earned Income Tax Credit (EITC) |
| ctc | the child tax break | Child Tax Credit |
| aca | help paying for health insurance | Premium tax credit |
| tanf | cash help | TANF cash assistance |
| housing | housing help | Housing voucher |
| wic | food help for moms and babies | WIC |
| ssi | SSI cash help | SSI |
| headstart | free early learning | Head Start |
| schoolmeals | free school meals | School meals |
| childcare | child care help | CCDF child care subsidy |

"Tax break", not "tax credit", was a deliberate review change and stays.
`medicaid` and `chip` take the sketch's reviewed phrases over the archive's
("help paying for health care" was never true of Medicaid). When a person-
level program ends for one group, the sentence names the group from
`programEndsByAge`: "Your own free state health plan ends" / "Your kids'
health plan ends".

## Pay in the person's unit (M5)

The unit a person gave (`Pay.unit` in `core/src/income.ts`: hour, month or
year, with `hoursPerWeek` for hourly) is kept beside the evaluation and used
for **every pay figure on the citizen surface**: AnswerSentence's {pay},
{wage}, {exit} and {leap}; StepList's `at` column; CurveReadout's earnings;
the MoneyCurve's x-ticks and its title, which states the unit once ("as
your pay goes up, in dollars an hour"). Conversion is `fromAnnual`; rounding
follows the archive: to $0.25 an hour, $50 a month, $500 a year, phrased
"{amount} an hour / a month / a year". Money kept stays a yearly figure on
every surface (it is what the y-axis plots), and the caseworker and
journalist surfaces stay annual throughout: they check the table against
the file. The chart's tick rule is in `charts.md` § 1.

## Deliberately not components

- **A gauge, meter, or score.** Any single 0–100 "how bad is your state" number
  would be a ranking dressed as a fact, and would collapse six measures that
  disagree with each other.
- **A wizard / Stepper.** The archived system had one. Input design is a separate
  problem from result design, and a fourteen-question funnel is what made the old
  system fit one persona only.
- **Toast, modal, banner, popover.** Nothing here is urgent and nothing
  interrupts. The archetype notice is a SourceNote state; a cliff's detail is
  the ledger or StepList row it already has.
- **A good/bad status pair.** See `README.md`.
