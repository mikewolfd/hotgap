// The languages gate (app/README.md § Languages, step 7): every page rendered
// in a language that is not English, and what must be true of the render.
//
// THE PSEUDO-LOCALE. `qps-ploc` (lib/pseudo.ts) is English with every message
// accented, bracketed and two fifths longer, generated from en.json at load
// time through the same reader. Two things follow from that. A word on the
// page that still reads as English did not come from the catalog — it is
// hard-coded in a module — and the render says so without anyone having to
// read Spanish. And a layout that survives +40% survives a real language:
// Spanish runs about three tenths longer than English.
//
// SPANISH. `es-US` is then the real thing: no English sentence anywhere, the
// document's own `lang`, and every figure through Intl in es-US — the same
// dollars, formatted the locale's way, and dates and lists that are not
// English ("16 sept 2026", "3 y 7").
//
// WHAT STAYS ENGLISH, and is asserted to stay: the language switch, where a
// language names itself ("English", "Español"); a state program's name from
// the coverage block, because M3 says a name is the office's ("ConnectorCare",
// "Colorado premium assistance"); the hostname in a citation's link; and the
// two machine contracts — the CSV's column headers and the URL's parameter
// names, which are the same bytes in every language.
import { IntlMessageFormat } from "intl-messageformat";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { check, consoleErrors } from "./support.js";

const ROOT = resolve(import.meta.dirname, "../..");
/* The catalogs are read from the files, not through lib/copy.ts, which resolves its locales through Vite. */
const read = (rel: string): Nest => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8")) as Nest;
type Nest = { [k: string]: string | string[] | Nest };
const EN: Nest = { ...read("app/src/i18n/en.json"), core: read("core/src/messages/en.json") };
const ES: Nest = { ...read("app/src/i18n/es-US.json"), core: read("core/src/messages/es-US.json") };
const summary = JSON.parse(readFileSync(resolve(ROOT, "core/data/summary.json"), "utf8")) as { coverage?: Record<string, { corrections?: { premiumAssistance?: { program?: string } } }> };

const leaves = (o: Nest | string | string[], path = ""): [string, string][] =>
  typeof o === "string" ? [[path, o]] : Array.isArray(o) ? o.map((s, i) => [`${path}[${i}]`, s] as [string, string])
    : Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
const at = (o: unknown, path: string): unknown =>
  path.split(/[.[\]]+/).filter(Boolean).reduce<unknown>((x, k) => (x as Record<string, unknown> | undefined)?.[k], o);

/** Every run of literal text in a message, the arguments and the plural and select syntax left out — what a reader would see of it. */
function literals(message: string): string[] {
  const out: string[] = [];
  type El = { type: number; value?: string; options?: Record<string, { value: El[] }> };
  const walk = (els: El[]): void => {
    for (const el of els) {
      if (el.type === 0) out.push(el.value as string);
      for (const o of Object.values(el.options ?? {})) walk(o.value);
    }
  };
  walk(new IntlMessageFormat(message, "en", undefined, { ignoreTag: true }).getAst() as unknown as El[]);
  return out;
}

/**
 * The English phrases a Spanish page must not show: a run of literal text
 * from a message Spanish says differently, long enough that meeting it on the
 * page is no coincidence — three words and eighteen characters. A message
 * Spanish keeps as it is ("SNAP", "{from} → {to}", "HotGap") is not a phrase
 * to hunt: its English is the right answer in both languages.
 */
const PHRASES: string[] = [...new Set(
  leaves(EN)
    .filter(([p]) => !p.startsWith("_") && !p.startsWith("core._"))
    .filter(([p, m]) => at(ES, p) !== m)
    .flatMap(([, m]) => literals(m))
    .map((s) => s.trim())
    .filter((s) => s.length >= 18 && (s.match(/ /g)?.length ?? 0) >= 2),
)];

/** The state programs the coverage block names; a name stays as the office wrote it, in any language (M3). */
const PROGRAM_NAMES: string[] = Object.values(summary.coverage ?? {})
  .map((c) => c.corrections?.premiumAssistance?.program).filter((p): p is string => Boolean(p));

interface Seen { text: string; where: string; langNav: boolean; link: boolean }

