# The citizen page, picture first — what was measured and what six readers said

The pass is `design/PICTURE-FIRST-2026-09-18.md`; this is what came out of it.
Everything below was measured on the build in this branch, through the Worker,
with the project's own runners. The "before" column is the live site
(`https://hotgap.hotgap.workers.dev`), measured the same day with the same
script, because that is the page the owner's reader saw.

## The weight

`node app/e2e/weight.mjs <base-url>` — the words a person can really see (no
`[hidden]`, no `display:none`, no visually-hidden clip; a closed `<details>`
worth its summary alone; and nothing scrolled out of a scroller), then the
same page with every disclosure open, then where the first `<figure>` starts
and how much of the first screen it covers.

| | before (live) | after | budget |
|---|---:|---:|---:|
| **citizen, 390** — words by default | **762** (749 prose + 13 picture) | **93** (68 + 25) | ≤ 120 |
| — words, every disclosure open | 824 | 844 | — |
| — first figure's top | 691px | **118px** | ≤ 120px |
| — figure's share of screen 1 | 0.18 | **0.82** | ≥ 0.5 |
| **citizen, 1280** — words by default | **760** (744 + 16) | **105** (70 + 35) | ≤ 120 |
| — words, every disclosure open | 822 | 845 | — |
| — first figure's top | 608px | **110px** | ≤ 120px |
| — figure's share of screen 1 | 0.32 | **0.87** | ≥ 0.6 |

Eight times fewer words before a person has done anything, and **more of the
page than before once it is all open** (844 against 824): nothing was deleted
to reach the budget, which is the whole point of measuring both. The picture
moved from two thirds of a phone screen down to one line of masthead and one
sentence above it.

Two other households, same build, to show it is not one curve's luck:

| household | width | words by default | open | figure top | share |
|---|---:|---:|---:|---:|---:|
| Delaware, kids 3 & 7, $41,000 | 390 | 91 | 873 | 118px | 0.86 |
| | 1280 | 101 | 872 | 110px | 0.87 |
| California + Head Start, kids 3 & 4, $24,000 | 390 | 90 | 884 | 118px | 0.85 |
| | 1280 | 108 | 891 | 110px | 0.87 |

**The other two surfaces, for the agents who have them** (before, live, same
script): caseworker 1,179 words at 390 and 1,248 at 1280, figure 1,501px /
1,119px down, 0 of the first screen; journalist 2,251 / 3,432 words, figure
812px / 596px down, 0.04 / 0.34 of the first screen.

## What six fresh readers said

Each was given the URL, two screenshots of the phone page — the first screen
and the whole scroll — and one instruction: *you are an adult with two kids
looking at this on your phone for the first time; in three sentences, what
does it tell you, how does the writing sound to you, and is there anything
you'd rather not read?* Nothing about the design, the brief or the system. The
three Spanish readers were also asked whether anything sounded machine-written.

### California, $30,000, kids 3 & 7 — English

> It tells me that even if I get a raise, I won't actually come out ahead
> until I'm making $43,000 — thirteen grand more than I make now — which is a
> genuinely useful and slightly gutting thing to learn in one sentence. The
> writing sounds like a person talking to me rather than an agency, plain and
> calm, though the chart around it is doing a lot at once and the little
> minus-numbers and "19¢ of each extra dollar" feel like they belong to
> someone more comfortable with graphs than I am. The part I'd rather not read
> is "What we assumed about you" — it makes me feel sized up by a stranger,
> and honestly seeing "you keep $42,830" next to my $30,000 made me want to
> close the tab before I understood it was about the future and not about me.

### Delaware, $41,000, kids 3 & 7 (the plateau) — English

> It tells me that if I got a raise, I'd actually be worse off until I'm
> making about $45,000 — $4,000 more than I earn now — and that in between I'd
> lose roughly a thousand dollars and keep only about 21 cents of every extra
> dollar. The writing is plain and blunt in a way I appreciate, not preachy,
> though the big chart with its striped bands and the money line took me a few
> seconds to work out, and I'm not sure what the second striped band is
> warning me about. The one thing I'd rather not see is "−$1,136" sitting
> there in red next to a raise — it's the number that tells me working harder
> costs me money, and I don't love that it's the first thing my eye lands on.

