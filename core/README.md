# @hotgap/core

The calculation library behind every HotGap surface: answer validation, the
PolicyEngine request and response, cliff and escape analysis, reach, and
minimum-wage context. It also holds the committed data (`core/data/`,
described in [docs/data.md](../docs/data.md)) and the `hotgap` CLI.

Why the numbers come out the way they do — what is modeled, what is
corrected locally, and what is left out — is in
[docs/methodology.md](../docs/methodology.md).

## CLI

Run from the repository root:

    npm install
    npm run hotgap -- curve --state CA --kids 3,7 --earnings 30000 --offline                             # simplest usage; committed archetype curve, no network
    npm run hotgap -- curve --zip 94110 --kids 3 --rent 1500 --childcare 600 --earnings 30000 --offline
    npm run hotgap -- curve --state TX --married --kids 1,4,9 --earnings 42000 --offline                 # committed archetype curve, no network
    npm run hotgap -- curve --state CA --age 45 --disabled --ssdi 1500 --child-support 400 --earnings 15000   # live call; modeled as already on Medicare, splices the marketplace-vs-none check at the 2026 SGA ($20,280)
    npm run hotgap -- curve --state CA --married --kids 4,8 --earnings 60000 --employer-coverage --hours 40   # live call; MEPS-IC employee premium replaces the marketplace charge; --hours must clear the 30-hour floor (26 U.S.C. 4980H(c)(4)) for a contribution to be charged
    npm run hotgap -- curve --state CT --kids 3 --childcare 1416 --childcare-subsidy --hours 40 --earnings 25000   # live call; the CCDF childcare subsidy, added to net income in the 28 states PolicyEngine leaves it out of
    npm run hotgap -- curve ... --json                                                                   # full HouseholdEvaluation
    npm run hotgap -- summary --state CA                                                                 # weekly sweep metrics

Flags: `--state` / `--zip` / `--county`, `--age`, `--married` /
`--spouse-age`, `--kids` / `--kids-disabled`, `--disabled` /
`--spouse-disabled`, `--rent`, `--childcare`, `--earnings` or `--pay` /
`--unit` / `--hours`, `--spouse-earnings`, `--ssdi` / `--child-support` /
`--unemployment` (monthly, other income), `--head-start` / `--housing` /
`--childcare-subsidy` / `--employer-coverage` (take-up, default: not
received), `--offline`, `--json`.

Without `--offline`, a call goes to `HOTGAP_PE_URL` if set (see `.env.example`),
else to the public PolicyEngine API.

## API

- `validateAnswers(input)` — `unknown` → `HouseholdAnswers` (or a reason);
  also validates the four extra inputs below: three non-wage-income ones
  (each optional, default 0) and `hoursPerWeek` (optional, 1–80 when given).
  An optional `zip` resolves the state and county (`resolvePlace`, the one
  rule the CLI's `--zip`, the site's API and its ZIP field share): a given
  state must agree with the ZIP's, a given county wins over the ZIP's
- `buildPEPayload(answers)` — `HouseholdAnswers` → PolicyEngine request
- `buildCurvePayload(answers)` — the request with sourced per-household
  parameter overrides; used by `fetchCurve` and the weekly sweep
