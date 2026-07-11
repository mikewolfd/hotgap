# HotGap Health-Adjusted Resources Implementation Plan (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fold the real-world cost of health coverage into the resources curve — transparently — so the money line becomes "money left after paying for health," using the federal SPM medical-out-of-pocket measure, not Medicaid's contested sticker value.

**Owner directive:** "fold coverage in, think about the real-world implications/cost one would gain/lose, but be transparent about it."

**Key finding (verified live 2026-07-11 — drives the whole design):** Subtracting `spm_unit_medical_out_of_pocket_expenses` (SPM MOOP = premiums net of subsidy + non-premium out-of-pocket) is the honest "real cost of health." For a TX single-parent-of-2 across the Medicaid phase-out ($36k→$42k), the Medicaid *sticker* value drops $23,610 but real MOOP barely moves ($1,175→$1,937) because subsidized ACA cushions the loss. So folding in the honest cost does NOT manufacture fake Medicaid cliffs; it reframes the curve as after-health resources and surfaces the health cliffs that are genuinely real (ACA 400% FPL subsidy cliff, 250% FPL cost-sharing loss). This validates PolicyEngine's exclusion of Medicaid value from cash net income while still honoring "fold it in."

## Design

**Core change (data layer, so everything downstream inherits it):** fetch `spm_unit_medical_out_of_pocket_expenses`; in parse, set each `CurvePoint.netIncome = raw household_net_income − medicalOOP`, and expose `medicalOOP` on the point for display. All downstream — analyzeCurve, escapeAnalysis, narration, the pipeline, the map — then operates on the honest after-health figure with no further logic changes.

**Transparency (the load-bearing half of the directive):**
- The chart/axis label becomes "money left after paying for health" (personal door + map drill-down).
- A new why-list / path-off-help line surfaces the health cost explicitly ("You'd pay about {amount} a year for health coverage at this pay.") so the adjustment is never hidden.
- The honesty box gains one sentence explaining we count what you actually pay for coverage (premiums + out-of-pocket), and that losing Medicaid usually means moving to subsidized coverage, not losing its full value.
- Medicaid/CHIP stay in the why-list as coverage you receive (not a cash line), with plain framing.

**Not doing:** adding Medicaid actuarial value as phantom income (overstates); a separate toggle (owner chose to fold into the main curve). Medicare stays out — it's 65+ and not means-tested, no cliff.

## Global Constraints

All standing constraints (AGPL, TS strict, copy via t()/en.json + readability gate ≤5.9/≤8.0 never raised, show-explain-never-advise, no input logging, 44px/WCAG AA, conventional commits). Branch: `health-adjusted`. This change alters committed fixture net-income values and all state data — regeneration and pinned-value updates are expected and in-scope.

## Verified ground truth (probed live 2026-07-11)
- `spm_unit_medical_out_of_pocket_expenses` [spm_unit] returns the SPM MOOP; `spm_unit_non_premium_medical_out_of_pocket_expenses` and tax-unit `marketplace_net_premium` are the components (net premium dominates for subsidized families). All accepted by `/us/calculate`.
- TX single-parent-2: MOOP rises smoothly $630 (at $30k) → $3,022 (at $50k); it does NOT jump at the Medicaid cliff.
- Subtracting MOOP keeps the fixture's real cliffs (Head Start etc.) and shifts absolute net values down by MOOP.

---

### Task 26: Fetch + subtract MOOP in shared/worker; expose medicalOOP

**Files:** `worker/src/translate.ts` (request the MOOP var), `shared/src/types.ts` (`CurvePoint.medicalOOP`), `shared/src/parse.ts` (subtract MOOP from netIncome, populate medicalOOP), `contract/policyengine.contract.test.ts` (assert MOOP array), regenerated fixtures (controller runs), + all affected tests.

- translate.ts: add `spm_unit_medical_out_of_pocket_expenses: y(null)` to the spm_unit vars.
- types.ts: `CurvePoint` gains `medicalOOP: number`.
- parse.ts: read the MOOP series; `netIncome = rawNet[i] − moop[i]`; `medicalOOP = moop[i]`. Keep programs untouched (Medicaid stays a program value for the why-list).
- Contract test: add MOOP to the 101-array assertions.
- **Fixture regen is controller-run** (needs the new var): after this task's code lands, controller re-fetches `fixtures/pe-ca-single-1kid-101.json` with MOOP included and updates ALL pinned net-income values across shared/pipeline/app tests. Implementer: write the code + update the parse test's own expectations against a small hand-built fixture or the (soon-regenerated) committed one; flag every other test file that pins fixture net-income numbers so the controller regen step knows what to update.
- TDD; conventional commit `feat(shared): count real health cost (SPM MOOP) in net resources`.

### Task 27: Controller fixture + data regeneration
- Controller: regenerate the CA fixture with MOOP; re-run `npx tsx pipeline/src/run.ts --concurrency 3` for all 51 states (net values now after-health); recompute summary via the pipeline. Update every pinned test value (analyze cliff, escape safeExit/leap, narration wages, pipeline metrics, places component tests). This is mechanical but broad — do it as a controller step with the whole suite as the gate, not a subagent.
- Commit `data: regenerate state curves and fixture with health-adjusted net resources`.

### Task 28: Personal door transparency
**Files:** `app/src/result/*`, `app/src/lib/narration.ts`, `en.json`.
- Chart title/axis → after-health framing (new strings).
- WhyList or EscapePath gains a health-cost line ("You'd pay about {amount} a year for health coverage at this pay." — derived from the current point's medicalOOP at the user's earnings).
- Honesty box gains the one explanatory sentence (coverage cost is counted; losing Medicaid usually means subsidized coverage, not full loss).
- Readability gate green; tests + e2e updated. Commit conventional.

### Task 29: Places door transparency + docs
**Files:** `app/src/pages/*`, `en.json`, spec, README, `docs/post-merge-notes.md`.
- Map/drill-down labels reflect after-health resources; drill-down surfaces the state's health-cost context where it fits.
- Spec: document the health-adjusted measure + the MOOP-vs-sticker rationale + the verified finding. README one-liner.
- Commit conventional.

### Task 30: Final review + merge
Whole-branch review (most capable model) with special attention to: is the after-health reframing honest and clearly labeled everywhere; do any pinned numbers disagree cross-package after regen; does the Medicaid-cushion finding hold in the shipped copy (no over-claimed health cliffs). Fix Criticals/Importants; merge `health-adjusted` to main.

## Self-review notes
- Folding MOOP at the parse layer means analyze/escape/narration/pipeline/map need NO logic changes — only the data changes — which is why regen + pinned-value updates are the bulk of the work.
- The finding (honest folding cushions the Medicaid cliff) must survive into user-facing copy: do NOT let any string claim a family "loses $23,000" of Medicaid.
- MOOP for a household on Medicaid is small but nonzero; that's correct (Medicaid has minimal cost-sharing), not a bug.
