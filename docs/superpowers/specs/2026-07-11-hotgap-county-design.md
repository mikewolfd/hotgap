# HotGap County-Level Personal Door — Design (Plan 7)

**Date:** 2026-07-11
**Status:** Approved in brainstorming (design shape confirmed); building independently per user goal.

## Goal

Make a specific person's cliff curve reflect **where they actually live** by deriving `county_fips` from the ZIP they already enter and passing it to the live PolicyEngine API. This mainly sharpens ACA rating-area premiums (and housing FMR when the housing toggle is on).

## Scope boundary (important)

**Personal door only. The map does not change and no data is regenerated.** The 51-state map is deliberately a state-level, address-free figure (archetypes have no ZIP), so it stays exactly as-is. County is purely a live personal-door enhancement — fully backward-compatible (when county is unknown, the payload is identical to today's state-only payload).

## Verified ground truth (probed live 2026-07-11)

- PolicyEngine accepts `county_fips` [household, string] as input.
- County materially changes the curve via ACA rating areas: same household (honest baseline), CA counties — worst cliff $7,421 (LA) → $10,397 (San Francisco), a ~$3k swing; maxPTC $6,371 → $11,555. Texas counties vary little (~$700 at $40k). So the gain is real in high-cost states, near-nil in flat ones — a moderate accuracy refinement.
- **Crosswalk source (keyless bulk):** Census 2020 ZCTA-to-county relationship file `https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt` (pipe-delimited; HTTP 200, 6.8 MB). Columns: `GEOID_ZCTA5_20` (the ZCTA ≈ ZIP5), `GEOID_COUNTY_20` (5-digit county FIPS), `AREALAND_PART` (land area of the ZCTA-county overlap). For a ZCTA spanning multiple counties, pick the county with the largest `AREALAND_PART` (dominant by land area). Honest limitation: ZCTA ≈ ZIP (Census approximation, not USPS), and dominance is by land area, not population — a good-enough approximation for a rating-area lookup.

## Components

1. **Crosswalk builder + data** (`scripts/build-zip-county.mjs` → `app/src/data/zip5-county.json`). Downloads the Census file, filters to rows with both a ZCTA and a county, groups by ZCTA, keeps the max-`AREALAND_PART` county per ZCTA, emits a compact `{ "<zip5>": "<county_fips>" }` map (~33k ZCTAs). Idempotent; documented in README with Census attribution (public domain).
2. **Lookup** (`app/src/lib/county.ts`): `zipToCounty(zip: string): string | null` — 5-digit ZIP → county FIPS via the table; `null` for malformed/unknown (mirrors the existing `zipToState`).
3. **Answers threading:** `HouseholdAnswers` (shared) gains `countyFips: string | null`. `FlowAnswers` (app) derives it in the `setZip` reducer alongside `state` (`countyFips = zipToCounty(zip)`); `toHouseholdAnswers` maps it. `worker/src/translate.ts` adds `county_fips: y(a.countyFips)` to the household **only when non-null** (omit otherwise → identical to today's payload). `worker/src/validate.ts` accepts `countyFips` (optional string; default null; light format check `/^\d{5}$/` else null).
4. **Transparency copy:** a small line on the result when county is applied — `result.county.note` = "Numbers use your county where we can." (gate-checked). Shown only when `countyFips` is present.
5. **Archetype/pipeline untouched:** `answersFor` does NOT set countyFips (stays null → state-level map, unchanged). The map and all committed data are untouched.

## Testing

- `zipToCounty` unit tests (known ZIP → known county; malformed → null; unknown → null). Spot-check e.g. 94110 → 06075 (San Francisco), 90012 → 06037 (LA).
- `translate.ts`: county_fips present in payload when countyFips set; absent when null (backward-compat).
- `state.ts`: setZip derives both state and countyFips; toHouseholdAnswers carries it.
- Contract test (RUN_CONTRACT): the same household with two different CA county_fips yields different ACA premium / net income (county genuinely bites); and a null-county payload still succeeds.
- e2e: unchanged flow (ZIP already entered); assert the county note appears for a known-county ZIP. No new questions.

## Constraints (carried)

AGPL-3.0; TS strict; copy via en.json + readability gate (≤5.9 corpus, ≤8.0/string, never raised); show-explain-never-advise; no input logging; 44px/WCAG AA; conventional commits. Branch: `county`.

## Out of scope

Map/data regeneration (none); asking the user for county directly (derived from ZIP); population-weighted crosswalk (area proxy is enough); multi-county ZIP disambiguation UI (dominant county silently). The resource/next-step pointer (set aside per user) and the reach income-concept fix are separate follow-ups.

## Open questions carried into implementation

1. The relationship file has some rows with an empty ZCTA (county-only records) — the builder must filter to rows where `GEOID_ZCTA5_20` is non-empty. Verify the parse yields ~33k ZCTAs mapping to valid 5-digit county FIPS.
2. Confirm PolicyEngine uses `county_fips` for ACA rating-area premium (the probe shows it changes PTC/net — pin one CA county pair in the contract test).
