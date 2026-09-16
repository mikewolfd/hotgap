# Design review — the citizen page, built — 2026-09-16

Scope: `app/index.html` + `app/src/citizen/` behind the `Result` seam, and the
shared editor `app/src/editor/` as this surface uses it (branch
`worktree-agent-a5efba10c53fcf8eb`, head `ed1e86d`, merged locally onto main
`3e9e544`), served through the project's own runner (`cd app && npx vite
build`, then `cd worker && npx wrangler dev --port 8794` against the hosted
engine on policyengine-us 2.6.2, and a second run with `--var
HOTGAP_PE_URL:https://127.0.0.1:9/…` for the archetype path) in Chromium
(Playwright 1.60) at 390×844 and 1280×900, light and dark through
`prefers-color-scheme`, print media emulation **and** a real Letter PDF
through `page.pdf()` read with `app/e2e/pdf.mjs`. States: the landing with no
answers; the proof household (San Francisco, kids 3 and 7, $30,000 a year:
`/?zip=94110&kids=3,7&pay=30000&unit=year`); a household with no cliff (Madison,
one adult, $40,000); a deferred cliff (the same San Francisco parent with one
child and Head Start on); one past its cliffs (San Francisco, $125,000); an
hourly household (Boston, one child, $18.50 an hour at 35 hours, Head Start
on); Massachusetts (TAFDC); Texas (the coverage gap); New Jersey (an
incomplete state); a monthly Coloradan ($3,000 a month); the archetype source;
a mark focused by `]` and opened by Enter; *Show the numbers* open; the
*Savings* dialog; the loading line; the failed evaluation (the Worker answering
503). The mockup `design/citizen.html` was served from the repo root and
rendered beside it. Screenshots, the PDFs and the measurement dumps are under
`design/review/citizen/` (`measurements.json`, `interactions.json`,
`archetype.json`, `mock-measurements.json`); the brief reviewed against is
`design/README.md`, `inventory.md`, `charts.md`, `tokens.css`, the audit
`AUDIT-2026-09-16.md`, the two sibling reviews, and the builder's reports in
its last eight commits.

Contrast figures were computed from the colours the browser painted with the
audit's WCAG 2.x relative-luminance formula; type, spacing, line lengths and
distances are computed styles and bounding boxes; every sentence quoted is the
page's own text read from the DOM. No console errors in any state at either
width; no horizontal scroll; the page's unit tests pass through the project's
runner (`npx vitest run app/src/citizen`: 47 tests); `npm run readability`:
*citizen copy corpus grade 2.14 (limit 5.9), 202 strings, worst 8.8 at
assumed.savings* (six one-to-three-word notes, none a failure) — the editor's
copy grades 6.11 with five failures, all carrying "disability" or "permanent
resident", as already known.

## Verdict

This is the mockup made real, and where the data touches the page it is
better than the mockup: nothing is typed (the source line reads policyengine-us
2.6.2 and the sweep date from the file on the archetype path, the rent and
child-care vintages from the coverage record, the state name from core), the
verdict catalog holds its shape across nine real households, every pay figure
on the hourly and monthly households is in the person's unit down to the
x-ticks ($20, $30, $40, $50 an hour; $2,000, $4,000 a month), the lift, the
ghost, the hollow dot and the *Waits* badge are all implemented and agree with
each other, the StepList prints one figure under the one convention with the
remainder cited ("Some goes on until $38,000: $413 of food help"), the table
twin's every *keep* is the plotted value, the marks are 44px controls that
open their rows in place and hand focus back, print from OS dark is light on
paper, and reduced motion is honoured through the tokens alone. The copy is
in the register the brief asked for and the gate confirms it. Of the
builder's deliberate departures, three are right: the incomplete-state
caution on this surface (the inventory tags it away from the citizen; the
sentence "A drop could be missing from this page" is the honest one), the
person-level programs listed per group, and the readout keeping its hint
until the first touch. Two are not, and they are the blockers. The household
the design's proudest rule exists for — a deferred loss at the person's own
pay — is invisible on the first screen: the sentence names a $600 drop while
$16,600 waits at $31,000, and the picture draws the waiting mark solid and
then puts the person's own diamond on top of it. And the crop rule the page
invented ("half the axis wide at least") spends the picture on the climb: on
six of the eight households with a drop in the picture the y-range is 11× to
390× the biggest drop in it (4.8× and 5.2× on the other two), the drops are
two to nine pixels tall, the caption says they are "easy to see", and on the
archetype path the crop stops $10,000 short of the biggest drop it exists to
show. Below those, six should-fixes, of which two belong to
the shared editor as this surface wears it (twenty-two chips above the answer
at desktop width, and paper that opens with them, carries no name and leaves
half its first page blank) and four are the page's own (label collisions on
three households, a plum rule with no meaning on a phone, chips that
contradict the assumed list on the archetype path, the caution three screens
down). None needs a design decision revisited; the crop and the mixed-cluster
rule need one written.

