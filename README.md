# HotGap

**If I get paid more, do I lose more than I gain?**

HotGap is a free, open-source website that shows benefits cliffs in plain
language: what happens to a real household's food help, health coverage,
childcare help, and tax credits as pay goes up — and (coming soon) which
places have better or worse gaps.

Calculations come from [PolicyEngine](https://policyengine.org)'s open
rules engine via its public API. Estimates only — a caseworker decides
real benefits.

- `app/` — React site (question flow, result chart)
- `worker/` — Cloudflare Worker (API proxy + cache + static hosting)
- `shared/` — types and curve math used by both
- ZIP→state data derived from [GeoNames](https://www.geonames.org/) (CC BY 4.0)

License: AGPL-3.0-only. Design spec: `docs/superpowers/specs/2026-07-11-hotgap-design.md`.

## Develop

    npm install
    npm test                # unit tests
    npm run e2e             # Playwright smoke (needs app build)
    npm run contract        # live PolicyEngine API contract check
    npm run readability     # 5th-grade copy gate

Local site: `npm run build --workspace @hotgap/app`, then `cd worker && npx wrangler dev`
→ http://localhost:8787 (serves the SPA and proxies /api/curve to PolicyEngine).

## Deploy

    npm run build --workspace @hotgap/app
    cd worker && npx wrangler deploy

One Cloudflare Worker serves both the static site (assets binding) and `/api/curve`.
No secrets are required — the PolicyEngine calculate endpoint is public.
