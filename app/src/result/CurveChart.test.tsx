// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { scaleLinear } from "d3-scale";
import { parsePEResponse, analyzeCurve, PROGRAM_IDS, type CurvePoint, type ProgramId } from "@hotgap/shared";
import { CurveChart, W, M } from "./CurveChart.js";

// NOTE: `new URL("...", import.meta.url)` (the pattern used by every other
// fixture-loading test in this repo) resolves against http://localhost/ here
// instead of the file's real path. Under vitest's jsdom environment, Vite
// transforms modules in "web" mode, where `new URL(<literal>, import.meta.url)`
// is statically rewritten into a dev-server asset URL; under the default node
// environment it runs in "ssr" mode and that rewrite never fires (which is why
// the identical pattern works in narration.test.ts, analyze.test.ts, etc.).
// Route around it via fileURLToPath + path.join so the literal `new URL(...)`
// pattern never appears in this file's source.
const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(path.join(fixtureDir, "../../../fixtures/pe-ca-single-1kid-101.json"), "utf8"),
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

  // Plan 4: the curve is health-adjusted (netIncome already has real health
  // costs subtracted out) -- the chart must say so itself, not just in prose
  // elsewhere. result.chart.yLabel was previously an unused string (see
  // docs/post-merge-notes.md); this is its first render.
  it("labels the y-axis with the after-health-costs framing", () => {
    const { container } = render(
      <CurveChart analysis={analysis} ctx={{ unit: "hour", hoursPerWeek: 40 }} />,
    );
    const yLabel = container.querySelector(".y-axis-label");
    expect(yLabel?.textContent).toMatch(/after health costs/i);
  });

  it("titles the chart with the after-health-costs framing", () => {
    const { container } = render(
      <CurveChart analysis={analysis} ctx={{ unit: "hour", hoursPerWeek: 40 }} />,
    );
    expect(container.querySelector(".chart-title")?.textContent).toMatch(/after health costs/i);
  });

  it("hides the you-are-here dot and label when showCurrent is false (places-door drill-down has no 'you')", () => {
    // Scoped to `container` (not the destructured queryByText, which queries the
    // shared baseElement/document.body) since RTL auto-cleanup between tests
    // isn't wired up in this project's vitest config — other renders in this
    // file/suite can otherwise leave stray "You are here" text nodes behind.
    const { container } = render(
      <CurveChart analysis={analysis} ctx={{ unit: "hour", hoursPerWeek: 40 }} showCurrent={false} />,
    );
    expect(container.querySelector("circle.you-dot")).toBeNull();
    expect(container.querySelector(".you-label")).toBeNull();
    // Everything else about the chart still renders.
    expect(container.querySelector("path.net-line")).toBeTruthy();
  });
});

// Drop markers (Plan 9): a tappable button per cliff, opening a detail card
// naming the money lost and which help ends. Synthetic points give a known
// cliff (net falls $4,000 as SNAP+TANF end) so the card's text is exact.
const zeroPrograms = Object.fromEntries(PROGRAM_IDS.map((id) => [id, 0])) as Record<ProgramId, number>;
function mkPoint(earnings: number, netIncome: number, programs: Partial<Record<ProgramId, number>> = {}): CurvePoint {
  return { earnings, netIncome, medicalOOP: 0, programs: { ...zeroPrograms, ...programs } };
}
const cliffPoints: CurvePoint[] = [
  mkPoint(0, 20000, { snap: 5000, tanf: 3000 }),
  mkPoint(10000, 24000, { snap: 5000, tanf: 3000 }),
  mkPoint(20000, 20000, { snap: 1000, tanf: 0 }), // net −$4,000; SNAP & TANF collapse
  mkPoint(30000, 26000, {}),
];
const cliffAnalysis = analyzeCurve(cliffPoints, 5000);
const flatAnalysis = analyzeCurve(
  [mkPoint(0, 10000), mkPoint(10000, 15000), mkPoint(20000, 20000)],
  5000,
);

