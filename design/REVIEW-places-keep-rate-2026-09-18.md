# Context-blind read: `/places` as a reporter on deadline — 2026-09-18

The acceptance test for Plan 9's journalist page, run the way
`REVIEW-places-context-blind-rerun-2026-09-16.md` was: a fresh reader given the
local URL, the editor's one line ("see if there's a story about our state in
this"), and nothing else — no repo, no source, no docs, no data files, no API.
Eight tasks, the same eight. Screenshots under `review/places-keep-rate/`.

**The plan's own bar for this page was one sentence: the lede must carry the
keep rate, where the road collapses, and who is there.** It does, unprompted,
in the reader's first paragraph:

> A single mother of two in Columbus who fights her way from the poverty line
> to $53,000 a year will end that climb **42 cents poorer for every extra
> dollar** she earned. Almost all of it goes in one step: **at $38,000, Ohio's
> child-care subsidy stops, and $12,062** of her family's income disappears on
> a $1,000 raise — a drop that lands below what **45 in every 100 Ohio families
> like hers** already earn.

Rate, collapse, position. On 2026-09-16 the same exercise produced "$33,587
lost from a $1,000 raise?" about a Maryland cliff that 80 in 100 families are
above, and the reader wrote "I did not believe it." That is the change this
plan was for.

---

## What was fixed before merge

**B2 — a rank the page asserted and its own data could not support.** The
ranked strip printed "14. OH loses 42¢" and "15. NC loses 42¢", and the CSV
held `-42` for both. The ranking was ordering on the stored four-decimal figure
while printing whole cents, so two states a reader sees as equal were given
different ranks with no tie mark and no tiebreak. Seven rates are shared by 17
of the 51 states here, so roughly a third of the flagship ranking carried an
order nobody could reproduce. **Ranks are decided on the figure the page prints
now** (`model.ts` `rankValue`): Ohio and North Carolina both read 14, and the
next distinct rate takes the rank after them, which is the competition rule the
page already followed on every other measure.

**B3 — the page's most quotable claim over its least comparable input.** New
Mexico is the one state with no cliff anywhere, the darkest tile, rank 51. It
is also one of only two states whose child-care price is a **national median**
standing in for a county the source database lacks — and child care is the
program that ends the worst step on the road in most other states. Both facts
were on the page; they were never within sight of each other, the substitution
sitting in the last line of the smallest text. **The footing travels with the
claim now**: one sentence in the state's readout wherever the price is not that
state's own county's, and a line in the table's Figures cell so all 51 compare
down the column without a download. Ohio, priced from Franklin County's own
study, says nothing — because there is nothing to say.

**S2 — a template placeholder printed to the page.** The method's definition of
the road read "$26,650 to $53,300 for a family of three at **{year}** rules",
between the two dollar figures a reporter would quote. `t()` throws on an
unfilled argument, which is the guard — but that string reached the page as a
bare constant and bypassed it. Filled now, and the proof gained a check that
walks every text node for a surviving `{slot}`, so the next one cannot ship
whatever route it takes.

**S6 — the ramp resolved the good half four times more finely than the bad
half.** Three classes each side put Ohio (−42¢) and Nevada (−67¢) in one colour
while two states a single cent apart above zero were drawn differently. The
losing side is where the story is and it was the side the map flattened. **The
six classes are split in proportion to how far each arm reaches now**: four
plum classes of 26¢ and two keep classes of 15¢ on this sweep. This is the
second correction to the same rule in one day — the first draft gave both arms
one shared width and painted half the map flat (see the visual pass) — and the
pair of failures is why the rule is now stated as *resolution follows the
spread* rather than as a fixed number of classes.

**N1 — "All six measures" over a thirteen-column table.** The caption counted a
number that stopped being true when the road's measures landed. It says "Every
measure" now, which cannot drift.

## What was found and is not the page

**B1 — "the Measure and Household changed without me choosing them."** Not
reproducible, and the cause is this review's own method: the cold reader and I
were driving the **same Playwright browser** at the same time, and the four
URLs it captured as evidence (`?household=married-0&state=AL`,
`?measure=roadWorst&state=MO`, `?measure=roadCliffCount…`,
`?household=single-2&measure=dangerWidth&sort=leap…`) are four views I navigated
to while verifying the one-armed scale, the two road measures and an old deep
link. Checked afterwards on a quiet browser: twelve state clicks, zero drift in
the Measure, the Household or the sort. Recorded because the finding was
correctly reported from what the reader saw — the flaw is in how the read was
run, not in what it looked at. **A context-blind read needs a browser of its
own.**

**S5 — the page opened in Spanish on an `en-US` browser.** Same cause: I had
loaded `?lang=es-US` in that browser earlier, and the language choice is
remembered in `localStorage` on purpose (`app/README.md` § Languages). The
reader confirmed it: a fresh load with cleared storage serves English. Worth
keeping only for what made it recoverable — "English", in English, one click
away in the masthead.

## What is carried forward, and why

- **S1 — CCDF is on for every modelled family while Head Start, housing
  vouchers and LIHEAP are off.** The reader calls this the second story on the
  page, and is right that the page states the setting without stating the
  reason: the other three are switched off because they are rationed, and CCDF
  is a capped block grant too. This is a **methodology** question, not a
  journalist-page one — the setting is the sweep's, it applies to all three
  surfaces, and the honest fix is either a reason in the root README's § Honesty
  or a take-up figure beside the assumption. Out of this plan's scope; it
  belongs in an owner decision, not a page edit.
- **S3 — "past the axis" and "≥ $55,000" are undefined where they appear.**
  Pre-dates this plan. The explanation exists, is good, and is 4,000px away
  under a heading the cell's `aria-describedby` points at; it is not in the
  definition list a careful reader consults.
