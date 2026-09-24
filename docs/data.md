# Data files and sources

Everything the library reads at runtime is committed under `core/data/`. Each
file below says where it comes from and how to rebuild it.

- `summary.json`, `states/{ST}.json` — the weekly 51-state × 11-archetype
  PolicyEngine sweep, each archetype now a typical renter in the state's
  most populous county (see `state-defaults.json`, below) rather than a
  household with no rent and no county at all. Each curve's axis runs past
  400% of the 2025 poverty line (plus $40,000 of room to recover) for the
  household's own size, at $1,000 steps up to $350,000 and coarser only
  beyond that — so the top of the axis is $150,000 (151 points) for a
  household of one to three in the 48 contiguous states (Alaska and Hawaii,
  whose guidelines are higher, get longer axes),
  $170,000 (171 points) for four, $195,000 (196 points) for five, and wider
  still for larger households, rather than one flat axis clipping the ACA
  subsidy cliff off the top of a bigger family's chart (see `axisSpec` in
  `core/src/translate.ts`). `summary.json` carries `leapIsLowerBound` per
  archetype: true when its worst danger zone runs off the top of that axis
  rather than actually closing, and `axisTop`, the axis that cell was swept
  to, so a page can print "past $150,000" rather than "past the axis".
  `cliffCount` and `deferredCliffCount` come
  from the same `evaluateCurve` that `evaluateHousehold` and
  `evaluateOffline` both call. Since 2026-09-17 `cliffCount` counts every
  cliff and `deferredCliffCount` is the subset of those that land at a
  later renewal, and `biggestLoss`, the danger zones and `leap` all read
  the real curve, so a Head Start or continuous-eligibility cliff can drive
  any of them — it is a loss the household takes, and the `deferred` count
  beside it says how much of the figure waits.
  Massachusetts summary metrics include the local TAFDC correction and an
  approximation notice. State files retain PolicyEngine's TANF and the
  `maTafdc` inputs used to replay that correction; use `evaluateOffline` to
  obtain the corrected curve. Rebuild: `npm run pipeline`.
  `summary.json` also carries `coverage`, one block per state
  (`StateCoverage` in `core/src/data.ts`, built by `core/src/coverage.ts`)
  that a reader of that state's numbers should check before comparing them:
  `corrections` — which HotGap-side corrections apply there, each derived
  from the code that applies it (the parameter overrides actually sent, with
  the value per archetype; the Massachusetts TAFDC recomputation; whether the
  state's premium help is PolicyEngine's own amount, a local ladder, or
  nothing; whether the child-care subsidy is inside net income or added by
  HotGap; whether the coverage-gap correction can fire) with a one-sentence
  note and the upstream issue number; `unmodeled` — programs the map cannot
  show there (a state premium program modeled nowhere, a child-care subsidy
  the engine paid nothing for, LIHEAP everywhere); `otherBenefits` — what the
  untracked remainder is, traced to a PolicyEngine variable
  (`core/src/stateOtherBenefits.ts`, pinned live by the contract suite):
  California's and Kansas's is the HUD voucher payment PolicyEngine models
  for an eligible renter through `housing_assistance`, a variable the
  `spm_unit_capped_housing_subsidy: 0` take-up switch does not reach, capped
  at the PHA utility allowance because the rent is sent as `rent` rather than
  `pre_subsidy_rent`; New Jersey's is the $450 ANCHOR renter benefit; and
  `vintages` — the model, the rent and county sources, the child-care price
  basis and the reach ladders' PUMS vintage(s), read from the data files
  rather than retyped. `npm run pipeline -- --from-data` regenerates it
  without network, and a change to it counts as a change to the file.
