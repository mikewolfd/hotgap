# HotGap Personal Door Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the personal door of HotGap end-to-end: a 5-question flow that calls the live PolicyEngine API and shows a plain-language, charted answer to "if I get paid more, what do I lose?"

**Architecture:** npm-workspaces monorepo with three packages: `shared` (types + curve math, used by both sides), `worker` (Cloudflare Worker: validates answers, translates them to a PolicyEngine `/us/calculate` request with an earnings axis, caches responses, serves static assets), and `app` (React+Vite SPA: question flow → result page with custom D3 curve chart and template-based narration). The places door ships as an honest "coming soon" stub; it gets its own plan (batch pipeline + choropleth) after this plan lands.

**Tech Stack:** TypeScript (strict), React 18, Vite 6, vitest, D3 (d3-scale/d3-shape only), Cloudflare Workers (wrangler v4), Playwright, GitHub Actions. No CSS framework — hand-rolled tokens.

## Verified ground truth (probed live 2026-07-11 — do not re-litigate)

- `POST https://api.policyengine.org/us/calculate` needs **no auth**. 101-point axes sweep ≈ 3.7 s, HTTP 200.
- Response mirrors the request household; each requested variable comes back as a **101-element array** under `result.<entity_group>.<entity_name>.<variable>["2026"]`.
- Verified variable placements: person-level `age`, `employment_income`, `rent`, `medicaid`, `chip`, `wic`, `ssi`; tax-unit `eitc`, `refundable_ctc`, `premium_tax_credit`; spm-unit `snap`, `tanf`, `spm_unit_capped_housing_subsidy`, `childcare_expenses`; household `state_name`, `household_net_income`.
- Wrong placement returns HTTP 200-shaped **error JSON**: `{"status":"error","message":"...belongs on people, not spm_units..."}` — check `status`, not just HTTP code.
- The axis varies the **first person key's** `employment_income`. `"you"` must be the first key in `people`.
- Fixtures committed at `fixtures/pe-ca-single-1kid-101.request.json` and `fixtures/pe-ca-single-1kid-101.json` (CA single parent, one kid age 5: contains a real cliff — net income drops $56,751 → $34,794 between $30k and $31k earnings).

## Global Constraints

- License: **AGPL-3.0-only**, root `LICENSE` file. Every `package.json` has `"license": "AGPL-3.0-only"`.
- Node ≥ 22, npm workspaces. TypeScript `"strict": true` everywhere.
- **All user-visible copy lives in `app/src/strings/en.json`** — never inline in components. Copy must pass the readability gate (corpus Flesch-Kincaid grade ≤ 5.9, per-string ≤ 8.0).
- Numbers shown to users: $/hour, $/month, or $/year in the unit the user picked — never "AGI"; dollar amounts rounded to the nearest $100 in prose.
- The site **shows and explains, never advises**. No "you should" anywhere in copy.
- Household inputs are never logged (worker `console.log` of payloads is forbidden).
- Privacy: no analytics, no cookies, no accounts.
- Simulation year is **2026** everywhere (`YEAR` constant from `shared`).
- Mobile-first: minimum 44 px touch targets, WCAG AA contrast, works at 360 px width.
- Commit after every task with a conventional-commit message; work on branch `personal-door`.
- UI tasks (9–12): read the `frontend-design:frontend-design` skill first. Chart task (11): also read the `dataviz` skill.

## File Structure

```
HotGap/
├── LICENSE, README.md, package.json, tsconfig.base.json, .gitignore
├── .github/workflows/{ci.yml, contract.yml}
├── fixtures/pe-ca-single-1kid-101{,.request}.json     (already committed)
├── contract/policyengine.contract.test.ts             (live-API test, opt-in)
├── scripts/{readability.mjs, build-zip-table.mjs}
├── shared/         package @hotgap/shared
│   └── src/{types.ts, income.ts, parse.ts, analyze.ts, index.ts}  (+ *.test.ts)
├── worker/         package @hotgap/worker
│   ├── wrangler.toml
│   └── src/{index.ts, translate.ts, validate.ts}                  (+ *.test.ts)
└── app/            package @hotgap/app
    ├── index.html, vite.config.ts
    ├── e2e/personal-door.spec.ts, playwright.config.ts
    └── src/
        ├── main.tsx, App.tsx, styles.css
        ├── strings/en.json, strings/t.ts
        ├── data/zip3-state.json
        ├── lib/{zip.ts, narration.ts}                             (+ *.test.ts)
        ├── api/client.ts                                          (+ client.test.ts)
        ├── flow/{state.ts, Flow.tsx, screens.tsx}                 (+ state.test.ts)
        ├── result/{ResultPage.tsx, CurveChart.tsx, WhyList.tsx}
        └── pages/{Landing.tsx, PlacesStub.tsx}
```

---

### Task 1: Monorepo scaffold, license, CI skeleton

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`, `LICENSE`, `README.md`
- Create: `shared/package.json`, `shared/tsconfig.json`, `shared/src/index.ts`, `shared/src/smoke.test.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: workspace layout every later task builds in; `npm test` runs vitest across workspaces; CI green on push.

- [ ] **Step 1: Create branch and root files**

```bash
cd /Users/mikewolfd/Work/HotGap && git checkout -b personal-door
```

Root `package.json`:

```json
{
  "name": "hotgap",
  "private": true,
  "license": "AGPL-3.0-only",
  "engines": { "node": ">=22" },
  "workspaces": ["shared", "worker", "app"],
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -b shared worker app",
    "readability": "node scripts/readability.mjs",
    "contract": "RUN_CONTRACT=1 vitest run contract"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "composite": true,
    "declaration": true
  }
}
```

`.gitignore`:

```
node_modules/
dist/
.wrangler/
*.tsbuildinfo
test-results/
playwright-report/
```

`LICENSE`: full AGPL-3.0 text — fetch it:

```bash
curl -sSL https://www.gnu.org/licenses/agpl-3.0.txt -o LICENSE
head -3 LICENSE   # expect "GNU AFFERO GENERAL PUBLIC LICENSE / Version 3"
```

`README.md`:

```markdown
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
```

`shared/package.json`:

```json
{
  "name": "@hotgap/shared",
  "version": "0.0.1",
  "license": "AGPL-3.0-only",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

`shared/tsconfig.json`:

```json
{ "extends": "../tsconfig.base.json", "include": ["src"], "compilerOptions": { "outDir": "dist" } }
```

`shared/src/index.ts`:

```ts
export const YEAR = "2026" as const;
```

- [ ] **Step 2: Write smoke test** — `shared/src/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { YEAR } from "./index.js";

describe("workspace smoke", () => {
  it("exports the simulation year", () => {
    expect(YEAR).toBe("2026");
  });
});
```

- [ ] **Step 3: Install and verify test passes**

```bash
npm install && npm test
```

Expected: 1 passed.

- [ ] **Step 4: CI workflow** — `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: ["**"] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
```

(Readability, build, and Playwright steps are appended by Tasks 8, 12, 13.)

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold npm-workspaces monorepo (AGPL-3.0, vitest, CI)"
```

---

### Task 2: Live contract test for the PolicyEngine API

**Files:**
- Create: `contract/policyengine.contract.test.ts`
- Create: `.github/workflows/contract.yml`

**Interfaces:**
- Consumes: `fixtures/pe-ca-single-1kid-101.request.json` (committed).
- Produces: the executable definition of what we assume about PolicyEngine. If this fails nightly, the API drifted.

- [ ] **Step 1: Write the contract test** — `contract/policyengine.contract.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const RUN = process.env.RUN_CONTRACT === "1";
const request = JSON.parse(
  readFileSync(new URL("../fixtures/pe-ca-single-1kid-101.request.json", import.meta.url), "utf8"),
);

describe.skipIf(!RUN)("PolicyEngine /us/calculate contract", () => {
  it("computes a 101-point axes sweep with every variable we display", async () => {
    const res = await fetch("https://api.policyengine.org/us/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    const r = body.result;
    const arr = (x: unknown) => {
      expect(Array.isArray(x)).toBe(true);
      expect((x as number[]).length).toBe(101);
    };
    arr(r.households["your household"].household_net_income["2026"]);
    arr(r.spm_units["your spm_unit"].snap["2026"]);
    arr(r.spm_units["your spm_unit"].tanf["2026"]);
    arr(r.spm_units["your spm_unit"].spm_unit_capped_housing_subsidy["2026"]);
    arr(r.tax_units["your tax unit"].eitc["2026"]);
    arr(r.tax_units["your tax unit"].refundable_ctc["2026"]);
    arr(r.tax_units["your tax unit"].premium_tax_credit["2026"]);
    for (const v of ["medicaid", "ssi", "wic", "chip"]) arr(r.people["you"][v]["2026"]);
  }, 90_000);

  it("accepts rent on people and childcare_expenses on spm_units", async () => {
    const probe = {
      household: {
        people: { you: { age: { "2026": 30 }, rent: { "2026": 18000 } } },
        families: { f: { members: ["you"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you"] } },
        spm_units: { s: { members: ["you"], childcare_expenses: { "2026": 6000 }, snap: { "2026": null } } },
        households: { h: { members: ["you"], state_name: { "2026": "CA" }, household_net_income: { "2026": null } } },
      },
    };
    const res = await fetch("https://api.policyengine.org/us/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
  }, 90_000);
});
```

- [ ] **Step 2: Run it live**

```bash
RUN_CONTRACT=1 npx vitest run contract
```

Expected: 2 passed (network required). Then verify the skip path: `npx vitest run contract` → skipped.

- [ ] **Step 3: Nightly workflow** — `.github/workflows/contract.yml`:

```yaml
name: API contract
on:
  schedule: [{ cron: "17 6 * * *" }]
  workflow_dispatch:
jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: RUN_CONTRACT=1 npx vitest run contract
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: live PolicyEngine API contract test + nightly workflow"
```

---

### Task 3: Shared types and income unit conversion

**Files:**
- Create: `shared/src/types.ts`, `shared/src/income.ts`
- Modify: `shared/src/index.ts`
- Test: `shared/src/income.test.ts`

**Interfaces:**
- Produces (exact — later tasks import these from `@hotgap/shared`):

```ts
type ProgramId = "snap" | "medicaid" | "chip" | "eitc" | "ctc" | "aca" | "tanf" | "housing" | "wic" | "ssi";
interface HouseholdAnswers {
  state: string;               // "CA"
  married: boolean;
  childAges: number[];         // [] = none, each 0..17
  monthlyRent: number | null;  // null = not sure
  monthlyChildcare: number | null;
  annualEarnings: number;      // the user's own gross pay, annualized
  spouseAnnualEarnings: number; // 0 unless married
}
interface CurvePoint { earnings: number; netIncome: number; programs: Record<ProgramId, number>; }
interface CurveResponse { year: string; currentEarnings: number; points: CurvePoint[]; }
type PayUnit = "hour" | "month" | "year";
interface Pay { amount: number; unit: PayUnit; hoursPerWeek?: number }
toAnnual(pay: Pay): number
fromAnnual(annual: number, unit: PayUnit, hoursPerWeek?: number): number
roundTo(n: number, step: number): number
```

- [ ] **Step 1: Write failing tests** — `shared/src/income.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toAnnual, fromAnnual, roundTo } from "./income.js";

describe("toAnnual", () => {
  it("converts hourly pay using hours/week × 52", () => {
    expect(toAnnual({ amount: 20, unit: "hour", hoursPerWeek: 40 })).toBe(41600);
  });
  it("defaults hourly to 40 hours/week", () => {
    expect(toAnnual({ amount: 15, unit: "hour" })).toBe(31200);
  });
  it("converts monthly and yearly", () => {
    expect(toAnnual({ amount: 3000, unit: "month" })).toBe(36000);
    expect(toAnnual({ amount: 50000, unit: "year" })).toBe(50000);
  });
});

describe("fromAnnual", () => {
  it("round-trips hourly", () => {
    expect(fromAnnual(41600, "hour", 40)).toBeCloseTo(20);
  });
  it("round-trips monthly", () => {
    expect(fromAnnual(36000, "month")).toBe(3000);
  });
});

describe("roundTo", () => {
  it("rounds to the nearest step", () => {
    expect(roundTo(21956, 100)).toBe(22000);
    expect(roundTo(19.4, 0.5)).toBe(19.5);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run shared` → FAIL (module not found).

- [ ] **Step 3: Implement** — `shared/src/types.ts`:

```ts
export type ProgramId =
  | "snap" | "medicaid" | "chip" | "eitc" | "ctc"
  | "aca" | "tanf" | "housing" | "wic" | "ssi";

export const PROGRAM_IDS: ProgramId[] = [
  "snap", "medicaid", "chip", "eitc", "ctc", "aca", "tanf", "housing", "wic", "ssi",
];

export interface HouseholdAnswers {
  state: string;
  married: boolean;
  childAges: number[];
  monthlyRent: number | null;
  monthlyChildcare: number | null;
  annualEarnings: number;
  spouseAnnualEarnings: number;
}

export interface CurvePoint {
  earnings: number;
  netIncome: number;
  programs: Record<ProgramId, number>;
}

export interface CurveResponse {
  year: string;
  currentEarnings: number;
  points: CurvePoint[];
}
```

`shared/src/income.ts`:

```ts
export type PayUnit = "hour" | "month" | "year";
export interface Pay { amount: number; unit: PayUnit; hoursPerWeek?: number }

const DEFAULT_HOURS = 40;

export function toAnnual(pay: Pay): number {
  switch (pay.unit) {
    case "hour": return pay.amount * (pay.hoursPerWeek ?? DEFAULT_HOURS) * 52;
    case "month": return pay.amount * 12;
    case "year": return pay.amount;
  }
}

export function fromAnnual(annual: number, unit: PayUnit, hoursPerWeek = DEFAULT_HOURS): number {
  switch (unit) {
    case "hour": return annual / (hoursPerWeek * 52);
    case "month": return annual / 12;
    case "year": return annual;
  }
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}
```

