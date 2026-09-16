// The citizen surface, end to end, through the Worker (app/README.md
// § Proofs): the California single parent with a 3- and a 7-year-old at
// $30,000, at 390 and 1280, light and dark. Measured, not asserted: the
// marks against the cliff list, the table against the plotted curve, the
// type floors on the SVG text, the loss ink's contrast on its ground, and a
// screenshot beside the audit's (design/audit/app/citizen-*).
//
// HOTGAP_EXPECT_SOURCE=archetype runs the archetype assertions instead
// (start wrangler with a dead HOTGAP_PE_URL first; the README says how).
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const EXPECT_SOURCE = process.env.HOTGAP_EXPECT_SOURCE ?? "live";
const HOUSEHOLD = "/?zip=94110&kids=3%2C7&pay=30000&unit=year";
const OUT = resolve(import.meta.dirname, "../../design/audit/app");
mkdirSync(OUT, { recursive: true });

const consoleErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
};

/* WCAG 2.x relative luminance and contrast, the audit's own method, over the colours the page resolved. */
const lum = ([r, g, b]: number[]) => {
  const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

interface Ev {
  analysis: { cliffs: { startEarnings: number; endEarnings: number; drop: number; deferral: unknown }[]; currentEarnings: number; currentNet: number };
  curve: { points: { earnings: number; netIncome: number }[] };
  personal: { zone: { startEarnings: number; peakNet: number } | null; escapeEarnings: number | null };
}

/** Land on the household and keep the evaluation the page rendered: the measure for the marks and the table. */
async function loaded(page: Page): Promise<Ev> {
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await page.goto(HOUSEHOLD);
  const ev = (await (await evaluated).json()) as Ev;
  await expect(page.locator("#answer")).toContainText("You are paid $30,000 a year.");
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

      /* The verdict is the danger-zone shape, keyed to the marks. */
      const answer = page.locator("#answer");
      await expect(answer).toContainText("More pay does not add to that until you are paid");
      await expect(answer.locator(".amt-keep")).toHaveCount(1);
      await expect(answer.locator(".amt-gap")).toHaveCount(2);

      expect(ev.analysis.cliffs.length).toBeGreaterThan(0);

      /* One StepList row per cliff (at its landing point), and the marks are the cliffs in the window. */
      for (const c of ev.analysis.cliffs) await expect(page.locator(`#step-${c.endEarnings}`)).toHaveCount(1);
      const marks = page.locator(".hg-mark");
      const markKeys = (await marks.evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.key)))).sort((a, b) => a - b);
      const spoken = await page.locator("#chart").getAttribute("aria-label");
      expect(spoken).toMatch(/^A line of the money this household keeps as pay rises from \$/);
      const [lo, hi] = (spoken!.match(/from \$([\d,]+) a year to \$([\d,]+) a year/)!.slice(1).map((x) => Number(x.replace(/,/g, ""))));
      const inWindow = ev.analysis.cliffs.filter((c) => c.startEarnings >= lo && c.endEarnings <= hi);
      // A merged mark carries its first cliff's key; every key is a cliff in the window and every unmerged cliff has a mark.
      for (const k of markKeys) expect(inWindow.some((c) => c.endEarnings === k)).toBe(true);
      expect(markKeys.length).toBeLessThanOrEqual(inWindow.length);
      expect(markKeys.length).toBeGreaterThan(0);
      for (const b of await marks.all()) {
        expect(await b.getAttribute("aria-label")).toMatch(/drop/);
        const box = (await b.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      /* The diamond, the band and the line are drawn; the line animated once (.hg-draw on the first path only). */
      expect(await page.locator("#chart svg path.hg-draw").count()).toBe(1);
      await expect(page.locator("#chart svg rect[fill='var(--loss-wash)']")).toHaveCount(ev.personal.zone ? 1 : 0);
      const yratio = Number(await page.locator("#chart").getAttribute("data-yratio"));
      expect(yratio).toBeGreaterThanOrEqual(2.5);

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
      await first.click();
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

      /* "Show the numbers": every row's pay is a curve point and its keep is that point's plotted value. */
      await page.getByText("Show the numbers").click();
      const rows = await page.locator("#numbers tbody tr").evaluateAll((trs) => trs.map((tr) => {
        const [at, keep, drop, mark] = [...tr.querySelectorAll("td")].map((td) => td.textContent ?? "");
        const n = (s: string) => Number(s.replace(/[^\d.]/g, ""));
        return { at: n(at), keep: n(keep), drop: drop ? n(drop) : null, mark };
      }));
      expect(rows.length).toBeGreaterThanOrEqual(3);
      const at = (e: number) => ev.curve.points.find((p) => p.earnings === e);
      for (const r of rows) {
        const p = at(r.at);
        expect(p, `row at ${r.at} is a curve point`).toBeDefined();
        const expected = r.mark === "You now" ? ev.analysis.currentNet : r.mark === "The top of your flat stretch" ? ev.personal.zone!.peakNet : p!.netIncome;
        expect(Math.abs(r.keep - expected), `${r.mark} at ${r.at}`).toBeLessThanOrEqual(1);
      }
      expect(rows.filter((r) => r.drop !== null).map((r) => r.at)).toEqual(inWindow.map((c) => c.endEarnings));
      expect(rows.some((r) => r.mark === "You now" && r.at === ev.analysis.currentEarnings)).toBe(true);
      if (ev.personal.escapeEarnings) expect(rows.some((r) => r.mark === "Back to even" && r.at === ev.personal.escapeEarnings)).toBe(true);
      if (width === 1280 && scheme === "light") await page.screenshot({ path: resolve(OUT, `citizen-${width}-${scheme}-table-open.png`), fullPage: false });
      await page.getByText("Show the numbers").click();

      /* Contrast, as the audit measured it, from the resolved colours: the loss ink on the ground it sits on. */
      const c = await page.evaluate(() => {
        const cs = (el: Element | null) => (el ? getComputedStyle(el) : null);
        const loss = cs(document.querySelector(".hg-rows__loss"))!;
        const rowGround = cs(document.body)!.backgroundColor;
        const label = document.querySelector("#chart svg text.hg-label--loss");
        const tick = document.querySelector("#chart svg text.hg-tick");
        const band = cs(document.querySelector(".band"))!.backgroundColor;
        return { lossInk: loss.color, rowGround, labelInk: label ? cs(label)!.fill : null, tickInk: tick ? cs(tick)!.fill : null, surface: band, keyed: cs(document.querySelector(".amt-keep"))!.boxShadow };
      });
      const lossOnPlane = contrast(rgb(c.lossInk), rgb(c.rowGround));
      const tickOnPlane = contrast(rgb(c.tickInk!), rgb(c.rowGround));
      console.log(`${scheme} ${width}: loss ink ${c.lossInk} on plane ${c.rowGround} = ${lossOnPlane.toFixed(2)}:1; tick ink on plane = ${tickOnPlane.toFixed(2)}:1; label ink ${c.labelInk}; keyed underline ${c.keyed}`);
      expect(lossOnPlane).toBeGreaterThanOrEqual(4.5);
      expect(tickOnPlane).toBeGreaterThanOrEqual(4.5);
      if (c.labelInk) expect(contrast(rgb(c.labelInk), rgb(c.rowGround))).toBeGreaterThanOrEqual(4.5);

      /* The page as a whole. */
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: resolve(OUT, `citizen-${width}-${scheme}.png`), fullPage: true });
      if (scheme === "light") {
        await page.locator("#result figure").screenshot({ path: resolve(OUT, `citizen-${width}-${scheme}-chart.png`) });
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
  // Turning food help off changes the money kept at this pay, so the sentence must change.
  const snap = page.locator('[data-chip="no-snap"]');
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await snap.click();
  expect((await evaluated).status()).toBe(200);
  await expect(page.locator("#result [role=status]")).toContainText("You are paid");
  await expect(page.locator("#answer")).not.toHaveText(before!);
  // A fresh line was drawn for the new household, once.
  await expect(page.locator("#chart svg path.hg-draw")).toHaveCount(1);
  await expect(page.locator("#source")).toContainText("These are your own numbers");
  await expect(page.locator("#source")).toContainText("Money kept is what is left after taxes");
  expect(errors).toEqual([]);
});

