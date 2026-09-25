# Design tasks

From a critique of the live site (2026-09-24), at 390 and 1280px, for the
household at `/?zip=94110&kids=3,7&pay=30000&unit=year`, `/places` and
`/caseworker`. Roughly in priority order within each group. Tick them off here.

## Every page

- [x] **Link the three pages.** Nothing links `/`, `/places` and `/caseworker`
      today, and the wordmark isn't a link. Make "HotGap" link to `/`; add a
      three-item nav beside it (For you · By state · For caseworkers) with
      `aria-current` on the current page; hide it on paper.
- [x] **Link to the next step in context.** Result → "See how your state
      compares" (`/places`, same household shape where one of the 11 map
      households matches). A `/places` state → "Try this for a real family"
      (`/?state=XX` with that shape). Caseworker → the plain-language view of the
      same household, to share with the client.
- [x] **One masthead.** The citizen and caseworker mastheads are full-bleed
      with large buttons; `/places` is inset with a small button. Build one
      shared masthead in `src/lib/`.
- [x] **Scroll fades only when something scrolls.** The grey fades at the
      left and right of the chart and the map show at 1280 when nothing
      overflows. Show them only when the content overflows.
- [x] **"Swipe" is a touch word.** "swipe to see more" shows to mouse users;
      say "drag or scroll" (or nothing) on a pointer device.
- [x] **Answer figures look like links.** The purple underline on the
      headline's dollar figures is also how "Español" says it's a link. Use a
      background highlight or colour instead of an underline.

## Chart (citizen and caseworker)

- [x] **Fit the y-axis to the curve.** It runs ~$15k–$100k while the line
      stays at $40k–$55k, so ~70% of the plot is empty and the $2,384 drop is a
      few pixels. Fit to the visible window (with hysteresis so it doesn't
      jump) or use a shorter, wider plot. The drops should look like drops.
- [x] **Label collisions.** Caseworker: the curve strikes through "TANF cash
      assistance ends"; "+$13,000" sits on the "you now" diamond and its "net
      $42,797" label. Citizen: "−$2,384 / cash help ends", the +$13,000 bracket
      and the curve stack up. Put the bracket above the zone and give labels a
      background halo.
- [x] **Label the keep-rate bracket.** "you keep 19¢ of each extra dollar"
      spans ~$27k–$55k with no ends marked; say it's the poverty line to twice
      it.
- [x] **Show the later cliff.** The headline says you're fine past $43,000,
      but the biggest drop ($7,100) is at $107,000 ("It happens again between
      $106,000 and $119,000" is only in a closed disclosure). Mark the later
      zone where the axis reaches it, and consider a clause in the answer.

## Citizen page

- [x] **One edit control.** "Change my answers" (top) and "Edit" (summary
      line) do the same thing. Keep one.
- [x] **Empty form shows result controls.** Before any answers, the masthead
      still shows "Change my answers", "Print" and "Edit". Hide them until
      there's a result.
- [x] **Drop the duplicate intro.** "Tell us about your home and we'll show
      you the answer" repeats the form's own lead.
- [x] **Form heading scale.** "If your pay goes up, do you keep more?" is
      ~18px against a ~32px answer headline; the first screen is the least
      confident on the site.
- [x] **Field widths match their content.** Pay is ~470px wide for a 5–6 digit
      number while ZIP and kids are narrow. Tighten the vertical gaps between
      groups too.
- [x] **One column when disclosures open.** "How to read this picture" is at
      chart width; the sections after it sit in a narrower, indented column
      that reads as nested.
- [x] **"Show the numbers" table** shows a scroll fade at 1280 though it fits
      (same fix as the scroll-fade task above).

## `/places`

- [x] **Controls above the map.** Household and Measure change the map and
      the headline ("a single parent of two children…") but sit below the map
      and "Select a state". Move them up, beside the headline or directly
      above the tiles.
- [x] **Measure select truncates** ("…twice poverty, the"). Shorten the option
      text or widen the control.
- [x] **Whole map on a phone.** At 390 the east coast (NY, NJ, MA…) is cut off
      until you swipe. 12 columns × ~28px fits; seeing the country at once
      matters more than tile size.
- [x] **Tile label contrast.** White labels on the lightest purple (WY, VA, DC,
      HI, FL) look low; measure and switch to dark ink where it fails.
- [x] **Use the width at 1280.** The map is ~60% of the column and the right
      side is empty, while the controls below span the full width.
- [x] **One legend.** The two swatches ("loses 105¢ / keeps 30¢") repeat the
      ends of the ramp directly above them. Keep the ramp.

## Caseworker page

- [x] Chart tasks above apply (y-axis, label collisions); the collisions are
      worst here.

# Accuracy and narrative tasks

From the data-science critique of the live site (2026-09-25). Each task names
the file, the change, and the words. Figures below are the committed sweep of
2026-09-24 and the household `/?zip=94110&kids=3,7&pay=30000&unit=year`.

## The `/places` headline

- [x] **Say what the family holds, under the sentence.** Add a second line to
      `figcaption#answer` (places/render.ts, new key `places.answer.holds`),
      rendered from `answersFor(state, archetype)`'s `gets*` flags and
      `monthlyChildcare > 0`: *"Every state's rules applied to the same
      family: renting at the county's typical rent, paying centre-based care
      for both children, and getting the child-care subsidy, SNAP, TANF,
      Medicaid and WIC."* Drop the care clause for households that pay no
      care. This is the line that turns "a single parent of two" into the
      household the number is true of. *Done: `#answerHolds`, answer.ts
      `holdsText`; the subsidy is named only beside a care bill.*
- [ ] **Name the road's span in the measure.** `places.measures.keepRate.describe`
      and the `howTo.measure` line: *"Of each extra dollar earned from the
      poverty line ({lo}) to just past twice it ({hi})…"*, `lo`/`hi` from the
      selected household's `roadLo`/`roadHi` (they differ for AK/HI and by
      household size). Same slots in `citizen.chart.labels.roadFrom/roadTo`
      → *"poverty line $27,000"* / *"2× poverty $55,000"* where there is room.
      *Places half done (model.ts `describeFor`/`roadSpan`, the modal span
      with "higher in Alaska and Hawaii"); the citizen labels remain.*
