# Upstream issues for policyengine-us (2026-09-14)

HotGap is a benefits-cliff library that sweeps a household's earnings through
PolicyEngine's public US API (`POST https://api.policyengine.org/us/calculate`,
keyless) and reports where net income falls as pay rises. A methodology review
and a primary-source validation
(`docs/reviews/2026-09-14-methodology-validation.md`) traced several wrong
numbers on HotGap's curves to PolicyEngine's 2026 rules rather than to HotGap.
Each candidate below was re-proved or disproved with a minimal live request on
2026-09-14; the confirmed ones are written as ready-to-paste issues.

**Versions observed.** The `/us/calculate` response body carries no version
field (top-level keys are exactly `status`, `message`, `result`).
`GET https://api.policyengine.org/us/metadata` returns `result.version =
1.764.6` (that is the API service version, not the model's). Parameter and
variable text quoted below was read from `PolicyEngine/policyengine-us` `main`
at commit **`3a6e07b5548ae1e214e9f2ae8d6412dc1c8d4503`** (`pyproject.toml`
version `2.2.0`, 2026-09-15). The served model agreed with that commit on every
value tested here (MA payment standards, NY BHP ceiling, SC/WY parent Medicaid
limits, the 2026 PTC 400% cap, and the below-FPL immigration exception being
off), so the two are treated as the same policy state.

All requests and responses are saved under
`docs/upstream/evidence/` (request/response pairs and parameter excerpts).
Dollar figures use PolicyEngine's own 2026 poverty guideline for a family of
three, $27,320 (re-derived from the probes), and $15,960 for one person.

---

## Issue 1 — Massachusetts TAFDC ends abruptly at $26,280 of earnings; the state's rules taper it to $30,960

### Summary

For a two-parent, three-child household in Massachusetts, `tanf` falls
continuously as earnings rise and then drops from **$9,880 to $0** between
$26,000 and $27,000 of employment income. Massachusetts has no rule that
truncates a positive TAFDC grant at that income. Two defects combine:

1. `ma_tafdc_work_related_expense_deduction` is a `Person` variable that `adds`
   a flat `$200/month` parameter, so **every member of the SPM unit receives it,
   including infants**. A five-person unit with one earner gets $12,000/yr of
   work-related-expense deduction instead of $2,400.
2. `ma_tafdc_financial_eligible` compares
   `ma_tafdc_applicable_income_for_financial_eligibility` — gross earnings minus
   that work-expense deduction only — against the payment standard. The
   106 CMR 704.281 earned-income disregards (100% for six months, then 50%) are
   applied to the *grant* but not to the *eligibility test*, so the test is far
   tighter than the state's net-income test and terminates the case while the
   grant is still worth $9,880.

The two interact: the inflated deduction is what puts the spurious cutoff at
$26,280 rather than lower. Fixing (1) alone would move the false cliff *down*
to about $16,680; (2) is the root cause.

Secondary: the modelled marginal benefit-reduction rate is **25%**, because
`ma_tafdc_countable_earned_income` blends six months of the 100% disregard with
six months of the 50% disregard in *every* year. Massachusetts' steady-state
rate is 50% (the six-month 100% window is once per employment spell, not
annual), so the taper is half as steep as the state's and no year ever shows
the real cliff — the 100% window closing.

### Minimal reproduction

`POST https://api.policyengine.org/us/calculate` (evidence:
`u1.ma-tafdc.request.json` / `u1.ma-tafdc.response.json`):

```json
{
  "household": {
    "people": {
      "you":    { "age": { "2026": 30 } },
      "spouse": { "age": { "2026": 30 }, "employment_income": { "2026": 0 } },
      "child1": { "age": { "2026": 1 } },
      "child2": { "age": { "2026": 4 } },
      "child3": { "age": { "2026": 9 } }
    },
    "families":      { "family":      { "members": ["you","spouse","child1","child2","child3"] } },
    "marital_units": { "marital_unit":{ "members": ["you","spouse"] } },
    "tax_units":     { "tax_unit":    { "members": ["you","spouse","child1","child2","child3"] } },
    "spm_units":     { "spm_unit":    { "members": ["you","spouse","child1","child2","child3"],
                                        "tanf": { "2026": null },
                                        "ma_tafdc_payment_standard": { "2026": null } } },
    "households":    { "household":   { "members": ["you","spouse","child1","child2","child3"],
                                        "state_name": { "2026": "MA" } } },
    "axes": [[{ "name": "employment_income", "min": 0, "max": 40000, "count": 41, "period": "2026" }]]
  }
}
```

Response, `result.spm_units.spm_unit` (trimmed to the points that matter; the
axis index is earnings in thousands):

| employment_income | `tanf` | `ma_tafdc_payment_standard` |
|---|---|---|
| $0 | 15,780 | 14,280 |
| $24,000 | 10,380 | 14,280 |
| $25,000 | 10,130 | 14,280 |
| $26,000 | **9,880** | 14,280 |
| $27,000 | **0** | 14,280 |
| $30,000 | 0 | 14,280 |
| $32,000 | 0 | 14,280 |

A second request decomposing the test (`u1b.ma-decomp.request.json` /
`u1b.ma-decomp.response.json`) shows the mechanism directly:

| employment_income | `ma_tafdc_work_related_expense_deduction` (per person) | `ma_tafdc_applicable_income_for_financial_eligibility` | `ma_tafdc_financial_eligible` | `tanf` |
|---|---|---|---|---|
| $26,000 | you 2,400 · spouse 2,400 · child1 (age 1) 2,400 | 14,000 | true | 9,880 |
| $27,000 | you 2,400 · spouse 2,400 · child1 (age 1) 2,400 | 15,000 | **false** | 0 |

i.e. eligibility income = earnings − 5 × $2,400, and the case closes the moment
that crosses the $14,280 annual payment standard, at $26,280 of earnings.
The one-year-old's $2,400 deduction is visible in the response.

### Expected behavior

- **Payment standard.** MA DTA, *TAFDC Table of Need and Payment Standards*
  (incorporated by reference into 106 CMR 704.410/704.420):
  AU of 5 = **$1,150/month** in public or subsidized housing, **$1,190** with
  the $40 rent allowance — $13,800 / $14,280 a year.
  <https://www.mass.gov/doc/table-of-need-payment-standards/download>
  Confirmed by DTA, *Fiscal Year 2026 Report on Standard Budgets of Assistance
  for TAFDC*, January 2026, Table 2 (HH-5 = $13,800).
  <https://www.mass.gov/doc/fiscal-year-2026-report-on-standard-budgets-of-assistance-for-transitional-aid-to-families-with-dependent-children-january-2026/download>
  **PolicyEngine's standard is correct** ($14,280 private housing). The grant is
  wrong for another reason.
- **Work-related expense deduction.** 106 CMR 704.270(A): $200/month per
  *employed* assistance-unit member, deducted from that member's gross earnings.
  <https://www.law.cornell.edu/regulations/massachusetts/106-CMR-704-270>
- **Eligibility test.** 106 CMR 704.260 is a **net** income test against the
  Need Standard; there is no 185%-of-need gross screen, and 704.500(A) Step 7
  computes the grant as need standard − countable income, paying any result of
  $10 or more. The countable income in that test is income after the 704.281
  disregards.
  <https://www.mass.gov/doc/106-cmr-704-transitional-cash-assistance-program-financial-eligibility/download>
- **Exit point.** With $200 + 50%, the grant reaches $0 at $2,580/month
  = **$30,960/year** for an AU of 5 in private housing ($2,500/month =
  $30,000 in subsidized housing). DTA's own worked example (FY2026 report,
  Table 5) reproduces the formula to the dollar.

