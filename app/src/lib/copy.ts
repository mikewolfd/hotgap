// The copy shape every surface reads, the locale files that hold it, and the
// one reader (app/README.md § Languages; audit D13 decided the shape on
// 2026-09-17, this module carries it into the locale files).
//
// THE SHAPE. A locale file (src/i18n/<locale>.json) is one nest of ICU
// MessageFormat messages, namespaced by surface (`editor`, `citizen`,
// `caseworker`, `places`, `shared`), and nothing else — no function, no
// number, no formatter. A leaf is a whole message: a sentence, a label, a
// heading, with its values as named arguments ({pay}, {state}). Where a
// message has variants they are one ICU `plural` or `select` — the count or
// the select value is an argument the code hands over, and the locale's own
// CLDR rules choose the branch (`{n, plural, one {# child} other {# children}}`);
// the code never picks a plural form. A nest of labels keyed by a data
// value (a chip's id, a program's id, an immigration status) stays a nest,
// and the key path is the message id. English is the source of truth: a new
// language is a copy of en.json, translated; `_` at the top is the file's
// own record (its language, its status, its date), never a message.
//
// WHAT THE CODE DOES, NEVER THE COPY. Formatting: every argument arrives
// formatted — money, a date, a list, a pay figure in the person's unit — by
// lib/format.ts through Intl in the active locale, and is handed to the
// message as a string; a raw number is handed over only as a plural's or
// select's selector. Composition: only whole sentences are ever joined (with
// a space, in the order the surface reads them) and only lists are ever
// joined (through Intl.ListFormat); a clause is never an argument. An
// argument may carry another message's rendering only when that message is
// a name or a phrase — a program's, a county's — the way a value would.
//
// THE READER. `fill` formats a message through intl-messageformat in the
// active locale and throws on an argument left unfilled, a param with no
// argument, so a sentence can never reach the page half-filled (the
// archive's t.ts, design/PORT-FROM-ARCHIVE-2026-09-16.md M1); `parts` is
// the same for a renderer that marks an argument up; `bind` gives a module
// its `t(key, params)` over dotted keys. A compiled message is cached per
// source string, so a render is O(messages), not O(parses).
//
// THE LOCALE. Resolved once per page load, before any module reads a message
// (the top-level await below holds every importer until the catalog is in):
// `?lang=` in the URL, else the viewer's remembered choice, else the
// browser's languages, else `en`. Every locale is a lazy chunk, `en`
// included, so a page ships no catalog it does not read; a locale other than
// English is laid over English so an untranslated message still renders (the
// pseudo-locale gate catches one that stays English). `qps-ploc` is not a
// file: it is `en` accented, bracketed and lengthened at load time, through
// this same path, so the e2e can render every page in it.
import type { Coded, LiheapLimit } from "@hotgap/core";
import { IntlMessageFormat, PART_TYPE } from "intl-messageformat";

export type Params = Record<string, string | number>;
export type Part = { text: string } | { slot: string; text: string };
/** The whole catalog's shape: en.json's, which every other locale mirrors, with core's messages under `core`. */
export type Catalog = Omit<typeof import("../i18n/en.json"), "_"> & { core: Omit<typeof import("../../../core/src/messages/en.json"), "_"> };

/** The languages the switch offers, in its order; a new language is added here and as its file. */
export const LANGUAGES = ["en", "es-US"] as const;
export type Language = (typeof LANGUAGES)[number];
/** The gate's pseudo-locale: generated, never a file, never in the switch. */
export const PSEUDO = "qps-ploc";
/** The `?lang=` parameter, a machine contract like the household flags. */
export const LANG_PARAM = "lang";
const STORAGE_KEY = "hotgap.lang";

// ── The active locale ──────────────────────────────────────────────────

/** The BCP 47 tag every Intl call and every message renders in ("en", "es-US", or the pseudo-locale). */
let active: string = "en";
export const locale = (): string => active;
/** The tag Intl formats in: `en` is en-US (the site's household is American), and the pseudo-locale is English with its letters replaced, so its numbers and dates are English. */
export const intlLocale = (): string => (active === PSEUDO || active === "en" ? "en-US" : active);

/** A tag the site can serve: a language in the switch, the pseudo-locale, or the base language of a regional tag it knows ("es-MX" → "es-US"). */
export function supported(tag: string | null | undefined): Language | typeof PSEUDO | null {
  if (!tag) return null;
  if (tag === PSEUDO) return PSEUDO;
  const lower = tag.toLowerCase();
  const exact = LANGUAGES.find((l) => l.toLowerCase() === lower);
  if (exact) return exact;
  const base = lower.split("-")[0];
  return LANGUAGES.find((l) => l.toLowerCase().split("-")[0] === base) ?? null;
}

