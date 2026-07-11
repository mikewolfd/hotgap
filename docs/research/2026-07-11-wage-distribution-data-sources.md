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
