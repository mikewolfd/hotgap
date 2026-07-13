# HotGap Real-World Framing (Minimum-Wage Context) — Design

**Date:** 2026-07-13
**Branch:** `minwage-context` (off `app-uses-ds`)
**Status:** approved (scope: "sentence + reference line")

## Problem

An independent 5-persona validation found HotGap's cliff *locations* are accurate,
but several "worst cliffs" land at **$5,000–$7,000/yr of earnings** — e.g. a parent
crossing a non-expansion state's ~20%-FPL Medicaid limit. A worker at $5k/yr is
working ~6–8 hours a week at minimum wage: the cliff is real and correctly computed,
but it sits in a **dead zone almost no working household's actual pay lands in**, and
the chart today gives the reader zero orientation for "would I ever be here."

A policy-analyst consult (Atlanta Fed CLIFF framing) recommended: **use minimum wage
to *contextualize where a cliff falls*, never to *assume* how many hours anyone works.**
The person's typed-in pay stays the sole model input; minimum wage is a secondary,
labeled reference only.

## What we build (v1)

Two additive, presentation-only changes. No PolicyEngine/model change; the curves are
already correct — they were just unlabeled with real-world scale.

### 1. "Hours a week" translation on drop cards

When a cliff's pay is **at or below full-time minimum wage** for the household's state
(`earnings ≤ stateMinWage × 2080`), the drop-detail card gains one plain line:

> That is about **8 hours a week** at minimum wage in Texas.

`hours = round(earnings ÷ stateMinWage ÷ 52)`, floored at 1.

This self-limits to exactly the low-earnings dead-zone case: above full-time-minimum
the "hours a week" number would exceed 40 (and can exceed the 168 hours in a week),
which is physically nonsensical, so the line is **omitted** there. High safe-exits
therefore never show an impossible hours count — the reference line (below) orients
the high end instead.

### 2. Full-time-minimum reference line on the chart

A thin **dashed vertical line** at `stateMinWage × 2080` on the pay axis, visually
subordinate to the "you are here" dot, plus one below-chart note pairing it with the
number:

> ┄ The dashed line is full-time at minimum wage ($7.25 an hour). That is about $15,100 a year.

Shown on both doors (personal `ResultPage` + places `StatePanel`).

### Explicitly out of scope for v1

- **No filtering / dimming** of sub-minimum-wage cliffs — they are real and honest;
  hiding them would fail the honesty constraint.
- **No prefilling** the pay field with a minimum-wage default, and **no** implied
  floor under the x-axis. Minimum wage never becomes a model assumption.
- No tipped/gig sub-minimum rates; no city/tribal minimums (state-level only).
- No safe-exit "more than full-time at minimum wage" prose clause (the reference line
  covers the high end). Documented as a possible fast-follow.

## Data

`STATE_MIN_WAGE: Record<string, number>` (51 entries, 50 states + DC) in
`app/src/lib/states.ts`, `$/hr`, **in effect as of July 2026** (reflects Jan 1 2026
and July 1 2026 changes). Rules:
- No state law or below federal → federal **$7.25**.
- Geographically tiered states → **lowest tier** (conservative: never overstates how
  few hours a cliff represents). Oregon nonurban $14.55; New York upstate $16.00.
- Florida is **$14.00** (rises to $15.00 on Sept 30 2026 — noted in a comment).

Sources: US DOL state minimum-wage table; NCSL; EPI July-2026 mid-year tracker;
Oregon BOLI; CA DIR 2026 notice. Small hand-maintained map with a dated comment;
**not** wired into the weekly PolicyEngine data Action (minimum wage changes ~yearly).

## Files

- `app/src/lib/states.ts` — add `STATE_MIN_WAGE`.
- `app/src/lib/minWage.ts` (new) — pure helpers: `minWageFor`, `fullTimeMinWageEarnings`,
  `hoursPerWeekAt`. + unit test.
- `app/src/lib/chartLabels.ts` (new) — `makeChartLabels(minWage, stateName)` returning
  `CurveChartLabels` incl. `cardHours`; DRYs the label object currently duplicated in
  ResultPage and StatePanel. + `minWageLineFor(minWage)` helper. + unit test.
- `design-system/src/CurveChart.tsx` — add `minWageLine?: {earnings; label}` prop and
  `labels.cardHours?: (earnings) => string | null`; render dashed line + below-chart
  note + card hours line. + DS test.
- `design-system/src/styles.css` — `.minwage-guide`, `.minwage-note`, `.minwage-swatch`,
  `.drop-card-hours`.
- `app/src/pages/StatePanel.tsx`, `app/src/result/ResultPage.tsx` — use `makeChartLabels`,
  pass `minWageLine`.
- `app/src/strings/en.json` — `chart.minWage.hours`, `chart.minWage.hoursOne`,
  `chart.minWage.line`. (All FK-gate verified ≤ 8.0.)
- e2e: assert the dashed-line note renders; assert a low drop card shows an "hours a week"
  line.

## Constraints honored

5th-grade copy (all new strings FK-verified) · minimal questions (state already
collected; zero new inputs) · show-explain-never-advise (describes hours/where the line
falls, never prescribes) · honesty (never implies a real cliff is fake; reference line
is visibly secondary to the user's own pay) · copy stays in `en.json` via `t()` (DS gets
gate-checked strings through props, per existing copy discipline).
