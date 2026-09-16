# engine — a self-hosted `POST /us/calculate`

HotGap makes exactly one kind of external call: `POST /us/calculate` against
`https://api.policyengine.org`. This is that endpoint, run locally against the
released `policyengine-us` package, and nothing else. It is glue, about 200
lines: `calculate.py` turns a request into a `policyengine_us.Simulation` and
the response back out, `app.py` is the HTTP skin.

Two reasons to run it:

* **13 states.** The hosted service runs an older model that exposes 38 of the
  51 state child-care subsidy variables, so a third of the states cannot be
  modelled at all — `ny_child_care_subsidies` is an HTTP 400 there. All 51 are
  in 2.5.0. A Texas single parent of a 3-year-old with an $800/month bill, at
  $20,000 of pay: the hosted API says the subsidy is $0, this says $6,307, and
  the subsidy's end at $62,000 is a $2,087 cliff that simply is not on the
  hosted curve.
* **Speed of a parameter override.** HotGap sends a `policy` object for eight
  states (its sourced corrections). Measured 2026-09-15 on a 151-point Texas
  curve with a parameter value neither side had seen: hosted **36.7 s**, here
  **10.8 s** cold and **0.7 s** once that policy's tax-benefit system is cached.
  A request with no `policy` is about **0.4-2 s** for a 101-151 point sweep.

## Run it locally

From the repository root, on Python 3.11-3.14:

```sh
python3 -m venv engine/.venv
engine/.venv/bin/pip install -r engine/requirements.txt
PORT=8080 engine/.venv/bin/python -m engine.app
```

The first import builds the whole tax-benefit system and takes about 10 s;
after that the process is ready. `python -m engine.app` is the Flask
development server — one request at a time, which is what `calculate.py` wants
anyway. For anything beyond one caller, run it the way the image does:

```sh
engine/.venv/bin/gunicorn --bind 127.0.0.1:8080 --workers 4 --threads 1 \
  --timeout 120 --preload engine.app:app
```

## Run it under Docker

The build context is `engine/`, so the repository's `node_modules` and `data/`
are never sent to the daemon:

```sh
docker build -t hotgap-engine engine/
docker run --rm -p 8080:8080 -e WEB_CONCURRENCY=4 hotgap-engine
```

Each worker holds its own copy-on-write view of a roughly 1 GB model, so size
`WEB_CONCURRENCY` by memory, not by cores. Two things to expect from it:

* The container is slower than the same code on the host — on an Apple Silicon
  laptop, 0.4-1 s per request against 0.4-0.8 s native, but 18.8 s against
  10.8 s for the tax-benefit-system build behind a cold `policy` object, which
  is the part that is pure CPU.
* The cache of built `policy` systems is per process, so with `--workers N` a
  given `policy` object is built up to N times before every worker has it. The
  eight states HotGap sends corrections for cost about `8 × N × 7 s` of
  one-time work across a sweep.

## Point HotGap at it

```sh
export HOTGAP_PE_URL=http://127.0.0.1:8080/us/calculate
npx tsx core/src/cli.ts curve --state TX --kids 3 --childcare 800 --hours 40 \
  --childcare-subsidy --earnings 20000
npm run contract          # the live contract suite, against this service
```

`HOTGAP_PE_URL` is read in `core/src/client.ts` on every request and defaults
to the public API, so the CLI, the pipeline and the contract suite all follow
one switch and nothing changes for anyone who does not set it.

This is where the weekly sweep runs. `.github/actions/start-engine` installs
`requirements.txt` and serves this under gunicorn on the runner;
`places-data.yml` points the pipeline at it, and CI's `engine-contract` job
runs the live contract suite against it on every push. Dependabot keeps the
pin on the latest release, so a bump is a PR that has to pass that job.
`core/src/client.ts` also reads `/healthz` once per sweep and writes the
release into `summary.json` and each state file as `model`.

## Which model produced a number

`GET /healthz` and an `X-PolicyEngine-Version` header on every response:

```sh
$ curl -s localhost:8080/healthz
{"status": "ok", "model": "policyengine-us", "version": "2.5.0",
 "policyengine_core": "3.32.5", "policy_systems_cached": 0}
```

The version lives in the header rather than the JSON body so the body stays
byte-comparable with the public API's. Two things the client reads from the
model rather than the version: whether Massachusetts TAFDC is counted twice
(a sentinel probe, `probeMaTafdcDoubleCount`), and Head Start's place in net
income (the `include_head_start_benefits_in_net_income` contract test).

## What it deliberately does not implement

