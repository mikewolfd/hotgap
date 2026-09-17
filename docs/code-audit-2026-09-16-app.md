# Code audit, 2026-09-16 — `app/` and `worker/`

Audited against `~/.claude/CLAUDE.md` (smaller, clearer, more shared; reuse
the helper that exists, extract when two places want it, delete the copy;
plainest design that fully does the job; reason in Big O; project runners
only) and `app/README.md` (the site contract, § Languages, § Proofs), with
`design/inventory.md` § Class map for what a page may declare.

**Tree audited.** `main` at 3e9e544 with both unmerged page branches merged
locally: `worktree-agent-a5efba10c53fcf8eb` (citizen, tip ed1e86d) and
`worktree-agent-ad5471c2432560a9d` (caseworker, tip 3a86252). Two content
conflicts in `app/README.md`, both resolved with both sides kept. Every
`file:line` below is on that merged tree (commits bb7b927 and 4f08366 on
this branch). Gates on the merged tree, through the project runners:
`npx tsc -b core pipeline app worker` clean; `npx vitest run` 517 passed,
26 skipped (the 43 files); `cd app && npx vite build` clean.

**Modes.** `app/**` is report only — three agents are still writing there.
`worker/**` was report-and-fix; its one fix is committed on this branch
(§ 7) with the 13 Worker tests green.

**Counts.** Duplication 16 · KISS 9 · Big O 3 findings over a 28-row table
· Naming/dead code 12 · Languages rule: 1 surface fully non-compliant, 3
partially, plus 3 ungated copy sources · Page CSS 11 · Worker 6 (1 fixed).
Estimated removal from the fix pass: about 450 lines of `app/src` and
`app/e2e`, one 3.9 kB chunk off the caseworker page, one bug.

---

## 1. Duplication → the one home

Every entry: where it is now, where it should be, the fix in a sentence,
the test that proves behaviour held, lines removed (estimate).

### D1. Format helpers: three `format` modules and an inline fourth