- `fetchCurve(answers)` — the curve via the public
  [PolicyEngine](https://policyengine.org) API; when `ssdiMonthly > 0` this
  is two requests spliced together (see SSDI in [methodology](../docs/methodology.md#inputs-to-policyengine))
- `analyzeCurve` — cliffs, danger zones, safe exit, the leap. Each `Cliff`
  carries a `breakdown` (benefits, credits, premiums, other — state
  refundable credits count as `credits`, not `other`) that sums to its
  `drop` exactly, and a `driver` naming the breakdown component that
  explains the most of it for a cliff with no nameable program.
  `programsLost` names a program only when it ends or loses more than half
  its value in that one step FOR SOME GROUP that holds it — the household
  total, or, for a person-level program, adults and children checked
  separately, so a parent losing Medicaid while the children keep theirs is
  still named — and a phase-down (EITC's 15.98%/21.06%, SNAP's 24%/36%)
  never qualifies. A `deferral` marks a cliff whose cost lands at a future
  renewal rather than with the raise that causes it — see `deferred`, below
  — with one of three reasons and its citation: Head Start's program-year
  carry-over (45 CFR 1302.12(j)(1)), a child's 12 months of continuous
  Medicaid/CHIP eligibility (42 CFR 435.926 / 457.342), or a parent's
  Medicaid converting to Transitional Medical Assistance (§1925 of the
  Social Security Act, 42 U.S.C. 1396r-6)
- `escapeAnalysis` — the whole-curve safe exit and leap, plus
  `programEndsByAge` (adults and children reported separately, since a
  parent's Medicaid usually ends at a much lower income than a child's),
  `childCoverageEndEarnings` (deferred by the federal 12-month
  continuous-eligibility rule — crossing it does not end a child's coverage
  the same year), and `benefitsEndEarnings` (money only, never a
  Medicaid/CHIP sticker value). `programEnds.ctc` reads the TOTAL child tax
  credit, not just the refundable series a cliff's own `programsLost` and
  `breakdown.credits` are built from — the refundable amount usually reaches
  zero where a rising tax bill absorbs the credit, not where the family
  loses it, so reporting that point as "ctc ends" told a family it had lost
  a credit it still had in full
- `reachForHousehold` — where an income falls among real households, on the
  same householder-plus-spouse earnings basis the ladders are built on;
  `reachAtEarnings` does the one conversion every caller needs, adding the
  spouse's fixed pay back to a figure taken off the earnings axis
- `povertyRoad` / `keepRate` / `cliffsBetween` / `roadSummary` / `keepNext`
  (`road.ts`) — the road out of poverty and what a household keeps walking
  it, in cents per extra dollar ([methodology](../docs/methodology.md#honesty)). `roadSummary` also says how
  many families like this one earn less than the road's top, and every
  `Cliff` gains a `position` saying the same of the pay its step starts at
- `minWageContext` — hours-a-week-at-minimum-wage framing
- `evaluateHousehold(answers)` — the one-shot: all of the above in order,
  with an offline archetype-curve fallback when the live API fails. It also
  returns:
  - `personal` — this household's *own* zone-relative path: the danger zone
    it's actually in (if any), where that zone ends, and the raise needed to
    clear it — distinct from `escape.safeExitEarnings`/`escape.leap`, which
    answer "where does this state's worst zone end" rather than "how far
    does this household have to go"
  - `coverageGap` — the earnings band, if any, where this household has no
    Medicaid, no premium subsidy, and no employer plan (the phantom
    benchmark premium is removed from the curve over that band)
  - `headStart` — the program's PolicyEngine sticker value alongside what it
    is actually worth to this family: the higher of their own reported
    childcare cost or the state's own market price for a preschool slot (DOL
    National Database of Childcare Prices), capped at the sticker value —
    since a family paying $0 for childcare because the Head Start slot IS
    the childcare still gains the market value of a full-day placement, not
    $0
  - `maTafdc` — whether the local Massachusetts cash-assistance correction
    was applied and whether PolicyEngine recomputed the linked benefits
    with the corrected grant (it does for live curves and the current sweep)
  - a `curve` where an employer-coverage household's health cost has already
    been replaced with the MEPS-IC employee contribution in place of the
    marketplace premium PolicyEngine would otherwise charge (live curves
    only — the committed archetype sweep never models ESI)
  - `deferred` — the subset of `analysis.cliffs` that lands at a future
    renewal rather than with the raise that causes it (see `analyzeCurve`'s
    `deferral`, above). It is a **label**, not an exclusion: since
    2026-09-17 `analysis` is read off the real curve, so a deferred loss
    counts in the verdict, the danger zones, the leap, the safe exit and
    every summary metric, and `deferred` only says which of the counted
    cliffs land later and under which rule (the badge's data — when, and
    the citation). The owner's rule: the family will lose that money, and
    the tool exists to show the impact of a raise, so the impact is the
    figure and the timing is a clause beside it. HotGap no longer keeps a
    second, lifted reading of the curve anywhere
  - `esi` — the employer-plan tier (`single` / `plusOne` / `family`, AHRQ
    MEPS-IC 2024) and dollar contribution charged at this household's own
    earnings, following who the plan has to cover: a per-adult Medicaid
    guard (an adult already on Medicaid does not need the plan) and a
    30-hour eligibility floor (26 U.S.C. 4980H(c)(4)) below which no
    employer owes a plan at all
  - `premiumWrap` — the state's own $0-premium marketplace tier this
    household's curve fell inside, if any (Connecticut, Massachusetts, New
    Mexico, California — see [methodology](../docs/methodology.md#honesty))
  - `statePremiumAssistance` — the state's own marketplace premium help as
    PolicyEngine modeled it, netted out of the premium here, when the endpoint
    served the variable (California, New Mexico, Maryland, Colorado, Vermont
    on the self-hosted engine; null on the hosted API, where the ladder above
    stands in)
  - `unclaimed` — for each entitlement the household said it does not get
    (`getsSnap`, `getsTanf`, `getsMedicaid`, `getsWic` false), what it would
    pay at current earnings on a second curve with every take-up on; empty
    when nothing off would pay, null on the offline path
- `loadSummary` / `loadStateFile` — read the committed weekly-sweep data

## Running outside Node

Nothing in the library imports a Node builtin statically, so the same
modules bundle for a Cloudflare Worker (`worker/`) or a page (`app/`). Three
seams cover what the environment has to supply:

- **Data.** `readData` serves the in-memory cache first and reads
  `core/data/` from disk only where `process.getBuiltinModule("node:fs")`
  exists (Node ≥ 22.3). Anywhere else, `provideData({ "reach.json": … })`
  hands it the parsed tables — a Worker bundles the four small ones and
  fetches a state file from its static assets on demand
  (`EvaluateOptions.loadStateFile`, called only on the fallback path).
- **Endpoint.** `configurePolicyEngine({ url, token })` sets what
  `HOTGAP_PE_URL` / `HOTGAP_PE_TOKEN` set on Node; a set value wins, an empty
  one defers to the environment.
- **Hashing.** `curveCacheKey` is async and uses Web Crypto (`sha256Hex`),
  the same digest on every runtime.