- [x] **Report the boundary sensitivity, and rank on the robust figure.**
      pipeline/src/metrics.ts: add `keepRateToLine` = the slope from `roadLo`
      to `hiStart` (the road without its one-step allowance). Measured today
      it keeps 20 of the 26 negative states negative and flips DE, DC, MA, OR,
      PA, VA; WI −105¢ → −13¢, CO −97¢ → −10¢, NJ −94¢ → −2¢. Then:
      - `places.answer.keepRate.some`: *"In {bad} of {places} … ends up poorer
        than they started — {strict} of them before the step out of twice
        poverty."*
      - `places.method.items.road`: add *"Measured to exactly twice poverty,
        {strict} states are negative rather than {bad}; the difference is
        states whose child-care or SNAP exit sits on that line."*
      - Rank strip: keep the ranking on `keepRate` but print `keepRateToLine`
        in a second, lighter column so a reporter sees which top-ranked states
        are one boundary step.
      Alternative, if the extra column reads as noise: move `ROAD_TO` to 2.5
      (road.ts) so an exit at 200% is interior, rename the group *"From the
      poverty line to 2½ times it"*, and re-sweep. Prefer the first: it keeps
      every saved link's definition and shows the fragility instead of hiding it.
      *Done the first way: `keepRateToLine` in core road.ts `roadSummary` and
      StateMetrics, summary.json rebuilt offline (`npm run pipeline --
      --from-data`; 26 negative, 20 strict), the rank strip's lighter "to the
      line" figure, a table column and `keep_rate_to_line_cents` in the CSV.*
- [ ] **Make the subsidy start when the parent actually works.** The sweep
      sends `hoursPerWeek: 40` at every pay, so PolicyEngine's activity test
      passes at $1,000 a year and the subsidy switches on with the first
      dollar (CA: net $26,684 at $0 → $57,512 at $1,000). In
      core/src/archetypes.ts `answersFor`, and in the sweep runner, derive
      hours from pay at the state's minimum wage (minWage.ts), capped at 40,
      and let the care bill follow the same hours (a parent working 10 hours
      does not buy full-time care). Until the re-sweep, caption the jump:
      `places.curves.cap` gains *"The step at the first dollar is the
      child-care subsidy starting when the parent works."* when
      `points[1].programs.childcare > 0 && points[0].programs.childcare === 0`.
      *Caption interim done (`places.curves.firstDollar`, flagged per state by
      the vite curves plugin: CA, DC, IL, IN, WA for a single parent of two);
      the hours change needs a re-sweep.*