`shared/src/index.ts` becomes:

```ts
export const YEAR = "2026" as const;
export * from "./types.js";
export * from "./income.js";
```

- [ ] **Step 4: Verify pass** — `npx vitest run shared` → all pass. Also `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(shared): household/curve types and pay-unit conversions"`

---

### Task 4: Parse PolicyEngine responses into curve points

**Files:**
- Create: `shared/src/parse.ts`
- Modify: `shared/src/index.ts` (add `export * from "./parse.js";`)
- Test: `shared/src/parse.test.ts`

**Interfaces:**
- Consumes: `CurvePoint`, `ProgramId` from Task 3. The **canonical entity names** produced by Task 6's translator: people `you`, `spouse`, `child1`…`child6`; groups `family`, `marital_unit`, `tax_unit`, `spm_unit`, `household`.
- Produces: `parsePEResponse(body: unknown, expectedCount: number): CurvePoint[]` — throws `PEParseError` on malformed input. Person-level program values are summed across all people. Earnings axis is reconstructed from `body.result.axes[0][0]` (`min`, `max`, `count`).
- Note: the committed fixture uses entity names `your household`/`your spm_unit`/`your tax unit`; the parser must find the (single) entity in each group **by taking the first key**, not by hardcoded name.

- [ ] **Step 1: Write failing tests** — `shared/src/parse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse, PEParseError } from "./parse.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);

describe("parsePEResponse", () => {
  it("produces one point per axis step with reconstructed earnings", () => {
    const points = parsePEResponse(fixture, 101);
    expect(points).toHaveLength(101);
    expect(points[0].earnings).toBe(0);
    expect(points[100].earnings).toBe(100000);
    expect(points[30].earnings).toBe(30000);
  });

  it("maps net income and program amounts", () => {
    const points = parsePEResponse(fixture, 101);
    expect(points[30].netIncome).toBeCloseTo(56751.04, 1);
    expect(points[31].netIncome).toBeCloseTo(34794.47, 1);
    expect(points[0].programs.snap).toBeGreaterThan(0);
    expect(points[100].programs.snap).toBe(0);
  });

  it("sums person-level programs across people", () => {
    const points = parsePEResponse(fixture, 101);
    const raw = fixture.result.people;
    const youMed = raw["you"].medicaid["2026"][0];
    const kidMed = raw["your first dependent"].medicaid["2026"][0];
    expect(points[0].programs.medicaid).toBeCloseTo(youMed + kidMed, 1);
  });

  it("throws PEParseError on an error-status body", () => {
    expect(() => parsePEResponse({ status: "error", message: "nope" }, 101)).toThrow(PEParseError);
  });

  it("throws PEParseError when arrays are missing or wrong length", () => {
    expect(() => parsePEResponse({ status: "ok", result: {} }, 101)).toThrow(PEParseError);
  });
});
```

- [ ] **Step 2: Verify failure** — `npx vitest run shared/src/parse.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `shared/src/parse.ts`:

```ts
import { YEAR } from "./index.js";
import type { CurvePoint, ProgramId } from "./types.js";

export class PEParseError extends Error {}

type Entity = Record<string, Record<string, Record<string, unknown>>>;

const PERSON_PROGRAMS: Record<string, ProgramId> = {
  medicaid: "medicaid", chip: "chip", wic: "wic", ssi: "ssi",
};
const SPM_PROGRAMS: Record<string, ProgramId> = {
  snap: "snap", tanf: "tanf", spm_unit_capped_housing_subsidy: "housing",
};
const TAX_PROGRAMS: Record<string, ProgramId> = {
  eitc: "eitc", refundable_ctc: "ctc", premium_tax_credit: "aca",
};

function firstEntity(group: unknown, label: string): Record<string, Record<string, unknown>> {
  if (typeof group !== "object" || group === null) throw new PEParseError(`missing ${label}`);
  const first = Object.values(group as Entity)[0];
  if (!first) throw new PEParseError(`empty ${label}`);
  return first;
}

function series(entity: Record<string, unknown>, variable: string, count: number): number[] {
  const v = (entity[variable] as Record<string, unknown> | undefined)?.[YEAR];
  if (!Array.isArray(v) || v.length !== count || v.some((x) => typeof x !== "number")) {
    throw new PEParseError(`bad series for ${variable}`);
  }
  return v as number[];
}

export function parsePEResponse(body: unknown, expectedCount: number): CurvePoint[] {
  const b = body as { status?: string; result?: Record<string, unknown> };
  if (b?.status !== "ok" || !b.result) {
    throw new PEParseError(`PolicyEngine error: ${(b as { message?: string })?.message ?? "unknown"}`);
  }
  const r = b.result;

  const axes = r.axes as Array<Array<{ min: number; max: number; count: number }>> | undefined;
  const axis = axes?.[0]?.[0];
  if (!axis || axis.count !== expectedCount) throw new PEParseError("missing or mismatched axes");
  const step = (axis.max - axis.min) / (axis.count - 1);

  const household = firstEntity(r.households, "households");
  const spm = firstEntity(r.spm_units, "spm_units");
  const tax = firstEntity(r.tax_units, "tax_units");
  const people = r.people as Entity | undefined;
  if (!people) throw new PEParseError("missing people");

  const net = series(household, "household_net_income", expectedCount);

  const programSeries = new Map<ProgramId, number[]>();
  const add = (id: ProgramId, values: number[]) => {
    const existing = programSeries.get(id);
    programSeries.set(id, existing ? existing.map((x, i) => x + values[i]) : [...values]);
  };
  for (const [variable, id] of Object.entries(SPM_PROGRAMS)) add(id, series(spm, variable, expectedCount));
  for (const [variable, id] of Object.entries(TAX_PROGRAMS)) add(id, series(tax, variable, expectedCount));
  for (const person of Object.values(people)) {
    for (const [variable, id] of Object.entries(PERSON_PROGRAMS)) {
      if (person[variable]) add(id, series(person, variable, expectedCount));
    }
  }

  return net.map((n, i) => ({
    earnings: axis.min + step * i,
    netIncome: n,
    programs: Object.fromEntries(
      [...programSeries.entries()].map(([id, values]) => [id, values[i]]),
    ) as Record<ProgramId, number>,
  }));
}
```

- [ ] **Step 4: Verify pass** — `npx vitest run shared` → all pass; `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(shared): parse PolicyEngine axes responses into curve points"`

---

### Task 5: Curve analysis — cliffs, danger zones, verdict

**Files:**
- Create: `shared/src/analyze.ts`
- Modify: `shared/src/index.ts` (add `export * from "./analyze.js";`)
- Test: `shared/src/analyze.test.ts`

**Interfaces:**
- Consumes: `CurvePoint`, `ProgramId` (Task 3); fixture via `parsePEResponse` (Task 4).
- Produces (exact):

```ts
interface Cliff { startEarnings: number; endEarnings: number; drop: number; programsLost: ProgramId[]; }
interface DangerZone { startEarnings: number; endEarnings: number | null; peakNet: number; }
// endEarnings null = never recovers within the sweep
type Verdict = "always_up" | "cliff_ahead" | "in_danger_zone" | "cliff_behind";
interface CurveAnalysis {
  points: CurvePoint[];
  currentEarnings: number;
  currentNet: number;          // linear interpolation at currentEarnings
  cliffs: Cliff[];
  worstCliff: Cliff | null;
  dangerZones: DangerZone[];
  verdict: Verdict;
  nextCliff: Cliff | null;     // first cliff with startEarnings >= currentEarnings
  escapeEarnings: number | null; // if in_danger_zone: earnings where net first exceeds the zone's peakNet
}
analyzeCurve(points: CurvePoint[], currentEarnings: number): CurveAnalysis
```

- Semantics: a **cliff** is a consecutive-point step where net income falls by more than `CLIFF_MIN = 200` dollars; `programsLost` are programs whose value falls > 100 across that step. A **danger zone** starts at the earnings of a running-maximum point after which net income goes below that maximum, and ends where net income first exceeds the maximum again (`null` if never). Verdict: `always_up` if no cliffs; `in_danger_zone` if `currentEarnings` sits inside a zone (strictly after start, before recovery); `cliff_ahead` if any cliff starts at or above `currentEarnings`; else `cliff_behind`.

- [ ] **Step 1: Write failing tests** — `shared/src/analyze.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse } from "./parse.js";
import { analyzeCurve } from "./analyze.js";
import type { CurvePoint } from "./types.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

const flat = (earnings: number, netIncome: number): CurvePoint => ({
  earnings, netIncome, programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0 },
});

describe("analyzeCurve on synthetic curves", () => {
  it("finds no cliffs on a monotonic curve", () => {
    const pts = [flat(0, 10000), flat(10000, 15000), flat(20000, 21000)];
    const a = analyzeCurve(pts, 5000);
    expect(a.cliffs).toHaveLength(0);
    expect(a.dangerZones).toHaveLength(0);
    expect(a.verdict).toBe("always_up");
  });

  it("detects a cliff, its danger zone, and recovery point", () => {
    const pts = [flat(0, 20000), flat(10000, 30000), flat(20000, 22000), flat(30000, 28000), flat(40000, 34000)];
    const a = analyzeCurve(pts, 5000);
    expect(a.cliffs).toHaveLength(1);
    expect(a.cliffs[0]).toMatchObject({ startEarnings: 10000, endEarnings: 20000, drop: 8000 });
    expect(a.dangerZones).toHaveLength(1);
    expect(a.dangerZones[0].startEarnings).toBe(10000);
    expect(a.dangerZones[0].endEarnings).toBe(40000); // first point with net > 30000
    expect(a.verdict).toBe("cliff_ahead");
    expect(a.nextCliff?.startEarnings).toBe(10000);
  });

  it("reports in_danger_zone with escape earnings when current sits underwater", () => {
    const pts = [flat(0, 20000), flat(10000, 30000), flat(20000, 22000), flat(30000, 28000), flat(40000, 34000)];
    const a = analyzeCurve(pts, 25000);
    expect(a.verdict).toBe("in_danger_zone");
    expect(a.escapeEarnings).toBe(40000);
  });

  it("reports cliff_behind when all cliffs are below current earnings", () => {
    const pts = [flat(0, 20000), flat(10000, 30000), flat(20000, 22000), flat(30000, 40000), flat(40000, 46000)];
    const a = analyzeCurve(pts, 35000);
    expect(a.verdict).toBe("cliff_behind");
  });

  it("interpolates currentNet linearly between points", () => {
    const pts = [flat(0, 0), flat(10000, 10000)];
    expect(analyzeCurve(pts, 5000).currentNet).toBe(5000);
  });
});

describe("analyzeCurve on the real CA fixture", () => {
  it("finds the verified $22k Medicaid cliff at $30k earnings", () => {
    const a = analyzeCurve(fixturePoints, 20000);
    expect(a.worstCliff).not.toBeNull();
    expect(a.worstCliff!.startEarnings).toBe(30000);
    expect(a.worstCliff!.drop).toBeGreaterThan(20000);
    expect(a.worstCliff!.programsLost).toContain("medicaid");
    expect(a.verdict).toBe("cliff_ahead");
  });
});
```

- [ ] **Step 2: Verify failure** — `npx vitest run shared/src/analyze.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `shared/src/analyze.ts`:

```ts
import type { CurvePoint, ProgramId } from "./types.js";
import { PROGRAM_IDS } from "./types.js";

export const CLIFF_MIN = 200;
const PROGRAM_LOSS_MIN = 100;

export interface Cliff {
  startEarnings: number;
  endEarnings: number;
  drop: number;
  programsLost: ProgramId[];
}
export interface DangerZone {
  startEarnings: number;
  endEarnings: number | null;
  peakNet: number;
}
export type Verdict = "always_up" | "cliff_ahead" | "in_danger_zone" | "cliff_behind";

export interface CurveAnalysis {
  points: CurvePoint[];
  currentEarnings: number;
  currentNet: number;
  cliffs: Cliff[];
  worstCliff: Cliff | null;
  dangerZones: DangerZone[];
  verdict: Verdict;
  nextCliff: Cliff | null;
  escapeEarnings: number | null;
}

function interpolate(points: CurvePoint[], earnings: number): number {
  if (earnings <= points[0].earnings) return points[0].netIncome;
  for (let i = 1; i < points.length; i++) {
    if (earnings <= points[i].earnings) {
      const a = points[i - 1];
      const b = points[i];
      const t = (earnings - a.earnings) / (b.earnings - a.earnings);
      return a.netIncome + t * (b.netIncome - a.netIncome);
    }
  }
  return points[points.length - 1].netIncome;
}