- **S4 — "Ranked" does not say ranked by what, or which way.** Pre-dates this
  plan and now matters more, because the measures disagree about which end is
  bad (a high safe exit is bad, a high keep rate is good).
- **S8 — two column names invert their contents.** "Where the road collapses"
  holds a dollar loss; "Road's worst step" holds a location. Mine, and the
  reader is right that the words fight the cells. Renaming them touches the
  measure titles, which are also the figure's title and the sort control's
  words; worth doing deliberately rather than at the end of a long change.
- **S9 — three of the map's four tile states have no visible key.** Dashed and
  hatched are described to screen readers only. Pre-dates this plan.
- **N4 — the state's name opens two consecutive sentences** ("Ohio — … Ohio —
  $57,000 of earnings lie inside danger zones"). A consequence of the road
  leading: the measure's own sentence still names the state because it used to
  be first. Six messages to fix; queued rather than rushed.
- **N6 — phone map tiles are 27.4px**, below the 44px touch floor. A standing,
  documented trade (`charts.md` § 2): twelve tiles will not fit a phone at
  44px, and the ranked row beside the map is the 44px control that answers
  WCAG 2.5.8's equivalent-target exception. The reader's sharper point — that a
  mis-tap silently rewrites every number with no confirmation — is new and
  worth a look.
- **N7 — the phone table's sticky State column clips its neighbour**, so
  Alaska's $75,000 reads "5,000". Pre-dates this plan, and it is the worst of
  the N findings: a truncated figure that looks like a whole one.
- **N8 — no byline, no contact, no organisation.** True, and out of any page's
  scope.
- **N2, N9, N10, N11, N12** — the moving denominator, three dates, the CSV's
  BOM, the citation's live URL and the method's column width. Noted.

---

# The reader's report, unedited

Brief: My editor sent one link — `http://localhost:8802/places.html` — and one line: "see if there's a story about our state in this." Our state is Ohio; I was also asked to look at Texas, New Jersey, Wisconsin and New Mexico. I worked only from the rendered page: screenshots I looked at, on-page text, hover titles, the colours, the controls, the URL bar, and the CSV the page's own download button produced. I read no source, no docs, no data files, no design notes, no git history, and I called no API. Where I could not check something, not being able to check it is recorded as the finding. Screenshots are in `design/review/places-keep-rate/`.

## Walkthrough

### 1. First ten seconds (above the fold)

The page opened **in Spanish**. Title bar: "HotGap — lo que cuesta un aumento, estado por estado". My browser reports `en-US`; the document declared `lang="es-US"`. First two seconds went on realising I could not read the page, third second on spotting a small underlined "English" at top left, next to the wordmark. One click fixed it. (`01-fold-1280.png`)

In English (`03-fold-english.png`), by about eight seconds I had:

- **"What a raise costs, state by state"** — a headline I understood immediately.
- A standfirst that defines the number before I have to guess: "Each figure is what one household in that state keeps of each extra dollar it earns on the way from the poverty line to twice it — *its keep rate*. Below zero, the family ends that climb poorer than it started."
- Two dropdowns — Household ("1 adult, 2 children (3 and 7)") and Measure — and a **Download these rows (CSV)** button.
- A square-tile map of the US titled "Keep rate on the road out of poverty, by state".
- A list headed **"Ranked"**, starting "1. WI **loses 105¢**", "2. CO loses 97¢", "3. NJ loses 94¢".

**What I believed:** that the number on the map is cents kept per extra dollar earned between the poverty line and twice it, for the household in the first dropdown; and that the ranked list runs worst-first. What told me: the standfirst named the unit and the italicised term *keep rate*; the map's own caption repeated it in full; the ranked rows say "loses"/"keeps" in words rather than making me decode a sign.

**Was I right?** On the unit, yes. On the ranking direction, I was right but I guessed — the word "Ranked" is the entire label, and nothing says worst-first. I only confirmed it by scrolling to the bottom of the list and finding "51. NM keeps 30¢" (`06-corrections-and-legend.png`). Ten seconds is not enough to know whether rank 1 is the best state or the worst, and on this page that is the difference between "Ohio is 14th from the bottom" and "Ohio is 14th from the top."

The one thing I did **not** understand in ten seconds and should have: that every number on a page called "state by state", drawn on a map of states, is **one county per state**. That is disclosed — the map caption says "renting in the state's most populous county" — but it sits in the fourth line of a five-line caption, below the fold's centre of gravity.

### 2. The dropdowns

There are **three** selects, not two. The third ("Table order") lives ~2,500px down, above the table; nothing above the fold hints it exists.

**Household** — 11 options: `1 adult, no children` · `1 adult, 1 child (3)` · `1 adult, 2 children (3 and 7)` · `1 adult, 3 children (1, 4, 9)` · `2 adults, one working, no children` · `2 adults, one working, 1 child (3)` · `2 adults, one working, 2 children (3 and 7)` · `2 adults, one working, 3 children (1, 4, 9)` · `2 adults, both working, 1 child (3)` · `2 adults, both working, 2 children (3 and 7)` · `2 adults, both working, 3 children (1, 4, 9)`.

Expected: changes which family the numbers describe. Does exactly that. Label matches. **Every option is comprehensible with no glossary** — the ages in brackets are a nice touch, because child age drives child-care and school-age rules and the page is quietly telling me it knows that. This is the best control on the page.

**Measure** — 9 options:
- `Keep rate — of each extra dollar earned from poverty to twice poverty, the cents the household keeps (¢)`
- `Cliffs on the road out of poverty — the cliffs a household meets between poverty and twice poverty`
- `Where the road collapses — the largest single loss between poverty and twice poverty ($)`
- `Largest one-step loss ($)`
- `Total width of the danger zones — every stretch where more pay leaves the household no better off, added together ($)`
- `The leap — the raise needed to clear the worst danger zone ($)`
- `Safe exit — earnings above which no danger zone remains ($)`
- `Number of cliffs`
- `Deferred cliffs — of the cliffs counted, those that land at a later renewal`