/** The locale this page load renders in, by the rule in the header: the URL, the remembered choice, the browser, English. */
export function resolveLocale(search: string, remembered: string | null, browser: readonly string[]): string {
  const fromUrl = supported(new URLSearchParams(search).get(LANG_PARAM));
  if (fromUrl) return fromUrl;
  const fromMemory = supported(remembered);
  if (fromMemory) return fromMemory;
  for (const tag of browser) { const l = supported(tag); if (l) return l; }
  return "en";
}

const remembered = (): string | null => { try { return localStorage.getItem(STORAGE_KEY); } catch { return null; } };
const remember = (tag: string): void => { try { if (tag !== PSEUDO) localStorage.setItem(STORAGE_KEY, tag); } catch { /* a convenience only */ } };

// ── The catalog ────────────────────────────────────────────────────────

type Nest = { [k: string]: string | string[] | Nest };
const files = import.meta.glob<Nest>("../i18n/*.json", { import: "default" });
const coreFiles = import.meta.glob<Nest>("../../../core/src/messages/*.json", { import: "default" });

/** `over` laid on `base`, leaf by leaf, so a message missing from a translation is the base's. */
function overlay(base: Nest, over: Nest | undefined): Nest {
  if (!over) return base;
  const out: Nest = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = base[k];
    out[k] = typeof v === "string" || Array.isArray(v) ? v : overlay(typeof b === "object" && !Array.isArray(b) ? b : {}, v);
  }
  return out;
}

const load = async (table: Record<string, () => Promise<Nest>>, dir: string, tag: string): Promise<Nest | undefined> => table[`${dir}/${tag}.json`]?.();

/** The catalog for a tag: the app's file over English, core's messages under `core`, the pseudo-locale derived from English. */
export async function loadCatalog(tag: string): Promise<Catalog> {
  const base = tag === PSEUDO ? "en" : tag;
  const [en, coreEn, own, coreOwn] = await Promise.all([load(files, "../i18n", "en"), load(coreFiles, "../../../core/src/messages", "en"), base === "en" ? undefined : load(files, "../i18n", base), base === "en" ? undefined : load(coreFiles, "../../../core/src/messages", base)]);
  if (!en) throw new Error("en.json is missing");
  const { _: _meta, ...app } = overlay(en, own);
  const { _: _coreMeta, ...core } = coreEn ? overlay(coreEn, coreOwn) : {};
  const nest: Nest = { ...app, core };
  return (tag === PSEUDO ? (await import("./pseudo.js")).pseudoCatalog(nest) : nest) as unknown as Catalog;
}

const inBrowser = typeof document !== "undefined" && typeof location !== "undefined";
/** Whether this page load was asked for a language (`?lang=`): that is the viewer's choice, the one thing remembered, and the one link parameter carried on. */
const asked = inBrowser && supported(new URLSearchParams(location.search).get(LANG_PARAM)) !== null;
active = inBrowser ? resolveLocale(location.search, remembered(), navigator.languages ?? []) : "en";
if (inBrowser) {
  if (asked) remember(active);
  document.documentElement.lang = active;
  document.documentElement.dir = direction(active);
}
/** Every message the active locale has, the shape of en.json; every copy module is a view into it. */
export const catalog: Catalog = await loadCatalog(active);

/** The writing direction of a tag, for `<html dir>`: Intl's where the browser has it, a short list otherwise. */
export function direction(tag: string): "ltr" | "rtl" {
  try {
    const info = (new Intl.Locale(tag) as Intl.Locale & { getTextInfo?: () => { direction: string }; textInfo?: { direction: string } });
    const d = info.getTextInfo?.().direction ?? info.textInfo?.direction;
    if (d === "rtl" || d === "ltr") return d;
  } catch { /* an unknown tag reads left to right */ }
  return /^(ar|he|fa|ur|ps|sd|ug|yi|dv)(-|$)/i.test(tag) ? "rtl" : "ltr";
}

/** `params` with the language carried, so every address a page writes keeps it: the tag that was asked for, or the one a remembered choice or the browser resolved when it is not English. */
export function withLang(params: URLSearchParams): URLSearchParams {
  if (asked || active !== "en") params.set(LANG_PARAM, active); else params.delete(LANG_PARAM);
  return params;
}

/** A language's own name for itself ("English", "Español"), from Intl, capitalized the way a switch prints it. */
export function languageName(tag: string): string {
  const name = new Intl.DisplayNames(tag, { type: "language" }).of(tag.split("-")[0]) ?? tag;
  return name.charAt(0).toLocaleUpperCase(tag) + name.slice(1);
}

// ── The reader ─────────────────────────────────────────────────────────

