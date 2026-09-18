# HotGap site — the contract every surface builds on

Three pages, one design system, one Worker. A page renders; the Worker
evaluates; `@hotgap/core` is the calculation and the vocabulary both share.

## Run

    npm install                                   # at the repo root, once
    cd worker && npx wrangler dev                 # /api/* on :8787, static files from ../app/dist
    cd app && npx vite                            # :5173, hot reload, /api/* proxied to :8787

`wrangler dev` needs `app/dist` to exist (`cd app && npx vite build`) and,
to reach the hosted engine, a gitignored `worker/.dev.vars` holding the two
lines named in `worker/wrangler.toml` (`HOTGAP_PE_URL`, `HOTGAP_PE_TOKEN`;
copy them from the root `.env`, never print them). Without them the Worker
evaluates on the public PolicyEngine API's older model — still `live`.

## Pages and modules

| Page | Surface | Module | State |
|---|---|---|---|
| `index.html` | citizen | `src/citizen/main.ts` — mounts the editor and the result (`src/citizen/result.ts`; the pure modules beside it render every component `design/inventory.md` assigns to the surface, from one `HouseholdEvaluation`) | built; proofs `e2e/citizen.spec.ts` |
| `places.html` | journalist | `src/places/main.ts` | being built |
| `caseworker.html` | caseworker | `src/caseworker/main.ts` — the editor with this surface's actions and register (`copy.ts`, every string of the page), the base household in full, its what-ifs beside it | built; reviewed 2026-09-16 |

Every page imports `design/tokens.css` and uses its `hg-*` classes
(`design/inventory.md` § Class map); a page keeps only its own layout
(`src/citizen/citizen.css` is the pattern). Shared page code lives in
`src/lib/` (`format.ts`: `money`, `payPhrase` — a pay figure in the person's
unit, rounded as `design/inventory.md` M5 says).

## Data URLs

The committed sweep is served as static files (`app/public/data` is a
symlink to `core/data`):

- `/data/summary.json` — `SummaryJson` (`core/src/data.ts`), with `coverage`
- `/data/states/{ST}.json` — `StateFileJson`, one curve per archetype
- `/data/state-defaults.json`, `/data/reach.json`, `/data/zip3-state.json`, `/data/zip5-county.json`, `/data/county-names.json` (FIPS → name, for `countyName`)

A page that needs one of these at runtime fetches it and, where a core
function reads it, hands it to core with `provideData({ "summary.json": json })`.

## `POST /api/evaluate`

Request: JSON, the object `validateAnswers` accepts (`core/src/validate.ts`
— `HouseholdAnswers` with the optional fields optional, `monthlyRent` and
`monthlyChildcare` `null` when unknown) plus an optional `zip`, which sets
`state` and `countyFips`. `rawAnswersFromFlags(flags)` builds it from a flag
set. Body limit 16 KB.

Response `200`: a `HouseholdEvaluation` (`core/src/evaluate.ts`), `source`
`"live"` or `"archetype"`, `Cache-Control: no-store`. Anything else is an
`ApiErrorBody` (`core/src/api.ts`):

| Status | `error` | `detail` |
|---|---|---|
| 400 | `bad_input` | `validateAnswers`' reason (`"state"`, `"no state for ZIP 00000"`, …) or `"invalid JSON"` |
| 413 | `payload_too_large` | |
| 429 | `rate_limited` | `Retry-After: 60` — 20 evaluations a minute per client IP |
| 503 | `busy` | `Retry-After: 5` — four live evaluations already in flight in this isolate |
| 504 / 502 | `upstream_timeout` / `upstream_error` | PolicyEngine failed **and** no archetype curve exists for this household's shape; core's message |
| 500 | `internal` | anything else; the answers are never logged |
| 405 / 404 | `method_not_allowed` / `not_found` | |

`GET /api/health` → `{ "ok": true }`.

