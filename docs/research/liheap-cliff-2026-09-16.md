# The LIHEAP cliff — has anyone rolled it up by state, and what would HotGap need?

**Date:** 2026-09-16 (every page and file below was retrieved that day)
**Method:** primary sources fetched directly — the LIHEAP Clearinghouse tables and FY2026 benefit
matrices, ACF's FY2022 Report to Congress tables and FY2024 state profiles, the Atlanta Fed PRD
repository (including its RData parameter files, opened in R), `policyengine-us` on `main` and
the public API, MyFriendBen's `benefits-api`, NEUAC's state sheets, NCCP's Kentucky report.
Web search only to find candidates. "Verified" means read on the fetched page or file;
"inferred" is marked as such. Nothing is typed from memory.

## 1. Has anyone rolled it up?

Yes for the *rules*, no for the *cliff*. The HHS/ACF-funded **LIHEAP Clearinghouse** (run by
NCAT) publishes, every year, a 51-state table of the income limit each state elected for each
component (heat/cool/crisis/weatherization, as % FPG or % SMI), a min/max benefit table, a
"criteria for varying benefits" grid, and one benefit matrix per state — all sourced to the FY2026
Model Plans, all HTML or PDF/XLSX/DOCX, none machine-readable. **ACF's Performance Management
site** publishes per-state average benefit by component (FY2022 final; FY2024 profiles current as
of May 2025) and — the number that matters most — the share of income-eligible households each
state actually served. Nobody has turned these into a cliff: the **Atlanta Fed PRD** lists LIHEAP
nowhere on its program page, its update schedule has no LIHEAP row, and its repository's
`liheapData` is a twelve-row District-of-Columbia stub dated 2021 that no function reads.
**policyengine-us** models it for DC, Massachusetts, Illinois (full FY2026 matrices), Texas
(partial) and Riverside County (eligibility only) — six stale state PRs (NY, ME, RI, AZ, ID, OR)
were closed unmerged on 2026-02-23 — and none of those variables is on the list that reaches
`household_net_income`. **MyFriendBen** (MPL-2.0) hand-codes eligibility for CO, IL, KS, MA, MO,
NC, TX, WA with source-snapshotted specs but a deliberately conservative flat dollar estimate.
**NCCP's Family Resource Simulator** includes LIHEAP as an expense reduction in its state builds
(Kentucky, 2024) but is closed. No academic paper quantifying the LIHEAP notch as a benefit cliff
was found. One surprise: **Michigan's** LIHEAP heating money is a refundable state tax credit
(the Home Heating Credit), which policyengine-us models and which is therefore *already inside
HotGap's Michigan curve* — verified live (§3, state 3).

## 2. Sources

