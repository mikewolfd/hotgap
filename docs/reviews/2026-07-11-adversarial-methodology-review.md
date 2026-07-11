# Adversarial methodology review — HotGap

**Date:** 2026-07-11
**Method:** Five independent expert subagents, each reading the actual code/copy (not a summary), charged to find what is wrong, overstated, or missing. Lenses: benefits caseworker/social worker, tax-and-transfer policy analyst, health economist, data methodologist, lived-experience + behavioral. Controller independently verified the load-bearing claims against PolicyEngine and the committed data.

## The three questions, answered

- **Would a social worker trust these determinations?** *Partly, with a serious caveat.* The health-cost handling is more careful than most cliff tools, but the model treats *income-eligible* as *enrolled* for the rationed programs that drive its biggest numbers — so "the scariest number on the page is probably bigger than what will actually happen."
- **Would a policy analyst endorse the methodology?** *No, as specified — only as a directional single-household storytelling aid.* The two headline deliverables (the state "leap" ranking and the reach %) rest on the least defensible methods.
- **Are we missing a perspective?** *Yes — the most important one.* Nobody who has filled out a form like this under real financial stress, or a frontline navigator who does this math with clients, was in the room when the five questions and eight archetypes were chosen. Several whole populations are invisible (below).

## Convergent findings (flagged by 2+ experts = highest confidence)

### 1. Rationed programs modeled as guaranteed receipt — the single biggest distortion (all 5 experts)
`worker/src/translate.ts` requests `head_start`, `spm_unit_capped_housing_subsidy`, and childcare inputs as `null`, so PolicyEngine grants them whenever a household is income-eligible. There is no take-up, capacity, or waitlist adjustment anywhere (grep for "waitlist"/"capacity"/"take-up" → 0 hits). But Head Start serves a minority of eligible children, housing vouchers reach ~1 in 4 eligible households, and CCDF is waitlisted in most states.
**Controller-verified:** the flagship "$22k cliff" (CA fixture, $30k→$31k) is driven **entirely** by Head Start (headstart $22,285 → $0; all other programs move < $200 combined). For the very common family on a Head Start waitlist paying full-freight daycare, that cliff **does not exist** — it is hallucinated. This inflates the personal-door verdicts and, because "the leap" is the map's default metric, the entire cross-state ranking.

### 2. Reach metric compares incompatible income concepts (policy analyst + data methodologist)
`safeExitEarnings` is a point on **one person's employment-income** axis (`archetypes.ts` fixes spouse earnings and other income to 0). The reach ladder is built from PUMS **HINCP = total household money income** (all earners + Social Security + SSI + retirement + interest). Placing a single-earner wage figure on an all-source household-income distribution biases the "% you'd out-earn" — most severely for married archetypes (modeled single-earner, ranked against dual-earner couples). Plus a **2023 PUMS vs 2026 policy-year vintage mismatch** (~8–12% nominal income growth uncorrected → another ~5-percentile bias). The reach % is not reliable to the precision "about {n}%" implies.

### 3. The map's archetypes zero out childcare and rent (policy analyst + data methodologist)
`archetypes.ts` sets `monthlyChildcare: 0`, `monthlyRent: null` for all 8 archetypes — including those with toddlers. So the map's default single-parent-of-2 pays $0 for childcare, receives $0 CCDF, and shows **no childcare cliff** — the largest cliff a working single parent actually faces. This also silently breaks the spec's "the two doors can never disagree" guarantee: a real family entering childcare/rent on the personal door gets a materially different curve (and reach %) than the map shows for "a family like this."

