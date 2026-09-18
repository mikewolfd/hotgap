# HotGap Keep Rate — the road out of poverty, and one question in three lenses (Plan 9)

> **For agentic workers:** steps use checkbox (`- [ ]`) syntax; each phase lands as its own reviewed merge; every number a page prints is read from the data, never typed. Run every check through the project's runners (`npm run typecheck`, `npx vitest run`, `cd app && npx vite build`, `cd app && npx playwright test`). No resweep: the stored points do not change, the reading of them does.

**Goal:** Make every surface ask the one question the tool exists to answer — *of each extra dollar you earn, what do you keep, and where does the road collapse?* — and make the journalist map measure how regressive each state is toward the families climbing out of poverty, instead of naming the tallest wall on the whole axis wherever it stands.

**Owner directive (2026-09-18):** *"a raise of 18k when you earn 118k isn't the same as losing even 1000 when you earn 54k"* → *"what are we trying to bring light to and why"* → *"not just the median, but how regressive is a given state to the most disenfranchised"* → *"how should we update the three views and why"*.

## What was wrong, measured (single parent of two, 2026-09-18, from the committed 2.6.2 sweep)

The headline measures — biggest loss, the leap, safe exit — are absolute dollars over the whole earnings axis. So the headline cliff sits **above the 75th percentile of families like this in 22 of 50 states, and above the median in 39**: mostly the child-care subsidy ending at 85% of state median income and the marketplace credit ending at 400% of poverty. Maryland's map figure is $33,587 at $97,000 (80 in 100 such families earn less); the worst cliff in the range where its families are is $913 at $54,000. Massachusetts' readout led with a $118,000 cliff (87 in 100 earn less) and an $18,000 leap almost nobody stands at the foot of, while the SNAP cliff at $54,000 — the median family's income — was invisible.

The fix is not a percentile cut-off on the old measures. It is a different measure, with a definition the field already uses.

## The measure: keep rate on the road out of poverty

- **Effective marginal tax rate (EMTR):** of each additional dollar of earnings, the share taken back by taxes plus lost benefits. A cliff is an EMTR above 100%. The Atlanta Fed's CLIFF tool, CBO and the benefits-cliff literature all report it; HotGap has been drawing the curve it is derived from without naming it.
- **Keep rate** = 1 − EMTR, stated in cents per extra dollar because that is how a person hears it. Over a range: `(net(hi) − net(lo)) / (hi − lo)`.
- **The road out of poverty** = the earnings range from 100% to 200% of the federal poverty guideline for the household's size (2025 guidelines, as the 2026 policy year uses: $26,650 → $53,300 for three; Alaska and Hawaii on their own tables). Federal, so every state's road is the same road; and it is the band the cliffs live in.
- **Why not the state's minimum wage to its median:** measured first, and it makes the poorest states look kindest — Alabama, Mississippi, Louisiana score best because a $7.25 floor and a $30,000 median make the road short and low enough to miss every cliff. The keep rate on a fixed federal road isolates how the state's rules treat a poor family; where the state's own families sit on that road is reported separately (position, below).
- **Regressivity** toward the most disenfranchised is exactly a low keep rate on this road.

