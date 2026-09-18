// The English each page prints, as text, so a change that must not move a
// rendered string can prove it did not (app/README.md § Languages: the
// locale migration left the English byte-identical). Every page at 1280 in
// `en`, the three proofs' own households, visible text and every
// aria-label, title and alt — one file per page under the directory given.
//
//   node app/e2e/text-dump.mjs <out-dir> [base-url] [lang]
//
// Run against a Worker you started (wrangler dev on :8800 with the rate
// limiter off, the README says how); diff two directories to compare.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [outDir, base = "http://localhost:8800", lang = ""] = process.argv.slice(2);
if (!outDir) { console.error("usage: text-dump.mjs <out-dir> [base-url] [lang]"); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const q = lang ? `&lang=${lang}` : "";

const PAGES = [
  { name: "citizen", url: `/?zip=94110&kids=3%2C7&pay=30000&unit=year${q}`, ready: async (page) => { await page.locator("#chart svg path").first().waitFor(); await page.locator("#source[data-source]").waitFor(); } },
  { name: "caseworker", url: `/caseworker.html?zip=80903&kids=3%2C7&pay=38000&unit=year&rent=1735&childcare=2773&childcare-subsidy=1&whatif=childcare-subsidy%3D&whatif=pay%3D55000${q}`, ready: async (page) => { await page.locator("table.compare td").first().waitFor(); await page.waitForFunction(() => !document.body.innerText.includes("computing")); } },
  { name: "places", url: `/places.html?${q.slice(1)}`, ready: async (page) => { await page.waitForLoadState("networkidle"); await page.click('.tile[data-st="CO"]'); await page.waitForTimeout(300); } },
];

/** What a person could read or a screen reader would say: text, then every label attribute, in DOM order. */
const dump = (page) => page.evaluate(() => {
  const attrs = [];
  for (const el of document.querySelectorAll("[aria-label], [title], [alt], [placeholder]")) {
    for (const a of ["aria-label", "title", "alt", "placeholder"]) if (el.hasAttribute(a)) attrs.push(`${a}: ${el.getAttribute(a)}`);
  }
  return `${document.title}\n${document.documentElement.lang}\n---\n${document.body.innerText}\n--- attributes ---\n${attrs.join("\n")}\n`;
});

const browser = await chromium.launch();
try {
  for (const p of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(base + p.url);
    await p.ready(page);
    const text = await dump(page);
    writeFileSync(join(outDir, `${p.name}.txt`), text);
    console.log(`${p.name}: ${text.length} chars → ${join(outDir, `${p.name}.txt`)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
