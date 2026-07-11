# HotGap County-Level Personal Door Implementation Plan (Plan 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Derive `county_fips` from the ZIP the user already enters and pass it to the live PolicyEngine API so ACA rating-area premiums (and housing FMR when the housing toggle is on) reflect where they live. Personal door only; the map and all committed data are untouched.

**Architecture:** A lazy-loaded ZIP→county lookup (`app/public/data/zip5-county.json`, 33,791 ZCTAs, already committed) is fetched once on app mount and cached in-module; a synchronous `zipToCounty(zip)` reads that cache. The flow derives `countyFips` from the ZIP alongside `state`; it threads through `HouseholdAnswers` → `buildPEPayload`, which adds `county_fips` to the household **only when non-null** (so a null county produces today's exact state-only payload — fully backward-compatible and the graceful-degradation path if the table hasn't loaded yet).

**Tech Stack:** TS strict, React, PolicyEngine `/us/calculate`, vitest, Playwright.

## Global Constraints

- AGPL-3.0; TS strict; Node ≥ 22.
- Copy via `app/src/strings/en.json` + readability gate (`npm run readability`, corpus ≤ 5.9, per-string ≤ 8.0, **never raise**).
- Show-explain-never-advise; no input logging; 44px/WCAG AA; conventional commits.
- Branch `county`.
- **No map/data regeneration; `answersFor` (archetypes) must NOT set countyFips (stays null → map unchanged).**

## Verified ground truth (probed live 2026-07-11)

- `county_fips` [household, string] accepted by the API; it changes ACA premium/net (CA worst-cliff $7,421 LA vs $10,397 SF).
- Crosswalk already built (`app/public/data/zip5-county.json`, committed): 94110→06075 (SF), 90012→06037 (LA), 10001→36061, 77002→48201 — verified.

## File Structure

```
app/src/lib/county.ts        zipToCounty(zip) sync from cache + ensureCountyTable() memoized fetch
app/src/lib/county.test.ts
shared/src/types.ts          HouseholdAnswers gains countyFips: string | null
worker/src/validate.ts       accept countyFips (optional, /^\d{5}$/ else null)
worker/src/translate.ts      add county_fips to household when non-null
app/src/flow/state.ts        FlowAnswers.countyFips; setZip derives it; toHouseholdAnswers maps it
app/src/App.tsx              ensureCountyTable() on mount (fire-and-forget)
app/src/result/ResultPage.tsx  render the county note when countyFips present
app/src/strings/en.json      result.county.note
contract/policyengine.contract.test.ts  county changes ACA premium; null-county still ok
```

---

### Task 1: `county.ts` lookup + lazy loader

**Files:** Create `app/src/lib/county.ts`, `app/src/lib/county.test.ts`.

**Interfaces:**
- Produces: `zipToCounty(zip: string): string | null` (5-digit ZIP → county FIPS from the module cache; null if malformed/unknown/not-yet-loaded); `ensureCountyTable(fetchImpl?: typeof fetch): Promise<void>` (memoized — fetches `/data/zip5-county.json` once, populates the cache; safe to call repeatedly).

- [ ] **Step 1: Write failing tests** — `app/src/lib/county.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { zipToCounty, ensureCountyTable, __resetCountyTableForTests } from "./county.js";

const TABLE = { "94110": "06075", "90012": "06037", "10001": "36061" };

beforeEach(() => __resetCountyTableForTests());

describe("zipToCounty", () => {
  it("returns null before the table is loaded", () => {
    expect(zipToCounty("94110")).toBeNull();
  });
  it("resolves a known ZIP to its county after load", async () => {
    await ensureCountyTable((async () => new Response(JSON.stringify(TABLE))) as unknown as typeof fetch);
    expect(zipToCounty("94110")).toBe("06075");
    expect(zipToCounty("90012")).toBe("06037");
  });
  it("returns null for malformed or unknown ZIPs after load", async () => {
    await ensureCountyTable((async () => new Response(JSON.stringify(TABLE))) as unknown as typeof fetch);
    expect(zipToCounty("1234")).toBeNull();
    expect(zipToCounty("abcde")).toBeNull();
    expect(zipToCounty("00000")).toBeNull();
  });
  it("only fetches once across repeated ensureCountyTable calls", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(TABLE))) as unknown as typeof fetch;
    await ensureCountyTable(f);
    await ensureCountyTable(f);
    expect((f as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(1);
  });
  it("swallows a fetch failure (county stays null, never throws)", async () => {
    await ensureCountyTable((async () => { throw new Error("offline"); }) as unknown as typeof fetch);
    expect(zipToCounty("94110")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run app/src/lib/county.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — `app/src/lib/county.ts`:

```ts
// ZIP -> county FIPS, from a lazily-fetched crosswalk. County sharpens the
// live ACA rating-area premium; it is a progressive enhancement — until the
// table loads (or if the fetch fails) zipToCounty returns null and the caller
// falls back to state-only, which is identical to the pre-county behavior.
let table: Record<string, string> | null = null;
let inflight: Promise<void> | null = null;