export function analyzeCurve(points: CurvePoint[], currentEarnings: number): CurveAnalysis {
  if (points.length < 2) throw new Error("need at least 2 curve points");

  const cliffs: Cliff[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const drop = points[i].netIncome - points[i + 1].netIncome;
    if (drop > CLIFF_MIN) {
      const programsLost = PROGRAM_IDS.filter(
        (id) => (points[i].programs[id] ?? 0) - (points[i + 1].programs[id] ?? 0) > PROGRAM_LOSS_MIN,
      );
      cliffs.push({
        startEarnings: points[i].earnings,
        endEarnings: points[i + 1].earnings,
        drop,
        programsLost,
      });
    }
  }

  const dangerZones: DangerZone[] = [];
  let peakNet = points[0].netIncome;
  let peakEarnings = points[0].earnings;
  let open: DangerZone | null = null;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.netIncome > peakNet) {
      if (open) {
        open.endEarnings = p.earnings;
        dangerZones.push(open);
        open = null;
      }
      peakNet = p.netIncome;
      peakEarnings = p.earnings;
    } else if (p.netIncome < peakNet - CLIFF_MIN && !open) {
      open = { startEarnings: peakEarnings, endEarnings: null, peakNet };
    }
  }
  if (open) dangerZones.push(open);

  const currentNet = interpolate(points, currentEarnings);
  const zone = dangerZones.find(
    (z) => currentEarnings > z.startEarnings && (z.endEarnings === null || currentEarnings < z.endEarnings),
  );
  const nextCliff = cliffs.find((c) => c.startEarnings >= currentEarnings) ?? null;

  const verdict: Verdict =
    cliffs.length === 0 ? "always_up"
    : zone ? "in_danger_zone"
    : nextCliff ? "cliff_ahead"
    : "cliff_behind";

  const worstCliff = cliffs.length
    ? cliffs.reduce((a, b) => (b.drop > a.drop ? b : a))
    : null;

  return {
    points,
    currentEarnings,
    currentNet,
    cliffs,
    worstCliff,
    dangerZones,
    verdict,
    nextCliff,
    escapeEarnings: zone ? zone.endEarnings : null,
  };
}
```

- [ ] **Step 4: Verify pass** — `npx vitest run shared` → all pass; `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(shared): cliff/danger-zone analysis with verdicts"`

---

### Task 6: Worker — translate answers to a PolicyEngine request

**Files:**
- Create: `worker/package.json`, `worker/tsconfig.json`, `worker/src/translate.ts`
- Test: `worker/src/translate.test.ts`

**Interfaces:**
- Consumes: `HouseholdAnswers`, `YEAR` from `@hotgap/shared`.
- Produces (exact):

```ts
const AXIS_COUNT = 101;
axisMax(annualEarnings: number): number   // max(100_000, ceil(1.5×earnings / 5000) × 5000)
buildPEPayload(a: HouseholdAnswers): { household: object }  // "you" FIRST key in people
```

- Canonical entity names (Task 4's parser takes the first key, but keep these stable): people `you`, `spouse`, `child1`…; groups `family`, `marital_unit`, `tax_unit`, `spm_unit`, `household`.

- [ ] **Step 1: Package setup** — `worker/package.json`:

```json
{
  "name": "@hotgap/worker",
  "version": "0.0.1",
  "license": "AGPL-3.0-only",
  "type": "module",
  "scripts": { "dev": "wrangler dev", "deploy": "wrangler deploy" },
  "dependencies": { "@hotgap/shared": "*" },
  "devDependencies": { "wrangler": "^4.0.0", "@cloudflare/workers-types": "^4.20241127.0" }
}
```

`worker/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src"],
  "compilerOptions": { "outDir": "dist", "types": ["@cloudflare/workers-types"], "lib": ["ES2022"] },
  "references": [{ "path": "../shared" }]
}
```

Run `npm install` at root to link the workspace.

- [ ] **Step 2: Write failing tests** — `worker/src/translate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildPEPayload, axisMax, AXIS_COUNT } from "./translate.js";
import type { HouseholdAnswers } from "@hotgap/shared";

const base: HouseholdAnswers = {
  state: "CA", married: false, childAges: [5],
  monthlyRent: 1500, monthlyChildcare: null,
  annualEarnings: 30000, spouseAnnualEarnings: 0,
};

describe("axisMax", () => {
  it("floors at $100k and scales to 1.5× earnings rounded up to $5k", () => {
    expect(axisMax(30000)).toBe(100000);
    expect(axisMax(90000)).toBe(135000);
  });
});

describe("buildPEPayload", () => {
  it("puts 'you' as the FIRST people key (the axis varies person 0)", () => {
    const p = buildPEPayload(base) as any;
    expect(Object.keys(p.household.people)[0]).toBe("you");
  });

  it("builds a single-parent household with one child and annual rent on 'you'", () => {
    const p = buildPEPayload(base) as any;
    expect(Object.keys(p.household.people)).toEqual(["you", "child1"]);
    expect(p.household.people.you.rent["2026"]).toBe(18000);
    expect(p.household.people.child1.age["2026"]).toBe(5);
    expect(p.household.households.household.state_name["2026"]).toBe("CA");
    expect(p.household.spm_units.spm_unit.childcare_expenses["2026"]).toBe(0);
    expect(p.household.axes[0][0]).toMatchObject({ name: "employment_income", min: 0, max: 100000, count: AXIS_COUNT, period: "2026" });
  });

  it("adds a spouse with fixed employment income when married", () => {
    const p = buildPEPayload({ ...base, married: true, spouseAnnualEarnings: 20000 }) as any;
    expect(p.household.people.spouse.employment_income["2026"]).toBe(20000);
    expect(p.household.marital_units.marital_unit.members).toEqual(["you", "spouse"]);
    expect(p.household.tax_units.tax_unit.members).toContain("spouse");
  });

  it("omits rent when unknown and includes childcare when given", () => {
    const p = buildPEPayload({ ...base, monthlyRent: null, monthlyChildcare: 800 }) as any;
    expect(p.household.people.you.rent).toBeUndefined();
    expect(p.household.spm_units.spm_unit.childcare_expenses["2026"]).toBe(9600);
  });

  it("requests every display variable as null", () => {
    const p = buildPEPayload(base) as any;
    expect(p.household.households.household.household_net_income["2026"]).toBeNull();
    for (const v of ["snap", "tanf", "spm_unit_capped_housing_subsidy"])
      expect(p.household.spm_units.spm_unit[v]["2026"]).toBeNull();
    for (const v of ["eitc", "refundable_ctc", "premium_tax_credit"])
      expect(p.household.tax_units.tax_unit[v]["2026"]).toBeNull();
    for (const v of ["medicaid", "chip", "wic", "ssi"])
      expect(p.household.people.you[v]["2026"]).toBeNull();
  });
});
```

- [ ] **Step 3: Verify failure** — `npx vitest run worker` → FAIL.

- [ ] **Step 4: Implement** — `worker/src/translate.ts`:

```ts
import { YEAR, type HouseholdAnswers } from "@hotgap/shared";

export const AXIS_COUNT = 101;
const ADULT_AGE = 30;

export function axisMax(annualEarnings: number): number {
  return Math.max(100_000, Math.ceil((annualEarnings * 1.5) / 5000) * 5000);
}

type Vars = Record<string, Record<string, number | string | null>>;
const y = (value: number | string | null): Record<string, number | string | null> => ({ [YEAR]: value });

const PERSON_VARS = ["medicaid", "chip", "wic", "ssi"];
const SPM_VARS = ["snap", "tanf", "spm_unit_capped_housing_subsidy"];
const TAX_VARS = ["eitc", "refundable_ctc", "premium_tax_credit"];

export function buildPEPayload(a: HouseholdAnswers): { household: object } {
  const you: Vars = { age: y(ADULT_AGE) };
  for (const v of PERSON_VARS) you[v] = y(null);
  if (a.monthlyRent !== null) you.rent = y(a.monthlyRent * 12);

  const people: Record<string, Vars> = { you };
  if (a.married) {
    people.spouse = { age: y(ADULT_AGE), employment_income: y(a.spouseAnnualEarnings) };
    for (const v of PERSON_VARS) people.spouse[v] = y(null);
  }
  a.childAges.forEach((age, i) => {
    people[`child${i + 1}`] = { age: y(age), medicaid: y(null), chip: y(null) };
  });

  const members = Object.keys(people);
  const spmVars: Vars = { childcare_expenses: y((a.monthlyChildcare ?? 0) * 12) };
  for (const v of SPM_VARS) spmVars[v] = y(null);
  const taxVars: Vars = {};
  for (const v of TAX_VARS) taxVars[v] = y(null);

  return {
    household: {
      people,
      families: { family: { members } },
      marital_units: { marital_unit: { members: a.married ? ["you", "spouse"] : ["you"] } },
      tax_units: { tax_unit: { members, ...taxVars } },
      spm_units: { spm_unit: { members, ...spmVars } },
      households: {
        household: { members, state_name: y(a.state), household_net_income: y(null) },
      },
      axes: [[{ name: "employment_income", min: 0, max: axisMax(a.annualEarnings), count: AXIS_COUNT, period: YEAR }]],
    },
  };
}
```

- [ ] **Step 5: Verify pass** — `npx vitest run worker` → all pass; `npm run typecheck`.

- [ ] **Step 6: Live sanity check (one-off script, do not commit)** — POST `JSON.stringify(buildPEPayload(base))` to the API with `node --experimental-strip-types`, confirm `status: "ok"` and that `parsePEResponse(body, 101)` from `@hotgap/shared` succeeds end-to-end:

```bash
node --experimental-strip-types -e '
import { buildPEPayload } from "./worker/src/translate.ts";
import { parsePEResponse } from "./shared/src/parse.ts";
const payload = buildPEPayload({ state: "CA", married: false, childAges: [5], monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000, spouseAnnualEarnings: 0 });
const res = await fetch("https://api.policyengine.org/us/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
const body = await res.json();
const points = parsePEResponse(body, 101);
console.log("OK", points.length, "points; net at $30k:", points[30].netIncome);
'
```

Expected: `OK 101 points; net at $30k: <number>`. If PolicyEngine rejects a variable name here, STOP and fix `translate.ts` (the contract test in Task 2 defines truth).

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(worker): translate household answers into PolicyEngine axes requests"`

---

### Task 7: Worker — validation, handler, cache, wrangler config

**Files:**
- Create: `worker/src/validate.ts`, `worker/src/index.ts`, `worker/wrangler.toml`
- Test: `worker/src/validate.test.ts`, `worker/src/index.test.ts`

**Interfaces:**
- Consumes: `buildPEPayload`, `AXIS_COUNT` (Task 6); `parsePEResponse` (Task 4); `HouseholdAnswers`, `CurveResponse` (Task 3).
- Produces: `POST /api/curve` — body `HouseholdAnswers` JSON → `200 CurveResponse` | `400 {error:"bad_input", detail}` | `502 {error:"upstream_error"}` | `504 {error:"upstream_timeout"}`. `GET /api/health` → `{ok:true}`. Handler factored as `handleRequest(req, { fetchImpl, cache, waitUntil })` so tests inject a fake fetch and cache. Worker serves the SPA via assets binding (all non-`/api` paths).
- Cache: `caches.default`-style API keyed on `https://cache.hotgap.internal/curve/<sha256 of normalized answers>`, TTL 7 days. Upstream timeout 25 s. **Never log the request body.**

- [ ] **Step 1: Write failing validation tests** — `worker/src/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateAnswers } from "./validate.js";

const good = {
  state: "CA", married: false, childAges: [5],
  monthlyRent: 1500, monthlyChildcare: null,
  annualEarnings: 30000, spouseAnnualEarnings: 0,
};

describe("validateAnswers", () => {
  it("accepts a valid payload and returns a normalized copy", () => {
    const r = validateAnswers(good);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.state).toBe("CA");
  });
  it("rejects unknown state codes", () => {
    expect(validateAnswers({ ...good, state: "ZZ" }).ok).toBe(false);
  });
  it("rejects more than 6 children and out-of-range ages", () => {
    expect(validateAnswers({ ...good, childAges: [1, 2, 3, 4, 5, 6, 7] }).ok).toBe(false);
    expect(validateAnswers({ ...good, childAges: [18] }).ok).toBe(false);
  });
  it("clamps money fields into sane ranges", () => {
    const r = validateAnswers({ ...good, monthlyRent: 99999, annualEarnings: 9_999_999 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.monthlyRent).toBe(10000);
      expect(r.value.annualEarnings).toBe(500000);
    }
  });
  it("rejects non-objects and missing fields", () => {
    expect(validateAnswers(null).ok).toBe(false);
    expect(validateAnswers({}).ok).toBe(false);
    expect(validateAnswers({ ...good, annualEarnings: "lots" }).ok).toBe(false);
  });
  it("zeroes spouse earnings when unmarried", () => {
    const r = validateAnswers({ ...good, spouseAnnualEarnings: 50000 });
    if (r.ok) expect(r.value.spouseAnnualEarnings).toBe(0);
  });
});
```

- [ ] **Step 2: Implement validation** — `worker/src/validate.ts`:

```ts
import type { HouseholdAnswers } from "@hotgap/shared";

export const STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
]);

export type Validation = { ok: true; value: HouseholdAnswers } | { ok: false; detail: string };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function validateAnswers(input: unknown): Validation {
  if (typeof input !== "object" || input === null) return { ok: false, detail: "body must be an object" };
  const a = input as Record<string, unknown>;

  if (typeof a.state !== "string" || !STATES.has(a.state)) return { ok: false, detail: "state" };
  if (typeof a.married !== "boolean") return { ok: false, detail: "married" };
  if (!Array.isArray(a.childAges) || a.childAges.length > 6) return { ok: false, detail: "childAges" };
  if (a.childAges.some((x) => typeof x !== "number" || !Number.isInteger(x) || x < 0 || x > 17))
    return { ok: false, detail: "childAges" };
  const money = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
  if (a.monthlyRent !== null && !money(a.monthlyRent)) return { ok: false, detail: "monthlyRent" };
  if (a.monthlyChildcare !== null && !money(a.monthlyChildcare)) return { ok: false, detail: "monthlyChildcare" };
  if (!money(a.annualEarnings)) return { ok: false, detail: "annualEarnings" };
  if (!money(a.spouseAnnualEarnings)) return { ok: false, detail: "spouseAnnualEarnings" };

  return {
    ok: true,
    value: {
      state: a.state,
      married: a.married,
      childAges: [...(a.childAges as number[])].sort((x, y) => x - y),
      monthlyRent: a.monthlyRent === null ? null : clamp(a.monthlyRent as number, 0, 10000),
      monthlyChildcare: a.monthlyChildcare === null ? null : clamp(a.monthlyChildcare as number, 0, 8000),
      annualEarnings: clamp(a.annualEarnings as number, 0, 500000),
      spouseAnnualEarnings: a.married ? clamp(a.spouseAnnualEarnings as number, 0, 500000) : 0,
    },
  };
}
```

Run `npx vitest run worker/src/validate.test.ts` → pass.

- [ ] **Step 3: Write failing handler tests** — `worker/src/index.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { handleRequest } from "./index.js";

const fixture = readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8");

const good = JSON.stringify({
  state: "CA", married: false, childAges: [5],
  monthlyRent: 1500, monthlyChildcare: null,
  annualEarnings: 30000, spouseAnnualEarnings: 0,
});

function fakeCache() {
  const store = new Map<string, Response>();
  return {
    async match(key: Request | string) { const r = store.get(typeof key === "string" ? key : key.url); return r?.clone(); },
    async put(key: Request | string, res: Response) { store.set(typeof key === "string" ? key : key.url, res.clone()); },
    store,
  };
}

const deps = (fetchImpl: typeof fetch, cache = fakeCache()) => ({
  fetchImpl, cache, waitUntil: (p: Promise<unknown>) => { void p; }, promises: [] as Promise<unknown>[],
});

const post = (body: string) =>
  new Request("https://hotgap.example/api/curve", { method: "POST", body, headers: { "Content-Type": "application/json" } });

describe("handleRequest /api/curve", () => {
  it("returns a CurveResponse for valid answers", async () => {
    const d = deps(async () => new Response(fixture, { status: 200 }));
    const res = await handleRequest(post(good), d);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.points).toHaveLength(101);
    expect(body.year).toBe("2026");
    expect(body.currentEarnings).toBe(30000);
  });

  it("rejects invalid input with 400", async () => {
    const d = deps(async () => new Response(fixture, { status: 200 }));
    const res = await handleRequest(post(JSON.stringify({ state: "ZZ" })), d);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toBe("bad_input");
  });

  it("maps upstream failure to 502", async () => {
    const d = deps(async () => new Response("boom", { status: 500 }));
    const res = await handleRequest(post(good), d);
    expect(res.status).toBe(502);
  });

  it("maps upstream PE error-status JSON to 502", async () => {
    const d = deps(async () => new Response(JSON.stringify({ status: "error", message: "bad variable" }), { status: 200 }));
    const res = await handleRequest(post(good), d);
    expect(res.status).toBe(502);
  });

  it("maps abort to 504", async () => {
    const d = deps(async () => { throw new DOMException("timeout", "AbortError"); });
    const res = await handleRequest(post(good), d);
    expect(res.status).toBe(504);
  });

  it("serves the second identical request from cache without refetching", async () => {
    let calls = 0;
    const cache = fakeCache();
    const d = deps(async () => { calls++; return new Response(fixture, { status: 200 }); }, cache);
    await handleRequest(post(good), d);
    const res2 = await handleRequest(post(good), d);
    expect(res2.status).toBe(200);
    expect(calls).toBe(1);
  });

  it("answers health checks", async () => {
    const d = deps(async () => new Response("")); 
    const res = await handleRequest(new Request("https://hotgap.example/api/health"), d);
    expect(((await res.json()) as any).ok).toBe(true);
  });
});
```

- [ ] **Step 4: Implement handler** — `worker/src/index.ts`:

```ts
import { parsePEResponse, PEParseError, YEAR, type CurveResponse } from "@hotgap/shared";
import { buildPEPayload, AXIS_COUNT } from "./translate.js";
import { validateAnswers } from "./validate.js";

const PE_URL = "https://api.policyengine.org/us/calculate";
const UPSTREAM_TIMEOUT_MS = 25_000;
const CACHE_TTL_S = 7 * 24 * 3600;

export interface Deps {
  fetchImpl: typeof fetch;
  cache: { match(key: string): Promise<Response | undefined>; put(key: string, res: Response): Promise<void> };
  waitUntil: (p: Promise<unknown>) => void;
}

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });

async function cacheKey(normalized: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(normalized));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `https://cache.hotgap.internal/curve/${hex}`;
}