Expected: changes what the map shades and what the ranked list ranks. Does that — and *also*, undisclosed, changes the ranked list's axis and units, which is correct but startling. Label matches.

Comprehensible without a glossary? **Mostly, with two real traps.** Seven options carry an em-dash gloss; two do not — and they are precisely the two that need one. `Largest one-step loss ($)` and `Number of cliffs` have no scope qualifier, so they sit next to `Where the road collapses — the largest single loss between poverty and twice poverty ($)` and `Cliffs on the road out of poverty` with nothing to say what the difference is. The difference is "on the road out of poverty" versus "anywhere on the curve", and I only learned it because Texas happens to have two different answers and its panel spelled both out. For Ohio the two are the same number, so the distinction is invisible.

`Deferred cliffs — ... those that land at a later renewal` uses "renewal" as a term of art with no expansion in the option text. The table's definition list further down does explain it well ("Head Start's program-year carry-over, a child's 12 months of continuous Medicaid or CHIP, a parent's Transitional Medical Assistance") — but that is 2,500px away from the control.

Closed, the Measure select **truncates**: at 1280 it reads "Keep rate — of each extra dollar earned from poverty t", and with danger zones chosen, "Total width of the danger zones — every stretch where". The gloss that makes the option comprehensible is the part that gets cut.

**Table order** — 10 options, `State, A to Z` plus one "…, largest first" per measure (and "Keep rate on the road out of poverty, most regressive first"). Below it: "Orders this table only; the map and the ranking follow the Measure above." That sentence is exactly right and saved me a wrong assumption. Labels match, all comprehensible.

### 3. Your state

**Finding Ohio.** On the map, OH sits where Ohio sits — the cartogram is honest about geography and I found it in under two seconds. Hovering gives a title: "Ohio: loses 42¢ of each extra dollar". In the ranked list it is "14. OH loses 42¢". In the table it is a row keyed `OH`. All three agree. Good.

**Clicking it.** A panel opens *below the map*, headed with the state name — and it is the best thing on the page:

> **Ohio** — a single parent of two children who earns their way from poverty to twice poverty ends up **42¢** poorer for every extra dollar. The road collapses at **$38,000**, where CCDF child care subsidy ends and the family loses **$12,062** in one step. 45 in 100 families like this in Ohio earn less than that.
> That collapse is also the largest single loss anywhere on the curve. Renter, Franklin County. Details below ↓

Did I notice? On the desktop, **not immediately** — the panel appears below the map card, and at 1280×900 with the map in view it lands near the fold; my eye was on the ranked list to the right, which did not change. On the phone it is unmissable (`15-phone-ohio-panel.png`). The "Details below ↓" link is a good affordance.

Below that, under "Corrections applied in Ohio (0)", the same paragraph repeats verbatim, then:

> PolicyEngine's own figures for Ohio stand as served; HotGap changed nothing on top of them — the fixes other states need were not needed here. Child-care subsidy: inside PolicyEngine's net income for Ohio.

Then a block: "Energy assistance (LIHEAP) **not counted** — Stops at 175% of the poverty guideline… Worth $24 to $441 a winter if received… About 2 in 10 income-eligible households were served in FY2024 (22%)", with two `acf.gov` sources and "Read Sep 16, 2026". Then a fine-print line naming Franklin County, HUD FY2026 Fair Market Rents, and "Child-care price: **county price, 2018 study**, carried to 2026 dollars by the BLS Employment Cost Index."

**The other four:**

| | keep rate | rank | road collapses at | one-step loss | cause | county | corrections |
|---|---|---|---|---|---|---|---|
| WI | loses 105¢ | 1 | $54,000 | $25,833 | CCDF child care | Milwaukee | **2** |
| NJ | loses 94¢ | 3 | $54,000 | $26,206 | CCDF child care | Bergen | **2** |
| OH | loses 42¢ | 14 | $38,000 | $12,062 | CCDF child care | Franklin | **0** |
| TX | keeps 16¢ | 43 | $43,000 | $1,091 | SNAP | Harris | **3** |
| NM | keeps 30¢ | 51 | — no cliff found — | | | Bernalillo | **2** |

Texas is the instructive one: its road collapse is a modest $1,091 SNAP step, but the panel adds "Largest single loss anywhere on the curve: **$13,938** at $77,000 → $78,000, when CCDF child care subsidy ends. 82 in 100 families like this earn less than that." Wisconsin's correction list includes "Premium tax credit — coverage gap, **applied** — In this non-expansion state…". New Mexico's panel says "no cliff found: no $1,000 step of earnings on this household's curve cut net income by $200 or more, up to $150,000."

**Do I understand each well enough to write about it?** Yes for all five — the per-state paragraph does real work, names the program, names the dollar figure, names the county, and tells me how many families sit below the number. That is more than most data pages give a reporter.

**Are two states' numbers on the same footing?** **No — and this is the story.** The page is unusually honest about it, but only one state at a time, and never in a place where you can see two states together:

- **Ohio has 0 corrections.** New Jersey and Wisconsin and New Mexico have 2; Texas has 3. Ohio's figure is PolicyEngine as served; the other four are PolicyEngine plus HotGap patches. The table's last column does surface this ("child-care subsidy added by HotGap" on 28 of 51 rows, absent on 23 including Ohio) — a genuinely good disclosure, though you have to scroll 13 columns right to see it.
- **New Mexico's child-care price is not a New Mexico price.** Its fine print reads "Child-care price: **national median price**, 2018 study" where Ohio, New Jersey, Wisconsin and Texas all read "county price". New Mexico is the one state on this page with no cliff anywhere and the best keep rate in the country — and child care is the program that creates the largest cliff in almost every other state. Nothing on the tile, in the ranked row, in the table row, or in the "(2)" correction count connects those two facts.
- **Texas's Medicaid parent income limit is "overridden"** because "PolicyEngine's figure is five years out of date" — so Texas is being compared against states where that same parameter was left as the engine had it.