export function zipToCounty(zip: string): string | null {
  if (!table || !/^\d{5}$/.test(zip)) return null;
  return table[zip] ?? null;
}

export function ensureCountyTable(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (table) return Promise.resolve();
  if (inflight) return inflight;
  inflight = fetchImpl("/data/zip5-county.json")
    .then((r) => (r.ok ? r.json() : {}))
    .then((json) => { table = json as Record<string, string>; })
    .catch(() => { table = {}; }); // fail closed: county unavailable, never throw
  return inflight;
}

export function __resetCountyTableForTests(): void {
  table = null;
  inflight = null;
}
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run app/src/lib/county.test.ts` → PASS. `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(app): lazy ZIP-to-county lookup with state-only fallback"`

---

### Task 2: `countyFips` on HouseholdAnswers + worker

**Files:** Modify `shared/src/types.ts`, `worker/src/validate.ts`, `worker/src/translate.ts`; Test `worker/src/validate.test.ts`, `worker/src/translate.test.ts`.

**Interfaces:**
- Produces: `HouseholdAnswers.countyFips: string | null`. `validateAnswers` accepts it (a 5-digit string passes; anything else → null). `buildPEPayload` adds `county_fips: y(a.countyFips)` to the household object **only when `a.countyFips` is non-null**; when null the household object is byte-identical to today's.

- [ ] **Step 1: Write failing tests**

`worker/src/validate.test.ts`:
```ts
it("accepts a 5-digit countyFips and defaults it to null when absent or malformed", () => {
  const good = { state: "CA", married: false, childAges: [], childDisabled: [], monthlyRent: null, monthlyChildcare: null, annualEarnings: 30000, spouseAnnualEarnings: 0, age: 30, spouseAge: null, youDisabled: false, spouseDisabled: false };
  const a = validateAnswers({ ...good, countyFips: "06075" });
  expect(a.ok).toBe(true); if (a.ok) expect(a.value.countyFips).toBe("06075");
  const b = validateAnswers({ ...good, countyFips: "6075" });
  if (b.ok) expect(b.value.countyFips).toBeNull();
  const c = validateAnswers(good);
  if (c.ok) expect(c.value.countyFips).toBeNull();
});
```

`worker/src/translate.test.ts` (base gains `countyFips: null`):
```ts
it("adds county_fips to the household only when countyFips is set", () => {
  const withCounty = buildPEPayload({ ...base, countyFips: "06075" }) as any;
  expect(withCounty.household.households.household.county_fips["2026"]).toBe("06075");
  const without = buildPEPayload({ ...base, countyFips: null }) as any;
  expect(without.household.households.household.county_fips).toBeUndefined();
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run worker` → FAIL.

- [ ] **Step 3: Implement**
- `shared/src/types.ts`: add `countyFips: string | null;` to `HouseholdAnswers`.
- `worker/src/validate.ts`: in the returned value, add `countyFips: typeof a.countyFips === "string" && /^\d{5}$/.test(a.countyFips) ? a.countyFips : null,`.
- `worker/src/translate.ts`: after building the `household` object (the entry under `households: { household: {...} }`), conditionally add the key. Since the household literal is inline, add to it: build `const householdVars = { members, state_name: y(a.state), household_net_income: y(null) };` then `if (a.countyFips) householdVars.county_fips = y(a.countyFips);` and use `households: { household: householdVars }`. (Match the existing structure; `y()` already accepts strings.)

- [ ] **Step 4: Run to verify pass** — `npx vitest run worker` → PASS. `npm run typecheck` (cascades red in archetypes/state/client until Task 3 — expected; note it).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(worker): pass county_fips to the API when known"`

---

### Task 3: Flow derives county + eager table load + note

**Files:** Modify `shared/src/archetypes.ts` (answersFor: countyFips null), `app/src/flow/state.ts`, `app/src/App.tsx`, `app/src/result/ResultPage.tsx`, `app/src/strings/en.json`; Test `app/src/flow/state.test.ts`, `shared/src/archetypes.test.ts`.