| Source | Gives | Vintage | Format / license | URL | Status |
|---|---|---|---|---|---|
| Clearinghouse — income eligibility by state | Heat/Cool/Crisis/Wx limit per state as % FPG or % SMI, with household-size caveats | FY2026; updated 2025-12-15; "Source: FY 2026 State Model Plans" | HTML; public (HHS-funded) | https://liheapch.acf.gov/delivery/income_eligibility.htm | Verified (curl; WebFetch rejects the site's certificate) |
| Clearinghouse — benefit levels; heating criteria | Heating/Cooling/Crisis min–max per state (archive 2015–2025); which factors each state varies benefits by | FY2026; updated 2025-11-24 and 2025-12-19 | HTML; public | https://liheapch.acf.gov/tables/benefits.htm, …/tables/heatcrit.htm | Verified |
| Clearinghouse — FY2026 benefit matrices | One file per state (some per component) | Index updated 2026-01-05 | PDF, XLSX (MN, WI, UT, KY), DOCX (MO, DC); public | https://liheapch.acf.gov/delivery/benefits.htm → `/docs/2026/benefits-matricies/…` | Verified for TX, MA, MD, NC, OH, MI, IA, IN, NM, PA, MO, MN. The "Colorado: heating" link serves **Delaware's** matrix |
| Clearinghouse — state plans, manuals, snapshots | Every FY2026 Model Plan (archives 2014–2026); manuals for 39 states; per-state snapshot (funding, limit, min/max, households served) | Plans 2025-11-14; manuals 2026-05-11; TX snapshot 2026-04-20 | PDF / HTML; public | https://liheapch.acf.gov/stateplans.htm, …/profiles/Texas.htm | Index and TX snapshot verified; plan PDFs not read |
| ACF — FY2026 FPG and SMI tables (LIHEAP-IM-2025-02, Att. 2 and 4) | Dollar limits by size and state | Mandatory FY2026 | PDF; public | https://acf.gov/sites/default/files/documents/ocs/COMM_LIHEAP_IM2025-02_SMIStateTable_Att4.pdf | **Not fetched** — acf.gov answers curl with an empty HTTP 202; the figures are reproduced in the MA, NM and DE matrices |
| ACF — Report to Congress FY2022, Tables III-5a and IV-1; Performance Measures Report FY2022 | Average benefit **by state and component**; distribution of income standards; "about 12 percent of federally income eligible households received assistance with their heating costs" | FY2022 (latest *final*; FY2023–25 "preliminary") | PDF; public | https://www.acf.hhs.gov/sites/default/files/documents/ocs/RPT_LIHEAP_RTC07TblAvgBenefitsFNs_FY2022-compliant.pdf, …RTC10TblStateIncStds…, https://acf.gov/sites/default/files/documents/ocs/RPT_LIHEAP_HEN03PerfMeas_FY2022.pdf | Verified |
| ACF — LIHEAP Performance Management: state profiles; Data Warehouse | Per state: funding, households served, 4-person limit, **% of income-eligible population served**, average benefit per component; warehouse since 2001 with "downloadable" custom reports | FY2024 profiles ("current as of May 30, 2025"); FY2025 preliminary loaded | PDF, one page per state; public | https://liheappm.acf.gov/sites/default/files/private/congress/profiles/2024/FY2024_<State>_Profile.pdf; https://liheappm.acf.gov/datawarehouse | 13 profiles verified; FY2025 404 at the same pattern; export untested |
| NEUAC — "All-State Sheets FY2024" | National and per-state eligible, served, share served | 2021 data; PDF created 2023-02-13 | PDF, 104 pp; advocacy coalition | https://neuac.org/wp-content/uploads/2023/07/All-State-Sheets-FY2024.pdf | Verified (national page) |
| Atlanta Fed — Policy Rules Database | R functions and RData parameters for 13 programs and taxes | Repo pushed 2026-09-16; manual 2024-07-12 | GPL-3.0 | https://github.com/Research-Division/policy-rules-database | Verified: **no LIHEAP function**; `liheapData` is 12 DC rows, `ruleYear` 2021, unread; LIHEAP named in the manual's §1.3.1 list and §2.3.3 step 3 but has no section; no update-schedule row; absent from the program page |
| policyengine-us — `programs.yaml`, variables, parameters | LIHEAP `status: partial`: DC, MA, IL complete; TX `partial` (`tx_ceap`); OR `in_progress`; Riverside eligibility only. `ma_liheap` 1.308.0 (2025-06-07), `dc_liheap_payment` 1.345.0, `il_liheap` 1.389.0, `tx_ceap` 1.640.0 (2026-04-17); FY2026 amounts for DC/MA/IL 1.636.2; `gov/hhs/liheap/smi_limit`; `gov/hhs/smi` | `main` 2.6.4, 2026-09-16 | AGPL-3.0 | https://github.com/PolicyEngine/policyengine-us/blob/main/policyengine_us/programs.yaml | Verified; **none** in `gov/household/household_state_benefits.yaml` (2026-01-01) |
| policyengine-us — public API; closed PRs | API 1.764.6 serves `tx_ceap`, `ma_liheap`, `il_liheap`, `ca_riv_liheap_eligible`, `mi_home_heating_credit`. PRs NY #6413, ME #6448, RI #7320, AZ #6464, ID #6444 closed 2026-02-23 "old LIHEAP draft with merge conflicts"; OR #5333 the same day after "46+ reviews"; umbrella issue #256 open since 2022 | 2026-09-16 | — | https://api.policyengine.org/us/metadata; https://github.com/PolicyEngine/policyengine-us/pull/5333 | Verified live / closing comments |
| PolicyEngine — `liheap-repeal-dashboard` | DC/MA/IL calculator on a bundled **2024** snapshot (DC 10 levels, MA 6 brackets, IL 4) | Pushed 2026-05-09 | Next.js + JSON; **no license file** | https://github.com/PolicyEngine/liheap-repeal-dashboard | README verified |
| MyFriendBen — `benefits-api` | Calculators `co, il, ks, ma, mo, nc, tx, wa, cesn`; specs (ks, mo, tx, wa) with dated source snapshots. MO: 60% SMI monthly table (size 3 $4,588), flat $153 "because the per-fuel figures Missouri publishes are maximums" | Specs "verified as of 2026-08-21" | Python; MPL-2.0 | https://github.com/MyFriendBen/benefits-api/tree/main/programs/programs/cross_white_label/liheap | MO code and spec read |
| NCCP — Family Resource Simulator; Kentucky Benefits Cliff Report | LIHEAP modeled "as a reduction in expenses"; FY2023 SMI table as source; FRS in "at least fourteen states" | May 2024 | PDF; closed tool | https://www.nccp.org/wp-content/uploads/2024/08/Kentucky-Benefits-Cliff-Report.pdf | Quotes verified |
| Urban Institute NICC / ATTIS; APHSA cliffs dashboard | ATTIS described as including LIHEAP; APHSA lists LIHEAP among covered programs (policy changes, not rules) | — | Closed | https://nicc.urban.org/netincomecalculator/; https://aphsa.org/benefit-cliff-dashboard/ | NICC **unreachable** (HTTP 526, twice); APHSA search snippet only |
| NCSL, CBPP, MDRC, Leap Fund, Benefit Kitchen, CliffWatch; GitHub; academic | No state-by-state LIHEAP rule table found; CBPP is appropriations-focused; CliffWatch inherits policyengine-us coverage; `gh search repos LIHEAP` → 20 repos, none a rules dataset beyond the two above; two targeted searches found no paper quantifying the LIHEAP notch as a cliff | 2026-09-16 | — | — | Searched, nothing to cite |