So: Ohio and New Jersey are in the same list, the same colour ramp and the same CSV column, but Ohio's child-care subsidy came out of the engine and New Jersey's was put back in by the publisher. Whether New Jersey is genuinely worse than Ohio, or worse partly because of that patch, is not answerable from this page.

### 4. The numbers

**The sentence I could file:**

> In Ohio, a single parent of two young children who climbs from the poverty line to twice it — about $26,650 to $53,300 a year — ends up 42 cents poorer for every extra dollar earned, and the sharpest drop comes at $38,000, where the state's CCDF child-care subsidy ends and the family loses $12,062 of net income in a single $1,000 step of pay; 45 in every 100 Ohio families like this one earn less than that.

Where each number came from:

| number | source on the page |
|---|---|
| "42 cents poorer" | map hover title "Ohio: loses 42¢ of each extra dollar"; ranked list "14. OH loses 42¢"; table **Keep rate** column; state panel; CSV `keep_rate_cents = -42`. Four independent surfaces agree. |
| "$26,650 to $53,300" | methods: "The road out of poverty is the earnings from the federal poverty guideline for this household's size to twice it — $26,650 to $53,300 for a family of three at **{year}** rules" |
| "$38,000" | state panel "The road collapses at $38,000"; table **Road's worst step** "$38,000 → $39,000"; CSV `road_worst_at = 38000` |
| "CCDF child-care subsidy" | state panel; CSV `road_worst_programs = 'CCDF child care subsidy'` |
| "$12,062" | state panel; table **Where the road collapses**; CSV `road_worst_drop = 12062` |
| "45 in every 100" | state panel "45 in 100 families like this in Ohio earn less than that"; table sub-line under Road's worst step; CSV `road_worst_position = 45.1` |
| "single parent of two young children" | Household select "1 adult, 2 children (3 and 7)" |

Two more Ohio figures I would probably use, both from the table: **the leap is $47,000** ("the raise a household must clear in one move to get past its worst danger zone") and **the safe exit is $110,000**, beside which the page prints "91 in 100" — meaning a single parent of two in Ohio has to reach $110,000 before no danger zone remains, and 91 in 100 such families earn less than that.

**Figures I cannot explain, or suspect and cannot confirm:**

1. **Ohio's rank.** The list says "14. OH loses 42¢" and "15. NC loses 42¢". The CSV says `-42` for both. Two identical published values are given different ranks with no tie shown and no tiebreaker stated. Something with more precision than the page ever prints is deciding that Ohio is worse than North Carolina. I cannot report "14th-worst" and I cannot report the tie either, because the page asserts an order I can't verify.
2. **The year behind "$26,650 to $53,300."** The sentence reads "at **{year}** rules". An unrendered template variable, in the definition of the page's central concept.
3. **How much of the −42¢ is that one drop.** My own arithmetic: $53,300 − $26,650 ≈ $26,650 of extra earnings, times 42 cents ≈ $11,200 lost — against a single named drop of $12,062. That strongly implies the entire Ohio keep rate is one child-care cliff and the rest of the road is roughly break-even. That is the most interesting thing about Ohio and I cannot confirm it, because the page offers no curve for a state — only summary statistics.
4. **Whether Ohio's 1 deferred cliff is inside the 6 on the road or only in the 10 anywhere.** The definition says "Of the cliffs counted" without saying which count.

### 5. The tables

The big table is headed "All 51, every measure" and has 13 columns: State · Keep rate · Cliffs on the road · Where the road collapses · Road's worst step · Largest one-step loss · Worst step · Danger zones, total width · The leap · Safe exit · Cliffs · Deferred · Figures.

**Column definitions.** There is a 13-entry definition list immediately above the table (`10-table-defs.png`), and it is good — plain, short, and it defines the hard ones. "Families earning less: … From Census survey data, and cross-sectional: how many families already earn less, **never one family's chance of getting there**." That is a sentence written by someone who has watched a reporter misuse a percentile, and I respect it.

**Are the columns comprehensible?** Individually yes, as a set no — because four of them are two pairs whose names are inverted:

- **"Where the road collapses"** holds a **dollar loss** ($12,062).
- **"Road's worst step"** holds a **location** ($38,000 → $39,000).
- **"Largest one-step loss"** holds a **dollar loss**.
- **"Worst step"** holds a **location**.

A column beginning "Where…" containing money, and a column ending "…step" containing a place, is backwards from how the words read. The definitions resolve it; the headers fight it. On a horizontally scrolling table where you often see the cell before the header, this is a live transcription risk.

**Cells I could not interpret.** New York's **Safe exit** reads **"past the axis"** and its **The leap** reads **"≥ $55,000"**. Maryland and Nebraska have the same. Neither "past the axis" nor the "≥" prefix appears anywhere in the definition list directly above the table. The explanation does exist — about 4,000px further down, under "Past the axis is not a number", and it is excellent ("the safe exit is unknown… Those cells read past the axis here and **must not be charted as a value**"). But it is nowhere near the cell, and the definition list, which is the thing a careful reader consults, does not mention it.

Two labels I could not reconcile at all:

- The line directly above the table reads **"All six measures for 1 adult, 2 children (3 and 7), by state."** The heading above it says "every measure". The table has 13 columns, the definition list has 13 entries and the Measure dropdown offers 9. There is no reading on which "six" is right.
- In the methods: "that wall sits above the median family's earnings in **39 states of 50**". The page's own first sentence is "Fifty states and the District of Columbia", the map legend says "the **51** states with a comparable figure", and elsewhere "over the **50** states with a comparable figure; 1 with no cliff found". The denominator moves between 50 and 51 with the reason given only sometimes.