**The road's top has a one-step allowance (added 2026-09-18 when the core was built).** On the sweep's $1,000 grid a cliff whose limit sits on the 200%-FPL line lands in the step starting at the first sampled point *at or above* the line (SNAP's broad-based limit is tested against a fiscal-year-blended poverty figure a little above the calendar guideline), so a road closed at exactly 2×FPL excluded the SNAP cliff in every BBCE state by construction. The road's last step is therefore the one starting at `hiStart` = the first sampled point ≥ 2×FPL ($54,000 for three), and the keep rate spans `[lo, hiStart + step]` so the rate and the cliffs it counts are the same stretch. `core/src/road.ts` documents it as grid resolution.

**What it says today (single parent of two, from the committed 2.6.2 sweep, corrected road):** the **national mean keep rate is −17¢** — a family that doubles its earnings from poverty ends up, on average, poorer than it started. Most regressive: Wisconsin −105¢, Colorado −97¢, New Jersey −94¢, Oregon −75¢, Nevada −67¢ — the first four are a child-care subsidy paid in full at $54,000 and $0 at $55,000 (203% of poverty), i.e. exactly the road's exit; Missouri (−56¢) is 9th, with the same shape lower down ($17,040 → $0 at $40,000 → $41,000; net income $61,364 → $44,936). Least regressive: New Mexico 30¢ (the only state with no cliff on the road), South Carolina 24¢, Washington 22¢, North Dakota 21¢, Tennessee 21¢. Massachusetts ranks 25th (its road collapses at $54,000: $3,513, SNAP + WIC), Maryland 39th ($913 at $54,000). The share of families like this earning less than the road's top runs from 32% to 81% across states (median 61%): this is where they live. **Every figure a page prints is read from the data; these are the record of what was measured, not copy.** (The first measurement, on a road closed at 2×FPL, read mean −1¢ with NE/MO/IA/GA/OH most regressive; it is superseded.)

**Position** is the second new fact: for any earnings figure, the share of families like this in the state earning less — the reach ladder HotGap already carries (`reachForHousehold`), applied to every cliff and readout rather than only to the safe exit.

**It is not a composite.** `design/README.md` forbids collapsing the six measures into a score. The keep rate is a seventh measure with its own definition and literature; the six stay, as facts about the rules, where they belong (§ Journalist).

## Core

- [ ] `core/src/road.ts` (new; pure): `povertyRoad(answers)` → `{ lo, hi }` on the household's axis (`fpl2025(state, householdSize)` × 1 and × 2, snapped to the sweep's step); `keepRate(points, lo, hi)` → cents per dollar as a number in [−∞, 1] (null when either end is off the axis); `cliffsBetween(cliffs, lo, hi)`; `roadSummary(ev)` → `{ lo, hi, keepRate, cliffs, worst: Cliff | null, positionAtHi }`. O(points) once per evaluation. Tests pin MO (−56¢, worst $16,428 at $40k, childcare), NM (30¢, no cliffs), a curve whose road runs off the axis (null), AK/HI on their own guideline.
- [ ] `HouseholdEvaluation.road: RoadSummary` (both paths, live and archetype) and `HouseholdEvaluation.position(earnings)` is not a method — instead `analysis.cliffs[i].position: number | null` (share of families like this earning less, from `reachForHousehold`; null where the ladder has no cell) filled in `evaluateCurve`, and `PersonalEscape` gains `keepNext: { over: number; kept: number } | null` — the keep rate over the next $10,000 from current earnings (`over` shrinks to the axis end). Deferred losses count, per the 2026-09-17 rule; nothing is lifted.
- [ ] `core/src/messages/en.json` + `es-US.json`: the codes for the road sentence, the position phrase ("{n} in 100 families like this earn less"), the keep-rate phrase in cents, the "road collapses" sentence. Program phrases unchanged.
- [ ] README § Honesty: the keep rate defined (EMTR, the road, the modeled family), with the two caveats: it is the modeled family (a renter in the state's largest county, two children in paid care, claiming what it is entitled to), and the road is federal on purpose.

## Pipeline and data

- [ ] `StateMetrics` gains `keepRate: number | null`, `roadCliffCount: number`, `roadWorst: { drop, at, programs } | null`, `roadLo`, `roadHi`, and `biggestLossPosition: number | null` (the whole-axis worst's position, so the table can say "87 in 100 earn less"). `pipeline/src/metrics.ts` fills them from `ev.road` and the cliffs' `position`.
- [ ] `npm run pipeline -- --from-data`: every existing metric byte-identical, six fields added per cell; the commit reports the national mean keep rate and the five most and least regressive states for `single-2`, read from the file.
- [ ] `metrics.test.ts` pins MO and NM `single-2` from the committed file; `build.test.ts` a synthetic curve with the road off the axis.

## Journalist (`app/places.html`, `app/src/places/**`) — asks it of a typical family, per state

- [ ] **The measure menu becomes two groups.** *On the road out of poverty:* keep rate (default; cents per dollar, bins on a diverging scale around 0 — losing money vs keeping some — per `design/charts.md`'s binning rule, with 0 always a bin edge), cliffs on the road, where the road collapses (the worst cliff's size). *Anywhere on the curve:* the six existing measures, unchanged. The `<optgroup>` labels are copy. `?measure=keepRate` is the default URL state; old `?measure=` values still resolve.
- [ ] **Map, legend, ranked strip and table follow the selected measure** as they do today; for the keep rate the ranked strip's bar is centered on zero (a state losing money extends left), the legend says "keeps N¢ of each extra dollar" / "loses N¢ of each extra dollar", and the "no cliff"/"past the axis" groups are joined by "road runs off the axis" where `keepRate` is null.
- [ ] **The state readout leads with the road sentence** for every measure: *"Missouri — a single parent of two who earns their way from poverty to twice poverty ends up 56¢ poorer for every extra dollar. The road collapses at $40,000, where child-care help ends and the family loses $16,428 in one step. 47 in 100 families like this in Missouri earn less than that."* (rendered from `road`, `road.worst` and `worst.position`; never typed) Then the selected measure's own sentence where it is not the keep rate; then the whole-axis worst as the last line, labeled: *"Largest single loss anywhere on the curve: $10,370 at $118,000 — 87 in 100 families like this earn less."*
- [ ] **Position on every figure**: a "families earning less" column beside every dollar column in the big table and in the ranked row's secondary text; the CSV gains `keep_rate_cents`, `road_lo`, `road_hi`, `road_cliff_count`, `road_worst_drop`, `road_worst_at`, `road_worst_programs`, `position_*` for each earnings column, and `families_below_2x_poverty`. **Reach returns to this page** (Plan 8 removed it as unused; it is now load-bearing): the source line names the ACS vintage again, and the methodology says what position is and is not (cross-sectional: how many families already earn less, never a family's odds).
- [ ] **The glossary line under the subhead** gains the one sentence of why: *"A cliff matters in proportion to how many families stand near it. The largest cliff in a state is usually one few families reach; the one that hurts is the modest one at the income most families have."*
- [ ] Methodology: the road, the keep rate as an EMTR, the two caveats, the two groups of measures explained as two questions. Cite line unchanged.
- [ ] Copy in `app/src/i18n/en.json` (`places.*`) and `es-US.json`. (The readability gate was dropped on 2026-09-18: social workers review the copy in each register.)

## Citizen (`app/src/citizen/**`) — asks it of you, from where you stand

- [ ] **Your keep rate on the next stretch**, one sentence after the answer: *"Of the next $10,000 you earn, you keep about $1,200."* from `personal.keepNext`; when the next stretch holds a cliff the sentence names it (*"… because food help ends at $39,000"*); when it is a plateau (keep ≈ 0, no cliff) the sentence says so — plateaus are as real as cliffs and are invisible in the answer today. M5: in the person's pay unit.
- [ ] **Far cliffs framed by company**: the "It happens N more times, between $A and $B" line adds position for the ones beyond the household's reach: *"The next is at $39,000. The ones past $80,000 are beyond what 8 in 10 families like yours earn."* The threshold for "beyond" is position ≥ 80 from the family's own ladder, rendered, never typed. The safe-exit sentence already carries reach; unchanged.
- [ ] Nothing else moves: the answer sentence, the marks, the badges, the scrollable curve, the boundary.
- [ ] `citizen.spec.ts`: the keep-next sentence's figure equals `keepNext` from the page's own `/api/evaluate` response; a plateau household (one with no cliff in the next $10k and keep < 10¢) says "plateau"; the far-cliffs line's threshold equals the ladder's.

## Caseworker (`app/src/caseworker/**`) — asks it of this family, per what-if

- [ ] **Keep rate per what-if column** under *Change from now*: *"keeps 12¢ of each extra dollar"* = Δnet ÷ Δpay between the base and the what-if; blank where pay did not change (a take-up toggle). `caseworker.compare.rows.keep` in the catalog; the client sheet prints it.
- [ ] **Cliffs between now and each what-if**, in order, with the deferred badge where it applies, as the column's own list under the table (*"On the way: $39,000 food help ends (−$3,513)"*). `cliffsBetween` from core; O(cliffs) per column.
- [ ] The whole-axis "worst step" line in the readout moves below the family's own next cliff; the ledger and coverage block unchanged.
- [ ] `caseworker.spec.ts`: a pay what-if's keep cell equals Δnet/Δpay from the two responses; a toggle what-if's is blank; the on-the-way list equals `cliffsBetween` on the base curve.

## Design

- [ ] `design/inventory.md`: a *KeepRate* entry (where it appears on each surface, the cents phrasing, the diverging bins with 0 fixed, the sign words), the *position* phrase added to the Program phrases / Verdict catalog rules, and the two measure groups in FilterRow (#21). `design/charts.md`: the diverging ramp for a measure with a meaningful zero. `design/README.md`: the "one question, three lenses" sentence, and the no-composite rule restated with the keep rate named as a measure, not a score.
- [ ] The system's visual review (the `frontend-design` skill, B/S/N) on the three changed surfaces before merge; a cold-reader re-run on the journalist page is the acceptance test (the lede must carry the keep rate, where the road collapses, and who is there).

## Order and effort

| Phase | Depends on | Size |
|---|---|---|
| Core (`road.ts`, positions, `keepNext`, messages) | — | 1 day |
| Pipeline fields + `--from-data` | core | half a day |
| Journalist page (groups, diverging bins, readout, table, CSV, reach back) | data | 1.5 days |
| Citizen (keep-next sentence, far-cliffs frame) | core | half a day |
| Caseworker (keep per column, on-the-way list) | core | half a day |
| Design docs, visual review, cold re-run, Spanish for the new strings | all | 1 day |

One branch, one agent, the journalist page last so the data and core land first; a native-review flag on every new Spanish string.

## Not doing, and why

- **No composite score, no "regressivity index."** The keep rate is one quantity with a definition; ranking states by it is ranking by a measure, which the map already does for six others.
- **No change to the sweep, the axis or the household.** The road is read off curves that already exist.
- **Not switching the road to the state's own floor and median** (measured; it rewards low wages). The typical-family view — "what's ahead at the median" — is available from position and `cliffsBetween` and can be a later measure in the "on the road" group if a reader asks for it; it is not needed to fix the headline.
- **No per-state curve on the journalist page**; the caseworker page is the curve, as before.
