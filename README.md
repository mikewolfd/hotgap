# HotGap

**If I get paid more, do I lose more than I gain?**

HotGap shows what happens to a household's money as its pay goes up. Food
help, health coverage, child-care help and tax credits all shrink or stop at
different incomes, and sometimes a raise leaves a family worse off. HotGap
draws that curve for a real household, finds the steps where money is lost
(the *cliffs*), and says how big a raise it takes to get clear of them.

**Live site:** <https://hotgap.mdeeb.workers.dev>

Estimates only: the rules come from [PolicyEngine](https://policyengine.org)'s
model of U.S. tax and benefit law, and a caseworker decides real benefits.

## What you see

The site has three pages, each built for a different reader:

| Page | For | What it shows |
|---|---|---|
| [`/`](https://hotgap.mdeeb.workers.dev/) | A household | Answer a few questions; get your own curve, the rough zones on it, and the raise that clears them. |
| [`/places`](https://hotgap.mdeeb.workers.dev/places) | Journalists, researchers | A 50-state + DC map of what a raise costs a typical family, for 11 household shapes. |
| [`/caseworker`](https://hotgap.mdeeb.workers.dev/caseworker) | Caseworkers | A client's full household, with what-if variations side by side. |

The figures behind the pages:

- **The money line** — earnings plus benefits, minus taxes and minus what
  the household actually pays for health coverage (premiums net of any
  subsidy), at every pay level.
- **Cliffs** — steps where earning more leaves the household with less, each
  broken down by what caused it (benefits lost, credits lost, premiums
  gained).
- **The leap** — the single raise needed to get past the worst rough zone and
  keep money from every extra dollar again.
- **Reach** — where that pay sits among real households in the state (Census
  ACS earnings data).
- **Keep rate** — cents kept of each extra dollar earned on the road from
  100% to 200% of the poverty line.

## Quick start

Needs Node 22.18 or later.

```sh
npm install
npm run hotgap -- curve --state CA --kids 3,7 --earnings 30000 --offline
```

```
CA · single · kids aged 3, 7 · $30,000/yr from work
verdict: in danger zone
money after health costs at $30,000: $75,484

  at        drop      programs lost
  $28,000   $2,378    tanf
  $48,000   $841      snap
  $87,000   $12,376   childcare
  ...
your path
  you are in a rough zone from $28,000 to $37,000
  a raise of $7,000 clears it
```

`--offline` reads the committed state data, so no network is needed. Drop it
for a live calculation of the exact household (rent, ages, disability, other
income and more). All the flags, and the library API behind them, are in
[core/README.md](core/README.md).

To run the site locally, see [app/README.md](app/README.md#run).

## How it works

```
household answers ──► core: validate, build request ──► PolicyEngine ──► curve
                                                                            │
     page ◄── core: cliffs, leap, reach, corrections ◄───────────────────────┘
```

- **[PolicyEngine](https://policyengine.org)** does the tax and benefit
  calculation. HotGap runs its own copy of the one endpoint it calls
  ([engine/](engine/README.md)), pinned to the latest `policyengine-us`
  release. It's faster than the public API and models all 51 states' child
  care subsidies; the public API remains the fallback.
- **`@hotgap/core`** builds the request, reads the curve back, and does all the
  analysis. It also applies a handful of sourced local corrections where the
  model is known to be wrong or incomplete. The same code runs in Node, in
  the Cloudflare Worker, and in the browser.
- **The weekly sweep** (`pipeline/`) computes 51 states × 11 household shapes
  (single or married, 0–3 children, one or two earners) and commits the
  results to `core/data/`. The places map reads them, and so does any
  household lookup that runs `--offline` or can't reach the engine.
- **The site** is three static pages (`app/`) plus a Cloudflare Worker
  (`worker/`) that serves them and answers `POST /api/evaluate` live.

## What it does and doesn't model

In brief — the full account, with sources for every correction, is in
[docs/methodology.md](docs/methodology.md).

- **Health cost is premiums only**, net of subsidies: not deductibles or
  copays. Adults in a non-expansion state's coverage gap are shown paying
  nothing, and flagged.
- **Entitlements are claimed by default** (SNAP, TANF, Medicaid, WIC); a
  household can say it doesn't get one, and HotGap reports what it's leaving
  on the table.
- **Rationed programs are off by default** (Head Start, housing vouchers, the
  child-care subsidy, energy assistance, employer coverage), because most
  eligible families don't get them. Each can be turned on.
- **A loss that lands at a later renewal still counts.** Some rules (a
  child's 12 months of continuous Medicaid, for example) delay a loss rather
  than prevent it; HotGap counts the loss and labels when it lands.
- **The map's families are typical, not real.** Each is a renter in the
  state's most populous county paying that county's fair-market rent and
  child-care prices, with every parent working.
- **Not modeled:** out-of-pocket medical costs, SSDI's trial work period,
  Medicare's two-year wait after SSDI starts, a household member over 65.

## Repository layout

| Path | What's there |
|---|---|
| `core/` | `@hotgap/core`: the calculation library, the committed data (`core/data/`) and the `hotgap` CLI — [README](core/README.md) |
| `pipeline/` | The weekly 51-state sweep that produces `core/data/` |
| `app/` | The three site pages (Vite) — [README](app/README.md) |
| `worker/` | The Cloudflare Worker: serves `app/dist`, answers `/api/evaluate` |
| `design/` | The design system (`tokens.css`), component inventory and design reviews — [README](design/README.md) |
| `engine/` | HotGap's self-hosted PolicyEngine endpoint (Python) — [README](engine/README.md) |
| `contract/` | Live contract tests against a PolicyEngine endpoint |
| `fixtures/` | Recorded PolicyEngine requests and responses for tests — [README](fixtures/README.md) |
| `scripts/` | Builders for the data files, and the hosted-engine helper |
| `docs/` | Methodology, data sources, validation reviews, upstream issue reports, plans |

## Development

```sh
npm test              # unit tests
npm run typecheck     # tsc across core, pipeline, app and worker
npm run contract      # live contract tests (public API, or HOTGAP_PE_URL)
npm run pipeline      # re-run the full sweep (~35 min against the engine)
```

`npm run pipeline -- --from-data` recomputes the summary from curves already
on disk with no network, and `--dry-run` builds every request without sending
any.

**Pointing at an engine.** Every PolicyEngine call goes to `HOTGAP_PE_URL`
when it's set, otherwise to the public API. The hosted engine runs on a
DigitalOcean droplet (`scripts/hosted-engine.mjs up|down|status`; see
[engine/README.md](engine/README.md)); copy `.env.example` to `.env` for its
URL and token. Or run one locally:

```sh
python3 -m venv engine/.venv
engine/.venv/bin/pip install -r engine/requirements.txt
PORT=8080 engine/.venv/bin/python -m engine.app &
HOTGAP_PE_URL=http://127.0.0.1:8080/us/calculate npm run pipeline
```

## Automation and deployment

| What | When | How |
|---|---|---|
| Tests, typecheck, engine contract | Every push and PR | `.github/workflows/ci.yml` |
| Public-API contract check | Daily | `.github/workflows/contract.yml` |
| Data sweep | Mondays 07:00 UTC, or by hand | `.github/workflows/places-data.yml` — tests, then commits `core/data/` if anything changed |
| Engine image | Push to `main` touching `engine/` | `.github/workflows/engine-image.yml` builds the image; Watchtower on the droplet picks it up |
| Site | Every push to `main` | Cloudflare's Git integration (configured in the Cloudflare dashboard) builds `app/` and deploys `worker/` — it does not wait for CI |

Dependabot keeps the npm packages and the `policyengine-us` pin current; a new
model release has to pass the engine contract tests in CI before it merges.

## Further reading

- [docs/methodology.md](docs/methodology.md) — every modeling choice, correction and known gap
- [docs/data.md](docs/data.md) — each data file, its source, and how to rebuild it
- [docs/reviews/](docs/reviews/) — methodology and external validation reviews
- [docs/upstream/](docs/upstream/) — issues filed with PolicyEngine and the local corrections that stand in for them
- History: the first site UI lives at git tag `ui-archive`; the plans in `docs/superpowers/` predate the current layout, and the reviews in `design/` cite the site's earlier hosts (hotgap.hotgap.workers.dev, hotgap-next.hotgap.workers.dev)

## License

[AGPL-3.0-only](LICENSE).
