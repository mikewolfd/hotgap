# HotGap Model Honesty Implementation Plan (Plan 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let people tell the tool which rationed programs they actually receive (Head Start, housing voucher, employer health coverage) via honest-default questions + live result-page toggles; fix the verified health-fold correctness bugs; and regenerate the map with an honest (rationed-off) baseline.

**Architecture:** Take-up is modeled by **overriding a program's dollar value to 0** in the PolicyEngine household JSON (verified: `head_start: 0` drops net income by the full Head Start value; enrollment flags do NOT work). Employer coverage uses real inputs (`has_esi` + `offered_aca_disqualifying_esi` + a premium). New answers thread `HouseholdAnswers` → `buildPEPayload`; the result page re-calls `/api/curve` live when a toggle flips. Correctness fixes live in the single `parse.ts` fold. The archetype builder sets rationed-off defaults so the map regenerates honestly.

**Tech Stack:** TypeScript (strict), React, the existing shared/worker/app/pipeline workspaces, PolicyEngine `/us/calculate` API, vitest, Playwright.

**CCDF childcare subsidy is DESCOPED** (spike failed — PolicyEngine returns null household-side; see spec §2). County is **Plan 7**.

## Global Constraints

- AGPL-3.0-only; TypeScript `strict`; Node ≥ 22.
- All user-facing copy in `app/src/strings/en.json`; readability gate (`npm run readability`) — corpus FK ≤ 5.9, per-string ≤ 8.0, **never raise the limits**.
- Show-explain-**never-advise** (no "you should"); numbers in $/hour, $/month, $/year.
- Household inputs never logged; no analytics.
- Simulation year 2026 (`YEAR` from `@hotgap/shared`).
- Conventional commits; work on branch `model-honesty`.
- Take-up default = **off** for rationed programs (honest baseline); employer coverage default = **off**.
- The two doors must agree on identical inputs: the archetype builder and the personal-door flow default the take-up fields the same way.

## Verified mechanism (probed live 2026-07-11 — do not re-litigate)

- **Head Start off:** person input `head_start: {"2026": 0}` → net income $55,258 → $32,972 (−$22,286). On = omit the override (PolicyEngine computes it).
- **Housing off:** spm_unit input `spm_unit_capped_housing_subsidy: {"2026": 0}`. Accepted; effect only when the family has rent + is eligible.
- **Employer coverage on:** person inputs `has_esi: true`, `offered_aca_disqualifying_esi: true`, `employer_sponsored_insurance_premiums: <$>` → PTC drops to $0, MOOP becomes the ESI premium (fixes the manufactured 400%-FPL cliff). Off = omit.
- **PTC double-count:** `household_net_income` includes the PTC (in refundable credits); MOOP is premium *net* of PTC. Current `netIncome = rawNet − MOOP` counts the subsidy twice. Fix: `netIncome = rawNet − acaPTC − MOOP`, reusing the already-parsed `aca` program series (which IS `premium_tax_credit`).
- **ESI premium default:** national-average employee share ≈ $1,700/yr single, $6,500/yr family — use `hasSpouse || childAges.length ? 6500 : 1700` (document as an estimate).

## File Structure

```
shared/src/types.ts        HouseholdAnswers gains 4 take-up booleans; medicalOOP doc
shared/src/parse.ts        PTC subtraction in the fold (correctness fix)
worker/src/translate.ts    map take-up booleans → value overrides / ESI inputs
worker/src/validate.ts     accept + default the 4 new booleans
shared/src/archetypes.ts   answersFor sets rationed-off defaults (honest map baseline)
app/src/flow/state.ts      FlowAnswers gains take-up; a "gets" screen; toHouseholdAnswers
app/src/flow/screens.tsx   new GetsScreen (yes/no chips)
app/src/result/Toggles.tsx NEW — result-page toggle chips, live recompute
app/src/result/ResultPage.tsx  host the toggles; re-fetch on change
app/src/strings/en.json    new copy (questions, toggles, relabels, honesty)
contract/policyengine.contract.test.ts  pin head_start:0 override + ESI behavior
```

---

### Task 1: `HouseholdAnswers` take-up fields + validation

**Files:**
- Modify: `shared/src/types.ts` (HouseholdAnswers)
- Modify: `worker/src/validate.ts`
- Test: `worker/src/validate.test.ts`