## 3. The shape of the cliff — five states, household of three, FY2026

The federal ceiling is the greater of 150% FPG or 60% SMI; the floor is 110% FPG (statute, quoted
on the Clearinghouse page). FY2026 uses the 2025 guidelines: 100% FPG for three is $26,650, so
150% is $39,975 (MA and NM matrices). The Clearinghouse FY2026 table shows 31 heating limits at
60% SMI, 12 at 150% FPG, and eight elsewhere (MN 50% SMI; MI 110% FPG; NC and OK 130% FPG;
OH 175% FPG; IA and SD 200% FPG; MD a sliding 39–60% SMI by household size).

| | Texas | Massachusetts | Michigan | Iowa | Missouri |
|---|---|---|---|---|---|
| Design | 150% FPG; three income bands | 60% SMI; six income columns | 110% FPG heating as a refundable **tax credit**; crisis 150% FPG | 200% FPG; **points** matrix | 60% SMI; **flat** by fuel |
| Limit, size 3 | $39,975/yr ($3,331/mo) | $83,641/yr | Standard credit: income ceiling $28,414 (3 exemptions, 2024 booklet Table A) | $53,300/yr (inferred: 2 × $26,650; matrix says "Over 200% Ineligible") | $4,588/mo = $55,056/yr (MO DSS table via Clearinghouse DOCX and MyFriendBen spec) |
| Benefit by band | Max per component: $1,800 (0–50% FPG), $1,500 (51–75%), $1,200 (76–150%) — heating *and* cooling each (10 TAC §6.309(e)) | Non-subsidized utility/heat-in-rent: $500 → $460 → $425 → $390 → $390 → $355 at 100/125/150/175/200% FPL/60% SMI; deliverable fuel $600 → $430; plus HECS ("TBD") | Credit = standard allowance ($995 for 3) − 3.5% of household resources → reaches ~$0 exactly at the ceiling; booklet also instructs claimants to "reduce the heating credit by 50 percent" | $40/point; income points 8/6/5/4 for 0–75/76–100/101–125/126–200% FPL; fuel +4 (gas, electric) or +5 (LP, oil); targeting ±; min $80, max $800. A gas household with no targeting factors: $480 → $400 → $360 → $320 (inferred from the point table) | Natural gas $326, electric $318, fuel oil $326, propane $495, wood $219, kerosene $153 |
| Payments | Up to the per-component cap, year-round; crisis up to $1,800 | One heating-season benefit to the vendor | One credit per tax year | One regular benefit; ECIP crisis separately (max $800) | One payment |
| Shape at the limit | Staircase, then a notch of $1,200–$2,400 | Staircase, then a notch of $355–$430 | **No notch** on the standard credit (linear taper); a separate crisis notch at $39,975 | Staircase, then a notch of ≥ $320 | **Pure notch** of $318–$495 |
| FY2024 served / eligible | 66,597 / 2,646,113 = **3%** | 150,047 / 814,690 = **18%** | 435,260 / 511,575 = **85%** | 83,360 / 314,882 = **26%** | 115,212 / 641,169 = **18%** |
| FY2024 average benefit | Heating $1,102; cooling $3,178 (regular funds) | Heating $1,184 | Heating $181; crisis $951 (129,420 households) | Heating $466 | Heating $334; winter crisis $485 |
| Upstream | `tx_ceap` partial (FY2024–25 amounts; `uses_smi_threshold` false from 2025) | `ma_liheap` complete, FY2026 amounts | `mi_home_heating_credit` — on Michigan's refundable-credit list; **in HotGap's curve today** | none | none (MyFriendBen: eligibility + $153) |

