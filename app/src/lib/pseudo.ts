// The gate's pseudo-locale, `qps-ploc` (app/README.md § Languages): every
// English message with its letters accented, the whole wrapped in brackets,
// and its text lengthened by two fifths — Spanish runs about three tenths
// longer than English, so a layout that survives this survives a real
// language — with every ICU argument, plural and select kept as it was, so
// the same code renders it through the same reader. Loaded only when the
// URL asks for it (lib/copy.ts loadCatalog), so it costs a page nothing.
//
// What the render then proves: a string that still reads as English came
// from code, not from the catalog (e2e/i18n.spec.ts), and a control that
// assumed English width overflows here before it does in Spanish.
import { IntlMessageFormat } from "intl-messageformat";

type Nest = { [k: string]: string | string[] | Nest };
type Ast = ReturnType<IntlMessageFormat["getAst"]>;
type El = { type: number; value?: string; options?: Record<string, { value: Ast }>; offset?: number; pluralType?: string; style?: unknown };

const ACCENT: Record<string, string> = {
  a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ", i: "í", j: "ĵ", k: "ķ", l: "ļ", m: "ɱ", n: "ñ", o: "ó", p: "þ", q: "ʠ", r: "ř", s: "š", t: "ŧ", u: "ú", v: "ṽ", w: "ŵ", x: "ẋ", y: "ý", z: "ž",
  A: "Á", B: "Ɓ", C: "Ç", D: "Ð", E: "É", F: "Ƒ", G: "Ĝ", H: "Ĥ", I: "Í", J: "Ĵ", K: "Ķ", L: "Ļ", M: "Ɱ", N: "Ñ", O: "Ó", P: "Þ", Q: "Ǫ", R: "Ř", S: "Š", T: "Ŧ", U: "Ú", V: "Ṽ", W: "Ŵ", X: "Ẋ", Y: "Ý", Z: "Ž",
};
const accent = (s: string): string => s.replace(/[A-Za-z]/g, (ch) => ACCENT[ch] ?? ch);

/** ICU's quoting of a literal, so the printed message parses back: an apostrophe before a brace, a literal brace, a `#` in a plural branch. */
const quote = (s: string, inPlural: boolean): string => {
  let out = s.replace(/'(?=[{}'#])/g, "''").replace(/[{}]/g, (b) => `'${b}'`);
  if (inPlural) out = out.replace(/#/g, "'#'");
  return out;
};

/** The message source printed back from its AST, its literal text run through `text`. */
function print(els: Ast, text: (s: string) => string, inPlural: boolean): string {
  return (els as unknown as El[]).map((el) => {
    switch (el.type) {
      case 0: return quote(text(el.value as string), inPlural);
      case 1: return `{${el.value}}`;
      case 2: case 3: case 4: return `{${el.value}, ${["", "", "number", "date", "time"][el.type]}${typeof el.style === "string" ? `, ${el.style}` : ""}}`;
      case 5: return `{${el.value}, select, ${Object.entries(el.options ?? {}).map(([k, o]) => `${k} {${print(o.value, text, inPlural)}}`).join(" ")}}`;
      case 6: return `{${el.value}, ${el.pluralType === "ordinal" ? "selectordinal" : "plural"}, ${el.offset ? `offset:${el.offset} ` : ""}${Object.entries(el.options ?? {}).map(([k, o]) => `${k} {${print(o.value, text, true)}}`).join(" ")}}`;
      case 7: return "#";
      default: throw new Error(`pseudo-locale: unexpected element type ${el.type}`);
    }
  }).join("");
}

/** One message: accented, lengthened by two fifths of its letters, bracketed. */
export function pseudo(message: string): string {
  const ast = new IntlMessageFormat(message, "en", undefined, { ignoreTag: true }).getAst();
  const letters = message.replace(/\{[^}]*\}/g, "").replace(/[^A-Za-z]/g, "").length;
  const filler = letters ? ` ${"~".repeat(Math.ceil(letters * 0.4))}` : "";
  return `[${print(ast, accent, false)}${filler}]`;
}

/** The whole catalog, every leaf through pseudo(). */
export function pseudoCatalog(nest: Nest): Nest {
  return Object.fromEntries(Object.entries(nest).map(([k, v]) => [k, typeof v === "string" ? pseudo(v) : Array.isArray(v) ? v.map(pseudo) : pseudoCatalog(v)]));
}
