# Context-blind review of `/places` — 2026-09-16

**Persona.** A local newspaper reporter on deadline. Editor sent
`https://hotgap-next.hotgap.workers.dev/places` with "see if there's a story
about our state in this". No prior knowledge of the site, no docs, no source,
no network tab. Only the rendered page, at 1280×900 (laptop) and 390×844
(phone), in headless Chromium via Playwright.

Screenshots: `design/review/places-context-blind/` (paths below are relative
to that folder).

---

## Part 1 — Narrated walkthrough

### 1. First ten seconds (laptop) — `01-laptop-above-fold.png`

What I saw before scrolling: a wordmark "HotGap", the headline **"What a
raise costs, state by state"**, a four-line subhead, two dropdowns
("Household", "Measure"), a button "Download these rows (CSV)", a tile-grid
US map shaded in five purples with the title "Largest one-step loss, by
state", and to the right a column headed "Ranked" with MD $33,587 at the top.

What I thought it was: a benefits-cliff tracker. The subhead —
*"Each figure is the worst single $1,000 step of earnings in that state's
curve for that household — how much net income falls when pay goes up by a
thousand dollars"* — told me the number is "how much you lose when you get
a $1,000 raise". Darker purple = bigger loss. "Fifty-one sets of rules" I
decoded as 50 states + DC. "Eleven household shapes" = the Household
dropdown. "One axis" I could not decode and still cannot; I ignored it.

My immediate reaction to the top number: *a $1,000 raise costs a Maryland
family $33,587?* That is the first thing an editor would ask, and nothing
above the fold pre-empts it. Nothing said what benefit could be worth
$33,000, or at what income. I also noticed white-outlined NM and hatched
WA/NJ and had no idea what they meant until I scrolled to the legend.

I saw two dropdowns, not three. The third ("Table order") is much further
down, above the big table. The brief said three above the map; that is not
what the page shows.

### 2. The dropdowns — `03-*.png`, `04-measure-*.png`

**Household** (label "Household"; default "1 adult, 2 children (3 and 7)").
Options are plain English: "1 adult, no children" … "2 adults, both working,
3 children (1, 4, 9)". I expected the map and ranking to re-shade for that
family, and they did (`03-household-2adults-both-2kids.png`): the map
subtitle changed to "2 adults, both working, 2 children (3 and 7). Net income
lost in the worst single $1,000 step of earnings.", the legend range changed
($6,514–$32,595), the ranked list re-sorted. Label matched. The household
descriptions needed no glossary. I did wonder whether "1 adult, 2 children"
was a renter or owner, and what job/wage — answered only in the methodology
far below (renter, most-populous county).

**Measure** (label "Measure"; default "Largest one-step loss ($)"). Options:

- "Largest one-step loss ($)" — understood from the subhead.
- "Width of the worst danger zone ($)" — I guessed "the income range where
  raises don't help". After selecting, the map subtitle said *"Earnings
  spanned by the widest stretch where more pay leaves the household no
  better off."* Guess confirmed (`04-measure-1.png`). "Danger zone" itself
  is never defined before you pick it.
- "The leap — raise needed to clear it ($)" — "it" has no referent inside
  the dropdown. I guessed "the danger zone". Subtitle after selecting: *"The
  raise a household must clear in one move to get past that stretch."*
  "That stretch" only makes sense if you just read the previous option
  (`04-measure-2.png`). New legend item appeared: dashed outline "Runs past
  the top of the axis (2)" on VT and NY.
- "Safe exit — where the last zone closes ($)" — guessed "the income above
  which there are no more cliffs". Subtitle: *"Earnings at which the last
  danger zone closes."* Right (`04-measure-3.png`). All 46 comparable states
  were between $118,000 and $166,000, which surprised me; I had to infer
  from the methodology that the axis only runs to ~400% of poverty + $40k.
- "Number of cliffs" — obvious. Subtitle finally defines a cliff: *"Steps
  down of $200 or more anywhere on the curve."* (`04-measure-4.png`). Bins
  switch to whole numbers (3–5, 6–8 …). Good.
- "Of those, deferred to a later renewal" — "Of those" refers to the option
  above it; on its own it reads like a fragment. I guessed "cliffs that hit
  at recertification rather than on payday". The methodology bullet far
  below confirmed it (Head Start carry-over, 12-month continuous Medicaid,
  Transitional Medical Assistance). The resulting map is almost all one
  shade (48 states are 0 or 1) (`04-measure-5.png`).

The URL updated with every change (`?household=married-dual-2&measure=leap`),
which I only noticed in the address bar — good for sharing a view.