**Interfaces:**
- Produces: `HouseholdAnswers` gains `getsHeadStart: boolean`, `getsHousing: boolean`, `hasEmployerCoverage: boolean`. (No childcare subsidy field — CCDF descoped.) `validateAnswers` accepts them and **defaults each to `false`** when absent (old clients / honest baseline).

- [ ] **Step 1: Write the failing test** — add to `worker/src/validate.test.ts`:

```ts
it("accepts take-up booleans and defaults them to false when absent", () => {
  const r = validateAnswers({
    state: "CA", married: false, childAges: [3], childDisabled: [false],
    monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000,
    spouseAnnualEarnings: 0, age: 30, spouseAge: null, youDisabled: false,
    spouseDisabled: false,
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.getsHeadStart).toBe(false);
    expect(r.value.getsHousing).toBe(false);
    expect(r.value.hasEmployerCoverage).toBe(false);
  }
});

it("preserves take-up booleans when provided", () => {
  const r = validateAnswers({
    state: "CA", married: true, childAges: [], childDisabled: [],
    monthlyRent: null, monthlyChildcare: null, annualEarnings: 40000,
    spouseAnnualEarnings: 20000, age: 30, spouseAge: 30, youDisabled: false,
    spouseDisabled: false, getsHeadStart: true, getsHousing: true, hasEmployerCoverage: true,
  });
  if (r.ok) {
    expect(r.value.getsHeadStart).toBe(true);
    expect(r.value.getsHousing).toBe(true);
    expect(r.value.hasEmployerCoverage).toBe(true);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run worker/src/validate.test.ts`
Expected: FAIL (`getsHeadStart` missing on the validated value / type error).

- [ ] **Step 3: Implement** — in `shared/src/types.ts`, add to the `HouseholdAnswers` interface (after `spouseDisabled`):

```ts
  getsHeadStart: boolean;
  getsHousing: boolean;
  hasEmployerCoverage: boolean;
```

In `worker/src/validate.ts`, inside `validateAnswers`, after the existing boolean checks, add coercion in the returned value object:

```ts
      getsHeadStart: a.getsHeadStart === true,
      getsHousing: a.getsHousing === true,
      hasEmployerCoverage: a.hasEmployerCoverage === true,
```

(`=== true` makes absent/non-boolean default to `false`.)

- [ ] **Step 4: Run to verify pass** — `npx vitest run worker/src/validate.test.ts` → PASS. Then `npm run typecheck` (will fail elsewhere until Task 2/3 update translate + archetypes + toHouseholdAnswers — that is expected; note it and proceed; the suite goes green at Task 5).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(shared): household take-up fields (head start, housing, employer coverage)"`

---

### Task 2: `buildPEPayload` — value overrides + ESI inputs

**Files:**
- Modify: `worker/src/translate.ts`
- Test: `worker/src/translate.test.ts`

**Interfaces:**
- Consumes: `HouseholdAnswers` with the 3 take-up booleans (Task 1).
- Produces: `buildPEPayload` emits `head_start: {2026:0}` on each child when `!getsHeadStart`; `spm_unit_capped_housing_subsidy: {2026:0}` when `!getsHousing`; adult ESI inputs when `hasEmployerCoverage`. When a flag is "on"/false-negated the override is **omitted** (PolicyEngine computes).

- [ ] **Step 1: Write failing tests** — add to `worker/src/translate.test.ts` (base answers gain the 3 fields = false):