export async function handleRequest(req: Request, deps: Deps): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/api/health") return json(200, { ok: true });
  if (url.pathname !== "/api/curve" || req.method !== "POST") return json(404, { error: "not_found" });

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "bad_input", detail: "invalid JSON" });
  }
  const v = validateAnswers(input);
  if (!v.ok) return json(400, { error: "bad_input", detail: v.detail });

  const key = await cacheKey(v.value);
  const hit = await deps.cache.match(key);
  if (hit) return hit;

  let upstream: Response;
  try {
    upstream = await deps.fetchImpl(PE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPEPayload(v.value)),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    return json((e as Error).name === "AbortError" || (e as Error).name === "TimeoutError" ? 504 : 502, {
      error: (e as Error).name === "AbortError" || (e as Error).name === "TimeoutError" ? "upstream_timeout" : "upstream_error",
    });
  }
  if (upstream.status !== 200) return json(502, { error: "upstream_error" });

  let points;
  try {
    points = parsePEResponse(await upstream.json(), AXIS_COUNT);
  } catch (e) {
    if (e instanceof PEParseError) return json(502, { error: "upstream_error" });
    throw e;
  }

  const body: CurveResponse = { year: YEAR, currentEarnings: v.value.annualEarnings, points };
  const res = json(200, body, { "Cache-Control": `public, max-age=${CACHE_TTL_S}` });
  deps.waitUntil(deps.cache.put(key, res.clone()));
  return res;
}

export default {
  async fetch(req: Request, _env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const cache = (caches as unknown as { default: Cache }).default;
    return handleRequest(req, {
      fetchImpl: fetch,
      cache: {
        match: async (k) => (await cache.match(new Request(k))) ?? undefined,
        put: (k, r) => cache.put(new Request(k), r),
      },
      waitUntil: (p) => ctx.waitUntil(p),
    });
  },
};
```

- [ ] **Step 5: wrangler config** — `worker/wrangler.toml`:

```toml
name = "hotgap"
main = "src/index.ts"
compatibility_date = "2026-06-01"

[assets]
directory = "../app/dist"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*"]
```

(Deviation from spec noted: spec said Cloudflare Pages + Worker; a single Worker with an assets binding is the current recommended equivalent — one deploy unit, same platform.)

- [ ] **Step 6: Verify** — `npx vitest run worker` → all pass; `npm run typecheck`.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(worker): /api/curve handler with validation, caching, and asset serving"`

---

### Task 8: Strings, translation helper, readability gate

**Files:**
- Create: `app/package.json`, `app/tsconfig.json`, `app/vite.config.ts`, `app/index.html`, `app/src/main.tsx`, `app/src/App.tsx` (minimal placeholder), `app/src/styles.css` (empty for now)
- Create: `app/src/strings/en.json`, `app/src/strings/t.ts`
- Create: `scripts/readability.mjs`
- Modify: `.github/workflows/ci.yml` (add readability + build steps)
- Test: `app/src/strings/t.test.ts`, manual run of the gate

**Interfaces:**
- Produces: `t(key: StringKey, params?: Record<string, string | number>): string` — looks up `en.json`, replaces `{param}` tokens; throws in dev on missing key/param. `npm run readability` fails if corpus FK grade > 5.9 or any string > 8.0. Keys ending in `_html` are forbidden (no HTML in strings).
- The **full string catalog** for the site ships here (later tasks may only consume keys, adding new ones requires rerunning the gate). Copy below is pre-drafted to pass the gate — do not "improve" it with longer words.

- [ ] **Step 1: App scaffold** — `app/package.json`:

```json
{
  "name": "@hotgap/app",
  "version": "0.0.1",
  "license": "AGPL-3.0-only",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": {
    "@hotgap/shared": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "d3-scale": "^4.0.2",
    "d3-shape": "^3.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/d3-scale": "^4.0.8",
    "@types/d3-shape": "^3.1.6",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "jsdom": "^25.0.0",
    "@testing-library/react": "^16.0.0"
  }
}
```

`app/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src"],
  "compilerOptions": { "outDir": "dist-ts", "jsx": "react-jsx", "lib": ["ES2022", "DOM", "DOM.Iterable"], "noEmit": false },
  "references": [{ "path": "../shared" }]
}
```

`app/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8787" } },
  // vitest reads this too:
  test: { environment: "jsdom" },
} as never);
```

`app/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <title>HotGap — will more pay leave you with less?</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`app/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`app/src/App.tsx` (placeholder replaced in Task 12):

```tsx
export default function App() {
  return <main>HotGap</main>;
}
```

- [ ] **Step 2: The string catalog** — `app/src/strings/en.json`:

```json
{
  "site.title": "HotGap",
  "site.tagline": "Will more pay leave you with less?",
  "landing.check.title": "Check my benefits",
  "landing.check.body": "Answer five short questions. See what happens to your help if your pay goes up.",
  "landing.check.cta": "Start",
  "landing.places.title": "Compare places",
  "landing.places.body": "See which states have the worst gaps. Coming soon.",
  "landing.privacy": "We do not save what you type. No sign up. No tracking.",

  "flow.back": "Back",
  "flow.next": "Next",
  "flow.notSure": "Not sure",
  "flow.stepOf": "Step {step} of {total}",

  "flow.zip.q": "Where do you live?",
  "flow.zip.hint": "Type your ZIP code.",
  "flow.zip.confirm": "Looks like you live in {state}. Is that right?",
  "flow.zip.fix": "No, pick my state",
  "flow.zip.bad": "That ZIP code does not look right. Please check it.",

  "flow.family.q": "Who lives with you?",
  "flow.family.single": "Just me",
  "flow.family.married": "Me and my spouse",
  "flow.family.kids": "How many kids live with you?",
  "flow.family.kidAge": "How old is kid {n}?",

  "flow.housing.q": "What do you pay to live there each month?",
  "flow.housing.hint": "Rent or house payment. Your best guess is fine.",

  "flow.childcare.q": "What do you pay for child care each month?",
  "flow.childcare.hint": "If family watches your kids for free, put 0.",

  "flow.pay.q": "What do you make now, before taxes?",
  "flow.pay.perHour": "Per hour",
  "flow.pay.perMonth": "Per month",
  "flow.pay.perYear": "Per year",
  "flow.pay.hours": "How many hours a week do you work?",
  "flow.pay.spouse": "What does your spouse make, before taxes?",
  "flow.pay.cta": "See my answer",

  "loading.title": "Doing the math…",
  "loading.body": "We check your help at 100 pay levels. This can take a few seconds.",

  "result.verdict.always_up": "Good news. When you earn more, you keep more.",
  "result.verdict.always_up.body": "We did not find a spot where more pay leaves you with less.",
  "result.verdict.cliff_ahead": "Watch out near {wage}.",
  "result.verdict.cliff_ahead.body": "If your pay goes past {wage}, you could lose about {drop} a year. People call this a benefits cliff.",
  "result.verdict.in_danger_zone": "You are in a tough spot right now.",
  "result.verdict.in_danger_zone.body": "At your pay, you may end up with less than someone who earns a bit less. Once pay gets past {escape}, earning more helps again.",
  "result.verdict.cliff_behind": "Good news from here on.",
  "result.verdict.cliff_behind.body": "The big drop is below your pay now. From here, more pay means more for you.",

  "result.chart.title": "Your pay vs. what you keep",
  "result.chart.xLabel": "Your pay ({unit})",
  "result.chart.yLabel": "What your family ends up with each year",
  "result.chart.youAreHere": "You are here",
  "result.chart.dangerZone": "Rough zone: more pay, less money",
  "result.chart.alt": "A chart of what your family keeps as your pay goes up. Shaded parts show where more pay means less money.",

  "result.why.title": "Why does this happen?",
  "result.why.lost": "Near {wage}, you could lose {programs}.",
  "result.why.currentValue": "Right now this is worth about {amount} a year to you.",

  "result.honesty.title": "Please know",
  "result.honesty.body": "This is a guess based on public rules. Your caseworker decides your real benefits. Rules change. Do not make a big choice on this number alone.",
  "result.honesty.model": "Numbers come from PolicyEngine, an open rules model. We may not know every local program.",

  "result.tryAgain": "Try again",
  "result.startOver": "Start over",
  "error.title": "We could not get your answer.",
  "error.body": "The math service did not reply. Your answers were not saved. Please try again in a minute.",

  "program.snap": "food help (SNAP)",
  "program.medicaid": "health coverage (Medicaid)",
  "program.chip": "kids' health coverage (CHIP)",
  "program.eitc": "a tax credit for workers (EITC)",
  "program.ctc": "the child tax credit",
  "program.aca": "help paying for health insurance",
  "program.tanf": "cash help (TANF)",
  "program.housing": "housing help",
  "program.wic": "food help for moms and babies (WIC)",
  "program.ssi": "SSI cash help",

  "places.title": "Compare places",
  "places.body": "We are building a map that shows which states have the worst benefit gaps. It is not ready yet.",
  "places.back": "Go back home"
}
```

`app/src/strings/t.ts`:

```ts
import strings from "./en.json";

export type StringKey = keyof typeof strings;

export function t(key: StringKey, params?: Record<string, string | number>): string {
  let s: string = strings[key];
  if (s === undefined) throw new Error(`missing string: ${key}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (!s.includes(`{${k}}`)) throw new Error(`string ${key} has no {${k}}`);
    s = s.replaceAll(`{${k}}`, String(v));
  }
  const leftover = s.match(/\{[a-zA-Z]+\}/);
  if (leftover) throw new Error(`string ${key} missing param ${leftover[0]}`);
  return s;
}
```

- [ ] **Step 3: t() tests** — `app/src/strings/t.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { t } from "./t.js";