**Table order** (label "Table order"; above the big table). Two options:
"State, A to Z" and "This measure, largest first". I expected the second to
sort the big table by whatever the Measure dropdown says. It did
(`07-table-sorted-biggestLoss-top.png`) and the table caption changed to
"…by largest one-step loss, largest first." Label matched. I could not sort
by any other column without changing the map's measure; clicking a column
header does nothing (`07-table-header-click.png`, URL unchanged).

### 3. Our state — Ohio, then Texas and New Jersey

**Ohio on the map** (`05-oh-hover.png`): OH is the second-lightest shade, in
the $10,869–$16,549 bin. Hovering shows nothing — no tooltip, no highlight.
In "Ranked" I had to scroll and count: Ohio is 30th of 48 at $12,062; the
list prints no rank numbers. Texas is 28th at $13,938. New Jersey is not in
the ranking at all; it is under a separate heading "Not ranked — figures
incomplete (2)" with a hatched bar and the words "not comparable".

**Clicking Ohio** (`05-oh-click-viewport.png`): the tile gained a dark
outline. Nothing else in the viewport changed. No scroll, no panel, no
tooltip. I honestly thought the click had done nothing. Only because I had
seen "Corrections applied — choose a state" earlier did I scroll down
(`05-oh-click-below-map.png`) to find:

> **Corrections applied in Ohio (0)**
> PolicyEngine's own figures for Ohio stand as served; HotGap changed
> nothing on top of them.
> **Not modelled in Ohio (1)**
> LIHEAP — Not counted anywhere: HotGap does not request LIHEAP from
> PolicyEngine, and the few state programs the engine models never reach
> its net income figure.
> Estimates only. Rules: 2026. Rent: HUD Office of Policy Development and
> Research, Fair Market Rents; FY2026 revised schedule (effective
> 2025-10-01). County: Vintage 2024 (July 1, 2024 estimates). Child-care
> price: county price, 2018 study, carried to 2026 dollars by the BLS
> Employment Cost Index. Reach: ACS 2024 1-year PUMS. Model:
> policyengine-us 2.6.2. Sweep generated 2026-09-16.

The Ohio row in "Ranked" and in the big table also got a dark left bar
(`05-oh-table-row.png`) — both below the fold.

What I understood: "PolicyEngine" is some model the site sits on top of and
"corrections" are patches HotGap makes to it. For Ohio there are none. What
I did not understand for the story: whether "changed nothing" means Ohio's
number is *more* trustworthy (untouched) or *less* (nobody checked). And
"County: Vintage 2024" reads as a Census file vintage, not a county name —
the county whose rent and child-care price this family pays is never named.
"LIHEAP … Not counted anywhere" is listed under Ohio but is true of every
state; I only realised that after clicking Texas and seeing it again.

**Texas** (`06-TX-below-map.png`): "Corrections applied in Texas (3)" —
"Medicaid — parent income limit [overridden]", "CCDF child care subsidy
[added by HotGap]", "Premium tax credit — coverage gap". The CCDF line says
*"PolicyEngine computes the child-care subsidy but leaves it out of net
income here, so HotGap adds it back"*. That sentence made me go back to
Ohio: if Texas needed the child-care subsidy added back and Ohio had nothing
added, is the subsidy in Ohio's number or not? The page does not say. Same
for Maryland (`06-MD-below-map.png`): one correction, none about child care.
I cannot tell from the page whether OH ($12,062) and TX ($13,938) are on the
same footing. Also, "(policyengine-us #9474; fixed upstream in PR #9475)" is
developer talk; the `fhb.hhs.texas.gov` link is what a reporter can use.

**New Jersey** (`06-NJ-below-map.png`): "Corrections applied in New Jersey
(1)" CCDF added; "Not modelled in New Jersey (2)": "NJ Health Plan Savings
[figures incomplete] — … not computed by PolicyEngine, and HotGap's own
schedules cover only $0-premium tiers, so the premiums here are overstated
by it." and LIHEAP. Then "Also in New Jersey's net income (1): New Jersey
ANCHOR property-tax relief, renter benefit ($450 a year…)". In the big table
NJ still has numbers ($26,206 — would be 5th if ranked) with the last column
in amber: "incomplete: NJ Health Plan Savings not modelled". The legend line
"figures incomplete, not low" and the boxed "Hatched is not low … its
numbers are floors, not measurements. Do not write that those states are
gentler" got me there, but it took three separate notes in three places.

**New Mexico** (`06-NM-below-map.png`): the one "No cliff found" state. The
block lists two corrections and LIHEAP but never says *why* New Mexico alone
has no cliff for a single parent of two — which is the most obvious story
hook on the page.

Keyboard: the table note says "the arrow keys move between states". After
selecting MD, ArrowRight moved a focus ring to DE but the selection stayed
on MD (`06-arrow-right.png`); Enter is needed. Clicking a state in the
ranked list does select it (`06-ranked-click.png`).

