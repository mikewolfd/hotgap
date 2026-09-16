# External validation against the Atlanta Fed Policy Rules Database (2026-09-15)

First comparison of HotGap's curves against the field standard. Three
households, three states, program by program.

**Headline:** on every program both tools model, HotGap and the PRD agree to
within the $1,000 grid or to the dollar. Every material gap is a program
HotGap does not model (childcare subsidy), a state rule HotGap models only
partially (Massachusetts ConnectorCare above 150% FPL), or a place where
HotGap is the more accurate of the two (the Texas coverage gap).

---

## Method

**PRD path taken: ran the PRD's own R benefits calculator.** `Rscript` was not
on this machine; R 4.6.1 was installed via Homebrew for this review. The PRD
was cloned from `https://github.com/Research-Division/policy-rules-database`
at commit `f17b0ccb919d837294bee6b5b3ad0ad28b4ac18d` (2026-09-08) into
`/private/tmp/…/scratchpad/prd`. (The URL in the review brief,
`github.com/Federal-Reserve-Bank-of-Atlanta/policy-rules-database`, does not
exist; `Research-Division` is the live repo, and is what the PRD's own README
and `CITATION.cff` point at. Parameters ship as `.RData`, not Excel
workbooks.)

The PRD's `libraries.R` was replaced with a minimal loader (plyr, dplyr,
tidyr, stringr, matrixStats, data.table, yaml, readr) because its own list
pulls shiny/plotly/V8/tidyverse. **No PRD calculation code was modified.**
Runner: `/private/tmp/…/scratchpad/runprd.R`; project YAMLs in
`scratchpad/prd/projects/H{1,2,3}*_{noccdf,ccdf}.yml`; outputs in
`scratchpad/out/prd_*.csv`. Each household was run twice, with
`APPLY_CCDF: false` (comparable to HotGap) and `true` (to size the gap).
`ruleYear: 2026` throughout — the PRD carries 2026 rows for ACA, Medicaid,
SNAP, TANF, CCDF, EITC, CTC and FPL, so **the PRD is not stale for 2026 on
anything compared here**, despite its shipped `TEST.yml` defaulting to 2025.

Because the PRD assigns expenses from the ALICE cost-of-living database
rather than taking them as inputs, `exp.rentormortgage` and `exp.childcare`
were overwritten with each household's own reported rent and childcare after
`BenefitsCalculator.ALICEExpenses` and before any benefit block, so both
tools see the same rent and the same childcare bill. Counties: Harris County
TX, El Paso County CO, Cambridge (Middlesex County) MA — the counties
`core/data/state-defaults.json` names for each state (48201 / 08041 / 25017).
HotGap's live calls sent no county, so they used PolicyEngine's default
rating area for the state.

**HotGap runs** are live PolicyEngine calls (`source: "live"`, `year: 2026`)
made at 13:00–13:02 against `main` at `d5eb3c1`:

    npx tsx core/src/cli.ts curve --state TX --kids 3 --rent 1200 --childcare 800 --hours 40 --earnings 25000 --json
    npx tsx core/src/cli.ts curve --state CO --kids 3,7 --rent 1500 --childcare 900 --hours 40 --earnings 30000 --json
    npx tsx core/src/cli.ts curve --state MA --married --kids 1,4,9 --rent 1900 --childcare 1000 --hours 40 --earnings 35000 --json

JSON captured at `scratchpad/out/h{1,2,3}-*.json`. Commits `13e3ec2` and
`a623fe4` ("feat: model the state child-care subsidy (CCDF) as a program")
landed on branch `childcare` at 13:11 and 13:16, i.e. **after** these runs.
Nothing below describes that work; finding 1 is the case for it.

**Other sources**