```ts
const base: HouseholdAnswers = {
  state: "CA", married: false, childAges: [5], childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000,
  spouseAnnualEarnings: 0, age: 30, spouseAge: null, youDisabled: false,
  spouseDisabled: false, getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
};

it("forces head_start to 0 on each child when the family does not get Head Start", () => {
  const p = buildPEPayload(base) as any;
  expect(p.household.people.child1.head_start["2026"]).toBe(0);
});

it("omits the head_start override when the family gets Head Start", () => {
  const p = buildPEPayload({ ...base, getsHeadStart: true }) as any;
  expect(p.household.people.child1.head_start).toBeUndefined();
});

it("forces housing subsidy to 0 when the family does not get housing help", () => {
  const p = buildPEPayload(base) as any;
  expect(p.household.spm_units.spm_unit.spm_unit_capped_housing_subsidy["2026"]).toBe(0);
});

it("omits the housing override when the family gets housing help", () => {
  const p = buildPEPayload({ ...base, getsHousing: true }) as any;
  // still requested as an output (null), but not forced to 0
  expect(p.household.spm_units.spm_unit.spm_unit_capped_housing_subsidy["2026"]).toBeNull();
});

it("adds employer-coverage inputs on the adult when hasEmployerCoverage", () => {
  const p = buildPEPayload({ ...base, hasEmployerCoverage: true }) as any;
  expect(p.household.people.you.has_esi["2026"]).toBe(true);
  expect(p.household.people.you.offered_aca_disqualifying_esi["2026"]).toBe(true);
  expect(p.household.people.you.employer_sponsored_insurance_premiums["2026"]).toBe(1700);
});

it("uses the family ESI premium when there are kids or a spouse", () => {
  const p = buildPEPayload({ ...base, hasEmployerCoverage: true, childAges: [5] }) as any;
  expect(p.household.people.you.employer_sponsored_insurance_premiums["2026"]).toBe(6500);
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run worker/src/translate.test.ts` → FAIL.

- [ ] **Step 3: Implement** — in `worker/src/translate.ts`:

The child construction currently is:
```ts
  a.childAges.forEach((age, i) => {
    people[`child${i + 1}`] = { age: y(age), medicaid: y(null), chip: y(null), head_start: y(null), early_head_start: y(null) };
  });
```
Change the head-start entries to force 0 when `!getsHeadStart`:
```ts
  const hsValue = a.getsHeadStart ? null : 0;
  a.childAges.forEach((age, i) => {
    const child: Vars = { age: y(age), medicaid: y(null), chip: y(null), early_head_start: y(hsValue) };
    child.head_start = y(hsValue);
    people[`child${i + 1}`] = child;
  });
```
(When `getsHeadStart` is true, `hsValue` is null → requested as output; when false, 0 → forced off. Apply to both `head_start` and `early_head_start`.)

For housing — the spm vars currently include `spm_unit_capped_housing_subsidy` requested as null via `SPM_VARS`. Override it after building `spmVars`:
```ts
  if (!a.getsHousing) spmVars.spm_unit_capped_housing_subsidy = y(0);
```

For employer coverage — after building `you`, before assembling `people`:
```ts
  if (a.hasEmployerCoverage) {
    const esiPremium = a.married || a.childAges.length > 0 ? 6500 : 1700;
    you.has_esi = y(true);
    you.offered_aca_disqualifying_esi = y(true);
    you.employer_sponsored_insurance_premiums = y(esiPremium);
  }
```
(`Vars` values are `Record<string,...>`; `y(true)` needs the `y` helper to accept booleans — widen its type to `number | string | boolean | null` if needed and update the `Vars` type accordingly.)

- [ ] **Step 4: Run to verify pass** — `npx vitest run worker/src/translate.test.ts` → PASS.

- [ ] **Step 5: Live sanity (one-off, do not commit)** — POST `buildPEPayload(base)` and `buildPEPayload({...base, getsHeadStart:true})` to the API; confirm the first has head_start 0 across the sweep and the second has the Head Start cliff. Confirm `hasEmployerCoverage:true` yields PTC 0.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(worker): take-up value overrides + employer-coverage inputs"`

---

### Task 3: PTC double-count fix + MOOP relabel (correctness)

**Files:**
- Modify: `shared/src/parse.ts`
- Modify: `shared/src/types.ts` (medicalOOP doc comment)
- Test: `shared/src/parse.test.ts`

**Interfaces:**
- Consumes: the parsed `aca` program series (already summed in `parse.ts` via `TAX_PROGRAMS.premium_tax_credit → "aca"`).
- Produces: `netIncome = rawNet − acaPTC[i] − moop[i]`. `medicalOOP` unchanged in value; only its doc/label change (premiums, not deductibles).

- [ ] **Step 1: Write the failing test** — the CA fixture's net values change. First compute the new expected values (controller provides): with the PTC subtraction, `parsePEResponse(fixture,101)[30].netIncome` becomes the current value minus the PTC at index 30. Add to `shared/src/parse.test.ts`:

```ts
it("subtracts the ACA premium tax credit as well as MOOP (no double-count)", () => {
  const pts = parsePEResponse(fixture, 101);
  // At an income with a nonzero PTC, netIncome must be rawNet − PTC − MOOP.
  // Reconstruct rawNet from the fixture and assert the identity holds.
  const raw = fixture.result.households["your household"].household_net_income["2026"];
  const moop = fixture.result.spm_units["your spm_unit"].spm_unit_medical_out_of_pocket_expenses["2026"];
  const ptc = fixture.result.tax_units["your tax unit"].premium_tax_credit["2026"];
  const i = 50;
  expect(pts[i].netIncome).toBeCloseTo(raw[i] - ptc[i] - moop[i], 2);
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run shared/src/parse.test.ts` → FAIL (current netIncome = raw − moop, missing − ptc).

- [ ] **Step 3: Implement** — in `shared/src/parse.ts`, the fold currently is `const net = rawNet.map((n, i) => n - moop[i]);`. It needs the PTC series. The `aca` program IS `premium_tax_credit` (from `TAX_PROGRAMS`). Read it directly from the tax entity alongside MOOP:

```ts
  const moop = series(spm, "spm_unit_medical_out_of_pocket_expenses", expectedCount);
  const acaPtc = series(tax, "premium_tax_credit", expectedCount);
  const net = rawNet.map((n, i) => n - acaPtc[i] - moop[i]);
```

Update the `netIncome` doc in `types.ts` and the `medicalOOP` comment: medicalOOP is **health-insurance premiums** (net of subsidy), not deductibles/copays.

- [ ] **Step 4: Run to verify pass** — `npx vitest run shared/src/parse.test.ts` → PASS (after the controller regenerates the fixture in Task 6, all other pinned parse values update; this identity test is regen-independent).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "fix(shared): stop double-counting the ACA PTC in the health fold; relabel MOOP as premiums"`

---

### Task 4: Honest map baseline (archetypes) + flow mapping

**Files:**
- Modify: `shared/src/archetypes.ts` (`answersFor`)
- Modify: `app/src/flow/state.ts` (FlowAnswers + toHouseholdAnswers + a GetsScreen in the screen order)
- Modify: `app/src/flow/screens.tsx` (GetsScreen)
- Test: `app/src/flow/state.test.ts`, `shared/src/archetypes.test.ts`

**Interfaces:**
- Consumes: `HouseholdAnswers` take-up fields (Task 1).
- Produces: `answersFor` returns the 3 take-up fields = `false` (honest map baseline). `FlowAnswers` gains `getsHeadStart`/`getsHousing`/`hasEmployerCoverage` (default false); a `"gets"` screen appears after `childcare` (or after `pay` if no relevant program applies — keep it after childcare, before pay is fine too; choose after childcare). `toHouseholdAnswers` maps them through.

- [ ] **Step 1: Write failing tests**

`shared/src/archetypes.test.ts`:
```ts
it("defaults the map archetypes to NOT receiving rationed programs (honest baseline)", () => {
  const a = answersFor("CA", ARCHETYPES.find((x) => x.id === "single-2")!);
  expect(a.getsHeadStart).toBe(false);
  expect(a.getsHousing).toBe(false);
  expect(a.hasEmployerCoverage).toBe(false);
});
```

`app/src/flow/state.test.ts`:
```ts
it("carries take-up answers into HouseholdAnswers, default false", () => {
  const s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
  const h = toHouseholdAnswers(s.answers);
  expect(h.getsHeadStart).toBe(false);
  expect(h.getsHousing).toBe(false);
  expect(h.hasEmployerCoverage).toBe(false);
});

