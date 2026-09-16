// Measured proofs for the places page, against the dev server and the
// committed sweep. Run from the repo root:
//
//   NODE_PATH=/path/to/node_modules/with/playwright node app/e2e/places.mjs
//
// (`playwright` is not a dependency: its package downloads browsers on
// install. Point NODE_PATH at any copy — an `npx playwright` cache works;
// it is loaded through `require`, which honours NODE_PATH where ESM does
// not.) Screenshots land in design/audit/app/, named like the audit's
// journalist-* set so the two can be read side by side. Prints every
// measurement it took and exits non-zero if any check failed.
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { parseCsv } from "./parseCsv.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const OUT = resolve(ROOT, "design/audit/app");
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
mkdirSync(OUT, { recursive: true });

const summary = JSON.parse(readFileSync(resolve(ROOT, "core/data/summary.json"), "utf8"));
const STATES = Object.keys(summary.states).sort();
const failures = [];
const check = (ok, what, measured) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${measured !== undefined ? ` — ${typeof measured === "string" ? measured : JSON.stringify(measured)}` : ""}`);
  if (!ok) failures.push(what);
};

/* WCAG 2.x relative luminance and contrast, the audit's own method. */
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);

async function serve() {
  const child = spawn("npx", ["vite", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { cwd: resolve(ROOT, "app"), stdio: ["ignore", "pipe", "inherit"] });
  child.stdout.on("data", () => {});
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${BASE}/places.html`)).ok) return child; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("vite did not start");
}