### Observed behavior

`tanf` = $9,880 at $26,000 of earnings and $0 at $27,000 — a $9,880 notch where
the statute has a $250-per-$1,000 taper running another $4,000 of earnings.

### Parameter / variable believed responsible

- `policyengine_us/variables/gov/states/ma/dta/tcap/tafdc/income/deductions/ma_tafdc_work_related_expense_deduction.py`
  (`adds = ["gov.states.ma.dta.tcap.deductions.work_related_expenses.amount"]`
  on a `Person` variable with no earnings test). The parameter value itself,
  `gov.states.ma.dta.tcap.deductions.work_related_expenses.amount` = **$200/month
  for 2026**, is correct.
- `policyengine_us/variables/gov/states/ma/dta/tcap/tafdc/eligibility/ma_tafdc_financial_eligible.py`
  (uses `ma_tafdc_applicable_income_for_financial_eligibility`, which omits the
  `gov.states.ma.dta.tcap.tafdc.earned_income_disregard` disregards that
  `ma_tafdc_countable_earned_income` applies).
- Secondary: `policyengine_us/variables/gov/states/ma/dta/tcap/tafdc/income/earned/ma_tafdc_countable_earned_income.py`
  applies `earned_income_disregard.full_disregard.applicable_months` = 6 in
  every year.

### Impact

Any tool reading PolicyEngine for Massachusetts shows working families a $9,880
TANF cliff at $26,000 of pay that does not exist, and understates the real
marginal benefit-reduction rate by half.

---

## Issue 2 — New York's Basic Health Program ceiling is held at 250% FPL for all of 2026; CMS terminated the §1332 waiver effective 2026-07-01

### Summary

`gov/hhs/basic_health_program/eligibility/expanded_income_limit_states` lists
`NY` from 2025-01-01 through 2026-12-31 and reverts to the standard 200% FPL
ceiling only at 2027-01-01. The file's comment states the reasoning: the
eligibility variable is annual, so New York is kept on the 250% ceiling "through
2026 (the waiver still applies for H1 2026)". The result is that a single adult
between 200% and 250% FPL is modelled as enrolled in the Essential Plan for the
**whole** of 2026, with $0 premium and no PTC, when in fact that tier ended on
2026-06-30 and those enrollees moved to a subsidized QHP on 2026-07-01.