Sources: TX and MA matrices and MO DOCX and IA PDF at the Clearinghouse `docs/2026/benefits-matricies/`
paths; MI from `MI_BenefitMatrix_2026_Heating-see-pg-11.pdf` (the MI-1040CR-7 booklet, 2024 tax
year); served/eligible and averages from the FY2024 ACF state profiles; upstream from
`programs.yaml` and the parameter files. **Michigan verified live** on the public API
(1.764.6): a single parent with children 6 and 9 at $20,000 of wages gets
`mi_home_heating_credit` = $180.38 and `household_net_income` falls by exactly $180.38 when the
credit is forced to zero.

**Is it a pure notch anywhere?** Only where the benefit is flat (Missouri; North Carolina pays
$300 or $400 in two bands for sizes 1–3). Everywhere else it is a staircase ending in a notch:
DC has ten income levels, Maryland seven (with a $25 "over 200% FPL" level running to its SMI
cap), Texas three, Massachusetts six, Iowa four, Pennsylvania a monthly-income × fuel × size
grid, Ohio a graduated matrix with a $441 maximum and a $24 minimum. Michigan's standard credit
and, apparently, Minnesota's formula (its XLSX carries "income percentile at which pay percent
starts/stops decreasing") are the two tapers. The last step is always the smallest, so the notch
at the limit is the state's *minimum* benefit at the top band, not its average.

## 4. Participation and exhaustion

- **National:** "In federal fiscal year (FY) 2022, about 12 percent of federally income eligible
  households received assistance with their heating costs" (HHS Performance Measures Report
  FY2022). NEUAC: 15.78% of eligible households received LIHEAP in 2021 (5.39M of 34.16M).
