# Design tasks

From a critique of the live site (2026-09-24), at 390 and 1280px, for the
household at `/?zip=94110&kids=3,7&pay=30000&unit=year`, `/places` and
`/caseworker`. Roughly in priority order within each group. Tick them off here.

## Every page

- [ ] **Link the three pages.** Nothing links `/`, `/places` and `/caseworker`
      today, and the wordmark isn't a link. Make "HotGap" link to `/`; add a
      three-item nav beside it (For you · By state · For caseworkers) with
      `aria-current` on the current page; hide it on paper.
- [ ] **Link to the next step in context.** Result → "See how your state
      compares" (`/places`, same household shape where one of the 11 map
      households matches). A `/places` state → "Try this for a real family"
      (`/?state=XX` with that shape). Caseworker → the plain-language view of the
      same household, to share with the client.
- [ ] **One masthead.** The citizen and caseworker mastheads are full-bleed
      with large buttons; `/places` is inset with a small button. Build one
      shared masthead in `src/lib/`.
- [x] **Scroll fades only when something scrolls.** The grey fades at the
      left and right of the chart and the map show at 1280 when nothing
      overflows. Show them only when the content overflows.
- [x] **"Swipe" is a touch word.** "swipe to see more" shows to mouse users;
      say "drag or scroll" (or nothing) on a pointer device.
- [ ] **Answer figures look like links.** The purple underline on the
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

- [ ] **One edit control.** "Change my answers" (top) and "Edit" (summary
      line) do the same thing. Keep one.
- [ ] **Empty form shows result controls.** Before any answers, the masthead
      still shows "Change my answers", "Print" and "Edit". Hide them until
      there's a result.
- [ ] **Drop the duplicate intro.** "Tell us about your home and we'll show
      you the answer" repeats the form's own lead.
- [ ] **Form heading scale.** "If your pay goes up, do you keep more?" is
      ~18px against a ~32px answer headline; the first screen is the least
      confident on the site.
- [ ] **Field widths match their content.** Pay is ~470px wide for a 5–6 digit
      number while ZIP and kids are narrow. Tighten the vertical gaps between
      groups too.
- [ ] **One column when disclosures open.** "How to read this picture" is at
      chart width; the sections after it sit in a narrower, indented column
      that reads as nested.
- [x] **"Show the numbers" table** shows a scroll fade at 1280 though it fits
      (same fix as the scroll-fade task above).

## `/places`

- [ ] **Controls above the map.** Household and Measure change the map and
      the headline ("a single parent of two children…") but sit below the map
      and "Select a state". Move them up, beside the headline or directly
      above the tiles.
- [ ] **Measure select truncates** ("…twice poverty, the"). Shorten the option
      text or widen the control.
- [ ] **Whole map on a phone.** At 390 the east coast (NY, NJ, MA…) is cut off
      until you swipe. 12 columns × ~28px fits; seeing the country at once
      matters more than tile size.
- [ ] **Tile label contrast.** White labels on the lightest purple (WY, VA, DC,
      HI, FL) look low; measure and switch to dark ink where it fails.
- [ ] **Use the width at 1280.** The map is ~60% of the column and the right
      side is empty, while the controls below span the full width.
- [ ] **One legend.** The two swatches ("loses 105¢ / keeps 30¢") repeat the
      ends of the ramp directly above them. Keep the ramp.

## Caseworker page

- [x] Chart tasks above apply (y-axis, label collisions); the collisions are
      worst here.
