// The citizen surface, end to end, through the Worker (app/README.md
// § Proofs): the California single parent with a 3- and a 7-year-old at
// $30,000, at 390 and 1280, light and dark. Measured, not asserted: the
// weight of the page (weight.mjs, the same function the owner runs), the
// marks against the cliff list, the table against the plotted curve, the
// type floors on the SVG text, the loss ink's contrast on its ground, and a
// screenshot beside the audit's (design/audit/app/citizen-*).
//
// The page is picture first since 2026-09-18 (design/PICTURE-FIRST-2026-09-18.md):
// one sentence, the figure, then three named disclosures. So the proofs open
// a disclosure before reading what is inside it, which is also the proof that
// it opens.
//
// HOTGAP_EXPECT_SOURCE=archetype runs the archetype assertions instead
// (start wrangler with a dead HOTGAP_PE_URL first; the README says how).
import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pageContent, pdfObjects, pdfPages, textInks } from "./pdf.mjs";
import { AUDIT_DIR as OUT, consoleErrors, contrast, noOverflow, outDir, rgb } from "./support.js";
import { MEASURE, OPEN_ALL } from "./weight.mjs";

const EXPECT_SOURCE = process.env.HOTGAP_EXPECT_SOURCE ?? "live";
const HOUSEHOLD = "/?zip=94110&kids=3%2C7&pay=30000&unit=year";
/** Plan 9 § Citizen's own review: the keep-next sentence in the answer's rhythm, and the far-cliffs clause. */
const KEEP_RATE_DIR = outDir("design/review/keep-rate");

/** What the picture-first pass promises a reader, per width (PICTURE-FIRST § Proofs). */
const BUDGET = { words: 120, figureTop: 120, share: { 390: 0.5, 1280: 0.6 } } as const;

/** Open a named disclosure by pressing it, which is also the proof that pressing it works. */
async function openPanel(page: Page, name: string): Promise<void> {
  const panel = page.locator("details.hg-disclosure", { has: page.getByRole("heading", { name, exact: true }) }).first();
  if (!(await panel.evaluate((d) => (d as HTMLDetailsElement).open))) await panel.locator("summary").first().click();
  await expect(panel).toHaveAttribute("open", "");
}

interface Ev {
  analysis: {
    cliffs: { startEarnings: number; endEarnings: number; drop: number; deferral: unknown; programsLost: string[]; position: number | null }[];
    dangerZones: { startEarnings: number; endEarnings: number | null }[];
    currentEarnings: number; currentNet: number;
  };
  curve: { points: { earnings: number; netIncome: number }[] };
  personal: { zone: { startEarnings: number; peakNet: number } | null; escapeEarnings: number | null; keepNext: { over: number; kept: number } | null };
  escape: { safeExitEarnings: number | null };
}