- **By state, FY2024 (ACF profiles):** TX 3%, CO 13%, MD 15%, MA 18%, MO 18%, OH 22%, IA 26%,
  MN 28%, NC 29%, VA 29%, MI 85%. Michigan is the outlier because its heating component is a tax
  credit claimed on a form, not a first-come application.
- **Exhaustion is not the whole story.** The same profiles list "Carryover to FY2025": MI
  $17.8M, OH $17.0M, NC $11.4M, VA $9.2M, MN $9.2M, MA $5.4M. States with 18–29% served still
  carried money over, so the served share reflects program windows, outreach and targeting
  (Assurance 5, "highest level of assistance … to those households which have the lowest incomes")
  as much as funds running out. The FY2022 RTC footnotes also warn that reported averages are not
  comparable to obligated funds per household because states obligate in one year and spend in
  the next.
- **What this means for a cliff drawing:** an entitlement-style LIHEAP line overstates the
  program for 70–97% of eligible families in every state but Michigan. The Texas averages
  ($3,178 cooling) are what the 3% received, not what a family at the limit can expect.

## 5. Options, ranked

| Rank | Option | Data dependency | What a family would see | Where it misleads | Retires when |
|---|---|---|---|---|---|
| **1** | **(c) Eligibility boundary as a marker, with the state's published top-band amount as a range, outside the money line** — "Above $X you can no longer apply for energy assistance here (worth $355–$430 a season in MA if you get it; about 1 in 5 eligible households does)." | Clearinghouse FY2026 limit table (51 rows, one line each: component, % and base); FPG (HotGap's `fpl2025`) and 60% SMI by size (the engine already serves `gov/hhs/smi`; the ACF PDF was not fetchable); top-band amounts from the state matrices; served share from the ACF profile. Yearly refresh: December (Clearinghouse), May (profiles). | An honest boundary with an honest odds statement; no phantom drop in the curve | Households in points or burden-based states get a range, not a number; the marker is per component (heating) and ignores crisis/cooling; MD's size-sliding SMI and the 8+/10+ size caveats need their own rows | Never fully — it is the truthful representation of a non-entitlement; the dollar part retires per state as upstream models the matrix *and* HotGap chooses to display upstream's amount |
| 2 | (a) Upstream contribution, state by state, then display upstream's amount (still outside net income unless take-up is modeled) | The FY2026 matrix per state; upstream's pattern exists (DC/MA/IL/TX). Cost signal: six state PRs closed stale in one day, Oregon after 46+ reviews. HotGap already reads `ma_liheap`-style variables per endpoint (the `statePremiumAssistance` probe pattern) | The state's real benefit at each income, staircase and all | Same take-up problem; and matrices change every FY with funding (Iowa's $/point, Ohio's max) — a yearly upstream chore per state | When `programs.yaml` shows the state complete and the variable is served by the endpoint HotGap is on |
| 3 | (b) HotGap-side 51-state table: limit + average benefit → a notch in the curve | Clearinghouse limits + RTC/profile averages; one yearly refresh | A dollar drop at the limit in every state | Wrong shape (average ≠ top-band minimum; a staircase becomes a single step), wrong probability (3–29% take-up drawn as 100%), and it puts an unmodeled program into the money line HotGap tells families to trust | When (a) or (c) lands — but it should not be built |
| 4 | (d) Unmodeled but named (today) | none | Nothing | Silent about a real boundary; and the coverage note "Not counted anywhere" is **already wrong for Michigan**, where the heating credit is inside the curve | Now: at minimum fix the Michigan note |

**Recommendation.** Do (c), and take the Michigan correction immediately: `coverage.ts`'s note
should say LIHEAP is unmodeled *except* Michigan's Home Heating Credit, which PolicyEngine pays
as a refundable state credit and HotGap therefore counts. Build the marker from a sourced 51-row
table (state, component, limit as % and base, top-band published amount, FY2024 served share,
URL, vintage) in the local-corrections style, retiring rows per state as upstream completes them.
Do not put LIHEAP dollars into net income until take-up can be shown, because the one honest
number is the served share and it is under 30% in every state checked but one.

