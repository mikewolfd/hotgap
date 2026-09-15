# Methodology validation against primary government sources (2026-09-14)

On 2026-09-14 a policy-fellow review (Claude Fable, run inside the session) of
HotGap's methodology produced ten findings. The same day, four independent
research agents (Claude Opus) validated every factual claim in those findings
against primary sources only: the IRS, ASPE, CMS/medicaid.gov, eCFR and the
Federal Register, SSA (POMS and, via Zyte, ssa.gov itself), USDA FNS, ACF, the
Census Bureau, BLS, and the state agencies (CA DHCS, NY State of Health, TX
HHSC, MS DOM, WY DOH, MA DTA, AL, GA, FL, KS, SC, TN, WI). Non-government
pages were used at most to locate a primary document, never as authority. The
four full reports, and two Zyte follow-ups for pages the first pass could not
reach, are appended verbatim below.

The Census validator went further than checking claims: it downloaded the 2023
1-Year PUMS files for five small states, re-ran `scripts/build-reach.mjs`'s
algorithm, reproduced the shipped `core/data/reach.json` cell for cell, and
then measured the review's criticisms on that data with the Census's own
replicate-weight method.

## Verdict by finding

| # | Fellow's finding | Verdict | What the sources say |
|---|---|---|---|
| 1 | The money line subtracts the ACA premium tax credit twice | **Confirmed, fixed** | Independently re-derived by decomposition on a second household before the validators ran (commit 9693ad3). IRS Q&A (2026-07-22) and CMS confirm the advance credit is paid to the insurer and lowers the premium; a net premium already reflects it. Resweep committed (808361a). |
| 2 | Coverage-gap adults are charged a full benchmark premium | **Confirmed (mechanism)** | 26 CFR 1.36B-2(b)(1): PTC requires income ≥ 100% FPL. Wyoming DOH's own 2026 chart labels 47–99% FPL "No Coverage" for parents and 0–99% for other adults. Corrections: there are **ten** non-expansion states (Wyoming included), but **Wisconsin covers adults to 100% FPL and has no gap**, so nine states have one; parent limits across the ten span **10.1% FPL (Texas) to 100% (TN, WI)**; five states (TX, MS, GA, FL, WY) use frozen dollar standards whose % FPL falls every January. The immigrant-below-100%-FPL exception the fellow cited was **repealed for 2026** (P.L. 119-21 §71302). |
| 3 | Program labels name phase-downs, not losses | **Rates confirmed; SNAP understated** | EITC phase-out 15.98% / 21.06% re-derived from the 2026 IRS dollar table to four decimals. SNAP's marginal rate is 24% only when the shelter deduction is capped or zero; in the common uncapped region it is **36%** (7 CFR 273.9(d)(6)(ii)). The CTC "no cash change" claim holds only once liability exceeds ~$500 per child. |
| 4 | Program-end and benefits-end thresholds mislead | **Confirmed, with two corrections** | CA 138% / 266% confirmed from DHCS ACWDL 26-01 ($37,702 / $72,672 for three), except CCHIP extends children to 322% in three Bay Area counties. **New York's Essential Plan 200–250% tier ended 2026-07-01** (CMS approved the waiver termination 2026-03-20); the step is now at 200% FPL, $31,920. **Children's Medicaid and CHIP cannot end mid-year** (42 CFR 435.926, 457.342): a raise past the children's limit defers the loss to the next renewal, up to 12 months. |
| 5 | Employer-coverage premium constants never reach the money line | **Rules confirmed; constants unvalidated** | 2026 affordability percentage 9.96% (Rev. Proc. 2025-25) and the 2022 family-glitch rule confirmed. The $6,500 / $1,700 constants come from a non-government survey and were not validated; AHRQ MEPS-IC is the government series. Whether the constant reaches MOOP is PolicyEngine behavior, verified live by the fellow, not a government question. |
| 6 | "Disabled" models SSI only; SSDI's cliff is absent | **Confirmed** | SSI 2026 FBR $994/month, $20 + $65 exclusions, 1-for-2 reduction, $2,000 / $3,000 resource limits (frozen since 1989), SGA $1,690/month ($20,280/yr, confirmed directly from ssa.gov via Zyte), trial-work notch, average disabled-worker benefit $1,635.27/month, and SSDI's larger population (6.99M disabled workers vs 4.79M SSI disabled recipients under 65, July 2026 snapshot) all confirmed directly from ssa.gov via Zyte. §1619(b) 2026 thresholds CA $66,078 / NY $68,654 / TX $53,165, re-derived from the POMS component columns. The 2026 Red Book documents the trial-work-period notch structurally; "cash cliff" is HotGap's paraphrase, not SSA's wording. |
| 7 | Reach ladders include retirees and ignore spouse earnings | **Confirmed, and worse** | HHT and NOC carry no age term; 23–46% of "no children" householders in the five tested states are 65+; the 25th percentile is $0 in **50 of 51** states for childless singles. Three defects the fellow missed: the Census-mandated **ADJINC** factor (1.019518) is never applied; **~30% of single-parent "household earnings" comes from adults who are not the parent**; and `single-0` counts only people living alone. The n ≥ 30 floor is not a reliability test: cells that pass it carry 90% margins up to ±98% of the median. ×1.12 is a fair wage-growth factor but the total 2023→2026 factor should be ≈ 1.13–1.14. PUMS release dates: 2024 1-Year 2025-12-04, 2020–24 5-Year 2026-03-05. |
| 8 | Personal safe-exit and leap are whole-curve values | Design question | Not a matter of government fact. |
| 9 | Head Start is a $22k sticker value with an instant cliff | **Partly** | The carry-over rule is 45 CFR 1302.12(j)(1), not (k)/(l): an enrolled child stays eligible through the following program year. $22,285 per child is within 1.4% of California's per-child cost but 36% above the national figure. Age cutoff is compulsory school age, not kindergarten at five. |
| 10 | Minor items | Mixed | **Massachusetts TANF: refuted.** The family-of-five standard is $13,800–$14,280/yr (not $9,880), it tapers at 50 cents on the dollar to about $30,000 of earnings (not an abrupt end at $26–27k), and the real cliff is the six-month 100% disregard expiring at 200% FPL. Those wrong numbers came from PolicyEngine, not from the fellow. Federal Head Start, TANF 60-month limit, SNAP child-support rules, ABAWD 18–64 after P.L. 119-21: confirmed. 2025 FPL figures confirmed exact. |

## Things the fellow missed that the validators found

- P.L. 119-21 **eliminated the advance-credit repayment cap** for tax year 2026 (§71305). First-order for marginal rates near subsidy thresholds.
- P.L. 119-21 **replaced SNAP's non-citizen eligibility outright** (§10108, effective 2025-07-04): refugees, asylees, parolees and trafficking victims are no longer eligible. Medicaid's parallel change (§71109) takes effect 2026-10-01. The Medicaid work requirement (§71119) and six-month redeterminations (§71107) start in 2027.
- Two CFR parts lag the statute: 7 CFR 273.9(d)(6)(ii)(C) still allows internet fees in shelter costs (repealed), and 26 CFR 1.36B-2(b)(5) still recites the repealed immigrant exception. eCFR alone gives confident wrong answers here.
- Stale federal aggregators: medicaid.gov's eligibility table and expansion map are stamped December 2023. On every claim where a state page and a federal aggregator disagreed, the state page was right.
- Kansas: the first pass concluded the parent-Medicaid dollar chart was unpublished; the Zyte follow-up found it at a different path (Appendix F-8, Rev. 07-26): $866/month, $10,382/year for a family of three, 38% FPL inclusive of the 5-point disregard. Two validators disagreed and the second was right, which is the reason for running a second pass.
- No federal estimate of the coverage-gap population is newer than ASPE's February 2022 figure (2.2 million, 12 states). ASPE's January 2025 "1.5 million" is a republished KFF number. KFF's July 2026 estimate is 1.2 million across the ten states, but it is not a government source.
- No bill extending the enhanced premium tax credits has become law. One vehicle, H.R.1834 carrying a three-year extension, passed the House 230–196 on 2026-01-08 and has sat on the Senate calendar since 2026-02-10 with no action; the four bills the fellow might have looked for are still in committee (congress.gov, fetched directly).

## What is HotGap's to fix, what is PolicyEngine's, and what is presentation

**HotGap (library and data)**
- Done: the net-income formula, with a live identity pin in the contract suite.
- Reach builder: apply ADJINC; filter to householder age 18–64 via `HHLDRAGEP`; include HHT 5/7 in "single, no children"; `noc >= 3`; use householder-plus-spouse earnings (`PERNP`), not every member's; compute margins of error with `WGTP1–80` and suppress on MOE, not on a count; use the 5-Year PUMS for small states; move to the 2024 vintage.
- Cliff attribution: decompose each step into cash, credits, premiums; name a program only when it ends or loses most of its value; per-person program ends; treat a child-coverage threshold as deferred, not immediate.
- Inputs: SSDI vs SSI; other income; the sweep axis to $150,000.
- Data hygiene: parent-Medicaid thresholds in dollar-standard states decay every January; any hand-held threshold must be re-derived from the state's dollar table, never from a cached percentage.

**PolicyEngine (report upstream, verify their 2026 parameters)**
- Massachusetts TAFDC: wrong payment standard and an abrupt end that the state's rules do not have.
- New York Essential Plan upper limit: 200% FPL from 2026-07-01.
- Coverage-gap households: charged the benchmark premium rather than treated as uninsured.
- Employer premium input not reaching medical out-of-pocket.
- Whether the repealed immigrant PTC exception, the removed repayment cap, and the SNAP non-citizen change are reflected for 2026.

**Presentation (whichever front end comes next)**
- Zone-relative safe exit and leap for a specific household; carry `leapIsLowerBound` into the summary.
- Health cost is premiums only; deductibles above 250% FPL are not counted.


---

## Appendix A. Federal tax and ACA claims (IRS, ASPE, CMS, eCFR, Federal Register)

### Validation: federal tax & ACA claims in the HotGap methodology review

Validated 2026-09-14 against primary federal sources only. Non-government pages were not used, even for location.

---

#### A1 — PTC eligibility for coverage year 2026 — **PARTLY** (one half confirmed, one half **REFUTED**)

**400% cliff is back: CONFIRMED.** IRC §36B(c)(1)(A) limits "applicable taxpayer" to household income ≥100% and ≤400% FPL. §36B(c)(1)(E) "Temporary rule for 2021 through 2025" applies the no-400%-cap rule only "in the case of a taxable year beginning after December 31, 2020, and before January 1, 2026."
- 26 U.S.C. §36B, Office of the Law Revision Counsel, text in effect **September 13, 2026** — https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section36B&num=0&edition=prelim
- IRS, *Questions and answers on the Premium Tax Credit*, **last updated 22-Jul-2026**: Q7 "at least 100 percent but no more than 400 percent of the federal poverty line"; "For tax years 2021 through 2025, Congress temporarily expanded eligibility … by eliminating the requirement that a taxpayer's household income may not be more than 400 percent" — https://www.irs.gov/affordable-care-act/individuals-and-families/questions-and-answers-on-the-premium-tax-credit

**No 2026 extension enacted as of today: CONFIRMED.** The IRS PTC Q&A page, refreshed **22 July 2026** (well into the coverage year), still states the 100–400% limit and describes the expansion in the past tense. Rev. Proc. 2026-26 (setting the **2027** table) still indexes the §36B(b)(3)(A)(i) table with a 300–400% top tier, i.e. non-enhanced law is still the baseline going forward. Bills to extend (H.R.5145, H.R.6010, H.R.6074, S.3102, 119th Cong.) were introduced; none is reflected in enacted law at 26 U.S.C. §36B as of 2026-09-13.
- Rev. Proc. 2026-26 — https://www.irs.gov/pub/irs-drop/rp-26-26.pdf

**Immigrant exception below 100% FPL: REFUTED for coverage year 2026.** The review's stated exception is the now-**repealed** §36B(c)(1)(B). P.L. 119-21 §71302(a) ("Disallowing premium tax credit during periods of Medicaid ineligibility due to alien status") struck it, **effective for taxable years beginning after December 31, 2025** — i.e. it is gone in 2026.
- P.L. 119-21, §71302, July 4, 2025, 139 Stat. 322 — https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm
- Current §36B(c)(1) reads: `[(B) Repealed. Pub. L. 119-21, §71302(a), July 4, 2025, 139 Stat. 322]`; codification note: "struck out subpar. (B) which related to a special rule for certain individuals lawfully present in the United States for treatment as an applicable taxpayer." — uscode.house.gov link above, currency 2026-09-13.

