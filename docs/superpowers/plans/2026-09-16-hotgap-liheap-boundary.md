# HotGap LIHEAP Boundary Implementation Plan (Plan 7)

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax; each phase lands as its own reviewed merge; every number carries publisher, URL, vintage and the date read (README § Honesty). Run every check through the project's runners (`npm run typecheck`, `npx vitest run`, `npm run contract`, `cd app && npx playwright test`).

**Goal:** Show a family where energy assistance (LIHEAP) stops — the income above which they can no longer apply in their state, what it is worth if they get it, and how many eligible households actually do — without drawing a benefit into the money line that most eligible families never receive. Where the state's real schedule is modeled, let the family switch it on.

**Owner directive:** "Why don't we have liheap?" → research (`docs/research/liheap-cliff-2026-09-16.md`) → "write an implementation plan for the liheap thing".

**What the research settled (verified 2026-09-16, re-verified on the droplet at policyengine-us 2.6.2):** nobody has rolled the cliff up; the Clearinghouse has the FY2026 rules (HTML/PDF only); ~12% of income-eligible households are served nationally (TX 3% … MI 85%); the shape is a staircase ending in a notch almost everywhere, flat in a few states, a taper in Michigan; upstream models DC, MA, IL fully and none reaches `household_net_income`; **Michigan's heating money is a refundable state credit that HotGap already counts** ($180.38 for a single parent of two at $20,000, net income moves by exactly that when forced to zero).

## The load-bearing honesty rule

LIHEAP is a block grant, not an entitlement: a family at the limit is eligible to *apply*, and in most states fewer than one in four eligible families is served. So HotGap never draws LIHEAP dollars into the curve by default. The default is a **boundary marker** outside the money line — "Above $X you can no longer apply for energy assistance in Ohio. It is worth $24–$441 a winter if you get it; about 2 in 10 eligible households here do." — with every figure sourced. The dollars enter the curve only behind a **take-up toggle** ("I get energy assistance"), default off — the same rule HotGap already applies to housing vouchers and the child-care subsidy, whose take-up is comparably low. With the toggle on they enter in every state, because the cliff is the aggregate: a family that has energy assistance and loses it in the same step as SNAP loses both, and the tool exists to show that step's total. The served share is the one honest probability and it is always printed next to the amount.

## Decisions (the research's ranked options, amended on review)

1. **Marker by default, everywhere the household's income range crosses the state's heating limit.** The research's option (c). Never retires: it is the truthful representation of a non-entitlement.
2. **Toggle on top, in every state — because the cliff is the aggregate.** "I get energy assistance" is HotGap's existing take-up pattern (`getsHousing`, `getsChildcareSubsidy`), not a new kind of thing. When it is on, LIHEAP is a program series in the curve like SNAP: the state's schedule where upstream serves one (DC, MA, IL; MI is already in through the credit), and otherwise HotGap's own sourced table — the published amount for the family's band where the matrix is readable, else the top-band amount flat to the limit — dropping to zero above the limit. The drop lands in whichever $1,000 step holds the limit, so `analyzeCurve` counts it in that step's cliff, its `breakdown` and `programsLost`, exactly as it does for a SNAP loss in the same step. A family that loses SNAP and energy assistance in one step sees one number for both. Upstream's LIHEAP variables are not on `household_state_benefits`, so the toggle path adds the amount to net income the way the child-care subsidy was added before #9503 — a marked WORKAROUND with an upstream issue to retire it; the HotGap table retires per state as upstream's schedule is served.
3. **Average benefit as a notch (option b) is not built.** Wrong shape, wrong probability.
4. **The heating component is the marker's; cooling and crisis are named, not drawn**, in v1. Four states set different limits per component (IA, MI, NC, OH); Texas's cooling is the larger program. Revisit after v1 with the served shares per component.
5. **60% SMI comes from upstream's parameter**, `gov/hhs/smi/amount.yaml` (four-person SMI by state through FY2027) with `household_size_adjustment.yaml`, pinned to a commit — not the ACF PDF the research could not fetch. FPG comes from HotGap's own `fpl2025` (FY2026 LIHEAP uses the 2025 guidelines: $26,650 for three).
6. **Michigan's coverage note is fixed first, on its own**, because it is wrong today. The full credit assumes heat is not included in rent (PolicyEngine's default; the credit halves otherwise) — the note says so, and the editor gains the input in Phase 3.

