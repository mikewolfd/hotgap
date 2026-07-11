# Post-merge notes — personal door v1 (2026-07-11)

Deferred findings from the final whole-branch review (all judged non-blocking):

## Product / UX
- Military APO/FPO ZIP prefixes (090-098, 962-966) get generic "does not look right" copy
- Kid-disability checkbox is a native control (<44px on its own); invalid age has no inline hint
- Leading "0" in the pay field flashes clear via the money-text resync
- No focus management on loading->result/error transitions; radio chips lack roving tabindex
- "fewer/more kids" aria-labels hardcoded (not in en.json); "$/hour" chart unit labels likewise
- ~~result.chart.yLabel string is unused (y-axis unlabeled beyond $Nk ticks)~~ RESOLVED
  (Plan 4, Task 28): repurposed as a real rotated y-axis label on `CurveChart`, carrying the
  health-adjusted "after health costs" framing.
- Lost-program with $0 current value reads oddly in the why-list

## Engineering
- contract/ and app/e2e outside tsc typecheck project (add a tests tsconfig)
- PayUnit switches lack exhaustiveness guards; PROGRAM_IDS could be readonly as const
- parse.ts: prefer `in` over truthy check; programs Record type can under-populate keys
- Two-source program summing (head_start + early_head_start) unpinned by unit test
- Contract fixture request hand-aligned with buildPEPayload — generate it from buildPEPayload
- vitest exclude glob "**/e2e/**" is broad
- Worker: duplicated timeout-name condition; /api/health accepts POST; spouse earnings
  validated before zeroing when unmarried
- d3 y.ticks(4) can render 5 ticks; chart danger rects use index keys

## Before public launch
- Add AGPL source link to the site footer (§13 hygiene + civic trust)
- Consider Cloudflare rate-limit rule (open proxy to PolicyEngine; cache keys are exact
  floats — rounding earnings to $100 in validate would raise hit rates)
- Document the 7-day edge cache in a privacy note
- Spec records "Why?" expanders with EMTR slopes; shipped as a flat why-list (scope cut)

## Next: Plan 2 — places door
Batch pipeline (Python + policyengine-us, GitHub Actions weekly) -> state gap scores
("biggest possible loss" + danger-zone width per archetype) -> choropleth + drill-down,
plus per-state archetype fallback curves for the personal door's error path.

# Post-merge notes — places door (2026-07-11)

Deferred from the places-door final review (all non-blocking):
- Code-split the places route (React.lazy) — topology+summary ride in the main chunk (~106KB gzip total)
- Quantile bins (with plain-words legend) would discriminate better than equal-width-from-zero
- Radio chips lack APG roving tabindex (both flow and places pickers); stepper count not aria-live
- State <select> has no disabled "Choose a state" placeholder option
- Pipeline: no User-Agent identifying the bot; 400s retried same as 5xx
- topojson-specification used but undeclared (transitive dep); credit us-atlas/Census in README
- dangerWidth shipped in summary.json but unused in UI
- Fallback picker ignores age/disability/rent (framed by the assumptions line, but could match better)
- PlacesPage tests couple to live summary.json values (may need updating after weekly refreshes)
- Manual screen-reader pass (VoiceOver/NVDA) on the map still recommended

# Post-merge notes — escape metrics (Plan 3, 2026-07-11)

Deferred from the whole-branch review (non-blocking):
- summary.json ships `safeExit` per archetype but the app never reads it (drill-down recomputes it live); like `dangerWidth`, it's a duplicated/unused bundled field — trim or consume.
- StatePanel recomputes escapeAnalysis+narratePlacesEscape on every render (unmemoized); trivial cost, but a useMemo would match the page's discipline.

Plan 4 candidate (researched, see docs/research/2026-07-11-wage-distribution-data-sources.md):
- A "reach" metric — overlay the leap on real wage distributions to answer "is the jump attainable?" Verify PolicyEngine's enhanced-CPS microdata (state-keyed household incomes) is reusable from our pipeline FIRST; else ACS PUMS. Cross-sectional feasibility signal only, never framed as mobility odds.

# Post-merge notes — health-adjusted resources (Plan 4, 2026-07-11)

Deferred from the whole-branch review (non-blocking):
- EscapePath can render "Your path off help" with only the health-cost line (always_up household with health cost, no cliff/leap/thresholds); intended + test-covered, but consider a neutral wrapper heading if it ever reads oddly.
- Two doors surface health cost at different granularity by design: personal door shows a concrete dollar figure at the user's earnings; map drill-down shows only the static framing note (an archetype has no "current earnings"). Honest, not inconsistent.
