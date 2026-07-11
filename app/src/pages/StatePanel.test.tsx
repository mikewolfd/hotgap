// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { StatePanel } from "./StatePanel.js";

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
const mkPoint = (earnings: number, netIncome: number) => ({ earnings, netIncome, medicalOOP: 0, programs: { ...PROGRAMS } });

const stateFile = {
  generated: "2026-07-11T00:00:00.000Z",
  year: "2026",
  state: "CA",
  archetypes: {
    "single-2": {
      points: [mkPoint(0, 20000), mkPoint(10000, 26000), mkPoint(20000, 18000), mkPoint(30000, 32000)],
    },
  },
};

// Default fixture uses metric="loss" so the long-standing loss-headline
// assertions below stay valid; the metric-aware headline (leap vs loss) has
// its own dedicated describe block further down.
function baseProps() {
  return { stateCode: "CA", stateName: "California", archetypeId: "single-2", metric: "loss" as const, biggestLoss: 21957, leap: 46000, rank: 30 };
}

describe("StatePanel", () => {
  it("renders the headline and rank synchronously, from props, before any fetch resolves", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {})); // never resolves
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(container.textContent).toMatch(/California/);
    // formatDollars rounds to the nearest $100 (matches every other money string in the app).
    expect(container.textContent).toMatch(/\$22,000/);
    expect(container.textContent).toMatch(/Worse than 30 of 50 other states/i);
  });

  // Fix 1: headline and rank must speak the SAME metric. Under the app's
  // DEFAULT metric=leap, the headline speaks the leap (not the loss), so the
  // leap-based rank line below it can't be misread as ordering a loss figure.
  it("speaks the leap in the headline when metric is leap (the app default)", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(
      <StatePanel {...baseProps()} metric="leap" fetchImpl={fetchImpl as unknown as typeof fetch} />,
    );
    expect(container.querySelector(".places-panel-headline")!.textContent).toMatch(/needs a jump of about \$46,000 a year/i);
    expect(container.querySelector(".places-panel-headline")!.textContent).not.toMatch(/can lose up to/i);
  });

  it("speaks the loss in the headline when metric is loss", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(
      <StatePanel {...baseProps()} metric="loss" fetchImpl={fetchImpl as unknown as typeof fetch} />,
    );
    expect(container.querySelector(".places-panel-headline")!.textContent).toMatch(/can lose up to \$22,000 a year/i);
    expect(container.querySelector(".places-panel-headline")!.textContent).not.toMatch(/needs a jump/i);
  });

  it("shows a loading state while the state's curve is being fetched", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(fetchImpl).toHaveBeenCalledWith("/data/states/CA.json");
    expect(container.textContent).toMatch(/Getting this state's numbers/i);
  });

  it("renders the curve chart (without a you-dot) once the fetch resolves", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(stateFile) } as Response),
    );
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.querySelector("svg.curve-chart")).toBeTruthy());
    expect(container.querySelector("circle.you-dot")).toBeNull();
  });

  it("shows a plain-language error when the fetch fails", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new Error("network down")));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.textContent).toMatch(/could not load this state/i));
  });

  it("shows the error state when the response has no data for the requested archetype", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ ...stateFile, archetypes: {} }) } as Response),
    );
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.textContent).toMatch(/could not load this state/i));
  });

  it("always shows the honesty line, regardless of load phase", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(container.textContent).toMatch(/not your family/i);
  });

  // Finding 5: the honesty line must also spell out the archetype's actual
  // modeling assumptions (age, sole income, no rent/child care), not just
  // "not your family" — a reader can't judge fit without knowing what varies.
  it("shows the archetype's assumptions alongside the 'not your family' line", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(container.textContent).toMatch(/grown-ups are 30/i);
    expect(container.textContent).toMatch(/no rent or child care/i);
  });

  // Plan 4: the drill-down's curve is health-adjusted like the personal
  // door's — this note is the panel's honesty-box equivalent of
  // result.honesty.health, so the reframing is disclosed here too, not just
  // on the personal door.
  it("shows the health-costs note alongside the other honesty lines", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(container.querySelector(".places-panel-health-note")?.textContent).toMatch(/pays for health coverage/i);
  });

  it("labels the drill-down chart's y-axis with the same after-health-costs framing as the personal door", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(stateFile) } as Response),
    );
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.querySelector("svg.curve-chart")).toBeTruthy());
    expect(container.querySelector(".y-axis-label")?.textContent).toMatch(/after health costs/i);
  });

  it("re-fetches when the state or archetype changes", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { rerender } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    rerender(<StatePanel {...baseProps()} stateCode="TX" stateName="Texas" fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(fetchImpl).toHaveBeenCalledWith("/data/states/TX.json");
  });
});

