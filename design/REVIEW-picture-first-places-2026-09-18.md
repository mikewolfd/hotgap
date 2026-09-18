# The map page, picture first — what was measured, and what a cold reader said

The pass is `design/PICTURE-FIRST-2026-09-18.md`; this is the journalist
surface's half of it. Everything below was measured on this branch through the
Worker, with the project's own runners. The "before" column is this branch's
parent (`f5395b3`), rebuilt and measured on the same server with the same
script on the same afternoon, so the two columns differ by the pass and by
nothing else.

## The weight

`node app/e2e/weight.mjs <base-url> /places` — the words a person can really
see (no `[hidden]`, no `display:none`, no visually-hidden clip; a closed
`<details>` worth its summary alone; nothing scrolled out of a scroller), then
the same page with every disclosure open, then where the first `<figure>`
starts and how much of the first screen it covers.

**Read the middle column, not the first.** `weight.mjs` subtracts every
`<option>`'s words from a visible `<select>` and adds the selected one back —
but a closed select's options have no client rect, so the tree walker never
counted them, and the subtraction runs against a total that never held them.
On this page, with two long-optioned selects, the error is 184 words and the
tool prints **−11**. A negative word count is the defect announcing itself.
The re-derived column adds the options back; it is the number of words on the
screen, and it is what `e2e/places.spec.ts` checks the budget against.

The tool's own output, verbatim, so nobody has to take that on trust:

```
| page | width | words, by default | words, disclosures open | figure top | figure share of screen 1 | figure height |
|---|---:|---:|---:|---:|---:|---:|
| page 1 | 390 | -11 (-11 prose + 0 in the picture) | 2354 (2354 prose + 0 in the picture) | 57px | 0.93 | 896px |
| page 1 | 1280 | -11 (-11 prose + 0 in the picture) | 3535 (3535 prose + 0 in the picture) | 57px | 0.94 | 1074px |
```

| | before (`f5395b3`) | after | budget |
|---|---:|---:|---:|
| **390** — words by default, as the tool prints them | 2,251 | **−11** | — |
| — words by default, re-derived | **2,495** | **173** | ≤ 200 |
| — words, every disclosure open (re-derived) | 2,495 | **2,598** | — |
| — the map's top | 812px | **57px** | ≤ 120px |
| — the picture's share of screen 1 | 0.04 | **0.93** | ≥ 0.5 |
| **1280** — words by default, as the tool prints them | 3,432 | **−11** | — |
| — words by default, re-derived | **3,676** | **173** | ≤ 200 |
| — words, every disclosure open (re-derived) | 3,676 | **3,779** | — |
| — the map's top | 596px | **57px** | ≤ 120px |
| — the picture's share of screen 1 | 0.34 | **0.94** | ≥ 0.6 |

Fourteen times fewer words before a reader has done anything, and **more of
the page than before once it is all open** (2,598 against 2,495): nothing was
deleted to reach the budget, which is the whole point of measuring both. The
map moved from most of a phone screen down to one line of masthead above it.

With a state selected — the view a reporter actually works in — the readout
under the map adds its sentences:

| | tool | re-derived | map top | share |
|---|---:|---:|---:|---:|
| 390, Ohio open | 39 | 223 | 57px | 0.93 |
| 1280, Ohio open | 39 | 223 | 57px | 0.94 |

The contract's budget is on the default view (`inventory.md` § The page is its
picture: "words visible **by default**"), and the selected view is printed
beside it rather than silently left out. Fifty of those fifty extra words are
the lede itself — the rate, where the road collapses, the programme, the
money, and how many families stand below it — which is the one thing this
surface exists to hand a reporter.

## What the page is now

One line of masthead — the wordmark, the language switch, the download. Then
one sentence. Then the map.

**The sentence** is the national reading of the selected measure, written from
the data, one shape per measure, in the register a desk editor would keep:

> In **26** of the 50 states and the District of Columbia, a single parent of
> two children climbing from the poverty line to twice it ends up poorer than
> they started.

The 26 is counted off the run, the 50 and the "District of Columbia" off the
rows, and the one figure it underlines is drawn in the ink of the tiles it
counts, so the sentence is also the map's first key. Every other measure has
its own sentence and its own "nothing to name" branch: *The road out of
poverty collapses hardest in New Jersey: $26,206 of income gone between
$54,000 and $55,000 of pay.*

**The denominator is named once, in full.** The cold read of 2026-09-18 found
the page's own denominator moving between 50 and 51 from line to line — "a
fraction whose bottom half moves" — so the sentence says *the 50 states and
the District of Columbia* and the code counts DC out of the 50 rather than
hoping.

**The map** is the picture: full-bleed at 390 (a 30.7px tile, from 27.4px),
48rem at 1280 (a 64px tile), with the legend as one strip under it, the
readout as its caption, the selected state's provenance closed under that, the
two controls under that, and the estimates line last. `charts.md` § The map is
the picture carries the rule.

**Everything else is one press away**, in the contract's names: *Every state,
every measure* (the ranked strip and the 51-row table with its definitions),
*How these numbers were made*, *Where these numbers come from*. Print opens
them all, so paper is the whole page in the screen's order.

## Three things that went because they were being said twice

Measured as duplication, cut as duplication — not to reach a number.

1. **The standfirst.** Two paragraphs above the map defined the measure and
   the terms. The answer sentence now says the measure's finding with figures,
   and the definitions are the first thing inside *How to read this map*.
2. **The state block's copy of its own readout.** The cold reader met Ohio's
   paragraph in the readout and then, 200px lower, "the same paragraph repeats
   verbatim". The readout says the findings; the block under it says only where
   the numbers came from, and is named for that.
3. **The readout's restatement of the national frame.** core's `road.sentence`
   is *"Ohio — a single parent of two children who earns their way from poverty
   to twice poverty ends up 42¢ poorer for every extra dollar."* — right on a
   surface where nothing has said whose curve this is, and fourteen wasted
   words two inches under a sentence that has just said it. The readout says
   *"Ohio — loses 42¢ of each extra dollar climbing out of poverty."* The rate
   is still core's own phrase through `keepRateWords`, so the map, the citizen
   answer and the caseworker sheet cannot word or round one rate three ways;
   only the frame is this page's, because only this page has already supplied
   it.

## Standing findings fixed on the way past

- **S4, "'Ranked' does not say ranked by what, or which way."** The strip's
  heading is now *Ranked: Keep rate on the road out of poverty, most
  regressive first*, in the order control's own words, from the measure.
- **S3, "past the axis and ≥ $55,000 are undefined where they appear."** Both
  are entries in the definition list above the table now, which is the list a
  careful reader consults; the explanation four thousand pixels down stays.
- **S9, "three of the map's four tile states have no visible key."** All four
  are drawn in *How to read this map*, each with the tile's own class, present
  on this map or not. The strip under the map still shows only what is on it.