const server = await serve();
const browser = await chromium.launch();
try {
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${BASE}/places.html`, { waitUntil: "networkidle" });
    await page.waitForSelector(".tile");
    console.log(`\n== ${width}px ==`);

    check(errors.length === 0, "no console errors on load", errors);
    const scroll = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    check(scroll[0] <= scroll[1], "no horizontal scroll", { scrollWidth: scroll[0], innerWidth: scroll[1] });
    const status = await page.$eval("#status", (el) => el.hidden);
    check(status, "the load status line is hidden once the sweep is in");

    /* Tiles: one per state in the file, the incomplete ones hatched — measured
       by the computed gradient, not by the class alone. */
    const tiles = await page.$$eval(".tile", (els) => els.map((el) => ({
      st: el.dataset.st, tag: el.tagName, kind: el.className, bg: getComputedStyle(el).backgroundImage,
      w: el.getBoundingClientRect().width, label: el.getAttribute("aria-label"),
    })));
    check(tiles.length === STATES.length && tiles.map((t) => t.st).sort().join() === STATES.join(), `every state has a tile (${tiles.length})`);
    check(tiles.every((t) => t.tag === "BUTTON" && t.label), "every tile is a button with an accessible name", tiles[0].label);
    const shownArch = await page.$eval("#arch", (el) => el.value);
    const expectIncomplete = STATES.filter((st) => expectIncompleteFor(st, shownArch));
    const hatched = tiles.filter((t) => t.bg.includes("repeating-linear-gradient")).map((t) => t.st).sort();
    check(hatched.join() === expectIncomplete.join(), "the incomplete states, and only they, carry the hatch gradient", { hatched, expectIncomplete });
    console.log(`     tile width ${tiles[0].w.toFixed(1)}px`);

    /* Contrast, as the audit measured it, from the resolved colours. */
    const measureContrast = async (mode) => {
      const c = await page.evaluate(() => {
        const cs = (el) => getComputedStyle(el);
        const fig = cs(document.querySelector(".figure")).backgroundColor;
        const hatch = cs(document.querySelector(".hg-swatch--incomplete")).backgroundImage;
        const ramp = [...document.querySelectorAll(".scale .sw")].map((el) => cs(el).backgroundColor);
        const shaded = [...document.querySelectorAll(".tile")].filter((el) => !/hg-tile--/.test(el.className)).map((el) => [cs(el).backgroundColor, cs(el).color]);
        const byBin = ramp.map((bg) => shaded.find(([b]) => b === bg));
        return { fig, hatch, ramp, byBin };
      });
      /* The gradient names each colour at two stops; the two distinct ones are the stripe and its ground. */
      const [stripe, ground] = [...new Set(c.hatch.match(/rgb\([^)]*\)/g))].map(rgb);
      const out = {
        hatchStripeOnGround: contrast(stripe, ground),
        loss1OnFigure: contrast(rgb(c.ramp[0]), rgb(c.fig)),
        loss5OnFigure: contrast(rgb(c.ramp[4]), rgb(c.fig)),
        labelOnBins: c.byBin.map((t) => (t ? contrast(rgb(t[0]), rgb(t[1])) : null)),
      };
      check(Number(out.hatchStripeOnGround) >= 4.5, `${mode}: hatch stripe against its ground ≥ 4.5:1`, out.hatchStripeOnGround);
      check(Number(out.loss1OnFigure) >= 2, `${mode}: lightest bin against the figure ground ≥ 2:1`, out.loss1OnFigure);
      check(out.labelOnBins.every((r) => r === null || Number(r) >= 4.5), `${mode}: tile label on every shaded bin present ≥ 4.5:1`, out.labelOnBins);
      return out;
    };
    await measureContrast("light");

    /* Filters, sort and the open state live in the URL; a reload restores them. */
    await page.selectOption("#arch", "married-dual-2");
    await page.selectOption("#metric", "safeExit");
    await page.selectOption("#sort", "measure");
    await page.click('.tile[data-st="TX"]');
    const url = new URL(page.url());
    check(url.search === "?household=married-dual-2&measure=safeExit&sort=measure&state=TX", "the URL carries household, measure, sort and state", url.search);
    await page.goto(page.url(), { waitUntil: "networkidle" });
    await page.waitForSelector(".tile");
    const restored = await page.evaluate(() => ({
      arch: document.querySelector("#arch").value, metric: document.querySelector("#metric").value, sort: document.querySelector("#sort").value,
      tile: document.querySelector('.tile[aria-current="true"]')?.dataset.st,
      row: document.querySelector('.hg-row-btn[aria-current="true"]')?.dataset.st,
      title: document.querySelector("#stateTitle").textContent,
      firstRow: document.querySelector("#tbody .hg-row-btn").dataset.st,
      corrections: document.querySelectorAll("#corrections li").length,
      unmod: [...document.querySelectorAll("#unmod li .hg-rows__at")].map((el) => el.textContent),
    }));
    check(restored.arch === "married-dual-2" && restored.metric === "safeExit" && restored.sort === "measure", "reloading the URL restores the three filters", restored);
    check(restored.tile === "TX" && restored.row === "TX", "reloading the URL restores the open state on the map and in the table");
    check(/^Corrections applied in Texas \(\d+\)$/.test(restored.title) && restored.corrections === 3, "Texas's coverage block: three corrections applied", restored.title);
    check(restored.unmod.includes("LIHEAP"), "the unmodeled list is rendered from coverage[TX].unmodeled", restored.unmod);
    const expectedFirst = STATES.map((st) => [st, summary.states[st]["married-dual-2"]]).filter(([st, m]) => m.cliffCount > 0 && m.safeExit !== null && !m.leapIsLowerBound && !expectIncompleteFor(st, "married-dual-2")).sort((a, b) => b[1].safeExit - a[1].safeExit)[0][0];
    check(restored.firstRow === expectedFirst, "sorted by the measure, the table leads with the largest comparable safe exit", { firstRow: restored.firstRow, expectedFirst });

    /* Keyboard: the map is one tab stop; arrows move by geography; Enter selects. */
    await page.focus('.tile[data-st="TX"]');
    await page.keyboard.press("ArrowUp");
    const afterUp = await page.evaluate(() => document.activeElement.dataset.st);
    await page.keyboard.press("Enter");
    const selectedByKey = await page.evaluate(() => [document.querySelector('.tile[aria-current="true"]').dataset.st, new URL(location.href).searchParams.get("state")]);
    check(afterUp === "OK" && selectedByKey[0] === "OK" && selectedByKey[1] === "OK", "ArrowUp from Texas focuses Oklahoma; Enter opens it and the URL follows", { afterUp, selectedByKey });
    const tabStops = await page.$$eval("#grid [tabindex='0'], #tbody [tabindex='0']", (els) => els.length);
    check(tabStops === 2, "one tab stop in the map and one in the table", tabStops);
    await page.focus('#tbody .hg-row-btn[tabindex="0"]');
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    const rowSel = await page.evaluate(() => [document.activeElement.dataset.st, document.querySelector('.tile[aria-current="true"]').dataset.st]);
    check(rowSel[0] === rowSel[1], "ArrowDown then Enter in the table selects that row's state on the map too", rowSel);

    /* CSV: the rendered table's rows, in order, with provenance equal to the file's. */
    await page.selectOption("#sort", "state");
    const rendered = await page.$$eval("#tbody tr", (trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent.trim())));
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#csvBtn")]);
    const csv = readFileSync(await download.path(), "utf8").replace(/^﻿/, "");
    const rows = parseCsv(csv);
    const head = rows[0], body = rows.slice(1);
    const col = (n) => head.indexOf(n);
    const num = (s) => (s === "none" || s === "past the axis" ? "" : s.replace(/[^\d]/g, ""));
    let same = body.length === rendered.length;
    for (let i = 0; same && i < body.length; i++) {
      const r = rendered[i], c = body[i];
      same = c[col("state")] === r[0] && num(r[1]) === c[col("biggest_one_step_loss")] && num(r[2]) === c[col("danger_zone_width")]
        && num(r[3]) === c[col("leap")] && num(r[4]) === c[col("safe_exit")] && r[5] === c[col("cliff_count")] && r[6] === c[col("deferred_cliff_count")]
        && (r[7] === "complete") === (c[col("figures")] === "complete");
      if (!same) console.log("     mismatch at row", i, r, c);
    }
    check(same, `the CSV's ${body.length} rows equal the rendered table's ${rendered.length} rows, cell for cell`, download.suggestedFilename());
    const prov = body.every((c) => c[col("sweep_generated")] === summary.generated && c[col("model_endpoint")] === summary.model.endpoint
      && c[col("model_version")] === summary.model.version && c[col("policy_year")] === summary.year
      && c[col("childcare_price_vintage")] === summary.coverage[c[col("state")]].vintages.childcare.preschool
      && c[col("reach_vintages")] === summary.coverage[c[col("state")]].vintages.reach.vintages.join("; ")
      && c[col("rent_vintage")] === summary.coverage[c[col("state")]].vintages.rent.vintage);
    check(prov, "every CSV row's provenance columns equal summary.json's generated, model and vintages");

    /* Screenshots beside the audit's, at the audit's views. */
    await page.goto(`${BASE}/places.html`, { waitUntil: "networkidle" });
    await page.waitForSelector(".tile");
    await page.screenshot({ path: `${OUT}/journalist-${width}-light.png`, fullPage: true });
    await page.$eval(".figure", (el) => el.scrollIntoView());
    await (await page.$(".figure")).screenshot({ path: `${OUT}/journalist-${width}-light-map${width === 390 ? "-legend" : ""}.png` });
    await page.click(`.tile[data-st="${width === 390 ? "CO" : "TX"}"]`);
    await (await page.$("#stateDetail")).screenshot({ path: `${OUT}/journalist-${width}-light-${width === 390 ? "CO" : "TX"}.png` });
    await page.click("#themeBtn");
    await measureContrast("dark");
    await page.screenshot({ path: `${OUT}/journalist-${width}-dark.png`, fullPage: true });
    await (await page.$(".figure")).screenshot({ path: `${OUT}/journalist-${width}-dark-map${width === 390 ? "-legend" : ""}.png` });
    if (width === 1280) {
      await page.selectOption("#arch", "single-0");
      await page.selectOption("#metric", "safeExit");
      await page.click("#themeBtn");
      await (await page.$(".split")).screenshot({ path: `${OUT}/journalist-1280-light-childless-safe-exit.png` });
      await page.click("#themeBtn");
      await page.emulateMedia({ media: "print" });
      await page.screenshot({ path: `${OUT}/journalist-1280-print-from-dark.png`, fullPage: true });
      await page.emulateMedia({ media: null });
    }
    check(errors.length === 0, "no console errors after the whole run", errors);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

function expectIncompleteFor(st, archId) {
  const a = summary.archetypes.find((x) => x.id === archId);
  const pays = a.childAges.some((age) => age < 6) && (!a.married || a.id.includes("dual"));
  return (summary.coverage?.[st]?.unmodeled ?? []).some((u) => u.program !== "LIHEAP" && (!/child.?care/i.test(u.program) || pays));
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
