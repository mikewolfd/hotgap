import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SummaryJson } from "@hotgap/core";
import { answerParts, answerText, holdsText } from "./answer.js";
import { archLabel, describeFor, group, measureByKey, roadSpan, rowsFor } from "./model.js";
import { householdPhrase } from "./words.js";

const summary = JSON.parse(readFileSync(new URL("../../../core/data/summary.json", import.meta.url), "utf8")) as SummaryJson;
const arch = (id: string) => summary.archetypes.find((a) => a.id === id)!;
const keepRate = measureByKey("keepRate")!;
const scene = (id: string) => {
  const rows = rowsFor(summary, arch(id), keepRate);
  return { arch: arch(id), measure: keepRate, rows, g: group(rows, keepRate) };
};
const states = Object.keys(summary.states);

describe("the keep-rate headline on the committed sweep", () => {
  it("counts the states that end the climb poorer, and how many of them are poorer before the step out of twice poverty", () => {
    expect(answerText(scene("single-2"))).toBe(
      "In 26 of the 50 states and the District of Columbia, a single parent of two children climbing from the poverty line to twice it ends up poorer than they started — 20 of them before the step out of twice poverty.");
    // The one keyed figure is still the count the map shades.
    expect(answerParts(scene("single-2")).flatMap((p) => ("slot" in p && p.key ? [p.text] : []))).toEqual(["26"]);
  });
});

describe("the two money-kept headlines on the committed sweep", () => {
  const levelScene = (key: "netAtRoadLo" | "netAtRoadHi") => {
    const measure = measureByKey(key)!, rows = rowsFor(summary, arch("single-2"), measure);
    return { arch: arch("single-2"), measure, rows, g: group(rows, measure) };
  };
  it("names the state that keeps least and the one that keeps most, at the line and at twice it", () => {
    const lo = levelScene("netAtRoadLo"), hi = levelScene("netAtRoadHi");
    const [loTop, loBest] = [lo.g.ranked[0], lo.g.ranked[lo.g.ranked.length - 1]];
    // The ranking leads with the LOWEST figure.
    expect(lo.g.ranked.every((r, i) => i === 0 || (r.value as number) >= (lo.g.ranked[i - 1].value as number))).toBe(true);
    expect(answerText(lo)).toMatch(/^At the poverty line, a single parent of two children keeps least in [A-Z][a-zA-Z ]+ \(\$[\d,]+ a year\) and most in [A-Z][a-zA-Z ]+ \(\$[\d,]+\)\.$/);
    expect(answerText(lo)).toContain(`(${"$" + (loTop.value as number).toLocaleString("en-US")} a year)`);
    expect(answerText(lo)).toContain(`(${"$" + (loBest.value as number).toLocaleString("en-US")})`);
    expect(answerText(hi)).toMatch(/^At twice the poverty line, a single parent of two children keeps least in /);
    // The keyed figure is the worst state's, drawn on the darkest step.
    expect(answerParts(lo).flatMap((p) => ("slot" in p && p.key ? [p.text] : []))).toEqual(["$" + (loTop.value as number).toLocaleString("en-US")]);
    expect(lo.g.bins.classes[lo.g.bins.index(loTop.value as number)].ramp).toBe(4);
  });
  it("names the pay each level is read at, in the household's dollars", () => {
    const rows = scene("single-2").rows;
    expect(describeFor(measureByKey("netAtRoadLo")!, rows)).toMatch(/with pay at the poverty line \(\$27,000\)\.$/);
    expect(describeFor(measureByKey("netAtRoadHi")!, rows)).toMatch(/with pay at twice the poverty line \(\$55,000\)\.$/);
  });
});

describe("the holds line under the answer", () => {
  it("names the rent, the care and the programs the sweep counts, from core's answersFor", () => {
    expect(holdsText(arch("single-2"), states)).toBe(
      "Every state's rules applied to the same family: renting at the county's typical rent, paying center-based care for both children, and getting the child-care subsidy, SNAP, TANF, Medicaid, and WIC.");
    expect(holdsText(arch("single-1"), states)).toContain("paying center-based care for the child, and getting the child-care subsidy");
    expect(holdsText(arch("married-dual-3"), states)).toContain("paying center-based care for all three children, and");
  });
  it("drops the care clause and the subsidy for a household that pays no care", () => {
    expect(holdsText(arch("married-2"), states)).toBe(
      "Every state's rules applied to the same family: renting at the county's typical rent, and getting SNAP, TANF, Medicaid, and WIC.");
    expect(holdsText(arch("single-0"), states)).not.toContain("child-care subsidy");
  });
  it("says nothing for a household core does not sweep, and leaves the subsidy out of the twin's", () => {
    expect(holdsText({ id: "gone-2", married: false, childAges: [3, 7] }, states)).toBeNull();
    expect(holdsText({ id: "single-2-nosub", married: false, childAges: [3, 7] }, states)).toBe(
      "Every state's rules applied to the same family: renting at the county's typical rent, paying center-based care for both children, and getting SNAP, TANF, Medicaid, and WIC.");
  });
});

describe("the no-subsidy twin's words", () => {
  it("labels the menu entry and the sentence's household", () => {
    const twin = { id: "single-2-nosub", married: false, childAges: [3, 7] };
    expect(archLabel(twin)).toBe("1 adult, 2 children (3 and 7), no child-care help");
    expect(householdPhrase(false, false, [3, 7], true)).toBe("a single parent of two children with no child-care help");
  });
});

describe("the keep rate names its road in the household's dollars", () => {
  it("reads the modal span off the rows and says Alaska and Hawaii run higher", () => {
    const rows = scene("single-2").rows;
    expect(roadSpan(rows)).toEqual({ lo: 27000, hi: 55000, differs: true });
    expect(describeFor(keepRate, rows)).toBe(
      "Of each extra dollar earned from the poverty line ($27,000) to just past twice it ($55,000) — higher in Alaska and Hawaii — the cents this household keeps once taxes and lost benefits are counted. Below zero it ends up poorer than it started.");
  });
  it("says the span plainly where every state shares it, and leaves the other measures' words alone", () => {
    const rows = scene("single-2").rows.filter((r) => r.st !== "AK" && r.st !== "HI");
    expect(describeFor(keepRate, rows)).toMatch(/^Of each extra dollar earned from the poverty line \(\$27,000\) to just past twice it \(\$55,000\), the cents/);
    expect(describeFor(keepRate, [])).toMatch(/^Of each extra dollar earned between the poverty line and twice the poverty line, the cents/);
    expect(describeFor(measureByKey("leap")!, rows)).toBe(measureByKey("leap")!.describe);
  });
});