// Task 24: the drill-down computes escapeAnalysis on the same lazy-loaded
// points, then renders safe/leap lines and a "when help ends" list — no new
// data fetch, just more math on what's already there.
describe("StatePanel escape lines", () => {
  // Zone opens at the 10000 peak (net rises to 26000, then dips to 18000 —
  // a >200 drop) and closes at 30000 (net rises back past the peak). So:
  // safeExitEarnings = 30000, leap = 30000 - 10000 = 20000, not a lower bound.
  const recoveringFile = {
    generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA",
    archetypes: {
      "single-2": {
        points: [mkPoint(0, 20000), mkPoint(10000, 26000), mkPoint(20000, 18000), mkPoint(30000, 32000)],
      },
    },
  };

  it("renders the safe-exit and leap lines with dollar amounts once the curve loads", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(recoveringFile) } as Response),
    );
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.querySelector(".places-panel-safe")).toBeTruthy());
    expect(container.querySelector(".places-panel-safe")!.textContent).toContain("$30,000");
    expect(container.querySelector(".places-panel-leap")!.textContent).toContain("$20,000");
  });

  it("shows the honest safeNever line when the zone never recovers within the sweep", async () => {
    const stuckFile = {
      generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA",
      archetypes: {
        "single-2": { points: [mkPoint(0, 20000), mkPoint(10000, 26000), mkPoint(20000, 10000)] },
      },
    };
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(stuckFile) } as Response),
    );
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.querySelector(".places-panel-safe")).toBeTruthy());
    expect(container.querySelector(".places-panel-safe")!.textContent).toMatch(/still hits rough spots here/i);
    // leap = axisMax(20000) - zoneStart(10000) = 10000, and it's a lower bound
    // (open zone) — the "at least" phrasing, not the old "about more than".
    expect(container.querySelector(".places-panel-leap")!.textContent).toContain("at least $10,000");
    expect(container.querySelector(".places-panel-leap")!.textContent).not.toContain("more than");
  });

  it("lists 'when help ends here' thresholds in year-unit wages when programs phase out before the sweep ends", async () => {
    const withPrograms = {
      generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA",
      archetypes: {
        "single-2": {
          points: [
            { earnings: 0, netIncome: 20000, medicalOOP: 0, programs: { ...PROGRAMS, tanf: 300 } },
            { earnings: 10000, netIncome: 26000, medicalOOP: 0, programs: { ...PROGRAMS, tanf: 0 } },
            { earnings: 20000, netIncome: 18000, medicalOOP: 0, programs: { ...PROGRAMS } },
            { earnings: 30000, netIncome: 32000, medicalOOP: 0, programs: { ...PROGRAMS } },
          ],
        },
      },
    };
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(withPrograms) } as Response),
    );
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.querySelector(".places-panel-ends-list")).toBeTruthy());
    // Fix 2: third-person "here", not the personal door's "for you" — the
    // panel elsewhere says "not your family", so "for you" contradicted it.
    expect(container.querySelector(".places-panel-ends-title")!.textContent).toMatch(/when help ends here/i);
    expect(container.querySelector(".places-panel-ends-title")!.textContent).not.toMatch(/for you/i);
    expect(container.querySelector(".places-panel-ends-item")!.textContent).toMatch(/TANF.*\$0 a year/i);
  });

  it("shows no escape section while the curve is still loading", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(container.querySelector(".places-panel-escape")).toBeNull();
  });
});

// Plan 5: the reach line pulls from the REAL, committed app/src/data/reach.json
// (not a route-mocked fetch — reach.json is a static import), so these tests
// pin against real cells for CA (single-2, a real cell) and WY (single-3, a
// documented small-sample null cell — see reachLookup.test.ts).
describe("StatePanel reach line", () => {
  it("names the percentile once the curve loads, computed from the same safe-exit the safe line names", async () => {
    // CA single-2's ladder has $62,000 exactly at its p50 (see
    // app/src/data/reach.json / reachLookup.test.ts) — a zone opening at its
    // 30000 peak and recovering at 62000 makes safeExitEarnings land there.
    const file = {
      generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA",
      archetypes: {
        "single-2": {
          points: [mkPoint(0, 20000), mkPoint(30000, 40000), mkPoint(40000, 30000), mkPoint(62000, 45000)],
        },
      },
    };
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(file) } as Response));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.querySelector(".places-panel-reach")).toBeTruthy());
    expect(container.querySelector(".places-panel-safe")!.textContent).toContain("$62,000");
    expect(container.querySelector(".places-panel-reach")!.textContent).toMatch(/more than about 50% of families like this earn/i);
    // Comes right after the safe line (same reasoning as EscapePath).
    expect(container.querySelector(".places-panel-reach")!.previousElementSibling?.className).toBe("places-panel-safe");
  });

  it("shows the honest top-pay line, with no fabricated percentile, when the zone never recovers", async () => {
    const stuckFile = {
      generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA",
      archetypes: {
        "single-2": { points: [mkPoint(0, 20000), mkPoint(10000, 26000), mkPoint(20000, 10000)] },
      },
    };
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(stuckFile) } as Response));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.querySelector(".places-panel-reach")).toBeTruthy());
    expect(container.querySelector(".places-panel-reach")!.textContent).toMatch(/still hit rough spots/i);
    expect(container.querySelector(".places-panel-reach")!.textContent).not.toMatch(/\d/);
  });

  it("omits the reach line silently when the state x archetype has no trustworthy PUMS cell (WY single-3)", async () => {
    const file = {
      generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "WY",
      archetypes: {
        "single-3": {
          points: [mkPoint(0, 20000), mkPoint(30000, 40000), mkPoint(40000, 30000), mkPoint(62000, 45000)],
        },
      },
    };
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(file) } as Response));
    const { container } = render(
      <StatePanel {...baseProps()} stateCode="WY" stateName="Wyoming" archetypeId="single-3" fetchImpl={fetchImpl as unknown as typeof fetch} />,
    );
    // The safe line still renders (it doesn't depend on reach data) — only
    // the reach paragraph is missing.
    await waitFor(() => expect(container.querySelector(".places-panel-safe")).toBeTruthy());
    expect(container.querySelector(".places-panel-reach")).toBeNull();
  });

  it("shows the reach transparency note in the honesty area regardless of load phase", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(container.querySelector(".places-panel-reach-note")?.textContent).toMatch(/Census household income/i);
  });
});
