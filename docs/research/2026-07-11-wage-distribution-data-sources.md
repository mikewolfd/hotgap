# Wage & income distribution data sources — feasibility of "the leap"

**Date:** 2026-07-11
**Method:** deep-research workflow (106 agents, 25 claims adversarially verified 3-0; all backed by primary US federal sources)
**Question:** Which US data sources give state/county wage & income *distributions* (not just medians) so HotGap can overlay "the leap" (the single raise needed to clear a benefits trap) on the real wage distribution and answer *is a jump that size even attainable, and for whom?*

## The framing that keeps us honest

A wage **distribution** answers *"how many people like you already live past the wall"* — it is **not** *"your odds of jumping there."* The buildable, defensible signal is cross-sectional: *"clearing the trap here lands you around the Nth percentile of pay for a household like yours in your state."* Calling that a *probability of making the jump* would overclaim — true jump-feasibility (do individuals actually move from $30k → $77k?) needs **longitudinal** earnings data (Census LEHD/LODES job-to-job flows, or PSID), a much bigger lift and out of scope for a first pass.

## Recommended sources (both free, real programmatic access)

### 1. Census ACS PUMS — the engine (best fit)
Individual person + housing microdata records. Variables: `WAGP` (wages), `PERNP`/`PINCP` (person income), weights `PWGTP` (person) / `WGTP` (household). Person→household join via `SERIALNO` — so you can compute the **household-level** question the leap is defined on ("what share of single-parent-of-2 households in this state clear $77k"), computing *any* weighted percentile, not just published means/medians.
- **Access:** Census Microdata API `https://api.census.gov/data/{YEAR}/acs/acs1/pums` (Puerto Rico: `pumspr`); bulk CSV/SAS on the Census FTP; no-code MDAT tool. Free API key, no paywall. Query with `get=` variables, filter `for=state:`.
- **Geography limit:** finest unit is the **PUMA** (~100k-person state partition) — clean at **state** level; **no county/metro identifiers** without an external PUMA→county/CBSA crosswalk (Census MABLE/Geocorr or IPUMS MET2013/2023), reliable only for large areas.
- **Caveats:** weighted sample (sampling error), top-coded/rounded incomes, annual vintage.
- Docs: census.gov/programs-surveys/acs/microdata/mdat.html · 2024 PUMS User Guide (www2.census.gov/programs-surveys/acs/tech_docs/pums/2024ACS_PUMS_User_Guide.pdf) · census.gov/data/developers/data-sets/census-microdata-api.html

### 2. BLS OEWS — occupation × state percentiles (fast, different cut)
Ready-made 10th/25th/50th/75th/90th wage percentiles (hourly AND annual) for ~800–830 occupations at national/state/metro/nonmetro geographies.
- **Access:** bulk flat files `https://download.bls.gov/pub/time.series/oe/` and `oesmYYall.zip`/`oesmYYst.zip` archives (columns `h_pct10..h_pct90`, `a_pct10..a_pct90`); free BLS Public Data API by series ID (`OE` + areatype + area + industry + SOC occupation + datatype; areatype S=state, M=metro, N=national). Unkeyed API capped 25 series/day; free key raises it. **BLS.gov HTML 403-blocks bots — use the API or flat files, set a User-Agent+email header.**
- **Wrong shape for the household fraction:** OEWS is per-**job**/per-worker ("what does this occupation pay here"), NOT household income. Good for occupational context ("the leap ≈ what an RN earns in this state"), not the household feasibility fraction.
- **Top-coding:** suppresses upper percentiles above ~$239k/yr — irrelevant to HotGap's $30k–$100k leap range.
- Docs: bls.gov/oes/oes_perc.htm · bls.gov/oes/tables.htm · bls.gov/bls/api_features.htm

### Not verified this batch (treat as unexplored, not rejected)
ACS summary tables (B19001 household-income brackets, B20004), QCEW, CPS, state LMI agencies, IRS SOI county data, BEA regional income. Of these, **B19001** (household-income brackets by state AND county, via the standard Census API) and **IRS SOI** (county granularity) are the most likely quick wins if we want a county cut *without* PUMS crosswalks.

