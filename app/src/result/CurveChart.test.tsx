// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parsePEResponse, analyzeCurve } from "@hotgap/shared";
import { CurveChart } from "./CurveChart.js";

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
