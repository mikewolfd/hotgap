# HotGap on a phone: swipe, tap, scrub

The owner's rule, verbatim: *"Make sure all the graphs are mobile friendly,
i.e. they swipe and that the hitboxes are the right size and stuff."*

Read as three requirements — every wide figure moves under a horizontal
finger without taking the page's vertical scroll; every tappable thing is at
least 44×44 CSS px (WCAG 2.5.5); and the things a phone user meets that a
laptop user never does. Measured first, fixed second, and the measurement is
`app/e2e/touch.spec.ts`, which is now the sixth Playwright suite and is green.

Chromium mobile emulation at **Pixel 7** (412×915, 2.625×) and **iPhone 14**
(390×664, 3×), `hasTouch`, `isMobile`. Households: the California parent with
a 3- and a 7-year-old at $30,000 (citizen), the El Paso County parent at
$38,000 with rent and child care (caseworker), and the journalist page's
default single parent of two.

**WebKit was not available.** `webkit.launch()` against the cached Playwright
at `~/.npm/_npx/86170c4cd1c5da32` fails: *"Executable doesn't exist at
…/ms-playwright/webkit-2272/pw_run.sh"*. This pass does not install browsers,
so both phones ran under Chromium. What that covers is the viewport, the
device pixel ratio, the layout and every hit area; what it does **not** cover
is WebKit's own gesture engine, so `overscroll-behavior-x` and
`-webkit-overflow-scrolling` below are proved as computed values rather than
as behaviour. Named so the gap is a known gap.

---

## How it was measured, and what the measurement could not see

Three questions, three instruments, because one instrument answering all
three would have been agreeing with itself.

| question | instrument | what it is blind to |
| --- | --- | --- |
| Who actually receives a tap here? | `document.elementFromPoint`, binary-searched outward from each target's centre in four directions | the box itself: it reports a winner, never a collision, and snaps to device pixels (±1.5px, § the tolerance) |
| Does the browser pan this? | CDP `Input.synthesizeScrollGesture`, `gestureSourceType: "touch"` | anything a script does; it is the real gesture recognizer and honours `touch-action` |
| Does the page hear the finger? | CDP `Input.dispatchTouchEvent` | panning — it never scrolls anything, which is why it cannot prove a scroller scrolls |

**Two controls, and both earned their place.**

1. *The same swipe over plain prose must scroll the page.* The first run
   reported that nothing scrolled anywhere — the curve, the tables, the page.
   The control said the tool was wrong, not the site: CDP's distances are the
   **content's**, so a positive `yDistance` scrolls the page *up*, and
   `yDistance: 200` at the top of a document is a no-op that reads exactly
   like a page that refuses to move.
2. *A `gestureSourceType: "mouse"` wheel over the same pixel.* Where a finger
   moved the curve 0px, the wheel moved it 180. That single pair is the whole
   diagnosis of B1: the scroller was fine, and `touch-action` was refusing
   the finger.

**A third thing the first draft got wrong, and the shape of the error is
worth keeping.** Overlap was first computed from positions recorded *during*
probing — but probing scrolls each target to the centre of the screen, so
every target's centre was the same point and the proof reported 22 collisions
on a page that had none. An internally consistent result is what a clean
result looks like; the fix was to record every position in one frame, before
anything scrolled, and to re-derive overlap by geometry rather than by the
hit test, which can only ever name the winner.

**The tolerance.** The probe is exact about who wins a tap and loses up to
1.5px to device-pixel snapping, its own 0.05px search floor and the half
pixel `getBoundingClientRect` gives up to rounding. `getBoundingClientRect`
is exact about the box and blind to anything painted over it. So a target
passes when the probe alone clears 44 (an enlarged hit area), **or** when its
own box clears 44 and the probe agrees the box is not covered. A 44.0px map
tile probes 43.0 and is not a finding; a 44px mark that probes 0 is.

---

## B — blocking

### B1. Neither money curve could be swiped at all

The rule the scroll rule of 2026-09-17 exists for — *"everything the crop
threw away is a swipe either side"* — was unreachable by the one input most
readers have. A horizontal touch swipe anywhere on the plot moved it 0px, on
both surfaces and both phones. A mouse wheel over the same pixel moved it
180px.

The cause was one declaration in `tokens.css`:

```css
.hg-chart svg { … touch-action: pan-y; }
```

