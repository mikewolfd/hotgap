# HotGap — blind policy-data review (pre-launch)

Reviewer role: public-economics postdoc (EMTR / benefits-cliff literature, PolicyEngine, ACS PUMS). Blind: no task, review or audit files opened. Evidence is the served site at `http://localhost:8787` (build of 2026-09-24, policyengine-us 2.6.10), the code in `core/src`, `pipeline/src/metrics.ts`, `scripts/build-reach.mjs`, and `core/data/{summary.json,states/*.json,reach.json}`. Scripts and screenshots are in `scratchpad/reviews/pol/` (`check1.mjs`, `check2.mjs`, `*.txt` text dumps, `*.png`).

## Summary (5 lines)

1. The measurement core is sound and unusually honest: keep rate = 1 − EMTR over a fixed federal road, cliffs attributed dollar-for-dollar, deferred losses labelled not excused, reach stated as cross-sectional with SDR margins of error, every "past the axis" cell refused as a value.
2. **Blocker:** "net income" adds the child-care subsidy as cash but never subtracts the child-care bill. The levels "Money kept at the poverty line" ($52,157–$88,959) are 30 % subsidy at the median (corr 0.93 with the county care price), and a caseworker what-if that adds $2,500 rent + $2,400/month care makes the client **$6,443 richer**.
3. **Blocker:** the headline "In 26 of the 50 states … ends up poorer" is a maximal-take-up construct: strip the child-care subsidy (which reaches ~1 in 6 eligible children) and 4 states are negative, none by more than 6¢. The subtitle says the subsidy is on; the headline does not.
4. **Major:** the keep rate's top end sits exactly on the most common program limit (200 % FPL), so the ranking is a knife-edge: Minnesota "keeps 9¢" (rank 32) with a $27,483 exit at $56k; New Jersey "loses 94¢" (rank 3) with the same exit at $54k. Move the road top by $2,000 and MN reads −82¢.
5. **Major:** for the two-earner rows the "road from the poverty line to twice it" is the householder's pay only; the family's actual earnings run from 147 % to 253 % of its poverty line.

---

## RED TEAM — findings, by severity

### R1 (blocker) — "Net income" counts the child-care subsidy as money and never charges the care bill

**Where:** `/places` Measure "Money kept at the poverty line" / "Money kept at twice poverty"; the state panel ("New Jersey … from **$79,175** at the poverty line to **$52,937** at twice it"); the table columns "Kept at the line / Kept at twice it"; `/caseworker` "Net after premiums"; `/` "you keep $42,797, help counted".

**Definition on the page:** "What the household keeps in a year — help and tax credits counted, taxes and health premiums out."

**What the code does:** `core/src/parse.ts` builds `netIncome = household_net_income − spm_unit_medical_out_of_pocket_expenses (+ subsidy where PolicyEngine dropped it)`. PolicyEngine's `household_net_income` is market income + benefits − taxes; `pre_subsidy_childcare_expenses` is an input that is never subtracted. The subsidy (`child_care_subsidies`) is inside benefits. So a family charged $29,880 of care (CA, LA county) and paid $29,880 of subsidy shows +$29,880 and −$0.

**Evidence:**
- `core/data/states/CA.json` single-2: net income at $0 pay = $26,684; at $1,000 pay = $57,512. The $30,828 jump is the subsidy switching on with the activity test — "net income" rises by a year's care price the moment the parent earns a dollar.
- `check2.mjs` over 51 states, single-2 at road lo: subsidy share of `netAtRoadLo` is 30 % at the median (min $5,532 MS, max $42,120 VT); corr(netAtRoadLo, subsidy) = **0.93**, corr(netAtRoadLo, netAtRoadLo − subsidy) = 0.68. The "Money kept at the poverty line" ranking is mostly a ranking of the most-populous county's center-based price. The headline for that measure — "keeps least in Oklahoma ($52,157) and most in Vermont ($88,959)" — is literally: Vermont's care costs $42,120.
- `/caseworker` what-if (`cw-whatif.txt`): "Now" = no rent, no care, net $42,797. What-if "Rent $2,500 a month, Child care $2,400 a month" (no subsidy) → net **$49,240, "Change from now +$6,443"**. The client acquires $58,800/yr of obligations and the sheet says they are better off, because the bill only enters through SNAP's dependent-care/shelter deductions and the CDCC. A caseworker will read this as a bug, and it is one.

