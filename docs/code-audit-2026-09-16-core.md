# Code audit — core, pipeline, contract, fixtures (2026-09-16)

Scope: `core/src/**`, `pipeline/src/**`, `contract/**`, `fixtures/**` and the
docs that describe them, audited against the working doctrine (smaller,
clearer, more shared; reuse before extract, extract before copy; no
behaviour change; sealed pins and public contracts stay). `app/`, `worker/`,
`engine/`, `scripts/` and `design/` were other agents' scope and were not
touched; where a cleanup here would have needed a change there, it is listed
under "not fixed" with the reason.

Branch `worktree-agent-a298fd95a9efad1ef`, from `main` at 3e9e544. Thirteen
commits, each green on `npm run typecheck` and `npx vitest run`
(the project's runners, never a bare binary). The live contract suite was
run once at the end against the hosted engine from `.env` (26 of 26 pass —
22 in `policyengine.contract.test.ts`, 4 in `corrections.contract.test.ts`;
the brief said 25, the suite has 26).

Verification beyond the suites, because a green run only proves what the
suites see: every `buildCurvePayload` output was compared byte-for-byte
before and after the `translate.ts` commit on all 561 archetype households
plus 40 personal variants (SSDI, ESI, immigration, self-employment, MA/MD
child care, take-up off) × 4 option sets — 601 payloads, 0 differences; the
three probe payloads keep their key order; the recorded fixture requests
were rebuilt with today's builder (see fixtures, below). The `contract/`
suites are outside every tsconfig `include`, so `npm run typecheck` never
sees them; they were type-checked with the repo's own `tsc` from a
scratchpad tsconfig (0 errors) before the live run.

## Fixed

| File | What | Why | Commit |
|---|---|---|---|
| `core/src/testing.ts` and 9 test files | `NO_PROGRAMS`, `PointOver`, `point(earnings, net, over)` in `testing.ts`; the thirteen-program zero record and the `CurvePoint` literal were rebuilt in analyze, escape, evaluate (×4), cli (×2), fallback, maTafdc, coverage, pipeline/metrics and pipeline/build tests | `testing.ts` existed for exactly this and was used by two files. Every synthetic point now has one shape; the pins are untouched (values identical, `toEqual` is order-blind) | 5803301, b48f69a |
| `core/src/testing.ts`, evaluate/client/cli tests | `answersWith(over)` (validate the stock household with overrides, throw on rejection) moved from `evaluate.test.ts` into `testing.ts`; eight validate-or-throw copies replaced, three of them twelve-field literals that differed from `CA_SINGLE_ONE_KID` in three fields | Same household, one spelling | c9f0f28 |
| `core/src/archetypes.ts` + 11 files | `archetypeById(id)` (throws on an id no sweep builds) replaces 34 `ARCHETYPES.find((a) => a.id === …)!` | The `!` assumed what the helper now asserts; evaluate.ts, ten test files and both contract suites shared the idiom | 8da9426 |
| `core/src/client.ts` | `probeOnce(question, ask)` — one cache Map and one drop-on-failure rule for the three endpoint probes; `bareHousehold(state, vars)` for the one-person probe household the three built by hand; `readBack(body, entity, variable)` for the result reader two of them duplicated; `PROBE_SENTINEL` replaces `MA_TAFDC_PROBE_SENTINEL` and `CHILDCARE_SUBSIDY_PROBE_SENTINEL` (both 1,000,000; test-only importers, all in scope, updated); `payloadOptionsOf(opts)` replaces the three hand-derivations of `PayloadOptions` in `fetchCurve`, `fetchSplicedForSSDI` and `resampleMaTafdc`; `parseOrThrow` passes its options through (structural typing) instead of picking two fields; `fetchCurve`'s docstring was sitting on `RESAMPLE_CONCURRENCY` | The three probes were the same twelve lines three times; the option threading was the same derivation three times. Probe payloads are byte-identical (key order preserved) | cac00d6 |
| `core/src/analyze.ts`, `escape.ts`, `evaluate.ts`, contract test | `heldByHousehold` / `heldByAdults` / `heldByChildren` exported from analyze.ts (they were the private `HOUSEHOLD`/`ADULTS`/`CHILDREN`); `programs.medicaid - childPrograms.medicaid` was written six times across four files. `programTotal` and `childCoverageAt` likewise | Reuse the helper that exists | 810b691, 88b78ed |
| `core/src/evaluate.ts` | `magiBesidesEarnings(a)` for the spouse-pay + 12×(SSDI + unemployment) computed in three places, with the "child support is not MAGI" note beside one of them — now beside the helper; `pointAtOrBelow` for the last-sampled-point lookup written twice; `adultOnMedicaidAt` for the same threshold test in four places | Three copies of a load-bearing definition (which income the subsidy floor is tested on) is where they drift | 810b691 |
| `core/src/evaluate.ts` | Docs moved onto the functions they describe: Finding 5 sat on two helper lambdas, Finding 2 and its `WORKAROUND` marker on `medicareCoversWholeHousehold`, the premium-wrap `WORKAROUND` on `StatePremiumAssistanceSummary`. The "Medicare is coverage" comment in `applyCoverageGap` was written twice; once now | A `grep WORKAROUND` reader lands on the wrong function | 810b691 |
| `core/src/evaluate.ts`, `cli.ts` | `ENTITLEMENT_TAKE_UP` exported (was private `TAKE_UP`) so the CLI reads program ids from it instead of `"getsSnap".slice(4).toLowerCase()`; `withEveryEntitlement` and `unclaimedFrom`, which nothing imported, are no longer exported | A name derived by string surgery is a name that will lie | 810b691 |
| `core/src/translate.ts` | `person(vars)` applies `PERSON_VARS` once (was looped onto householder, spouse and each child in three copies); the ESI flags are defined once and applied to the householder like everyone else, and the two consecutive comments saying the premium figure is inert are one; the immigration-status map is a module constant instead of rebuilt per call | 601 payloads byte-identical before and after | 94d09e3 |
| `core/src/parse.ts` | `seriesOf<T>(entity, variable, count, isValue)` — the boolean `ma_tafdc_non_financial_eligible` reader re-implemented `series()`'s scalar-broadcast-or-array-of-count rule, error message included | Delete the copy | f7bd301 |
| `pipeline/src/run.ts`, `build.ts` | `reportGaps` (the gap listing was printed identically on both `main` paths); `resultsFromStateFile` and `buildStateFile` as `Object.fromEntries` | Same output | 8c68d31 |
| `contract/policyengine.contract.test.ts` | `post(body)` → `{ status, body }` for the ten hand-rolled `fetch(peUrl(), { POST, peHeaders(), JSON, 60 s })` blocks | −53 lines; every assertion kept | 6f287a7 |
| `core/src/stateChildcareSubsidies.ts` | `childcareSubsidyVariable` deleted with its self-test (444 → 443 tests); HotGap requests the aggregate, never a state's own variable, and nothing but the test called it. `CHILDCARE_SUBSIDY_STATES`' docstring claimed contract-test use it does not have | Dead code; a doc that lied | c8cb1f5 |
| `docs/upstream/2026-09-15-local-corrections.md` | The `tax_unit_is_filer` row appeared twice, the second as "no `WORKAROUND` comment" (translate.ts has had one since the flag landed); the county and Medicare rows said the same when `archetypes.ts` and `evaluate.ts` carry the marker; `probeMaTafdcDoubleCount` now carries the marker its row assumed, so `grep -rn WORKAROUND core/src` finds every row and the intro says so | The doc told readers to grep for a marker three rows claimed not to have | e5ac64a |
| `README.md` § Library shape | `statePremiumAssistance` and `unclaimed` — two `HouseholdEvaluation` fields the "it also returns" list did not name | Drift | e5ac64a |
| `fixtures/README.md` | Records that the Massachusetts request predates `takes_up_housing_assistance_if_eligible: false` by twenty minutes (81ea7f0, 2026-09-16), found by rebuilding both recorded requests with today's `buildCurvePayload`: CA matches to the byte, MA differs by that one key. The bodies are not touched | The README's "each request is what `buildCurvePayload` sends today" was true for one of two | e5ac64a |

## Not fixed, and why

| Finding | Where | Why not |
|---|---|---|
| The corrections chain is a real module hiding in `evaluate.ts` (`applyEmployerCoverage`, `applyMedicare`, `applyHeadStart`, `applyCoverageGap`, `applyStatePremiumAssistance`, `applyPremiumWrap`, ~330 lines under a clear name, `corrections.ts`) | `core/src/evaluate.ts` | `coverage.ts` writes `"code": "evaluate.ts applyCoverageGap"` (51 rows) and `"evaluate.ts applyStatePremiumAssistance"` (5 rows) into `core/data/summary.json`'s coverage block, and the README and the corrections doc cite `evaluate.ts` by name for these. Moving the functions either leaves those pointers lying or changes committed data on the next `--from-data` — a data change, not a cleanup. Do it together with a resweep, updating the `code` strings in the same commit |
| `client.ts` splits naturally into `endpoint.ts` (where the endpoint is, how a request reaches it, what model answers: config, `requestPE`, `modelVersion`, the probes, `modelRecord`) and `client.ts` (the curve: cache key, SSDI splice, MA feedback, `fetchCurve`), with no import cycle | `core/src/client.ts` (534 lines) | `engine/README.md` (four places) and `engine/app.py` name `core/src/client.ts` for exactly the transport pieces that would move, and `engine/` is another agent's scope this pass. The seam is real; do it when `engine/` is free and update those pointers in the same commit. The probe dedupe above took most of the value |
| `correctMaTafdc`'s two report messages share ~80% of their text and differ in one clause | `core/src/maTafdc.ts` | The messages are stored per Massachusetts archetype in `summary.json` (9 rows) and printed verbatim by the CLI and the site; composing them from parts without changing a byte is impossible because the shared sentence is worded differently in the two. Changing the text moves committed data |
| `reachCell` → `reachForArchetype` → `reachForHousehold` is a three-deep delegation chain of which only the last has a production caller | `core/src/reachLookup.ts` | `reachCell` is the designed seam for a margin-of-error display ("for callers that need to say how sure the number is") and both inner functions are tested and public. Collapsing them is an API removal with no caller asking for it |
| `hoursPerWeekAt`, `SGA_MONTHLY`, `MEDICARE_PART_B_MONTHLY`, `REACH_PERCENTILES`, `BENEFITS_END_MIN`, `DEFERRAL_UNTIL` are exported with no importer outside their own module and tests | various | Each is either a sourced constant (the monthly figures are the published numbers the annual ones derive from) or a documented threshold; un-exporting them shrinks nothing that matters. Left |
| `escapeAnalysis(points, analysis?)` falls back to `analyzeCurve(points, 0)` when no analysis is passed; only tests use the one-argument form | `core/src/escape.ts` | It is the public one-shot signature the README documents; the fallback is one line |
| `validateAnswers`' immigration-status check validates twice (`status()` returns the field name as an error sentinel, then `includes` is tested again) | `core/src/validate.ts` | Correct, tested, and the simplification is cosmetic; not worth touching validation logic for it |
| `worker/src/index.test.ts` still spells the validate-or-throw dance over `CA_SINGLE_ONE_KID` once | `worker/` | Out of scope; `answersWith` in `core/src/testing.ts` is ready for it (one-line change) |
| `coverage.ts` flattens every archetype's points twice per state (`Object.values(curves).flat()`) | `core/src/coverage.ts` | ~2,200 references per state, once per build; a per-archetype `every`/`max` reads worse for no measurable gain |

## Big O

Inputs: S = states (51), A = archetypes (11), P = points per curve (151–351,
see `axisSpec`), N = programs (13), R = Massachusetts points whose corrected
grant differs from upstream's (~30–64).

| Path | Input | Order | Status |
|---|---|---|---|
| `parsePEResponse` | P × N | O(P·N) — one pass per series, one record per point | inherent (output size) |
| `analyzeCurve` | P × N | O(P·N) cliff scan; runs twice per evaluation (`full`, `immediate`) by design | fine |
| `escapeAnalysis` | P × N | O(P·N): `lastAbove` per program, per age group | fine |
| `evaluateCurve` corrections chain | P | seven O(P) passes (`normalize`, TAFDC, ESI, Head Start, gap, assistance, wrap, Medicare) | fine; each is a `map` that copies only changed points |
| `esiSummary` / `unclaimedFrom` | P | O(P) (`pointAtOrBelow`; was `filter().pop()`) | fixed shape, same order |
| `fetchCurve` requests | household | 1 request (2 for SSDI), + up to 4 cached-per-endpoint probes, + R point requests for a Massachusetts household with children at `resampleConcurrency` in flight | documented and measured in `client.ts`; retires with policyengine-us #9477 |
| `evaluateHousehold` with an entitlement off | household | 2× `fetchCurve` (the all-take-up curve) | documented (`unclaimed`) |
| `curveCacheKey` | payload size K | O(K log K) — `canonical` sorts keys at every depth | fine |
| `buildSummary` | S × A × P | O(S·A·P): one `evaluateCurve` per cell; `unmodeled` is a second O(S·A·P) scan | fine, once per build |
| `stateCoverage` → `unmodeled()` | S | `childcareSubsidyUnmodeled.includes(state)` per state → O(S²) = 2,601 string compares | reported; a Set would fix it, not worth the type change |
| `stateCoverage` → `premiumAssistance`, `otherBenefits` | A × P | two `flat()`s per state, O(A·P) each | reported (see not-fixed) |
| `validateResults` | S × A × P | O(S·A·P) finiteness scan | fine |
| `runFromData` | S files | sequential `await readFile` × 51 (~600 KB each) — serial I/O, O(S) | reported; `Promise.all` would parallelise, but the pass is ~100 ms and runs weekly |
| `writeOutputs` | S | one `readExistingJson` + deep-equal per state, O(S · file) | fine |
| `mergePartial`, `sameIgnoringGenerated` | file size | O(size) deep-equal | fine |
| `reachPercentile` | ladder (21) | O(21) | fine |
| `axisSpec`, `zip`/`county` lookups, `stateDefaults` | — | O(1) after the first cached read | fine |

Nothing superlinear in P; nothing runs more than once per build; the only
per-point network cost is the Massachusetts feedback loop, which is bounded,
measured, and self-retiring.

## Before / after

Lines (`wc -l`, files that changed):

| File | Before | After | Δ |
|---|---:|---:|---:|
| `contract/policyengine.contract.test.ts` | 560 | 507 | −53 |
| `core/src/evaluate.test.ts` | 756 | 727 | −29 |
| `core/src/cli.test.ts` | 136 | 114 | −22 |
| `core/src/client.ts` | 551 | 534 | −17 |
| `core/src/client.test.ts` | 515 | 500 | −15 |
| `core/src/analyze.test.ts` | 305 | 291 | −14 |
| `core/src/escape.ts` | 141 | 129 | −12 |
| `core/src/escape.test.ts` | 176 | 165 | −11 |
| `core/src/stateChildcareSubsidies.test.ts` | 49 | 39 | −10 |
| `pipeline/src/build.test.ts` | 186 | 180 | −6 |
| `pipeline/src/run.ts` | 273 | 267 | −6 |
| `pipeline/src/metrics.test.ts` | 52 | 47 | −5 |
| `core/src/coverage.test.ts` | 158 | 154 | −4 |
| `core/src/stateChildcareSubsidies.ts` | 81 | 77 | −4 |
| `pipeline/src/build.ts` | 132 | 128 | −4 |
| `core/src/maTafdc.test.ts` | 102 | 99 | −3 |
| `core/src/fallback.test.ts` | 87 | 86 | −1 |
| `docs/upstream/2026-09-15-local-corrections.md` | 321 | 320 | −1 |
| `core/src/translate.ts` | 387 | 387 | 0 |
| `core/src/parse.ts` | 277 | 277 | 0 |
| `core/src/analyze.ts` | 334 | 339 | +5 |
| `core/src/evaluate.ts` | 763 | 769 | +6 |
| `core/src/archetypes.ts` | 131 | 138 | +7 |
| `fixtures/README.md` | 53 | 60 | +7 |
| `README.md` | 513 | 522 | +9 |
| `core/src/testing.ts` | 42 | 64 | +22 |
| **Scope total** (core/src, pipeline/src, contract, the three docs) | **11,866** | **11,705** | **−161** |

The growth is where the sharing landed (`testing.ts`, `archetypes.ts`,
`analyze.ts`) and in the two docs that gained the notes above. `evaluate.ts`
is +6 for two helper docstrings that replaced three copies of a comment.

Tests: 444 → 443 unit tests passing (the one removed was the self-test of
the deleted `childcareSubsidyVariable`; every other test and every pin is
unchanged), 26 skipped locally as before; live contract 26/26.

## Worktree note for the next auditor

In a worktree the repo-root `node_modules/@hotgap/*` symlinks resolve to the
main checkout's packages, so `pipeline`, `app` and `worker` compile and test
against main's `core`, not the branch's. Untracked worktree-local links
(`node_modules/@hotgap/core -> <worktree>/core`, one per workspace) fix it;
they are gitignored and were used for every run above. The `contract/`
suites are outside every tsconfig and need their own `tsc` pass.
