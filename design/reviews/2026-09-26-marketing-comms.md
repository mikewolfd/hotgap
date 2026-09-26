# HotGap — marketing & communications review (blind, pre-launch)

Reviewer: senior marketing/comms lead. Judged only what a reader sees at http://localhost:8787 on 2026-09-26, desktop 1280×900 and phone 390×844, English and Español. Screenshots and text dumps: `reviews/mk/`.

## Summary

1. The household page (`/`) is the strongest thing here: one question, one sentence, one picture, and it never tells a family what to do. Keep that spine.
2. The by-state page (`/places`) will be quoted, and its headline number (26 states) is the one the page's own method note says is the softer of two counts (20 vs 26). The assumption that decides it — the family gets child-care help — is in small grey type, not in the sentence a journalist copies.
3. Jargon lives in three dialects on `/places`: the menu says "Cents kept of each extra dollar", the legend says "Keep rate on the road out of poverty", the table says "Keep rate". "Danger zone", "the leap", "safe exit", "deferred", "past the axis", "collapses" are all met before they are defined.
4. On `/` the first number a reader sees is "you keep $42,797" against pay of $30,000. The one line that makes that believable ("The line is more than your pay because help and tax credits count towards it") is hidden inside a closed panel. Readers will distrust the picture before they open it.
5. Nobody says who HotGap is. No About, no organisation, no contact, no footer on any of the three pages. For a policy tool asking for a ZIP code and pay, that is the missing trust signal.

Severity scale: **blocker** = would misinform or lose a reader before launch; **major** = fix before press; **minor** = polish.

---

## RED TEAM

### 1. `/places` — the headline number is the one the method says is the softer count. (blocker)

Headline: *"In 26 of the 50 states and the District of Columbia, a single parent of two children climbing from the poverty line to twice it ends up poorer than they started — 20 of them before the step out of twice poverty."*

Far down the page, in "How these numbers were made": *"Measured to exactly twice poverty, 20 states are negative rather than 26; the difference is states whose child-care or SNAP exit sits on that line."*

What a reader takes away: "26 states." What a journalist tweets: "In 26 states a single mom who doubles her pay ends up poorer." The page itself admits 6 of those 26 turn on a one-step allowance the reader cannot see. The clause meant to hedge it ("20 of them before the step out of twice poverty") is not English a first-time reader can parse — "the step out of twice poverty" is an internal concept. When Household = "2 adults, both working, 2 children" the clause becomes "In 20 … — 20 of them before the step", which reads as a bug.