The table also handles missing data well, which is worth saying: Connecticut has no county name and no single program behind its worst step, and instead of a blank or an "undefined" it renders "The road collapses at $46,000, where the family loses $2,395 in one step; **no single program explains the drop**" and "Renter in the state's most populous county."

### 6. Getting the data out

The button downloads `hotgap-1-adult-2-children-3-and-7-2026-09-17.csv` — 51 rows, one per state, 43 columns.

**Does it match what I saw?** Yes, exactly, and in the table's order. Every figure I checked reconciles: Ohio `keep_rate_cents=-42`, `road_worst_drop=12062`, `road_worst_at=38000`, `road_worst_programs='CCDF child care subsidy'`, `danger_zone_width=57000`, `leap=47000`, `safe_exit=110000`, `cliff_count=10`, `deferred_cliff_count=1`. The full column list is printed in the methods before you download, which is a courtesy I have almost never been given.

**Usable for a chart?** Yes — and in two respects it is *better than the page*:

- `keep_rate_cents` is a signed integer (`-42`), not the page's "loses 42¢". Chartable as-is.
- It carries the footing columns the page buries: **`childcare_subsidy_footing`** (`"in PolicyEngine's net income"` for Ohio vs `"added by HotGap"` for the other four; 23/28 split across the country) and **`childcare_price_vintage`**, which is where I finally pinned down the comparability problem:

  | vintage | states |
  |---|---|
  | `county 2018` | 40 |
  | `county 2016` | 4 (GA, LA, MT, NV) |
  | `county 2017` | 2 (FL, IA) |
  | `nationalMedian 2018` | 2 (**IN, NM**) |
  | `county 2015` | 1 (**CO**) |
  | `stateMedianCounty 2018` | 1 (CT) |
  | `county 2012` | 1 (**DC**) |

  So Colorado — the **second-worst state on the page**, whose worst cliff is the child-care subsidy — is priced from a **2015** county study carried forward 11 years, and DC from a **2012** study carried forward 14. The page's methods do say "The study year behind the price… differ by state and are printed in the source line under the map", and they are. But you can only compare them by downloading the file.
- `leap_is_lower_bound`, `no_cliff_found` and `comparable` are proper booleans, so "past the axis" survives the export as a flag rather than as unparseable text. Good.

Friction: the header carries a UTF-8 BOM, so column 1 reads `﻿state` to a naive reader. And the filename says `2026-09-17` while the page says "Weekly run of Sep 16, 2026" and today is the 18th — three dates, none of which is obviously the right one to put in a chart footnote.

### 7. The phone (390×844)

**Task 1 — yes.** The top reads cleanly (`13-phone-top.png`): headline, both definition paragraphs, then Household and Measure stacked full-width with the CSV button under them. The Measure select still truncates ("Keep rate — of each extra dollar earned from").

**Task 3 — yes, with a caveat.** The cartogram fits the width with all 51 tiles legible (`14-phone-map.png`), and the legend keeps all seven tick labels (−105¢ … +30¢). Tapping Ohio puts the full Ohio paragraph directly under the map, in view, no scrolling (`15-phone-ohio-panel.png`). This is genuinely better than the desktop, where the same panel lands below the fold.

The caveat: **Ohio's tile measures 27.4 × 27.4 CSS pixels** — below the 44px iOS / 48dp Android minimum, in an eleven-column grid of immediate neighbours. A fat-thumb miss selects Indiana or Pennsylvania and silently rewrites every number in the panel, with no undo and no "you selected X" confirmation beyond the panel heading itself.

**Task 4 — yes.** Every number in my filable sentence is reachable on the phone: 42¢, $38,000, $12,062, CCDF, 45 in 100, Franklin County, all in the one tapped paragraph. The leap and safe exit require the table.

**The table on the phone is handled well.** It is 1,499px wide inside a 343px box with `overflow-x: auto`, so the *page* does not scroll sideways (document width 375 < viewport 390 — correct). There is a "Swipe for more →" hint, the header row is sticky, and the **State column is sticky**, so you keep your row while scrolling right (`16-phone-table.png`, `17-phone-table-scrolled.png`).

One hazard: mid-scroll, the sticky State column clips the cell beside it with no gutter, so Alaska's $75,000 danger-zone width renders as "**5,000**" and Colorado's $90,000 as "**0,000**", with the dollar sign eaten too (`17-phone-table-scrolled.png`). The header clips the same way — "Danger zones, total width" reads "al width". A reporter transcribing at speed can take a truncated figure for a whole one.

### 8. The story

**The story is not that Ohio is bad. It is that the raise is a trap made of one program, and the trap is set at the income a working parent actually reaches.**

In Ohio, a single parent of two who works her way from the poverty line to twice it keeps 58 cents of each extra dollar — which is to say she loses 42. The whole of that loss is one step: at $38,000 the CCDF child-care subsidy ends and $12,062 of net income goes with it, in a single $1,000 step of pay. Forty-five in a hundred Ohio families like hers earn less than $38,000, so this is not an exotic ledge at the top of the scale — it is sitting just above the middle of the distribution. She does not get clear of every danger zone until $110,000, and 91 in 100 families like hers earn less than that.

Ohio is not even unusual. Twenty-six of the 51 places on this page have a negative keep rate — half the country. In Wisconsin the same climb leaves the family **105 cents poorer per dollar**: the raise costs more than it pays. New Jersey, 94 cents. And in state after state the program named in the drop is the same one: the child-care subsidy.

