# Component inventory

Sixteen components. C = citizen, W = caseworker, J = journalist.

| # | Component | What it is | C | W | J |
|---|---|---|:-:|:-:|:-:|
| 1 | **AnswerSentence** | The verdict written as one sentence at display size, with each dollar figure underlined in the colour of the mark it names — so the sentence doubles as the chart's key. | ● | ● | |
| 2 | **StatTile** | Label, one number, one qualifying line. Proportional figures, same sans, no sparkline unless the trend is the point. | | ● | ● |
| 3 | **MoneyCurve** | The line of net income against earnings, with bands, cliffs, deferred cliffs, a reference line and the household's position. Lifts deferred drops before plotting. | ● | ● | |
| 4 | **CurveReadout** | The live `aria-live` line under the curve that reports the point under the cursor or the keyboard caret. Replaces a floating tooltip. | ● | ● | |
| 5 | **MarkKey** | The non-series key: band, immediate cliff, deferred cliff, position. Never a colour swatch alone — each entry draws the actual mark. | ● | ● | |
| 6 | **StepList** | The citizen reading of thresholds: a dollar in a fixed left column, a plain sentence beside it, one rule per step. | ● | | |
| 7 | **ThresholdLedger** | The professional reading of the same data: earnings, program, who holds it (adult or child), and the citation that governs it. | | ● | |
| 8 | **DropLedger** | Every cliff as a row — step, drop, programs lost, driver, deferred badge. Selecting a row drives the breakdown. | | ● | |
| 9 | **BreakdownBars** | Four signed bars from a centre zero showing where a drop came from: benefits, credits, premiums, other. States the sum. | | ● | |
| 10 | **DeferredBadge** | The dashed-outline chip that marks a loss landing at a future renewal, with its rule and citation. Dashed everywhere, always. | ● | ● | ● |
| 11 | **ScenarioBar** | The household's inputs as chips — state, county, shape, earnings, rent, childcare, and the take-up toggles — plus *add a what-if* and *print*. | | ● | |
| 12 | **CompareTable** | Two or three scenarios in columns against the same rows. Column identity is a rule under the header, never coloured text. | | ● | |
| 13 | **StateTiles** | The 51-tile cartogram: equal squares, postal code on every tile, five printed bins, a distinct treatment for *past the axis*. | | | ● |
| 14 | **RankStrip** | The sorted companion to the map — state, bar, value — answering *how much* where the map answers *where*. | | | ● |
| 15 | **DataTable** | The text equivalent and the thing a reporter copies: every row, every measure, in its own horizontal scroller, with a CSV export carrying its own provenance columns. | ● | ● | ● |
| 16 | **SourceNote** | The provenance line that closes every figure and table: publisher, vintage, date read, policy year, and *estimates only*. | ● | ● | ● |

## Deliberately not components

- **A gauge, meter, or score.** Any single 0–100 "how bad is your state" number
  would be a ranking dressed as a fact, and would collapse six measures that
  disagree with each other.
- **A wizard / Stepper.** The archived system had one. Input design is a separate
  problem from result design, and a fourteen-question funnel is what made the old
  system fit one persona only.
- **Toast, modal, banner.** Nothing here is urgent and nothing interrupts.
- **A good/bad status pair.** See `README.md`.