### 4. The numbers — Ohio, $12,062

The sentence I would try to print: *"A single parent of two young children
in Ohio can lose $12,062 in net income from a single $1,000 raise."*

Could I? Partly. I can support "$12,062", "1 adult, 2 children (3 and 7)",
"2026 rules", "net income after health-insurance premiums", "estimate", and
the date. What I cannot say, because the page never says it:

- **At what income** the step happens (a family at $20k or at $60k?).
- **Which program** is lost — child care, Medicaid, SNAP, the marketplace
  subsidy? For $33,587 in Maryland the question is unavoidable and
  unanswered.
- **Which county** ("most populous county" is stated in the methodology;
  the name is not printed anywhere, and the source line's "County: Vintage
  2024" looks like a name slot filled with the wrong thing).
- **Per year?** Implied by the scale of the figures, never stated.
- **Who is PolicyEngine** — a link, no description.

Units, year, and the source name are present. The caveats are present and
unusually blunt ("Estimates only — a caseworker decides real benefits").

Legend: yes, it explains every odd tile — "No cliff found (1)" (white
outline), hatched "NJ Health Plan Savings and Cascade Care Savings not
modelled — figures incomplete, not low (2)", and on the leap/safe-exit
measures a dashed "Runs past the top of the axis (2)". Counts in parentheses
are helpful. The bins are equal-width and re-computed per measure; the
footnote "a shade means nothing across two different measures. Read the bin
bounds, not the colour." is honest, though for "1 adult, no children"
(`10-household-single-no-children.png`) it means a $205 loss and a $1,800
loss are the same shade, and VT at $8,644 sits alone at the top with no
explanation of why.

### 5. The tables

**Ranked** (beside the map): state, dot on a bar, value. I understood it.
Sections below the main list: "No cliff found (1)" with NM "no cliff", and
"Not ranked — figures incomplete (2)" with NJ/WA "not comparable". No rank
number is printed; I counted to 30 for Ohio.

For "The leap", NY and VT appear at the *bottom* of the main list, after
TN $14,000, labelled "past the axis" with a dashed marker at the far right
(`04-measure-2-legend.png`). Reading top-down, the list says CO is worst and
NY/VT are least. The dashed marker at the right edge says the opposite. I
went with the marker only because the legend said "Runs past the top of the
axis".

**All 51, every measure** (big table). Columns: State, Largest one-step
loss, Danger zone width, The leap, Safe exit, Cliffs, Deferred, Figures. I
understood them only because I had cycled through the Measure dropdown
first; the headers themselves carry no definitions. Cells:

- "none" (NM row, four times) — no cliff; clear after the ranked-list note.
- "≥ $53,000" (MD, The leap) — a floor; clear.
- "past the axis" (MD/NY/NE, Safe exit) — explained in the boxed note at the
  bottom: *"Where a state's worst danger zone runs off the top of the axis
  rather than closing, the safe exit is unknown and the leap is a lower
  bound."* But NE's leap is a plain "$44,000" while its safe exit is "past
  the axis", which contradicts that sentence as written. I guessed "worst
  zone ≠ last zone".
- "complete" / "incomplete: NJ Health Plan Savings not modelled" (Figures)
  — clear, and the amber colour helps.
- Grey left bar on NJ/WA rows vs dark left bar on the selected row — two
  meanings, one device; I guessed.

Sorting: "This measure, largest first" sorts the whole table by the current
measure, with NM then NJ/WA at the very bottom
(`07-table-sorted-biggestLoss-bottom.png`). For "The leap"
(`07-table-sorted-leap-top.png`, `07-table-sorted-leap-bottom.png`), the
order is WI $76,000 … MS $12,000, **then** MD "≥ $53,000", NY "≥ $55,000".
Under a heading that says "largest first", $53,000-or-more sits below
$12,000.

Worst/best: for "Largest one-step loss" I trust MD worst / TN best among
the 48 comparable (and NM as "no cliff"). For "The leap" and "Safe exit" I
do **not** trust "WI is worst" or "CO is worst": MD and NY may be worse and
the page's own box says so, but the sort order and the ranked list both put
them last.

### 6. Getting the data out — `08-after-download-click.png`

"Download these rows (CSV)" produced
`hotgap-1-adult-2-children-3-and-7-2026-09-16.csv`: 51 rows, 25 columns.
Header:

```
state,state_name,archetype_id,archetype,biggest_one_step_loss,danger_zone_width,leap,safe_exit,cliff_count,deferred_cliff_count,leap_is_lower_bound,no_cliff_found,comparable,figures,unmodeled_programs,corrections_applied,rent_vintage,county_vintage,childcare_price_vintage,reach_vintages,policy_year,sweep_generated,model_endpoint,model_version,source
```

Ohio row: `OH,Ohio,single-2,"1 adult, 2 children (3 and 7)",12062,57000,47000,110000,10,0,false,false,true,complete,,,FY2026 revised schedule…,county 2018,2024-1yr,2026,2026-09-16T22:19:04.187Z,45.55.61.191.sslip.io,2.6.2,HotGap/PolicyEngine`.

It is the table as shown, for the chosen household, with provenance
columns (policy year, sweep timestamp, model version, corrections). MD's
`safe_exit` is blank with `leap_is_lower_bound=true` — machine-readable
versions of "past the axis". Oddities: `model_endpoint` is
`45.55.61.191.sslip.io`, a bare-IP hostname that looks like a test server;
DC's `source` is `HotGap` where every other row says `HotGap/PolicyEngine`;
`reach_vintages` refers to a "reach" that nothing on the page defines or
displays; the county is still not named.

How I would cite it: "HotGap analysis of PolicyEngine microsimulation,
2026 rules, sweep of Sept. 16, 2026" — assembled from the footer, not from
any suggested-citation line.

Methodology: yes, "How these numbers were made" plus "What the model does
not include" and two boxed warnings. It answered: what the curve is
($1,000 steps from $0 to 400% of poverty + $40,000), what "net income" means
(health-adjusted; deductibles excluded), who the family is (renter,
most-populous county, HUD FMR, DOL child-care price), which programs are on
(CCDF on; Head Start and vouchers off), what "deferred" means, and that
Alaska/Hawaii are understated. It did not answer: which program makes each
state's cliff, at what income, or the county's name.

### 7. The phone — `09-phone-*.png`

Above the fold (`09-phone-above-fold.png`): wordmark, headline, subhead,
both dropdowns, the CSV button, and the top of the map. The header text
runs flush to the screen edges (no side gutter; the subhead's em dash
touches the right edge) while the controls below have one. The map tiles
are 28×28 px, legible, all 51 fit without horizontal page scroll
(`09-phone-scroll-02.png`). I found OH easily. Tapping OH
(`09-phone-oh-tap.png`) outlined the tile; the payoff block was ~1,400 px
further down (`09-phone-oh-corrections.png`). "Ranked" is stacked under the
legend and reads fine.

The big table is clipped at the right edge: header "The le", cells
"$45,00" (`09-phone-table.png`, `09-phone-table-oh-row.png`). Safe exit,
Cliffs, Deferred and Figures — including the amber "incomplete" flags — are
off-screen. The container does scroll sideways (a real thumb-swipe would
work; my synthetic touch did not, which I attribute to the harness) but
there is no scrollbar, edge shadow, or hint. NJ's only visible flag on the
phone is a faint grey left bar. Nothing became impossible; two things
became hidden.

### 8. The story

Lede I would file for Ohio:

> A single parent of two young children in Ohio who takes a $1,000 raise
> can lose as much as $12,062 in net income under 2026 benefit rules,
> according to a state-by-state model of benefits cliffs published by
> HotGap. The site counts ten separate points on the income scale where a
> raise leaves that Ohio family worse off, putting the state near the
> middle of the 48 it can compare.

Claims the page actually supports: $12,062 for "1 adult, 2 children (3 and
7)"; 2026 rules; ten cliffs of $200 or more; roughly 30th of 48 comparable
states (I counted; the page prints no rank). Claims I would have to
soften or cut: "a single parent … in Ohio" — it is one hypothetical renter
in one unnamed county with one child-care price; "net income" is after
health premiums but before deductibles; "can lose" hides that I cannot say
what benefit is lost or at what income; and "published by HotGap" — I do
not know who HotGap or PolicyEngine are, and the CSV points at a bare IP.