describe("t", () => {
  it("returns plain strings", () => {
    expect(t("flow.next")).toBe("Next");
  });
  it("interpolates params", () => {
    expect(t("flow.stepOf", { step: 2, total: 5 })).toBe("Step 2 of 5");
  });
  it("throws when a param is missing", () => {
    expect(() => t("flow.stepOf", { step: 2 })).toThrow(/missing param/);
  });
});
```

Run `npx vitest run app` → pass (after `npm install`).

- [ ] **Step 4: Readability gate** — `scripts/readability.mjs`:

```js
// Flesch-Kincaid grade gate over app/src/strings/en.json.
// Corpus grade must be <= 5.9; every individual string <= 8.0.
import { readFileSync } from "node:fs";

const strings = JSON.parse(readFileSync(new URL("../app/src/strings/en.json", import.meta.url), "utf8"));

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function grade(text) {
  // Strip param placeholders and acronyms in parens; they aren't prose.
  const prose = text.replaceAll(/\{[a-zA-Z]+\}/g, "money").replaceAll(/\([A-Z]{2,}\)/g, "");
  const sentences = Math.max(1, (prose.match(/[.!?…]+/g) ?? []).length);
  const words = prose.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (words.length === 0) return 0;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}

const perString = Object.entries(strings).map(([key, text]) => ({ key, text, grade: grade(text) }));
const corpus = grade(Object.values(strings).join(" "));

let failed = false;
for (const s of perString.filter((s) => s.grade > 8.0)) {
  console.error(`FAIL grade ${s.grade.toFixed(1)} > 8.0: ${s.key} = "${s.text}"`);
  failed = true;
}
console.log(`corpus grade: ${corpus.toFixed(2)} (limit 5.90)`);
if (corpus > 5.9) failed = true;
if (failed) process.exit(1);
console.log(`readability OK (${perString.length} strings)`);
```

- [ ] **Step 5: Run the gate and fix copy until green**

```bash
npm run readability
```

Expected: `readability OK`. If any string fails, shorten words/sentences in `en.json` — do not raise the limits.

- [ ] **Step 6: Wire into CI** — append to `.github/workflows/ci.yml` job steps:

```yaml
      - run: npm run readability
      - run: npm run build --workspace @hotgap/app
```

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(app): string catalog with 5th-grade readability CI gate"`

---

### Task 9: ZIP→state data and lookup

**Files:**
- Create: `scripts/build-zip-table.mjs`, `app/src/data/zip3-state.json` (generated, committed), `app/src/lib/zip.ts`
- Test: `app/src/lib/zip.test.ts`

**Interfaces:**
- Produces: `zipToState(zip: string): string | null` — 5-digit ZIP → two-letter state, via 3-digit prefix majority table; `null` for malformed/unknown. Data source: GeoNames US postal codes (CC BY 4.0, attributed in README from Task 1).

- [ ] **Step 1: Generator** — `scripts/build-zip-table.mjs`:

```js
// Regenerates app/src/data/zip3-state.json from GeoNames (CC BY 4.0).
// Usage: node scripts/build-zip-table.mjs
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const url = "https://download.geonames.org/export/zip/US.zip";
execSync(`curl -sSL ${url} -o /tmp/geonames-us.zip && cd /tmp && unzip -o geonames-us.zip US.txt`, { stdio: "inherit" });
const rows = execSync("cat /tmp/US.txt", { maxBuffer: 64 * 1024 * 1024 })
  .toString("utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split("\t"))
  .map((cols) => ({ zip: cols[1], state: cols[4] }))
  .filter((r) => /^\d{5}$/.test(r.zip) && /^[A-Z]{2}$/.test(r.state));

const counts = new Map(); // zip3 -> {state: n}
for (const { zip, state } of rows) {
  const p = zip.slice(0, 3);
  if (!counts.has(p)) counts.set(p, {});
  counts.get(p)[state] = (counts.get(p)[state] ?? 0) + 1;
}
const table = {};
for (const [prefix, byState] of [...counts.entries()].sort()) {
  table[prefix] = Object.entries(byState).sort((a, b) => b[1] - a[1])[0][0];
}
writeFileSync(new URL("../app/src/data/zip3-state.json", import.meta.url), JSON.stringify(table));
console.log(`wrote ${Object.keys(table).length} prefixes`);
```

- [ ] **Step 2: Generate and sanity-check the data**

```bash
node scripts/build-zip-table.mjs
node -e 'const t=require("./app/src/data/zip3-state.json"); console.log(t["941"], t["100"], t["606"], t["331"]);'
```

Expected: `CA NY IL FL` and ~900 prefixes written.

- [ ] **Step 3: Failing tests** — `app/src/lib/zip.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { zipToState } from "./zip.js";

describe("zipToState", () => {
  it("maps well-known ZIPs to their state", () => {
    expect(zipToState("94110")).toBe("CA");
    expect(zipToState("10001")).toBe("NY");
    expect(zipToState("60601")).toBe("IL");
  });
  it("rejects malformed input", () => {
    expect(zipToState("1234")).toBeNull();
    expect(zipToState("abcde")).toBeNull();
    expect(zipToState("")).toBeNull();
  });
  it("returns null for unassigned prefixes", () => {
    expect(zipToState("00000")).toBeNull();
  });
});
```

- [ ] **Step 4: Implement** — `app/src/lib/zip.ts`:

```ts
import table from "../data/zip3-state.json";

export function zipToState(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  return (table as Record<string, string>)[zip.slice(0, 3)] ?? null;
}
```

- [ ] **Step 5: Verify pass** — `npx vitest run app/src/lib/zip.test.ts` → pass.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(app): ZIP-to-state lookup from GeoNames-derived prefix table"`

---

### Task 10: Narration — verdicts and why-items into words

**Files:**
- Create: `app/src/lib/narration.ts`
- Test: `app/src/lib/narration.test.ts`

**Interfaces:**
- Consumes: `CurveAnalysis`, `Cliff` (Task 5); `fromAnnual`, `roundTo`, `PayUnit` (Task 3); `t`, `StringKey` (Task 8).
- Produces (exact):

```ts
interface PayContext { unit: PayUnit; hoursPerWeek?: number }
interface Narration { headline: string; body: string; whyItems: WhyItem[] }
interface WhyItem { programLabel: string; lostNear: string | null; currentValue: string }
formatWage(annual: number, ctx: PayContext): string   // "$19.50 an hour" | "$3,000 a month" | "$36,000 a year"
formatDollars(n: number): string                      // "$22,000" (nearest $100)
narrate(analysis: CurveAnalysis, ctx: PayContext): Narration
```

- Rules: wage strings round hourly to $0.25, monthly to $50, yearly to $500. Headline/body come from the four `result.verdict.*` string pairs, parameterized. `whyItems` = one entry per program that is nonzero at current earnings OR lost at the next cliff, ordered: lost-at-cliff programs first, then by current value descending; max 5 items.

- [ ] **Step 1: Failing tests** — `app/src/lib/narration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse, analyzeCurve } from "@hotgap/shared";
import { narrate, formatWage, formatDollars } from "./narration.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const points = parsePEResponse(fixture, 101);

describe("formatWage", () => {
  it("formats each unit with rounding", () => {
    expect(formatWage(41600, { unit: "hour", hoursPerWeek: 40 })).toBe("$20 an hour");
    expect(formatWage(40560, { unit: "hour", hoursPerWeek: 40 })).toBe("$19.50 an hour");
    expect(formatWage(36000, { unit: "month" })).toBe("$3,000 a month");
    expect(formatWage(36200, { unit: "year" })).toBe("$36,000 a year");
  });
});

describe("formatDollars", () => {
  it("rounds to the nearest hundred", () => {
    expect(formatDollars(21956.57)).toBe("$22,000");
  });
});

describe("narrate on the CA fixture at $20k (cliff ahead at $30k)", () => {
  const n = narrate(analyzeCurve(points, 20000), { unit: "hour", hoursPerWeek: 40 });
  it("picks the cliff_ahead headline with the cliff wage", () => {
    expect(n.headline).toContain("Watch out");
    expect(n.headline).toContain("$14.50 an hour"); // 30000/(40*52) = 14.42 → 14.50
  });
  it("mentions the size of the drop in the body", () => {
    expect(n.body).toContain("$22,000");
  });
  it("lists medicaid among the why-items with a lostNear wage", () => {
    const med = n.whyItems.find((w) => w.programLabel.includes("Medicaid"));
    expect(med).toBeDefined();
    expect(med!.lostNear).toContain("$14.50 an hour");
  });
  it("caps why-items at 5", () => {
    expect(n.whyItems.length).toBeLessThanOrEqual(5);
  });
});

describe("narrate verdict routing", () => {
  it("uses always_up strings when there are no cliffs", () => {
    const flat = points.map((p, i) => ({ ...p, netIncome: 10000 + i * 500 }));
    const n = narrate(analyzeCurve(flat, 20000), { unit: "year" });
    expect(n.headline).toContain("Good news");
  });
});
```

- [ ] **Step 2: Verify failure** — `npx vitest run app/src/lib/narration.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `app/src/lib/narration.ts`:

```ts
import {
  fromAnnual, roundTo,
  type CurveAnalysis, type PayUnit, type ProgramId,
} from "@hotgap/shared";
import { t, type StringKey } from "../strings/t.js";

export interface PayContext { unit: PayUnit; hoursPerWeek?: number }
export interface WhyItem { programLabel: string; lostNear: string | null; currentValue: string }
export interface Narration { headline: string; body: string; whyItems: WhyItem[] }

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatDollars(n: number): string {
  return money.format(roundTo(n, 100));
}

export function formatWage(annual: number, ctx: PayContext): string {
  switch (ctx.unit) {
    case "hour": {
      const w = roundTo(fromAnnual(annual, "hour", ctx.hoursPerWeek), 0.25);
      const s = Number.isInteger(w) ? money.format(w) : `$${w.toFixed(2)}`;
      return `${s} an hour`;
    }
    case "month":
      return `${money.format(roundTo(fromAnnual(annual, "month"), 50))} a month`;
    case "year":
      return `${money.format(roundTo(annual, 500))} a year`;
  }
}

function interpolateAt(analysis: CurveAnalysis, earnings: number): Record<ProgramId, number> {
  // programs at the sample point nearest to earnings (program steps, not slopes, drive the story)
  const nearest = analysis.points.reduce((a, b) =>
    Math.abs(b.earnings - earnings) < Math.abs(a.earnings - earnings) ? b : a,
  );
  return nearest.programs;
}

export function narrate(analysis: CurveAnalysis, ctx: PayContext): Narration {
  const v = analysis.verdict;
  const params: Record<string, string> = {};
  if (analysis.nextCliff) {
    params.wage = formatWage(analysis.nextCliff.startEarnings, ctx);
    params.drop = formatDollars(analysis.nextCliff.drop);
  } else if (analysis.worstCliff) {
    params.wage = formatWage(analysis.worstCliff.startEarnings, ctx);
    params.drop = formatDollars(analysis.worstCliff.drop);
  }
  if (analysis.escapeEarnings !== null) params.escape = formatWage(analysis.escapeEarnings, ctx);
  if (v === "in_danger_zone" && analysis.escapeEarnings === null) {
    // never recovers in the sweep — reuse the zone start as the reference wage
    params.escape = formatWage(analysis.points[analysis.points.length - 1].earnings, ctx);
  }

  const headline = t(`result.verdict.${v}` as StringKey, pick(params, HEADLINE_PARAMS[v]));
  const body = t(`result.verdict.${v}.body` as StringKey, pick(params, BODY_PARAMS[v]));

  const current = interpolateAt(analysis, analysis.currentEarnings);
  const lost = new Set<ProgramId>(analysis.nextCliff?.programsLost ?? []);
  const candidates = (Object.entries(current) as [ProgramId, number][])
    .filter(([id, value]) => value > 50 || lost.has(id))
    .sort((a, b) => Number(lost.has(b[0])) - Number(lost.has(a[0])) || b[1] - a[1])
    .slice(0, 5);

  const whyItems: WhyItem[] = candidates.map(([id, value]) => ({
    programLabel: t(`program.${id}` as StringKey),
    lostNear: lost.has(id) && analysis.nextCliff
      ? formatWage(analysis.nextCliff.startEarnings, ctx)
      : null,
    currentValue: formatDollars(value),
  }));

  return { headline, body, whyItems };
}

const HEADLINE_PARAMS: Record<string, string[]> = {
  always_up: [], cliff_ahead: ["wage"], in_danger_zone: [], cliff_behind: [],
};
const BODY_PARAMS: Record<string, string[]> = {
  always_up: [], cliff_ahead: ["wage", "drop"], in_danger_zone: ["escape"], cliff_behind: [],
};

function pick(obj: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
}
```

- [ ] **Step 4: Verify pass** — `npx vitest run app` → all pass; `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(app): plain-language narration from curve analysis"`

---

### Task 11: API client, flow state machine, question screens

**Read the `frontend-design:frontend-design` skill before this task.**

**Files:**
- Create: `app/src/api/client.ts`, `app/src/flow/state.ts`, `app/src/flow/Flow.tsx`, `app/src/flow/screens.tsx`
- Test: `app/src/api/client.test.ts`, `app/src/flow/state.test.ts`

**Interfaces:**
- Consumes: `HouseholdAnswers`, `CurveResponse`, `toAnnual`, `Pay` (shared); `zipToState` (Task 9); `t` (Task 8).
- Produces (exact):

