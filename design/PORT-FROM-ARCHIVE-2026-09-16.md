# Port from the archive — 2026-09-16

What the archived React UI (git tag `ui-archive`: `app/`, `design-system/`,
`worker/`) had that the new design system (`design/`) lacks and should take
back. A targeted salvage list, not a critique of either system. The visual
audit of the new system is `AUDIT-2026-09-16.md`; where a salvage item touches
one of its findings the finding is cited, not repeated.

**Sources read for intent:** every commit on `app/`, `design-system/` and
`worker/` at the tag (`git log ui-archive -- app design-system worker`), the
specs and plans under `docs/superpowers/`, `docs/post-merge-notes.md`, the
Playwright specs (`app/e2e/*.spec.ts`), and `app/src/strings/en.json` — the
single copy catalog every reviewed string lived in. Paths below are at the tag
(`git show ui-archive:<path>`); hashes are archive commits.

**Sizes:** XS = a few strings or lines · S = under ~100 lines · M = 100–300.

**One caveat that applies to every item below.** `summary.childcareSubsidyUnmodeled`
is no longer in `core/data/summary.json` (the 2026-09-16 sweep replaced it with a
per-state `coverage` block — audit B1). Anything ported "keyed off the data" keys off
`coverage[state]`, not the field the sketches read.

---

## Must port

### M1. The readability gate and the externalized copy catalog

- **What:** `scripts/readability.mjs` (Flesch–Kincaid over `en.json`: corpus
  ≤ 5.9, every string ≤ 8.0; `npm run readability`, run in CI), plus
  `app/src/strings/t.ts` (a dozen-line `t(key, params)` that throws on a missing
  key, an unknown param, or a leftover `{param}`). Commit `3603a4f`; design spec
  §5 "enforced by a Flesch-Kincaid CI gate over the externalized strings file";
  every later commit reports "readability N.NN" as a gate.