- [x] **A "no child-care help" twin for the default household.** Add
      `single-2-nosub` (subsidy off, same care bill — the family that pays and
      is not served, which is most of them) to ARCHETYPES for the sweep only:
      51 more cells, a tenth of the run. Household menu label *"1 adult, 2
      children (3 and 7), no child-care help"*. The pair lets a reporter
      subtract the subsidy's exit from the state's rules, which is the
      question the headline raises. *Done in code (`single-2-nosub`,
      `subsidy: false`, never picked for a live household); its cells fill on
      the next sweep — until then summary.json does not list it and the menu
      does not offer it.*
- [x] **State the rationing rule consistently.** `places.method.items.takeUp`
      says Head Start and housing are off because they are rationed; CCDF is
      rationed too. Rewrite: *"The child-care subsidy is on for this run
      although, like Head Start and housing vouchers, it reaches a minority of
      eligible families: its exit is the largest cliff most working parents
      of young children face, and a map without it understates every state.
      The twin household above shows the family without it."* *Done; the
      twin sentence is shown only once a run carries the twin.*

## Danger-zone sentences

- [x] **Citizen: a sentence for the family already inside the zone.**
      citizen/verdict.ts `verdictKey`: split `in_danger_zone` on whether a
      cliff's `endEarnings` ≤ `s.current` lies inside `s.zone`. At the peak
      (no drop behind): keep *"More pay won't leave you better off until…"*.
      Inside (new key `in_danger_zone:inside`): *"You're past a drop at
      {wage}. From here to {exit} you keep about {cents}¢ of each extra
      dollar; at {exit} you're back to what you'd have kept at {peak}."*
      Slots: `wage` = that cliff's `endEarnings`, `cents` =
      `keepRate(points, current, exit)` (core road.ts) in whole cents,
      `peak` = `zone.startEarnings`. SF today: *"You're past a drop at
      $29,000. From here to $43,000 you keep about 20¢ of each extra dollar;
      at $43,000 you're back to what you'd have kept at $28,000."*
      Stuck variant: *"…and nowhere we looked, up to {top}, gets you back to
      what you'd have kept at {peak}."*
- [x] **Caseworker: count the steps instead of "every raise".**
      `caseworker.answer.inZone` → *"Net stays below its {peak} peak (at
      {start}) until {exit}: {nLose} of the {nSteps} steps between them lose
      money; {raise} clears the stretch."* `nLose` =
      `cliffsBetween(cliffs, start, exit).length`, `nSteps` = (exit −
      start)/step. Today: *"Net stays below its $44,985 peak (at $28,000)
      until $43,000: 3 of the 15 steps between them lose money; $13,000
      clears the stretch."* `inZone:stuck` likewise with "past the axis".
- [x] **Captions say what shading is.** `places.curves.lead/cap`,
      `citizen.key.band/other`, `caseworker.howTo` key: *"Shaded: where the
      family has less than it had at a lower pay"* (never "where a raise
      leaves the family worse off"). Define *danger zone* once, in both
      glossaries: *"a stretch of pay where net income stays below an earlier
      peak."*
- [x] **"On average" on the road label.** `citizen.chart.labels.road.*` and
      core `road.rate`: *"on average you keep {cents}¢ of each extra dollar"* /
      *"keeps {cents}¢ of each extra dollar on average"*. The rate is a slope
      across a cliff and a recovery, not a rate at every dollar.

## Cliff-first verdicts

- [x] **Lead with the next-stretch rate; the cliff is the second clause.**
      Every citizen verdict opens with `keepNextText`'s figure and the cliff
      follows. `cliff_ahead`: *"Of the next {over} you earn you'd keep about
      {kept}. Nothing drops sharply until {wage}; past it you'd lose about
      {drop} a year{worst}."* where `{worst}` = *", and the biggest drop is at
      {worstAt}, past what {n} in 10 families like yours earn"* when
      `s.worst !== s.next` (position from `worst.position`; omit the company
      clause when null). Texas today: *"Of the next $10,000 you earn you'd
      keep about $3,100. Nothing drops sharply until $51,000; past it you'd
      lose about $900 a year, and the biggest drop is at $107,000, past what
      8 in 10 families like yours earn."* `always_up` and `cliff_behind` get
      the same first clause. Delete the separate keepNext line from the step
      list once it is in the headline.
