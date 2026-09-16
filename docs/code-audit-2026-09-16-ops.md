# Code audit — engine, builders, CI, hosting (2026-09-16)

**Scope:** `engine/**`, `scripts/**` (not `scripts/readability.mjs`, owned by an
unmerged branch), `.github/**`, the root `package.json`, and the docs that
describe them. `core/`, `pipeline/`, `app/`, `worker/`, `design/` and
`core/data/*.json` were out of scope and are untouched.
**Standard:** `~/.claude/CLAUDE.md` — smaller, clearer, more shared; reuse the
helper that exists, extract when two places want it; platform primitive over
hand-rolled; find a decision's reason before replacing it and keep the signal.
**Rule:** no behaviour change — same image, same CI outcomes, same data files
byte for byte, same engine responses. Anything that would change one is
listed under "Not fixed".
**Branch:** `worktree-agent-a9b612f9c5d400e12`, eleven code commits on top of
`3e9e544`, `9d57281..9797761`, then this document.

## How each claim was proven

Runners, never bare binaries: `npm run typecheck`, `npx vitest run` (root:
35 files, 444 tests, 26 skipped — identical before and after),
`python3 -m py_compile engine/*.py`, `node --check` on all seven scripts,
PyYAML over the six YAML files. The engine has no test suite of its own; it
was exercised through the main checkout's `engine/.venv` (policyengine-us
2.6.2, gunicorn 26.2.0) against this worktree's code.

- **Engine responses:** a Flask test-client driver posts ten requests — both
  recorded fixture axes (CA 101 points, MA 11), a scalar request, a request
  with a `policy`, the unknown-variable / wrong-entity / unknown-entity
  rejection, an invalid policy, three malformed bodies, `/healthz` — and
  records status, body bytes and headers. Byte-identical before and after
  (`engine/*.py` unchanged after `0497989`).
- **gunicorn:** `gunicorn --print-config` for the old Dockerfile CMD and for
  `-c engine/gunicorn.conf.py` with `PORT=8080`, and for the action's old and
  new command lines: identical except the config-path line. The image was
  rebuilt (`docker build engine/`), resolves `0.0.0.0:8080` / 2 workers /
  1 thread / 120 s / preload / 100±20 from inside the container, and serves
  `/healthz` with gunicorn as PID 1.
- **Builders:** `build-state-defaults.mjs` from the cached downloads writes
  the committed `core/data/state-defaults.json` byte for byte (before and
  after every commit that touched it). `build-reach.mjs --states=WY` was run
  on the base revision into a scratch copy of the committed file, then after
  each change against that scratch file: byte-identical every time,
  including a run with a PUMS zip deleted so the download went through the
  shared `fetchToFile`. The ZIP builders were run from a scratch tree on the
  base revision and on each later revision: byte-identical. For the branch a
  live run cannot reach (BLS offline), the old ECI functions lifted from the
  base revision and the new `scripts/lib/eci.mjs` agree exactly on both
  fallback tables (18 study-year factors) and on synthetic vintages with
  2026Q3 and with all of 2026 published.
- **Hosting script:** `userData()` rendered from a scratch copy with fake
  tokens; the cloud-init differs from the base revision's in exactly the
  two compose lines dropped, and still parses as cloud-config and as
  compose; the firewall request body is byte-identical. Not exercised: a
  real `up`/`down`, which would bill.
- **Workflows:** a script parses every workflow into name / triggers /
  permissions / concurrency / jobs / runner / timeout / step list; the
  before-and-after shapes differ only in the two `run:` lines and the
  dropped default checkout token.

## Fixed