Counts: **2 B, 6 S, 12 N.**

---

## Blockers

### B1. A deferred loss at the person's own pay is invisible in the answer and in the picture

- **Where:** `app/src/citizen/verdict.ts:12–31` (the shape and slots come
  from `analysis.verdict` and `nextCliff`, both computed on the lifted curve;
  no deferred slot), `copy.ts:24–32` (the catalog, M2); `geometry.ts:52–64`
  (`clusterCliffs`: `cl.later = every cliff waits`), `chart.ts:193–215` (a
  cluster with one immediate cliff draws the solid `--loss-4` dot, no dashed
  stub, no *later*), `chart.ts:217–220` (the diamond is drawn after the marks,
  at the same x).
- **What I saw:** the San Francisco parent with a 3-year-old in Head Start at
  $30,000 (`review/citizen/headstart-390-light.png`, `-1280-`,
  `headstart-390-light-zoom.png`). The evaluation carries a deferred Head
  Start cliff at $30,000 → $31,000 of **$16,593** (`head_start_program_year`)
  and an immediate premium step at $31,000 → $32,000 of $634. The answer reads
  "You are paid $30,000 a year. You keep $51,229. Near $32,000, more pay can
  mean less money: past it you would keep about **$600** less a year. People
  call this a benefits cliff." The sub-line adds "$16,908 of this is free
  early learning. It is not cash." and never says it ends. On the chart the
  two cliffs are 3.8px apart, so they merge; because one of them is immediate
  the merged mark is a solid r6 dot with a count, and the SVG holds **no**
  `--surface`-filled circle, no dashed stub and no *later* word
  (`measurements.json` `headstart-390-light.circles`, `.svgTexts`) while the
  key beside it lists *A drop that waits* for a mark that is not there. The
  diamond is then drawn at `px(30000)`, 2–3px from the merged dot's centre
  (158.7 against 160.6 at 390; 565.7 against 569.1 at 1280) on the same y,
  so the dot and its "2" sit under the person's own marker. What remains of
  the $16,600 on the first screen is the ghost: a dashed line falling from
  the diamond that the caption, below the key, calls "the later change" —
  which nothing above has named. The first sentence that says Head Start
  ends is the third StepList row at about y=1,660 at 390 (two screens down); the
  callout that explains the program year is at y=2,440.
  The Boston hourly household shows the rule working when the deferred cliff
  stands alone (`hourly-390-light-chart.png`: hollow dot, dashed stub,
  *later*), so the loss is specific to a mixed cluster — and a mixed cluster
  at the person's own pay is exactly the case Head Start produces, because
  its program-year rule fires at the step the person is standing on.
- **Who it hurts:** the person whose question the page exists to answer.
  "Will I lose money if I earn more?" — yes, $17,200 a year, $16,600 of it at
  the end of the program year — is answered "$600".
