# HotGap Reach — Earnings Basis Fix (Plan 8)

**Date:** 2026-07-11
**Status:** Building independently per user goal ("finish this independently"). Closes the last open item from the 5-expert adversarial methodology review.

## Problem

The reach metric answers "is the escape income even attainable?" by placing each state × archetype's cliff-safe-exit income on a real income distribution for families like that. The adversarial review flagged two defects in how that distribution was built:

1. **Concept mismatch (apples-to-oranges).** The safe-exit is an **employment-income** threshold on **one earner's** axis (the tool sweeps `employment_income` 0–100k). But the reach ladder was built from PUMS **HINCP — total household income**, which includes benefits, other earners, retirement, and investment income. Comparing an earnings threshold against a total-income distribution understated how hard the jump is: the safe-exit landed at a lower percentile than it deserves, because total income is systematically higher than earnings.
2. **Vintage gap.** The ladder was raw ACS 2023 dollars; the cliff curve is 2026 policy dollars. A 2026 escape income was scored against a 2023 distribution.

Probe confirming the size of the error (WY single-parent-of-2): median **household earnings $42,000** vs the old **total-income median $76,700**. Same safe-exit income scores far higher on the earnings distribution — i.e. the jump is materially rarer than we were saying.

## Fix

Rebuild `app/src/data/reach.json` from **household earnings**, inflation-adjusted to 2026:

- **Earnings, not total income.** For each household, sum every person's `WAGP` (wages) + `SEMP` (self-employment), flooring each at 0 (our model has no negative earnings). Source: ACS 2023 1-Year PUMS **person** file joined to the **household** file (`SERIALNO`), keeping the same archetype match (`HHT`/`NOC`) and household weight (`WGTP`). This makes the yardstick the same concept as the safe-exit: pay from work.
- **2026 dollars.** Multiply the ladder by `INFLATION_2023_TO_2026 = 1.12` (~4%/yr nominal wage growth, 2023→2026), so a 2026 escape income is compared against a 2026-dollar distribution. Approximate and documented; recorded in the file's `basis` field.

Everything else about reach is unchanged: same 21-point percentile ladders, same `<30`-household small-sample null guard, same `reachPercentile` interpolation, same cross-sectional framing ("how common this pay is," never "your odds of reaching it").

## Scope

- `scripts/build-reach.mjs` — rewritten to download + parse both PUMS files per state and compute household earnings; emits `year: "2026"`, `basis`, unchanged cell shape (`{ ladder, households }`).
- `app/src/data/reach.json` — regenerated (51 states × 8 archetypes).
- `app/src/lib/reachLookup.ts` — `ReachFile` type gains optional `basis`.
- Copy: the two honesty notes (`result.honesty.reach`, `places.panel.reachNote`) change from "Census household income" to "pay from work" — accurate to the new basis; readability gate re-passed. The `escape.reach` / `places.panel.reach` lines already said "out-earn" / "families like this earn," which are now literally correct.
- `app/src/lib/reachLookup.test.ts` — the pinned CA single-1 p50 value is re-pinned to the new earnings ladder; a small-sample null cell re-verified.

## Out of scope

Longitudinal mobility (odds of an individual actually reaching the income over time — needs panel data we don't have; the copy still refuses that framing). Occupation- or age-conditioned distributions. The map stays state-level. Uncertainty bounds and external validation remain deferred review items (see `docs/post-merge-notes.md`).

## Constraints (carried)

AGPL-3.0; TS strict; copy via en.json + readability gate (≤5.9 corpus, ≤8.0/string, never raised); show-explain-never-advise; no input logging; 44px/WCAG AA; conventional commits. Branch: `reach-earnings`.
