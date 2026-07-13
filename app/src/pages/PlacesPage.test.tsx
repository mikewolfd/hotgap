// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { PlacesPage, isKnownArchetype } from "./PlacesPage.js";
import { RAMP_BINS } from "../lib/placesRamp.js";

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
const mkPoint = (earnings: number, netIncome: number) => ({ earnings, netIncome, medicalOOP: 0, programs: { ...PROGRAMS } });
const caFixture = {
  generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA",
  archetypes: { "single-2": { points: [mkPoint(0, 20000), mkPoint(10000, 26000), mkPoint(20000, 18000), mkPoint(30000, 32000)] } },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PlacesPage", () => {
  // Task 24: the map's default metric is now "the pay gap to clear it" (leap).
  // The DS ChoroplethMap labels each state "<name>: <valueLabel> <$amount>", so
  // every default label carries the leap metric's word ("The pay gap to clear
  // it") followed by a dollar figure.
  it("renders all 51 state paths, each a focusable, labeled control", () => {
    const { container } = render(<PlacesPage />);
    const paths = container.querySelectorAll("path.state-path");
    expect(paths.length).toBe(51);
    for (const p of paths) {
      expect(p.getAttribute("role")).toBe("button");
      expect(p.getAttribute("tabindex")).toBe("0");
      expect(p.getAttribute("aria-label")).toMatch(/the pay gap to clear it \$/i);
    }
  });

  it("renders a 5-swatch legend for the default archetype (single, 2 kids)", () => {
    const { container } = render(<PlacesPage />);
    expect(container.querySelectorAll(".legend-scale li").length).toBe(5);
  });

  // Task 24: two-choice metric picker (leap vs biggest loss), default leap.
  it("defaults to the leap metric: its chip is checked and the leap legend text is visible on mount", () => {
    const { container, getByRole } = render(<PlacesPage />);
    expect(getByRole("radio", { name: /the pay gap to clear it/i }).getAttribute("aria-checked")).toBe("true");
    expect(getByRole("radio", { name: /^biggest loss$/i }).getAttribute("aria-checked")).toBe("false");
    expect(container.textContent).toMatch(/how big is that gap/i);
    // The map's per-state labels (aria-label, not text) speak in the leap
    // metric's word + a dollar figure.
    const label = container.querySelector("path.state-path")!.getAttribute("aria-label");
    expect(label).toMatch(/the pay gap to clear it \$/i);
  });

  it("toggling to 'Biggest loss' switches the legend title and the map's per-state labels", () => {
    const { container, getByRole } = render(<PlacesPage />);
    fireEvent.click(getByRole("radio", { name: /^biggest loss$/i }));
    expect(getByRole("radio", { name: /^biggest loss$/i }).getAttribute("aria-checked")).toBe("true");
    // Legend title switches to the loss question (kept in en.json via t()).
    expect(container.textContent).toMatch(/how much can they lose/i);
    // The map's per-state labels (aria-label) now speak in the loss metric's
    // word + a dollar figure, and no longer in the leap metric's word.
    const paths = container.querySelectorAll("path.state-path");
    for (const p of paths) {
      expect(p.getAttribute("aria-label")).toMatch(/biggest loss \$/i);
      expect(p.getAttribute("aria-label")).not.toMatch(/the pay gap to clear it/i);
    }
  });

  it("changes at least one state's fill when the metric picker toggles from leap to loss", () => {
    const { container, getByRole } = render(<PlacesPage />);
    const before = [...container.querySelectorAll("path.state-path")].map((p) => (p as HTMLElement).style.fill);
    fireEvent.click(getByRole("radio", { name: /^biggest loss$/i }));
    const after = [...container.querySelectorAll("path.state-path")].map((p) => (p as HTMLElement).style.fill);
    expect(after).not.toEqual(before);
  });

  it("changes at least one state's fill when the family picker toggles to married", () => {
    const { container, getByRole } = render(<PlacesPage />);
    const before = [...container.querySelectorAll("path.state-path")].map((p) => (p as HTMLElement).style.fill);
    fireEvent.click(getByRole("radio", { name: /me and my spouse/i }));
    const after = [...container.querySelectorAll("path.state-path")].map((p) => (p as HTMLElement).style.fill);
    expect(after).not.toEqual(before);
  });

  // Once real health costs are folded in, a childless adult is NOT cliff-free:
  // losing Medicaid means paying ACA premiums, a genuine health-coverage cliff
  // (leap > 0 in 42/51 states for single-0, per the honest rationed-off
  // baseline). So the single-0 legend renders a real scale, not the
  // degenerate fallback — the honest reversal of the pre-health-adjustment
  // "no-kids families face no cliffs".
  it("renders a real legend scale for a childless adult (single 0 kids) — health cliffs exist", () => {
    const { container, getByLabelText } = render(<PlacesPage />);
    fireEvent.click(getByLabelText("fewer kids"));
    fireEvent.click(getByLabelText("fewer kids"));
    expect(container.querySelectorAll(".legend-scale li").length).toBe(RAMP_BINS);
    expect(container.textContent).not.toMatch(/did not find a cliff/i);
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

  // Finding 1: the map's tiny states (DE/RI/DC) are far below tap-target
  // size at mobile width. The DS Select (a real, labeled <select> inside a
  // .field wrapper) listing every state gives an equivalent, always-usable
  // control (WCAG 2.5.8's equivalent-control exception) and a first-class path
  // for screen reader users.
  it("renders a DS Select listing all 51 states, alphabetically by full name", () => {
    const { container, getByLabelText } = render(<PlacesPage />);
    const select = getByLabelText(/pick a state from a list/i) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.closest(".field")).toBeTruthy();
    const options = [...select.options];
    expect(options.length).toBe(51);
    expect(options[0].textContent).toBe("Alabama");
    expect(options[options.length - 1].textContent).toBe("Wyoming");
    const names = options.map((o) => o.textContent);
    expect(names).toEqual([...names].sort((a, b) => a!.localeCompare(b!)));
  });

  it("choosing a state from the DS Select shows its StatePanel, same as clicking the map", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const { container, getByLabelText } = render(<PlacesPage />);
    const select = getByLabelText(/pick a state from a list/i) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "TX" } });
    await waitFor(() => expect(container.querySelector(".places-panel-headline")).toBeTruthy());
    expect(container.querySelector(".places-panel-headline")!.textContent).toMatch(/Texas/);
  });

  // Finding 1 (axe nested-interactive): role="img" is children-presentational,
  // which can hide the per-state role="button" paths from assistive tech.
  // role="group" keeps the map's own label while exposing its children.
  it("uses role=group (not role=img) on the map svg so its per-state buttons stay exposed", () => {
    const { container } = render(<PlacesPage />);
    const svg = container.querySelector("svg.places-map")!;
    expect(svg.getAttribute("role")).toBe("group");
    // The app passes a metric-specific ariaLabel (leap by default) so the map's
    // accessible name says what the shading means.
    expect(svg.getAttribute("aria-label")).toMatch(/map of the united states/i);
  });
});

// Finding 4: a lookup miss on the archetype id must never fall through to a
// false "no cliffs here" legend claim (the degenerate educational message is
// true for a genuinely-flat archetype, but a lie for a data gap).
// isKnownArchetype is the pure guard the legend section checks before
// rendering anything ramp-derived.
describe("isKnownArchetype", () => {
  it("returns true when the id is present in the summary's archetype list", () => {
    expect(isKnownArchetype("single-2", [{ id: "single-2" }, { id: "married-2" }])).toBe(true);
  });

  it("returns false when the id is absent (defensive fallback path; shouldn't happen in practice)", () => {
    expect(isKnownArchetype("single-9", [{ id: "single-2" }])).toBe(false);
  });
});