> **Trap flagged:** 26 CFR 1.36B-2(b)(5) still carries the old rule verbatim ("Individuals lawfully present. If a taxpayer's household income is less than 100 percent of the Federal poverty line … the taxpayer is treated as an applicable taxpayer if — (i) The lawfully present taxpayer or family member is not eligible for the Medicaid program…"). The regulation has **not** been conformed to the statute. Anyone validating this claim against eCFR alone gets a clean, internally consistent CONFIRMED that is wrong for 2026. Statute controls. (https://www.ecfr.gov — title 26 §1.36B-2, current)

> **Related, not yet effective:** P.L. 119-21 §71301 narrows PTC eligibility to "eligible aliens" (LPRs, Cuban/Haitian entrants, COFA residents) — but its effective date is **taxable years beginning after December 31, 2026**, so it bites in 2027, not 2026. Do not conflate the two.

---

#### A2 — 2026 applicable percentage table — **CONFIRMED**

**Rev. Proc. 2025-25**, I.R.B. 2025-32 (bulletin dated **August 4, 2025**), §3.01; effective for taxable years and plan years beginning in calendar year 2026.
https://www.irs.gov/pub/irs-drop/rp-25-25.pdf · bulletin: https://www.irs.gov/irb/2025-32_IRB

| Household income % of FPL | Initial % | Final % |
|---|---|---|
| Less than 133% | **2.10%** | 2.10% |
| At least 133% but less than 150% | 3.14% | 4.19% |
| At least 150% but less than 200% | 4.19% | 6.60% |
| At least 200% but less than 250% | 6.60% | 8.44% |
| At least 250% but less than 300% | 8.44% | 9.96% |
| At least 300% but not more than 400% | 9.96% | 9.96% |

Discrepancy with the review: none material. The review's "2.1% at 100–133% FPL" matches; the table's own tier label is "Less than 133%" (flat — initial = final), and since PTC generally requires ≥100% FPL the effective band is 100–133%. Note the top tier is likewise flat at 9.96% and the middle four tiers interpolate linearly.

Note for the model: Rev. Proc. 2025-25 §2 records that beginning in 2026 the premium-growth measure changed (now captures individual-market premiums, not just employer-sponsored), per the HHS Marketplace Integrity and Affordability rule, **90 FR 27074 (June 25, 2025)**. The §36B(b)(3)(A)(ii)(II) additional adjustment is not applied for 2026 because the failsafe exception in §36B(b)(3)(A)(ii)(III) applies.

---

#### A3 — 2026 required contribution percentage + family glitch — **CONFIRMED**

**Required contribution percentage for plan years beginning in 2026 = 9.96%** (§36B(c)(2)(C)(i)(II), §1.36B-2(c)(3)(v)(C)). Rev. Proc. 2025-25 §3.02, Aug 4, 2025 — https://www.irs.gov/pub/irs-drop/rp-25-25.pdf

**Family glitch fix: CONFIRMED and still in force.** *Affordability of Employer Coverage for Family Members of Employees*, T.D. 9968, **87 FR 61979, published October 13, 2022**, effective December 12, 2022, applicable to taxable years beginning after December 31, 2022.
https://www.federalregister.gov/documents/2022/10/13/2022-22184/affordability-of-employer-coverage-for-family-members-of-employees

Current regulation text, 26 CFR 1.36B-2(c)(3)(v)(A)(2): "an eligible employer-sponsored plan is affordable for a **related individual** if the employee's required contribution for **family coverage** under the plan does not exceed the required contribution percentage … of the applicable taxpayer's household income." Paired with (c)(3)(v)(A)(1), which still tests the **employee** on **self-only** cost. So yes: a spouse/child can be PTC-eligible while the employee is not. The rule also adds a separate minimum-value test for family members. No P.L. 119-21 amendment touches it.

---

#### A4 — APTC mechanics / the double-count point — **CONFIRMED**

- IRS PTC Q&A (updated **22-Jul-2026**), Q3: advance payments are paid "**directly to your insurance company to lower your monthly premiums**"; at filing "you will reconcile the amount of advance credit payments with the Premium Tax Credit you may claim" on **Form 8962**. https://www.irs.gov/affordable-care-act/individuals-and-families/questions-and-answers-on-the-premium-tax-credit
- CMS, *APTC and CSR Basics* (October 2025), p.20: APTC "was **paid directly to their health plan issuer to lower the consumer's monthly** payment"; the consumer then reconciles that amount against the PTC on Form 8962. https://www.cms.gov/marketplace/technical-assistance-resources/aptc-csr-basics.pdf

The methodological point follows directly: the enrollee's out-of-pocket premium is *already* the gross benchmark/plan premium minus APTC. Subtracting the PTC again from income deducts the same subsidy twice. Confirmed.

**Additional 2026 change the review should carry:** P.L. 119-21 §71305 struck §36B(f)(2)(B), so **there is no cap on repayment of excess APTC for taxable years beginning after Dec 31, 2025**. IRS Q&A Q31: "There is no repayment cap for tax years after 2025. For tax years after 2025, you must repay the full amount by which your advance credit payments exceed your Premium Tax Credit." This makes the income→APTC clawback a full, uncapped marginal hit in 2026 — materially sharper than pre-2026 and directly relevant to cliff modeling.
- Statute: https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm (§71305, eff. TY after 12/31/2025)
- Also recorded in Rev. Proc. 2025-32 §3.04.

---

#### A5 — Poverty guidelines — **CONFIRMED (exact)**

**2025 guidelines** (48 contiguous states + DC), *Annual Update of the HHS Poverty Guidelines*, **90 FR 5108, published January 17, 2025**, FR Doc. 2025-01377; reflects the 2.9% CY2023→CY2024 price increase.
ASPE table: https://aspe.hhs.gov/sites/default/files/documents/dd73d4f00d8a819d10b2fdb70d254f7b/detailed-guidelines-2025.pdf
FR notice: https://www.federalregister.gov/documents/2025/01/17/2025-01377/annual-update-of-the-hhs-poverty-guidelines

| Size | 100% | 400% |
|---|---|---|
| 1 | $15,650 | **$62,600** |
| 2 | $21,150 | $84,600 |
| 3 | $26,650 | **$106,600** |
| 4 | $32,150 | $128,600 |
| 5 | $37,650 | $150,600 |

Review's "≈$106,600 family of 3" and "≈$62,600 single" are **exact**, not approximate.

**2026 guidelines** (published), *Annual Update of the HHS Poverty Guidelines*, **91 FR ___, published January 15, 2026**, FR Doc. 2026-00755; **effective January 13, 2026**; reflects the 2.63% CY2024→CY2025 price increase. (The notice records that because of the October 2025 federal shutdown the CPI-U average uses 11 available months of 2025.)
https://www.federalregister.gov/documents/2026/01/15/2026-00755/annual-update-of-the-hhs-poverty-guidelines · https://aspe.hhs.gov/sites/default/files/documents/b1bfa16b20ae9b89d525bc35de7c1643/detailed-guidelines-2026.pdf

| Size | 100% | 400% |
|---|---|---|
| 1 | $15,960 | $63,840 |
| 2 | $21,640 | $86,560 |
| 3 | $27,320 | $109,280 |
| 4 | $33,000 | $132,000 |
| 5 | $38,680 | $154,720 |

**Which vintage applies in 2026 — this is the part that trips calculators:**

- **Marketplace / PTC, coverage year 2026 → 2025 guidelines.** 26 CFR 1.36B-1(h): "The Federal poverty line means the most recently published poverty guidelines … **as of the first day of the regular enrollment period** … Thus, the Federal poverty line for computing the premium tax credit for a taxable year is the Federal poverty line in effect on the first day of the initial or annual open enrollment period **preceding** that taxable year." Statutory twin: §36B(d)(3)(B). OE for 2026 began Nov 1, 2025 → 2025 guidelines. **The review's premise is correct.**
- **Medicaid / CHIP → 2026 guidelines**, from the notice's effective date (Jan 13, 2026) forward. The FR notice itself names Medicaid as a user and sets "Effective Date: January 13, 2026 unless an office administering a program using the guidelines specifies a different effective date for that particular program."
- **SNAP → fiscal-year lag.** SNAP income standards run Oct 1–Sep 30, so FY2026 (Oct 1 2025 – Sep 30 2026) uses the **2025** guidelines and FY2027 (from Oct 1 2026) picks up the **2026** guidelines. For most of calendar 2026, SNAP and the Marketplace share the 2025 vintage while Medicaid uses 2026 — a real source of cross-program inconsistency in a single-year model.

---

#### A6 — EITC 2026 — **CONFIRMED**

**Phase-out percentages (statutory, not indexed)** — 26 U.S.C. §32(b)(1), text in effect **September 13, 2026**: 1 child credit 34% / **phaseout 15.98%**; 2 children 40% / **21.06%**; 3+ children 45% / **21.06%**; no children 7.65% / 7.65%.
https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section32&num=0&edition=prelim

**2026 dollar amounts** — **Rev. Proc. 2025-32** §3.06, I.R.B. 2025-45; announced in **IR-2025-103, October 9, 2025**.
https://www.irs.gov/pub/irs-drop/rp-25-32.pdf · https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill

| Item (TY2026) | One child | Two | Three or more | None |
|---|---|---|---|---|
| Earned income amount | $13,020 | $18,290 | $18,290 | $8,680 |
| **Maximum credit** | **$4,427** | **$7,316** | **$8,231** | **$664** |
| Phase-out start — single/HoH | $23,890 | $23,890 | $23,890 | $10,860 |
| Phase-out end — single/HoH | $51,593 | $58,629 | $62,974 | $19,540 |
| Phase-out start — MFJ | $31,160 | $31,160 | $31,160 | $18,140 |
| Phase-out end — MFJ | $58,863 | $65,899 | $70,244 | $26,820 |

Disqualifying investment income for 2026: $12,200.

**Independent re-derivation** (constraint relaxed — rates derived *from* the published dollar table rather than assumed): max ÷ (end − start) for single filers gives 15.9802%, 21.0599%, 21.0598%, 7.6498% — matching the statutory 15.98 / 21.06 / 21.06 / 7.65 to four decimals. The two source families agree.

Review's "about $160–$210 per $1,000" → 15.98% = $159.80 and 21.06% = $210.60 per $1,000. Correct; the upper bound rounds to $211, not $210.

---

#### A7 — Child tax credit 2026 — **PARTLY** (figures right; the "no cash change" mechanic is right only in the upper range)

**Figures CONFIRMED.** Rev. Proc. 2025-32 §3.05: for taxable years beginning in **2026**, maximum §24(a) credit = **$2,200**; §24(d)(1)(A) refundable amount = **$1,700** per qualifying child. https://www.irs.gov/pub/irs-drop/rp-25-32.pdf

P.L. 119-21 §70104 made the expanded §24(h) credit permanent (struck "and before January 1, 2026") and set the maximum at $2,200, indexed for taxable years beginning after 2025. https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm

**Formula CONFIRMED.** Instructions for Schedule 8812 (Form 1040), TY2025, rev. **30-Apr-2026**: the CTC is first limited by tax liability; the unused portion flows to the ACTC, computed as **15% of earned income over $2,500**, capped at **$1,700 per qualifying child**. https://www.irs.gov/instructions/i1040s8

**Where the review overstates.** "The refundable CTC shrinks as the nonrefundable part takes over, with no cash change" is true only once tax liability exceeds roughly $500 per child (i.e. once the family is already receiving the full $2,200/child and the binding constraint is the *remaining* credit, not the $1,700 cap). Below that, total CTC value genuinely **rises** with earnings, in two distinct segments:
1. **Phase-in:** earnings from $2,500 up to where 15%×(earnings − $2,500) reaches $1,700n — ACTC rises 15¢ per dollar earned. This is a real 15% negative marginal rate and must be modeled.
2. **Cap-bound with rising liability:** while ACTC sits at the $1,700n cap and tax liability is below $500n, each dollar of liability adds nonrefundable credit without displacing ACTC, so total benefit still rises.

Only in segment 3 (liability ≥ $500n) does the dollar-for-dollar substitution with no net change occur. A calculator that applies the review's description across the whole earnings range will understate the CTC's contribution to the phase-in slope.

---

#### A8 — Coverage gap — **CONFIRMED** (language); estimate is **stale**

**Mechanics CONFIRMED.** HealthCare.gov, *Medicaid expansion & what it means for you*: "Adults in those states with incomes **below 100% of the federal poverty level**, and who don't qualify for Medicaid based on disability, age, or other factors, **fall into a gap**." Reasons given: "Their incomes are too high to qualify for Medicaid in their states" and "Their incomes are **below the range the law set for savings** on a Marketplace insurance plan." Options listed: community health centers, catastrophic plans, and a 60-day window to contact the Marketplace Call Center if income rises into 100–400% FPL.
https://www.healthcare.gov/medicaid-chip/medicaid-expansion-and-you/

Also: "If your state hasn't expanded Medicaid and you're not eligible, you may have fewer options for coverage. Depending on your income you might not qualify for savings on a private insurance plan." — https://www.healthcare.gov/medicaid-chip/getting-medicaid-chip/

**ASPE estimate — cite with a date caveat.** ASPE Data Point **HP-2022-06, February 15, 2022**: "approximately **2.2 million** uninsured non-elderly adults with incomes below 100% FPL — who are in what is sometimes called the 'coverage gap' — would become newly eligible for Medicaid if their states were to expand"; 3.8 million would be newly eligible overall up to 138% FPL.
https://aspe.hhs.gov/sites/default/files/documents/43fe9943cbff7f5698bbd72b901948fb/medicaid-12-state-expansion-uninsured.pdf

Caveats the review must carry if it uses this number: the estimate is **pre-pandemic data**, published Feb 2022, and is scoped to the **12** non-expansion states as of that date. North Carolina has since expanded (Dec 2023), so the state count and the population are both smaller today. I found no newer ASPE coverage-gap headline estimate on aspe.hhs.gov. Treat 2.2M as a dated upper-bound anchor, not a current figure.

---

#### A9 — Child and Dependent Care Credit — **CONFIRMED nonrefundable**, but there **is** a 2026 change the review must absorb

**Nonrefundable: CONFIRMED.** IRS Publication 503, *Child and Dependent Care Expenses* (for use in preparing 2025 returns): "Enter the credit on your **Schedule 3 (Form 1040), line 2**. The amount of credit you can claim is **limited to your tax**. You **can't get a refund** for any part of the credit that is more than this limit." §21 sits in subpart A of part IV of subchapter A (nonrefundable personal credits) and P.L. 119-21 did not move it. Worth ~$0 to a household with no income tax liability — correct.
https://www.irs.gov/pub/irs-pdf/p503.pdf

The refundable treatment the IRS FAQ describes is **2021 only** (ARPA) and did not recur. IRS *Child and Dependent Care Credit FAQs*, last updated 29-Jul-2026: "For 2021, the credit is refundable for eligible taxpayers." — https://www.irs.gov/newsroom/child-and-dependent-care-credit-faqs

**2026 change — P.L. 119-21 §70405, effective taxable years beginning after December 31, 2025.** §21(a)(2) is rewritten: the applicable percentage is now **50 percent**, reduced (but not below **35%**) by 1 point per $2,000 of AGI over **$15,000**, and further reduced (but not below **20%**) by 1 point per $2,000 ($4,000 MFJ) of AGI over **$75,000** ($150,000 MFJ). Verbatim from the enacted statute.
https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm
Confirmed in IRS Pub. 6079 §1.5: "Child and Dependent Care Credit – Increase in credit amount from 35% to 50% of qualifying expenses and changes to credit phaseout amounts (OBBBA §70405)". https://www.irs.gov/pub/irs-access/p6079_accessible.pdf

So in 2026 the CDCC is **larger** for low-AGI households — but still nonrefundable, so for the zero-liability households HotGap models, the larger rate changes nothing. The claim stands; the parameter change does not rescue it. Note the §21 expense limits ($3,000 / $6,000) are not inflation-indexed and do not appear in Rev. Proc. 2025-32.

---

#### What the review got wrong or overstated

1. **A1, the immigrant exception is dead in 2026.** The below-100%-FPL carve-out for lawfully present immigrants ineligible for Medicaid (§36B(c)(1)(B)) was **repealed** by P.L. 119-21 §71302, effective TY2026. The review states it as live law. This is the one outright refutation. Any HotGap code path implementing it must be gated off for policy year 2026.
2. **A1, eCFR is a trap here.** 26 CFR 1.36B-2(b)(5) still recites the repealed rule. A check run against the regulation alone returns a confident, self-consistent confirmation of a rule that no longer exists. The statute and the OLRC codification note are the authority.
3. **A7, the "no cash change" mechanic is over-generalized.** It holds only once tax liability exceeds ~$500/child. Below that the CTC has a genuine 15% phase-in slope plus a second rising segment. Applying the review's description across all earnings understates the phase-in.
4. **A8, the 2.2M coverage-gap figure is four years stale** (ASPE Feb 2022, pre-pandemic data, 12 non-expansion states — NC has since expanded). Usable only with an explicit date and scope caveat.
5. **A6, minor.** The phase-down upper bound is $210.60 per $1,000, which rounds to $211, not $210. Immaterial but the review's range should be stated as 15.98%/21.06% rather than as dollars.
6. **A2, minor.** The 2026 table's lowest tier is labeled "Less than 133%" and is flat (initial = final = 2.10%); the review's "100–133%" framing is right in effect but not the table's own wording.
7. **Omission the review should add (A4):** P.L. 119-21 §71305 **eliminated the APTC repayment cap** for TY2026+. Excess advance payments are now repaid in full with no income-based ceiling. For a benefits-cliff tool this is a first-order change to the marginal-rate profile around income mis-estimation, and it is not mentioned.
8. **Omission (A1, forward-looking):** P.L. 119-21 §71301 restricts PTC to "eligible aliens" (LPR / Cuban-Haitian entrant / COFA) but only for **TY2027+**. Don't apply it to 2026; do plan for it.

#### Sources I could not reach

- **congress.gov** — HTTP 403 to both WebFetch and curl for `/bill/...` and `/crs-product/...` HTML pages. Bill-status confirmation for H.R.5145 / H.R.6010 / H.R.6074 / S.3102 could not be read directly. Worked around it: the enacted-law position is established from 26 U.S.C. §36B as published by the Office of the Law Revision Counsel with an explicit currency date of **2026-09-13**, plus the IRS PTC Q&A refreshed **2026-07-22**. Both would necessarily reflect an enacted extension; neither does.
- **crsreports.congress.gov/product/pdf/R/R48290** — returns an HTML shell, not the PDF. Retrieved version **R48290.7 via congress.gov's crs_external_products path instead; it is dated **December 10, 2025** and still describes the expiration as "impending," so it predates the coverage year and was **not** relied on for the A1 status determination.
- **federalregister.gov HTML** — 302-redirects to an anti-bot interstitial for WebFetch. Worked around via the Federal Register full-text **XML** endpoint (2026 notice) and the ASPE-hosted tables (2025 and 2026), which are the publisher's own copies.
- No newer ASPE coverage-gap estimate than HP-2022-06 was locatable on aspe.hhs.gov.


---

## Appendix B. Medicaid, CHIP, and state coverage claims (medicaid.gov, CMS, eCFR, ten state agencies)

### Validation: Medicaid / CHIP / state coverage claims (HotGap methodology review)

Validated 2026-09-14 against primary government sources only. Policy year 2026.

#### Reference figures used throughout

**2026 HHS poverty guidelines, 48 contiguous states + DC** — effective 2026-01-13, published
Federal Register 2026-01-15 (2026-00755). ASPE, "2026 Poverty Guidelines: 48 Contiguous States,"
https://aspe.hhs.gov/sites/default/files/documents/b1bfa16b20ae9b89d525bc35de7c1643/detailed-guidelines-2026.pdf

| Size | 100% | 138% | 200% | 250% | 266% |
|---|---|---|---|---|---|
| 1 | $15,960 | $22,024.80 | $31,920 | $39,900 | $42,453.60 |
| 3 | $27,320 | $37,701.60 | $54,640 | $68,300 | $72,671.20 |
| 5 | $38,680 | $53,378.40 | $77,360 | $96,700 | — |

The brief's premise is **confirmed by primary source**: Medicaid uses the current-year (2026)
guidelines, marketplace coverage year 2026 uses the 2025 guidelines. DHCS ACWDL 26-01 (2026-01-21)
states MAGI Medi-Cal uses the 2026 FPL "effective January 1, 2026"; the Covered California
chart "Program Eligibility by Federal Poverty Level for 2026" (3/2026) puts **2025** dollars in its
marketplace columns (100% = $15,650/1, $26,650/3) and **2026** dollars in its Medi-Cal columns
(138% = $22,025/1, $37,702/3). Same chart, two FPL years, by design.

---

#### B1 — Non-expansion states — **PARTLY** (the set is right, the count of nine is wrong: it is TEN)

**Wyoming is a non-expansion state.** The correct list is ten: Alabama, Florida, Georgia, Kansas,
Mississippi, South Carolina, Tennessee, Texas, Wisconsin, **Wyoming**.

- **41 expansion / 10 non-expansion**, May 2026 reporting month — CMS, "May 2026 Medicaid & CHIP
  Enrollment Data Highlights," https://www.medicaid.gov/medicaid/program-information/medicaid-and-chip-enrollment-data/report-highlights
- **Independent cross-check, different source family:** I downloaded the CMS-64 VIII-Group
  (new adult group) enrollment file — the administrative record of expansion enrollment rather
  than a narrative page — and took the latest period (June 2025). Exactly twelve jurisdictions
  report zero VIII-Group enrollees; removing the two territories (American Samoa, N. Mariana
  Islands) leaves exactly the ten states above.
  "Medicaid Enrollment – New Adult Group," dataset modified 2026-02-05,
  https://download.medicaid.gov/data/medicaid-enrollment-new-adult-group-02052026.csv
  (dataset page: https://data.medicaid.gov/dataset/6c114b2c-cb83-559b-832f-4d8b06d6c1b9)

Discrepancy with the review: it listed nine and then treated Wyoming as an eleventh-hour tenth.
Resolve as ten. Wyoming has never adopted expansion; Wyoming DOH's own 2023 estimate paper is
framed entirely as a projection of what expansion *would* do
(https://health.wyo.gov/wp-content/uploads/2023/01/J-2023-118-WDH-Medicaid-Expansion-Estimates-2023.pdf).

**Caveat on medicaid.gov's own map:** the linked "Adult Coverage Expansion" PDF at
https://www.medicaid.gov/medicaid/program-information/downloads/medicaid-expansion-state-map.pdf
is stamped **"as of December 2023"** and says "40 states plus DC." It happens to still yield the
correct ten (no state has changed status since), but it is 2.75 years stale — do not cite it as
current, and note that its "40 plus DC" wording is easy to misread as a count of 41 non-DC states.

---

#### B2 — Parent/caretaker Medicaid limits in non-expansion states — **REFUTED for Mississippi** (the real figure is *lower*), confirmed as a category

**The headline correction: Mississippi parents lose Medicaid at ~22% FPL = $5,976/yr for a family
of three, not ~27% FPL / $7–8k.** The review understated the severity.

Mississippi Division of Medicaid, "Income Limits for Medicaid and CHIP Programs," **limits
effective 2026-03-01**,
https://medicaid.ms.gov/medicaid-coverage/who-qualifies-for-coverage/income-limits-for-medicaid-and-chip-programs/

The "Parents and Caretaker Relatives with Dependent Children Under Age 18" row carries **no % FPL
label** — unlike every other row on the page — because it is a **dollar-denominated standard**
inherited from the state's 1996 AFDC payment standard, not an FPL-indexed one:

| Family size | 1 | 2 | **3** | 4 | 5 |
|---|---|---|---|---|---|
| Monthly income limit | $294 | $396 | **$498** | $600 | $702 |
| Annual | $3,528 | $4,752 | **$5,976** | $7,200 | $8,424 |
| % of 2026 FPL | 22.1% | 22.0% | **21.9%** | 21.8% | 21.8% |

The page states the 5% disregard "is applied, if needed, and is reflected in the amounts shown
below," so $498 is the **effective** (disregard-inclusive) figure; the base standard is ~16.9% FPL.

**The "27%" is a real number that expired.** Mississippi's standard is a flat dollar amount frozen
at **$384/mo base for a household of 3** (= $4,608/yr, 16.9% FPL), unchanged in every annual table
from 2014 through 2024 — MS Appendix A-3, "MAGI Income Limits 2014 to present,"
https://medicaid.ms.gov/wp-content/uploads/2024/03/Appendix-A-3-MAGI-Income-Limits.-2014-to-present.pdf
Because the dollar figure is frozen while the FPL rises each January, the percentage **falls every
year**: $384 + disregard was ≈27% of FPL around 2019–2020, ≈24% in 2023, and **≈22% now**. The
review did not invent 27%; it inherited a figure that has since decayed. (Coincidentally $7,200/yr
is also the current family-of-**four** limit, so a row-misread is a second possible path to the
same wrong number.)

**Texas is lower still.** HHSC Texas Works Handbook **C-131.2**, "Medically Needy and Parents and
Caretaker Relatives Medicaid" — note the revision stamp: **Revision 15-4, Effective October 1,
2015.** This standard has not been updated in eleven years and is not FPL-indexed, which is why it
has decayed so far in real terms.
https://fhb.hhs.texas.gov/handbooks/texas-works-handbook/c-130-medical-programs

| Family size | TP 08 one parent | Two parents |
|---|---|---|
| 1 | $103/mo | N/A |
| 2 | $196/mo | $161/mo |
| **3** | **$230/mo = $2,760/yr** | $251/mo = $3,012/yr |

At 2026 FPL that is **10.1% FPL** for a family of three (base). Texas keeps its disregard in a
separate chart — C-131.4, "Standard MAGI Income Disregard," Revision 26-2 effective 2026-04-01,
$113.85/mo for a household of 3 — so the effective ceiling is ≈$343.85/mo = **$4,126/yr ≈ 15.1% FPL**.

**Wisconsin is the exception that breaks the category — and the review's framing.** Despite not
adopting expansion, BadgerCare Plus covers **parents/caretakers AND childless adults to 100% FPL**
($27,320/yr for a family of 3 in 2026), with the disregard already built into the limit.
Wisconsin DHS, "BadgerCare Plus: Income Guidelines,"
https://www.dhs.wisconsin.gov/badgercareplus/fpl.htm; BadgerCare Plus Eligibility Handbook §16.1
Income, https://www.emhandbooks.wisconsin.gov/bcplus/policyfiles/3/16/16.1.htm ("Parents,
caretakers, and childless adults already have the income disregard included in the income limit of
100 percent FPL"). **Wisconsin therefore has no coverage gap** — see B6.

**Wyoming — "Family Care" is the parent/caretaker program. Two Wyoming publications disagree; use
the operative table.** The operative figure is **$873/mo = $10,476/yr for a family of 3 = 38.3% FPL**
(base, disregard excluded; $986.83/mo ≈ 43.3% with it), from the "Family MAGI" column of
Wyoming DOH, "Medicaid Income Requirements,"
https://health.wyo.gov/healthcarefin/medicaid/programs-and-eligibility/medicaid-income-requirements/
Confirmed current against the 2026 FPL: the same table's 133% children-6-18 row for size 3 reads
$3,028, which is exactly 133% of $2,276.67.

But WDH's own 2026 one-pager headlines parents/caretakers at **0–46% FPL** —
https://health.wyo.gov/wp-content/uploads/2026/03/Healthcare-Coverage-Options-in-Wyoming-2026.pdf

| Group (WDH one-pager) | Medicaid | Gap | Marketplace |
|---|---|---|---|
| Parents / Caretakers | 0–46% FPL ($644 PMPM) | **47–99% FPL: "No Coverage"** | 100–400% FPL |
| Non-disabled adults | — | **0–99% FPL: "No Coverage"** | 100–400% FPL |

**These do not reconcile cleanly and I am not going to pretend they do.** The one-pager's footnote 3
says the 46% "is estimated based on a family of 4. Wyoming's Family Care population is based on the
1996 AFDC standard and FPL estimates are illustrative only." A frozen AFDC standard normally yields
a *falling* % FPL as family size rises, so a family-of-4 figure above the family-of-3 figure is the
opposite of the expected direction. Treat 46% as the state's own rough illustration and the $873
dollar standard as the number to model. Flagging rather than resolving.

Independently of the arithmetic, that one-pager is the cleanest primary confirmation of both B1 and
B6 I found: it frames expansion entirely conditionally ("**If** Medicaid Expansion occurs, the
Parents/Caretakers and Non-Disabled Adults groups **would** change to the following"), and it labels
the sub-100% FPL band "**No Coverage**" in the state's own words.

##### All ten non-expansion states, parent/caretaker limits, family of 3, 2026

2026 FPL family of 3 = $27,320/yr = $2,276.67/mo. **The "incl. 5pp?" column is load-bearing — the
states are not consistent, and mixing the conventions is exactly the error in B5.**

| State | $/mo | $/yr | % of 2026 FPL | Incl. 5pp disregard? | Basis |
|---|---|---|---|---|---|
| **Texas** | $230 | **$2,760** | 10.1% | No (+$113.85 separately) | 1996 AFDC, frozen since 2015 |
| **Alabama** | $410 | **$4,920** | 18.0% | **Yes** (base 13%) | % FPL |
| **Mississippi** | $498 | **$5,976** | 21.9% | **Yes** (base ~16.9%) | 1996 AFDC dollar standard |
| **Georgia** | $551 | **$6,612** | 24.2% | No ($662 / 29.1% with) | Frozen dollar standard |
| **Florida** | $600 | **$7,200** | 26.4% | **Yes** (both disregards) | 1992 AFDC-era |
| **Wyoming** | $873 | **$10,476** | 38.3% | No (43.3% with) | 1996 AFDC |
| **Kansas** | ~$865 | ~$10,382 | 38% | Treat as yes (base 33%) | % FPL |
| **South Carolina** | $1,525 | **$18,304** | 67% | **Yes** (base 62%) | % FPL |
| **Tennessee** | $2,277 | **$27,320** | 100% | No (~105% with) | % FPL |
| **Wisconsin** | $2,277 | **$27,320** | 100% | **Yes** | % FPL — *no coverage gap* |

Sources, in table order:
- **Alabama** — "Medicaid Income Limits for 2026," Agency Form 207, handout dated 01/26:
  "Income after deductions cannot exceed $410 per month for a family of 3… The amount is based on
  the 18% Federal Poverty Level (The amount includes the 5% FPL disregard)."
  https://medicaid.alabama.gov/documents/3.0_Apply/3.2_Qualifying_Medicaid/3.2_Medicaid_Income_Limits_2026_3-11-26.pdf
- **Georgia** — DFCS PAMMS "Appendix A2 Family Medicaid Financial Limits 2026," MT 80, column
  "Parent/Caretaker with Children," https://pamms.dhs.ga.gov/dfcs/medicaid/appendix-a2/2026-family-limits/
  Corroborated by DCH "2026 Financial Limits – All Programs," effective 2026-03-01, revised
  2026-03-05, https://medicaid.georgia.gov/document/document/2026-financial-limits-revised-3526/download
  *Frozen:* the 2023 chart shows the identical $551.
- **Florida** — DCF ESS Appendix A-7, updated 2026-02-02, effective April 2026, builds the limit as
  $303 (standard printed "April 1992") + $183 standard disregard + $114 MAGI 5% = **$600**.
  https://ffic.myflfamilies.com/manual/essfiles/30446.pdf · consumer chart "Medicaid Income Limits
  (Effective April 2026 – March 2027)," Parents and Caregivers, size 3 = $600,
  https://www.myflfamilies.com/documents/Medicaid%20Income%20Limits%20April%202026.pdf
- **Kansas** — KFMAM 2211.01 (page header "Eligibility Policy – 9/14/2026"): "Persons meeting
  Caretaker Medical criteria whose countable income does not exceed **38%** of the federal poverty
  level." https://khap.kdhe.ks.gov/kfmam/main.asp?tier1=02000&tier2=02210
  **Caveat: the Kansas dollar figure is computed (38% × 2026 FPL), not quoted — and no current
  dollar chart appears to exist.** On a second pass I reached kancare.ks.gov successfully (the
  earlier block was circumvented) and established that the problem is not access but publication:
  KFMAM 2211.01 says "The current threshold amounts/limits can be located in the **F-8 Kansas
  Medical Assistance Standards chart in the appendix of the KanCare Policy website**," but the
  KFMAM's own link to that appendix
  (`kancare.ks.gov/policies-and-reports/kdhe-eligibility-policy/policy-log`) returns **404**, as do
  the current-structure equivalents under `/data-policy/`. The newest retrievable F-8 is
  **Rev. 04-17 (2017)**, https://khap.kdhe.ks.gov/kfmam/policydocs/F-8_ma_program_standards%2004-2017.pdf,
  whose Caretaker Medical column is exactly 38% of that year's FPL — which validates the method but
  is not a 2026 figure. **Kansas is the one state in this table whose dollar limit rests on my
  arithmetic rather than a state publication.** The 38% rule itself is solidly sourced.
- **South Carolina** — SCDHHS "Medicaid Eligibility Programs," effective 2026-03-01:
  "Parent/Caretaker Relative… family income cannot exceed 67% of FPL: $1,842.50 for a family of
  four" (= 67% of the 2026 family-of-4 monthly FPL, confirming 2026 guidelines).
  https://www.scdhhs.gov/sites/dhhs/files/pdf/links/Medicaid%20Eligibility%20Groups%20Effective%201.1.pdf
  **Flag:** MACPAC's Feb 2026 Exhibit 36 lists SC parents at 95%. That anticipates the "Palmetto
  Pathways to Independence" §1115, which medicaid.gov still lists as **pending** (submitted
  2025-06-23, deemed complete 2025-07-08). Use 67%; SC parents still face a gap.
- **Tennessee** — TennCare Eligibility Reference Guide: "Caretaker Relative… Income Limit: 100% of
  the poverty level." https://www.tn.gov/content/dam/tn/tenncare/documents/eligibilityrefguide.pdf ·
  Families and Children Manual, "Caretaker Relative (MAGI)," rev. 2024-06-11, whose worked example
  applies the 5% deduction on top,
  https://www.tn.gov/content/dam/tn/tenncare/documents/CaretakerRelativeMAGI.pdf
  **Flag:** medicaid.gov's table says 84% — stale (Dec 2023).

**Two systematic traps in this table.** First, **TX, MS, GA, FL and WY use frozen dollar standards,
so their % FPL falls every January as the FPL rises.** Any percentage quoted from a pre-2026 source
is too high for 2026 — which is the most likely origin of the review's "27%" for Mississippi.
Second, note the enormous spread: from **10.1% FPL in Texas to 100% in Tennessee and Wisconsin**.
"Non-expansion state" is not a single parameter, and a model that applies one representative
parent threshold across the ten will be wrong by up to $24,000 of annual income.

**Methodological warning on the obvious cross-source.**
medicaid.gov's eligibility-levels table
(https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-childrens-health-insurance-program-basic-health-program-eligibility-levels),
is stamped **"as of December 1, 2023"** — 2.75 years stale — and never states its disregard
convention. Worse, for the dollar-standard states it reports a *CMS-converted* percentage ("Some
states use dollar amounts… CMS converted the amount to percentages of the FPL and uses the
**highest** percentage to show the eligibility level"), i.e. the percentage is taken from whichever
household size yields the largest number and then converted against a *2023* FPL. That conversion
is almost certainly where a "27% FPL" for Mississippi comes from. **For dollar-standard states,
percentages of FPL are derived quantities that drift every January; use the state's published
dollar table and divide by the current FPL yourself.**

---

#### B3 — California Medi-Cal 138% / 266% — **CONFIRMED**

| Group | % FPL | Family of 3, 2026 |
|---|---|---|
| Medi-Cal for Adults | 138% | **$37,702** |
| Medi-Cal for Kids (0–18) | 266% | **$72,672** |
| Medi-Cal for Pregnant Individuals | 213% | $58,192 |
| CCHIP (SF / San Mateo / Santa Clara only) | 322% | $87,971 |

Source: Covered California, "Program Eligibility by Federal Poverty Level for 2026," dated 3/2026,
https://www.coveredca.com/pdfs/FPL-chart.pdf — which cites **DHCS ACWDL 26-01** (2026-01-21,
"2026 Federal Poverty Levels," https://www.dhcs.ca.gov/wp-content/uploads/2026/04/26-01.pdf) as
the source of its Medi-Cal values.

Both of the review's dollar figures are right (≈$37k, ≈$72k). Two qualifications:

1. **266% already includes the 5-point disregard.** California's children's standard is 261% base
   + the mandatory 5 pp MAGI disregard (42 CFR 435.603(d)). Do not add 5 points again.
2. **The 266% children's cliff is not statewide.** In San Francisco, San Mateo and Santa Clara
   counties, CCHIP continues children's coverage from 266% to 322% FPL ($72,672 → $87,971 for a
   family of 3). A model that shows a hard coverage loss at 266% is wrong for those three counties.

---

#### B4 — New York Essential Plan at 250% FPL — **REFUTED as of today** (was correct through 2026-06-30)

**The Essential Plan 200–250% FPL tier was eliminated effective July 1, 2026.** The EP upper limit
is now **200% FPL = $31,920** for a single adult, not 250% / $39,900.

- NY State of Health, "Issuer Q&A: Essential Plan (EP) 200–250 Transition," effective date
  July 1, 2026: "NYSOH is ending the Essential Plan (EP) 200%–250% FPL variant effective July 1
  (6/30/2026 coverage end date) due to federal changes (H.R.1) and waiver termination."
  https://info.nystateofhealth.ny.gov/sites/default/files/NY%20State%20of%20Health%20Issuer%20Q&A%20Essential%20Plan%20200%E2%80%93250%20Transition.pdf
- NY State of Health, "NY State of Health Changes for 2026," webinar dated June 17, 2026 — confirms
  the contingency resolved: "**CMS approved this request on March 20, 2026.**" New York terminated
  its §1332 State Innovation Waiver and reactivated the §1331 Basic Health Program, which caps
  eligibility at 200% FPL. Enrollees 200–250% moved to QHP with APTC/CSR.
  https://info.nystateofhealth.ny.gov/sites/default/files/June%20Webinar%20-%20NY%20State%20of%20Health%20Changes%20for%202026.pdf
- The 250%/$39,900 figure itself is arithmetically correct for a single adult on the 2026 FPL —
  NY's own chart lists it — but it is no longer an EP boundary.
  "2026 Income Levels for Medicaid, Child Health Plus and Essential Plan,"
  https://info.nystateofhealth.ny.gov/sites/default/files/2026%20Income%20Levels_for%20Medicaid,%20CHPlus%20&%20EP.pdf
  Note this chart still prints the "EP 200-250" tier and so is itself now partly stale.

**The step the review describes still exists — it just moved down**, to 200% FPL / $31,920 for a
single adult, and it got steeper: the enrollee now lands on a subsidized QHP in a year when the
enhanced premium tax credits have expired (see B6).

New York's remaining 2026 tiers, single adult: Medicaid adults ≤138% ($22,025); EP 3 >100–138%;
EP 2 >138–150%; EP 1 >150–200% ($31,920 ceiling).

---

#### B5 — CHIP upper limits, Mississippi and Texas — **PARTLY** (dollar right, percentage mislabeled)

The review paired a disregard-**inclusive** dollar figure with a disregard-**exclusive** percentage.
Both numbers appear in Mississippi's table; they are not the same quantity.

**Mississippi** — Division of Medicaid, "Income Limits for Medicaid and CHIP Programs,"
effective **2026-03-01**,
https://medicaid.ms.gov/medicaid-coverage/who-qualifies-for-coverage/income-limits-for-medicaid-and-chip-programs/
The page states: "A 5% disregard based on the federal poverty level (FPL) is applied, if needed,
and is reflected in the amounts shown below." So its **%** column is the base standard and its
**$** column already includes the disregard.

| Group | % FPL (base) | $/yr fam-3 @ base | % incl. 5pp | State's published $/yr fam-3 |
|---|---|---|---|---|
| Infants <1 | 194% | $53,001 | 199% | $54,372 |
| Children 1–6 | 143% | $39,068 | 148% | $40,440 |
| Children 6–19 | 133% | $36,336 | 138% | $37,704 |
| **CHIP** | **209%** | **$57,099** | **214%** | **$58,476** |

So the review's "$58k–59k" matches what Mississippi prints ($58,476), but that is **214%** FPL, not
209%. The 209% figure corresponds to $57,099. The discrepancy is exactly 5 pp of FPL ≈ $1,366/yr.

**Texas** — HHSC, Texas Works Handbook C-131.1, Revision **26-2, effective 2026-04-01**,
https://fhb.hhs.texas.gov/handbooks/texas-works-handbook/c-130-medical-programs
Texas keeps the disregard in a *separate* chart (C-131.4, "Five Percentage Points of FPL" =
$113.85/mo for a household of 3), so both its % and $ columns are base figures.

| Group | % FPL (base) | $/yr fam-3 @ base | % incl. 5pp | $/yr incl. |
|---|---|---|---|---|
| Children <1 (TP 43) | 198% | $54,096 | 203% | $55,460 |
| Children 1–5 (TP 48) | 144% | $39,348 | 149% | $40,707 |
| Children 6–18 (TP 44) | 133% | $36,336 | 138% | $37,702 |
| **CHIP (TA 84)** | **201%** | **$54,924** | **206%** | **$56,279** |

**Texas CHIP tops out below Mississippi's** on a like-for-like base comparison (201% vs 209%).

Convention cross-check that validates the above: MS 6–19 ($3,142/mo) − TX 6–18 ($3,028/mo) = $114,
which is Texas's own published 5 pp disregard ($113.85). Both states sit at the same 133% statutory
floor; the whole difference is that Mississippi pre-adds the disregard and Texas does not.

**Do not cite chipmedicaid.org.** Every request to it (root, www, and the income-guidelines path)
now 302-redirects to `survey-smiles.com`, a survey-monetization domain that sets a tracking cookie
on `.chipmedicaid.org`. The domain appears lapsed or hijacked and is no longer an official Texas
HHS property.

Also note **hhs.texas.gov's consumer-facing pages are ~6 months stale** and contradict the
handbook: they show CHIP $4,464/mo and Children's Medicaid $2,954/mo for a family of 3, which are
201% and 133% of the **2025** FPL. Use the April 2026 handbook figures.

---

#### B6 — The coverage gap — **CONFIRMED (mechanism), COULD NOT VERIFY (a current count)**

**Mechanism, confirmed at the regulation:** the premium tax credit has a hard floor at 100% FPL.
26 CFR 1.36B-2(b)(1): "an applicable taxpayer is a taxpayer whose household income is **at least
100 percent** but not more than 400 percent of the Federal poverty line for the taxpayer's family
size for the taxable year." (ecfr.gov, current). So in a non-expansion state an adult whose income
falls below both the state's parent/caretaker standard and 100% FPL qualifies for neither Medicaid
nor a subsidy.

**ASPE's own language:** "This group — not currently eligible for Medicaid in their states, but with
incomes too low to qualify for Marketplace advanced premium tax credits (APTCs) — falls into what
is sometimes called the 'coverage gap.'" ASPE Data Point HP-2022-06, "Estimates of Uninsured Adults
Newly Eligible for Medicaid If Remaining 12 Non-Expansion States Expand Medicaid: 2022 Update,"
**2022-02-15**,
https://aspe.hhs.gov/sites/default/files/documents/43fe9943cbff7f5698bbd72b901948fb/medicaid-12-state-expansion-uninsured.pdf

**A non-expansion state's own words for it.** Wyoming DOH's "2026 Healthcare Coverage Options in
Wyoming" (2026-03) charts parents/caretakers as Medicaid 0–46% FPL, **"No Coverage" 47–99% FPL**,
Marketplace 100–400% FPL; and non-disabled adults as **"No Coverage" 0–99% FPL**, Marketplace
100–400%. https://health.wyo.gov/wp-content/uploads/2026/03/Healthcare-Coverage-Options-in-Wyoming-2026.pdf
This is a better citation than ASPE for the *existence* and *shape* of the gap in 2026, because it
is current, state-published, and drawn on the same income axis HotGap models.

**The count is stale — do not reuse it as current.** ASPE's ~2.2 million figure (56.6% of the
3.8 million newly-eligible) is a February 2022 estimate covering **12** non-expansion states.
North Carolina and South Dakota have since expanded, leaving ten. I found no ASPE, CMS or Census
publication restating the coverage-gap count for the current ten-state set. Cite the definition,
not the number, or label the number as a 2022/12-state figure.

**Two 2026-specific corrections to the review's framing:**

1. **Wisconsin is a non-expansion state with no coverage gap.** BadgerCare Plus covers childless
   adults and parents to 100% FPL, so nobody in Wisconsin falls below the Medicaid floor *and*
   below the subsidy floor — the two thresholds meet exactly at 100%. Treating all ten
   non-expansion states as gap states overstates the affected population; the gap is a **nine**-state
   phenomenon. Wisconsin DHS, "BadgerCare Plus: Income Guidelines" (rate table effective
   2026-02-01 to 2027-01-31), https://www.dhs.wisconsin.gov/badgercareplus/fpl.htm; Eligibility
   Handbook §16.1, https://www.emhandbooks.wisconsin.gov/bcplus/policyfiles/3/16/16.1.htm
   **Wisconsin is the only such state.** Tennessee also covers *parents* to 100% FPL, but has no
   childless-adult coverage at all, so childless adults there still fall in the gap. It is the
   match between the *childless-adult* limit and the 100% subsidy floor that closes the gap, and
   only Wisconsin has it.
2. **The gap got worse in 2026, not better.** The ARPA/IRA enhanced premium tax credits sunset
   2026-01-01. For coverage year 2026 the 400% FPL cap is reinstated and applicable percentages
   revert upward — a household at 200% FPL contributes 6.6% of income toward the benchmark in 2026
   versus 2% in 2025. CRS R48290, "Enhanced Premium Tax Credit and 2026 Exchange Premiums,"
   https://www.congress.gov/crs-product/R48290 (congressional, not executive — the operative rule
   is 26 CFR 1.36B-2(b)(1) above, plus IRS FS-2025-10,
   https://www.irs.gov/pub/taxpros/fs-2025-10.pdf). A model built on 2025 subsidy schedules will
   understate the 100%-FPL step in non-expansion states.

---

#### B7 — Does a raise end Medicaid immediately? — **PARTLY. Adults: no, but not protected either.
Children: genuinely protected for 12 months, so the children's cliff is deferred, not immediate.**

**Renewals — 42 CFR 435.916(a)(1)** (ecfr.gov, current; part 435 nomenclature amended 89 FR 39435,
2024-05-08): MAGI eligibility "must be renewed once every 12 months, and no more frequently than
once every 12 months."

**But a raise does act between renewals for adults — 42 CFR 435.916(d)(1):** "the agency **must
promptly redetermine eligibility between regular renewals** … whenever it receives information
about a change in a beneficiary's circumstances that may affect eligibility." So the 12-month
renewal cycle is *not* a 12-month income shield for adults. Two things soften it:
- **42 CFR 435.916(f)(1):** "Prior to making a determination of ineligibility, the agency must
  consider all bases of eligibility."
- **42 CFR 431.211:** "The State or local agency must send a notice **at least 10 days before the
  date of action**" (exceptions at 431.213/431.214 do not include an income increase).

So for an adult: not immediate, but a lag of roughly the reporting + processing time + 10 days —
not a year.

**Children — the review's "immediate cliff" framing is wrong. 42 CFR 435.926**, implementing
§1902(e)(12) of the Act (CAA 2023 §5112, mandatory from 2024-01-01; section as amended 89 FR 94591,
2024-11-27):
- (c)(1) "The length of the continuous eligibility period is 12 months."
- (d) "A child's eligibility **may not be terminated during a continuous eligibility period,
  regardless of any changes in circumstances**," except: turning 19, voluntary termination, moving
  out of state, agency error/fraud, or death. **An income increase is not on that list.**
- CHIP parallel: **42 CFR 457.342** (90 FR 2636, 2025-01-13), same terms.

Consequence for the model: a raise that crosses the children's limit (California 266%, Mississippi
CHIP 209/214%, Texas 201%) does **not** end the child's coverage that month. It ends it at the next
annual renewal. A cliff chart that drops children's coverage at the income threshold overstates the
immediacy and mis-times the loss by up to 12 months.

**P.L. 119-21 status as of today — nothing in force for 2026 on this axis:**
- **§71107** (6-month redeterminations for the expansion adult group) applies "beginning with
  renewals scheduled **on or after January 1, 2027**." CMS SMD #26-001, **2026-03-06**,
  https://www.medicaid.gov/federal-policy-guidance/downloads/smd26001.pdf
- **§71119** (community engagement / work requirements) — 2027, per the same letter's cross-
  reference. Not in force in 2026.
- **Already in force in 2026:** §71109 (alien Medicaid eligibility), §71115/71117 (provider taxes),
  §71118 (1115 budget neutrality), §71116 (state directed payments, proposed rule 2026-05-20).
  CMS, "Working Families Tax Cut Legislation,"
  https://www.medicaid.gov/resources-for-states/working-families-tax-cut-legislation
- **One real 2026 change the review missed:** CMS is no longer permitting states to run (a)
  12-month continuous coverage for *adults* or (b) more-than-12-month continuous eligibility for
  children. New York discontinued both **effective 2026-07-01** — its adult 12-month CE and its
  children-0-to-6 multi-year CE, both previously run under its §1115 waiver. This does **not**
  touch the statutory 12-month CE for children at 42 CFR 435.926. NY State of Health, June 2026
  webinar (URL above), slides 22–25.

---

#### B8 — SSI-linked Medicaid and §1619(b) — **CONFIRMED**

**Automatic eligibility — 42 CFR 435.120:** the agency "must provide Medicaid to aged, blind, and
disabled individuals or couples who are receiving or are deemed to be receiving SSI," expressly
including those in 1619(a)/1619(b) status. (ecfr.gov, current)

**Exceptions the review should name** — SSA POMS SI 01715.010, TN 7 (01-24),
https://secure.ssa.gov/poms.nsf/lnx/0501715010:
- **209(b) states (8)** — Connecticut, Hawaii, Illinois, Minnesota, Missouri, New Hampshire, North
  Dakota, Virginia — apply criteria more restrictive than SSI (no more restrictive than their
  1972 plan) and must allow spenddown. §1902(f) of the Act; 42 CFR 435.121.
- **SSI-criteria states (8)** — Alaska, Idaho, Kansas, Nebraska, Nevada, Oklahoma, Oregon, Utah
  (plus N. Mariana Islands) — use SSI rules but require a **separate Medicaid application**.
- **§1634 states (34 + DC)** — fully automatic; the SSI application is the Medicaid application.
  POMS defines this set only by subtraction and never enumerates it.

**§1619(b) thresholds, CY 2026** — SSA POMS SI 02302.200 "Charted Threshold Amounts," TN 38 (01-26),
effective 2026-01-20, https://secure.ssa.gov/poms.nsf/lnx/0502302200

| State | 2026 threshold | (2025 for comparison) |
|---|---|---|
| **California** | **$66,078** (blind: $68,103) | $64,517 |
| **New York** | **$68,654** | $64,017 |
| **Texas** | **$53,165** | $53,501 |

Texas *fell* year over year (its Medicaid component dropped from $29,273 to $28,289). The table
carries SSA's own caveat: "The 2026 threshold amounts were calculated using the 2023 average per
capita Medicaid expenses by State because the 2024 data was not available."

**Qualifying conditions — POMS SI 02302.010, TN 39 (02-26), effective 2026-02-05**
(https://secure.ssa.gov/poms.nsf/lnx/0502302010; 20 CFR 416.264/.265/.269, §416.265 amended
91 FR 16830, 2026-04-03): still blind/disabled; meet all non-disability SSI requirements but for
earnings; **a prerequisite month** of regular SSI cash payment; need Medicaid to continue working;
and earnings insufficient to replace SSI + Medicaid + publicly-funded attendant care.

**Independently corroborated by a second SSA document family.** The **2026 Red Book**,
"SSI Only Employment Supports," https://www.ssa.gov/redbook/eng/ssi-only-employment-supports.htm,
states the same five qualifying conditions and the same individualized-threshold construction in
plain language ("After you return to work, your Medicaid coverage can continue… even if your
earnings… become too high for an SSI payment"), and confirms the threshold is built from "the
amount of earnings that would cause your SSI payments to stop in your state" plus "the average
annual per capita Medicaid expenditure for your state" — exactly the POMS arithmetic.
**The Red Book does not reproduce the state-by-state dollar chart**, so POMS SI 02302.200 remains
the only source for the CA/NY/TX figures above.

**Individualized threshold** — POMS SI 02302.050, 20 CFR 416.269(c)(1): when gross earnings exceed
the charted threshold, SSA computes a personal one using the higher of actual or average state
Medicaid expenditures, plus IRWE/BWE/PASS exclusions and publicly-funded attendant care. So the
charted figure is a floor, not a hard cap — relevant if the model treats it as a cliff edge.

Only **gross earned** income counts toward the threshold; unearned income is disregarded
(POMS SI 02302.045).

---

#### B9 — Massachusetts TAFDC for a family of 5 — **REFUTED on all three numbers**

The review's "TANF ≈ $9,880/yr ending abruptly at $26–27k earnings" is wrong on the grant, wrong on
the exit point, and wrong about abruptness.

**Maximum monthly grant, 2026** — DTA, *TAFDC Table of Need and Payment Standards*, PDF authored
2026-08-20, https://www.mass.gov/doc/table-of-need-payment-standards/download (incorporated by
reference into 106 CMR 704.410/704.420, which no longer carry the numbers themselves):

| AU size | No rent allowance | With $40 rent allowance |
|---|---|---|
| 3 | $861 | $901 |
| **5** | **$1,150** | **$1,190** |

**Family of 5 annual: $13,800** (public/subsidized housing) or **$14,280** (private housing).
Independently confirmed at DTA, *Fiscal Year 2026 Report on Standard Budgets of Assistance for
TAFDC*, January 2026, Table 2 "effective January 1, 2026," which lists HH-5 = $13,800,
https://www.mass.gov/doc/fiscal-year-2026-report-on-standard-budgets-of-assistance-for-transitional-aid-to-families-with-dependent-children-january-2026/download

The review's **$9,880 is 28% too low** and matches no published Massachusetts figure for a family
of 5. (There is also a $500-per-child clothing allowance each September — +$1,500/yr for three
children — pushing total annual cash to ≈$15,780 in private housing.)

**Earned income disregard — unchanged, still $200 + 50%.** No budget raised it.
- **100% EID** (106 CMR 704.281(A)): all earned income disregarded for up to six consecutive months
  / 12 cyclical payments, while total countable income stays ≤200% FPL. Active clients only.
- **Thereafter** (106 CMR 704.270 + 704.281(B)): **$200 monthly work-related-expense deduction,
  then 50% of the remainder.** Net countable earned income = 0.5 × (gross − $200).
- What the recent budgets changed was the *payment standard*: a 10% grant increase effective
  April 2025, preserved in FY2026 ($1,045 → $1,150 for AU 5).
- 106 CMR 704.000 (transmittal 5/10/24),
  https://www.mass.gov/doc/106-cmr-704-transitional-cash-assistance-program-financial-eligibility/download

**106 CMR 704.260 is a NET income test, not gross.** There is no 185%-of-need gross screen.
704.500(A) Step 7: grant = need standard − countable income; ≥$10 is paid, $0–$9 pays nothing but
keeps the unit "receiving assistance," negative is ineligible.

**Computed exit point for a family of 5** — marginal benefit-reduction rate is 50 cents/dollar above
$200/month:

| Housing | Payment std | Grant hits $0 | Annual earnings |
|---|---|---|---|
| Public/subsidized | $1,150 | $2,500/mo | **$30,000** |
| Private (+$40) | $1,190 | $2,580/mo | **$30,960** |

So **$26k–$27k is low by roughly $3,000–$5,000**, and the residual notch from the $10 minimum-grant
rule is at most $9/month ($108/yr) — de minimis.

*Arithmetic validated against DTA's own published example:* FY2026 report Table 5 (family of three,
private housing) shows $10,812/yr at zero earnings and **$7,512/yr at $15,600 of earnings**. That
reconciles exactly as 6 months at the full $901 (100% EID) + 6 months at $901 − 0.5×($1,300−$200) =
$351. The formula reproduces DTA's figure to the dollar.

