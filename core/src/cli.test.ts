import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./cli.js";
import { loadSummary } from "./data.js";
import { evaluateCurve, evaluateOffline } from "./evaluate.js";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import { parsePEResponse } from "./parse.js";
import { readFileSync } from "node:fs";

vi.mock("./evaluate.js", async (original) => ({ ...await original<object>(), evaluateOffline: vi.fn() }));
vi.mock("./data.js", async (original) => ({ ...await original<object>(), loadSummary: vi.fn() }));

const a = answersFor("MA", ARCHETYPES.find((a) => a.id === "married-3")!);
const raw = JSON.parse(readFileSync(new URL("../../docs/upstream/evidence/local-ma-tafdc.response.json", import.meta.url), "utf8"));
const ev = evaluateCurve(a, { year: "2026", currentEarnings: 26000, points: parsePEResponse(raw, 11) }, "archetype");

afterEach(() => vi.restoreAllMocks());

describe("CLI correction notices", () => {
  it("prints the MA approximation in the curve report and keeps JSON machine-readable", async () => {
    vi.mocked(evaluateOffline).mockReturnValue(ev);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const args = ["curve", "--state", "MA", "--married", "--kids", "1,4,9", "--earnings", "26000", "--offline"];
    expect(await main(args)).toBe(0);
    expect(log.mock.calls[0][0]).toContain(ev.maTafdc!.message);
    log.mockClear();
    expect(await main([...args, "--json"])).toBe(0);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0]).maTafdc.status).toBe("applied");
  });

  it("prints the same approximation with the summary rankings", async () => {
    vi.mocked(loadSummary).mockReturnValue({
      generated: "g", year: "2026", archetypes: [], states: { MA: { "married-3": {
        biggestLoss: 0, dangerWidth: 0, cliffCount: 0, safeExit: 0, leap: 0, leapIsLowerBound: false,
        maTafdc: ev.maTafdc!,
      } } },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["summary", "--state", "MA"])).toBe(0);
    expect(log.mock.calls.flat()).toContain(ev.maTafdc!.message);
  });
});