test("print: the numbers open, the buttons go, the ink is light on white", async ({ page }) => {
  test.skip(EXPECT_SOURCE !== "live", "the live proof");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await loaded(page);
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  await page.emulateMedia({ media: "print" });
  expect(await page.locator("details.hg-disclosure").evaluate((d) => (d as HTMLDetailsElement).open)).toBe(true);
  await expect(page.locator("#themeBtn")).toBeHidden();
  const ink = await page.evaluate(() => [getComputedStyle(document.body).color, getComputedStyle(document.body).backgroundColor]);
  expect(contrast(rgb(ink[0]), rgb(ink[1]))).toBeGreaterThanOrEqual(7);
  await page.screenshot({ path: resolve(OUT, "citizen-1280-print-from-dark.png"), fullPage: true });
});

test(`the archetype path says so in the source line, with Try again (source ${EXPECT_SOURCE})`, async ({ page }) => {
  test.skip(EXPECT_SOURCE !== "archetype", "run wrangler with a dead HOTGAP_PE_URL and HOTGAP_EXPECT_SOURCE=archetype");
  const errors = consoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await loaded(page);
  const source = page.locator("#source");
  await expect(source).toHaveAttribute("data-source", "archetype");
  await expect(source).toContainText("We could not get your exact numbers right now. These are numbers for a family like yours in your state.");
  await expect(source.getByRole("button", { name: "Try again" })).toBeVisible();
  // The sweep's own model and stamp are what produced these numbers.
  await expect(source).toContainText(/Sweep of \d{4}-\d{2}-\d{2}/);
  await expect(source).toContainText(/from policyengine-us [\d.]+ with 2026 rules/);
  // The assumed list describes the swept household, not the person's echoed answers.
  await expect(page.locator(".assumed")).toContainText("The usual rent in California");
  await page.screenshot({ path: resolve(OUT, "citizen-390-light-archetype.png"), fullPage: true });
  expect(errors).toEqual([]);
});
