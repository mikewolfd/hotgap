# Visual review — scrolling money curve — 2026-09-17

Scope: the owner's 2026-09-17 scroll rule (`design/charts.md` § The scroll
rule, `inventory.md` § MoneyCurve) as rendered on `deferred-counts-scroll-curve`
at `66c1511`, served from this worktree at `http://localhost:8801`. Driven in a
**live Playwright browser** (not the scripted dumps in `design/review/scroll-curve/`
from `scroll-curve-review.mjs`). Viewport resized to 390×844 and 1280×800;
light, dark (`data-theme=dark`), and print (`emulateMedia('print')` +
`window` `beforeprint`). Frontend-design skill loaded; this is a review against
the brief, not a redesign.

Households: CA `94110` kids 3 & 7, $30,000/year; same with `head-start=1`.
Citizen `/` and caseworker `/caseworker`. Live shots under
`design/review/scroll-curve/live-*.png`.

Two earlier agents died before this review finished: Opus on the Other Models
limit one screenshot in, then a Grok relaunch on the same limit before it
opened a page. This pass is the review.

---

## What the picture is doing (so the findings have a baseline)

The figure is two SVGs in `.hg-chart--scroll`: a 44px (390) / 52px (1280) y-gutter
**outside** the scroller, and the plot + marks inside `.hg-chart__scroll.hg-scroll-x`.
`windowFor` is `scrollLeft`, not a crop. The axis ends are `.hg-chart__hint`
("← $0" … "$150,000 →") outside the scroller. Paper redraws at 640px via
`redrawForPrint` / `beforeprint`.

Measured on the live citizen CA household:

| | 390 | 1280 |
|---|---|---|
| gutter | 44px at x=16 | 52px (chart in the right column) |
| plot | 1,033×371 | 1,889×371 |
| scroller client | 299 | 556 |
| initial `scrollLeft` | 132–138 | 234 |
| max scroll | 769 | ~1,333 |
| gutter x while scrolling $0 → end | **16, did not move** | (not re-measured; 390 caseworker also held at 16) |

Caseworker 1280: plot 2,065×337, gutter 52px outside the scroller, caption
"x-axis runs $0 to $150,000; scroll the curve sideways to reach all of it."
Caseworker 390: client 299 / scrollWidth 1,029; gutter x=16 at both ends.

---

## Blockers

None that survived a correct probe. Print looked broken when `beforeprint` was
dispatched on `document` (plot stayed 1,889px). Dispatching on `window` refit
the plot to **588px** (640 column − 52 gutter), ticks `$0`…`$150k`, hint
`display:none`. See `live-citizen-print-fitted.png`. The e2e print pin is the
right event; a `document` dispatch is not.

---

## Serious

### S1. Scrolling to the far end clips the biggest-drop label against the gutter

- **Where:** citizen plot SVG labels; `live-citizen-390-light-atend.png`.
- **What I did:** at 390, set `.hg-chart__scroll.scrollLeft` to max (769).
  Gutter stayed at x=16. The `$107k` drop is then flush with the left of the
  scroller.
- **What I saw:** `−$7,059` is cut in half by the gutter. The hatch and the
  stub are also sliced. The same label is fully visible when the mark is in
  view (`live-citizen-390-light-mark107.png`, `scrollLeft` 567, mark at x=187
  inside a 60–359 viewport).
- **Who it hurts:** anyone who takes the invitation to "see the rest" and
  swipes to $150k — the one labeled drop on this household is the thing they
  lose.
- **Smallest fix:** prefer `text-anchor="start"` spots that sit to the **right**
  of the connector (the code already tries `cl.x + 12` first; the atend clip
  is the leftover `cl.x - 12` / `"end"` fallback, or a label whose box
  straddles the clip). Alternatively pad the scroller so a mark cannot sit
  on the clip edge while still letting $150k into view.

### S2. A mixed deferred cluster does not read as deferred on the chart

- **Where:** `app/src/citizen/chart.ts` ~217–233; Head Start household
  `?head-start=1`; `live-citizen-390-light-headstart-chart.png`.
- **What I did:** opened the CA household with Head Start on. Verdict counts
  the loss (`You keep $59,738` … `a raise of $47,000`; `$16,908 of this is
  free early learning`). The $38k step-list row is the biggest drop
  (`$16,700`, Medicaid + Head Start).
