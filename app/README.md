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
| `index.html` | citizen | `src/citizen/main.ts` — mounts the editor and the result | editor wired; result is the minimal placeholder in `src/citizen/result.ts` |
| `places.html` | journalist | `src/places/main.ts` | being built |
| `caseworker.html` | caseworker | `src/caseworker/main.ts` — the editor with this surface's actions, the base household in full, its what-ifs beside it | built |

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
  actions: [{ label: "Add a what-if", short: "What-if", onClick() {} }, { label: "Print the client sheet", short: "Print", primary: true, onClick() {} }],
  altSubmit: { label: "Add as a what-if", onSubmit(flags) {} },   // a second, validated exit from the screen; never on a first visit
  onClose() {},                                                     // the screen closed, edits and all
});
editor.openInputs("housing");   // show the chips row (hidden behind Edit below 720px) and focus a chip
editor.setNote(text);           // the .hg-scenario__note line a take-up toggle answers with (a live region, appended on first use); "" empties it
editor.setCounty(zip, name);    // the county the Worker resolved, beside the place while that ZIP stands
```

**DOM the page owns** (`src/citizen/main.ts`): a visually hidden `h1`, then
`#result`, where `mountResult` puts `[role=status]` (loading text, or the
new sentence after a chip change), `#answer` (`tabindex="-1"`; focus lands
here after a submit), `#source[data-source="live"|"archetype"]` with *Try
again* in the archetype state, and a `[role=alert]` callout for failures.
The editor's own hooks are `#editor` (the screen, `hidden` when closed),
`#inputs` (the chips row) and `[data-chip="{id}"]` on every chip. The
citizen page proper replaces `result.ts` behind the same `Result` seam —
`clear()`, `loading(count)`, `render(evaluation, flags, { announce })`,
`error(result)` — and keeps these ids, which the proofs assert.

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
- `pickArchetypeId`, `ARCHETYPES`, `answersFor` (the swept household an archetype curve models), `countyName`, `DEFERRAL_UNTIL`, `COVERAGE_PROGRAMS`
- `loadSummary`, `loadStateFile`, `readData`, `reachCell`, `reachForArchetype`, `minWageContext`, `evaluateCurve`, `evaluateOffline`, `analyzeCurve`, `escapeAnalysis` — after `provideData` with the file each needs (fetched from `/data/…` or imported from `@hotgap/core/data/*.json`, which Vite inlines: `state-defaults.json` 24 KB and `zip3-state.json` 12 KB are; `zip5-county.json` at 528 KB and a state file are not)

The citizen bundle today is 61 KB (18.8 KB gzip) with the two small tables inlined.
The caseworker page loads the shared editor chunk (57 KB, core and the two
tables) plus its own 40 KB (14.5 KB gzip), and fetches `summary.json`,
`reach.json` and, for a live household with a county, `county-names.json`.

## Proofs

    npm run typecheck                  # tsc -b core pipeline app worker (wrangler types first)
    npx vitest run                     # unit tests, worker/src/index.test.ts included
    cd app && npx vite build           # the site
    cd worker && npm run build         # wrangler deploy --dry-run: bundle 923 KiB / 180 KiB gzip
    cd app && npx playwright test      # builds, starts wrangler dev, runs e2e/editor.spec.ts and e2e/caseworker.spec.ts

For the archetype path: run `wrangler dev` yourself with a dead engine
(`HOTGAP_PE_URL=http://127.0.0.1:9/us/calculate` in `worker/.dev.vars`), then
`HOTGAP_BASE_URL=http://localhost:8787 HOTGAP_EXPECT_SOURCE=archetype npx
playwright test`. The local rate-limit binding persists its counts under
`worker/.wrangler/state`; delete that directory if a run trips 429 after
several runs in one minute.

Deploying (`cd worker && npx wrangler deploy`) replaces the public site and
is the owner's call.
