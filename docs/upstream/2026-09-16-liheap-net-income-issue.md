# Draft upstream issue: list the LIHEAP variables on `household_state_benefits`

**Status:** draft, not filed (Plan 7, Phase 3 — the owner files it). Repository:
PolicyEngine/policyengine-us. Related: #256 (the LIHEAP umbrella), #9405 and
PR #9503 (the same shape for the child-care subsidy).

---

## Title

`dc_liheap_payment`, `ma_liheap` and `il_liheap` are computed but never reach `household_net_income`

## Description

`programs.yaml` marks LIHEAP complete for DC, Massachusetts and Illinois
(`dc_liheap_payment`, `ma_liheap`, `il_liheap`; Texas's `tx_ceap` partial).
None of the four is listed in
`parameters/gov/household/household_state_benefits.yaml`, so none reaches
`household_state_benefits` → `household_benefits` → `household_net_income`. A
household that qualifies for and receives a LIHEAP payment in one of these
states is computed the payment and then shown a net income without it — the
same defect #9405 described for the state child-care subsidies before #9503
put the aggregate on the list.

## Evidence (policyengine-us 2.6.2, self-hosted `/us/calculate`, 2026-09-16)

Massachusetts, a single parent (30) with children 3 and 7 at $30,000 of
employment income, `tax_unit_is_filer: true`, `heat_expense_included_in_rent:
true` (the input that lifts `ma_liheap`'s heating-bill cap for a household
that sends no bill):

| request | `ma_liheap` | `household_net_income` | `household_state_benefits` |
|---|---:|---:|---:|
| `ma_liheap: null` (computed) | 814 | 63,168.04 | 0 |
| `ma_liheap: 0` (forced) | 814* | 63,168.04 | 0 |

\* the API echoes the computed value; net income is identical either way,
which is the point: the $814 is not inside it.

The probe HotGap runs once per endpoint (`core/src/client.ts`
`probeLiheapCounted`): a bare one-person Massachusetts household with
`ma_liheap` forced to 1,000,000 returns `ma_liheap: 1000000` and
`household_state_benefits: 0`. The same probe with `child_care_subsidies`
forced to the sentinel on a Connecticut household distinguishes a pre-#9503
model from a post-#9503 one; here there is nothing to distinguish yet.
The same forced sentinel on `il_liheap` (IL) and `dc_liheap_payment` (DC)
also leaves `household_state_benefits` at 0.

## Proposed fix

Add the LIHEAP payment variables to
`gov/household/household_state_benefits.yaml` (per state, or an aggregate
`liheap` variable listed once, as #9503 did for child care), so the modeled
payment counts in `household_state_benefits` and `household_net_income`.

## Two related observations, not the defect

1. On a request that sends no fuel type and no heating bill — the household
   facts a benefits calculator may not have — all four variables return $0:
   `ma_liheap` is `min(actual_expense_amount, payment_amount)` unless heat is
   in rent, and the DC, IL and TX payments key on a heating type that
   defaults to none. A downstream tool cannot tell "not eligible" from
   "no bill sent". A documented default (the utility row, uncapped) or a
   `defined_for` that surfaces the missing input would help.
2. `gov/states/ma/doer/liheap/standard/amount/non_subsidized.yaml` carries
   FY2026 (2025-10-01) utility-row amounts of $925 / $814 / $716 / … from a
   chart dated 2025-05-08; the FY2026 HEAP chart the LIHEAP Clearinghouse
   serves with Massachusetts' Model Plan, dated 2025-06-02, prints
   $500 / $460 / $425 / $390 / $390 / $355 for the same row
   (https://liheapch.acf.gov/docs/2026/benefits-matricies/MA_BenefitMatrix_2026.pdf).
   Massachusetts reissues the chart mid-fall with the High Energy Cost
   Supplement thresholds, so one of the two may be a reissue; worth a
   reference check.

## What HotGap does meanwhile

`core/src/parse.ts` adds a served LIHEAP amount to net income where the probe
says the model dropped it, and `core/src/evaluate.ts` applies HotGap's own
sourced table (`core/src/liheap.ts`, the state's published top-band amount)
where the served series is $0 on its payload. Both retire per endpoint as
described in `docs/upstream/2026-09-15-local-corrections.md`.
