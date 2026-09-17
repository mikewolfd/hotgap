# Design review — the EligibilityBoundary (LIHEAP), all three surfaces — 2026-09-17

Scope: inventory #23 as built — the citizen tick, key entry and paragraph
(`app/src/citizen/chart.ts`, `facts.ts`, `copy.ts`), the caseworker ledger
row (`app/src/caseworker/model.ts`, `render.ts`, `copy.ts`) and the journalist
row and CSV pair landed this morning in `ea633dd` (`app/src/places/**`) —
reviewed against the brief (`design/inventory.md` § EligibilityBoundary, the
honesty rule in `docs/superpowers/plans/2026-09-16-hotgap-liheap-boundary.md`)
and the design system (`tokens.css`, `charts.md`). Served through the
project's own runner (`cd app && npx vite build`, then `cd worker && npx
wrangler dev --port 8798 --var HOTGAP_RATE_LIMIT_OFF:1` against the hosted
engine, policyengine-us 2.6.2) in Chromium (Playwright 1.63) at 390×844 and
1280×900, light and dark through `prefers-color-scheme`, print media
emulation **and** a real Letter PDF through `page.pdf()` read with
`app/e2e/pdf.mjs`. Households, through the URL on both household pages:
Texas (bands: `?state=TX&kids=3,7&pay=30000&unit=year&rent=1200`), the same
with `&energy-assistance=1`, Missouri (a flat top band, `pay=30000`),
Michigan (a taper that is counted, `pay=20000`, toggle off and on), Hawaii
(a null served share), and a Texas couple whose spouse earns $60,000 — past
the household limit, so the earner's own limit is below $0 and there is no
marker. On the journalist page: TX, MO, MI, HI. Every render, the PDFs and
the measurement dump are under `design/review/liheap/`
(`measurements.json`); the harness is `app/e2e/liheap-review.mjs` (386
checks: 366 passing before the fixes, the 20 failures all Michigan's, B1;
387 passing after them, `design/review/liheap/after/`).

Contrast figures were computed from the colours the browser painted with the
audit's WCAG 2.x formula; positions, sizes and line counts are computed styles
and bounding boxes; every sentence quoted is the page's own text read from the
DOM. No console errors on any page in any state at either width; no
horizontal scroll.

## Verdict

The boundary reads as a line you never crossed, and never as a cliff, on all
three surfaces. The citizen tick is a 2×8px round-capped stub in `--ink-3`
(4.75:1 on the chart ground light, 7.22:1 dark), with no dot, no connector
and no loss ink anywhere near it — measured: zero circles within 12px, zero
`--loss-4` lines at its x — and it comes with a key entry that draws the same
stub on an axis line, so the mark and its name are one thing. With the toggle
off the boundary appears in no StepList row, no cliff mark, no DropLedger row,
no StatTile, no `analysis.cliffs` entry, no ranking, no tile bin, no sort and
no measure control; with the toggle on it becomes exactly a cliff — the tick
and its key entry give way, the citizen paragraph turns into "We put it in your
line", a StepList row "Help with heating bills would end. It is called LIHEAP.
You would keep about $1,000 less." carries the loss ink, the caseworker
DropLedger gains "$39,000 → $40,000 −$980 LIHEAP energy assistance", and the
ledger row loses its tag and sits at the step's landing point ($40,000) rather
than the exact limit ($39,975). The household with no marker has none: no
tick, no key entry, no paragraph, no row. The copy is in each register: the
citizen hears the served share as "Fewer than 1 in 10 families who could get it
here do" (Texas, 3%), "About 2 in 10" (Missouri, 18%), "We do not know how
many" (Hawaii); the caseworker reads the basis, the worth, the share with its
vintage and the date read; the journalist gets a quotable sentence with the
publishers linked. It holds at both widths, in both schemes and on paper
printed from OS dark (every page's text in the light ink, the tick, the tag and
the chip all drawn).

What blocks it is one state. Michigan's heating money is a refundable state
credit that HotGap already counts, and both household surfaces present it as
an uncounted boundary: the citizen page tells a Michigan parent "you can no
longer apply … If you get it, turn it on to see it in your line" for a toggle
that adds nothing there, and the caseworker ledger says "Not in net income
unless the household says it gets it" two screens above a list that says the
opposite. That is a contradiction on the honesty rule's own ground, bounded to
the branch core already exposes (`upstream.counted === "state credit"`). Two
smaller things should change before this ships: the journalist row I built
this morning sets its facts in full ink at body size inside a block whose
corrections are 13px `--ink-3` cites, so the one row that changed nothing is
the heaviest thing in the block; and the citizen's invitation to a toggle
prints on the client sheet. The caseworker's cite says the tag's meaning three
times and is the ledger's tallest row at both widths.

---

## Blockers

### B1. Michigan: a counted credit presented as an uncounted boundary, and a toggle that does nothing offered as the fix

- **Where:** `app/src/citizen/facts.ts:170-187` (`boundaryText` branches on
  `b.counted` only), `app/src/citizen/copy.ts:113-125`;
  `app/src/caseworker/model.ts:178,199` (the row is a boundary whenever
  `!ev.liheap.counted`; the cite is `liheapBoundary`),
  `app/src/caseworker/copy.ts:232-237`; `app/src/citizen/facts.ts:33-34` and
  `app/src/caseworker/model.ts:291-293` (the take-up lists).
- **What I saw:** core says Michigan's heating assistance is the Home Heating
  Credit, modelled by PolicyEngine and counted in `stateCredits`
  (`core/src/liheap.ts` MI row, `upstream: { variable:
  "mi_home_heating_credit", counted: "state credit" }`; `core/src/coverage.ts`
  `liheapNote`: "PolicyEngine models it and HotGap counts it in state
  credits"), and `liheapAmount` returns 0 there whatever the toggle says. The
  citizen page renders the ordinary boundary: "Above $29,500 a year, you can
  no longer apply for help with heating bills in Michigan. It is called LIHEAP.
  It is worth $1 to $2,205 a winter if you get it. About 9 in 10 families who
  could get it here do. If you get it, turn it on to see it in your line."
  (`citizen-1280-light-mi.png`). Turning it on changes nothing: the
  `miOn` render is pixel-identical to `mi` in every measured element (tick at
  x=180, key entry shown, the same five-line paragraph, `data-counted="false"`,
  `programs.liheap` 0 at every point), while the assumed list now says
  "help with heating bills (LIHEAP energy assistance). We count each as if you
  get it." (`citizen-390-light-miOn.png`). The caseworker ledger row is tagged
  *if you apply* and its cite ends "Not in net income unless the household says
  it gets it. Read 2026-09-16." (`caseworker-390-light-mi-ledger.png`, 252px,
  the ledger's tallest row) while "What this model does not include", further
  down the same page, prints core's note: "Michigan pays its heating
  assistance as the refundable Home Heating Credit; PolicyEngine models it and
  HotGap counts it in state credits". The journalist row is right
  (`journalist-1280-dark-MI.png`: chip *in net income*, "Paid as the Home
  Heating Credit, which is counted in every figure for Michigan.").
- **Who it hurts:** the Michigan parent, told to apply for something that is
  claimed on the MI-1040CR-7 and already in the line, and offered a switch that
  does nothing; the counselor, whose ledger and whose not-included list
  contradict each other on the same screen.
- **Smallest fix:** branch on the field core already returns
  (`evaluation.liheap.upstream.counted === "state credit"`), in the copy modules
  only. Citizen: no invitation; "Help with heating bills in Michigan is a tax
  credit. It is called the Home Heating Credit. It is already in your line. It
  gets smaller as you earn more and runs out above $29,500 a year. About 9 in
  10 families who could get it here do." — the tick and its key entry stay,
  because that is where the credit reaches $0 and the curve shows a taper, not
  a step. Caseworker: no *if you apply* tag; the cite says the credit is
  counted, tapers out by the limit, and the heat-in-rent assumption core's note
  states. Both take-up lists leave heating help out where the credit is
  counted, so the toggle is not described as doing something. No core change:
  the boundary object already carries the fact.
- **Resolved:** `53f3b6e`. The citizen paragraph in Michigan reads "Help
  with heating bills in Michigan is a tax credit. It is already in your line.
  It gets smaller as you earn more and runs out above $29,500 a year. About 9
  in 10 families who could get it here do." — no worth, no invitation,
  `data-counted="credit"`, the tick and key entry kept
  (`after/citizen-1280-light-mi.png`); the credit is not named because the
  chart mounts before the sweep's block (the only place the name lives) has
  loaded, and "a tax credit" is true in the citizen register. The toggle on
  renders the same paragraph, and the assumed list no longer lists heating
  help under *Help you get* or *Not counted* there (`after/citizen-390-light-
  miOn.png`). The caseworker row at $29,315 carries no tag and reads "Paid
  as the Home Heating Credit, a refundable state credit PolicyEngine models
  and HotGap counts in state credits; it tapers out by the state's limit,
  110% of the poverty guideline, so it is not a cliff. 85% of income-eligible
  households were served in FY2024. Assumes heat is not included in rent;
  the credit halves when it is. Read 2026-09-16." (`after/caseworker-390-
  light-mi-ledger.png`; a live household that said heat is in the rent reads
  "Heat is included in the rent, so the credit is halved."), and the take-up
  sentence leaves LIHEAP out. Pinned in `facts.test.ts` and `model.test.ts`
  against the committed Michigan sweep; 20 harness checks turned.

---

## Should fix

### S1. The journalist row's weight inverts the block's hierarchy

- **Where:** `app/src/places/render.ts:400-418` (the facts in a `<p>`),
  `app/src/places/copy.ts:279-285`.
- **What I saw:** in the state block every correction's sentence is a
  `.hg-cite` — 13px `--ink-3` (rgb 94,104,113 light) under a 15px name and a
  chip — and the block's one sentence in full ink is the step sentence that
  leads it. The boundary row I built sets its three facts at 15px in `--ink`
  (rgb 18,23,28; `journalist-1280-light-TX.png`, `journalist-390-light-HI.png`,
  and on paper `journalist-tx-1280-print-from-dark.png`). So the row about the
  one program that changed no figure is the heaviest thing under the heading
  "Corrections applied in Texas (3)"; measured, the row is 161–207px against
  the corrections' 116–135px. The system's rule for a row's sentence is the
  cite (ThresholdLedger, CorrectionsApplied), and the caseworker's own boundary
  row already follows it.
- **Who it hurts:** the reporter, whose eye lands first on the fact that is not
  in any figure.
- **Smallest fix:** the facts in the cite register, the publishers on a second
  cite line; nothing else moves. It also takes ~40px off the row, which is
  headroom against the strip (see TODO 2).
- **Resolved:** `53f3b6e`. The facts are a `.hg-cite` (13px, rgb 94,104,113
  light — the same size and ink as the corrections' notes, measured) with the
  publishers on a second cite line; the row is 121px at 1280 (was 161) and
  the block's step sentence is again its only full-ink line
  (`after/journalist-1280-light-TX.png`, `after/journalist-390-light-HI.png`).
  The places proof reads the same fields from the two cite lines.

### S2. The citizen's invitation to a toggle prints on the client sheet

- **Where:** `app/src/citizen/facts.ts:187` (`+ t("boundary.invite")`),
  `app/src/citizen/copy.ts:124`.
- **What I saw:** on paper printed from OS dark the paragraph ends "If you
  get it, turn it on to see it in your line." (`citizen-tx-1280-print-from-
  dark.png`, the first paragraph under the key). The page already strips its
  interaction hint ("Move along the line with your finger…") on paper through
  `.hg-no-print`; the one other instruction to touch the screen prints. On
  the handed-over sheet there is nothing to turn on, and "it" has no
  referent.
- **Who it hurts:** the citizen holding the printout, and the counselor who
  printed it for them.
- **Smallest fix:** the invitation, already its own sentence, in an
  `.hg-no-print` span; the three facts still print.
- **Resolved:** `53f3b6e`. `boundaryText` returns `{ facts, invite }` and the
  chart renders the invitation in a `<span class="hg-no-print">`; in print
  media it computes `display: none` and the paragraph ends at the served
  share (`after/citizen-tx-1280-print-from-dark.png`); on screen the
  paragraph's text is unchanged, and the citizen spec pins the span.

### S3. The caseworker cite says the tag's meaning three times and is the ledger's tallest row

- **Where:** `app/src/caseworker/copy.ts:233-237`.
- **What I saw:** the row is tagged *if you apply*, its cite opens "Above this
  the household can no longer apply:" and closes "Not in net income unless the
  household says it gets it." — three statements of one fact, five sentences,
  eleven lines in the 185px the ledger's cite gets at 390
  (`caseworker-390-light-tx-ledger.png`: 234px, against 173px for the next
  tallest row, Medicaid *Deferred* with its CFR cite; at 1280, 135px against
  116px). The boundary row for a program the household may never have is the
  row that takes the most of the ledger.
- **Smallest fix:** lead with the basis, keep the worth, the share with its
  vintage, the footing and the date: "150% of the poverty guideline, the
  state's heating limit. Worth $1,200 at that band if received; 3% of
  income-eligible households were served in FY2024. Not in net income unless
  the household says it gets it. Read 2026-09-16."
- **Resolved:** `53f3b6e`, with one more clause cut than proposed: "150% of
  the poverty guideline, the heating limit. Worth $1,200 at that band if
  received; 3% of income-eligible households were served in FY2024. Not
  counted unless the household says it gets it. Read 2026-09-16." — "apply"
  is said once, by the tag. Measured: Texas's row is 116px at 1280 (was
  135), level with the ledger's tallest other row, and 215px at 390 (was
  234). At 390 it stays the tallest row by two lines, and Missouri's and
  Hawaii's by one at 1280 (135 vs 116/97): the cite carries five sourced
  facts — basis, worth, share with its vintage, footing, date — where the
  Medicaid *Deferred* cite carries three, and none of the five is spare. The
  harness checks the copy and logs the heights.

---

## Nits

- **N1.** Missouri's limit for this household is $55,051 and the citizen
  window ends at $55,000, so the paragraph says "Above $55,000 a year" and the
  picture carries no tick and no key entry (`citizen-1280-light-mo.png`). The
  caption says "outside the picture" for the biggest drop; the boundary does
  not say so of itself. By the brief (the tick only when the limit is in the
  window); leave, and let the crop rule (citizen review TODO 18) decide.
- **N2.** The caseworker chart carries no mark for the boundary — the ledger
  row is its only place (the brief's choice) — while the citizen chart does.
  A counselor turning the screen to a client sees $39,975 in the ledger and
  nowhere on the curve. One convention across the two MoneyCurves would be
  simpler; TODO(system) 1.
- **N3.** The client sheet (`#handout`, print only) says where food help and
  the kids' plan end and nothing about where heating help stops — a line the
  client could use ("help with heating bills stops at $40,000; fewer than 1 in
  10 who could get it do"). The brief scopes the boundary to the ledger; note
  for the handout's own review.
- **N4.** Hawaii at 390: the tick sits at x=351 of a 390px viewport, 8px from
  the picture's right edge (`citizen-390-dark-hi.png`). Legible; at the margin.
- **N5.** Texas's limit ($39,975) lands on the $40k x-label, so the stub reads
  as an axis tick to a chart-literate reader until the key is consulted. The
  key entry exists for exactly this; keep the quietest mark on the picture
  quiet.
- **N6.** The journalist row in Michigan does not carry the heat-in-rent
  assumption core's note states (the archetypes are renters with heat not in
  rent, PolicyEngine's default; the credit halves otherwise). The caseworker's
  not-included list has it verbatim; a reporter comparing Michigan's figures
  would want it. Leave: the method panel is the place, when the assumption
  becomes an input (Plan 7 Phase 3's `heatInRent`).
- **N7.** "Read 2026-09-16" in the caseworker cite and "Read Sep 16, 2026" in
  the journalist cite: two registers for one date, each its surface's. Leave.
- **N8.** The harness screenshots the citizen figure before `.hg-draw`
  finishes, so a few before-renders show the line half drawn (`citizen-1280-
  light-tx.png`); a harness artefact, fixed for the after-render by waiting
  on `document.getAnimations()`.

---

## What is right and should not be touched

- **The tick is the quietest mark on the picture and it still measures.**
  2×8px, round caps, `--ink-3`: 4.75:1 light and 7.22:1 dark on the chart
  ground, above the 3:1 floor for a graphical object, and lighter than every
  cliff mark by design. No dot, no connector, no wash, no label — verified on
  every household at both widths.
- **The key entry draws the mark.** An axis line with the same stub, hidden
  exactly when the tick is not in the window (Missouri) and when the toggle is
  on. MarkKey's rule, kept.
- **Nothing counts it.** `analysis.cliffs` never names `liheap` with the toggle
  off; the StepList, the DropLedger, the StatTiles, the chart's spoken label,
  the ranked strip, the map, its legend, the table's columns and every
  `<select>` are silent about it. The proof reads all of them.
- **The toggle turns it into a real end, properly.** Tick and key entry gone;
  a StepList row in the loss ink; the ledger row untagged at the step's
  landing point ($40,000, the one convention) with "Counted at the household's
  say-so"; the DropLedger row "$39,000 → $40,000 −$980 LIHEAP energy
  assistance"; the assumed lists say it is counted. The step's drop ($980, not
  $1,200) is the honest net of the step, and the citizen's "about $1,000 less"
  is that.
- **The served share is odds a person understands, and never this
  household's.** "Fewer than 1 in 10 families who could get it here do" /
  "About 2 in 10" / "We do not know how many" on the citizen page; the
  percentage with FY2024 on the professional pages; one rounding rule
  (`app/src/lib/served.ts`) behind both.
- **The absent case is absent.** A spouse earning past the household limit
  leaves no tick, no key entry, no paragraph, no ledger row and no drop — and
  core returns null rather than a negative limit.
- **The caseworker row's $39,975.** The only non-round figure in the ledger,
  and the right one: a rule's threshold, not a sweep step. Nothing in the row
  is loss ink; the tag is the solid chip, never the dashed badge.
- **Paper.** Printed from OS dark, all three surfaces put every page's text in
  the light ink; the tick, the tag and the chip are drawn; the journalist's
  links keep their colour.
- **The journalist's one row.** The ledger's shape shared across the two
  professional surfaces, the publishers as the cite, the chip in the same
  vocabulary as CorrectionsApplied's, and short enough to keep the block under
  the ranked strip on the proof's view (1759 vs 1775px for Massachusetts).

---

## Resolution

Every B and S above carries a **Resolved** line with its commit and the
evidence under `design/review/liheap/after/`, re-rendered through the
project's own runner against the same households at both widths, both
schemes and on paper (`cd app && node e2e/liheap-review.mjs
http://localhost:8798 ../design/review/liheap/after` — 387 checks, all
passing). S3's height bar was not fully met and the line says by how much.
N3's handout line and N6's assumption are left as noted; N1, N2, N4, N5 and
N7 stand as the brief has them; N8 is fixed in the harness. One system
document changed, because a rule was genuinely missing: `inventory.md` §
EligibilityBoundary gains the counted-credit state (TODO 3), so the next
counted state does not fall through to the boundary copy. Nothing was
written into `tokens.css` or `charts.md`.

## TODO(system)

1. `charts.md` § 1 / `inventory.md` § EligibilityBoundary: say whether the
   boundary tick belongs on every MoneyCurve or only the citizen's (N2). Today
   the citizen chart draws it and the caseworker chart does not; the brief
   chose the ledger row for the counselor, and the two charts now disagree
   about one mark.
2. `places.css` / `charts.md` § 2: the table's position below the split
   depends on the selected state's block wherever the block column outgrows
   the ranked strip. Measured across every household and measure: the strip is
   1496px at its shortest (1 adult, 3 children on the one-step loss) and
   Massachusetts's block column 1871px at its tallest, so the dependence
   predates the boundary row; Chromium's scroll anchoring hides it (a 0.59px
   residue on a 204px layout change, which is what the S1 proof caught this
   morning). A rule for the split's height — or the block's — belongs in the
   system, not in one row's word count.
3. `inventory.md` § EligibilityBoundary: the counted-credit case (Michigan)
   is a fourth state of the component — not boundary, not toggle-on — and
   the brief described only three. **Done with the fixes:** the section now
   says what each surface prints for it (B1's copy), so the next counted
   state does not fall through to the boundary copy.