- **What I saw:** three **filled** `--loss-4` circles, no `stroke-dasharray`
  on any chart line, no "later" word on the plot. The key still has a
  "Waits" / later entry. `waitStub` / `waitDot` exist and a *pure* deferred
  cluster uses them; a mixed cluster is supposed to keep the dashed stub
  "beside" the solid loss (comment at 217–221) but the live picture is only
  the solid drop. The step list uses a `.hg-badge` that says **"Waits"**,
  not "Later".
- **Who it hurts:** the family the owner asked to see as a cliff *that
  waits* — the money is in the figures, the timing is not in the picture.
- **Smallest fix:** on `waiting && !cl.later`, still append `waitStub` +
  the later word (the branch is there; verify it runs for this household
  and that the stub is not covered by the hatch). Align the badge with
  `charts.md` ("later") or change the brief to "Waits".

---

## Nit

### N1. The scroller's edge fade does not read on the chart

`.hg-scroll-x` paints a 16px ink-mix fade on `--scroll-ground: var(--plane)`.
The chart sits on the page ground, not a table `--plane`, and
`getComputedStyle` on the scroller reported `mask: none` (the fade is
background-attachment, not a mask). At 390 the **native scrollbar** is what
makes the figure look scrollable (`live-citizen-390-light-chart.png`). The
copy ("Slide it left and right") and the hint do the rest. Fine if the
scrollbar stays; the fade is not doing its job here.

### N2. The y-axis's first tick is not $0, and the caption says so

390 citizen: gutter ticks `$20k`…`$100k`; caption "The side numbers start at
$15,000, not at $0, so the drops are easy to see." Honest, and the 24px-drop
height rule is why. A reader who just heard "the whole axis" may still look
for $0 on the left of the gutter. Print's fitted view shows $0 on **x** only.

### N3. Caseworker labels crowd the $30k household

`live-caseworker-1280-light-chart.png`: `$45,020`, `+$13,000`, the diamond
and three dots share ~40px. Readable, not pretty. Compare columns were not
opened in this pass.

---

## What already works (so this does not read as a complaint list)

- **Gutter / scroller read as one figure.** Y ticks hold still; x ticks travel.
  Confirmed by scrolling to 0 and to max at 390 on both doors.
- **Initial view still answers the question.** "you", the hatch, `+$13,000`,
  and the near drops are on screen at both widths
  (`live-citizen-390-light-chart.png`, `live-citizen-1280-light-chart.png`).
  The $107k ACA drop starts ~0.95 viewports out, as `charts.md`'s table said.
- **Keyboard reaches the whole axis.** Focusing the first mark, then `]` `]`
  `]`, landed on "A drop near $107,000…$7,100" with the mark in view
  (`scrollLeft` 51 → 49 → **567**, mark at 187 inside 60–359). Gutter still
  at x=16.
- **Dark** keeps the diamond, hatch and ticks (`live-citizen-1280-dark-chart.png`).
- **Print**, once `beforeprint` hits `window`, shows the full curve at column
  width, first and last x-ticks present (`live-citizen-print-fitted.png`).
- **Deferred losses count in the verdict** on the Head Start household. That
  half of the owner's rule is in the numbers even where S2 says the picture
  does not badge it.

The three households that hit the 560px height ceiling and miss the 24px drop
floor by <2px are recorded in `charts.md`; they were not re-opened here.

---

## Screenshots from this session

All under `design/review/scroll-curve/`:

- `live-citizen-390-light-initial.png` — full page (chart is a strip; use the chart crops)
- `live-citizen-390-light-chart.png` — initial view
- `live-citizen-390-light-at0.png` / `…-atend.png` — axis ends; S1
- `live-citizen-390-light-mark107.png` — after `]`
- `live-citizen-390-light-headstart-chart.png` — S2
- `live-citizen-1280-light-chart.png` / `…-dark-chart.png`
- `live-caseworker-1280-light-chart.png` / `…-390-light-chart.png`
- `live-citizen-print-fitted.png` — the print that counts
- `live-citizen-print-chart.png` / `…-print-after-beforeprint.png` — the
  failed `document` dispatch, kept so the next reviewer does not repeat it