---

## Part 2 — Findings

Severity: **B** = a cold reader draws a wrong conclusion or cannot do one
of the eight tasks; **S** = had to guess, guessed right eventually;
**N** = friction.

**Resolution pass, 2026-09-16 (Plan 8,
`docs/superpowers/plans/2026-09-16-hotgap-places-cold-reader.md`).** Every
finding below carries a *Resolved* (or *Declined*) line naming the commit
and the evidence; the re-rendered evidence is under
`design/review/places-context-blind/after/` (the originals' names where the
content corresponds, plus `05-oh-readout.png`, `06-NJ-readout.png`,
`04-measure-N-ranked.png`, `07-table-sorted-cliffCount-top.png`,
`08-download-sample.csv`, `10-method.png`, `11-laptop-dark-above-fold.png`,
`09-phone-*` for the tap, the readout and the table at both scroll edges,
`print-letter-from-dark.pdf`, and `measurements.txt`, the proof's own lines
for every finding). Commits on the branch: audit steps `4ed97d6`; core and
pipeline `d41f40d` (Phase A); the copy module `21dfe35` (C); the page
`781e239` (B); the CSV `3be6cf4` (D); the proof `ac4bb59`; the Worker's
dev-only rate-limit escape `48f5275`. Proofs on the final tree, through
the project runners: `npm run typecheck` clean, `npx vitest run` 530
passed, `cd app && npx vite build` clean, `app/e2e/places.mjs` 136 checks
passing (79 before), the PDF inspection included. Every number the page
prints is read from `summary.json` or the coverage block, and the lede
sentence the reviewer could not write is now the readout's:
*"Ohio — $12,062 lost at $38,000 → $39,000, when CCDF child care subsidy
ends. Renter, Franklin County."* The plan's example guessed Medicaid; the
file says the child-care subsidy, which is the point of reading it.