**Interfaces:**
- Consumes: `zipToCounty` (Task 1), `HouseholdAnswers.countyFips` (Task 2).
- Produces: `FlowAnswers.countyFips: string | null` (init null); `setZip` sets both `state = zipToState(zip)` and `countyFips = zipToCounty(zip)`; `toHouseholdAnswers` maps `countyFips`. `answersFor` returns `countyFips: null`. App calls `ensureCountyTable()` on mount. Result renders `result.county.note` when `countyFips` present.

- [ ] **Step 1: Write failing tests**

`shared/src/archetypes.test.ts`:
```ts
it("map archetypes have no county (state-level map unchanged)", () => {
  expect(answersFor("CA", ARCHETYPES.find((x) => x.id === "single-2")!).countyFips).toBeNull();
});
```
`app/src/flow/state.test.ts`:
```ts
it("derives countyFips from the ZIP alongside state", async () => {
  const { ensureCountyTable } = await import("../lib/county.js");
  await ensureCountyTable((async () => new Response(JSON.stringify({ "94110": "06075" }))) as unknown as typeof fetch);
  const s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
  expect(s.answers.state).toBe("CA");
  expect(s.answers.countyFips).toBe("06075");
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run shared app/src/flow/state.test.ts` → FAIL.

- [ ] **Step 3: Implement**
- `shared/src/archetypes.ts` `answersFor` returned object: add `countyFips: null,`.
- `app/src/flow/state.ts`: `FlowAnswers` gains `countyFips: string | null` (init `null`); import `zipToCounty`; `setZip` case → `{ ...s, answers: { ...a, zip: action.zip, state: zipToState(action.zip), countyFips: zipToCounty(action.zip) } }`; `toHouseholdAnswers` adds `countyFips: a.countyFips`.
- `app/src/App.tsx`: `useEffect(() => { ensureCountyTable(); }, []);` (import from lib/county) — fire-and-forget so the table is usually ready before the user finishes.
- `app/src/result/ResultPage.tsx`: when `current.countyFips` is non-null, render `<p className="county-note">{t("result.county.note")}</p>` near the honesty area.
- `en.json`: `"result.county.note": "Numbers use your county where we can."` (gate-check).

- [ ] **Step 4: Run to verify pass** — `npx vitest run shared app`, `npm run typecheck` (clean now), `npm run readability` → all green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(app): derive county from ZIP, load crosswalk on mount, show county note"`

---

### Task 4: Contract test + e2e + docs

**Files:** Modify `contract/policyengine.contract.test.ts`, `app/e2e/personal-door.spec.ts`, `docs/superpowers/specs/2026-07-11-hotgap-design.md`, `README.md`.

- [ ] **Step 1: Contract test** — add (inside the RUN-gated describe): the same minimal household with `county_fips: "06075"` (SF) vs `"06037"` (LA) in CA yields different `premium_tax_credit` (or household_net_income); and a payload with no county_fips still returns `status: ok`. Run `RUN_CONTRACT=1 npx vitest run contract` → pass live; skip path skips.

- [ ] **Step 2: e2e** — the flow already enters a ZIP; the county table is fetched on mount. In `personal-door.spec.ts`, intercept `**/data/zip5-county.json` with a small `{ "94110": "06075" }` fixture so the run is deterministic, walk the existing flow with 94110, and assert the county note ("your county") appears on the result. Keep existing assertions green.

- [ ] **Step 3: Docs** — main spec: note the personal door now uses county (derived from ZIP) for ACA rating-area accuracy; map stays state-level. README already has the crosswalk attribution (Task 0). Add a line to `docs/post-merge-notes.md` if any deferral arises.

- [ ] **Step 4: Gates** — `npm test`, `npm run typecheck`, `npm run readability`, `npm run build --workspace @hotgap/app`, `npm run e2e` all green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "test+docs: county contract + e2e; document county-level personal door"`

---

### Task 5: Final review + merge

Whole-branch review (most capable model): verify county is null-safe end-to-end (never throws, state-only fallback intact); the payload is byte-identical to pre-county when countyFips is null (backward-compat); the map/data are untouched; no advice copy; no logging. Fix Critical/Important; merge `county` to main.

## Self-review notes
- **Spec coverage:** crosswalk (Task 0, done), lookup+lazy load (Task 1), answers threading (Tasks 2-3), note copy (Task 3), contract+e2e+docs (Task 4). Map untouched (archetypes countyFips null, Task 3).
- **Type consistency:** `countyFips: string | null` identical across types/validate/translate/archetypes/state.
- **Known deliberate choices:** county is a progressive enhancement (null when table unloaded → state-only, backward-compat); crosswalk is ZCTA-by-land-area (documented approximation); no direct county question (derived from ZIP).