- **N7, "the phone table's sticky State column clips its neighbour",** so
  Alaska's $75,000 read "5,000". The sticky cell carries three pixels of the
  page's own ground with it, so a neighbouring figure is hidden rather than
  half-shown.
- **S2's spirit, on the Measure control.** The two options that carried no
  scope at all now sit under `<optgroup>` labels that carry it for all nine.
  (The options themselves keep their own scope words: a *closed* select shows
  the option without its group label, so an option must still stand alone —
  see *What was tried and reversed*.)

## What was tried and reversed

**Shortening the nine measure options.** The first draft cut the scope out of
each option on the ground that the `<optgroup>` label says it. It does — while
the menu is open. A closed select shows the option alone, which is exactly
where a reader meets it, and "Cliffs a household meets on the way" is a
dangling referent there. The proof pins this (places review S2) and was right
to. All nine are back as they were; the group labels stay, because they are
what fixes the two options that never had a gloss.

## Proofs

Through the project's own runners, against `wrangler dev` on port 8808 with
`--var HOTGAP_RATE_LIMIT_OFF:1`:

- `npm run typecheck` — clean.
- `npx vitest run` — 668 passed, 30 skipped, 0 failed.
- `cd app && npx vite build` — clean.
- `npx playwright test e2e/places.spec.ts` — 3 passed, **289 checks** (243
  before), no console errors, no horizontal scroll at either width, folded or
  open.
- `npx playwright test e2e/i18n.spec.ts` — 3 passed; 1,465 places strings
  walked in the pseudo-locale with every disclosure open, none hard-coded
  English, no horizontal scroll at 390 or 1280, and the Spanish page free of
  all 711 English phrases.
- `e2e/citizen.spec.ts` (9 passed, 2 skipped) and `e2e/caseworker.spec.ts`
  (12 passed, 1 skipped) — the two surfaces this pass did not touch, to prove
  it did not touch them.

What the proof gained: the budget itself (the words, the map's top, the share,
and the same page opened up), the answer sentence counted off the file, the
four disclosure names in the contract's order, all four tile states keyed, the
caution that leaves the disclosure when it is true of the map on the screen,
the ranked strip's own heading, a `beforeprint` that opens everything, and the
print layout's proof that the sentence, all 51 tiles and the strip that reads
them land on page 1 at Letter. Every data-driven check it had is kept: the
readout's sentences per measure and per state, the competition ranking at the
printed precision, the lower-bound groups, the boundary rows, the 43-column
CSV round-trip, the URL restore, the PDF's drawing ops.

Two defects the run found and the page fixed on the spot: *sweep* — the
developer's word for the run — reached a reader in two new definitions (N7's
rule), and the sticky column's new gutter shadow had replaced the selected
row's ink bar, leaving selection marked by a 1.08:1 ground.

## Contrast, re-measured

The figure used to be a panel with a `--surface` ground of its own. The
picture is the page now, so the figure has no ground — which put the ramp on
`--plane`, where the two lightest bins measured 1.86:1 against the 2:1 floor
`charts.md` § 2 sets for the light end of a scale. The page takes the
paper-white ground the citizen surface took, for the same reason. Measured
again on the resolved colours, both schemes: every bin ≥ 2:1 on the ground,
every tile label ≥ 4.5:1 on its own bin, the hatch stripe ≥ 4.5:1 on its
ground.

## The cold reader, and what it changed