**"Abruptly" is wrong for this earnings range.** TAFDC phases out linearly at a 50% BRR from about
$200/month of earnings all the way to $2,500–$2,580/month. The exit is softened further by
Transitional Support Services (4 monthly stipends of $280/$210/$140/$70) and SNAP Transitional
Benefits Alternative (5 months of SNAP frozen at the pre-closure amount).
https://www.mass.gov/info-details/post-tafdc-benefits

**Where the real Massachusetts TAFDC cliff is — and the review misplaced it by ~$50k.** During the
100% EID window the family keeps the *entire* grant regardless of earnings, and the case closes
outright when countable income crosses **200% FPL = $77,364/yr for a household of 5**. That is a
genuine abrupt loss of ~$13,800–$14,280/yr, but at ~$77k, not $26–27k.

**Likely source of the modeling error (inference, not primary-sourced):** a $26,418 figure falls
inside the claimed band and equals 185% × $1,190×12 — a legacy AFDC-era gross-income screen that
Massachusetts does **not** currently impose. Separately, $9,880 ≈ 12 × $823, and $823 is the
superseded family-of-**three**-with-rent-allowance standard still shown on a stale mass.gov page.
Both are hypotheses about the error, offered as leads, not findings.

**Do not cite** https://www.mass.gov/info-details/how-to-calculate-tafdc-benefit for amounts — it
still shows pre-April-2025 standards ($1,045/$1,085 for AU 5) and contradicts the authoritative
posted table. Its worked example of the $200 + 50% arithmetic is still correct.