Live curves are cached for 7 days by core's own key under the engine's
host and policyengine-us release; a fallback is never cached. Live: a fresh
household 5.4 s, a repeat 17 ms (measured under `wrangler dev` against the
droplet).

## The editor

`src/editor/index.ts`:

```ts
const editor = mountEditor(root, { onSubmit(flags) {}, onChange(flags) {} });
editor.setFlags(flags); editor.open("pay"); editor.close(); editor.showError(detail);
editor.flags;             // a copy
hasAnswers(flags);        // a place core knows and a pay: enough to evaluate
stateOf(flags);           // the resolved, upper-cased state code, or undefined
```

It renders the ScenarioBar (sticky top row, summary line, inputs row of
chips) and the four-facts screen into `root`. `onSubmit` fires when the
screen is submitted and core accepts the household; `onChange` when a chip
changes one answer — the page decides whether that re-evaluates
(`src/citizen/main.ts`: yes when the page already has answers, in place,
without moving focus). `open(field)` focuses one of the screen's controls:
`zip`, `state`, `kids`, `pay`, `unit`, `hours`, `rent`, `childcare`
(`#f-{field}`); any other flag opens the screen on the ZIP. `setFlags`
rewrites a hand-typed `earnings=` as `pay=&unit=year`.

The bar is **prepended** to `root`, so a page may keep its own content in
the same root and the sticky top row's containing block is the whole page
(a sticky child cannot outlive its parent's box). A surface that is not
the citizen's names the top row's two actions and can use the rest:

```ts
mountEditor(root, {
  onSubmit, onChange,
  actions: [{ label: "Add a what-if", short: "What-if", needsAnswers: true, onClick() {} }, { label: "Print the client sheet", short: "Print", primary: true, needsAnswers: true, onClick() {} }],
  altSubmit: { label: "Add as a what-if", onSubmit(flags) {} },   // a second, validated exit from the screen; never on a first visit
  onClose() {},                                                     // the screen closed, edits and all
  copy: { chips: { childcareSubsidy: "CCDF subsidy" }, heading: "The household", submit: "Update the household" },   // the surface's register over copy.ts, two levels deep
  order: ["where", "household", "pay", "rent", "childcare", "childcare-subsidy"],   // chip ids first; the rest follow in the citizen order
  collapse: "always",   // the chips stay behind the summary line's Edit at every width (the citizen page: no controls that change the answer)
});
editor.open("pay", { lead: "alt" });   // the screen led by the alternate exit: it is the primary button and what Enter presses
editor.setNote(textOrFragment);        // the .hg-scenario__note line, first in the row (a live region, placed on first use); "" empties it
editor.setCounty(zip, name);           // the county the Worker resolved, beside the place while that ZIP stands
```

A `needsAnswers` action is disabled, and the chips row hidden, until the
flags say enough to evaluate. A value chip whose answer is still "none"
carries `data-unset`, which the editor sets a step lighter. Below 720px
(at every width with `collapse: "always"`) the summary line names the
place once — the county in place of the ZIP once one is known — and its
separators are the editor's copy (`summary.line`), not code. A value chip's
dialog is titled by the chip's name and labels its one field by the unit
or the question ("Age in years", "Dollars a month", "Choose one").

**DOM the page owns** (`src/citizen/main.ts`): a visually hidden `h1`, then
`#result`, where `mountResult` puts `[role=status]` (loading text, or the
new sentence after a chip change), `#answer` (`tabindex="-1"`; focus lands
here after a person's own submit, never on a page load), `#chart` (the
MoneyCurve's one tab stop, with `.hg-mark[data-key]` buttons that open
`#step-{key}` rows), `#source[data-source="live"|"archetype"]` with *Try
again* in the archetype state, and a `[role=alert]` callout for failures.
The editor's own hooks are `#editor` (the screen, `hidden` when closed),
`#inputs` (the chips row) and `[data-chip="{id}"]` on every chip. The
`Result` seam is `clear()`, `loading(count)`, `render(evaluation, flags,
{ announce })`, `error(result)`; a render rebuilds the whole result from
the one evaluation. The result also fetches `/data/summary.json` once, for
the SourceNote's vintages and the incomplete-state notice, and renders
without it until it arrives. Every string it shows is in
`src/citizen/copy.ts` (`t()` throws on an unfilled slot), which
`npm run readability` grades.

**URL state** is the CLI's flags (`core/src/flags.ts`, `HOUSEHOLD_FLAGS`):
`/?zip=94110&kids=3,7&pay=30000&unit=year&married=1&housing=1`. A boolean
flag is `1` when true and absent when false; `flagsFromSearchParams` /
`searchParamsFromFlags` convert. `hotgap curve --zip 94110 --kids 3,7 --pay
30000 --unit year` is the same household. The page pushes a history entry
on submit and replaces it on a chip change; landing with a place and a pay
evaluates at once, landing without shows the screen.

The caseworker page adds one `whatif=` per what-if, each a mini query
string of the answers that what-if changes from the base (an empty value
removes one): `/caseworker.html?zip=80903&kids=3,7&pay=38000&unit=year&whatif=pay%3D55000&whatif=childcare-subsidy%3D`
(`src/caseworker/url.ts`). A chip pressed while a base stands adds a
what-if rather than changing the base; the four-facts screen changes the
base, or, through *Add as a what-if*, adds one. Landing on such a link is
1 + N evaluations, in parallel.

The editor's client is `src/editor/api.ts`: `evaluate(flags)` →
`{ ok, evaluation } | { ok: false, error, detail }` (`error` adds `"network"`
and `"timeout"` to `ApiErrorCode`).

## What a page may import from core

Types: anything. Runtime, from `@hotgap/core`, the pure and data-backed
functions only — nothing that talks to PolicyEngine (`fetchCurve`,
`evaluateHousehold`, `requestPE`, the probes; those are the Worker's):

- `validateAnswers`, `resolvePlace`, `zipToState`, `isTerritoryZip`
- `HOUSEHOLD_FLAGS`, `flagsFromSearchParams`, `searchParamsFromFlags`, `rawAnswersFromFlags`, `flagList`
- `toAnnual`, `fromAnnual`, `PAY_UNITS`, `DEFAULT_HOURS`, `axisSpec`
- `STATE_NAMES`, `STATE_CODES`, `FIPS_TO_USPS`, `IMMIGRATION_STATUSES`, `PROGRAM_IDS`, `CASH_PROGRAMS`
- `stateDefaults`, `childcareMonthlyFor`, `CHILDCARE_MAX_AGE`, `stateDefaultsProvenance`
- `pickArchetypeId`, `ARCHETYPES`, `answersFor` (the swept household an archetype curve models), `countyName`, `DEFERRAL_UNTIL`, `COVERAGE_PROGRAMS`, `PROGRAM_END_MIN`
- `povertyRoad`, `keepRate`, `cliffsBetween`, `keepNext`, `keepRateWords`, `KEEP_NEXT_OVER` (§ Keep rate)
- `loadSummary`, `loadStateFile`, `readData`, `reachCell`, `reachForArchetype`, `reachAtEarnings`, `minWageContext`, `evaluateCurve`, `evaluateOffline`, `analyzeCurve`, `escapeAnalysis` — after `provideData` with the file each needs (fetched from `/data/…` or imported from `@hotgap/core/data/*.json`, which Vite inlines: `state-defaults.json` 24 KB and `zip3-state.json` 12 KB are; `zip5-county.json` at 528 KB and a state file are not)

`cd app && npx vite build` prints each page's chunks with their gzip sizes;
the two small tables are inlined into the shared chunk, and the caseworker
page fetches `summary.json`, `reach.json` and, for a live household with a
county, `county-names.json` at runtime.

## Keep rate

The one question every surface asks: *of each extra dollar you earn, what do
you keep, and where does the road collapse?* (Plan 9,
`docs/superpowers/plans/2026-09-18-hotgap-keep-rate.md`; the definition and
its two caveats are in the root README § Honesty.) Core computes it; a page
renders it. What a page gets, and what it means:

**`HouseholdEvaluation.road: RoadSummary | null`** — the road out of poverty,
100% → 200% of the 2025 federal poverty guideline for the household's size,
snapped to the sweep's step. Null when either end runs off this curve's axis
(no swept cell: `axisSpec` always reaches past four times the poverty line).

The top carries a **one-step allowance for the grid**, and a page that prints
the road's ends should know why. A program limit is a dollar figure; the curve
is sampled every `step`, so a limit on the 200%-of-poverty line lands in the
step *starting* at the first sampled point at or above it — SNAP's broad-based
limit is the common case, tested against a fiscal-year-blended poverty figure
a little above the calendar guideline, so for a family of three (2 × $26,650 =
$53,300) the cliff is the step out of $54,000. So `hiStart` is that first
point, the road's last step is the one out of it, and `hi = hiStart + step` is
the top of the measured span — the cliffs counted and the rate measured are
then the same stretch of curve.

| field | type | meaning |
|---|---|---|
| `lo` | `number` | where the road starts: the sampled point nearest the guideline |
| `hiStart` | `number` | the start of the road's last step: the first point at or above twice the guideline |
| `hi` | `number` | the top of the measured span, one step past `hiStart` |
| `keepRate` | `number \| null` | dollars kept per extra dollar over the whole road; `0.30` is 30¢ kept, `-0.63` is 63¢ poorer. Null only when an end is not a sampled point |
| `cliffs` | `Cliff[]` | every cliff whose step starts in `[lo, hiStart]` — which is `[lo, hi)`, in earnings order — `cliffsBetween` |
| `worst` | `Cliff \| null` | the largest of them: where the road collapses |
| `familiesBelowHi` | `number \| null` | 0–100, families like this earning less than `hi`, the top of the span; null where the PUMS cell is missing or suppressed, never 0 |

**`Cliff.position: number | null`** — 0–100, how many families like this one
in this state earn less than `startEarnings`. On every cliff in
`analysis.cliffs`, and so on `worstCliff`, `nextCliff` and `deferred`, which
are the same objects. Null where the reach ladder has no trustworthy cell;
never read a null as 0. Cross-sectional: how many families already earn less,
never a family's odds of getting there.

**`PersonalEscape.keepNext: { over, kept } | null`** — `over` dollars ahead
(the next `KEEP_NEXT_OVER` = $10,000, shrinking to the axis end) and `kept`
dollars kept per dollar across them, measured from the last sampled point at
or below the household's pay. Null with less than one step of axis left. A
stretch can be flat with no cliff in it: that is a plateau, and this is the
number that says so.

**`StateMetrics`** (`summary.json`, every state × archetype cell) carries the
same six facts for the map: `keepRate` (4 decimals), `roadLo`, `roadHi`,
`roadCliffCount`, `roadWorst: { drop, at, programs } | null`, and
`biggestLossPosition` (0–100, one decimal). `roadHi` is the span's top
(`road.hi`), so a family of three reads $27,000 → $55,000; `hiStart` is on the
evaluation only — the position of the WHOLE-AXIS
worst step, so a table can say "$33,587 at $97,000 — 80 in 100 families like
this earn less". `roadLo`/`roadHi` are null and `roadCliffCount` is 0 when
there is no road; `keepRate` being null is what says so.

**Message codes** (`core/src/messages/*.json`, rendered through `coreText`).
Money arrives already formatted by `lib/format.ts` — the locale's dollars, and
on the citizen page the person's own pay unit; `cents` and `n` are counts.
`keepRateWords(rate)` gives the `sign`/`cents` pair, so no surface invents its
own rounding or sign word.

| code | parameters |
|---|---|
| `road.sentence` | `state`, `household` (the archetype phrase), `sign` (`keeps` \| `loses`), `cents` (always positive) |
| `road.rate` | `sign`, `cents` — the legend/strip phrase: "keeps 30¢ of each extra dollar" / "loses 63¢ of each extra dollar" |
| `road.collapse` | `at`, `program`, `drop` |
| `road.position` | `n` — "{n} in 100 families like this earn less" |
| `road.keepNext` | `over`, `kept` |
| `road.plateau` | `over`, `kept` |

## Languages

The site takes a new language as one file. Two of them exist: English, the
source, and Spanish (`es-US`), a draft. Migrated 2026-09-17 against the rules
decided 2026-09-16; what follows is what is there.

**Where the words are.** `src/i18n/en.json` holds all 1,076 messages a person
can read, namespaced by surface — `editor` 124, `citizen` 253, `caseworker`
369, `places` 207, `shared` 123 — and `src/i18n/es-US.json` holds a Spanish
message for every one of them. `core/src/messages/<locale>.json` holds the 43
sentences core writes for a person to read (`coverage`, `program`, `liheap`,
`road`, `validate`, `place`, `api`, `deferral`), which every surface renders in
its own language. A file's `_` key is its own record — its language, its status, its
date — never a message. The four `copy` modules are typed views into the
catalog, not stores: `export const copy = catalog.citizen`.

**How to add a language.** Copy `en.json` to `<tag>.json`, translate it, and
add the tag to `LANGUAGES` in `src/lib/copy.ts`. That is all: the switch, the
lazy chunk, `?lang=`, `<html lang dir>` and every `Intl` call read that list.
Copy `core/src/messages/en.json` the same way for the sentences core writes. A
message the new file lacks renders in English, so a partial translation ships
and the gate names what is left.

**The shape** is `src/lib/copy.ts`'s header, in full. A leaf is a whole ICU
message with its values as named arguments; variants are one ICU `plural` or
`select` and the locale's own CLDR rules choose the branch, never the code
(there is no `if (n === 1)` in the app); a nest keyed by a data value stays a
nest and the key path is the message id. Every argument arrives already
formatted by `src/lib/format.ts` through `Intl` in the active locale — money,
dates, lists, a pay figure in the person's unit — and a raw number is handed
over only as a plural's selector. Only whole sentences are joined, and only
lists, through `Intl.ListFormat`; a clause is never an argument.

**The reader** is `fill` / `parts` / `bind(copy)` → `t(key, params)`, over
`intl-messageformat` (measured against `@messageformat/core` and chosen in the
first commit of the migration). It throws on an argument left unfilled and on a
param with no argument, so a sentence cannot reach the page half-filled, and it
caches each compiled message, so a render is O(messages), not O(parses).

**core's prose is a code.** Coverage notes, unmodeled programs, the
other-benefits label, `validateAnswers` details, `/api` error details, program
names and a deferral's date are `{ code, params }` beside the English core
still writes, so the CLI, `summary.json` and the CSV never need the app;
`coreText` renders the code in the active locale and falls back to core's
English.

**Numbers, money, dates** are `Intl`'s, in the active locale. Money is always
US dollars formatted the locale's way — `es-US`, not `es-ES`, for a US
household, which is the same `$30,000` English writes; dates and lists are not
("16 sept 2026", "3 y 7"). The number words `Intl` has no spellout for are the
catalog's (`shared.numbers`), including the exact forms a language needs that
English composes ("veintiuno").

**The locale travels.** `?lang=` in the URL — kept by every address a page
writes, so a caseworker can send a client a link in the client's language —
else the viewer's remembered choice, else `navigator.languages`, else `en`.
`<html lang dir>` is set from it, the choice is remembered in `localStorage`
inside a try/catch as a convenience only, and the switch sits in the
ScenarioBar's top row and the places masthead, each language naming itself.
Every locale is a lazy chunk, `en` included, so a page ships no catalog it does
not read.

**Layout allows for expansion.** `design/tokens.css` and the page CSS use
logical properties (`margin-inline`, `padding-inline-start`, `text-align:
start`), so `dir="rtl"` needs no second stylesheet; labels wrap rather than
clip. Archivo carries Latin and Latin Extended; a language in another script
adds its subset beside `design/fonts/` when it ships.

**The gate** is `e2e/i18n.spec.ts`, in two halves. `qps-ploc` — every English
message accented, bracketed and two fifths longer, generated at load time by
`src/lib/pseudo.ts`, never a file — renders every page at 390 and 1280: a
string without the catalog's accent is hard-coded and the check names it and
the element holding it, and the document must not scroll sideways. Then `es-US`
renders every page and must show none of the 589 English phrases the gate
builds from `en.json`, must say `lang="es-US"`, and must carry the locale's own
dates, lists and dollars. Both halves were proved to fail before they were
trusted. `npm run readability` runs on English only.

**What stays English, on purpose.** The CSV's column headers and the URL's
parameter names — machine contracts, asserted identical in both languages
(the download's file name follows the language). A program's acronym (SNAP,
WIC, Medicaid, CHIP) and a program's name as the office wrote it, including a
state's own ("ConnectorCare", "Cascade Care Savings"), because a name is the
office's (`design/inventory.md` M3); the plain phrase beside it translates
("ayuda para la comida"). A county's name is a name and its kind is a common
noun, so `shared.county.*` says the kind ("Condado de El Paso"). The language
switch, where a language names itself. A citation's hostname.

**Spanish is a draft.** `es-US.json` says so in its `_` record, with the date
it was written (2026-09-17) and `reviewed: null`. It was drafted by the model
in each persona's register — the citizen plain and in `usted`, the caseworker
professional, the journalist quotable — and no native speaker has read it.
`design/README.md` § Languages says what a reviewer should look at first.

## Proofs

    npm run typecheck                  # tsc -b core pipeline app worker (wrangler types first)
    npx vitest run                     # unit tests, worker/src/index.test.ts included
    cd app && npx vite build           # the site
    cd worker && npm run build         # wrangler deploy --dry-run: bundle 923 KiB / 180 KiB gzip
    cd app && npx playwright test      # builds, starts wrangler dev, runs e2e/*.spec.ts — the editor, citizen, caseworker and places proofs, and the languages gate i18n.spec.ts (HOTGAP_ARCHETYPE_URL=a dead-engine server runs the caseworker's B1 test too; screenshots to design/audit/app/; the shared harness is e2e/support.ts)
    npm run readability                # Flesch–Kincaid over src/i18n/en.json, English only (design/PORT-FROM-ARCHIVE-2026-09-16.md M1)
    node e2e/text-dump.mjs <dir> <url> [lang]   # every page's text at 1280, one file each: diff two builds to prove a rendered string did not move

For the archetype path: run `wrangler dev` yourself with a dead engine
(`HOTGAP_PE_URL=http://127.0.0.1:9/us/calculate` in `worker/.dev.vars`), then
`HOTGAP_BASE_URL=http://localhost:8787 HOTGAP_EXPECT_SOURCE=archetype npx
playwright test`. The config's own `wrangler dev` runs with
`--var HOTGAP_RATE_LIMIT_OFF:1`, because the three specs back to back are
more than the 20 evaluations a minute the limiter allows; a server you run
yourself needs the same flag, or a fresh `worker/.wrangler/state` (the local
binding persists its counts there). The var is honoured only when it reads
`1`, is never in `wrangler.toml`, and must never be deployed.

Deploying (`cd worker && npx wrangler deploy`) replaces the public site and
is the owner's call.