- **Smallest fix:** three lines, all from data already on the page. (1) The
  answer-sub, which already carries "It happens again…", gets one sentence
  when a deferred cliff lies at or above current pay: the `waits.reasons`
  paragraph the callout already renders, followed by `steps.laterLoss`
  ("At $31,000 a year your kids stop being able to get free early learning.
  … Later, you would keep about $16,600 less a year."). (2) In
  `clusterCliffs`, a cluster that holds a deferred cliff keeps the *waits*
  channel: draw the solid dot for the immediate members and the dashed stub
  and *later* for the deferred one, or never merge a deferred cliff into an
  immediate one (the 10px rule was written for dots of one kind). (3) When
  the diamond's x is within a dot's radius of a mark, offset the diamond
  along the drop line (it already carries one) rather than over the dot. The
  verdict catalog itself needs the clause written down (TODO(system) 16).

### B2. The crop shows the climb, not the step: the y-range is 11× to 390× the drop and the caption says the drops are easy to see

- **Where:** `app/src/citizen/model.ts:102–117` (`windowFor`, line 110: `span
  = min(top, max(hi − lo + 30_000, top / 2))`, then a fixed third of the
  slack before and two thirds after), `geometry.ts:27–39` (`yRange`: the 2.5×
  floor, met trivially), `chart.ts:223` and `copy.ts:62` ("so the drops are
  easy to see", said whenever the floor is above $0 and any immediate mark
  exists).
- **What I saw:** the `top / 2` floor makes every window 75,000 wide
  (96,000 for the $125,000 earner) whatever the household's zone is:
  `measurements.json` `*.text.aria` and `.yratio`:

  | household | window | y-ticks | y-range ÷ biggest drop in it | "easy to see" |
  |---|---|---|---|---|
  | San Francisco $30,000 (proof) | $8k–$83k | $30k–$80k | **20.95** | yes |
  | Massachusetts $30,000 | $8k–$84k | $20k–$80k | 15.13 | yes |
  | New Jersey $30,000 | $7k–$83k | $20k–$80k | 41.07 | yes |
  | Texas $20,000 | $5k–$81k | $0–$80k | 83.69 | no (floor $0) |
  | Colorado $3,000 a month | $1,650–$7,900 a month | $0–$80k | **390** | no (floor $0) |
  | San Francisco $125,000 | $80k–$176k | $40k–$120k | 11.33 | yes |
  | archetype (engine dead) | $7k–$82k | $60k–$100k | 16.82 | yes |
  | Boston hourly, Head Start | $12.75–$57.75 an hour | $25k–$125k | 5.19 | yes |
  | Head Start, San Francisco | $5k–$81k | $20k–$100k | 4.82 | yes |

  On the proof household the sentence says "More pay does not add to that
  until you are paid $43,000" and the picture is a line rising from $36,000
  to $66,000 across the window with the household's zone a 58px band (20% of
  the plot at 390) inside which the three drops are 9, 2 and 3 pixels tall
  (`ca-390-light-chart.png`, `ca-1280-light-figure.png`; the mockup's own
  curve measured 3.93 because its drop was $25,449). The Texas and monthly
  pictures are a straight line with one dot (`tx-390-light-chart.png`,
  `monthly-390-light-chart.png`: "−$205" on an $80,000 axis). On the
  archetype path the biggest drop, $14,000 at $92,000, lies $10,000 past the
  window's right edge — the window is 75,000 wide and 45,000 of it is spent
  after a $37,000 exit, by the fixed two-thirds rule, and the caption then
  says the drop "is outside the picture" (`archetype-390-light-chart.png`,
  `archetype.json`). The brief's reason for a non-zero floor is that "a zero
  baseline flattens [the step] to nothing" (`charts.md` § Axis honesty); the
  built crop flattens it by the x-axis instead, and on three households
  starts the y-axis at $0 as well.
- **Who it hurts:** the person reading the picture second. It says "more pay
  means more money" on a page whose sentence says the opposite.
- **Smallest fix:** in `windowFor`, drop the `top / 2` floor — `hi − lo +
  30_000` already holds the diamond, the zone, the exit and the next cliff —
  and spend the slack on the biggest drop when it is within the span rather
  than by a fixed ratio; on the proof household that gives $18,000–$63,000
  and about a $35,000–$60,000 axis, where the band is a third of the plot
  and the $2,387 step is about 18px. Then say "so the drops are easy to see"
  only when the biggest drop in the window is at least a tenth of the
  y-range, else the bare axis sentence. The crop rule belongs in `charts.md` § Phone
  (TODO(system) 18).

---

## Should fix

### S1. Twenty-two chips above the answer at desktop width, on the surface that "has no controls that change the answer at all"

