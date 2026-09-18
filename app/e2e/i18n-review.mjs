// The Spanish visual pass (app/README.md § Languages, step 6): every surface
// rendered in es-US and in English side by side, at 390 and 1280, in the light
// and dark schemes and on paper, so the two can be read against each other —
// expansion, wrapping, where the language switch sits, and anything that reads
// as a translated English page rather than a Spanish one.
//
//   cd app && node e2e/i18n-review.mjs [base-url]
//
// Renders land in design/review/i18n/ as <page>-<lang>-<width>-<scheme>.png,
// the paper as <page>-<lang>-print.pdf. Prints, for each render, the tallest
// line count of the labels a longer language stretches — the chips, the table's
// column heads, the ranked strip, the readout — beside English's, so a
// difference is a number here before it is an opinion.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(import.meta.url)("@playwright/test");
const [BASE = "http://localhost:8800"] = process.argv.slice(2);
const OUT = resolve(import.meta.dirname, "../../design/review/i18n");
mkdirSync(OUT, { recursive: true });

const PAGES = {
  citizen: { url: "/?zip=94110&kids=3%2C7&pay=30000&unit=year", ready: async (p) => { await p.locator("#chart svg path").first().waitFor(); await p.locator("#source[data-source]").waitFor(); } },
  /* The chips row, opened by the summary's own button — selected by its place, not its words, so the same click works in either language. */
  editor: { url: "/?zip=94110&kids=3%2C7&pay=30000&unit=year", ready: async (p) => { await p.locator("#chart svg path").first().waitFor(); await p.locator(".hg-scenario__summary button").first().click(); await p.locator("#inputs .hg-chip").first().waitFor(); await p.waitForTimeout(300); } },
  caseworker: { url: "/caseworker.html?zip=80903&kids=3%2C7&pay=38000&unit=year&rent=1735&childcare=2773&childcare-subsidy=1&whatif=childcare-subsidy%3D&whatif=pay%3D55000", ready: async (p) => { await p.locator("table.compare td").first().waitFor(); await p.locator("#corrections li").first().waitFor(); } },
  places: { url: "/places.html", ready: async (p) => { await p.waitForLoadState("networkidle"); await p.click('.tile[data-st="CO"]'); await p.locator("#corrections li").first().waitFor(); } },
};

/** How many lines each label that assumed English length is using, and whether anything is clipped or past the viewport. */
const measure = (page) => page.evaluate(() => {
  const lines = (el) => {
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    return Math.max(1, Math.round(el.getBoundingClientRect().height / lh));
  };
  const group = (sel) => {
    const els = [...document.querySelectorAll(sel)].filter((el) => el.getBoundingClientRect().height > 0);
    return els.length ? { n: els.length, worst: Math.max(...els.map(lines)) } : null;
  };
  const clipped = [...document.querySelectorAll("*")].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.overflow === "visible" || el.scrollWidth <= el.clientWidth + 1) return false;
    // A scroller is meant to scroll, and text put aside for a screen reader is
    // a 1px box on purpose (tokens.css .hg-visually-hidden); neither is a
    // label losing its words.
    if (el.closest(".hg-visually-hidden, .hg-scroll-x") || el.clientWidth <= 1) return false;
    return cs.overflowX !== "auto" && cs.overflowX !== "scroll";
  }).map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/)[0]}` : ""} ${el.scrollWidth}>${el.clientWidth}`);
  return {
    over: document.documentElement.scrollWidth - window.innerWidth,
    chips: group(".hg-chip"), heads: group("th"), strip: group(".rank .hg-row-btn"), readout: group("#readout, #verdictLine, #verdictSub"),
    clipped: [...new Set(clipped)].slice(0, 6),
  };
});