Which is where the second, harder story is. This page assumes every modelled family **receives** that child-care subsidy — "The CCDF child care subsidy is on for this run" — while it deliberately switches **off** Head Start and housing vouchers on the stated ground that "they are rationed, and assuming a family holds one inflates its numbers", and excludes LIHEAP because "in FY2024 the states served between 3% (Texas) and 85% (Michigan) of their income-eligible households, so a curve that assumed it would draw a benefit most eligible families never receive." CCDF is also a capped block grant that serves a minority of eligible children. The page applies its own rationing principle to three programs and suspends it for the fourth — the one that produces nearly every headline number on it. The page says what it did, plainly, in the methods. It never says why this one is different.

**What my editor would ask that I cannot answer from this page:**

- *"Is Ohio really 14th-worst?"* No idea. Ohio and North Carolina both print −42¢ and the CSV holds −42 for both, yet the page ranks them 14 and 15. Seven values are duplicated across 17 states; a third of the ranking has an order I cannot reproduce.
- *"How many Ohio families actually get the child-care subsidy?"* Not on the page. The cliff is only real for a family that holds the benefit, and the page tells me the take-up rate for LIHEAP (22% in Ohio) but not for CCDF, the program it actually models as received.
- *"If New Mexico has no cliff at all, what is New Mexico doing right?"* I would have run that as the good-news sidebar. Then I found that New Mexico's child-care price is a **national median** standing in for a county the source database lacks — and child care is the thing that makes the cliff everywhere else. I cannot tell whether New Mexico has solved the problem or whether the input that would reveal it is missing.
- *"Is this Ohio or is this Columbus?"* It is Franklin County, at HUD Fair Market Rent, for a renter. The page says so. The headline, the map and the sentence "Ohio — a single parent of two children…" all say Ohio.
- *"How old is the child-care number?"* A 2018 county study carried to 2026 dollars by an employment-cost index — and for Colorado, the second-worst state, a **2015** study; for DC, **2012**.

**Who I would have to call.** And here is the practical problem: **there is nobody on this page to call.** The entire document contains five links — a skip link, the language toggle, PolicyEngine twice, and one PolicyEngine GitHub issue. No byline, no organisation page, no contact, no "about". The methods reference "a household's own lookup" as a different HotGap product with different settings, and do not link to it. The citation line ends "Cite as: HotGap, What a raise costs, state by state…" and then a `localhost` URL. I would be calling PolicyEngine to ask about a set of corrections that PolicyEngine did not make.

## The lede I would file

> A single mother of two in Columbus who fights her way from the poverty line to $53,000 a year will end that climb 42 cents poorer for every extra dollar she earned. Almost all of it goes in one step: at $38,000, Ohio's child-care subsidy stops, and $12,062 of her family's income disappears on a $1,000 raise — a drop that lands below what 45 in every 100 Ohio families like hers already earn. She is not clear of it until $110,000, a wage 91 in 100 such families never see. Ohio is not an outlier. In 26 of the 51 states and jurisdictions modelled by HotGap, a benefits calculator built on the open-source PolicyEngine, the climb out of poverty leaves a working family with less than it started with; in Wisconsin the same raise costs $1.05 for every dollar earned. And in state after state the culprit named is the same: the child-care subsidy that made the job possible in the first place.