## 6. Open questions

1. **Michigan:** how much of HotGap's Michigan curve is the Home Heating Credit, and does its
   3.5% taper interact with the archetype's "clothing allowance"-style bookkeeping? The
   booklet's "reduce by 50 percent" instruction and the 2026 parameters should be read from
   `parameters/gov/states/mi/tax/income/credits/home_heating/` before writing the note.
2. **ACF PDFs:** the FY2026 FPG/SMI attachments and the full FY2024/FY2025 profile set need a
   browser (acf.gov returns an empty 202 to curl). The Data Warehouse "custom reports" may export
   CSV of served/eligible for all 51 states — untested.
3. **FY2025 profiles** were not at the FY2024 URL pattern; the site says preliminary FY2025 data
   are loaded. Find the path before choosing the refresh month.
4. **Which limit is the family's?** Heating, cooling and crisis limits differ in four states (IA,
   MI, NC, OH; weatherization in many more), and nine states revert heating to 150% FPG above a
   household size (8+ to 14+). The marker needs a component rule.
5. **Minnesota's taper** (pay-percent slope in its XLSX) and **Maryland's size-sliding SMI**
   (39% for one person to 60% for >10) are the two designs the five-state sketch did not open.
6. **Upstream's Texas model** carries FY2024–25 amounts only; FY2026's matrix (Attachment 3,
   verified above) has the same $1,800/$1,500/$1,200 caps, so it is current by accident.
7. The **Clearinghouse "Colorado heating" link serves Delaware's matrix** — worth an email to
   the LIHEAP Webmaster and a reason never to key a scrape on link text.

## Appendix A — excerpts

**Clearinghouse FY2026 income eligibility (heating column):** 150 FPG — AL, AK, KS, KY, NE, NV,
NM, PA, TX, UT, VA, WA; 60 SMI — AZ, AR, CA, CO, CT, DE, DC, FL, GA, HI, ID, IL, IN, LA, ME, MA,
MS, MO, MT, NH, NJ, NY, ND, OR, RI, SC, TN, VT, WV, WI, WY; other — IA 200 FPG, SD 200 FPG,
OH 175 FPG (1–8 members), NC 130 FPG, OK 130 FPG, MI 110 FPG, MN 50 SMI, MD "1=39 SMI 2=40 SMI
3=41 SMI 4=41.7 SMI … >10= 60 SMI". Size caveats: AZ 10+, AR 8+, HI 11+, ID 8+, IL 12+, ME 10+,
MT 9+, NY 14+, WV 8+ revert to 150 FPG. "[Last updated: 12/15/2025] … Source: FY 2026 State
Model Plans".

**Clearinghouse FY2026 benefit levels (heating min–max):** TX $1–$12,600; MA $200–$600; MI
$1–$2,205; IA $80–$800; MO $153–$495; MD $25–$1,100; NC $300–$500; OH $24–$441; PA $200–$1,000;
MN $200–$1,400. "[Last updated: 11/24/2025] Source: FY 2026 State LIHEAP Plans."

**Texas FY2026 State Plan, Attachment 3 (10 TAC §6.309(e)):** "(1) Households with Incomes of 0
to 50% of Federal Poverty Guidelines may receive an amount not to exceed $1,800 per Component;
(2) … more than 50% but at or below 75% … $1,500 per Component; and (3) … more than 75% but at
or below 150% … $1,200 per Component."

**Massachusetts FY2026 HEAP matrix (dated 6/2/2025):** size 3 — 100% FPL $26,650; 125% $33,313;
150% $39,975; 175% $46,638; 200% $53,300; 60% SMI $83,641. Homeowners and non-subsidized tenants,
deliverable fuel: $600 / $550 / $510 / $470 / $470 / $430; utility and heat-in-rent: $500 / $460 /
$425 / $390 / $390 / $355. Subsidized tenants: $420→$300 and $350→$250. "High Energy Cost
Supplement (HECS) Thresholds - TBD". Sources cited on the matrix: 90 FR 5917 and LIHEAP-IM-2025-02.