`app/src/editor/index.ts:216–224` and `design/tokens.css:527–539`: below 720px
the inputs collapse behind *Edit* and the answer starts at y=185 (the mockup's
147; the two-line summary and the two buttons are the 38px); at 1280 the
chips are always shown and the answer starts at **y=339** against the
mockup's 107 (`ca-1280-light-viewport.png`, `mock-measurements.json`), under
a 212px row of 22 chips in four lines; the Tab order to the chart is 25 stops
(`interactions.json` `1280-light.tabOrderToChart`; 5 at 390). Eight of the
chips read *none* in `--ink` at 600, the weight of *$30,000 a year*
(`chips-1280-light.png`); the caseworker review's S2 measured the same
defect on the same editor. The design README (§ Where the personas conflict,
2) resolves what-if machinery to the caseworker surface; the inventory tags
ScenarioBar W-only; the editor brief made the chips real controls, which is
right, but the axis "shown at ≥720" was the counselor's need, not this
reader's. On the landing at 1280 the same row holds eighteen empty chips
above the form (`landing-1280-light-viewport.png`; caseworker S10, "the
citizen page gets the same relief"). Fix: this surface keeps the phone rule
at every width — the summary line and *Edit*, the chips behind it — by
setting the collapse as an option of `mountEditor` rather than a media query;
and `#inputs` stays hidden until `hasAnswers(flags)`.

### S2. On paper the page opens with the chips, carries no name, and leaves half its first page blank

`design/tokens.css:634–648` (the print block hides `.hg-button` and the
`.hg-scenario__actions`), `app/src/editor/index.ts:217, 221` (`hg-no-print` on
the sticky block and the summary line only), `app/src/citizen/citizen.css` (no
print rule), `chart.ts:320–325` (the redraw waits for a `ResizeObserver`).
The real PDF from either width (`print-letter-1280-dark-p-1.png`,
`print-letter-390-dark-p-1.png`; `pdftotext` of both): page 1 is twenty-two
bordered chips in seven rows — the print layout is Letter-wide, so the phone's
collapse does not apply — then the answer, then the chart's title, then
**half a page of nothing**: `.chart-head` is a sibling of the 300px SVG and
nothing says they stay together, so the SVG moves to page 2 and the title
stays. No wordmark and no household line survive to paper: the wordmark is
inside the `hg-no-print` sticky block and the mockup's masthead sentence ("A
parent with two kids, ages 3 and 7, in Colorado") was replaced by the summary
line, which is `hg-no-print` too. "Move along the line with your finger, your
mouse, or the left and right arrow keys. Press ] and [ to jump between
drops." prints under the chart, and *Show the numbers* prints as a heading
over the open table. From a phone the chart is the 358px drawing stretched
to the column, its 12px ticks printing at about 1.7×
(`print-letter-390-dark-p-2.png`; the caseworker review's N6, TODO 15). Five
Letter pages. The print inks are right: every text ink in both PDFs is a
light-scheme ink and none the dark (`interactions.json` `*.pdf.inks`), and
the numbers open on `beforeprint`. Fix: a `.hg-print-only` line at the top of
the result with the wordmark and the summary sentence; `#inputs` and
`.hg-readout` `hg-no-print`; `figure { break-inside: avoid }` (or
`.chart-head { break-after: avoid }`); the disclosure's summary hidden on
paper; and the fixed-width redraw on `beforeprint` the caseworker review
asked for.

### S3. Three label collisions: the drop label on the diamond, the peak label on the first dot and its ring, the drop label inside the ring

`app/src/citizen/chart.ts:147` (the peak label ends 6px left of the band's
left edge — where the first cliff's dot sits, since a zone starts at a
cliff), `:209–214` (the drop label is placed against the leap label only),
`:220` (the *you* label), `tokens.css:619–622` (the open mark's 20px ring).
Measured (`measurements.json` `*.collisions`, `*.svgTexts`, `*.circles`):
on the $125,000 household at 390 the "−$7,059" label (x 151–199, y 720–734)
lies across the diamond (x 193–205, y 725–737) — its last digit is under the
marker (`past-390-light-zoom.png`; 40px clear at 1280). On the proof
household at both widths the "$45,020" peak label ends 1.5px from the $29,000
dot's edge, and when that mark is open its ring (x 130.8–150.8 at 390) covers
the label's last digit (`row-open-390-light.png`). On the hourly,
monthly and $125,000 households the "−$…" label's left edge is 1px inside the
ring's box (`chart.ts:213`: `cl.x + 9` against a 10px ring radius). Fix: one
overlap test for a direct label against the dots, the ring's box and the
diamond — the test the caseworker review asked `charts.md` to record (TODO
15) — and when it hits, place the label on the other side of the connector
or a line up; the peak label goes 10px further left, or above the rule.

### S4. On a phone the safe-from-here rule is a plum line with no label, no key entry and no sentence

`app/src/citizen/chart.ts:157–162` (the *safe from here* label is drawn only
when `!narrow`, following the brief's rule for *back to even*), `:225–226`
(the caption's "From $92,000 up…" sentence only when the rule is outside the
window). When the safe exit is inside the window and the household is not in
a zone — the Boston hourly household (`hourly-390-light-chart.png`, the rule
at $50 an hour) and the $125,000 household (`past-390-light.png`, the rule at
$119,000 just left of the diamond) — a 390px screen shows a full-height
`--loss-3` rule that nothing on the page names: the key has no entry for it
(the brief's MarkKey lists band, cliff, deferred cliff, position), the answer
sentence for these shapes has no {exit} slot to key it, and the caption says
nothing. Fix: emit `chart.safeBeyond` ("From $50 an hour up, more pay always
adds to what you keep.") whenever the label is not drawn, not only when the
rule is off the picture; the same for *back to even* on the in-zone shapes at
narrow, where the sentence's {exit} underline carries it and the caption need
not.

### S5. On the archetype path the chips contradict the assumed list, and the sentence that reconciles them is 13px grey a thousand pixels down

`app/src/citizen/model.ts:140–141` (`modeled` is core's swept household on the
archetype path — right), `facts.ts:41–88` (the assumed list reads `modeled`),
`app/src/editor/index.ts:295–307` (the chips read the person's flags),
`result.ts:142–147` (the M4 sentence in the source line). With the engine
dead (`archetype-390-light.png`, `archetype-390-light-top.png`,
`archetype-390-light-source.png`, `archetype.json`): the bar says *Rent none ·
Child care none · Child care help off*; the answer says "You keep $75,484 …
$29,880 of this is child care help. It goes to your day care, not to you.";
the assumed list says "Rent $2,903 a month. The usual rent in California.",
"Child care $2,578 a month for two kids", "Help you get … child care help
(CCDF child care subsidy). We count each as if you get it." All three are
true of something, and the sentence that says which — "We could not get your
exact numbers right now. These are numbers for a family like yours in your
state." — sits at y=1,209 at 390 in `--ink-3` at 13px, under the caption. The
brief chose the source-line state over a banner and that stands; what it did
not choose is a bar that asserts answers the numbers do not use. Fix: on the
archetype path the summary line (and the chips row's `.hg-scenario__note`,
the inventory's slot for "what a take-up state means for this household")
carries the M4 sentence with *Try again*, and the value chips whose answers
were not used read the swept household's values. Also: pressing *Try again*
on a still-dead engine re-renders the same page, the status region re-reads
the same verdict, and focus falls to `body` (`archetype.json`
`afterTryAgain`); the reply should be "We still could not…" and focus should
stay on the line.

### S6. The incomplete-state caution sits three screens down, after the drops it qualifies

`app/src/citizen/result.ts:173, 181–184` (the `#incomplete` callout is
appended after the *What ends, and when* section), `facts.ts:117–122`. On the
New Jersey household the caution — "One thing we could not count. New Jersey
has NJ Health Plan Savings. Our math does not include it. A drop could be
missing from this page." — is right in register and right to exist (the
inventory tags IncompleteMarker away from this surface on the reasoning that
the citizen makes no cross-state claim; but a missing premium program makes
the person's own figures a floor, and the caseworker gets the same one-line
notice). It renders at **y=2,746** at 390 (the page is 4,921 tall; the answer
is at 185 and the chart at 619) and y=2,338 at 1280, stacked under the blue
*2 changes wait* callout (`nj-390-light-incomplete.png`, `nj-390-light.png`).
A reader meets "a drop could be missing" after reading every drop. Fix: put
it where it qualifies the picture — inside the figure after the caption, in
the SourceNote's slot, which is where the same fact lives on the caseworker
page ("every figure on the page is a floor") — and record the citizen tag in
the inventory (TODO(system) 19).

---

## Nits

- **N1.** "The biggest drop, about $7,100 a year at $107,000 a year, is
  outside the picture." — the unit twice in one clause on every annual
  household (`copy.ts:64` `{pay}` filled with `m.payUnit` at `chart.ts:224`).
  M5 says "a year" once per sentence: `m.pay`.
- **N2.** The readout hint "Press ] and [ to jump between drops." prints
  under a chart with no marks (`nocliff-390-light.png`) and, on every phone,
  names two keys a phone does not have; three lines under the chart at 390
  (`copy.ts:53`, `chart.ts:85–87`). Say the second sentence only when marks
  exist and only above 720px; the visually hidden copy keeps both.
- **N3.** "2 changes wait" lists its paragraphs out of pay order — $97,000
  before $41,000 on New Jersey (`nj-390-light-incomplete.png`;
  `steps.ts:108–122` appends the non-cliff endings after the deferred
  cliffs). Sort by `at`.
- **N4.** A section headed *Hours* whose one sentence is about the minimum
  wage ("California's lowest legal pay is $16.90 an hour. Full-time work at
  that pay is about $35,000 a year.") sits directly under an assumed row
  labelled *Hours* ("Not given. We assume full time.") (`copy.ts:231–233`,
  `result.ts:187`; `ca-1280-light.png`). Inherited from the mockup. A heading
  is a label with a job: "The lowest legal pay", or fold the sentence into
  *How common is this pay?*.
- **N5.** "Your kids' food help for moms and babies would end. It is called
  WIC." (San Francisco, Massachusetts; `steps.ts:73–75`): the group template
  is guarded only for phrases ending in "kids". Guard any phrase that names
  its own group, or give WIC the plain template.
- **N6.** `facts.ts:115–119` scopes the child-care entry to "a child under 6"
  (`age < 6`) where the places review's N8 settled one rule, core's
  `CHILDCARE_MAX_AGE` (through 12), and the editor on the same page already
  uses it (`editor/index.ts:142`). Read the constant.
- **N7.** The reach source line is in the journalist's words on the citizen
  page — "From U.S. Census Bureau survey data, ACS 2024 1-year PUMS." — via
  `places/format.ts:31–34` `reachWord` (`facts.ts:135–138`); the mockup said
  "public-use microdata" and printed the cell's size and margin ("393
  households in this cell; the margin at this point is about $8,000") where
  the page says "The count could be off by a few thousand dollars either
  way." for every household (`copy.ts:225`). The margin is in `reach.cell`
  today; say the number.
- **N8.** The one-value dialog's title and its only label are the same word
  — *Savings* / *Savings* (`dialog-390-light.png`; `editor/index.ts:436`,
  `:143–149`). Let the label carry the unit ("Dollars") or the question.
- **N9.** § Languages, mostly done — every result string is in `copy.ts` and
  lists and dates go through `Intl` — with four leftovers: the `h1` is a
  literal in `main.ts:27`; `programs.ts:26` concatenates "the " onto a name;
  the editor's "Check this." is a literal in `index.ts:376`, and its
  household, place and summary labels are joined from fragments
  (`index.ts:124–129, 306`: "1 adult", "kids 3 & 7", " · ").
- **N10.** "California Premium Subsidy, up to $1,538 a year. California helps
  pay for health insurance. We counted it." — the state twice in a row, on
  Massachusetts too ("ConnectorCare Plan Type 2A. Massachusetts helps…")
  (`copy.ts:198–199`, `facts.ts:82–83`). "It helps pay…".
- **N11.** The table's *Your pay* column is annual for an hourly or monthly
  person — "$33,670" for someone who said $18.50 an hour
  (`hourly-390-light.png`; `table.ts:10–19`, `result.ts:157`, caption "in
  dollars a year" `copy.ts:109`). The mockup did the same; M5 says "every
  pay figure on the citizen surface". Print the unit figure, or both
  (TODO(system) 21).
- **N12.** The summary line wraps to two lines at 390 — "94110 · CA · 1
  adult, kids 3 & 7 · $30,000 a year" is 49 characters against the
  inventory's 41 — and the ZIP says nothing to the person who typed it
  (`ca-390-light-viewport.png`; the caseworker review's N9). And the line is
  the one place on the surface joined with middle dots, which the README's
  type rules forbid and the inventory's ScenarioBar example prescribes
  (TODO(system) 25).

---

## What is right and should not be touched

- **Nothing is typed.** The archetype source line reads "policyengine-us
  2.6.2 … Sweep of Sep 16, 2026. Rent: HUD Fair Market Rents, FY2026 revised
  schedule (effective 2025-10-01). Child care price: county 2018" from the
  coverage record; the live line says "These are your own numbers"; the
  state name, the `$200` floor, the axis floor, the count of waiting changes,
  the reach vintage and the year are all rendered. A fixer must not introduce
  a typed number anywhere.
- **The answer sentence** at display size with the keyed underlines — 26.55px
  at 390 in a 22ch measure (five lines, 29 characters), 38px at 1280 in 26ch
  (four lines, 35) — {kept} in `--series-1` (4.73:1 on the surface), {exit}
  and {leap} in `--loss-3` (5.37:1), {wage} in `--loss-4` (8.56:1); the
  in-danger-zone shape adds up ($43,000 − $30,000 = $13,000) and "It happens
  again from $106,000 to $119,000" reads the next zone's start off the data,
  never the exit. All five shapes render and read as one voice
  (`nocliff-390-light.png`, `past-390-light.png`).
- **Pay in the person's unit (M5)** everywhere it was promised: "Near $32.50
  an hour … about $3,200 less a year", "$18.50 an hour or less", the StepList's
  "$24.25 an hour", the readout, and ticks generated in the unit and mapped
  back ($20/$30/$40/$50 an hour; $2,000/$4,000/$6,000 a month) with the unit
  stated once in the chart head.
- **The one convention** in the StepList — "$37,000 Food help would end. It
  is called SNAP. Some goes on until $38,000: $413 of food help." — with
  "would" above current pay, the program named after the phrase, person-level
  programs per group ("Your own free state health plan" / "Your kids'"), the
  *Waits* badge dashed and "It does not end that day" following only the
  program it belongs to, and the loss line in `--loss-ink` (7.41:1 light,
  9.00:1 dark) with "This is the biggest drop." on exactly one row.
- **The lift and the ghost**, drawn from one condition and captioned from
  it; the hollow dot, dashed stub and *later* on a lone deferred cliff; the
  merged mark with its count; "The dashed line is where you are now" for a
  household past a deferred step.
- **The marks as controls.** Every mark 44×44; the wrapper is the one tab
  stop with a 2px ring at 4px; `]` reaches a mark, Enter opens its row in
  view with the sunk ground and the 3px ink bar, the readout speaks the mark's
  label, Escape and *Close* hand focus back to the mark; a resize keeps the
  focused mark. Focus rings are the system's 2px ink at 2px on every control
  measured (skip link, the two actions, chips, *Edit*, the disclosure).
- **The table twin** with right-aligned numbers, a real disclosure marker,
  every *keep* equal to the plotted point, and a merged mark separating into
  rows.
- **Copy.** Corpus grade 2.14; every sentence one job; the failed state says
  what happened and what to do ("We could not get your answer. The math
  service is busy right now. Please try again in a few seconds. *Try again*")
  as a caution callout, not a banner; the loading state is one line ("Doing
  the math… We check your help at 151 pay levels.") with no skeleton; a chip
  toggle re-renders in place, reads the new sentence to the status region
  visually hidden, and leaves focus on the chip; the empty landing is the form
  with focus in its first field.
- **Type, space, colour.** One family; 17px body, 15px captions, 13px floor
  honoured for every word on the SVG and 12px only on ticks (checked on
  every text node); every margin and padding measured on the `--s*` scale
  (band 32, answer 24/16, h2 48/16, rows 12, callout 24, footer 48/24);
  every text pair ≥ 4.75:1 light and ≥ 6.6:1 dark (the keyed underlines
  4.73 and 5.37 on the surface), the chip and button edges 3.49 / 3.74;
  dark mode re-derived, not flipped, with the loss ramp's anchor reversed;
  no horizontal scroll at either width.
- **Motion.** The line draws once through `.hg-draw` at `--dur-draw`;
  reduced motion measures `0s` on the token and on the path with no
  `matchMedia` anywhere in the page.
- **The deliberate changes** in the builder's reports — the ScenarioBar
  editor in place of the masthead (its collapse is what S1 asks to keep), the
  diamond at the household's own money, the readout keeping its hint until
  the first touch, the deferred callout for a child's coverage that is not a
  cliff, the citizen-register caution for an incomplete state — stand.

---

## TODO(system)

The places review's ten items are all resolved on main. The caseworker
review's items 11–15, and whether this page is affected:

11. Print from OS dark — resolved (`30d7e99`); this page prints light from
    both widths, measured on the PDF's text inks.
12. `.hg-scenario__note` width and position — **not affected**: this surface
    never writes a note line (S5 asks it to).
13. `.hg-rows` phone rule — **affected.** At 390 the StepList's sentences get
    242px (29 characters a line) and the assumed list's 218px (26; *Help you
    get* runs seven lines) under `--col: 6.5rem` and `8rem`.
14. Chip order, the unset value, the `copy` override — **affected** at ≥720
    (S1: eight *none* chips at the weight of an answer); the copy override is
    not needed here, the editor's copy is this surface's.
15. Direct-label collision rule and the print-width redraw — **affected**
    (S3 on three households; the chart from a phone prints stretched, S2).

New:

16. `inventory.md` § Verdict catalog: a deferred cliff at or above current
    pay needs a clause — the catalog is wired to the lifted curve on purpose,
    and today that leaves the person told "$600" when $16,600 waits (B1).
17. `charts.md` § Collision: a cluster that mixes a deferred and an immediate
    cliff must keep the *waits* channel (hollow, dashed, *later*); and the
    diamond must not be drawn over a mark (B1).
18. `charts.md` § Phone: the crop rule — the window is the zone (or the
    household and its next cliff) plus a margin, taking in the biggest drop
    when it is within reach; never a fixed fraction of the axis; and the
    "easy to see" clause conditional on the drop's share of the y-range (B2).
19. `inventory.md` #16 IncompleteMarker and `README.md` conflict 6: the
    citizen surface does carry it, in its register, and its place is beside
    the SourceNote (S6).
20. `tokens.css`: a `.hg-mark__count` modifier for a merged mark whose every
    cliff waits (the page's own marked TODO in `citizen.css:47–50`, `--ink-3`
    on a hollow dot).
21. `inventory.md` M5 against the DataTable's *Your pay* column, which the
    mockup and the page both print annual (N11): decide.
22. `inventory.md` M3: a state's own name for a program — Massachusetts
    calls TANF TAFDC and the page says "It is called TANF cash assistance"
    and labels the correction "Cash help (TANF)" (the caseworker review's
    N10 for its corrections row).
23. `charts.md` § Direct labels says two on the citizen chart; the Marks
    table adds the peak's dollar, and the page draws three. Say three, and
    where the third goes when the first dot is under it (S3).
24. `inventory.md` § Verdict catalog: `cliff_ahead` at the `$200` floor —
    the monthly Coloradan is told "People call this a benefits cliff" for a
    $205 premium step. Whether the sentence should soften near the floor is
    the catalog's call.
25. `README.md` § Type ("no meta strings joined with middle dots") against
    `inventory.md` § ScenarioBar ("CO · El Paso · …"): one rule (N12).
26. `tokens.css` print block: `.hg-scenario__inputs` and `.hg-readout` are
    screen chrome and should leave paper for every surface (S2; the
    caseworker review's N5), and a page needs a `.hg-print-only` masthead
    line since the wordmark lives in the `hg-no-print` sticky block.