*(Held for checking before filing: Ohio's exact rank, which the page asserts but its own data cannot support; and what share of eligible Ohio families actually hold the CCDF subsidy this model assumes they all receive.)*

## Findings

### B — wrong conclusion or task blocked

**B1. The Measure and Household changed without me choosing them, and I read one household's ranked list against another household's map.**
What I saw: after selecting nothing but the language, the map card was titled "Keep rate on the road out of poverty, by state" and captioned "**2 adults, one working, no children**, renting in the state's most populous county", with a ranked list reading "1. HI keeps 46¢ … 27. WI keeps 66¢" and a legend running 0¢ to +78¢ (`04-map-and-ranked.png`). Seconds earlier the same ranked list had read "1. WI loses 105¢". What I concluded: that the keep-rate scale for one household ran from −105¢ to +78¢, and that Wisconsin was simultaneously worst and 27th. Both wrong; they were two different households. The URL had rewritten itself to `?household=married-0&state=AL`.
It happened three times, each with URL evidence: `?household=married-0&state=AL`; `?measure=roadWorst&state=MO` then `?measure=roadCliffCount&sort=state&state=MO`; and — reproducibly, on the first click of a state after load — `?household=single-2&measure=dangerWidth&sort=leap&state=OH`. That last one is in `08-ohio-clicked-measure-changed.png`: I clicked **Ohio** to read Ohio's **keep rate**, and the page returned a map titled "**Total width of the danger zones**, by state", a ranked list in dollars, and a Table order silently switched to "The leap, largest first". The Measure values it lands on (`roadCliffCount`, `roadWorst`, `dangerWidth`) are options 2, 3 and 5 of that select, and `leap` is option 7 of the sort select — the controls are being stepped by something that is not the reader. I could not reduce it to one deterministic gesture, and it did not occur on every click.
Why it is severity B: the page's measures are denominated in **cents** and in **dollars**, and the ranked list, the map title and the legend all re-render together, so there is no moment of visible breakage. The failure mode is filing "$57,000" as a keep rate or "42¢" as a danger-zone width. The `lang` parameter is also dropped when it happens, so a URL copied afterwards no longer carries the view it describes — and the page's own "Cite as:" line is built from that URL.

**B2. Ohio's rank is asserted and cannot be supported.**
What I saw: "14. **OH** loses 42¢" and "15. **NC** loses 42¢" in the ranked list (`07-map-single2.png`), and `keep_rate_cents` of exactly `-42` for both states in the downloaded CSV. What I concluded, and would have filed: "Ohio is the 14th-worst state in the country." What caused it: the ranking orders on a precision the page never prints, shows no tie marker, and gives no tiebreak rule. The page *can* render ties — under the danger-zone measure it prints "5. CT $82,000 / 5. VT $82,000" and "13. DE / 13. MN" (`08-ohio-clicked-measure-changed.png`) — so a reader reasonably infers that distinct ranks mean distinct values. Seven keep-rate values are shared by 17 of the 51 states, so roughly a third of the flagship ranking carries an order the published data cannot reproduce.

**B3. New Mexico's headline — the only state with no cliff — rests on an imputed national child-care price, and nothing next to the claim says so.**
What I saw: NM is rank 51 ("keeps 30¢"), the darkest tile on the map, its table row reads "none" in seven columns, and its panel says "New Mexico — no cliff found: no $1,000 step of earnings on this household's curve cut net income by $200 or more, up to $150,000." Its correction count is "(2)" and neither correction mentions pricing. What I concluded, and would have run as the good-news sidebar: that New Mexico has eliminated the benefits cliff. What I then found, in the last sentence of the smallest text in the panel: "Child-care price: **national median price**, 2018 study" — where Ohio, Texas, New Jersey and Wisconsin all read "county price". The CSV names it `nationalMedian 2018`, shared only with Indiana. Child care is the program that produces the largest cliff in nearly every other state on the page, so the one state with no cliff is one of only two whose child-care input is not a local measurement. The two facts are never placed within sight of each other: not on the tile, not in the ranked row, not in the table's "Figures" column, not in the correction count. The methods do disclose the practice in general ("whether a state or national median stood in for a county the database lacks… are printed in the source line under the map") — which is why this is a placement failure rather than a concealment, but it is still the page's most quotable claim resting on its least comparable input.

### S — had to guess, guessed right eventually

**S1. CCDF is switched on for everyone while three other rationed benefits are switched off, and the page never reconciles it.** Buried in the methods: "The CCDF child care subsidy is **on** for this run and off for a household's own lookup. Head Start and housing vouchers are **off** in both: they are rationed, and assuming a family holds one inflates its numbers." And on LIHEAP: "It is a block grant, not an entitlement… so a curve that assumed it would draw a benefit most eligible families never receive." I guessed, correctly, that this was the load-bearing assumption on the page — CCDF is named as the cause of the worst drop in Ohio, New Jersey, Wisconsin, Texas and most other states. I had to read ~9,000px down to find it, it is stated as a setting rather than as a caveat, and no take-up share is given for CCDF as it is for LIHEAP.

**S2. `{year}` is printed to the page.** "The road out of poverty is the earnings from the federal poverty guideline for this household's size to twice it — $26,650 to $53,300 for a family of three at **{year}** rules" (`18-year-placeholder-leak.png`). I guessed 2026 from the neighbouring bullet ("at 2026 rules") and the fine print ("Rules: 2026"). An unrendered template variable inside the definition of the page's central concept, sitting between the two dollar figures a reporter would quote, is the kind of thing an editor uses to decide whether to trust the rest.

**S3. "past the axis" and "≥ $55,000" are undefined where they appear.** New York's Safe exit cell reads "past the axis" and its leap "≥ $55,000" (`11-table-ohio-row.png`); Maryland and Nebraska likewise. The 13-entry definition list immediately above the table defines neither. I guessed it meant beyond the modelled ceiling, and was right — the explanation is ~4,000px below, under "Past the axis is not a number", and is excellent ("the safe exit is unknown… must not be charted as a value"). It is simply nowhere near the cells, and not in the list a careful reader actually consults.

**S4. "Ranked" does not say ranked by what, or in which direction.** The heading is one word. I assumed worst-first from "1. WI loses 105¢" and confirmed it only by scrolling to "51. NM keeps 30¢". For a measure where high is good (Safe exit) and one where high is bad (The leap), a bare "Ranked" makes the reader re-derive the direction each time.

**S5. The page opened in Spanish on an `en-US` browser.** `document.documentElement.lang` was `es-US`, title "HotGap — lo que cuesta un aumento, estado por estado" (`01-fold-1280.png`). I guessed there would be a language switch and found "English" at top left; one click fixed it and the choice persisted. In fairness: I could not reproduce this from cleared storage — a fresh load with empty `localStorage` and an `en-US` browser correctly serves English, and the stored key had been set to `es-US` by some earlier session in this browser profile. So the likely cause is a remembered preference rather than broken negotiation. Reported anyway because it is what the link did when my editor's link was opened, and because the remedy — a visible "English" in English — is the one thing that made it recoverable.

**S6. The map's colour ramp resolves the good half four times more finely than the bad half.** The legend prints "Bins: three steps of **35¢** below zero and three of **10¢** above it". The consequence, from the tile colours: **Louisiana (keeps 20¢) and North Dakota (keeps 21¢) — 1¢ apart — are different colours**, while **Ohio (loses 42¢) and Nevada (loses 67¢) — 25¢ apart — are the same colour**, as are Georgia (−45¢) and Nebraska (−62¢). The legend's six swatches are drawn at equal width for bins of unequal value-width (`07-map-single2.png`), which states visually that the steps are equal. The losing side — where the story is — is the side the map flattens.

**S7. The zero crossing is the weakest contrast on the map.** Just-below-zero is `rgb(209,159,194)` (pale pink — Alabama at −35¢, Virginia at −3¢) and just-above-zero is `rgb(215,163,118)` (pale tan — Maine at +9¢, Connecticut at 0¢). Near-identical lightness (209/159/194 vs 215/163/118), separated mainly in the blue channel. "Does this family get ahead or not" is the single most important distinction on the page, and it is carried by a hue shift between two pale colours of the same value — the pairing most at risk under red-green colour blindness and on a phone in daylight (`14-phone-map.png`).

**S8. Two column names invert their contents.** "Where the road collapses" holds a dollar loss; "Road's worst step" holds a location. "Largest one-step loss" holds a dollar loss; "Worst step" holds a location. I read the first pair backwards until the definition list corrected me. On a table you scroll horizontally, the cell often arrives before the header.

**S9. Three of the map's four visual states have no visible key.** The screen-reader-only description says: "A state with no cliff is an empty square; a state whose figure **runs past the axis has a dashed edge**; a state the model **cannot complete is hatched** rather than shaded." Only the empty-square case ever gets a visible legend entry ("No cliff found (1)", `08-ohio-clicked-measure-changed.png`). Dashed and hatched are explained to screen readers and to nobody else. For this household nothing is hatched — the methods say so — so a sighted reader meets an unexplained mark only on some other household, with no key to reach for.

### N — friction

**N1.** "**All six measures** for 1 adult, 2 children (3 and 7), by state" sits directly above a 13-column table, under a heading that reads "All 51, **every measure**", with a 13-entry definition list between them and a 9-option Measure menu above. No reading makes "six" true (`10-table-defs.png`).

**N2.** The denominator moves: "Fifty states and the District of Columbia" (standfirst), "the **51** states with a comparable figure" (legend), "over the **50** states with a comparable figure; 1 with no cliff found" (legend, other measure), "in **39 states of 50**" (methods). Sometimes the reason is given, sometimes not.

**N3.** The Measure select truncates to its uninformative half: "Keep rate — of each extra dollar earned from poverty t", "Total width of the danger zones — every stretch where". The em-dash gloss is the part that gets cut, at 1280 and at 390.

**N4.** The state name is repeated as a second sentence-opener in the panel: "**Ohio** — a single parent of two children… **Ohio** — $57,000 of earnings lie inside danger zones." It reads as a template seam.

**N5.** The whole state paragraph renders twice within one screen — once under the map, once under "Corrections applied in Ohio (0)" — about 200px apart on the phone (`15-phone-ohio-panel.png`, `09-ohio-corrections.png`).

**N6.** Phone map tiles are **27.4 × 27.4 px**, below the 44px/48dp touch minimum, in an eleven-across grid of neighbours; a miss silently re-renders every number in the panel.

**N7.** The phone table's sticky State column clips the adjacent cell with no gutter: Alaska's $75,000 shows as "5,000", Colorado's $90,000 as "0,000", and the header "Danger zones, total width" as "al width" (`17-phone-table-scrolled.png`).

**N8.** **No byline, no contact, no organisation.** Five links on the entire page: a skip link, the language toggle, PolicyEngine twice, one PolicyEngine GitHub issue. The methods reference "a household's own lookup" — a different HotGap surface with a *different CCDF setting* — and do not link to it. There is no one to call about a set of corrections HotGap made.

**N9.** Three dates in play: CSV filename `2026-09-17`, page text "Weekly run of Sep 16, 2026", today the 18th. I do not know which to put in a chart footnote.

**N10.** The CSV header carries a UTF-8 BOM, so column 1 reads `﻿state` to a naive parser. (Deliberate for Excel, friction for pandas.)

**N11.** "Cite as: HotGap, What a raise costs, state by state… `http://localhost:8802/places?…`" — the citation bakes in the live URL, so it inherits whatever state the controls happen to be in, including a state the reader did not choose (see B1).

**N12.** At 1280 the methods prose runs in a ~475px column inside a ~1055px white card, leaving the right half of the longest section on the page empty (`18-year-placeholder-leak.png`).

## What worked on first contact

These are not padding; they are the things I would not have to fix if I owned this page.

- **The per-state paragraph is filable prose.** "The road collapses at $38,000, where CCDF child care subsidy ends and the family loses $12,062 in one step. 45 in 100 families like this in Ohio earn less than that." Program named, amount named, location named, and a population figure that tells me whether it matters. I have reviewed a lot of data pages that would make me compute all four.
- **"Corrections applied in Ohio (0)"** with "PolicyEngine's own figures for Ohio stand as served; HotGap changed nothing on top of them — the fixes other states need were not needed here." A publisher proactively telling a reporter which of its numbers it has touched, per state, with upstream issue numbers, is rare and it is the reason I could answer the footing question at all.
- **The CSV carries the footing as data.** `childcare_subsidy_footing` and `childcare_price_vintage` let me audit comparability across all 51 states in one pass — something the page itself cannot do. Adding `leap_is_lower_bound` and `no_cliff_found` as booleans means the censored values survive export as flags rather than as junk strings.
- **Three caveats written directly at the reporter, in the second person of intent:** "Bins are recomputed for every measure… so a shade means nothing across two different measures. **Read the bin bounds, not the colour.**" — "**Hatched is not low**… Do not write that those states are gentler; the only honest claim is that this model cannot yet say." — "**Past the axis is not a number**… must not be charted as a value." Someone has watched this data get misused and wrote the guardrails down.
- **"Families earning less… cross-sectional: how many families already earn less, never one family's chance of getting there."** The exact misreading a deadline reporter makes, pre-empted in one clause.
- **Graceful degradation.** Connecticut has no county name and no single program behind its worst step, and gets "no single program explains the drop" and "Renter in the state's most populous county" rather than a blank, a zero or an `undefined`.
- **LIHEAP disclosed with its take-up rate, per state, with sources and a read date** — "About 2 in 10 income-eligible households were served in FY2024 (22%)", `liheapch.acf.gov`, "Read Sep 16, 2026" — plus the Michigan exception called out by name. Also the volunteered admission that Alaska's and Hawaii's figures are "understated" with the upstream issue linked.
- **Accessibility that is actually wired up:** every tile carries a `title`/`aria-label` with its value ("Ohio: loses 42¢ of each extra dollar"), arrow keys move between states, there is a working "Skip to the data table" link, and the cartogram has a real figure description.
- **The phone table is done properly:** sticky header, sticky State column, a "Swipe for more →" hint, and the overflow contained in its own box so the page itself never scrolls sideways.
- **The Household dropdown** — eleven plain-language options with children's ages in brackets, comprehensible without a glossary, and the one control on the page I never had to think about.