## Data

### `core/src/liheap.ts` — the 51-row boundary table (hand-read, sourced per row)

The Clearinghouse tables are HTML and PDF, so this is a sourced TypeScript table in the `statePremiumWraps.ts` style, not a builder. One row per state:

| field | what | source |
|---|---|---|
| `state` | | |
| `heating.limit` | `{ kind: "fpg", pct: 150 }` or `{ kind: "smi", pct: 60 }` or `{ kind: "smi-by-size", pct: [39, …, 60] }` (MD) | Clearinghouse income-eligibility table, FY2026 (updated 2025-12-15, "Source: FY 2026 State Model Plans") |
| `heating.sizeRule` | e.g. `{ aboveSize: 8, kind: "fpg", pct: 150 }` for the nine states that revert above a household size; null otherwise | same table's caveats |
| `heating.topBand` | `{ min, max }` published amounts at the top income band (the notch is the *minimum*), or null where the state publishes no matrix | the state's FY2026 benefit matrix (Clearinghouse `docs/2026/benefits-matricies/`) |
| `heating.bands` | the staircase where the matrix gives one by income band alone — `[{ uptoPct, amount }]` (TX 50/75/150% FPG → $1,800/$1,500/$1,200; MA six columns) — or null where the amount depends on fuel, points or burden (then Phase 3 uses `topBand.min`) | the matrix |
| `heating.shape` | `"notch" \| "staircase" \| "points" \| "taper"` | the matrix |
| `cooling`, `crisis` | limit only, where it differs from heating; else null | income-eligibility table |
| `servedShare` | households served ÷ income-eligible households, FY2024, or null | ACF FY2024 state profile (`liheappm.acf.gov/…/profiles/2024/FY2024_<State>_Profile.pdf`) |
| `upstream` | the policyengine-us variable that models the schedule (`ma_liheap`, `dc_liheap_payment`, `il_liheap`; MI: `mi_home_heating_credit` with `counted: "state credit"`), or null | `programs.yaml` |
| `source`, `readOn` | the exact page/file read, ISO date | per row |

Tests: 51 rows, every state once; every `pct` within the statutory floor/ceiling (110% FPG … max(150% FPG, 60% SMI)); every row has a source URL and `readOn`; `topBand.min ≤ max`; the five research states pin their figures (TX $1,200 top band at 150% FPG; MA $355 at 60% SMI; MO flat $318–$495; IA points; MI taper); the sum of `servedShare` rows present ≥ 40 (the rest reported as unread).

### `core/data/smi.json` — 60% SMI by state and size, FY2026

`scripts/build-smi.mjs` fetches upstream's two YAML files at a pinned commit (recorded in the file with the ACF IM the parameter cites as the publisher), emits `{ read, source: { commit, url, acf }, states: { ST: { fourPerson, adjustment } } }`. A test pins MA and MO (research § 3: MA size 3 = $83,641, MO size 3 = $55,056) so the size arithmetic is checked against two independently published figures.

## Core

### Phase 0 — Michigan note (now, separate merge)

- [x] `core/src/coverage.ts` `unmodeled()`: the LIHEAP entry becomes per state — MI: *counted* ("Michigan pays its heating assistance as the refundable Home Heating Credit; PolicyEngine models it and HotGap counts it in state credits, assuming heat is not included in rent — the credit halves when it is"); DC/MA/IL: "PolicyEngine models the schedule but it does not reach net income; HotGap does not yet show it" (until Phase 3); all others: today's note.
- [x] `coverage.test.ts`: MI's LIHEAP row is not in `unmodeled`; it appears under `corrections` as `{ applies: false, source: "in net income", program: "Home Heating Credit" }`.
- [x] `--from-data` rebuild; every metric byte-identical; only MI's coverage block changes.

### Phase 1 — the boundary in the evaluation