A context-blind read of the built page, run the way
`REVIEW-places-context-blind-rerun-2026-09-16.md` was: a reporter on deadline,
one link, one line from the desk ("see if there's a story about our state in
this"), the same eight tasks, **its own browser** — the lesson of the last
read's B1, and it took a hard reload first to prove it was on the current
build. Its full report is at the end of this file.

**The plan's bar for this page was that the lede still carry the keep rate,
where the road collapses and who is there.** It does:

> Climb out of poverty in Ohio and the state will meet you on the way up.
>
> A single parent raising two young children in Franklin County who works her
> way from the poverty line to twice it — from about $26,650 to about $53,300
> — ends that climb poorer than she began it, losing **42 cents of every extra
> dollar** she earns to taxes and vanishing benefits. The worst of it arrives
> in a single step. At **$38,000** a year her child-care subsidy ends, and a
> $1,000 raise costs her family **$12,062** at once.
>
> **Forty-five in every 100** Ohio families like hers already earn less than
> $38,000. The cliff is not somewhere off in the distance. It is directly in
> front of most of them.

Rate, collapse, position — and the third paragraph is the thing Plan 9 built
position for. The reader drafted that off about eighty words, before opening
a single disclosure.

**And on the reading load: no.**

> Measured from the rendered page: with everything in its default state the
> whole page is **394 words** of `innerText`, and a sighted reader sees fewer
> than that … The page is 1377px tall. That is a restrained, well-judged front
> door. … **What I actually read in the first pass:** the 31-word headline, the
> legend's two word-keys, "Select a state to read its numbers", and — after
> clicking — Ohio's 48-word panel. About 80 words. That was enough to file the
> lede. Nothing was padded and nothing was repeated.

Its verdict on where the page still fails is worth quoting too, because it is
sharper than "too long": *"the page is not too long, it is **mis-layered**"* —
four glosses missing from a dropdown sent it to the 889-word method note to
answer questions the control should have answered by itself.

### The seven B findings the page fixed

1. **B2, B3 — two measures with no window, beside their near-twins.**
   "Largest one-step loss ($)" and "Number of cliffs" carried no scope at all
   and sat one line from "Where the road collapses — … between poverty and
   twice poverty" and "Cliffs on the road out of poverty". The reader filed
   them as the same measure, then found they diverge by a factor of 37
   (Maryland: $913 on the road, $33,587 anywhere). **This is the finding this
   pass had already been handed and half-answered.** The `<optgroup>` labels
   were supposed to carry the scope for all nine — and they do, while the menu
   is open. A *closed* select shows the option alone, which is where a reader
   meets it. Both options name their own window now, and the proof pins the
   four twins as a set, because the defect is the pair reading alike.
2. **B5 — the method contradicted the measure, and the data.** The method said
   deferred cliffs are *"lifted out of every other figure here"*; the measure
   said *"of the cliffs counted"*. `core/src/evaluate.ts` settles it —
   `deferred` are the **same `Cliff` objects** as `analysis.cliffs`, because
   deferral is a label and not an exclusion (owner, 2026-09-17). The method
   line predates that ruling. A reader who believed it would have written that
   Ohio has eleven cliffs rather than ten.
3. **N4, raised to a fix — a figure typed into copy, true of one household in
   eleven.** *"that wall sits above the median family's earnings in 39 states
   of 50"* is right for a single parent of two, and reads 3 of 50 for a
   two-earner couple with the same children. It is now counted per household
   off the positions the table already prints. On a page whose discipline is
   that no figure is typed, this was one.
4. **B4 — four column names pointing the wrong way.** "Where the road
   collapses" held money and "Road's worst step" held a place; "Cliffs on the
   road" and "Cliffs" were the same word four columns apart with different
   numbers. The headers are **"Road's worst loss"** and **"Cliffs anywhere"**,
   so both pairs read loss-then-step. The measure titles are untouched: the
   table's column words are the table's, and this was the cheap half of the
   standing S8.
5. **B6 — a leap the map hid.** Maryland read *"past the axis"* on the tile
   and *"≥ $53,000"* in the ranked strip and the table: the map was the one
   place on the page hiding a figure the rest of it would print. The tile says
   its floor now.
6. **B8 — a substituted price with no mark on the map.** New Mexico is the
   best state on the map, is what sets the top of the colour scale for all 51,
   and is one of three priced from a median rather than its own county — while
   child care is what ends most of these cliffs. The footing was a click away
   in the readout (the last read's B3). It is on the tile now, in the same
   words the table's Figures cell uses.
7. **N2 — two dates for one instant.** Every line said "run of Sep 16, 2026"
   and the download was named `…-2026-09-17.csv`: the filename took the UTC
   day while the page prints the reader's. The reader did not know which to
   footnote. One instant, one day, the reader's.

Each of the seven gained a check, and the proof went from 277 to **289**.

### The two B findings that are the owner's, not this pass's

**B1 — the diverging ramp's lightness collapse. This is the most serious
thing in the report and it is not fixed here.** Measured by the reader off the
rendered page: the darkest loss swatch is L\* **19.7**, the darkest keep
swatch L\* **19.6** — a difference of 0.1. Sign is carried by hue alone.
Strip the hue and Wisconsin (the worst state in the country) and New Mexico
(the best) are one indistinguishable near-black; Colorado sits directly above
New Mexico in the cartogram, worst-but-two on top of best, same darkness. A
newspaper that runs this map in greyscale prints a meaningless graphic, and a
reader applying the near-universal *dark means severe* convention will file
that Texas and Tennessee are among the worst states in America.

To its credit the adjacent worry came back clean: under a deuteranopia
simulation the plum and the tan separate into blue and olive, exactly as
`charts.md` § the diverging ramp rule 5 says they do. **The hue pair is well
chosen. The lightness is the problem, and it is not a colour-vision problem —
it hits everyone.**

Why this pass did not change it:

- It is `charts.md` § the diverging ramp as written, validated and **already
  corrected twice in one day** (the one-shared-width draft, then the
  equal-classes draft that flattened the losing side). "Lightest against the
  hinge, deepest at each end" is the standard diverging form and the rule
  argues for it explicitly.
- The fix is a real trade-off, not a bug: making lightness monotone from worst
  to best means the keep arm gives up the resolution that correction S6 was
  fought for. Both properties are worth having and only one can be had.
- Nothing in the rule addresses greyscale or the dark-means-severe convention,
  so this is a gap the rule never considered rather than a rule being broken —
  which is a decision to take deliberately, with the owner, and not a third
  unilateral re-cut at the end of a long pass.

What this pass did do is make the problem visible: the map is now the page, so
a defect that was survivable in a 380px card beside a list is the first thing
a reader sees. The reader's greyscale render is the evidence to decide on.

**B7 — the phone's tiles are 31 × 31 px and a mis-tap silently selects a
neighbour.** A standing, documented trade (`charts.md` § 2, WCAG 2.5.8's
equivalent-target exception: twelve 44px tiles will not fit a phone, and the
ranked row and the table row are the full-size controls). What this pass
changed for the better is the confirmation: on a phone the readout now lands
**fully visible under the map**, headed by the state's name in bold, so a
mis-tap announces itself in the same screen instead of 1,200px down. The
reader confirmed that placement is better than the desktop's. The tile size
itself is unchanged and still wants an owner decision.

## What is left, and why

- **The deepest keep-ramp step is as dark as the deepest loss step.** On a map
  that is now the whole page, the best states (Texas, New Mexico, Louisiana)
  are among the darkest tiles, and the system's own reading elsewhere is that
  depth is severity. This is `charts.md` § the diverging ramp as written and
  validated — hue is the sign, depth is distance from zero on *that* arm, and
  the pair survives a dichromat simulation at ΔE ≥ 38 while the alternatives
  collapse. It was more defensible when the map was a 380px card beside a
  list. Raised for the owner rather than changed under a validated palette.
- **`weight.mjs` has two defects this page exposed, and neither is fixed
  here.** The script is the shared measuring stick, the caseworker pass is
  running against it right now, and a change would move the citizen table's
  numbers as well as this one's; both are one line, and both are written down
  rather than made.
  1. **It prints −11 words** — the `<option>` subtraction above. Fix: skip the
     options the walker skipped (`for (const o of sel.options) if
     (o.getClientRects().length) html -= …`), or subtract nothing and add the
     selected option. Recorded in `inventory.md` § The page is its picture, and
     `e2e/places.spec.ts` asserts the zero-rect premise so the correction
     cannot quietly stop being needed.
  2. **It takes twelve minutes on one page.** The readiness wait is
     `page.locator("svg path, table").first().waitFor(…, 180_000)`, and this
     page has no `svg path` and its only `<table>` is inside a closed
     `<details>`, so every one of the four measurements waits out its full
     timeout before measuring — correctly, but three minutes at a time. Fix:
     wait for the first `<figure>` to have a box, which is what the script is
     really waiting for. The numbers are unaffected; the patience is not.
- **S8's other half, the measure titles.** The *table's* column words are
  fixed (above); the measure titled "Where the road collapses" still names a
  dollar figure, and that title is also the sort control's words, the figure's
  group name and part of the readout's sentence. Moving it is a deliberate
  change, not a tail-end one.
- **The reader's own remaining list**, all of it recorded in its report below
  and none of it this pass's to settle: the CSV will happily chart a `leap`
  the page forbids charting unless you read the `leap_is_lower_bound` column
  three positions away (S5); "CCDF" is never expanded (N3); the thirteen
  states that collapse at exactly $54,000 do so because $54,000 is the road's
  last step, which is 889 words deep (S1); the underline on the answer
  sentence's one keyed figure reads as a link and is not (S2); and **the best
  graphic on the page — the ranked bar chart — is the third thing inside a
  disclosure named like a data dump** (S7). That last one is worth the owner's
  attention: this pass put the strip there deliberately, because fifty-one
  ranked rows are two hundred words, and a fresh reader still called it "by
  far the best graphic on the page … it does everything the map fails at."
- **Connecticut's source block has a hole in it** (the reader's B9):
  `coverage.CT.vintages.county.name` is empty, uniquely among 51, so the page
  renders "County: the state's most populous" with no county — correctly, from
  what it was given. A data finding for `core`/the pipeline, not a page one.
  The self-contradicting half *was* the page's and is fixed: "a state median
  county price stands in" for a state the same sentence says has no county
  price now reads "a median of the state's other counties".
- **S1, CCDF on while Head Start, vouchers and LIHEAP are off.** A methodology
  question about the sweep, not a page one, and the same on all three
  surfaces. Still an owner decision.
- **No byline, no contact.** True, and out of any page's scope.

## The pictures

`design/audit/app/journalist-*` — the audit's set re-taken from this build at
both widths, light and dark, with a `-screen1` render at each width: what a
reader actually meets, which a full-page render cannot show.
`journalist-letter-from-dark.pdf` is the page as paper, printed from OS dark.

---

# The cold reader's report, unedited

The read was taken on the build of commit `c8ebb32`, before the seven fixes
above; its screenshots are named against its own working directory and are not
carried into the repository. Unedited.

I worked only from the rendered page in a dedicated, freshly-launched Chromium (new context per run, cookies cleared, storage cleared on init). After the desk's warning about a stale build I re-took the first screen with a cache-bypassed hard reload (`00-freshness-fold.png`) and compared it to my original (`01-desktop-fold.png`): identical headline, identical single-column layout, identical 1377px scroll height. Everything below is the current build. I read no repository file.

---

## 1. First ten seconds (above the fold)

`01-desktop-fold.png`, 1280×900, before scrolling or clicking.

**What I saw, in order:** the wordmark "HotGap", an "Español" link, a "Download the numbers (CSV)" button top right. Then a 31-word headline in large type: *"In **26** of the 50 states and the District of Columbia, a single parent of two children climbing from the poverty line to twice it ends up poorer than they started."* Then a tile-grid map of the 51 jurisdictions. Then a six-swatch colour ramp labelled −105¢, −79¢, −52¢, −26¢, 0¢, +15¢, +30¢ with two word-keys: "loses 105¢ of each extra dollar" and "keeps 30¢ of each extra dollar". At the very bottom edge: "Select a state to read its numbers."

**What I believed:** a state-by-state map of what a raise is worth to a poor single-parent family, in cents kept per extra dollar. I was right. The headline does the work in about three seconds — it names the household, the income range and the finding in one sentence. That is genuinely good, and rare.

**What I did not understand in ten seconds, and should have:**

- **The colour.** Six swatches, two of them labelled. Both ends of the ramp are near-black. I could not tell, at a glance, whether a dark tile was very good or very bad. Washington, North Dakota, Texas, Tennessee, New Mexico, Louisiana, Mississippi and South Carolina are dark; so are Wisconsin, Colorado and New Jersey. The first group are the best states in the country and the second are the worst. See §4 and Finding B1.
- **The controls.** At 1280×900 there are none visible. The fold cuts immediately below "Select a state to read its numbers." I did not know the household or the measure were adjustable until I scrolled. The headline saves this — it tells you the household — but I spent ten seconds thinking this was a static graphic.
- **"26" is underlined in purple** (`43-the-26.png`). I read that as a link and clicked it. It is a `<span>`, not a link; nothing happens. Finding S2.

---

## 2. The controls

Below the map, below the fold on desktop: **Household** and **Measure**, two native `<select>`s side by side (`02-desktop-full.png`). A third, **Table order**, lives inside the collapsed "Every state, every measure". Below them: *"Estimates only. PolicyEngine 2026 rules, run of Sep 16, 2026."* Then four collapsed disclosures: "How to read this map", "Every state, every measure", "How these numbers were made", "Where these numbers come from".

**Household** — eleven options, all comprehensible with no glossary: "1 adult, 2 children (3 and 7)", "2 adults, one working, 3 children (1, 4, 9)", and so on. Ages in parentheses. Nothing to explain. This control is excellent.

**Measure** — nine options, and this is where the page breaks down. The list is written in two incompatible registers:

> Keep rate — of each extra dollar earned from poverty to twice poverty, the cents the household keeps (¢)
> Cliffs on the road out of poverty — the cliffs a household meets between poverty and twice poverty
> Where the road collapses — the largest single loss between poverty and twice poverty ($)
> **Largest one-step loss ($)**
> Total width of the danger zones — every stretch where more pay leaves the household no better off, added together ($)
> The leap — the raise needed to clear the worst danger zone ($)
> Safe exit — earnings above which no danger zone remains ($)
> **Number of cliffs**
> Deferred cliffs — of the cliffs counted, those that land at a later renewal

Seven options carry a plain-language gloss after an em dash. Two — the two I've bolded — carry nothing. Those two are precisely the ones that need it, because each is a near-homonym of a glossed option above it and differs from it only in the measurement window, which is never stated. See Findings B2 and B3.

"Deferred cliffs — of the cliffs counted" is circular: *which* count? And "renewal" is unexplained jargon for benefit recertification.

**The labels do not match what the controls do** in one further respect: the Measure select is visually truncated. On desktop it reads "Keep rate — of each extra dollar earned from poverty to twice poverty, the" (`02-desktop-full.png`); on the phone, "Keep rate — of each extra dollar earned from po" (`30-phone-fold.png`). The gloss the designers wrote is the part that gets cut.

**Credit where due:** the headline is measure-aware and household-aware, and every variant is a real sentence:

| control | headline |
|---|---|
| 1 adult, no children | "Nowhere in the 50 states and the District of Columbia does a childless single adult end the climb from poverty to twice poverty poorer than they started; the state that comes closest is Hawaii, which keeps 27¢ of each extra dollar." |
| 2 adults, one working, 2 children | "In **1** of the 50 states and the District of Columbia…" |
| 2 adults, both working, 2 children | "In **20** of the 50 states…" |
| measure = The leap | "It takes a raise of $76,000 in one move to clear the worst danger zone in Wisconsin — the largest leap on the map." |

Keyboard navigation works as documented: arrow keys move between tiles (ArrowRight from OH focused PA), Enter selects. The URL is a real deep link: `?household=single-2&measure=keepRate&sort=state&state=OH`.

---

## 3. Your state — and the other four

**Ohio.** I clicked the OH tile. The tile gained a black outline — clearly visible (`04-oh-after-click-viewport.png`). **The page did not scroll** (scrollY 0 before and after), and the answer appears exactly at the fold: I could read two lines and the third was sliced through the word "family". The payoff for the click is half off-screen. I noticed, but only because I was looking for it.

Scrolled down, Ohio reads:

> **Ohio — loses 42¢ of each extra dollar** climbing out of poverty. The road collapses at **$38,000**, where CCDF child care subsidy ends and the family loses **$12,062** in one step. 45 in 100 families like this earn less than that.
> That collapse is also the largest single loss anywhere on the curve.

That is a publishable paragraph as written. "CCDF" is not expanded anywhere on the page.

**The other four:**

| | keep rate | road collapses at | loss | families below | second figure |
|---|---|---|---|---|---|
| Wisconsin | **loses 105¢** (worst) | $54,000, CCDF ends | $25,833 | 62 in 100 | same point |
| New Jersey | loses 94¢ | $54,000, CCDF ends | $26,206 | 56 in 100 | same point |
| Ohio | loses 42¢ | $38,000, CCDF ends | $12,062 | 45 in 100 | same point |
| Texas | keeps 16¢ | $43,000, SNAP ends | $1,091 | 54 in 100 | **largest anywhere: $13,938 at $77,000, CCDF** |
| New Mexico | **keeps 30¢** (best) | — | — | — | **"no cliff found"** |

I can write about four of them. New Mexico I would not write about, and here is why.

### Are two states' numbers on the same footing? No. Five separate ways.

This is the most important thing on the page, and the page is honest about all of it — but only three clicks deep.

**1. New Mexico's number is built on a substituted price.** Its own panel says:

> New Mexico — no cliff found: no $1,000 step of earnings on this household's curve cut net income by $200 or more, up to $150,000. **There is no county child-care price for New Mexico in the source database, so a national median price stands in — and child care is what ends at most of these cliffs.**

New Mexico is the single best state on the map, it has no cliff at all, and the program that creates almost every cliff elsewhere is priced for it from a national median. It is also the state that **defines the top of the colour scale** — "How to read this map" says the bins run "from −105¢ to +30¢ over the 51 states with a comparable figure," and +30¢ *is* New Mexico. A state with substituted data is anchoring the scale for all 51. Nothing on the map marks it: the tile is plain dark brown and the hover title reads only "New Mexico: keeps 30¢ of each extra dollar."

Indiana (national median) and Connecticut (state median) are the other two substituted states — 3 of 51.

**2. The child-care subsidy is computed two different ways.** I opened "Where <state>'s numbers come from" for all 51. Each carries one of two lines:

- "Child-care subsidy: **inside PolicyEngine's net income**" — 23 states, including **Ohio** and Maryland
- "Child-care subsidy: **added by HotGap**" — 28 states, including **Texas, New Jersey, Wisconsin and New Mexico**

For the program the page itself says "ends at most of these cliffs," the country is split 23/28 across two code paths. The Ohio–Wisconsin comparison a reporter most wants to make is a comparison across that split.

**3. 36 of 51 states carry hand corrections on top of the model.** Counted from each state's "Corrections applied in X (n)" line: 15 states have zero (Ohio among them), 22 have one, 9 have two, 5 have three. Texas has three, including *"HotGap sends the state's own published parent Medicaid income limit … because PolicyEngine's figure is five years out of date."*

**4. The child-care price vintage varies by fourteen years.** All 51 use "carried to 2026 dollars by the BLS Employment Cost Index", but the study year differs: 2018 for 43 states, 2017 (IA, FL), 2016 (MT, NV, LA, GA), 2015 (CO), and **2012 for the District of Columbia**. Nothing on the map, in the table or in the headline surfaces this.

**5. Michigan and the two non-contiguous states are special cases**, both disclosed:
- Michigan is the only jurisdiction where energy assistance is counted: *"Paid as the Home Heating Credit, which is counted in every figure for Michigan."*
- *"Alaska and Hawaii marketplace subsidies are computed upstream against the 48-state poverty guideline rather than their own higher ones … so both states' premium-driven figures are understated."*

**Connecticut is broken.** Its source line reads *"County: **the state's most populous**, Vintage 2024"* — with no county name, where every other state names one (Franklin, Harris, Bergen, Milwaukee, Bernalillo, Wayne, Montgomery). The CSV confirms `county_name` is empty for CT and only CT. And its caveat contradicts itself: *"There is **no county child-care price for Connecticut** in the source database, so **a state median county price** stands in"* — a median across counties that the same sentence says don't exist. I could not resolve this from the page.

---

## 4. The numbers

**The sentence I could file today:**

> In Ohio, a single parent of two who climbs from the poverty line to twice it ends up 42 cents poorer for every extra dollar earned, and the worst single step comes at $38,000 a year, where the state's child-care subsidy ends and a $1,000 raise costs the family $12,062 — a point 45 in every 100 Ohio families like this one currently earn less than.

Where each number came from:

| number | source on the page |
|---|---|
| 42 cents | OH tile hover title *and* the Ohio panel; table column "Keep rate" reads "loses 42¢"; CSV `keep_rate_cents = -42` |
| $38,000 | Ohio panel, "The road collapses at $38,000"; table "Road's worst step" = "$38,000 → $39,000"; CSV `road_worst_at = 38000` |
| child-care subsidy ends | Ohio panel, "where CCDF child care subsidy ends"; CSV `road_worst_programs = CCDF child care subsidy` |
| $12,062 | Ohio panel; table "Where the road collapses"; CSV `road_worst_drop = 12062` |
| 45 in 100 | Ohio panel; table, as a small grey "45 in 100" under the step; CSV `road_worst_position = 45` |
| poverty line to twice it | "How these numbers were made": "$26,650 to $53,300 for a family of three at 2026 rules" |

Every one of those triangulates across three places and agrees.

**Figures I cannot explain or cannot confirm from the page:**

- **"45 in 100 families like this earn less than that."** The method says it is ACS 2020–2024 5-year PUMS and ACS 2024 1-year PUMS "grown to 2026 dollars", cross-sectional, "never one family's chance of reaching that pay." What it does not say is the geography or the definition of "families like this" — Ohio households of one adult and two children? At any income? I cannot check the denominator.
- **Why 13 of the lower-48 states collapse at exactly $54,000** (WA, MN, WI, NY, MA, OR, PA, NJ, CO, MD, DE, NC, DC). The method explains it — the road tops out at $53,300 and *"Its top carries one $1,000 step of allowance"* — so $54,000 is the window's last step. I worked that out only after reading 889 words in the third disclosure. From the map alone, thirteen states appearing to collapse at the identical dollar looks like a bug.
- **Maryland's leap.** The map says "past the axis." The table says "≥ $53,000." The CSV says `53000`. Three answers on one page (Finding B6).
- **Whether the child-care price inflation is sound.** A 2018 (or 2012) price carried to 2026 by the Employment Cost Index is an assumption I cannot test from the page, and child-care prices are the hinge of the entire dataset.
- **The run date.** Every visible line says "run of Sep 16, 2026." The file it hands me is named `hotgap-1-adult-2-children-3-and-7-2026-09-17.csv` and carries `sweep_generated = 2026-09-17T01:29:56.037Z`. I do not know which date to print.

---

## 5. The tables

"Every state, every measure" opens with something I did not expect: **a ranked horizontal bar chart** (`20-table-head.png`), "Ranked: Keep rate on the road out of poverty, most regressive first", bars running left from zero in purple for losses and right in orange for gains, value written at the right, ranks with ties handled correctly (14. NC, 14. OH, 16. ID). **This is by far the best graphic on the page** — it does everything the map fails at. It is three screens down, inside a collapsed section named like a data dump. Ohio is 14th-worst of 51, tied with North Carolina.

Below it, a 13-column table (`21-table-ohio.png`) with a working sticky header.

**Columns that are not comprehensible:**

> State | Keep rate | Cliffs on the road | **Where the road collapses** | **Road's worst step** | **Largest one-step loss** | **Worst step** | Danger zones, total width | The leap | Safe exit | **Cliffs** | Deferred | **Figures**

- **"Where the road collapses" contains a dollar loss** ($12,062 for Ohio). **"Road's worst step" contains the where** ($38,000 → $39,000). The two are adjacent, both dollar-formatted, and the names point the wrong way round. Same trap again in "Largest one-step loss" ($) / "Worst step" (where).
- **"Cliffs on the road" and "Cliffs"** are the same word twice, four columns apart, with different numbers: Ohio 6 and 10.
- **"Figures"** carries three unrelated facts run together. New Mexico's cell: "complete child-care subsidy added by HotGap child-care price: national median price". The header word "Figures" describes only the first.
- **No header carries a `title` or `abbr`** — there is no hover glossary on the table, though the map tiles have one.

**Cells I could not interpret:**

- The small grey **"45 in 100"** under the step values. No column header mentions it. I only knew what it meant because I had already clicked a state and read the sentence. Anyone who opens the table first cannot decode it.
- **"past the axis"** (Maryland, New York, Safe exit). Nothing on the page at that point says what the axis is. The explanation exists — "How to read this map": *"Where a state's last danger zone runs off the top of the axis rather than closing, the safe exit is unknown … Those cells read past the axis here and must not be charted as a value"* — but it is in a different collapsed section.
- **"≥ $53,000"** — the ≥ is doing load-bearing work with no key.

**Two labels I could not reconcile:** "Where the road collapses" / "Largest one-step loss", and "Cliffs on the road" / "Cliffs". Ohio makes it worse, not better: for Ohio all four columns pair up identically ($12,062 / $12,062 and the same step twice), so the table looks redundant until you reach a state where it isn't. Maryland is where it isn't: **$913 against $33,587**, a factor of 37.

**Layout damage:** states with footing notes get a "Figures" cell that stacks four lines and blows the row height to roughly four times its neighbours. New Mexico's row is the worst — seven columns reading "none" across a band of white space 330px tall. The best-performing state in the country reads visually as a hole in the data.

---

## 6. Getting the data out

"Download the numbers (CSV)" produced `hotgap-1-adult-2-children-3-and-7-2026-09-17.csv` — 51 rows, 43 columns, 28.6 KB, UTF-8 with BOM. Filename carries the household. Good.

**Does it match what I saw?** Yes, exactly, for every state and field I checked (OH, TX, NJ, WI, NM, MD, CT, MI, IN, DC): `keep_rate_cents`, `road_cliff_count`, `road_worst_drop`, `road_worst_at`, `biggest_one_step_loss`, `biggest_loss_at`, `cliff_count`, `deferred_cliff_count`, `leap`, `safe_exit` all agree with the tiles, panels and table.

**Better than that:** the caveats travel. The CSV carries `childcare_subsidy_footing`, `corrections_applied`, `comparable`, `figures`, `unmodeled_programs`, `county_name`, `county_fips`, `childcare_price_vintage`, `rent_vintage`, `liheap_limit`, `liheap_served_share`, `model_version` and `source`. That is how I was able to count the 23/28 split and the 2012 price. Very few data pages do this.

**Is it usable for a chart? Not safely, as handed to you.** Maryland's row is `leap=53000, leap_is_lower_bound=true, safe_exit=<empty>`. The page's own instruction is that those cells *"must not be charted as a value."* The CSV prints `53000` as an ordinary number; the only thing stopping you is a separate boolean column three positions away. The page does warn — "the flags say which figures are floors or lower bounds" — in the same sentence that lists 43 column names. Anyone who does `df.plot(y='leap')` will chart a number the page forbids, and Maryland will look like an ordinary state.

Two smaller snags: empty cells are overloaded (*"Empty dollar cells are a state with no cliff or a safe exit past the axis"* — two different meanings, one blank), and the "Cite as" line hands you `http://localhost:8808/places?...` as the citation URL.

---

## 7. The phone (390×844)

`30-phone-fold.png`, `32-phone-after-tap.png`.

**The phone is better than the desktop.** No horizontal overflow. Page height 1227px. Above the fold you get: headline, the entire map, the full legend with the two word-keys stacked and readable, "Select a state to read its numbers", **and both controls**. The desktop hides the controls; the phone shows them.

**Task 1 on the phone:** better. The legend's stacked word-keys are much clearer than the desktop's side-by-side arrangement.

**Task 3 on the phone:** the answer is better, the tapping is worse.
- After tapping OH the panel lands at y 625–788 in an 844px viewport — **fully visible without scrolling**, which is the opposite of the desktop, where it is clipped at the fold. The full Ohio sentence with $38,000 and $12,062 bolded is readable in one screen (`32-phone-after-tap.png`).
- **But the tiles are 31×31 px with no gaps between them.** That is well under the 44px minimum. Ohio is surrounded on all four sides by Indiana, Pennsylvania, Michigan and West Virginia. A mis-tap silently loads a different state's numbers 300px below the thumb, with only a thin black outline on a small square to tell you. I would not trust a reader to reliably hit their own state.

**Task 4 on the phone:** all the numbers I needed were present and correct. The Measure label is worse — truncated at "Keep rate — of each extra dollar earned from po", so a phone reader never learns what the measure is.

The table inside "Every state, every measure" is 1533px wide in a 358px scroller — it scrolls sideways within its own box without breaking the page, which is the right pattern, but 13 columns at 4.3× viewport width is a long drag.

---

## 8. The story

The story is not "benefits cliffs exist." It is **who the cliff is aimed at**, and the page's own household control proves it in four clicks:

| household | states where the climb leaves them poorer |
|---|---|
| 1 adult, no children | **0** |
| 2 adults, one working, 2 children | **1** |
| 1 adult, 1 child | 20 |
| 2 adults, both working, 2 children | 20 |
| 1 adult, 3 children | 21 |
| **1 adult, 2 children** | **26** |

A one-earner couple with two children is punished in one state. A single parent with the same two children is punished in twenty-six. The difference between those two rows is child care — and the page's own data says so: CCDF is the program that ends at the worst step in Ohio, Wisconsin, New Jersey, Colorado, Oregon, Michigan, Indiana and most of the rest. **The cliff is a child-care cliff, and it falls on whoever has to buy child care in order to work.** That is the national story and Ohio sits squarely in it, 14th-worst of 51.

### The lede I would file

> Climb out of poverty in Ohio and the state will meet you on the way up.
>
> A single parent raising two young children in Franklin County who works her way from the poverty line to twice it — from about $26,650 to about $53,300 — ends that climb poorer than she began it, losing 42 cents of every extra dollar she earns to taxes and vanishing benefits. The worst of it arrives in a single step. At $38,000 a year her child-care subsidy ends, and a $1,000 raise costs her family $12,062 at once.
>
> Forty-five in every 100 Ohio families like hers already earn less than $38,000. The cliff is not somewhere off in the distance. It is directly in front of most of them.

### What my editor would ask that I cannot answer, and who I would call

1. **"Does Ohio actually cut it off like that, or does it taper?"** The model treats the CCDF exit as a wall at $38,000. Many states run a transitional or graduated phase-out. I cannot test this from the page. → **Ohio Department of Job and Family Services**, child-care policy desk.
2. **"How many Ohio families actually have the subsidy?"** This is the page's own unresolved contradiction. It excludes Head Start, housing vouchers and LIHEAP on the explicit grounds that *"they are rationed, and assuming a family holds one inflates its numbers"* — and then leaves CCDF on, the program that drives nearly every cliff it reports, and which is also rationed. The page states it flatly: *"The CCDF child care subsidy is on for this run and off for a household's own lookup."* If Ohio has a waiting list, the cliff described here is one most poor families never reach, because they never got on the ledge. → **ODJFS** for caseload and waiting list; **Groundwork Ohio** or a county JFS caseworker.
3. **"Is $12,062 a real 2026 child-care bill?"** It rests on a **2018** county price inflated by the BLS Employment Cost Index. Child-care prices outran general compensation badly after 2021. → the **DOL National Database of Childcare Prices** team; a labour economist; an Ohio child-care provider.
4. **"Is Columbus Ohio?"** Every figure is Franklin County — HUD Fair Market Rent and a Franklin County child-care price. Rural Ohio has different rents and different care costs. → a caseworker in a rural county; Ohio's Office of Family Assistance.
5. **"Why does Wisconsin look twice as bad as Ohio?"** Partly real, partly footing: Wisconsin's child-care subsidy is "added by HotGap," Ohio's comes from inside PolicyEngine. I would not run a two-state comparison without asking. → **HotGap**, and **PolicyEngine** on issues #9405/#9503.
6. **"Has anyone talked to a family at $38,000?"** Nothing on this page is a person. → a single parent in Franklin County at that income; a benefits navigator.

---

## Findings

### B — a cold reader draws a wrong conclusion, or cannot do one of the eight tasks

**B1. On the map, darkness means "extreme", not "bad" — so the best and worst states are the same colour value.** Measured from the rendered page: the darkest negative swatch is `rgb(77,30,67)`, **L\* = 19.7**; the darkest positive is `rgb(73,39,9)`, **L\* = 19.6**. A lightness difference of **0.10**. The light pair is the same story: `rgb(209,159,194)` L\* 71.0 against `rgb(215,163,118)` L\* 70.8, difference 0.20. Sign is carried by hue alone; lightness carries only magnitude. Strip the hue and the map says nothing (`09-map-grayscale.png`): Wisconsin (loses 105¢, worst in the nation), Colorado (loses 97¢), Texas (keeps 16¢) and New Mexico (keeps 30¢, best in the nation) are one indistinguishable near-black. Colorado sits **directly above** New Mexico in the cartogram (`06-co-nm-pair.png`) — worst-but-two on top of best, same darkness. Any newspaper that runs this map in black and white prints a meaningless graphic, and a reader who glances at it in colour and applies the universal "dark = severe" convention will file that Texas and Tennessee are among the worst states in America.
*To the page's credit, I tested the obvious adjacent worry and it came back clean:* under a deuteranopia simulation (`10-map-deuteranopia.png`) purple and brown separate cleanly into blue and olive. The hue pair is well chosen. The lightness collapse is the problem, and it is not a colour-blindness problem — it hits everyone.

**B2. "Where the road collapses" and "Largest one-step loss ($)" are different measures with the same-sounding names, and only one says so.** The first is glossed "the largest single loss between poverty and twice poverty ($)". The second carries **no gloss and no window** and is in fact measured over the whole curve to $150,000. They diverge enormously: **Maryland $913 against $33,587**, Connecticut $2,395 against $18,701, Texas $1,091 against $13,938 — while for Ohio, Wisconsin, New Jersey and Indiana they are identical, which teaches the reader the wrong lesson. Both render as plain dollar amounts on the map and in the table. A reporter can file "Maryland's road collapses at $913" and "Maryland's biggest cliff is $33,587" from the same page with no signal that these describe different stretches of road.

**B3. "Cliffs on the road out of poverty" and "Number of cliffs" — the same defect.** Again the second is unglossed. Ohio: 6 against 10. Texas: 2 against 5. Connecticut: 4 against 8. The two measures do not even agree on who is worst: the on-road headline says *"Indiana puts 7 cliffs on the road out of poverty, more than anywhere else"*; the whole-curve headline says *"Vermont's curve carries 19 cliffs for this household, more than any other state."* Two different states named "worst for cliffs" on the same page, one dropdown apart.

**B4. In the table, the column named for a place contains money, and the column next to it contains the place.** "Where the road collapses" = $12,062. "Road's worst step" = $38,000 → $39,000. Repeated for "Largest one-step loss" / "Worst step". Four adjacent dollar-formatted columns whose names point the wrong way, with no `title` or `abbr` on any header to correct the reading (`21-table-ohio.png`).

**B5. The Deferred-cliffs label contradicts the method text.** The control says *"Deferred cliffs — **of the cliffs counted**, those that land at a later renewal"* — i.e. a subset. "How these numbers were made" says they are *"counted in the deferred column and are **lifted out of every other figure here**"* — i.e. disjoint. Ohio shows Cliffs = 10 and Deferred = 1. From the label I would write "one of Ohio's ten cliffs is deferred." Per the method that is wrong; Ohio has eleven, ten of them immediate. Nothing at the point of use resolves it, and "renewal" is never expanded.

**B6. Maryland's leap reads three different ways in three places on the same page.** Map tile: "Maryland: past the axis." Table cell: "≥ $53,000." CSV: `leap = 53000`. The map is the one that hides a number the page is elsewhere willing to state, and "How to read this map" explicitly anticipates the case — *"a state can show an exact leap and no safe exit"* — which is exactly Maryland, and exactly what the map fails to do.

**B7. On the phone, the map is not reliably tappable.** Tiles are **31 × 31 px** with no gutters (`30-phone-fold.png`). The recommended minimum is 44px. Ohio is bounded on four sides by other states. A mis-tap produces no error — it silently selects a neighbour and writes that state's numbers 300px below the thumb. Task 3 on a phone is a coin-flip for anyone with an average thumb.

**B8. New Mexico is the best state in the country on substituted data, and the map says nothing.** Its tile is plain dark brown; its hover title is *"New Mexico: keeps 30¢ of each extra dollar"* with no caveat. Only on click does the page say *"There is no county child-care price for New Mexico in the source database, so a national median price stands in — and child care is what ends at most of these cliffs."* Worse, +30¢ **is the top of the colour scale** for all 51 states ("Bins … from −105¢ to +30¢ over the 51 states with a comparable figure"). A substituted-data state is setting the scale, is counted in the 51, and carries no visual mark. Indiana and Connecticut are in the same position. The page has a hatch pattern for exactly this purpose — "figures incomplete" — and it is never applied to any state at any household.

**B9. Connecticut's source block has a hole in it.** *"County: the state's most populous, Vintage 2024"* — the county name is simply missing, uniquely among 51 (confirmed: `county_name` is empty for CT alone in the CSV). And the caveat contradicts itself: *"There is no county child-care price for Connecticut in the source database, so a state median county price stands in."* A median of county prices, in a state the same sentence says has none. I could not determine what price Connecticut actually used.

### S — had to guess, guessed right eventually

**S1. The measurement window is invisible until the third disclosure.** Thirteen lower-48 states "collapse" at exactly $54,000 (WA, MN, WI, NY, MA, OR, PA, NJ, CO, MD, DE, NC, DC). From the map that looks like a defect. The explanation — the road is $26,650–$53,300 and *"Its top carries one $1,000 step of allowance"* — is 889 words deep in "How these numbers were made." I guessed it was the window edge, then confirmed. A reader who doesn't guess concludes the data is broken.

**S2. "26" looks like a link and is not.** `43-the-26.png` shows a heavy purple rule under the number, the page's link grammar. It is `<span class="hg-amt hg-amt--cliff">`, with `text-decoration: none`, `cursor: auto`, no href, no title. Clicking it does nothing — no scroll, no URL change. It is the most important number on the page and the only underlined one; I clicked it expecting the list of 26 states.

**S3. "past the axis" is unexplained where it appears.** It shows on map tiles and in table cells. The explanation is in a different collapsed section. On a map, "axis" is doubly confusing — there is no axis on screen.

**S4. "45 in 100" in the table has no header.** It renders as a small grey line inside the "Road's worst step" cell. I could only decode it because I'd clicked a state first and read the full sentence. A reader who opens the table before clicking a state cannot.

**S5. The CSV will chart the values the page forbids.** `leap = 53000` for Maryland is an ordinary-looking number; the warning lives in a separate `leap_is_lower_bound` column and in one clause of a 130-word paragraph listing 43 column names. Empty cells are overloaded two ways ("a state with no cliff **or** a safe exit past the axis").

**S6. On desktop, the click's payoff lands on the fold.** Clicking Ohio does not scroll (scrollY 0 → 0). The answer appears at y≈867 in a 900px viewport: two lines readable, the third sliced through mid-sentence (`04-oh-after-click-viewport.png`). The page has a "Skip to the answer" link, which suggests the team knew — but it is keyboard-only.

**S7. The best graphic is hidden.** The ranked bar chart (`20-table-head.png`) is clearer than the map in every respect and is buried below the fold inside a `<details>` named "Every state, every measure" — a name that promises a data dump, not a chart.

### N — friction

- **N1.** The Measure select truncates its own gloss: desktop "…from poverty to twice poverty, the"; phone "…earned from po". The explanatory half is what gets cut.
- **N2.** Date mismatch: every visible line says "run of Sep 16, 2026"; the download is named `…2026-09-17.csv` and carries `sweep_generated = 2026-09-17T01:29:56.037Z`.
- **N3.** "CCDF" is never expanded. Neither is "renewal" in the deferred-cliffs sense.
- **N4.** Denominator drift: the page says "the 50 states and the District of Columbia" everywhere, then "that wall sits above the median family's earnings in **39 states of 50**."
- **N5.** Three vocabularies for the same null: "none" (table), "no cliff found" (whole-curve measures), "no cliff on the road out of poverty" (windowed measures).
- **N6.** New Mexico's table row is four times taller than its neighbours, seven cells reading "none" across a wide white band — the top-performing state reads as missing data.
- **N7.** The hatch pattern and its legend entry ("figures incomplete") are documented at length but occur for no state at any of the eleven households — I checked all eleven.
- **N8.** "Cite as" hands you `http://localhost:8808/places?...`.
- **N9.** The 13-column table is 1533px wide on a 358px phone — correctly contained in its own scroller, but a long sideways drag.
- **N10.** The table's absence of a footing note reads as "fine" rather than "the other footing" — only the 28 "added by HotGap" states are annotated, so the 23 default-footing states look unremarkable rather than different.

**Things that are genuinely good and should not be touched:** the headline rewrites itself per household and per measure and every variant is a real sentence; the state panel is filable prose; the per-state source block names the county, the corrections with upstream issue numbers, the LIHEAP limit and served share; the CSV carries every caveat as a column; keyboard navigation works as documented; the Spanish translation is real, not machine-shaped (`?lang=es-US`, "Ohio: pierde 42¢ de cada dólar extra"); the ranked chart handles ties correctly; and "How these numbers were made" is the most honest methods note I have read on a data page — including the sentence admitting its own biggest weakness, *"The CCDF child care subsidy is on for this run."*

---

## Is there too much to read?

**No — but the 889 words that matter most are in the wrong place.**

Measured from the rendered page: with everything in its default state the whole page is **394 words** of `innerText`, and a sighted reader sees fewer than that — perhaps 80, once you subtract the screen-reader-only map description and the unopened `<select>` option lists. The four disclosures are collapsed. The page is 1377px tall. That is a restrained, well-judged front door.

**What I actually read in the first pass:** the 31-word headline, the legend's two word-keys, "Select a state to read its numbers", and — after clicking — Ohio's 48-word panel. About 80 words. That was enough to file the lede in §8. Nothing was padded and nothing was repeated.

**What I skipped:** all four disclosure summaries. I did not open one until I had already drafted a sentence.

**What forced me back:** the labels. I had to open "How these numbers were made" — **889 words, the longest block on the page** — to answer four questions that the controls should have answered by themselves:

- what "Largest one-step loss" is measured over (B2)
- what "Number of cliffs" is measured over (B3)
- whether deferred cliffs are inside or outside the other counts (B5)
- why thirteen states collapse at the same dollar (S1)

And I had to open "How to read this map" (434 words) to learn what "past the axis" means (S3).

So the honest answer is: the page is not too long, it is **mis-layered**. Four em-dash glosses sitting in the dropdown — a window on "Largest one-step loss ($)", a window on "Number of cliffs", and "not counted in the other figures" on "Deferred cliffs" — would move perhaps thirty words from the bottom of the page to the top and retire three of my nine B findings. The one place a reader genuinely *should* have to read more — the child-care-subsidy footing that splits the country 23/28 — is the one thing the page never surfaces above the fold at all.

