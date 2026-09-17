import { describe, expect, test } from "vitest";
import en from "../i18n/en.json";
import { catalog, fill, loadCatalog, parts, pluralKey, resolveLocale, supported } from "./copy.js";
import { pseudo } from "./pseudo.js";

type Nest = { [k: string]: string | string[] | Nest };
const leaves = (o: Nest | string | string[], path = ""): [string, string][] =>
  typeof o === "string" ? [[path, o]] : Array.isArray(o) ? o.map((s, i) => [`${path}[${i}]`, s] as [string, string]) : Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));

describe("the reader", () => {
  test("a plural message chooses its branch by the locale's rule, the count handed over raw", () => {
    expect(fill("{n, plural, one {# child} other {# children}}", { n: 1 })).toBe("1 child");
    expect(fill("{n, plural, one {# child} other {# children}}", { n: 3 })).toBe("3 children");
    expect(fill("{n, plural, =0 {none} one {one} other {{n} of them}}", { n: 0 })).toBe("none");
  });
  test("a number that is not a selector is text as it arrived, never regrouped", () => {
    expect(fill("Rules for {year}.", { year: 2026 })).toBe("Rules for 2026.");
  });
  test("throws on a missing argument, an unknown param, whatever branch holds it", () => {
    expect(() => fill("{n, plural, one {a} other {{state}}}", { n: 1 })).toThrow(/missing param \{state\}/);
    expect(() => fill("plain", { extra: 1 })).toThrow(/unknown param extra/);
  });
  test("parts() marks an argument up through a plural branch", () => {
    expect(parts("{n, plural, one {Paid {pay}.} other {Paid {pay}, {n} times.}}", { n: 2, pay: "$1" })).toEqual([
      { text: "Paid " }, { slot: "pay", text: "$1" }, { text: ", 2 times." },
    ]);
  });
  test("pluralKey is the active locale's category", () => {
    expect(pluralKey(1)).toBe("one");
    expect(pluralKey(2)).toBe("other");
  });
});

describe("the locale", () => {
  test("resolves the URL first, then the remembered choice, then the browser, then English", () => {
    expect(resolveLocale("?lang=es-US", null, [])).toBe("es-US");
    expect(resolveLocale("?lang=es-MX", null, [])).toBe("es-US");
    expect(resolveLocale("?lang=qps-ploc", "es-US", [])).toBe("qps-ploc");
    expect(resolveLocale("?lang=xx", "es-US", [])).toBe("es-US");
    expect(resolveLocale("", null, ["fr", "es", "en"])).toBe("es-US");
    expect(resolveLocale("", null, ["fr"])).toBe("en");
    expect(supported("EN")).toBe("en");
  });
  test("the default catalog is English, every namespace in", () => {
    for (const ns of ["editor", "citizen", "caseworker", "places", "shared"]) expect(catalog).toHaveProperty(ns);
    expect(catalog.citizen.tryAgain).toBe("Try again");
  });
  test("a translation is laid over English, so a message it lacks still renders", async () => {
    const es = await loadCatalog("es-US");
    expect(es.citizen.tryAgain).not.toBe("");
    for (const [path] of leaves(en as unknown as Nest)) {
      if (path.startsWith("_")) continue;
      const v = path.split(/[.[\]]+/).filter(Boolean).reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], es);
      expect(typeof v, path).toBe("string");
    }
  });
});

describe("the pseudo-locale", () => {
  test("accents, brackets and lengthens every English message and keeps its arguments", () => {
    const messages = leaves(en as unknown as Nest).filter(([p]) => !p.startsWith("_"));
    expect(messages.length).toBeGreaterThan(900);
    for (const [path, m] of messages) {
      const p = pseudo(m);
      expect(p, path).toMatch(/^\[.*\]$/s);
      // The same arguments, the same plural and select structure: the pseudo message formats with the params English does.
      const params = Object.fromEntries([...m.matchAll(/\{([A-Za-z]+)(?:,|\})/g)].map((x) => [x[1], new RegExp(`\\{${x[1]}, (?:plural|selectordinal)`).test(m) ? 2 : "v"]));
      expect(() => fill(p, params), path).not.toThrow();
      expect(fill(p, params), path).not.toMatch(/[a-zA-Z]{4,}/);
    }
  });
  test("keeps a literal brace and a pound sign quoted", () => {
    expect(fill(pseudo("A '{'b'}' and {n, plural, one {'#'1} other {# more}}"), { n: 1 })).toBe("[Á {ƀ} áñð #1 ~~~~]");
  });
});
