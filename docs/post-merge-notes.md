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

# Post-merge notes — model honesty (Plan 6, 2026-07-11)

Deferred from the whole-branch review (non-blocking):
- Toggles.tsx has a dead `if(visible.length===0) return null` branch (housing/ESI rows are always shown) — harmless defensive code.
- ESI inputs are set on "you" only (correct for a single family ESI plan; adding to spouse would double the premium).
- Fallback path (live API down) ignores take-up toggles — it serves the honest-baseline archetype curve, so a flip has no effect in degraded mode. Archetype curves only exist for the baseline; revisit if per-toggle fallbacks are wanted.
- Each toggle flip briefly shows the loading spinner (whole-page loading state) before the recomputed result — UX polish, not a defect.

Still open from the adversarial review (Plan 7+ candidates): reach income-concept mismatch (employment vs household income) + vintage; uncertainty bounds on reach; external validation vs Atlanta Fed PRD; take-up modeled as user input, not probability; assets/immigration/other-income/household-composition questions; county-level (Plan 7); CCDF childcare subsidy (blocked on PolicyEngine).

# Post-merge notes — county-level (Plan 7, 2026-07-11)

Deferred from the whole-branch review (non-blocking):
- No runtime shape-validation of the fetched crosswalk JSON (self-generated, same-origin; worker re-validates FIPS format — end-to-end safe).
- translate uses truthy `if(a.countyFips)` not `!==null` (safe: validate only ever yields a 5-digit string or null).
- No App.test for the mount-effect crosswalk load (covered by the deterministic e2e).
- Contract PTC-diff threshold is loose ($100 vs ~$2,200 observed) — deliberate anti-flake margin.

County scope reminder: county is a live personal-door enhancement only (ACA rating-area accuracy, meaningful in high-cost states, ~nil in flat ones). The map stays state-level by design.

# Post-merge notes — reach earnings basis (Plan 8, 2026-07-11)

Whole-branch review (Opus) verdict: READY, no Critical/Important. Data
independently re-validated (all 398 non-null cells monotonic, non-negative,
21 points; WY single-2 median $47,000 = design probe $42k × 1.12). Two Minor
items fixed in the builder (dead `fips` param removed; numeric-column quote-
stripping made fail-safe for a future PUMS vintage — output-neutral today).

Accepted tolerances (not changed — swamped by the deliberately-approximate
×1.12 inflation factor and $100 rounding):
- ADJINC (2023 ≈ 1.006, converts rolling-reference income to survey-year
  dollars) is not applied; <1% effect.
- Earnings floor WAGP and SEMP per-component at 0, so a business loss that
  offsets wages isn't netted. This is the documented intent; direction is
  mildly non-conservative (nudges the jump to look marginally easier);
  magnitude negligible.

Still-open review items unchanged: uncertainty bounds on the reach line;
external validation vs Atlanta Fed PRD; the no-escape next-step resource
pointer (deferred per user "not now").

# Core split (2026-09-14)

The React UI (`app/`), design system, Claude Design sync inputs
(`.design-sync/`), and Cloudflare Worker (`worker/`) were archived out of
this repo to git tag `ui-archive`; the deployed site at
hotgap.hotgap.workers.dev keeps running untouched. What remains is the
calculation library and its supporting data/tooling: `core/` (`@hotgap/core`,
formerly `shared/`), `pipeline/`, `scripts/`, `contract/`, `fixtures/`,
`docs/`.

UI-only modules went with the archive: narration, chart labels, map color
ramps, `en.json` strings, the readability gate, and the Playwright e2e
suite. They had no life outside the site.

The modules that were genuinely shared logic, not UI, moved into
`@hotgap/core` instead of being deleted: `worker/src/translate.ts` and
`worker/src/validate.ts`, and `app/src/lib/{zip,county,fips,states,minWage,
reachLookup,fallback}.ts`. They now live at `core/src/translate.ts`,
`core/src/validate.ts`, `core/src/zip.ts`, `core/src/county.ts`,
`core/src/states.ts`, `core/src/minWage.ts`, `core/src/reachLookup.ts`, and
`core/src/fallback.ts`.

The state list was previously duplicated: `validate.ts`'s state check and
the pipeline's `ALL_STATES` sweep list were each their own hand-maintained
array. Both now derive from `core/src/states.ts`'s `STATE_CODES` — one list
of states in the repo, checked everywhere else against it.

Weekly-sweep noise-commit fix: `pipeline/src/run.ts` now compares each new
summary/state file against what's on disk with the `generated` timestamp
stripped, and skips writing (so nothing is git-added) when the numbers
themselves are unchanged. `generated` in the committed data means "the sweep
that last changed this file's numbers," not "the most recent sweep to run" —
see `core/src/data.ts`.

Still-open items carried forward (not UI-specific, so not resolved by the
split): uncertainty bounds on reach; external validation vs the Atlanta Fed
PRD; assets/immigration/other-income (and household-composition) input
questions; CCDF childcare subsidy, blocked on PolicyEngine support.

Rounding domain (found while proving the noise fix): the sweep stored whole-dollar
curves but computed `summary.json` from the unrounded floats, so `--from-data`
drifted by $1 in 114 `biggestLoss` cells and by one $1,000 grid step in six
Kansas escape metrics — the summary disagreed with its own stored curve. The
sweep now rounds each curve once at ingestion and derives both artifacts from
the same points; `summary.json` was rebuilt from the stored curves.

# Net-income correction (2026-09-14)

A methodology review (a policy-fellow agent; top finding re-verified by a
direct PolicyEngine decomposition on a second household) found that
`core/src/parse.ts` computed `net = household_net_income − premium_tax_credit −
MOOP`. The premise, recorded in the July adversarial review and in Plan 4/6,
was that PolicyEngine's net income already contained the PTC. It does not:
`household_net_income == household_market_income + household_benefits +
household_refundable_tax_credits − household_tax_before_refundable_credits` to
the dollar, and the refundable credits are the EITC and refundable CTC only.
MOOP is already the premium net of the PTC, so the stored curves were cash
minus the GROSS premium — the subsidy was erased. The fix is `net = rawNet −
moop`; the contract suite now pins the identity live. Regenerating the sweep
changes most cells: on the CA single-parent fixture, safe exit moves $81k →
$91k because the real 400%-FPL subsidy cliff ($84k) becomes visible, and the
leap shrinks $52k → $45k.

Every factual claim in that review was then validated against primary federal
and state sources by four independent research agents plus two follow-ups;
see `docs/reviews/2026-09-14-methodology-validation.md` for the verdicts,
the corrections to the review (NY Essential Plan now ends at 200% FPL; the
Massachusetts TAFDC figures came from PolicyEngine and are wrong; children's
Medicaid cannot end mid-year), and the split between HotGap fixes and
PolicyEngine upstream reports.

Still open from the same review, each a methodology decision: coverage-gap
households in the nine non-expansion states are charged the full benchmark
premium instead of being uninsured; the employer-coverage premium constants
never reach the money line; cliff labels name programs that merely phased
down; program-end and benefits-end mix children's and parents' limits and
sticker values; "disabled" models SSI only (no SSDI/SGA cliff); reach ladders
include retirees and ignore spouse earnings; personal safe-exit/leap are
whole-curve rather than zone-relative; Head Start is a $22k sticker value with
an instant cliff; the sweep axis stops at $100k.