Choosing the first half of the year over the second is a coin flip with a
one-sided cost: for the 200–250% FPL band it zeroes out six months of real
premium liability and six months of PTC. A 6/12 blend, or moving the revert to
2026-07-01 and letting the annual variable prorate, would at least be unbiased.

### Minimal reproduction

(evidence: `u2.ny-ep.request.json` / `u2.ny-ep.response.json`)

```json
{
  "household": {
    "people": { "you": { "age": { "2026": 30 }, "medicaid": { "2026": null },
                         "is_basic_health_program_eligible": { "2026": null },
                         "is_aca_ptc_eligible": { "2026": null } } },
    "families":      { "family":       { "members": ["you"] } },
    "marital_units": { "marital_unit": { "members": ["you"] } },
    "tax_units":     { "tax_unit":     { "members": ["you"],
                                         "premium_tax_credit": { "2026": null },
                                         "basic_health_program": { "2026": null } } },
    "spm_units":     { "spm_unit":     { "members": ["you"],
                                         "spm_unit_medical_out_of_pocket_expenses": { "2026": null } } },
    "households":    { "household":    { "members": ["you"], "state_name": { "2026": "NY" } } },
    "axes": [[{ "name": "employment_income", "min": 28000, "max": 44000, "count": 17, "period": "2026" }]]
  }
}
```

| employment_income | % FPL | `is_basic_health_program_eligible` | `basic_health_program` | `premium_tax_credit` | MOOP |
|---|---|---|---|---|---|
| $31,000 | 194% | true | 6,896 | 0 | 0 |
| $32,000 | 200% | true | 6,767 | 0 | 0 |
| $36,000 | 226% | true | 6,216 | 0 | 0 |
| $39,000 | 244% | true | 5,763 | 0 | 0 |
| $40,000 | 251% | **false** | 0 | 4,723 | 3,437 |
| $41,000 | 257% | false | 0 | 4,562 | 3,598 |

The step sits between $39,000 and $40,000 — i.e. at 250% FPL ($39,900) — and
nothing happens at 200% FPL ($31,920).

### Expected behavior

The EP ceiling for a single adult in the second half of 2026 is **200% FPL =
$31,920**.

- NY State of Health, *Issuer Q&A: Essential Plan (EP) 200–250 Transition*,
  effective July 1, 2026: "NYSOH is ending the Essential Plan (EP) 200%–250% FPL
  variant effective July 1 (6/30/2026 coverage end date) due to federal changes
  (H.R.1) and waiver termination."
  <https://info.nystateofhealth.ny.gov/sites/default/files/NY%20State%20of%20Health%20Issuer%20Q&A%20Essential%20Plan%20200%E2%80%93250%20Transition.pdf>
- NY State of Health, *NY State of Health Changes for 2026* (June 17, 2026
  webinar): "CMS approved this request on March 20, 2026." New York terminated
  its §1332 waiver and reactivated the §1331 Basic Health Program, which caps
  eligibility at 200% FPL; 200–250% enrollees moved to QHP with APTC/CSR.
  <https://info.nystateofhealth.ny.gov/sites/default/files/June%20Webinar%20-%20NY%20State%20of%20Health%20Changes%20for%202026.pdf>

The repo already cites the CMS termination approval letter in the same file, so
the fact is known; only the effective date handling is at issue.

### Observed behavior

Essential Plan coverage modelled to 250% FPL for the full 2026 year; the
coverage step and its associated premium/PTC change land at $39,900 instead of
$31,920.

### Parameter believed responsible

`policyengine_us/parameters/gov/hhs/basic_health_program/eligibility/expanded_income_limit_states.yaml`
— 2026 value is `[NY]`; `2027-01-01: []`.
(`expanded_income_limit` = 2.5 and `income_limit` = 2.0 are both correct.)

### Impact

New Yorkers earning between $31,920 and $39,900 are shown a full year of
$0-premium public coverage they lost on 2026-07-01, hiding the largest health
coverage step on their earnings curve.

---

## Issue 3 — Adults in the Medicaid coverage gap are charged a full unsubsidized Marketplace premium

### Summary

A childless adult below 100% FPL in a non-expansion state is ineligible for
Medicaid and statutorily ineligible for the PTC (IRC §36B(c)(1)(A)). PolicyEngine
nonetheless assumes the person enrolls in a Marketplace plan and pays the entire
unsubsidized premium: `spm_unit_medical_out_of_pocket_expenses` is **$11,769/yr
in Wyoming** and **$6,962/yr in Texas** at *zero* income, with `medicaid = 0`
and `premium_tax_credit = 0`.

The chain is `spm_unit_medical_out_of_pocket_expenses` →
`spm_unit_health_insurance_premiums` → `marketplace_net_premium` =
`selected_marketplace_plan_premium_proxy` − `used_aca_ptc`.
`selected_marketplace_plan_premium_proxy` is nonzero whenever
`takes_up_aca_if_eligible` (a `default_value = True` input) and
`pays_aca_premium` are both true, and `pays_aca_premium` tests immigration
status, TIN, other coverage and age — **but not income**. So below 100% FPL the
PTC is correctly zero and the gross premium is charged in full.

