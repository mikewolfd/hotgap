# Recorded PolicyEngine fixtures

Request/response pairs the unit suite pins numbers from, so the tests defend
the model that is actually served. Each response is stored as the endpoint
returned it — keys in the endpoint's (sorted) order, values untouched —
indented two spaces for readable diffs. Each request is what
`buildCurvePayload(answers)` sends today with only the axis overridden, so
re-recording after a payload change changes the request too.

Re-record every fixture in one command, then re-pin the tests and update
this file:

    node --env-file=.env --import tsx scripts/record-fixtures.mts

It reads `HOTGAP_PE_URL` and `HOTGAP_PE_TOKEN` from `.env` (the self-hosted
engine: `engine/README.md`, `scripts/hosted-engine.mjs up`), prints the
policyengine-us version from the engine's `/healthz`, and never prints the
token. Pass fixture names to record a subset.

## Current fixtures — self-hosted engine, policyengine-us 2.5.0, 2026-09-16

Recorded with the command above (`engine/` image at policyengine-us 2.5.0,
policyengine-core 3.32.5, per `/healthz`). The households are in
`scripts/record-fixtures.mts`.

| Fixture | Household | Axis |
| --- | --- | --- |
| `pe-ca-single-1kid-101` | California single parent aged 30 with a 5-year-old; no rent, no child-care bill; Head Start and a housing subsidy left for the model (`getsHeadStart`, `getsHousing` true), every entitlement on | `employment_income` $0–$100,000, 101 points |
| `pe-ma-married-3kids-11` | Massachusetts one-earner couple, both 30, children aged 1, 4 and 9; no rent, no child-care bill; rationed programs off; carries every `ma_tafdc_*` input the feedback loop replays | `employment_income` $24,000–$34,000, 11 points |

Neither request asks for a state premium-assistance variable
(`statePremiumAssistance` unset), so each curve is what any endpoint returns
for the household; the live client asks for it where the endpoint has it.

The Massachusetts request was recorded twenty minutes before `translate.ts`
began sending `takes_up_housing_assistance_if_eligible: false` for a
household with no voucher (commit 81ea7f0, 2026-09-16), so it lacks that
key; the California household has `getsHousing` on and is unaffected. The
next re-recording picks it up — and may move the MA pins by whatever HUD
payment the model was paying that renter.

## Kept from the public API — `pe-ma-married-3kids-11.public-1.764.6.json`

The Massachusetts household above as `api.policyengine.org` answered it on
2026-09-15, kept because that model still counted TAFDC twice
(policyengine-us #9470, fixed in 2.4.4): `ma_tafdc` inside
`household_state_benefits` as well as `tanf` inside `household_benefits`.
`parsePEResponse`'s `maTafdcDoubleCounted: true` branch is tested against
it. "1.764.6" is the API service's version (`/us/metadata`), the only one the
public API exposes; the served model matched policyengine-us 2.2.0 on every
value checked (`docs/upstream/2026-09-14-policyengine-issues.md`). Its
request is `docs/upstream/evidence/local-ma-tafdc.request.json`; the same
body is there as `local-ma-tafdc.response.json`, evidence for the upstream
issue reports.

Every fixture predates policyengine-us PR #9503 (the aggregate child-care
subsidy on the household-benefit list), so `parsePEResponse`'s
`childcareSubsidyCounted` default of `false` is right for all of them; a
fixture recorded on a release that carries it must be parsed with
`childcareSubsidyCounted: true`, or its subsidy is counted twice.