describe("CurveChart drop markers", () => {
  it("renders one drop button per cliff (real fixture)", () => {
    const { container } = render(<CurveChart analysis={analysis} ctx={{ unit: "year" }} />);
    expect(container.querySelectorAll("button.drop-marker").length).toBe(analysis.cliffs.length);
  });

  it("has no markers, hint, or card when the curve only goes up", () => {
    expect(flatAnalysis.cliffs.length).toBe(0);
    const { container } = render(<CurveChart analysis={flatAnalysis} ctx={{ unit: "year" }} />);
    expect(container.querySelectorAll("button.drop-marker").length).toBe(0);
    expect(container.querySelector(".drop-hint")).toBeNull();
    expect(container.querySelector(".drop-card")).toBeNull();
  });

  it("markers are real, labeled buttons (keyboard + screen-reader reachable)", () => {
    const { container } = render(<CurveChart analysis={cliffAnalysis} ctx={{ unit: "year" }} />);
    const marker = container.querySelector("button.drop-marker")!;
    expect(marker.tagName).toBe("BUTTON");
    expect(marker.getAttribute("aria-label")).toMatch(/drop near .* lose about \$4,000/i);
  });

  it("tapping a drop opens a card naming the money lost and which help ends", () => {
    const { container } = render(<CurveChart analysis={cliffAnalysis} ctx={{ unit: "year" }} />);
    expect(container.querySelector(".drop-card")).toBeNull();
    fireEvent.click(container.querySelector("button.drop-marker")!);
    const card = container.querySelector(".drop-card")!;
    expect(card).toBeTruthy();
    expect(card.textContent).toMatch(/\$10,000 a year/); // where the drop is (pay level)
    expect(card.textContent).toMatch(/\$4,000/); // how much money is lost
    expect(card.textContent).toMatch(/SNAP/);
    expect(card.textContent).toMatch(/TANF/);
  });

  it("tapping the same drop again closes the card", () => {
    const { container } = render(<CurveChart analysis={cliffAnalysis} ctx={{ unit: "year" }} />);
    const marker = () => container.querySelector("button.drop-marker")!;
    fireEvent.click(marker());
    expect(container.querySelector(".drop-card")).toBeTruthy();
    fireEvent.click(marker());
    expect(container.querySelector(".drop-card")).toBeNull();
  });

  it("shows the fallback line (no list) when a drop has no single named program", () => {
    // Net falls $1,000 (a cliff) but SNAP only slips $50 (< the $100 loss
    // floor), so programsLost is empty — the card must not render a bullet list.
    const pts: CurvePoint[] = [
      mkPoint(0, 20000, { snap: 500 }),
      mkPoint(10000, 20000, { snap: 500 }),
      mkPoint(20000, 19000, { snap: 450 }),
      mkPoint(30000, 25000),
    ];
    const a = analyzeCurve(pts, 5000);
    expect(a.cliffs.length).toBe(1);
    expect(a.cliffs[0].programsLost).toEqual([]);
    const { container } = render(<CurveChart analysis={a} ctx={{ unit: "year" }} />);
    fireEvent.click(container.querySelector("button.drop-marker")!);
    const card = container.querySelector(".drop-card")!;
    expect(card.textContent).toMatch(/would get smaller/i);
    expect(container.querySelector(".drop-card-list")).toBeNull();
  });

  it("the close button dismisses the card", () => {
    const { container } = render(<CurveChart analysis={cliffAnalysis} ctx={{ unit: "year" }} />);
    fireEvent.click(container.querySelector("button.drop-marker")!);
    fireEvent.click(container.querySelector(".drop-card-close")!);
    expect(container.querySelector(".drop-card")).toBeNull();
  });
});

describe("CurveChart x-axis tick positioning", () => {
  // Reconstructs the same x scale CurveChart uses internally (same domain,
  // same W/M layout constants) so the test can invert a rendered tick's pixel
  // x back to the annual-dollar value it actually sits at, independent of
  // whatever value the component's own tick-generation code produced.
  const x = scaleLinear(
    [analysis.points[0].earnings, analysis.points[analysis.points.length - 1].earnings],
    [M.left, W - M.right],
  );

  it("places every month-unit tick label at its true position (label x 12, in dollars, matches the annual value at that pixel)", () => {
    const { container } = render(<CurveChart analysis={analysis} ctx={{ unit: "month" }} />);
    const xTickEls = [...container.querySelectorAll("text.x-tick")];
    expect(xTickEls.length).toBeGreaterThanOrEqual(2);
    for (const el of xTickEls) {
      const px = Number(el.getAttribute("x"));
      const annualAtPosition = x.invert(px);
      const match = (el.textContent ?? "").match(/^\$(\d+)k$/);
      expect(match).toBeTruthy();
      const annualFromLabel = Number(match![1]) * 1000 * 12;
      // The label rounds to the nearest $1k/month; half that step x 12
      // months is the maximum rounding slop we should ever see.
      expect(Math.abs(annualFromLabel - annualAtPosition)).toBeLessThanOrEqual(500 * 12);
    }
  });

  it("places every hour-unit tick label at its true position (label x hours x 52, in dollars, matches the annual value at that pixel)", () => {
    const { container } = render(<CurveChart analysis={analysis} ctx={{ unit: "hour", hoursPerWeek: 40 }} />);
    const xTickEls = [...container.querySelectorAll("text.x-tick")];
    expect(xTickEls.length).toBeGreaterThanOrEqual(2);
    for (const el of xTickEls) {
      const px = Number(el.getAttribute("x"));
      const annualAtPosition = x.invert(px);
      const match = (el.textContent ?? "").match(/^\$(\d+)$/);
      expect(match).toBeTruthy();
      const annualFromLabel = Number(match![1]) * 40 * 52;
      // The label rounds to the nearest whole dollar/hour; half that step x
      // hours x 52 weeks is the maximum rounding slop we should ever see.
      expect(Math.abs(annualFromLabel - annualAtPosition)).toBeLessThanOrEqual(0.5 * 40 * 52);
    }
  });
});