```ts
// client.ts
type CurveResult = { ok: true; data: CurveResponse } | { ok: false; kind: "timeout" | "server" | "network" };
fetchCurve(answers: HouseholdAnswers, fetchImpl?: typeof fetch): Promise<CurveResult>  // 30s timeout

// state.ts
interface FlowAnswers {
  zip: string; state: string | null; married: boolean; childAges: number[];
  monthlyRent: number | null; monthlyChildcare: number | null;
  pay: Pay; spousePay: Pay | null;
}
type ScreenId = "zip" | "family" | "housing" | "childcare" | "pay";
interface FlowState { screen: ScreenId; answers: FlowAnswers }
flowReducer(state: FlowState, action: FlowAction): FlowState
canAdvance(state: FlowState): boolean
visibleScreens(answers: FlowAnswers): ScreenId[]   // childcare omitted when no child under 13
toHouseholdAnswers(a: FlowAnswers): HouseholdAnswers
initialFlowState: FlowState
type FlowAction =
  | { type: "setZip"; zip: string } | { type: "setState"; state: string }
  | { type: "setMarried"; married: boolean } | { type: "setChildAges"; ages: number[] }
  | { type: "setRent"; amount: number | null } | { type: "setChildcare"; amount: number | null }
  | { type: "setPay"; pay: Pay } | { type: "setSpousePay"; pay: Pay | null }
  | { type: "next" } | { type: "back" };
// Flow.tsx
<Flow onComplete={(answers: HouseholdAnswers, ctx: {unit: PayUnit; hoursPerWeek?: number}) => void} />
```

- [ ] **Step 1: Failing client tests** — `app/src/api/client.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fetchCurve } from "./client.js";
import type { HouseholdAnswers } from "@hotgap/shared";

const answers: HouseholdAnswers = {
  state: "CA", married: false, childAges: [5], monthlyRent: null,
  monthlyChildcare: null, annualEarnings: 30000, spouseAnnualEarnings: 0,
};

describe("fetchCurve", () => {
  it("returns data on 200", async () => {
    const fake = (async () =>
      new Response(JSON.stringify({ year: "2026", currentEarnings: 30000, points: [] }), { status: 200 })) as unknown as typeof fetch;
    const r = await fetchCurve(answers, fake);
    expect(r.ok).toBe(true);
  });
  it("maps 504 to timeout and 502 to server", async () => {
    const f = (status: number) => (async () => new Response("{}", { status })) as unknown as typeof fetch;
    expect((await fetchCurve(answers, f(504))).ok).toBe(false);
    expect(((await fetchCurve(answers, f(504))) as { kind: string }).kind).toBe("timeout");
    expect(((await fetchCurve(answers, f(502))) as { kind: string }).kind).toBe("server");
  });
  it("maps thrown fetch errors to network", async () => {
    const f = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    expect(((await fetchCurve(answers, f)) as { kind: string }).kind).toBe("network");
  });
});
```

- [ ] **Step 2: Implement client** — `app/src/api/client.ts`:

```ts
import type { CurveResponse, HouseholdAnswers } from "@hotgap/shared";

export type CurveResult =
  | { ok: true; data: CurveResponse }
  | { ok: false; kind: "timeout" | "server" | "network" };

export async function fetchCurve(
  answers: HouseholdAnswers,
  fetchImpl: typeof fetch = fetch,
): Promise<CurveResult> {
  let res: Response;
  try {
    res = await fetchImpl("/api/curve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    return { ok: false, kind: (e as Error).name === "TimeoutError" ? "timeout" : "network" };
  }
  if (res.status === 200) return { ok: true, data: (await res.json()) as CurveResponse };
  return { ok: false, kind: res.status === 504 ? "timeout" : "server" };
}
```

- [ ] **Step 3: Failing flow-state tests** — `app/src/flow/state.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  flowReducer, initialFlowState, canAdvance, visibleScreens, toHouseholdAnswers,
} from "./state.js";

describe("flow state machine", () => {
  it("starts on zip and cannot advance until a valid state is derived", () => {
    expect(initialFlowState.screen).toBe("zip");
    expect(canAdvance(initialFlowState)).toBe(false);
    const s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
    expect(s.answers.state).toBe("CA");
    expect(canAdvance(s)).toBe(true);
  });

  it("skips the childcare screen when there is no child under 13", () => {
    const a = { ...initialFlowState.answers, childAges: [15] };
    expect(visibleScreens(a)).toEqual(["zip", "family", "housing", "pay"]);
    expect(visibleScreens({ ...a, childAges: [3] })).toContain("childcare");
  });

  it("walks next/back through visible screens", () => {
    let s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
    s = flowReducer(s, { type: "next" });
    expect(s.screen).toBe("family");
    s = flowReducer(s, { type: "back" });
    expect(s.screen).toBe("zip");
  });

  it("requires pay > 0 to finish", () => {
    let s = { ...initialFlowState, screen: "pay" as const };
    expect(canAdvance(s)).toBe(false);
    s = flowReducer(s, { type: "setPay", pay: { amount: 18, unit: "hour", hoursPerWeek: 30 } });
    expect(canAdvance(s)).toBe(true);
  });

  it("converts to HouseholdAnswers with annualized pay", () => {
    let s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
    s = flowReducer(s, { type: "setMarried", married: true });
    s = flowReducer(s, { type: "setPay", pay: { amount: 20, unit: "hour", hoursPerWeek: 40 } });
    s = flowReducer(s, { type: "setSpousePay", pay: { amount: 3000, unit: "month" } });
    const h = toHouseholdAnswers(s.answers);
    expect(h).toMatchObject({ state: "CA", married: true, annualEarnings: 41600, spouseAnnualEarnings: 36000 });
  });
});
```

- [ ] **Step 4: Implement state machine** — `app/src/flow/state.ts`:

```ts
import { toAnnual, type HouseholdAnswers, type Pay } from "@hotgap/shared";
import { zipToState } from "../lib/zip.js";

export type ScreenId = "zip" | "family" | "housing" | "childcare" | "pay";

export interface FlowAnswers {
  zip: string;
  state: string | null;
  married: boolean;
  childAges: number[];
  monthlyRent: number | null;
  monthlyChildcare: number | null;
  pay: Pay;
  spousePay: Pay | null;
}

export interface FlowState { screen: ScreenId; answers: FlowAnswers }

export type FlowAction =
  | { type: "setZip"; zip: string }
  | { type: "setState"; state: string }
  | { type: "setMarried"; married: boolean }
  | { type: "setChildAges"; ages: number[] }
  | { type: "setRent"; amount: number | null }
  | { type: "setChildcare"; amount: number | null }
  | { type: "setPay"; pay: Pay }
  | { type: "setSpousePay"; pay: Pay | null }
  | { type: "next" }
  | { type: "back" };

export const initialFlowState: FlowState = {
  screen: "zip",
  answers: {
    zip: "", state: null, married: false, childAges: [],
    monthlyRent: null, monthlyChildcare: null,
    pay: { amount: 0, unit: "hour", hoursPerWeek: 40 },
    spousePay: null,
  },
};

export function visibleScreens(a: FlowAnswers): ScreenId[] {
  const screens: ScreenId[] = ["zip", "family", "housing"];
  if (a.childAges.some((age) => age < 13)) screens.push("childcare");
  screens.push("pay");
  return screens;
}

export function canAdvance(s: FlowState): boolean {
  switch (s.screen) {
    case "zip": return s.answers.state !== null;
    case "family": return s.answers.childAges.every((a) => a >= 0 && a <= 17);
    case "housing": return true;   // "not sure" (null) is a valid answer
    case "childcare": return true;
    case "pay": return s.answers.pay.amount > 0;
  }
}

export function flowReducer(s: FlowState, action: FlowAction): FlowState {
  const a = s.answers;
  switch (action.type) {
    case "setZip": return { ...s, answers: { ...a, zip: action.zip, state: zipToState(action.zip) } };
    case "setState": return { ...s, answers: { ...a, state: action.state } };
    case "setMarried": return { ...s, answers: { ...a, married: action.married, spousePay: action.married ? a.spousePay : null } };
    case "setChildAges": return { ...s, answers: { ...a, childAges: action.ages } };
    case "setRent": return { ...s, answers: { ...a, monthlyRent: action.amount } };
    case "setChildcare": return { ...s, answers: { ...a, monthlyChildcare: action.amount } };
    case "setPay": return { ...s, answers: { ...a, pay: action.pay } };
    case "setSpousePay": return { ...s, answers: { ...a, spousePay: action.pay } };
    case "next": {
      if (!canAdvance(s)) return s;
      const order = visibleScreens(a);
      const i = order.indexOf(s.screen);
      return i < order.length - 1 ? { ...s, screen: order[i + 1] } : s;
    }
    case "back": {
      const order = visibleScreens(a);
      const i = order.indexOf(s.screen);
      return i > 0 ? { ...s, screen: order[i - 1] } : s;
    }
  }
}

export function toHouseholdAnswers(a: FlowAnswers): HouseholdAnswers {
  if (!a.state) throw new Error("state not set");
  return {
    state: a.state,
    married: a.married,
    childAges: a.childAges,
    monthlyRent: a.monthlyRent,
    monthlyChildcare: a.childAges.some((age) => age < 13) ? a.monthlyChildcare : 0,
    annualEarnings: toAnnual(a.pay),
    spouseAnnualEarnings: a.married && a.spousePay ? toAnnual(a.spousePay) : 0,
  };
}
```

Run `npx vitest run app` → pass.

- [ ] **Step 5: Screens and Flow shell** — `app/src/flow/screens.tsx`. Design constraints (from the frontend-design skill pass): one question per screen; question as an `<h1>` ~28 px; inputs ≥ 44 px tall with 18 px+ text; numeric inputs use `inputMode`; a big sticky Next button; Back is a quiet text button; progress line "Step N of M" via `t("flow.stepOf")`. Complete code:

```tsx
import { useId } from "react";
import type { Pay, PayUnit } from "@hotgap/shared";
import { t } from "../strings/t.js";
import { STATE_NAMES } from "../lib/states.js";
import type { FlowAction, FlowAnswers } from "./state.js";

type D = (action: FlowAction) => void;

function MoneyInput(props: {
  id: string; value: number | null; onChange: (v: number | null) => void; notSureLabel?: string;
}) {
  return (
    <div className="money-row">
      <span className="money-prefix" aria-hidden>$</span>
      <input
        id={props.id}
        className="input"
        inputMode="decimal"
        value={props.value ?? ""}
        placeholder="0"
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
          props.onChange(e.target.value === "" ? null : Number.isFinite(n) ? n : null);
        }}
      />
      {props.notSureLabel && (
        <button type="button" className="ghost" onClick={() => props.onChange(null)}>
          {props.notSureLabel}
        </button>
      )}
    </div>
  );
}

export function ZipScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const id = useId();
  const bad = answers.zip.length === 5 && answers.state === null;
  return (
    <>
      <h1><label htmlFor={id}>{t("flow.zip.q")}</label></h1>
      <p className="hint">{t("flow.zip.hint")}</p>
      <input
        id={id} className="input" inputMode="numeric" autoComplete="postal-code"
        maxLength={5} value={answers.zip}
        onChange={(e) => dispatch({ type: "setZip", zip: e.target.value.replace(/\D/g, "") })}
      />
      {bad && <p role="alert" className="error-text">{t("flow.zip.bad")}</p>}
      {answers.state && (
        <div className="confirm-row">
          <p>{t("flow.zip.confirm", { state: STATE_NAMES[answers.state] ?? answers.state })}</p>
          <select
            aria-label={t("flow.zip.fix")}
            value={answers.state}
            onChange={(e) => dispatch({ type: "setState", state: e.target.value })}
          >
            {Object.entries(STATE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

export function FamilyScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const kids = answers.childAges;
  return (
    <>
      <h1>{t("flow.family.q")}</h1>
      <div className="choice-row" role="radiogroup" aria-label={t("flow.family.q")}>
        <button
          type="button" className={answers.married ? "choice" : "choice selected"}
          role="radio" aria-checked={!answers.married}
          onClick={() => dispatch({ type: "setMarried", married: false })}
        >{t("flow.family.single")}</button>
        <button
          type="button" className={answers.married ? "choice selected" : "choice"}
          role="radio" aria-checked={answers.married}
          onClick={() => dispatch({ type: "setMarried", married: true })}
        >{t("flow.family.married")}</button>
      </div>
      <p className="hint" id="kids-label">{t("flow.family.kids")}</p>
      <div className="stepper" aria-labelledby="kids-label">
        <button type="button" className="step-btn" aria-label="fewer kids"
          onClick={() => dispatch({ type: "setChildAges", ages: kids.slice(0, -1) })}>−</button>
        <output>{kids.length}</output>
        <button type="button" className="step-btn" aria-label="more kids"
          disabled={kids.length >= 6}
          onClick={() => dispatch({ type: "setChildAges", ages: [...kids, 5] })}>+</button>
      </div>
      {kids.map((age, i) => (
        <div key={i} className="kid-age-row">
          <label htmlFor={`kid-${i}`}>{t("flow.family.kidAge", { n: i + 1 })}</label>
          <select id={`kid-${i}`} value={age}
            onChange={(e) => {
              const ages = [...kids]; ages[i] = Number(e.target.value);
              dispatch({ type: "setChildAges", ages });
            }}>
            {Array.from({ length: 18 }, (_, y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      ))}
    </>
  );
}

export function HousingScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const id = useId();
  return (
    <>
      <h1><label htmlFor={id}>{t("flow.housing.q")}</label></h1>
      <p className="hint">{t("flow.housing.hint")}</p>
      <MoneyInput id={id} value={answers.monthlyRent} notSureLabel={t("flow.notSure")}
        onChange={(v) => dispatch({ type: "setRent", amount: v })} />
    </>
  );
}

export function ChildcareScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const id = useId();
  return (
    <>
      <h1><label htmlFor={id}>{t("flow.childcare.q")}</label></h1>
      <p className="hint">{t("flow.childcare.hint")}</p>
      <MoneyInput id={id} value={answers.monthlyChildcare} notSureLabel={t("flow.notSure")}
        onChange={(v) => dispatch({ type: "setChildcare", amount: v })} />
    </>
  );
}

function PayEditor({ pay, onChange, label }: { pay: Pay; onChange: (p: Pay) => void; label: string }) {
  const id = useId();
  const units: { u: PayUnit; label: string }[] = [
    { u: "hour", label: t("flow.pay.perHour") },
    { u: "month", label: t("flow.pay.perMonth") },
    { u: "year", label: t("flow.pay.perYear") },
  ];
  return (
    <fieldset className="pay-editor">
      <legend>{label}</legend>
      <div className="money-row">
        <span className="money-prefix" aria-hidden>$</span>
        <input id={id} className="input" inputMode="decimal" value={pay.amount || ""}
          aria-label={label}
          onChange={(e) => onChange({ ...pay, amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
      </div>
      <div className="choice-row">
        {units.map(({ u, label: ul }) => (
          <button key={u} type="button" className={pay.unit === u ? "choice selected" : "choice"}
            onClick={() => onChange({ ...pay, unit: u })}>{ul}</button>
        ))}
      </div>
      {pay.unit === "hour" && (
        <div className="hours-row">
          <label htmlFor={`${id}-h`}>{t("flow.pay.hours")}</label>
          <input id={`${id}-h`} className="input input-small" inputMode="numeric"
            value={pay.hoursPerWeek ?? 40}
            onChange={(e) => onChange({ ...pay, hoursPerWeek: Math.max(1, Math.min(80, Number(e.target.value) || 40)) })} />
        </div>
      )}
    </fieldset>
  );
}

export function PayScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  return (
    <>
      <h1>{t("flow.pay.q")}</h1>
      <PayEditor label={t("flow.pay.q")} pay={answers.pay}
        onChange={(pay) => dispatch({ type: "setPay", pay })} />
      {answers.married && (
        <PayEditor label={t("flow.pay.spouse")}
          pay={answers.spousePay ?? { amount: 0, unit: "hour", hoursPerWeek: 40 }}
          onChange={(pay) => dispatch({ type: "setSpousePay", pay })} />
      )}
    </>
  );
}
```