---

### What the review got wrong or overstated

Ordered by how much it would move HotGap's output.

1. **New York Essential Plan at 250% FPL is out of date (B4).** The 200–250% tier was eliminated
   **2026-07-01** after CMS approved New York's §1332 waiver termination on **2026-03-20**. The
   EP→marketplace step for a single adult is now at **200% FPL / $31,920**, not 250% / $39,900.
   Any NY curve built on the 250% boundary is wrong for more than two months of the current policy
   year. This is the single largest factual error.

2. **Mississippi's parent limit is materially lower than stated, and for a reason that will keep
   biting (B2).** $498/mo = **$5,976/yr** for a family of 3 (≈21.9% FPL), not "~27% FPL / $7–8k."
   The review understated the cliff's depth. **27% was accurate around 2019–2020 and has been
   decaying ever since**, because Mississippi's standard is a dollar amount frozen since 2014 while
   the FPL rises annually (≈27% → ≈24% in 2023 → ≈22% now). **Five of the ten non-expansion states
   — TX, MS, GA, FL, WY — use frozen dollar standards whose % FPL falls every January.** Any
   percentage taken from a pre-2026 source is too high. This is the single biggest recurring
   correctness risk in the model, and it is silent: the numbers stay plausible as they go stale.
   Texas is lower still at $230/mo = $2,760/yr (≈10.1% FPL).

3. **Massachusetts TAFDC is wrong on all three numbers and on its shape (B9).** The family-of-5
   grant is **$13,800–$14,280/yr**, not $9,880 (28% low). It reaches zero at **$30,000–$30,960** of
   earnings, not $26–27k. And it does **not** end abruptly — it phases out linearly at a 50%
   benefit-reduction rate on earnings above $200/month. Modeling it as a cliff at $26–27k invents a
   discontinuity that does not exist; the real abrupt loss is the 100%-EID window closing at
   **200% FPL = $77,364/yr**, some $50k higher up the income scale.

4. **"Nine non-expansion states" is a miscount (B1).** It is **ten**. Wyoming is non-expansion.
   The review's own state set was right; only the tally was wrong.

5. **The children's cliff is not immediate (B7).** 42 CFR 435.926 forbids terminating a child's
   Medicaid mid-year "regardless of any changes in circumstances." A raise that crosses the
   children's limit defers the loss to the next annual renewal — up to 12 months later. A chart that
   drops children's coverage at the income threshold mis-times the loss and overstates its
   immediacy. The same protection applies in CHIP (42 CFR 457.342).

6. **Treating all ten non-expansion states as coverage-gap states overstates it (B6).**
   Wisconsin covers childless adults *and* parents to 100% FPL, exactly meeting the subsidy floor.
   The gap is a **nine**-state phenomenon. (Tennessee covers parents to 100% but not childless
   adults, so it does not close.)

7. **"Non-expansion state" is not one parameter (B2).** Parent/caretaker limits across the ten span
   **10.1% FPL in Texas to 100% in Tennessee and Wisconsin** — $2,760 to $27,320 of annual income
   for a family of three, a tenfold range. Any model using a single representative non-expansion
   threshold is wrong by up to ~$24,000 of income depending on the state.

8. **Mixing the two 5-point-disregard conventions (B2, B5).** The review paired Mississippi's
   disregard-**inclusive** dollar figure ($58,476) with its disregard-**exclusive** percentage
   (209%). Those differ by exactly 5 pp of FPL ≈ $1,366/yr. States are not consistent: Mississippi
   pre-adds the disregard to its published dollars, Texas keeps it in a separate chart. Name the
   convention in the same breath as every number.

9. **The 266% children's cliff is not statewide in California (B3).** CCHIP continues children's
   coverage to 322% FPL in San Francisco, San Mateo and Santa Clara counties.

10. **Two 2026 changes the review appears not to have caught, both of which make cliffs worse:**
   - The **enhanced premium tax credits expired 2026-01-01**. The 400% FPL cap is back and
     applicable percentages rose sharply (200% FPL: 2% of income in 2025 → 6.6% in 2026). A model
     on 2025 subsidy schedules understates the 100%-FPL step in non-expansion states and omits the
     restored 400% cliff entirely.
   - CMS **ended state-run 12-month continuous coverage for adults** and >12-month CE for children.
     New York dropped both on 2026-07-01. This does not touch the statutory children's 12-month CE.

11. **Nothing in P.L. 119-21's eligibility provisions binds during 2026 (B7).** Both the 6-month
    redeterminations for the adult group (§71107) and community engagement (§71119) start in 2027.
    Correctly treated as out of scope for a 2026 model — but worth stating explicitly rather than
    leaving implied.

**What the review got right:** the California 138%/266% thresholds and both dollar figures (B3);
the mechanics and legal basis of the coverage gap (B6); SSI-linked Medicaid and §1619(b) as a
work-continuation mechanism (B8); the Mississippi CHIP dollar figure of $58–59k (B5), though
mislabeled by percentage; and the underlying list of non-expansion states (B1).

---

### Sources I could not reach (and the workarounds used)

Two entries here were blocked on a first pass and reached on a second; both are marked, because in
each case getting through changed the finding rather than just confirming it.

- **www.ssa.gov** — Akamai-blocked (HTTP 403) to the ordinary fetch paths; **subsequently reached**
  on a second pass, and the 2026 Red Book was read. It corroborates the §1619(b) rules but does not
  reproduce the state-by-state dollar chart, so the CA/NY/TX figures in B8 still rest solely on
  POMS (secure.ssa.gov/poms.nsf), which is authoritative; the threshold table was additionally
  reconciled arithmetically
  (Base = $24,876 + 2× state supplement; Threshold = Base + Medicaid component; the $24,876 federal
  base back-solves to a $994 monthly FBR, confirming it is genuinely the 2026 table).
- **federalregister.gov and ecfr.gov via WebFetch** — both 302-redirect to `unblock.federalregister.gov`.
  Worked around by calling the **eCFR renderer API** directly; all CFR text quoted above was
  retrieved that way and is current.
- **dhcs.ca.gov** — Incapsula-blocked to direct fetch. Worked around via ACWDL 26-01 (the PDF
  retrieved cleanly) and the Covered California chart, which cites ACWDL 26-01 as its source for
  the Medi-Cal columns.
- **medicaid.gov PDFs via curl** — "Access Denied"; retrieved via WebFetch instead.
- **info.nystateofhealth.ny.gov via WebFetch** — HTTP 403; retrieved via curl with browser headers.
- **mass.gov via plain fetch** — HTTP 403; retrieved via curl with full browser headers.
- **kancare.ks.gov** — initially blocked both curl and WebFetch; **subsequently reached** on a
  second pass. Doing so converted a retrieval failure into a substantive finding: the Kansas F-8
  dollar chart is **not published at all** in a current version. KFMAM 2211.01 points to it "in the
  appendix of the KanCare Policy website," but that link and its current-structure equivalents all
  404, and the newest retrievable F-8 is Rev. 04-17 (2017). The 38% rule is solidly sourced; the
  dollar figure is mine. See B2.
- **medicaid.gov's eligibility-levels table in machine-readable form** — no XLSX/CSV is published;
  only the HTML table, itself stale (Dec 2023).
- **A current coverage-gap population count** — no ASPE, CMS or Census publication restates the
  count for the present ten-state set. The only primary figure available is ASPE's February 2022
  estimate covering twelve states.
- **The §1634 state list** — never enumerated in any primary source; POMS defines it only by
  subtraction (50 − 8 209(b) − 8 SSI-criteria = 34 + DC).

#### Sources that are live but should NOT be cited

- **chipmedicaid.org** — no longer an official Texas HHS property. Every path 302-redirects to
  `survey-smiles.com`, a survey-monetization domain that sets a tracking cookie on
  `.chipmedicaid.org`. Lapsed or hijacked.
- **medicaid.gov's expansion map PDF** — stamped "as of December 2023," says "40 states plus DC."
- **medicaid.gov's eligibility-levels table** — stamped "as of December 1, 2023," and its % FPL
  figures for dollar-standard states are CMS conversions against a 2023 FPL.
- **hhs.texas.gov consumer pages** — ~6 months stale; show CHIP and children's Medicaid at 2025-FPL
  dollars and contradict the state's own April 2026 handbook.
- **mass.gov/info-details/how-to-calculate-tafdc-benefit** — shows pre-April-2025 payment standards.
- **NY's "2026 Income Levels" chart** — still prints the "EP 200-250" tier that ended 2026-07-01.

Note the pattern: on every claim where a stale federal aggregator and a current state page
disagreed, the state page was right and the federal one was 1–3 years behind. For 2026 figures,
go to the state agency first and use medicaid.gov only for expansion status and enrollment counts.


---

## Appendix C. SSI/SSDI, SNAP, TANF, and Head Start claims (SSA, USDA FNS, ACF, eCFR)

### HotGap methodology review — primary-source validation (SSA / SNAP / Head Start / TANF)

Validated 2026-09-14. Primary federal/state sources only. Non-government pages were used only to locate primaries.

Access note: `www.ssa.gov` is blocked at the network edge from this environment (Akamai 403 on every path, for both WebFetch and curl). SSA facts below were taken instead from `secure.ssa.gov` (POMS) and from the Federal Register, both primary.

---

#### C1 — SSI 2026 federal benefit rate and exclusion arithmetic — **CONFIRMED**

**Figures.** 2026 COLA 2.8%. FBR individual **$994/month = $11,928/year** exactly (SSA derives the annual unrounded $11,929.46, rounds down to the next lower multiple of 12 → $11,928, ÷12 = $994). Couple $1,491/mo ($17,892/yr); essential person $498/mo. 2025 was $967/mo ($11,604 unrounded basis).

- *Cost-of-Living Increase and Other Determinations for 2026*, 90 FR (SSA), doc. 2025-19763, published **2025-11-03** — https://www.federalregister.gov/documents/2025/11/03/2025-19763/cost-of-living-increase-and-other-determinations-for-2026

**Independent cross-check (different source family).** POMS SI 02302.200 (eff. 01/20/2026) computes the §1619(b) "base amount" as `2 × FBR + 85 × 12`. For 2026 it publishes **$24,876**, which solves to FBR = $11,928/yr. For 2025 it publishes $24,228 → $11,604/yr. Both match the Federal Register.
- https://secure.ssa.gov/poms.nsf/lnx/0502302200

**Exclusion arithmetic.** 20 CFR 416.1112(c) applies earned-income exclusions in this order: (c)(4) any unused portion of the **$20/mo general income exclusion**; (c)(5) **$65 of earned income in a month**; (c)(7) **one-half of remaining earned income in a month**. The $20 general exclusion is at 20 CFR 416.1124(c)(12) and applies first to unearned income, with any unused portion carried to earned income.
- 20 CFR 416.1112 / 416.1124 via eCFR API (as of 2026-09-01) — https://www.ecfr.gov/current/title-20/section-416.1112 , https://www.ecfr.gov/current/title-20/section-416.1124

**The worked example checks out.** Annualized: ($20 + $65) × 12 = $1,020. ($6,000 − $1,020) / 2 = $2,490 countable. $11,928 − $2,490 = **$9,438**. Matches the review.

**Caveats the review should carry.**
1. SSI is computed **monthly**, not annually (20 CFR 416.420, retrospective monthly accounting). The annualization is exact only for level monthly earnings. Lumpy earnings produce a *higher* annual SSI total than the formula, because a month where countable income exceeds the FBR pays $0 rather than a negative.
2. The $20 exclusion is consumed by unearned income first, so a recipient with ≥$20/mo of unearned income gets only the $65 + ½ treatment on earnings, and the break-even shifts.
3. $11,928 is the **federal** rate only. State supplements are material: POMS SI 02302.200 shows California's twice-annual supplement at $5,759 for 2026, i.e. ~$240/month of SSP on top of the FBR. A California SSI figure of $11,928 understates the cash benefit.

#### C2 — SSI resource limit $2,000 / $3,000 — **CONFIRMED**, no 2026 change

20 CFR 416.1205(c) sets the limits by an effective-date table that **ends at January 1, 1989: $2,000 individual / $3,000 individual-and-spouse**. There is no indexing provision and no later row; the amounts have been nominally frozen for 37 years.
- 20 CFR 416.1205, source note [50 FR 38982, Sept. 26, 1985] — https://www.ecfr.gov/current/title-20/section-416.1205
- POMS SI 01110.003 *Resources limits for SSI benefits*, eff. **12/17/2024**, states $2,000 / $3,000 — https://secure.ssa.gov/poms.nsf/lnx/0501110003

The 2026 COLA notice adjusts the FBR, SGA, TWP and student earned-income exclusion but **not** the resource limits, confirming they are outside the COLA mechanism.

#### C3 — SSDI: SGA, TWP/EPE notch, average benefit — **CONFIRMED**

**SGA 2026, non-blind: $1,690/month = $20,280/year.** Blind: $2,830/month = $33,960/year. (2025: $1,620 / $2,700.) Review's "≈$20k/yr" is right.
- POMS DI 10501.015 *Tables of SGA Earnings Guidelines*, TN 23 (12-25), eff. **12/08/2025**, Table 2 (Nonblind) — https://secure.ssa.gov/poms.nsf/lnx/0410501015
- Same figure in FR doc. 2025-19763 (2025-11-03): "$1,690."

**Trial work period 2026: $1,210/month** (2025: $1,160). Nine service months, not necessarily consecutive, within a rolling 60-month period; benefits are paid in full during the TWP regardless of how high earnings are.
- POMS DI 13010.060, TN 89 (12-25) — https://secure.ssa.gov/poms.nsf/lnx/0413010060
- POMS DI 13010.035 *The Trial Work Period*: "We cannot cease disability during the TWP based on a beneficiary's work activity." — https://secure.ssa.gov/poms.nsf/lnx/0413010035
- FR doc. 2025-19763, 20 CFR 404.1592(b).

**The "notch" is real and the review's characterization is correct.** After the TWP comes a **36-month extended period of eligibility (EPE)** (20 CFR 404.1592a). POMS DI 13010.210:
- Grace period = the month of disability cessation plus the two following months; benefits are paid for all three "regardless if months are SGA or non-SGA."
- Then: "Benefits are payable within the EPE re-entitlement period provided the beneficiary is **not** engaging in SGA," and "no benefit is payable for any month of SGA after the second month following the month of cessation."
- "When a beneficiary returns to SGA after the 36 month re-entitlement period, eligibility for Title II payments ends" (benefit termination month).
- https://secure.ssa.gov/poms.nsf/lnx/0413010210

So SSDI cash is **all-or-nothing month by month against the SGA threshold** — there is no $1-for-$2 taper as in SSI. One dollar of countable earnings above $1,690/month zeroes the entire monthly benefit. That is a genuine cliff, and it is the correct contrast to draw with SSI.

**Modeling caveat the review should state:** SGA is tested on **countable** earnings after impairment-related work expenses (20 CFR 404.1576), subsidies, and unsuccessful-work-attempt rules — not on gross wages. A model that compares gross annual earnings to $20,280 will place the cliff earlier than SSA would.

**Average SSDI disabled-worker benefit — CONFIRMED.** SSA *Monthly Statistical Snapshot, July 2026* (Table 2): disabled workers, 6,990,000 beneficiaries, **average monthly benefit $1,635.27 → $19,623/year**. The review's "~$19k/yr" is right.
- Original: https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/ — **host unreachable** (Akamai 403). Read from a Wayback mirror of that exact URL, **capture 2026-08-26**: https://web.archive.org/web/20260826080636/https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/ . Treat as primary-content-via-mirror, single capture, not independently re-derived.
- Use the **disabled-worker** row specifically. The whole DI category (incl. spouses $463.69 and children $529.47) averages $1,498.43/mo, and all-OASDI averages $1,940.08/mo. Substituting either would be wrong for this claim.

#### C4 — SSDI vs SSI-only working-age populations — **CONFIRMED**

Same source (*Monthly Statistical Snapshot, July 2026*, Table 1, "Disabled, under age 65", thousands):

| | Total | Social Security only | SSI only | Both |
|---|---|---|---|---|
| Disabled, under 65 | 10,933 | **6,140** | **3,710** | 1,083 |

SSA's own under-65 split settles it directly: **6,140K Social-Security-only vs 3,710K SSI-only, a 1.65× margin** — and the SSI-only figure is *generous* to the other side, since it still includes disabled children under 18.

Cross-check via the age table (Table 3: SSI recipients 18–64 = 3,783K): SSI-only working-age = 3,783K − (18–64 concurrent), and the concurrent count is bounded above by the 1,083K total under-65 concurrent, so **SSI-only 18–64 falls between 2,700K and 3,783K**. Even the loosest bound is far below the 6,990K disabled workers on SSDI. The conclusion does not depend on the exact concurrent figure (which SSA does not publish at that age granularity in the Snapshot).

Caveat: the 6,990K disabled-worker count is all-ages and includes workers between 65 and FRA, so it is not a strict working-age denominator — which is why the Table 1 under-65 split is the better comparison.

#### C5 — §1619(b) Medicaid continuation and state thresholds — **CONFIRMED**

Working SSI recipients whose earnings zero out the cash payment keep Medicaid under §1619(b) of the Act up to a state-specific threshold. POMS SI 02302.200 (*Charted Threshold Amounts*), TN 38 (01-26), **effective 01/20/2026**, publishes the calendar-year 2026 chart.

Threshold = 2 × annual state supplementation rate + (2 × FBR + 85 × 12) + average per-capita Medicaid expenses by state.

| State | 2× annual supp. | Base amt | Medicaid | **2026 threshold** | (2025) |
|---|---|---|---|---|---|
| California (disabled) | $5,759 | $24,876 | $35,443 | **$66,078** | $64,517 |
| California (blind) | $7,784 | $32,660 | $35,443 | **$68,103** | $66,542 |
| New York | $2,088 | $26,964 | $41,690 | **$68,654** | $64,017 |
| Texas | $0 | $24,876 | $28,289 | **$53,165** | $53,501 |

- https://secure.ssa.gov/poms.nsf/lnx/0502302200

Note in the source: "The 2026 threshold amounts were calculated using the 2023 average per capita Medicaid expenses by State because the 2024 data was not available." Also note Texas's 2026 threshold is *lower* than 2025's ($53,165 vs $53,501) because the Medicaid component fell — thresholds do not move monotonically. An individualized threshold is available where the person's own Medicaid costs exceed the state average (POMS SI 02302.050), so the charted amount is a floor, not a ceiling.

#### C6 — SNAP FY2026 parameters — **CONFIRMED with one material correction**

Source: **SNAP – Fiscal Year 2026 Cost-of-Living Adjustments**, FNS/FNA policy memo, signed **2025-08-14**, effective **October 1, 2025 – September 30, 2026**.
- Landing page: https://www.fna.usda.gov/snap/allotment/cola/fy26
- Memo PDF: https://www.usda.gov/sites/default/files/guidance-documents/fns.snap-cola-fy26memo.pdf

**FY2026, 48 states and D.C.**

| Parameter | FY2026 value |
|---|---|
| Standard deduction, HH size 1–3 | **$209/mo** |
| Standard deduction, HH size 4 | $223 |
| Standard deduction, HH size 5 | $261 |
| Standard deduction, HH size 6+ | $299 |
| Maximum excess shelter deduction (shelter cap) | **$744/mo** |
| Maximum homeless shelter deduction | $198.99 |
| Max allotment, HH of 4 | $994 |
| Max allotment by size 1–8 | $298 / $546 / $785 / $994 / $1,183 / $1,421 / $1,571 / $1,789 (+$218 each) |
| Minimum benefit (HH 1–2) | $24 |
| Asset limit (general / elderly-disabled) | $3,000 / $4,500 (unchanged) |
| Net income standard (100% FPL), HH 1–5 | $1,305 / $1,763 / $2,221 / $2,680 / $3,138 |
| Gross income standard (130% FPL), HH 1–5 | $1,696 / $2,292 / $2,888 / $3,483 / $4,079 |

**20% earned income deduction — CONFIRMED.** 7 CFR 273.9(d)(2): "*Earned income deduction. Twenty percent of gross earned income as defined in paragraph (b)(1) of this section.*"

**30% of net income benefit reduction — CONFIRMED.** 7 CFR 273.10(e)(2)(ii)(A): "*the household's monthly allotment shall be equal to the maximum SNAP allotment for the household's size reduced by 30 percent of the household's net monthly income.*"

**Gross test 130% FPL / net test 100% FPL — CONFIRMED.** 7 CFR 273.9(a)(1)(i) and (a)(2)(i). Households with an elderly or disabled member face only the net test; categorically eligible households face neither.