### B — 4

**B1. "Largest first" puts the possibly-largest states last.** Under
"Table order: This measure, largest first" for The leap, the rows read
`WI $76,000 … MS $12,000, MD ≥ $53,000, NY ≥ $55,000`; in "Ranked" for the
same measure `TN $14,000` is followed by `NY past the axis`, `VT past the
axis`. A reader names WI/CO as the worst leap; the page's own box says the
leap there is "a lower bound". Words that caused it: "This measure, largest
first"; "past the axis" rows placed after the smallest value. Needed: put
lower-bound rows first under a one-line heading such as "Bigger than the
axis — at least $53,000, exact size unknown (2)", or exclude them from the
sorted body the way NM is, with the same sub-list treatment.

*Resolved* (`781e239`): lower-bound rows lead the ranked strip under
their own heading — "At least this much — the exact size runs past the
axis (2)" with `≥ $72,000`-style figures on the leap, "Past the top of the
axis — no safe exit found on the scale (2)" on safe exit — and lead the
sorted table the same way, where every lifted-out group now has a heading
row (`after/04-measure-2-ranked.png`, `after/07-table-sorted-leap-top.png`).
`model.test.ts` pins the order on the committed file; the proof reads the
lower-bound set from `summary.json` and checks it heads both.

**B2. Whether Ohio's figure includes the child-care subsidy is
undecidable from the page.** Ohio: "PolicyEngine's own figures for Ohio
stand as served; HotGap changed nothing on top of them." Texas / NJ / NM:
"CCDF child care subsidy — added by HotGap: PolicyEngine computes the
child-care subsidy but leaves it out of net income here, so HotGap adds it
back". A reader cannot tell if OH and TX are on the same footing, and may
conclude either that Ohio's cliff omits child care or that Texas's was
inflated. Needed: one line in every state's block stating the subsidy's
status ("Child-care subsidy: inside PolicyEngine's net income for Ohio" /
"…added by HotGap for Texas"), or a sentence in the "(0)" block saying the
Texas-style fixes were not needed here and why.