## Highest-leverage move: check what we already ship
**Unconfirmed but promising:** PolicyEngine-US bundles an **Enhanced CPS** microdata dataset (the engine behind its distributional analysis) that already pairs household incomes with state geography. The research couldn't confirm reusability, but if it's accessible from our pipeline keyed by state, we get household-income distributions by state **inside the stack we already run** — collapsing this feature into a query against data we're already using. **Verify this before standing up any Census/BLS ingestion.**

## Proposed build (Plan 4 candidate — a "reach" metric)
1. **Verify** the PolicyEngine enhanced-CPS angle (quick investigation of its microdata repos/docs — accessible? state-keyed?). If yes → that's the source.
2. **Else ACS PUMS:** one-time batch (mirroring the existing state×archetype pipeline) → per state × household type, the percentile the leap-**exit** lands at → a 4th escape metric **"reach."** Surface as: *"Getting fully clear here means out-earning about X% of families like yours."* A data join, not new modeling.

## Open questions
- Does PolicyEngine's enhanced CPS pair income with usable geography, and is it redistributable under our AGPL stack? (dedicated investigation)
- Best PUMA→county/CBSA crosswalk and precision loss for small counties (for a sub-state reach signal).
- Reconciling OEWS per-job wages with a *household* leap threshold (single- vs multi-earner join logic) — PUMS `SERIALNO`/`WGTP` handles this natively; OEWS does not.
- Do B19001 brackets / IRS SOI add county value beyond OEWS+PUMS?

---

## 2026-09-14 — what the reach builder actually uses now

The 2026-09-14 primary-source validation (`docs/reviews/2026-09-14-methodology-validation.md`,
Appendix D) re-ran the original builder on real PUMS files and found six defects. All six are fixed
in `scripts/build-reach.mjs`; this section records the choices so the next person does not have to
re-derive them.

### Source and vintage

