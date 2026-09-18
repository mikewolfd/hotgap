# The caseworker page, picture first — what was measured and what four readers said

The pass is `design/PICTURE-FIRST-2026-09-18.md` and its contract in
`design/inventory.md` § *The page is its picture*; the citizen surface was
built to it first (`REVIEW-picture-first-citizen-2026-09-18.md`) and this is
the same transformation on the surface a benefits counselor uses. Everything
below was measured on the build in this branch, through the Worker, with the
project's own runners.

## The weight

`node app/e2e/weight.mjs <base-url>` — the words a person can really see (no
`[hidden]`, no `display:none`, no visually-hidden clip; a closed `<details>`
worth its summary alone; nothing scrolled out of a scroller), then the same
page with every disclosure open, then where the first `<figure>` starts and
how much of the first screen it covers. The "before" column is this branch's
parent, measured the same afternoon with the same script against the same
Worker, so the two columns differ only in the page.

| | before | after | budget |
|---|---:|---:|---:|
| **390** — words by default | **1,183** (1,171 prose + 12 picture) | **110** (84 + 26) | ≤ 250 |
| — words, every disclosure open | 1,183 | **1,377** | — |
| — first figure's top | 1,501px | **118px** | ≤ 120px |
| — figure's share of screen 1 | 0 | **0.86** | ≥ 0.5 |
| **1280** — words by default | **1,250** (1,235 + 15) | **126** (88 + 38) | ≤ 250 |
| — words, every disclosure open | 1,250 | **1,404** | — |
| — first figure's top | 1,171px | **110px** | ≤ 120px |
| — figure's share of screen 1 | 0 | **0.87** | ≥ 0.6 |

Eleven times fewer words before a person has done anything, and **close to two
hundred more of them once it is all open** (1,377 against 1,183): nothing was
deleted to reach the budget, which is the whole point of measuring both. What
the page gained while it was being folded is the reach note, the archetype
notice's own sentence, and the caption's lines about the what-if curves.

The figure went from a screen and three quarters down the page to one line of
masthead and one sentence above it.

Three more states of the same page, to show it is not one household's luck:

| page | width | by default | open | figure top | share |
|---|---:|---:|---:|---:|---:|
| the citizen page's own household (CA, kids 3 & 7, $30,000) | 390 | 105 | 1,219 | 118px | 0.86 |
| | 1280 | 122 | 1,243 | 110px | 0.87 |
| the same household with **three what-ifs** | 390 | 115 | 1,519 | 118px | 0.86 |
| | 1280 | 132 | 1,572 | 110px | 0.87 |
| **es-US**, a language about three tenths longer | 390 | 128 | 1,606 | 118px | 0.86 |
| | 1280 | 150 | 1,639 | 110px | 0.88 |

Before, with three what-ifs: 1,325 words at 390 and 1,434 at 1280.

**One state deliberately over the figure-top budget.** On the archetype path
the notice — *These are the committed sweep's numbers for a household of this
shape in Colorado, not this family's own live call*, with its *Try again* —
stands above the answer, and the figure starts about 230px down. The contract
says a warning never hides *whatever the budget costs*, so this is the rule
working rather than a failure; the notice was cut to one sentence and its
button put on the end of that sentence rather than under it, which is as small
as a warning gets.

## The order, and what moved where

Masthead (wordmark, language, *Add a what-if*, *Print the client sheet*), the
household in one phrase with *Edit*, then the figure — the answer as its own
`<figcaption>`, the money curve, the axis ends, the readout, and *How to read
this picture*. Under it, five disclosures, closed, open on paper:

| summary | what is inside |
|---|---|
| *What this family faces, step by step* | the zones beyond this one and the pay past which none remain, the five StatTiles, the DropLedger (now with each row's position), BreakdownBars |
| *Compare the what-ifs* | the CompareTable with its keep-rate row, the on-the-way lists, each column's *Remove* and *Try again*, the compare note |
| *Where each program ends* | ThresholdLedger with the EligibilityBoundary row inside it, and its footnote |
| *What we assumed* | the assumed rows, the unmodelled programs, the LIHEAP correction, and what reach is and is not |
| *Where these numbers come from* | the coverage block when it is not a caution, CorrectionsApplied, the SourceNote, the estimates line |

The chips went behind *Edit* at every width, not only below 720px
(`mountEditor`'s `collapse: "always"`, the citizen's own option): they are the
household, not the answer, and at 1280 they were the difference between a
figure at 110px and one below the fold. Every press still adds a what-if.

## The compare-as-picture rule, in three lines

1. **Every answered what-if is drawn on the base household's own plot** —
   same axis, same scale, clipped to the base's axis: a second curve at 1.5px
   under the base's 2px in the `--series-2` ink the CompareTable already rules
   its what-if columns with, so a line and its column are one mark; or, where
   its points *are* the base's — a raise and nothing else — a hollow diamond
   at the pay it lands on, because that is a second position on one curve and
   not a second curve.
2. **Three at most, and only what was computed**: a column still computing,
   failed, or outside the sweep has no evaluation and draws nothing; a fourth
   what-if keeps its column and its rows, and the caption says how many curves
   are drawn, how many are positions, and how many are not on the picture.
3. **Told apart by dash and by tag, never by colour**: three dash patterns, a
   one-word tag at that what-if's own pay (the pay figure, else the control's
   own name), and a key entry drawn in the mark it actually is — so greyscale,
   a photocopier and a colour-blind reader keep the distinction, and a tag the
   collision rule drops costs the name, not the difference.

Written into `design/charts.md` § *A what-if is a second line*; the
direct-label priority list gains the what-if tag at position 3, because a
second curve is a heavier claim on the reader than any rule below it, and a
line nobody can name is a line that lies.

## What four fresh readers said

Each was given the local URL and nothing else — no brief, no screenshots, no
mention of the design — and asked for three sentences.

*"You're a benefits counselor with a family at your desk. In three sentences:
what does this page tell you about them, would you show it to them, and what
would you rather it didn't say?"* — and, for the family, *"You're the parent
this counselor is sitting with. Three sentences: what does it tell you, how
does the writing sound, anything you'd rather not read?"*

### A benefits counselor, English

> It tells me she's a parent with a 3- and 7-year-old on $38,000 who is
> already standing at the top of her hill — she loses her own Medicaid at this
> very paycheck, a $7,000 raise would get her past the flat stretch, and the
> thing that will actually flatten her is the child care subsidy ending in the
> mid-$50s, about $25,000 gone in one step. Yes, I'd turn the screen around,
> because "don't stall at $45,000, and have a child care plan before you cross
> $55,000" is exactly the conversation I've been having in words for years and
> this is the first time I could point at it. What I'd rather it didn't say is
> "net $84,371" — she earns $38,000 and there is no $84,000 anywhere in her
> life; that figure is a day care slot and tax credits counted as cash, and
> the second she reads it she'll decide this page is about some other family,
> or that I think she's doing fine.
>
> The one thing that would stop me cold in front of a client: the big drop
> reads $25,449 on my laptop but $27,893 with no program name next to it on my
> phone, so I wouldn't know which number to say out loud — and smaller, "El
> Paso, Colorado" reads like Texas, and the energy-assistance note under the
> assumptions stops mid-sentence.

### The parent she is sitting with, English

> It tells me that if I take a raise I'll be worse off until I'm making $7,000
> more than I am now, that my day care help disappears somewhere around
> $55,000 and takes about $25,000 with it, and that my kids' health coverage
> runs out at $73,000 — so the thing I'd been quietly hoping for, a
> better-paying job, is apparently a trap for the next stretch of my life. The
> writing sounds like it was built for her and not for me: it's calm and
> exact, and it says "this family" and "the household" the way a file does,
> and words like *danger zone*, *cliff*, *reach at current earnings*, *40th
> percentile* land as if I'm a case being measured rather than a person being
> told something. What I'd rather not read is the line showing I lose 97 cents
> of every extra dollar, and the row that lists what 50 out of 100 families
> like mine earn — I don't need to be ranked while I'm sitting here, and I
> especially don't want to see, in that flat little note, that my children's
> coverage ends at their next renewal.