- `state-defaults.json` — the typical renter each state's archetype sweep
  uses (`stateDefaults`, read by `answersFor`). Every figure describes
  **one** household in **one** county: the Census Vintage 2024 most populous
  county (`countyFips`), HUD's FY2026 two-bedroom Fair Market Rent for it
  (`monthlyRent`), and DOL's National Database of Childcare Prices
  center-based prices for that same county in each of the NDCP's age bands
  (`MCInfant`/`MCToddler`/`MCPreschool`/`MCSA` →
  `monthlyChildcare{Infant,Toddler,Preschool,SchoolAge}`), carried from
  their NDCP study year to 2026 dollars by the BLS Employment Cost Index.
  `answersFor` prices each child of a working household by band — ages 0–1
  infant, 2 toddler, 3–4 preschool, 5–12 the school-age rate, the
  before-and-after-school care a working parent still buys (a schoolchild
  cost nothing before 2026-09-16) — and the preschool price is the
  replacement value of a "free" Head Start slot (`headStart` in [core/README.md](../core/README.md#api)). The
  preschool price used to be the state *median* county's
  while the county and the rent were the largest county's, which understated
  the bill wherever the biggest county is also the priciest — Virginia was
  $774 against Fairfax's $1,839. Where the county itself has no NDCP price
  the state median county stands in (Connecticut only: its planning regions
  post-date the database), and where a state has none in any year the
  national median does (IN, NM); `childcareBasis` records the rule and the
  study year state by state, and `sources` carries each column's publisher,
  table, vintage, date read and exact arithmetic. Rebuild:
  `node scripts/build-state-defaults.mjs` — needs `ZYTE_TOKEN`, because
  huduser.gov answers a plain request with an empty HTTP 202 bot challenge.
- `smi.json` — 60% of state median income for a four-person household, per
  state, for LIHEAP FY2026 (and FY2025, which South Carolina's and West
  Virginia's FY2026 tables still apply), with the 45 CFR 96.85 household-size
  ladder (52% for one person, +16 points a person through six, +3 beyond).
  The publisher of record is ACF's LIHEAP-IM-2025-02 Attachment 4, which
  acf.gov will not serve to a plain request; the file is read from
  policyengine-us's transcription of it (`parameters/gov/hhs/smi/`) at a
  commit pinned in the file, so it can be re-derived byte for byte, and was
  cross-checked to the dollar against 19 state matrices on 2026-09-16.
  `liheapLimitDollars` (`core/src/liheap.ts`) turns it into the household's
  limit. Rebuild: `node scripts/build-smi.mjs`.
- `reach.json` — household earnings percentile ladders from
  [U.S. Census Bureau ACS PUMS](https://www.census.gov/programs-surveys/acs/microdata.html)
  microdata (public domain): the 2024 1-Year PUMS, with the 2020–2024 5-Year
  PUMS substituted cell-by-cell for the five states too small for the 1-Year
  sample. Each ladder is the **householder's plus spouse's earnings** (PERNP,
  summed and floored at 0) among households whose householder is 18–64 — the
  same concept the tool varies on its own axis — with each record's `ADJINC`
  applied, then grown from 2024 to 2026 dollars by a BLS Employment Cost
  Index (wages and salaries, private industry) factor of **1.067533**. Every
  ladder point carries its own replicate-weight (WGTP1–80) 90% margin of
  error, and a cell publishes as `null` — never as a false 0% — when that
  margin exceeds half the median or fewer than 30 households fall in it;
  `reachCell` exposes the margin alongside the ladder. Rebuild:
  `node scripts/build-reach.mjs`.
- `zip3-state.json` — ZIP → state derived from
  [GeoNames](https://www.geonames.org/) (CC BY 4.0). Rebuild:
  `node scripts/build-zip-table.mjs`.
- `zip5-county.json` — ZIP → county crosswalk from the
  [U.S. Census Bureau 2020 ZCTA-county relationship file](https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html)
  (public domain). Rebuild: `node scripts/build-zip-county.mjs`.
- `county-names.json` — county FIPS → name ("El Paso County", "Orleans
  Parish") from the
  [U.S. Census Bureau 2020 Gazetteer](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html)
  counties file (public domain) — the same 2020 county vintage as the
  crosswalk above, so every county it can point at has a name here
  (`countyName`). Nothing but the name is kept. Rebuild:
  `node scripts/build-county-names.mjs`.

## The weekly sweep

`pipeline/` sweeps 51 states × 11 household archetypes (single with 0–3
children, married with 0–3, and married with 1–3 where **both** parents work)
through the same PolicyEngine endpoint and `@hotgap/core` math as a live
call, producing `summary.json` and the per-state curve files above.

The two married families differ in more than a second wage: a single-earner
couple has a parent at home, so it buys no child care and cannot claim the
subsidy, which every state conditions on all parents working; a dual-earner
couple buys care, claims the subsidy, and is the household the child-care
cliff actually hits. The dual-earner spouse earns a fixed $15,080, full-time
at the *federal* minimum wage, on purpose — a state-varying second wage would
make the map partly a comparison of households rather than of state rules.

**Which PolicyEngine.** Every request goes to `HOTGAP_PE_URL` when it is set,
else to the public API. The public API runs an older model (its service
version 1.764.6 in September 2026, serving a model that matched
policyengine-us 2.2.0; `fixtures/README.md`) that lacks 13 states'
child-care subsidies and takes 35–40 s per policy-override request, so the
sweep — and anything else that can — runs on `engine/`, HotGap's own copy of
the one endpoint it calls, pinned to the latest release in
`engine/requirements.txt`. Dependabot bumps that pin; CI's `engine-contract`
job runs the live contract suite against the engine on every push, so a
release that breaks an assumption `core/` makes fails there. `summary.json`
and each state file record the model that produced them (`model`). The
public API stays the fallback for a `hotgap` run with no engine, and
`.github/workflows/contract.yml` watches it daily.

`.github/workflows/places-data.yml` runs the sweep on the engine every
Monday at 07:00 UTC (and on manual dispatch), running the test suite and
typecheck before committing. Data commits only when the swept numbers
changed — `generated` in `summary.json` and each state file is the stamp of
the sweep that last changed that file, not of the most recent sweep; a
`--from-data` rebuild of the summary keeps the newest state file's stamp,
since adding a derived field is not a sweep. It is a UTC instant, and the
pages print its date in the reader's own time zone.
