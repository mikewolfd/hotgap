# HotGap — Design

**Date:** 2026-07-11
**Status:** Approved and shipped (sections 1-4; the places door's visuals were iterated against real pipeline data before merge, per the note under section 2)
**Repo:** github.com/mikewolfd/HotGap (fresh, no commits at design time)

## Mission

A public website where someone with a 5th-grade education can understand their own
benefits cliff — "if I get paid this much, I lose this much" — and where anyone can
see which states (later counties/cities) have better or worse benefits gaps.

The product's core question: how hard is it to get off public benefits safely, and
at what thresholds?

Dual identity, per owner: **public good / civic tool** and **portfolio / craft piece**.
Free, open source, no ads, no data collection beyond what the calculation needs.

Success criteria:
- A first-time visitor on a cheap phone gets a plain-language answer about their own
  situation in under two minutes.
- The places map shows something no existing tool shows: a geographic comparison of
  cliff severity.
- The site is beautiful and novel enough to stand as a craft piece.

## Prior art (deep-research, 2026-07-10)

- **PolicyEngine CliffWatch** (policyengine.org/us/cliffwatch, MIT frontend, AGPL engine):
  single-household net-resources curve with cliff/dead zones. Wonk audience, no geographic
  comparison, not plain-language.
- **Atlanta Fed CLIFF suite + Policy Rules Database** (GPL-3.0, R): caseworker tools,
  county-level cost data, composition charts. No heatmap, no EMTR chart, not consumer-facing.
- **HHS/NCCP EMTR calculator:** archived June 2026, 4 jurisdictions, dead end.
- **MyFriendBen:** production benefits screener built on PolicyEngine's API — proof the
  live-API pattern works.
- **Verified gap:** no tool offers geographic cliff comparison or a heatmap-style view;
  none targets a 5th-grade reading level.

## Decisions (from brainstorming, 2026-07-11)

| Decision | Choice |
|---|---|
| Front door | Two equal doors: "Check my benefits" and "Compare places" |
| Geographic depth | States in v1; counties/cities layered in where relevant/feasible |
| Advice level | **Show + explain.** Never tell users what to do. Estimate disclaimer always visible. |
| Mission | Public good / civic tool + portfolio craft piece |
| Architecture | **B: Live PolicyEngine API** for the personal door; precomputed batch for the places door |
| Process | Owner delegated remaining decisions; build/test/iterate/polish/review independently |

## 1. Personal door — "What happens if I earn more?"

One question per screen, big type, phone-first. Five questions:

1. **Where do you live?** — ZIP code (derives state now; county/city reserved for later)
2. **Who lives with you?** — single/married toggle, kids with ages
3. **What do you pay to live there each month?** — rent/mortgage; "not sure" allowed
4. **What do you pay for childcare each month?** — asked only if kids under 13; "none" allowed
5. **What do you make now?** — user picks the unit they think in: $/hour (+ hours/week), $/month, or $/year

Answers go through our proxy to PolicyEngine's API as a household with an
**earnings axis** (~101 points, $0–$100k employment income, single calculation call).
Client receives the full curve: net income plus per-program benefit amounts at each point.

Result page:
- **Headline in words first:** "If your pay goes up past $19/hour, you could **lose money**."
  Happy path: "Good news — earning more always helps you."
- **One picture:** the money curve. Danger zones shaded, "you are here" dot, program icons
  at each milestone (food / health / childcare / housing) showing what changes where.
- **"Why?" expanders** per program in plain words ("SNAP (food stamps) goes down about $30
  for every extra $100 you earn").
- **Honesty box, always visible:** "This is an estimate from public rules. Your caseworker
  decides your real benefits. Don't make a big choice on this number alone."
- Client-side math: cliff detection (net-income drops), danger-zone extents (ranges where
  net resources < current), effective marginal tax rate per segment. Narration is selected
  from a fixed template library keyed on curve shape — no free-form generated text.

## 2. Places door — the map and the gap score

*(Shipped: built and reviewed against the real weekly PolicyEngine sweep, not mockups —
see Plan 2, Tasks 16-19. Escape metrics — the leap, safe exit, and program thresholds —
added in Plan 3, Task 24.)*

The map exists to answer the product's core question at a glance: how hard is it to
get off public benefits safely, and at what thresholds? Three derived numbers carry
that answer, in increasing order of specificity:

- **Biggest possible loss:** the maximum drop in net resources a family like this can
  experience by earning more, in dollars. Survives a 5th-grade explanation. The map's
  original metric; still one tap away via the metric picker.
- **The leap** *(map default):* the size of the raise a family must clear in one move
  to get past the worst rough zone. Answers "how hard is it to escape" more directly
  than the raw loss figure, so it's the metric picker's default choice.
- **Safe exit and program thresholds** *(state drill-down only):* the earnings past
  which more pay is never a risk again ("safe exit" — or an honest "not found" when
  the sweep never reaches one), plus the earnings where each individual program (SNAP,
  Medicaid, TANF, etc.) stops. Computed from the same `escapeAnalysis()` math the
  personal door's "path off help" section uses, so the two doors can never disagree.

- **Choropleth US map** colored by the selected metric (leap or biggest loss) for a
  selected household archetype. Default archetype: single parent, two kids (most
  cliff-prone household). Picker offers 8 archetypes: {single, married} × {no kids,
  1 kid (age 3), 2 kids (ages 3 and 7), 3 kids (ages 1, 4, and 9)}.
- **Secondary metric — "danger zone width":** how wide the earnings range is where more
  pay means less money.
- **State drill-down:** the state's curve, its worst cliff, rank vs. neighbors (by
  whichever metric is selected), and the safe-exit/leap/program-threshold lines above.
- Counties/cities layer into the same pages later via housing-cost (HUD FMR) and
  childcare-rate joins in the batch pipeline; no site rework.

## 3. Architecture

```
[Browser: React SPA, static hosting]
   ├── Personal door ──► [Serverless proxy] ──► PolicyEngine API (axes calc)
   │                         └── response cache (KV, keyed on normalized inputs)
   ├── Places door  ──► static JSON (map scores, state curves)
   └── Fallback     ──► static JSON (per-state archetype curves)

[Batch pipeline: TypeScript (tsx), GitHub Actions weekly]
   └── emits: map scores per state×archetype, fallback curves, build metadata
```

**Deviation from the plan above (adjudicated by controller, 2026-07-11, recorded in Plan 2 Task
19):** the batch pipeline is a TypeScript package (`pipeline/`, run with `tsx`) that sweeps 51
states × 8 household archetypes through the same public PolicyEngine `/us/calculate` endpoint
and the same `@hotgap/shared` parse/analyze math the personal door uses, rather than a local
Python + `policyengine-us` engine. Rationale: 408 requests/week is negligible load on a public
API that other production screeners (MyFriendBen) already run against and that this repo's own
nightly contract test already exercises; it drops a heavy Python dependency from CI; and reusing
the exact shared math guarantees the map and the personal door can never disagree on a number.
Swapping in a local engine later is a pipeline-internal change, not a site-wide one.

- **Frontend:** React + Vite, static-exportable, mobile-first. Custom D3 chart and
  TopoJSON map — the chart is the craft centerpiece; no chart-library defaults.
- **Hosting:** One Cloudflare Worker with assets binding (serves static site + proxies API).
  Spec noted Pages + Worker; Workers-with-assets is the current recommended equivalent
  and one unified deploy unit. Free tier covers a civic-tool audience; swap-out is trivial.
- **Proxy:** the Cloudflare Worker. Holds PolicyEngine
  API credentials, translates the 5 answers into PolicyEngine household JSON, forwards the
  axes request, caches responses. If the public `/us/calculate` endpoint needs no auth,
  the proxy still exists for caching, input normalization, and schema-drift insulation.
- **Batch pipeline:** small TypeScript package in-repo (`pipeline/`, run with `tsx`); GitHub
  Actions weekly (`.github/workflows/places-data.yml`, Monday 07:00 UTC + manual dispatch);
  calls the same live PolicyEngine API and shared math as the personal door (see the deviation
  note above); commits updated data only when the sweep's output actually changed.
- **Fallback path: implemented as designed.** Live API failure on the personal door
  (`app/src/lib/fallback.ts`) picks the archetype closest to the household (married status +
  kid count, clamped to the pipeline's 0-3 kid archetypes) and fetches that state's precomputed
  curve; if it loads, the result page renders the normal verdict at the user's real earnings
  with an always-visible banner ("We could not get your exact numbers right now. These are
  numbers for a family like yours in your state.") and a working "Try again" that re-attempts
  the live API; if the fallback also fails, the existing plain-language error page shows. The
  site never white-screens.
- **License:** AGPL-3.0 for the whole repo.
- **Privacy:** no accounts, no analytics on household inputs; inputs never logged.

## 4. Program coverage & honesty

v1 surfaces the programs PolicyEngine models well: SNAP, Medicaid/CHIP, ACA premium tax
credits, EITC + CTC (federal and state), TANF, CCDF childcare subsidy, SSI, WIC, housing
assistance. State program depth is uneven (verified in research); where a state's program
isn't modeled, the UI says "we may not know about [state]'s childcare help yet" rather
than silently showing zero.

## 4a. Health-adjusted resources (Plan 4, 2026-07-11)

**Owner directive:** "fold coverage in, think about the real-world implications/cost one
would gain/lose, but be transparent about it." Both v1's headline curve and every downstream
consumer (analyze, escape analysis, narration, the pipeline, the map) now operate on money
left *after paying for health*, not raw cash net income.

**The measure:** every `CurvePoint.netIncome` is `household_net_income` (PolicyEngine's raw
cash figure) minus `spm_unit_medical_out_of_pocket_expenses` — the Census SPM's medical
out-of-pocket measure (MOOP): ACA/employer premiums net of subsidy, plus deductibles/copays/
other non-premium health spending. `CurvePoint.medicalOOP` carries that same subtracted
amount so it can be surfaced, not just baked in silently.

**MOOP vs. the Medicaid sticker value — why subtract cost, not add value:** the tempting
alternative — adding Medicaid/CHIP's actuarial (sticker) value as phantom income — overstates
the real stakes: a household doesn't receive that dollar figure as spendable cash, and losing
Medicaid eligibility does not usually mean losing coverage outright, it means shifting to
(often-subsidized) ACA marketplace coverage. Subtracting the honest, lived cost of coverage —
what the household actually pays out of pocket, whichever program applies — folds coverage
into the curve exactly as directed without inventing income nobody can spend.

**Verified finding (probed live against PolicyEngine, 2026-07-11):** for a Texas
single-parent-of-2 household crossing the Medicaid phase-out (~$36k→$42k), the Medicaid
*sticker* value drops about $23,610 — a number that, added naively, would manufacture a
dramatic cliff. The real MOOP over that same range barely moves ($1,175 → $1,937), because
subsidized ACA marketplace coverage cushions the loss. Three consequences ship in the
after-health curve:
1. Folding in the honest cost does **not** manufacture a fake Medicaid cliff where the real
   world has a soft landing.
2. It **does** surface the health cliffs that are genuinely real — the ACA's 400% FPL
   subsidy cliff and the 250% FPL cost-sharing-reduction loss — and it makes already-real
   cliffs *deeper* everywhere a household's own health spending rises at the same pay level
   a benefit already phases out (e.g. the CA fixture's $29k→$30k cliff, previously invisible,
   now shows up because Medicaid loss plus real ACA premiums/OOP compound the drop).
3. Childless adults, previously modeled as the one cliff-free archetype, are **no longer
   cliff-free**: once real health costs are folded in, they hit a health-coverage cliff too
   when Medicaid gives way to paid ACA premiums (see `PlacesPage.tsx`'s `ramp.max <= 0` guard,
   now dead code on current data but kept as an honest fallback).

**Transparency, shipped everywhere the curve appears (the load-bearing half of the
directive):** the personal door's chart title and y-axis label both say "after health costs"
(`result.chart.title`, `result.chart.yLabel` — the latter was an unused string before this,
see `docs/post-merge-notes.md`); the "path off help" section states the household's real
health cost at their current pay in plain dollars whenever it's nonzero
(`escape.healthCost`); the honesty box gains one sentence naming the adjustment and the
Medicaid-cushion finding (`result.honesty.health`); and the places-door drill-down's chart
carries the same title/label plus its own honesty-area note (`places.panel.healthNote`).
Medicaid/CHIP stay in the personal door's why-list as coverage received, in plain words —
never restated as a phantom cash amount.

## 4b. Reach metric (Plan 5, 2026-07-11)

**Owner directive:** "research data sources for income data … is it even possible to make
the jump?" The escape metrics (Plan 3) answer *how big* the leap out of a danger zone is;
reach answers a different question — *is that income even attainable, and for whom?* — by
overlaying the safe-exit income on the real distribution of household incomes for families
like that one, in that state.

**The load-bearing honesty rule:** reach is a **cross-sectional** signal — how many
households, right now, already earn at or above the escape income — **not** a probability of
any one family reaching it. That would need longitudinal earnings data (tracking real
families' pay over years), which this project does not have and does not claim to have.
Every reach string says "already earn" or "out-earn ~N% of families like this"; none ever
says "you can reach," "your odds," or "you could earn." A transparency note ships everywhere
a reach line can appear, naming the comparison explicitly: Census household income (ACS
PUMS), not anyone's chance of getting there.

**Data source and method:** the U.S. Census Bureau's ACS 1-Year PUMS **household** file
(`csv_h{state}.zip`, public domain, downloaded per-state) carries `HINCP` (household income),
`HHT` (household/family type), `NOC` (number of own children), and `WGTP` (household weight)
— enough to build an archetype's income distribution with no person-file join. The builder
(`scripts/build-reach.mjs`, controller-run, output committed) filters each state's households
to the pipeline's own married/kid-count archetypes (`single-N`: unmarried family household
with `NOC == N`, or living alone for N=0; `married-N`: married household with `NOC == N`),
builds a weighted, sorted list of `HINCP`, and emits a **percentile ladder** — income at
`p0, p5, … p100` (21 points) — into `app/src/data/reach.json`. Cells backed by fewer than 30
unweighted sample households store `null` instead of a shaky ladder (small-sample honesty).
`@hotgap/shared`'s `reachPercentile(ladder, income)` linearly interpolates an income's
position on that ladder into a 0–100 percentile.

**Where it surfaces:** both doors compute the archetype's safe-exit income
(`escapeAnalysis().safeExitEarnings`) and look up its percentile via `reachForHousehold`/
`reachForArchetype` (`app/src/lib/reachLookup.ts`, which reuses `pickArchetypeId` rather than
re-deriving the married/kid-count → archetype mapping). Personal door
(`escape.reach`/`escape.reachNever`, rendered in `EscapePath` right after the safe-exit line):
"Clearing the cliffs here takes about {income} a year. At that pay, you'd out-earn about
{pct}% of families like yours in {state}." Places-door drill-down
(`places.panel.reach`/`places.panel.reachNever`, `StatePanel.tsx`): "The income to get fully
clear here is more than about {pct}% of families like this earn." Three honest branches,
identical on both doors: a finite safe-exit with a real reach cell names the percentage; a
`null` safe-exit (never safe within the sweep) uses a static top-of-chart line with **no**
fabricated percentage, since there's no concrete income to look up; a `null` reach cell
(small sample) **omits the line entirely** rather than showing a shaky number. A transparency
note (`result.honesty.reach` / `places.panel.reachNote`) sits in each door's honesty area.

## 5. Language, errors, testing

- **Reading level:** every user-facing string ≤ 5th grade, enforced by a Flesch-Kincaid
  CI gate over the externalized strings file. Spanish is a translation task, not a rewrite.
- **Numbers in human units:** $/hour and $/month. Never "annual AGI."
- **Triple encoding:** icons + color + words for every semantic. WCAG AA, colorblind-safe.
- **Errors:** invalid ZIP → gentle re-ask; API timeout (>6s) → fallback curve + banner;
  nightly contract test against the live PolicyEngine API catches schema drift.
- **Tests:** unit tests for cliff-detection/EMTR math and narration selection (curve shape →
  which headline); contract test for the API; Playwright smoke through both doors;
  readability CI gate.

## Out of scope for v1 (v2 candidates)

- County/city resolution (HUD FMR + childcare market-rate joins)
- Spanish localization (architecture ready day one)
- Policy-reform overlay ("what would this proposed law do to the map")
- Shareable result cards
- UK (uk-cliff-watch exists; not our fight yet)

## Open questions carried into implementation

1. **ANSWERED:** No auth required for `/us/calculate`; verified live 2026-07-11; contract
   test pins the API shape including HTTP 400 + status:"error" validation errors.
2. Whether housing assistance modeling in policyengine-us is reliable enough to display
   per-state, or gets the "we may not know" treatment.
3. **ANSWERED:** Final visual language for the map — a computed, validated sequential clay-red
   ramp (5 quantized bins), reviewed against the real weekly pipeline data (Plan 2, Task 18).