right for a chart that was a fixed crop, where a sideways drag could only be
a scrub; wrong from the moment the curve became a scroller. `touch-action` is
the **intersection** of the whole ancestor chain, so `pan-y` on the plot beat
`pan-x pan-y` on `.hg-chart__scroll` around it. The stylesheet said the right
thing in one place and the wrong thing in another, and the wrong one won.

| | before | after |
| --- | --- | --- |
| citizen plot, horizontal swipe | `scrollLeft 159 → 159` | `159 → 340` |
| caseworker plot, horizontal swipe | `207 → 207` | `207 → 388` |
| citizen plot, vertical swipe | page `scrollY 0 → 201` ✓ | unchanged ✓ |

### B2. Cliff marks stacked on each other; one was unreachable

Every mark was a 44px button centred on its dot, and where two cliffs are
closer than 44px on the axis the buttons simply overlapped. The topmost took
both taps. On the caseworker at 412px the $51,000 cliff measured **0×0** — a
control a thumb could not reach at all, and one that reads as fully compliant
from the stylesheet.

| page / phone | mark | hit area before | overlap with |
| --- | --- | --- | --- |
| citizen, Pixel 7 | drop near $37,000 | 24×45 | the $40,000 mark, by 10×44px |
| citizen, Pixel 7 | drop near $40,000 | 34×45 | the $37,000 mark |
| caseworker, Pixel 7 | cliff at $37,000 | 30×45 | the $41,000 mark, by 4×44px |
| caseworker, Pixel 7 | cliff at $51,000 | **0×0** | covered outright |

Fixed by `markWidths` (`app/src/lib/chart/draw.ts`): the marks **tile** the
axis — each takes 44px, or the whole gap to its nearest neighbour when that
is less — so two bands touch and never lie on top of one another.

A 24px floor was tried first and rejected: it put two bands back on top of
each other by 3px on the caseworker's $51,000 and $53,000 cliffs, which is
the defect the function exists to remove.

### B3. The map's tiles were 31–33px

The documented trade (`REVIEW-places-keep-rate-2026-09-18` B7: the ranked row
was "the 44px control") is overruled. See § The map decision.

### B4. Three controls were under 44px on every page

| target | page | box before | hit before | after |
| --- | --- | --- | --- | --- |
| `.hg-lang a` "Español" | all three | 55×23 | 56×**24** | 56×45 |
| `.hg-button--small` "Edit" | citizen, caseworker | 47×32 | 48×**33** | 48×44 |
| `.hg-button--small` "Download the numbers (CSV)" | journalist | 200×32 | 67×**33** | 67×44 |
| `.hg-table .hg-row-btn` state name (×51) | journalist | 31×44 | **32**×45 | 45×45 |

The table's state button is the one that looked fine and was not: 44px tall,
44px of intention, and 31px wide because the cell's padding was on the cell.

---

## S — should fix

### S1. Every scroller could be swiped off the page on iOS

`overscroll-behavior-x` was `auto` on all six scrollers (both plots, three
tables). A swipe that reaches the end of a wide table on iOS is then a
back-navigation, and a reader who swipes one column too far loses the page.
Now `contain`, on the shared `.hg-scroll-x`, so no page can forget it.

### S2. Every control had a 300ms tap delay

`touch-action` was `auto` on every button, link, summary, select, map tile
and cliff mark, on all three surfaces. Now `manipulation` — `auto` minus
double-tap-to-zoom, so a swipe still pans and a pinch still zooms. The page's
own zoom is never taken away from anyone; the viewport meta was already
correct (`width=device-width, initial-scale=1`, no `user-scalable=no`).

### S3. The journalist page's three selects were 15px, so iOS zoomed the page

`.hg-dense` sets a 15px base on the two panel surfaces, which `font: inherit`
carries into every field. Measured 15px on `#arch`, `#metric` and `#sort`.
Lifted to 16px **only** under `@media (pointer: coarse)`, so no desktop
column moves by a pixel. The rule sits after the `.hg-select` rule it
corrects: written three hundred lines above it, a bare element selector loses
to `font: inherit` on a class, and the first attempt measured 15px afterwards.

### S4. A swipe across a figure selected its labels