### 4. Missing intake dimensions → whole populations mis-modeled (social worker + lived-experience)
The 5 questions never ask: **current enrollment** (the model assumes full take-up of everything), **assets** (SSI's $2,000 limit and TANF asset tests disqualify income-eligible savers), **immigration status** (mixed-status families have entirely different access), **other income** (child support, SSDI already in pay, unemployment, a second/gig job), or **household composition beyond married/single** (kinship caregivers raising grandchildren, unmarried cohabiting co-parents whose income counts anyway). Self-reported "disability" (a yes/no toggle) is treated as an approved SSI/SSDI determination, though >60% of initial SSA claims are denied.

### 5. Framing risks fatalism, and the caveat is buried (social worker + lived-experience)
The red verdict headline (`Watch out near {wage}`, 1.7rem) is the first, biggest, most colorful thing on the page; the "this is a guess, check your caseworker" honesty box is the last, smallest, grayest, after headline/chart/why-list/escape. On a danger-zone/no-escape result, three "even…" lines stack (`safeNever`, `reachNever`, and the reach % telling someone they'd need to out-earn 80–90% of families like them) — reading, to a stressed lay reader, as "there is no way out for someone like you." The tool says "show and explain, never advise," so it offers **no next step** — no 211, no benefits navigator, no pointer to the programs that smooth cliffs. For a tool whose stated goal is to counter cliff fear, this can deepen it.

## Genuine bugs the controller independently verified (fixable)

- **ACA premium-tax-credit double-count in the health fold.** `household_net_income` already includes the PTC (inside refundable credits), and the MOOP we subtract is the premium *net* of that same PTC — so the subsidy is counted twice. For a TX single-parent-of-2 at $44k, the tool shows ~$46,800 "after health" vs. the honest cash-in-pocket ~$42,000 — overstated by the full PTC (up to ~$6k), and because the PTC varies with income, it distorts the health cliffs Plan 4 markets. Fix: `netIncome = rawNet − PTC − MOOP` (equivalently subtract gross premium). Re-regenerates all data.
- **`medicalOOP` is premium-only; its label is false.** Code/comment/spec call it "premiums net of subsidy + deductibles/copays." Empirically it is pure net premium (MOOP = 0 across the entire Medicaid band; MOOP+PTC = a flat gross premium). A synthetic axis household has no imputed utilization, so deductibles/copays are zero everywhere. Consequence: the deductible/cost-sharing exposure that is the real welfare content of losing Medicaid is **entirely absent** → the "cushioned, no real cliff" story flatters exactly the transition it claims to make honest. Fix: relabel the axis "money after health **premiums**," or fold in cost-sharing exposure.
- **A manufactured 400%-FPL health cliff.** With no employer-coverage assumption, PolicyEngine treats the household as marketplace-enrolled at every income and charges the full unsubsidized premium above 400% FPL — producing a ~$3,868 "you could lose help paying for insurance" drop at $84k→$85k (pinned as `programEnds.aca = 84000`). At $85k a family of two overwhelmingly has ESI; this cliff is an artifact of the no-ESI assumption. It also means **the 2026 ACA enhanced-subsidy regime is silently baked in as expired**, undocumented.
- **`result.honesty.health` is false in non-expansion states.** "Losing Medicaid often means paying for other coverage, not losing it all" universalizes the California expansion-state finding; in the coverage gap (non-expansion, childless adult 0–100% FPL) there is neither Medicaid nor a subsidy — the copy is affirmatively wrong, and every non-expansion state on the map inherits it.
- **Spec-vs-code overclaims.** The spec promises "effective marginal tax rate per segment" — the code computes only net-income **dollar differences**, never a rate (grep confirms no denominator anywhere). The spec claims the curve surfaces "the 250% FPL cost-sharing-reduction loss" — it does not (MOOP rises smoothly through 250% FPL). The spec says the CA fixture cliff is health-driven — it is Head Start, with MOOP moving only +$132 there.

## Methodological weaknesses (design tradeoffs, not simple bugs)

- **Cliff = net drop > $200 over a $1,000 grid.** Absolute-dollar (not a rate); under-detects sub-$200 losses that are still >100% marginal rates; the grid width silently varies with the user's income (axisMax scales); notches never fall on round-$1,000 boundaries, so cliff **location** is uncertain by ±$1,000 and offsetting intra-bin notches can vanish — corrupting the leap, safe-exit, and every program threshold.
- **Static, full-take-up, current-law snapshot.** No recertification lag (benefits actually adjust 6–12 months later, not the instant pay rises), no transitional Medicaid/SNAP, no TANF time limits, no categorical eligibility, no behavioral response.
- **Small-sample reach cells shown, not nulled.** MIN_SAMPLE=30 unweighted is low for a 21-point ladder; single-3 medians swing 3.4× across states (sampling noise, not economics); PUMS's 80 replicate weights (for standard errors) are unused; every reach % is a bare point estimate with no interval, and the shipped data discards the unweighted n needed to recover uncertainty.
- **PolicyEngine is the sole ground truth.** No in-repo validation against the Atlanta Fed Policy Rules Database / CLIFF suite or administrative thresholds, despite the design doc conceding state program depth is "uneven" — so the escape income carries a state-dependent, unquantified error that propagates into the map ranking and the reach denominator.

## The missing perspectives (the answer to "are we missing one?")

1. **Lived experience / frontline navigator — the biggest gap.** The five questions describe a policy analyst's textbook household. Someone who has done this under stress would have caught, pre-ship, that: household composition erases kinship caregivers and unmarried co-parents; "no escape found" needs a next step or it reads as "give up"; and the map's zero-rent/zero-childcare family isn't recognizable to the renters it's meant to serve.
2. **Take-up / participation** — the single largest determinant of whether a cliff is *experienced*; assumed 100%, including for rationed programs.
3. **Insurance-source / coverage** — no ESI-offer, marketplace take-up, or metal-tier modeling; everyone is "benchmark silver, always enrolled."
4. **Uncertainty quantification** — no confidence intervals on numbers used to rank states and tell people their escape is at the 80th percentile.
5. **External validation** — no calibration against the very prior-art tools (CliffWatch, Atlanta Fed CLIFF, Urban NICC) the design cites.
6. **Invisible populations:** mixed-status families, multi-earner/gig households, asset-holding savers, kinship/multigenerational households, disabled adults not yet approved for SSI, aged-out foster youth, Puerto Rico/territory residents (given a dead end).

## What holds up (the panel's genuine credits)

- Subtracting **realized cost** instead of adding Medicaid's actuarial sticker value is the right call and empirically vindicated for expansion states (CA parent's $11,035 Medicaid drop renders as a $988 after-health dip, not a fake $11k cliff).
- The **reach honesty discipline** — cross-sectional "already earn," never "your odds"; null cells omitted, never shown as 0%; transparency note on both doors — is correct and rare in this genre.
- The **running-peak "dead zone"** definition is the theoretically correct concept, better than naive adjacent-point comparison.
- The **"not sure" affordances** and the refusal to fabricate unmodeled programs show real honesty engineering.

## Net assessment

The core value proposition — a plain-language, directional, single-household picture that a cliff *can* exist and roughly where — largely holds, and the health-vs-sticker choice is genuinely good. But the review meaningfully lowers confidence in the tool's **headline quantitative claims**: the cross-state "leap" ranking (distorted by rationed-programs-as-received, childcare-off archetypes, and grid coarseness) and the reach % (income-concept mismatch + vintage + small-sample noise). The most defensible framing of the whole tool is directional and illustrative, not a precise or comparative measurement — and the current copy presents point numbers with a confidence the methodology doesn't support.

## Recommended actions (tiered)

**Correctness fixes (concrete, verified):** the PTC double-count; relabel MOOP as premiums (or add cost-sharing); the non-expansion honesty-copy falsehood; the spec overclaims (EMTR, 250% CSR, the CA-cliff attribution); document/flag the ACA subsidy-regime assumption.

**Honesty/framing (cheap, high-impact):** prominently disclose "we assume you receive every program you qualify for, including waitlisted ones (Head Start, housing, childcare) — your real cliffs may be smaller"; move the estimate caveat above the fold; add a next-step resource (211 / benefits navigator) on danger-zone/no-escape results; add ±uncertainty language to the reach %.

**Methodology (larger):** a take-up/enrollment question and adjustment; fix the reach income-concept mismatch (compare household earnings, or reframe) + vintage; add an "are you currently receiving these?" path; validate a sample of cliffs against the Atlanta Fed PRD; widen the reach small-sample cutoff and show a range.

**Scope decisions (product):** which invisible populations to bring in (assets, immigration, household composition, other income) vs. explicitly declare out of scope.

## Resolutions (Plan 6, 2026-07-11)

Plan 6 ("model honesty") shipped against this review's findings. Status of each:

- **#1 Rationed programs modeled as guaranteed receipt (all 5 experts, the single biggest
  distortion) — ADDRESSED.** Head Start, the housing voucher, and employer-sponsored coverage
  are no longer assumed on income-eligibility. A new "which of these do you get now?" flow
  screen and live result-page toggles (`<Toggles>`, "What if you get more help?") let the
  household say what they actually receive, defaulting to **No** — the honest baseline, since
  most eligible households don't receive rationed benefits. The map's baseline archetype
  curves were regenerated with that same rationed-off default, so the map no longer silently
  assumes full take-up either; a household that answers "no" to everything now gets numbers
  consistent with the map's default. This does not add take-up *probabilities* — see "still
  open" below.
