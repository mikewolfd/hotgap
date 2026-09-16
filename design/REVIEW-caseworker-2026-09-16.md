# Design review — the caseworker page, built — 2026-09-16

Scope: `app/caseworker.html` + `app/src/caseworker/` + the shared editor
`app/src/editor/` as this surface configures it (branch
`worktree-agent-ad5471c2432560a9d`, head `20f73f4`, merged locally), served
through the project's own runner (`cd app && npx vite build`, then `cd worker
&& npx wrangler dev --port 8792` against the hosted engine on policyengine-us
2.6.2, and a second run with `--var HOTGAP_PE_URL:https://127.0.0.1:9/…` for
the archetype path) in Chromium (Playwright 1.60) at 390×844 and 1280×900,
light and dark, print media emulation **and** a real Letter PDF through
`page.pdf()`, and, separately, a PDF taken through the page's own *Print the
client sheet* button with no prior media emulation. States: the landing with
no answers, the mockup's Colorado single parent (ZIP 80903, kids 3 and 7,
$38,000, the archetype's own rent and care) rendered live, one and three
what-ifs added by chip, by dialog and by the four-facts screen's *Add as a
what-if*, a what-if removed, a what-if that failed (429), the failed base
(503), the loading line, the archetype source, a Massachusetts household
(ZIP 02108, its three correction rows), a Texas one (ZIP 78701, the coverage
gap), the *Savings* dialog, the chart's marks reached by `]` and opened by
Enter, and the client sheet on paper. The mockup `design/caseworker.html` was
served from the repo root and rendered beside it. Screenshots, the PDFs and
the measurement dump are under `design/review/caseworker/`
(`measurements.json`); the brief reviewed against is `design/README.md`,
`inventory.md`, `charts.md`, `tokens.css`, the audit `AUDIT-2026-09-16.md`
and the builder's reports in its last seven commits.

Contrast figures were computed from the colours the browser painted, with the
audit's WCAG 2.x relative-luminance formula; type, spacing, line lengths and
distances are computed styles and bounding boxes. No console errors in any
state at either width; no horizontal page scroll; the unit tests for the
page's modules pass through the project's runner (`npx vitest run
app/src/caseworker`: 23 tests).

## Verdict

This is the mockup made real, and where the data touches the page it is
better than the mockup: nothing is typed (the source line says policyengine-us
2.6.2 from the file while the frozen sketch still says 2.5.0; the "2 states
(NJ, WA)" count, the county, the `$200` floor and the reach margin are all
rendered), the coverage and corrections blocks render every state's own
record — Massachusetts's TAFDC, ladder and child-care rows, Texas's override
and coverage gap — the threshold ledger prints one figure under one
convention with cites a counselor can read out, the comparison lives in the
URL, and the sticky top row is 69px at both widths and stays at `top: 0`
(the audit's S1, done). The four deliberate departures in the builder's
reports — chips as real controls that each add a what-if, a value dialog, a
second exit from the four-facts screen, the compare controls moved to a footer
row — are right. What stops it going in front of a family is the table the
surface exists for and the one state where the page says a wrong number:
the CompareTable cannot hold the README's "four what-ifs" (three of them
overflow the right column at 1280 with the row names squeezed to 81px, and
on a phone the base-only table shows ten row names and no figures at all);
and on the archetype path a take-up what-if evaluates to the same committed
curve and prints *Change from now +$0*, which reads as "turning the subsidy
off changes nothing". Below those, ten should-fixes, of which four are the
bar: 22 chips where the mockup typed 9 is the inventory's own rule and is
right, but they arrive in the citizen's second person on the counselor's
page ("You have a disability off"), name one control two ways (chip *Child
care help*, column *CCDF subsidy off*), set an unanswered "none" as heavily
as a real answer, and put the take-up toggles — the counselor's usual
what-if — last; and the what-if a chip adds lands 1,605px (4,456px on a
phone) from the chip with a 13px sentence as the only reply. Two are
inherited from the mockup and never caught (the leap label sits on the
merged mark's ring at both widths; the breakdown's track is 124px on a
phone). One system defect surfaces here and is worse on the sibling page:
`tokens.css`'s print block loses to its own OS-dark rule by specificity, so
`places.html` prints near-white ink on white from an OS in dark mode; this
page carries a local `!important` that hides it (TODO(system) 11).

Counts: **2 B, 10 S, 10 N.**

**Resolution pass, 2026-09-16.** Every finding below carries a *Resolved*
line naming the commit and the evidence the fixed page produced, re-measured
by `app/e2e/caseworker.spec.ts` on the builder's branch merged with `main`
(`3e9e544`: the system fixes from the places review) — through
`npx vite build` and `wrangler dev --port 8790` against the hosted engine,
with a second `wrangler dev --port 8791 --var HOTGAP_PE_URL:…:9/…` for the
archetype path — and written to `design/review/caseworker/after/`
(screenshots named by finding, `measurements.json`). Two items are system
rules and keep their TODO(system) entry with the page-side part done (S9,
N2); one was resolved as the places pass resolved its twin (N3, dropped).


