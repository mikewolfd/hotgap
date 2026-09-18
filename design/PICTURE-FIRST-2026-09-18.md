# Picture first: the chart is the page

The plan for the 2026-09-18 pass, written before the build, revised against
the brief and against the generic tells the design skill lists. The citizen
surface is built to it here; the caseworker and journalist surfaces follow,
and § The contract is what they inherit.

## What the first real reader said

> "too much writing, the content sucks and is hard to read, even the citizen
> one reads like non-sensical caveman speak. nobody's gonna read shit. The
> graphs/graphics/maps/tables should be the 100% most prominent and prettiest
> thing."

She is right, and the page can be measured against her. `app/e2e/weight.mjs`
counts the words a person can really see — no `[hidden]`, no `display:none`,
no visually-hidden clip, a closed `<details>` worth only its summary — and
finds the first `<figure>` and how much of the first screen it covers. On the
build of this branch's parent, through the Worker:

| page | width | words, by default | figure top | figure's share of screen 1 |
|---|---:|---:|---:|---:|
| citizen | 390 | **774** (749 prose + 25 in the picture) | 691px | 0.18 |
| citizen | 1280 | **775** (744 prose + 31) | 608px | 0.32 |
| caseworker | 390 | 1,199 | 1,501px | 0 |
| caseworker | 1280 | 1,263 | 1,119px | 0 |
| journalist | 390 | 3,432 | 812px | 0.04 |
| journalist | 1280 | 3,432 | 596px | 0.34 |

Seven hundred and seventy-four words, and the picture starts two-thirds of a
screen down. On a phone the reader meets five paragraphs before she meets the
one thing that answers her question.

And the sentences themselves:

> You are paid $30,000 a year. You keep $45,283. More pay does not add to
> that until you are paid $38,000: a raise of $8,000. It happens 3 more
> times, between $39,000 and $119,000. You keep more than your pay because
> help and tax money are part of it. $1,142 of this is free school meals. It
> is not cash.

Every sentence there is short because a readability formula wanted it short.
Nobody says "more pay does not add to that". The formula is retired (owner,
2026-09-18): **write it the way a good caseworker says it across the desk,
then cut every word that does not help.**

## The five principles

1. **The figure is the page.** After one line of masthead and one sentence,
   the picture — full-bleed on a phone, and at least three fifths of the
   first screen at 1280. Nothing else is above the fold, ever.
2. **The picture says what the prose said.** Every fact that used to be a
   paragraph is a direct label on the mark it describes: what you keep, at
   the diamond; what the drop costs and what ends, at the drop; the way back,
   on the exit rule; the keep rate, written once on the road out of poverty.
   Prose is what is left after the picture has spoken.
3. **One sentence, then everything on demand.** The answer is one sentence at
   display size. The steps, the assumptions, the sources, the corrections, the
   boundary and the numbers table all stay — in the DOM, reachable by
   keyboard and screen reader, open on paper — behind three disclosures with
   plain names.
4. **Spend the boldness on the line.** The 2px money line, the loss ink on a
   drop, the hatched danger zone. Everything else is a hairline, `--ink-3`, or
   gone. The one thing a person should remember from this page is a blue line
   falling off a plum step with **−$3,513 · food help ends** written beside it.
5. **Nothing a reader is owed is lost.** Every honesty rule holds — no typed
   numbers, provenance reachable, the incomplete-state marker, the deferred
   badge, a boundary that never looks like a cliff, no composite score. Folding
   is not deleting, and `weight.mjs --open` is the proof: the same page with
   every disclosure open still carries every word it carried before.

## Layout

### 390 — default