type Ast = ReturnType<IntlMessageFormat["getAst"]>;
/** The parser's element, by the fields this module reads (its TYPE enum: 0 literal, 1 argument, 5 select, 6 plural; a plural's options hold branches). */
type El = { type: number; value?: string; options?: Record<string, { value: Ast }>; children?: Ast };
const enum T { literal = 0, select = 5, plural = 6 }

interface Compiled { mf: IntlMessageFormat; args: Set<string>; selectors: Set<string> }
const compiled = new Map<string, Compiled>();

/** Every argument a message names, and which of them choose a plural or select branch (those are handed over raw, the rest as text). */
function walk(els: Ast, args: Set<string>, selectors: Set<string>): void {
  for (const el of els as unknown as El[]) {
    if (el.type === T.literal) continue;
    if (typeof el.value === "string") args.add(el.value);
    if (el.type === T.plural || el.type === T.select) { selectors.add(el.value as string); for (const o of Object.values(el.options ?? {})) walk(o.value, args, selectors); }
    if (el.children) walk(el.children, args, selectors);
  }
}

function compile(text: string): Compiled {
  let c = compiled.get(text);
  if (!c) {
    const mf = new IntlMessageFormat(text, intlLocale(), undefined, { ignoreTag: true });
    const args = new Set<string>(), selectors = new Set<string>();
    walk(mf.getAst(), args, selectors);
    c = { mf, args, selectors };
    compiled.set(text, c);
  }
  return c;
}

/** The archive's contract (M1): every argument given, every param an argument. */
function checked(text: string, params: Params): Compiled {
  const c = compile(text);
  for (const k of c.args) if (!(k in params)) throw new Error(`missing param {${k}} in "${text}"`);
  for (const k in params) if (!c.args.has(k)) throw new Error(`unknown param ${k} for "${text}"`);
  return c;
}

/** A message with its params: a selector stays a number for the CLDR rule, everything else is text as it arrived. */
export function fill(text: string, params: Params = {}): string {
  const c = checked(text, params);
  const values: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) values[k] = c.selectors.has(k) ? v : String(v);
  return c.mf.format(values) as string;
}

/** A message as parts, each argument its own part, so a renderer can mark it up; the same checks as fill(). */
export function parts(text: string, params: Params = {}): Part[] {
  const c = checked(text, params);
  const values: Record<string, string | number | Part> = {};
  for (const [k, v] of Object.entries(params)) values[k] = c.selectors.has(k) ? v : { slot: k, text: String(v) };
  const out: Part[] = [];
  for (const p of c.mf.formatToParts<Part>(values)) {
    if (p.type === PART_TYPE.literal) { const last = out[out.length - 1]; if (last && !("slot" in last)) last.text += p.value; else out.push({ text: p.value }); }
    else out.push(p.value);
  }
  return out;
}

const at = (copy: object, key: string): unknown => key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], copy);

/** The message at a dotted key ("steps.ends") in `copy`, filled; a key that is not a message throws. */
export function bind(copy: object): (key: string, params?: Params) => string {
  return (key, params) => {
    const s = at(copy, key);
    if (typeof s !== "string") throw new Error(`missing string ${key}`);
    return fill(s, params);
  };
}

/**
 * A sentence core wrote, in the active language: its code rendered from
 * `core.*` (core/src/messages/<locale>.json), else the English core sent —
 * a file older than the catalog carries no code, and a code the catalog
 * does not know renders as core said it. `overrides` replaces a parameter
 * core rendered in English with the surface's own rendering (the LIHEAP
 * limit, which the coverage block also carries as data).
 */
export function coreText(m: Coded | undefined, fallback: string, overrides: Params = {}): string {
  const s = m && at(catalog.core, m.code);
  if (typeof s !== "string") return fallback;
  const params: Params = { ...m!.params };
  for (const k in overrides) if (k in params) params[k] = overrides[k];
  return fill(s, params);
}

/** When a deferred loss lands, from its reason (core's Deferral.until, in the active language). */
export const deferralUntil = (reason: string): string => (catalog.core.deferral as Record<string, string>)[reason];

/** A LIHEAP limit in words, from the coverage block's structured limit (core's liheapLimitWords, in the active language). */
export function limitWords(limit: LiheapLimit): string {
  const L = catalog.core.liheap.limit;
  switch (limit.kind) {
    case "fpg": return fill(L.fpg, { pct: limit.pct });
    case "smi": return limit.vintage ? fill(L.smiVintage, { pct: limit.pct, vintage: limit.vintage }) : fill(L.smi, { pct: limit.pct });
    case "smi-by-size": return fill(L.smiBySize, { from: limit.pct[0], to: limit.pct[limit.pct.length - 1] });
  }
}