/** Every string a reader could read: each text node, then every label attribute, with what holds it. */
const strings = (page: Page): Promise<Seen[]> => page.evaluate(() => {
  const out: { text: string; where: string; langNav: boolean; link: boolean }[] = [];
  const where = (el: Element): string => {
    const parts: string[] = [];
    for (let p: Element | null = el; p && p !== document.body; p = p.parentElement) {
      parts.unshift(p.tagName.toLowerCase() + (p.id ? `#${p.id}` : typeof p.className === "string" && p.className ? `.${p.className.split(/\s+/)[0]}` : ""));
    }
    return parts.slice(-3).join(">");
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = (n.nodeValue ?? "").trim();
    const el = n.parentElement;
    if (!text || !el) continue;
    out.push({ text, where: where(el), langNav: Boolean(el.closest(".hg-lang")), link: el.tagName === "A" });
  }
  for (const el of document.querySelectorAll("[aria-label],[title],[alt],[placeholder]")) {
    for (const a of ["aria-label", "title", "alt", "placeholder"]) {
      const v = el.getAttribute(a);
      if (v?.trim()) out.push({ text: v.trim(), where: `${where(el)}[${a}]`, langNav: Boolean(el.closest(".hg-lang")), link: false });
    }
  }
  out.push({ text: document.title, where: "<title>", langNav: false, link: false });
  return out;
});

/** A hostname standing alone as a link's words ("medicaid.ms.gov"): an address, not a sentence. */
const isHostname = (s: string): boolean => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s);

/** What the render still says in English that the catalog cannot have written, with the two registers of exception taken out. */
const stray = (seen: Seen[]): Seen[] => seen.filter((s) =>
  !s.langNav
  && !(s.link && isHostname(s.text))
  && !PROGRAM_NAMES.some((p) => s.text.includes(p))
  // The pseudo-locale accents every letter the catalog holds, so a Latin
  // accent is the catalog's signature; what is left with an English-looking
  // word in it came from a module.
  && !/[\u00C0-\u024F]/.test(s.text)
  && /[A-Za-z]{3,}/.test(s.text));

const overflow = (page: Page): Promise<number> => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

interface PageUnder { name: string; url: string; ready: (page: Page) => Promise<void> }
/* The three surfaces, each with the household its own proof uses, so this gate reads beside them. */
const PAGES: PageUnder[] = [
  {
    name: "citizen", url: "/?zip=94110&kids=3%2C7&pay=30000&unit=year",
    ready: async (page) => { await page.locator("#chart svg path").first().waitFor(); await page.locator("#source[data-source]").waitFor(); },
  },
  {
    name: "caseworker", url: "/caseworker.html?zip=80903&kids=3%2C7&pay=38000&unit=year&rent=1735&childcare=2773&childcare-subsidy=1&whatif=childcare-subsidy%3D&whatif=pay%3D55000",
    ready: async (page) => { await page.locator("table.compare td").first().waitFor(); await page.locator("#corrections li").first().waitFor(); },
  },
  {
    name: "places", url: "/places.html",
    ready: async (page) => { await page.waitForLoadState("networkidle"); await page.click('.tile[data-st="CO"]'); await page.locator("#corrections li").first().waitFor(); },
  },
];

const open = async (page: Page, p: PageUnder, lang: string): Promise<void> => {
  await page.goto(`${p.url}${p.url.includes("?") ? "&" : "?"}lang=${lang}`);
  await p.ready(page);
};

for (const [width, height] of [[390, 844], [1280, 900]] as const) {
  test(`${width}px: the pseudo-locale — every word on the page comes from the catalog, and two fifths more of them still fit`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height });
    const errors = consoleErrors(page);
    console.log(`\n== qps-ploc at ${width}px ==`);
    for (const p of PAGES) {
      await open(page, p, "qps-ploc");
      const seen = await strings(page);
      const left = stray(seen);
      check(left.length === 0, `${p.name}: none of its ${seen.length} strings is hard-coded English`,
        left.slice(0, 12).map((s) => `${s.where}: ${JSON.stringify(s.text.slice(0, 80))}`));
      /* A layout that assumed English width fails here first: the whole document, not a scroller, must not go sideways. */
      const over = await overflow(page);
      check(over <= 0, `${p.name}: no horizontal scroll at ${width}px`, `${over}px past the viewport`);
    }
    check(errors.length === 0, "no console error in the pseudo-locale", errors);
  });
}