/** The plotted curve: the points as they came — a deferred loss is in the line like any other (2026-09-17). */
const plotted = (ev: Ev): Map<number, number> => new Map(ev.curve.points.map((p) => [p.earnings, p.netIncome]));
const dollars = (text: string) => [...text.matchAll(/\$([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, "")));

/** Land on the household and keep the evaluation the page rendered: the measure for the marks and the table. */
async function loaded(page: Page): Promise<Ev> {
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await page.goto(HOUSEHOLD);
  const ev = (await (await evaluated).json()) as Ev;
  await expect(page.locator("#answer")).toContainText("More pay won't leave you better off");
  await page.locator("#chart svg path").first().waitFor();
  return ev;
}

for (const scheme of ["light", "dark"] as const) {
  for (const width of [390, 1280]) {
    test(`${scheme} at ${width}px: verdict, curve, marks, rows, table, floors, contrast, screenshot (source ${EXPECT_SOURCE})`, async ({ page }) => {
      test.skip(EXPECT_SOURCE !== "live", "the live proof");
      const errors = consoleErrors(page);
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: width < 720 ? 844 : 900 });
      const ev = await loaded(page);
      await expect(page.locator("#source")).toHaveAttribute("data-source", "live");

      /* The page's weight, by the same function `node e2e/weight.mjs` runs: one
         sentence and the picture, and the picture on the first screen. */
      const weight = await page.evaluate(MEASURE);
      console.log(`${scheme} ${width}: ${weight.total} words (${weight.html} prose + ${weight.svg} in the picture); figure top ${weight.figureTop}px, ${weight.figureShare} of screen 1`);
      expect(weight.total).toBeLessThanOrEqual(BUDGET.words);
      expect(weight.figureTop).toBeLessThanOrEqual(BUDGET.figureTop);
      expect(weight.figureShare).toBeGreaterThanOrEqual(BUDGET.share[width as 390 | 1280]);
      /* …and nothing was deleted to get there: every disclosure open carries the page it carried before. */
      await page.evaluate(OPEN_ALL);
      const opened = await page.evaluate(MEASURE);
      expect(opened.html).toBeGreaterThan(6 * weight.html);
      await page.evaluate(() => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details")) d.open = false; });
      /* The answer is the figure's own caption, so the picture's accessible name IS the answer. */
      await expect(page.locator("figure > figcaption#answer")).toHaveCount(1);

      /* The verdict is the danger-zone shape, keyed to the marks, and its figures are the evaluation's. */
      const answer = page.locator("#answer");
      await expect(answer).toContainText("More pay won't leave you better off until you're past");
      await expect(answer.locator(".hg-amt--gap")).toHaveCount(2);
      await expect(answer.locator(".hg-amt--keep")).toHaveCount(0);
      expect(dollars((await answer.textContent())!)).toEqual([ev.personal.escapeEarnings, ev.personal.escapeEarnings! - ev.analysis.currentEarnings]);
      /* What the answer stopped saying is on the picture instead: what this household keeps now, at its own diamond. */
      const youKeep = await page.locator("#chart svg text.hg-label--ink").allTextContents();
      expect(youKeep.join(" ")).toContain(`$${Math.round(ev.analysis.currentNet).toLocaleString("en-US")}`);

      /* "It happens again between A and B": A is a real zone's start beyond the exit and B the safe exit — never assumed to abut the exit. */
      await openPanel(page, "What happens at each step");
      /* The sentence exists only when there is one to say: no further zone, no paragraph. */
      const againEl = page.locator("#again");
      const again = (await againEl.count()) ? await againEl.textContent() : null;
      const beyond = ev.analysis.dangerZones.filter((z) => z.startEarnings >= ev.personal.escapeEarnings!);
      if (beyond.length) {
        expect(again).toMatch(/^It happens/);
        expect(dollars(again!).slice(0, 2)).toEqual([beyond[0].startEarnings, ev.escape.safeExitEarnings]);
      } else expect(again).toBeNull();
      /* Far cliffs framed by company (Plan 9 § Citizen): the clause names the first cliff at or past FAR_POSITION
         from that same first further zone on, and "n in 10" is its own position, in tenths — never typed. */
      const farCliff = beyond.length
        ? ev.analysis.cliffs.find((c) => c.startEarnings >= beyond[0].startEarnings && c.position !== null && c.position >= 80) ?? null
        : null;
      if (farCliff) {
        expect(again).toContain("are past what");
        expect(dollars(again!)).toEqual([beyond[0].startEarnings, ev.escape.safeExitEarnings, farCliff.startEarnings]);
        expect(again).toContain(`${Math.round((farCliff.position ?? 0) / 10)} in 10`);
      } else expect(again ?? "").not.toContain("are past what");

      /* Your keep rate on the next stretch (Plan 9 § Citizen): the two money figures are keepNext.over and
         keepNext.kept × keepNext.over from the response — the first at the pay-unit step ($500 a year), the second at the change step ($100 a year: lib/format.ts payChangeRounded, so a kept $400 is never "$0");
         a cliff inside the stretch is named at its landing point, a sub-10¢ stretch with none reads as a flat stretch. */
      const keepNextP = page.locator("#keep-next");
      if (ev.personal.keepNext === null) {
        await expect(keepNextP).toBeEmpty();
      } else {
        const { over, kept } = ev.personal.keepNext;
        const text = (await keepNextP.textContent())!;
        expect(text).toMatch(/^Of the next \$/);
        const keptFigure = Math.round((kept * over) / 100) * 100;
        const next = ev.analysis.cliffs.find((c) => c.startEarnings >= ev.analysis.currentEarnings) ?? null;
        if (next && next.startEarnings < ev.analysis.currentEarnings + over) {
          expect(text).toContain("because");
          expect(dollars(text)).toEqual([over, keptFigure, next.endEarnings]);
        } else if (kept < 0.10) {
          expect(text).toContain("flat stretch");
          expect(dollars(text)).toEqual([over, keptFigure]);
        } else {
          expect(text).not.toContain("because");
          expect(text).not.toContain("flat stretch");
          expect(dollars(text)).toEqual([over, keptFigure]);
        }
      }

      expect(ev.analysis.cliffs.length).toBeGreaterThan(0);

      /* One StepList row per cliff (at its landing point), and the marks are every cliff on the axis. */
      for (const c of ev.analysis.cliffs) await expect(page.locator(`#step-${c.endEarnings}`)).toHaveCount(1);
      /* The disclosures hold what the page stopped saying by default, under the names the system fixed. */
      for (const name of ["What happens at each step", "What we assumed", "Where these numbers come from"]) {
        await expect(page.locator("details.hg-disclosure", { has: page.getByRole("heading", { name, exact: true }) })).toHaveCount(1);
      }
      const marks = page.locator(".hg-mark");
      const markKeys = (await marks.evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.key)))).sort((a, b) => a - b);
      const spoken = await page.locator("#chart").getAttribute("aria-label");
      expect(spoken).toMatch(/^A line of the money this household keeps as pay rises from \$/);
      const [lo, hi] = (spoken!.match(/from \$([\d,]+) a year to \$([\d,]+) a year/)!.slice(1).map((x) => Number(x.replace(/,/g, ""))));
      /* The spoken range is the WHOLE axis since 2026-09-17, so this is every cliff — kept derived from the label the reader hears, not from the page's own data. */
      const onAxis = ev.analysis.cliffs.filter((c) => c.startEarnings >= lo && c.endEarnings <= hi);
      expect(onAxis.length).toBe(ev.analysis.cliffs.length);
      // A merged mark carries its first cliff's key and a count; the counts add up to every cliff.
      for (const k of markKeys) expect(onAxis.some((c) => c.endEarnings === k)).toBe(true);
      expect(markKeys.length).toBeGreaterThan(0);
      let covered = 0;
      /* A mark is 44px tall always and 44px wide WHERE THE AXIS HAS THE ROOM
         (2026-09-19, REVIEW-touch B2; lib/chart/draw.ts `markWidths`). This
         used to read `width >= 44` flatly, and what that pin actually held
         was a pile of overlapping buttons: at 390 two cliffs 25px apart gave
         two 44px marks, the upper one took both taps and the lower measured
         0×0 to a hit test. The marks now tile the axis — each takes 44px or
         the whole gap to its neighbour — so the rule a mark owes is that it
         takes every pixel available to it, which is what is asserted here,
         against the marks' own spacing. */
      const centres = (await marks.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; }))).sort((a, b) => a - b);
      for (const [i, b] of (await marks.all()).entries()) {
        expect(await b.getAttribute("aria-label")).toMatch(/drop/);
        const box = (await b.boundingBox())!;
        const room = Math.min(i > 0 ? centres[i] - centres[i - 1] : Infinity, i < centres.length - 1 ? centres[i + 1] - centres[i] : Infinity);
        expect(box.width).toBeGreaterThanOrEqual(Math.min(44, room) - 0.5);
        expect(box.height).toBeGreaterThanOrEqual(44);
        const badge = b.locator(".hg-mark__count");
        covered += (await badge.count()) ? Number(await badge.textContent()) : 1;
      }
      expect(covered).toBe(onAxis.length);
      /* The diamond, the band and the line are drawn; the line animated once (.hg-draw on the first path only). */
      expect(await page.locator("#chart svg path.hg-draw").count()).toBe(1);
      await expect(page.locator("#chart svg rect[fill='var(--loss-wash)']")).toHaveCount(ev.personal.zone ? 1 : 0);
      /* Axis honesty, re-derived from the tick labels the reader sees, not the page's own data-yratio: the y-range is at least 2.5× the biggest drop. */
      const yTicks = (await page.locator('#chart svg text.hg-tick[text-anchor="end"]').allTextContents()).map((x) => Number(x.replace(/[$k]/g, "")) * 1000);
      expect(yTicks.length).toBeGreaterThanOrEqual(3);
      const maxDrop = Math.max(...onAxis.map((c) => c.drop));
      // The ticks lie inside the axis (its floor snaps to a quarter step), so the tick span is a floor on the range: enough to prove the rule.
      const tickRatio = (Math.max(...yTicks) - Math.min(...yTicks)) / maxDrop;
      expect(tickRatio).toBeGreaterThanOrEqual(2.5);
      expect(Number(await page.locator("#chart").getAttribute("data-yratio"))).toBeGreaterThanOrEqual(tickRatio);
      /* The one drop label is the curve's biggest drop, and it agrees with the
         row that says so. Since 2026-09-17 it is ALWAYS drawn: the curve is the
         whole axis, so the biggest drop can no longer be outside the picture —
         only somewhere the reader has to scroll to. The caption's old "is
         outside the picture" sentence went with the crop. */
      const worst = ev.analysis.cliffs.reduce((a, b) => (b.drop > a.drop ? b : a));
      const biggestRow = page.locator(".hg-rows__loss", { hasText: "This is the biggest drop." });
      await expect(biggestRow).toHaveCount(1);
      expect(dollars((await page.locator(`#step-${worst.endEarnings} .hg-rows__loss`).textContent())!)[0]).toBe(Math.round(worst.drop / 100) * 100);
      const labels = await page.locator("#chart svg text.hg-label--loss").allTextContents();
      const dropLabel = labels.find((x) => x.startsWith("−"));
      expect(dollars(dropLabel!)).toEqual([Math.round(worst.drop)]);
      /* The label the page promises says what ends there as well as what it costs (charts.md § Direct labels, 2). */
      if (worst.programsLost.length) expect(labels.some((x) => x.endsWith(" ends"))).toBe(true);
      await expect(page.locator("#curveCaption")).not.toContainText("outside the picture");

      /* Type floors (design/inventory.md § Type floors), measured on every SVG text. */
      const texts = await page.locator("#chart svg text").evaluateAll((els) => els.map((el) => ({
        cls: el.getAttribute("class") ?? "", size: parseFloat(getComputedStyle(el).fontSize), attr: el.getAttribute("font-size"), text: el.textContent,
      })));
      expect(texts.length).toBeGreaterThan(4);
      for (const t of texts) {
        expect(t.attr, `bare font-size on "${t.text}"`).toBeNull();
        expect(t.cls, `unclassed text "${t.text}"`).toMatch(/hg-(tick|label)/);
        expect(t.size, `${t.cls} "${t.text}"`).toBeGreaterThanOrEqual(t.cls.includes("hg-tick") ? 12 : 13);
      }

      /* A mark click moves the cursor, opens its row in place and scrolls it into view (M6); Close hands focus back. */
      const first = marks.first();
      const key = await first.getAttribute("data-key");
      /* A mark opens the steps disclosure before it opens the row inside it (M6). */
      await page.locator("#steps-panel > summary").click();
      await expect(page.locator("#steps-panel")).not.toHaveAttribute("open", "");
      await first.click();
      await expect(page.locator("#steps-panel")).toHaveAttribute("open", "");
      await expect(first).toHaveAttribute("aria-expanded", "true");
      const row = page.locator(`#step-${key}`);
      await expect(row).toHaveAttribute("aria-current", "true");
      const rowBox = (await row.boundingBox())!;
      const vh = page.viewportSize()!.height;
      expect(rowBox.y + 44).toBeLessThanOrEqual(vh);
      expect(rowBox.y + rowBox.height).toBeGreaterThan(0);
      await expect(page.locator(".hg-readout")).toContainText(/drop/);
      await page.screenshot({ path: resolve(OUT, `citizen-${width}-${scheme}-mark-open.png`), fullPage: false });
      await row.getByRole("button", { name: "Close" }).click();
      await expect(first).toBeFocused();
      await expect(first).toHaveAttribute("aria-expanded", "false");
      await expect(row).not.toHaveAttribute("aria-current", "true");

      /* Keys on the chart: Home and an arrow move the readout a point at a time; ] reaches a mark; Escape closes. */
      await page.locator("#chart").focus();
      await page.keyboard.press("Home");
      await expect(page.locator(".hg-readout")).toContainText(`Paid $${lo.toLocaleString("en-US")} a year`);
      await page.keyboard.press("ArrowRight");
      await expect(page.locator(".hg-readout")).toContainText(`Paid $${(lo + 1000).toLocaleString("en-US")} a year`);
      await page.keyboard.press("]");
      await expect(marks.first()).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(row).toHaveAttribute("aria-current", "true");
      await page.keyboard.press("Escape");
      await expect(row).not.toHaveAttribute("aria-current", "true");
      await expect(marks.first()).toBeFocused();

      /* "Show the numbers", inside the steps panel: every row's pay is a curve point and its keep is that point's plotted value. */
      await openPanel(page, "What happens at each step");
      await page.getByText("Show the numbers").click();
      const rows = await page.locator("#numbers tbody tr").evaluateAll((trs) => trs.map((tr) => {
        const [at, keep, drop, mark] = [...tr.querySelectorAll("td")].map((td) => td.textContent ?? "");
        const n = (s: string) => Number(s.replace(/[^\d.]/g, ""));
        return { at: n(at), keep: n(keep), drop: drop ? n(drop) : null, mark };
      }));
      expect(rows.length).toBeGreaterThanOrEqual(3);
      const line = plotted(ev);
      for (const r of rows) {
        expect(line.has(r.at), `row at ${r.at} is a curve point`).toBe(true);
        const expected = r.mark === "You now" ? ev.analysis.currentNet : r.mark === "The top of your flat stretch" ? ev.personal.zone!.peakNet : line.get(r.at)!;
        expect(Math.abs(r.keep - expected), `${r.mark} at ${r.at}`).toBeLessThanOrEqual(1);
      }
      expect(rows.filter((r) => r.drop !== null).map((r) => r.at)).toEqual(onAxis.map((c) => c.endEarnings));
      expect(rows.some((r) => r.mark === "You now" && r.at === ev.analysis.currentEarnings)).toBe(true);
      if (ev.personal.escapeEarnings) expect(rows.some((r) => r.mark === "Back to even" && r.at === ev.personal.escapeEarnings)).toBe(true);
      if (width === 1280 && scheme === "light") await page.screenshot({ path: resolve(OUT, `citizen-${width}-${scheme}-table-open.png`), fullPage: false });
      await page.getByText("Show the numbers").click();

      /* Contrast, as the audit measured it, from the resolved colours: every ink
         on the ground it sits on — which since 2026-09-18 is the surface, because
         the picture is the page and a picture wants paper under it. The "you keep"
         label at the diamond joins the two that were measured before. */
      const c = await page.evaluate(() => {
        const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
        const ground = cs(document.body)!.backgroundColor;
        const fill = (sel: string) => { const el = document.querySelector(sel); return el ? cs(el)!.fill : null; };
        return {
          lossInk: cs(document.querySelector(".hg-rows__loss"))!.color, ground,
          labelInk: fill("#chart svg text.hg-label--loss"), inkLabel: fill("#chart svg text.hg-label--ink"),
          tickInk: fill("#chart svg text.hg-tick"), roadInk: fill("#chart svg text.hg-label:not([class*='--'])"),
          keyed: cs(document.querySelector(".hg-amt--gap"))!.boxShadow,
        };
      });
      const on = (ink: string) => contrast(rgb(ink), rgb(c.ground));
      console.log(`${scheme} ${width}: ground ${c.ground}; loss ink ${c.lossInk} = ${on(c.lossInk).toFixed(2)}:1; tick = ${on(c.tickInk!).toFixed(2)}:1; drop label = ${c.labelInk && on(c.labelInk).toFixed(2)}:1; "you keep" = ${c.inkLabel && on(c.inkLabel).toFixed(2)}:1; road = ${c.roadInk && on(c.roadInk).toFixed(2)}:1; keyed underline ${c.keyed}`);
      expect(on(c.lossInk)).toBeGreaterThanOrEqual(4.5);
      expect(on(c.tickInk!)).toBeGreaterThanOrEqual(4.5);
      for (const ink of [c.labelInk, c.inkLabel, c.roadInk]) if (ink) expect(on(ink)).toBeGreaterThanOrEqual(4.5);
      /* The keyed underline is a real box-shadow in the mark's own colour, not a transparent default. */
      expect(c.keyed).not.toContain("rgba(0, 0, 0, 0)");

      /* The page as a whole, and the first screen on its own — what a person meets. */
      await noOverflow(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: resolve(OUT, `citizen-${width}-${scheme}-screen1.png`), fullPage: false });
      await page.screenshot({ path: resolve(OUT, `citizen-${width}-${scheme}.png`), fullPage: true });
      if (scheme === "light") {
        await page.locator("#result figure").screenshot({ path: resolve(OUT, `citizen-${width}-${scheme}-chart.png`) });
        // Plan 9 § Citizen's own review, re-pointed 2026-09-18: the keep rate moved onto the road it measures, so
        // what is cropped tight is the figure — the sentence and its picture, which are now one object.
        await page.screenshot({ path: resolve(KEEP_RATE_DIR, `citizen-${width}.png`), fullPage: true });
        await page.locator("#result figure").screenshot({ path: resolve(KEEP_RATE_DIR, `citizen-${width}-band.png`) });
      }
      expect(errors).toEqual([]);
    });
  }
}