**ACS 2024 1-Year PUMS**, bulk CSV zips from `www2.census.gov/.../pums/2024/1-Year/csv_h{st}.zip`
and `csv_p{st}.zip` — released 2025-12-04 (~7 weeks past the scheduled 2025-10-16; the data
dictionary's own date is the *scheduled* date, so it is not a release-date check). Keyless: the
Census microdata **API** requires a key, these bulk files do not. Variable codes are byte-identical
to 2023.

For the five smallest states by 1-Year housing records — **WY (3,024), VT (3,875), DC (3,914),
AK (4,016), ND (4,345)** — the builder also reads the **2020–2024 5-Year PUMS**
(`.../pums/2024/5-Year/`, released 2026-03-05) and substitutes it **per cell** when the 1-Year cell
fails the reliability test and the 5-Year passes. Five cells ship from the 5-year today
(AK/ND/VT/WY `single-3`, DC `married-3`). Moving to a newer 1-year vintage buys freshness, not
precision: small-state record counts are flat year over year, so the 5-year is the only real answer
for thin cells.

### The earnings concept

`PERNP` (Census's own wages + self-employment aggregate, which preserves self-employment losses)
for the **reference person** (`RELSHIPP` 20) and the **spouse** (`RELSHIPP` 21 or 23) only, each
multiplied by its record's `ADJINC`, then the **sum** floored at 0.

- Not every member: in the single-parent cells ~30% of aggregate "household earnings" came from
  other adults in the house — mostly the householder's own 18+ children, invisible to `NOC`. The
  tool's axis is one adult's pay with the spouse's fixed, so those ladders were too high.
- Not `max(0, WAGP) + max(0, SEMP)`: flooring each component hides a real loss. `PERNP` ranges to
  −$10,000 and a loss genuinely reduces what the couple took home. Only the **sum** is floored,
  because the ladder is a "what do you bring in" axis with no negative rung.
- Households are kept only when `HHLDRAGEP` (householder age, on the *housing* record — no
  person-file join needed) is 18–64. Without it, 23%–46% of the childless cells were 65+
  householders and p25 was structurally $0 in 50 of 51 states.

### 2024 → 2026 dollars

Two explicit, sourced steps, both recorded in the file:

1. **ADJINC**, per record, 6 implied decimals — 1.015250 for the 2024 1-Year; five different
   factors in the 5-Year (2020 1.222017 … 2024 1.015250), each carrying its data year to 2024
   dollars. Census: dollar variables "must be adjusted… before they are used to form estimates."
2. **BLS ECI, wages and salaries, private industry workers, index NSA** (`CIU2020000000000I`),
   calendar-year average CY2024 → CY2026, fetched live from the keyless v2 API:

   | | Q1 | Q2 | Q3 | Q4 | avg |
   |---|---|---|---|---|---|
   | CY2024 | 166.3 | 167.9 | 169.1 | 170.2 | **168.375** |
   | CY2026 | 177.672 | 179.304 | 180.604\* | 181.404\* | **179.746** |

   \* not yet published; extrapolated from the same quarter of 2025 at the latest published
   12-month rate (2026Q2 179.304 / 2025Q2 173.849 = **+3.14%**).
   Factor = 179.746 / 168.375 = **1.067533**. Total 2024-PUMS → 2026 conversion ≈ 1.015250 ×
   1.067533 = **1.083**.

   ECI is preferred over CES average hourly/weekly earnings and the SSA AWI because it holds
   occupation and industry mix fixed, so it measures pay growth rather than composition. If BLS is
   unreachable the builder falls back to the same quarterly values compiled into the script and says
   so in the file's `growth.live`. Re-derive annually.

### Reliability: MOEs, not a record count

Census sets a **variance method**, not a minimum sample. `WGTP1..WGTP80` are already in the files we
download, so the builder computes the Successive Difference Replication standard error for **every**
percentile point: variance = (4/80) · Σ(Xr − X)², MOE₉₀ = 1.645 · SE.

Verified against Census's own SDR figures in
`.../tech_docs/pums/estimates/pums_estimates_24.csv` — this code reproduces Wyoming "Total males"
SE 1948 / MOE 3205 and "Age 20-24" SE 1678 / MOE 2760 exactly. That is a check against the
publisher's published numbers, not against the builder agreeing with itself.

A cell publishes only when MOE₉₀(median) ≤ 50% of the median (the reliability test) **and** n ≥ 30
(a floor beneath it). 402 of 408 cells clear both; the six that do not are all `single-3` in small
states. The old n ≥ 30 floor published cells with ±98% intervals and discarded materially identical
ones at n = 29.

**The zero-SE trap is real and is flagged, not fixed.** Accuracy of the PUMS: "Medians should always
have a non-zero SE. A median with a SE of zero may occur when several records in the middle of the
distribution were rounded to the same value." Five large cells (IN/MI/NY/VA `single-0`, MN
`married-0`, n = 4,629–21,475) have exactly that — their medians sit on a rounding plateau at
$40k/$50k/$120k in original dollars. Census's remedy is a GVF standard error from the design
factors; **2024 is the last vintage that publishes design factors**, so the builder marks the cell
`seZero: true` rather than substituting one. MOEs round *up* to the ladder's $100 granularity, so a
zero MOE means a zero replicate variance and nothing else. p0 and p100 are the cell's min and max,
identical in every replicate by construction, and their zero MOE is not precision.

### Still open

- **Design factors disappear after 2024.** If a future vintage needs a GVF standard error for a
  zero-SE median, the 2024 design-factor file is the last one; decide whether to pin it or to
  suppress plateau medians outright.
- **A scalar cannot move a $0 percentile, and it assumes proportional growth at every percentile** —
  which the 2021–2023 low-wage compression and its reversal both violate. A percentile-specific
  deflator would be better and is not built.
- **2025 vintage may not exist on schedule.** As of Aug 2026 census.gov says the 2025 ACS 1-year
  release date "is being determined" pending a disclosure-avoidance order.
- The county cut (PUMA → county crosswalk) and the PolicyEngine enhanced-CPS question above are
  both still unexplored.
