# Local PolicyEngine corrections

## Workarounds to retire

Every item below is a hack around a PolicyEngine defect. Most are marked
`WORKAROUND` in the code — check with `grep -rn WORKAROUND core/src` — but a
few (noted below) simply supply a value PolicyEngine would otherwise get
wrong, without a literal `WORKAROUND` comment; they belong in this table on
the same footing, since the defect and the retirement condition are just as
real. Each row names what removes it.

| Workaround | Code | Retire when |
|---|---|---|
| Six parent-Medicaid limits sent as request parameters | `core/src/policyOverrides.ts` | policyengine-us PR #9475 merges and the API serves it (issue #9474) |
| New York BHP list emptied for the whole 2026 scenario | `core/src/policyOverrides.ts` | upstream handles the 2026-07-01 change sub-annually (issue #9471; a parameter fix is inert, see the issue comment) |
| Massachusetts TAFDC grant recomputed locally | `core/src/maTafdc.ts`, `ma_tafdc_*` inputs in `translate.ts` | PRs #9477 and #9478 merge (issues #9469, #9470) |
| Corrected grant fed back one point at a time so SNAP follows it | `core/src/client.ts` `resampleMaTafdc` | same as above — the loop then makes zero requests and can be deleted |
| Coverage-gap adults' phantom premium zeroed | `core/src/evaluate.ts` `applyCoverageGap` | upstream gates marketplace take-up on subsidy eligibility (issue #9472) |
| Employee ESI contribution replaces the marketplace premium | `core/src/evaluate.ts` `applyEmployerCoverage` | upstream models the employee share (issue #9473) |
| State $0-premium marketplace tiers (CT, MA, NM, CA) modeled locally | `core/src/statePremiumWraps.ts`, `core/src/evaluate.ts` `applyPremiumWrap` | policyengine-us #9481 models the state wraps |
| `tax_unit_is_filer: true` sent on every request (no `WORKAROUND` comment — see note above) | `core/src/translate.ts` | policyengine-us #9479 derives filer status from APTC eligibility rather than the ordinary filing thresholds |
| A real county sent for every archetype and every resolved ZIP/county (no `WORKAROUND` comment) | `core/src/stateDefaults.ts`, `core/src/archetypes.ts` `answersFor` | policyengine-us #9480 fixes the default rating area — but sending a real county is correct regardless of that fix, so only the DEFECT this sidesteps retires; the input itself should stay |
| SSDI recipient modeled as on Medicare (Part B charged; no marketplace premium or credit) — no `WORKAROUND` comment | `core/src/evaluate.ts` `applyMedicare` | upstream models Medicare enrollment/entitlement for an SSDI beneficiary directly; no issue is filed for this because HotGap has not found any evidence PolicyEngine tracks Medicare entitlement at all |

**Upstream-only, nothing to retire here:** policyengine-us #9482 (Alaska and
Hawaii's marketplace subsidy computed against the 48-contiguous-states
poverty guideline instead of their own) is not a HotGap workaround. HotGap's
own `fpl2025` table (`core/src/policyYear.ts`) already carries the correct
Alaska and Hawaii guidelines for the coverage-gap and premium-wrap
corrections above; the defect is in the marketplace premium and credit
PolicyEngine itself returns, which HotGap does not and cannot correct from
outside the API. Nothing in this repo changes when #9482 merges.

HotGap now corrects six parent-Medicaid limits, New York's Essential Plan
ceiling, the Massachusetts TAFDC earnings formula, four states' $0-premium
marketplace tiers, the filer flag, the default rating area, and Medicare
enrollment for an SSDI recipient. The existing coverage-gap and
employer-premium corrections remain in `evaluate.ts`.

## Parameter overrides

`core/src/policyOverrides.ts` holds the values and sources. `buildCurvePayload`
attaches the effective overrides to the public calculate request; both
`fetchCurve` (including each SSDI request) and the weekly pipeline use it.
The cache key includes the full request and effective policy values, so changing
an override, a requested variable, the policy year or the axis invalidates the
old entry. `requestPE` remains a raw transport for controlled upstream probes.
Live reform requests took 34–39 seconds. `fetchCurve` therefore defaults to a
90-second timeout when it sends parameter overrides, keeping the 25-second
default for other requests and honoring any explicit caller timeout.

Five states use household-size dollar tables, not a fixed percentage derived
from a family of three. Texas also distinguishes one-parent and two-parent
households. Tables cover sizes 1–8, the full range HotGap accepts. Limits include
the applicable Modified Adjusted Gross Income (MAGI) disregard exactly once:

| State | Family of three, annual limit | Source |
| --- | ---: | --- |
| TX, one parent | $4,126.20 | [HHSC C-131.2 and C-131.4](https://fhb.hhs.texas.gov/handbooks/texas-works-handbook/c-130-medical-programs) |
| MS | $5,976 | [Division of Medicaid, effective March 2026](https://medicaid.ms.gov/medicaid-coverage/who-qualifies-for-coverage/income-limits-for-medicaid-and-chip-programs/) |
| GA | $7,944 | [DFCS Appendix A2, published “Plus 5%” column](https://pamms.dhs.ga.gov/dfcs/medicaid/appendix-a2/2026-family-limits/) |
| FL | $7,200 | [DCF Appendix A-7, standard plus both disregards](https://ffic.myflfamilies.com/manual/essfiles/30446.pdf) |
| WY | $11,842 | [Department of Health, Family MAGI standard](https://health.wyo.gov/healthcarefin/medicaid/programs-and-eligibility/medicaid-income-requirements/), plus 5% of the poverty guideline |
| SC | $18,304.40 | [SCDHHS, 67% of the poverty guideline](https://www.scdhhs.gov/sites/dhhs/files/pdf/links/Medicaid%20Eligibility%20Groups%20Effective%201.1.pdf) |

The dollar-to-fraction conversion uses PolicyEngine's 2026 Medicaid denominator:
$15,960 for one person plus $5,680 per additional person. It retains full
precision. Georgia's published inclusive dollar column governs even though
its increment differs slightly from a freshly calculated five percentage points.

For New York requests, the expanded Basic Health Program state list becomes
empty. This models the 200% ceiling after the July 1, 2026 termination of the
250% expansion. [CMS approved the termination on March 20, 2026.](https://www.cms.gov/files/document/1332-ny-termination-approval-letter.pdf)
Other states receive no list override.

**Time basis:** these are annualized scenarios under the current rules. They
do not blend New York's first and second halves of 2026 or prorate the parent
limits before their 2026 effective dates. The 2026-only guards require reviewing
the sources when the policy year changes.

## Massachusetts TAFDC

`core/src/maTafdc.ts` replaces the earnings and income-test portion of
Transitional Aid to Families with Dependent Children (TAFDC) for ongoing
recipients after the six-month full earnings disregard. It applies before
cliff analysis. Each earner receives a deduction capped at $200/month of their
own earnings, then half the remaining earnings are counted. The calculation
retains PolicyEngine's payment standard, non-financial eligibility, unearned
income, dependent-care deduction and eligible-child allowance amounts.

**Which regime this is:** Massachusetts publishes two. TAFDC disregards
100% of earnings for a case's first six months, then applies the $200/month
per earner plus 50%-of-the-rest rule modeled here for as long as the case
stays open (106 CMR 704.281). Everything in this file is the SECOND,
ongoing-recipient regime — the one a household actually lives on. DTA's own
published examples are the first: the FY2026 TAFDC report's "$7,512 at
$15,600 of earnings for a family of three" is a YEAR-ONE figure, six months
at the full disregard and six at the ongoing 50% rule, where this formula
gives $4,212 for the same family at the same pay. Neither number is wrong —
they are different years of the same case — but a reader comparing HotGap
against a DTA example has to know which year it is.

The monthly grant is rounded down to whole dollars, with no cash payment below
$10, following [106 CMR 704.260, .270, .281(B) and .500(A)](https://www.mass.gov/doc/106-cmr-704-transitional-cash-assistance-program-financial-eligibility/download).
The [current payment-standard table](https://www.mass.gov/doc/table-of-need-payment-standards/download)
raises September's standard by $500 per eligible child. The calculation budgets
that increase for one month, including where the ordinary monthly grant is zero.
An eligible infant's separate benefit is retained while the household satisfies
the ordinary income test.

For two parents and three children in private housing, with one earner and no
other income or childcare deduction:

| Earnings | Upstream annual TANF | Local annual TAFDC cash, ongoing grant plus September |
| --- | ---: | ---: |
| $24,000 | $10,380 | $4,980 |
| $25,000 | $10,130 | $4,476 |
| $26,000 | $9,880 | $3,972 |
| $27,000 | $0 | $3,480 |
| $30,000 | $0 | $1,980 |
| $31,000 | $0 | $1,498 |

The total cash figure is unchanged by the 2026-09-15 ongoing/September
split — only which field carries which part of it changed.
`programs.tanf` (`maTafdcGrantParts`'s `ongoing`) reaches break-even at
$30,960, before the $10 minimum-payment rule, and reports $0 from there on:
so "TANF ends" now means that ongoing grant's end. The September
supplement — $500 per eligible child, budgeted for one month even when the
ordinary monthly grant is $0 (`septemberExtra`) — is counted separately, as
cash under `otherBenefits`, and can survive past $30,960; it is not an
ongoing program and does not appear as one.

**Duplicate benefit:** the served model counts TAFDC twice: once through
`tanf` and again through `household_state_benefits`. At $26,000 in the example,
both contain $9,880. The duplicate also appears in HotGap's `otherBenefits`
remainder. The local correction removes that duplicate from net income and
the remainder, then replaces the remaining TANF with the corrected grant.
Without this step, part of the false cliff survives under an unnamed benefit.
The returned points record that the duplicate was removed, so evaluating them
again does not subtract it twice.

The paths are explicit in PolicyEngine's
[household benefit list](https://github.com/PolicyEngine/policyengine-us/blob/main/policyengine_us/parameters/gov/household/household_benefits.yaml)
and [state benefit list](https://github.com/PolicyEngine/policyengine-us/blob/main/policyengine_us/parameters/gov/household/household_state_benefits.yaml).
A live counterfactual setting `tanf` to zero leaves the $9,880 in state
benefits. These assumptions are pinned by the live regression case and must
be rechecked when upstream changes.

**Linked benefits (added 2026-09-15):** after the axis request, the client
re-requests every earnings point whose corrected grant differs from
PolicyEngine's, one point at a time, with `ma_tafdc` forced as a scalar
SPM-unit input on a two-point axis (`client.ts` `resampleMaTafdc`). A scalar
SPM input broadcasts across an axis, so PolicyEngine recomputes SNAP, EAEDC,
categorical eligibility and net income from the corrected grant itself — no
local benefit math. Verified live: at $26,000 with the grant forced to $3,972,
SNAP rises from $6,019 to $7,836 and net income falls from $109,799 to $99,800.
Each fed-back point carries `engineUsedCorrectedGrant: true`; the correction
reports `linkedBenefitsRecomputed` and its message changes accordingly.
Cost, measured 2026-09-15 on fresh households (PolicyEngine caches repeats):
a five-person household needs ~64 point requests, 49 s three at a time, 27 s
at six, 21 s at ten, and 45 s at fifteen as the API saturates — so the loop
runs eight at a time (`resampleConcurrency`; the sweep passes 3 because it
already runs three households at once). Differences of $100 or less are not
fed back (SNAP moves under $30 for them; they are mostly the September
clothing allowance's tail). A fresh worst-case household evaluates end to end
in about 26 s; a repeat is a cache hit; the offline archetype path is instant
because the weekly sweep stores the fed-back points. The step is a no-op
once upstream's formula matches the state's rules. What remains unmodeled is
the six-month full disregard's timing and new-applicant eligibility. Two
alternatives were tried and rejected: an array of grants along the axis (HTTP
500) and a second, parallel axis on `ma_tafdc` (rejected twice, in two ways —
the public endpoint varies one person-level variable).

The API rejected an array of corrected grants on an earnings axis with HTTP
500 (`setting an array element with a sequence`). That probe is retained;
it does not establish that every possible way to recalculate linked benefits
is unavailable.

## Stored data and verification

State files retain the upstream TANF plus the `maTafdc` inputs, allowing the
local correction to be replayed without another API call. `evaluateOffline`
uses the swept archetype's answers, including its zero spouse income, rather
than mixing the caller's personal inputs into the baseline. `buildSummary`
uses the shared evaluation for every state, including the existing coverage-gap
premium correction, so rankings agree with offline evaluations. `--from-data` can
rebuild those metrics without altering the stored points. Old curves missing
the required inputs retain upstream TANF with an explicit warning.

Recorded request/response pairs in `evidence/`:

- `local-sc-policy.*`: the corrected parent limit; children retain Medicaid.
- `local-ny-policy.*`: $36,000 yields about $5,387 in premium tax credit and
  $2,773 in net premium.
- `local-ma-tafdc.*`: raw TANF and all inputs for the local calculation.
- `local-ma-array.*`: the rejected array-input probe.
- `local-ma-double-count.*` and `local-ma-tanf-zero.*`: the duplicate benefit
  and the counterfactual that leaves it in state benefits.

Regression tests cover dollar-table conversion, household size, two earners,
unearned income, monthly rounding, September allowances, cache invalidation,
both SSDI requests, retained inputs, offline calculation and summary metrics.
`npm run contract` includes live SC, NY and MA regression cases.

Completed validation:

- TypeScript checks and 246 local tests passed.
- All 12 live checks passed with the longer reform timeout; the Massachusetts
  test passed again after adding duplicate removal and a no-cliff assertion.
- Refreshed all eight affected states. Rebuilt all 51 summary rows from stored
  data, including the shared coverage-gap correction.
- All 408 state/archetype entries match offline evaluations for leap and largest
  loss; rebuilding the summary reproduces it exactly. The six parent-Medicaid
  endpoints agree with the sourced limits at the sweep's $1,000 resolution.
- The Massachusetts married/three-child curve has no cliff at $26,000. For
  single parents with two children, the leap estimate changes from $44,000 to
  $17,000. These corrected estimates still carry the linked-benefit limitation.

The recorded [validation results](evidence/local-validation.json) include the
starting HotGap commit and before/after values. Summary metrics also change in
AL, KS and TN because they now include the existing coverage-gap correction;
their stored source curves were not reswept.

## Removing a correction

The source links and issue-report links are beside each override. The issue
reports in this repository are drafts; no upstream issue was filed by this
change. Recheck the served calculate endpoint when upstream changes, remove
the applicable correction only after the live baseline matches, then resweep
the affected states. Updating source files upstream alone does not prove that
the public endpoint serves the fix.
