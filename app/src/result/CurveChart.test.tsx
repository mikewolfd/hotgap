// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { scaleLinear } from "d3-scale";
import { parsePEResponse, analyzeCurve } from "@hotgap/shared";
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
