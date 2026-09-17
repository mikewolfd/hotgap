# HotGap Places Page — Cold-Reader Fixes (Plan 8)

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax; every finding below refers to `design/REVIEW-places-context-blind-2026-09-16.md` (evidence in `design/review/places-context-blind/`). Run every check through the project's runners (`npm run typecheck`, `npx vitest run`, `cd app && npx vite build`, `NODE_PATH=… node app/e2e/places.mjs`). Nothing may be typed from the data: every number a page prints is read from `summary.json` or the coverage block.

**Goal:** A reporter who arrives with nothing but the link can write the sentence — *"A single parent of two in Ohio loses $12,062 when pay rises from $X to $X+1,000, as Medicaid ends; the family is a renter in Franklin County"* — and every word of it is on the page. The review's lede test is the acceptance test.

**Source:** the context-blind review (4 B, 10 S, 13 N), each finding re-verified against the code and the data on 2026-09-16 (the sort order at `app/src/places/model.ts:193`; the subsidy line hidden by `applies === true`; `StateMetrics` carrying no step or program; the county name absent from the coverage block; Nebraska's worst zone closing while a later one runs off the axis).

## Decisions — how I would do it

1. **One new element carries three blockers.** A *state readout* beside the map (the system already has `.hg-readout`, the CurveReadout's shape) that fills when a state is selected: *"Ohio — $12,062 lost at $34,000 → $35,000, when Medicaid ends. Renter, Franklin County. Details below ↓"*. That is B3 (program and income), B4 (county) and S1 (the click has a visible answer) in one place, at the point of the click, at every width. The detail block below keeps the full corrections record; the readout links to it and the tile click also scrolls it into view (the design-review fix did this for table selection only).
2. **B3 is a pipeline change, not a page change.** `StateMetrics` gains `biggestLossAt` (the step's starting earnings) and `biggestLossPrograms` (the step's `programsLost`), both from `analysis.worstCliff` in `pipeline/src/metrics.ts`. Rebuilt with `--from-data` — every existing metric byte-identical, two fields added — no resweep.
3. **The copy findings are done as the languages-rule migration, once.** The places page has no copy module (audit D-languages: "fully non-compliant"). Every string the review names (S2, S3, S4, S6, S8, S9, N7, N10, N12, N13) is rewritten *into* `app/src/places/copy.ts` in the shape of `editor/copy.ts` — one pass, not a rewrite now and a move later.
4. **N2 is solved by widening the one control, not adding six.** *Table order* gains the six measures ("Largest one-step loss, largest first" … "Deferred cliffs, most first") so the table sorts independently of the map without sortable headers, which the design did not choose.
5. **N1 is declined.** `replaceState` for filter changes was the builder's deliberate choice (history spam makes Back useless for leaving the site); the reviewer's Back went to `about:blank` because the tab was fresh. Selection of a state *does* get `pushState`, so Back from a shared deep link returns to the unselected view — the one case where undo is what a person expects.
6. **N9: reach leaves the places page.** Nothing on this surface shows reach; its vintage in the source line and the CSV's `reach_vintages` column describe a thing the reader cannot find. Both go. (The caseworker page shows reach and keeps its line.)
7. **S10 (phone table) is a system fix plus one page rule.** `.hg-scroll-x` gets an edge fade and a "swipe for more →" affordance in `tokens.css` (every surface's wide table inherits it); the places table makes its first column (state) sticky so the row's identity never leaves the screen, and moves the *Figures* flag into the state cell so the amber caveat is visible at 390 without a swipe.
8. **S8 and Plan 7 meet here.** Universal exclusions (LIHEAP today) belong in "What the model does not include", not under each state. core marks such entries additively (`UnmodeledProgram.scope: "state" | "all"`); the page lists `all` in the methodology and `state` in the block. Plan 7 Phase 0 then changes LIHEAP's note per state and the page needs no further change.
9. **N8: the endpoint host is honest and looks like a scratch server.** The CSV keeps `model_endpoint` (it is the provenance) and gains `model_label` ("HotGap hosted engine, policyengine-us 2.6.2"). Giving the droplet a real hostname is a separate ops decision (a domain) — flagged, not done here. The DC `source` oddity is verified against the reviewer's CSV before anything is changed (the code writes one constant for every row).
10. **N11 stays a map.** Consistency across measures is worth more than a better picture for one; the caption gains a rendered sentence when one class holds ≥ 90% of states ("48 states have none"), so the near-monochrome map explains itself.

## Phase A — data (core + pipeline; one merge; `--from-data`, no resweep)

- [x] `pipeline/src/metrics.ts` / `core/src/data.ts` `StateMetrics`: `biggestLossAt: number | null` (the worst step's starting earnings) and `biggestLossPrograms: ProgramId[]` (its `programsLost`, in core's order), from `analysis.worstCliff`; null/empty when `cliffCount === 0`. Tests pin OH single-2 from the committed file and a synthetic no-cliff curve.
- [x] `core/src/coverage.ts` `vintages.county` gains `name` (from `countyName(stateDefaults(state).countyFips)`, e.g. "Franklin County") and `fips`; the `publisher`/`vintage` stay. Test: OH → Franklin County; a state whose county-equivalent is a city or parish keeps its published name.
- [x] `UnmodeledProgram.scope` (`"state"` default, `"all"` for LIHEAP today); `coverage.test.ts` pins LIHEAP as `all` in every state and the premium/child-care entries as `state`.
- [x] `npm run pipeline -- --from-data`: diff shows only the new fields and the county name; every existing number identical. Commit data with the code.

## Phase B — the page's structure (`app/places.html`, `app/src/places/*`; one merge)

- [x] **B1** Sorted body: lower-bound rows (`leapIsLowerBound`, `safeExit === null` on the safe-exit measure) render *first* under a rendered heading — "At least this much — exact size runs past the axis (2)" — then the comparable rows largest-first, then no-cliff, then incomplete; the ranked strip follows the same order with the same heading. Test: for the leap, MD and NY precede WI; for one-step loss the order is unchanged.
- [x] **B2** The corrections block always prints the child-care subsidy's status line, from `corrections.childcareSubsidy` regardless of `applies` ("Child-care subsidy: inside PolicyEngine's net income for Ohio" / "added by HotGap for Texas"), so two states read on the same footing. The "(0)" block keeps its sentence and adds "the fixes other states need were not needed here".
- [x] **B3/B4/S1** The state readout (`.hg-readout`) beside the map: state, `biggestLoss`, `biggestLossAt → +1,000`, program phrases (M3, `lib/programs.ts`) for `biggestLossPrograms`, "renter, {county name}", and a link to the block; empty state reads "Select a state on the map or in the table". Tile click and row click both fill it and scroll the block into view with focus on its heading (the design-review fix extended to tiles). The block's heading line gains the same step sentence.
- [x] **S5** Incomplete rows print the caveat in the cell — "$26,206 — floor: NJ Health Plan Savings not modelled" — and the grey left bar goes (**S7**: one bar, one meaning — selection).
- [x] **S9** Nebraska's case: the box reads "Where a state's *last* danger zone runs off the top of the axis … the safe exit is unknown; the leap is a lower bound only when the *worst* zone is the one that runs off" — and the table's "past the axis" cell for safe exit gets `aria-describedby` to that box. Test: NE leap prints as an exact figure with a full safe-exit caveat.
- [x] **S10** Sticky state column; *Figures* flag rendered in the state cell at narrow widths; `.hg-scroll-x` edge fade + affordance in `tokens.css` (system; `inventory.md` Class map row updated). Proof at 390: the flag for NJ is visible without scrolling; the fade is present when `scrollWidth > clientWidth`.
- [x] **N2** *Table order* options: "State, A to Z" + the six measures largest-first; the URL's `sort=` carries the measure key. **N3** rank ordinals rendered in the ranked strip ("30." before OH). **N5** phone header gutter (page CSS: the masthead shares the `--s4` inline padding of the controls). **N11** the ≥ 90 % one-class caption sentence.
- [x] Big O unchanged: one sort per filter change, O(S log S); the readout is O(1) per selection.

## Phase C — the copy, as the copy module (`app/src/places/copy.ts`; one merge)

- [x] Create `copy.ts` in the shape of `editor/copy.ts` (functions of their values, whole sentences, `Intl` with a `locale` named once); move every string out of `places.html`/`render.ts`/`model.ts` (`MEASURES` titles and descriptions included). Grep proves no literal remains outside class names.
- [x] **S2** Self-contained measure options: "The leap — the raise needed to clear the worst danger zone ($)", "Safe exit — earnings above which no danger zone remains ($)", "Deferred cliffs — of the cliffs counted, those that land at a later renewal".
- [x] **S3** One glossary sentence under the subhead, rendered from core's constants: "A *cliff* is a $1,000 raise that cuts net income by ${CLIFF_MIN} or more; a *danger zone* is a run of earnings across which the household never gets ahead." **N12** "one axis" → "the same earnings scale, $0 to 400 % of the poverty line plus $40,000".
- [x] **S4** The deferred map's subtitle names the three mechanisms (from the inventory's deferred wording: Head Start carry-over, 12-month continuous Medicaid/CHIP, Transitional Medical Assistance).
- [x] **S6** First use: "PolicyEngine, an open-source tax-and-benefit calculator, …" in the subhead's source clause and the methodology.
- [x] **S8** `scope: "all"` entries listed once under "What the model does not include"; the per-state block lists `state` entries only.
- [x] **N7** Developer vocabulary out of reporter-facing text: issue numbers stay only inside the cite link's title; "sweep" → "weekly run"; "endpoint" → "the model HotGap ran"; `nj_property_tax_relief` → the program's name with the variable in the cite. (core's notes were rewritten for the reader in the design-review pass; this is the page's own strings.)
- [x] **N10** "Arrow keys move between states; Enter selects." **N13** A "Cite as" line in the source note, rendered from `summary.generated`, `model.version` and the URL: "HotGap, *What a raise costs, state by state*, 2026 rules on PolicyEngine (policyengine-us 2.6.2), run of 16 Sept 2026, hotgap.org/places?…".
- [x] `npm run readability` runs over `places/copy.ts` too (the gate reads `app/src/*/copy.ts`); grade reported; the journalist register is not the citizen's, so the gate's threshold is a note, not a block, for this surface — say so in the gate's config rather than special-casing the page.

## Phase D — the CSV (`app/src/places/csv.ts`)

- [x] Columns: `+ biggest_loss_at`, `+ biggest_loss_programs`, `+ county_name`, `+ county_fips`, `+ model_label`, `− reach_vintages`; `figures` cell carries the floor wording; header order documented in the methodology's "The download" line. **N8** the DC `source` value checked against `design/review/places-context-blind/*.csv` first; the code writes one constant, so if the file shows "HotGap" alone the cause is elsewhere (quoting of "Washington, DC"?) and is fixed at its cause.
- [x] `csv.test.ts`: the new columns equal the rendered readout's values for OH; `parseCsv.mjs` round-trips 51 rows with the comma in "Washington, DC".

## Proofs and acceptance

- [x] `app/e2e/places.mjs` gains one check per finding above (the order of lower-bound rows; the subsidy line on OH and TX; the readout text for OH equals the summary's fields; the county name; the phone flag visibility; the Cite line; the glossary sentence), all reading their expected values from `summary.json`, never typed.
- [x] The design system's visual review (the `frontend-design` skill, B/S/N) on the changed page before merge — the readout is a new element on the surface and must read as one of its own.
- [ ] **The acceptance test is the review re-run:** a fresh context-blind agent, same eight tasks, same brief, on the redeployed preview — it must be able to write the Ohio lede with the program, the income step and the county, and its B count must be 0. Its S/N list is the next plan's input.

## Order and effort

| Phase | Depends on | Size |
|---|---|---|
| A data | — | half a day (two fields, a name, a scope; `--from-data`) |
| B structure | A | 1 day |
| C copy module | — (parallel with B; merges after) | half a day |
| D CSV | A | an hour |
| Proofs + visual review + cold re-run | B, C, D | half a day |

Bundle with the `app/` code-audit fix pass (`docs/code-audit-2026-09-16-app.md` § 8: D14 → D1 → D2 → D3 first) — its first steps remove the duplicated format helpers and the stale `../../../core/src/` imports in `places/`, which shrink every file Phase B touches. One agent, one branch, audit order first, then A–D.

## Not doing, and why

- **N1** pushState per filter: declined (above). **N4** tooltips: the readout answers the need without a hover-only device (hover does not exist on the phone). **N6** 28 px tiles: the design's answer is the 44 px control beside the map (design review TODO 2, done — the ranked rows); the tiles stay their size.
- **Sortable column headers (N2 as asked):** the single order control, widened, does the job without a second control pattern.
- **A per-state curve on this page (B3 "ideally a link to that state's curve"):** the caseworker page is the curve; the readout links to `/caseworker?state=OH&…` with the archetype's answers rather than drawing a second chart here (design § What was deliberately left out).
- **A real hostname for the engine (N8):** a domain purchase; the owner's call. Recorded in the ops notes.