The public API is a whole product; this is the one endpoint HotGap calls.

* **Only `POST /us/calculate` and `GET /healthz`.** No `/us/economy`, no
  `/us/policy`, no `/metadata`, no household storage, no user accounts, no
  other country. Any other path is a Flask 404 in HTML, not the API's JSON.
* **No authentication, no rate limiting, no result cache.** Bind it to
  localhost. The public API caches whole responses — a repeat of the Texas
  request above came back in 0.17 s — and this does not; it caches only the
  built tax-benefit system for the last 8 distinct `policy` objects, which is
  where the seconds actually are. HotGap has its own curve cache
  (`core/src/client.ts`).
* **No `Microsimulation`.** Household situations only. Society-wide impacts,
  datasets and the Populace download are not touched, which is also why the
  container needs no network at runtime.
* **No `time_period`/`region`/`baseline` request options**, no reform types
  other than a flat `{parameter path: {period: value}}` `policy` object —
  `Reform.from_dict`, which is what HotGap sends.
* **No sub-annual periods beyond what the model itself accepts.** HotGap sends
  `"2026"` everywhere; other period strings are passed straight through to
  `simulation.calculate` and stand or fall on their own.

## Where it is known not to match the public API

Honest list. The first item is a real behaviour change and the one to decide
about; the rest are cosmetic or are the point of the exercise.

1. **Head Start is behind a switch from 2.4.2.** The inclusion of Head Start
   in `household_net_income` moved behind a parameter,
   `gov.simulation.include_head_start_benefits_in_net_income`, which defaults
   to `false` for all time; the hosted model has it unconditionally on. The
   person-level `head_start` value is identical on both ($22,285.26 for the
   contract suite's CA household), but net income differs by exactly that
   amount — verified as a `policy` override, the household's net income goes
   from $32,986.92 to $55,272.17 against the hosted service's $55,257.64.

   The service restores it, as a named baseline override in
   `engine/calculate.py` (`_baseline_overrides`), because HotGap's own code
   assumes it: `core/src/parse.ts` builds `otherBenefits` as
   `household_benefits` minus the programs it names, and it names `headstart`,
   and `applyHeadStart` in `core/src/evaluate.ts` subtracts the sticker value
   it expects to find there. A $22k value silently leaving every curve is not
   a transport decision, so the restore is explicit and can be switched off
   with `HOTGAP_ENGINE_HEAD_START_IN_NET_INCOME=0`. The contract suite's
   "head_start:0 override removes Head Start from net income" pins it against
   whichever endpoint `HOTGAP_PE_URL` names.

2. **Model-version differences everywhere else**, which is the whole reason for
   running this. Colorado, a state the hosted model already supports, agrees
   closely: over a 151-point curve for a single parent with a 3-year-old and a
   $900/month bill, the same five cliffs at the same earnings with the same
   programs lost, net income never more than $220 apart, SNAP never more than
   $23. The 13 states without child-care variables upstream are where the two
   diverge completely.

3. **Error message text outside the shapes HotGap sends.** An unknown variable
   and a variable on the wrong entity produce byte-identical messages to the
   public API's (checked live against both). A malformed body, an unknown
   entity plural or a situation the model's own parser rejects produce the same
   `{status, message, result, errors}` envelope and HTTP 400, but the wording
   is this service's.

4. **HTTP 500, which the public API may not use.** A failure that is the
   server's own — not the caller's payload — answers 500 with the same error
   envelope, so `core/src/client.ts` retries it instead of treating it as a
   rejected payload.

5. **`NaN`/`Infinity` are emitted as Python's bare `NaN`, which is not valid
   JSON.** Matching the public API's Flask default. No variable HotGap requests
   has produced one.

6. **`spm_unit_spm_threshold` and `spm_unit_is_in_spm_poverty` need
   `county_fips`** from 2.4.2, and raise without it. HotGap requests neither.

## How it was checked

* `npm run contract` with `HOTGAP_PE_URL` set at it: 13 of 14 pass, the
  fourteenth being item 1 above. (A fifteenth-of-the-same-suite caveat: the
  Massachusetts assertion in `contract/corrections.contract.test.ts` fails
  identically against the public API on `main`, so it is not about this
  service.)
* Response shape diffed against the live public API, request for request, for
  an axes sweep, a plain scalar request, a boolean/enum request, a
  wrong-entity rejection and an unknown-variable rejection: identical
  everywhere except that the unknown-variable rejection lists one name fewer,
  because `ny_child_care_subsidies` exists here and not there.
* The two recorded responses in `fixtures/` were used as an older witness of
  the same wire format.