### A benefits counselor, Spanish

> Me dice que esta familia ya está atrapada: con $38,000 al año le quedan
> $84,371 netos, pero cada aumento hasta los $45,000 se lo comen los programas
> —97 centavos de cada dólar— y más adelante, al pasar de $54,000 a $55,000,
> se le cae el subsidio de cuidado infantil y pierde $25,449 de un jalón, un
> hueco que no vuelve a cerrarse hasta los $119,000. Sí se la mostraría, pero
> de mi lado del escritorio y hablando yo mientras la vemos, señalando con el
> dedo dónde está hoy y dónde está el barranco, porque una mamá que ve ese
> desplome sola puede salir de aquí pensando que le conviene no aceptar el
> aumento, y eso no es lo que le quiero decir. Preferiría que no les pusiera
> enfrente el «40.º percentil, ±$8,000 (n = 393)» —eso es para mí, no para
> ellos— y sobre todo que no soltara los $25,449 así, tan secos, sin decir en
> la misma línea que ese golpe depende de la renovación y del cupo del
> subsidio, porque así suena a sentencia y no a algo que todavía podemos
> trabajar juntos.
>
> «$7,000 la saca del tramo»: eso no lo dice nadie, «tramo» suena a tramo de
> impuestos; yo diría «con $7,000 más al año ya sale de la zona» — y lo mismo
> con «Seguro desde $119,000», que en una página de salud se lee como *el
> seguro médico*: yo pondría «a salvo desde $119,000». […] la vista de 390px
> deja cortada la etiqueta del precipicio de TANF contra el borde izquierdo de
> la gráfica («…o TANF») […] el encabezado dice «El Paso, Colorado» a secas,
> que a un cliente hispanohablante le suena a El Paso, Texas.

### The parent, Spanish

> Me dice que ganando $38,000 estoy parada en un punto donde cada aumento me
> deja con menos, que necesitaría $7,000 más de un solo jalón para salir, y
> que como a los $55,000 se me acaba la ayuda de la guardería y pierdo $25,449
> de un año para otro. Suena a papel de oficina y no a alguien hablándome:
> "precipicio", "zona de peligro", "la saca del tramo", y sobre todo ese
> "neto $84,371" enorme arriba de la línea, cuando yo sé perfectamente que a
> mi casa no entran ochenta y cuatro mil dólares — eso no es mío, es lo que
> cuesta la guardería que paga alguien más. Lo que preferiría no leer, con
> ella sentada al lado y la pantalla volteada hacia mí, es "42 de cada 100
> familias como esta ganan menos" y el renglón que me pone en el percentil 40,
> y el letrero que le llama a mi vida "el camino para salir de la pobreza": ya
> sé en qué lugar de esa lista estoy, no necesitaba verlo medido enfrente de
> ella.
>
> ¿Algo le sonó a traducción de máquina? Sí: "se termina Subsidio de cuidado
> infantil CCDF".

## What was changed because of them

Seven things, all in this branch's last commit.

1. **"net $84,371" — the label the picture most needs was the one both a
   counselor and a parent wanted taken away.** *"She earns $38,000 and there
   is no $84,000 anywhere in her life."* *"Eso no es mío, es lo que cuesta la
   guardería que paga alguien más."* It is the same flinch the citizen review
   recorded two days ago, and it takes the same remedy: the label says why in
   two words — **net $84,371, help counted**, or *net $84,371 after tax* where
   the line is below the pay. The full explanation is still inside *How to
   read this picture*.