Also create `app/src/lib/states.ts` (used above; codes must match `worker/src/validate.ts` STATES):

```ts
export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington, DC", FL: "Florida",
  GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
```

`app/src/flow/Flow.tsx`:

```tsx
import { useReducer } from "react";
import type { HouseholdAnswers, PayUnit } from "@hotgap/shared";
import { t } from "../strings/t.js";
import {
  canAdvance, flowReducer, initialFlowState, toHouseholdAnswers, visibleScreens,
} from "./state.js";
import { ZipScreen, FamilyScreen, HousingScreen, ChildcareScreen, PayScreen } from "./screens.tsx";

export default function Flow(props: {
  onComplete: (answers: HouseholdAnswers, ctx: { unit: PayUnit; hoursPerWeek?: number }) => void;
}) {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  const order = visibleScreens(state.answers);
  const index = order.indexOf(state.screen);
  const last = index === order.length - 1;

  const Screen = {
    zip: ZipScreen, family: FamilyScreen, housing: HousingScreen,
    childcare: ChildcareScreen, pay: PayScreen,
  }[state.screen];

  return (
    <div className="flow">
      <p className="progress">{t("flow.stepOf", { step: index + 1, total: order.length })}</p>
      <Screen answers={state.answers} dispatch={dispatch} />
      <div className="nav-row">
        {index > 0 && (
          <button type="button" className="ghost" onClick={() => dispatch({ type: "back" })}>
            {t("flow.back")}
          </button>
        )}
        <button
          type="button" className="primary" disabled={!canAdvance(state)}
          onClick={() => {
            if (!last) return dispatch({ type: "next" });
            props.onComplete(toHouseholdAnswers(state.answers), {
              unit: state.answers.pay.unit,
              hoursPerWeek: state.answers.pay.hoursPerWeek,
            });
          }}
        >
          {last ? t("flow.pay.cta") : t("flow.next")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify** — `npx vitest run app && npm run typecheck` → pass (screens are exercised via Playwright in Task 13; the reducer is the unit-tested core).

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(app): five-question flow with state machine and API client"`

---### Task 12: Result page, curve chart, landing, app shell, styles

**Read the `dataviz` skill AND the `frontend-design:frontend-design` skill before this task.**

**Files:**
- Create: `app/src/result/CurveChart.tsx`, `app/src/result/WhyList.tsx`, `app/src/result/ResultPage.tsx`, `app/src/pages/Landing.tsx`, `app/src/pages/PlacesStub.tsx`
- Modify: `app/src/App.tsx`, `app/src/styles.css`
- Test: `app/src/result/CurveChart.test.tsx`

**Interfaces:**
- Consumes: `analyzeCurve`, `CurveAnalysis` (shared); `narrate`, `PayContext` (Task 10); `fetchCurve` (Task 11); `Flow` (Task 11); `t` (Task 8).
- Produces: `<CurveChart analysis={CurveAnalysis} ctx={PayContext} />` (pure SVG, no fetching); `<ResultPage answers={HouseholdAnswers} ctx={PayContext} onStartOver={() => void} />` (fetches, shows loading → chart+narration | error); `App` routes `#/ → Landing`, `#/check → Flow→ResultPage`, `#/places → PlacesStub` (hash routing, no router dep).

- [ ] **Step 1: Failing chart tests** — `app/src/result/CurveChart.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { parsePEResponse, analyzeCurve } from "@hotgap/shared";
import { CurveChart } from "./CurveChart.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const analysis = analyzeCurve(parsePEResponse(fixture, 101), 20000);

describe("CurveChart", () => {
  it("renders an accessible SVG with the net-income path", () => {
    const { container, getByRole } = render(
      <CurveChart analysis={analysis} ctx={{ unit: "hour", hoursPerWeek: 40 }} />,
    );
    expect(getByRole("img")).toBeTruthy();
    expect(container.querySelector("path.net-line")).toBeTruthy();
  });
  it("shades one rect per danger zone and marks the current position", () => {
    const { container } = render(
      <CurveChart analysis={analysis} ctx={{ unit: "hour", hoursPerWeek: 40 }} />,
    );
    expect(container.querySelectorAll("rect.danger-zone").length).toBe(analysis.dangerZones.length);
    expect(container.querySelector("circle.you-dot")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Implement chart** — `app/src/result/CurveChart.tsx` (per dataviz skill: one message per chart — "where the line falls"; net line is the only line; danger zones are the only red; axis text ≥ 12 px; no gridline clutter, 3–4 y ticks):

```tsx
import { scaleLinear } from "d3-scale";
import { line as d3line, curveMonotoneX } from "d3-shape";
import { fromAnnual, type CurveAnalysis } from "@hotgap/shared";
import { t } from "../strings/t.js";
import type { PayContext } from "../lib/narration.js";

const W = 360, H = 240, M = { top: 16, right: 12, bottom: 40, left: 52 };

export function CurveChart({ analysis, ctx }: { analysis: CurveAnalysis; ctx: PayContext }) {
  const pts = analysis.points;
  const x = scaleLinear([pts[0].earnings, pts[pts.length - 1].earnings], [M.left, W - M.right]);
  const yMax = Math.max(...pts.map((p) => p.netIncome));
  const y = scaleLinear([0, yMax * 1.05], [H - M.bottom, M.top]);

  const path = d3line<{ earnings: number; netIncome: number }>()
    .x((p) => x(p.earnings))
    .y((p) => y(p.netIncome))
    .curve(curveMonotoneX)(pts)!;

  const unitLabel = { hour: "$/hour", month: "$/month", year: "$/year" }[ctx.unit];
  const xTick = (annual: number) => {
    const v = fromAnnual(annual, ctx.unit, ctx.hoursPerWeek);
    return ctx.unit === "hour" ? `$${Math.round(v)}` : `$${Math.round(v / 1000)}k`;
  };
  const xTicks = x.ticks(5);
  const yTicks = y.ticks(4);

  return (
    <figure className="chart-figure">
      <figcaption className="chart-title">{t("result.chart.title")}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("result.chart.alt")} className="curve-chart">
        {analysis.dangerZones.map((z, i) => (
          <rect key={i} className="danger-zone"
            x={x(z.startEarnings)} y={M.top}
            width={x(z.endEarnings ?? pts[pts.length - 1].earnings) - x(z.startEarnings)}
            height={H - M.top - M.bottom} />
        ))}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="tick-line" />
            <text x={M.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="tick-text">
              ${Math.round(v / 1000)}k
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={v} x={x(v)} y={H - M.bottom + 16} textAnchor="middle" className="tick-text">
            {xTick(v)}
          </text>
        ))}
        <text x={(M.left + W - M.right) / 2} y={H - 4} textAnchor="middle" className="axis-label">
          {t("result.chart.xLabel", { unit: unitLabel })}
        </text>
        <path d={path} className="net-line" fill="none" />
        <circle
          className="you-dot" r={6}
          cx={x(analysis.currentEarnings)} cy={y(analysis.currentNet)}
        />
        <text
          x={x(analysis.currentEarnings)}
          y={Math.max(M.top + 10, y(analysis.currentNet) - 12)}
          textAnchor="middle" className="you-label"
        >
          {t("result.chart.youAreHere")}
        </text>
      </svg>
      {analysis.dangerZones.length > 0 && (
        <p className="chart-legend">
          <span className="legend-swatch" aria-hidden /> {t("result.chart.dangerZone")}
        </p>
      )}
    </figure>
  );
}
```

- [ ] **Step 3: WhyList and ResultPage** — `app/src/result/WhyList.tsx`:

```tsx
import type { WhyItem } from "../lib/narration.js";
import { t } from "../strings/t.js";

const ICONS: Record<string, string> = {
  food: "🍎", health: "🏥", kids: "👶", housing: "🏠", cash: "💵", tax: "🧾",
};
function iconFor(label: string): string {
  if (label.includes("food")) return ICONS.food;
  if (label.includes("health")) return ICONS.health;
  if (label.includes("child")) return ICONS.kids;
  if (label.includes("housing")) return ICONS.housing;
  if (label.includes("tax")) return ICONS.tax;
  return ICONS.cash;
}

