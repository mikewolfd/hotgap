// Measured proofs for the places page, against the dev server and the
// committed sweep. Run from the repo root:
//
//   NODE_PATH=/path/to/node_modules/with/playwright node app/e2e/places.mjs
//
// (`playwright` is not a dependency: its package downloads browsers on
// install. Point NODE_PATH at any copy — an `npx playwright` cache works;
// it is loaded through `require`, which honours NODE_PATH where ESM does
// not.) Screenshots and the Letter PDF land in design/audit/app/, named
// like the audit's journalist-* set so the two can be read side by side.
// Prints every measurement it took and exits non-zero if any check failed.
//
// Dark mode is the OS's (prefers-color-scheme), the path a reader's browser
// takes; the PDF is printed from it, because that is the path a reporter's
// "Save as PDF" takes, and a raster print check cannot see it (review B1).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { parseCsv } from "./parseCsv.mjs";
import { formsDrawn, greyRowTransitions, pageContent, pageHeight, pdfObjects, pdfPages, reachable, resource } from "./pdf.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const OUT = resolve(ROOT, "design/audit/app");
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
mkdirSync(OUT, { recursive: true });

const summary = JSON.parse(readFileSync(resolve(ROOT, "core/data/summary.json"), "utf8"));
const STATES = Object.keys(summary.states).sort();
/* The one child-care age rule (N8): core's, read from its source rather than
   typed here, so this proof and the page cannot disagree about it silently. */