This also creates a spurious *negative* cliff: crossing 100% FPL cuts modelled
medical spending by $11,433 in Wyoming.

### Minimal reproduction

(evidence: `u3.wy.request.json` / `u3.wy.response.json`, `u3.tx.*`)

```json
{
  "household": {
    "people": { "you": { "age": { "2026": 30 }, "medicaid": { "2026": null },
                         "is_medicaid_eligible": { "2026": null },
                         "is_aca_ptc_eligible": { "2026": null } } },
    "families":      { "family":       { "members": ["you"] } },
    "marital_units": { "marital_unit": { "members": ["you"] } },
    "tax_units":     { "tax_unit":     { "members": ["you"],
                                         "premium_tax_credit": { "2026": null },
                                         "aca_magi_fraction": { "2026": null } } },
    "spm_units":     { "spm_unit":     { "members": ["you"],
                                         "spm_unit_medical_out_of_pocket_expenses": { "2026": null } } },
    "households":    { "household":    { "members": ["you"], "state_name": { "2026": "WY" },
                                         "household_net_income": { "2026": null } } },
    "axes": [[{ "name": "employment_income", "min": 0, "max": 20000, "count": 21, "period": "2026" }]]
  }
}
```

Wyoming (`state_name: "WY"`):

| employment_income | `aca_magi_fraction` | `medicaid` | `is_aca_ptc_eligible` | `premium_tax_credit` | MOOP |
|---|---|---|---|---|---|
| $0 | 0.00 | 0 | false | 0 | **11,769** |
| $8,000 | 0.51 | 0 | false | 0 | **11,769** |
| $12,000 | 0.76 | 0 | false | 0 | **11,769** |
| $15,000 | 0.95 | 0 | false | 0 | **11,769** |
| $16,000 | 1.02 | 0 | true | 11,433 | 336 |
| $20,000 | 1.27 | 0 | true | 11,349 | 420 |

Texas is identical in shape with MOOP = **$6,962** below 100% FPL, $336 at
$16,000.

### Expected behavior

Sub-100%-FPL adults with no Medicaid, no ESI and no PTC are uninsured, not
paying an $11,769 premium.

- 26 CFR 1.36B-2(b)(1) / IRC §36B(c)(1)(A): PTC requires household income at
  least 100% of the federal poverty line.
- Wyoming Department of Health, *Healthcare Coverage Options in Wyoming 2026*,
  labels the band in the state's own words: parents/caretakers 47–99% FPL
  "**No Coverage**"; non-disabled adults 0–99% FPL "**No Coverage**"; Marketplace
  only from 100% FPL.
  <https://health.wyo.gov/wp-content/uploads/2026/03/Healthcare-Coverage-Options-in-Wyoming-2026.pdf>

A defensible model would set `pays_aca_premium` (or the takeup default) to false
for tax units with `aca_magi_fraction < 1` who are not PTC-eligible by any
route, rather than charging them the benchmark.

### Observed behavior

MOOP > $0 with `medicaid = 0` and `premium_tax_credit = 0` at every income below
100% FPL, including $0 income.

### Parameter / variable believed responsible

- `policyengine_us/variables/gov/aca/eligibility/pays_aca_premium.py` — no income
  condition.
- `policyengine_us/variables/gov/aca/takes_up_aca_if_eligible.py` —
  `default_value = True`.
- `policyengine_us/variables/gov/aca/ptc/selected_marketplace_plan_premium_proxy.py`
  — gates on those two only.

### Impact

Every coverage-gap household in the ten non-expansion states is charged several
thousand dollars a year of health spending it does not incur, and gains it back
as a phantom windfall the moment it crosses 100% FPL.

---

## Issue 4 — `employer_sponsored_insurance_premiums` never reaches medical out-of-pocket expenses, and no input represents the employee's ESI contribution

### Summary

Setting `has_esi`, `offered_aca_disqualifying_esi` and
`employer_sponsored_insurance_premiums = 6500` correctly removes the household
from the Marketplace, but `spm_unit_medical_out_of_pocket_expenses` then becomes
**$0** — the family is modelled as spending nothing on health care.
`employer_sponsored_insurance_premiums` is referenced nowhere in the model except
`gov/household/cbo_market_income_additions.yaml` (a CBO market-income concept,
documented on the variable as "employer-paid" premiums), so the input does no
work anywhere in the benefit or MOOP chain. `spm_unit_health_insurance_premiums`
adds only `other_health_insurance_premiums` (a data-imputed component, zero for
a hand-built household), `chip_premium`, `medicaid_premium`,
`marketplace_net_premium` and the Medicare components — there is no
employer-sponsored component at all.

### Minimal reproduction

(evidence: `u4.esi.request.json`/`u4.esi.response.json`,
`u4.noesi.request.json`/`u4.noesi.response.json`)

