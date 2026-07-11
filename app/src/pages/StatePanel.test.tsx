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

  it("re-fetches when the state or archetype changes", () => {
    const fetchImpl = vi.fn(() => new Promise(() => {}));
    const { rerender } = render(<StatePanel {...baseProps()} fetchImpl={fetchImpl as unknown as typeof fetch} />);
    rerender(<StatePanel {...baseProps()} stateCode="TX" stateName="Texas" fetchImpl={fetchImpl as unknown as typeof fetch} />);
    expect(fetchImpl).toHaveBeenCalledWith("/data/states/TX.json");
  });
});
