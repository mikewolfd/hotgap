# Post-merge notes — personal door v1 (2026-07-11)

Deferred findings from the final whole-branch review (all judged non-blocking):

## Product / UX
- Military APO/FPO ZIP prefixes (090-098, 962-966) get generic "does not look right" copy
- Kid-disability checkbox is a native control (<44px on its own); invalid age has no inline hint
- Leading "0" in the pay field flashes clear via the money-text resync
- No focus management on loading->result/error transitions; radio chips lack roving tabindex
- "fewer/more kids" aria-labels hardcoded (not in en.json); "$/hour" chart unit labels likewise
- result.chart.yLabel string is unused (y-axis unlabeled beyond $Nk ticks)
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