```
┌────────────────────────────────────────┐  ← sticky, 1 line
│ HotGap        English ▾  Change  Print │
├────────────────────────────────────────┤
│ A parent with two kids in California,  │  the household, one phrase
│ paid $30,000 a year.            [Edit] │  13px, --ink-2
├════════════════════════════════════════┤  ← <figure> starts here (≤120px)
│ More pay won't leave you               │
│ better off until you're past           │  the answer, 22px, --w-med
│ $43,000 — $13,000 more than            │  numbers keyed to their marks
│ you make now.                          │
│                                        │
│ $60k┤            ╭──────               │  full-bleed: the gutter is
│     │      you   │                     │  inside the figure, the plot
│ $50k┤ keep $45,283                     │  bleeds to both edges
│     │   ◆━━━━╮   │                     │
│ $40k┤▨▨▨▨▨▨▨│▨▨▨▨│  −$3,513            │  ▨ = the household's zone
│     │▨▨▨▨▨▨▨╰────╯  food help ends     │  ◆ = you
│ $30k┤▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨                 │
│     └──┴────┴────┴────┴────┴────       │
│     $20k  $30k  $40k  $50k  $60k       │
│     ├─ you keep 12¢ of each extra $1 ─┤│  the road out of poverty
│  ← $0                      $150,000 →  │
│ Move along the line for any pay.       │
│ ▸ How to read this picture             │
├────────────────────────────────────────┤
│ ▸ What happens at each step            │
│ ▸ What we assumed about you            │
│ ▸ Where these numbers come from        │
└────────────────────────────────────────┘
```

### 1280 — default

The same page. The prose keeps its 40rem measure; the picture takes the room
(up to 56rem), because a wider plot is more axis per screen and the sentence
is not improved by being wider.

