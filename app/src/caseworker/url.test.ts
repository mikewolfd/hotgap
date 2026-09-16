import { describe, expect, it } from "vitest";
import { diffQuery, pageQuery, parseDiff, parsePage } from "./url.js";

describe("the comparison in the query string", () => {
  it("round-trips the base household and every what-if", () => {
    const s = { base: { zip: "80903", kids: "3,7", pay: "38000", unit: "year", "childcare-subsidy": true }, whatIfs: [{ pay: "55000" }, { "childcare-subsidy": null }, { married: true }] };
    const q = pageQuery(s);
    expect(q).toBe("?zip=80903&kids=3%2C7&pay=38000&unit=year&childcare-subsidy=1&whatif=pay%3D55000&whatif=childcare-subsidy%3D&whatif=married%3D1");
    expect(parsePage(q)).toEqual(s);
  });
  it("reads a boolean's off and a figure's clearing as null, and ignores what is not a household flag", () => {
    expect(parseDiff("housing=0")).toEqual({ housing: null });
    expect(parseDiff("housing=")).toEqual({ housing: null });
    expect(parseDiff("housing=1&fizz=buzz")).toEqual({ housing: true });
    expect(parseDiff("rent=")).toEqual({ rent: null });
    expect(diffQuery({ housing: null, rent: "900" })).toBe("housing=&rent=900");
  });
  it("drops an empty what-if and lands on a bare base with none", () => {
    expect(parsePage("?state=co&earnings=30000&whatif=&whatif=nope%3D1")).toEqual({ base: { state: "co", earnings: "30000" }, whatIfs: [] });
    expect(parsePage("")).toEqual({ base: {}, whatIfs: [] });
  });
});