| helper | copies | one home |
|---|---|---|
| money | `lib/format.ts:11` (Intl, rounds) · `places/format.ts:7` (`"$" + toLocaleString`) | `lib/format.ts money` |
| list | `lib/format.ts:44 listOf` (Intl, Oxford comma) · `places/format.ts:25 list` (hand-joined, no Oxford comma) · `caseworker/copy.ts:30 fmt.list` (Intl, identical to `listOf`) | `lib/format.ts listOf` |
| date | `lib/format.ts:48 dateWords` (Intl medium) · `caseworker/copy.ts:32 fmt.date` (identical) · `places/format.ts:37 dateOf` (ISO slice) | `lib/format.ts dateWords`; `places/csv.ts:55 csvName` keeps its own ISO slice — a file name is a machine contract |
| pay in the unit | `lib/format.ts:25 unitFigure` + `:18 unitPhrase` · `caseworker/copy.ts:34 fmt.pay` (`toFixed(2)` by hand) · `editor/index.ts:187 payLabel` (`toFixed(2)` by hand) | one `payInUnit(n, unit)` = `unitFigure` + `unitPhrase` in `lib/format.ts` |
| tick | `lib/format.ts:40 tickMoney(v, "year")` · `caseworker/copy.ts:36 fmt.tick` | `tickMoney` |
| modelLine | `places/format.ts:41` · `caseworker/model.ts:294` + `caseworker/copy.ts:292–294` (three keys) | `lib/format.ts modelLine` (the citizen already imports the places one: `citizen/facts.ts:12`) |
| capitalize, reachWord, esc, word | `places/format.ts:28,31,47,18`; imported across the boundary by `citizen/facts.ts:12`, `citizen/steps.ts:8`, `caseworker/copy.ts:11`, `caseworker/render.ts:8` | `lib/format.ts` (`word` and `fmt(v, m)` stay in places: they are the journalist page's own) |

Fix: move the seven into `lib/format.ts`, delete the copies, make
`places/format.ts` the two journalist-only helpers. Proves: the existing
`caseworker/model.test.ts` "figures, through Intl" (which pins `fmt.list` /
`fmt.date` output byte for byte — so `listOf`/`dateWords` must be the
replacement, not the other way), `places/model.test.ts` "counts in words",
`citizen/facts.test.ts` SourceNote and reach tests. Behaviour change to
accept: the places page's lists gain the Oxford comma on 3+ items and its
prose dates become "Sep 16, 2026" (the languages rule asks for `Intl`).
No test pins either. ~42 lines.

**Resolved** for the surfaces Plan 8 left: the caseworker's `fmt.list`,
`fmt.date`, `fmt.pay` and `fmt.tick` are `listOf`, `dateWords`,
`unitFigure` + `unitPhrase` and `tickMoney(v, "year")` (output identical on
every gridline the chart draws: steps are multiples of $1,000); the
editor's `payLabel` is `unitFigure` + `unitPhrase`; the caseworker's
`modelLine` is lib's (N10).

### D2. Two element builders, two `$`

- `editor/index.ts:132–142 h()` duplicates `lib/dom.ts:13 h()` (the lib one
  also skips `false` children; otherwise identical).
- `caseworker/chart.ts:37–43 mk()` duplicates `lib/dom.ts:21 svg()`.
- `places/render.ts:12 $` and `caseworker/render.ts:16 $` are the same
  `getElementById` cast.

Fix: import from `lib/dom.ts`; add `$` there. Proves: `e2e/editor.spec.ts`
(every control it fills is built by `h`), `e2e/caseworker.spec.ts` (every
mark and label by `mk`). ~20 lines.

**Resolved** for the surfaces Plan 8 left: the editor's `h()` is
`lib/dom.ts`'s; the caseworker's `$` is lib's (`render.ts`, `main.ts`);
its `mk()` goes with D10.

### D3. The program table, three times (M3 says one)

- `lib/programs.ts:8 PROGRAMS` — `{ phrase, name }`, 13 ids.
- `citizen/programs.ts:9 NAME` — `{ name, the? }` plus `citizen/copy.ts:242
  copy.program` for the phrases (so the readability gate sees them).
- `places/model.ts:198 PROGRAM_NAME` — four names, the `name` register.

The citizen table carries one thing the lib one lacks — the article flag
(`the: true` for "It is called the Child Tax Credit") — and the lib phrase
for `snap` etc. already equals the citizen's. Fix: `lib/programs.ts` becomes
`{ phrase, name, the? }`; `scripts/readability.mjs:20 MODULES` reads its
phrases (its `strings()` walker takes any nest); `citizen/programs.ts` keeps
only `called`/`noun`/`phraseAndName`/`NONCASH` over the lib table;
`places/model.ts` reads `programName`. Proves: `citizen/steps.test.ts` (every
"It is called …" sentence), `caseworker/model.test.ts` ledger and client-sheet
tests, `places/model.test.ts` "correctionRows". ~35 lines.

**Resolved** in two parts: Plan 8 (4ed97d6) pointed the places page at
`lib/programs.ts`; D4's commit folded the citizen's `NAME` table onto it
(only the six article forms stay in `citizen/programs.ts`). The phrases
stay in `citizen/copy.ts` — the gated register — and `lib/programs.ts` is
the `name` register; D13 records that split for the migration.

### D4. The verdict, twice, and they disagree

- `citizen/copy.ts:24–30 copy.verdict` + `citizen/verdict.ts:18 verdictSlots`
  — the M2 catalog as written in `design/inventory.md` ("You keep {kept}",
  `{kept}` = exact `currentNet`), gated, keyed for the marks.
- `lib/verdict.ts:12–18 VERDICT` + `:21 verdictSentence` — "You keep
  **about** {kept}" with `{kept}` rounded to $100, five sentences the gate
  never reads, used only by the caseworker's client sheet
  (`caseworker/model.ts:320`). Its header comment (`lib/verdict.ts:5–6`)
  says the citizen's copy "is the one to retire" — backwards: the citizen's
  is the catalog, gated and keyed; the lib's is the drift.

Fix: one template table (the citizen catalog, in whichever copy home § 5
picks), one `verdictSlots(ev, pay)` in `lib/verdict.ts` taking the
evaluation and the pay unit (everything `citizen/verdict.ts` reads off the
Scene is derivable from those two); citizen wraps it in `parts()`,
caseworker in `fill()`; delete `VERDICT`. Proves: `citizen/verdict.test.ts`
(all four shapes, three units, keyed slots) and `caseworker/model.test.ts`
"the client sheet is the citizen catalog's sentence" — whose expected string
at `:204` (and `e2e/caseworker.spec.ts:396`) changes from "about $84,400" to
the catalog's exact figure; that is the catalog winning, say so in the
commit. ~25 lines.

**Resolved** (branch `worktree-agent-a935b0b88f805e197`): `lib/verdict.ts`
deleted; the caseworker's `handout` renders `verdictText(sceneOf(ev, {
unit: "year" }))` + `againText` from `citizen/verdict.ts`, so the sheet is
the citizen page's own answer, deferred clause included. The two "about"
pins (`caseworker/model.test.ts`, `e2e/caseworker.spec.ts`) now read
"You keep $84,371." and the sheet's again line is the catalog's "It happens
again from $46,000 to $119,000" (the next zone's start, never the exit).
Measured cost: the caseworker page ships the citizen's pure modules and
catalog — +7.3 kB gzip (`vite build`: the shared chunk 14.7 → 22.1 kB
gzip) — which the locale-file migration turns into a fetched JSON. The
citizen's `programs.ts` no longer repeats the thirteen `name`s: it keeps
only the six `called` forms that take an article and reads the rest from
`lib/programs.ts` (D3's leftover).

### D5. The household the curve models, three times

`caseworker/model.ts:62 modeled`, `citizen/model.ts:140–141` (same
expression with `?? ARCHETYPES[0]` instead of `!`), and core's own local
`modeledAnswers` at `core/src/evaluate.ts:621` — private, so both pages
re-derive it. One home: core exports it (`modeledAnswers(ev)` or a field on
`HouseholdEvaluation`). Cross-boundary: hand to the core agent; until it
lands, `lib/`. Proves: `caseworker/model.test.ts` "lists the swept
household's assumptions on the archetype path", `citizen/facts.test.ts` "the
archetype path describes the swept household". ~4 lines here, 1 in core.

**Resolved** (`modeledAnswers` exported from `core/src/evaluate.ts`, with a
test; `evaluateCurve` calls it; `caseworker/model.ts modeled` delegates,
`citizen/model.ts` reads it into the scene).

### D6. The lift, four times

`caseworker/model.ts:46 lifted` (O(points × deferred)), `citizen/model.ts:89
liftDeferred` (same), `citizen/fixture.ts:71` (a third form), and core's
private `immediateCurve` at `core/src/evaluate.ts:567` (O(points), a Map).
`e2e/citizen.spec.ts:47 plotted` is a fifth, **on purpose** — the proof
re-derives the lift with a different tool so the table is not checked
against itself; keep it. One home: core exports `immediateCurve` (or a
`liftedNet(points, deferred): number[]`); pages and fixture call it.
Cross-boundary again. Proves: `caseworker/model.test.ts` "the lift",
`citizen/geometry.test.ts` "the lift". ~10 lines.

**Resolved** (`immediateCurve` exported from core with a test of its own;
the caseworker chart, the citizen scene and the citizen fixture call it;
`caseworker/model.ts lifted` and `citizen/model.ts liftDeferred` deleted.
`e2e/citizen.spec.ts plotted` stays, on purpose, as the proof's second
implementation).

### D7. The IncompleteMarker rule, three times — and one is wrong

- `places/model.ts:70,76 paysForCare / bites` — child `≤ CHILDCARE_MAX_AGE`
  and every parent working.
- `caseworker/model.ts:124 bitesHousehold` — child `≤ CHILDCARE_MAX_AGE`
  and `monthlyChildcare > 0`.
- `citizen/facts.ts:118–119 incompleteText` — child **`< 6`** and
  `monthlyChildcare > 0`.

`design/inventory.md` § IncompleteMarker names one rule, "through 12:
core's `CHILDCARE_MAX_AGE`". The citizen surface under-flags: a household
with a 7-year-old in paid care sees no caution on the citizen page while
the caseworker and journalist pages hatch the same state for it.
`citizen/facts.test.ts:108` never exercises the age branch, which is why
the suite cannot see it. Fix: `lib/coverage.ts bites(u, { childAges,
paysForCare })` with one test over the three cases; the pages map their
own household shape onto the second argument. Proves: `caseworker/model.test.ts`
"IncompleteMarker … bites on a premium program always, on child care only
with a paying young child" (move it to lib), `places/model.test.ts` "a
child-care gap hatches only a household that pays for care". ~4 lines, one
bug.

**Resolved** (`lib/coverage.ts`: `bites(u, { childAges, paysForCare })`,
`careHousehold(answers)`, `incompleteFor`, with `coverage.test.ts` over the
three cases; the citizen bug had already been fixed by import (review N6) —
now the three surfaces call one function, the journalist page mapping the
archetype's own care reading onto it. A gap every state shares never bites:
`scope: "all"`, and LIHEAP by name on a file from before scope was recorded).

### D8. Threshold rows under the one convention, twice

`caseworker/model.ts:150–175 ledgerRows` and `citizen/steps.ts:37–66
stepRows` both walk the cliff list, then `programEndsByAge` + one step,
then `programEnds` + one step, grouping adults/children/household. Same
convention (§ Where a program ends), two implementations, two grouping
enums. One home: `lib/thresholds.ts` returning `{ at, id, group, cliff?,
waits }`; each surface keeps its words and its extra fields. Proves:
`caseworker/model.test.ts` "ThresholdLedger ends every program at the first
pay…" and `citizen/steps.test.ts` (nine cases, including the split-program
and child-coverage-waits rules). ~25 lines.

**Resolved** (`lib/thresholds.ts thresholds(ev)` → `{ at, id, holder,
cliff, deferred }` in walk order, with `stepOf` and `thresholds.test.ts`;
`ledgerRows` maps holder → group and adds the LIHEAP row, `stepRows` groups
by pay and keeps its own group and waits rules — each surface its words and
extra fields). One walk means one dedupe rule — a program once per holder
and once per pay — which changes two cases no committed household reaches:
the citizen page no longer lists a second row where a person-level program
a cliff already named finally ends (the cliff's row says what goes on,
under the convention), and the ledger no longer lists a program three
times when both halves end at the same step. The nine `steps.test.ts`
cases and the ledger's ten rows are byte for byte as before.

### D9. `correctionRows` lives in the journalist page; the caseworker imports it

`caseworker/render.ts:9` imports from `../places/model.js`. Vite therefore
ships `places/model.ts` as a shared chunk (`dist/assets/model-*.js`,
3.9 kB — MEASURES, bins, grouping, all of it) to the caseworker page for an
eight-line function. One home: `lib/corrections.ts` (it reads
`StateCorrections` and names programs in the `name` register). Proves:
`places/model.test.ts` "correctionRows"; `e2e/caseworker.spec.ts:70–74`.
0 lines, one chunk.

**Resolved** before this pass (4ed97d6: `lib/corrections.ts`; the caseworker
page no longer imports anything from `places/`).

### D10. Two charts that are one chart with two windows

`citizen/chart.ts` (336 lines) and `caseworker/chart.ts` (327) draw the same
MoneyCurve. Byte-identical or near: the hatch `<pattern>`
(`citizen/chart.ts:116–120` / `caseworker/chart.ts:108–111`); six MarkKey SVG
snippets (`:45–50` / `:228–236`); the diamond path (`:219` / `:210`); the
cursor line + dot (`:274–275` / `:245–246`); the 44px `.hg-mark` button with
its count badge (`:246–258` / `:165–173`); the collision rule
(`citizen/geometry.ts:52 clusterCliffs` / `caseworker/chart.ts:145–150`
inline); nice gridline steps (`citizen/geometry.ts:9 niceStep` /
`caseworker/chart.ts:47–49 nice, niceUp`); the keyboard model — arrows,
Home/End, `[`/`]`, Escape (`:296–317` / `:266–293`); the pointer model
(`:294–295` / `:264–265`); ghost, zone rects, peak rule, exit line, bracket.
What differs is real and stays: the citizen crops a window in the person's
unit, the caseworker draws the full annual axis, and each has its own
words. One home: `lib/curve.ts` — the drawing primitives over a `{ px, py,
pad, W, H }` layer — and `lib/geometry.ts` (`niceStep`, `clusterCliffs`);
each page keeps its scene → layout and its copy. Proves: both e2e specs
measure the drawn result (marks vs cliff list, 44px targets, type floors,
label/ring collisions, the `.hg-draw` count, print width 672) and
`citizen/geometry.test.ts`. Do this one last (§ 8). ~200 lines.

**Resolved** (`lib/chart/geometry.ts`: `niceStep`, `niceUp`, `niceTicks`,
`clusterCliffs`, `layerFor`, `indexAtX`, with `geometry.test.ts`;
`lib/chart/draw.ts`: the hatch, the seven key marks and `keyEntry`, the
series and ghost paths, `zoneRects`, `dropMark`/`waitStub`/`waitDot`, the
household diamond, `cursorNodes`, `markButton`, `watchWidth`,
`redrawForPrint`, `attachCursor` — the keyboard and pointer model with the
page's own bracket rule passed in, since the caseworker's N4 rule and the
citizen's differ on purpose). The citizen chart 395 → 342 lines, the
caseworker's 327 → 272, the citizen geometry 109 → 78; the caseworker's
`mk()` is lib's `svg` (D2). Rendered at 390 and 1280, light and dark, on
all three pages before and after: identical. Two rules became one where
they had drifted, both toward the reviewed rule: the caseworker's marks
merge whichever kind (the citizen's B1 rule — a deferred cliff within 10px
of an immediate one joins its mark and keeps the waits channel, where two
marks overlapped), and both charts redraw through a `ResizeObserver` (K9)
that stands down while the page is laid out for paper, so the print width
stays the one `redrawForPrint` drew (N6). The crop stays the citizen's
(`windowFor`), the full axis the caseworker's, and each keeps its words,
its radii and its bracket geometry.

### D11. Three render idioms

`lib/dom.ts h()` (citizen result, editor); `innerHTML` + `esc` (places
render, caseworker render, caseworker key at `chart.ts:237`);
`document.createElement` chains (`caseworker/main.ts:108–113` showError,
`:190–193` the note fragment). Every interpolation that carries data is
escaped today — no XSS finding — but `esc` exists only because innerHTML
does. One idiom: `h()` for anything that carries data; innerHTML only for
static SVG snippets. Start with `caseworker/main.ts showError` (it is the
citizen's `result.error` written by hand) and the note fragment. Proves:
`e2e/caseworker.spec.ts` (errors, notes, every rendered table). ~8 lines
now; the innerHTML → `h` conversion is line-neutral.

### D12. Every e2e file re-implements its harness

- `consoleErrors`: `e2e/editor.spec.ts:29`, `e2e/citizen.spec.ts:20`,
  `e2e/caseworker.spec.ts:30`, inline at `e2e/places.mjs:66–68`.
- `lum`/`contrast`/`rgb`: `e2e/citizen.spec.ts:28–33`, `e2e/places.mjs:43–48`.
- `noOverflow`: `e2e/editor.spec.ts:96`, `e2e/citizen.spec.ts:210`,
  `e2e/caseworker.spec.ts:36`, `e2e/places.mjs:74–75`.
- Output dir setup: `e2e/citizen.spec.ts:17–18`, `e2e/caseworker.spec.ts:19–21`.
- Starting a server and waiting on it: `playwright.config.ts:19` (wrangler,
  `/api/health`) vs `e2e/places.mjs:51–59 serve()` (its own Vite, its own
  poll) — and `places.mjs` loads Playwright through `createRequire` +
  `NODE_PATH` (`:23`) because it predates `@playwright/test` in the tree.

`places.mjs` is not a `*.spec.ts`, so **`npx playwright test` does not run
the places proof**; `app/README.md` § Proofs says it runs `e2e/*.spec.ts`.
Fix: `e2e/support.ts` with the four helpers; `places.mjs` → `places.spec.ts`
under the same config (its `check()` becomes `expect`, its PDF assertions
keep `pdf.mjs`). Proves: the proofs themselves, now all under one gate.
~40 lines.

**Resolved** (`e2e/support.ts`: `AUDIT_DIR`/`outDir`, `consoleErrors`,
`noOverflow`, `lum`/`contrast`/`rgb`, and `check` — a soft assertion that
prints its measurement, so the places proof's log reads as before;
`places.mjs` → `places.spec.ts` under the config's server with its 193
checks (96 lines, two widths and the failed fetch), core's constants and
the lib program table imported rather than regex-read off the source. One
expectation moved with the server: the Cite line's URL is the page's own
address, which behind the Worker's assets router is `/places`, not
`/places.html`. The three specs import the harness. The two review scripts
(`citizen-review.mjs`, `liheap-review.mjs`) are evidence tools, not proofs,
and keep their own `check`.)

### D13. Copy modules in three shapes

`editor/copy.ts` — object of strings and arrow functions; `citizen/copy.ts` —
`{slot}` strings with `t()`/`parts()`; `caseworker/copy.ts` — the editor's
shape plus a `fmt` bag. § Languages wants one `t(key, params)` over ICU
strings. The citizen shape is the one already within reach of that (a
template is a string, `parts()` gives the keyed spans, `t()` throws on a
half-filled sentence); the arrow-function shape cannot be read by a locale
file. Decision for the migration, not a change now: the citizen shape is
the target, and `scripts/readability.mjs` already grades both. 0 lines now.

### D14. Page constants that repeat core, and deep imports into core

`places/model.ts:16 PREFERRED_HOUSEHOLD` repeats `DEFAULT_ARCHETYPE`;
`:63 CHILDCARE_MAX_AGE` repeats core's; both comments (`:12–15`, `:60–62`)
say core's modules "reach node:fs" — no longer true since `core/src/data.ts:185`
moved to `process.getBuiltinModule` (the caseworker already imports
`CHILDCARE_MAX_AGE`, `CLIFF_MIN`, `STATE_NAMES` from `@hotgap/core`:
`caseworker/model.ts:9–28`). `places/model.ts:8`, `places/render.ts:6–7`,
`places/csv.ts:7` import by `../../../core/src/…` path. Fix: import from
`@hotgap/core`, delete the two constants and their comments, delete
`places/model.test.ts:62–65` (the pin test that exists only because of the
repeat). Proves: `places/model.test.ts` "archLabel and paysForCare",
`places/csv.test.ts`. ~12 lines.

### D15. URL state — checked, and not a duplication

`places/url.ts` (a view: household, measure, sort, state), `caseworker/url.ts`
(flags + `whatif=` diffs, over core's `flagsFromSearchParams` /
`searchParamsFromFlags`), `citizen/main.ts:41,66` (flags, core's functions
directly). The brief listed these as three implementations of one thing;
they are three states with one shared part, and the shared part is
already core's. Leave them.

### D16. Two wordmarks, three page columns, two dense-surface resets

See § 6 (CSS) — F6, F7, F8.

---

## 2. KISS

- **K1.** `editor/index.ts:640–643 openInputs` and its interface line `:93`
  and README line `app/README.md:110` — no caller anywhere in `app/`
  (`grep -rn openInputs app scripts`: only the editor and the README; the
  caseworker's earlier call is gone). Delete. Proves: `e2e/editor.spec.ts`
  (Edit toggles the row without it). 6 lines.
- **K2.** `editor/api.ts:14 evaluate(flags, fetchImpl = fetch)` — nothing
  passes `fetchImpl`, no test for the module. Speculative generality; drop
  the parameter. 1 line.
- **K3.** `caseworker/copy.ts:135 whatIf.on / off` — unused; `:144 toggled`
  inlines its own "on"/"off". Delete the pair or use them. 1 line.
- **K4.** `citizen/result.ts:162 stepRows(s)` and `citizen/steps.ts:114`
  (inside `waitsText`) compute the rows twice per render. Pass the rows in.
  Proves: `citizen/steps.test.ts` "the deferred callout". 0 lines, one
  O(cliffs × programs) pass fewer per render.
- **K5.** `caseworker/model.ts:173` `[...seen].some((k) => k.startsWith(…))`
  spreads the Set per program to ask "seen under any group?" — a second
  `Set<ProgramId>` answers it. Proves: "ThresholdLedger ends every program…".
  0 lines, clearer.
- **K6.** `places/render.ts:231 lists` — a three-element const used once,
  three lines below. Inline.
- **K7.** In-file-only exports: `caseworker/model.ts stepOf, archetypeOf`;
  `caseworker/scenarios.ts flagName`; `caseworker/url.ts WHAT_IF`;
  `citizen/model.ts moneyFor`; `citizen/verdict.ts verdictSlots, SLOT_KEY`;
  `places/model.ts worksBoth, PROGRAM_NAME, overrideProgram`;
  `places/render.ts PAST_AXIS`; `lib/programs.ts PROGRAMS`. Where no test
  imports them either, drop `export` so the module's seam is what it uses.
- **K8.** `caseworker/render.ts:19–30 renderStatic` copies twenty copy keys
  into a `Record<string, string>` by id. It is the languages rule's shape
  (skeleton holds ids; copy fills them) and stays — but the places page
  needs the same thing (§ 5), so make it `lib/dom.ts fillText(ids)` once
  the places copy module exists.
- **K9.** `citizen/chart.ts:321–325` watches width through a
  `ResizeObserver`; `caseworker/chart.ts:296–303` through
  `window.resize` + `requestAnimationFrame`. One mechanism when D10 lands
  (the observer: it also fires when the column, not the window, changes).

**Resolved.** K1 `openInputs` and its README line deleted (no caller). K2
`fetchImpl` dropped. K3 `whatIf.on/off` deleted (`toggled` keeps its own
words until D13 makes them one template). K4 `waitsText(s, rows)` takes the
render's rows (`stepRows` once per render). K5 a `placed` Set in
`lib/thresholds.ts` (D8). K6 was already gone (Plan 8 rewrote
`places/render.ts`). K7 `export` dropped on `archetypeOf`, `flagName`,
`WHAT_IF`, `moneyFor`, `verdictSlots`, `SLOT_KEY`, `PROGRAMS` and the
fixture's `ANSWERS`/`makePoints`; `stepOf` moved to lib (D8), `modelLine`
is lib's (N10). K8 `lib/dom.ts fillText` — the caseworker's `renderStatic`
uses it (the places page already did). K9 → D10.

---

## 3. Big O — every render and event path, by input

Inputs on this site: points ≤ 231, cliffs ≤ ~12, zones ≤ ~5, programs = 13,
states = 51, chips = 26, what-ifs = N (small). Nothing superlinear in an
unbounded input was found; three things are repeated per item and named.

| path | input | order | note |
|---|---|---|---|
| `citizen/model.ts sceneOf` | points × programs | O(p·13) once per evaluation | `starts` scan; `remains` O(programsLost) per cliff |
| `citizen/model.ts liftDeferred` | points × deferred | O(p·d) | core's `immediateCurve` is O(p) — D6 |
| `citizen/model.ts windowFor` | — | O(1) | |
| `citizen/geometry.ts layout` | points in window | O(w) | `Math.min(...slice)` spread, fine at 231 |
| `citizen/geometry.ts clusterCliffs` | cliffs | O(c) | |
| `citizen/steps.ts stepRows` | cliffs × programs | O(c·13) | **run twice per render** (K4) |
| `citizen/steps.ts stepSentence` | rows × programs | O(r·13) | `Object.entries(s.starts)` per row |
| `citizen/chart.ts draw` | window points + cliffs | O(w + c) | once per evaluation / resize |
| `citizen/chart.ts paintCursor` | zones | O(z) per pointer/key event | never redraws the line ✓ |
| `citizen/chart.ts paintMarks` | clusters | O(c) per resize | keeps the focused mark ✓ |
| `citizen/chart.ts` listeners | — | — | ResizeObserver disconnected in `destroy()`; wrapper listeners die with the node; `result.ts:207–208` print hooks once at module scope. No leak |
| `citizen/result.ts render` | all of the above | O(p·13) | rebuilds the whole result per chip toggle — documented and right at this size |
| `caseworker/model.ts ledgerRows` | cliffs × programs | O(c·13) + O(13·seen) | K5 |
| `caseworker/model.ts incompleteStates` | states × unmodeled | O(51·u) per base render | |
| `caseworker/model.ts compareRows` | rows × columns | O(10·N) per what-if change | whole table rebuilt; fine |
| `caseworker/chart.ts draw` | points + cliffs + zones | O(p + c + z) | `clearRings`: ≤ 3 `getBBox()` per label, ≤ 3 labels → ≤ 9 forced layouts per draw |
| `caseworker/chart.ts draw` worst-mark lookup `:180` | marks × members + cliffs | O(m·k + c) | `cliffs().indexOf(w)` inside `find`; trivial |
| `caseworker/chart.ts keydown ]` | marks × members | O(m·k) per key | |
| `caseworker/chart.ts paintCursor` | zones | O(z) per pointer event | |
| `caseworker/chart.ts` listeners | — | — | `resize`/`beforeprint`/`afterprint` on `window` once per `mountChart`, which runs once ✓ |
| `caseworker/render.ts renderDrops` | cliffs | O(c) | listeners on nodes innerHTML replaces — GC'd with them ✓ |
| `caseworker/main.ts addWhatIf` | what-ifs | O(N) `sameDiff` scan | |
| `places/model.ts rowsFor` | states | O(51) | |
| `places/model.ts group` | states | O(51 log 51) | one sort per household/measure change; a sort-order change (`main.ts:90`) re-concatenates, never re-sorts ✓ |
| `places/render.ts renderFigure` | states | O(51) | `byState` Map ✓ |
| `places/render.ts applySelection` | states × 3 groups | O(153) per select | nothing rebuilt ✓ |
| `places/tiles.ts tileNeighbor` ↑↓ | tiles | O(51) per key | |
| `editor/index.ts renderChips` | chips + kids | O(26 + k) per keystroke | `chips.find` O(26) per click |
| `editor/index.ts renderForm` | — | O(k) | `querySelectorAll('input[name=married]')` per render, 2 nodes |
| `worker evaluate` | household | O(1) | one `req.text()`, one parse, one `validateAnswers`; cache: one `match`, on miss one `put` under `waitUntil` |
| `worker localRateLimiter` | clients seen this period in this isolate | O(n) per call | **bounded**: the per-call sweep leaves one entry per client seen in the last `periodMs`; n ≤ requests/min per isolate. Left as is (§ 7) |

---

## 4. Naming and dead code

- **N1.** `caseworker/scenarios.ts:7` `import { copy as citizen } from
  "../editor/copy.js"` — it is the editor's default register, not the
  citizen page's. `editorCopy`.
- **N2.** `caseworker/main.ts:24` `const text = copy.status` — `text` says
  nothing; the file already uses `W` for `copy.whatIf`. `S`.
- **N3.** `$` means two things on the caseworker surface: an element by id
  (`render.ts:16`) and money (`copy.ts:42`, `model.ts:250`). Keep `$` for
  the element (the places page's meaning) and let money be `usd` (already
  the import alias at `copy.ts:9`).
- **N4.** `lib/verdict.ts:5–6` says the citizen's copy "is the one to
  retire in favour of this" — the reverse is true (D4). Fix the comment
  with the code.
- **N5.** `editor/copy.ts:2–4` says the readability gate "is not ported
  yet; when it is, this is the file it reads" — it is
  (`scripts/readability.mjs:20`). Stale.
- **N6.** `places/model.ts:12–15, 60–62` — the node:fs reason is gone
  (D14). Stale.
- **N7.** `app/README.md:110` documents `openInputs` (K1). Delete with it.
- **N8.** `app/README.md:172` "The citizen bundle today is 99 KB" — the
  merged build is 42.8 kB (`citizen-*.js`) + the 59.1 kB editor chunk; fine
  as prose, but a number in a README is a claim: point it at `vite build`'s
  line rather than restate it.
- **N9.** `citizen/facts.ts:118` the `< 6` (D7) reads as a typo for
  `<= CHILDCARE_MAX_AGE`; the docstring at `:115` says "under 6". Both wrong
  per the inventory.
- **N10.** Dead: `editor.openInputs` (K1), `copy.whatIf.on/off` (K3),
  `evaluate`'s `fetchImpl` (K2), `places/model.test.ts:62–65` once D14
  lands, `caseworker/copy.ts:292–294 modelVersion/modelEndpoint/modelUnknown`
  once D1's `modelLine` lands.
- **N11.** `worker/src/index.ts:66` — the `error` helper's second parameter
  was named `error`, shadowing the helper inside its own body. **Fixed**
  (§ 7).
- **N12.** `caseworker/copy.ts:1–7` header says "program names come from
  lib/programs.ts (M3) and state names from core" — true; add "list, date
  and money from lib/format.ts" once D1 lands so the next reader does not
  re-add `fmt.list`.

**Resolved.** N1 `editorCopy`. N2 `S`. N3 `usd` in `compareRows` (the
copy module's `$` goes with D13's reshaping). N4 gone with `lib/verdict.ts`
(D4). N5 fixed with the readability commit. N6 was already gone (Plan 8).
N7 with K1. N8 the README points at `vite build`'s own lines. N9 was fixed
in the citizen review (N6 there). N10 all four gone; the caseworker's
`modelLine` is `lib/format.ts`'s (byte-identical output). N11 fixed in the
audit. N12 the header is rewritten by D13.

---

## 5. Languages rule, per surface

The interim rule (`app/README.md` § Languages): every user-facing string in
the surface's copy module, none inline in render code; `Intl` with a locale
for numbers, money, dates; a sentence is one message.

| surface | copy module | inline strings in render/model code | Intl | notes |
|---|---|---|---|---|
| editor | `editor/copy.ts` ✓ | `index.ts:185` "2 adults" / "1 adult" / "kid(s)" / " & "; `:406` " · " join; `:495` "Check this."; `:187` hourly figure by `toFixed(2)` | money via `lib money` ✓ | three literals to move into `copy.chips`/`copy.errors`; `payLabel` → D1's `payInUnit` |
| citizen | `citizen/copy.ts` + `t()`/`parts()` ✓ | `main.ts:27` the h1 sentence | ✓ throughout | `steps.ts:73–75` composes "Your own {noun} ends" from a phrase table — by design (M3) but it is fragment composition; flag for the ICU migration. `subText` (`facts.ts:23–26`) joins whole sentences — allowed |
| caseworker | `caseworker/copy.ts` ✓; `locale` named once ✓; skeleton holds only ids ✓ | none ✓ | ✓ | inside copy: `fmt.kids/adults/count` and `handout.title` plural by hand (ICU `plural` later); `chart.label` (`copy.ts:236–241`) and `whatIfLabel` (`scenarios.ts:63–87`, joined with ", " and " & ") build sentences from clauses |
| places | **none** ✗ | `render.ts` (≈45 sentences, `:30–34, :51–67, :110–113, :145–157, :164–166, :189–200, :209–212, :233–236, :244–247, :251–267`), `main.ts:38, :133`, `model.ts:31–44` MEASURES titles/options/descriptions, `:53–57 archLabel`, `:206–209 overrideProgram`, `places.html` (≈25 strings incl. the whole method panel) | ✗ `format.ts:7` money by hand, `:25` list by hand, `:37` ISO date, `:18 word()` English number words | the one surface not built to the rule. Fix: `places/copy.ts` in the caseworker's shape, ids in the skeleton, `fillText` (K8). CSV column headers stay English (machine contract, README says so) |
| lib | — | `lib/verdict.ts:12–18` five sentences; `lib/programs.ts` phrases and names; `lib/format.ts:15 PHRASE` "an hour / a week / …" | ✓ | copy outside any copy module and outside the gate |

**Gate coverage.** `scripts/readability.mjs:20 MODULES` reads `editor/copy.ts`
and `citizen/copy.ts` only. Ungated citizen-register text today:
`lib/verdict.ts` (the client sheet's first paragraph), `lib/programs.ts`
phrases (used by `caseworker/copy.ts:302–304`), and `caseworker/copy.ts
handout.*` (citizen register per review S8). Add them to `MODULES` (D3, D4
make the first two one place).

**Layout.** `caseworker.css` uses logical properties throughout ✓;
`places.css` has seven physical ones (`:90–97 left/right`, `:92 margin-left`,
`:103 padding … 2.6rem` start-side, `:145–146 padding-left`, `:155
padding-left`); `editor.css:7 margin: 0 var(--s3) 0 0`; `citizen.css` none.

---

## 6. Page CSS that belongs in the system

`design/inventory.md` § Class map: a page keeps only layout that is
genuinely its own. Each of these is declared by a page and is either a
system rule already, a system rule written twice, or a TODO(system) the
page itself named.

- **F1.** `.hg-rows > li { grid-template-columns: 1fr; gap: var(--s1) }`
  below 520px — `caseworker.css:37–39` (marked "TODO(system) 13") and
  `places.css:125`. Same rule twice → `tokens.css`. 5 lines.
- **F2.** `.hg-scenario__note { max-width: none }` — `caseworker.css:42`
  (marked "TODO(system) 12") → `tokens.css`. 1 line.
- **F3.** `.hg-mark__count--later { color: var(--ink-3) }` —
  `citizen.css:47–50` (marked TODO(system)) → `tokens.css`. 3 lines.
- **F4.** `.hg-chip[data-unset] .hg-chip__v` — `editor.css:66–69` ("until
  the system names the state") → `tokens.css`. 3 lines.
- **F5.** `.editor__input` mirrors `.hg-select` (`editor.css:21–27`, the
  header at `:4–6` says a text-input class is something the system lacks)
  → `.hg-input` in `tokens.css`. 7 lines.
- **F6.** `places.css:73–75 .legend` is `.hg-key` (`tokens.css:445–448`:
  same flex, wrap, gap, list-style, li layout) → use `.hg-key`. 3 lines.
- **F7.** `.page { max-width: N; margin: 0 auto; padding: 0 var(--s4)
  var(--s8) }` — `citizen.css:6` (40rem), `caseworker.css:9` (76rem),
  `places.css:5` (68rem). The column is the page's own by contract; the
  body is identical three times → `.hg-page { max-width: var(--page-max) }`
  and each page sets one custom property. 2 lines.
- **F8.** The dense-surface reset, twice: `body { font-size: var(--t-small) }`
  (`caseworker.css:8`, `places.css:4`), `p { max-width: var(--measure-wide) }`
  (`:12`, `:11`), `#status { margin }` (`:13`, `:19`), `h2`/`h3` margins
  (`:10–11`, `:7–8`). The inventory says both panel surfaces set a 15px
  base, so this is one class (`.hg-dense` on `html`) or nothing. 6 lines.
- **F9.** `.footnote` (`caseworker.css:121`) is `.hg-source` minus its
  line-height and margin → use `.hg-source`. 1 line.
- **F10.** `.wordmark` (`places.css:14`) and `.editor-wordmark`
  (`editor.css:7`) — the same style → `.hg-wordmark`. 1 line.
- **F11.** `.cw-label--strong { font-weight: var(--w-semi) }`
  (`caseworker.css:66`) and the citizen's inline `"font-weight": 600` on
  the same direct labels (`citizen/chart.ts:185,213,220`) — the direct
  label's weight is one rule → `.hg-label--strong`. Both charts then say
  the same thing (D10). 1 line + 3 attributes.

Own and right: the caseworker `.cols` grid, `.bd-*` bars, `.compare`
sticky column and `.b` rules, `.tile .lab/.val/.sub`; the places `.split`,
`.figure`, `.grid`/`.tile` cartogram, `.rank` dot list, sticky table
header, print block; the citizen `.answer` keyed underlines, `.band`,
`.chart-head`. The `[hidden]` rule is never re-declared by any page ✓.
Panel padding is `--s4` once ✓. No page calls `matchMedia(prefers-reduced-
motion)` ✓. No bare `font-size` attribute on SVG text (the citizen proof
measures it) ✓.

**Resolved** (one additive commit to `design/tokens.css`, each rule with
its `inventory.md` § Class map row; rendered before and after at 390 and
1280, light and dark, all three pages, and compared pixel for pixel — 12 of
12 identical). F1 `.hg-rows--stack` (a modifier: the citizen's lists keep
two columns until TODO(system) 13 is settled). F2 `.hg-scenario__note {
max-width: none }` in the system rule — the citizen's archetype note is
now the full-width line the inventory describes too. F3
`.hg-mark__count--later`. F4 `.hg-chip[data-unset] .hg-chip__v`. F5
`.hg-input` shares `.hg-select`'s rule; the editor's inputs take it and
keep `editor__input--short` and the invalid edge page-side. F6 the map
legend is a `.hg-key`; its column gap goes 24 → 16px when two entries
show (safe exit, the leap), the one intentional difference, off the
default view. F7 `.hg-page` with `--page-max` per page. F8 `.hg-dense` on
`<html>` for the body size, the wide measure and the h3 margin; the h2
margins differ between the two pages (--s6 / --s7) and stay page-side, as
does `#status`. F9 **not done**: `.footnote` differs from `.hg-source` in
line-height (1.55 → 1.45) and margin, so the swap moves five paragraphs —
a rhythm the owner decides. F10 `.hg-wordmark` carries weight and size;
the editor's −0.01em tracking and the two margins stay page-side (they
differ). F11 `.hg-label--strong` and `--med`; the citizen chart's seven
`font-weight` attributes and the caseworker's `.cw-label--strong` go.
Page CSS: citizen 74 → 69 lines, caseworker 136 → 124, places 263 → 256,
editor 69 → 57; tokens.css 671 → 722 with its comments.

---

## 7. Worker (`worker/src/index.ts`) — findings and the fix

Reviewed against the brief's questions.

- **W1. Per-request work.** Read `content-length`, `req.text()`, one
  `JSON.parse`, one `validateAnswers`, one rate-limit call, one `inFlight`
  compare, then `evaluateHousehold`. `configurePolicyEngine` and
  `fetch.bind` per request are cheap and explained in place (`:184–188`).
  Nothing repeated per item. Order is deliberate: the body is validated
  before the limiter is asked, so only households count against the
  20/min budget — keep.
- **W2. Cache key vs core's.** `cacheUrl` (`:137–139`) wraps core's
  `curveCacheKey` (`core/src/client.ts:207`, a SHA-256 over answers +
  payload + policy) with the engine host and the memoized
  `modelVersion()`. Correct: a changed endpoint or release never serves
  the old model. Pinned by "curveCache over the Cache API".
- **W3. Error shapes vs `core/src/api.ts`.** `error()` builds
  `{ error, detail? } satisfies ApiErrorBody`; every status/code pair and
  `Retry-After`/`Allow` header matches the README table. Pinned by nine
  handler tests.
- **W4. Rate-limiter fallback growth.** `localRateLimiter` (`:167–176`)
  sweeps expired windows on every call, so the map holds one entry per
  client seen in the last `periodMs` in this isolate: **bounded**, at the
  cost of O(clients-in-period) per call. An O(1)-amortized sweep (once per
  period) would double the bound and add a clock; at free-plan request
  rates the sweep is microseconds. Named, not changed.
- **W5. `waitUntil`.** Only `cache.put` is deferred (`:152`); the get is
  awaited; the fallback never stores. Right.
- **W6. Naming.** The `error` helper's parameter was named `error`
  (`:66`). **Fixed** in commit `542916c` — `code`; behaviour identical,
  `npx tsc -b …` clean, `npx vitest run worker/src/index.test.ts` 13/13.

`MAX_BODY_BYTES` (`:47`) is compared against `content-length` in bytes and
`text.length` in UTF-16 units (`:78`); a household is ASCII JSON, so the two
agree, and the check is a brake, not accounting. Left with this note.

---

## 8. Order for the fix pass

Each step shrinks the ones after it.

1. **D14** — places imports from `@hotgap/core`; delete the two repeated
   constants, their comments, the pin test. Tiny, and it is the last thing
   that keeps places' modules from being ordinary.
2. **D1** — `lib/format.ts` absorbs the places helpers, `fmt.list/date/pay/
   tick`, `payLabel`; every later step then imports from one place. Accept
   the Oxford-comma/date change on the journalist page in the same commit.
3. **D2** — `lib/dom.ts` absorbs the editor `h`, the caseworker `mk`, `$`.
4. **D3** — one program table in `lib/programs.ts` (phrase, name, article);
   gate reads it.
5. **D4** — one verdict: catalog templates + `verdictSlots(ev, pay)` in lib;
   caseworker sheet on it; gate reads it. Update the two "about" expectations.
6. **D7, D5, D6, D9** — `lib/coverage.ts bites` (fixes the citizen bug);
   ask the core agent to export `modeledAnswers` and `immediateCurve`;
   `correctionRows` → lib.
7. **D8** — threshold rows → lib (needs 4).
8. **K1–K7, N1–N10** — the dead-code and naming sweep, now that the seams
   are settled.
9. **D12** — `e2e/support.ts`; `places.mjs` → `places.spec.ts`, so the
   places proof is in the gate before the chart work touches it.
10. **F1–F11** — page CSS into `tokens.css` (design owner's file; one
    commit).
11. **§ 5 places** — `places/copy.ts`, ids in the skeleton, `fillText`.
12. **D10** — the shared curve primitives. Largest, last, with both e2e
    specs and `geometry.test.ts` as the net.
13. **D13** — the copy-shape decision, recorded for the ICU migration.