const CHILDCARE_MAX_AGE = Number(readFileSync(resolve(ROOT, "core/src/stateDefaults.ts"), "utf8").match(/export const CHILDCARE_MAX_AGE = (\d+)/)[1]);
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
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

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
    const lede = await page.$eval(".lede", (el) => el.textContent.replace(/\s+/g, " ").trim());
    check(/^[A-Z][a-z-]+ sets of rules, [a-z-]+ household shapes, one axis\. Each figure/.test(lede), "the lede's counted sentence is written whole from the data (S6)", lede.slice(0, 60));

    /* Tiles: one per state in the file, the incomplete ones hatched — measured
       by the painted mask on the stripes' pseudo-element, not by the class. */
    const tiles = await page.$$eval(".tile", (els) => els.map((el) => ({
      st: el.dataset.st, tag: el.tagName, kind: el.className, mask: getComputedStyle(el, "::after").maskImage,
      w: el.getBoundingClientRect().width, label: el.getAttribute("aria-label"), current: el.getAttribute("aria-current"),
    })));
    check(tiles.length === STATES.length && tiles.map((t) => t.st).sort().join() === STATES.join(), `every state has a tile (${tiles.length})`);
    check(tiles.every((t) => t.tag === "BUTTON" && t.label), "every tile is a button with an accessible name", tiles[0].label);
    check(tiles.every((t) => t.current === null), "with nothing selected, no tile is aria-current (a tab stop is not a selection)");
    const shownArch = await page.$eval("#arch", (el) => el.value);
    const expectIncomplete = STATES.filter((st) => expectIncompleteFor(st, shownArch));
    const hatched = tiles.filter((t) => t.mask.includes("data:image/svg+xml")).map((t) => t.st).sort();
    check(hatched.join() === expectIncomplete.join(), "the incomplete states, and only they, carry the SVG hatch mask", { hatched, expectIncomplete });
    console.log(`     tile width ${tiles[0].w.toFixed(1)}px`);

    /* Contrast, as the audit measured it, from the resolved colours. */
    const measureContrast = async (mode) => {
      const c = await page.evaluate(() => {
        const cs = (el, pseudo) => getComputedStyle(el, pseudo);
        const swatch = document.querySelector(".hg-swatch--incomplete");
        const fig = cs(document.querySelector(".figure")).backgroundColor;
        const ramp = [...document.querySelectorAll(".scale .sw")].map((el) => cs(el).backgroundColor);
        const shaded = [...document.querySelectorAll(".tile")].filter((el) => !/hg-tile--/.test(el.className)).map((el) => [cs(el).backgroundColor, cs(el).color]);
        const byBin = ramp.map((bg) => shaded.find(([b]) => b === bg));
        const none = document.querySelector(".hg-tile--none");
        return { fig, stripe: cs(swatch, "::after").backgroundColor, ground: cs(swatch).backgroundColor, ramp, byBin,
          noneEdge: none && cs(none).outlineColor };
      });
      const out = {
        hatchStripeOnGround: contrast(rgb(c.stripe), rgb(c.ground)),
        loss1OnFigure: contrast(rgb(c.ramp[0]), rgb(c.fig)),
        loss5OnFigure: contrast(rgb(c.ramp[4]), rgb(c.fig)),
        labelOnBins: c.byBin.map((t) => (t ? contrast(rgb(t[0]), rgb(t[1])) : null)),
        noCliffEdge: c.noneEdge ? contrast(rgb(c.noneEdge), rgb(c.fig)) : null,
      };
      check(Number(out.hatchStripeOnGround) >= 4.5, `${mode}: hatch stripe against its ground ≥ 4.5:1`, out.hatchStripeOnGround);
      check(Number(out.loss1OnFigure) >= 2, `${mode}: lightest bin against the figure ground ≥ 2:1`, out.loss1OnFigure);
      check(out.labelOnBins.every((r) => r === null || Number(r) >= 4.5), `${mode}: tile label on every shaded bin present ≥ 4.5:1`, out.labelOnBins);
      check(out.noCliffEdge === null || Number(out.noCliffEdge) >= 3, `${mode}: the no-cliff tile's edge ≥ 3:1 on the map ground (N10)`, out.noCliffEdge);
      return out;
    };
    await measureContrast("light");

    /* Line length in Archivo (N6): under 80 characters on the prose that ran long. */
    const cpl = await page.$$eval(".lede, .method li, #figSrc", (els) => els.map((el) => {
      const lines = Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
      return [el.className || el.id, Math.round(el.textContent.trim().length / lines)];
    }));
    check(cpl.every(([, n]) => n < 80), "prose runs under 80 characters a line", Object.fromEntries(cpl));

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
      rank: document.querySelector('#rankList [aria-current="true"]')?.dataset.st,
      row: document.querySelector('.hg-row-btn[aria-current="true"]')?.dataset.st,
      title: document.querySelector("#stateTitle").textContent,
      firstRow: document.querySelector("#tbody .hg-row-btn").dataset.st,
      corrections: document.querySelectorAll("#corrections li").length,
      unmod: [...document.querySelectorAll("#unmod li .hg-rows__at")].map((el) => el.textContent),
      notes: [...document.querySelectorAll("#corrections .hg-cite")].map((el) => el.textContent),
    }));
    check(restored.arch === "married-dual-2" && restored.metric === "safeExit" && restored.sort === "measure", "reloading the URL restores the three filters", restored);
    check(restored.tile === "TX" && restored.rank === "TX" && restored.row === "TX", "reloading the URL restores the open state on the map, in the ranking and in the table");
    check(/^Corrections applied in Texas \(\d+\)$/.test(restored.title) && restored.corrections === 3, "Texas's coverage block: three corrections applied", restored.title);
    check(restored.unmod.includes("LIHEAP"), "the unmodeled list is rendered from coverage[TX].unmodeled", restored.unmod);
    check(restored.notes.every((n) => /^[A-Z]/.test(n) && !/WORKAROUND|\.ts\b/.test(n) && /#\d{4}/.test(n)), "every correction note is a sentence with its issue number and no code pointer (S9)", restored.notes[0]);
    const expectedFirst = STATES.map((st) => [st, summary.states[st]["married-dual-2"]]).filter(([st, m]) => m.cliffCount > 0 && m.safeExit !== null && !m.leapIsLowerBound && !expectIncompleteFor(st, "married-dual-2")).sort((a, b) => b[1].safeExit - a[1].safeExit)[0][0];
    check(restored.firstRow === expectedFirst, "sorted by the measure, the table leads with the largest comparable safe exit", { firstRow: restored.firstRow, expectedFirst });

    /* Selection and focus are two marks (S4): the selected tile's ring is
       inside in its label ink; a focused, unselected tile has the outline only. */
    await page.focus('.tile[data-st="NY"]');
    const marks = await page.evaluate(() => {
      const cs = (st) => getComputedStyle(document.querySelector(`.tile[data-st="${st}"]`));
      return { selShadow: cs("TX").boxShadow, selOutline: cs("TX").outlineStyle, focusShadow: cs("NY").boxShadow, focusOutline: cs("NY").outlineStyle };
    });
    check(/inset/.test(marks.selShadow) && marks.selOutline === "none" && marks.focusShadow === "none" && marks.focusOutline === "solid", "the selected tile has an inset ring and no outline; the focused tile an outline and no ring", marks);

    /* Keyboard: the map is one tab stop; arrows move by geography; Enter selects. */
    await page.focus('.tile[data-st="TX"]');
    await page.keyboard.press("ArrowUp");
    const afterUp = await page.evaluate(() => document.activeElement.dataset.st);
    await page.keyboard.press("Enter");
    const selectedByKey = await page.evaluate(() => [document.querySelector('.tile[aria-current="true"]').dataset.st, new URL(location.href).searchParams.get("state")]);
    check(afterUp === "OK" && selectedByKey[0] === "OK" && selectedByKey[1] === "OK", "ArrowUp from Texas focuses Oklahoma; Enter opens it and the URL follows", { afterUp, selectedByKey });
    const tabStops = await page.$$eval("#grid [tabindex='0'], #rankList [tabindex='0'], #tbody [tabindex='0']", (els) => els.length);
    check(tabStops === 3, "one tab stop in the map, one in the ranking and one in the table", tabStops);

    /* The ranked list is a control (S2): 44px rows on a phone, and a row's
       selection mark is the sunk ground with an ink bar (S3). */
    const rankRow = await page.$eval('#rankList .hg-row-btn[tabindex="0"]', (el) => ({ tag: el.tagName, h: el.getBoundingClientRect().height, st: el.dataset.st }));
    check(rankRow.tag === "BUTTON" && (width >= 992 ? rankRow.h >= 24 : rankRow.h >= 44), `a rank row is a button ${width >= 992 ? "at the list's density" : "of at least 44px"}`, rankRow);
    await page.focus('#rankList .hg-row-btn[tabindex="0"]');
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    const rankSel = await page.evaluate(() => {
      const b = document.activeElement, cs = getComputedStyle(b);
      return { st: b.dataset.st, tile: document.querySelector('.tile[aria-current="true"]').dataset.st, shadow: cs.boxShadow, bg: cs.backgroundColor, ink: cs.color };
    });
    check(rankSel.st === rankSel.tile && /3px 0px 0px 0px inset/.test(rankSel.shadow), "ArrowDown then Enter in the ranking selects that row's state; the row carries the 3px ink bar", { st: rankSel.st, shadow: rankSel.shadow });
    console.log(`     selected row: ink bar ${contrast(rgb(rankSel.ink), rgb(rankSel.bg))}:1 on its ground`);

    /* Selecting from the table takes the reader to the block it drives (S1). */
    await page.focus('#tbody .hg-row-btn[tabindex="0"]');
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    const rowSel = await page.evaluate(() => {
      const heading = document.querySelector("#stateTitle"), r = heading.getBoundingClientRect();
      const row = document.querySelector('#tbody .hg-row-btn[aria-current="true"]');
      return { focused: document.activeElement === heading, top: r.top, inView: r.top >= 0 && r.bottom <= innerHeight,
        row: row?.dataset.st, tile: document.querySelector('.tile[aria-current="true"]').dataset.st,
        rowTab: row?.tabIndex, bar: getComputedStyle(row.closest("tr").firstElementChild).boxShadow };
    });
    check(rowSel.row === rowSel.tile && rowSel.focused && rowSel.inView && rowSel.rowTab === 0 && /3px 0px 0px 0px inset/.test(rowSel.bar),
      "ArrowDown then Enter in the table selects on the map, scrolls the corrections heading into view and focuses it; the row keeps its tab stop and ink bar", rowSel);

    /* A count measure's scale is classes of whole numbers, never a repeated bound (S5). */
    await page.selectOption("#metric", "deferredCliffCount");
    const scale = await page.evaluate(() => ({
      swatches: document.querySelectorAll(".scale .sw").length,
      labels: [...document.querySelectorAll("#scaleLabels span")].map((el) => el.textContent),
      caption: document.querySelector("#figSrc").textContent.match(/Bins: [^.]*/)[0],
    }));
    check(scale.swatches === scale.labels.length && new Set(scale.labels).size === scale.labels.length && /classes? from \d+ to \d+/.test(scale.caption),
      "deferred cliffs: one swatch per class, no label repeated, the caption counts the classes", scale);
    await page.selectOption("#metric", "safeExit");

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
    check(/^hotgap-2-adults-both-working-2-children-3-and-7-\d{4}-\d\d-\d\d\.csv$/.test(download.suggestedFilename()), "the CSV is named by the household as the reader knows it (N7)", download.suggestedFilename());
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
    await page.emulateMedia({ colorScheme: "dark" });
    await measureContrast("dark");
    await page.screenshot({ path: `${OUT}/journalist-${width}-dark.png`, fullPage: true });
    await (await page.$(".figure")).screenshot({ path: `${OUT}/journalist-${width}-dark-map${width === 390 ? "-legend" : ""}.png` });
    if (width === 1280) {
      /* The table's header stays in view while its rows scroll by (S8). */
      await page.$eval("#tbody tr:nth-child(30)", (el) => el.scrollIntoView({ block: "center" }));
      const sticky = await page.$eval(".hg-table thead th", (el) => ({ position: getComputedStyle(el).position, top: el.getBoundingClientRect().top }));
      check(sticky.position === "sticky" && near(sticky.top, 0), "at 1280 the table header is stuck to the top of the viewport with row 30 in view", sticky);

      await page.emulateMedia({ colorScheme: "light" });
      await page.selectOption("#arch", "single-0");
      await page.selectOption("#metric", "safeExit");
      await (await page.$(".split")).screenshot({ path: `${OUT}/journalist-1280-light-childless-safe-exit.png` });
      await page.emulateMedia({ colorScheme: "dark", media: "print" });
      await page.screenshot({ path: `${OUT}/journalist-1280-print-from-dark.png`, fullPage: true });
      await page.emulateMedia({ media: null });
      await checkPdf(page);
    }
    check(errors.length === 0, "no console errors after the whole run", errors);
    await page.close();
  }

  /* The failed-fetch path: the masthead and one line, nothing of the page's skeleton (S6). */
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("**/data/summary.json", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto(`${BASE}/places.html`, { waitUntil: "networkidle" });
  const failed = await page.evaluate(() => ({
    alert: document.querySelector("#status[role=alert]")?.textContent, mainHidden: document.querySelector("#main").hidden,
    lede: document.querySelector(".lede").textContent.trim().slice(0, 11),
  }));
  check(failed.mainHidden && /^We could not load the weekly sweep: the data file answered HTTP 404\. Reload to try again\.$/.test(failed.alert) && failed.lede === "Each figure", "on a failed fetch the page shows the masthead and one alert line, in the reader's words", failed);
  await page.screenshot({ path: `${OUT}/journalist-1280-light-error.png`, fullPage: true });
  await page.close();
} finally {
  await browser.close();
  server.kill();
}

/**
 * Print from OS dark to Letter and read the PDF's own drawing ops (B1): the
 * WA tile must be drawn as a form whose stripes are an --ink-3 fill through
 * a striped soft mask, on the light sunk ground, and the NM (no-cliff) tile
 * must carry no such form. Positions come from the print layout, so the
 * check finds the tile, not a tile.
 */
async function checkPdf(page) {
  await page.goto(`${BASE}/places.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".tile");
  await page.emulateMedia({ colorScheme: "dark" });
  const pdf = await page.pdf({ format: "Letter", printBackground: true });
  writeFileSync(`${OUT}/journalist-letter-from-dark.pdf`, pdf);
  /* The print layout at Letter's width, which is where the PDF's positions
     come from — as long as nothing overflows it: Chromium shrinks the whole
     page to fit an overflowing table, and every position with it. */
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 816, height: 1056 });
  const want = await page.evaluate(() => {
    const at = (st) => { const r = document.querySelector(`.tile[data-st="${st}"]`).getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; };
    const hatched = document.querySelector(".hg-hatch-incomplete");
    return { WA: at("WA"), NM: at("NM"), stripe: getComputedStyle(hatched, "::after").backgroundColor, ground: getComputedStyle(hatched).backgroundColor,
      scrollWidth: document.documentElement.scrollWidth };
  });
  check(want.scrollWidth <= 816, "the print layout fits Letter's width, so the PDF is not shrunk to fit", want.scrollWidth);
  const objects = pdfObjects(pdf);
  const pages = pdfPages(objects);
  const p1 = pages[0];
  const forms = formsDrawn(pageContent(objects, p1), pageHeight(p1));
  const atTile = (t) => forms.filter((f) => near(f.x, t.x) && near(f.y, t.y));
  const [wa] = atTile(want.WA);
  const inner = wa ? reachable(objects, resource(objects, p1.dict, wa.name).dict) : [];
  const fills = inner.filter((o) => o.stream).flatMap((o) => [...o.stream.toString("latin1").matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)].map((m) => m.slice(1, 4).map((c) => Math.round(c * 255)).join()));
  const masks = inner.filter((o) => /\/Subtype \/Image/.test(o.dict) && /\/DeviceGray/.test(o.dict)).map(greyRowTransitions);
  const found = { pages: pages.length, formsOnPage1: forms.length, wa: wa && { x: wa.x.toFixed(1), y: wa.y.toFixed(1), ground: wa.ground?.fill?.join() }, fills: [...new Set(fills)], maskTransitions: masks, nm: atTile(want.NM).length };
  check(pages.length >= 2 && wa !== undefined, "the PDF's first page draws a form at the WA tile's print position", found);
  check(wa?.ground && wa.ground.fill.join() === rgb(want.ground).join() && near(wa.ground.w, want.WA.w) && near(wa.ground.h, want.WA.h), "the WA tile's ground is the light sunk colour, at the tile's size (print from dark is light)", { pdf: wa?.ground, want: [want.ground, want.WA.w] });
  check(fills.includes(rgb(want.stripe).join()), "the WA form fills in the light --ink-3 the stripes are drawn in", { fills: found.fills, want: rgb(want.stripe).join() });
  check(masks.some((n) => n >= 4), "the WA form's soft mask alternates along its middle row: stripes, not a smear", masks);
  check(atTile(want.NM).length === 0, "the NM (no-cliff) tile draws no such form", found.nm);
}

function expectIncompleteFor(st, archId) {
  const a = summary.archetypes.find((x) => x.id === archId);
  const pays = a.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (!a.married || a.id.includes("dual"));
  return (summary.coverage?.[st]?.unmodeled ?? []).some((u) => u.program !== "LIHEAP" && (!/child.?care/i.test(u.program) || pays));
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