const browser = await chromium.launch();
const rows = [];
try {
  for (const [name, p] of Object.entries(PAGES)) {
    for (const lang of ["en", "es-US"]) {
      for (const width of [390, 1280]) {
        for (const scheme of ["light", "dark"]) {
          const page = await browser.newPage({ viewport: { width, height: width < 500 ? 844 : 900 }, colorScheme: scheme });
          await page.goto(`${BASE}${p.url}${p.url.includes("?") ? "&" : "?"}lang=${lang}`);
          await p.ready(page).catch((e) => console.log(`  ${name} ${lang} ${width} ${scheme}: ready — ${e.message.split("\n")[0]}`));
          const m = await measure(page);
          rows.push({ name, lang, width, scheme, ...m });
          await page.screenshot({ path: resolve(OUT, `${name}-${lang}-${width}-${scheme}.png`), fullPage: true });
          /* Paper once per page and language, from the light scheme, the way a
             reader's "Save as PDF" takes it — and at Letter's own width, which
             is where the PDF's positions come from (places.spec.ts says the
             same). Taken at the window's width instead, the places figure lands
             on page 2 in Spanish and page 1 in English, and neither is what a
             reader gets. */
          if (width === 1280 && scheme === "light") {
            await page.emulateMedia({ media: "print" });
            await page.setViewportSize({ width: 816, height: 1056 });
            await page.waitForTimeout(300);
            writeFileSync(resolve(OUT, `${name}-${lang}-print.pdf`), await page.pdf({ format: "Letter", printBackground: true }));
            const printOver = await page.evaluate(() => document.documentElement.scrollWidth - 816);
            rows.push({ name, lang, width: "print", scheme: "paper", over: printOver, chips: null, heads: null, strip: null, readout: null, clipped: [] });
          }
          await page.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}

/* The full-page renders above are for the record; these are the crops a
   reviewer can actually read — the head of each page, and the table's column
   heads, English beside Spanish at the same size. The head of a page is where
   the wordmark, the switch, the summary line and the verdict all meet, which is
   where a longer language shows first. */
const CROPS = [
  { name: "citizen-head", page: "citizen", height: 620 },
  { name: "caseworker-head", page: "caseworker", height: 700 },
  { name: "places-head", page: "places", height: 700 },
  { name: "places-table-head", page: "places", el: "table.hg-table thead" },
];
mkdirSync(resolve(OUT, "crops"), { recursive: true });
const cropper = await chromium.launch();
try {
  for (const c of CROPS) {
    const p = PAGES[c.page];
    for (const width of [390, 1280]) {
      for (const lang of ["en", "es-US"]) {
        const page = await cropper.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${BASE}${p.url}${p.url.includes("?") ? "&" : "?"}lang=${lang}`);
        await p.ready(page).catch(() => {});
        const path = resolve(OUT, "crops", `${c.name}-${width}-${lang}.png`);
        if (c.el) await page.locator(c.el).screenshot({ path });
        else await page.screenshot({ path, clip: { x: 0, y: 0, width, height: c.height } });
        await page.close();
      }
    }
  }
} finally {
  await cropper.close();
}

const cell = (g) => (g ? `${g.worst}L×${g.n}` : "—");
console.log(`\n${"page".padEnd(11)}${"lang".padEnd(7)}${"w".padEnd(7)}${"scheme".padEnd(7)}${"over".padEnd(6)}${"chips".padEnd(8)}${"heads".padEnd(8)}${"strip".padEnd(8)}${"readout".padEnd(9)}clipped`);
for (const r of rows) {
  console.log(`${r.name.padEnd(11)}${r.lang.padEnd(7)}${String(r.width).padEnd(7)}${r.scheme.padEnd(7)}${String(r.over).padEnd(6)}${cell(r.chips).padEnd(8)}${cell(r.heads).padEnd(8)}${cell(r.strip).padEnd(8)}${cell(r.readout).padEnd(9)}${r.clipped.join(" | ")}`);
}
const bad = rows.filter((r) => r.over > 0 || r.clipped.length);
console.log(`\n${rows.length} renders → ${OUT}`);
console.log(bad.length ? `${bad.length} with overflow or a clipped label` : "nothing overflows and no label is clipped");
