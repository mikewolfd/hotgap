# Context-blind rerun: `/places` as a reporter on deadline — 2026-09-16

Brief: an editor sent the link `https://hotgap-next.hotgap.workers.dev/places` with "see if there's a story about our state in this". No documentation, no source, no network tab, no repo. Only the rendered page, screenshots, mouse and keyboard. "Our state" is Ohio; Texas, New Jersey, Nebraska and New Mexico were also tried.

Setup: Playwright Chromium (headless), 1280×900 laptop, then 390×844 phone with touch. Screenshots are under `/Users/mikewolfd/Work/HotGap/design/review/places-context-blind-rerun/`. The only non-visual thing I did was read the option lists of the three `<select>`s from the DOM, because headless Chromium does not paint an open native dropdown; that is the same text a user sees on click. The CSV was opened with `head`/`grep` after downloading it through the page's own button.

Severity: **B** a cold reader draws a wrong conclusion or cannot do one of the eight tasks; **S** had to guess, guessed right eventually; **N** friction.

---

## Walkthrough

### 1. First ten seconds (above the fold)

Screenshot: `/Users/mikewolfd/Work/HotGap/design/review/places-context-blind-rerun/01-laptop-above-fold.png`

What I saw before scrolling or clicking: the word "HotGap", a headline **"What a raise costs, state by state"**, two paragraphs, three controls (Household, Measure, "Download these rows (CSV)"), a tile map of the states in five shades of pink-to-plum with one white tile (NM), and a "Ranked" list on the right beginning "1. MD $33,587".

What I thought it was: a benefits-cliff site. The map colours each state by how much take-home income a family can lose from one $1,000 raise. The number is dollars lost. Maryland is worst.

What told me that, and when:
- The headline said "what a raise costs" (second 1).
- The first paragraph's last sentence — "Each figure is the worst single $1,000 step of earnings in that state's curve for that household — how much net income falls when pay goes up by a thousand dollars" — told me what the number is (seconds 3–6). The first half of that paragraph, "Fifty-one sets of rules, eleven household shapes, one earnings scale", I decoded only later: 51 = 50 states + DC, which I confirmed by finding DC on the map; eleven = the Household dropdown's option count.
- The second paragraph defined *cliff* ($1,000 raise that cuts net income by $200 or more) and *danger zone*, named PolicyEngine as the source, and said "Estimates only" (seconds 6–10).
- The map's own subtitle, "1 adult, 2 children (3 and 7). Net income lost in the worst single $1,000 step of earnings", repeated it.

Immediate reporter reaction: "$33,587 lost from a $1,000 raise?" I did not believe it until I clicked Maryland much later and saw the cliff hits at $97,000 → $98,000 for a Montgomery County renter. That "at what income" is nowhere above the fold.

The white NM tile had no explanation above the fold; the legend that explains it ("No cliff found (1)") is just below the fold.

### 2. The dropdowns

Options read from the controls (what a click would show):

**Household** — 11 options: "1 adult, no children"; "1 adult, 1 child (3)"; "1 adult, 2 children (3 and 7)" (default); "1 adult, 3 children (1, 4, 9)"; "2 adults, one working, no children"; …"2 adults, one working, 3 children (1, 4, 9)"; "2 adults, both working, 1 child (3)"; …"2 adults, both working, 3 children (1, 4, 9)".
Expectation: recolours the map for a different family. Result: yes. The map subtitle, the caption's bin bounds, the ranked list, the big table and the download filename all changed. `09-household-single-0.png` (1 adult, no children: four white "no cliff" tiles — MD, NM, WA, WI — and a $205–$8,644 scale). `09-household-single-0-OH.png` shows Ohio's sentence becoming "$1,443 lost at $20,000 → $21,000, when SNAP ends." Label matched. Every option was understandable without a glossary. I did have to guess that ages in parentheses are the children's ages (they are).