---

## Blockers

### B1. On the archetype path a what-if the sweep cannot express prints "+$0"

- **Where:** `app/src/caseworker/model.ts:262` (`Change from now` =
  `signed(ev.analysis.currentNet - base.analysis.currentNet)`),
  `render.ts:137` (the column's sub-line adds " · archetype"),
  `main.ts:204–216` (`runWhatIf` accepts any `ok` evaluation).
- **What I saw:** with the engine dead, the mockup's own household plus
  `whatif=childcare-subsidy=` lands with both columns marked *archetype*, and
  the what-if column is the base column cell for cell — *Net after premiums
  $84,371*, *Change from now +$0*, *Largest drop $25,449*
  (`review/caseworker/archetype-1280-compare.png`, `measurements.json`
  `archetype-1280.compareHead`). `pickArchetypeId` reads only the household's
  shape and pay, so a toggle, a rent, a savings figure or a status what-if
  maps to the same committed curve; the page then subtracts the curve from
  itself. The note under the table says a column marked archetype "is the
  committed sweep for a household of that shape", which is true and does not
  say the number is empty.
- **Who it hurts:** the counselor and the family beside them — the page's
  one job is a defensible comparison, and "+$0" is an answer the model never
  gave. The mockup's two what-ifs (a raise, a partner) are the two things an
  archetype *can* vary, which is why the sketch never showed this.
- **Smallest fix:** in `runWhatIf`, when the reply is an archetype and its
  `pickArchetypeId` and `currentEarnings` equal the base's, keep `ev` null
  and set `pending` to a sentence ("Not in the sweep — needs the live call")
  so the column prints em dashes, its sub-line the reason, and the footer's
  *Try again*; the same test belongs in `compareNote` so the caption stops
  vouching for an empty column.

*Resolved* (`3a86252`): `model.ts` `notInSweep(base, ev)` — the reply is an
archetype of the base's own id at the base's earnings — puts the column in
the `unanswered` state: sub-line "not in the sweep — needs the live call",
cells "—", *Try again* and *Remove* in the footer, and `compareNote` adds
"The committed sweep varies only a household's shape and pay, so a what-if
that changes something else has no figure until the live call answers."
Measured on the dead-engine server with `whatif=housing=1` and
`whatif=pay=55000`: the housing column unanswered, the raise column a real
figure marked "(archetype)" (`design/review/caseworker/after/B1-archetype-1280-compare.png`,
`measurements.json` `B1-archetype-1280`).

### B2. The CompareTable cannot hold the comparison it exists for

- **Where:** `app/src/caseworker/caseworker.css:40`
  (`.hg-scroll-x .hg-table { min-width: 30rem }`), `:68`
  (`.compare th:first-child { width: 13rem }`), `:35–36` (the 1.35fr / 1fr
  split), `render.ts:136–142`.
- **What I saw:** *Three what-ifs at 1280*: the table is 551px in a 490px
  scroller; the fourth column is clipped and reached only by scrolling
  sideways; the row-name column, promised 13rem (208px, and 208 when there
  is one column), is squeezed to 81px so *In a danger zone* takes three
  lines and rows run 55–87px (`compare-1280-3-whatifs-viewport.png`,
  `measurements.json` `compare-1280-3.cols`). The README says the
  caseworker's job is "four what-ifs in ninety seconds"; the inventory's
  own cap is "two or three scenarios", and even at that cap (base + 2) the
  names wrap to two lines (`compare-1280-2-whatifs-dark.png`). *The base
  alone at 390*: the 30rem minimum holds the table at 480px inside a 358px
  scroller, and the one value column is right-aligned at x=224–496 while the
  scroller ends at 374 — a counselor sees ten row names and no figures
  (`compare-390-light-now-only.png`; `measurements.json` `probe.narrow`).
  *Three what-ifs at 390*: 551px in 358, one what-if visible at a time
  (`compare-390-3-whatifs-viewport.png`). The table is inherited from the
  mockup's three static columns, which fit; the page made the count live and
  the layout did not follow.
- **Who it hurts:** the counselor in the meeting — the comparison is the
  surface's memorable element and it is the one thing on the page that does
  not fit its own column.
- **Smallest fix:** drop the shared 30rem minimum from `.compare` (it is the
  drops table's), give `th:first-child` `min-width: 11rem` and
  `position: sticky; left: 0; background: var(--plane)` inside the scroller
  so row names stay while scenarios scroll, and let the Compare section
  span both grid columns (`grid-column: 1 / -1`) once there is more than
  one what-if — the page knows the count when it renders the header.

*Resolved* (`3a86252`): the 30rem floor is scoped to the drops table; `.compare
th:first-child` is 11rem (8rem below 520px), `position: sticky` at the
start edge on the plane; column heads may wrap below 520px; the Compare
section is its own grid item and takes `grid-column: 1 / -1` under both
columns once `data-wide` (more than one what-if) is set by `renderCompare`.
Measured: three what-ifs at 1280 — table 1184 in a 1184 scroller, names
176, rows 40px (`design/review/caseworker/after/B2-compare-1280-3-whatifs.png`); the base alone at 390 —
358 in 358 with the figure column ending at the scroller's edge
(`design/review/caseworker/after/B2-compare-390-now-only.png`); base + one what-if at 390 — 358 in 358
(`design/review/caseworker/after/B2-compare-390-1-whatif.png`); two what-ifs at 390 scroll under sticky
names (`design/review/caseworker/after/B2-compare-390-2-whatifs.png`; `measurements.json`
`B2-compare-*`).

---

## Should fix

### S1. The bar and the four-facts screen speak the citizen's second person to the counselor, and one control has two names

`app/src/editor/copy.ts:10–58` is "in the citizen register" by its own
comment and the caseworker page takes it whole: 22 chips read *Where*,
*Home*, *Your age*, *Your status*, *You have a disability off*, *Gets food
help (SNAP) yes*, *Health plan from a job off*
(`chips-1280-light.png`); the pay chip opens a screen headed "If your pay
goes up, do you keep more? Answer four things. We check your help…", with
*Just me / Me and my spouse*, *See my answer* as the button that changes
the client's household, and "We do not save what you type" under it
(`screen-1280-from-pay-chip.png`); on a phone the empty summary line reads
"Tell us about your home to see your answer." The README's split is that
the caseworker surface "makes the mechanism explicit ('CCDF, $55,000, driver: benefits')";
the page already has that vocabulary — `scenarios.ts:42–52` names the
what-if columns *CCDF subsidy off*, *Housing voucher on*, *Employer coverage
on* — so the same press is *Child care help on* in the chip, "What-if added:
CCDF subsidy off" in the note and *CCDF subsidy off* in the column. Fix:
`mountEditor` takes a `copy` override the way it takes `actions`
(`index.ts:53–68`), the caseworker passes its own table (the one
`scenarios.ts` already holds, plus a heading and a submit — "The household",
"Update the household"), and the chip, the note and the column say one name.

*Resolved* (`3a86252`): `mountEditor` takes `copy`, merged over the citizen
words two levels deep; `src/caseworker/copy.ts` `editor` is the caseworker
register (Place, Household, Pay, CCDF subsidy, SNAP on/off; "The
household", "Update the household", "Nothing typed here is stored"); the
summary's empty line reads "Enter the household to evaluate it";
`scenarios.ts` names a column by its chip (`flagName` reads the same
table), so the press is *CCDF subsidy on* in the chip, "What-if added: CCDF
subsidy off" in the note and *CCDF subsidy off* in the column
(`design/review/caseworker/after/S1-S2-chips-1280.png`, `design/review/caseworker/after/S3-whatif-390-action-opened.png`).

### S2. Twenty-two equal chips: "none" set like an answer, the toggles last, the hint below them

The count is right — `inventory.md` § ScenarioBar says the newer answers
"add chips to the row and words to nothing else" — but three axes the
inventory leaves free were spent on the editor's defaults. (1) An unanswered
value prints *none* in `--ink` at 600, the weight of *$1,735 a month*, while
an *off* toggle prints in `--ink-3` at 400 (`measurements.json`
`1280-light.chipNone` / `chipOff`; `tokens.css:441` styles only
`[aria-pressed="false"]`): the five chips that say nothing are louder
than the five toggles that say *off*. (2) The row order is the citizen editor's
(`index.ts:168–195`): five facts, seven value chips, then the take-up
toggles; on a phone *What-if* opens 22 chips in 14 rows (740px,
`chips-390-light-open.png`) and moves focus to *Child care help* at
y=565, with the hint that explains what to do appended after the last chip,
below the fold (`whatif-390-action-opened.png`). (3) At 1280 the four rows
cost 212px against the mockup's 108, so the verdict starts at y=298 against
178 (`mock-page-1280-light.png`). Fix: an `.hg-chip--unset` (or `.hg-chip__v`
inheriting the pressed-false ink when the value is the editor's `none`);
the caseworker's order — the six facts, the take-up toggles, then the rest —
as an `order` the surface passes with its labels; and the note line first
in the row, not last (TODO(system) 12).

*Resolved* (`3a86252`): `order` on `mountEditor` (facts, the take-up toggles, then
the rest); a value chip at "none" carries `data-unset` and `editor.css` sets
its value in `--ink-3` at 400 (measured: the unset chips at 400 against the
answered 600, a different ink); the note is the first child of the row.
(`design/review/caseworker/after/S1-S2-chips-1280.png`, `measurements.json` `S2-chips-1280`.) The
`.hg-chip--unset` class and the note's place stay on the system list (TODO
12, 14).

### S3. A what-if lands a viewport or more away, the action that promises to add one only writes a hint, and *Remove* is never answered

`main.ts:76–80`: at 1280 *Add a what-if* sets a note and focuses a chip; a
mouse press shows no ring (`probe.note.fv: false`), so the only visible
reply is "Press a take-up chip, or change a value…" at the end of the chip
row (`whatif-1280-action-opened.png`). A chip press then adds the column
1,605px below the chips at 1280 (`probe.dist`: chips end at y=281, the
table starts at 1,886; the viewport is 900) and 4,456px below at 390, with
"What-if added: CCDF subsidy off. It is evaluated beside the base under
Compare" (`main.ts:33`) as the reply — it says where, it does not go there.
The mockup's action was a link to `#compare`. After *Remove* (`main.ts:218`)
focus moves to the Compare heading but the note still reads "What-if added:
Pay $55,000 a year" (`measurements.json` `remove-1280.note`). Fix: the
action opens the four-facts screen with *Add as a what-if* as its lead
button, so "Add a what-if" always ends in a what-if; the note carries the
mockup's own link ("…under <a href="#compare">Compare</a>"); and a remove
writes "What-if removed: {label}." in the same line.

*Resolved* (`3a86252`): the action opens the screen on the pay field with *Add as
a what-if* first and primary — the one `type="submit"` button, so Enter
presses it (measured: Enter on the screen with pay 55,000 adds
`whatif=pay=55000` and leaves the chips on the base); the note is a
fragment with the link "…evaluated beside the base under <a
href="#compare">Compare</a>. The chips show the base."; *Remove* writes
"What-if removed: {label}." (`design/review/caseworker/after/S3-whatif-390-action-opened.png`,
`design/review/caseworker/after/S3-note-390-after-press.png`). The chips-row hint is gone with it.

### S4. The leap label sits on the merged mark's ring at both widths

`chart.ts:171` places "+$7,000" at `lx0 + 8, yp − 6` (desktop) or
`yp + 17` (phone). At 1280 the label spans x=211–259 and the merged
$51k–$54k mark's open ring spans 251–271 at the same height; at 390 the
label (134–182 × 114–128) crosses the ring (133–153 × 98–118) and the
connector below it (`chart-1280-light.png`, `chart-390-light.png`,
`measurements.json` `1280-light.labels`/`circles`). On the phone the merged
mark holds six cliffs from $37k to $54k — the household's own cliff and the
largest drop — so the two direct labels the chart is allowed collide with
the one mark that matters. The bracket the label sits on is 28px wide at
1280; the label is 48. Inherited from the mockup pixel for pixel
(`mock-chart-1280-light.png`), never caught. Fix: when the label's box
intersects a mark's 20px ring, lift it a line (`yp − 20`) — the same
overlap test the marks already run against each other — and record the
rule under *Direct labels* in `charts.md`.

*Resolved* (`3a86252`): `chart.ts` `clearRings` measures each direct label's box
once it is in the tree and lifts it a line (14px, up to three times) while
it crosses any mark's 20px ring. Measured at 390 and 1280, light and dark:
every label 0 rings (`design/review/caseworker/after/S4-chart-390.png`, `design/review/caseworker/after/S4-chart-1280.png`,
`measurements.json` `S4-labels-*`). The `charts.md` rule stays on the
system list (TODO 15).

### S5. Two sentences that are true only sometimes print always

`chart.ts:190`: "The y-axis starts at $0, not $0; the visible range is
27.4× the largest drop" for the Texas household, whose floor is $0
(`chart-1280-light-TX.png`). `model.ts:202`: the Texas ledger's adult
Medicaid row cites "the net premium rises $0 in the step" — the coverage-gap
correction has just said no premium is charged (`measurements.json`
`TX.ledgerRows[0]`). Both are the mockup's templates meeting a household the
mockup never rendered. Fix: render each clause from its condition — the
"not $0" clause only when `y0 > 0`, the premium clause only when
`breakdown.premiums > 0` — as the ghost sentence already is.

*Resolved* (`3a86252`): `copy.chart.axis(floor, ratio)` adds ", not $0" only when
the floor is above zero; `copy.ledger.medicaidEnds(rise)` adds the premium
clause only when it rises. Measured on the Texas household (ZIP 78701):
"The y-axis starts at $0; the visible range is 23.3× the largest drop" and no
"rises $0" in the ledger (`design/review/caseworker/after/S5-chart-1280-TX.png`, `measurements.json`
`S5-TX-*`).

### S6. A failed what-if puts its error sentence in the column header and breaks the table

`render.ts:137` writes `c.pending` — "Too many evaluations in a minute. Wait
a minute and try again." — into the `<th>`'s sub-line, which `.num` sets
`white-space: nowrap`; the column becomes ~370px, the row names collapse to
80px, the title is cut to "Housing vo" and the cells' dashes leave the
scroller (`compare-1280-whatif-failed.png`). The footer already holds the
action (*Try again*, *Remove*). Fix: the header keeps the column's name and
shape ("did not come back" as its sub-line, no sentence); the sentence goes
beside *Try again* in the footer cell, or into the note line, which is the
page's one place for a reply.

*Resolved* (`3a86252`): a column has a state (computing / ok / failed /
unanswered); the header keeps the name and "did not come back"; the
sentence sits in the footer cell above *Try again* and *Remove*. Measured
with the engine answering 503 to one what-if: the table 1184 in 1184, names
176, and *Try again* fills the column once the engine is back
(`design/review/caseworker/after/S6-compare-1280-whatif-failed.png`).

### S7. BreakdownBars at 390 is a 124px track with a two-line axis

`caseworker.css:54` keeps `5.5rem 1fr 5.5rem` at every width; in a 358px
panel the track is 124px, "offsets the loss / adds to the loss" wrap to two
lines each and meet in the middle, the $25,794 bar is 62px and the $383 one
a 1px hairline (`breakdown-390-light.png`, `probe.narrow.bdTrack`).
Inherited from the mockup. Fix: below 520px, label and value on one line
above the track (`grid-template-columns: 1fr auto` with the track spanning
both), which gives a 326px track and one-line axis words.

*Resolved* (`3a86252`): label, value and track are three grid items; below 520px
`1fr auto` with the track spanning the row below. Measured: track 324px,
axis words one line (20px) at 390; one 31px row at 1280
(`design/review/caseworker/after/S7-breakdown-390.png`, `design/review/caseworker/after/S7-breakdown-1280.png`).

### S8. The client sheet takes the counselor's density, and its heading addresses the counselor

The handout is citizen copy — the M2 sentence, rounded and "about" (W6) —
yet it prints at the page's 11pt in the caseworker's `--measure-wide`,
100 characters a line on Letter (`print-letter-from-dark-p-6.png`,
`print-letter-direct-1280-p-7.png`), six short paragraphs at the top of an
otherwise empty page. The citizen surface sets 17px and `--measure` (60ch)
for exactly this register. Its heading, "For the client — Colorado, one
parent, two children" (`model.ts:343`), names the reader in the third
person on the page they hold. The mockup left both axes free. Fix: in the
print block, `.handout { font-size: 13pt; }` and `.handout p { max-width:
var(--measure) }`; a heading in the second person the sheet already uses
("Your pay and your help — Colorado, one parent, two children").

*Resolved* (`3a86252`): `.handout { font-size: 13pt }`, `.handout p { max-width:
var(--measure) }` in the print block; the heading is "Your pay and your
help — Colorado, one parent, two children". Measured under print emulation:
17.33px and a 476px measure (`design/review/caseworker/after/S8-print-handout.png`).

### S9. CorrectionsApplied at 390 leaves 170px for the sentence

`caseworker.css:30` keeps `--col: 11rem` (176px) at every width, so in a
358px column the cite gets 170px: 23 characters a line, eight lines for
Colorado's one row, `assigned_co_premium_assis|tance` broken mid-identifier
(`viewport-390-light-scrolled600.png`, `provenance-390-light-MA.png`,
`probe.narrow.corrCiteW`). The mockup does the same; the journalist page
uses the same `.hg-rows`. Fix in `tokens.css`, since the row is the
system's: below 520px `.hg-rows > li { grid-template-columns: 1fr }` with
the program on its own line (TODO(system) 13).

*Resolved, page side* (`3a86252`): `caseworker.css` stacks `.provenance .hg-rows >
li` below 520px; the cite measures 358px (`design/review/caseworker/after/S9-provenance-390.png`). The
system rule for `.hg-rows` stays TODO(system) 13.

### S10. The landing shows eighteen empty chips above the form

`editor/index.ts:536` renders the chips row when the screen opens, and at
≥720px the row is always shown, so a counselor arriving at a bare URL sees
*Where none · Home 1 adult · Pay none · Rent none · Your age 30 · SSDI
none…* — a row of controls for a household that does not exist — before the
four-facts screen (`landing-1280-light.png`); the two top-row actions are
live too, though there is nothing to what-if or print. Fix: hide `#inputs`
until `hasAnswers(flags)` (the summary line already has this test at
`index.ts:355`) and set `disabled` on the surface's actions until a base
stands (`.hg-button:disabled` exists in `tokens.css:426`); the citizen page
gets the same relief.

*Resolved* (`3a86252`): the editor hides `#inputs` until `hasAnswers(flags)` and
disables any action marked `needsAnswers` (both of this surface's).
Measured: a bare URL shows the screen, no chips, both actions disabled
(`design/review/caseworker/after/S10-landing-1280.png`).

---

## Nits

- **N1.** On a landing the verdict wears the focus ring: `main.ts:249`
  passes `submitted: true` for a link as well as a submit, `:153` focuses
  `#verdictLine`, and with no prior interaction Chromium draws the 2px ink
  box around the page's memorable sentence (`viewport-1280-light-top.png`,
  `measurements.json` `focus-landing-1280`). The box also prints when a
  landing is followed by Cmd+P (`print-letter-from-dark-p-1.png`); the
  page's own *Print* button moves focus first and does not. Split "close the
  screen" from "move focus": a landing leaves focus at the document start.
  *Resolved* (`3a86252`): `runBase` moves focus only on a push (a submit); a
  landing leaves `document.activeElement` on the body (asserted at both
  widths).
- **N2.** The note line is not the full-width line the inventory describes:
  `.hg-source`'s `max-width: 76ch` (`tokens.css:338`) caps the
  `flex-basis: 100%` of `.hg-scenario__note` (`:474`) at 566px, so at 1280
  it sits on the last chip's row, x=341, 8px after *Gets WIC yes*
  (`whatif-1280-1-pending-viewport.png`, `probe.note`). `max-width: none`
  on the note (TODO(system) 12).
  *Resolved, page side* (`3a86252`): `caseworker.css` sets `.hg-scenario__note {
  max-width: none }`; measured 358px at 390 (`measurements.json`
  `S3-N2-note-390`). TODO(system) 12 stays for `tokens.css`.
- **N3.** The theme button is the last thing on the page (y=3,127 at 1280,
  6,046 at 390) and reads *Dark* on a page the OS already made dark
  (`page-1280-dark.png`; `main.ts:236–241` toggles on the attribute, not
  the computed scheme). The places review's N4 applies; the label should
  follow `getComputedStyle(document.documentElement).colorScheme`.
  *Resolved* (`3a86252`): dropped, as the places pass dropped its own (its N4,
  `inventory.md` #20); `prefers-color-scheme` rules and the proof emulates
  dark.
- **N4.** `]` skips a merged mark whose first member is below the cursor:
  `chart.ts:257` tests `cliffs()[m.members[0]].startEarnings > at`, so at
  390 the first `]` from $38,000 lands on $60,000, past the six-cliff mark
  that holds $41k–$54k (`measurements.json` `mark1-390`). Test any member.
  *Resolved* (`3a86252`): `]` and `[` test any member; the first `]` from
  $38,000 at 390 lands on "6 drops between $37,000 and $55,000, together
  $29,558 a year" (`measurements.json` `N4-mark1-390`).
- **N5.** Paper carries screen chrome: the 22 chips print as bordered
  controls, eight rows on Letter page 1 (`print-letter-from-dark-p-1.png`;
  `header.hg-scenario` is not `hg-no-print`, only its summary is); "Select
  a row or its mark for the breakdown." (`caseworker.html:57`) and the live
  readout sentence (`:49`) print on page 2–3; the drops ledger keeps its
  44px rows (places N5). Mark the caption, the readout and the inputs row
  `hg-no-print`; the assumed list already states the inputs.
  *Resolved* (`3a86252`): the page's print block hides `.hg-scenario` (the bar
  and its chips), and the drops caption and the readout carry
  `hg-no-print`; measured `display: none` for all three
  (`design/review/caseworker/after/N5-print-top.png`). The 44px rows are the system's (`tokens.css` now
  drops `.hg-row-btn`'s floor on paper).
- **N6.** The chart's type on paper is whatever width it was last drawn
  at: 9.4pt ticks from a 1280 screen, 17.3pt from a phone (the 240px
  narrow chart stretched ×1.9, `print-letter-direct-390-p-2.png`), 5.2pt
  after a media change redraw (`print-letter-from-dark.pdf` page 2), because
  the resize redraw runs on `requestAnimationFrame`, which print layout does
  not wait for. Redraw synchronously on `beforeprint` at a fixed width
  (`42rem`) and back on `afterprint`.
  *Resolved* (`3a86252`): `chart.ts` draws at 672px on `beforeprint` and back on
  `afterprint`; the proof dispatches the events and reads the viewBox (672,
  then the screen's). Media emulation does not fire `beforeprint`, so the
  browser's own dispatch is not what the proof measures.
- **N7.** Every what-if column wears the series-2 rules, so two adjacent
  what-ifs share a doubled 2px orange line and the mark that meant "the
  compared column" (`charts.md` § Both charts) reads as a grid
  (`compare-1280-2-whatifs-dark.png`; `caseworker.css:70–71`). Keep the 3px
  header rule as the what-if mark and draw only the left side rule.
  *Resolved* (`3a86252`): a what-if cell's shadow is one 1px start-side rule
  (`measurements.json` `N7-cell-shadow`) under the 3px header rule.
- **N8.** The compare table's row names are `<th scope="row">` at the
  browser's 700 (`probe.thw.rowTh`) — the only weight on the page outside
  the 400–600 the font is sliced to. `font-weight: var(--w-semi)` on
  `.compare tbody th`.
  *Resolved* (`3a86252`): `.compare tbody th { font-weight: var(--w-semi) }`;
  measured 600.
- **N9.** The summary line is 65 characters — "80903 · CO · El Paso County ·
  1 adult, kids 3 & 7 · $38,000 a year" — and wraps to two lines at 390
  (`viewport-390-light-top.png`, `probe.narrow.summaryLines`) where the
  inventory's line is 41 and one. Drop the ZIP when a county is known and
  "County" from the county.
  *Resolved in part* (`3a86252`): the summary names the place once — "CO · El
  Paso · 1 adult, kids 3 & 7 · $38,000 a year" (50 characters) — and the
  chip keeps the ZIP. It still wraps to two lines at 390 (46.5px,
  `design/review/caseworker/after/N9-summary-390.png`): the pay's unit phrase, the editor's, is what is
  left; the inventory's "$38,000" would need the summary to drop the unit
  for a yearly pay, which is a copy decision left with the inventory.
- **N10.** *Remove* and *Try again* are `--small` (32px) inside the table
  footer (`render.ts:148–149`), a size the inventory reserves for a source
  line; on a phone they are the only sub-44px controls beside *Edit*. And
  the MA correction row is headed *TANF cash assistance* (`places/model.ts`
  `correctionRows`) where the note, the office and the mockup say TAFDC
  (`provenance-1280-light-MA.png`); the column sub-line joins " · archetype"
  with the middle dot the README rules out.
  *Resolved* (`3a86252`): the footer's buttons are plain `.hg-button` (44px,
  measured); Massachusetts's row is headed "TAFDC (MA)" where the note is
  the `maTafdc` correction's; the sub-line says "(archetype)".

---

## What is right and should not be touched

- **Nothing is typed.** The source line reads policyengine-us 2.6.2 and the
  sweep date from the file; the coverage line's "In 2 states (NJ, WA)" is
  counted over every state's block; the county is `countyName(fips)` from
  the new table; the `$200` floor is core's `CLIFF_MIN`; the reach margin's
  index comes from `REACH_PERCENTILES`; each what-if's threshold uses its own
  curve's step. A fixer must not introduce a typed number.
- **The verdict in the caseworker register** (M2), the four tiles, and the
  "It happens again between $45,000 and $119,000" sub-line from the data;
  the tiles fall away when they do not apply (Massachusetts shows three).
- **CorrectionsApplied where the inventory puts it**, under the verdict,
  in the row shape with the source word as a tag; Colorado one row,
  Massachusetts three, Texas three, with the not-applying checks named
  below; "Coverage unknown" when the summary did not load (the builder's
  own second-review fix).
- **The ThresholdLedger under the one convention** — $55,000 for the
  subsidy, the SNAP remainder cited, the deferred badge dashed, every cite
  a sentence from the curve — and the drops ledger with the largest drop
  open first and driving the breakdown: one selection model, the row
  button carrying `aria-current`, the mark carrying `aria-expanded`.
- **Keyboard.** One tab stop for the chart; `]` and `[` move between marks;
  Enter opens the row and scrolls it into view; Escape closes it and returns
  focus to the mark (measured at both widths); the dialog returns focus to
  its chip on Escape and on Save (measured; Cancel takes the same path); the row button's 2px ring is intact
  inside the scroller.
- **The chips are real controls** — no lying `<span>`s: a toggle adds a
  what-if, a value opens a `<dialog>`, a fact opens the screen — and the
  chips return to the base after every press so the next press is one
  change; a duplicate is refused with a sentence.
- **The URL** carries the base and each what-if as a diff; landing on it
  evaluates 1 + N in parallel; a submit pushes, a landing replaces, so Back
  leaves the page.
- **The archetype state** drops the county from the chip, the summary and
  the source line, changes the source sentence and shows *Try again* — and
  nothing interrupts (M4).
- **The empty, loading and failed states are one line each**: the bar,
  the summary and a sentence — "Evaluating… net income is checked at 151
  pay levels", or the caution callout with *Try again* — no skeleton with
  holes (`loading-390.png`, `fail-390-busy.png`).
- **Type and space.** One family; 15px base, 13px floor honoured for every
  word including the SVG labels, 12px only on ticks and the merged mark's
  count; h1 hidden / h2 19 / h3 17; verdict 24 at 500 with a 40ch measure;
  tiles 30/600; every margin and padding on the `--s*` scale (bar 12/16,
  verdict 24/16, sections 32/12, panels 16, theme 48). Contrast: every
  small-text pair ≥ 4.75:1 light and ≥ 6.6:1 dark; the chip edge 3.49 /
  3.74. Tap targets: chips, marks, row buttons and the two actions all 44.
- **The sticky top row** is 69px at both widths and measures `top: 0` after
  a 600px scroll with the summary and inputs scrolled away (S1 done); the
  first draw animates once at 0.7s and reduced motion zeroes it, with no
  `matchMedia` in the page.
- **Print from dark is light** (B2 holds here, by the page's own override —
  see TODO 11), the handout is on its own page, the controls leave, and the
  two-column grid collapses to one.
- **The deliberate changes** in the builder's reports — the compare
  controls in a footer row so a column's name stays its name; the note
  appended on first use so it is a live region before it speaks; a redraw
  once per frame keeping a focused mark; the diamond on the line at an
  off-grid pay — all stand.

---

## TODO(system)

The places review's items 1–10, and whether this page is affected:

1. Hatch in the PDF path — **affected.** The coverage callout's inline
   `.hg-hatch-incomplete` swatch prints as the same smear: the PDF's drawing
   list for it holds only the outline stroke (`print-swatch-zoom.png`); on
   an incomplete state the caution callout leads with a blank square.
2. `charts.md` § 2 map role — not affected.
3. Open-row ground 1.08:1 — **affected.** The drops ledger sits on the
   plane; its open row measures 1.08:1 light, 1.21:1 dark, and the row's
   only mark is that tint (the chart's mark has a ring, the row does not).
4. Integer binning — not affected.
5. Child-care "under 6" vs core's ≤ 12 — **affected.** `model.ts:125`
   follows core (`CHILDCARE_MAX_AGE`); the mockup used `< 6`.
6. `--measure-wide` in `ch` — **affected.** At 1280 the curve caption runs
   86 characters a line, the compare note 80, the breakdown footnote 78.
7. core's notes written for a log — **affected**, and this is the page the
   inventory binds most tightly to them: Massachusetts's TAFDC row is a
   400-character sentence with a URL and "(policyengine-us #9469, fix in PR
   #9477)", Texas's coverage gap says "(evaluate.ts applyCoverageGap) —
   WORKAROUND", and the same strings repeat in the ledger footnote.
8. FilterRow — not affected.
9. `.hg-row-btn` on paper — **affected** (ten 44px rows on PDF page 3).
10. `--control-edge` on tiles — not affected.

New:

11. **`tokens.css:573`'s print block loses to its own OS-dark rule.**
    `:root, :root[data-theme] { color-scheme: light }` is specificity
    (0,1,0); `:root:not([data-theme="light"]) { color-scheme: dark }` under
    `prefers-color-scheme: dark` is (0,2,0) and wins whenever no theme
    attribute is set. Measured on this branch: `places.html` from an OS in
    dark mode prints ink `rgb(242,245,247)` on a white body; the caseworker
    page prints `rgb(18,23,28)` only because `caseworker.css:93` reasserts
    `color-scheme: light !important` (the builder's marked TODO). The places
    review's "B2 holds" was measured through the theme attribute, which the
    print block does beat. Fix in `tokens.css`: add
    `:root:not([data-theme="light"])` to the print selector list, or
    `!important` once, then delete the page's copy.
    *Resolved* (`tokens.css` on `main` `3e9e544`, the page in `3a86252`): the
    dark rule sits in `:where()`; the page's `!important` copy is deleted
    and the proof asserts no page override and `rgb(18,23,28)` ink from
    OS-dark (`measurements.json` `print`).
12. `.hg-scenario__note` needs `max-width: none` (`.hg-source`'s 76ch cap
    keeps it off its own line, N2), and `inventory.md` § ScenarioBar should
    say where the line sits — first in the row, so it is read before the
    chips it explains (S2).
13. `.hg-rows` needs a phone rule: below 520px the two columns stack
    (S9), on both pages that use it.
14. `inventory.md` § ScenarioBar should state the chip order a surface may
    pass (facts, take-up toggles, the rest) and the treatment of an unset
    value (S2), and name the editor's `copy` override as the way a surface
    sets its register (S1), as it names `actions` today.
15. `charts.md` § Direct labels needs the collision rule between a direct
    label and a mark's ring (S4), and § 1 needs a print rule for the
    caseworker curve — a fixed width on `beforeprint` (N6).