- **What it solved:** the 5th-grade promise became a check instead of a claim,
  and copy could not be composed inline where the gate cannot see it. The
  review in `005c032` caught exactly that failure ("map/legend labels no longer
  leak DS-composed English") — a component with built-in English defeats the
  gate.
- **New system:** `README.md` states "the citizen page is gated at
  Flesch-Kincaid ≤ 5.9 (it measures 2.12, worst single string 7.85)". There is
  no gate: `scripts/` has no readability script, `package.json` has no script,
  CI has no step, and every citizen string is inline in `citizen.html` markup
  and JS template literals (`readout.innerHTML = \`Paid <b>…\``). The audit
  lists "the Flesch-Kincaid gate on the citizen copy" under *what is good* —
  it took the number on faith. Re-derived here with the archived formula over
  the page's block text: corpus **2.01**, worst **7.85** (the `Source:` line),
  so the claim is right, but nothing in the repo can re-check it after the
  next edit.
- **Port:** as-is for the script and `t()`; adapt the input path. Put every
  citizen-surface string in one catalog (`design/en.json` or, once the surface
  is code, `<app>/strings/en.json`), have the page render from it, point the
  script at it, add the npm script and the CI step. Until the page reads from a
  catalog, run the gate over `citizen.html`'s text nodes so the README's number
  has a runner.
- **Size:** S.

### M2. The verdict catalog — four curve shapes and the honest "stuck" branch

- **What:** `result.verdict.*` in `en.json` and the selection in
  `app/src/lib/narration.ts` (`narrate()`): one headline and one body per
  `Verdict`, chosen from a fixed template library keyed on curve shape — "no
  free-form generated text" (design spec §1). Commits `fdf8cd9`, `4661a9d`.
  - `always_up`: "Good news. When you earn more, you keep more." / "We did
    not find a spot where more pay leaves you with less."
  - `cliff_ahead`: "Near {wage}, more pay can mean less money." / "If your
    pay goes past {wage}, you could lose about {drop} a year. People call this
    a benefits cliff."
  - `in_danger_zone`: "You are in a tough spot right now." / "At your pay,
    you may end up with less than someone who earns a bit less. Once pay gets
    past {escape}, earning more helps again."
  - `in_danger_zone.body_stuck` (the `4661a9d` fix): "…In the pay range we
    checked, we did not find a spot where you come out ahead again." Added
    because the first version "reused the last sample point as a fake escape
    wage and claimed earning more helps again."
  - `cliff_behind`: "Good news from here on." / "The big drop is below your
    pay now. From here, more pay means more for you."
- **What it solved:** a verdict for every shape the analysis can return, with
  the null-exit case saying so instead of inventing a recovery.
- **New system:** `AnswerSentence` (inventory #1) is defined as "the verdict
  written as one sentence", but the only instance is one shape —
  `in_danger_zone` with a known exit (`citizen.html:109`: "More pay does not
  add to that until you are paid $86,000"). There is no sentence for
  `always_up`, `cliff_ahead`, `cliff_behind`, or a zone that never recovers
  (`personal.raiseIsLowerBound`), and "benefits cliff" is never named on the
  citizen page.
- **Port:** adapted. Rewrite the five into the `AnswerSentence` register (the
  archive's are already FK 1.9–3.2, so the rewrite is voice, not grade). Keep
  "People call this a benefits cliff." — it is the one sentence that lets a
  client match what the office says to what the page showed. Wire
  `in_danger_zone` to `evaluation.personal` (zone-relative), never to
  `evaluation.escape` — the archive used the whole-curve exit on the personal
  door and the methodology review flagged it (`docs/post-merge-notes.md`,
  "personal safe-exit/leap are whole-curve rather than zone-relative"). The
  audit's S7 asks which number the citizen is told; this catalog is where the
  answer lives.
- **Size:** S (nine strings and a selector).

### M3. The program phrase library

- **What:** `program.<id>` in `en.json`, one plain phrase per `ProgramId`,
  gate-checked:

  | id | phrase |
  |---|---|
  | snap | food help (SNAP) |
  | medicaid | help paying for health care (Medicaid) |
  | chip | kids' health coverage (CHIP) |
  | eitc | a tax break for workers (EITC) |
  | ctc | the child tax break |
  | aca | help paying for health insurance |
  | tanf | cash help (TANF) |
  | housing | housing help |
  | wic | food help for moms and babies (WIC) |
  | ssi | SSI cash help |
  | headstart | Head Start (free early learning) |
  | schoolmeals | free school meals |

  "tax credit" → "tax break" was a deliberate review change (`0699187`,
  `83f22b7`). The DS carried a second copy (`design-system/src/types.ts`
  `PROGRAM_LABELS`) that the app overrode via `labels.programLabel` so the
  gated catalog always won.
- **What it solved:** any household, any state, any cliff can be named in
  the citizen register without composing a sentence at render time.
- **New system:** five phrasings for one Colorado household, inline
  (`citizen.html:186-201`): Medicaid, CHIP, SNAP, WIC, CCDF. Nothing for
  TANF, EITC, CTC, the premium tax credit, housing, SSI, Head Start, school
  meals — and `core/src/types.ts` now has thirteen ids (`childcare` is new).
  The caseworker ledger uses professional names ("TANF cash assistance",
  "Premium tax credit") and should keep them.
- **Port:** adapted to the README's two-register rule — plain phrase first,
  acronym as an aside ("Food help ends. It is called SNAP."). So the catalog
  becomes two fields per id, `phrase` and `name`, and gains `childcare`
  ("child care help" / "the child care subsidy (CCDF)"). Citizen register
  only; one catalog, no DS duplicate.
- **Size:** S.

### M4. The fallback-to-archetype notice, "Try again", and the county rule

- **What:** `ResultPage.tsx` `status.fallback`, `result.fallback.banner`
  ("We could not get your exact numbers right now. These are numbers for a
  family like yours in your state."), a still-visible "Try again" that re-runs
  the live call, `clampFallbackEarnings` so a $124k earner never gets an
  off-chart marker or a false "stuck", and the rule that the county note is
  suppressed on a fallback curve because the archetype has no county. Commits
  `dbfde5f`, `40cd37d`, `1e1754f`; design spec §3 "always-visible banner …
  the site never white-screens".
- **What it solved:** the page never claims a household's own numbers when it
  is showing an archetype's.
- **New system:** `HouseholdEvaluation.source: "live" | "archetype"` exists in
  core and the CLI prints it. The caseworker figcaption says "committed
  archetype sweep of 2026-09-15 — not this family's own live call"
  (`caseworker.html:211`), which is the right sentence in that register. The
  citizen page has nothing: its figcaption reads "These are estimates. They use
  the rules for 2026 in Colorado" whether or not the curve is the household's.
  `inventory.md` rules out banners ("nothing here is urgent and nothing
  interrupts") — correct, and this is not a banner; it is provenance.
- **Port:** adapted, as a `SourceNote` (#17) state, not a banner: when
  `source === "archetype"`, the citizen source line becomes the archive's
  sentence, the county phrase is dropped from the masthead ("in El Paso
  County" would be false), and one control appears — "Try again". Carry the
  clamp rule and the CLI's own wording for it ("pay is above the modeled range
  — evaluated at the top of the sweep").
- **Size:** S.

### M5. Pay in the person's own unit

- **What:** `PayContext { unit, hoursPerWeek }` threaded through
  `narration.ts`, `formatWage()` (rounds to $0.25/hr, $50/mo, $500/yr and says
  "an hour" / "a month" / "a year" via `unit.*`), and the chart's x-axis. The
  x-ticks are generated **in display-unit space and mapped back to annual
  dollars for position** — commit `4661a9d` found that ticking in annual
  space and rounding the label put an hourly label ~25% off its pixel. Design
  spec §1 "the user picks the unit they think in" and §5 "Numbers in human
  units: $/hour and $/month. Never annual AGI."
- **What it solved:** a person paid $14.50 an hour was told the cliff is
  "near $16.25 an hour", not "$33,800".
- **New system:** every figure is annual: "You are paid $38,000 a year", the
  StepList's `at` column, the readout, the ticks. `PayUnit`, `fromAnnual`,
  `toAnnual` survive in `core/src/income.ts` and nothing in `design/` uses them.
  The README's persona conflicts do not mention units.
- **Port:** adapted. `AnswerSentence`, `StepList.at`, `CurveReadout` and the
  `MoneyCurve` x-ticks take the household's unit; keep the archive's rounding
  and the unit-true tick rule; state the unit once in the chart title. Annual
  dollars stay the y-axis and the only unit on the other two surfaces.
- **Size:** M.

### M6. Cliffs as controls — the drop-detail interaction

- **What:** `design-system/src/CurveChart.tsx`: each cliff is a real
  `<button class="drop-marker">` (44 px, positioned over the SVG) with
  `aria-expanded` and the label "A drop near {pay}. You'd lose about {amount}
  a year here. Tap to see what ends." Activating it opens a card (`role=
  "region"`, labelled by its own summary line, focus moves into it) naming
  the amount, the programs that end (`program.<id>`), the hours-a-week line
  (W4), and a "Close" that returns focus to the marker. Selection clears when
  a recompute removes that cliff, so a card cannot silently re-open. Spec
  `docs/superpowers/specs/2026-07-12-hotgap-drop-detail-design.md`; commits
  `57b7528`, `52e883e` (review polish: focus return, no self-reopen, hedged
  copy). Covered by the e2e spec.
- **What it solved:** the single most-asked question ("what ends *there*?")
  answered by touching the thing, on a phone, with a screen reader, without a
  hover.
- **New system:** cliff dots are inert SVG circles. The wrapper is one
  `tabindex="0"` region stepped with arrow keys (kept, per the audit), so a
  keyboard user reaches the $54,000 cliff by pressing → sixteen times from
  the household's position, and a finger has to land on one 1,000-dollar
  index. The caseworker `DropLedger` rows are buttons that drive
  `BreakdownBars`, but the chart marks are not linked to them. The citizen
  `StepList` is the card's content, unlinked to the chart. Audit S12 flags the
  `role="img"` on an interactive wrapper.
- **Port:** adapted, keeping the readout-not-tooltip rule. Markers become
  44 px buttons over the SVG with the archive's `aria-label` and
  `aria-expanded`; activating one moves the cursor and readout to that step
  and, on the caseworker, selects the ledger row (one selection model, not
  two); on the citizen it highlights and scrolls to the `StepList` row — the
  row is the card, so no new component. Carry the three review rules: focus
  returns to the marker on close, selection clears on recompute, copy is
  conditional. Add next/previous-cliff keys on the wrapper (`]`/`[`). Do not
  port the card markup or the "red dot" hint (red is out; W1 covers the hint
  text). Audit S8's collision rule decides what a merged mark's button says.
- **Size:** M.

---

## Worth porting

### W1. The conditional hedge

- **What:** `52e883e`: "Copy hedged to the app's house style: 'You'd lose' /
  'would get smaller' (a cliff above current pay is conditional, not
  present-tense)." Strings: `chart.drop.card.lose` "You'd lose:",
  `chart.drop.card.none` "A few kinds of help would get smaller here.",
  `chart.drop.marker.label` "You'd lose about {amount} a year here."
- **New system:** the StepList states hypotheticals in the present: "Child
  care help ends. … You keep $9,390 less." (`citizen.html:196`), and the
  handout repeats it. The readout ("Paid $54,000 a year, you keep $63,922")
  is a cursor reading of the curve and is fine as is.
- **Port:** as a copy rule in `README.md` § Where the personas conflict: any
  threshold above current pay is "would", at or below is "do". Apply to
  `StepList` and the handout. XS.

### W2. The non-expansion sentence in the citizen register

- **What:** `result.honesty.health` (commit `a40b32b`, "honest non-expansion
  Medicaid copy"): "In many states, losing Medicaid means moving to other
  coverage you help pay for. In some states there is no low-cost plan."
- **New system:** the caseworker footnote has "No coverage gap band: Colorado
  expanded Medicaid" and the core has `evaluation.coverageGap`. The citizen
  StepList says "Your own free state health plan ends. … You start paying for
  a plan." — false in a non-expansion state, where nothing is offered
  in the gap.
- **Port:** adapted, one `StepList` sentence keyed off `coverageGap`: the
  archive's second sentence, made specific ("In {state} there is no low-cost
  plan between {from} and {to}."). XS.

### W3. Reach at the safe exit — "is the jump attainable"

- **What:** Plan 5 (`3995065`): `escape.reach` "Clearing the cliffs here takes
  about {income} a year. At that pay, you'd out-earn about {pct}% of families
  like yours in {state}."; `escape.reachNever` "Even families like yours with
  the top pay here still hit rough spots." (null exit → no percentage);
  a null reach cell omits the line rather than showing a shaky number.
- **New system:** reach is shown only at *current* earnings ("About 4 in 10
  parents like you … are paid $38,000 a year or less"; caseworker tile "40th").
  `ReachSummary.safeExit` exists in core and the README (conflict 5) says the
  summary "returns exactly two points — current and the state's safe exit";
  neither sketch renders the second. The point of the metric was the second.
- **Port:** adapted into the "N in 10" register with the three branches kept.
  Do **not** port `result.honesty.reach` verbatim — it says "not your odds",
  and the new system bans the word; "It does not say what you will earn."
  already covers it. S.

### W4. Hours a week at minimum wage, per cliff, and a full-time-minimum mark

- **What:** spec `docs/superpowers/specs/2026-07-13-hotgap-minimum-wage-context-design.md`,
  commits `ad91bc2`, `3b60b43`. A drop card at or below full-time minimum
  gains "That is about {hours} hours a week at minimum wage in {state}."
  (self-limiting: above full-time the count is nonsensical, so it is
  omitted); the chart gets a reference line at `wage × 2080` with a note
  "The dashed line is full-time at minimum wage ({wage} an hour). That is
  about {income} a year." Sub-minimum cliffs are never filtered or dimmed.
- **New system:** a "Hours" section gives the wage and the full-time figure
  (`citizen.html:218`), nothing per cliff, and no mark on the chart.
  `MinWageSummary.cliffs[].hoursPerWeek` is computed in core for exactly the
  per-cliff line and is unused.
- **Port:** adapted. The hours sentence goes on the `StepList` row when
  `hoursPerWeek !== null` (it is what makes a $6,000 TANF cliff legible). The
  mark must be **solid** — the new grammar reserves dashed for a later
  renewal, so the archive's dashed guide would read as deferred. S.

### W5. The health cost at current pay

- **What:** `escape.healthCost` "You'd pay about {amount} a year for health
  coverage at this pay." — Plan 4's rule that the after-health adjustment is
  "never silent" (`0f273f6`); shown whenever `medicalOOP > 0` at the nearest
  sample, never invented when it is $0.
- **New system:** the caseworker tile says "Net, after premiums"; the citizen
  answer-sub says "less what you pay for a health plan" without the dollar.
- **Port:** as-is, one sentence from `curve.points[i].medicalOOP`. XS.

### W6. "About" and rounding in the citizen register

- **What:** `formatDollars` rounds to $100, `formatWage` to $500 a year, and
  every citizen sentence that carries such a number says "about".
- **New system:** the citizen page prints $9,390, $68,348, $2,447 — sweep
  precision presented to a reader who was just told they are estimates. The
  README's "rendered from the values the code computed" is a provenance rule,
  not a precision rule; rounding at render time satisfies it.
- **Port:** citizen register rounds and says "about"; the caseworker and
  journalist stay exact (they check the table against the file). XS.

### W7. The privacy line

- **What:** `landing.privacy` "We do not save what you type. No sign up. No
  tracking." Design spec §3 "inputs never logged"; post-merge notes ask for an
  AGPL source link in the footer and a privacy note about the edge cache.
- **New system:** the journalist `methodSrc` carries "Licence: AGPL-3.0-only";
  the citizen and caseworker footers carry neither the licence nor the
  privacy sentence.
- **Port:** as-is into every footer, as a commitment the live build must then
  keep (nothing in `core/src/client.ts` logs inputs today). XS.

### W8. Loading and error copy, with their roles

- **What:** `loading.title` "Doing the math…", `loading.body` "We check your
  help at 100 pay levels. This can take a few seconds." (`role="status"`);
  `error.title` "We could not get your answer.", `error.body` "The math
  service did not reply. Your answers were not saved. Please try again in a
  minute." (`role="alert"`, commit `5f8b422`); `result.tryAgain`,
  `result.startOver`.
- **New system:** none — the sketches are static. Needed the day the live
  path exists; the "were not saved" clause is the privacy line again.
- **Port:** as-is. XS.

### W9. What each program is worth today — cash programs only

- **What:** `result.why.currentValue` "Right now this is worth about {amount}
  a year to you.", with a $50 noise floor and a cap of five, lost-first.
- **New system:** the citizen page never says what SNAP or the subsidy is
  worth to this household today, and `evaluation.unclaimed` (what an
  entitlement the household turned off would pay) is unshown anywhere.
- **Port:** adapted and restricted to `CASH_PROGRAMS` and
  `NET_INCOME_CREDITS` — never Medicaid/CHIP, whose value is a sticker price
  (see the do-not list), and never a $0 line (post-merge note: "reads oddly").
  S; lower priority than W1–W5.

### W10. Input-flow rules to hand to the input brief

`inventory.md` and the README defer input design to a separate brief. These
are the reviewed rules from `app/src/flow/{state,screens}.tsx`,
`app/src/lib/zip.ts` and the e2e spec that the brief should start from, each
a fixed bug or a review finding, so nobody rediscovers them:

- Order `zip → family → housing → [childcare] → gets → pay`; childcare only
  when a child is under 13; Head Start take-up only when a child is under 6
  (`1dbbe58`, `4f32847`).
- ZIP: confirm "Looks like you live in {state}. Is that right?" with a
  state override; overriding the state clears the ZIP-derived county
  (`40d6477`); a county whose state disagrees with the ZIP's state is dropped
  (`1e1754f`, now `core/src/county.ts zipToCounty(zip, state)`); territory
  ZIPs get "We are sorry. We can not help in this area yet." not the generic
  "does not look right" (`4661a9d`); APO/FPO prefixes still get the generic
  copy (post-merge note, open).
- Money fields keep the raw string so a trailing "." survives a re-render;
  a second "." is rejected outright rather than parsing to NaN and silently
  becoming "not sure" (`4661a9d`, `4543c61`); "Not sure" is a valid `null`
  for rent and child care; hours clamp to 1–80 on blur, not per keystroke.
- Ages 16–110 for adults, 0–17 for children, at most six children, a new
  child defaults to 5; `inputMode="numeric"|"decimal"`,
  `autoComplete="postal-code"`.
- Take-up hint: "Most families do not get these. Say yes only if you do."
  (default No is the honest baseline — `4f32847`); result-page toggles
  recompute the curve live rather than re-rendering locally (`5a97708`).
- Roving tabindex on radio chips and focus management on the
  loading→result transition were never done (post-merge notes) — still open.

---

## Skip

- **"Rough zone: more pay, less money"** (`result.chart.dangerZone`) — the
  new "the flat stretch" / "danger zone" pair is more accurate: net does not
  fall across the zone, it fails to rise.
- **The choropleth, `Select` state picker, `role="group"` map, "Worse than
  {n} of 50 other states"** — superseded by the tile cartogram, the rank
  strip, and 44 px table rows (`charts.md` § 2).
- **`places.legend.noneKids`** ("Families with kids face the biggest cliffs.
  A home like this one has little help to lose.") — written when childless
  adults were cliff-free; the health-adjusted curve gave them a Medicaid→ACA
  cliff (`ec5ce9d`). The remaining all-zero row today is `deferredCliffCount`
  for `single-0`/`married-0`, which is audit B4's territory.
- **`escape.endsTitle` "When help ends for you:"** — "What ends, and when"
  covers it.
- **The two-door landing, `Door`, `Progress`, `Stepper`** — input brief.
- **`WhyList` emoji icons, `verdict-danger` red, teal "good", `--radius:
  14px` cards, `--shadow-*`** — the new system's colour and shape rules
  reject each on purpose.
- **`curveMonotoneX` smoothing and a y-axis from zero** — `charts.md` §
  Axis honesty is right; smoothing hides the step shape.
- **The `you-label` de-collision** (shift the label when within $6,000 of a
  cliff) — the new chart puts "you" at the top margin; audit S8 handles
  collisions between marks.

---

## Do not resurrect

Things at the tag that look reusable and are not. Each is tied to a shape,
a model, or a rule the repo has since replaced.

1. **`worker/`** — the Cloudflare proxy to the public PolicyEngine API. The
   engine is self-hosted now (`engine/`, `HOTGAP_PE_URL`); `validate.ts` and
   `translate.ts` moved into `core/`; `core/src/client.ts` is the fetch. Its
   7-day edge cache keyed on exact floats, the open proxy, `/api/health`
   accepting POST, and the 25 s timeout were all pre-launch concerns in the
   post-merge notes. Nothing to keep.
2. **The PTC-double-subtraction era and everything pinned to it.**
   `shared/src/parse.ts` computed `net = household_net_income − premium_tax_credit −
   MOOP`; the 2026-09-14 correction is `net = rawNet − moop`. So:
   `app/public/data/states/*.json`, `app/src/data/places/summary.json`,
   `app/src/data/reach.json` (household-income HINCP basis, superseded by
   Plan 8's earnings basis — `core/data/reach.json` is the right file), the
   `fixtures/` at the tag, and the contract pins from `169f136`. Do not copy
   a number from any of them.
3. **The old data shape.** `CurvePoint` without `childPrograms`,
   `otherBenefits`, `stateCredits`, `totalCtc`, `coverageGap`; `Cliff`
   without `breakdown`, `driver`, `deferral`; `summary.json` without
   `deferredCliffCount`, `leapIsLowerBound`, `coverage`; `programsLost` on any
   >$100 fall (now: ends, or loses more than half, in one step). The archived
   `CurveChart` draws `analysis.dangerZones` over `analysis.points` with no
   lift because deferred cliffs did not exist — the chart code cannot come
   back, only the interaction (M6).
4. **`PROGRAM_LABELS` in `design-system/src/types.ts`** — the un-gated
   duplicate of `program.<id>` that review `005c032` had to route around.
   One catalog (M3).
5. **Medicaid/CHIP "worth about $X a year to you"** and **Head Start as an
   instant $22k cliff.** A coverage sticker price is never cash
   (`core/src/types.ts` `COVERAGE_PROGRAMS`); Head Start is deferred and priced
   at replacement (`HeadStartSummary`). W9 is restricted for this reason.
6. **Whole-curve safe exit and leap on the personal door** (`escape.safe`,
   `escape.leap` as rendered by `ResultPage`). Port the words (M2), wire to
   `evaluation.personal`.
7. **The dashed minimum-wage guide.** Dashed means a later renewal now; W4
   ports the fact with a solid mark.
8. **`result.honesty.reach`** — contains "odds"; banned word (W3).
9. **`places.panel.assumptions`** "We also assume no rent or child care
   cost." — archetypes now carry HUD FMR rent and the DOL child-care price
   (`core/src/archetypes.ts`). "We assume the grown-ups are 30" is still true
   (`archetypes.ts:102`) and belongs in the assumptions list audit S6 asks for.
10. **The Playwright specs, `.design-sync/`, the `tsup` DS package.** The
    e2e specs mock the old `/api/curve` shape and cannot run; their
    *assertions* (the decimal-keystroke and second-dot regressions, the
    minimum-wage note, the drop card naming a program) are the acceptance list
    for M6, W4 and W10 and are quoted there.

---

## Verdict

The new system is the better chart and the better colour, type and provenance
discipline, and nothing visual should come back. What the archive has that
`design/` lacks is almost entirely **copy and interaction that survived a
review**, and it is missing because the sketches render one household in one
state in one unit: the verdict catalog for all four curve shapes with the
honest null-exit branch (M2), a phrase for every program id (M3), the
fallback-to-archetype notice that stops the page claiming numbers are the
household's own (M4), the person's own pay unit with the unit-true tick rule
(M5), and cliffs a finger or a screen reader can activate directly (M6). Above
all of them sits the readability gate (M1): the README cites a number no
script in the repo can reproduce, and the audit kept that gate on trust —
porting forty lines makes the claim checkable and forces the copy out of
inline markup where it can be gated at all. Everything else worth taking is a
sentence or a rule (W1–W9, each XS–S), and the input-flow findings (W10) are a
starting list for the brief the README defers. Nothing under *do not
resurrect* should be copied for any reason: the worker, every JSON at the tag,
and the chart code all encode a net-income identity or a data shape that has
since been corrected.
