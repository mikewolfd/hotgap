// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { PlacesPage } from "./PlacesPage.js";

// This project's vitest config doesn't wire up RTL's automatic afterEach
// cleanup (see the note in CurveChart.test.tsx), so each render() here would
// otherwise pile onto document.body across tests in this file, making the
// destructured getByRole/getByLabelText queries (which search the whole
// baseElement, not just this render's container) see stale elements from
// earlier tests and throw "found multiple elements".
afterEach(() => {
  cleanup();
});

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
const mkPoint = (earnings: number, netIncome: number) => ({ earnings, netIncome, programs: { ...PROGRAMS } });
const caFixture = {
  generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA",
  archetypes: { "single-2": { points: [mkPoint(0, 20000), mkPoint(10000, 26000), mkPoint(20000, 18000), mkPoint(30000, 32000)] } },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlacesPage", () => {
  it("renders all 51 state paths, each a focusable, labeled control", () => {
    const { container } = render(<PlacesPage />);
    const paths = container.querySelectorAll("path.state-path");
    expect(paths.length).toBe(51);
    for (const p of paths) {
      expect(p.getAttribute("role")).toBe("button");
      expect(p.getAttribute("tabindex")).toBe("0");
      expect(p.getAttribute("aria-label")).toMatch(/can lose up to \$/);
    }
  });

  it("renders a 5-swatch legend for the default archetype (single, 2 kids)", () => {
    const { container } = render(<PlacesPage />);
    expect(container.querySelectorAll(".legend-scale li").length).toBe(5);
  });

  it("changes at least one state's fill when the family picker toggles to married", () => {
    const { container, getByRole } = render(<PlacesPage />);
    const before = [...container.querySelectorAll("path.state-path")].map((p) => (p as HTMLElement).style.fill);
    fireEvent.click(getByRole("radio", { name: /me and my spouse/i }));
    const after = [...container.querySelectorAll("path.state-path")].map((p) => (p as HTMLElement).style.fill);
    expect(after).not.toEqual(before);
  });

  it("collapses to a single 'no loss' legend message for an archetype where every state is 0 (single, 0 kids)", () => {
    const { container, getByLabelText } = render(<PlacesPage />);
    fireEvent.click(getByLabelText("fewer kids"));
    fireEvent.click(getByLabelText("fewer kids"));
    expect(container.querySelectorAll(".legend-scale li").length).toBe(0);
    expect(container.textContent).toMatch(/did not lose money in any state/i);
  });

  it("selecting a state (click) shows its StatePanel with an instant headline", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = render(<PlacesPage />);
    const ca = container.querySelector('path[aria-label^="California"]')!;
    fireEvent.click(ca);
    await waitFor(() => expect(container.querySelector(".places-panel-headline")).toBeTruthy());
    expect(container.querySelector(".places-panel-headline")!.textContent).toMatch(/California/);
  });

  it("selecting a state via keyboard (Enter) also opens the panel", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container } = render(<PlacesPage />);
    const tx = container.querySelector('path[aria-label^="Texas"]')!;
    fireEvent.keyDown(tx, { key: "Enter" });
    await waitFor(() => expect(container.querySelector(".places-panel-headline")).toBeTruthy());
    expect(container.querySelector(".places-panel-headline")!.textContent).toMatch(/Texas/);
  });

  it("fetches the clicked state's data file and eventually renders its curve", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(caFixture) } as Response));
    vi.stubGlobal("fetch", fetchImpl);
    const { container } = render(<PlacesPage />);
    const ca = container.querySelector('path[aria-label^="California"]')!;
    fireEvent.click(ca);
    await waitFor(() => expect(fetchImpl).toHaveBeenCalledWith("/data/states/CA.json"));
    await waitFor(() => expect(container.querySelector("svg.curve-chart")).toBeTruthy());
  });
});
