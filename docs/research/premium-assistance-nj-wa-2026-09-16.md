# NJ Health Plan Savings and Cascade Care Savings, coverage year 2026 — what they pay, who says so, and how HotGap now carries them

**Date:** 2026-09-16 (every page and file below was retrieved that day)
**Method:** primary sources fetched directly with `curl` and read with `pdftotext` — the
Treasury OTA addendum on cms.gov, four NJ DOBI budget documents on pub.njleg.state.nj.us,
Get Covered NJ's pages, the Washington Health Benefit Exchange's final PY2026 policy and its
2025-09-30 methodology memo, RCW 43.71.110 — plus the deployed model itself (the hosted
engine, policyengine-us 2.6.2) probed at $1,000 steps to read back the schedule it
implements. Two research sub-agents did the first sweep and every load-bearing figure was
then re-fetched and re-read here. "Verified" means read on the fetched page or file;
"inferred" is marked as such. Nothing is typed from memory.

## 1. The short version

Both programs were already modeled upstream when this work began — PolicyEngine added
Washington Cascade Care Savings in August (issue #9222, PR #9239, released in 1.797.0) and
New Jersey Health Plan Savings the same week (#9224, PR #9244, 1.801.0) — and the hosted
engine at 2.6.2 serves both variables. HotGap simply never asked for them. The two states
were hatched "figures incomplete" for a gap that had already closed on the engine's side.

So the model half of this job was mostly wiring: `nj_njhps` and `wa_cascade_care_savings`
join `STATE_PREMIUM_ASSISTANCE`, the client's probe finds them, the sweep requests them,
and `applyStatePremiumAssistance` nets them out of the premium. A local per-member table
(`PER_MEMBER_PREMIUM_HELP` in `statePremiumWraps.ts`) covers the public API, which is
still on 1.764.6 and has neither; it never fires on the engine.

The research half found two things worth sending back upstream. Washington's upstream
model subtracts a "benchmark premium expectation" ($0/$10/$15 a month by income band) that
the Exchange's **final** PY2026 policy explicitly did not adopt — it is the January 2025
draft's schedule, and the final policy's Attachment 1 lists it among the concepts "included
in the final draft ... but not included in the final policy" — and every URL the upstream
files cite returns 404. New Jersey's upstream schedule is right, but its 2026 currency
rested on a conditional sentence in a spring-2025 budget response; the FY2026-2027 response
and an August 2026 letter now say it outright. Three unpushed branches carry the fixes (§6).

## 2. New Jersey Health Plan Savings (NJHPS)

### 2.1 The schedule

A flat amount per member per month, by household income as a share of the poverty line,
paid to the carrier on top of the federal advance premium tax credit and capped at what is
left of the premium after it. Set by the Commissioner of Banking and Insurance under
P.L. 2020 c.61 (the Health Insurance Affordability Fund), not by statute.

| Income, % FPL (2025 guidelines) | Per member per month | Verified in |
|---|---:|---|
| under 138% | $0 — an adult is on NJ FamilyCare | Get Covered NJ "Get Financial Help": "Consumers eligible for NJ FamilyCare cannot get financial help" |
| 138% through 150% | **$20** | Treasury OTA addendum, PDF p.9 bullets; Table 2 p.12 |
| over 150% through 200% | **$40** | same |
| over 200% through 250% | **$50** | same |
| over 250% through 400% | **$100** | same; DOBI FY2026 p.8: "$100 per person per month – which can mean a $400 a month for a family of four at 300% FPL" |
| over 400% through 600% | **$50** | same. Above 400% the federal credit is $0 for 2026, so this is the only help |
| over 600% | $0 | four 2026 DOBI press releases and Get Covered NJ: "up to 600% of the federal poverty level"; $93,900 for one, $192,900 for four |

Bands are upper-inclusive and the edges are notches, not tapers: the 250% edge is a
$50-a-month step per member, $200 a month for a family of four. Every member on the plan
counts, and only those: a child at or under 355% FPL is NJ FamilyCare-eligible and "cannot
get financial help with their coverage through GetCoveredNJ", so a lone parent at 263% FPL
draws $100 a month, and $300 once the children age out of FamilyCare. Any metal level (the
FY2027 response's metal table shows NJHPS paid at Gold, Silver and Bronze). On-exchange
only. Not on Form 1095-A and not reconciled on Form 8962 ("not connected to your federal or
state taxes"). Citizens, nationals and the lawfully present.

The vintage caveat, stated plainly: **no New Jersey document for plan year 2026 restates the
five amounts.** Get Covered NJ's premiums page sends the reader to its calculator; the
Legislature's budget committee asked DOBI for the 2026 minimum, midpoint and maximum and
DOBI answered with average combined help instead. The currency of the schedule rests on
three DOBI statements and one empirical table:

- FY2025-2026 budget discussion points, p.8: "The lowest amount an eligible individual can
  receive per month in New Jersey Health Plan Savings is $20 and the maximum is $100."
- FY2026-2027 budget discussion points, p.4: "While the enhanced APTCs were not extended by
  the federal government in 2026, the Department continued providing NJ Health Plan Savings
  subsidies up to 600% FPL." PY2025 actual NJHPS spending $224,942,542; PY2026 estimated
  $238,091,670; FY2027 projected $200.0M with the fund's closing balance at $0.0M and the
  2027 allocation "not determined".
- Letter to the Assembly Budget Committee, 2026-08-18, p.5: "For plan year 2026 (using 2025
  FPL levels), for a family of four, the 400 percent of FPL is $128,600, and 600 percent of
  FPL is $192,900" — 4 × and 6 × $32,150, the 2025 four-person guideline, which fixes the
  FPL vintage HotGap already uses for marketplace rules (`FPL_2025` in `policyYear.ts`).
- The FY2027 response's PY2025 cohort table (an embedded image; the sub-agent extracted it
  with `pdfimages`, and it is not in the text layer): average NJHPS per member per month $16
  under 200% FPL, $43 at 200–250%, $91 at 250–300%, $96 at 300–400%, $40 at 400%+ — every
  cohort at or under its scheduled amount, none over, which is what a premium-capped flat
  amount must show and what a richer 2026 schedule could not.

And one independent read of the deployed model: on policyengine-us 2.6.2 a single adult's
`nj_njhps`, sampled every $1,000, is $0 to $22,000, then $20 from $23,000 (147% of $15,650),
$40 from $24,000 (153%), $50 from $32,000 (204%), $100 from $40,000 (256%), $50 from
$63,000 (403%) and $0 from $95,000 (607%) — the same schedule, each edge at the first step
past 138/150/200/250/400/600%.

### 2.2 Sources

| Source | Gives | Vintage | URL | Status |
|---|---|---|---|---|
| U.S. Treasury, Office of Tax Analysis, Section 1332 pass-through methodology addendum for New Jersey | The enhanced schedule, bullets (PDF p.9) and Table 2 "Enhanced Monthly State Subsidy" (p.12). The same PDF's February 2021 half lists the superseded initial schedule $20/$30/$40/$95 to 400% — the $95 is the tell | November 2021 | https://www.cms.gov/files/document/1332-ota-methodology-addendum-nj-pass-through.pdf | Verified (200, 325,511 bytes, pdftotext) |
| NJ DOBI, FY2025-2026 budget discussion points | "$20 … $100"; "$400 a month for a family of four at 300% FPL"; "$212.2 million" projection; the conditional "intends to continue … up to 600% FPL" (p.8) | spring 2025 | https://pub.njleg.state.nj.us/publications/budget/governors-budget/2026/dobi_response_2026.pdf | Verified |
| NJ DOBI, FY2026-2027 budget discussion points | "continued providing NJ Health Plan Savings subsidies up to 600% FPL" (p.4); spending table; metal-level averages; PY2025 cohort image | spring 2026 (cites a 2026-04-21 release) | https://pub.njleg.state.nj.us/publications/budget/governors-budget/2027/dobi_response_2027.pdf | Verified |
| NJ DOBI, follow-up response to the Assembly Budget Committee | "plan year 2026 (using 2025 FPL levels)"; $128,600 / $192,900 for four (p.5) | 2026-08-18 | https://pub.njleg.state.nj.us/publications/budget/governors-budget/2027/dobi_follow_up_response_abu.pdf | Verified |
| Get Covered NJ, "Lower Your Monthly Premiums with the NJ Health Plan Savings" | "up to 600% … $93,900 … $192,900"; "in addition to the federal APTC. It will not affect how much APTC you receive"; no schedule | live, post-2026 open enrollment | https://www.nj.gov/getcoverednj/financialhelp/premiums/ | Verified |
| Get Covered NJ, "Get Financial Help" and FAQs | FamilyCare exclusions (adults ≤138%, children ≤355%); any metal level; 1095-A does not include NJHPS; lawful presence | live | https://www.nj.gov/getcoverednj/financialhelp/gethelp/ ; https://www.nj.gov/getcoverednj/findanswers/faqs/ | Verified |
| P.L. 2020 c.61 | Creates the fund; delegates the schedule to the Commissioner; sets no ceiling | 2020-07-31 | https://pub.njleg.gov/bills/2020/AL20/61_.HTM | Read by the sub-agent; not re-fetched here |

### 2.3 What could not be verified

- The five per-band amounts from any NJ document for plan year 2026 (see above). The
  400–600% band is the least documented and the most exposed: its 2021 rationale (a top-up
  to the enhanced credit) is gone, and DOBI declined to state the 2026 amounts when asked.
- Whether a household under 400% FPL that is credit-ineligible for a non-income reason (an
  affordable employer offer; a non-filer) still gets NJHPS. Upstream and HotGap both pay it
  wherever a marketplace premium is owed; the employer-offer bar applies to all help.
- The 100–138% FPL sliver (lawfully present adults under the Medicaid five-year bar buying
  on the marketplace): the schedule starts at 138% and no NJ statement covers them.
- The sub-agent found a DACA exclusion in the FAQ; the page as fetched here did not contain
  it, so it is not in HotGap's note.
- The Get Covered NJ Shop and Compare tool was not driven in a browser. It is the one
  measurement that would close the first gap, and it must be run at a controlled income with
  the APTC and NJHPS lines read separately, after checking which plan year it prices.

## 3. Washington Cascade Care Savings

### 3.1 The rules as adopted

The Exchange's "Plan year 2026 final Cascade Care Savings policy" (PDF dated 2025-03-31,
"Effective for Coverage Beginning January 1, 2026") and its 2025-09-30 memo "Final Cascade
Care Savings amounts for plan year 2026 released". Read from the PDFs:

| Element | PY2026 | Where |
|---|---|---|
| Income ceiling | "Has income up to 250% of the Federal Poverty Level" — no floor | Policy §4(1)(c), p.11 |
| Members with federal subsidies (Wakely's Group 1) | **$55 per member per month** (PY2025: $155) | Memo p.1; exhibit p.7 |
| Members without federal subsidies (Groups 2 and 3) | **$250 per member per month** (unchanged) | Memo p.1; exhibit p.7 |
| Household amount | the base amount "multiplied by the number of eligible enrollees … and then summing" | §5(1)(c), p.14 |
| Cap | the lesser of (i) "the household's net premiums after first applying all APTC" and (ii) the net premium the members would pay "if each eligible enrollee … were enrolled in the lowest cost Cascade Care Silver plan in the household's county" | §5(1)(d), p.14 |
| Benchmark premium expectation | **not adopted** — Attachment 1, "Policy concepts included in the final draft PY 2026 Cascade Care Savings policy, but not included in the final policy": "The Exchange is not finalizing this concept within the policy for PY 2026 because implementing the benchmark premium expectation results in modest savings … at the expense of enrollment for customers 200 – 250% FPL" | Attachment 1, p.3 |
| Plan | "Silver or Gold Cascade Care plan" (a standardized QHP under RCW 43.71.095) from a carrier that does not tobacco-rate; Bronze excluded (its expansion "not finalized"); AI/AN may use any plan | §3(15), §4(1)(d), Attachment 1 |
| Federal help first | "Applies for and accepts all APTC for which the individual's household is eligible"; APTC "must be applied … before application of any State Premium Assistance Amounts" | §4(1)(e), §5(3) |
| Exclusions | eligible for Apple Health, Apple Health Expansion or COFA premium assistance; enrolled in Medicare; denied federal help for other affordable coverage, non-filing or non-reconciliation | §4(1)(f)–(g), §4(2) |
| Appropriation | "$55 million legislative appropriation for plan year 2026"; up to 10% may be held in reserve; the program may close to new enrollees if spending outruns it | Memo p.1; §5(1)(a); §11 |
| Statute | RCW 43.71.110(4): the income threshold is "determined through appropriation or by the exchange"; silver or gold standard plan; all federal help first. 250% is not in statute | RCW |
| 250% edge | a hard notch: the whole household amount ends there | §4(1)(c) |
| $0-premium tier | none. The only route to one was the expectation, which was not adopted | — |
| FPL vintage | the Exchange's own December 2025 brief gives 250% as $39,125 for one and $66,625 for three — 2.5 × the 2025 guidelines. Healthplanfinder now shows $39,900 / $68,300, the 2026 ones; no policy text says which governs a mid-year determination | issue brief; consumer page |

The deployed model, read back on 2.6.2: a single adult's `wa_cascade_care_savings` is $0 to
$22,000, $660 a year ($55 × 12) from $23,000 through $39,000 (147–249% of $15,650), and
$0 from $40,000. The lower edge is Apple Health's (138%), not the program's; the upper is
the first step past 250%. Across all eleven archetypes the amount is 12 × $55 × the
members on the plan at every paying point, except a childless couple at four points
($1,090–$1,238 instead of $1,320) — the upstream expectation biting, §5.

### 3.2 Sources

| Source | Gives | Vintage | URL | Status |
|---|---|---|---|---|
| WAHBE, final PY2026 Cascade Care Savings policy (19 pp.) | §§1–3 p.9, definitions p.10, §4 p.11, §5 p.14, §11 p.18; Attachment 1 p.3 | PDF dated 2025-03-31 | https://www.wahbexchange.org/content/dam/wahbe-assets/materials/collateral/cc/FinalPY2026CascadeCareSavingsPolicy_Combined.pdf | Verified (200, 408,075 bytes, pdftotext) |
| WAHBE, final PY2026 maximum PMPM methodology (memo + Wakely exhibits, 7 pp.) | $55 / $250 and $55M on p.1; group definitions p.5; 2025-vs-2026 exhibit p.7 | memo dated 2025-09-30 | https://www.wahbexchange.org/content/dam/materials/communications/legislative/2025/WAHBE_Final_PY_2026_Cascade_Care_Savings_Maximum_Per_Member_Per_Month_Methodology.pdf | Verified (200, 351,378 bytes) |
| The URLs upstream cites | `…/wahbe-assets/board/2025/PY2026-Final-CCS-Policy.pdf`, `…/PY2026-Final-PMPM-Methodology.pdf` | — | — | **404**, both (curl, 2026-09-16) |
| WAHBE, Cascade Care Savings program page | "$55 … $250"; Silver or Gold Cascade Care plan; "take all federal premium tax credits" first | live (carries a PY2027 comment notice dated Aug 2026) | https://www.wahbexchange.org/about-the-exchange/initiatives/cascade-care/cascade-care-savings/ | Read by the sub-agent |
| Washington Healthplanfinder, Cascade Care Savings | "$39,900 … $68,300"; Silver and Gold qualify, Bronze and non-Cascade do not; "cannot get these savings if you qualify for Apple Health" | live | https://www.wahealthplanfinder.org/us/en/my-account/savings-options/cascade-care-savings.html | Read by the sub-agent |
| WAHBE legislative issue brief, Dec 2025 | "$55M / FY2026"; "$39,125 for an individual or $66,625 for a family of three"; "up to $660 a year" / "up to $3,000 a year" | 2025-12-09 | https://www.wahbexchange.org/content/dam/materials/communications/legislative/2026/WAHBE_CCS_issue-brief_2026_120925.pdf | Read by the sub-agent |
| RCW 43.71.110; RCW 43.71.095 | statutory eligibility; standard plans | 2021 c 246 | https://app.leg.wa.gov/RCW/default.aspx?cite=43.71.110 | Read by the sub-agent |

### 3.3 What could not be verified

- The "$5M reserved for the 1332 waiver population" upstream's `in_effect` note carried: the
  adopted PY2026 policy's §5 footnote 1 says only "Any funding contingent on continued waiver
  approval can only be used for the eligible non-federally subsidized population". The $5M is
  the PY2025 policy's and the PY2026 draft's figure. The upstream branch says so.
- Which poverty-guideline vintage the Exchange applies to a determination made mid-2026;
  its two surfaces disagree. HotGap uses 2025, the vintage marketplace rules run on.
- Whether the §11 low-funds contingency was invoked for PY2026.
- Group 2 (lawfully present, credit-ineligible, still eligible for the $250): upstream models
  only Group 3 (undocumented) at $250 and documents Group 2 away. Immaterial to HotGap's
  households, all of whom are credit-eligible inside 250% FPL.

## 4. What HotGap does with it

- `core/src/statePremiumAssistance.ts`: NJ (`nj_njhps`) and WA (`wa_cascade_care_savings`)
  join the served-variable table. The engine at 2.6.2 answers the probe `true` for both (and
  for `ct_covered_connecticut` and `ma_connector_care`, §7). `UNMODELED_STATE_PREMIUM_ASSISTANCE`
  is empty, and `statePremiumWraps.test.ts` asserts it.
- `core/src/statePremiumWraps.ts` `PER_MEMBER_PREMIUM_HELP`: the two schedules above with
  publisher, URL, `readOn`, the upstream issue that retires each row, and the conditions.
  `core/src/evaluate.ts` `applyPerMemberPremiumHelp` pays 12 × the band amount × the members
  on the plan (adults, plus children off Medicaid and CHIP at that point — `esiTierAt`'s
  reading), capped at the premium left, only where the endpoint served no figure and there
  is no federal-credit guard: New Jersey pays where the credit is $0.
- `core/src/coverage.ts` reports `modeled` where every point carries the engine's figure and
  `ladder` where the table applied, naming the program, the publisher URL and the retiring
  issue; the map's hatch keys off the unmodeled list, which now carries LIHEAP alone.
- `contract/policyengine.contract.test.ts`: two live cases pin $1,200 (NJ, one member in the
  $100 band) and $660 / $0 either side of Washington's 250% edge, whichever way the probe
  answers.

**Before and after, the committed sweep, single parent of two (`evaluateOffline`, old file
under the new code = the local table; new file = the engine's figure):**

| | $38,000 | $50,000 | $66,000 | $67,000 | $70,000 | $100,000 | $110,000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| NJ premium, before this work | 1,404 | 2,987 | 5,498 | 5,675 | 5,804 | 9,960 | 13,628 |
| NJ premium, after | 1,164 | 2,507 | 4,898 | 4,475 | 4,604 | 6,360 | 11,828 |
| NJ help (engine and table agree) | 240 | 480 | 600 | 1,200 | 1,200 | 3,600 | 1,800 |
| WA premium, before | 1,404 | 2,987 | 5,498 | 5,675 | 6,163 | 9,960 | 14,924 |
| WA premium, after | 744 | 2,327 | 4,838 | 5,675 | 6,163 | 9,960 | 14,924 |
| WA help | 660 | 660 | 660 | 0 | 0 | 0 | 0 |

NJ's $1,200 at $67,000–$99,000 is one member in the $100 band (the children on
FamilyCare; the federal credit is $0 there because the required contribution exceeds the
one-adult benchmark), $3,600 at $100,000 is three members, $1,800 above 400% FPL is three
members at $50. WA's $660 ends at the first step past 250% of the three-person guideline
($66,625): $67,000 pays nothing, exactly as the policy's hard edge says.

Local table against engine, all eleven archetypes, every point of both states: identical
except within one $1,000 step of a band edge — 12 of 1,661 NJ points and 4 of 1,661 WA,
where the engine's `aca_magi_fraction` and earnings ÷ `FPL_2025` land on opposite sides of
150, 250 or 600%.

Summary rows: NJ single-2's safe exit $111,000 → $114,000 and leap $62,000 → $56,000; a NJ
childless couple's largest loss $2,477 → $3,677 and a WA one's cliff count 1 → 2 — the
programs' own notches at 250% and 600% FPL, now on the map as the cliffs they are. Only the
NJ and WA rows and coverage blocks changed; no other state's file did.

## 5. The upstream Washington defect, measured

`wa_cascade_care_savings` computes `cap = slcsp − aca_ptc − 12 × expectation × members`
with the draft's $0/$10/$15 expectation. Against the adopted §5(1)(d) the subtraction is
spurious. On HotGap's sweep it binds for the WA childless couple only, at $52,000–$54,000
and one more point: $1,090, $1,116, $1,222 and $1,238 a year instead of $1,320 — up to
$230 short. Every other archetype gets the full $55 × members × 12 at every paying point,
because their post-credit residual is well above it. Small, but the rule is wrong and its
citations are dead, so it is fixed on the branch below rather than worked around here.

## 6. Upstream branches (in `~/Work/policyengine-us`, from `upstream/main` at 6b7101388a, unpushed)

| Branch | What | Proof |
|---|---|---|
| `state-premium-help-household-health-benefits` | Registers `ct_covered_connecticut`, `ma_connector_care`, `nj_njhps`, `vt_premium_assistance` and `wa_cascade_care_savings` in `gov.household.household_health_benefits` — `healthcare_benefit_value.py` already adds all nine state programs but the parameter list carried only CA, CO, MD and NM, the same omission the reviewer flagged as critical for Maryland (a6acf1f, "C2"). Seven new test cases, two of them derived through the model | `policyengine-core test …/household/household_health_benefits.yaml`: 19 passed |
| `wa-cascade-care-savings-final-py2026-policy` | Deletes `benchmark_expectation.yaml`; the cap becomes `max_(0, slcsp − aca_ptc)`; seven tests re-pinned to the adopted rule; every reference repointed from the 404 paths to the published policy and memo with pages located by text extraction; the `$5M` note corrected | `…/wa/wahbe/cascade_care_savings/`: 69 passed |
| `nj-njhps-py2026-citations` | Adds the FY2026-2027 response (p.4) and the 2026-08-18 letter (p.5) as references; replaces the conditional FY2026 sentence and the superseded "$212.2M flat" with the 2026 outcome and spending; fixes the addendum's `#page=8` anchor (the bullets are on PDF page 9); says plainly that no NJ 2026 document restates the amounts | `…/nj/dobi/njhps/`: 64 passed |

Each was run through the repo's own `.venv/bin/policyengine-core test … -c policyengine_us`,
never a `PATH` binary. Not pushed; not opened as PRs. State median income
(`parameters/gov/hhs/smi/amount.yaml`) is not referenced by either program — both are
keyed to the federal poverty line via `aca_magi_fraction` — so it played no part here.

## 7. The follow-up: Connecticut and Massachusetts, done the same evening

The engine at 2.6.2 also serves `ct_covered_connecticut` (1.795.0) and `ma_connector_care`
(1.799.0) — issue #9481's two halves, shipped in August, which
`docs/upstream/2026-09-15-local-corrections.md` had said did not exist. Both joined
`STATE_PREMIUM_ASSISTANCE` on the `ct-ma-premium-help` branch after a measurement, not
before: engine against HotGap's ladder on live curves, every archetype, every point.

**Connecticut** agrees to the dollar except one point each on married-3 ($66,000) and
married-dual-3 ($51,000), where the engine's two-decimal `aca_magi_fraction` lands at or
under 1.75 and the ladder's exact share does not. The resweep left every CT summary row
unchanged.

**Massachusetts**: the engine is the better model on two counts, both the ladder's fault.
Upstream's `ma_connector_care` is the full 2026 ladder — $0 to 150% FPL, then $53 / $103 /
$152 / $235 a month to 400% (ConnectorCare Overview 2026, Table 3; 956 CMR 12.12(9)), the
same figures HotGap's table holds — but it charges the enrollee premium **per person on the
plan**, and it pays **where the federal credit is $0**. HotGap's ladder counted adults only
(its own note says "per enrollee per month"; its code said `a.married ? 2 : 1`), so a lone
parent of two at 319% FPL, children off MassHealth at 300%, was charged $235 × 12 instead of
$235 × 12 × 3 — summed over a sweep, $137,000–$284,000 of understated premium per family
archetype. And its "a credit and a premium both exist" guard skipped every point where a
cheap benchmark against a 9.96% required contribution left the credit at $0, leaving the full
premium in place where ConnectorCare caps it (956 CMR 12.04(3)(c)'s "elects the full amount
of APTC available" is satisfied by $0; the engine pays there). Both are fixed on the ladder
so the public-API fallback agrees with the engine; re-measured, the residue is one-step band
edges and MassHealth's $28-a-child monthly CHIP premium, which sits inside `medicalOOP` and
which the ladder's cap swallows while the engine nets only ConnectorCare.

Resweep (`--states CT,MA`, engine 2.6.2): both blocks `modeled`; a Massachusetts single
adult's safe exit $55,000 → $66,000; a lone parent of two's leap $38,000 → $18,000; a couple
with two children's largest loss $10,220 → $4,580. Only the CT and MA rows changed. On the
committed sweep, no local premium table of either shape fires in any state.