it("setGets updates a take-up flag", () => {
  let s = flowReducer(initialFlowState, { type: "setGets", key: "getsHousing", value: true });
  expect(s.answers.getsHousing).toBe(true);
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run shared/src/archetypes.test.ts app/src/flow/state.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`shared/src/archetypes.ts` — in `answersFor`'s returned object, add:
```ts
    getsHeadStart: false,
    getsHousing: false,
    hasEmployerCoverage: false,
```

`app/src/flow/state.ts`:
- `FlowAnswers` gains `getsHeadStart: boolean; getsHousing: boolean; hasEmployerCoverage: boolean;` (init all `false` in `initialFlowState.answers`).
- Add action `{ type: "setGets"; key: "getsHeadStart" | "getsHousing" | "hasEmployerCoverage"; value: boolean }` and a reducer case: `return { ...s, answers: { ...a, [action.key]: action.value } };`
- `visibleScreens`: insert `"gets"` after `"childcare"` position (before `"pay"`).
- `ScreenId` union gains `"gets"`.
- `toHouseholdAnswers`: add `getsHeadStart: a.getsHeadStart, getsHousing: a.getsHousing, hasEmployerCoverage: a.hasEmployerCoverage`.
- `canAdvance` for `"gets"` → always `true` (all optional, default no).

`app/src/flow/screens.tsx` — new `GetsScreen`:
```tsx
export function GetsScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const hasYoungKid = answers.childAges.some((a) => a < 6);
  const rows: { key: "getsHeadStart" | "getsHousing" | "hasEmployerCoverage"; label: string; show: boolean }[] = [
    { key: "getsHeadStart", label: t("flow.gets.headstart"), show: hasYoungKid },
    { key: "getsHousing", label: t("flow.gets.housing"), show: true },
    { key: "hasEmployerCoverage", label: t("flow.gets.esi"), show: true },
  ];
  return (
    <>
      <h1>{t("flow.gets.q")}</h1>
      <p className="hint">{t("flow.gets.hint")}</p>
      {rows.filter((r) => r.show).map((r) => (
        <div key={r.key} className="gets-row">
          <span>{r.label}</span>
          <div className="choice-row">
            <button type="button" className={answers[r.key] ? "choice selected" : "choice"}
              onClick={() => dispatch({ type: "setGets", key: r.key, value: true })}>{t("common.yes")}</button>
            <button type="button" className={answers[r.key] ? "choice" : "choice selected"}
              onClick={() => dispatch({ type: "setGets", key: r.key, value: false })}>{t("common.no")}</button>
          </div>
        </div>
      ))}
    </>
  );
}
```
Wire `GetsScreen` into `Flow.tsx`'s screen map under `gets`.

New `en.json` strings (gate-checked; keep ≤ 8.0 each):
```
"flow.gets.q": "Which of these do you get now?",
"flow.gets.hint": "Most families do not get these. Say yes only if you do.",
"flow.gets.headstart": "Head Start for a child",
"flow.gets.housing": "A housing voucher or housing help",
"flow.gets.esi": "Health insurance through a job",
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run shared/src/archetypes.test.ts app/src/flow/state.test.ts` → PASS; `npm run readability` → OK.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(app): honest take-up baseline + 'which do you get' flow screen"`

---

### Task 5: Result-page toggles with live recompute

**Files:**
- Create: `app/src/result/Toggles.tsx`
- Modify: `app/src/result/ResultPage.tsx`
- Modify: `app/src/strings/en.json`
- Test: `app/src/result/Toggles.test.tsx`

**Interfaces:**
- Consumes: `HouseholdAnswers` (the current answers), an `onChange(next: HouseholdAnswers)` callback.
- Produces: `<Toggles answers ctx onChange />` renders chips for Head Start (only if a young child), housing, employer coverage; flipping one calls `onChange` with an updated `HouseholdAnswers`; `ResultPage` re-runs `fetchCurve` on the new answers (its existing effect already keys on `answers`).

- [ ] **Step 1: Write the failing test** — `app/src/result/Toggles.test.tsx` (jsdom):

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Toggles } from "./Toggles.js";
import type { HouseholdAnswers } from "@hotgap/shared";

const answers: HouseholdAnswers = {
  state: "CA", married: false, childAges: [3], childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000,
  spouseAnnualEarnings: 0, age: 30, spouseAge: null, youDisabled: false,
  spouseDisabled: false, getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
};

describe("Toggles", () => {
  it("flipping housing emits updated answers", () => {
    const onChange = vi.fn();
    const { getByRole } = render(<Toggles answers={answers} onChange={onChange} />);
    fireEvent.click(getByRole("switch", { name: /housing/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ getsHousing: true }));
  });
  it("hides the Head Start toggle when there is no young child", () => {
    const { queryByRole } = render(<Toggles answers={{ ...answers, childAges: [10], childDisabled: [false] }} onChange={() => {}} />);
    expect(queryByRole("switch", { name: /head start/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run app/src/result/Toggles.test.tsx` → FAIL.

- [ ] **Step 3: Implement** — `app/src/result/Toggles.tsx`:

```tsx
import type { HouseholdAnswers } from "@hotgap/shared";
import { t } from "../strings/t.js";

type Key = "getsHeadStart" | "getsHousing" | "hasEmployerCoverage";

export function Toggles({ answers, onChange }: { answers: HouseholdAnswers; onChange: (next: HouseholdAnswers) => void }) {
  const rows: { key: Key; label: string; show: boolean }[] = [
    { key: "getsHeadStart", label: t("toggles.headstart"), show: answers.childAges.some((a) => a < 6) },
    { key: "getsHousing", label: t("toggles.housing"), show: true },
    { key: "hasEmployerCoverage", label: t("toggles.esi"), show: true },
  ];
  const visible = rows.filter((r) => r.show);
  if (visible.length === 0) return null;
  return (
    <section className="toggles">
      <h2>{t("toggles.title")}</h2>
      <p className="hint">{t("toggles.hint")}</p>
      {visible.map((r) => (
        <button
          key={r.key}
          type="button"
          role="switch"
          aria-checked={answers[r.key]}
          aria-label={r.label}
          className={answers[r.key] ? "toggle on" : "toggle"}
          onClick={() => onChange({ ...answers, [r.key]: !answers[r.key] })}
        >
          <span className="toggle-label">{r.label}</span>
          <span className="toggle-state">{answers[r.key] ? t("common.yes") : t("common.no")}</span>
        </button>
      ))}
    </section>
  );
}
```

`en.json` (gate-checked):
```
"toggles.title": "What if you get more help?",
"toggles.hint": "Turn these on or off to see how your cliffs move.",
"toggles.headstart": "Head Start for a child",
"toggles.housing": "A housing voucher",
"toggles.esi": "Health insurance through a job",
```

`ResultPage.tsx` — hold the current answers in state (seeded from props), render `<Toggles answers={current} onChange={setCurrent} />`, and pass `current` to the existing `fetchCurve` effect so a flip re-fetches. Add a modest CSS block in `styles.css` for `.toggles`/`.toggle` (44px targets, on-state uses the accent).

- [ ] **Step 4: Run to verify pass** — `npx vitest run app/src/result/Toggles.test.tsx` → PASS; `npm run typecheck`; `npm run readability` → OK. Full suite: `npm test` (the still-failing fixture-pinned tests get fixed in Task 6).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(app): live result-page take-up toggles"`

---

### Task 6: Non-expansion honesty copy + contract test

**Files:**
- Modify: `app/src/strings/en.json` (`result.honesty.health`)
- Modify: `contract/policyengine.contract.test.ts`

- [ ] **Step 1: Fix the non-expansion falsehood** — change `result.honesty.health` from the universalizing claim to:

```
"result.honesty.health": "In many states, losing Medicaid means moving to other coverage you help pay for. In some states there is no low-cost plan.",
```
Run `npm run readability` → must pass; tune wording if a string exceeds 8.0.

- [ ] **Step 2: Extend the contract test** — add a case asserting the head_start override and ESI behavior are live-stable. In `contract/policyengine.contract.test.ts`, inside the `RUN`-gated describe:

```ts
it("head_start:0 override removes Head Start; ESI inputs zero the PTC", async () => {
  const withHS = { household: { people: { you: { age: { "2026": 30 }, employment_income: { "2026": 20000 } }, kid: { age: { "2026": 5 }, head_start: { "2026": null } } }, families: { f: { members: ["you", "kid"] } }, marital_units: { m: { members: ["you"] } }, tax_units: { t: { members: ["you", "kid"] } }, spm_units: { s: { members: ["you", "kid"] } }, households: { h: { members: ["you", "kid"], state_name: { "2026": "CA" }, household_net_income: { "2026": null } } } } };
  const off = JSON.parse(JSON.stringify(withHS));
  off.household.people.kid.head_start = { "2026": 0 };
  const call = async (body: unknown) => {
    const res = await fetch("https://api.policyengine.org/us/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
    return (await res.json()) as any;
  };
  const on = await call(withHS);
  const offR = await call(off);
  const onNet = on.result.households.h.household_net_income["2026"];
  const offNet = offR.result.households.h.household_net_income["2026"];
  expect(onNet - offNet).toBeGreaterThan(15000); // Head Start value removed
}, 90_000);
```

- [ ] **Step 3: Run** — `RUN_CONTRACT=1 npx vitest run contract` → passes live. Skip path still skips.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "fix(app): honest non-expansion Medicaid copy; pin take-up overrides in contract test"`

---

### Task 7 (CONTROLLER): full data regeneration + pinned-value update

Not a subagent task — the controller runs it, whole suite as the gate.

- [ ] Regenerate the CA fixture (PTC-fix changes net values): re-fetch `fixtures/pe-ca-single-1kid-101.json` (request already includes MOOP + premium_tax_credit). Confirm the after-health identity `net = raw − ptc − moop` holds.
- [ ] Regenerate all 51 state files + summary with the honest baseline (`answersFor` now sets rationed-off; the pipeline picks it up automatically): `npx tsx pipeline/src/run.ts --concurrency 3`, then verify medicalOOP present and net values reflect PTC-fix + Head-Start-off.
- [ ] Update every fixture-/state-pinned test value across shared/pipeline/app to the new figures (analyze cliff, escape safeExit/leap, narration wages, places component tests, reachLookup expectations that use safe-exit). Run `npm test` until green.
- [ ] Regenerate `reach.json`? NO — the PUMS income distribution is unaffected; only the safe-exit incomes compared against it change (already covered by state regen).
- [ ] Map disclosure copy: add `places.panel.assumptions` addition / a new `places.baseline` string — "These numbers assume a family that does not get waitlisted help like Head Start or a housing voucher." (gate-checked).
- [ ] Commit `data: regenerate fixture + states (PTC fix + honest rationed-off baseline)`.

---

### Task 8: e2e + docs

**Files:**
- Modify: `app/e2e/personal-door.spec.ts`
- Modify: `docs/superpowers/specs/2026-07-11-hotgap-design.md`, `docs/reviews/2026-07-11-adversarial-methodology-review.md`, `README.md`

- [ ] **Step 1: e2e** — extend the main flow to pass through the new "gets" screen (accept defaults / click "No") and, on the result, flip the housing toggle and assert the page re-renders (the mocked `/api/curve` can return a second curve for the toggled call — intercept with a different body). Assert the "What if you get more help?" section is visible. Keep existing assertions green.

- [ ] **Step 2: Docs** — update the main spec §4 (program coverage) to note take-up is user-controlled + CCDF descoped; add a resolution line to the review doc for the #1 finding (rationed programs now user-toggled; map baseline honest) and the CCDF/childcare-subsidy items (descoped, PolicyEngine limitation); note the PTC-fix, MOOP relabel, and non-expansion copy fixes as resolved. README: one line on the take-up toggles.

- [ ] **Step 3: Gates** — `npm test`, `npm run typecheck`, `npm run readability`, `npm run build --workspace @hotgap/app`, `npm run e2e` all green.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "test+docs: take-up toggle e2e; record review resolutions"`

---

### Task 9: Final review + merge

- [ ] `scripts/review-package $(git merge-base main HEAD) HEAD` → whole-branch reviewer (most capable model). Focus: the value-override mechanism is correct (head_start:0 truly removes the cliff, not just the display); the two doors agree on identical inputs; live toggle re-fetch has no stale-response bug; honest baseline didn't silently break reach; no copy overstates; no logging. Fix Critical/Important; merge `model-honesty` to main.

## Self-review notes
- **Spec coverage:** take-up toggles §1 (Tasks 1,2,4,5), CCDF §2 (descoped — recorded Task 8), correctness fixes §3 (Task 3 PTC/MOOP, Task 6 copy), map baseline §4 (Task 4 + Task 7 regen), data/testing §5 (Tasks 6,7,8). County explicitly out.
- **Mechanism consistency:** every take-up path uses value-override (head_start:0 / housing:0) or ESI inputs — never the non-working enrollment flags. `getsHeadStart`/`getsHousing`/`hasEmployerCoverage` names are identical across types/validate/translate/archetypes/state/Toggles.
- **Known deliberate choices:** ESI premium is a flat national-average estimate (documented); housing override only bites when the family has rent; the "gets" screen only shows Head Start when a child is under 6.