- [x] `core/src/liheap.ts`: the table (above) and `liheapBoundary(answers, curve): LiheapBoundary | null` — resolves the household's limit in dollars (`householdSize` → FPG via `fpl2025(state, size)` or SMI via `smi.json` with the size adjustment; `sizeRule` applied), and returns `{ earningsLimit, component: "heating", topBand, shape, servedShare, upstream, source }` when the limit lies inside the curve's earnings range, else null. Pure; no request.
- [x] `HouseholdEvaluation.liheap: LiheapBoundary | null`, computed in `evaluateCurve` after the corrections (it reads the answers and the axis only, so it runs on both the live and archetype paths). With the toggle off it is **not** a `Cliff`, not in `programEnds` (that convention is the last earnings at which a program *received* is still received), not in `dangerZones`, not in any metric: there is nothing to lose. With the toggle on (Phase 3) the amount is a program series and the loss is counted by the ordinary cliff math; the boundary object is still returned, and its copy changes to "this is where it ends".
- [x] `pipeline/src/metrics.ts`: unchanged — the summary carries no LIHEAP metric (a boundary is not a measure). `summary.coverage[ST]` gains `liheap: { limitKind, topBand, servedShare, upstream }` from the table so the journalist page can name it per state without loading the table.
- [x] `coverage.ts`: the LIHEAP `unmodeled` row becomes a `corrections.liheap` note: "eligibility boundary shown; amount not in net income" (or MI's counted note).
- [x] Tests: TX single-2 boundary at $39,975 with top band $1,200 and `servedShare` 0.03; MA at $83,641 (SMI); a household whose size trips MD's sliding scale; a curve that ends below the limit → null; the archetype path returns the same boundary as the live path for the same answers.
- [x] `docs/upstream/2026-09-15-local-corrections.md`: a row (what, where, retires when: never for the marker; per state for the amount).

### Phase 2 — the pages (after the design brief)

The design system has no component for "a boundary you never crossed": IncompleteMarker is a data gap, DeferredBadge is a later loss, the one convention is where a received program ends. Phase 2 starts with a **design brief** (`design/`, an inventory entry — working name *EligibilityBoundary*), reviewed the way the audit was, before any page code:

- [ ] Inventory entry: what it says (the three facts: the limit, the worth-if-received range, the served share as "about N in 10"), where it sits on each surface (citizen: one line under the curve's key, in the citizen register, and a tick on the x-axis with no drop drawn; caseworker: a ThresholdLedger row tagged *if you apply* with the cite; journalist: a column in the state block and a CSV pair `liheap_limit`, `liheap_served_share`), and what it must never do (draw a drop, enter a ranking, appear as a cliff count).
- [ ] Copy through each surface's copy module (languages rule, `app/README.md` § Languages): the served share is a plural-aware message; core emits the code and parameters.
- [ ] Citizen, caseworker, journalist pages: render from `evaluation.liheap` / `coverage[ST].liheap`; e2e per page pins the TX and MA renders; the places CSV gains the two columns with provenance.
- [ ] Visual review (the `frontend-design` skill, B/S/N doc) before merge, as for every surface.

### Phase 3 — the take-up toggle: LIHEAP in the money line, in every state

- [x] `HouseholdAnswers.getsEnergyAssistance: boolean` (default false), `flags.ts` `--energy-assistance` / `?energy-assistance=`, editor chip in the take-up group; the marker's copy (Phase 2) invites it: "If you get energy assistance, turn it on to see it in your line."
- [x] `core/src/liheap.ts` gains the amount: `liheapAmount(answers, earnings): number` — upstream's schedule is not needed here; from the table, the published amount for the family's band where the matrix was read into the row (`bands: [{ uptoPctOfBase, amount }]`, TX/MA/IA-style staircases), else `topBand.min` flat to the limit; zero above the limit; zero when the toggle is off. Annual, one season.
- [x] `translate.ts`: when the toggle is on and the state has `upstream`, request the variable (DC/MA/IL); for MI, `mi_home_heating_credit_heat_included_in_rent` from a new answer `heatInRent` (default false, PolicyEngine's) so the credit halves honestly.
- [x] `parse.ts`: a new `ProgramId` `"liheap"`, read from the state's variable where requested; **added to net income** (upstream's LIHEAP variables are not on `household_state_benefits` — the #9405 shape), gated by `ParseOptions.liheapCounted` from a probe (`probeOnce` in `client.ts`: force the variable to a sentinel on a bare MA household and read `household_state_benefits` back), so it retires by itself the day upstream lists them.
- [x] `evaluate.ts` `applyLiheap` next to `applyPremiumWrap`: where the endpoint served no schedule, add `liheapAmount` to `programs.liheap` and `netIncome` at every point — on the live path only (the archetype sweep runs every take-up off, like housing). Then the existing `analyzeCurve` finds the drop at the limit and attributes it: no new cliff logic.
- [x] Program phrases (M3: "energy assistance"), `CASH_PROGRAMS`, StepList/ThresholdLedger naming, the one convention (`programEnds.liheap` is now a real end). `unclaimed`: keep LIHEAP **out** of `withEveryEntitlement` — the second curve says what a family would have "if it claimed", and with served shares under 30% that is not a claim HotGap can make; the marker's served share is the honest version.
- [x] Tests: TX single-2 with the toggle on — `programs.liheap` $1,200 at $39,000, $0 at $40,000, the $39k→$40k step's cliff `programsLost` contains `"liheap"` and its `breakdown.benefits` grew by exactly $1,200 over the toggle-off curve; a state whose limit coincides with a SNAP end shows one cliff with both; MA on the droplet uses `ma_liheap` (probe) and the table is not applied; toggle off → identical to today byte-for-byte.
- [x] Contract test: the probe's answer pinned per endpoint (false today on the droplet); the MA schedule at three band edges against `ma_liheap` live.
- [x] Upstream issue: "list the LIHEAP variables on `household_state_benefits`" with the CT-style evidence (net income does not move when `ma_liheap` is forced to zero). Retirement conditions recorded in the corrections table: the probe retires the addition; a served upstream schedule retires that state's table amount.

### Phase 4 — upstream contributions (optional, later, one state per PR)

Missouri first (flat by fuel — the simplest matrix, and the research already has the DOCX), then Texas's completion (FY2026 caps match FY2024–25 by accident). Each follows upstream's DC/MA/IL pattern; each, once served, moves that state's row from marker-only to toggle-capable by changing one `upstream` field. Not scheduled: six state PRs were closed stale upstream in February; the marker does the honest job without them.

## Order and effort

| Phase | Depends on | Size | Lands as |
|---|---|---|---|
| 0 Michigan note | — | hours | one commit + `--from-data` |
| 1 Table + SMI + boundary | 0 | 2–3 days (the 51 rows and 51 profiles are hand-read; the SMI builder and the boundary function are small) | one merge; resweep not needed (no curve changes) |
| 2 Design brief + three pages | 1 | 2–3 days incl. review | design first, then one merge per page |
| 3 Toggle, all states | 1 | 3 days (the band amounts join the Phase 1 rows; the `ProgramId` touches fixtures' pins only through new fields) | one merge + a contract pin + an upstream issue |
| 4 Upstream MO/TX | 3 | per state | PRs on the fork |

Yearly refresh: December (Clearinghouse limits and matrices, from the new Model Plans), May (ACF profiles, served shares). Recorded in the table's header the way `statePremiumWraps.ts` says to re-read every bound when the policy year moves.

## Open questions to resolve in Phase 1, not before

1. **Which limit for which family** (research Q4): heating in v1; note cooling and crisis by name where their limits differ.
2. **Households above the size caveats** (9 states revert to 150% FPG above 8+): the personal path allows up to 8 people — the `sizeRule` field covers it; the archetypes never reach it.
3. **Served-share vintage**: FY2024 profiles are the last complete set found; FY2025 preliminary data are loaded but not at the same URL pattern. Use FY2024, name the vintage, revisit in May.
4. **Michigan's heat-in-rent**: default false (PolicyEngine's), the note says so, Phase 3 asks.
5. **The Clearinghouse's Colorado link serves Delaware's matrix** — read CO from its Model Plan instead, and tell the LIHEAP Webmaster.

## What this does not do

- No LIHEAP dollars in the money line without the toggle, in any state, ever. With the toggle, in every state — a family that says it gets energy assistance sees the loss counted in the same step as everything else it loses there.
- No composite "energy burden" score, no ranking by LIHEAP, no LIHEAP metric in `summary.json` (design § What was deliberately left out).
- No claim about the odds of *being served*: "about N in 10 eligible households here do" is a served share, stated as such (the same discipline as reach: cross-sectional, never a probability for this family).
