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
import { formsDrawn, greyRowTransitions, pageContent, pageHeight, pdfObjects, pdfPages, reachable, resource, textInks } from "./pdf.mjs";

const { chromium } = createRequire(import.meta.url)("playwright");

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const OUT = resolve(ROOT, "design/audit/app");
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
mkdirSync(OUT, { recursive: true });

const summary = JSON.parse(readFileSync(resolve(ROOT, "core/data/summary.json"), "utf8"));
const STATES = Object.keys(summary.states).sort();
/* The one child-care age rule (N8) and the cliff floor: core's, read from its
   source rather than typed here, so this proof and the page cannot disagree
   about them silently. The program names are the lib table's (M3), read the
   same way; the step between points is measured off a committed state file. */
const CHILDCARE_MAX_AGE = Number(readFileSync(resolve(ROOT, "core/src/stateDefaults.ts"), "utf8").match(/export const CHILDCARE_MAX_AGE = (\d+)/)[1]);
const CLIFF_MIN = Number(readFileSync(resolve(ROOT, "core/src/analyze.ts"), "utf8").match(/export const CLIFF_MIN = (\d+)/)[1]);
const PROGRAM_NAME = Object.fromEntries([...readFileSync(resolve(ROOT, "app/src/lib/programs.ts"), "utf8").matchAll(/^\s+(\w+): \{ phrase: "[^"]*", name: "([^"]*)" \}/gm)].map((m) => [m[1], m[2]]));
const ohPoints = JSON.parse(readFileSync(resolve(ROOT, "core/data/states/OH.json"), "utf8")).archetypes["single-2"].points;
const STEP = ohPoints[1].earnings - ohPoints[0].earnings;
const STATE_NAME = Object.fromEntries([...readFileSync(resolve(ROOT, "core/src/states.ts"), "utf8").matchAll(/\b([A-Z]{2}): "([^"]+)"/g)].map((m) => [m[1], m[2]]));
const money = (n) => "$" + n.toLocaleString("en-US");
const dateWords = (iso) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(iso));
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
    check(/^[A-Z][a-z-]+ sets of rules, [a-z-]+ household shapes, one earnings scale — from \$0 past 400% of the poverty line for that household\. Each figure/.test(lede),
      "the lede's counted sentence is written whole from the data (S6), and says what the one axis is (N12)", lede.slice(0, 90));
    /* The glossary sentence (S3) from core's floor, and PolicyEngine introduced on first use (S6). */
    const glossary = await page.$eval("#glossary", (el) => el.textContent.replace(/\s+/g, " ").trim());
    check(glossary.startsWith(`A cliff is a $1,000 raise that cuts net income by ${money(CLIFF_MIN)} or more; a danger zone is a run of earnings`) && /PolicyEngine, an open-source tax-and-benefit calculator/.test(glossary),
      "the glossary sentence defines cliff and danger zone from core's floor (S3) and introduces PolicyEngine (S6)", glossary.slice(0, 80));
    const options = await page.$$eval("#metric option", (els) => els.map((el) => el.textContent));
    check(options.length === 6 && options.every((o) => !/\b(it|that stretch|of those)\b/i.test(o)) && /worst danger zone/.test(options[2]) && /no danger zone remains/.test(options[3]),
      "every measure option stands on its own (S2)", options);
    if (width === 390) {
      const gutter = await page.$eval("h1", (el) => el.getBoundingClientRect().left);
      check(gutter >= 16, "the phone masthead keeps the page's 16px side gutter (N5)", gutter);
    }

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
        /* The legend draws its hatch swatch only while some state is
           incomplete — none is, since NJ and WA became complete on 2026-09-16
           — so measure the stylesheet's treatment on a probe carrying the
           same classes, removed once read. The contrast is the CSS's, not
           the data's. */
        let swatch = document.querySelector(".hg-swatch--incomplete");
        const probe = !swatch;
        if (probe) { swatch = document.createElement("span"); swatch.className = "hg-swatch hg-swatch--incomplete hg-hatch-incomplete"; document.querySelector(".figure").append(swatch); }
        const fig = cs(document.querySelector(".figure")).backgroundColor;
        const ramp = [...document.querySelectorAll(".scale .sw")].map((el) => cs(el).backgroundColor);
        const shaded = [...document.querySelectorAll(".tile")].filter((el) => !/hg-tile--/.test(el.className)).map((el) => [cs(el).backgroundColor, cs(el).color]);
        const byBin = ramp.map((bg) => shaded.find(([b]) => b === bg));
        const none = document.querySelector(".hg-tile--none");
        const out = { fig, stripe: cs(swatch, "::after").backgroundColor, ground: cs(swatch).backgroundColor, ramp, byBin,
          noneEdge: none && cs(none).outlineColor };
        if (probe) swatch.remove();
        return out;
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
    await page.selectOption("#sort", "safeExit");
    await page.click('.tile[data-st="TX"]');
    const url = new URL(page.url());
    check(url.search === "?household=married-dual-2&measure=safeExit&sort=safeExit&state=TX", "the URL carries household, measure, sort and state", url.search);
    /* The tile click has a visible answer (S1): the readout fills and the block is brought into view with focus on its heading. */
    const afterTile = await page.evaluate(() => {
      const heading = document.querySelector("#stateTitle"), r = heading.getBoundingClientRect();
      return { focused: document.activeElement === heading, inView: r.top >= 0 && r.bottom <= innerHeight, readout: document.querySelector("#readout").textContent };
    });
    check(afterTile.focused && afterTile.inView && afterTile.readout.startsWith("Texas — "), "a tile click fills the readout and scrolls the corrections block into view with focus on its heading (S1)", afterTile);
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
    check(restored.arch === "married-dual-2" && restored.metric === "safeExit" && restored.sort === "safeExit", "reloading the URL restores the three filters", restored);
    check(restored.tile === "TX" && restored.rank === "TX" && restored.row === "TX", "reloading the URL restores the open state on the map, in the ranking and in the table");
    check(/^Corrections applied in Texas \(\d+\)$/.test(restored.title) && restored.corrections === 3, "Texas's coverage block: three corrections applied", restored.title);
    const txAll = summary.coverage.TX.unmodeled.filter((u) => u.scope === "all").map((u) => u.program);
    const txOwn = summary.coverage.TX.unmodeled.filter((u) => u.scope !== "all").map((u) => u.program);
    const excludes = await page.$$eval("#excludes li", (els) => els.map((el) => el.textContent));
    check(txAll.length > 0 && txAll.every((p) => !restored.unmod.includes(p) && excludes.some((t) => t.startsWith(`${p}, in every state:`))) && txOwn.every((p) => restored.unmod.includes(p)),
      "a gap every state shares is listed once under the method, never under a state; a state's own gaps stay in its block (S8)", { txAll, txOwn, unmod: restored.unmod });
    check(restored.notes.every((n) => /^[A-Z]/.test(n) && !/WORKAROUND|\.ts\b/.test(n) && /#\d{4}/.test(n)), "every correction note is a sentence with its issue number and no code pointer (S9)", restored.notes[0]);
    const dual = (st) => summary.states[st]["married-dual-2"];
    const comparable = STATES.filter((st) => dual(st).cliffCount > 0 && !expectIncompleteFor(st, "married-dual-2"));
    const lowerBound = comparable.filter((st) => dual(st).safeExit === null || dual(st).leapIsLowerBound);
    const expectedFirst = lowerBound.length ? lowerBound[0] : comparable.filter((st) => dual(st).safeExit !== null).sort((a, b) => dual(b).safeExit - dual(a).safeExit)[0];
    const tableOrder = await page.$$eval("#tbody tr:not(.group) .hg-row-btn", (els) => els.map((el) => el.dataset.st));
    const groupRows = await page.$$eval("#tbody tr.group th", (els) => els.map((el) => el.textContent));
    check(restored.firstRow === expectedFirst && tableOrder.slice(0, lowerBound.length).sort().join() === lowerBound.sort().join() && groupRows[0] === `Past the top of the axis — no safe exit found on the scale (${lowerBound.length})`,
      "sorted by safe exit, the lower-bound rows lead the table under their own heading, before the largest comparable exit (B1)", { firstRow: restored.firstRow, expectedFirst, lowerBound, groupRows });
    /* The child-care subsidy's footing is stated in every block, from the coverage record (B2). */
    const subsidyLine = (st) => `Child-care subsidy: ${summary.coverage[st].corrections.childcareSubsidy.source === "added by HotGap" ? `added by HotGap for ${STATE_NAME[st]}` : `inside PolicyEngine's net income for ${STATE_NAME[st]}`}.`;
    const txSub = await page.$eval("#stateSub", (el) => el.textContent);
    check(txSub.endsWith(subsidyLine("TX")), "Texas's block states the child-care subsidy's footing from corrections.childcareSubsidy (B2)", txSub);

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

    /* The readout and the block's first line carry the figure with its step, its programs and its county (B3, B4), every value the file's. */
    await page.selectOption("#arch", "single-2");
    await page.selectOption("#metric", "biggestLoss");
    await page.click('#rankList .hg-row-btn[data-st="OH"]');
    const oh = summary.states.OH["single-2"], ohCov = summary.coverage.OH;
    const expectedOh = `Ohio — ${money(oh.biggestLoss)} lost at ${money(oh.biggestLossAt)} → ${money(oh.biggestLossAt + STEP)}, when ${oh.biggestLossPrograms.map((id) => PROGRAM_NAME[id]).join(" and ")} ${oh.biggestLossPrograms.length === 1 ? "ends" : "end"}. Renter, ${ohCov.vintages.county.name}.`;
    const ohText = await page.evaluate(() => ({
      readout: document.querySelector("#readout").textContent.replace(/\s+/g, " ").trim(),
      step: document.querySelector("#stateStep").textContent.replace(/\s+/g, " ").trim(),
      sub: document.querySelector("#stateSub").textContent, src: document.querySelector("#stateSrc").textContent,
      bold: [...document.querySelectorAll("#readout b")].map((b) => b.textContent),
      unmod: [...document.querySelectorAll("#unmod li .hg-rows__at")].map((el) => el.textContent),
    }));
    check(ohText.readout === `${expectedOh} Details below ↓` && ohText.step === expectedOh, "Ohio's readout and block line are the summary's fields: the loss, the step it happens at, the programs it ends, the county (B3, B4)", { readout: ohText.readout, expectedOh });
    check(ohText.bold.join("|") === `Ohio|${money(oh.biggestLoss)}`, "the readout marks the state and the figure, as the CurveReadout marks its figure", ohText.bold);
    check(ohText.sub.endsWith(subsidyLine("OH")) && /the fixes other states need were not needed here/.test(ohText.sub), "Ohio's (0) block says the fixes were not needed and states the subsidy's footing (B2)", ohText.sub);
    check(ohText.src.includes(`County: ${ohCov.vintages.county.name} (the state's most populous; ${ohCov.vintages.county.vintage}).`) && !/Reach/.test(ohText.src),
      "the state's source line names the county (B4) and no longer describes reach (N9)", ohText.src);
    check(!ohText.unmod.includes("LIHEAP") && (await page.$eval("#unmodTitle", (el) => el.hidden)) === (ohText.unmod.length === 0), "Ohio's block lists no universal gap under the state (S8)", ohText.unmod);
    check(await page.$eval("#readout", (el) => el.closest(".figure") !== null && getComputedStyle(el).minHeight !== "0px"), "the readout is the figure's own .hg-readout, under the map");
    /* The suggested citation, from the run's facts and the page's own address (N13). */
    const cite = await page.$eval("#cite", (el) => el.textContent);
    check(cite.startsWith("Cite as: HotGap, What a raise costs, state by state, ") && cite.includes(`${summary.year} rules on PolicyEngine (policyengine-us ${summary.model.version})`) && cite.includes(`run of ${dateWords(summary.generated)}`) && cite.includes(`${BASE}/places.html?household=single-2&measure=biggestLoss&sort=safeExit&state=OH`),
      "the Cite line carries the year, the model, the run date and this view's own URL (N13)", cite);
    /* The page's own words carry no developer vocabulary (N7): core's notes and the machine columns are the exceptions and are excluded here. */
    const ownText = await page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      for (const el of clone.querySelectorAll(".hg-cite, #methodList li:last-child, option")) el.remove();
      return clone.textContent;
    });
    check(!/\bsweep\b|\bendpoint\b|policyengine-us #|PR #|nj_property_tax_relief|PolicyEngine variable/i.test(ownText), "no sweep, endpoint, issue number or variable name in the page's own words (N7)");
    const variableTitle = await page.evaluate(() => { document.querySelector('.tile[data-st="NJ"]').click(); return [...document.querySelectorAll("#other .hg-cite")].map((el) => el.title); });
    check(variableTitle.length === summary.coverage.NJ.otherBenefits.length && variableTitle.every((t, i) => t === `PolicyEngine variable: ${summary.coverage.NJ.otherBenefits[i].variable}`), "the other-benefit variable lives in the cite's title, not in the prose (N7)", variableTitle);
    check((await page.$eval("#tableNote", (el) => el.textContent)).includes("the arrow keys move between states and Enter selects"), "the keyboard note says Enter selects (N10)");

    /* Nebraska's case (S9): an exact leap beside an unknown safe exit, and the past-the-axis cell points at the box that explains it. */
    const single = (st) => summary.states[st]["single-2"];
    const split = STATES.filter((st) => single(st).cliffCount > 0 && single(st).safeExit === null && !single(st).leapIsLowerBound && !expectIncompleteFor(st, "single-2"));
    const splitCells = await page.evaluate((sts) => sts.map((st) => {
      const tr = document.querySelector(`#tbody .hg-row-btn[data-st="${st}"]`).closest("tr");
      return { st, leap: tr.children[3].textContent.trim(), exit: tr.children[4].textContent.trim(), describedBy: tr.children[4].querySelector("[aria-describedby]")?.getAttribute("aria-describedby") };
    }), split);
    const note = await page.$eval("#pastAxisNote", (el) => el.textContent);
    check(split.length > 0 && splitCells.every((c) => c.leap === money(single(c.st).leap) && c.exit === "past the axis" && c.describedBy === "pastAxisNote") && /last danger zone/.test(note) && /only when the worst zone/.test(note),
      "a state whose last zone runs off the axis prints an exact leap and a safe exit that points at the box saying why (S9)", { split, splitCells, note: note.slice(0, 120) });
    await page.selectOption("#arch", "married-dual-2");
    await page.selectOption("#metric", "safeExit");
    await page.selectOption("#sort", "safeExit");

    /* A count measure's scale is classes of whole numbers, never a repeated bound (S5). */
    await page.selectOption("#metric", "deferredCliffCount");
    const scale = await page.evaluate(() => ({
      swatches: document.querySelectorAll(".scale .sw").length,
      labels: [...document.querySelectorAll("#scaleLabels span")].map((el) => el.textContent),
      caption: document.querySelector("#figSrc").textContent.match(/Bins: [^.]*/)[0],
      src: document.querySelector("#figSrc").textContent,
      sub: document.querySelector("#figSub").textContent,
    }));
    check(scale.swatches === scale.labels.length && new Set(scale.labels).size === scale.labels.length && /classes? from \d+ to \d+/.test(scale.caption),
      "deferred cliffs: one swatch per class, no label repeated, the caption counts the classes", scale.caption);
    /* Nine comparable states in ten in one class: the caption says so (N11), from the same rows. */
    const dualComparable = STATES.filter((st) => dual(st).cliffCount > 0 && !expectIncompleteFor(st, "married-dual-2"));
    const byCount = new Map(); for (const st of dualComparable) byCount.set(dual(st).deferredCliffCount, (byCount.get(dual(st).deferredCliffCount) ?? 0) + 1);
    const [topValue, topN] = [...byCount].sort((a, b) => b[1] - a[1])[0];
    const expectOneClass = topN / dualComparable.length >= 0.9 ? `${topN} of the ${dualComparable.length} comparable states have ${topValue === 0 ? "none" : topValue}.` : null;
    check(expectOneClass === null ? !/comparable states have/.test(scale.src) : scale.src.includes(expectOneClass), "the near-monochrome deferred map explains itself in the caption (N11)", { expectOneClass });
    check(/Head Start.*Medicaid or CHIP.*Transitional Medical Assistance/.test(scale.sub), "the deferred map's subtitle names the three mechanisms (S4)", scale.sub);
    await page.selectOption("#metric", "safeExit");

    /* CSV: the rendered table's rows, in order, with provenance equal to the file's. */
    await page.selectOption("#sort", "state");
    const rendered = await page.$$eval("#tbody tr:not(.group)", (trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent.trim())));
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#csvBtn")]);
    const csv = readFileSync(await download.path(), "utf8").replace(/^﻿/, "");
    const rows = parseCsv(csv);
    const head = rows[0], body = rows.slice(1);
    const col = (n) => head.indexOf(n);
    const num = (s) => (s === "none" || s === "past the axis" ? "" : s.replace(/\s*\(floor\)$/, "").replace(/[^\d]/g, ""));
    let same = body.length === rendered.length;
    for (let i = 0; same && i < body.length; i++) {
      const r = rendered[i], c = body[i];
      same = c[col("state")] === r[0].replace(/floor$/, "") && num(r[1]) === c[col("biggest_one_step_loss")] && num(r[2]) === c[col("danger_zone_width")]
        && num(r[3]) === c[col("leap")] && num(r[4]) === c[col("safe_exit")] && num(r[5]) === c[col("cliff_count")] && num(r[6]) === c[col("deferred_cliff_count")]
        && r[7] === c[col("figures")];
      if (!same) console.log("     mismatch at row", i, r, c);
    }
    check(same, `the CSV's ${body.length} rows equal the rendered table's ${rendered.length} rows, cell for cell`, download.suggestedFilename());
    check(/^hotgap-2-adults-both-working-2-children-3-and-7-\d{4}-\d\d-\d\d\.csv$/.test(download.suggestedFilename()), "the CSV is named by the household as the reader knows it (N7)", download.suggestedFilename());
    check(head.slice(0, 7).join() === "state,state_name,archetype_id,archetype,biggest_one_step_loss,biggest_loss_at,biggest_loss_programs" && (await page.$eval("#methodList li:last-child", (el) => el.textContent)).includes(head.join(", ")),
      "the CSV's header order is the one the method panel's download line prints", head.length);
    const prov = body.every((c) => c[col("sweep_generated")] === summary.generated && c[col("model_endpoint")] === summary.model.endpoint
      && c[col("model_version")] === summary.model.version && c[col("policy_year")] === summary.year
      && c[col("childcare_price_vintage")] === summary.coverage[c[col("state")]].vintages.childcare.preschool
      && c[col("county_name")] === (summary.coverage[c[col("state")]].vintages.county.name ?? "")
      && c[col("county_fips")] === summary.coverage[c[col("state")]].vintages.county.fips
      && c[col("model_label")] === `HotGap hosted engine, policyengine-us ${summary.model.version}`
      && c[col("source")] === "HotGap/PolicyEngine"
      && c[col("rent_vintage")] === summary.coverage[c[col("state")]].vintages.rent.vintage);
    check(prov && !head.includes("reach_vintages"), "every CSV row's provenance columns equal summary.json's generated, model, county and vintages; the model has a label; reach is gone (B4, N8, N9)");
    const dcRow = body.find((c) => c[col("state")] === "DC");
    check(dcRow && dcRow.length === head.length && dcRow[col("state_name")] === STATE_NAME.DC && dcRow[col("source")] === "HotGap/PolicyEngine", "the DC row reads whole through an independent RFC 4180 parser, its source the one constant (N8)", { name: dcRow?.[col("state_name")], source: dcRow?.[col("source")] });
    const stepCols = body.every((c) => { const m = summary.states[c[col("state")]]["married-dual-2"]; return c[col("biggest_loss_at")] === (m.cliffCount === 0 ? "" : String(m.biggestLossAt)) && c[col("biggest_loss_programs")] === m.biggestLossPrograms.map((id) => PROGRAM_NAME[id]).join("; "); });
    check(stepCols, "every CSV row carries the worst step's earnings and programs from the file (B3)");

    /* The incomplete rows carry their caveat in their own cells (S5), one bar means selection (S7), and the flag is on screen at any width (S10). */
    const incompleteRows = STATES.filter((st) => expectIncompleteFor(st, "married-dual-2"));
    const cells = await page.evaluate((sts) => sts.map((st) => {
      const tr = document.querySelector(`#tbody .hg-row-btn[data-st="${st}"]`).closest("tr");
      const scroller = document.querySelector("#scroller");
      const mark = tr.querySelector(".flag-mark");
      return { st, cells: [...tr.children].slice(1).map((td) => td.textContent.trim()), bar: getComputedStyle(tr.firstElementChild).boxShadow,
        selected: tr.querySelector("[aria-current='true']") !== null, ink: getComputedStyle(document.body).color,
        mark: mark && { text: mark.textContent, visible: getComputedStyle(mark).display !== "none", right: mark.getBoundingClientRect().right, edge: scroller.getBoundingClientRect().right, scrollLeft: scroller.scrollLeft } };
    }), incompleteRows);
    const programsOf = (st) => summary.coverage[st].unmodeled.filter((u) => u.scope !== "all").map((u) => u.program).join(" and ");
    check(cells.every((c) => c.cells.slice(0, 6).every((v) => v === "none" || /\(floor\)$/.test(v) || v === "past the axis") && c.cells[6] === `floor: ${programsOf(c.st)} not modelled`),
      "an incomplete row's cells carry the floor caveat and the Figures cell names the program (S5)", cells.map((c) => c.cells[6]));
    /* A left bar is a positive inset x-offset (the sticky column's right-edge rule is a negative one); the only one allowed is the selection's, in ink, on the selected row. */
    const leftBar = (shadow) => shadow.split("),").map((part) => part.match(/^\s*(rgba?\([^)]*\)) (-?\d+)px -?\d+px -?\d+px -?\d+px inset/)).filter((m) => m && Number(m[2]) > 0).map((m) => m[1]);
    check(cells.every((c) => leftBar(c.bar).every((colour) => c.selected && colour === c.ink)), "an incomplete row carries no grey left bar; the only left bar is the selected row's, in ink (S7)", cells.map((c) => [c.st, c.selected, c.bar]));
    const scrollerState = await page.$eval("#scroller", (el) => ({ over: el.scrollWidth > el.clientWidth, more: el.dataset.more ?? null, gradients: (getComputedStyle(el).backgroundImage.match(/linear-gradient/g) ?? []).length, overflow: getComputedStyle(el).overflowX }));
    if (width === 390) {
      check(cells.every((c) => c.mark && c.mark.visible && c.mark.text === "floor" && c.mark.scrollLeft === 0 && c.mark.right <= c.mark.edge), "at 390 the incomplete rows' amber mark sits in the state cell, on screen without a swipe (S10)", cells.map((c) => c.mark));
      check(scrollerState.over && scrollerState.gradients === 4 && scrollerState.more === "Swipe for more →", "at 390 the table overflows its scroller, the system's edge fade is drawn and the page's swipe words are set (S10)", scrollerState);
      const stickyState = await page.$eval("#tbody th", (el) => ({ position: getComputedStyle(el).position, left: getComputedStyle(el).left }));
      check(stickyState.position === "sticky" && stickyState.left === "0px", "at 390 the state column is sticky (S10)", stickyState);
    } else {
      check(!scrollerState.over && scrollerState.more === null && scrollerState.overflow === "visible", "at 1280 the table fits and no swipe words are set (S10)", scrollerState);
    }
    /* The order control names every measure (N2) and the strip counts its rows (N3). */
    const sortOptions = await page.$$eval("#sort option", (els) => els.map((el) => [el.value, el.textContent]));
    await page.selectOption("#sort", "cliffCount");
    const byCliffs = await page.$$eval("#tbody tr:not(.group) .hg-row-btn", (els) => els.map((el) => el.dataset.st));
    const expectByCliffs = dualComparable.slice().sort((a, b) => dual(b).cliffCount - dual(a).cliffCount || a.localeCompare(b));
    const rankedByCliffs = byCliffs.filter((st) => dualComparable.includes(st));
    const nonIncreasing = rankedByCliffs.every((st, i) => i === 0 || dual(rankedByCliffs[i - 1]).cliffCount >= dual(st).cliffCount);
    check(sortOptions.length === 7 && sortOptions[5][1] === "Number of cliffs, most first" && nonIncreasing && rankedByCliffs.length === expectByCliffs.length && (await page.$eval("#tabCap", (el) => el.textContent)).includes("by number of cliffs, most first"),
      "the table order control offers every measure, and sorts the table by it without changing the map (N2)", { options: sortOptions.map(([v]) => v), first: byCliffs.slice(0, 3) });
    await page.selectOption("#sort", "state");
    await page.selectOption("#metric", "biggestLoss");
    const ranked = dualComparable.filter((st) => dual(st).biggestLoss > 0).sort((a, b) => dual(b).biggestLoss - dual(a).biggestLoss);
    const ordinals = await page.$$eval("#rank .hg-row-btn", (els) => els.map((el) => [el.querySelector(".n").textContent, el.dataset.st]));
    /* Competition ranking: a state's rank is one more than the number of states with a larger value, so ties share a rank. */
    const rankOf = (st) => `${1 + ranked.filter((o) => dual(o).biggestLoss > dual(st).biggestLoss).length}.`;
    check(ordinals.length === ranked.length && ordinals.every(([n, st], i) => n === rankOf(st) && dual(st).biggestLoss === dual(ranked[i]).biggestLoss), "the ranked strip prints each state's rank, ties sharing one (N3)", ordinals.slice(28, 31));
    await page.selectOption("#metric", "deferredCliffCount");
    const tied = await page.$$eval("#rank .hg-row-btn", (els) => els.map((el) => [el.querySelector(".n").textContent, el.querySelector(".v").textContent]));
    const firstZero = tied.findIndex(([, v]) => v === "0");
    check(tied.slice(0, firstZero).every(([n]) => n === "1.") && (firstZero < 0 || tied[firstZero][0] === `${firstZero + 1}.`), "on a count measure every state at the top value is first, and the first at the next value takes the rank after them (N3)", { firstZero, sample: tied.slice(firstZero - 1, firstZero + 1) });
    /* The leap's lower-bound rows lead the strip under their heading (B1). */
    await page.selectOption("#metric", "leap");
    const leapLower = dualComparable.filter((st) => dual(st).leapIsLowerBound);
    const strip = await page.evaluate(() => ({
      lower: [...document.querySelectorAll("#rankLower .hg-row-btn")].map((el) => [el.dataset.st, el.querySelector(".v").textContent]),
      title: document.querySelector("#lowerTitle").textContent, hidden: document.querySelector("#lowerGroup").hidden,
      before: document.querySelector("#lowerGroup").compareDocumentPosition(document.querySelector("#rank")) & Node.DOCUMENT_POSITION_FOLLOWING,
      first: document.querySelector("#rank .hg-row-btn")?.dataset.st,
    }));
    check(strip.lower.map(([st]) => st).sort().join() === leapLower.sort().join() && strip.lower.every(([st, v]) => v === `≥ ${money(dual(st).leap)}`) && strip.title === `At least this much — the exact size runs past the axis (${leapLower.length})` && !strip.hidden && strip.before,
      "for the leap, the lower-bound states lead the strip under their own heading with a ≥ figure, before the largest exact leap (B1)", strip);
    await page.selectOption("#metric", "safeExit");

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
  check(failed.mainHidden && /^We could not load the weekly run: the data file answered HTTP 404\. Reload to try again\.$/.test(failed.alert) && failed.lede === "Each figure", "on a failed fetch the page shows the masthead and one alert line, in the reader's words", failed);
  await page.screenshot({ path: `${OUT}/journalist-1280-light-error.png`, fullPage: true });
  await page.close();
} finally {
  await browser.close();
  server.kill();
}