**Why it matters for the slope too:** for the *keep rate* the treatment is defensible (losing the subsidy = paying the bill; the Atlanta Fed CLIFF tool does the same) *only* for a family that keeps buying that care. That is the stated construct, fine. But the *levels* are not defensible under any reading: "$79,175 at the poverty line" is not what a New Jersey single parent at $27,000 "has".

**Fix:** subtract `pre_subsidy_childcare_expenses` (the sweep's `monthlyChildcare × 12`, the caseworker's entered bill) from `netIncome` wherever the subsidy is added, so levels and slopes describe the same cash-after-care quantity. Then rename the levels "Money left after care and premiums". If that is too invasive before launch, drop the two level measures from the menu and the "from $X at the poverty line to $Y" clause from every sentence, and make the caseworker sheet show "child-care bill" as a line item beside "Net after premiums". Do not launch the caseworker page with the +$6,443 behaviour.

### R2 (blocker) — The headline count is a maximal-take-up construct and the headline does not say so

**Where:** `/places` default: "In **26** of the 50 states and the District of Columbia, a single parent of two children climbing from the poverty line to twice it ends up poorer than they started — 20 of them before the step out of twice poverty." (en.json `some`). Also "In 21 …" for single-3, "In 20 …" for married-dual-2.

**Evidence** (`check2.mjs`, recomputed from `states/*.json` points; the summary's 26 matches — the 27th is CT at −0.00003 rounding to "keeps 0¢"):
- with subsidy in net income: **27** states negative;
- `netIncome − programs.childcare` (the family still pays the bill, no subsidy — the "-nosub" twin that `archetypes.ts` defines but the committed sweep does not contain): **4** states negative (DC −6¢, HI −6¢, MD −0¢, MA −1¢);
- TANF stripped instead: 26 (TANF is not what drives it; 1 state's road-worst is TANF).
- 23 states are negative *only because* of the subsidy exit: AL AZ CO DE FL GA ID IN IA MI MO MT NE NV NJ NC OH OR PA VA WV WI WY.

CCDF serves roughly 15 % of federally eligible children (ASPE FY2021 estimate; the site's own methodology says "roughly one in six"). The subtitle does say "getting the child-care subsidy", and the notes say "a map without it understates every state" — but a subsidy that most eligible families never receive does not "understate" their cliffs; it describes a different family. A legislator quoting "in 26 states a single parent of two ends up poorer" will be quoting a fact about subsidy recipients.

**Fix:** put the condition in the headline sentence: "…a single parent of two **who gets the child-care subsidy** ends up poorer …". Sweep and publish the `single-2-nosub` twin (already defined in `archetypes.ts`; `build-reach.mjs` correctly maps it to the same reach cell) and show the pair: "with the subsidy: 26 states; paying full price with no subsidy: 4". That pair is the honest headline and it is more interesting than either number alone.

### R3 (major) — The keep rate is a two-point slope whose top end sits on the most common program limit, so the ranking is a knife-edge

**Where:** `/places` keep-rate ranking and map; the state panel's "loses 94¢ of each extra dollar on average".

**Definition:** `road.ts`: `keepRate = (net(hi) − net(lo)) / (hi − lo)`, lo = round(FPL), hiStart = ceil(2×FPL), hi = hiStart + $1,000. For a family of three: $27,000 → $55,000. The one-step "allowance" is explicitly there to catch a limit sitting *on* 200 % FPL (SNAP BBCE, several states' CCDF).

**Evidence** (`check1.mjs`, recomputed from points):

| state | 27k→54k (to the line) | 27k→55k (published) | 27k→57k | 27k→60k | published rank |
|---|---|---|---|---|---|
| WI | −13¢ | **−105¢** | −95¢ | −82¢ | 1 |
| CO | −10¢ | −100¢ | −92¢ | −80¢ | 2 |
| NJ | −2¢ | −96¢ | −87¢ | −76¢ | 3 |
| OR | +17¢ | −75¢ | −68¢ | −62¢ | 4 |
| PA | +16¢ | −57¢ | −50¢ | −41¢ | 8 |
| **MN** | **+22¢** | **+9¢** | **−82¢** | **−72¢** | **32** |

Minnesota's child-care exit ($27,483) lands at $56,000→$57,000, one step past the allowance; New Jersey's ($26,206) at $54,000→$55,000, inside it. The two states' rules treat this family almost identically; the page ranks one 3rd-worst and the other in the gentle middle. Spearman between the published rank and the rank with the road top at $57k is 0.95 — the tails are what move, and the tails are what get quoted. The "Keep rate to the line" column (nice) shows the *other* side of the edge only; nothing shows the +$2k side.

A two-point slope over a $28,000 span is the *average* EMTR, which is the right statistic for "does the climb add up" — but it has zero information about where the wall is inside the span and full sensitivity to whether the wall is inside or outside it.

**Fix (choose one, all cheap):**
(a) Publish the road with a **band top** rather than a point — e.g. report keep rate to 200 % and to 220 % (or to 85 % SMI for the household, the CCDF ceiling) side by side, as the table already does for "to the line"; colour the map by the *worse* of the two and say so.
(b) Add a road measure that does not depend on the endpoint: "deepest fall on the road" = min over [lo, hi+k] of net(x) − net(lo) — for MN that is −$24,728, for NJ −$26,838, and the ranking is stable.
(c) At minimum, in the state panel, when the largest cliff within $5,000 past the road top exceeds the road's worst, say "a $27,483 loss sits $2,000 past the top of this road".

### R4 (major) — For two-earner households the "road from the poverty line" starts at 147 % of poverty

**Where:** `/places` Household "2 adults, both working, 1/2/3 child(ren)": "In 20 of the 50 states …, a two-earner couple with two children climbing from the poverty line to twice it ends up poorer …"; the measure text "from the poverty line ($32,000) to just past twice it ($66,000)".

**Evidence:** `road.ts povertyRoad` puts `lo = FPL(householdSize)` on the axis, and the axis is the householder's own pay (`archetypes.ts`: "ONE EARNER MOVES … the first held at $15,080"). For married-dual-2, `summary.json` NJ: `roadLo 32000, roadHi 66000`. Family earnings at road lo = $32,000 + $15,080 = $47,080 = **146 % FPL** for a family of four ($32,150); at road hi, 252 %. Every program threshold on that road is tested against family income, so the claim "the poverty line to twice it" is wrong for those three rows, and the "20 states" number describes a 147→253 % climb. (The reach lookup, by contrast, gets this right: `reachLookup.ts reachAtEarnings` adds the spouse's pay before reading the ladder.)

**Fix:** define the road on **household** earnings: `lo = max(0, FPL − spouseEarnings)`, `hi` likewise, snapped to the grid, and say "from the poverty line ($32,150 of family pay; the second earner's $17,000) to twice it". Where that runs below the axis floor, report null as the code already does for short axes. Same fix applies to the household tool's "poverty line / 2× poverty" markers when a spouse's pay is entered.

### R5 (major) — "Number of cliffs" and "Cliffs on the road" are grid artefacts and reward small notches

**Where:** `/places` Measure "Raises that lose money (any pay)" — "Vermont's curve carries 19 cliffs for this household, more than any other state."; "Raises that lose money (poverty–2×)" — "Indiana puts 7 cliffs on the road".

**Evidence:** VT single-2 drops > $200 by size: 4 are exactly $216 (three at $109k/$116k/$122k), 15 of 18 are under $1,000; OR: 7 of 16 under $500. Re-sampled at a $2,000 step, VT has 5 cliffs, OR 5, CA 7 (`analyze.ts` documents that the floor is "loses more than it gains, plus $200", so a wider step hides more). A count of $200 notches is a property of the sampling step and of how a state's copay/premium schedules are bracketed, not of how rough the state is; the state with the most cliffs (VT) keeps +4¢ on the road and its road-worst is $2,499.

**Fix:** either drop the two counts from the *ranking* menu (keep them in the table as descriptors) or count only *material* cliffs (e.g. drop ≥ $1,000 or ≥ 5 % of net) and say so in the option label. Also state on the page that the count is at a $1,000 step.

### R6 (major) — "Losses that hit later, at renewal" is ranked and shaded as if more deferral were worse

**Where:** `/places` Measure "Losses that hit later, at renewal" — "Washington has the most cliffs that wait: 2 land at a later renewal"; map darkest at 2; ranking "most first".

The deferred count is a label, not a harm scale (the page's own words: "They are real losses; what the column says is which of them wait"). A state with two deferred cliffs has two cliffs that are *cushioned* by continuous eligibility / TMA. Colouring WA darkest and headlining it as "the most" invites the reading that WA is the worst, which is the opposite of what the measure says. A count from 0 to 2 across 51 states also has no discriminating power.

**Fix:** remove it from the Measure menu (keep the table column and the per-cliff "Waits" chips, which are excellent). If it must stay, make it a share ("of this state's cliffs, how many wait") and use a neutral, non-ordinal palette.

### R7 (major) — Reach uncertainty is quoted in the wrong unit

**Where:** `/caseworker` "Reach at current earnings **38th** percentile, **±$2,500** (n = 2887)"; `/` "About 4 in 10 parents like you in California are paid $30,000 a year or less. **The count could be off by a few thousand dollars either way.**"

A percentile does not have a dollar margin; the ladder point does. The $2,500 is the 90 % MOE of the p35/p40 ladder points (`reach.json` CA single-2 `moe[7..8]` = 2,500 / 2,100). Converted, $30,000 ± $2,500 spans roughly p33–p40, i.e. "38th, could be anywhere from the 33rd to the 40th". "The count could be off by … dollars" is a category error a numerate reader will notice.

**Fix:** invert the MOE through the ladder (percentile at income ± MOE) and print "38th percentile (33rd–40th)"; on `/`, "somewhere between 3 and 4 in 10".

### R8 (major) — The caseworker provenance line cites sources the curve did not use

**Where:** `/caseworker` "Rent: HUD Office of Policy Development and Research, Fair Market Rents FY2026 … Child-care price: county 2018, carried to 2026 dollars by the BLS ECI" — on a household whose "What we assumed" says no rent and no child care (and whose net, $42,797, equals the `/` page's no-rent figure to the dollar).

Provenance that is boilerplate is worse than none: a reader will assume FMR rent was charged and the SNAP shelter deduction taken. **Fix:** print rent/child-care sources only when those inputs were filled from defaults; otherwise "Rent: none entered (SNAP shelter deduction not taken)".

### R9 (minor→major, depends on audience) — Option labels do not match the definitions

- "Total pay range where raises lose money" (menu) vs the table's definition "every stretch where more pay leaves the household **no better off**" (below an earlier peak). Inside a danger zone most $1,000 raises *gain* money; the zone is a below-peak stretch. CA single-2 (no subsidy) zone $28k→$43k: 3 of 15 steps lose money (the caseworker page says exactly this). The menu label is wrong; the table text is right.
- "Raise needed to get clear" (leap) is fine; "Pay where raises stop losing money" (safe exit) has the same problem as above — raises stop *leaving you below the old peak*.
- "Money kept at the poverty line" — see R1.

**Fix:** "Pay range spent below an earlier peak"; "Pay above which no earlier peak is higher".

### R10 (minor) — FPL vintage is quoted as the 2026 poverty line

**Where:** `/places` notes: "$26,650 to $53,300 for a family of three at 2026 rules".

`policyYear.ts` uses the **2025** guideline ($15,650 + $5,500) for the road because "the 2026 policy year runs on" it; the same file carries `FPL_2026_CONTIGUOUS` ($15,960 + $5,680; family of three $27,320) and uses it for Medicaid overrides. A reader will cite $26,650 as "the 2026 poverty line". Say "2025 HHS guideline, the one the 2026 marketplace and SNAP year use". Low stakes: the road is federal and identical across states either way.

### R11 (minor) — Three different "keep rates" on one household, one word

`/` chart: "on average you keep 19¢ of each extra dollar" (road 27k→55k); `/` headline: "From here to $43,000 you keep about 20¢" (to the zone exit); `/caseworker` compare table: "keeps 12¢ of the next $10,000". All three are defined in code (`road.ts keepRate`, `keepNext`) and each is right; a reader sees "keep X¢" three times with three numbers. Label the span in the sentence each time ("of the next $10,000", "from $30,000 to $43,000", "from the poverty line to twice it").

### R12 (minor) — "It happens again between $106,000 and $119,000. The ones past $106,000 are past what 8 in 10 families like yours earn."

`/` CA single-2 step list. "It" (the drop) does not happen again — there is one $7,059 cliff at $107k and a danger zone to $119k. And "the ones past $106,000" — there is one. Rephrase: "You'd stay below the $106,000 level until $119,000; fewer than 2 in 10 families like yours earn that much."

### R13 (minor) — Bins on the diverging keep-rate scale have unequal widths on the two sides

"four steps of 26¢ below zero and two of 15¢ above it". A −26¢ bin and a +15¢ bin get the same visual weight; the two darkest oranges span 30¢, the four purples 105¢. The legend prints the numbers, which saves it, but a map reader compares shades, not labels. Use one step width across zero (e.g. 25¢), letting the positive side have fewer bins.

### R14 (minor) — Colour direction on the two "level" maps

"Money kept at the poverty line": darkest = keeps least (bad). Keep rate: darkest purple = worst. Consistent in sense (dark = bad), but the level uses a single-hue sequential ramp and the keep rate a purple/orange diverging one, so on the level map the mid-tone reads like "zero" to someone who just left the keep-rate map. Fine once R1 is fixed; if the levels stay, add "darkest = keeps least" to the legend line itself (it is only in the bins sentence).

### R15 (minor) — Reach cell definition vs "families like this"

The reach cell is (state × single/married × two-earner? × NOC bucket), householder 18–64, householder+spouse PERNP. "Families like yours" for kids 3 & 7 includes single parents of two teenagers and, for NOC ≥ 3, all larger families. This is stated nowhere on `/` or `/caseworker` ("parents like you", "families like this"). One clause — "single parents with two children under 18 in California" — fixes it. Also: `seZero: true` on the CA single-2 cell (an interior ladder point with zero replicate variance) is carried in the data and rendered nowhere.

### R16 (minor) — The Household menu omits the shape most exposed to the subsidy cliff without the subsidy

Eleven shapes, all with the subsidy on wherever every parent works. The `-nosub` twin exists in code for single-2 only and is not in the committed summary. Since the subsidy is the largest driver of every negative keep rate (R2), the menu currently has no row for the family the site's own methodology calls "most eligible families". Add the twin to the sweep and the menu, labelled "1 adult, 2 children, pays for care, no subsidy".

---

## GREEN TEAM — what is right and must not be lost

1. **Keep rate = 1 − EMTR over a fixed federal road, said in cents.** This is the field's own quantity (CBO, Atlanta Fed CLIFF, Urban NTJ papers) and the choice of a *federal* road — rejecting min-wage-to-median because it "makes the poorest states look kindest" — is the correct call and is explained in `road.ts` with the evidence. The two-question menu structure ("On the road" vs "Anywhere on the curve") is exactly the right carving: the tallest wall and the wall families actually meet are different questions, and the page says so ("that wall sits above the median family's earnings in 39 states of 50" — verified: 39 of 50 `biggestLossPosition > 50`).
2. **Cliff attribution that sums to the drop.** `breakdown = {benefits, credits, premiums, other}` summing exactly, with Medicaid/CHIP deliberately *excluded* from the money line ("a coverage sticker price, never cash") and reported as a lost program instead. Most cliff tools value Medicaid at its cost and manufacture a cliff; this one does not, and says why. Do not "fix" this by adding a Medicaid valuation.
3. **Deferred cliffs counted, then labelled.** Continuous eligibility and TMA are modelled as timing, not exemption, with CFR cites in the rendered text. The per-person-group notch test (a parent losing Medicaid while children keep it) is a genuine improvement over household-total tests. Keep the chips; just do not rank on the count (R6).
4. **Reach done properly.** Householder+spouse PERNP (not household income) so the yardstick matches the axis; working-age householder; one-/two-earner split symmetric on both adults' PERNP; SDR variance over 80 replicate weights with the Census formula; suppression on relative MOE of the median with n ≥ 30 as a floor only; 5-year fallback per cell for small states; ECI growth to 2026 dollars; "cross-sectional, never one family's chance" printed at every use. This is better than most published policy briefs. Keep every word of "This says how common the pay is. It doesn't say what you'll earn."
5. **Refusing to chart bounds as values.** "Past the axis is not a number", "≥ a figure", "Hatched is not low", and "no cliff found — a measurement of zero, not a small loss" are the right epistemic categories, and the map/ranking exclude them. A naive fix that fills them (e.g. plotting the axis top as the safe exit) would be worse.
6. **Provenance at the number.** Run date, model version, county, FMR vintage, childcare-price vintage and stand-ins, which corrections HotGap applied on top of PolicyEngine, and a "Cite as" line. The corrections panel ("added by HotGap", "modeled") is the kind of audit trail journalists need. Keep it; make it conditional (R8).
7. **The "to the line" sensitivity column.** Publishing the keep rate both with and without the one-step allowance, and printing "Measured to exactly twice poverty, 20 states are negative rather than 26" in the notes, is honest boundary reporting. R3 asks for the other side of the boundary too, not for removing this.
8. **Danger-zone asymmetry documented in code** (opens after $200 below peak, closes at the first dollar above) so "safe exit" is read as the earliest exit. Keep, and put the one-line version on the page.
9. **Take-up defaults split by program type** — entitlements on, rationed programs off, each switchable, with "what you're leaving on the table" — is the right default for the *personal* tool. The sweep's opposite choice for the subsidy is defensible as a policy question *if* it is in the headline (R2).
10. **Things a naive fix would break:** (a) subtracting the childcare bill only in the sweep but not on `/caseworker` would make the two pages disagree on the same household; do it in `parse.ts`/`evaluate.ts` once. (b) Widening the grid to "fix" cliff counts would hide real $600 cliffs (SNAP at $37k in CA); fix the *ranking*, not the sampling. (c) Replacing the fixed federal road with a state-relative one (min wage → median) was measured and rejected for a good reason; R3 asks for a band top, not a state-specific road. (d) Removing the deferred-cliff *labels* to fix R6 would lose one of the site's best features; remove only the ranking.

---

## Top five changes

1. **Charge the child-care bill.** Subtract `pre_subsidy_childcare_expenses` from `netIncome` wherever the subsidy is added (`parse.ts`), so "Money kept" is cash after care and a what-if that adds $2,400/month of care no longer raises net by $6,443. Until then, pull the two level measures and the "from $X to $Y" clause from the state panel.
2. **Condition the headline on the subsidy and publish the twin.** "…a single parent of two **who gets the child-care subsidy** ends up poorer in 26 states; paying for care with no subsidy, in 4." Sweep `single-2-nosub` into `summary.json` and add it to the Household menu.
3. **De-knife-edge the road.** Report the keep rate to 200 % *and* to a second top (220 % FPL, or the household's 85 % SMI), colour by the worse, and/or add "deepest fall on the road" (min net − net at lo) as a road measure; flag in the state panel any cliff within $5,000 past the road top that exceeds the road's worst (Minnesota: $27,483 at $56k).
4. **Define the road on family earnings for the two-earner rows** (`lo = FPL − spousePay`), and fix the poverty-line markers on `/` and `/caseworker` the same way.
5. **Take counts out of the ranking and fix the units.** Remove "Raises that lose money (count)" and "Losses that hit later" from the Measure menu (keep them as table columns); relabel "Total pay range where raises lose money" → "Pay range spent below an earlier peak"; print reach uncertainty as a percentile range ("38th, 33rd–40th"), not "±$2,500"; make the caseworker source line conditional on the inputs actually used.