test("Spanish — no English sentence left, the locale's own dates and lists, the same dollars, and the machine contracts unmoved", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const errors = consoleErrors(page);
  console.log(`\n== es-US ==`);
  check(PHRASES.length > 400, `the gate hunts ${PHRASES.length} English phrases that Spanish says differently`, PHRASES.length);

  for (const p of PAGES) {
    await open(page, p, "es-US");
    const seen = await strings(page);
    const all = seen.map((s) => s.text).join("\n");
    const found = PHRASES.filter((phrase) => all.includes(phrase));
    check(found.length === 0, `${p.name}: not one of the ${PHRASES.length} English phrases is on the page`, found.slice(0, 8));
    check(await page.getAttribute("html", "lang") === "es-US" && await page.getAttribute("html", "dir") === "ltr",
      `${p.name}: the document says what language it is`, { lang: await page.getAttribute("html", "lang"), dir: await page.getAttribute("html", "dir") });
    const over = await overflow(page);
    check(over <= 0, `${p.name}: no horizontal scroll in Spanish at 1280px`, `${over}px past the viewport`);
    /* The switch is the one English word a Spanish page should have, and it offers the way back. */
    const back = page.locator(".hg-lang a", { hasText: "English" }).first();
    check(await back.count() > 0 && (await back.getAttribute("href"))?.includes("lang=en") === true,
      `${p.name}: the switch names English in English and links to it`, await back.getAttribute("href"));
  }

  // ── Intl in es-US, not a formatter of our own ──────────────────────────
  await open(page, PAGES[0], "es-US");
  const citizen = (await strings(page)).map((s) => s.text).join("\n");
  const money = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(30000);
  check(citizen.includes(money), "money is USD formatted the locale's way — which in es-US is the digits and the dollar English uses, and that is the right answer", money);
  /* A list and a date are where Spanish and English part, so they prove Intl ran in the active locale. */
  const kids = new Intl.ListFormat("es-US", { style: "long", type: "unit" }).format(["3", "7"]);
  check(citizen.includes(kids), "a list of ages is joined by Intl in es-US", kids);

  await open(page, PAGES[2], "es-US");
  const places = (await strings(page)).map((s) => s.text).join("\n");
  const generated = (JSON.parse(readFileSync(resolve(ROOT, "core/data/summary.json"), "utf8")) as { generated: string }).generated;
  const esDate = new Intl.DateTimeFormat("es-US", { dateStyle: "medium" }).format(new Date(generated));
  const enDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(generated));
  check(places.includes(esDate) && !places.includes(enDate), "the run's date is the es-US date, and the English one is nowhere", { es: esDate, en: enDate });

  // ── The machine contracts ─────────────────────────────────────────────
  /* The CSV a reporter downloads is the same file in either language, header for header: a column name is a contract with a spreadsheet, not words for a reader. */
  const headerIn = async (lang: string): Promise<string> => {
    await open(page, PAGES[2], lang);
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#csvBtn")]);
    return readFileSync((await download.path())!, "utf8").replace(/^\ufeff/, "").split(/\r?\n/)[0];
  };
  const [enHead, esHead] = [await headerIn("en"), await headerIn("es-US")];
  check(esHead === enHead && /^[a-z0-9_,]+$/.test(esHead), "the CSV's column headers are the same English bytes in Spanish", esHead.slice(0, 60) + "…");

  /* The address bar likewise: the parameter names are the app's contract with itself and with a link someone pasted, so only their values and `lang` change. */
  const paramsIn = async (lang: string): Promise<string[]> => {
    await open(page, PAGES[2], lang);
    return [...new URLSearchParams(new URL(page.url()).search).keys()].filter((k) => k !== "lang").sort();
  };
  const [enParams, esParams] = [await paramsIn("en"), await paramsIn("es-US")];
  check(esParams.join(",") === enParams.join(",") && esParams.every((k) => /^[a-z][a-z0-9_-]*$/.test(k)),
    "the URL's parameter names are the same English words in Spanish", { en: enParams, es: esParams });
  check(new URL(page.url()).searchParams.get("lang") === "es-US", "and the language travels in the address the page wrote", page.url());

  expect(errors, "no console error in Spanish").toEqual([]);
});