- [x] **A dip is not a permanent cost.** New key `cliff_ahead:dip` when the
      zone that starts at the next cliff closes within three steps
      (`zone.endEarnings − zone.startEarnings ≤ 3 × step`): *"…at {wage} you'd
      dip by about {drop}, and be ahead again by {exit}."* Single adult in CA
      today: *"…at $63,000 you'd dip by about $900, and be ahead again by
      $65,000."* Same rule in `caseworker.answer.cliffAhead`.
- [x] **Only drops are cliffs in the step list.** `citizen.steps.lead` →
      *"The pays where help stops. The ones with a figure are drops — people
      call those benefits cliffs. The rest taper off and cost nothing in one
      step."* Rows without a cliff lose "would end" for a phase-out and take
      the caseworker's wording: *"A tax break for workers phases out here —
      the EITC. No drop."* (steps.ts: `c.cliff ? … : phaseOut`).
- [x] **Take-up under the citizen headline, not three disclosures down.**
      citizen/result.ts: one `hg-source` line under the answer, from
      `modeled` flags: *"Counting the help you get: SNAP, TANF cash, Medicaid
      and WIC. Not getting one of these? [Change my answers]"* — the link
      opens the editor at the take-up chips. When the first cliff ahead is a
      program the family may not hold (TANF: about one in five poor families
      nationally), the row in the step list says *"if you get it"*.

## One name per rate; the household travels with the link

- [x] **Three rates, three labels.** Road rate stays *"on the road out of
      poverty"* everywhere it appears. Citizen next-stretch rate: *"of your
      next {over}"*. Caseworker compare row `R.keep` → *"Of each extra dollar,
      now → this what-if"*, and the base cell shows the base's own next-stretch
      rate (`keepNext`, *"keeps 12¢ of the next $10,000"*) instead of a dash
      (caseworker/model.ts `compareRows`, line 341).
- [x] **"Try this for your own family" opens the same family.**
      places/url.ts `tryItHref`: pass the archetype's `rent`, `childcare` and
      `childcare-subsidy` flags (`searchParamsFromFlags` already carries them)
      so the citizen page opens on the swept household and the editor shows
      what to change. Label: *"Try this family in the household tool"*.
- [x] **"See how {state} compares" says the household changes.**
      `citizen.toPlaces` gains a sub-line on the live path (`ev.source ===
      "live"`): *"The map's family rents at the typical price and gets
      child-care help, so its numbers differ from yours."* Omit on the
      archetype fallback, where they are the same family.

## The pictures

- [x] **Fit the y-axis to the household's own stretch.** lib/chart/geometry.ts
      `stableSpan` is called with the whole-curve safe exit (`s.safeExit ??
      s.exit`), so the SF axis runs $15k–$100k for a $42k–$47k story. Call it
      with the household's own exit and next cliff:
      `stableSpan(s.window, Math.max(s.exit ?? 0, s.next?.endEarnings ?? 0) || null, s.top)`
      in citizen/geometry.ts `layout` and caseworker/chart.ts. The 2.5× rule
      still holds against the whole curve's biggest drop, so the far zone
      scrolls in on a clipped line rather than flattening the near one.
      Expected: SF range ≈ $38k–$50k, the $2,384 drop ≈ 60px; caseworker
      caption goes from "17.0×" to about 3×.
- [x] **Small multiples show the road, ordered by the measure.**
      places/curves.ts: a `road` mode for `renderCurves` — x from $0 to
      `roadHi + 10k`, y = `net − net(roadLo)` on one shared range, a zero rule
      at the poverty-line level, the road bar, the zones. Order the buttons by
      the selected measure's ranking (pass `g.ranked` + `g.past/none/incomplete`
      from render.ts) with the rank number before the name, and set
      `data-class` on the button so the name takes the tile's ink. Lead:
      *"Each line is what the family keeps, relative to what it keeps at the
      poverty line, from $0 to {hi}; a line below the rule is a family poorer
      than it was at the poverty line. In the map's order."* The large
      selected-state curve keeps the full axis.
- [x] **Step widths on the scale itself.** places/render.ts scale labels:
      under each arm one tick caption, *"steps of 26¢"* / *"steps of 15¢"*,
      so the unequal widths are read where the colours are, not in the
      How-to disclosure.
