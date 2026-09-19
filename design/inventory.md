# Component inventory

Twenty-three components. C = citizen, W = caseworker, J = journalist. The tags
were checked against the three sketches on 2026-09-16 (S13): a tag means the
surface renders the component, not that it could.

| # | Component | What it is | C | W | J |
|---|---|---|:-:|:-:|:-:|
| 1 | **AnswerSentence** | The verdict as **one** sentence at display size, up to two clauses, each dollar figure underlined in the colour of the mark it names — so the sentence doubles as the chart's key. One shape per curve shape (§ Verdict catalog); the second figure it names is the leap (S7). Since 2026-09-18 it is the figure's own `<figcaption>`, first child: the sentence and the picture are one object, and nothing stands between the masthead and them (§ The page is its picture). | ● | ● | ● |
| 2 | **StatTile** | Label, one number, one qualifying line. Proportional figures, same sans, no sparkline unless the trend is the point. | | ● | |
| 3 | **MoneyCurve** | The line of net income against earnings, with the household's band, the exit and the leap bracket, cliffs as controls, deferred cliffs, a reference line and the household's position. Plots the real curve — every drop full size, in place (2026-09-17). **The whole earnings axis, scrolled sideways, never cropped** (2026-09-17): the y-axis holds still in a gutter outside the scroller, the x-ticks move with the curve, `windowFor` picks where the reader lands, and the axis's ends are rendered beneath it from the data as "← $0 … $150,000 →". Rules in `charts.md` § 1 and § The scroll rule. | ● | ● | |
| 4 | **CurveReadout** | The live `aria-live` line under the curve that reports the point under the cursor, the keyboard caret, or the cliff mark just activated. Replaces a floating tooltip. | ● | ● | |
| 5 | **MarkKey** | The non-series key: band, immediate cliff, deferred cliff, position. Never a colour swatch alone — each entry draws the actual mark. Since the marks carry direct labels (2026-09-18) it is the fallback rather than the first read, and it lives inside the figure's own *How to read this picture* disclosure — in the DOM, on paper, one key press away, and not in the way. | ● | ● | |
| 6 | **StepList** | The citizen reading of thresholds: a dollar in a fixed left column, a plain sentence beside it, one rule per step. Rendered from the cliff list under the one threshold convention (§ Where a program ends). A row is the card a cliff mark opens (M6). A deferred cliff is a row like any other, its loss line counted, carrying DeferredBadge (#10) and the rule's clause. | ● | | |
| 7 | **ThresholdLedger** | The professional reading of the same data: earnings, program, who holds it (adult or child), and the citation that governs it. Same convention and same source as StepList, deferred rows included and badged. | | ● | |
| 8 | **DropLedger** | Every cliff as a row — step, drop, programs lost, driver, deferred badge. Selecting a row, or its cliff mark on the chart, drives the breakdown: one selection, not two. | | ● | |
| 9 | **BreakdownBars** | Four signed bars from a centre zero showing where a drop came from: benefits, credits, premiums, other. States the sum. | | ● | |
| 10 | **DeferredBadge** | The dashed-outline chip that marks a loss landing at a future renewal, with its rule and citation. Since 2026-09-17 it is the *only* thing a deferral does to a reading: the row, the mark and the figures are an ordinary cliff's, and the badge plus its clause ("it does not end that day", then the rule) say when the money goes. Dashed everywhere, always. One declaration: `.hg-badge`. | ● | ● | |
| 11 | **ScenarioBar** | The household's inputs as chips — state, county, shape, earnings, rent, childcare, and the take-up toggles — plus *add a what-if* and *print*. Phone behaviour and chip semantics in § ScenarioBar. | | ● | |
| 12 | **CompareTable** | Two or three scenarios in columns against the same rows. Column identity is a rule under the header, never coloured text. | | ● | |
| 13 | **StateTiles** | The 51-tile cartogram: equal squares, postal code on every tile, printed bins, and **four** mutually distinct tile states — shaded, *no cliff*, *past the axis*, *not computed* (`charts.md` § 2). Each tile is a button that opens its state; the group is one tab stop. Since 2026-09-18 it is the journalist page's picture: full-bleed on a phone, 48rem above 64rem, with the AnswerSentence as its `<figcaption>` and everything it needs — legend, caution, readout, controls — inside the same figure (`charts.md` § The map is the picture). | | | ● |
| 14 | **RankStrip** | The sorted companion to the map — state, dot on a shared axis, value — answering *how much* where the map answers *where*, with the axis bounds above the list. Each row is a `.hg-row-btn` that opens its state: the full-size control that a tile sized to its square cannot be (`charts.md` § 2). States with no cliff and states the model cannot complete are each lifted out into their own labelled block, never left at the bottom of the order. Since 2026-09-18 it opens *Every state, every measure* beside the DataTable — fifty-one ranked rows are two hundred words and the map is the page — and its heading says which measure it ranks and which way, in the order control's own words. | | | ● |
| 15 | **DataTable** | The text equivalent and the thing a reporter copies: every row, every measure, in its own horizontal scroller, with a CSV export carrying its own provenance columns. A no-cliff cell prints *none*, never `$0`. | ● | ● | ● |
| 16 | **IncompleteMarker** | The 45° hatch (`.hg-hatch-incomplete`) and its companions — the legend entry that says *figures incomplete, not low*, the not-ranked block, the flag column, the caseworker's one-line state notice. Rendered from `coverage[state].unmodeled[]` on every pass (§ IncompleteMarker). | | ● | ● |
| 17 | **SourceNote** | The provenance line that closes every figure and table: publisher, vintages, model version, date read, policy year, and *estimates only* — all from the data. Has an *archetype* state (§ SourceNote). | ● | ● | ● |
| 18 | **CorrectionsApplied** | The HotGap-side corrections behind this state's numbers, from `coverage[state].corrections` (§ CorrectionsApplied). | | ● | ● |
| 19 | **Callout** | One shape for an aside about the data: a 3px left rule, `--note` or `--caution` or neutral, always led by a word. `.hg-callout`. Never a banner, toast or modal. | ● | ● | ● |
| 20 | **Button** | One declaration, `.hg-button`; `--primary` for the one action a surface leads with; `--small` inside a source line. The CSV download and *Try again* are the base. The sketches' theme toggle is a demo control and no built surface carries one: `prefers-color-scheme` rules, and print is always light. | ● | ● | ● |
| 21 | **FilterRow** | One row of `<select>`s above everything it scopes, plus the row's end slot for a download. `.hg-filters`. A control that scopes one component sits with that component in its own row — the table's order control under the table's heading — never in the shared row (places review S7). Never a filter inside a chart card. A `<select>` whose options answer **two different questions** groups them and labels each group: the journalist's Measure and Table order both carry *On the road out of poverty* and *Anywhere on the curve*, in that order, because the two are not a ranking of one another (§ KeepRate). | | | ● |
| 22 | **SkipLink** | The first focusable thing on the page, to the answer, the ledger or the table. `.hg-skip`. | ● | ● | ● |
| 23 | **EligibilityBoundary** | A line a household never crossed: where a program it may not have stops. Three facts, never a drop (§ EligibilityBoundary). Today one program, energy assistance (LIHEAP), from `evaluation.liheap` / `coverage[ST].liheap`. | ● | ● | ● |

## Class map

What a page uses instead of declaring its own (S13). A page keeps only
layout that is genuinely its own (its column grid, its masthead).

| Component | Classes in `tokens.css` |
|---|---|
| DeferredBadge | `.hg-badge` |
| CorrectionsApplied, ThresholdLedger cite | `.hg-rows` (set `--col`), `.hg-rows__at`, `.hg-tag`, `.hg-cite`; `.hg-rows--stack` on a list whose rows stack below 520px so a cite has the whole line (the caseworker's provenance rows, the journalist's state block; TODO(system) 13 stands for the citizen's lists) |
| StepList | `.hg-rows`, `.hg-rows__at`, `.hg-rows__loss` (the drop line); `[aria-current="true"]` on the open row |
| MarkKey | `.hg-key` |
| CurveReadout | `.hg-readout` |
| MoneyCurve | `.hg-chart` (wrapper), `.hg-chart--scroll` (the figure's flex row) + `.hg-chart__gutter` (the y axis, outside the scroller) + `.hg-chart__scroll` (`.hg-scroll-x`, the plot and its marks) + `.hg-chart__hint` (the axis's ends, outside the scroller), `.hg-marks` + `.hg-mark` + `.hg-mark__count` (cliff controls; `--later` on a merged mark whose every cliff waits, whose hollow dot takes `--ink-3`), `.hg-tick`, `.hg-label` with `--loss`, `--ink`, `--halo` (a word in a mark's ink; a halo over the hatch) and its weight `--strong` (the largest drop, the leap, "you") or `--med` (the peak, the exit, "later") — never a bare `font-weight` on `<text>`, `.hg-draw` |
| StateTiles, RankStrip legend | `.hg-tile--none`, `.hg-tile--past`, `.hg-tile--incomplete` + `.hg-hatch-incomplete` (an SVG mask on a pseudo-element, so it prints — B1 of the places review); `.hg-swatch` with the same modifiers, in a `.hg-key` list |
| Callout | `.hg-callout`, `--note`, `--caution` |
| Button | `.hg-button`, `--primary`, `--small` |
| ScenarioBar | `.hg-scenario` (+ `--sticky` on the block that holds the top row; `[data-collapse="always"]` on the block that holds the summary and the inputs, for a surface that keeps the phone rule at every width — `mountEditor`'s `collapse` option, the citizen page), `__top`, `__actions`, `__inputs`, `__note` (the full-width line, never capped at `.hg-source`'s measure), `__summary`; `.hg-chip`, `.hg-chip__k`, `.hg-chip__v`, `[data-unset]` on a value chip whose answer is still *none* (a step lighter); the four-facts screen's text and number inputs take `.hg-input`, the `.hg-select` rule; the wordmark in the top row takes `.hg-wordmark` |
| FilterRow | `.hg-filters`, `.hg-filters__end`, `.hg-select` (or a bare `<select>` inside the row) |
| SkipLink | `.hg-skip` |
| EligibilityBoundary | citizen: `.hg-tick` for the axis mark, a `.hg-key` entry, one `<p>` in the figure; caseworker: a `.hg-rows`/`.hg-table` row with `.hg-tag` *if you apply* and `.hg-cite`; journalist: a `.hg-rows` row in the state block with `.hg-tag` and `.hg-cite`, and two CSV columns. No class of its own: it must not look like a cliff |
| DataTable, DropLedger, CompareTable | `.hg-table` with `.num` and `.money`; `.hg-row-btn` for a row that is a control (44px on screen, its own rhythm on paper); `.hg-scroll-x` around a wide table — an edge shadow on whichever side still has content, by CSS alone, and `data-more` for a page's own "swipe" words while it finds an overflow (places context-blind S10); `details.hg-disclosure` around a table that opens on demand |
| SourceNote | `.hg-source` |
| Panels, print | `.hg-panel`; `.hg-print-only`, `.hg-no-print`; `.hg-dense` on `<html>` is the two panel surfaces' 15px base and wider measure, once |
| AnswerSentence | `.hg-answer`; `.hg-amt` with `--keep` (the line), `--gap` (the exit rule and the bracket), `--cliff` (a cliff dot); `--measure-answer` is its measure and `--t-answer` its size. The page keeps only the margins |
| The figure | `.hg-picture` — not `.hg-figure`, which is a StatTile's number and was there first — margin only: it bleeds to the screen's edges below 64rem (the y-axis gutter travelling inside it) and leaves the prose column above, capped at `--figure-max`. Every non-chart child keeps the page's gutter. **Leaving the column is for a chart whose x axis wants every pixel**; a surface whose picture is square may keep the column and size the picture itself instead, which is what the journalist map does above 64rem (`charts.md` § The map is the picture) |
| Page column, wordmark | `.hg-page` (centred, `--s4` gutters, `--s8` foot; the page sets `--page-max` on its own class: citizen 40rem, journalist 68rem, caseworker 76rem); `.hg-wordmark` (weight and size; the editor's row tracks it −0.01em, the journalist masthead does not — one value once settled) |
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

## The page is its picture (2026-09-18)

The rule this pass added, and the one every surface follows. Its reason is a
first reader's, quoted in `PICTURE-FIRST-2026-09-18.md`: there was too much
writing, and the picture was two thirds of a phone screen down.

**The order, on every surface.** One line of masthead, one sentence, the
figure. Nothing else is above the fold — not a lede, not a stat row, not a
key, not a filter. The figure's first child is the AnswerSentence itself, as
`<figcaption>`, so the picture's accessible name is the answer.

**The budget, measured not asserted.** `app/e2e/weight.mjs` counts the words a
person can really see (no `[hidden]`, no `display:none`, no visually-hidden
clip; a closed `<details>` is worth its summary and nothing else), reports the
words inside the picture apart from the prose, finds the first `<figure>` and
measures how much of the first screen it covers.

| | citizen | caseworker | journalist |
|---|---:|---:|---:|
| words visible by default | ≤ 120 | ≤ 250 | ≤ 200 |
| first figure's top, at 390 | ≤ 120px | ≤ 120px | ≤ 120px |
| figure's share of screen 1, 390 / 1280 | ≥ 0.5 / ≥ 0.6 | ≥ 0.5 / ≥ 0.6 | ≥ 0.5 / ≥ 0.6 |

The three budgets differ because density is a surface decision, not a
component one (`README.md` § Where the personas conflict, 3). They are floors
on the reader's attention, not ceilings on what the page holds: the same
script run with every disclosure open is the proof that nothing was deleted,
and that number belongs in every review beside the closed one.

**One thing the script cannot see (2026-09-18, the journalist pass).** It
subtracts every `<option>`'s words from a visible `<select>` and adds the
selected one back — but a closed select's options have no client rect, so the
tree walker never counted them, and the subtraction runs against a total that
never held them. On a page with two long-optioned selects the error is 184
words; on the journalist page that made the tool print **−11 words**, which is
the defect announcing itself. Until `weight.mjs` skips options the walker
skipped, a review of a page with a visible `<select>` prints the tool's figure
AND the figure with the options added back, and the budget is checked against
the second. `e2e/places.spec.ts` re-derives it that way and asserts the
zero-rect premise, so the correction cannot silently stop being needed.

**The disclosures.** Three on the page, one inside the figure, in this order,
with these names. A surface that needs another names it for what is inside it
and writes it here.

| summary | what is inside |
|---|---|
| *How to read this picture* | MarkKey, the caption (axis floor, estimates, year and state), the keyboard sentence. Inside `<figure>` |
| *What happens at each step* | the keep rate on the next stretch, StepList / ThresholdLedger, EligibilityBoundary, DataTable |
| *What we assumed* | the assumed rows and every correction that touched them, then reach and the lowest legal pay. Named *What we assumed about you* until a fresh reader said it made her feel "sized up by a stranger" — twice, in two languages. The line inside still says whose household it is |
| *Where these numbers come from* | SourceNote, IncompleteMarker, CorrectionsApplied, the estimates footer |
| *What this family faces, step by step* | **Caseworker.** The zones beyond this household's and the pay past which none remain, the StatTiles, the DropLedger with each row's position, and BreakdownBars. This surface's reading of *What happens at each step*: the rows a cliff mark opens, led by the five figures a counselor reads out. The tiles were the page's second line until 2026-09-18; a row of 30px numbers above the picture is the big-number hero the plan refuses (`PICTURE-FIRST` § Review against the generic tells) |
| *Compare the what-ifs* | **Caseworker.** The CompareTable with its keep-rate row, the on-the-way lists, each column's *Remove* and *Try again*, and the compare note. Added by this surface because the comparison is now two objects: the lines on the picture, which is where a counselor meets it, and the figures here, which is where she reads it off. *Add a what-if* stays in the masthead — it changes the answer |
| *Where each program ends* | **Caseworker.** ThresholdLedger and the EligibilityBoundary row inside it, with the ledger's footnote. The same slot as *What happens at each step*, under the name this surface already gave it |

The journalist surface's own two, both inside `<figure>` and both named for
what is in them (2026-09-18; `charts.md` § The map is the picture):

| summary | what is inside |
|---|---|
| *How to read this map* | what the map shades and what the measure means, all four tile states with the tiles' own marks, the bin bounds and the one-class line, the keyboard sentence, the two boxed warnings in full, and the cliff/danger-zone glossary. The map's *How to read this picture* |
| *Where {state}'s numbers come from* | CorrectionsApplied, IncompleteMarker, otherBenefits, EligibilityBoundary and the SourceNote for the selected state, directly under the readout that names it. Absent until a state is chosen, and it never repeats the readout's own sentences |

The three page disclosures on that surface hold: *Every state, every measure*
(RankStrip, the order control, the column definitions, DataTable), *How these
numbers were made* (the method and what the model excludes), *Where these
numbers come from* (the run's source line, the CSV's columns, the citation).

Four rules that go with them:

- `details.hg-disclosure`, closed by default, **open on paper**
  (`beforeprint`), content in the DOM at all times and reachable by keyboard
  and screen reader. Never a tab, never a modal, never a link that navigates.
- A summary is a plain sentence fragment a person would say, sentence case,
  no count badge and no chevron of our own.
- **Nothing that changes an answer hides.** The ScenarioBar's chips are behind
  *Edit* because they are the household, not the answer.
- **Nothing that warns hides.** `role="alert"`, `role="status"`, the archetype
  notice and the incomplete-state caution stay in the open, whatever the
  budget costs. A page under its word count with a hidden warning has failed
  the measurement, not passed it.
- **And nothing that does not warn stays.** Its converse, added by the
  caseworker pass: *Figures complete for Colorado. Nothing this household
  would hold is unmodelled here* is provenance, not a caution, and it was
  costing the first screen forty-five words. The same component renders into
  the notices when it has something to warn about and into *Where these
  numbers come from* when it does not (`caseworker/render.ts`,
  `renderCoverage`). A warning is what a reader would act on, not every
  sentence about the data.

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

> A parent with two kids in Colorado, paid $38,000 a year — **Edit**

The line was `CO · El Paso · 1 adult, kids 3 & 7 · $38,000` until 2026-09-18.
Facts joined by middle dots are a template's way of writing, not a person's,
and this line is the only prose above the answer: it says who the numbers are
for, in one phrase, from the same `answers` as before. The county leaves it —
it is in the chips and in the source line, and it was the fact readers scanned
past.

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

**Reach is in the line wherever a surface prints a position.** It was dropped
from the journalist page while nothing there used it and is back since Plan 9,
because "47 in 100 families like this earn less" is a figure whose survey a
reader must be able to name. The journalist surface says the fact in the
reader's words rather than the field's — "Families earning less: ACS 2024
1-year PUMS, grown to 2026 dollars" — and reads it from that state's own
coverage block, never from a list kept in the page.

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
optional field returns, so keying here covers it and also covers any state
whose own premium program the sweep's endpoint did not serve — NJ Health
Plan Savings and Cascade Care Savings were the two until the 2026-09-16
resweep, which carries the engine's own figures for both; today no state
is hatched. The rule: a state is *incomplete* for a household
when any `unmodeled[]` entry other than LIHEAP could move that household's
figures — the child-care entry only where a child is of child-care age
(through 12: core's `CHILDCARE_MAX_AGE`, the CCDF ceiling, which the sweep
prices care to) and every parent works, the premium entries for every
household. That is the one rule; the page's `paysForCare` and the proof's
`expectIncompleteFor` both derive from the constant (places review N8). The count of such
states is **rendered** into the legend, the caption and the caseworker
notice; it is never typed. LIHEAP is no longer in `unmodeled[]` at all
(Plan 7): it is a boundary on every block (`coverage[state].liheap`,
§ EligibilityBoundary), and Michigan's is counted.

## Verdict catalog (M2)

`AnswerSentence` has one shape per `analysis.verdict`, wired to
`evaluation.personal` (the household's own zone), never to the whole-curve
`escape`. Slots in braces are rendered from the evaluation; `{pay}` is the
household's earnings in its own unit (§ Pay in the person's unit), `{kept}`
is `analysis.currentNet`. The archive's reviewed strings are the seed; every
string here is reviewed by social workers in the citizen register.

| `verdict` | Sentence | Slots |
|---|---|---|
| `always_up` | Every raise leaves you better off — we checked every step up to {top} and nothing drops. | top |
| `cliff_ahead` | You're fine up to {wage}; past that, earning more costs you about {drop} a year. | wage = `nextCliff.endEarnings` (the convention above), drop = `nextCliff.drop` |
| `cliff_ahead`, and that cliff waits | You're fine up to {wage}; past that you'd lose about {drop} a year, though not right away. | as above |
| `in_danger_zone`, exit known | More pay won't leave you better off until you're past {exit} — {leap} more than you make now. | exit = `personal.escapeEarnings`, leap = `personal.raiseToClear` (keyed to the bracket, S7) |
| `in_danger_zone`, stuck (`personal.raiseIsLowerBound`) | More pay won't leave you better off anywhere we looked, right up to {top}. | top = the last `curve.points[].earnings` |
| `cliff_behind` | The worst of it is behind you — from {wage} up, more pay means more money. | wage = `worstCliff.endEarnings` |

The keyed underlines follow the marks: {exit} and {leap} in `--loss-3` (the
exit rule and the bracket), {wage} in `--loss-4` (the cliff dot), {top} and
{drop} unkeyed. When more zones lie beyond the household's
(`escape.safeExitEarnings` differs from `personal.escapeEarnings`), one more
sentence carries it, from the data: "It happens again between {exit} and
{safeExit}." — drawn rule in `charts.md` § 1 — and it sits in *What happens
at each step*, not in the answer.

**What left this sentence on 2026-09-18** (`PICTURE-FIRST-2026-09-18.md`),
and why, because each was there for a reason:

- **{pay} and {kept}** — "You are paid $30,000 a year. You keep $45,283."
  The pay is what the person typed and the ScenarioBar's summary line still
  says it; an answer that opens by repeating the question is why nobody reads
  its second sentence. What they keep moved onto the chart, as the direct
  label at their own diamond (`charts.md` § Direct labels): it is the one
  number on this page that needs a picture to make sense of.
- **"People call this a benefits cliff."** — the sentence that let a client
  match the page to what the office says. It is not lost: it opens *What
  happens at each step*, where a person who wants the mechanism is already
  looking.
- **The timing clause** for a deferred cliff at or above the household's pay.
  Citizen review B1 asked that such a loss not be invisible *in the answer
  and in the picture*; the picture now carries it — the hollow dot, the dashed
  stub, the word *later* and the drop's money as a direct label — and the
  step row still carries the rule and the badge, which is what B1 protected.
  `cliff_ahead` keeps a four-word hedge ("though not right away") where the
  cliff the sentence itself names is the deferred one, because there the
  answer would otherwise be wrong about timing.

## Program phrases (M3)

One table, two registers, fourteen ids (`core/src/types.ts` `PROGRAM_IDS`).
A page never inlines a program phrasing: the citizen surface composes
"{Phrase} ends. It is called {name}." (or "…would end…" above current pay),
the caseworker and journalist use `name`. Every `phrase` is citizen copy and
is reviewed in the citizen register; `name` is what the office calls it and
is reviewed as a name. The archive's twelve reviewed phrases are the seed, split so
the acronym is the aside the README's two-register rule asks for.

| id | phrase (citizen) | name (neutral) |
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
| liheap | help with heating bills | LIHEAP energy assistance |

"Tax break", not "tax credit", was a deliberate review change and stays.
`medicaid` and `chip` take the sketch's reviewed phrases over the archive's
("help paying for health care" was never true of Medicaid). When a person-
level program ends for one group, the sentence names the group from
`programEndsByAge`: "Your own free state health plan ends" / "Your kids'
health plan ends".

**A figure never travels without what qualifies it.** Two things ride with a
step wherever it is printed, by the same rule that keeps a program's name with
its loss: the **programs** the step ends, and, where the step is a point on the
earnings axis, its **position** — how many families like this one earn less than
it (§ KeepRate). Both are the step's own data; neither is decoration, and a
surface that has room for the figure has room for them.

## KeepRate (Plan 9)

The one question every surface asks — *of each extra dollar you earn, what do
you keep?* — as a figure. `keepRate` is dollars kept per extra dollar across
**the road out of poverty**, the earnings from the federal poverty guideline for
the household's size to twice it; it is one minus the effective marginal tax
rate, and it is a measure, not a score (`README.md` § What was deliberately left
out). Core computes it; a surface renders it.

**The words are core's, everywhere.** `keepRateWords(rate)` returns the sign word
and the cents — always positive, because the sign word carries the sign — so the
map, the citizen's answer and the caseworker's sheet cannot round or word one
rate three ways. A surface chooses only how much room the phrase gets:

| Where | Form | Example |
| --- | --- | --- |
| A legend end, a tile's own name | the whole phrase (`core.road.rate`) | keeps 30¢ of each extra dollar |
| A ranked row's value, a table cell | the short form | keeps 30¢ |
| A scale bound, an axis end | signed cents | +30¢, −56¢, 0¢ |
| A bin's width | unsigned cents, because a width is a distance | 26¢ |
| The readout's first sentence | `core.road.sentence` | Missouri — a single parent of two children who earns their way from poverty to twice poverty ends up 56¢ poorer for every extra dollar. |

Zero keeps nothing and loses nothing, and says "keeps 0¢", which is true and
reads as the plateau it is. Below zero the family ends the climb **poorer than
it started** — that is what the lede says, once, rather than a minus sign a
reader has to interpret.

**DARKNESS IS THE RANKING, HUE IS THE SIGN** (2026-09-18). The measure is
signed, but the reading a person takes off a map is *how bad*, and that reading
is the whole order from the state that loses most to the state that keeps most
— not distance from zero, which would make keeping 30¢ as emphatic as losing
30¢. So the six bins take the six rungs of one lightness axis in that order,
the losing arm on the deep rungs and the keeping arm on the pale ones, and the
plum/tan turn marks zero. Drawn the other way — each arm pale at the hinge and
deep at its own end — the best state in the country and the worst came out at
L\* 19.6 and 19.7, and a greyscale print, a photocopy or a monochrome screen
told a reader that New Mexico was among the worst states in America
(`REVIEW-picture-first-places-2026-09-18.md` B1). The rule, the rungs and the
greyscale check are `charts.md` § the diverging ramp; the rung is
`divergingBins`; **the label ink follows the rung**, `--ink` on the two steps
nearest the page's own ground and `--surface` on the rest, both themes.

**Where it appears.** On the journalist page it is the default measure, first in
the *On the road out of poverty* group, drawn on the diverging ramp with zero
fixed as a bin edge (`charts.md` § 2); its ranking leads with the LOWEST rate,
because the worst state on this measure is the most regressive one, and no state
is lifted out of it for having no cliff — a state with a clear road still has a
rate. On the citizen page it is the next stretch from where the person stands.
On the caseworker page it is a row under each what-if column.

**POSITION rides with it, and with every earnings figure.** A dollar figure on
this site travels with the share of families like this one in that state who
earn less than it: "47 in 100 families like this in Missouri earn less than
that". It is the fact that says whether a cliff is one anybody stands at — the
measure this plan exists because the page lacked. Three rules, and all three are
the same rule the program phrases follow: it is a **sentence**, not a clause
glued to another one (`core.road.position` is core's clause; a surface that
needs a sentence writes one); it is **cross-sectional**, so a surface may say
how many families already earn less and may never say a family's chance of
getting there; and a missing survey cell is **null, never 0**, so it prints
nothing rather than "0 in 100", which would read as a finding.

## EligibilityBoundary (#23)

The design system had no component for a boundary a household never
crossed: IncompleteMarker is a data gap, DeferredBadge is a later loss, and
the one convention (§ Where a program ends) is where a program the
household *receives* ends. Energy assistance (LIHEAP) is none of those. It
is a block grant that served 3–85% of eligible households in FY2024 (12%
nationally), so a family under the limit is eligible to *apply*, and a
drawn drop would draw a benefit most eligible families never receive
(`docs/superpowers/plans/2026-09-16-hotgap-liheap-boundary.md`, the
honesty rule). The component says three facts and draws nothing that
looks like a loss.

**What it says**, from `evaluation.liheap` (`core/src/liheap.ts`
`LiheapBoundary`) on the household surfaces and `coverage[ST].liheap` on
the journalist's:

1. **The limit** — `earningsLimit` on the household surfaces (the earner's
   own pay at the state's heating limit, other household income netted
   out); `limitKind` in words on the journalist's ("150% of the poverty
   guideline", "60% of state median income").
2. **The worth if received** — `topBand.min`–`topBand.max`, the state's
   published amount at its *top* income band, which is the smallest step of
   every staircase and so what a household at the limit would actually
   lose. One figure when min equals max; the citizen register says "a
   winter" because it is one season's benefit.
3. **The served share** — `servedShare` as "about N in 10" in the citizen
   register (fewer than 1 in 10, almost all, or *we do not know* when the
   profile was not read — Hawaii today), as a percentage with its vintage
   (FY2024) for the caseworker and the journalist. Cross-sectional, never
   this household's odds: the same discipline as reach.

**Where it sits.**

- *Citizen:* a tick on the x-axis at the limit — `.hg-tick`-sized, `--ink-3`,
  8px up from the axis, inside the picture only when the limit is in the
  window — with no dot, no connector and no drop; a `.hg-key` entry that
  draws that tick ("Where help with heating bills stops"); and one
  paragraph directly under the key, in the citizen register, with the three
  facts and the invitation to the toggle ("If you get it, turn it on to see
  it in your line."). Behind the toggle the tick and paragraph give way: the
  amount is in the line, its end is a StepList row like any other
  ("Help with heating bills ends. It is called LIHEAP."), and the paragraph
  says only that it was counted.
- *Caseworker:* a ThresholdLedger row at the limit, program "LIHEAP energy
  assistance", who "Household", tagged `.hg-tag` *if you apply*, its
  `.hg-cite` carrying the limit's basis, the worth, the served share with
  its vintage, and the date read. Behind the toggle the row is the cliff's
  own, and the cite says the amount was counted at the household's say-so
  from HotGap's table. The "What this model does not include" list carries
  `corrections.liheap.note` verbatim, and CorrectionsApplied's *checked and
  not applying* line names it.
- *Journalist:* one row in the state block, in the ledger's shape — the
  program with its footing chip (*not counted*, or *in net income* where the
  money is a counted state credit), the three facts as one sentence in the
  cite register the block's other rows use (the limit in words, the worth by
  the schedule's shape, the served share as "about N in 10" with the
  percentage and its vintage; a row that changed no figure never outweighs
  the corrections, liheap review S1), and the publishers on a second cite
  line with the day read — set off from the state's lists by the 2px strong
  rule the rank groups use, before the source line.
  One row, not three, because the block shares a grid row with the ranked
  strip at 1280 and a taller block moves the table below with the selection.
  Two CSV columns, `liheap_limit` (the limit in words, the block's
  `limitKind`) and `liheap_served_share` (a fraction; empty where the profile
  was not read, never a number), beside the footing column. The method
  panel names it once for the page, from every block: the served range with
  its two states, and the states where it is counted.

**A fourth state: the counted credit.** Where the state pays its heating
help as a refundable credit PolicyEngine models and HotGap already counts
(`upstream.counted === "state credit"` on the boundary and the block —
Michigan's Home Heating Credit), there is nothing to apply for and the
toggle adds nothing, so the boundary copy is wrong there (liheap review
B1). The tick and the key entry stay: the limit is where the credit reaches
$0, and the curve shows a taper, not a step. The citizen paragraph says the
money is already in the line, names no worth and invites nothing ("Help
with heating bills in Michigan is a tax credit. It is already in your line.
It gets smaller as you earn more and runs out above $29,500 a year. About 9
in 10 families who could get it here do."; `data-counted="credit"`), and
the assumed list leaves heating help out of both take-up rows. The
caseworker row sits at the limit untagged (`data-boundary="credit"`), and
its cite says the credit is counted in state credits, tapers out by the
limit so it is not a cliff, the served share with its vintage, what was
assumed about heat in the rent, and the date read; the take-up sentence
leaves it out. The journalist row's chip reads *in net income* and its
sentence ends "Paid as the Home Heating Credit, which is counted in every
figure for Michigan." The invitation, where there is one, is its own
sentence in `.hg-no-print` (liheap review S2): on paper there is nothing to
turn on.

**What it must never do.** Draw a drop, a dot, a connector or a wash. Enter
any ranking, tile bin, or `summary.json` metric. Appear in `cliffs`,
`programEnds`, `dangerZones`, the cliff count, `biggestLoss` or the leap.
State the served share as this household's chance of being served. Hide
the toggle: the served share is the honest probability and is printed
beside the amount on every surface, toggle on or off.

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