/**
 * Print from OS dark to Letter and read the PDF's own drawing ops (B1): a
 * hatched tile must be drawn as a form whose stripes are an --ink-3 fill
 * through a striped soft mask, on the light sunk ground, and the NM
 * (no-cliff) tile must carry no such form. Positions come from the print
 * layout, so the check finds the tile, not a tile.
 *
 * The subject is the first state the data hatches for the archetype shown.
 * When the sweep hatches none — the case since 2026-09-16, when NJ and WA
 * became complete — the hatch classes are put on the WA tile for the print
 * alone, and every check says so: the print path is what B1 is about, and
 * a proof with no subject would otherwise pass by saying nothing.
 */
async function checkPdf(page) {
  await page.goto(`${BASE}/places.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".tile");
  const shownArch = await page.$eval("#arch", (el) => el.value);
  const fromData = STATES.find((st) => expectIncompleteFor(st, shownArch));
  const subject = fromData ?? "WA";
  if (!fromData) await page.$eval(`.tile[data-st="${subject}"]`, (el) => el.classList.add("hg-tile--incomplete", "hg-hatch-incomplete"));
  const label = fromData ? `the ${subject} tile (hatched by the data)` : `the ${subject} tile (hatched for the print only: no state is incomplete on this sweep)`;
  /* OS dark with no data-theme attribute: the path the audit's B2 proof did
     not take (it printed through the theme button), and the one on which
     tokens.css's print rule lost to its own OS-dark rule until 30d7e99. */
  await page.emulateMedia({ colorScheme: "dark" });
  const hasTheme = await page.evaluate(() => document.documentElement.hasAttribute("data-theme"));
  const darkInk = await page.$eval("body", (el) => getComputedStyle(el).color);
  const pdf = await page.pdf({ format: "Letter", printBackground: true });
  writeFileSync(`${OUT}/journalist-letter-from-dark.pdf`, pdf);
  /* The print layout at Letter's width, which is where the PDF's positions
     come from — as long as nothing overflows it: Chromium shrinks the whole
     page to fit an overflowing table, and every position with it. */
  await page.emulateMedia({ media: "print" });
  await page.setViewportSize({ width: 816, height: 1056 });
  const want = await page.evaluate((subject) => {
    const at = (st) => { const r = document.querySelector(`.tile[data-st="${st}"]`).getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; };
    const hatched = document.querySelector(`.tile[data-st="${subject}"].hg-hatch-incomplete`);
    return { WA: at(subject), NM: at("NM"), stripe: getComputedStyle(hatched, "::after").backgroundColor, ground: getComputedStyle(hatched).backgroundColor,
      scrollWidth: document.documentElement.scrollWidth };
  }, subject);
  check(want.scrollWidth <= 816, "the print layout fits Letter's width, so the PDF is not shrunk to fit", want.scrollWidth);
  const lightInk = await page.$eval("body", (el) => getComputedStyle(el).color);
  const objects = pdfObjects(pdf);
  const pages = pdfPages(objects);
  const p1 = pages[0];
  const inks = textInks(pageContent(objects, p1));
  check(!hasTheme && lightInk !== darkInk && inks.includes(rgb(lightInk).join()) && !inks.includes(rgb(darkInk).join()),
    "printed from OS dark with no data-theme, page 1's text is in the light-scheme ink and none is in the dark-scheme ink", { inks, lightInk, darkInk, hasTheme });
  const forms = formsDrawn(pageContent(objects, p1), pageHeight(p1));
  const atTile = (t) => forms.filter((f) => near(f.x, t.x) && near(f.y, t.y));
  const [wa] = atTile(want.WA);
  const inner = wa ? reachable(objects, resource(objects, p1.dict, wa.name).dict) : [];
  const fills = inner.filter((o) => o.stream).flatMap((o) => [...o.stream.toString("latin1").matchAll(/([\d.]+) ([\d.]+) ([\d.]+) rg/g)].map((m) => m.slice(1, 4).map((c) => Math.round(c * 255)).join()));
  const masks = inner.filter((o) => /\/Subtype \/Image/.test(o.dict) && /\/DeviceGray/.test(o.dict)).map(greyRowTransitions);
  const found = { pages: pages.length, formsOnPage1: forms.length, wa: wa && { x: wa.x.toFixed(1), y: wa.y.toFixed(1), ground: wa.ground?.fill?.join() }, fills: [...new Set(fills)], maskTransitions: masks, nm: atTile(want.NM).length };
  check(pages.length >= 2 && wa !== undefined, `the PDF's first page draws a form at ${label}'s print position`, found);
  check(wa?.ground && wa.ground.fill.join() === rgb(want.ground).join() && near(wa.ground.w, want.WA.w) && near(wa.ground.h, want.WA.h), `${label}'s ground is the light sunk colour, at the tile's size (print from dark is light)`, { pdf: wa?.ground, want: [want.ground, want.WA.w] });
  check(fills.includes(rgb(want.stripe).join()), `${label}'s form fills in the light --ink-3 the stripes are drawn in`, { fills: found.fills, want: rgb(want.stripe).join() });
  check(masks.some((n) => n >= 4), `${label}'s soft mask alternates along its middle row: stripes, not a smear`, masks);
  check(atTile(want.NM).length === 0, "the NM (no-cliff) tile draws no such form", found.nm);
}

function expectIncompleteFor(st, archId) {
  const a = summary.archetypes.find((x) => x.id === archId);
  const pays = a.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (!a.married || a.id.includes("dual"));
  return (summary.coverage?.[st]?.unmodeled ?? []).some((u) => u.program !== "LIHEAP" && (!/child.?care/i.test(u.program) || pays));
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
