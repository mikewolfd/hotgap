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
| Massachusetts TAFDC grant recomputed locally | `core/src/maTafdc.ts`, `ma_tafdc_*` inputs in `translate.ts` | PR #9477 merges (issue #9469) |
| Massachusetts TAFDC's second copy removed from net income | `core/src/parse.ts` `duplicatedTanf`, `core/src/client.ts` `probeMaTafdcDoubleCount` | nothing to do: PR #9478 merged and shipped in policyengine-us 2.4.4 (issue #9470). The client probes each endpoint once — forces `ma_tafdc` to $1,000,000 on a bare MA household and reads `household_state_benefits` back — and removes the copy only where the probe finds it, so the public API (1.764.6, still double-counting) and the self-hosted engine (2.5.0, fixed) each get the right treatment. Delete the probe and `duplicatedTanf` once the public API is on ≥ 2.4.4. |
| Corrected grant fed back one point at a time so SNAP follows it | `core/src/client.ts` `resampleMaTafdc` | same as above — the loop then makes zero requests and can be deleted |
| Coverage-gap adults' phantom premium zeroed | `core/src/evaluate.ts` `applyCoverageGap` | upstream gates marketplace take-up on subsidy eligibility (issue #9472) |
| Employee ESI contribution replaces the marketplace premium | `core/src/evaluate.ts` `applyEmployerCoverage` | upstream models the employee share (issue #9473) |
| State $0-premium marketplace tiers (CT, MA, NM, CA) modeled locally | `core/src/statePremiumWraps.ts`, `core/src/evaluate.ts` `applyPremiumWrap` | policyengine-us #9481 models the state wraps |
| `tax_unit_is_filer: true` sent on every request (no `WORKAROUND` comment — see note above) | `core/src/translate.ts` | policyengine-us #9479 derives filer status from APTC eligibility rather than the ordinary filing thresholds |
| A real county sent for every archetype and every resolved ZIP/county (no `WORKAROUND` comment) | `core/src/stateDefaults.ts`, `core/src/archetypes.ts` `answersFor` | policyengine-us #9480 fixes the default rating area — but sending a real county is correct regardless of that fix, so only the DEFECT this sidesteps retires; the input itself should stay |
| State child-care subsidy added to net income in the states upstream omits | `core/src/evaluate.ts` `applyChildcareSubsidy`, `core/src/stateChildcareSubsidies.ts` | policyengine-us #9405 adds every `child_care_subsidy_programs` entry to `gov.household.household_state_benefits` (or replaces the per-state entries with the aggregate) |
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
marketplace tiers, the filer flag, the default rating area, Medicare
enrollment for an SSDI recipient, and the child-care subsidy's missing path
into net income. The existing coverage-gap and employer-premium corrections
remain in `evaluate.ts`.

## The child-care subsidy (CCDF)

Three separate things, only one of which is a HotGap workaround.

**1. Our own payload was the reason the July probe found $0.**
`childcare_expenses` is a DERIVED variable — upstream defines it as
`pre_subsidy_childcare_expenses - child_care_subsidies`. HotGap sent the
household's bill as `childcare_expenses`, which forces the derived value and
leaves `spm_unit_pre_subsidy_childcare_expenses` at its $0 default, so every
state's CCDF formula had no provider charge to reimburse. Sending the same
bill as the pre-subsidy figure instead is the whole fix; nothing upstream has
to change. Colorado, single parent, one 3-year-old, $9,600/yr, four earnings
points: $0/$0/$0/$0 as `childcare_expenses`, $9,450/$8,913/$7,513/$0 as
`spm_unit_pre_subsidy_childcare_expenses`
(`evidence/childcare-co-legacy-childcare-expenses.json` vs
`evidence/childcare-co-full.json`).

**2. The workaround: policyengine-us #9405.** `child_care_subsidy_programs`
lists a subsidy variable for every state, but only the states named in
`gov.household.household_state_benefits` reach `household_benefits` and
therefore `household_net_income`. In the rest the money is computed and
dropped — and the household is left looking POORER for holding the subsidy,
because the net-of-subsidy `childcare_expenses` shrinks SNAP's dependent-care
deduction and the CDCC while the benefit never arrives. Connecticut, the same
household at $25,000: net income $34,121 with the subsidy modeled, $38,102
with `ct_child_care_subsidies` forced to 0, for an $8,850 benefit
(`evidence/childcare-ct-full.json`, `evidence/childcare-ct-forced-zero.json`).
Colorado's identical household moves the other way — its
`household_state_benefits` equals the subsidy to the dollar — which is why
`applyChildcareSubsidy` adds nothing there.

**3. Two lists, read from the DEPLOYED model, not the repository.** On
2026-09-15 `https://api.policyengine.org/us/metadata` served policyengine-us
1.764.6, which has 38 of the 51 state variables and 18 of them in the 2026
`household_state_benefits` block; `main` has 51 and 23. `main`'s 23 is what
`core/src/stateChildcareSubsidies.ts` encodes, because the five states in it
that the deployed model lacks (DC, NC, NY, OH, OK) have no subsidy variable
deployed at all — their subsidy is $0 today and the branch is a no-op, and
the day the API ships `main` they gain the variable and the list entry in the
same release. Encoding the deployed 18 would have been wrong on that day in
the expensive direction: the money counted twice. The live contract test
checks the table the only way that is not circular — it forces each state's
variable to 0 and watches `household_state_benefits` and net income move.

**Upstream defects found while probing, not filed and not worked around.**
Each returns $0 for a household that plainly qualifies, so HotGap simply
reports no subsidy there:

- **California**: the deployed `ca_calworks_child_care_time_coefficient` reads
  CA-specific month-period attendance inputs
  (`ca_calworks_child_care_weeks_per_month`, `_days_per_month`) that default
  to 0, so the payment standard is multiplied by zero. `main` has already
  refactored it onto the shared `childcare_days_per_week` /
  `childcare_attending_days_per_month` inputs, so California starts working
  when the API catches up. Confirmed by supplying the CA-only inputs:
  $0 → $9,600 (`evidence/childcare-ca-diag2.json`,
  `evidence/childcare-ca-weeks-per-month.json`). HotGap does NOT send them —
  they are a modeling artifact, not a household fact.
- **Massachusetts**: `ma_ccfa_care_provider_type` defaults to
  `CENTER_BASED_CARE_SCHOOL_AGE`, which pays a zero rate for a preschooler,
  although `ma_ccfa_child_age_category` computes the child's age category
  correctly from `age`. Setting the provider type to
  `CENTER_BASED_CARE_EARLY_EDUCATION` gives $9,600/$9,427/$8,734/$7,811
  (`evidence/childcare-ma-provider.json`). HotGap does not send it: which kind
  of provider a family uses is a fact it never asks for.
- **Maryland and Nebraska** also return $0 for this household; the cause was
  not chased. The upstream issue's own comment reports MD defaulting to a
  provider type of `NONE`.
- **Vermont** pays $22,828 against a $9,600 bill. This is deliberate and
  cited: `vt_ccfap` models the post-2023-12-16 regime, where Vermont pays the
  state rate regardless of the provider's charge. Left uncapped — a
  documented rule with a citation is not a defect to patch from outside.


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
- `childcare-*.json`: 22 request/response pairs for the child-care subsidy,
  plus `childcare-51-state-scan.json`, one request per deployed state with the
  same household (single parent, 3-year-old, state's most populous county,
  $9,600/yr pre-subsidy bill, full-day attendance) — the measurement behind
  "34 of the 38 deployed states return a subsidy, four return $0".

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
