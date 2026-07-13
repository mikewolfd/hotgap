// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, within, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { HouseholdAnswers, CurvePoint, ProgramId } from "@hotgap/shared";
import { ResultPage } from "./ResultPage.js";

// RTL auto-cleanup isn't wired in this project's vitest config (see the note in
// the other UI tests); this file mounts real async renders, so it cleans up and
// unstubs fetch itself between tests.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
const mkPoint = (earnings: number, netIncome: number, programs: Partial<Record<ProgramId, number>> = {}): CurvePoint =>
  ({ earnings, netIncome, medicalOOP: 0, programs: { ...PROGRAMS, ...programs } });

// A curve with one benefits cliff ahead of the household's current pay: net
// climbs to $24k at $10k pay, then falls $4k as SNAP + TANF collapse, then
// recovers by $30k. So the verdict is "cliff_ahead" (danger tone), exactly one
// drop marker renders, the why-list is populated, and the escape section shows.
const cliffPoints: CurvePoint[] = [
  mkPoint(0, 20000, { snap: 5000, tanf: 3000 }),
  mkPoint(10000, 24000, { snap: 5000, tanf: 3000 }),
  mkPoint(20000, 20000, { snap: 1000, tanf: 0 }),
  mkPoint(30000, 26000),
];

// A wider curve (0–100k) so the full-time-minimum-wage reference line (CA:
// $16.90 × 2080 ≈ $35.2k) lands inside the charted pay range. Its single cliff
// at $10k pay sits well below full-time minimum, so the drop card also carries
// the "hours a week" translation.
const widePoints: CurvePoint[] = [
  mkPoint(0, 20000, { snap: 5000 }),
  mkPoint(10000, 24000, { snap: 5000 }),
  mkPoint(20000, 20000),
  mkPoint(60000, 40000),
  mkPoint(100000, 55000),
];

const answers: HouseholdAnswers = {
  state: "CA", countyFips: null, married: false, childAges: [3], childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000,
  spouseAnnualEarnings: 0, age: 30, spouseAge: null, youDisabled: false,
  spouseDisabled: false, getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
};
const ctx = { unit: "year" as const };

// Minimal Response-likes: fetchCurve keys off `status`/`json`, fetchFallbackCurve
// off `ok`/`json`.
const curveOk = (data: unknown) => ({ status: 200, ok: true, json: () => Promise.resolve(data) });
const httpFail = (status: number) => ({ status, ok: false, json: () => Promise.resolve({}) });
const stateOk = (data: unknown) => ({ status: 200, ok: true, json: () => Promise.resolve(data) });

function stubFetch(route: (url: string) => unknown) {
  const mock = vi.fn((url: RequestInfo | URL) => Promise.resolve(route(String(url))));
  vi.stubGlobal("fetch", mock);
  return mock;
}

// The live-curve happy path: /api/curve answers 200 with the cliff fixture.
function stubLiveCurve() {
  return stubFetch((url) =>
    url.includes("/api/curve") ? curveOk({ points: cliffPoints, currentEarnings: 5000 }) : httpFail(404),
  );
}

function stubWideCurve() {
  return stubFetch((url) =>
    url.includes("/api/curve") ? curveOk({ points: widePoints, currentEarnings: 5000 }) : httpFail(404),
  );
}

function renderResult(onStartOver = vi.fn()) {
  return render(<ResultPage answers={answers} ctx={ctx} onStartOver={onStartOver} />);
}

