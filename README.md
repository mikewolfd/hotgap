# HotGap

**If I get paid more, do I lose more than I gain?**

HotGap is a free, open-source website that shows benefits cliffs in plain
language: what happens to a real household's food help, health coverage,
childcare help, and tax credits as pay goes up. The money line is
**health-adjusted** — it counts what a household actually pays for health
coverage (premiums net of subsidy, plus other out-of-pocket costs), not just
cash benefits, so "what you keep" means money left after paying for health.
Two doors: check your own numbers, or compare which states have the worst
gaps on a map — by biggest loss, or by **the leap**, the raise a family must
clear in one move to get past the worst rough zone and earn safely again.

Calculations come from [PolicyEngine](https://policyengine.org)'s open
rules engine via its public API. Estimates only — a caseworker decides
real benefits.

- `app/` — React site (question flow, result chart, places map + drill-down)
- `worker/` — Cloudflare Worker (API proxy + cache + static hosting)
- `shared/` — types and curve math used by both the app and the pipeline
- `pipeline/` — weekly batch job: sweeps 51 states × 8 household archetypes
  through the same PolicyEngine API and shared math as the personal door,
  producing the places-door map data and the personal door's offline fallback
  curves
- ZIP→state data derived from [GeoNames](https://www.geonames.org/) (CC BY 4.0)
- Income distributions ("reach") from [U.S. Census Bureau ACS 1-Year PUMS](https://www.census.gov/programs-surveys/acs/microdata.html) (public domain). Rebuild: `node scripts/build-reach.mjs`.

License: AGPL-3.0-only. Design spec: `docs/superpowers/specs/2026-07-11-hotgap-design.md`.

## Develop

    npm install
    npm test                # unit tests
    npm run e2e             # Playwright smoke (needs app build)
    npm run contract        # live PolicyEngine API contract check
    npm run readability     # 5th-grade copy gate
    npm run pipeline        # re-run the places-door data sweep locally (~10 min)

Local site: `npm run build --workspace @hotgap/app`, then `cd worker && npx wrangler dev`
→ http://localhost:8787 (serves the SPA and proxies /api/curve to PolicyEngine).

### Places data

`npm run pipeline` (`pipeline/src/run.ts`) sweeps every state × archetype through PolicyEngine
and writes `app/src/data/places/summary.json` (bundled map scores) and
`app/public/data/states/{ST}.json` (lazy per-state curves, also used by the personal door's
error-path fallback). `.github/workflows/places-data.yml` runs this automatically every Monday
at 07:00 UTC (and on manual dispatch), running the test suite and typecheck before committing
the refreshed data only when it changed.

Landing on `main` is not the same as reaching production: this repo has no auto-deploy, so a
refreshed data commit only ships once someone runs the [Deploy](#deploy) step below.

## Deploy

    npm run build --workspace @hotgap/app
    cd worker && npx wrangler deploy

One Cloudflare Worker serves both the static site (assets binding) and `/api/curve`.
No secrets are required — the PolicyEngine calculate endpoint is public.