`user-select` was `auto` on every `.hg-picture`, so dragging over the curve
left "−$3,513" and two tick labels highlighted in blue, and the next tap
dismissed the selection instead of opening a mark. Now `none` on the picture
with `text` restored for every element that carries prose — the answer
sentence a reporter quotes, the readout, the key, the table cells. A picture
is not text; the words inside it still are.

---

## N — noted

### N1. The skip link measures 0×0, and should

`.hg-skip` is parked off-canvas until it takes focus, and then it is the only
thing on the screen. Listed by the proof as an exception, never failed.

### N2. Three inline links in prose are 67×17

`p#glossary > a`, `ul#methodList > li > a`, `ul#excludes > li > a` — all
"PolicyEngine" or "reported to PolicyEngine" inside a sentence. WCAG 2.5.5's
**Inline** exception covers exactly this: the target is sized by the
line-height of the text around it. The proof recognises them by computed
`display: inline` on an `<a>`, so a link that is *not* in a sentence — the
language switch, which is a flex item and therefore blockified — is still
held to 44px, and was fixed (B4).

### N3. Crowded cliff marks stay under 44px wide, by arithmetic

After the fix, the marks that remain short are short because there is no room:

| page / phone | mark | hit after | the room between its neighbours |
| --- | --- | --- | --- |
| citizen, Pixel 7 | drop near $37,000 | 24.8×44.9 | 25px |
| citizen, Pixel 7 | drop near $40,000 | 25.0×44.8 | 25px |
| citizen, iPhone 14 | drop near $37,000 | 23.0×44.9 | 23px |
| caseworker, Pixel 7 | cliff at $37,000 | 30.0×44.8 | 30px |
| caseworker, Pixel 7 | cliff at $46,000 | 38.0×44.8 | 38px |
| caseworker, Pixel 7 | cliff at $51,000 | 18.0×44.7 | 19px |

A cliff's x **is** the pay it happens at, so the dots cannot be moved apart to
make room without the picture telling a lie — WCAG 2.5.5's **Essential**
exception. The proof does not take this on trust: it re-derives the room from
the marks' own spacing and allows a short mark only when its box is that room
*and* the probe agrees nothing is covering it. A mark short for any other
reason is still a finding.

Merging crowded dots into one mark instead was considered and rejected: it
would change the drawn picture at phone widths (the count badge, the dot
radius, the labels), and this pass changes hit areas and touch behaviour, not
the picture.

### N4. What did not change

`node app/e2e/weight.mjs` before and after, identical to the word:

| page | width | words, by default | figure top | figure share of screen 1 | figure height |
|---|---:|---:|---:|---:|---:|
| citizen | 390 | 93 | 118px | 0.85 | 716px |
| citizen | 1280 | 105 | 110px | 0.87 | 781px |
| caseworker | 390 | 106 | 118px | 0.86 | 746px |
| caseworker | 1280 | 123 | 110px | 0.87 | 787px |
| journalist | 390 | 166 | 57px | 0.93 | 1006px |
| journalist | 1280 | 173 | 57px | 0.94 | 1078px |

One cell of it moved afterwards, and only one: the thumb reader's verdict
added four words to the journalist page at 390 (§ The thumb reader, T1).

The citizen and caseworker figures sit at **118px** against a 120px budget,
which is why the Edit button's hit area had to grow downward rather than the
summary row growing taller: there were two pixels to spend.

---

## The map decision

The owner overruled the 27–33px tile. Three ways to give it 44px were
available, and the arithmetic settles it: the cartogram is **twelve columns**,
so twelve 44px tiles and eleven 2px gaps are **550px**, and a phone is 390 to
412. The whole country at 44px and the whole country on one screen cannot
both be true.

- **Keep the 33px visual, enlarge the hit area through the gap.** Dead on
  arrival: 12 × 44 = 528 > 412 however the pixels are arranged, so adjacent
  hit areas must overlap — by 11px each way with the current 2px gaps. The
  proof would fail it, and correctly.
- **Re-flow the grid on a phone.** A cartogram's whole value is that it looks
  like the country. Transposing it to 8 × 12 does fit 390px, and nobody would
  recognise it.
- **Swipe the map** — which is also what the owner asked for.

**The map swipes, at a 44px tile, below 550px.** The column is
`minmax(var(--touch), 1fr)`, so this costs nothing above that width: at 48rem
the tile is still 64px and nothing scrolls. Below it the columns hold at 44px
and `.hg-scroll-x` on the grid turns the overflow into a swipe with the same
edge fade and the same `overscroll-behavior` every wide table on the site
already has.