**Measure** — 6 options: "Largest one-step loss ($)" (default); "Width of the worst danger zone ($)"; "The leap — the raise needed to clear the worst danger zone ($)"; "Safe exit — earnings above which no danger zone remains ($)"; "Number of cliffs"; "Deferred cliffs — of the cliffs counted, those that land at a later renewal".
Expectation: recolours the map and re-ranks the list. Result: yes, and the map title and subtitle rewrite themselves per measure (`03-measure-dangerWidth-a.png`, `03-measure-leap-a.png`, `03-measure-safeExit-a.png`, `03-measure-cliffCount-a.png`, `03-measure-deferredCliffCount-a.png`). Label matched. The definitions in the option text are the *only* place "the leap" and "safe exit" are defined in plain words, and the closed control truncates them: "The leap — the raise needed to clear the worst danger zo" on the laptop (`14-measure-dropdown-truncated-zoom.png`) and "…the worst dan" on the phone (`14-phone-measure-leap-controls-and-map.png`). I guessed "the leap" was "how big a raise you need to jump the gap" and the map subtitle confirmed it once selected. "Deferred cliffs" I could not have guessed; the subtitle once selected explains it (Head Start carry-over, 12 months continuous Medicaid/CHIP, TMA).

Under "The leap" and "Safe exit" the map grew dashed-border grey tiles (NY, MD; plus NE for safe exit) and a new legend entry, "Runs past the top of the axis (2)". The ranked list grew a separate block above the numbered ranks: "At least this much — the exact size runs past the axis (2)" with "MD ≥ $53,000, NY ≥ $55,000", and for safe exit "Past the top of the axis — no safe exit found on the scale (3)" with "past the axis" as the value. The little glyph in those rows (`06-past-axis-rows-zoom.png`) looks like a loading spinner; I waited for it to resolve.

**Table order** — 7 options: "State, A to Z" (default); "Largest one-step loss, largest first"; "Width of the worst danger zone, largest first"; "The leap, largest first"; "Safe exit, largest first"; "Number of cliffs, most first"; "Deferred cliffs, most first".
Expectation: re-sorts the big table only. Result: yes, and only the table; the map and ranked list kept their own measure. The reverse is also true: changing Measure does not reorder the table. I expected them to be linked; the URL (`?measure=…&sort=…`) told me they are two independent settings.

**Download these rows (CSV)** — see section 6.