*Resolved* (`781e239`): every block's second line states the footing from
`corrections.childcareSubsidy.source` — "Child-care subsidy: inside
PolicyEngine's net income for Ohio." / "…added by HotGap for Texas." —
and the (0) block reads "…HotGap changed nothing on top of them — the
fixes other states need were not needed here." (`after/05-oh-click-below-
map.png`, `after/06-TX-below-map.png`; proof lines B2).

**B3. The figure has no program and no income attached.** "Largest
one-step loss, by state — Net income lost in the worst single $1,000 step
of earnings." Nothing on the page says at what earnings Ohio's $12,062
step occurs or what benefit ends there; for MD $33,587 the omission makes
the number unbelievable on sight; for NM "no cliff" and VT $8,644 (single
adult) the story hook is unexplained. A reporter cannot write "where it
came from" (task 4). Needed: per state, "at $X → $X+1,000 of earnings, when
[program] ends" in the selected-state block, and ideally a link to that
state's curve.

*Resolved* (`d41f40d`, `781e239`): `StateMetrics` gains `biggestLossAt`
and `biggestLossPrograms` from the worst cliff (every existing number in
`summary.json` byte-identical on the `--from-data` rebuild; 5,543 leaves
unchanged, 0 removed); the readout under the map and the block's first
line print them: "Ohio — $12,062 lost at $38,000 → $39,000, when CCDF
child care subsidy ends." (`after/05-oh-readout.png`). The CSV carries
`biggest_loss_at` and `biggest_loss_programs` (`3be6cf4`). The link to a
curve is the plan's declined item: the caseworker page is the curve.

**B4. The county is never named.** Methodology: "Each archetype is a
typical renter in the state's most populous county". Source line under the
map: "County: Vintage 2024 (July 1, 2024 estimates)". The name slot holds a
Census vintage; the reader is left to guess the county (Ohio's is
Franklin — many would say Cuyahoga) and will either print the wrong one or
a vague "an Ohio family" that the rent figure does not support. Needed:
"Rent and child care: Franklin County (Columbus), HUD FY2026 FMR" in the
state block and a `county_name` column in the CSV.

*Resolved* (`d41f40d`, `781e239`, `3be6cf4`): `vintages.county` gains
`fips` and `name` from the gazetteer (null for Connecticut alone, whose
planning region post-dates it); the readout ends "Renter, Franklin
County.", the state's source line reads "County: Franklin County (the
state's most populous; Vintage 2024 …)", and the CSV has `county_name` and
`county_fips` (`after/05-oh-readout.png`, `after/08-download-sample.csv`).

### S — 10

**S1. Clicking a state looks like nothing happened.** The only visible
change is a tile outline (`05-oh-click-viewport.png`); "Corrections applied
in Ohio (0)" renders just below the fold on laptop and ~1,400 px down on
phone; the rank-list and table highlights are also offscreen. Needed: scroll
the block into view, or show the state's name and headline number next to
the map with a "details below" link, or a tooltip on the tile.

*Resolved* (`781e239`): the state readout (`.hg-readout`, the
CurveReadout's shape) fills under the map on any selection with a
"Details below ↓" link, and a tile click, like a table click, scrolls the
block into view and focuses its heading (`after/05-oh-click-viewport.png`,
`after/09-phone-oh-tap.png`; proof line S1 measures focus and
in-viewport at both widths).

**S2. Measure options lean on their neighbours.** "The leap — raise needed
to clear it ($)", "Safe exit — where the last zone closes ($)", "Of those,
deferred to a later renewal". "It", "zone", "Of those" have no referent
inside a closed dropdown. Needed: self-contained labels, e.g. "The leap —
raise needed to clear the worst danger zone ($)", "Deferred cliffs — of the
cliffs counted, those that land at a later renewal".

*Resolved* (`21dfe35`): the options are copy's and stand alone — "The
leap — the raise needed to clear the worst danger zone ($)", "Safe exit —
earnings above which no danger zone remains ($)", "Deferred cliffs — of
the cliffs counted, those that land at a later renewal"; `model.test.ts`
and the proof check no option leans on "it", "that stretch" or "of those".

**S3. "Cliff" and "danger zone" are defined only after you choose them.**
The intro never uses the word "cliff"; "Steps down of $200 or more anywhere
on the curve" appears only in the Number-of-cliffs subtitle and the NM
footnote; "widest stretch where more pay leaves the household no better
off" only in the danger-zone subtitle. Needed: one glossary sentence under
the subhead: "A cliff is a $1,000 raise that cuts net income by $200 or
more; a danger zone is a run of earnings across which the household never
gets ahead."

*Resolved* (`21dfe35`, `781e239`): that sentence, with the $200 from
core's `CLIFF_MIN`, is the glossary line under the lede
(`after/01-laptop-above-fold.png`); the proof reads the floor from
`core/src/analyze.ts` and checks the sentence against it.

**S4. "Deferred … to a later renewal"** is explained only in the sixth
methodology bullet. Needed: a subtitle on the Deferred map naming the three
mechanisms ("Head Start carry-over, 12-month Medicaid/CHIP, Transitional
Medical Assistance").

*Resolved* (`21dfe35`): the deferred map's subtitle names the three
(`after/04-measure-5.png`).

**S5. Hatched states have numbers in one place and "not comparable" in
another.** Ranked: "NJ ▨ not comparable". Table: "NJ $26,206 … incomplete:
NJ Health Plan Savings not modelled". Legend: "figures incomplete, not low".
It takes three notes in three places to learn the numbers are floors.
Needed: put "floor — real cliff may be larger" in the table cell itself
("≥ $26,206 (incomplete)") so the row carries its own caveat.

*Resolved* (`781e239`, `3be6cf4`): an incomplete row's cells read
"$26,206 (floor)" and its Figures cell "floor: NJ Health Plan Savings not
modelled"; the CSV's `figures` column carries the same wording; the
readout for such a state says "at least $26,206 … a floor, because NJ
Health Plan Savings is not modelled" (`after/06-NJ-readout.png`,
`after/09-phone-table.png`).

**S6. "PolicyEngine" is never introduced.** It appears in the legend,
every state block and the methodology as a name with a link. Needed: one
clause on first use: "PolicyEngine, an open-source tax-and-benefit
calculator".

*Resolved* (`21dfe35`): the glossary line ends "The figures come from
PolicyEngine, an open-source tax-and-benefit calculator, run by HotGap.
Estimates only." and the method's first bullet says it again.

**S7. Two left bars, two meanings.** Grey bar = incomplete row (NJ, WA);
dark bar = selected state. Needed: drop the grey bar (the amber Figures
text already flags the row) or use a different device for selection.

*Resolved* (`781e239`): the grey bar is gone; the incomplete row is
flagged by its cells' words and, below 62rem, an amber "floor" beside its
code; the proof checks the only left bar on an incomplete row is the
selected row's, in ink.

**S8. "Not modelled in Ohio (1): LIHEAP — Not counted anywhere"** reads as
an Ohio gap until you click a second state. Needed: move universal
exclusions to the "What the model does not include" list and keep the
per-state block for state-specific items only.

*Resolved* (`d41f40d`, `781e239`): `UnmodeledProgram.scope` ("all" for
LIHEAP) is written by core; the page lists `all` entries once under "What
the model does not include" ("LIHEAP, in every state: …") and a state's
block lists its own only — Ohio's "Not modelled" heading no longer appears
(`after/05-oh-click-below-map.png`, `after/10-method.png`).

**S9. NE has a plain leap ($44,000) but "past the axis" safe exit.** The
box says "Where a state's worst danger zone runs off the top of the axis
… the safe exit is unknown and the leap is a lower bound." Needed: "…the
*last* danger zone…" and a clause that the worst and last zones can differ.

*Resolved* (`21dfe35`, `781e239`): the box reads "Where a state's *last*
danger zone runs off the top of the axis rather than closing, the safe
exit is unknown; the leap is a lower bound only when the *worst* zone is
the one that runs off. The two can differ, so a state can show an exact
leap and no safe exit." and every past-the-axis cell carries
`aria-describedby` to it; the proof finds Nebraska from the file ($44,000
leap, no safe exit) and checks the cells (`after/06-NE-below-map.png`).

**S10. Phone table clips mid-glyph with no scroll cue.** "The le", "$45,00";
Safe exit, Cliffs, Deferred, Figures hidden. Needed: an edge fade or
"swipe for more columns →", or collapse to a two-row card per state at
narrow widths; at minimum keep the Figures flag visible (e.g. move it
next to the state code).

*Resolved* (`781e239`, system): `.hg-scroll-x` in `tokens.css` draws an
edge shadow on whichever side still has content, by CSS alone (the
covering gradients scroll with the content), and takes `data-more` for a
page's own swipe words while it finds an overflow; the places table's
state column is sticky and the amber "floor" mark sits beside the code
(`after/09-phone-table.png`, `-scrolled-right.png`, `-end.png`). Proof at
390: NJ's mark ends at x=74 inside a 374px scroller at scrollLeft 0, four
gradients on the scroller, "Swipe for more →" set; none of it at 1280.

### N — 13

**N1.** Browser Back leaves the site (`about:blank`) instead of undoing the
last dropdown change; selections are written with replaceState. Needed:
pushState for household/measure changes.

*Declined* for filters (plan decision 5: history spam makes Back useless
for leaving; the reviewer's Back went to `about:blank` because the tab was
fresh). Selecting a state now pushes an entry, so Back from a shared deep
link returns to the unselected view, and popstate renders the URL's view
(`781e239`).

**N2.** Column headers in "All 51, every measure" are not sortable; the
only sort is the two-option "Table order", tied to the map's measure.

*Resolved* (`781e239`) by widening the one control: Table order offers
"State, A to Z" and the six measures ("Largest one-step loss, largest
first" … "Deferred cliffs, most first"); `sort=` carries the measure key
and an older `sort=measure` link still lands on that measure's order
(`after/07-table-sorted-cliffCount-top.png`). Sortable headers stay
declined.

**N3.** "Ranked" prints no rank numbers; finding "Ohio is 30th" means
counting 30 rows.

*Resolved* (`781e239`): a competition rank before every ranked row (ties
share one, the next skips), none in the lifted-out groups
(`after/04-measure-1-ranked.png`).

**N4.** No hover/tap tooltip on map tiles; a state's value is only in the
list or table.

*Declined* (plan): the readout answers the need without a hover-only
device; a tile's `title` remains for a pointer.

**N5.** Phone header (wordmark, headline, subhead) has no side gutter; the
subhead's em dash touches the right edge.

*Resolved* (`781e239`): the masthead's own `padding` shorthand had
cancelled the page column's gutter; it now sets only top and bottom
(`after/09-phone-above-fold.png`; proof: h1 left edge 16px at 390).

**N6.** Phone tile tap targets are 28×28 px.

*Declined* (plan): the 44px control beside the map is the ranked row
(design review TODO 2); the tiles keep their square.

**N7.** Developer vocabulary in reporter-facing text: "(policyengine-us
#9474; fixed upstream in PR #9475)", "PolicyEngine variable
nj_property_tax_relief", "reaches this endpoint", "Weekly sweep",
"sweep's own coverage record".

*Resolved* for the page's own words (`21dfe35`): "run" for "sweep", no
"endpoint", the Alaska/Hawaii issue number only in its link's title, the
other-benefit variable only in the cite's title; the proof greps the
page's text with core's notes and the CSV column list removed. Core's
correction notes keep their issue numbers as the cite (the design-review
pass wrote them for the reader; not this page's strings).

**N8.** CSV `model_endpoint` = `45.55.61.191.sslip.io` (a bare-IP host that
reads as a scratch server); DC `source` = `HotGap` vs `HotGap/PolicyEngine`
elsewhere, unexplained.

*Resolved* in part (`3be6cf4`): the CSV keeps `model_endpoint` (the
provenance) and gains `model_label` = "HotGap hosted engine,
policyengine-us 2.6.2". The DC oddity was checked at its cause: the
reviewer's CSV is not in the evidence folder; the committed sample and
this writer both give DC `HotGap/PolicyEngine`, the code writes one
constant per row, so the "HotGap" seen was a reader splitting "Washington,
DC" on its comma — `csv.test.ts` and the proof now round-trip the DC row
through an independent RFC 4180 reader. A real hostname for the engine is
a domain purchase, the owner's call.

**N9.** "Reach: ACS 2024 1-year PUMS" in every state's source line, and
`reach_vintages` in the CSV, describe something the page never shows or
defines.

*Resolved* (`781e239`, `3be6cf4`): reach leaves this page — the state's
source line, the method's source line and the CSV (the caseworker page
shows reach and keeps its line).

**N10.** "the arrow keys move between states" — they move focus; Enter
selects. Say "arrow keys then Enter".

*Resolved* (`21dfe35`): "the arrow keys move between states and Enter
selects", under the table and in the map's description.

**N11.** The "Deferred cliffs" map is nearly monochrome (48 states at 0 or
1); a list would say more than a map here.

*Resolved* as a map (plan decision 10): when one class holds nine
comparable states in ten the caption says so, from the rows — "45 of the
48 comparable states have none." for the two-earner couple; the proof
computes the share from `summary.json` (`after/04-measure-5.png`).

**N12.** Subhead phrase "one axis" is opaque to a newcomer.

*Resolved* (`21dfe35`): "one earnings scale — from $0 past 400% of the
poverty line for that household".

**N13.** No suggested citation line; "how to cite" has to be assembled from
the footer.

*Resolved* (`781e239`): a "Cite as:" line closes the method panel, from
the run's year, model and date and the page's own address for the current
view — "Cite as: HotGap, *What a raise costs, state by state*, 2026 rules
on PolicyEngine (policyengine-us 2.6.2), run of Sep 17, 2026,
…/places?household=single-2&measure=biggestLoss&sort=state&state=OH."
(`after/10-method.png`).

---

## Part 3 — What worked on first contact (do not change)

- **The headline and subhead say what the number is in one breath.** "What
  a raise costs, state by state" + "how much net income falls when pay goes
  up by a thousand dollars" is printable as-is, and it is why the first ten
  seconds landed.
- **Household options are plain English with ages.** "1 adult, 2 children
  (3 and 7)". No codes, no jargon.
- **The map subtitle restates the current measure and household in one
  sentence and updates with every dropdown.** This is where I learned what
  each measure meant; keep it.
- **The legend explains every odd tile, with counts.** "No cliff found
  (1)", hatched "…figures incomplete, not low (2)", dashed "Runs past the
  top of the axis (2)".
- **The two boxed warnings are written for reporters.** "Hatched is not
  low … Do not write that those states are gentler" and "Past the axis is
  not a number … must not be charted as a value" are the clearest
  instructions on the page; the table keeps the flagged rows visible with
  the flag rather than hiding them.
- **Provenance is dated and versioned everywhere** — "PolicyEngine 2026
  rules on policyengine-us 2.6.2. Weekly sweep generated 2026-09-16" under
  the map, per state, in the footer, and as CSV columns.
- **"Estimates only — a caseworker decides real benefits."** Exactly the
  caveat a desk would demand.
- **The URL carries household, measure, sort and state**, so a view can be
  pasted to an editor and reopens the same way.
- **"Download these rows (CSV)" downloads what is on screen**, with a
  self-describing filename and machine-readable flags
  (`leap_is_lower_bound`, `comparable`, `figures`).
- **Bins are labelled with dollar bounds and recomputed per measure**, and
  the page says so; count measures get whole-number classes.
- **Fast and stable:** first paint under a second; no horizontal page
  scroll on the phone; the tile map fits a 390 px screen.