| Where | What | Why | Commit | Proof |
| --- | --- | --- | --- | --- |
| `engine/gunicorn.conf.py` (new), `engine/Dockerfile`, `.github/actions/start-engine/action.yml`, `engine/README.md`, `README.md` | One gunicorn config. The image's CMD, the runner action and two README snippets each had their own command line and had drifted (root README: four workers, no `--threads 1`, no recycling; engine README's "the way the image does": four workers where the image has two). The conf carries threads, timeout, preload and recycling with the Dockerfile's reasons; the CMD loads it and takes gunicorn's own `PORT` default for the bind; the action overrides only bind and worker count. The `GUNICORN_MAX_REQUESTS` knob stays: e65fceb verified the fix at 20. | One source for the settings the brief named. | `9d57281` | `--print-config` diff; image rebuilt and smoke-run |
| `engine/calculate.py` | `_baseline_overrides()` called three times for an import-time constant → `BASELINE_OVERRIDES`; two `except CalculateError: raise` that nothing inside the `try` could raise; `_series`'s unused `variable` parameter. | Dead code, repeated work. | `0497989` | ten-request probe byte-identical |
| `engine/README.md` | "No authentication" predates the bearer token; "last 8 distinct policy objects" predates `_POLICY_CACHE_SIZE` defaulting to one (the Docker section already said one). | Doc drift. | `78ed270` | — |
| `scripts/build-reach.mjs`, `build-state-defaults.mjs`, `build-zip-table.mjs` | Three hand-copied 51-state tables → `STATE_CODES` / `FIPS_TO_USPS` from `core/src/states.ts` (plain `node` strips the types, 22.18+; CI runs 22.x). Neither builder needed USPS→FIPS. `STATE_CODES` iterates in the copies' order, which fixes reach.json's key order. | Reuse the helper that exists. | `4f98d86` | state-defaults / reach WY / zip3 byte-identical |
| `scripts/lib/eci.mjs` (new) | The same twenty lines in both builders — parse quarters, find the latest published quarter, 12-month rate, project 2026, average — with state-defaults' cross-check comparing two copies of one formula. Now one arithmetic; each builder keeps its own fetch (different windows, on purpose), fallback table (with its date) and `method` wording (which is in the data files). | Extract when two places want it; the cross-check now tests the ECI vintage, not the formula's agreement with itself. | `d4821f6` | live runs byte-identical; offline old-vs-new exact on 4 vintages |
| `scripts/lib/builder.mjs` (new), all four builders | Command-line parsing, `--out=` resolution, the "stamp only what changed" write (same code, different key and indent), fetch-to-disk, the `unzip -p` child with its close promise. The ZIP builders shelled out to `curl` (one to `cat /tmp/US.txt`) where the others used `fetch`. | Same helper written per script; platform primitive over a shell pipeline. | `6e78ced` | all four builders byte-identical, one PUMS download forced |
| `scripts/hosted-engine.mjs` | `health(url)` for `up` and `status`; one `anywhere` address list and a mapped outbound rule; compose no longer restates `PORT=8080` and `GUNICORN_MAX_REQUESTS=100` (the image's defaults) — the box carries only what it decides, `WEB_CONCURRENCY` and the token; header sizing figure (4.5 GB) disagreed with the README's verified 3 GB and now points at "Size, and why". | DRY across the three paths; KISS where a parameter was always the default. | `a0eb995` | cloud-init diff = the two lines; firewall body identical |
| `.github/workflows/ci.yml`, `contract.yml` | `RUN_CONTRACT=1 npx vitest run contract --no-file-parallelism` twice → `npm run contract`, which is that string. | The suite's flags in one place. | `3dd29dc` | shape diff |
| `.github/workflows/places-data.yml` | `with: { token: "${{ github.token }}" }` on checkout is the action's default. | Parameterised to the default. | `3dd29dc` | shape diff |
| `.github/workflows/engine-image.yml` | Comment still described App Platform `deploy_on_push`, replaced by Watchtower on the droplet in 79824dd. | Doc drift. | `3dd29dc` | — |
| `.github/dependabot.yml` | npm ecosystem added: `npm audit` on the committed lockfile reports five advisories (1 critical, 1 high, 3 moderate) on vitest 2.1 → vite 5.4 → esbuild 0.21 and `@vitest/mocker`, fix is a vitest major, nothing was watching. Weekly, one grouped PR, gated by CI's test and typecheck. | The reason in the brief held. | `59aa730` | — (changes which PRs open, not any outcome) |
| `README.md` § Develop | `typecheck` comment said `tsc -b core pipeline`; it runs `wrangler types` then `tsc -b core pipeline app worker`. "against a 2.5.0 release" was the pin at the time and is 2.6.2 now; the sentence names the pin's file and what the public API serves instead of a number that moves with each bump. | Doc drift. | `31cc931` | — |
| `scripts/lib/*.mjs` | Comments trimmed to say each thing once. | Smaller. | `9797761` | re-proven |

## Not fixed, and why

- **`core/data/zip3-state.json` is one entry behind its builder.** The
  committed table has `"969": "MH"`; `build-zip-table.mjs` filters territory
  codes (the runtime guard in `core/src/zip.ts` rejects `MH` anyway). A
  rebuild removes the entry — a data-file change, so it is reported, not
  done. Everything else the builder writes is byte-identical.
- **`fixtures/` were recorded on policyengine-us 2.5.0; the pin is 2.6.2.**
  Re-recording (`fixtures/README.md`) re-pins tests — a behaviour change,
  out of scope.
- **Timeouts.** `ci.yml`'s `test` job and `contract.yml` have none (default
  360 min). 15 and 30 minutes would be safe, but a wrong guess fails a
  passing job and the public-API contract run's duration is unmeasured.
  Propose: add after one timed run.
- **A composite action for `setup-node` + `npm ci`.** `actions/checkout`
  must precede a local composite action, so it would save one line per
  workflow and add a file. Not smaller; skipped.