The rest of the page has no other controls: "HotGap" at the top is not a link, there is no navigation, and the only links are "PolicyEngine", "Details below ↓" (after selecting a state), "reported to PolicyEngine" and "fhb.hhs.texas.gov" (in Texas's corrections).

### 3. Your state

**Ohio.** Found it on the tile map by abbreviation (grid roughly geographic; OH between IN and PA). Found it in the ranked list at "32. OH $12,062" after scrolling. Found it in the table at row "OH".

I clicked the OH tile. What appeared:
- The tile got a dark outline (`04-click-OH-a.png`).
- Under the map, in place of "Select a state on the map or in the table.", a sentence: **"Ohio — $12,062 lost at $38,000 → $39,000, when CCDF child care subsidy ends. Renter, Franklin County. Details below ↓"**
- The ranked-list row "32. OH" got a left bar and tint (`04-click-OH-b.png`).
- The section heading "Corrections applied — choose a state" became **"Corrections applied in Ohio (0)"**, repeating the sentence and adding: "PolicyEngine's own figures for Ohio stand as served; HotGap changed nothing on top of them — the fixes other states need were not needed here. Child-care subsidy: inside PolicyEngine's net income for Ohio." Then a source line: "Estimates only. Rules: 2026. Rent: HUD … Fair Market Rents; FY2026 revised schedule … County: Franklin County (the state's most populous; Vintage 2024 …). Child-care price: county price, 2018 study, carried to 2026 dollars by the BLS Employment Cost Index. Model: policyengine-us 2.6.2. Weekly run of Sep 17, 2026."
- The URL gained `&state=OH`.

Did I notice? Yes, because **the whole page jumped**. Measured: scrollY went from 0 to 1201 on the laptop and 282 to 1324 on the phone; focus landed on the H3 "Corrections applied in Ohio (0)" (`12-after-click-OH-no-rescroll-laptop.png`, `12-after-click-OH-no-rescroll-phone.png`). The map, the legend and the tile outline were now above the viewport. On the first click I thought I had followed a link to another page. To click Texas next I had to scroll back up ~1,200px, and the same jump happened again. The information that arrived was right; the delivery was disorienting.

The big table did not highlight OH (`04-click-OH-c.png`).

**Texas** (`04-click-TX-a.png`, `04-click-TX-b.png`): "Texas — $13,938 lost at $77,000 → $78,000, when CCDF child care subsidy ends. Renter, Harris County." **"Corrections applied in Texas (3)"**: "Medicaid — parent income limit" chip *overridden*; "CCDF child care subsidy" chip *added by HotGap*; "Premium tax credit — coverage gap" with no chip. Each with a paragraph naming a PolicyEngine issue number.

**New Jersey** (`04-click-NJ-a.png`, `04-click-NJ-b.png`): "$26,206 lost at $54,000 → $55,000, when CCDF child care subsidy ends. Renter, Bergen County." Corrections (2): "NJ Health Plan Savings" *modeled*, "CCDF child care subsidy" *added by HotGap*; plus "Also in New Jersey's net income (1): New Jersey ANCHOR property-tax relief, renter benefit … Up to $450 a year on this run."

**Nebraska** (`04-click-NE-a.png`, `04-click-NE-b.png`): "$15,336 lost at $49,000 → $50,000, when CCDF child care subsidy ends. Renter, Douglas County." Corrections (0). Nothing here hints that Nebraska's safe exit is "past the axis"; I only learned that from the table.

**New Mexico** (`04-click-NM-a.png`, `04-click-NM-b.png`): "New Mexico — no cliff found for this household. Renter, Bernalillo County." Corrections (2): "New Mexico Premium Assistance" *modeled*, "CCDF child care subsidy" *added by HotGap*. Source line differs: "Child-care price: national median price, 2018 study" where the others say "county price". Nothing says *why* New Mexico has no cliff, which is the first question an editor would ask.

Do I understand it for the story? For the headline measure, yes: one sentence with dollars, the income step, the program, the tenure and the county. For any other measure, no: with **Safe exit** selected and Nebraska clicked (`05-safeExit-NE.png`) the sentence under "Safe exit, by state" still reads "Nebraska — $15,336 lost at $49,000 → $50,000…". The same for Maryland under **The leap** (`05-leap-MD.png`): the "≥ $53,000" is never put into words for the state. The sentence is measure-blind; the tile's hover title is not ("Ohio: $110,000" under safe exit).

Are Ohio's and Texas's numbers on the same footing? From the table, they look identical in kind: both "complete", both plain dollar cells. Only by clicking both did I learn Texas needed three corrections and that its cliff-making benefit (CCDF) was "added by HotGap", while Ohio's was "inside PolicyEngine's net income". The methodology bullet says corrections are applied "before any figure … was read", so I read them as *making* the two comparable, and I would say so with a caveat. Nothing in the table or ranked list carries that count; the CSV's `corrections_applied` column does.

### 4. The numbers

The printable sentence for Ohio, built from the page: *A single parent of two children, ages 3 and 7, renting in Franklin County, whose earnings rise from $38,000 to $39,000 ends up $12,062 worse off in net income after health-insurance premiums, because the family's CCDF child-care subsidy ends; the figure is a HotGap estimate from the PolicyEngine tax-and-benefit model at 2026 rules, run Sep 17, 2026.*

I could write it. Where each piece came from: headline figure and step from the sentence under the map; benefit from the same sentence ("when CCDF child care subsidy ends"); household from the dropdown and map subtitle; tenure and county from "Renter, Franklin County"; "net income after health-insurance premiums" from the caption; model and date from the caption and footer.

What is missing:
- Whether $12,062 is net of the $1,000 raise. The header ("how much net income falls when pay goes up by a thousand dollars") says it is the fall in net income, so yes — but I had to re-read to be sure.
- The income at which it happens is not in the ranked list or table for any state; I learned Maryland's $33,587 hits at $97,000 only by clicking. That comparison is the story.
- The curve. "$38,000 → $39,000" is one point on "that state's curve", and there is no way to see the curve.
- Why New Mexico has none.
- "Sep 17, 2026" is tomorrow. The CSV's `sweep_generated` is `2026-09-17T01:16:58Z`, i.e. 9:16 pm Eastern on Sep 16; the page prints a UTC date without saying so. I would not have known that without the file.

Does the legend explain every odd-looking state? Yes for this household: the white tile ("No cliff found (1)") and the dashed tiles ("Runs past the top of the axis (2)"/"(3)") each have a legend entry with a matching count, and the ranked list's separate blocks carry the same counts. No state was hatched for any household I tried, and the methodology says so per household ("no state is hatched for 1 adult, 2 children (3 and 7)"). The "Hatched is not low" box explains the case in advance.

### 5. The tables

**Ranked list** (beside the map): rank, state, a dot on a bar, value. Axis ends labelled with the min and max ("$5,190 … $33,587"). Ties share a rank ("4. CT $82,000 / 4. VT $82,000 / 6. OR"). Rank 1 is always the largest value; nothing says "worst", and for "Safe exit" I had to reason that a higher exit is worse. Under "Deferred cliffs" 14 states are "1." and 36 are "15.", which is a ranking of a yes/no.

**Big table** "All 51, every measure": State | Largest one-step loss | Danger zone width | The leap | Safe exit | Cliffs | Deferred | Figures. Cell kinds seen: dollars; "≥ $53,000" (MD, NY under The leap); "past the axis" (MD, NE, NY under Safe exit); "none" ×4 for NM; integers; "complete" in every Figures cell. Headers have no tooltips. "The leap" and "Safe exit" are undefined anywhere near the table; "Deferred" is one word; "Figures: complete" is the only value ever shown, in all 11 households, so I cannot learn what its other value looks like or means.

Sorting: each "largest first" option did what it said (`07-sort-*-top.png`). Under "The leap, largest first" and "Safe exit, largest first" the unknowns are grouped *at the top* under a bold row "At least this much — the exact size runs past the axis (2)" / "Past the top of the axis — no safe exit found on the scale (3)" (`07-sort-leap-top.png`, `07-sort-safeExit-top.png`). "No cliff found (1)" NM goes to the bottom in every order.

Worst and best per measure (this household), and whether I trust it:
- Largest one-step loss: worst MD $33,587; smallest cliff TN $5,190; NM none. Trust: yes, with "at $97,000" needed next to MD.
- Danger zone width: worst CO $90,000; best SD/TN $35,000. Trust: yes.
- The leap: the list says "1. WI $76,000", but MD "≥ $53,000" and NY "≥ $55,000" sit above it with no rank. I would *not* print "Wisconsin's leap is the biggest"; the page cannot say. Worse, for "1 adult, 3 children" (`13-single-3-leap.png`) the list says "1. WI $129,000" directly beneath "CO ≥ $129,000" — Colorado's is at least as large, and the "1." is on the same screen.
- Safe exit: MD, NE, NY "past the axis" (effectively beyond the highest measured, but the page insists it "is not a number"), then "1. VT $148,000"; lowest IA/IN/ND/NV $108,000. Trust "Vermont is the highest measured"; would not print "Vermont is the worst".
- Cliffs: worst VT 19; fewest MD/MN/NH/NY 4; NM 0. Trust: yes.
- Deferred: 14 tied at 1. Not rankable.

### 6. Getting the data out

"Download these rows (CSV)" saved `hotgap-1-adult-2-children-3-and-7-2026-09-17.csv`: 52 lines (header + 51 states), 29 columns, in the table's current order. Header:

`state,state_name,archetype_id,archetype,biggest_one_step_loss,biggest_loss_at,biggest_loss_programs,danger_zone_width,leap,safe_exit,cliff_count,deferred_cliff_count,leap_is_lower_bound,no_cliff_found,comparable,figures,unmodeled_programs,corrections_applied,county_name,county_fips,rent_vintage,county_vintage,childcare_price_vintage,policy_year,sweep_generated,model_label,model_endpoint,model_version,source`

Ohio row: `OH, Ohio, single-2, "1 adult, 2 children (3 and 7)", 12062, 38000, CCDF child care subsidy, 57000, 47000, 110000, 10, 0, false, false, true, complete, (blank), (blank), Franklin County, 39049, FY2026 revised schedule (effective 2025-10-01), Vintage 2024 (July 1, 2024 estimates), county 2018, 2026, 2026-09-17T01:16:58.798Z, "HotGap hosted engine, policyengine-us 2.6.2", 45.55.61.191.sslip.io, 2.6.2, HotGap/PolicyEngine`.

Every column matches the methodology's list, and `biggest_loss_at` and `corrections_applied` are in the file even though they are not in the table. Maryland's row has `safe_exit` blank and `leap_is_lower_bound=true`, exactly as the page said ("Empty dollar cells are a state with no cliff or a safe exit past the axis; the flags say which figures are floors or lower bounds"). `model_endpoint = 45.55.61.191.sslip.io` is an IP address dressed as a hostname; in a file I might hand to a data desk it looks like a developer's box.

Citation: the page's footer gives one — "Cite as: HotGap, *What a raise costs, state by state*, 2026 rules on PolicyEngine (policyengine-us 2.6.2), run of Sep 17, 2026, https://hotgap-next.hotgap.workers.dev/places?household=single-2&measure=biggestLoss&sort=state" — and the URL grows `&state=OH` when Ohio is selected. The CSV carries no citation line, but its `source`/`model_*`/`sweep_generated` columns are enough to reconstruct one.

Methodology: "How these numbers were made" (seven bullets), "What the model does not include" (four bullets), and two call-out boxes ("Hatched is not low", "Past the axis is not a number"). It answered: what net income means (health-adjusted, premiums net of subsidy, no deductibles); who the household is (typical renter in the most populous county, HUD FMR, DOL child-care price, ECI-adjusted); that CCDF is on and Head Start/vouchers off; what "deferred" means; what corrections are; what the CSV columns are; that AK/HI premium figures are understated; that LIHEAP is excluded. It did not answer: what "the leap" and "safe exit" are (used, never defined, in the "Past the axis" box); the axis top as a dollar figure; why NM has no cliff; whether "Sep 17" is UTC.

### 7. The phone (390×844)

`10-phone-above-fold.png`: headline, both paragraphs and the two dropdowns fit above the fold; the download button is just below. Order down the page: map → legend → "Select a state…" → caption → "Corrections applied — choose a state" → Ranked → No cliff found → the big table → methodology → footer. Page height 9,534px; no horizontal page scroll.

Map (`10-phone-scroll-01.png`, `14-phone-measure-leap-controls-and-map.png`): tiles are 28×28px, abbreviations legible, dashed borders and the white NM tile still visible, legend fits on one line. I found OH by eye without trouble and tapped it (28px is a small target, but it hit). The same jump happened: the viewport landed on "Corrections applied in Ohio (0)" (`11-phone-tap-OH-viewport.png`), with the map two screens up.

Ranked list: full width, readable, OH highlighted (`10-phone-scroll-04.png`).

Table (`10-phone-scroll-05.png`, `11-phone-table-unswiped.png`): only State, Largest one-step loss and Danger zone width are visible; The leap, Safe exit, Cliffs, Deferred and Figures need a horizontal swipe inside the table. The State column stays put while swiping (`11-phone-table-swiped-end.png`), which made reading Ohio's row possible. So: the flags column cannot be read without swiping, and nothing on screen says the table continues to the right except a clipped "Danger zone width" header. The one-line intro above the table ("All six measures for …") appears to sit inside the scroll container and shifts with the swipe.

Nothing became impossible; the table became a two-hand job.

### 8. The story

Lede I would file:

> A single parent of two in Franklin County who gets a raise from $38,000 to $39,000 would come out about $12,000 behind, because the extra $1,000 ends the family's child-care subsidy, according to HotGap, a site that runs the open-source PolicyEngine benefits calculator for every state. Ohio's worst cliff ranks in the bottom half of the states; in Maryland the same family loses $33,587 — though there the drop does not hit until $97,000.

Confident the page supports: $12,062; the $38,000 → $39,000 step; the program (CCDF child-care subsidy); renter; Franklin County; "1 adult, 2 children (3 and 7)"; 2026 rules; PolicyEngine as the model; "32nd of 50" (ties and NM aside); Maryland $33,587 at $97,000 → $98,000, Montgomery County.

Would soften or check: "about $12,000 behind" — the page says net income after premiums, annual, "Estimates only — a caseworker decides real benefits", so "would come out behind" should be "the model estimates". "For every state" is right (51 with DC). I would not print "Wisconsin needs the biggest leap" or "New Mexico has no cliff" without a call. I would cut "ranks 32nd" to "bottom half". And I would ask why the run is dated tomorrow before quoting the date.

---

## Findings

### B — wrong conclusion or task blocked

**B1. The ranked "1." under The leap and Safe exit is a claim the page cannot make, and it appears on the same screen as the counter-evidence.**
Where: `03-measure-leap-a.png` — "At least this much — the exact size runs past the axis (2): MD ≥ $53,000, NY ≥ $55,000" and, directly below, "1. WI $76,000". `13-single-3-leap.png` (1 adult, 3 children) — "CO ≥ $129,000" above "1. WI $129,000". `03-measure-safeExit-a.png` — three "past the axis" rows above "1. VT $148,000". The table order "largest first" puts the same unknowns *first*, which reads as *largest* (`07-sort-leap-top.png`).
A deadline reader answers "which state is worst?" with the "1." row. Nothing says the rank is among measured states only; the caption's "over the 48 states with a comparable figure" is about bins.
Needed: the "Ranked" heading to say what is ranked — "Ranked, 48 of 51 (2 unranked above: exact size unknown)"; and when any "≥" lower bound reaches the top measured value, a one-line note in the ranked block: "CO's leap is at least as large as WI's; the largest cannot be named." In the table, "≥" and "past the axis" grouped *after* the measured rows, or the group label made explicit: "Unranked — lower bounds only".

**B2. The state sentence and the Corrections section describe the largest one-step loss no matter which Measure is selected, under a map titled for the other measure.**
Where: `05-safeExit-NE.png` — map titled "Safe exit, by state … Earnings above which no danger zone remains", tile NE dashed "past the axis", and under it: "Nebraska — $15,336 lost at $49,000 → $50,000, when CCDF child care subsidy ends." `05-leap-MD.png` — "The leap, by state" with Maryland's "≥ $53,000" never put into words; the sentence is "$33,587 lost at $97,000 → $98,000". `05-safeExit-OH.png` — under "Safe exit, by state", "Ohio — $12,062 lost at $38,000 → $39,000".
A reader who chose Safe exit and clicked Ohio can print "Ohio families are clear above $39,000"; Ohio's safe exit is $110,000. The tile's hover title *does* follow the measure ("Ohio: $110,000"), so the page knows the number; the sentence does not carry it.
Needed: the sentence to lead with the selected measure and then the headline loss — "Ohio — safe exit $110,000: earnings above which no danger zone remains. Worst step: $12,062 lost at $38,000 → $39,000, when CCDF child care subsidy ends." For a dashed state: "Nebraska — safe exit past the top of the axis: the last danger zone had not closed by $X. Worst step: …". For a "≥" state: "Maryland — leap at least $53,000 (the worst zone runs off the axis)."

### S — had to guess, guessed right eventually

**S1. Clicking or tapping a state throws the page ~1,200px down to the "Corrections applied in Ohio (0)" heading, taking the map, the legend, the tile outline and the sentence under the map out of view.**
Where: `12-after-click-OH-no-rescroll-laptop.png` (scrollY 0 → 1201), `12-after-click-OH-no-rescroll-phone.png` (282 → 1324), `11-phone-tap-OH-viewport.png`. The page's own words promise the answer *under the map* ("Select a state on the map or in the table to read what HotGap changed…"; methodology: "read the corrections behind its numbers under the map") and offer "Details below ↓" as the deliberate jump.
I thought I had left the page; comparing five states meant five scroll-backs. The information was correct, so I guessed the jump was on purpose.
Needed: no scroll on select; the outline plus the sentence under the map are the feedback; "Details below ↓" remains the opt-in jump. If focus must move for screen readers, move it to the sentence under the map, not the H3 a screen away.

**S2. "Weekly run of Sep 17, 2026" on Sep 16.**
Where: caption under the map, every state's source line, the footer, the "Cite as" line, the CSV filename. The CSV's `sweep_generated = 2026-09-17T01:16:58.798Z` shows it is a UTC date; the page never says so. A story filed Sep 16 citing a Sep 17 run will be bounced by an editor.
Needed: the date in the reader's local date, or "Sep 17, 2026 (UTC)", or the full timestamp in the cite line.

**S3. "The leap", "Safe exit" and "Deferred" are undefined near the table and in the methodology; the only plain definitions are inside the Measure dropdown's option text, which the closed control truncates.**
Where: table headers "The leap | Safe exit | Cliffs | Deferred | Figures" with no tooltips; "Past the axis is not a number" box uses "safe exit" and "the leap" without defining them; `14-measure-dropdown-truncated-zoom.png` ("…clear the worst danger zo"). I guessed "leap = raise needed to jump the gap" and "safe exit = income at which you're clear"; the map subtitle confirmed once each was selected.
Needed: a one-line definition under each table header (or a title on the `th`), and the same two lines in "How these numbers were made". Short option labels ("The leap ($)") with the definition as the map subtitle, so the control is not the glossary.

**S4. Whether Ohio's and Texas's figures are on the same footing is only discoverable by clicking each state.**
Where: table rows OH and TX both read "complete" in Figures; only "Corrections applied in Ohio (0)" vs "Corrections applied in Texas (3)" and "Child-care subsidy: inside PolicyEngine's net income for Ohio" vs "added by HotGap for Texas" tell the difference — and Texas's headline cliff is the benefit HotGap added. The CSV already has `corrections_applied`.
I guessed corrections *make* them comparable; the bullet "Where a state's figure needed a correction on top of PolicyEngine … it is listed under the map" supports that.
Needed: a "Corrections" count in the table (0, 3) or a small chip beside the state, so the footing is visible without 51 clicks.

**S5. The income at which the loss happens is missing from the ranked list and the table.**
Where: "1. MD $33,587" and "32. OH $12,062" with nothing else; only the clicked sentence gives "$97,000 → $98,000" and "$38,000 → $39,000". For a local story the income is the other half of the number. The CSV has `biggest_loss_at`.
Needed: an "At earnings of" column in the table and a second small line in each ranked row ("at $97,000").

**S6. New Mexico's "no cliff found" carries no reason.**
Where: "New Mexico — no cliff found for this household. Renter, Bernalillo County." then "Corrections applied in New Mexico (2)" and "Child-care price: national median price". The most newsworthy tile on the map is the one the page explains least; I guessed a state child-care policy and cannot confirm it from the page.
Needed: one sentence under the map for a no-cliff state saying what the model found instead ("No step down of $200 or more; the largest step down was $X at $Y" and, if known, the program that does not end).

### N — friction

**N1.** "Figures" column shows "complete" for all 51 rows in all 11 households; the footnote promises "rows it cannot complete … are flagged in the last column", but no other value ever appears, so the column reads as noise and the flag vocabulary is unlearnable. Needed: hide the column when every row is complete, or put the flag on the state cell.

**N2.** The glyph in "past the axis" / "≥" rows (`06-past-axis-rows-zoom.png`) looks like a loading spinner; I waited for it. Needed: a dashed-outline dot to match the dashed tile, or no glyph.

**N3.** Measure and Table order are independent, and neither label says so; changing Measure to "Safe exit" leaves the table A–Z. Needed: "Table order" default "Same as the map" or a note "(the map's measure is set above)".

**N4.** `model_endpoint = 45.55.61.191.sslip.io` in the CSV; it reads as a developer's IP. Needed: a named host or drop the column from the public file. The CSV also lacks the page's "Cite as" line.

**N5.** No navigation: "HotGap" at the top is not a link, there is no per-state page and no way to see "that state's curve" that the headline paragraph invokes. Needed: the state sentence to link to the curve for that state and household, if such a page exists.

**N6.** Phone table: The leap, Safe exit, Cliffs, Deferred and Figures are off-screen with no affordance that the table continues (`11-phone-table-unswiped.png`); the intro line above the table scrolls with the swipe. Needed: a "swipe for 5 more columns →" hint or a fade at the right edge; the intro line outside the scroll container.

**N7.** Texas's third correction, "Premium tax credit — coverage gap", has no chip while the other two say "overridden" / "added by HotGap"; the CSV calls it "applied". Needed: the same chip vocabulary on all three.

**N8.** "Ranked" under "Deferred cliffs" gives 14 states rank "1." and 36 rank "15." — a ranking of yes/no. Needed: for a 0/1 measure, two labelled groups ("Has a deferred cliff (14)", "None (36)").

**N9.** The axis top is never stated in dollars, so "past the axis" cannot be translated into "above $X" for a reader; the methodology gives it only as "400% of the poverty guideline … plus $40,000 of room to recover". Needed: the axis top as a number in the caption ("axis runs $0–$X").

**N10.** Every household is a renter; a cold reader learns that only from "Renter, Franklin County" after a click, or from the third methodology bullet. Needed: "renting in the most populous county" in the map subtitle.

**N11.** "Fifty-one sets of rules, eleven household shapes, one earnings scale" is the first sentence and had to be decoded (51 = 50 + DC; eleven = the dropdown). Needed: "Fifty states and DC, eleven household shapes…".

---

## What worked on first contact

- The headline plus the last sentence of the first paragraph told me what the number is in under ten seconds, and the $1,000 step / $200 threshold were explicit, so I never had to guess the unit.
- The map title and subtitle rewrite themselves for each Measure and Household, and the legend's counts — "No cliff found (1)", "Runs past the top of the axis (2)" — match the tiles and the ranked list's blocks exactly, so every odd-looking tile had a name.
- The state sentence is printable as-is: dollars, the income step with an arrow, the program, tenure, county. That is the lede.
- "Corrections applied in Ohio (0)" vs "(3)" is honest and legible, with issue numbers and a state source link for Texas.
- The two call-out boxes, "Hatched is not low" and "Past the axis is not a number", speak to a reporter directly ("Do not write that those states are gentler") and pre-empted the wrong sentence I was about to write about safe exit.
- The "Cite as" line, with a URL that carries household, measure, sort and state, is exactly what I need for attribution.
- The CSV is one row per state, its columns match the list in the methodology word for word, and the flags (`leap_is_lower_bound`, `no_cliff_found`, `comparable`) explain every blank cell.
- Ranked-list ties share a rank, the selected state is highlighted in the ranked list, and the URL updates with every control, so a view is shareable.
- Keyboard works on the map: arrows move between tiles, Enter selects (verified OH → PA).
- Phone: no horizontal page scroll, the map stays legible at 28px tiles, and the State column is sticky while the table swipes.

**Counts:** B 2 · S 6 · N 11.