**Iowa FY26 Appendix I:** poverty-level points 0–75% 8; 76–100% 6; 101–125% 5; 126–200% 4; "Over
200% Ineligible"; targeting factors +1 each (fixed income, elderly, disabled, children under 6,
detached dwelling), subsidized housing −2, 5-plex −1, heat in rent −4, over $50,000 savings −4;
fuel: natural gas 4, electric 4, LP 5, fuel oil 5, solid 2. "$40 per point … minimum … $80, and
the maximum is $800. … minimum Regular Assistance benefit for liquid propane and fuel oil LIHEAP
customers is $800."

**Missouri Appendix K – FFY 26:** 60% SMI monthly maximum, size 1 $2,840, 2 $3,714, 3 $4,588,
4 $5,461, 5 $6,335, 6 $7,209, 7 $7,373, 8 $7,537, 9 $7,701, 10 $7,864; fuel type payment: natural
gas $326, tank propane $495, electric $318, fuel oil $326, wood $219, kerosene $153, cyl. propane
$177. (MyFriendBen's spec, sourced 2026-08-20, carries the same table and notes a conflicting
lower figure on a MO DSS FPL chart, resolved in favour of the application form.)

**Michigan MI-1040CR-7 (2024), Table A:** exemptions 0–1 allowance $581 ceiling $16,586; 2 $788
/ $22,500; 3 $995 / $28,414; 4 $1,202 / $34,328; 5 $1,409 / $40,243; 6 $1,616 / $46,157; "+ $208
for each exemption over 6 / + $5,943 for each exemption over 6". "Michigan's home heating credit
is funded by the federal Low-Income Home Energy Assistance Program block grant."

**Maryland FY26 MEAP matrix:** Level 1 0–25% FPL … Level 5 151–200% FPL, Level 6 subsidized /
sub-metered, Level 7 "Over 200% FPL": gas $550 / $475 / $400 / $360 / $300 / $225 / $25;
electric $100 at every level but 7 ($25).

**ACF FY2024 profiles (verbatim labels):** "Total Households Served", "Income Eligibility
Requirements … for a 4-person household" (TX $46,800; MA $87,294; MI $31,818; IA $60,000; MO
$58,499; MN $62,820; OH $52,500; MD $81,865; NC $39,000; VA $45,000), "% of State Income-Eligible
Population Served", "State Income-Eligible Population", "Data are current as of May 30, 2025."

**PRD `liheapData` (R, `benefit.parameters.rdata`):** columns `ProgramName, stateName, stateFIPS,
famsize, ruleYear, CategoricalEligibility ("SSI, SNAP, TANF"), Income.Eligibility ("60% of SMI"),
ContinuousEligibility, Bin1Max…Bin10Max, MaxBenefit1…MaxBenefit10`; 12 rows, all "District of
Columbia", `ruleYear` 2021; size 3: bins $2,000 … $18,000 then $60,698 (60% SMI), benefits $1,290
… $567. `grep -i liheap functions/*.R` finds only two SNAP-SUA comments.

**policyengine-us `programs.yaml`, LIHEAP entry:** `status: partial`, `coverage: OR, DC,
Riverside County, MA, IL, TX`; TX note: "Models the FPG income limit, the FY2024-only SMI limit,
benefit amounts, and categorical eligibility through TANF enrollment, SNAP eligibility, and SSI
receipt. Not modeled - net rather than gross gambling winnings, the Medicare premium deduction
from counted Social Security, and the exclusion of means-tested veterans' pensions".

## Appendix B — not reachable on 2026-09-16

acf.gov PDF attachments (empty HTTP 202 to curl); Urban NICC (HTTP 526); ACF FY2025 state
profiles at the FY2024 URL pattern (404); APHSA dashboard (not attempted beyond search). The
Clearinghouse itself rejects the WebFetch tool's certificate check but serves to curl.
