import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, test } from "vitest";
import { copy, fill, parts, t } from "./copy.js";

describe("t()", () => {
  test("fills a dotted key", () => {
    expect(t("again", { from: "$54,000", to: "$67,000" })).toBe("Further up, from $54,000 to $67,000, a raise again doesn't leave you better off than you were at $54,000.");
  });
  test("throws on a missing key, a missing param, an unknown param", () => {
    expect(() => t("no.such.key")).toThrow(/missing string/);
    expect(() => t("again", { from: "$1" })).toThrow(/missing param \{to\}/);
    expect(() => t("tryAgain", { extra: 1 })).toThrow(/unknown param extra/);
  });
  test("parts() keeps each slot as its own part with the same checks", () => {
    expect(parts("Paid {pay}, you keep {kept}.", { pay: "$1", kept: "$2" })).toEqual([
      { text: "Paid " }, { slot: "pay", text: "$1" }, { text: ", you keep " }, { slot: "kept", text: "$2" }, { text: "." },
    ]);
    expect(() => parts("Paid {pay}.", {})).toThrow(/missing param/);
  });
  test("every catalog string is an ICU message or a nest of them, and every argument is a plain word", () => {
    const walk = (o: unknown, path: string) => {
      if (typeof o === "string") {
        expect(() => new IntlMessageFormat(o, "en", undefined, { ignoreTag: true }), `${path}: ${o}`).not.toThrow();
        for (const m of o.matchAll(/\{([A-Za-z]*)[,}]/g)) expect(m[1], `${path}: ${o}`).toMatch(/^[A-Za-z]+$/);
        return;
      }
      expect(typeof o, path).toBe("object");
      for (const [k, v] of Object.entries(o as object)) walk(v, `${path}.${k}`);
    };
    walk(copy, "copy");
  });
  test("fill leaves no slot behind", () => {
    expect(fill("a {b} c", { b: "x" })).toBe("a x c");
  });
});