**It opens at its left edge.** A centred start was written, rendered and
thrown away: it hides the entire Pacific column — Alaska, Washington, Oregon,
California, Hawaii — and it opens the picture on an **empty first row**,
because Alaska and Maine are the only tiles in that row and centring cuts
them both off. Left-aligned, the map starts in the corner where Alaska is,
reads west to east the way the country is drawn, keeps California on the
first screen, and clips a tile at the right edge — the same "there is more
this way" that a clipped column gives every wide table here.

What is given up: about three of twelve columns are off screen at any moment
on a 390px phone, so the journalist page no longer shows all fifty-one states
in one glance on the smallest screen. What is kept: the tile is a real
control, the ranked row and the table row are still the same state's 44px
controls beside it, and the map is still the page's picture.

The rule is in `charts.md` § A tile is a 44px control, and the phone map
swipes.

---

## The scrub-vs-swipe rule

A horizontal drag on a scrolling plot is two gestures in one coat, and the
browser decides which: once a pan is recognised it sends `pointercancel` and
no listener hears the finger again. **The pan wins**, because the plot is
three to six screens wide and a gesture that cannot reach the rest of the
axis would make the scroll rule unreachable by touch.

The readout is not lost to that choice. It reads the pay under the finger on
touchdown, follows the finger for as long as the browser has not claimed the
gesture, and then — while the finger is still down — re-reads on every scroll
of the plot, because **the pay under a still thumb changes when the curve
travels beneath it**. So *"move along the line for any pay"* holds on a phone
with the line doing the moving. A mouse never pans, so hover and drag scrub
exactly as before, and the keyboard is untouched.

`pointercancel` deliberately does not end it: that event means the browser
took the gesture, not that the thumb left the glass. Only `pointerup`,
`touchend` and `touchcancel` do.

---

## After: the whole measurement, green

114 printed checks, 20 tests, two phones, three surfaces, zero findings.

| surface / phone | targets | under 44px | overlapping pairs | plot swipes | map swipes | table swipes |
| --- | ---: | ---: | ---: | --- | --- | --- |
| citizen, Pixel 7 | 15 | 0 | 0 | ✓ 159→340 | — | fits |
| citizen, iPhone 14 | 15 | 0 | 0 | ✓ 150→331 | — | fits |
| caseworker, Pixel 7 | 36 | 0 | 0 | ✓ 207→388 | — | ✓ 0→100 |
| caseworker, iPhone 14 | 36 | 0 | 0 | ✓ 196→377 | — | ✓ |
| journalist, Pixel 7 | 166 | 0 | 0 | — | ✓ 0→138 | ✓ 0→181 |
| journalist, iPhone 14 | 166 | 0 | 0 | — | ✓ 0→160 | ✓ 0→181 |

Taps, both phones: a mark opens its row and the readout says the money; a
disclosure summary opens; the summary line's Edit opens the chips; a chip
opens its dialog and focus returns to the chip on close; a map tile selects
its state and fills the readout inside the figure.

Renders with every measured hit box outlined: `design/review/touch/`.

---

## The thumb reader

Two sub-agents, each given a local URL, a 390 × 844 window and one
instruction: *"You're on your phone with one thumb. Try to: swipe the chart
to see more, tap a dot on the line, find your state on the map and tap it,
open 'What we assumed', change the household. Say in three sentences what was
easy, what you missed, and what fought you."* They were given no source and
no context. Both came back with the same top finding, in almost the same
words.

**On the map.** *"The top row of the map shows Alaska on the left and then
nothing but white all the way to the right edge, so I concluded Maine simply
wasn't on this map… the map is 550px of country in a 390px window with no
scrollbar at rest, no arrow, and not one word anywhere on the page —
including inside 'How to read this map' — telling me to swipe."* And: *"I
tapped the 4-pixel sliver of 'N' at the right edge and got New York… after
selecting it the map didn't slide New York into view; it stayed half
off-screen with half its selection ring clipped."*

**On the curve.** *"I did not realise the chart slid sideways at all — on
first load it shows $20k–$60k and looks like the whole picture, so I never
saw the biggest drop in my life, the $7,059 one at $107,000, until I
dragged."*

### What was fixed in answer to it