- **ACA PTC double-count in the health fold — FIXED.** `netIncome` now subtracts the premium
  tax credit alongside MOOP so the subsidy is no longer counted twice; all 51 states'
  precomputed data were regenerated.
- **`medicalOOP` mislabeled "premiums net of subsidy + deductibles/copays" — FIXED.** The
  measure is relabeled premiums-only (it never carried non-premium cost-sharing for synthetic
  axis households); copy and comments no longer claim deductible/copay exposure that isn't
  there.
- **`result.honesty.health` false in non-expansion states — FIXED.** The copy no longer
  universalizes the expansion-state "moving to other coverage" story; non-expansion states
  (no Medicaid expansion, no marketplace subsidy floor for childless adults in the coverage
  gap) get honest wording instead of inheriting the expansion-state claim.
- **CCDF childcare subsidy — DESCOPED, not fixed.** A spike probed
  `spm_unit_ccdf_subsidy` for eligible low-income families with real childcare cost across
  several states; PolicyEngine returned null/zero household-side in every case. This is a
  PolicyEngine modeling limitation, not something Plan 6 could fix, so the childcare-subsidy
  program and its take-up toggle were dropped rather than shipping a toggle with no effect.

**Still open (carried to Plan 7+):** the reach metric's income-concept mismatch (single-earner
employment income vs. all-source household income) and PUMS vintage lag; no uncertainty
bounds on reach percentages or cliff locations; no external validation against the Atlanta Fed
Policy Rules Database or similar prior art; take-up is now a **user input**, not a modeled
probability — a household still has to know and report what it receives, there's no
population-level take-up-rate adjustment for households that don't answer; and the missing
intake dimensions (assets, immigration status, other income, household composition beyond
married/single) remain unasked.