### California + Head Start, $24,000, kids 3 & 4 — English

> It tells me that with two little kids and $24,000 a year I'm okay until
> about $29,000, and then earning more actually costs me around $2,400 a year
> — which is a genuinely useful thing to know and not something anyone has
> ever put in front of me that plainly. The writing sounds like a person
> talking to me rather than an agency letter, short and calm and not preachy,
> though the chart around it speaks a different, colder language full of
> numbers I didn't ask for. The part I'd rather not read is that big red
> $17,321 drop with the crosshatched area — it feels like being shown the
> exact size of a hole I'm standing next to, and "you lose 41¢ of each extra
> dollar" lands like a punishment for trying.

### California, $30,000 — Spanish

> La página me dice que si gano más dinero no voy a estar mejor hasta llegar a
> los $43,000, es decir $13,000 más de lo que gano ahora, y que en ese tramo
> solo me quedo con 19 centavos de cada dólar extra. La redacción suena
> directa y clara, como si alguien me hablara de frente — "le quedan $42,830"
> y "se queda con 19¢ de cada dólar extra" se entienden sin esfuerzo — aunque
> "Recorra la línea para ver cualquier paga" suena a traducción de máquina
> (uno recorre un camino, no una línea; en el teléfono yo diría "deslice" o
> "toque"), y "su paga" debajo del gráfico se siente forzado frente a "su
> sueldo" o "lo que gana". Lo que preferiría no leer es ese titular tan
> tajante de que ganar más no me deja mejor, porque duele verlo así de seco al
> abrir la página, y el "Lo que supusimos sobre usted" me incomoda un poco,
> como si el sitio hubiera decidido cosas de mi vida sin preguntarme.

### Delaware, $41,000 (the plateau) — Spanish

> Entiendo que si me esfuerzo y gano $4,000 más al año, en realidad me quedo
> con $1,136 menos, y que hasta no pasar los $45,000 no empiezo a salir
> adelante: eso lo capté en dos segundos, sin leer nada más, y me dolió. La
> redacción es corta y directa, pero hay frases que no suenan a como hablamos:
> "Ganar más no le deja mejor" me sonó a traducción de máquina, le falta el
> final, uno diría "no le conviene" o "no mejora su situación"; y "su paga" o
> "una paga de $41,000 al año" me suena a la mesada de un niño y no a mi
> sueldo, igual que "Recorra la línea", que nadie dice así. Lo que preferiría
> no leer es ese "−$1,136" y el "se queda con 21¢ de cada dólar extra", porque
> me están diciendo que trabajar más no sirve, y el título "Lo que supusimos
> sobre usted" me incomoda, como si alguien ya hubiera decidido cosas de mi
> vida sin preguntarme.

### California + Head Start, $24,000 — Spanish

> Me dice que con mi paga de $24,000 al año voy bien, pero que si llego a
> ganar más de $29,000 empiezo a perder dinero — y ahí está el escalón feo de
> $17,321 que me quita el aire solo de verlo. La redacción suena natural y
> directa, como si alguien me lo explicara de frente; "le quedan $61,071" y
> "pierde 41¢ de cada dólar extra" se entienden sin esfuerzo, aunque "Recorra
> la línea para ver cualquier paga" me suena un poco rígido, más traducido que
> hablado, y "Lo que supusimos sobre usted" me da un escalofrío porque no sé
> qué dieron por hecho de mi vida. Lo que preferiría no leer es ese "−$17,321"
> tan grande en rojo: es la cifra que me dice que trabajar más me castiga, y
> duele verla escrita así de clara.

## What was changed because of them

Five things, all in this branch's last commits.

1. **"you keep $42,830" beside a $30,000 pay made a reader want to close the
   tab.** The label now says why in two words — *you keep $42,830, help
   counted*, or *…after tax* where the line is below the pay. The explanation
   it stands in for is still inside *How to read this picture*, where it can
   be read in full.
2. **"What we assumed about you" made two readers, in two languages, feel
   sized up by a stranger.** The summary is now *What we assumed*; the line
   inside still says whose household it is. The two words that made it
   personal were the two doing no work.
3. **"Ganar más no le deja mejor" reads as machine Spanish** — unfinished, and
   nobody says it. It is now *Ganar más no mejora su situación*, and the same
   correction runs through the stuck and always-up shapes.