**T1. The map says it swipes, in four words, and only while it does.** A
figure cannot put the words inside its scroller — `.hg-scroll-x`'s own
`data-more` is a block in the scrolling content, which inside a twelve-column
grid would be a thirteenth cell — so the line sits under the map, outside the
scroller, where `.hg-chart__hint` sits on the curve. The words are the
table's own `table.swipe`, already in both catalogs, so no string was added
to translate. It is measured rather than assumed from the width: a longer
language makes the same twelve columns wider.

This is the one thing in this pass that moved the weight table, and it is
reported rather than hidden. The journalist page at 390 goes **166 → 169
words** against a 200-word budget, and its figure 1,006 → 1,033px against a
0.5 floor it meets at 0.93. Every other cell of that table, including all
three surfaces at 1280, is unchanged to the word: the line does not exist at
a width where the map fits.

**T2. A selected tile is brought inside the map's own scroller**
(`revealTile`). The page's own scroll is deliberately left alone —
`scrollIntoView` would take the vertical with it, and the readout is directly
under the map already.

**T3. A picture that scrolls shows its scrollbar** — `.hg-scroll-x--bar`, on
the money curve and the map, under `(pointer: coarse)` only, so no desktop
figure moves by a pixel. **This one could not be verified here**: headless
Chromium draws overlay scrollbars in every emulation mode it offers, so
`scrollbar-width: thin` computes but reserves 0px, and there is no way from
this harness to see what iOS Safari or Android Chrome would draw. It ships as
a belt beside T1's braces and is named as unverified rather than counted as a
fix.

### What was left, and why

- **The curve has no swipe word.** T1's fix is not available to it: the
  citizen surface has no equivalent string in either catalog, and inventing
  one is a copy change to a file the social workers are reading this week.
  The curve does have `← $0 … $150,000 →` outside the scroller and now a
  scrollbar on touch. **Recommended next**: one line of copy, and it is the
  single highest-value four words on the site.
- **"your pay" in the citizen hint never moves.** The reader: *"it sits at a
  fixed spot and never moves, so it looks like a you-are-here marker and
  isn't one."* True, and a real defect — the hint is a flex row with the
  middle label centred. Fixing it is a change to the figure's layout and
  copy, not to a hit area.
- **Tapping a cliff mark throws the page ~1,300px down to the step list**, so
  the chart the reader just tapped leaves the screen. That scroll-into-view is
  `charts.md`'s documented behaviour for the citizen surface (M6's three
  review rules) and changing it is a interaction decision, not a touch fix.
- **The underlined "26" in the journalist headline reads as a link.** The
  underline is the AnswerSentence's own convention — a figure underlined in
  the colour of the mark it names — so this is the answer sentence's rule to
  revisit, not this pass's.
- **Two marks at $37,000 and $40,000 are visibly half-width and touching.**
  That is N3's arithmetic, seen by a person. It is the honest picture of a
  curve with two cliffs $3,000 apart.

---

## After the thumb reader

Two existing proofs measured the old rules and were moved, with the reason
here and in the same commit:

- `citizen.spec.ts` asserted `width >= 44` on every mark. What that pin
  actually held was a pile of overlapping buttons (B2). It now asserts that a
  mark takes 44px **or all the room there is**, against the marks' own
  spacing.
- `places.spec.ts`'s greyscale read took one screenshot of `#grid`. An
  element screenshot captures a scroller's **box**, not its content, so tiles
  past the right edge were sampled off the end of the bitmap — which read as
  DC being 73 L\* lighter than Connecticut and as an inverted ramp, at 390
  only. It now reads the tones at each end of the scroller and takes each
  tile from the pass that holds it whole.
- `places.spec.ts`'s *"the row stays where it was"* held the focused table row
  to 0.5px through a selection that adds seven hundred pixels above it. What
  holds it is the browser's scroll anchoring, whose residue is sub-pixel and
  not zero — measured at 0.17px on a first selection and 0.75px once T1's
  line had added 28px to the figure. The tolerance is now 1.5px: the rule is
  that the page does not jump, and 0.5px was measuring the instrument's own
  floor.

Everything green from the project's own runners: `npm run typecheck`,
`npx vitest run` (669 passed), `cd app && npx vite build`, and all six
Playwright suites through `wrangler dev` (54 passed, 3 skipped — the
archetype-source variants).
