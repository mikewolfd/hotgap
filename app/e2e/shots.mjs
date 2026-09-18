// Screenshots for a design review: the households the reviews use, at both
// widths, in both schemes, plus the first screen alone (what a person meets)
// and the page with every disclosure open.
//
//     node e2e/shots.mjs <outDir> [baseUrl] [lang]
//
// Nothing is asserted here — it renders and saves, so a reviewer can read the
// pictures. The proofs are the Playwright specs.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve(process.argv[2] ?? "design/review/picture-first/after");
const base = (process.argv[3] ?? "http://localhost:8806").replace(/\/$/, "");
const lang = process.argv[4] ?? "";
mkdirSync(out, { recursive: true });

/** The households: the CA one every citizen proof uses, a plateau, and a Head Start family. */
const HOUSEHOLDS = [
  { name: "ca", q: "/?zip=94110&kids=3,7&pay=30000&unit=year" },
  { name: "plateau", q: "/?zip=19801&kids=3,7&pay=41000&unit=year" },
  { name: "headstart", q: "/?zip=94110&kids=3,4&pay=24000&unit=year&head-start=1" },
];
const WIDTHS = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];

const browser = await chromium.launch();
for (const h of HOUSEHOLDS) {
  for (const size of WIDTHS) {
    for (const scheme of ["light", "dark"]) {
      const ctx = await browser.newContext({ viewport: size, colorScheme: scheme });
      const page = await ctx.newPage();
      const url = base + h.q + (lang ? `&lang=${lang}` : "");
      await page.goto(url, { waitUntil: "load" });
      await page.locator("#chart svg path").first().waitFor({ timeout: 180_000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const tag = `${h.name}-${size.width}-${scheme}${lang ? `-${lang}` : ""}`;
      await page.screenshot({ path: resolve(out, `${tag}-screen1.png`) });
      await page.screenshot({ path: resolve(out, `${tag}-full.png`), fullPage: true });
      if (scheme === "light" && !lang) {
        await page.evaluate(() => { for (const d of document.querySelectorAll("details")) d.open = true; });
        await page.waitForTimeout(300);
        await page.screenshot({ path: resolve(out, `${tag}-open.png`), fullPage: true });
        await page.emulateMedia({ media: "print" });
        await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
        await page.waitForTimeout(400);
        await page.screenshot({ path: resolve(out, `${tag}-print.png`), fullPage: true });
        await page.emulateMedia({ media: "screen" });
      }
      console.log(tag);
      await ctx.close();
    }
  }
}
await browser.close();