Texas single parent, children aged 3 and 7, $30,000 of employment income
(112% FPL), with and without ESI:

```json
{
  "household": {
    "people": {
      "you": { "age": { "2026": 35 }, "employment_income": { "2026": 30000 },
               "has_esi": { "2026": true },
               "offered_aca_disqualifying_esi": { "2026": true },
               "employer_sponsored_insurance_premiums": { "2026": 6500 } },
      "child1": { "age": { "2026": 3 } },
      "child2": { "age": { "2026": 7 } }
    },
    "families":      { "family":       { "members": ["you","child1","child2"] } },
    "marital_units": { "marital_unit": { "members": ["you"] } },
    "tax_units":     { "tax_unit":     { "members": ["you","child1","child2"],
                                         "premium_tax_credit": { "2026": null },
                                         "marketplace_net_premium": { "2026": null } } },
    "spm_units":     { "spm_unit":     { "members": ["you","child1","child2"],
                                         "spm_unit_medical_out_of_pocket_expenses": { "2026": null },
                                         "spm_unit_health_insurance_premiums": { "2026": null } } },
    "households":    { "household":    { "members": ["you","child1","child2"],
                                         "state_name": { "2026": "TX" },
                                         "household_net_income": { "2026": null } } }
  }
}
```

| | without ESI | with ESI + $6,500 premium |
|---|---|---|
| `is_aca_eshi_eligible` | false | true |
| `premium_tax_credit` | 6,865.00 | 0.00 |
| `selected_marketplace_plan_premium_proxy` | 7,495.00 | 0.00 |
| `marketplace_net_premium` | 630.00 | 0.00 |
| `spm_unit_health_insurance_premiums` | 630.00 | **0.00** |
| `spm_unit_medical_out_of_pocket_expenses` | 630.00 | **0.00** |
| `household_net_income` | 54,338.31 | 54,338.31 |

`household_net_income` is byte-identical with and without the $6,500 input.

### Expected behavior

A worker enrolled in employer coverage pays an employee premium contribution
that belongs in SPM medical out-of-pocket expenses — the SPM definition includes
the household's own premium payments, and the Census SPM MOOP measure counts
employment-based premium contributions. Either
`employer_sponsored_insurance_premiums` should stop being accepted as a live
input where it does nothing, or (better) a companion input for the *employee's*
contribution should flow into `spm_unit_health_insurance_premiums`.

For scale, the government series for this quantity is AHRQ's Medical
Expenditure Panel Survey Insurance Component (MEPS-IC), "average annual employee
contribution to the premium" — a published federal statistic, unlike the
industry-survey constants often used for it.

### Observed behavior

`spm_unit_medical_out_of_pocket_expenses = 0` for an ESI household that supplied
a $6,500 premium; the input affects no output variable.

### Parameter / variable believed responsible

- `policyengine_us/variables/household/income/spm_unit/spm_unit_health_insurance_premiums.py`
  (`adds` list has no employer-sponsored component).
- `policyengine_us/variables/input/employer_sponsored_insurance_premiums.py`
  (consumed only by `policyengine_us/parameters/gov/household/cbo_market_income_additions.yaml`).

### Impact

Households with employer coverage appear to spend $0 on health care, so any
comparison between an ESI job and a Marketplace-subsidized one is biased toward
the ESI job by the full employee contribution — commonly several thousand
dollars a year.

*(Note for HotGap readers: half of this is ours. PolicyEngine documents the
variable as the employer-paid premium; HotGap was sending the employee
contribution. `core/src/translate.ts` now records that the figure is inert.)*

---

## Issue 5 — Parent/caretaker Medicaid income limits are five years stale in the frozen-dollar-standard states

### Summary

`gov/hhs/medicaid/eligibility/categories/parent/income_limit` stores a
percent-of-FPL for each state. Texas, Mississippi, Florida and Wyoming set their
parent/caretaker limit as a **frozen dollar amount** inherited from a 1990s AFDC
payment standard, so the equivalent percent of FPL falls every January as the
guidelines rise. PolicyEngine's values for those four states were last stamped
**2021-01-01** and are now 1–13 percentage points too high. South Carolina's
value (1.00 since 2021-01-01) matches neither the state's published 67% nor
MACPAC's 95%.

Georgia already carries the right treatment — a 2025-01-01 refresh with a
comment explaining the drift — which is the pattern the other four need.

### Ten non-expansion states, parent/caretaker limit, family of three, 2026

