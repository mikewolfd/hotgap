# Local PolicyEngine corrections

## Workarounds to retire

Every item below is a hack around a PolicyEngine defect, and every one is
marked `WORKAROUND` in at least one of the files its row names — check with
`grep -rn WORKAROUND core/src` — including the ones that simply supply a
value PolicyEngine would otherwise get wrong (the filer flag, the county, the
Medicare stand-in), since the defect and the retirement condition are just as
real there. Each row names what removes it. Which of these apply to a given state
on the committed sweep — and what that state's map cannot show — is written
per state into `summary.json`'s `coverage` block by `core/src/coverage.ts`,
derived from the same tables the corrections run on (see the README, "Data
files and sources").

| Workaround | Code | Retire when |
|---|---|---|
| Six parent-Medicaid limits sent as request parameters | `core/src/policyOverrides.ts` | the endpoint serves policyengine-us ≥ 2.5.2, which carries #9475 and #9499 — the client reads the version from the engine's /healthz once per endpoint and drops the override there (a Texas curve 12 s → 1 s, no reform build); the hosted API, which does not name its version, keeps receiving it. Delete the override outright when the hosted API is on ≥ 2.5.2. |
| New York BHP list emptied for the whole 2026 scenario | `core/src/policyOverrides.ts` | upstream handles the 2026-07-01 change sub-annually (issue #9471; a parameter fix is inert, see the issue comment). 2.5.0's parameter file now documents the opposite whole-year choice — NY kept at 250% through 2026, reverting in 2027 — so a NY adult at $33,000 gets BHP $6,641 upstream and PTC $5,861 here; both are whole-year stand-ins for a mid-year change. |
| Massachusetts TAFDC grant recomputed locally | `core/src/maTafdc.ts`, `ma_tafdc_*` inputs in `translate.ts` | PR #9477 merges (issue #9469) |
| Massachusetts TAFDC's second copy removed from net income | `core/src/parse.ts` `duplicatedTanf`, `core/src/client.ts` `probeMaTafdcDoubleCount` | nothing to do: PR #9478 merged and shipped in policyengine-us 2.4.4 (issue #9470). The client probes each endpoint once — forces `ma_tafdc` to $1,000,000 on a bare MA household and reads `household_state_benefits` back — and removes the copy only where the probe finds it, so the public API (1.764.6, still double-counting) and the self-hosted engine (2.5.0, fixed) each get the right treatment. Delete the probe and `duplicatedTanf` once the public API is on ≥ 2.4.4. |
| Corrected grant fed back one point at a time so SNAP follows it | `core/src/client.ts` `resampleMaTafdc` | same as above — the loop then makes zero requests and can be deleted |
| Coverage-gap adults' phantom premium zeroed | `core/src/evaluate.ts` `applyCoverageGap` | upstream gates marketplace take-up on subsidy eligibility (issue #9472). Still needed on 2.5.0 (checked 2026-09-16): a TX adult at $8,000 with no Medicaid and no PTC is charged the full $6,962 benchmark premium. |
| Employee ESI contribution replaces the marketplace premium | `core/src/evaluate.ts` `applyEmployerCoverage` | upstream models the employee share (issue #9473). Since 2026-09-16 the ACA firewall (`has_esi`, `offered_aca_disqualifying_esi`) goes on every covered member, so the model computes no premium credit or marketplace premium for the family; only the contribution is local, and it stays local on purpose — its tier follows who is on Medicaid at each point of the curve, which a scalar `other_health_insurance_premiums` input cannot express. Retires when upstream models the employee share per point. |
| `tax_unit_is_filer: true` forced on every request | `core/src/translate.ts` | upstream makes marketplace enrollment create a filing obligation (issue #9479, branch `aca-filer-fix`). Still needed on 2.5.0: a TX childless couple at $28,000 — under the joint filing threshold, no refundable credits — gets PTC $0 without the flag and $13,335 with it. |
| State $0-premium marketplace tiers (CT, MA, NM, CA) modeled locally | `core/src/statePremiumWraps.ts`, `core/src/evaluate.ts` `applyPremiumWrap` | the endpoint serves the state's own amount. Since 2026-09-16 the client probes each endpoint for the state's tax-unit variable (`core/src/statePremiumAssistance.ts`: CA, CT, MA, NJ, NM, MD, CO, VT, WA) and, where served, nets PolicyEngine's amount out of the premium and stands the ladder down for that state — the engine (2.6.2) serves all nine, the hosted API (1.764.6) none, so on the committed sweep no ladder fires anywhere. Compared on 2.5.0: CA within $4 of the ladder; NM's upstream model keeps paying 250–400% FPL where the ladder stopped. CT and MA joined on 2026-09-16 (`ct_covered_connecticut` 1.795.0, `ma_connector_care` 1.799.0 — issue #9481's two halves, shipped in August): measured on live curves, every archetype and point, CT agrees with the ladder except two single points on the 175% edge; MA's engine model is the better one — it charges ConnectorCare's per-person premium to every enrollee (the ladder counted adults) and pays where the federal credit is $0 (the ladder's guard skipped it). Both ladder flaws are fixed so the public-API fallback agrees; what remains there is one-step band edges and MassHealth's $28-a-child CHIP premium, which the ladder's cap swallows. Delete the table once the public API is on ≥ 1.801.0. |
| New Jersey's and Washington's flat per-member premium help (NJ Health Plan Savings, Cascade Care Savings) modeled locally | `core/src/statePremiumWraps.ts` `PER_MEMBER_PREMIUM_HELP`, `core/src/evaluate.ts` `applyPerMemberPremiumHelp` | the endpoint serves `nj_njhps` (policyengine-us #9224, PR #9244, 1.801.0) and `wa_cascade_care_savings` (#9222, PR #9239, 1.797.0). The engine at 2.6.2 does, so on the committed sweep this table never fires — `applyStatePremiumAssistance` nets the engine's figure first and the coverage block says `modeled`; the table is for the public API (1.764.6), which lacks both. Until 2026-09-16 neither program was modeled anywhere and the two states were the map's "figures incomplete" hatch; `UNMODELED_STATE_PREMIUM_ASSISTANCE` is empty and its test says so. Sources, read 2026-09-16 and re-derived from the deployed model at $1,000 steps: NJ $20/$40/$50/$100/$50 across 138–150/150–200/200–250/250–400/400–600% FPL (Treasury OTA 1332 addendum, Nov 2021, PDF p.9 and Table 2 p.12; DOBI FY2026 p.8 "$20 … $100"; DOBI FY2027 p.4 "continued … up to 600% FPL" in 2026; DOBI 2026-08-18 letter p.5 "using 2025 FPL levels"); WA $55 a member a month to 250% FPL, no floor (WAHBE memo of 2025-09-30 p.1; final PY2026 policy §4(1)(c) p.11, §5(1)(c)–(d) p.14). Local table vs engine, all eleven archetypes, every point: identical except within one $1,000 step of a band edge (12 of 1,661 NJ points, 4 of 1,661 WA). Upstream's Washington model subtracts a "benchmark premium expectation" the final policy's Attachment 1 lists as not adopted, and cites URLs that 404 — fixed on the unpushed branch `wa-cascade-care-savings-final-py2026-policy` in `~/Work/policyengine-us`; on HotGap's sweep it costs a WA childless couple up to $230 a year and nobody else anything. Delete the table once the public API is on ≥ 1.801.0. See docs/research/premium-assistance-nj-wa-2026-09-16.md. |
| A real county sent for every archetype and every resolved ZIP/county | `core/src/archetypes.ts` `answersFor` (marked "partly"), the row itself in `core/src/stateDefaults.ts` | policyengine-us #9480 fixes the default rating area — but sending a real county is correct regardless of that fix, so only the DEFECT this sidesteps retires; the input itself should stay |
| State child-care subsidy added to net income in the states upstream omits | `core/src/parse.ts` (`childcareSubsidyCounted`), `core/src/client.ts` `probeChildcareSubsidyCounted`, `core/src/stateChildcareSubsidies.ts` | nothing to do once every endpoint carries PR #9503 (issue #9405), which replaces the per-state entries in `gov.household.household_state_benefits` with the aggregate `child_care_subsidies` in every period. Since 2026-09-16 the client probes each endpoint once — forces the aggregate to $1,000,000 on a bare Connecticut household and reads `household_state_benefits` back — and adds the subsidy only where the model dropped it, so the sweep's `model.countsChildcareSubsidy` says which kind produced it. Verified both ways in Python on 2026-09-16: upstream `main` (a29f1b1) returns $0, the #9503 branch (ec8dbf8) returns the sentinel, in CT and CO alike. Delete the probe, the option and the table once the public API is on a release with #9503. |
| SSDI recipient modeled as on Medicare (Part B charged; no marketplace premium or credit) | `core/src/evaluate.ts` `applyMedicare` | upstream models Medicare enrollment/entitlement for an SSDI beneficiary directly; no issue is filed for this because HotGap has not found any evidence PolicyEngine tracks Medicare entitlement at all |
| LIHEAP shown as an eligibility boundary (the state's heating limit, the top-band amount, the FY2024 served share) in all 51 states; the amount enters net income only behind the `getsEnergyAssistance` take-up toggle, from HotGap's own sourced table | `core/src/liheap.ts` (the table, `liheapBoundary`, `liheapAmount`), `core/src/evaluate.ts` `applyLiheap`, `core/src/parse.ts` `liheapCounted`, `core/src/client.ts` `probeLiheapCounted` | **the marker never retires**: it is the truthful representation of a block grant that served 3–85% of eligible households (about 12% nationally), and a curve that drew the dollars by default would draw a benefit most eligible families never receive (Plan 7, decision 1). The toggle's two workarounds retire separately. (a) The addition to net income retires per endpoint the day upstream lists its LIHEAP variables on `gov.household.household_state_benefits`: the client probes each endpoint once — forces `ma_liheap` to $1,000,000 on a bare Massachusetts household and reads `household_state_benefits` back (false on the droplet at 2.6.2, 2026-09-16: the sentinel comes back as itself and state benefits stay $0; `docs/upstream/2026-09-16-liheap-net-income-issue.md` is the issue draft). (b) The table amount for a state retires when the endpoint serves that state's schedule with a non-zero series for HotGap's household: today `ma_liheap`, `dc_liheap_payment`, `il_liheap` and `tx_ceap` all return $0 on HotGap's payload, because each is capped at or keyed on a fuel type and heating bill HotGap never asks for (verified on the droplet 2026-09-16: `ma_liheap` pays $814 only with `heat_expense_included_in_rent: true`), so `applyLiheap` uses the served series only where it is non-zero somewhere on the curve and the table otherwise. Michigan needs neither: its heating money is the Home Heating Credit, already in `stateCredits`. |

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
marketplace tiers, two states' flat per-member premium help (where the
endpoint serves no figure), the filer flag, the default rating area, Medicare
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
`parse.ts` adds nothing there. PR #9503 (opened 2026-09-16 by a third party;
HotGap's evidence is on it) puts the aggregate itself on the list, so a model
that carries it counts the subsidy in all 51 states; the client's probe
(`probeChildcareSubsidyCounted`) tells the two kinds apart per endpoint.

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