2. **The largest drop said a different number on a phone than on a laptop.**
   *"$25,449 on my laptop but $27,893 with no program name next to it on my
   phone, so I wouldn't know which number to say out loud."* Below 520px the
   two cliffs at $53,000 and $54,000 merge into one mark under the collision
   rule and the label prints their sum, correctly and unannounced. It now
   prints **−$27,893 / 2 drops together**, so a counselor knows she is looking
   at a total and where to open the rows that separate it.
3. **A label for a mark off the left of the view read as broken text.** *"La
   vista de 390px deja cortada la etiqueta del precipicio de TANF contra el
   borde izquierdo."* Direct-label rule 7 — every remaining drop, biggest
   first — now only labels marks inside the box the reader is looking through.
   Rule 2, the label the page promises, is untouched and still always draws
   wherever its mark is. The phone picture gained two drop labels a reader can
   actually see in the space the invisible one was using.
4. **Three of four readers flinched at being ranked.** *"I don't need to be
   ranked while I'm sitting here."* *"Eso es para mí, no para ellos."* *"Ya sé
   en qué lugar de esa lista estoy."* This pass had put each cliff's position
   on every drop row — ten rows of it. Removed: the two facts a counselor
   reads out keep their position on the tiles, one press away and not in front
   of the family, which is where the counselor herself said it belongs.
5. **"$7,000 la saca del tramo" is machine Spanish**, and *tramo* reads as a
   tax bracket. It is now *con $7,000 más al año ya sale de la zona*, in the
   counselor's own words.
6. **"Seguro desde $119,000" reads as health insurance on a benefits page.**
   Six Spanish messages move from *seguro* to *a salvo* — the answer's
   companion line, the compare row, the chart's rule label and its key entry.
7. **"Se termina Subsidio de cuidado infantil CCDF" puts the verb in front of
   a proper name.** A drop's second line in Spanish is now *{program}: termina
   aquí*, which is a label rather than a broken sentence. And the road's key
   entry stops naming a reader's life: on this surface it is **100% to 200% of
   the poverty guideline** / *Del 100% al 200% de la pauta de pobreza*, the
   measure's own exact name. The citizen page keeps the plain phrase, where it
   is the reader's own page and nobody is looking over her shoulder.

And one thing the fourth reader's transcript settled for us: a pay what-if was
drawing a second line exactly underneath the base's, because a raise with
nothing else changed is the *same curve* at a different pay. It said nothing
and claimed there were two curves. A what-if whose points equal the base's now
draws a **hollow diamond** where that pay lands — position, drawn the way
position is drawn everywhere in this system — and the caption names the two
kinds separately. Read off the points, not off the diff: the same raise in
another state is a real second curve and still gets a line.

## What was left, and why

- **"−$25,449 so dry, without saying in the same line that it depends on the
  renewal and the subsidy waitlist."** The Spanish counselor wants the number
  softened where it stands. Kept, for the reason the citizen review gave two
  days ago: a benefits-cliff tool that softened its cliffs would be lying, and
  the drop is the page's whole reason to exist. What she is asking for exists
  one press away — the row names what continues, at what pay, and what it was
  worth — and her own second sentence is the real answer: she would turn the
  screen around *and talk while they look at it*.
- **"It says 'this family' and 'the household' the way a file does."** The
  parent is right, and it is the register this surface is supposed to have
  (`README.md` § Where the personas conflict, 1): it is the counselor's page,
  written for a professional, and the thing written for the parent is the
  client sheet she takes home, which is second person throughout and now opens
  with her own pay and what she keeps. Recorded rather than fixed, because
  fixing it would mean giving the caseworker the citizen's register and
  deleting the distinction the whole system is built on.
- **"El Paso, Colorado reads like Texas."** Both counselors said it, in two
  languages. The fix is one word in `app/src/editor/index.ts` — the summary
  line calls `countyBare` where `countyWords` would say *El Paso County* — and
  that line is shared with the citizen page, which this pass does not own.
  Left for the editor's next opening, written here so it is not lost.