Fix (in the tool's voice): lead with the defensible number and say the rest plainly.
> *In 20 of the 50 states and DC, a single parent of two who climbs from the poverty line to twice it ends up with less than they started with. Count the last $1,000 step and it's 26.*

And drop the dash-clause when the two counts are equal.

### 2. `/places` — the assumption that makes the headline true is not in the headline. (blocker)

The subhead, small and grey: *"Every state's rules applied to the same family: renting at the county's typical rent, paying center-based care for both children, and getting the child-care subsidy, SNAP, TANF, Medicaid, and WIC."*

The method note, far below: *"The child-care subsidy is on for this run although, like Head Start and housing vouchers, it reaches a minority of eligible families."* And the state readouts: *"Wisconsin … The road collapses at $54,000, where CCDF child care subsidy ends and the family loses $25,833 in one step."*

So the whole map is mostly a map of where the child-care subsidy ends, for a family that in most states does not get it. A tweet built from the headline says "single parents end up poorer" with no "if they get child-care help". That is not a fair tweet, and the page enables it.

Fix: put the condition in the sentence that gets copied.
> *… a single parent of two who gets child-care help and climbs from the poverty line to twice it ends up with less.*
And in the state readout: *"where child-care help ends"* not *"where CCDF child care subsidy ends"*.

### 3. `/places` — "keeps $80,163 at the poverty line" will be quoted as absurd. (major)

Wisconsin readout: *"from $80,163 at the poverty line to $50,801 at twice it."* Measure "Money kept at the poverty line": *"keeps least in Oklahoma ($52,157 a year) and most in Vermont ($88,959)."*

A reader sees a family paid $27,000 "keeping" $80,000 and either stops believing the tool or writes "Vermont hands poverty-line families $89,000". The figure counts the sticker value of child-care help (and school meals) as money kept. Nothing near the number says so; on `/` the same idea is at least stated ("$1,131 of it is free school meals, not cash").

Fix: everywhere a level is shown on `/places`, add the qualifier once, close to the figure:
> *Money kept counts the value of help, including child care paid for the family — it isn't cash in hand.*
And consider renaming the two level measures *"What the family has at the poverty line (help counted)"*.

### 4. `/` — "you keep $42,797" on $30,000 pay, with the explanation hidden. (major)

Chart label: *"you keep $42,797, help counted"*. Headline: *"You're past a drop at $29,000."* The sentence that makes $42,797 believable — *"The line is more than your pay because help and tax credits count towards it. $1,131 of it is free school meals, not cash."* — is inside the closed panel "How to read this picture".

A parent paid $30,000 who sees "$42,797" thinks: that's not me, this is wrong. That is the moment they bounce, and it happens above the fold. "help counted" is doing too much work in two words.

Fix: promote the one sentence out of the panel, under the chart, before "Move along the line for any pay":
> *The line is more than your pay because it counts the help and tax credits you get. $1,131 of it is free school meals, not cash.*

### 5. `/` — "Counting the help you get" lists help the household doesn't get, and lists WIC for an adult with no kids. (major)

Under the headline on every result: *"Counting the help you get: SNAP, TANF cash assistance, Medicaid, and WIC."* Then in "What we assumed": *"We counted each one as if you get it."*

Two problems. (a) "the help you get" asserts; the assumption panel says "as if". The CA parent at $30,000 is already past the TANF cut-off, so the tool says it is "counting" help she cannot be getting. (b) `/?zip=94110&pay=20000` — a single adult, no kids — is told the tool counts *"food help for moms and babies (WIC)"*. That reads as a bug to a reader, and to a reporter as sloppiness.

Fix:
> *We count help you could get: SNAP, TANF cash assistance, Medicaid, and WIC. Not getting one of these? Change my answers.*
And do not list WIC for a household with no children under five (or say "if there's a baby on the way").

### 6. `/places` — three names for the same measure, and none defined where first met. (major)

- Menu: *"Cents kept of each extra dollar"*
- Legend/How-to: *"The map shades Keep rate on the road out of poverty"*
- Ranking: *"Ranked: Keep rate on the road out of poverty, most regressive first"*
- Table column: *"Keep rate"*, *"Keep rate to the line"*
- Readout: *"keeps 9¢ of each extra dollar on average climbing out of poverty"*

Same for the rest: menu *"Raise needed to get clear"* → table *"The leap"*; menu *"Pay where raises stop losing money"* → *"Safe exit"*; menu *"Losses that hit later, at renewal"* → *"Deferred"*; menu *"Pay of the worst loss"* → *"Where the road collapses"*. "Danger zone" appears in the headline for measure 5 and 8 and is defined only in the How-to panel, in the last paragraph. "Regressive" is tax-policy vocabulary. "past the axis" is a charting term shown as a table value.

The menu names are the good ones — they are how a person thinks. The rest is the engine's vocabulary leaking.

Fix: one name per measure, the menu's, used in the legend, the ranking title, the table header and the readout. E.g. table header *"Cents kept per extra dollar"*, *"Raise needed to get clear"*, *"Pay where raises stop losing money"*, *"Losses that hit at renewal"*. Replace "most regressive first" with *"worst first"*. Replace "past the axis" with *"beyond $150,000"* (the reader already knows the scale).

### 7. `/places` — "How to read this map" is written to the developer, not the reader. (major)

> *"The flag is read from the run's own coverage record, not from a list kept here, so a state drops off it the day the engine starts modelling the program."*
> *"Those cells read past the axis here and must not be charted as a value."*
> *"the leap is a lower bound only when the worst zone is the one that runs off. The two can differ, so a state can show an exact leap and no safe exit."*

This is a changelog, not a caption. A journalist opening "How to read this map" gets told what not to chart before being told what the colours mean. It also undercuts the trust the page earns elsewhere — it sounds like the tool is arguing with itself.

Fix: keep the two rules that matter to a reader, in their voice, and move the rest to the "How these numbers were made" section:
> *Hatched states are missing a program the model can't compute there, so their numbers are floors. Don't read hatched as gentler.*
> *"Beyond $150,000" means we stopped measuring before the last drop closed — it's a bound, not a number.*

### 8. All three pages — nobody says who HotGap is. (major)

There is no About, no organisation name, no contact, no footer, no privacy page, no date on `/`. The only identity is *"Source: HotGap, from PolicyEngine with 2026 rules"* and the licence line at the bottom of `/places`. A parent typing in a ZIP code and their pay, and a reporter deciding whether to cite, both look for "who made this". They won't find it. The one trust line that exists — *"We don't save what you type. No sign up, no tracking."* — is excellent and sits under the form only.

Fix: a two-line footer on every page: who built it, who runs the numbers, how to reach you, and the "we don't save what you type" line repeated. Add "Updated Sep 24, 2026" to `/` too (it is on `/places`).

### 9. `/` — what does a parent do next? (major)

The page ends: *"We don't tell you what to do."* Good sentence, but the only actions on the page are Print, Change my answers, and a link to the map. A parent who has just learned that a raise to $37,000 costs her $600 has nowhere to go: no "show this to your caseworker" (the caseworker page exists and even has a "client sheet"), no "who can help me apply", no "what to ask your employer". The tool has the pieces and doesn't join them.

Fix: one short block after "Show the numbers":
> *What you can do with this*
> *Print it and take it to your caseworker or a benefits helper — they decide what you really get. If you're near a drop, ask about a raise that clears it: for you that's $43,000.*

### 10. `/` — "flat stretch", "flat again", "Waits", "back to even", "safe from here" are met before they are explained. (major)

- Dallas chart at $51,000: a hatched band labelled *"flat again"*. The legend (closed panel) calls the band *"Other flat stretches"*; the table calls the top of it *"The top of your flat stretch"*. Nowhere says what "flat" means, and the band is not flat — it's a dip.
- Chips reading *"Waits"* on the $73,000 and $5,000 rows; the legend key is *"A drop that waits"*. On its own, "Waits" looks like a typo.
- "back to even" and "safe from here" work on the chart, but "safe" is a strong promise for an estimate.

Fix: rename the concept once — *"a stretch where a raise doesn't help"* — and label the band *"raises don't help here"*. Change the chip to *"Comes later"* and keep the explanation that follows. Change *"safe from here"* to *"no more drops from here"*.

### 11. `/` headline — "You're past a drop at $29,000" is ambiguous. (minor)

At $30,000 the reader is told they are "past" a drop. Half will read "you already fell", half "you've gone past it, you're fine". The rest of the sentence rescues it, but the first four words set the mood. Also: headline *"about 20¢"*, chart *"on average you keep 19¢"* — same screen, two roundings.

Fix: *"A drop hit at $29,000 and you're still under it. From here to $43,000 you keep about 20¢ of each extra dollar…"* and round the chart label the same way as the headline.

### 12. `/` — "The lowest legal pay" quietly contradicts "we assumed full time". (minor)

*"You didn't say, so we assumed full time."* then *"The lowest legal pay in California is $16.90 an hour, and full-time work at that pay is about $35,000 a year."* The reader is paid $30,000. The tool has just told her she is paid below the legal minimum, without saying so or asking about hours. It is useful context in the wrong place.

Fix: move it to the hours assumption: *"At 40 hours a week, $30,000 is under California's lowest legal pay ($16.90 an hour). If you work fewer hours, tell us and the picture changes."*

### 13. `/caseworker` — headline reads like a debugger, and "Net" is never defined. (minor)

*"Net stays below its $44,985 peak (at $28,000) until $43,000: 3 of the 15 steps between them lose money; $13,000 clears the stretch."* Then *"Reach at current earnings 38th percentile, ±$2,500 (n = 2887)"*. Caseworkers are pros, but "Net", "steps", "Reach", "n =" are the engine's words. The link *"Open the plain-language page to share with the client"* concedes this page isn't plain. That's honest but a shame, since the page is otherwise superb (see Green).

Fix: *"This family has less at $30,000 than it had at $28,000, and doesn't get back to that until $43,000. Three of the fifteen $1,000 raises in between lose money."* Define reach where the number is: *"38 in 100 families like this earn less."*

### 14. Español — good, with a handful of register slips. (minor)

The translation is genuinely fluent and keeps the second-person voice. Slips a native reader will notice:
- *"de media"* (Spain) → *"en promedio"* for a US audience. Appears on the chart and the caseworker page.
- *"Deslice el dedo por la línea"* on desktop — there is no finger. English says "Move along the line". → *"Recorra la línea para ver cualquier sueldo."*
- *"Si su pago sube"* / *"Su pago"* (table) vs *"sueldo"* elsewhere. Pick *sueldo*.
- *"30 años, ciudadano de EE. UU."* — masculine, for *"una madre o un padre"*. → *"ciudadanía de EE. UU."*
- *"California Premium Subsidy"* left in English under "Ayuda con el plan de salud".
- Chip *"Espera"* for "Waits" — reads as an imperative ("Wait!"). → *"Llega después"*.
- *"precipicios de beneficios"* is fine; consider *"abismos"*, the term used in Spanish-language coverage.
- Chart: the *"2×"* axis label is clipped at the right edge in Spanish (`es-home-sf.png`), and "de vuelta a la par" sits on the frame.

### 15. Page names — "For you" doesn't say which page is mine. (minor)

"For you / By state / For caseworkers". A parent, a reporter and a caseworker land on the same nav. "For you" is warm but empty: the reporter doesn't know "By state" is theirs, and the parent may click "For caseworkers" thinking that's where the real answer is. The Spanish nav ("Para usted / Por estado / Para trabajadores sociales") has the same shape.

Fix: *"Your household / By state / For caseworkers"* — or keep "For you" and give `/` a one-line subtitle on the empty form: *"For a family. Reporters: see By state. Caseworkers: see For caseworkers."*

### 16. `/places` legend — "steps of 26¢" and no good/bad cue. (minor)

The scale runs −105¢ to +30¢ in "four steps of 26¢ below zero and two of 15¢ above it". Odd widths make readers doubt the binning. Nothing says purple = family loses, orange = family keeps; readers infer it from the headline. Under "1 adult, no children" the whole map is orange and the legend still starts at −105¢.

Fix: label the ends: *"loses money on the climb"* / *"keeps money"*; round bins to 25¢ where possible; recompute the legend range per household (it seems to already; then the "steps of" line should go).

### 17. `/places` readout — "The road collapses" / "loses 105¢ of each extra dollar". (minor)

*"Wisconsin — loses 105¢ of each extra dollar on average"* — losing more than a dollar per dollar is true but reads as a typo. *"The road collapses at $54,000"* is dramatic and undefined.

Fix: *"For every extra dollar earned between the poverty line and twice it, this family ends up $1.05 worse off"* and *"The biggest drop on the climb is at $54,000"*.

### 18. Housekeeping. (minor)

- `/favicon.ico` 404s on every page (console error in `home-empty.txt`).
- "Cite as" on `/places` includes the current URL — fine in production, but check it's the canonical host, not whatever the reader's address bar says.
- "Four questions" on the empty form: four groups, six fields. Defensible; a stickler will count.

---

## GREEN TEAM — what works and must survive any rewrite

**The question and the promise.** *"If your pay goes up, do you keep more?"* / *"Four questions. We work out your help at every pay level and show you what happens."* This is the best headline in the benefits-cliff space: no jargon, second person, one verb. Do not let anyone add "benefits cliff calculator" to it.

**The privacy line.** *"We don't save what you type. No sign up, no tracking."* Under the button, where the doubt is. Keep the wording exactly; repeat it in a footer.

**The three humility sentences on `/`.** *"These are estimates. A case worker decides what help you really get."* / *"We don't tell you what to do."* / *"Change any of these and the picture changes. If something here is wrong for you, the numbers are wrong too."* Together these are the tool's ethics. A rewrite that softens them into boilerplate loses the thing that makes it trustworthy.

**The program naming pattern.** *"Food help would end — it's called SNAP."* / *"Cash help ends, if you get it — it's called TANF cash assistance."* / *"Your kids' free state health plan phases out here — it's called Medicaid. It doesn't end that day: your kids keep it until their next yearly check, up to 12 months later."* Plain name first, official name second, consequence in one line. This is the pattern for every program on every page.

**"past what 8 in 10 families like yours earn."** The one phrase that stops a parent panicking about a $7,059 drop at $107,000. Also the Dallas headline: *"the biggest drop is at $107,000, past what 9 in 10 families like yours earn."* Keep the framing "families like yours" — never "the median".

**The Dallas headline as the model.** *"Of the next $10,000 you earn you'd keep about $3,100. Nothing drops sharply until $51,000; past it you'd lose about $900 a year…"* Concrete money, a safe horizon, then the risk. This is a better template than the SF "You're past a drop" opening.

**The sticky answer line.** *"A parent with kids aged 3 & 7 in California, paid $30,000 a year."* + *"Change my answers"*. The reader always knows what the picture is of and how to fix it. The Spanish *"Una madre o un padre con niños de 3 y 7 años…"* is equally good.

**The LIHEAP honesty.** *"It's worth $283 to $594 a winter if you get it. About 1 in 10 families here who could get it do. If you get it, turn it on and we'll put it in your line."* This is how to handle a benefit most people don't receive without either ignoring it or overstating it.

**"How common is this pay?" and its disclaimer.** *"This says how common the pay is. It doesn't say what you'll earn."* Pre-empts the exact misreading a stats-anxious reader would make.

**The cross-links with caveats.** *"See how California compares with other states — The map's family rents at the typical price and gets child-care help, so its numbers differ from yours."* and, on the map, *"Try this family in the household tool."* Both directions, each warning the reader the family changes. Rare and right.

**On `/places`, three method sentences that should be quoted by every reporter.** *"A cliff matters in proportion to how many families stand near it: the largest cliff in a state is usually one few families reach, and the one that hurts is the modest one at the income most families have."* / *"A high keep rate is not a generous state. It says raises are allowed to add up, not how much the family has."* / *"Hatched is not low."* These are the guardrails against the bad tweet — they just need to be nearer the headline.

**The run stamp and the download.** *"Estimates only. PolicyEngine 2026 rules, run of Sep 24, 2026."* on the map; a CSV with every column named; a cite-as line. That is how a newsroom decides a source is safe.

**The caseworker page's "Where the $7,059 went."** Benefits / Credits / Premiums / Other, summing exactly to the drop, with *"A share right of zero adds to the loss; one left of it offsets the loss — here, a falling tax bill."* This is the clearest single explanation of a cliff on the site. Consider a plain version of it on `/`.

**The picture itself.** Hatched band for "raises don't help here", a labelled +$13,000 bracket to "back to even", poverty line and 2× poverty on the axis, the "you keep $42,797" marker with the vertical rule. At a glance the story is: you're in a hole, here's how wide it is. Keep the design; fix the words around it (findings 4 and 10).

**Spanish nav.** *"Para trabajadores sociales"* is the right term; *"Cambiar mis respuestas"*, *"Ver mi respuesta"*, *"No guardamos lo que escribe. Sin registro y sin rastreo."* are all natural.

---

## Top five changes

1. **`/places` headline:** lead with 20, not 26, and put "who gets child-care help" in the sentence a journalist will copy. (Findings 1, 2)
2. **`/` above the fold:** move "The line is more than your pay because it counts the help and tax credits you get" out of the closed panel to directly under the chart. (Finding 4)
3. **One name per measure on `/places`,** the menu's, used in legend, ranking, table and readout; rewrite "How to read this map" for a reader, and move the developer notes to the method section. (Findings 6, 7)
4. **Fix the "Counting the help you get" line:** say "help you could get", and stop listing WIC for households without young children. (Finding 5)
5. **Add a footer on every page** (who HotGap is, contact, run date, the "we don't save what you type" line) and a "what you can do with this" block on `/`. (Findings 8, 9)