**Standard Utility Allowance is state-set — CONFIRMED.** 7 CFR 273.9(d)(6)(iii)(A): "*A State agency may use standard utility allowances (standards) in place of actual costs… The State agency may vary the standards by factors such as household size, geographical area, or season.*" FNS issues annual instructions for state SUA values (*SNAP – Simplified Process for Fiscal Year 2026 Standard Utility Allowance (SUA) Values*, https://www.fna.usda.gov/snap/admin/sua-fy26).

**BBCE and non-BBCE states — CONFIRMED, but incomplete as stated.** FNS's BBCE chart (**updated 2026-06-29**) lists **46** jurisdictions with BBCE. The jurisdictions **without** BBCE are **Kansas, Mississippi, Missouri, South Dakota, Tennessee, Utah, and Wyoming** (7 of 53 states/D.C./Guam/USVI). Utah is correctly named but is one of seven, not the exception.
- https://www.fna.usda.gov/snap/broad-based-categorical-eligibility (chart PDF: `/sites/default/files/resource-files/BBCE-States-Chart-June2026.pdf`)
- Also note BBCE states set their own gross-income limit (130%–200% FPL) and asset limit, so the 130% gross test is **not** the binding constraint in most states. Texas BBCE carries a $5,000 asset limit; Idaho and Indiana $5,000; Nebraska $25,000 liquid.

##### ⚠️ Correction: the "≈24% of gross earnings / ≈$240 per $1,000" marginal rate is a **lower bound**, not the general case

24% (= 0.30 × 0.80) is correct **only** when the household's excess shelter deduction is pinned at the cap or is zero. When the excess shelter deduction is strictly between zero and the cap — which is the common case for renters — the marginal rate is **36%, i.e. ≈$360 per $1,000 of earnings**.

Why: 7 CFR 273.9(d)(6)(ii) defines the excess shelter deduction as shelter costs **in excess of 50 percent of income after all other deductions**. As earnings rise, that 50% floor rises and the shelter deduction *shrinks*, so net income rises faster than 0.80 × gross:

```
AdjInc   = 0.80·G − StdDed
ExcShel  = clamp(Shelter − 0.5·AdjInc, 0, cap)
Net      = AdjInc − ExcShel

uncapped, positive:  Net = 1.5·AdjInc − Shelter  →  dNet/dG = 1.20  →  dBenefit/dG = −0.36
at the cap, or zero: Net = AdjInc − const        →  dNet/dG = 0.80  →  dBenefit/dG = −0.24
```

Worked check (48 states, HH of 3, std ded $209, max allotment $785, cap $744):
- Rent $900 (uncapped): G=$2,000/mo → benefit $429; G=$2,100 → benefit $393. **−$36 per $100 = 36%.**
- Rent $2,500 (capped): G=$2,000 → benefit $591; G=$2,100 → benefit $567. **−$24 per $100 = 24%.**

Households with an elderly or disabled member have **no shelter cap at all** (7 CFR 273.9(d)(6)(ii)), so they sit in the 36% region until the shelter deduction hits zero. If HotGap's headline SNAP taper is ~24%, it understates the true marginal rate for a large share of renter households.

##### ⚠️ eCFR text of 7 CFR 273.9 is stale relative to statute

The current eCFR text of 273.9(d)(6)(ii)(C) still lists "*service fees associated with basic internet connection… which may include high-speed internet*" as an allowable shelter/utility cost. **P.L. 119-21 §10104 repealed this**, effective on enactment (2025-07-04). Anything derived from the CFR text alone will over-state the shelter deduction.

Statutory text (govinfo, P.L. 119-21, 139 Stat.) — https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm :
> **SEC. 10104. RESTRICTIONS ON INTERNET EXPENSES.** Section 5(e)(6) of the Food and Nutrition Act of 2008 (7 U.S.C. 2014(e)(6)) is amended by adding at the end the following: "(E) Restrictions on internet expenses.—Any service fee associated with internet connection shall not be used in computing the excess shelter expense deduction under this paragraph."

- Also *SNAP Provisions of the One Big Beautiful Bill Act of 2025 – Information Memorandum*, FNS, **2025-09-04**, §10104 (adds that the restriction extends to SUA computation) — https://www.fna.usda.gov/snap/obbb-implementation (PDF: https://www.usda.gov/sites/default/files/guidance-documents/fns.snap-obbb-implementation.pdf)

Same memo, **§10103**: LIHEAP receipt now confers the heating/cooling SUA only for households **with an elderly or disabled member** (and only for payments over $20); other households must actually incur heating/cooling costs. Effective on enactment. **§10101** limits future Thrifty Food Plan re-evaluations from increasing TFP cost and bars re-evaluation before 2027-10-01 — so the allotment growth path is now CPI-only.

#### C7 — SNAP work rules after P.L. 119-21 — **CONFIRMED**

Source: **SNAP Provisions of the One Big Beautiful Bill Act of 2025 – ABAWD Exceptions – Implementation Memorandum**, FNS, dated **2025-10-03**, implementing OBBB §10102(a). Changes "*were effective upon enactment, July 4, 2025.*"
- https://www.fna.usda.gov/snap/obbb-abawd-exemptions-implementation (PDF: https://www.usda.gov/sites/default/files/guidance-documents/fns.snap-obbb-abawd-exceptions-implementation.pdf)

Statutory text (govinfo, P.L. 119-21) — https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm :
> **SEC. 10102. MODIFICATIONS TO SNAP WORK REQUIREMENTS FOR ABLE-BODIED ADULTS.** (a) Exceptions.—Section 6(o) … is amended by striking paragraph (3) and inserting the following: "(3) Exceptions.—Paragraph (2) shall not apply to an individual if the individual is— (A) **under 18, or over 65, years of age**; (B) medically certified as physically or mentally unfit for employment; (C) **a parent or other member of a household with responsibility for a dependent child under 14 years of age**; (D) otherwise exempt under subsection (d)(2); (E) a pregnant woman; (F) an Indian or an Urban Indian …; or (G) a California Indian …"

Note the statute says "under 18, or over 65"; FNS implements this as **ages 18 through 64 subject to the time limit**. Use the FNS formulation.

Verbatim from the memo:
- **Age:** "*Prior to passage of OBBB, individuals aged 18 to 54 were subject to the ABAWD time limit. The OBBB increases the age of those subject to the time limit to age 64. Therefore, individuals aged 18 to 64 are now subject to the time limit.*" ✔ matches the review.
- **Dependent child:** "*The OBBB limits the exception for a parent or other household member with responsibility for a dependent child to children under 14 years of age… Therefore, adults in a SNAP household with children between ages 14 and 17 are now subject to the time limit.*" ✔ matches the review.
- **Removed exceptions** (added by the Fiscal Responsibility Act of 2023): homeless individuals; veterans; individuals aged 24 or younger who were in foster care at 18. The review does not mention these; they matter for any disability- or housing-adjacent persona.
- **New exceptions added:** "Indian," "Urban Indian," and "California Indian" as defined in the Indian Health Care Improvement Act (25 U.S.C. 1603(13), etc.).
- Separately, §10102(b)–(c) tightened ABAWD **waiver** criteria (*ABAWD Waivers – Implementation Memorandum*, https://www.fna.usda.gov/snap/obbb-ABAWD-Waivers-Implementation-Memo).
- Note: OBBB did **not** change the general work requirements at §6(d)(3); individuals aged 60+ remain exempt from those, and "elderly" for SNAP purposes is still 60+.

**Student rule, ages 18–49 — CONFIRMED.** 7 CFR 273.5(a) makes anyone enrolled at least half-time in an institution of higher education ineligible unless exempt; 273.5(b)(1) exempts anyone "*age 17 or younger or age 50 or older*." So the rule bites exactly on ages 18–49, and P.L. 119-21 did not change this age band (it changed the ABAWD band, which is a different rule).
- https://www.ecfr.gov/current/title-7/section-273.5

#### C8 — SNAP treatment of child support — **CONFIRMED**

- **Received child support is unearned income.** 7 CFR 273.9(b)(2)(iii): "*Support or alimony payments made directly to the household from nonhousehold members.*" (Exception at 273.9(b)(5)(ii): child support a TANF recipient must assign to the IV-D agency is not income.)
- **Paid child support: an exclusion, with a state option to use a deduction instead.** 7 CFR 273.9(c)(17) excludes "*legally obligated child support payments paid by a household member to or for a nonhousehold member… and amounts paid toward child support arrearages*"; "*However, at its option, the State agency may allow households a deduction for such child support payments in accordance with paragraph (d)(5) of this section rather than an income exclusion.*" 7 CFR 273.9(d)(5) is the *Optional child support deduction*; alimony is expressly not included in it.
- Interaction worth modelling: 273.9(d)(2) requires that earnings used to pay excluded child support **still count** toward the 20% earned income deduction base.
- https://www.ecfr.gov/current/title-7/section-273.9

#### C9 — Head Start

##### (a) Eligibility duration — **PARTLY CONFIRMED; the citation in the review is wrong**

The substance is right but the paragraph is **45 CFR 1302.12(j)(1)**, not (k)/(l). In the current text, **(k) is "Records"** and **(l) is "Program policies and procedures on violating eligibility determination regulations."** Citing (k)/(l) for eligibility duration would not survive a reader checking the reg.

Verbatim 1302.12(j)(1): "*If a child is determined eligible under this section and is participating in a Head Start program, he or she will remain eligible through the end of the succeeding program year **except that the Head Start program may choose not to enroll a child when there are compelling reasons for the child not to remain in Head Start, such as when there is a change in the child's family income and there is a child with a greater need for Head Start services.***"

So "remains eligible regardless of income changes" is **too strong**: the regulation contains an explicit income-change carve-out. Also relevant: (j)(3) requires re-verification when a child moves from Early Head Start to Head Start Preschool, so the protection does not span that transition.
- 45 CFR 1302.12, source note **[81 FR 61412, Sept. 6, 2016, as amended at 89 FR 67807, Aug. 21, 2024]** — https://www.ecfr.gov/current/title-45/section-1302.12

##### (b) Federal cost per child — **PARTLY CONFIRMED**: $22,285 is defensible for California, ~36% too high nationally

**First, a definitional finding: ACF does not publish an "average federal cost per child."** The fact sheet publishes funding and funded enrollment separately; any per-child figure is somebody's division. Cite it as derived, not as an ACF number.

Source: **Head Start Program Facts: Fiscal Year 2024**, Office of Head Start / HeadStart.gov, last updated **2025-08-14** — https://headstart.gov/program-data/article/head-start-program-facts-fiscal-year-2024 (FY2024 is the latest published; FY2025 is not yet up).

| FY2024 | Funded enrollment | Federal operations funding | Derived per slot |
|---|---|---|---|
| **National, all programs** | 715,873 | $11,753,187,818 | **$16,418** |
| **California, all programs** | 68,832 | $1,512,164,607 | **$21,969** |
| — CA Head Start Preschool | 44,106 | $911,978,478 | $20,677 |
| — CA Early Head Start | 24,020 | $584,285,656 | $24,325 |

**Verdict on $22,285:** against the CA all-program derived mean of $21,969 it is **+1.4%** — well inside the noise of program mix and fiscal year. Against the national $16,418 it is **+35.7%**. So the value is sound as a California-specific figure and must not be reused nationally.

**Independent corroboration from a second HHS source and a different method** (grantee-level financial reporting, medians not means): ASPE, *Head Start Spending Per Slot Varies Widely Across Grants…*, Issue Brief, **2026-02-02** — https://aspe.hhs.gov/sites/default/files/documents/6b4fa8b4c6e481fdb83cae736c632425/Head%20Start%20Spending%20Per%20Slot%20Brief_Final.pdf . CA median per slot: Early Head Start **$23,094**, Head Start Preschool **$20,215** (CA ranks 5th-highest for Preschool). National medians: $20,294 and $14,532. $22,285 sits between CA's two medians — exactly where a blended CA value should land.

**Definitional mismatches that matter for HotGap:**
1. **Numerator is federal-only; denominator includes match-funded slots.** ACF states funding "do[es] not include TTA funding awarded directly to grant recipients or states, or other funding sources," while funded enrollment "includes slots funded by state or other funds when used by grant recipients as required nonfederal match." This biases per-slot **down**.
2. **The 20% non-federal match is excluded.** If $22,285 is meant as *resource value delivered to the household*, the right comparator is total cost per slot ≈ federal ÷ 0.8 ≈ **$27,500** in California — about 23% higher. Whether the number is right depends entirely on which quantity PolicyEngine means.
3. **Early Head Start vs Preschool differ by several thousand dollars** per slot; one blended number misprices an infant against a 4-year-old.
4. **Per funded *slot*, not per enrolled *child*.**

##### (c) Age eligibility — **PARTLY CONFIRMED**

45 CFR 1302.12(b)(2): for Head Start Preschool a child must "*(i) Be at least three years old or, turn three years old by the date used to determine eligibility for public school in the community…; and, (ii) **Be no older than the age required to attend school.***" Early Head Start: younger than three (b)(1). Migrant/Seasonal: younger than compulsory school age (b)(3).

The "3 to compulsory-school age" framing is right. But **"a 5-year-old typically ages into kindergarten" is a modeling assumption, not the regulatory test.** The reg's cutoff is *compulsory* school age, which in most states is **6**, not 5 (kindergarten is not compulsory in a majority of states). A 5-year-old not yet required to attend school can remain Head Start–eligible. If HotGap drops Head Start value at age 5, it will understate benefits for families in states with a compulsory age of 6 — though in practice most Head Start Preschool enrollment is 3- and 4-year-olds, so the error is small in aggregate.

#### C10 — TANF — federal rules **CONFIRMED**; the Massachusetts figures are **REFUTED**

##### (a) 60-month federal lifetime limit and 20% hardship exemption — **CONFIRMED**

- **42 U.S.C. 608(a)(7)(A)**: a State "*shall not use any part of the grant to provide assistance to a family that includes an adult who has received assistance… attributable to funds provided by the Federal Government, for 60 months (whether or not consecutive)*"; (C)(i) hardship/battery exemption, (C)(ii) capped at "*20 percent of the average monthly number of families to which assistance is provided.*" — https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section608&num=0&edition=prelim (Title 42 current through P.L. 119-103, 2026-09-02)
- **45 CFR 264.1** (verified independently via the eCFR API at the 2026-09-01 snapshot): (a)(1) "*60 cumulative months, whether or not consecutive*"; (c) the 20% extension option, on grounds of hardship "*as defined by the State*" or domestic violence — https://www.ecfr.gov/current/title-45/section-264.1

Two nuances the review should carry: **45 CFR 264.1(b)(2)** — "*Only months of assistance that are paid for with Federal TANF funds (in whole or in part) count towards the five-year time limit*", so states routinely extend beyond 60 months using state MOE funds; and **264.1(b)(1)(i)** — months where the recipient is not the head-of-household or their spouse do not count (so child-only cases do not burn the clock).

##### (b) States set grant levels and earned-income disregards — **CONFIRMED**

- **42 U.S.C. 602(a)(1)(B)(iii)**: the State plan "*shall set forth objective criteria for the delivery of benefits and the determination of eligibility.*"
- ACF Office of Family Assistance, **ACF-OFA-IM-26-01, 2026-05-11**: "*States determine who is needy through their own objective financial eligibility rules… States also retain substantial discretion to set benefit levels for needy families… Title IV-A uses the term 'needy' but does not prescribe a single federal income or resource standard.*" — https://acf.gov/ofa/policy-guidance/temporary-assistance-needy-families-tanf-information-memorandum

Cite the IM, **not** 45 CFR 260.31 — that section only defines what counts as "assistance" and says nothing about who sets benefit levels.

##### (c) Massachusetts TAFDC — **REFUTED on all three figures**

**Maximum monthly payment standard, assistance unit of 5, effective 2025-04-01:**

| Housing | Monthly | Annual |
|---|---|---|
| Public / subsidized ("No Rent Allowance") | **$1,150.00** | **$13,800** |
| Private unsubsidized ("With Rent Allowance", +$40/mo) | **$1,190.00** | **$14,280** |

- DTA, *TAFDC Table of Need and Payment Standards 704.410–704.420* — https://www.mass.gov/lists/transitional-aid-to-families-with-dependent-children-tafdc-table-of-need-and-payment-standards-704410-704420 (PDF: https://www.mass.gov/doc/table-of-need-payment-standards/download). Full table, no-rent / with-rent: 1 $564/$604 · 2 $713/$753 · 3 $861/$901 · 4 $1,003/$1,043 · **5 $1,150/$1,190** · 6 $1,301/$1,341 · +$153 incremental.
- DTA, *Fiscal Year 2026 Report on Standard Budgets of Assistance for TAFDC*, **January 2026**, Table 1 ("Effective April 1, 2025") and Table 2 (HH5 annual grant **$13,800**, 36% of the 2026 FPL of $38,680) — https://www.mass.gov/doc/fiscal-year-2026-report-on-standard-budgets-of-assistance-for-transitional-aid-to-families-with-dependent-children-january-2026/download
- One-off: for **September 2026 only**, standards rise by **$500 per person under 19** (nonrecurring clothing allowance).

**Earned income disregards — per 106 CMR 704.270 / 704.280 / 704.281** (trans. 5/10/24):
1. **$200/month work-related expense deduction** from gross wages, per employed member (704.270(A)).
2. **100% earned income disregard for up to six consecutive months** after starting work (704.281(A)), provided household countable income stays ≤ 200% FPL. Renewable after a ≥30-day case closure with a different employer.
3. **After those six months: $200 WRE + 50% of the remainder** (704.281(B)). At application the 50% disregard requires TAFDC receipt within the prior four calendar months (704.280).

So the review's implicit "$200 + 50%" is the **steady-state** rule and is right as far as it goes, but it **misses the six-month 100% disregard**, which is where the real Massachusetts cliff lives.

**Break-even (countable income = payment standard; Need Standard = Payment Standard per the FY2026 report):**

| Scenario | Break-even gross earnings |
|---|---|
| One earner, public/subsidized | **$2,500/mo = $30,000/yr** |
| One earner, private housing | **$2,580/mo = $30,960/yr** |
| Two earners, public/subsidized | $2,700/mo = $32,400/yr |
| Two earners, private | $2,780/mo = $33,360/yr |

**Verdict on "≈$9,880/yr of TANF ending abruptly at $26–27k":**

1. **The grant is wrong.** $9,880 ÷ 12 = $823.33/month. That is not any row of the current household-of-5 table. It reconciles exactly with the **pre-April-2025 household-of-3 with-rent-allowance** figure ($783 base + $40 rent allowance = $823/mo, ×12 = $9,876). *(This provenance is an inference from the arithmetic, not a verified statement about PolicyEngine's internals — but the figure is definitely not a current HH5 value.)* The correct HH5 figure is **$13,800–$14,280/yr** — the review understates TANF by roughly $4,000–$4,400.
2. **The exit point is too low.** Correct single-earner break-even is **$30,000–$30,960**, not $26–27k. The review's range is close to the *pre-increase* HH5 break-even ($27,480–$28,440), consistent with a stale payment standard.
3. **"Abruptly" mischaracterizes the phase-out.** Above $200/month of earnings the grant falls **$0.50 per $1** — a 50% taper, not a notch. Massachusetts TAFDC has no gross-income ceiling that truncates a positive grant. The genuine cliff is the **expiry of the six-month 100% disregard**, where a working family near break-even drops from the full grant to near zero in a single month. If HotGap wants to show a TANF cliff in Massachusetts, that is the one to show.

**Stale-source hazard:** mass.gov's own *How to Calculate TAFDC Benefit* page (https://www.mass.gov/info-details/how-to-calculate-tafdc-benefit) still displays the **pre-April-2025** table (HH5 = $1,045/$1,085). Do not source from it.

#### C11 — Immigration / non-citizen eligibility

##### The 2025 change is the headline, and it is bigger than "the 5-year bar"

**P.L. 119-21 §10108 rewrote SNAP non-citizen eligibility outright.** It amended §6(f) of the Food and Nutrition Act to limit SNAP to: **U.S. citizens, U.S. nationals, lawful permanent residents, Cuban and Haitian entrants, and Compact of Free Association (COFA) citizens.** Everyone else is out, regardless of how long they have been here.

Source: **SNAP Implementation of the One Big Beautiful Bill Act of 2025 – Alien SNAP Eligibility**, FNS policy memo, dated **2025-10-31**.
- https://www.fna.usda.gov/snap/obbb-alien-eligibility (PDF: https://www.usda.gov/sites/default/files/guidance-documents/fns.snap-obbb-alien-eligibility.pdf)

Verbatim: "*Section 10108 of the OBBB amends section 6(f) of the Food and Nutrition Act of 2008 (FNA), limiting eligibility for SNAP to the following groups: U.S. citizens, U.S. nationals, lawful permanent residents (LPRs), Cuban and Haitian entrants, and Compact of Free Association (COFA) citizens.*"

Statutory text confirms (govinfo, P.L. 119-21 — https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm): §10108 amends 7 U.S.C. 2015(f) **to read as follows**, i.e. a full replacement, limiting eligibility to a resident of the United States who is (A) a citizen or national of the U.S.; (B) an alien lawfully admitted for permanent residence; (C) a Cuban/Haitian entrant under §501(e) of the Refugee Education Assistance Act of 1980; or (D) an individual lawfully residing under a Compact of Free Association. Because the paragraph was replaced rather than amended in part, the humanitarian categories are gone by omission.

Groups the memo's Attachment 1 moves from eligible to **"Not eligible"**:

| Group | Before OBBB | After OBBB |
|---|---|---|
| Refugees (INA §207) | Eligible immediately | **Not eligible** |
| Individuals granted asylum (INA §208(b)) | Eligible immediately | **Not eligible** |
| Victims of severe trafficking | Eligible immediately | **Not eligible unless an LPR** |
| Parolees (INA §212(d)(5)) | Eligible after 5-year wait | **Not eligible** |

**Effective on enactment, 2025-07-04.** States must apply the new criteria to new applicants at initial certification immediately, and to existing households **at recertification** — at which point "*the alien is no longer eligible for SNAP and must be removed from the household at that time.*" Households losing eligibility at recertification are not subject to an over-issuance claim for the interim.

**The 5-year bar still exists, but now applies only to LPRs.** "*Aliens continue to be subject to a 5-year waiting period, unless exempted by PRWORA*" (8 U.S.C. 1612). Retained exemptions for LPRs, per the memo: under 18; 40 qualifying work quarters; blind or disabled; lawfully residing and 65+ on 1996-08-22; U.S. military connection; Amerasian immigrant; American Indian born abroad; certain Hmong or Highland Laotian tribal members. Non-citizen U.S. nationals, Cuban/Haitian entrants and COFA citizens are eligible **immediately**, with no waiting period.

**Modeling implication for HotGap:** a model that encodes "PRWORA qualified alien + 5-year bar + humanitarian exceptions" for SNAP is describing pre-July-2025 law. For FY2026 the correct SNAP rule is the five-category allowlist above. Verification runs through SAVE.

##### (a) The PRWORA 5-year bar — **CONFIRMED**, with two citation corrections

**8 U.S.C. 1613(a)**: "*an alien who is a qualified alien (as defined in section 1641) and who enters the United States on or after August 22, 1996, is not eligible for any Federal means-tested public benefit for a period of 5 years beginning on the date of the alien's entry.*" — https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title8-section1613&num=0&edition=prelim (Title 8 current through P.L. 119-83, 2026-04-13; §§1611–1613 and 1641 were last amended by P.L. 118-42 on 2024-03-09 — **no 2025 or 2026 amendments**)

**§1613(b) exceptions (people):** (b)(1) refugees (INA §207), asylees (§208), withholding of deportation/removal, Cuban/Haitian entrants, Amerasian immigrants; (b)(2) veterans with honorable discharge, active-duty servicemembers, and their spouse / unmarried dependent child / unremarried surviving spouse; (b)(3) COFA citizens.

> **Correction 1.** "LPRs with 40 qualifying quarters" is **not** a §1613(b) exception. It is **§1612(a)(2)(B)** (SSI/SNAP) and **§1612(b)(2)(B)** (TANF/Medicaid), and per ACF it applies *once the 5-year bar has expired*. Listing it among the bar's exceptions overstates it.
>
> **Correction 2.** **§1613(c) is a list of exempt *benefits*, not people** — emergency Medicaid, school lunch/child nutrition, immunizations and communicable-disease treatment, IV-B/IV-E foster care and adoption assistance, student aid, ESEA means-tested programs, **Head Start**, WIOA Title I, and (L) SNAP benefits provided to individuals **under 18**. That Head Start appears here matters directly for HotGap: Head Start is outside the means-tested-benefit bar entirely.

"Qualified alien" is defined at **8 U.S.C. 1641(b)**: LPR; asylee; refugee; parolee for ≥1 year; withholding of deportation/removal; pre-1980 conditional entrant; Cuban/Haitian entrant; COFA resident. §1641(c) adds VAWA battered aliens and T-visa holders.

##### (b) Program-by-program application — **CONFIRMED**

- **SNAP.** The wait runs through §1613(a) and §1612(a)(2)(L); exemptions for under-18 (§1612(a)(2)(J)), blind/disabled (§(F)(ii)), 40 quarters (§(B)), 65+ and lawfully residing on 1996-08-22 (§(I)). Mirrored at 7 CFR 273.4(a)(6)(ii). **But see (c) — for FY2026 these now matter only for LPRs.**
- **Medicaid.** HHS, *Interpretation of "Federal Means-Tested Public Benefit"*, **62 FR 45256, 1997-08-26**: "*the benefit programs that fall within this definition… are Medicaid and Temporary Assistance for Needy Families (TANF).*" — https://www.federalregister.gov/documents/1997/08/26/97-22683/ . Implemented at **42 CFR 435.406(a)(2)(ii)**: qualified noncitizens subject to the bar are limited to emergency services. The **ICHIA/CHIPRA §214 option** (42 U.S.C. 1396b(v)(4)(A)) lets a state cover lawfully residing children and pregnant women "*notwithstanding sections 1611(a), 1612(b), 1613, and 1631 of title 8*"; **39 states + DC + 3 territories** have elected it — https://www.medicaid.gov/medicaid/enrollment-strategies/medicaid-and-chip-coverage-of-lawfully-residing-children-pregnant-women (updated 2026-04-02).
- **TANF — a state option after the bar.** 8 U.S.C. 1612(b)(1) authorizes states to determine qualified aliens' eligibility for designated programs; §1612(b)(3)(A) designates TANF. ACF **TANF-ACF-PI-2010-05**: states "*have the authority to decide whether or not to provide a TANF-funded federal public benefit… once the 5 year bar (unless exempt) has expired… Congress did not give States the authority to deny eligibility to all qualified aliens.*"

##### (c) Medicaid, Medicare and ACA changes under P.L. 119-21 — **CONFIRMED with one important correction**

The SNAP change (§10108) is described above. The rest:

| Program | Section | What it does | **Effective** |
|---|---|---|---|
| SNAP | §10108 | Replaces 7 U.S.C. 2015(f); eligibility limited to citizens/nationals, LPRs, Cuban-Haitian entrants, COFA | **2025-07-04** |
| Medicaid / CHIP | §71109 | Adds SSA §1903(v)(5): **no federal financial participation** unless in the same four categories | **2026-10-01** |
| Medicare | §71201 | Adds SSA §1899C, same four categories; for those already enrolled, applies ~18 months after enactment | **≈2027-01-04** |
| ACA premium tax credits | §71301 | IRC §36B(e)(2)(B) "eligible alien" = LPR, Cuban/Haitian entrant, COFA | tax years after **2026-12-31** |
| ACA PTC | §71302 | Strikes §36B(c)(1)(B) (PTC for lawfully present immigrants under 100% FPL who are Medicaid-ineligible by status) | tax years after **2025-12-31** |
| **TANF** | — | **Unchanged.** No amendment to 8 U.S.C. 1611/1612/1613/1641; no TANF provision in the act | — |

> **Correction.** For Medicaid, §71109 is an **FFP limitation effective 2026-10-01, not an eligibility repeal**, and it reads "*except as provided in paragraphs (2) and (4)*" — it **expressly preserves emergency Medicaid (§1903(v)(2)) and the CHIPRA §214 / ICHIA option (§1903(v)(4))**. Lawfully residing children and pregnant women in the 39 electing states keep federally matched coverage. CMS **SHO #26-001, 2026-04-08** confirms: states "*must continue to apply the five-year waiting period to LPRs in accordance with 8 U.S.C. § 1613(a)… must continue to except Cuban/Haitian entrants and COFA migrants*" — https://www.medicaid.gov/federal-policy-guidance/downloads/sho26001.pdf . §71110 separately caps the emergency-Medicaid FMAP at the regular rate from 2026-10-01.

Also note: the 5-year bar and its LPR exemptions **survive** P.L. 119-21 — FNS Q&A #1 (2025-12-09), Q3: "*OBBB did not make changes to the 5-year waiting period requirement and exceptions.*" And the effective dates are **staggered across four different dates**; a model that applies one cutover date to all programs will be wrong for policy year 2026, when SNAP has already changed but Medicaid has not (Medicaid changes 2026-10-01, i.e. two weeks after this review).

**Stale-source hazard: 7 CFR 273.4 has not been conformed to P.L. 119-21.** It still lists refugees, asylees, parolees and trafficking victims as SNAP-eligible. FNS's own "SNAP Eligibility for Non-Citizens" page is now a stub reading "We are in the process of updating this page with the changes made by the One Big Beautiful Bill Act," and two related pages return "Page or Content Archived." Anything sourced from the CFR or those pages is superseded.

---

#### Verdict summary

| Claim | Verdict |
|---|---|
| C1 — SSI 2026 FBR $994/$11,928, $20 + $65 + ½, $9,438 at $6k earnings | **CONFIRMED** |
| C2 — SSI resources $2,000/$3,000, no 2026 change | **CONFIRMED** |
| C3 — SGA 2026 $1,690/mo (~$20k/yr), TWP/EPE notch, avg SSDI ~$19k | **CONFIRMED** ($19,623/yr) |
| C4 — SSDI the larger disabled working-age population | **CONFIRMED** (6,140K vs 3,710K under 65) |
| C5 — §1619(b) thresholds CA/NY/TX | **CONFIRMED** ($66,078 / $68,654 / $53,165) |
| C6 — SNAP FY2026 deductions, tests, SUA, BBCE | **PARTLY** — parameters right; the 24% marginal rate is a lower bound, and "Utah" is 1 of 7 non-BBCE states |
| C7 — ABAWD 18–64, dependent child under 14; student rule 18–49 | **CONFIRMED** |
| C8 — child support received = unearned income; state deduction option | **CONFIRMED** |
| C9a — Head Start eligibility duration | **PARTLY** — right substance, **wrong paragraph** (it is (j)(1), not (k)/(l)), and there is an income-change carve-out |
| C9b — $22,285/child in California | **PARTLY** — good for CA (+1.4% vs derived $21,969); **35.7% too high nationally**; ACF publishes no per-child figure |
| C9c — age 3 to compulsory school age | **PARTLY** — reg cutoff is *compulsory* school age (usually 6), not kindergarten entry at 5 |
| C10a/b — 60-month limit, 20% hardship, state-set grants/disregards | **CONFIRMED** |
| C10c — MA TAFDC $9,880/yr ending at $26–27k | **REFUTED** — $13,800–$14,280/yr, break-even ~$30,000–$30,960, and it tapers rather than ending abruptly |
| C11 — PRWORA 5-year bar, exceptions, 2025–26 changes | **PARTLY** — bar and exceptions confirmed, but two citations misplaced and the P.L. 119-21 rewrite is far bigger than a change to the bar |

#### What the review got wrong or overstated

1. **The SNAP marginal rate is understated for most renters.** "≈24% of gross, ≈$240 per $1,000" holds only when the excess shelter deduction is pinned at the $744 cap or is zero. In the common uncapped-positive region the rate is **36% (≈$360 per $1,000)**, because the deduction shrinks by 50¢ for every dollar of counted income. Elderly/disabled households have no cap at all and sit in the 36% region throughout. This is the single most consequential error found.
2. **The Massachusetts TANF figures are from a superseded table and the wrong household size.** $9,880/yr is ≈ the pre-April-2025 household-of-**3** with-rent-allowance amount; the correct household-of-5 standard is **$13,800–$14,280/yr**, and break-even is **~$30,000–$30,960**, not $26–27k.
3. **The Massachusetts cliff is misidentified.** TAFDC tapers at 50¢ on the dollar; it does not end abruptly at break-even. The real notch is the **expiry of the six-month 100% earned-income disregard** (106 CMR 704.281(A)) — which the review does not mention at all.
4. **The Head Start regulatory citation is wrong.** Eligibility duration is **45 CFR 1302.12(j)(1)**, not (k)/(l) — (k) is Records, (l) is staff-violation policies. And "regardless of income changes" is too strong: the paragraph contains an explicit carve-out for "compelling reasons… such as when there is a change in the child's family income and there is a child with a greater need."
5. **$22,285 per Head Start child is California-specific and must not be generalized** — it is 35.7% above the national derived figure of $16,418. Separately, ACF publishes no "cost per child" at all; it is a derived quotient whose numerator is federal-only while its denominator includes match-funded slots, so it understates total resource value by roughly 20–25%.
6. **Utah is named as if it were the asset-test exception.** There are **seven** non-BBCE jurisdictions: Kansas, Mississippi, Missouri, South Dakota, Tennessee, Utah, Wyoming. Also, in the 46 BBCE states the 130% gross test usually is **not** binding — BBCE gross limits run 130%–200% FPL.
7. **C11 understates the 2025 change.** P.L. 119-21 §10108 did not adjust the 5-year bar; it **replaced 7 U.S.C. 2015(f) outright**, cutting SNAP to citizens/nationals, LPRs, Cuban-Haitian entrants and COFA migrants, and removing refugees, asylees, parolees and trafficking victims entirely. Framing FY2026 SNAP as "PRWORA qualified alien + 5-year bar + humanitarian exceptions" describes repealed law. Two citation fixes: 40 qualifying quarters is §1612, not §1613(b); §1613(c) lists exempt benefits, not exempt people.
8. **Effective dates are staggered and matter for policy year 2026.** SNAP non-citizen rules changed 2025-07-04; Medicaid/CHIP FFP changes 2026-10-01; Medicare ≈2027-01-04; PTC 2026-01-01 and 2027-01-01. A single cutover date will be wrong. And §71109 preserves emergency Medicaid and the CHIPRA §214 option — it is an FFP limit, not an eligibility repeal.
9. **Two CFR parts are stale against statute and will mislead anyone reading them today:** 7 CFR 273.9(d)(6)(ii)(C) still allows internet fees in shelter costs (repealed by P.L. 119-21 §10104), and 7 CFR 273.4 still lists refugees and asylees as SNAP-eligible (superseded by §10108).
10. **Smaller precision points.** SGA is tested on *countable* earnings after IRWE and subsidies, not gross — a gross-wage comparison places the SSDI cliff early. SSI is computed monthly, so annualizing the $1-for-$2 formula is exact only for level earnings. And $11,928 is the federal rate only: California adds ~$240/month in state supplement.

#### Sources I could not reach

- **`www.ssa.gov` — blocked outright** at the network edge (Akamai "Access Denied", HTTP 403) for every path, via both WebFetch and curl with full browser headers. This covers the SSI Federal Payment Amounts page, the SGA page, the COLA fact sheet, the *Monthly Statistical Snapshot* and the *Annual Statistical Supplement*. Worked around by substituting `secure.ssa.gov` (POMS) and federalregister.gov, both primary, for C1/C2/C3/C5.
- **SSA *Monthly Statistical Snapshot, July 2026*** (C3 average benefit, C4 populations) — read only from a **Wayback Machine mirror** of https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/ , capture **2026-08-26**. Internal arithmetic reconciles, but that only proves faithful transcription, not correctness; a second capture from a different month could not be obtained because the Internet Archive went offline mid-session. **These two figures rest on a single mirror and should be re-confirmed from ssa.gov directly before publication.** Every other figure in this report came from a live .gov server.
- **Exact SSI/Social Security concurrent-recipient count for ages 18–64** — not published at that granularity in the Snapshot; the *SSI Annual Statistical Report* section returned zero bytes before the Archive went down. Not load-bearing: the C4 conclusion holds across the full bound (2,700K–3,783K).
- **`www.ecfr.gov` HTML** blocks WebFetch (302 to an unblock page); used the eCFR versioner API via curl instead, at the 2026-09-01 snapshot. No loss of fidelity.
- **`www.fns.usda.gov` / `www.fna.usda.gov` memo bodies** are client-rendered; the text lives in PDFs on `www.usda.gov/sites/default/files/guidance-documents/`, which return 403 without a `Referer` and `Sec-Fetch-*` headers. Retrieved successfully once those were supplied.
- **`mass.gov` page views (`/info-details/…`, `/service-details/…`) return 403** to automated clients; `/doc/…/download` endpoints work but rate-limit quickly. The payment standards table and 106 CMR 704 were retrieved; the *How to Calculate TAFDC Benefit* page could not be fetched directly (it is also stale, so this is no loss).
- **FNS's non-citizen eligibility landing pages** are stubs or archived pending OBBB updates; the substantive content came from the October and December 2025 policy memos instead.


---

## Appendix D. ACS PUMS "reach" data claims (Census Bureau, BLS, SSA), with the builder re-run on real PUMS files

### Validation: HotGap "reach" metric vs. primary Census/BLS/SSA sources

Validated 2026-09-14. Builder read: `/Users/mikewolfd/Work/HotGap/scripts/build-reach.mjs` (not modified).
Method note: I downloaded the actual 2023 1-Year PUMS for AK/DC/ND/VT/WY from www2.census.gov and
re-ran the builder's exact algorithm. It reproduces the shipped `core/data/reach.json` cell-for-cell
(e.g. AK single-0 p50 = 33600, AK married-0 p25 = 13400, DC single-0 p25 = 300), so the empirical
figures below describe the shipped artifact, not a guess about it. Uncertainty figures were computed
with the Census's own SDR replicate-weight formula — a method the builder does not use — so that
check is not just the builder agreeing with itself.

---

#### D1 — Variable semantics: CONFIRMED. Builder's use of them: PARTLY (one hard error).

**Source:** 2023 ACS PUMS Data Dictionary, dated **October 17, 2024**,
https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2023.txt

| Var | Dictionary text | Codes |
|---|---|---|
| `WAGP` | "Wages or salary income past 12 months (use ADJINC to adjust WAGP to constant dollars)" | b = N/A (<15 yrs); 0 = None; 4..999999 rounded & top-coded |
| `SEMP` | "Self-employment income past 12 months (use ADJINC…)" | **−10000..−4 = Loss** (bottom-coded); 4..999999 |
| `HINCP` | "Household income (past 12 months, use ADJINC…)" | −59999..9999999; b = N/A (GQ/vacant) |
| `AGEP` | "Age" | 0 = under 1; 1..99 top-coded |
| `RELSHIPP` | "Relationship", Character 2 | **20 = Reference person**; 21/23 = opposite-/same-sex spouse |
| `HHT` | "Household/family type", Character 1 | 1 married-couple; 2/3 other family, male/female householder no spouse; 4/6 nonfamily, male/female householder **living alone**; 5/7 nonfamily, **not** living alone |
| `NOC` | "Number of own children in household (unweighted)" | 0..19; b = N/A (GQ/vacant) |
| `WGTP` | "Housing Unit Weight" | **0 = Group quarters place holder record**; 1..9999 |
| `PWGTP` | "Person's weight" | 1..9999 |
| `ADJINC` | "Adjustment factor for income and earnings dollar amounts (6 implied decimal places)" | **1019518 → 2023 factor 1.019518** |

Every claim about the variables checks out, including that `SEMP` can be negative and that `ADJINC`
for 2023 is 1.019518.

**Builder error — ADJINC is never applied.** 2023 Accuracy of the PUMS, p. 21
(https://www2.census.gov/programs-surveys/acs/tech_docs/pums/accuracy/2023AccuracyPUMS.pdf):
> "Dollar variables **must** be adjusted by the inflation adjustment factors supplied on the PUMS
> files before they are used to form estimates… The factor is necessary because the ACS collects
> data on the past twelve months of income in each of the twelve months of the year. Responses
> therefore often include amounts from both the current year and the previous year. The adjustment
> factor will convert amounts into consistent 2023 dollars."

`build-reach.mjs` reads only SERIALNO/WAGP/SEMP from the person file and multiplies by a bare 1.12.
The result is **not** in 2023 dollars before the 2026 uplift. Understates by 1.95%. See D4.

**Also available and unused:** `PERNP` — "Total person's earnings", the Census's own WAGP+SEMP
aggregate, which preserves losses (−10000..1999998). It is the drop-in replacement for
`Math.max(0,WAGP) + Math.max(0,SEMP)`.

**Is summing over all members the right "household earnings" concept?** By Census's definition, yes —
but it is the wrong concept for HotGap's axis. See D8.

---

#### D2 — CONFIRMED, and worse in the shipped data than the review states.

**No age restriction exists in either variable.** The dictionary entries for HHT and NOC contain no
age term. "Own Child" is defined in the 2023 ACS Subject Definitions (p. 86,
https://www2.census.gov/programs-surveys/acs/tech_docs/subject_definitions/2023_ACSSubjectDefinitions.pdf):
> "Own Child – A never-married child **under 18 years** who is a son or daughter by birth, a
> stepchild, or an adopted child **of the householder**."

So `NOC = 0` means "no own children under 18 of the householder" — which is true of an 80-year-old
couple, and `HHT = 4|6` ("Nonfamily household: Male/Female householder: Living alone") is true of
any solo resident at any age. Census's family-type classification is purely structural; nothing
excludes over-65 households from these cells.

**Measured, from the shipped `core/data/reach.json`:**
- `single-0` p25 = **$0 in 50 of 51 states** (only DC differs, at $300).
- `married-0` p25 = **$0 in 27 of 51 states**.

**Measured share of 65+ householders in those cells** (weighted, AK/DC/ND/VT/WY):

| State | single-0 65+ | married-0 65+ |
|---|---|---|
| DC | 22.7% | 30.8% |
| AK | 31.5% | 34.5% |
| ND | 33.8% | 40.8% |
| WY | 41.9% | 42.1% |
| VT | 45.8% | 46.3% |

**Effect of the review's recommended fix** (householder age 18–64), p25 of household earnings:

| State | single-0 now → filtered | married-0 now → filtered |
|---|---|---|
| WY | $0 → $9,100 | $0 → $60,300 |
| VT | $0 → $10,600 | $0 → $73,900 |
| ND | $0 → $22,400 | $2,000 → $84,000 |
| AK | $0 → $20,500 | $13,400 → $69,400 |
| DC | $300 → $47,000 | $67,200 → $153,400 |

The medians move too (WY single-0 $10,100 → $34,700; VT married-0 $67,200 → $114,200), so this is
not only a bottom-tail artifact — the whole ladder is depressed.

**Simpler than the review's prescription:** `HHLDRAGEP` — "Age of the householder", 15..99 top-coded —
is on the **housing** record. No person-file `RELSHIPP = 20` join is needed.

**A second defect the review missed:** `single-0` is `HHT === 4 || HHT === 6`, i.e. **living alone
only**. Nonfamily households not living alone (HHT 5/7 — roommates, unmarried partners without
children) are **8.8% of occupied households** in these five states and are dropped entirely, even
though the tool's "single, no children" scenario describes them. That exclusion biases the single-0
ladder further toward old, low-earning solo residents. Overall the 8 archetypes cover **83.4%** of
occupied households; the rest are HHT 5/7 no-children (8.8%), HHT 2/3 with NOC = 0 (6.4%, single
householders living with adult relatives), and 4+ own children (1.2%, matched by no bucket because
`single-3`/`married-3` test `noc === 3` rather than `noc >= 3`).

---

#### D3 — PARTLY. The review's "fall 2025" / "early 2026" are both wrong for PUMS specifically.

Source: census.gov ACS updates, https://www.census.gov/programs-surveys/acs/news/updates/2025.html
and https://www.census.gov/programs-surveys/acs/news/updates/2026.html

| Product | Scheduled | Actual |
|---|---|---|
| 2024 ACS 1-year **estimates** | Sept 11, 2025 | Sept 11, 2025 |
| 2024 ACS 1-year **PUMS** | Oct 16, 2025 | **Dec 4, 2025** |
| 2020–2024 ACS 5-year estimates | Dec 11, 2025 | Dec 11, 2025 |
| 2020–2024 ACS 5-year **PUMS** | Jan 22, 2026 | **Mar 5, 2026** |

Both PUMS releases slipped ~7 weeks past schedule. The 2024 PUMS Data Dictionary is dated
**October 16, 2025** (the original target), which is why a document-date check would read as
"on time" — it isn't the release date.

**"Use ACS 2024" is checkable and cheap:** ADJINC for 2024 = **1015250** (1.015250); `HHT`, `NOC`,
`HHLDRAGEP`, `WAGP`, `SEMP` code lists are byte-identical to 2023. Bulk zips verified live
(`csv_hwy.zip` under `/pums/2024/1-Year/` and `/pums/2024/5-Year/` both return HTTP 206 on a range
request). Switching `YEAR` to "2024" is a one-line change plus the ADJINC fix.

**Forward caution:** as of Aug 2026 census.gov says "The release date for the 2025 ACS 1-year
estimates is being determined" pending a departmental disclosure-avoidance order. Do not assume a
2025 vintage will exist on the usual schedule.

---

#### D4 — PARTLY. 1.12 is a fair *wage-growth* factor but a ~1.5% low *total* factor.

**SSA Average Wage Index** (www.ssa.gov is Akamai-403 to every client; obtained from the Federal
Register, the statutory publication of the same SSA determination):
- **AWI 2023 = $66,621.80** — 89 FR 85276, published Oct 25, 2024.
- **AWI 2024 = $69,846.57** — "Cost-of-Living Increase and Other Determinations for 2026",
  90 FR doc. 2025-19763, published **Nov 3, 2025**,
  https://www.federalregister.gov/documents/2025/11/03/2025-19763/cost-of-living-increase-and-other-determinations-for-2026
  → 2023→2024 = **+4.84%**. This is the latest published AWI; the 2025 value is due ~Nov 2026.

**BLS ECI, wages and salaries, private industry workers, index NSA** (`CIU2020000000000I`, via
api.bls.gov): CY2023 quarterly avg **161.95** (159.5/161.3/162.9/164.1); 2026 Q1 **177.672**,
Q2 **179.304** (12-month change 3.1%). Projecting Q3/Q4 2026 at that 3.1% → CY2026 avg 179.71.

**BLS CES average hourly earnings, total private** (`CES0500000003`): CY2023 avg **$33.696**;
2026 Jan–Aug actual (Aug = $37.75, +3.09% y/y), Sep–Dec projected at that y/y → CY2026 avg **$37.649**.

**BLS CES average weekly earnings, total private** (`CES0500000011`): CY2023 **$1,159.40** →
CY2026 **$1,292.94** (same projection basis). Weekly hours fell 34.41 → 34.30 over the span, so
this runs slightly below the hourly series.

| Series | CY2023 → CY2026 factor | × ADJINC 1.019518 = correct total | Builder's 1.12 vs. correct |
|---|---|---|---|
| ECI wages & salaries, private | **1.1097** | 1.1313 | −1.00% |
| CES average weekly earnings | **1.1152** | 1.1369 | −1.49% |
| CES average hourly earnings | **1.1173** | 1.1391 | −1.68% |
| SSA AWI (2024 actual, 2025–26 extended by AHE) | **1.1259** | 1.1479 | −2.43% |

**Verdict:** as a pure nominal wage-growth factor, 1.12 sits inside the primary-source band
1.110–1.126 — **reasonable, very slightly high** against the cleanest series (ECI, which holds
occupation/industry mix fixed and so measures pay growth rather than composition). But the builder
uses 1.12 as the *entire* raw-PUMS → 2026 conversion, and the Census-mandated ADJINC step is
missing, so the effective total is **low by 1.0–2.4%**; the defensible composite is **≈1.131–1.148**,
centred ~1.138. Recommend ADJINC × ECI, i.e. `1.019518 * 1.110 ≈ 1.132`, and re-derive annually.

**Caveat that matters more than the 1.5%:** a scalar cannot move a $0 percentile. Across p0–p25 of
most `single-0` and `married-0` cells the inflation factor is arithmetically irrelevant — D2 is the
dominant error, not D4. A uniform scalar also assumes proportional growth at every percentile,
which the 2021–2023 low-wage compression and its 2024–2026 reversal both violate.

---

#### D5 — REFUTED. A 30-household floor is not a reliability criterion, and Census prescribes a method, not a count.

**Census guidance** (2023 PUMS User Guide, dated **October 17, 2024**,
https://www2.census.gov/programs-surveys/acs/tech_docs/pums/2023ACS_PUMS_User_Guide.pdf, §B pp. 10–11;
and 2023 Accuracy of the PUMS pp. 12–13):
> "Each PUMS housing unit and person record contains **80 PUMS replicate weights**… `WGTP1-WGTP80`:
> Replicate Housing Unit weighting variables, used for generating the standard error and margin of
> error for housing unit and household characteristics… Multiply this sum by the quantity 4/80…
> To obtain a 90% confidence level margin of error, multiply the SE by 1.645."

Census sets **no minimum record count anywhere** in the Accuracy or User Guide documents. It sets a
variance method. The builder computes no standard errors, ships no margins of error, and reads none
of `WGTP1..WGTP80` — which are present in the very files it already downloads.

**I computed the SDR margins of error the Census way** (variance = (4/80)·Σ(Xr−X)², MOE₉₀ = 1.645·SE),
on the builder's own cells, 2023 dollars:

| Cell | n | median | 90% MOE | as % |
|---|---|---|---|---|
| ND single-2 | 37 ✅ passes floor | $81,000 | ±$79,738 | ±98% |
| DC single-2 | 44 ✅ | $66,200 | ±$53,314 | ±81% |
| AK single-2 | 69 ✅ | $65,000 | ±$31,609 | ±49% |
| DC married-1 | 163 ✅ | $252,000 | ±$33,015 | ±13% (its **p25** is ±38%) |
| AK married-0 | 698 ✅ | $85,000 | ±$10,098 | ±12% |
| DC married-3 | 29 ❌ nulled | $246,000 | ±$175,311 | ±71% |

A cell with n = 37 passes the floor and carries a ±98% interval on its own median. A cell with
n = 29 is discarded while a materially identical one at n = 44 is published with ±81%. The floor is
uncorrelated with reliability because it cannot see the design effect, the weight dispersion, or the
ACS's clustered sample. **Defensible replacement:** compute the SDR MOE per percentile and suppress
(or band) on the MOE, not the count — Census's own rule of thumb is that an estimate whose MOE
exceeds a large fraction of the estimate should not be presented as a point value.

**One trap to avoid in that fix:** where p25 = $0 in all 80 replicates the SDR SE is exactly 0,
which looks clean but isn't. Accuracy of the PUMS p. 13:
> "If the SDR method using the replicate weight gives a SE of zero for an estimate that is not
> controlled, use the GVF method with the design factors to obtain a SE for that estimate."

---

#### D6 — CONFIRMED.

**All states get 1-Year PUMS.** The official record-count file lists **52** state-level housing
files: FIPS 01–56 plus **72 (Puerto Rico)** — i.e. 50 states + DC + PR.
https://www2.census.gov/programs-surveys/acs/tech_docs/pums/estimates/pums_record_count_23.csv

**The 65,000 threshold is a *published-geography* rule, not a state/PUMS rule.** census.gov ACS
guidance (https://www.census.gov/programs-surveys/acs/guidance/estimates.html): 1-year estimates
are "Data for areas with populations of 65,000+", 5-year "all areas". Every state and DC clears
65,000 by three orders of magnitude, so the threshold never binds at state level; it binds on
counties, places and PUMAs.

**2023 1-Year housing / person records, smallest states** (official CSV; I verified these match the
downloaded `psam_h*.csv` / `psam_p*.csv` row counts exactly):

| State | Housing records | Person records |
|---|---|---|
| Wyoming | **3,002** | 6,024 |
| Vermont | **3,837** | 6,810 |
| Alaska | **3,924** | 6,868 |
| District of Columbia | **3,985** | 6,735 |
| North Dakota | **4,243** | 8,403 |
| (California, for scale) | 167,075 | 392,318 |
| US total | 1,620,290 | 3,405,809 |

**The usable number is smaller still.** Of Wyoming's 3,002 housing rows, 200 are GQ placeholders
(WGTP = 0, correctly skipped by the builder) and 256 are vacant units — leaving **2,546 occupied
households** to be split across 8 archetypes × 21 percentiles. 2024 counts are essentially
identical (WY 3,024 / VT 3,875 / AK 4,016 / DC 3,914 / ND 4,345), so moving to the 2024 vintage buys
freshness, not precision. **For small states the 5-year PUMS is the answer to D5, not a bigger
1-year floor.**

---

#### D7 — CONFIRMED.

**API key required:** census.gov microdata API page
(https://www.census.gov/data/developers/data-sets/census-microdata-api.html):
> "All data queries to the Census Data API now require an API key."

**Verified empirically both ways:**
- `GET https://api.census.gov/data/2023/acs/acs1/pums?get=WAGP,SEMP&for=state:56` with no key →
  HTTP **302** → a page titled **"Missing Key"**.
- Range `GET https://www2.census.gov/programs-surveys/acs/data/pums/2024/1-Year/csv_hwy.zip` with no
  key, no auth, no headers → HTTP **206 Partial Content**. Same for the 2020–2024 5-Year path.

The builder's keyless `curl` against www2.census.gov is the correct access path and needs no change.

---

#### D8 — CONFIRMED as a Census concept; the concept is mismatched to the tool's axis.

**"Earnings" is exactly WAGP + SEMP.** 2023 ACS Subject Definitions, p. 93:
> "Earnings – Earnings are defined as the sum of wage or salary income and net income from
> self-employment. 'Earnings' represent the amount of income received regularly for people **16
> years old and over** before deductions…"

**Summing over all members is Census's household concept.** Same document, p. 93:
> "Income of Households – This includes the income of the householder and **all other individuals 15
> years old and over in the household, whether they are related to the householder or not**."

**What WAGP+SEMP excludes relative to HINCP** — 6 of the 8 ACS income components: `INTP` (interest,
dividends, net rental), `SSP` (Social Security), `SSIP` (SSI), `PAP` (public assistance), `RETP`
(retirement), `OIP` (all other — unemployment comp, workers' comp, VA payments, alimony, child
support). The builder's docstring justification for earnings-not-income is sound and correctly
stated.

**But the "all members" part is the wrong join for this metric.** The tool's escape threshold is an
employment-income figure for **one adult** with the spouse fixed. The reach ladder is total
household earnings including every earner. Measured across AK/DC/ND/VT/WY:

| Archetype | % of HHs with an earner who is not householder or spouse | % of aggregate cell earnings from those people |
|---|---|---|
| single-1 | 43.9% | **29.3%** |
| single-2 | 45.6% | **30.6%** |
| married-0 | 13.8% | 5.7% |
| married-1 | 21.7% | 3.8% |
| married-2 | 15.2% | 1.9% |

Nearly a third of what the single-parent ladders call "household earnings" comes from adult
relatives — most often the householder's own 18+ children, who are invisible to `NOC` (which counts
only under-18s). Under-18 earners contribute just 0.44%–1.07%, so this is not a teenage-summer-job
artifact. The single-parent ladders are therefore **too high** by roughly the amount that D2's
retiree problem makes the childless ladders too low, and the two errors do not cancel — they hit
different archetypes in opposite directions.

---

#### What the review got wrong or overstated

1. **Release dates.** "Fall 2025" for the 2024 1-Year PUMS and "early 2026" for the 2020–2024
   5-Year PUMS are both off. The *estimates* landed Sept 11, 2025 and Dec 11, 2025; the *PUMS* files
   landed **Dec 4, 2025** and **Mar 5, 2026**, each ~7 weeks past schedule. The review appears to
   have read estimate-release dates as PUMS dates.
2. **The recommended age fix is more complicated than it needs to be.** `AGEP 18–64` on
   `RELSHIPP = 20` requires a person-file join; `HHLDRAGEP` (15..99) is already on the housing
   record the builder is parsing.
3. **"25th-percentile household earnings are $0 in most states" is understated for `single-0`** —
   it is $0 in **50 of 51**, not merely "most". It is correctly stated for `married-0` (27 of 51).
4. **The review treats "use ACS 2024" as the freshness fix but does not flag that 2024 changes
   nothing about precision** — the small-state record counts are flat year over year, and the
   review's framing risks trading the real fix (5-year PUMS, or MOE-based suppression) for a
   cosmetic one.
5. **The review missed the ADJINC omission entirely**, which is the one unambiguous, Census-documented
   *error* in the builder as opposed to a modelling choice.

#### What the builder gets wrong

1. **ADJINC is never applied.** Census: dollar variables "must be adjusted… before they are used to
   form estimates." Costs 1.95%; the 1.12 constant does not absorb it. *(D1, D4)*
2. **No age restriction on `single-0` / `married-0`**, so 23%–46% of those cells are 65+ householders
   and the bottom of the ladder is structurally $0. This is the largest defect. *(D2)*
3. **`single-0` is living-alone-only** (`HHT 4|6`), dropping HHT 5/7 — 8.8% of households, and the
   younger, higher-earning part of the "single, no kids" population. Overall archetype coverage is
   83.4% of occupied households. *(D2)*
4. **`noc === 3` should be `noc >= 3`.** Households with 4+ own children (1.2% of households) match
   no bucket at all.
5. **The n ≥ 30 floor is not a reliability test.** Published cells carry 90% margins of error up to
   ±98% of the estimate; the builder ships no uncertainty and reads none of `WGTP1..WGTP80`, which
   are already in the downloaded files. *(D5)*
6. **Household earnings sums every member's pay**, contributing ~30% of single-parent cell earnings
   from non-householder adults, against a threshold defined on one adult. *(D8)*
7. **Self-employment losses are silently floored to $0 per component.** `SEMP` legitimately ranges
   to −$10,000; `PERNP` ("Total person's earnings") is the Census aggregate that handles this
   correctly and is one column away. *(D1)*
8. Minor: `reach.json` records `basis: "…inflation-adjusted to 2026"` with no factor, no vintage
   ADJINC, and no MOE — nothing downstream can tell that the adjustment is a hand-set constant.

**Net effect on the product:** the childless ladders read far too low (retirees pulling p0–p25 to
$0) and the single-parent ladders read too high (other adults' wages folded in). A "you'd out-earn
X% of families like yours" claim built on those two is wrong in opposite directions depending on
which archetype the user picks — the failure is not uniform and cannot be corrected by a scalar.

#### Sources I could not reach

- **www.ssa.gov (all OACT/COLA pages)** — hard 403 from an Akamai edge for every client attempted
  (curl with browser UA + Accept headers, WebFetch). `www-origin.ssa.gov` does not resolve.
  Worked around with two primary substitutes: the **Federal Register** (the statutory publication of
  the same SSA determination, which states both the 2023 and 2024 AWI verbatim) and
  **secure.ssa.gov POMS RS 00605.949** (AWI series through 2022, $63,795.13; confirms the FR values'
  lineage). The AWI figures in D4 are therefore primary and verified, just not from ssa.gov's own
  HTML. Note the POMS table contains a typographical error at 2012 ("$44,321,.67").
- **A 2023-vintage `ACS2023_PUMS_README.pdf` at a tech_docs URL** — returns 404. The README ships
  *inside* each state's `csv_hXX.zip`; I extracted it from `csv_hwy.zip` (dated Oct 17, 2024). Its
  replicate-weight guidance now lives in the PUMS User Guide, which the README itself says.


---

## Appendix E. Follow-up: SSA pages retrieved directly from ssa.gov via Zyte

### SSA direct-source re-validation via Zyte

Fetched 2026-09-14 through the Zyte API. Every `www.ssa.gov` target returned HTTP 200 — the
Akamai 403 the earlier validator hit is not reproducible through Zyte. No Wayback captures and no
POMS-only inferences were needed for any item below; POMS is used once as an independent
cross-check, not as the source.

Saved pages: `scratchpad/zyte/` (`*.html`, `*.pdf`, plus raw `*.json` Zyte envelopes).

Caveat on "page date": the SSA actuarial and Understanding-SSI pages carry no visible
last-reviewed date. Their only date metadata is a stale `DCTERMS:dateCertified` (2018/2019)
that tracks the template, not the content. Where that is the case I cite the edition/vintage the
page states in its own text instead.

---

#### S1 — SSI 2026 federal benefit rate and resource limits — **CONFIRMED**

- FBR 2026: **$994/mo** eligible individual, **$1,491/mo** eligible individual with eligible
  spouse (couple), **$498/mo** essential person. Driven by the **2.8 percent** COLA effective
  January 2026. Unrounded annual: $11,929.46 / $17,892.21 / $5,978.41.
  - URL: https://www.ssa.gov/oact/cola/SSI.html
  - Page date: page self-titles "SSI Federal Payment Amounts for 2026"; no review date shown
    (`dateCertified` 2018-10-11, template metadata only).
- Resource limits: **"The limit for countable resources is $2,000 for an individual and $3,000
  for a couple."**
  - URL: https://www.ssa.gov/ssi/text-resources-ussi.htm
  - Page date: "Understanding Supplemental Security Income SSI Resources — **2026 Edition**".
- Discrepancy with earlier validator: none.
- Independent cross-check: the $994 FBR reappears in all four worked examples on
  text-income-ussi.htm and in the Red Book "What's New in 2026" page — three separately
  maintained pages agree.

#### S2 — 2026 SGA and trial-work-period amounts — **CONFIRMED**

- SGA 2026: **$2,830/mo** statutorily blind, **$1,690/mo** non-blind. Stated in the "Amounts for
  2026" prose *and* as the 2026 row of the historical table (2,830 | 1,690), which is a separate
  assertion on the same page.
  - URL: https://www.ssa.gov/oact/cola/sga.html
  - Page date: none shown (`dateCertified` 2018-10-11, template metadata).
- TWP service month 2026: **$1,210/mo** ("In 2025, any month in which earnings exceed $1,160 is
  considered a month of services … In 2026, this monthly amount increases to $1,210").
  - URL: https://www.ssa.gov/oact/cola/twp.html
  - Page date: none shown (`dateCertified` 2018-10-11).
- Discrepancy with earlier validator: none. The earlier validator did not supply a TWP figure;
  $1,210 is the 2026 value.
- Independent cross-check: https://www.ssa.gov/redbook/eng/whatsnew.htm (a different SSA office —
  ORDP, not OACT) states the same $1,690 / $2,830 / $1,210.

#### S3 — Monthly Statistical Snapshot — **CONFIRMED, with a labeling correction**

Latest live edition is **July 2026 (released August 2026)**. No August 2026 edition exists yet:
`2026-08.html` and `2026-08.pdf` both 404, and the index page's own download links point only at
`2026-07.pdf` / `2026-07.xlsx`.

- URL: https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/
- Page date: "Monthly Statistical Snapshot, July 2026 (released August 2026)", Federal Data
  Catalog ID US-GOV-SSA-3413.

Figures, by table:

- **Table 2** — Disability Insurance → Disabled workers: **6,990 thousand** beneficiaries,
  $11,430M total monthly benefits, average monthly benefit **$1,635.27**.
- **Table 1** (thousands), row "Disabled, under age 65": Total **10,933**; Social Security only
  **6,140**; SSI only **3,710**; Both Social Security and SSI **1,083**.
- **Table 3** — SSI recipients: all 7,300K; under 18 1,010K; 18–64 3,783K; 65+ 2,507K.

Verdicts:

- Average monthly benefit for disabled workers $1,635.27 — **CONFIRMED** exactly (Table 2).
- 6,140K / 3,710K — the *numbers* are **CONFIRMED** (Table 1), but the earlier validator's
  **labels are wrong** and should not be carried forward:
  - 6,140K is *disabled-under-65 beneficiaries receiving Social Security only*. The SSDI
    disabled-worker count is **6,990K** (Table 2). 6,140K also sweeps in disabled adult children
    and disabled widow(er)s under 65, and excludes the 1,083K concurrent cases.
  - 3,710K is *disabled-under-65 recipients receiving SSI only*. SSI blind/disabled recipients
    under 65 including concurrent cases is **3,710 + 1,083 = 4,793K**.
  - If the intent is "SSDI disabled workers vs SSI disabled recipients under 65", the defensible
    pair is **6,990K vs 4,793K**, not 6,140K vs 3,710K.
- Cross-check with a different tool family: the PDF edition
  (https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/2026-07.pdf, extracted with
  `pdftotext -layout`) reproduces all three tables digit-for-digit, so the figures are not an
  artifact of my HTML stripping.

#### S4 — Average Wage Index — **CONFIRMED**

- AWI **2023 = 66,621.80**; AWI **2024 = 69,846.57** (2024 is 4.84 percent above 2023).
  Both appear twice on the page: in the "Latest index" / "Determination of the National Average
  Wage Index for 2024" prose and as rows of the 1951–2024 series table.
  - URL: https://www.ssa.gov/oact/cola/AWI.html
  - Page date: none shown; content vintage is "for 2024", the latest published index.
- Discrepancy with earlier validator: none.

#### S5 — 2026 Red Book — **CONFIRMED** (thresholds), **CONFIRMED with a wording caveat** (cash cliff)

2026 edition located from https://www.ssa.gov/redbook/ : "SSA Publication No. 64-030, (Red Book),
**June 2026**, ICN 436900" → https://www.ssa.gov/pubs/EN-64-030.pdf (fetched, 611,622 bytes,
colophon "Pub. No. 64-030 / June 2026 (Recycle Prior editions)").

**§1619(b) state thresholds, 2026 — CONFIRMED, all three exact:**

| State | 2026 threshold (disabled) | 2025 |
|---|---|---|
| California | **$66,078** | $64,517 |
| New York | **$68,654** | $64,017 |
| Texas | **$53,165** | $53,501 |

- URL: https://www.ssa.gov/disabilityresearch/wi/1619b.htm — "2026 1619(b) THRESHOLD AMOUNTS FOR
  DISABLED SSI BENEFICIARIES". Page date: none shown (`dateCertified` 2019-11-25, template);
  content vintage is self-declared 2026, and it also carries the 2025 chart.
- **Important sourcing note:** the 2026 Red Book PDF itself does **not** contain the state
  threshold table. It defers: "See link for chart reflecting current State Threshold Amounts for
  People with Disabilities at: secure.ssa.gov/apps10/poms.nsf/lnx/0502302200." So the earlier
  validator's POMS sourcing was correct-by-necessity, not a fallback. The
  `disabilityresearch/wi/1619b.htm` page above is the `www.ssa.gov` publication of the same chart
  and is the citable direct source.
- Independent cross-check: POMS SI 02302.200, TN 38 (01-26), effective 01/20/2026, section B
  ("LIST OF THRESHOLD AMOUNTS FOR CALENDAR YEAR 2026") gives CA 5,759 + 30,635 + 35,443 =
  **66,078**; NY 2,088 + 26,964 + 41,690 = **68,654**; TX 0 + 24,876 + 28,289 = **53,165**. The
  component columns sum to the published totals, so the figure is arithmetically re-derived, not
  merely re-read. (Separate blind threshold for CA: $68,103.)
- Discrepancy with earlier validator: none on the numbers.

**TWP / EPE "cash cliff" — mechanism CONFIRMED; the term is not SSA's.**

The string "cliff" appears **zero times** in the 2026 Red Book. Do not attribute the phrase to
SSA. What the Red Book does state (pp. 20–21, and
https://www.ssa.gov/redbook/eng/ssdi-only-employment-supports.htm):

- TWP: "you will receive full Social Security Disability Insurance (SSDI) benefits … **regardless
  of how high your earnings might be**" for at least 9 months.
- EPE begins the month after the TWP ends; first 36 months are the re-entitlement period.
- "The first time that you work above SGA in the EPE, we will decide that you no longer meet the
  requirements for disability due to work, and we say that your disability 'ceased'. We will pay
  benefits for the month your disability ceased and the following 2 months. We call this the
  **grace period**."
- "We **suspend cash benefits** for months your earnings are over the SGA level." Benefits restart
  without a new application if earnings fall back below SGA inside the 36 months.
- "Your benefits will end if you work above SGA after the 36-month re-entitlement period."
- The worked "Armando" timeline makes the discontinuity explicit: 09/25 last TWP month →
  10/25 EPE begins, SSDI ceases due to SGA → 10–12/25 grace-period payments → **01/26 SSDI
  benefits stop**.

So the cliff is real and fully documented — full benefit at any earnings level through the TWP,
then a binary all-or-nothing suspension keyed to a single SGA threshold — but it is described
structurally, in the vocabulary of cessation / grace period / suspension. Any HotGap copy should
paraphrase the mechanism rather than quote "cash cliff" as SSA language.

#### S6 — SSI earned-income exclusions — **CONFIRMED**

- General income exclusion **$20**, earned income exclusion **$65**, then **one-half** of the
  remainder counted.
- Stated two independent ways on the page:
  - Exclusion list: "The first **$65** of earnings and **one half of earnings over $65** received
    in a month."
  - Worked Example B: `$317 gross − 20 (not counted) = $297 − 65 (not counted) = $232 ÷ 2 = $116
    countable income`; `$994 FBR − 116 = $878 SSI Federal benefit`. Examples A/C/D apply the same
    $20 to unearned income.
  - URL: https://www.ssa.gov/ssi/text-income-ussi.htm
  - Page date: "Understanding Supplemental Security Income SSI Income — **2026 Edition**"; note
    it also flags "Effective 09/30/2024, food is no longer included in ISM calculations."
- Discrepancy with earlier validator: none.
- Related 2026 figures picked up on the same page, if useful: Student Earned-Income Exclusion
  $2,410/mo up to $9,730/yr; $2,000/calendar-year clinical-trial compensation exclusion.

---

#### Pages Zyte could not retrieve

No `www.ssa.gov` page was blocked. All 12 fetched pages returned **HTTP 200**. The only non-200
responses were probes for content that does not exist yet:

| URL | Status | Note |
|---|---|---|
| https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/2026-08.html | 404 | August 2026 snapshot not yet released |
| https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/2026-08.pdf | 404 | same |
| https://www.ssa.gov/policy/docs/quickfacts/stat_snapshot/archive.html | 404 | guessed archive path; not the real one. The snapshot index exposes no archive link — only a data.gov catalog link. Treat July 2026 as latest on the index's own authority, not on this 404. |

Retrieved 200: `oact/cola/SSI.html`, `ssi/text-resources-ussi.htm`, `oact/cola/sga.html`,
`oact/cola/twp.html`, `oact/cola/AWI.html`, `ssi/text-income-ussi.htm`,
`policy/docs/quickfacts/stat_snapshot/` (+ `2026-07.pdf`), `redbook/`, `pubs/EN-64-030.pdf`,
`redbook/eng/whatsnew.htm`, `redbook/eng/ssi-only-employment-supports.htm`,
`redbook/eng/ssdi-only-employment-supports.htm`, `disabilityresearch/wi/1619b.htm`, and
(non-www, cross-check only) `secure.ssa.gov/apps10/poms.nsf/lnx/0502302200`.


---

## Appendix F. Follow-up: state and federal pages retrieved via Zyte (Kansas, congress.gov, DHCS, ASPE, DTA, NY State of Health)

### Zyte follow-up validation — 6 items (retrieved 2026-09-14)

All six retrieved. Zyte returned HTTP 200 on every real target, including the four
PDFs and congress.gov. No bot block was encountered; the only 404s were stale or
guessed URLs (listed at the end).

Saved pages: `scratchpad/zyte/` (`.json` raw Zyte body, `.pdf`/`.html` decoded, `.txt` extracted).

---

#### K1 — Kansas parent/caretaker income limit — **FOUND** (newer than the earlier validator's Rev. 04-17)

**Family of 3: $866/month.** The chart publishes monthly only. Annualized: 38% of the $27,320
annual FPL = **$10,382/year**. (Do *not* use $866 × 12 = $10,392 — $866 is the monthly figure
rounded up, so multiplying back out overstates the annual by $10.)

- Source: *Kansas Medical Assistance Standards*, Appendix **F-8, Rev. 07-26**, p.2,
  "Caretaker Medical Income Standards — Updated 4/1/26", column header `38%*`.
- URL: https://www.kancare.ks.gov/home/showpublisheddocument/4880/639165970250700000
  (linked as "F-8 KS Medical Standards (effective 04/01/2026)" from
  https://www.kancare.ks.gov/providers/presumptive-eligibility)
- Page date: PDF footer revision **07-26**; PDF created 2026-06-01; caretaker table stamped "Updated 4/1/26".
  (The KanCare link label still says "effective 04/01/2026" — the label is stale relative to the document's own 07-26 footer.)

**5% MAGI disregard: YES, included.** The chart footnotes the 38% column
`*Includes additional 5% for upper program limit`. So 38% is the *upper limit*
inclusive of the disregard; the underlying standard is 33%.

Full published column (monthly): 1 → $506, 2 → $686, **3 → $866**, 4 → $1,045,
5 → $1,225, 6 → $1,405, 7 → $1,585, 8 → $1,765, each extra person +$180.

Cross-checks (independent of the chart):
- KFMAM **2211.01** (live, "Eligibility Policy - 9/14/2026") reads: "Persons meeting
  Caretaker Medical criteria whose countable income does not exceed 38% of the federal
  poverty level." — matches the earlier validator's read of the rule.
  https://khap.kdhe.ks.gov/kfmam/main.asp?tier1=02000&tier2=02210&tier3=2211&tier4=01
- Arithmetic re-derived from the 2026 HHS FPL as published by a *different* state
  (CA DHCS, K3 below): 3-person 100% FPL = $27,320/yr = $2,276.67/mo.
  33% → $751.30; **38% → $865.13, rounded up = $866.** Confirms both the figure and
  that the 5-point disregard is baked into the published number.

Discrepancy with earlier validator: none on the rule (38% confirmed); this supersedes
the Rev. 04-17 chart with current dollars and settles the disregard question (it is included).

Side note for the model: KFMAM 2211.01 lists children 6–18 at 133%, while F-8 splits that
into Medicaid 113% / M-CHIP 113–133%. Not part of this item, but the two Kansas sources
do not read the same way for that group.

---

#### K2 — ACA enhanced PTC extension: enacted? — **FOUND: NO bill enacted as of 2026-09-14**

congress.gov, 119th Congress, `search="premium tax credit"`, source=legislation:
**218 results, 7 "Became Law"** — and none of the 7 extends the enhanced PTC:

| Bill | Title | Latest action |
|---|---|---|
| H.R.1 | An act to provide for reconciliation pursuant to title II of H. Con. Res. 14 | 07/04/2025 Became **P.L. 119-21** |
| S.1071 | National Defense Authorization Act for FY2026 | 12/18/2025 Became **P.L. 119-60** |
| H.R.5371 | Continuing Appropriations, Agriculture, Leg. Branch, MilCon-VA, and Extensions Act, 2026 | 11/12/2025 Became **P.L. 119-37** |
| H.R.6938 | CJS; Energy & Water; Interior & Environment Appropriations Act, 2026 | 01/23/2026 Became **P.L. 119-74** |
| H.R.7148 | Consolidated Appropriations Act, 2026 | 02/03/2026 Became **P.L. 119-75** |
| H.R.7147 | Homeland Security and Further Additional Continuing Appropriations Act, 2026 | 04/30/2026 Became **P.L. 119-86** |
| H.R.6644 | 21st Century ROAD to Housing Act | 07/11/2026 Became **P.L. 119-101** |

Search URL: https://www.congress.gov/search?q=%7B%22congress%22%3A%5B%22119%22%5D%2C%22source%22%3A%22legislation%22%2C%22search%22%3A%22premium+tax+credit%22%2C%22bill-status%22%3A%22law%22%7D
(unfiltered search as given in the brief returns the 218 and the "Became Law [7]" facet).

##### The four named bills — all still in committee, no action since 2025

| Bill | Title | Latest action |
|---|---|---|
| **H.R.5145** | Bipartisan Premium Tax Credit Extension Act | **09/04/2025** Referred to House Ways and Means. *(2 actions total; nothing since)* |
| **S.3102** | A bill to … extend the temporary enhanced premium credits | **11/04/2025** Read twice and referred to Committee on Finance. *(1 action total)* |
| **H.R.6010** | To … extend and modify the enhanced premium tax credit | **11/10/2025** Referred to Ways and Means, in addition to Energy and Commerce. *(3 actions total)* |
| **H.R.6074** | To … extend the enhancement of the health care premium tax credit | **11/18/2025** Referred to House Ways and Means. *(2 actions total)* |

URLs: https://www.congress.gov/bill/119th-congress/house-bill/5145/all-actions ·
.../house-bill/6010/all-actions · .../house-bill/6074/all-actions ·
.../senate-bill/3102/all-actions

**None of the four became public law; none of the four has moved out of committee.**

##### Correction to my first pass: a fifth vehicle passed the House — H.R.1834

My first pass checked only the four named bills plus the "Became Law" facet, and so missed
this. The **"Passed One Chamber" facet** on the same search surfaces it:

**H.R.1834 — "To advance policy priorities that will break the gridlock"** — the
discharge-petition vehicle carrying a **three-year extension of the enhanced PTC** (text
swapped in via the McGovern amendment in the nature of a substitute, H.Amdt.144, adopted
under H.Res. 780).

- **01/08/2026 — Passed House, 230–196 (Roll no. 11)**; 17 Republicans joined Democrats.
- 01/12/2026 received in Senate → 01/13–01/16/2026 papers returned to the House per H.Res. 991 → **01/26/2026 received in the Senate again**
- 02/09/2026 read first time · **02/10/2026 read the second time, placed on the Senate Legislative Calendar under General Orders, Calendar No. 319**
- **No Senate action since 2026-02-10.** 41 actions total; congress.gov tracker status: "Passed House".
- https://www.congress.gov/bill/119th-congress/house-bill/1834/all-actions

**The bottom-line verdict is unchanged — nothing has been enacted.** But the accurate picture
is not "everything died in committee": an ePTC extension passed the House and has sat on the
Senate calendar for seven months.

##### CRS R48290 — "Enhanced Premium Tax Credit and 2026 Exchange Premiums: FAQs"

- Latest version: **Version 7, December 10, 2025** (publication date 12/10/2025; author Bernadette Fernandez).
- Version history: v1–v2 12/04/2024; v4 09/24/2025; v5–v7 all 12/10/2025.
- URL: https://www.congress.gov/crs-product/R48290 (the `crsreports.congress.gov/product/pdf/R/R48290`
  request redirects here).
- **The report has not been updated since Dec 2025** — it still frames the enhancement as
  "impending expiration" and predates the entire 2026 record. Do not cite it for current status.

Independent cross-check (different source family): KFF's July 2026 coverage-gap brief
refers to "the expiration of enhanced Marketplace premium tax credits" as an accomplished
fact. Consistent with the congress.gov result.

Discrepancy with earlier validator: none — this confirms non-enactment from the primary record.

---

#### K3 — California DHCS ACWDL 26-01 — **FOUND, direct from dhcs.ca.gov** (confirms Covered California figures)

Family of 3, monthly (chart is monthly; DHCS rounds up to the next dollar):
- **138% FPL = $3,143/month; $37,702/year**
- **266% FPL = $6,057/month; $72,672/year**
  (Enclosure 1 is monthly, Enclosure 2 annual. Annual = annual FPL × pct — do **not** multiply
  the monthly by 12; DHCS rounds each monthly value up, so $3,143 × 12 = $37,716 overstates by $14.)
- 100% FPL reference for 3: **$27,320/year, $2,277/month**

Program mapping, from DHCS's own Enclosure 3:
- **138% FPL** = "ACA New Adults Ages 19-64; and = FPL Program for Aged & Disabled"
- **266% FPL** = "ACA OTLIC" (Optional Targeted Low-Income Children)
- Note: **parents/caretaker relatives in CA are 109% FPL** (114% with the 5% disregard) — a
  different, lower door than the 138% new-adult group.

URLs:
- Letter (3pp, no charts): https://www.dhcs.ca.gov/wp-content/uploads/2026/04/26-01.pdf
- Enclosure 1 (monthly): https://www.dhcs.ca.gov/services/medi-cal-resources/medi-cal-eligibility-division/all-county-welfare-directors-medi-cal-eligibility-division-information-letters/2026-fpl-calculation-chart-monthly-values-enclosure-1/
- Enclosure 3 (program descriptions): .../program-descriptions-by-fpl-enclosure-3/
- Index: .../2026-all-county-welfare-directors-letters/

**Page date: the letter is dated January 21, 2026** — despite the `/2026/04/` path in the
PDF URL. Effective dates inside: MAGI Medi-Cal 01/01/2026; MSP non-RSDI 01/01/2026;
MSP with RSDI 03/01/2026; ABD-FPL and 250% WDP 04/01/2026.

Discrepancy with earlier validator: none. The Covered California chart the earlier validator
used matches DHCS's own letter on both 138% and 266%. One correction to the brief's framing:
the charts are **not** in `26-01.pdf` — that file is the 3-page cover letter only; the
numbers live in separately-published HTML enclosures.

---

#### K5 — Massachusetts DTA TAFDC Table of Need and Payment Standards — **FOUND, confirmed**

**Household of 5: $1,150.00/month without rent allowance; $1,190.00/month with rent allowance.** Exactly as the earlier validator had it.

Full table (A = no rent allowance / B = with rent allowance):
1 → $564 / $604 · 2 → $713 / $753 · 3 → $861 / $901 · 4 → $1,003 / $1,043 ·
**5 → $1,150 / $1,190** · 6 → $1,301 / $1,341 · 7 → $1,448 / $1,488 ·
8 → $1,593 / $1,633 · 9 → $1,738 / $1,788 · 10 → $1,885 / $1,925 · incremental $153.

- URL: https://www.mass.gov/doc/table-of-need-payment-standards/download
- Landing page (same figures, confirming the PDF is current): https://www.mass.gov/lists/transitional-aid-to-families-with-dependent-children-tafdc-table-of-need-and-payment-standards-704410-704420

**Effective date:** the document carries no "last revised" stamp. Its own operative date
statement is: *"From September 1, 2026, to September 30, 2026, inclusive, the appropriate
Need and Payment Standard shall be increased by $500 for each eligible applicant and client
under age 19"* — a nonrecurring September 2026 clothing allowance under 106 CMR 704.410 /
704.420. PDF created **2026-08-20** (Author: Leitch, Keisha (DTA)). So: current as of
September 2026.

Modeling note: the $500 is **added per eligible child under 19 on top of** the table, not
baked into it — the table's own increments are $147–$153 per additional person. A
household of 5 with 3 children under 19 has a September-2026 standard of $1,150 + $1,500.

Discrepancy with earlier validator: none.

---

#### K6 — New York Essential Plan upper limit → 200% FPL on 2026-07-01 — **FOUND, confirmed, and the contingency has resolved**

Both documents retrieved. Operative sentences:

**Webinar (slide 8, "Overview of Changes"):**
> "Essential Plan 200 – 250 is being rolled back mid-year in 2026. Enrollees with incomes
> between 200% and 250% of the Federal Poverty Level (FPL), will no longer be eligible for
> the Essential Plan starting July 1, 2026."

Slide 9 closes the loop on the remaining population:
> "There are no changes for the other 1.3 million EP enrollees with income up to 200% FPL."

**Issuer Q&A (header + first answer):**
> "Essential Plan (EP) 200–250 Transition — Effective Date: July 1, 2026*  … *Contingent on CMS approval"
>
> "NYSOH is ending the Essential Plan (EP) 200%–250% FPL variant effective July 1 (6/30/2026
> coverage end date) due to federal changes (H.R.1) and waiver termination (pending CMS
> approval). … After the EP 200–250 variant is turned off, individuals with an eligibility
> start date on/after the effective end date who are over 200% FPL will be ineligible for EP
> due to 'Over Income' and evaluated for other programs."
>
> Key dates: "Eligibility end date: 06/30/2026 · Eligibility start date for post-change rules: 07/01/2026"

**The Q&A's "contingent on CMS approval" caveat is resolved** — webinar slide 6 states:
> "the Department of Health submitted a formal request to the federal Centers for Medicaid
> and Medicare Services (CMS) to terminate its 1332 State Innovation Waiver and reactivate
> its Basic Health Program (BHP). **CMS approved this request on March 20, 2026.**"

URLs:
- https://info.nystateofhealth.ny.gov/sites/default/files/June%20Webinar%20-%20NY%20State%20of%20Health%20Changes%20for%202026.pdf
- https://info.nystateofhealth.ny.gov/sites/default/files/NY%20State%20of%20Health%20Issuer%20Q&A%20Essential%20Plan%20200%E2%80%93250%20Transition.pdf

Page dates: webinar slide 1 reads "Date: June 17, 2026"; PDF created 2026-06-18
(Author: Bacheldor, Erin (HEALTH)), 41 slides. Q&A PDF is undated on its face; header
effective date July 1, 2026.

Carve-outs the model should not miss (all from these two documents): pregnant/postpartum
members with an active EP PPSD move to **EP1** and stay in EP past 7/1/2026; pregnant
members with an EDC on/after 2027-01-01 move to **Medicaid**; DACA recipients lose EP at
all levels on 2026-07-01 (to Medicaid if pregnant or income-eligible, otherwise no coverage).

Discrepancy with earlier validator: none — confirmed, plus the CMS approval date.

---

#### K4 — medicaid.gov / aspe.hhs.gov / cms.gov coverage-gap count — **COULD NOT FIND ANY NEWER FEDERAL PRIMARY ESTIMATE**

**No federal primary estimate newer than ASPE HP-2022-06 exists.** Searched aspe.hhs.gov,
medicaid.gov, cms.gov and hhs.gov; checked every candidate that surfaced.

**ASPE HP-2022-06 confirmed as the newest federal original estimate:**
> "In the 12 states that have not expanded Medicaid, approximately **2.2 million** uninsured
> non-elderly adults with incomes below 100% FPL – who are in what is sometimes called the
> 'coverage gap' – would become newly eligible for Medicaid if their states were to expand
> the program."
- Data Point HP-2022-06, **February 15, 2022**, Rudich/Branham/Peters/Sommers, ASPE microsimulation. **12 states.**
- https://aspe.hhs.gov/sites/default/files/documents/43fe9943cbff7f5698bbd72b901948fb/medicaid-12-state-expansion-uninsured.pdf
- (Same brief: 3.8 million total uninsured non-elderly adults up to 138% FPL would become newly eligible.)

**One trap worth flagging.** ASPE **HP-2025-01** (January 8, 2025) looks like a newer federal
estimate — it says "roughly **1.5 million** uninsured adults live in states that have not yet
implemented the ACA Medicaid expansion … often described as falling in the 'coverage gap'."
Its **endnote 53 cites KFF**, "A Closer Look at the Remaining Uninsured Population Eligible
for Medicaid and CHIP", March 2024. So the 1.5M is a **KFF number republished by ASPE**, not
an independent federal estimate — do not cite it as one.
https://aspe.hhs.gov/sites/default/files/documents/9a943f1b8f8d3872fc3d82b02d0df466/coverage-access-2021-2024.pdf

**Newest estimate from any source (non-federal):** KFF, **1.2 million** uninsured in the
coverage gap in **10 non-expansion states**.
- Published **2026-07-27**, modified 2026-07-31. Cervantes, Bell, Tolbert, Damico.
- Method: 2024 ACS 1-Year Estimates + 2025 Medicaid eligibility levels.
- Also: 2.4 million would gain eligibility if all remaining states expanded (1.2M in the gap +
  1.2M between 100–138% FPL eligible-but-unenrolled for Marketplace). 56% of the gap
  population is Hispanic or Black; ~6 in 10 live in a family with a worker.
- KFF notes the count "is not expected to decline further" because the 2025 reconciliation law
  removed the ARPA expansion incentive.
- https://www.kff.org/medicaid/how-many-uninsured-are-in-the-coverage-gap-and-how-many-could-be-eligible-if-all-states-adopted-the-medicaid-expansion/

Also checked, no coverage-gap count: ASPE HP-2024-18 (Sept 2024, "Health and Economic
Benefits of Medicaid Expansion") and ASPE HP-2023-08 (March 2023).

Discrepancy with earlier validator: none — confirms the earlier finding that HP-2022-06
(Feb 2022, 2.2M, 12 states) is still the newest federal number, and adds the KFF 2026
figure plus the warning about ASPE HP-2025-01's borrowed 1.5M.

---

#### Pages Zyte could not retrieve

Zyte hit **no bot blocks**. Every real page returned 200, including all four PDFs, all five
congress.gov pages, kancare.ks.gov, khap.kdhe.ks.gov, dhcs.ca.gov, mass.gov and aspe.hhs.gov.
The four failures were all **HTTP 404 from the origin** — dead or guessed URLs, not blocks:

| URL | Zyte status | Note |
|---|---|---|
| `https://www.dhcs.ca.gov/services/medi-cal/eligibility/letters/Pages/2026-All-County-Welfare-Directors-Letters.aspx` | **404** | URL supplied in the brief is stale; DHCS moved the ACWDL index to `/services/medi-cal-resources/medi-cal-eligibility-division/...`. Retrieved from the current path. |
| `https://www.kancare.ks.gov/policies-and-reports/eligibility-policy` | **404** | My guess. F-8 actually hangs off `/providers/presumptive-eligibility`. |
| `https://www.mass.gov/info-details/tafdc-eligibility-requirements` | **404** | My guess. Correct page is the `/lists/...704410-704420` landing page. |
| `https://aspe.hhs.gov/reports-search?search=coverage%20gap` | **404** | My guess at ASPE's search path. |

Note on the earlier validators' blocks: nothing in this run reproduced them. Whatever blocked
them (kancare.ks.gov, congress.gov, dhcs.ca.gov) passed cleanly through Zyte.

---

### Addendum — independent (non-primary) corroboration, 2026-09-14

Re-derived every load-bearing figure against a *different* source family than the .gov page it
came from. **Two errors in my first pass surfaced and are corrected above** (K2's
"all in committee"; K3's annual figures). Everything else held.

| Item | Primary figure | Independent source | Result |
|---|---|---|---|
| K1 | KS caretaker, 3-person, $866/mo | medicaideligibilitycalculator.com, snapscreener, povertylevelcalculator: "38% FPL", "~$844/month" | **Holds.** 38% agreed by all. The $844 is 38% of the **2025** FPL ($26,650/yr ÷ 12 × .38 = $843.9); $866 is 38% of the 2026 FPL. Secondary trackers are a year stale. |
| K2 | No ePTC extension enacted | Ballotpedia, STAT, NPR, Axios, ABC, Healthcare Dive, AJMC, ASTHO, CBPP | **Holds, but incomplete →** see the H.R.1834 correction above. All agree ePTC lapsed 2025-12-31; House passed a 3-yr extension 230–196 on 2026-01-08; Senate never acted. |
| K3 | CA 3-person: 138% $3,143/mo, 266% $6,057/mo | **Health Consumer Alliance 2026 FPL chart, updated 2026-02-16** | **Exact match**, and it supplies the annual column that corrected my arithmetic: 138% = $3,143/mo / **$37,702/yr**; 266% = $6,057/mo / **$72,672/yr**; 100% = $2,277/mo / $27,320/yr. https://healthconsumer.org/wp/wp-content/uploads/2026/02/HCA-FPL-Chart-2026.pdf |
| K4 | ASPE 2.2M (2022) newest federal | CBPP, KFF | **Holds** — see the timeline below. |
| K5 | MA TAFDC 5-person $1,150 / $1,190 | masslegalhelp.org, masslegalservices.org (MLRI), singlemotherguide | **Holds.** Independently: "$1,190 maximum monthly for a family of five"; "the April 2025 increase raised the maximum grant for a family of three to $861/month, no increase scheduled for FY26" — matches the table's 3-person $861 exactly. |
| K6 | NY EP upper limit → 200% FPL on 2026-07-01 | NY Health Access, MetroPlus, Healthfirst/hfproviders, NYS Focus, broker advisories | **Holds**, with added scale: **~450,000 New Yorkers** affected; SEP to enroll in a QHP ran **through 2026-08-30**; CMS approval of the 1332 termination confirmed independently. |

##### K2 — what the independent record adds

- ePTC **lapsed 2025-12-31**; subsidies reverted to pre-ARPA levels **2026-01-01**. Average
  premium payment increase ~114% (~$1,016/yr) (KFF calculator; AJMC).
- December 2025: competing Senate approaches both failed to advance.
- **2026-01-08: House passed the 3-year extension 230–196**, 17 Republicans crossing over
  (H.R.1834, confirmed against congress.gov above).
- Senate negotiators floated a shorter extension with income caps, minimum premium
  contributions and program-integrity riders; nothing has reached a vote.
- ~4 million projected to lose coverage / become uninsured.
- ASTHO maintains a running tracker: https://www.astho.org/communications/blog/2026/aca-enhanced-premium-tax-credits-legislative-developments-2025-2026/ — better than CRS R48290 for current status, since R48290 is frozen at 2025-12-10.

##### K4 — the coverage-gap estimate timeline (definitions differ; do not mix)

| Estimate | Source | Date | States | Basis |
|---|---|---|---|---|
| **2.2 million** | **ASPE HP-2022-06** *(newest federal primary)* | 2022-02-15 | 12 | ASPE microsimulation, pre-pandemic |
| 1.6 million | CBPP, "The Medicaid Coverage Gap: State Fact Sheets" | **updated 2024-04-03** | 10 | ACS; uninsured adults below the poverty line |
| 1.5 million | ASPE HP-2025-01 | 2025-01-08 | 10 | **not original — endnote 53 cites KFF (Mar 2024)** |
| **1.2 million** *(newest overall)* | KFF | **2026-07-27** | 10 | 2024 ACS 1-Year + 2025 eligibility levels |

The 2.2M → 1.6M → 1.2M decline is coherent: two states (NC, SD) expanded, moving the count
from 12 non-expansion states to 10, plus newer ACS vintages. **The federal number has not been
refreshed since February 2022.** If the model needs a current figure, KFF 2026-07-27 (1.2M) is
the defensible one; ASPE HP-2022-06 is the one to cite if a federal source is required, with
its 2022/12-state vintage stated explicitly.

##### Sources consulted for this addendum

congress.gov (H.R.1834 all-actions; passed-one-chamber facet) · Ballotpedia News 2026-01-12 ·
STAT 2026-01-08 · NPR 2026-01-08 · Axios 2026-01-08 · ABC News · Healthcare Dive · AJMC · ASTHO ·
CBPP (coverage gap fact sheets; ePTC explainers) · KFF (coverage gap brief; ePTC calculator;
state health facts) · Health Consumer Alliance 2026 FPL chart · Mass Legal Help / Mass Legal
Services (MLRI) · NY Health Access · MetroPlus · hfproviders.org · NYS Focus ·
medicaideligibilitycalculator.com · snapscreener.com · povertylevelcalculator.com