- **Untranslated strings in the Spanish source line**: *"precios de county
  2015"*, *"Reach: ACS 2024 1-Year PUMS…"*. They are the sweep's own vintage
  strings out of `summary.json`, data rather than catalog, and the i18n gate
  exempts them for that reason. Genuinely worth fixing; it belongs to whoever
  owns the coverage block, not to a page.
- **The picture's y range widens when a what-if is on it.** A housing-voucher
  curve sits well above the base, so the base's own drops are shorter in
  pixels than they are alone. Kept: two curves on two scales are not a
  comparison, the 2.5× honesty floor still holds, and the caption prints the
  ratio it actually drew at.
- **A program is still "CCDF child care subsidy", not "child care subsidy
  (CCDF)".** The brief asked for the plain phrase then the acronym; the names
  live in `shared.program`, which the journalist surface also prints and which
  this pass does not own. Left for whoever opens that block.
- **The StatTiles stayed.** They restate four figures the picture now labels
  directly, which is an argument for deleting them — but reach and its margin
  live nowhere else in a form a counselor can read out, and the contract is
  that everything the page said is still one press away. They lead the
  disclosure whose rows they are read against, where a row of 30px numbers is
  not the big-number hero the plan refuses.
- **The leap's `+$7,000` is dropped from the picture on a crowded stretch.**
  It is priority 6 and loses its spot to the diamond's own label, which got
  two words longer this afternoon. The figure is in the answer sentence above
  the picture, keyed to the bracket's own ink, so nothing is lost — this is
  the collision rule choosing correctly.
- **The shared placer is used by the caseworker chart and copied inside the
  citizen's.** `app/src/lib/chart/labels.ts` is the rule as written down;
  `src/citizen/chart.ts` still holds the same code inline, because the citizen
  page was merged two days ago and its proofs were the control on this change.
  Both files carry a `TODO(system)` saying so. The citizen chart should import
  the module the next time it is opened, and the two must not drift.

## Proofs

Through the project's own runners, against `wrangler dev` on port 8807 with
`--var HOTGAP_RATE_LIMIT_OFF:1`, and on 8817 with a dead engine for the
archetype path:

- `npm run typecheck` — clean.
- `npx vitest run` — 666 passed, 30 skipped, 0 failed.
- `cd app && npx vite build` — clean.
- `npx playwright test e2e/caseworker.spec.ts` — 14 passed, including the
  archetype path; no console errors, no horizontal scroll at either width with
  three what-ifs.
- `npx playwright test e2e/editor.spec.ts e2e/i18n.spec.ts` — 6 + 3 passed.
- `npx playwright test e2e/citizen.spec.ts` — 9 passed, 2 skipped: the control
  on the shared chart change. The citizen page still weighs 93 words at 390
  with its figure at 118px and 0.85 of the screen, exactly as its own review
  recorded.
- `npx playwright test e2e/places.spec.ts` — 3 passed.
- `node app/e2e/weight.mjs` — the tables above.

Two findings came out of the proofs rather than out of reading the code, and
both are fixed in this branch:

- **A second dot sat on the household's diamond.** The cursor painted one at
  the household's own pay, on top of the diamond, saying nothing — and it was
  a ring that `net $84,371`, the label the picture most needs, then had to
  clear. At the household's own point the diamond IS the cursor now, which is
  what the citizen chart already does.
- **The collision test was measuring an estimate.** A label's box came from a
  character-width constant, which lands a pixel or two inside the real glyphs
  at the top and the bottom, and a pixel is the difference between a clear
  label and one resting on a mark's ring. The shared placer now draws at a
  spot, measures the real ink box, and moves to the next spot if that box is
  not clear — the same rule, checked against what is on the screen.

## The pictures

`design/review/picture-first/caseworker/` — the first screen and the whole
scroll at 390 and 1280, light and dark, English and Spanish; the page with one
what-if and with three; the archetype path with its notice; and the page as
paper. The audit's own renders moved with them
(`design/audit/app/caseworker-*`), as did the caseworker review's
finding-by-finding evidence (`design/review/caseworker/after/`) and Plan 9's
(`design/review/keep-rate/caseworker-*`).