describe("ResultPage", () => {
  it("shows the plain-language loading state before the curve resolves", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // never resolves
    const { container } = renderResult();
    expect(container.textContent).toMatch(/Doing the math/i);
  });

  it("renders the verdict headline via VerdictHeadline, tinted danger for a cliff ahead", async () => {
    stubLiveCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector(".verdict-headline")).toBeTruthy());
    const headline = container.querySelector(".verdict-headline")!;
    // The DS VerdictHeadline carries the tone (cliff_ahead -> "danger"), and the
    // copy is the narrated en.json string, not the component's English default.
    expect(headline.classList.contains("verdict-danger")).toBe(true);
    expect(headline.textContent).toMatch(/more pay can mean less money/i);
  });

  it("renders the DS CurveChart with the app's t() chart copy", async () => {
    stubLiveCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector("svg.curve-chart")).toBeTruthy());
    // labels.title is wired from result.chart.title (the after-health-costs framing),
    // proving the app's copy reaches the chart rather than its built-in English.
    expect(container.querySelector(".chart-title")?.textContent).toMatch(/after health costs/i);
    // One cliff -> one tappable drop marker.
    expect(container.querySelectorAll("button.drop-marker").length).toBe(1);
  });

  it("opens a drop card naming the loss and programs, using the app's t() labels", async () => {
    stubLiveCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector("button.drop-marker")).toBeTruthy());
    expect(container.querySelector(".drop-card")).toBeNull();
    fireEvent.click(container.querySelector("button.drop-marker")!);
    const card = container.querySelector(".drop-card")!;
    expect(card).toBeTruthy();
    // cardAmount + programLabel come from en.json via labels, not DS defaults.
    expect(card.textContent).toMatch(/drops what you keep by about \$4,000/i);
    expect(card.textContent).toMatch(/SNAP/);
    expect(card.textContent).toMatch(/TANF/);
  });

  it("adds an 'hours a week at minimum wage' line to a below-full-time drop card", async () => {
    stubWideCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector("button.drop-marker")).toBeTruthy());
    fireEvent.click(container.querySelector("button.drop-marker")!);
    const card = container.querySelector(".drop-card")!;
    // CA min wage $16.90; the $10k cliff ≈ 11 hours a week. State name resolved
    // from the household's own answers, not a default.
    expect(card.textContent).toMatch(/about 11 hours a week at minimum wage in California/i);
  });

  it("draws the full-time-minimum-wage reference line + note when it falls in the charted range", async () => {
    stubWideCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector("svg.curve-chart")).toBeTruthy());
    // Dashed guide inside the plot, and the plain note pairing it with the number.
    expect(container.querySelector("line.minwage-guide")).toBeTruthy();
    const note = container.querySelector(".minwage-note")!;
    expect(note.textContent).toMatch(/full-time at minimum wage/i);
    expect(note.textContent).toMatch(/\$16\.90 an hour/);
    expect(note.textContent).toMatch(/\$35,200 a year/);
  });

  it("omits the reference line when full-time minimum lands past the charted range", async () => {
    // The narrow CA fixture only reaches $30k, below CA's ~$35.2k full-time
    // minimum, so the marker would fall off-axis — it must not render.
    stubLiveCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector("svg.curve-chart")).toBeTruthy());
    expect(container.querySelector("line.minwage-guide")).toBeNull();
    expect(container.querySelector(".minwage-note")).toBeNull();
  });

  it("renders the why-list through DS WhyList with mapped, t() items", async () => {
    stubLiveCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector(".why-list")).toBeTruthy());
    expect(within(container).getByRole("heading", { name: /why does this happen/i })).toBeTruthy();
    const items = container.querySelectorAll(".why-item");
    expect(items.length).toBeGreaterThan(0);
    // The programs the cliff takes away lead with the "you could lose …" line.
    expect(container.querySelector(".why-lost")?.textContent).toMatch(/you could lose/i);
    expect(container.querySelector(".why-value")?.textContent).toMatch(/worth about \$5,000 a year/i);
  });

  it("renders the escape section: kept heading + DS EscapePath with the reach line folded into the safe line", async () => {
    stubLiveCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector(".escape-path")).toBeTruthy());
    // The section heading (escape.title) is kept as app markup above the DS box.
    expect(within(container).getByRole("heading", { name: /how help changes as pay rises/i })).toBeTruthy();
    // Safe-exit line renders through DS EscapePath; the reach elaboration (Plan 5)
    // is folded onto it since the DS component has no separate reach slot.
    const safe = container.querySelector(".escape-safe")!;
    expect(safe.textContent).toMatch(/more pay always helps you/i);
    expect(safe.textContent).toMatch(/out-earn about \d+% of families like yours/i);
  });

  it("renders the honesty box as a DS Callout carrying body, model, health and reach notes", async () => {
    stubLiveCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector(".callout")).toBeTruthy());
    const callout = container.querySelector(".callout")!;
    expect(within(callout as HTMLElement).getByRole("heading", { name: /please know/i })).toBeTruthy();
    expect(callout.textContent).toMatch(/caseworker/i);
    expect(callout.textContent).toMatch(/PolicyEngine/i);
    expect(callout.textContent).toMatch(/Census ACS PUMS/i);
  });

  it("renders take-up toggles as DS switches and recomputes the curve when one is flipped", async () => {
    const mock = stubLiveCurve();
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector(".verdict-headline")).toBeTruthy());
    const curveCalls = () => mock.mock.calls.filter(([u]) => String(u).includes("/api/curve")).length;
    const before = curveCalls();
    // Flipping a switch rewrites `current`, which re-runs the fetch effect —
    // the recompute-on-flip behavior preserved from the old Toggles component.
    fireEvent.click(within(container).getByRole("switch", { name: /housing/i }));
    await waitFor(() => expect(curveCalls()).toBeGreaterThan(before));
  });

  it("shows the fallback banner and a Try again button when the live call fails but an archetype curve exists", async () => {
    stubFetch((url) => {
      if (url.includes("/api/curve")) return httpFail(500);
      if (url.includes("/data/states/CA.json")) return stateOk({ archetypes: { "single-1": { points: cliffPoints } } });
      return httpFail(404);
    });
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector(".fallback-banner")).toBeTruthy());
    expect(container.querySelector(".fallback-banner")?.textContent).toMatch(/could not get your exact numbers/i);
    expect(within(container).getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("shows the plain-language error state when both the live call and the fallback fail", async () => {
    stubFetch((url) => (url.includes("/api/curve") ? httpFail(500) : httpFail(404)));
    const { container } = renderResult();
    await waitFor(() => expect(container.querySelector('[role="alert"]')).toBeTruthy());
    expect(container.textContent).toMatch(/could not get your answer/i);
    expect(within(container).getByRole("button", { name: /start over/i })).toBeTruthy();
  });
});