2026 FPG for three (PolicyEngine's own, re-derived from the probes) = **$27,320**.
Validated column is the state's own published 2026 figure, on the disregard
convention PolicyEngine uses (limit inclusive of the 5-point MAGI disregard, per
the Georgia comment in the file).

| State | PolicyEngine 2026 | last stamped | PE $/yr | State's 2026 published limit | $/yr | Verdict |
|---|---|---|---|---|---|---|
| TX | 0.19 | 2021-01-01 | $5,191 | $230/mo + $113.85 disregard = 15.1% | $4,126 | **DIFFERS** (+$1,065) |
| AL | 0.18 | 2018-01-01 | $4,918 | 18% incl. disregard | $4,920 | CONSISTENT |
| MS | 0.26 | 2021-01-01 | $7,103 | $498/mo incl. disregard = 21.9% | $5,976 | **DIFFERS** (+$1,127) |
| GA | 0.31 | 2025-01-01 | $8,469 | $551/mo + 5pp = $662/mo = 29.1% | $7,944 | **DIFFERS** (+$525) |
| FL | 0.32 | 2021-01-01 | $8,742 | $600/mo incl. both disregards = 26.4% | $7,200 | **DIFFERS** (+$1,542) |
| WY | 0.56 | 2021-01-01 | $15,299 | $873/mo + 5pp = $986.83/mo = 43.3% | $11,842 | **DIFFERS** (+$3,457) |
| KS | 0.38 | 2018-01-01 | $10,382 | 38% of FPL (KFMAM 2211.01) | $10,382 | CONSISTENT |
| SC | 1.00 | 2021-01-01 | $27,320 | 67% of FPL | $18,304 | **DIFFERS** (+$9,016) |
| TN | 1.00 | 2021-01-01 | $27,320 | 100% of FPL | $27,320 | CONSISTENT |
| WI | 1.00 | 2018-01-01 | $27,320 | 100% of FPL | $27,320 | CONSISTENT |

### Minimal reproduction (the two largest discrepancies)

Single parent aged 35, children 4 and 8, sweeping employment income; requesting
`is_medicaid_eligible` and `medicaid_income_level` on the parent.

South Carolina (`u6.sc.request.json` / `u6.sc.response.json`), axis
$16,000–$29,000 in $500 steps:

| employment_income | `medicaid_income_level` | `is_medicaid_eligible` | `medicaid` |
|---|---|---|---|
| $16,000 | 0.5857 | true | 11,445 |
| $18,000 | 0.6589 | true | 11,445 |
| $19,000 | 0.6955 | true | 11,445 |
| $27,000 | 0.9883 | true | 11,445 |
| $27,500 | 1.0066 | **false** | 0 |

Coverage runs to 100% FPL ($27,320). SCDHHS publishes 67%.

Wyoming (`u6.wy.request.json` / `u6.wy.response.json`), axis $9,000–$17,000 in
$500 steps:

| employment_income | `medicaid_income_level` | `is_medicaid_eligible` | `medicaid` |
|---|---|---|---|
| $9,000 | 0.3294 | true | 15,273 |
| $11,000 | 0.4026 | true | 15,273 |
| $12,000 | 0.4392 | true | 15,273 |
| $15,000 | 0.5490 | true | 15,273 |
| $15,500 | 0.5673 | **false** | 0 |

Coverage runs to 56% FPL ($15,299). Wyoming's Family MAGI standard is $873/month
($10,476/yr, 38.3%; $986.83/mo, 43.3%, with the disregard).

### Expected behavior, with sources

- **South Carolina** — SCDHHS, *Medicaid Eligibility Programs*, effective
  2026-03-01: "Parent/Caretaker Relative… family income cannot exceed 67% of
  FPL: $1,842.50 for a family of four."
  <https://www.scdhhs.gov/sites/dhhs/files/pdf/links/Medicaid%20Eligibility%20Groups%20Effective%201.1.pdf>
  (MACPAC Exhibit 36 Feb 2026 lists 95%, anticipating the "Palmetto Pathways to
  Independence" §1115 that medicaid.gov still lists as pending; the state page
  governs.)
- **Wyoming** — Wyoming DOH, *Medicaid Income Requirements*, "Family MAGI"
  column: $873/month for a family of three.
  <https://health.wyo.gov/healthcarefin/medicaid/programs-and-eligibility/medicaid-income-requirements/>
- **Texas** — HHSC Texas Works Handbook C-131.2 (Revision 15-4, effective
  2015-10-01): $230/month for a family of three; C-131.4 (Revision 26-2,
  effective 2026-04-01) adds a $113.85 standard MAGI disregard.
  <https://fhb.hhs.texas.gov/handbooks/texas-works-handbook/c-130-medical-programs>
- **Mississippi** — MS Division of Medicaid, *Income Limits for Medicaid and
  CHIP Programs*, effective 2026-03-01: $498/month for a family of three, "the
  5% disregard is applied, if needed, and is reflected in the amounts shown."
  <https://medicaid.ms.gov/medicaid-coverage/who-qualifies-for-coverage/income-limits-for-medicaid-and-chip-programs/>
- **Florida** — DCF ESS Appendix A-7 (updated 2026-02-02, effective April 2026):
  $303 standard + $183 disregard + $114 MAGI 5% = $600/month for three.
  <https://ffic.myflfamilies.com/manual/essfiles/30446.pdf>
- **Georgia** — DFCS PAMMS Appendix A2, *2026 Family Medicaid Financial Limits*,
  Parent/Caretaker with Children = $551/month.
  <https://pamms.dhs.ga.gov/dfcs/medicaid/appendix-a2/2026-family-limits/>

Note the file's existing reference to medicaid.gov's eligibility-levels table:
that table is stamped "as of December 1, 2023" and, for dollar-standard states,
publishes a CMS-converted percentage taken from whichever household size yields
the **highest** number, against a 2023 FPL. It is not a safe source for these
five states in 2026.

### Observed behavior

See the probe tables above: South Carolina parent Medicaid ends at 100% FPL
instead of 67%; Wyoming at 56% instead of 43.3%.

### Parameter believed responsible

`policyengine_us/parameters/gov/hhs/medicaid/eligibility/categories/parent/income_limit.yaml`
— entries `TX: 2021-01-01: 0.19`, `MS: 2021-01-01: 0.26`,
`FL: 2021-01-01: 0.32`, `WY: 2021-01-01: 0.56`, `SC: 2021-01-01: 1.00`,
`GA: 2025-01-01: 0.31`.

### Impact

Parents in five non-expansion states are modelled as keeping Medicaid up to
$1,000–$9,000 of earnings past the point their state actually cuts them off, so
the coverage cliff appears in the wrong place — and, because the dollar standards
are frozen, every one of these entries drifts further wrong each January unless
it is re-derived from the state's dollar table.

---

## Disproved candidates

### U5(a) — repeal of the sub-100%-FPL PTC exception for lawfully present immigrants (P.L. 119-21 §71302). **No issue: PolicyEngine is correct.**

`policyengine_us/parameters/gov/aca/below_fpl_immigration_exception_in_effect.yaml`
holds `2014-01-01: true`, **`2026-01-01: false`**, and cites §71302(b) directly.
`policyengine_us/variables/gov/aca/eligibility/aca_ptc_below_fpl_immigration_exception.py`
gates on that parameter, so the exception is off for 2026.

While reading the same area: `gov/aca/ptc_income_eligibility.yaml` restores the
400% FPL cap at `2026-01-01: false` for the >4.00 bracket, which is also correct
for coverage year 2026 (IRC §36B(c)(1)(E) expired after 2025). Evidence:
`u5_params.txt`.

### U5(b) — elimination of the APTC repayment cap for TY2026 (P.L. 119-21 §71305). **No issue: out of scope, not stale.**

There is no APTC repayment-limitation parameter or variable anywhere in the
model. A repo-wide grep for `repayment`, `excess advance` and `Form 8962` over
`policyengine_us/parameters` and `policyengine_us/variables` finds only
narrative references, including two explicit statements of the assumption —
`policyengine_us/variables/gov/irs/credits/cdcc/capped_cdcc.py` and
`policyengine_us/variables/gov/states/ca/tax/income/credits/ca_federal_capped_cdcc.py`:
"Excess Advance PTC Repayment (Form 8962) assumed zero in above line."
PolicyEngine computes the PTC, not the year-end reconciliation, so §71305 has
nothing to update. This is a feature gap (uncapped clawback is now a real
marginal rate near subsidy thresholds), not a wrong parameter, and is not filed
as a bug. Evidence: grep over the pinned source tree.

### U5(c) — SNAP non-citizen eligibility narrowed (P.L. 119-21 §10108). **No issue: PolicyEngine is correct.**

`policyengine_us/parameters/gov/usda/snap/eligibility/eligible_immigration_statuses.yaml`
replaces the pre-OBBB list at `2025-07-01` (with a comment noting the real
effective date of July 4) with exactly `CITIZEN`, `LEGAL_PERMANENT_RESIDENT`,
`CUBAN_HAITIAN_ENTRANT`, citing the FNS OBBB alien-eligibility memo. Refugees,
asylees, parolees and conditional entrants are correctly dropped.

Minor, already acknowledged in the file's own comment: U.S. nationals and COFA
citizens — both statutorily eligible — cannot be represented, because
`ImmigrationStatus` in
`policyengine_us/variables/household/demographic/person/immigration_status.py`
has no enum member for either. Not worth a bug report on its own; worth a note
if an enum expansion is ever proposed. Evidence: `u5_params.txt`.

### U6 (partial) — Alabama, Kansas, Tennessee, Wisconsin. **Consistent.**

AL 18%, KS 38%, TN 100%, WI 100% all match the state publications for 2026. See
the table in Issue 5.

### U2 (as originally framed) — "the parameter says 250%". **Reframed, not disproved.**

There is no New York Essential Plan parameter. The program is modelled through
the generic Basic Health Program path (`gov/hhs/basic_health_program/…`), whose
`income_limit` (2.0) and `expanded_income_limit` (2.5) are both correct values;
the defect is which states get the expanded limit in 2026, which is Issue 2.

---

## Calls that failed

Two of the eleven `POST /us/calculate` calls returned HTTP 400, both for entity
placement, both fixed by moving the variable and re-sending:

- `basic_health_program` sent on `people`: *"Household variable
  `basic_health_program` belongs on `tax_units`, not `people`."*
  (`u2.ny-ep.attempt1-400.response.json`) — it is a `TaxUnit` variable.
- `ma_tafdc_clothing_allowance` sent on `spm_units`: *"Household variable
  `ma_tafdc_clothing_allowance` belongs on `people`, not `spm_units`."*
  (`u1b.attempt1-400.response.json`) — it is a `Person` variable.

No other call failed. Eleven `calculate` calls and one `metadata` call were made
in total.

---

## Verdicts

| Candidate | Verdict | Evidence files |
|---|---|---|
| U1 Massachusetts TAFDC | **CONFIRMED** — Issue 1 | `u1.ma-tafdc.request.json`, `u1.ma-tafdc.response.json`, `u1b.ma-decomp.request.json`, `u1b.ma-decomp.response.json`, `u1b.attempt1-400.response.json`, `ma_params.txt`, `ma_vars.txt`, `ma_income_vars.txt` |
| U2 New York Essential Plan ceiling | **CONFIRMED** (via the Basic Health Program path, not an "Essential Plan" parameter) — Issue 2 | `u2.ny-ep.request.json`, `u2.ny-ep.response.json`, `u2.ny-ep.attempt1-400.response.json`, `bhp.txt` |
| U3 Coverage-gap benchmark premium | **CONFIRMED** — Issue 3 | `u3.wy.request.json`, `u3.wy.response.json`, `u3.tx.request.json`, `u3.tx.response.json`, `moop_chain.txt`, `aca_chain2.txt` |
| U4 Employer premium not reaching MOOP | **CONFIRMED** — Issue 4 | `u4.esi.request.json`, `u4.esi.response.json`, `u4.noesi.request.json`, `u4.noesi.response.json`, `moop_chain.txt` |
| U5(a) PTC below-FPL immigrant exception repealed | **DISPROVED** — parameter already `false` for 2026 | `u5_params.txt` |
| U5(b) APTC repayment cap eliminated | **DISPROVED** — reconciliation not modelled at all | source grep over `3a6e07b` |
| U5(c) SNAP non-citizen narrowing | **DISPROVED** — allowlist correct from 2025-07-01 | `u5_params.txt` |
| U6 Frozen parent-Medicaid standards | **CONFIRMED for TX, MS, GA, FL, WY, SC; consistent for AL, KS, TN, WI** — Issue 5 | `u6.sc.request.json`, `u6.sc.response.json`, `u6.wy.request.json`, `u6.wy.response.json`, `paths.txt`, pinned `parent/income_limit.yaml` |

## Filed upstream (2026-09-15)

| Issue | policyengine-us |
|---|---|
| MA TAFDC work-expense deduction and eligibility test | https://github.com/PolicyEngine/policyengine-us/issues/9469 |
| MA TAFDC counted twice (`tanf` and `household_state_benefits`) | https://github.com/PolicyEngine/policyengine-us/issues/9470 |
| NY Basic Health Program tier ended 2026-07-01 | https://github.com/PolicyEngine/policyengine-us/issues/9471 |
| Coverage-gap adults charged the benchmark premium | https://github.com/PolicyEngine/policyengine-us/issues/9472 |
| `employer_sponsored_insurance_premiums` never reaches MOOP | https://github.com/PolicyEngine/policyengine-us/issues/9473 |
| Parent/caretaker Medicaid limits stale in six states | https://github.com/PolicyEngine/policyengine-us/issues/9474 |

Pull requests from the fork mikewolfd/policyengine-us:

| PR | Fixes | Status |
|---|---|---|
| https://github.com/PolicyEngine/policyengine-us/pull/9475 — 2026 parent Medicaid limits in six frozen-standard states | #9474 | open; 22 targeted + ~1,800 surrounding YAML tests pass |
| NY Basic Health Program end date | #9471 | not opened: `is_basic_health_program_eligible` is an annual variable that reads the January 1 parameter value, so a `2026-07-01: []` entry is inert for 2026 (the file's own comment already says so). The fix needs sub-annual handling in the variable, a maintainer decision; HotGap's local override models the post-July rule for the whole annual scenario. |
| MA TAFDC work-expense deduction and financial eligibility — branch `fix-ma-tafdc-work-expense-and-eligibility` | #9469 | to open as a draft: 542 MA tests pass; one partner contract expectation (`partners/analytics_coverage/.../snap/ma.yaml`) legitimately changes because SNAP now sees the corrected TAFDC, which needs a maintainer's sign-off. The eligibility test applies 704.281(B)'s 50% disregard but not 704.281(A)'s six-month full disregard (pointing it at the grant's blended income made a $45,600 family eligible). Exit is $30,960; DTA's $7,512 example reproduces exactly. |
| MA TAFDC counted once — branch `fix-ma-tafdc-double-count` | #9470 | to open: `ma_tafdc` was the only `STATE_TANF_VARIABLES` member also listed in `household_state_benefits`; removed from all four dated lists, with a test that fails on the old parameter. 1,160 MA + partner tests pass. |

The coverage-gap and employer-premium items are modeling decisions left
to the maintainers (#9472, #9473).
