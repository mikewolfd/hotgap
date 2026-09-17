import { describe, expect, it } from "vitest";
import { applyDiff, diffFlags, sameDiff, whatIfLabel } from "./scenarios.js";

const base = { zip: "80903", kids: "3,7", pay: "38000", unit: "year", "childcare-subsidy": true } as const;

describe("a what-if as a diff from the base", () => {
  it("is the flags that changed, with null for one the what-if removes, and applies back to the base", () => {
    expect(diffFlags(base, { ...base, pay: "55000" })).toEqual({ pay: "55000" });
    expect(diffFlags(base, { zip: "80903", kids: "3,7", pay: "38000", unit: "year" })).toEqual({ "childcare-subsidy": null });
    expect(diffFlags(base, { ...base, housing: true })).toEqual({ housing: true });
    expect(diffFlags(base, base)).toEqual({});
    expect(applyDiff(base, { "childcare-subsidy": null, pay: "55000" })).toEqual({ zip: "80903", kids: "3,7", pay: "55000", unit: "year" });
    expect(applyDiff(base, { married: true })).toEqual({ ...base, married: true });
  });
  it("tells two diffs apart by their keys and values", () => {
    expect(sameDiff({ pay: "55000" }, { pay: "55000" })).toBe(true);
    expect(sameDiff({ pay: "55000" }, { pay: "56000" })).toBe(false);
    expect(sameDiff({ housing: true }, { housing: null })).toBe(false);
    expect(sameDiff({ housing: true }, { housing: true, pay: "1" })).toBe(false);
  });
  it("names the column in the caseworker register", () => {
    expect(whatIfLabel({ "childcare-subsidy": null }, base)).toBe("CCDF subsidy off");
    expect(whatIfLabel({ housing: true }, base)).toBe("Housing voucher on");
    expect(whatIfLabel({ "no-snap": true }, base)).toBe("SNAP off");
    expect(whatIfLabel({ married: true }, base)).toBe("Married");
    expect(whatIfLabel({ pay: "55000" }, { ...base, pay: "55000" })).toBe("Pay $55,000 a year");
    expect(whatIfLabel({ pay: "18.5" }, { pay: "18.5", unit: "hour" })).toBe("Pay $18.50 an hour");
    expect(whatIfLabel({ rent: "1200" }, base)).toBe("Rent $1,200 a month");
    expect(whatIfLabel({ savings: "5000" }, base)).toBe("Savings $5,000");
    expect(whatIfLabel({ kids: "3,7,9" }, base)).toBe("Children 3, 7, & 9");   /* the locale's short list (Intl), since audit D13 */
    expect(whatIfLabel({ status: "lpr", "years-in-us": "3" }, base)).toBe("Status Has a green card (permanent resident), Years in the US 3");
    expect(whatIfLabel({ ssdi: null }, base)).toBe("SSDI cleared");
    expect(whatIfLabel({ zip: null, state: "tx" }, { ...base, zip: undefined, state: "tx" })).toBe("Place TX");
    expect(whatIfLabel({ zip: "78701" }, { ...base, zip: "78701" })).toBe("Place 78701");
  });
});
