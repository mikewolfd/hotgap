# HotGap Drop Detail — Tap a cliff to see what you'd lose (Plan 9)

**Date:** 2026-07-12
**Status:** Approved by user ("just build it"); user waived the spec-review gate and the writing-plans step. Building directly, with an independent whole-branch review before merge.

## Goal

On the money-vs-pay chart, let a person tap any **drop** (benefits cliff) and see, in plain language, roughly where it is, how much yearly money it costs, and exactly which help ends there. Applies to both the personal result chart and the places-door drill-down (same `CurveChart` component).

## The data is already computed

`analyzeCurve` already produces `analysis.cliffs: Cliff[]`, one per discrete drop (net-income fall > `CLIFF_MIN` $200 between adjacent points). Each `Cliff` has `startEarnings`, `endEarnings`, `drop` (annual dollars), and `programsLost: ProgramId[]` (programs whose value fell > $100 across the step). Every program already has a plain label string `program.<id>` (e.g. `program.snap` = "food help (SNAP)"). Both `ResultPage` and `StatePanel` already build a full `analysis` and pass it to `CurveChart`. So this is **UI only** — no shared math, worker, or data changes.

## Component (`app/src/result/CurveChart.tsx`)

Local selection state: `const [selected, setSelected] = useState<number | null>(null)` — index into `analysis.cliffs`.

**Markers.** One per cliff, at the top of the drop: `cx = x(cliff.startEarnings)`, `cy = y(netAtStart)` where `netAtStart` is the net income of the point whose `earnings === cliff.startEarnings` (a cliff's `startEarnings` is exactly a sample point's earnings, so an exact lookup holds; fall back to the first point if not found). Rendered as an accessible button:
- SVG `<g role="button" tabIndex={0} aria-pressed={selected===i} aria-label={t("chart.drop.marker.label", {pay, amount})}>` containing a transparent hit `<circle r={HIT}>` (≥44px target — `HIT=22` viewBox units ≈ 44px at the chart's ~1:1 render scale) plus a visible `<circle class="drop-dot">` (r 4, `--danger`), enlarged/ringed when selected (`drop-dot-selected`).
- `onClick` and `onKeyDown` (Enter or Space, `preventDefault` on Space) toggle selection (tap the same drop again → deselect).

**Detail card.** Rendered as HTML inside the `<figure>`, after the `</svg>`, only when `selected !== null`:
- Where: `t("chart.drop.card.where", { pay: formatWage(cliff.startEarnings, ctx) })` → "Around $30,000 a year." (pay in the same display unit as the x-axis).
- Amount: `t("chart.drop.card.amount", { amount: formatDollars(cliff.drop) })` → "Earning more here drops your money about $4,200 a year." (`drop` is an annual net-income delta, matching the annual "money left" y-axis.)
- What ends: `t("chart.drop.card.lose")` ("You'd lose:") then a `<ul>` of `t(`program.${id}` as StringKey)` for each `programsLost` id. If `programsLost` is empty, show `t("chart.drop.card.none")` ("Several kinds of help get smaller here.") instead of the list.
- A close control (`t("chart.drop.card.close")`, 44px) that clears selection.

**Hint.** When `analysis.cliffs.length > 0`, a one-line `chart.drop.hint` ("Tap a red dot to see what you'd lose.") near the existing legend. No cliffs → no markers, no hint, no card (childless monotonic curves are unaffected).

## Copy (all new keys in `app/src/strings/en.json`, must pass the readability gate ≤5.9 corpus / ≤8.0 per-string)

- `chart.drop.hint`: "Tap a red dot to see what you'd lose."
- `chart.drop.marker.label`: "A drop near {pay}. You lose about {amount} a year here. Tap to see what ends." (aria-only; still gate-checked)
- `chart.drop.card.where`: "Around {pay}"
- `chart.drop.card.amount`: "Earning more here drops your money about {amount} a year."
- `chart.drop.card.lose`: "You'd lose:"
- `chart.drop.card.none`: "Several kinds of help get smaller here."
- `chart.drop.card.close`: "Close"

Show-explain-never-advise: descriptive only, no "you should."

## Styling (`app/src/styles.css`)

`.drop-dot` (`--danger` fill, `--bg` stroke), `.drop-dot-selected` (larger r + ring), `.drop-hit` (`fill: transparent; cursor: pointer`), `:focus-visible` ring on the group for keyboard, `.drop-card` (`--card` bg, `--danger-soft` accent, `--radius`), `.drop-card-close` (≥44px). WCAG AA contrast; dark-mode covered by existing vars.

## Testing

- `CurveChart.test.tsx`: (a) one `g.drop-marker` per `analysis.cliffs` on the real fixture; (b) with a hand-built `analyzeCurve` over synthetic points containing a known cliff (e.g. drop $4,000, SNAP+TANF lost), clicking the marker renders a card whose text contains the drop dollars and both program labels; (c) `Enter` on a focused marker opens the card (keyboard); (d) an all-up curve (no cliffs) renders zero markers and no hint; (e) tapping the selected marker again closes the card.
- e2e (`personal-door.spec.ts`): after the CA result renders, click a `.drop-marker` and assert a program label (e.g. /SNAP|Head Start|food help/) becomes visible.

## Out of scope

Per-program dollar attribution inside a drop (net drop is health-adjusted and cash; attributing exact dollars per program would mislead — show the total drop + which programs end). Merging adjacent tiny cliffs. Hover tooltips. Animations beyond a simple selected-state style.

## Constraints (carried)

AGPL-3.0; TS strict; copy via en.json + readability gate (never raised); show-explain-never-advise; no input logging; 44px/WCAG AA; conventional commits. Branch: `drop-detail`.
