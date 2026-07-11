// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { StatePanel } from "./StatePanel.js";

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
const mkPoint = (earnings: number, netIncome: number) => ({ earnings, netIncome, programs: { ...PROGRAMS } });

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

function baseProps() {
  return { stateCode: "CA", stateName: "California", archetypeId: "single-2", biggestLoss: 21957, rank: 30 };
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
    // leap = axisMax(20000) - zoneStart(10000) = 10000, and it's a lower bound (open zone).
    expect(container.querySelector(".places-panel-leap")!.textContent).toContain("more than $10,000");
  });

  it("lists 'when help ends here' thresholds in year-unit wages when programs phase out before the sweep ends", async () => {
    const withPrograms = {
      generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA",
      archetypes: {
        "single-2": {
          points: [
            { earnings: 0, netIncome: 20000, programs: { ...PROGRAMS, tanf: 300 } },
            { earnings: 10000, netIncome: 26000, programs: { ...PROGRAMS, tanf: 0 } },
            { earnings: 20000, netIncome: 18000, programs: { ...PROGRAMS } },
            { earnings: 30000, netIncome: 32000, programs: { ...PROGRAMS } },
          ],
        },
      },
    };
    const fetchImpl = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(withPrograms) } as Response),
    );
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    await waitFor(() => expect(container.querySelector(".places-panel-ends-list")).toBeTruthy());
    expect(container.querySelector(".places-panel-ends-title")!.textContent).toMatch(/when help ends/i);
    expect(container.querySelector(".places-panel-ends-item")!.textContent).toMatch(/TANF.*\$0 a year/i);
  });

  it("shows no escape section while the curve is still loading", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { container } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(container.querySelector(".places-panel-escape")).toBeNull();
  });
});