4. **"Su paga" reads as a child's allowance beside a wage.** Twenty-nine
   Spanish messages move from *paga* to *sueldo* (and *pago mínimo legal* to
   *salario mínimo legal*, which is what the office calls it).
5. **"Recorra la línea" is nobody's phone instruction.** It is now *Deslice el
   dedo por la línea para ver cualquier sueldo.*

And one thing the readers asked for that the picture now answers by itself:
two of them could not place *19¢ of each extra dollar* or the second striped
band. The bar that carries the keep rate has its own entry in the key —
*The road out of poverty* — so the disclosure named *How to read this picture*
answers the question it was actually asked.

## What was left, and why

- **"−$1,136 in red", "−$17,321 in red", "a punishment for trying".** Three
  readers called the loss ink red; it is plum, on purpose and measured, and
  the system's rule is that severity is magnitude and never virtue
  (`README.md` § The ramp that is not red and green). What they are flinching
  at is the number, and the number is the page's whole reason to exist. A
  benefits-cliff tool that softened its cliffs would be lying. Kept.
- **"The headline is blunt / duele verlo así de seco."** Also kept. It is the
  answer, in one sentence, which is what the owner's reader asked for; a
  cushion in front of it is the writing she said nobody reads.
- **The second striped band (another household's flat stretch) is unlabelled
  by default.** Its key entry is one press away under *How to read this
  picture*, which is where a key belongs now that every mark that matters to
  this household carries a direct label. A word on the band itself would be a
  fourth kind of label on a picture that already has three.
- **A merged cliff mark's label carries its money but not what ends there.**
  The second line names `programsLost[0]`, and a merged mark has several
  cliffs with several programs; naming one would be a half-truth on the
  picture. The mark's spoken label and its step rows name them all. Left as a
  known gap.
- **The energy-assistance tick on the axis is unexplained on the picture.**
  Deliberate: it must never look like a cliff (`inventory.md` #23), so it is a
  2px tick, and its three facts are prose at the end of *What happens at each
  step*, with its key entry beside the others.
- **The biggest drop can still be off the initial view.** For the California
  household it is at $107,000, a swipe and a half to the right, and its
  two-line label is drawn there. That is the price of the owner's rule that
  the curve is never cropped (`charts.md` § The scroll rule), and `[` and `]`
  reach it.

## Proofs

Through the project's own runners, against `wrangler dev` on port 8806 with
`--var HOTGAP_RATE_LIMIT_OFF:1`, and on 8807 with a dead engine for the
archetype path:

- `npm run typecheck` — clean.
- `npx vitest run` — 665 passed, 30 skipped, 0 failed.
- `cd app && npx vite build` — clean.
- `npx playwright test e2e/citizen.spec.ts e2e/editor.spec.ts e2e/i18n.spec.ts`
  — 9 + 6 + 3 passed (2 citizen tests are the archetype path's), no console
  errors, no horizontal scroll at either width.
- `HOTGAP_EXPECT_SOURCE=archetype` on 8807 — the archetype notice with its Try
  again, the plateau household's flat-stretch sentence, and both LIHEAP
  households.
- `e2e/caseworker.spec.ts` and `e2e/places.spec.ts` — 12 + 3 passed, so the two
  shared changes (the answer sentence and the summary line) did not break the
  pages that inherit them.

Contrast, re-measured on the resolved colours at both widths and both schemes,
on the page's new paper ground: loss ink 8.56:1 light / 8.22:1 dark; axis ticks
5.49 / 6.60; the drop labels 8.56 / 8.22; *you keep* 17.40 / 15.83; the keep
rate on the road 8.58 / 10.54. Every SVG text carries `.hg-tick` or `.hg-label`
and measures at or above its floor.

## The pictures

`design/review/picture-first/after/` — three households × two widths × two
schemes, in English and Spanish: `*-screen1.png` is what a person meets,
`*-full.png` the whole scroll, `*-open.png` every disclosure open, and
`*-print.png` the page as paper. The audit's own renders moved with them
(`design/audit/app/citizen-*`), and `design/review/keep-rate/citizen-*-band.png`
is now the figure — the sentence and its picture, which are one object.