export function WhyList({ items }: { items: WhyItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="why">
      <h2>{t("result.why.title")}</h2>
      <ul className="why-list">
        {items.map((item) => (
          <li key={item.programLabel} className="why-item">
            <span className="why-icon" aria-hidden>{iconFor(item.programLabel)}</span>
            <div>
              {item.lostNear && (
                <p className="why-lost">
                  {t("result.why.lost", { wage: item.lostNear, programs: item.programLabel })}
                </p>
              )}
              <p className="why-value">
                {!item.lostNear && <strong>{item.programLabel}: </strong>}
                {t("result.why.currentValue", { amount: item.currentValue })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`app/src/result/ResultPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { analyzeCurve, type CurveAnalysis, type HouseholdAnswers } from "@hotgap/shared";
import { fetchCurve } from "../api/client.js";
import { narrate, type Narration, type PayContext } from "../lib/narration.js";
import { t } from "../strings/t.js";
import { CurveChart } from "./CurveChart.js";
import { WhyList } from "./WhyList.js";

type Status =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "done"; analysis: CurveAnalysis; narration: Narration };

export function ResultPage(props: {
  answers: HouseholdAnswers;
  ctx: PayContext;
  onStartOver: () => void;
}) {
  const [status, setStatus] = useState<Status>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus({ phase: "loading" });
    fetchCurve(props.answers).then((r) => {
      if (!alive) return;
      if (!r.ok) return setStatus({ phase: "error" });
      const analysis = analyzeCurve(r.data.points, r.data.currentEarnings);
      setStatus({ phase: "done", analysis, narration: narrate(analysis, props.ctx) });
    });
    return () => { alive = false; };
  }, [props.answers, props.ctx, attempt]);

  if (status.phase === "loading") {
    return (
      <div className="loading" role="status">
        <div className="spinner" aria-hidden />
        <h1>{t("loading.title")}</h1>
        <p>{t("loading.body")}</p>
      </div>
    );
  }

  if (status.phase === "error") {
    return (
      <div className="error-page">
        <h1>{t("error.title")}</h1>
        <p>{t("error.body")}</p>
        <div className="nav-row">
          <button type="button" className="primary" onClick={() => setAttempt((n) => n + 1)}>
            {t("result.tryAgain")}
          </button>
          <button type="button" className="ghost" onClick={props.onStartOver}>
            {t("result.startOver")}
          </button>
        </div>
      </div>
    );
  }

  const { analysis, narration } = status;
  return (
    <article className={`result verdict-${analysis.verdict}`}>
      <h1 className="verdict-headline">{narration.headline}</h1>
      <p className="verdict-body">{narration.body}</p>
      <CurveChart analysis={analysis} ctx={props.ctx} />
      <WhyList items={narration.whyItems} />
      <aside className="honesty" aria-label={t("result.honesty.title")}>
        <h2>{t("result.honesty.title")}</h2>
        <p>{t("result.honesty.body")}</p>
        <p className="honesty-model">{t("result.honesty.model")}</p>
      </aside>
      <button type="button" className="ghost" onClick={props.onStartOver}>
        {t("result.startOver")}
      </button>
    </article>
  );
}
```

- [ ] **Step 4: Landing, places stub, app shell** — `app/src/pages/Landing.tsx`:

```tsx
import { t } from "../strings/t.js";

export function Landing() {
  return (
    <div className="landing">
      <header className="hero">
        <p className="brand">{t("site.title")}</p>
        <h1>{t("site.tagline")}</h1>
      </header>
      <nav className="doors">
        <a className="door door-check" href="#/check">
          <h2>{t("landing.check.title")}</h2>
          <p>{t("landing.check.body")}</p>
          <span className="door-cta">{t("landing.check.cta")} →</span>
        </a>
        <a className="door door-places" href="#/places">
          <h2>{t("landing.places.title")}</h2>
          <p>{t("landing.places.body")}</p>
        </a>
      </nav>
      <footer className="landing-foot">
        <p>{t("landing.privacy")}</p>
      </footer>
    </div>
  );
}
```

`app/src/pages/PlacesStub.tsx`:

```tsx
import { t } from "../strings/t.js";

export function PlacesStub() {
  return (
    <div className="places-stub">
      <h1>{t("places.title")}</h1>
      <p>{t("places.body")}</p>
      <a className="primary" href="#/">{t("places.back")}</a>
    </div>
  );
}
```

`app/src/App.tsx` (replace placeholder):

```tsx
import { useEffect, useState } from "react";
import type { HouseholdAnswers } from "@hotgap/shared";
import Flow from "./flow/Flow.js";
import { ResultPage } from "./result/ResultPage.js";
import type { PayContext } from "./lib/narration.js";
import { Landing } from "./pages/Landing.js";
import { PlacesStub } from "./pages/PlacesStub.js";

function useHashRoute(): string {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(location.hash || "#/");
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

export default function App() {
  const route = useHashRoute();
  const [result, setResult] = useState<{ answers: HouseholdAnswers; ctx: PayContext } | null>(null);

  useEffect(() => { if (!route.startsWith("#/check")) setResult(null); }, [route]);

  let page: JSX.Element;
  if (route.startsWith("#/check")) {
    page = result ? (
      <ResultPage answers={result.answers} ctx={result.ctx} onStartOver={() => setResult(null)} />
    ) : (
      <Flow onComplete={(answers, ctx) => setResult({ answers, ctx })} />
    );
  } else if (route.startsWith("#/places")) {
    page = <PlacesStub />;
  } else {
    page = <Landing />;
  }
  return <main className="shell">{page}</main>;
}
```

- [ ] **Step 5: Styles** — `app/src/styles.css`. Design tokens per the frontend-design pass: warm off-white ground, one accent (deep teal), one danger hue (clay red) reserved exclusively for danger zones/cliff copy; big type scale (18 px base, 28 px h1); system font stack; dark mode via `prefers-color-scheme`. Complete file:

```css
:root {
  --bg: #faf7f2;
  --ink: #23211c;
  --muted: #6b675e;
  --accent: #0e6b63;
  --accent-ink: #fff;
  --danger: #b4432f;
  --danger-soft: #f4ded9;
  --card: #ffffff;
  --line: #e4ded2;
  --radius: 14px;
  font-size: 18px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1c1a17; --ink: #f0ede6; --muted: #a8a396;
    --accent: #4fb3a9; --accent-ink: #10201e;
    --danger: #e0705a; --danger-soft: #3a241f;
    --card: #26231f; --line: #3a362f;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.5;
}
.shell { max-width: 560px; margin: 0 auto; padding: 20px 16px 48px; min-height: 100dvh; }
h1 { font-size: 1.6rem; line-height: 1.25; margin: 0.4em 0; }
h2 { font-size: 1.15rem; margin: 0.6em 0 0.3em; }
.hint, .progress { color: var(--muted); margin: 0.2em 0 0.8em; }
.brand { font-weight: 800; letter-spacing: 0.02em; color: var(--accent); margin: 0; }

.input {
  width: 100%; min-height: 52px; font-size: 1.2rem; padding: 8px 14px;
  border: 2px solid var(--line); border-radius: var(--radius);
  background: var(--card); color: var(--ink);
}
.input:focus-visible { outline: 3px solid var(--accent); outline-offset: 1px; }
.input-small { width: 6ch; }
.money-row { display: flex; align-items: center; gap: 8px; }
.money-prefix { font-size: 1.3rem; color: var(--muted); }
.hours-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; }

.primary, .ghost, .choice, .step-btn {
  min-height: 48px; border-radius: var(--radius); font-size: 1.05rem;
  border: 2px solid transparent; cursor: pointer; padding: 10px 20px;
}
.primary { background: var(--accent); color: var(--accent-ink); font-weight: 700; }
.primary:disabled { opacity: 0.45; cursor: not-allowed; }
.ghost { background: none; color: var(--accent); text-decoration: underline; }
.choice { background: var(--card); border-color: var(--line); color: var(--ink); }
.choice.selected { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); font-weight: 700; }
.choice-row { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0; }
.stepper { display: flex; align-items: center; gap: 16px; margin: 8px 0; }
.stepper output { font-size: 1.5rem; min-width: 2ch; text-align: center; }
.step-btn { width: 48px; background: var(--card); border-color: var(--line); font-size: 1.4rem; }
.kid-age-row { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
.kid-age-row select, .confirm-row select {
  min-height: 44px; font-size: 1rem; border-radius: 10px;
  background: var(--card); color: var(--ink); border: 2px solid var(--line);
}
.nav-row { display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end; }
.error-text { color: var(--danger); font-weight: 600; }
.confirm-row { margin-top: 12px; padding: 12px; background: var(--card); border-radius: var(--radius); }

.landing .hero h1 { font-size: 1.9rem; }
.doors { display: grid; gap: 14px; margin-top: 20px; }
.door {
  display: block; padding: 20px; border-radius: var(--radius); background: var(--card);
  border: 2px solid var(--line); color: var(--ink); text-decoration: none;
}
.door-check { border-color: var(--accent); }
.door-cta { color: var(--accent); font-weight: 700; }
.landing-foot { margin-top: 28px; color: var(--muted); font-size: 0.9rem; }

.loading { text-align: center; padding-top: 15dvh; }
.spinner {
  width: 44px; height: 44px; margin: 0 auto 16px; border-radius: 50%;
  border: 4px solid var(--line); border-top-color: var(--accent);
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 3s; } }

.verdict-headline { font-size: 1.7rem; }
.verdict-cliff_ahead .verdict-headline, .verdict-in_danger_zone .verdict-headline { color: var(--danger); }
.verdict-always_up .verdict-headline, .verdict-cliff_behind .verdict-headline { color: var(--accent); }

.chart-figure { margin: 20px 0; }
.chart-title { font-weight: 700; margin-bottom: 6px; }
.curve-chart { width: 100%; height: auto; background: var(--card); border-radius: var(--radius); }
.net-line { stroke: var(--accent); stroke-width: 3; }
.danger-zone { fill: var(--danger-soft); }
.tick-line { stroke: var(--line); stroke-width: 1; }
.tick-text { font-size: 11px; fill: var(--muted); }
.axis-label { font-size: 12px; fill: var(--muted); }
.you-dot { fill: var(--ink); stroke: var(--bg); stroke-width: 2; }
.you-label { font-size: 12px; font-weight: 700; fill: var(--ink); }
.chart-legend { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 0.9rem; }
.legend-swatch { width: 14px; height: 14px; background: var(--danger-soft); border-radius: 4px; display: inline-block; }

.why-list { list-style: none; padding: 0; display: grid; gap: 10px; }
.why-item {
  display: flex; gap: 12px; padding: 12px; background: var(--card);
  border-radius: var(--radius); border: 1px solid var(--line);
}
.why-icon { font-size: 1.5rem; }
.why-lost { margin: 0; font-weight: 700; color: var(--danger); }
.why-value { margin: 2px 0 0; color: var(--muted); }

.honesty {
  margin: 24px 0; padding: 14px 16px; border-left: 5px solid var(--accent);
  background: var(--card); border-radius: 0 var(--radius) var(--radius) 0;
}
.honesty h2 { margin-top: 0; }
.honesty-model { color: var(--muted); font-size: 0.9rem; }
.places-stub { padding-top: 10dvh; text-align: center; }
.places-stub .primary { display: inline-block; margin-top: 16px; text-decoration: none; }
```

- [ ] **Step 6: Verify** — `npx vitest run app && npm run typecheck && npm run build --workspace @hotgap/app` → all pass, build emits `app/dist`.

- [ ] **Step 7: Eyeball it** — run `npx wrangler dev` in `worker/` (serves built assets + live API) or `npm run dev` in `app/` with the worker running; walk the flow with CA/94110, one kid, $15/hr. Expect a cliff verdict with chart. Screenshot for the record.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat(app): result page with curve chart, landing, places stub, styles"`

---

### Task 13: Playwright smoke tests + CI finish

**Files:**
- Create: `app/playwright.config.ts`, `app/e2e/personal-door.spec.ts`
- Modify: `.github/workflows/ci.yml`, root `package.json` (add `e2e` script)

**Interfaces:**
- Consumes: the built app (`app/dist`) served by `vite preview`; `/api/curve` intercepted in-page — e2e never hits PolicyEngine.

- [ ] **Step 1: Config** — `app/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:4173", viewport: { width: 390, height: 844 } },
  webServer: { command: "npm run preview", port: 4173, reuseExistingServer: true },
});
```

Add to root `package.json` scripts: `"e2e": "playwright test --config app/playwright.config.ts"`; add `@playwright/test` to root devDependencies.

- [ ] **Step 2: The smoke test** — `app/e2e/personal-door.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0 };
const mkPoint = (earnings: number, netIncome: number, medicaid = 0) => ({
  earnings, netIncome, programs: { ...PROGRAMS, medicaid },
});
// A 6-point curve with a $8k cliff at $30k where medicaid disappears.
const curve = {
  year: "2026",
  currentEarnings: 24960, // $12/hr × 40h
  points: [
    mkPoint(0, 20000, 8000), mkPoint(10000, 26000, 8000), mkPoint(20000, 30000, 8000),
    mkPoint(30000, 32000, 8000), mkPoint(40000, 24000, 0), mkPoint(50000, 31000, 0),
  ],
};

test("landing → flow → cliff result", async ({ page }) => {
  await page.route("**/api/curve", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(curve) }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /more pay/i })).toBeVisible();

  await page.getByRole("link", { name: /check my benefits/i }).click();
  await page.getByLabel(/where do you live/i).fill("94110");
  await expect(page.getByText(/looks like you live in california/i)).toBeVisible();
  await page.getByRole("button", { name: /next/i }).click();

  await page.getByRole("radio", { name: /just me/i }).click();
  await page.getByRole("button", { name: "more kids" }).click();
  await page.getByRole("button", { name: /next/i }).click();

  await page.getByLabel(/what do you pay to live/i).fill("1500");
  await page.getByRole("button", { name: /next/i }).click();

  await page.getByLabel(/child care/i).fill("0");
  await page.getByRole("button", { name: /next/i }).click();

  await page.getByLabel(/what do you make now/i).fill("12");
  await page.getByRole("button", { name: /see my answer/i }).click();

  await expect(page.getByRole("heading", { name: /watch out/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /chart/i })).toBeVisible();
  await expect(page.getByText(/caseworker/i)).toBeVisible();
});

test("places door shows honest stub", async ({ page }) => {
  await page.goto("/#/places");
  await expect(page.getByRole("heading", { name: /compare places/i })).toBeVisible();
  await expect(page.getByText(/not ready yet/i)).toBeVisible();
});

test("API failure shows plain-language error with retry", async ({ page }) => {
  await page.route("**/api/curve", (route) => route.fulfill({ status: 502, body: "{}" }));
  await page.goto("/#/check");
  await page.getByLabel(/where do you live/i).fill("94110");
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /next/i }).click(); // family defaults
  await page.getByRole("button", { name: /next/i }).click(); // housing "not sure"
  await page.getByLabel(/what do you make now/i).fill("12");
  await page.getByRole("button", { name: /see my answer/i }).click();
  await expect(page.getByRole("heading", { name: /could not get your answer/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
});
```

Note: with no kids, the childcare screen is skipped — the flow is 4 steps in the third test.

- [ ] **Step 3: Run locally**

```bash
npm run build --workspace @hotgap/app && npx playwright install chromium && npm run e2e
```

Expected: 3 passed. Fix selectors/labels if the real DOM differs — change the test only when the DOM is right and the selector is wrong.

- [ ] **Step 4: CI wiring** — append to `.github/workflows/ci.yml`:

```yaml
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
```

- [ ] **Step 5: Commit** — `git add -A && git commit -m "test: Playwright smoke for personal door, places stub, and error path"`

---

### Task 14: Deploy docs, final review pass

**Files:**
- Modify: `README.md` (deploy section), `docs/superpowers/specs/2026-07-11-hotgap-design.md` (status note)

- [ ] **Step 1: README deploy section** — append:

```markdown
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
```

- [ ] **Step 2: Full local gate**

```bash
npm run typecheck && npm test && npm run readability && npm run build --workspace @hotgap/app && npm run e2e
```

All green.

- [ ] **Step 3: Update spec status** — in the design doc, change open question 1 to answered ("no auth needed; verified 2026-07-11") and note the Pages→Worker-assets deviation.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "docs: develop/deploy instructions; close API-auth open question"`

- [ ] **Step 5: Use the superpowers:requesting-code-review skill** to review the branch before merge; fix findings; then merge `personal-door` into `main`.

---

## Plan self-review notes

- **Spec coverage:** personal door (Tasks 6–12), live API + proxy + cache + fallback-to-error (7, 11, 12 — full archetype fallback curves arrive with the batch pipeline in Plan 2, as the spec's fallback data comes from that pipeline), places door stub with honest copy (12), readability gate (8), contract test (2), Playwright (13), AGPL (1), privacy (7: no body logging; 12: no analytics). Places door proper, batch pipeline, and county layers = **Plan 2**.
- **Type consistency check:** `HouseholdAnswers`/`CurvePoint`/`CurveResponse` defined once in Task 3, consumed by name in 4, 6, 7, 11, 12. `parsePEResponse(body, 101)` matches `AXIS_COUNT = 101`. `narrate` params match the four `result.verdict.*` string pairs in Task 8's catalog.
- **Known simplifications (deliberate):** adults are age 30; no immigrant-status or disability questions; hourly default 40 h/week; ZIP3 majority mapping with manual state-correction dropdown as the safety valve.