```
┌──────────────────────────────────────────────────────────────────────┐
│ HotGap                                 English ▾   Change my answers  Print │
├──────────────────────────────────────────────────────────────────────┤
│ A parent with two kids in California, paid $30,000 a year.    [Edit] │
├══════════════════════════════════════════════════════════════════════┤
│ More pay won't leave you better off until you're                     │  34px
│ past $43,000 — $13,000 more than you make now.                       │
│                                                                      │
│   $60k ┤                    ╭──────────────────────────              │
│        │        you keep    │                                        │
│   $50k ┤        $45,283     │      back to even                      │
│        │      ◆━━━━━━━━╮    │      │                                 │
│   $40k ┤▨▨▨▨▨▨│▨▨▨▨▨▨▨▨│▨▨▨▨│      │   −$3,513                       │
│        │▨▨▨▨▨▨│▨▨▨▨▨▨▨▨╰────╯      │   food help ends                │
│   $30k ┤▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨│                                 │
│        └───┴─────┴─────┴─────┴─────┴─────┴─────┴─────                │
│        $20k  $25k  $30k  $35k  $40k  $45k  $50k                      │
│        ├──── you keep 12¢ of each extra $1 ────┤                     │
│   ← $0                                            $150,000 →         │
│   Move along the line for any pay. Press ] and [ to jump between drops. │
│   ▸ How to read this picture                                         │
├──────────────────────────────────────────────────────────────────────┤
│ ▸ What happens at each step                                          │
│ ▸ What we assumed about you                                          │
│ ▸ Where these numbers come from                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Open, and on paper

Every disclosure open is the old page, in a better order: the steps with their
badges and their remainders, what we assumed with its corrections, then reach,
the lowest legal pay, where the numbers come from, the incomplete-state
caution, and the footer. `beforeprint` opens all of them, as it already opens
the numbers table, so paper is unchanged in content and better in order.

## The disclosure pattern — three names, and one inside the figure

Four `<details>`, and the fourth belongs to the picture rather than to the
page:

| summary | what is inside |
|---|---|
| *How to read this picture* | the MarkKey, the caption (axis floor, estimates, the year and state), the keyboard sentence. Inside `<figure>`, because it explains the thing it sits in. |
| *What happens at each step* | the keep-rate sentence for the next stretch, the StepList (one row per threshold, deferred rows badged), where help with heating bills stops, and the numbers table. |
| *What we assumed about you* | the assumed rows — the household the curve was run for, every correction that touched it — then how common this pay is, and the lowest legal pay. |
| *Where these numbers come from* | the SourceNote, the incomplete-state caution, and the footer's three sentences. |

Rules that go with them:

- A disclosure is `details.hg-disclosure`, closed by default, open on paper,
  and its content is in the DOM at all times. Never a tab, never a modal,
  never a "read more" that navigates.
- A summary is a plain sentence fragment a person would say, sentence case,
  no count badge and no chevron of our own (`::marker` is the disclosure's).
- **Nothing that changes an answer hides.** The editor's chips are behind
  *Edit* because they are the household, not the answer; the answer itself
  has no controls on this surface at all, which is the old rule and stays.
- **An alert never hides.** A failed evaluation, the archetype notice, and
  anything with `role="alert"` or `role="status"` stays in the open.

## Tokens

| token | was | is | why |
|---|---|---|---|
| `--t-answer` | `clamp(1.625rem, 1.05rem + 2.5vw, 2.375rem)` | `clamp(1.375rem, 0.95rem + 1.9vw, 2.125rem)` | 26→22px on a phone, 38→34px at 1280. The sentence got shorter and the picture needs the pixels; 22px over four lines is still the largest thing on the screen until the chart begins. |
| `--measure-answer` | — (a page's own `22ch`) | `30ch`, `38ch` above 40rem | The headline's own measure, in the shared layer, because all three surfaces get a headline. 30ch is about 40 characters in Archivo — two to four lines of a spoken sentence. |
| `--figure-max` | — | `56rem` | The picture may leave the prose column at 64rem and up. Prose keeps `--page-max`. |
| `--t-figure`, `--t-h1`…`--t-tick` | — | unchanged | The type floors hold: 13px for any word, 12px for a tick number. |

No new colour. The palette was validated and the pass spends nothing on hue;
what changes is how much ink is on the screen at once.

## The direct-label rule (for `charts.md` § Direct labels)

The old rule — *exactly two labels on the citizen chart* — was written when
the prose carried the answer. The prose is gone, so the labels carry it. The
new rule is a priority list with a collision test, not a count:

1. **you keep $45,283** — at the household's diamond. The one place the
   y-axis is named in dollars a person recognises.
2. **−$3,513 / food help ends** — the largest drop, two lines, in loss ink,
   the heaviest type on the picture. This is the memorable element.
3. **back to even** (and *safe from here* when it is a different pay) — on
   the exit rule. Dropped below 520px, where the caption says it instead.
4. **later** — over a deferred mark's dashed stub, with the drop's money when
   it fits. Solid means this year, dashed means a later renewal, everywhere.
5. **+$7,000** — the leap, on its bracket.
6. **you keep 12¢ of each extra dollar** — once, on the road out of poverty,
   in `--ink-3`, below the axis where it cannot be read as part of the curve.
7. Every other drop's money, in axis order, while there is room.

**Collisions.** Labels are placed in that order; each candidate spot is tested
against the dots (with the open ring's box), the diamond and the labels
already placed, and a label that finds no clear spot is **dropped, never
drawn overlapping** — its money is in the readout, the step row and the
table. The one exception is the largest drop, which always draws: it is the
label the page promises, and its last-resort spot is used. Deleted with this
pass: the peak rule's dollar, which said the same number as *you keep* two
inches away and collided with the first dot (citizen review S3).

## The height rule (for `charts.md` § The scroll rule)

Height used to be chosen by the biggest drop alone — as tall as it takes for
that drop to stand 24px, clamped to 260–560px of drawing area. It gains a
second floor: **the plot also fills what is left of the first screen.** On a
phone that is the difference between a picture you look at and a picture you
scroll past. The ceiling is unchanged, so the figure is never taller than a
screen, and the drop floor still wins where it asks for more.

## Copy

The register description in `inventory.md` changes from *short words, one
thought a line* to:

> **Write it the way a good caseworker says it across the desk, then cut
> every word that does not help.** Second person, contractions, the numbers
> in the sentence. A program is the plain phrase the office uses — "food help
> (SNAP)" — never an acronym alone. No sentence exists to satisfy a formula;
> social workers read this namespace, and they can hear a hard word in a
> three-word label that no index can see.

The verdict catalog is rewritten to that rule — one sentence per curve shape,
up to two clauses, the figures keyed to their marks:

| shape | the sentence |
|---|---|
| `in_danger_zone` | More pay won't leave you better off until you're past **{exit}** — **{leap}** more than you make now. |
| `in_danger_zone:stuck` | More pay won't leave you better off anywhere we looked, right up to **{top}**. |
| `cliff_ahead` | You're fine up to **{wage}**; past that, earning more costs you about **{drop}** a year. |
| `cliff_ahead` (deferred) | You're fine up to **{wage}**; past that you'd lose about **{drop}** a year, though not right away. |
| `cliff_behind` | The worst of it is behind you — from **{wage}** up, more pay means more money. |
| `always_up` | Every raise leaves you better off: we checked every step up to **{top}** and nothing drops. |

Two deliberate losses from this sentence, both with a reason:

- **"You are paid $30,000 a year"** — she typed it; the summary line above
  still says it. An answer that opens by repeating the question is why nobody
  reads the second sentence.
- **"You keep $45,283"** — moved onto the diamond, where it labels the axis
  instead of floating free. It is the one number on the page that needs a
  picture to make sense of, which is the argument for putting it on one.

The deferred-timing clause leaves the sentence too. Citizen review B1 asked
that a deferred loss not be invisible *in the answer and in the picture*; the
picture now carries it as a labelled mark with the badge, and the step row
carries the rule, which is what B1 was protecting.

## Everything that does not change

The whole-axis scrolling curve and its gutter; `windowFor` as a position;
the 2.5× axis-honesty rule and the printed floor; cliff marks as 44px
controls with `]` `[`, Enter, Escape; the readout as the text equivalent;
the table twin; pay in the person's unit; the one threshold convention; the
deferred badge; the boundary that is three facts and never a drop; the
archetype `SourceNote`; `light-dark()` and print-is-light; reduced motion
through the tokens; the message-code architecture, slots and plural objects,
in both languages.

## Review against the generic tells

Worked honestly, tell by tell, before building:

- **Cream + serif + terracotta; near-black + acid accent.** Neither: the
  surface is `#FAFBFC` / `#161B20` and the accents are a validated blue and a
  plum ramp, all measured. Unchanged by this pass.
- **Broadsheet hairlines and dense columns.** The page is one column with
  three rules on it. That is fewer rules than before, not more.
- **The SaaS card kit.** `--r-panel: 0` and no shadow anywhere; a disclosure
  is a rule and a summary, not a card. Held.
- **ALL-CAPS eyebrows, middot meta strings, "WORD — fragment", arrows glued
  to links, monospace data labels.** The summary line was
  `94110 · CA · 1 adult, kids 3 & 7 · $30,000 a year` — a middot meta string,
  exactly the tell. It becomes a sentence: *A parent with two kids in
  California, paid $30,000 a year.* No other middots, no eyebrows, one family
  and no mono.
- **A big number with a small label as the hero.** Tempting here and refused:
  the hero is the line, not a `$45,283` in 72px. A single hero figure would
  be the composite score this system has always refused, wearing a hat.
- **Fade-and-slide-up on every section.** Still one orchestrated moment —
  the line drawing itself once — and nothing else moves unless a person moved
  it. Opening a disclosure is a person's action and may animate its marker.
- **Numbered markers (01/02/03).** The steps *are* a sequence, so they keep
  their dollar in the left column, which is the number that means something.
  No decorative numbering is added.

### What the first draft of this plan got wrong, and what changed

- **Four disclosures where the brief said two or three.** Kept at four, but
  only because the fourth belongs to the figure rather than the page and is
  named for it. Written down so the follow-on agents do the same thing rather
  than inventing a fifth.
- **A "Your answer" eyebrow over the headline.** Cut. The sentence is the
  answer; a label above it would be the tell and would cost a line of the
  first screen.
- **Two labels on the chart, as the old rule said.** That was a rule for a
  page with paragraphs. Revised to the priority list above — but with a hard
  collision test and a drop-rather-than-overlap rule, so "more labels" cannot
  become the number-on-every-cliff anti-pattern the old rule was guarding.
- **A keep-rate stat tile beside the chart.** Cut: it is a `StatTile`, which
  is the caseworker's component, and it would have been the big-number hero.
  The keep rate is written on the road it measures.

## The contract for the caseworker and journalist agents

1. One-line masthead, one sentence, then the figure. Figure top ≤ 120px at
   390; the figure covers ≥ 0.5 of the first screen at 390 and ≥ 0.6 at 1280.
2. ≤ 120 words visible by default on the citizen surface. The other two
   surfaces are denser by design (`README.md` § Where the personas conflict,
   3) — the caseworker's target is ≤ 250 and the journalist's ≤ 200, both
   measured the same way and both with the figure first.
3. The three page disclosures keep these names and this order. A surface that
   needs a fourth names it for what is inside it, and writes it here.
4. Direct labels follow the priority list and the collision rule in
   `charts.md`; type floors hold; the largest drop is always labelled.
5. Copy is written to the desk rule, not to a formula, in every register and
   every language.
6. Run `node app/e2e/weight.mjs <base-url>` before and after, and put both
   tables in the review.