test("a chip toggle re-renders the whole result in place, and the sweep's provenance reaches the source line", async ({ page }) => {
  test.skip(EXPECT_SOURCE !== "live", "the live proof");
  const errors = consoleErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await loaded(page);
  const before = await page.locator("#answer").textContent();
  // The chips are behind Edit at every width on this surface (review S1).
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  // Turning food help off changes the money kept at this pay, so the sentence must change.
  const snap = page.locator('[data-chip="no-snap"]');
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await snap.click();
  expect((await evaluated).status()).toBe(200);
  await expect(page.locator("#result [role=status]")).toContainText("More pay won't");
  await expect(page.locator("#answer")).not.toHaveText(before!);
  // A fresh line was drawn for the new household, once.
  await expect(page.locator("#chart svg path.hg-draw")).toHaveCount(1);
  await openPanel(page, "Where these numbers come from");
  await expect(page.locator("#source")).toContainText("These are your own numbers");
  // The sweep's summary is what names the reach data's vintage; without it the line is bare.
  await openPanel(page, "What we assumed");
  await expect(page.locator("#result .hg-source", { hasText: "Census" })).toContainText(/survey data \(ACS \d{4}.*Grown to \d{4} dollars/);
  expect(errors).toEqual([]);
});

test("print from OS dark: the numbers open, the buttons go, and the PDF's text is in the light scheme's ink", async ({ page }) => {
  test.skip(EXPECT_SOURCE !== "live", "the live proof");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await loaded(page);
  const darkInk = await page.evaluate(() => getComputedStyle(document.body).color);
  /* The PDF path first (page.pdf fires beforeprint itself), then the print raster. */
  const pdf = await page.pdf({ format: "Letter", printBackground: true });
  writeFileSync(resolve(OUT, "citizen-letter-from-dark.pdf"), pdf);
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  await page.emulateMedia({ media: "print" });
  /* Paper opens every disclosure, the figure's own included, so the printed page carries the key, the caption and the sources. */
  expect(await page.locator("details.hg-disclosure").evaluateAll((ds) => ds.every((d) => (d as HTMLDetailsElement).open))).toBe(true);
  expect(await page.locator("details.hg-disclosure").count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByRole("button", { name: "Print" })).toBeHidden();
  const ink = await page.evaluate(() => [getComputedStyle(document.body).color, getComputedStyle(document.body).backgroundColor]);
  expect(contrast(rgb(ink[0]), rgb(ink[1]))).toBeGreaterThanOrEqual(7);
  const objects = pdfObjects(pdf);
  const pages = pdfPages(objects);
  const inks = pages.flatMap((p) => textInks(pageContent(objects, p)));
  expect(pages.length).toBeGreaterThanOrEqual(2);
  expect(inks).toContain(rgb(ink[0]).join());
  expect(inks).not.toContain(rgb(darkInk).join());
  await page.screenshot({ path: resolve(OUT, "citizen-1280-print-from-dark.png"), fullPage: true });
});

test(`the archetype path says so in the source line, with Try again (source ${EXPECT_SOURCE})`, async ({ page }) => {
  test.skip(EXPECT_SOURCE !== "archetype", "run wrangler with a dead HOTGAP_PE_URL and HOTGAP_EXPECT_SOURCE=archetype");
  const errors = consoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loaded(page);
  const source = page.locator("#source");
  await expect(source).toHaveAttribute("data-source", "archetype");
  /* The notice a reader must not miss stands ABOVE the figure, in the open, with its own Try again —
     never behind a disclosure (design/inventory.md § The page is its picture). */
  const whose = page.locator("#whose");
  await expect(whose).toBeVisible();
  await expect(whose).toContainText("We couldn't get your own numbers right now, so these are for a family like yours in your state.");
  await expect(whose.getByRole("button", { name: "Try again" })).toBeVisible();
  await openPanel(page, "Where these numbers come from");
  // The sweep's own model and stamp are what produced these numbers.
  await expect(source).toContainText(/Sweep of [A-Z][a-z]{2} \d{1,2}, \d{4}/);
  await expect(source).toContainText(/from policyengine-us [\d.]+ with 2026 rules/);
  // The assumed list describes the swept household, not the person's echoed answers.
  await openPanel(page, "What we assumed");
  await expect(page.locator(".assumed")).toContainText("the usual rent in California");
  await page.screenshot({ path: resolve(OUT, "citizen-390-light-archetype.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test(`a plateau household shows the flat-stretch wording (source ${EXPECT_SOURCE})`, async ({ page }) => {
  // Delaware's swept single-2 curve keeps 1¢ on the dollar from $41,000 to $51,000, with no cliff in the
  // stretch (committed 2026-09 sweep, core/data/states/DE.json) — found by scanning every state × archetype
  // for a next-$10,000 window under the 10¢ floor, per the plan's "or the archetype path with a dead engine".
  test.skip(EXPECT_SOURCE !== "archetype", "run wrangler with a dead HOTGAP_PE_URL and HOTGAP_EXPECT_SOURCE=archetype");
  const errors = consoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await page.goto("/?zip=19801&kids=3%2C7&pay=41000&unit=year");
  const ev = (await (await evaluated).json()) as Ev;
  await page.locator("#chart svg path").first().waitFor();
  expect(ev.personal.keepNext).not.toBeNull();
  const { over, kept } = ev.personal.keepNext!;
  expect(kept).toBeLessThan(0.10);
  const next = ev.analysis.cliffs.find((c) => c.startEarnings >= ev.analysis.currentEarnings) ?? null;
  expect(next === null || next.startEarnings >= ev.analysis.currentEarnings + over).toBe(true);
  await openPanel(page, "What happens at each step");
  await expect(page.locator("#keep-next")).toContainText("that's a flat stretch: more pay, barely more money");
  /* The kept figure is a CHANGE in pay, so it takes the $100 step the main block measures against
     (lib/format.ts payChangeRounded) — a stretch that keeps $100 must not print "$0". */
  expect(dollars((await page.locator("#keep-next").textContent())!)).toEqual([over, Math.round((kept * over) / 100) * 100]);
  await page.screenshot({ path: resolve(OUT, "citizen-390-light-plateau.png"), fullPage: true });
  expect(errors).toEqual([]);
});

/* EligibilityBoundary (#23, Plan 7): Texas and Massachusetts, the two renders the plan pins; then the toggle. */
for (const [state, zip, expected] of [
  ["Texas", "78701", "Above $40,000 a year you can't apply for help with heating bills in Texas any more. It's called LIHEAP. It's worth $1,200 a winter if you get it. Fewer than 1 in 10 families here who could get it do. If you get it, turn it on and we'll put it in your line."],
  ["Massachusetts", "02108", "Above $83,500 a year you can't apply for help with heating bills in Massachusetts any more. It's called LIHEAP. It's worth $355 to $430 a winter if you get it. About 2 in 10 families here who could get it do. If you get it, turn it on and we'll put it in your line."],
] as const) {
  test(`${state}: where help with heating bills stops is one line under the key and a tick on the axis, never a drop (source ${EXPECT_SOURCE})`, async ({ page }) => {
    // A household the droplet has not seen before can take over a minute (Massachusetts runs the TAFDC feedback loop).
    test.setTimeout(300_000);
    const errors = consoleErrors(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
    await page.goto(`/?zip=${zip}&kids=3%2C7&pay=30000&unit=year`);
    const ev = (await (await evaluated).json()) as { liheap: { earningsLimit: number; counted: boolean } | null; analysis: { cliffs: { programsLost: string[] }[] } };
    await page.locator("#chart svg path").first().waitFor();
    /* Three facts at the end of the steps, never a drop among them. */
    await openPanel(page, "What happens at each step");
    await expect(page.locator("#boundary")).toHaveText(expected);
    await expect(page.locator("#boundary")).toHaveAttribute("data-counted", "false");
    // The invitation is its own sentence and stays off paper (liheap review S2).
    await expect(page.locator("#boundary .hg-no-print")).toHaveText("If you get it, turn it on and we'll put it in your line.");
    expect(ev.liheap?.counted).toBe(false);
    // Not a cliff, not a mark: nothing on the picture at the limit but the axis tick.
    expect(ev.analysis.cliffs.every((c) => !c.programsLost.includes("liheap"))).toBe(true);
    // The tick is drawn only when the limit lies inside the crop (model.ts boundaryInWindow), and the key entry shows with it — never one without the other.
    const ticks = await page.locator("#chart svg line[data-boundary]").count();
    expect(ticks).toBeLessThanOrEqual(1);
    await expect(page.locator("figure .hg-key li:not([hidden])", { hasText: "Where heating help stops" })).toHaveCount(ticks);
    expect(errors).toEqual([]);
  });
}

test(`Texas: the toggle puts $1,200 into the line to the limit and the boundary line says it was counted (source ${EXPECT_SOURCE})`, async ({ page }) => {
  test.skip(EXPECT_SOURCE !== "live", "the live proof");
  test.setTimeout(300_000);
  const errors = consoleErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await page.goto("/?zip=78701&kids=3%2C7&pay=30000&unit=year&energy-assistance=1");
  const ev = (await (await evaluated).json()) as { liheap: { counted: boolean } | null; curve: { points: { earnings: number; programs: Record<string, number> }[] } };
  const at = (e: number) => ev.curve.points.find((p) => p.earnings === e)!.programs.liheap;
  expect([at(13000), at(19000), at(39000), at(40000)]).toEqual([1800, 1500, 1200, 0]);
  expect(ev.liheap?.counted).toBe(true);
  await page.locator("#chart svg path").first().waitFor();
  await openPanel(page, "What happens at each step");
  await expect(page.locator("#boundary")).toHaveText("You told us you get help with heating bills (LIHEAP), so it's in your line: about $1,200 a year, up to $40,000 a year.");
  await expect(page.locator("#chart svg line[data-boundary]")).toHaveCount(0);
  await openPanel(page, "What we assumed");
  await expect(page.locator(".assumed")).toContainText("help with heating bills (LIHEAP energy assistance). We counted each one as if you get it.");
  expect(errors).toEqual([]);
});