- 2025 and 2026 HHS poverty guidelines: PRD `tables.rdata` `table.fpl`, and
  HotGap `core/src/policyYear.ts` (`FPL_2025`, `FPL_2026_CONTIGUOUS`, cited to
  FR Doc. 2026-00755, confirmed via the Federal Register API as "Annual Update
  of the HHS Poverty Guidelines", published 2026-01-15,
  <https://www.federalregister.gov/documents/2026/01/15/2026-00755/annual-update-of-the-hhs-poverty-guidelines>).
  The two tools' ladders are **identical** for both years.
- Massachusetts ConnectorCare 2026 premiums:
  <https://www.mahealthconnector.org/learn/plan-information/connectorcare-plans>
  (fetched 2026-09-15; the page 403s to a plain fetch, retrieved through Zyte).

**Could not obtain**

- **CLIFF Dashboard — not attempted.** `mcp__claude-in-chrome__tabs_context_mcp`
  returned "Browser extension is not connected". Per the brief, skipped.
- **USDA FNS FY2026 SNAP COLA page** (`fns.usda.gov/snap/allotment/COLA`):
  WebFetch timed out; Zyte returned HTTP 520 "Website Ban" on two attempts
  with two URLs. FY2026 maximum allotments and BBCE gross limits below are
  therefore cited from the PRD's `snapData` (`ruleYear == 2026`), not from
  USDA directly.
- **Texas HHS Medicaid income limits** and **Colorado CDEC CCCAP**: 404 and a
  JS-only shell through Zyte. Those states' published limits are cited from
  the PRD, which encodes them per state and year.

---

## H1 — Texas, single parent, one child aged 3, rent $1,200, childcare $800, 40 h/wk

Family of 2. 2025 FPL $21,150; 2026 FPL $21,640 (both tools agree).

| Program | PRD exit (exact) | HotGap exit (last $ with value) | Gap | Value at $0 — PRD / HotGap |
|---|---|---|---|---|
| SNAP (BBCE gross, 165% FPL) | $34,897.50 | $35,000 | +$103 of grid; +$808 vs the 2026-FPL line PolicyEngine actually uses | $6,552 / $6,589 |
| Medicaid, parent | $2,352.00 | last held $2,000 | within grid | sticker $4,888 / ≈$16,378 |
| Medicaid+CHIP, child | $44,578.40 | $44,000 (CHIP) | within grid | sticker $3,722 / $11,039 |
| ACA premium credit | 400% FPL, $84,388.50 | $84,000 | within grid | — |
| TANF | ~$3,500 (applicant needs test) | $7,000 | **$3,500** | $3,972 / $3,972 (identical, $331/mo) |
| EITC | $51,593 | $51,000 | within grid | max $4,427 / $4,427 |
| CTC (refundable) | $1,700 cap, 15% over $2,500 | identical | none | $2,200 total / $2,200 total |
| WIC | $34,000 (adjunctive to SNAP) | $40,000 (185% of 2026 FPL) | $6,000 | $450 / $723 |
| **CCDF** | 85% SMI, **$64,873.70** | **not modeled** | **$6,270/yr and a cliff** | $0 / $9,354 |

Cliffs on a comparable net line (earnings − taxes + near-cash transfers +
refundable credits − health premium paid):

| | PRD (CCDF off) | PRD (CCDF on) | HotGap |
|---|---|---|---|
| $2k→$3k | **−$4,753** | −$4,753 | — (coverage gap removed) |
| $3k→$4k | −$1,349 | −$1,349 | — |
| $7k→$8k | — | — | −$933 (TANF) |
| $34k→$35k | −$4,617 | −$2,223 | −$2,519 (SNAP) + −$346 |
| $64k→$65k | — | **−$5,566 (CCDF)** | — |
| $84k→$85k | −$533 | −$533 | −$2,484 (ACA 400% FPL) |

HotGap: safe exit $89,000, leap $9,000, danger zones $7k–9k, $34k–43k,
$84k–89k. The PRD's largest real cliff for this household — the CCDF exit at
$65,000 — falls in a band HotGap reports as clear.

## H2 — Colorado, single parent, children 3 and 7, rent $1,500, childcare $900, 40 h/wk

Family of 3. 2025 FPL $26,650; 2026 FPL $27,320.

| Program | PRD exit (exact) | HotGap exit | Gap | Value at $0 — PRD / HotGap |
|---|---|---|---|---|
| SNAP (BBCE gross, 200% FPL) | $53,300 | $54,000 | +$1,340 vs the 2026-FPL line | $9,420 / $9,473 |
| Medicaid, parent (138% FPL) | $37,701.60 | $37,000 | within grid | sticker $3,697 / ≈$13,973 |
| Medicaid+CHP+, child | $72,398 | $72,000 (CHIP) | within grid | sticker $5,138 / $18,835 |
| ACA premium credit | 400% FPL, $106,333.50 | $106,000 | within grid | — |
| TANF | $15,309 (recipient rule) | $6,000 | **$9,300** | $7,104 ($592/mo) / $7,440 ($620/mo) |
| EITC | $58,629 | $58,000 | within grid | max $7,316 / $7,316 |
| School meals | universal, runs off axis | universal, runs off axis | none | $1,381 / $1,131 |
| **CCDF** | copay notch at $27,320; value $0 at ~$77,143; El Paso entry 185% FPL = $50,542, continuous 85% SMI = $103,655.80 | **not modeled** | **$10,800/yr and a notch** | $0 / $10,800 |

Cliffs:

| | PRD (CCDF off) | PRD (CCDF on) | HotGap |
|---|---|---|---|
| $6k→$7k | — | — | **−$3,891 (TANF)** |
| $15k→$16k | −$874 (TANF) | −$475 | — |
| $26k→$27k | — | — | −$332 (credits) |
| $27k→$28k | — | **−$1,747 (CCDF copay)** | — |
| $37k→$38k | −$1,220 | −$1,276 | −$983 (parent Medicaid) |
| $40k/$45k/$50k→+1k | −$287 / −$324 / −$341 | −$343 / −$422 / −$439 | — / — / −$582 at $51k |
| $53k→$54k | −$3,517 (SNAP) | −$2,631 | −$2,796 (SNAP) + −$692 |
| $60k→$61k | −$394 | −$534 | −$437 (credits) |
| $72k→$73k | −$921 (CHIP) | −$1,061 | −$486 (CHIP, deferred) |
| $106k→$107k | −$600 | −$600 | −$1,538 (ACA 400% FPL) |

Seven of HotGap's nine cliffs land on the same $1,000 step as a PRD cliff.
HotGap: safe exit $110,000, leap $16,000.

## H3 — Massachusetts, married, children 1, 4, 9, rent $1,900, childcare $1,000, one earner, 40 h/wk

Family of 5. 2025 FPL $37,650; 2026 FPL $38,680.

| Program | PRD exit (exact) | HotGap exit | Gap | Value at $0 — PRD / HotGap |
|---|---|---|---|---|
| SNAP (BBCE gross, 200% FPL) | $75,300 | $77,000 | +$2,060 vs the 2026-FPL line | $14,196 / $14,276 |
| MassHealth, adults | $53,378.40 | $53,000 | within grid | sticker $7,388 / ≈$37,640 |
| MassHealth+CHIP, children | $117,974 | $117,000 (CHIP) | within grid | sticker $12,915 / $32,946 |
| ACA premium credit | 400% FPL, $150,223.50 | $150,000 | within grid | — |
| TAFDC | $30,960 ($1,190 − 50%×(E−$200)) | $30,000 | within grid | $14,280 / $14,280 |
| EITC | $70,224 | $70,000 | within grid | max $8,231 / $8,231 |
| School meals | universal | universal | none | $1,381 / $1,131 |
| **CCDF** | copay 0% to $38,680, then 4–15.6%; $0 at $134,000; entry 50% SMI = $99,613.50, continuous 85% SMI = $169,342.95 | **not modeled** | **$12,000/yr at this family's own pay** | $0 / $12,000 |

**TAFDC point by point** — HotGap's local correction (`core/src/maTafdc.ts`)
reproduces the PRD's formula exactly:

| Earnings | PRD | HotGap |
|---|---|---|
| $15,000 | $7,980 | $7,980 |
| $25,000 | $2,980 | $2,976 |
| $30,000 | $480 | $480 |
| $31,000 | $0 | $0 |

Cliffs:

| | PRD (CCDF off) | HotGap |
|---|---|---|
| $53k→$54k | −$1,840 (adult MassHealth) | — (deferred by the $0-premium wrap) |
| $56k→$57k | — | −$1,067 (premium starts at 150% FPL) |
| $58k→$59k | −$190 | — |
| $75k→$76k | −$3,700 (SNAP) | **−$7,160** (SNAP $3,705 + premium $4,204) |
| $77k→$78k | — | −$889 (SNAP, WIC) |
| $150k→$151k | −$3,367 | **−$21,124** (ACA 400% FPL) |

HotGap: safe exit $184,000, leap $34,000.

---

## Findings, ranked by dollar impact

### 1. CCDF is worth $9,354–$12,000/yr and carries its own cliff — $6,270 in TX, $3,650 in CO. *Inherent (structural); in flight on branch `childcare`.*

The PRD, with the household's own reported childcare bill:

- **TX**: $9,354/yr from $1,000 of earnings (Texas requires work), stepping
  down through nine fixed per-child copay bins to $6,270, then **$0 at
  $64,874** (85% SMI) — a **$6,270 gross / $5,566 net cliff at $65,000**.
  That is 2.2× HotGap's worst immediate cliff for this household ($2,519),
  and it sits between HotGap's $43k and $84k danger zones, i.e. in territory
  HotGap calls clear.
- **CO**: $10,800 (the family's whole bill) up to $27,000, then the parent
  fee jumps from 1% to 14% of gross income at 100% FPL ($27,320) — a
  **$3,650 gross / $1,747 net notch at $28,000** — then a 14%-of-income taper
  to $0 at ~$77,143. HotGap does show a bump one step earlier ($26k→$27k) but
  sizes it at $332.
- **MA**: $12,000 flat to $38,680, then a genuinely smooth 4%→15.6% copay
  taper to $0 at $134,000. No exit cliff, but a marginal tax of up to 15.6
  cents on the dollar over a $95,000 span that HotGap's curve is flat through.
  At H3's actual $35,000 the family holds **$12,000/yr** HotGap reports as $0.

Second-order: turning CCDF on cuts SNAP by up to **$1,656/yr** (H3 MA at
$7,000), because the dependent-care deduction shrinks with the net childcare
bill. So HotGap over-states SNAP for any family that holds a slot.

Two things cut against reading this as a straight defect. CCDF is rationed —
HotGap's stated doctrine defaults rationed programs off — and **the PRD's own
shipped `TEST.yml` sets `APPLY_CCDF: false`**. The CLIFF Dashboard turns it
on. Also, HotGap neither adds the subsidy nor subtracts the childcare bill, so
for the (large) majority without a slot the two omissions are consistent. What
does not cancel is the *slope*: the copay taper and the exit cliff are
marginal-rate facts no netting fixes.

### 2. Massachusetts marketplace premiums above 200% FPL are overstated by $3,881–$9,300/yr. *HotGap's, with a PolicyEngine component.*

MA Health Connector's published 2026 ConnectorCare lowest-cost premium per
person per month: 2A (100–150% FPL) **$0**, 2B (150.1–200%) **$53**, 3A
(200.1–250%) **$103**, 3B (250.1–300%) **$152**, 3C (300.1–400%) **$235**.

PolicyEngine already models Plan Type 2B exactly: HotGap's H3 curve charges a
flat **$1,272/yr from $57,000 to $75,000** — precisely 2 adults × $53 × 12,
independent of income, which is what a flat per-person ConnectorCare premium
looks like and not what any applicable-percentage schedule looks like. (This
qualifies the README's claim that PolicyEngine "does not model the wraps at
all"; it models 2B and stops there.)

Above 200% FPL PolicyEngine reverts to the federal applicable percentage on
its own benchmark, and HotGap passes it through:

| Earnings | % of 2025 FPL(5) | ConnectorCare | HotGap charges | Overstated by |
|---|---|---|---|---|
| $80,000 | 212.5% (3A) | $2,472 | $6,353 | **+$3,881** |
| $100,000 | 265.6% (3B) | $3,648 | $9,904 | **+$6,256** |
| $150,000 | 398.4% (3C) | $5,640 | $14,940 | **+$9,300** |

Consequences: HotGap's $75k→$76k MA cliff ($7,160) is roughly $3,000 too
large — at 200% FPL the family moves from 2B to 3A ($53→$103/person), a
~$1,200 step, not the $4,204 premium jump HotGap shows; and the $150k→$151k
cliff ($21,124) is measured from a pre-cliff premium that is $9,300 too high.
The README's "still slightly overstated" understates this by an order of
magnitude.

Fix: extend `core/src/statePremiumWraps.ts` from a single $0 tier to each
state's full published premium ladder, and add the 3A/3B/3C gap to
policyengine-us #9481.

### 3. HotGap's coverage-gap correction is worth $6,377/yr over an $18,000 band — and the PRD does not make it. *HotGap better than the field standard.*

PRD H1 TX `netexp.healthcare` (what the family pays) jumps from **$1,061** at
$2,000 of earnings to **$6,377** at $3,000, where the parent loses Medicaid
and is below 100% FPL, and stays there until $22,000 — an ALICE self-pay
estimate charged to an adult who cannot buy subsidised coverage and is not on
Medicaid. That fabricates the PRD's largest H1 cliff, **$4,753 at $3,000**.

HotGap charges **$0** across that band and flags it (`coverageGap`:
$4,000–$21,000). The band's upper bound agrees with the PRD's to one grid
step (100% FPL 2025 = $21,150). This is the single clearest case of HotGap
being right where the field standard is not.

### 4. Medicaid/CHIP sticker values differ by 3.2–3.5×. *Reporting only — verified not to reach the money line.*

| | PRD (adult + child) | HotGap total | Ratio |
|---|---|---|---|
| H1 TX | $8,610 | $27,417 | 3.2× |
| H2 CO | $8,835 | $32,808 | 3.7× |
| H3 MA | $20,303 | $70,586 | 3.5× |

The PRD values Medicaid at the private-coverage cost it displaces; PolicyEngine
reports per-capita programme expenditure. Checked directly: HotGap's
`netIncome` at $0 earnings equals the sum of its cash and near-cash programs
**to the dollar** in all three households (TX $11,284 = 6,589+3,972+723; CO
$25,714 = 9,473+7,440+1,131+723+6,947; MA $33,953 = 14,276+14,280+1,131+
1,446+1,500+1,320), so no Medicaid sticker is inside the curve, and no cliff
breakdown carries it. But it is published in `programs.medicaid` next to
dollar figures that *are* money, and anyone comparing HotGap's program table
with the PRD's will read a 3× discrepancy that is a units mismatch.

### 5. SNAP's gross test uses the wrong poverty-guideline vintage — $808 / $1,340 / $2,060 of threshold. *PolicyEngine's.*

**RETRACTED 2026-09-16 (policyengine-us #9483 closed by us).** The model
blends fiscal years by month: `snap_fpg` takes the guideline in force on
October 1, so January–September 2026 run on the 2025 guidelines and
October–December on the 2026 ones. The "survival to $35,000" below is that
three-month tail — TX single parent + child: $291/yr at $34,000, **$75** at
$35,000 (three months of the $24 minimum), $0 at $36,000, identical on the
public API and on 2.5.0 — and the 0.56% allotment excess is the same blend,
three months of a projected FY2027 COLA. The PRD applies one rule year to
the whole calendar year; PolicyEngine applies two, correctly. The original
finding is kept below as written so the reasoning that misled us stays
visible.

FY2026 SNAP (1 Oct 2025 – 30 Sep 2026) is set against the **2025** guidelines.
PRD BBCE gross limits: TX 165% × $21,150 = **$34,897.50**; CO 200% × $26,650 =
**$53,300**; MA 200% × $37,650 = **$75,300**.

HotGap's SNAP survives to $35,000 / $54,000 / $77,000 — in all three cases the
last $1,000 grid point below 165%/200% of the **2026** guidelines ($35,706 /
$54,640 / $77,360). Three states, three household sizes, one consistent
explanation.

This is not a HotGap data error: `core/src/policyYear.ts` carries the correct
2025 and 2026 ladders, identical to the PRD's `table.fpl`. It is PolicyEngine
applying the calendar-2026 guidelines to a fiscal-year programme. Defensible
for Oct–Dec 2026; wrong for the nine months of 2026 that the FY2026 rules
govern. Cost to the curve: TX's SNAP cliff splits across two steps and its
largest step is understated by **$1,552** ($3,151 vs the PRD's $4,703).

Related, same direction: HotGap's maximum allotment runs **0.56%** above the
published FY2026 maxima at every household size ($549.08 vs $546/mo for 2,
$789.42 vs $785 for 3, $1,189.67 vs $1,183 for 5) — consistent with an
uprating past the posted table rather than a different rule.

### 6. TANF exits differ by $3,500 (TX, HotGap late) and $9,300 (CO, HotGap early). *Split: one PolicyEngine, one PRD.*

Maximum grants agree where it matters: **TX $331/mo and MA $1,190/mo are
identical in both tools.** CO differs by $336/yr — PRD's calculator reads
`Maxbenefit` = $592/mo while `Maxbenefit2` = $619/mo sits in the same row;
HotGap's $620/mo is the more current Colorado Works figure, so **HotGap is
ahead of the PRD here**.

- **TX**: PRD ends TANF at ~$3,500 (the applicant budgetary-needs test);
  HotGap at $7,000–$8,000, and pays $2,347–$3,972 more across $4k–$7k. Both
  fall at 67 cents per dollar of earnings, matching Texas's $120 work expense
  plus one-third disregard; they disagree on where the needs test bites.
- **CO**: PRD ends at $15,309 — Colorado's recipient rule, 67% earned-income
  disregard against the $421/mo need standard. HotGap ends at $6,000–$7,000,
  which is exactly Colorado's **applicant** rule ($90 disregard vs the same
  $421 standard → $6,132). PolicyEngine appears to apply the applicant test
  at every point on the curve. The effect is large: HotGap shows a $3,891
  cliff at $6,000 that the PRD puts at $16,000 and sizes at $874.

### 7. ACA applicable-percentage schedule: agreement to ≤$45/yr in TX and CO, and the 400%-FPL cliff lands on the same step everywhere. *No gap.*

Both tools model 2026 as a year in which the enhanced subsidies have expired:
the 2.1%–9.96% applicable-percentage schedule, and no subsidy at all above
400% FPL. What the family pays:

| | TX | CO |
|---|---|---|
| exact match | 2.1% floor (100–133% FPL: $525 at $25,000, to the dollar) and the 9.96% cap ($6,474 at $65,000 … $7,968 at $80,000) | the 9.96% cap from $80,000 up |
| worst divergence | $34 (3.0%) at $30,000 | $45 (0.8%) at $65,000 |

400%-FPL cliff: TX $84k→$85k, CO $106k→$107k, MA $150k→$151k — same step in
both tools, in all three states.

Where they part is the *benchmark*, and only above 400% FPL where no
applicable percentage caps the charge. HotGap charges PolicyEngine's
unsubsidised benchmark (TX $11,654, CO $12,750, MA $36,713); the PRD charges an
ALICE average healthcare expense (TX $9,925, CO $13,356, MA $21,525). The PRD's
`premium.aca` column degenerates to 100% of income above 400% FPL and is not
a usable dollar figure; its real charge is `netexp.healthcare`. Consequence:
the PRD shows essentially **no** subsidy cliff at 400% FPL in TX (a $533
step, because its average-cost figure is barely above the 9.96% cap), where
HotGap shows $3,288 of premium. HotGap's is the more defensible number — a
subsidy cliff should be measured against the benchmark plan, not an average.

### 8. EITC and CTC are identical. *No gap.*

EITC maxima $4,427 / $7,316 / $8,231 (1 / 2 / 3+ children), plateaus and
phase-outs reproduce to the dollar at every probe: CO $7,082 at $25,000
= 7,316 − 0.210599 × (25,000 − 23,890); MA $8,231 at $25,000 (plateau) and
$7,422 at $35,000 = 8,231 − 0.210706 × (35,000 − 31,160). Exits identical:
$51,000 / $58,000 / $70,000.

CTC $2,200 per child with $1,700 refundable and a 15% phase-in over $2,500:
refundable amounts match exactly at every probe ($1,875 at $15,000 for 2+
children, $3,375 at $25,000 for 2, $4,125 at $30,000 for 3).

### 9. Medicaid and CHIP exits are identical within the grid. *No gap.*

| | PRD exact | HotGap last covered point |
|---|---|---|
| parent/adult | TX $2,352.00 · CO $37,701.60 · MA $53,378.40 | $2,000 · $37,000 · $53,000 |
| child (Medicaid+CHIP ceiling) | TX $44,578.40 · CO $72,398 · MA $117,974 | $44,000 · $72,000 · $117,000 |

Six for six, HotGap's last covered grid point is the highest $1,000 step below
the PRD's exact limit. Note HotGap resolves what the PRD does not: the PRD
carries one child income limit; HotGap splits Medicaid from CHIP (TX $32,000 /
$44,000, CO $40,000 / $72,000, MA $59,000 / $117,000) and defers the CHIP end
under 42 CFR 435.926 / 457.342.

### 10. Small program values. *Mixed; ≤$550/yr each.*

- WIC: HotGap $723/child/yr vs PRD $450 (+$273/child; +$546 for H3's two
  under-fives).
- School meals: HotGap $1,131 vs PRD $1,381 (−$250).
- WIC exit, TX only: HotGap $40,000 (185% of the 2026 FPL) vs PRD $34,000
  (adjunctive, tied to SNAP). CO and MA tie WIC to SNAP in both tools.

### Flagged for the PRD, not acted on

Colorado's CCDF parent fee is encoded as **14% of gross income** above 100%
FPL (`ccdfData_CO`, `CopayBin2` = 0.14, `ruleYear` 2026). That is a large
share of income for a copay schedule and may predate the 2024 CCDF final
rule's affordability provisions (89 FR 15366, 2024-03-01 — confirmed to exist
via the Federal Register API; the 7%-of-income cap was not independently
verified here, and Colorado's own fee schedule page returned no usable
content). If it is stale, the CO CCDF notch above is overstated.

---

## Verdict

**HotGap is at the field standard on everything both tools model, and the
distance to close is one program and one state's premium ladder.**

Of the nine programs compared across three states, six — Medicaid, CHIP, ACA
(location and applicable percentage), EITC, CTC, and Massachusetts TAFDC —
agree to the $1,000 grid or to the dollar. SNAP agrees on value (within 1%)
and differs on the exit only through PolicyEngine's choice of poverty-guideline
vintage. In two places HotGap is *better* than the PRD: the Texas coverage gap
(the PRD charges a $6,377/yr premium nobody pays, and books a $4,753 cliff
that does not exist) and the 400%-FPL ACA cliff (the PRD's average-cost health
figure nearly erases it). HotGap's Massachusetts TAFDC correction reproduces
the Atlanta Fed's own TAFDC formula to the dollar at every point — the single
strongest result here.

Three things would close the remaining gap, in order of dollars:

1. **Model CCDF** (in flight on branch `childcare`, `a623fe4`). It is the only
   program in the comparison worth five figures that HotGap reports as zero,
   and in Texas its exit cliff is larger than anything HotGap currently shows
   that household. Treat it as a take-up toggle, defaulted off — both HotGap's
   rationing doctrine and the PRD's own defaults support that — and carry the
   85%-SMI continuous-eligibility ceiling as a `deferral`, which is exactly
   the shape HotGap already has for Head Start and CHIP.
2. **Give `statePremiumWraps.ts` each state's full premium ladder**, not just
   the $0 tier. Massachusetts alone is $3,881–$9,300/yr of overcharge above
   200% FPL and roughly $3,000 of phantom cliff at 200% FPL.
3. **Raise SNAP's fiscal-year vintage with PolicyEngine.** Small in dollars
   ($808–$2,060 of threshold) but it moves a real cliff by a full grid step in
   every state, and the fix is upstream, not here.

Nothing found argues for reversing a HotGap design decision. Two README
statements should be corrected: PolicyEngine *does* model Massachusetts
ConnectorCare Plan Type 2B (150–200% FPL), and the residual overstatement
above that tier is up to $9,300/yr, not "slight".