- **The memory sampler in `places-data.yml`** earns its line: the reason
  (the only trace when a runner dies of OOM, since no later step runs) still
  holds and the fix it diagnosed (`max_requests`) is the kind of thing that
  regresses with a model bump.
- **`engine/Dockerfile`'s "policyengine-us 2.4.2 itself supports 3.11-3.14"**
  names an old pin; `requirements.txt` states the range for the model. Left:
  I did not verify 2.6.2's range.
- **`engine/README.md`'s `/healthz` example shows 2.5.0** — an example, left.
- **`build-zip-county.mjs`'s BOM strip** is now a no-op (`Response.text()`
  strips it); left as harmless defence.
- **`hosted-engine.mjs` `WORKERS`** is a string constant interpolated into
  YAML; fine as is.
- **dependabot `github-actions` ecosystem** — the actions ride floating
  majors; not asked, not added.

## Big O

**Engine, one `/us/calculate`.** Let V = variable leaves in the request,
I = entity instances, N = axis points (1 without axes), P = the `policy`
size. Auth `O(1)`; `_validate` `O(V)` dictionary lookups; policy cache key
`O(P log P)` (`json.dumps(sort_keys)`); `copy.deepcopy(household)` `O(V)`;
`Simulation(...)` builds the situation `O(I·N)` (~0.07 s). The fill loop
calls `simulation.calculate(name, period)` once per (instance, variable,
period): the first call for a (variable, period) computes the whole vector
across all cells and policyengine-core caches it, later instances are hits,
so the loop is `O(V·I·N)` of slicing plus the model's own evaluation of the
dependency closure, `O(D·N)` vectorised. Nothing superlinear in N; the model
dominates. Per process, not per request: `BASELINE_SYSTEM` (shared
copy-on-write from the preloaded master), the one-entry policy cache
(~2 GB warm), the entity/role tables. Per request and freed: the deep copy
and the simulation's holders. Memory growth across requests is the glibc
arena effect the recycling handles, not a leak in this code.

**`build-reach.mjs`.** Per state: two streamed CSV passes `O(H + P)` rows
(bounded memory via `unzip -p`), a `Map` of kept households `O(H)` with an
80-int replicate array each (~400 B; CA ≈ 60 MB). Per cell: one sort
`O(n log n)`, then 81 ladder walks `O(81·n)`. 11 cells × 51 states. ADJINC
set unions `O(k log k)` with tiny k. Linear in the data.

**`build-state-defaults.mjs`.** County populations `O(rows)`; the FMR
sheet is read whole (a few MB) and split with a lazy row regex `O(bytes)`;
the NDCP sheet streams row by row `O(bytes)` (the `buf` between chunks is
one partial row, so the `+=`/`slice` pattern stays linear); medians sort
per state per band `O(c log c)`, c ≤ 254. Whole run 1.6 s from cache.

**`build-zip-county.mjs`.** One pass `O(rows)` + `O(z log z)` sort of
33,791 ZCTAs. **`build-zip-table.mjs`.** One pass `O(rows)` + a per-prefix
sort of at most a handful of states.

**`hosted-engine.mjs`.** `O(1)` API calls; polling bounded at 15 min.

## Line counts (base `3e9e544` → `HEAD`)

| File | Before | After |
| --- | ---: | ---: |
| `engine/calculate.py` | 355 | 352 |
| `engine/Dockerfile` | 35 | 27 |
| `engine/gunicorn.conf.py` | — | 35 |
| `scripts/build-reach.mjs` | 567 | 526 |
| `scripts/build-state-defaults.mjs` | 617 | 577 |
| `scripts/build-zip-county.mjs` | 37 | 38 |
| `scripts/build-zip-table.mjs` | 42 | 43 |
| `scripts/hosted-engine.mjs` | 164 | 165 |
| `scripts/lib/builder.mjs` | — | 44 |
| `scripts/lib/eci.mjs` | — | 48 |
| `.github/actions/start-engine/action.yml` | 43 | 36 |
| `.github/dependabot.yml` | 12 | 22 |
| `.github/workflows/places-data.yml` | 52 | 51 |
| other workflows, `app.py`, `requirements.txt` | unchanged | |

Scripts: 1,427 → 1,441 (+14): ~90 duplicated lines gone, 92 lines of
shared helpers added, about a third of them the comments that carry the
reasons. Engine: 544 → 568 (+24): the config file, whose comments came
out of the Dockerfile and the action (−15 there), and −3 in
`calculate.py`. `.github`: 188 → 190 (+2), Dependabot's +10 against −8
elsewhere. READMEs +5 (`engine/README.md` 256 → 260, `README.md`
513 → 514) for sentences that now match the code. Net about +40 lines
across the scope, all of it a new single source or a stated reason; the
files that were duplicated into are the ones that shrank.
