// The caseworker surface, end to end, through the Worker (app/README.md §
// Proofs): the mockup's household (design/caseworker.html — a Colorado
// single parent, kids 3 and 7, $38,000, the archetype's own rent and care)
// evaluated live, at 390 and 1280, light and dark; what-ifs added by chip
// and by the four-facts screen; the sticky top row measured after a scroll;
// print; the keyboard path from the chart to a row and back. Each finding
// of design/REVIEW-caseworker-2026-09-16.md is re-measured here and its
// evidence written under design/review/caseworker/after/ (screenshots
// named by finding, and measurements.json). Screenshots with the audit's
// names go to design/audit/app/ as before.
//
// HOTGAP_ARCHETYPE_URL, when set, is a second server whose engine is dead
// (wrangler dev --var HOTGAP_PE_URL:http://127.0.0.1:9/us/calculate); the
// B1 test runs against it and is skipped otherwise.
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const AUDIT = resolve(import.meta.dirname, "../../design/audit/app");
const AFTER = resolve(import.meta.dirname, "../../design/review/caseworker/after");
for (const d of [AUDIT, AFTER]) mkdirSync(d, { recursive: true });
const shot = (name: string) => resolve(AUDIT, `caseworker-${name}.png`);
const after = (name: string) => resolve(AFTER, `${name}.png`);
const measured: Record<string, unknown> = {};
test.afterAll(() => writeFileSync(resolve(AFTER, "measurements.json"), JSON.stringify(measured, null, 1)));

const HOUSEHOLD = "/caseworker.html?zip=80903&kids=3%2C7&pay=38000&unit=year&rent=1735&childcare=2773&childcare-subsidy=1";
const ARCHETYPE_URL = process.env.HOTGAP_ARCHETYPE_URL;

const consoleErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
};
const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
const rendered = async (page: Page) => {
  await expect(page.locator("#verdictLine")).toContainText("In a danger zone. Between $36,000 and $45,000 of earnings");
  await expect(page.locator("#sourceNote")).toHaveAttribute("data-source", "live");
};
const light = async (page: Page) => page.emulateMedia({ colorScheme: "light" });
/** The compare table's geometry: what B2 is measured by. */
const compareBox = (page: Page) => page.evaluate(() => {
  const t = document.querySelector(".compare")!, sc = t.closest(".hg-scroll-x")!;
  const cols = [...document.querySelectorAll("#compareHead th")].map((th) => ({ w: Math.round(th.getBoundingClientRect().width), right: Math.round(th.getBoundingClientRect().right) }));
  return { tableW: Math.round(t.getBoundingClientRect().width), scrollerW: Math.round(sc.getBoundingClientRect().width), scrollerRight: Math.round(sc.getBoundingClientRect().right), scrollW: sc.scrollWidth, cols, wide: document.getElementById("compareSection")!.hasAttribute("data-wide") };
});

for (const width of [390, 1280]) for (const scheme of ["light", "dark"] as const) {
  test(`${width}px ${scheme}: the base household renders from the live call and the real coverage block`, async ({ page }) => {
    const errors = consoleErrors(page);
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width, height: width < 720 ? 844 : 900 });
    await page.goto(HOUSEHOLD);
    await rendered(page);
    await noOverflow(page);

    // The bar in the caseworker register (S1): the place chip with the county the ZIP resolved to.
    await expect(page.locator('[data-chip="where"] .hg-chip__k')).toHaveText("Place");
    await expect(page.locator('[data-chip="where"] .hg-chip__v')).toHaveText("80903, CO, El Paso County");
    await expect(page.locator('[data-chip="childcare-subsidy"]')).toHaveText("CCDF subsidyon");
    await expect(page.locator('[data-chip="no-snap"]')).toHaveText("SNAPon");
    // The verdict, the tiles and the reach margin from reach.json.
    await expect(page.locator("#verdictSub")).toHaveText("It happens again between $45,000 and $119,000. Safe from $119,000: a raise of $73,000.");
    await expect(page.locator("#tiles .tile")).toHaveCount(4);
    await expect(page.locator("#tiles")).toContainText("percentile, ±$8,000 (n = 393)");
    // IncompleteMarker and CorrectionsApplied from coverage.CO — the count of states rendered, never typed; the notes core's own.
    await expect(page.locator("#coverage")).toContainText("Figures complete for Colorado.");
    // The count of incomplete states is rendered from the sweep, never typed: since NJ/WA/CT/MA
    // and the LIHEAP boundary landed, no state is incomplete, and the line says so instead.
    await expect(page.locator("#coverage")).toContainText(/In \d+ states? \([A-Z]{2}(, [A-Z]{2})*\) this line would carry the|Nothing this household would hold is unmodelled here\./);
    await expect(page.locator("#corrections li")).toHaveCount(1);
    await expect(page.locator("#corrections .hg-rows__at")).toHaveText("Colorado premium assistance");
    await expect(page.locator("#corrections .hg-tag")).toHaveText("modeled");
    await expect(page.locator("#corrections .hg-cite")).toContainText("HotGap subtracts it from the premium the household pays");
    await expect(page.locator("#correctionsRest")).toContainText("Checked and not applying here — TAFDC:");
    // ThresholdLedger under the one convention: the subsidy ends at $55,000, SNAP's remainder cited.
    const ledger = page.locator("#ledgerRows tr");
    // Nine program ends and, since Plan 7, the LIHEAP boundary row at Colorado's $69,935 limit (EligibilityBoundary #23).
    await expect(ledger).toHaveCount(10);
    await expect(ledger.nth(7)).toContainText("$69,935");
    await expect(ledger.nth(7).locator(".hg-tag")).toHaveText("if you apply");
    await expect(ledger.nth(5)).toContainText("$55,000");
    await expect(ledger.nth(5)).toContainText("CCDF child care subsidy");
    await expect(ledger.nth(5)).toContainText("Care priced at $2,773 a month for 2 children (county 2015 prices");
    await expect(ledger.nth(3)).toContainText("$713 a year of SNAP continues at $54,000, none from $55,000.");
    await expect(ledger.filter({ hasText: "Deferred" })).toHaveCount(2);
    // The largest drop's row opens first and drives the breakdown; the marks are controls.
    await expect(page.locator('#dropRows [aria-current="true"]')).toHaveText("$54,000 → $55,000");
    await expect(page.locator("#bdTitle")).toHaveText("Where the $25,449 went — $54,000 to $55,000");
    await expect(page.locator("#bdBars")).toContainText("Sums to $25,449, the drop. Driver: benefits.");
    expect(await page.locator("#marks .hg-mark").count()).toBeGreaterThan(0);
    await expect(page.locator("#chartWrap")).toHaveAttribute("aria-label", /The largest step down is \$25,449 at \$54,000 where CCDF child care subsidy ends/);
    await expect(page.locator("#curveCap")).toContainText(/The y-axis starts at \$[\d,]+, not \$0; the visible range is [\d.]+× the largest drop\. No cliff on this curve is deferred\. Estimates only/);
    await expect(page.locator("#sourceNote")).toContainText("Curve: live PolicyEngine call for this household in El Paso County, Colorado.");
    await expect(page.locator("#sourceNote")).toContainText(/Model: policyengine-us \d/);
    // The dark set is the one the page computes, not a page override.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe(scheme === "dark" ? "rgb(13, 17, 20)" : "rgb(232, 235, 238)");
    // N1: a landing leaves focus at the document start, so the verdict wears no ring.
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    // S4: no direct label crosses a mark's ring (the 20px box around a dot).
    const collisions = await page.evaluate(() => {
      const rings = [...document.querySelectorAll("#curve circle")].map((c) => ({ x: +c.getAttribute("cx")!, y: +c.getAttribute("cy")! }));
      return [...document.querySelectorAll("#curve text.hg-label")].map((t) => {
        const b = (t as SVGTextElement).getBBox();
        return { t: t.textContent, hit: rings.filter((r) => b.x < r.x + 10 && b.x + b.width > r.x - 10 && b.y < r.y + 10 && b.y + b.height > r.y - 10).length };
      });
    });
    measured[`S4-labels-${width}-${scheme}`] = collisions;
    expect(collisions.filter((c) => c.hit > 0)).toEqual([]);

    await page.screenshot({ path: shot(`${width}-${scheme}`), fullPage: true });
    if (scheme === "light") {
      await page.evaluate(() => document.getElementById("chartWrap")!.scrollIntoView());
      await page.screenshot({ path: after(`S4-chart-${width}`) });
      await page.evaluate(() => document.querySelector(".breakdown")!.scrollIntoView());
      await page.screenshot({ path: after(`S7-breakdown-${width}`) });
    }
    if (width < 720) {
      // Below 720px the chips hide behind Edit; the summary line is the place, once (N9).
      await expect(page.locator(".hg-scenario__summary span")).toHaveText("CO · El Paso · 1 adult, kids 3 & 7 · $38,000 a year");
      await expect(page.locator("#inputs")).toBeHidden();
      measured[`N9-summary-${scheme}`] = await page.evaluate(() => ({ text: document.querySelector(".hg-scenario__summary span")!.textContent, h: document.querySelector(".hg-scenario__summary span")!.getBoundingClientRect().height }));
      // S7: the breakdown's track is the panel's width, its axis words one line.
      const bd = await page.evaluate(() => ({ track: document.querySelector(".bd-row:not(.bd-axis) .bd-track")!.getBoundingClientRect().width, axisH: document.querySelector(".bd-axis .bd-track")!.getBoundingClientRect().height }));
      measured[`S7-breakdown-${scheme}`] = bd;
      expect(bd.track).toBeGreaterThan(300);
      expect(bd.axisH).toBeLessThan(24);
      // S9: a correction's cite has the whole line below 520px.
      const cite = await page.evaluate(() => document.querySelector("#corrections .hg-cite")!.getBoundingClientRect().width);
      measured[`S9-cite-${scheme}`] = cite;
      expect(cite).toBeGreaterThan(300);
      // B2: the base alone fits its scroller, values inside it.
      const box = await compareBox(page);
      measured[`B2-compare-390-now-${scheme}`] = box;
      expect(box.scrollW).toBeLessThanOrEqual(box.scrollerW);
      expect(box.cols[1].right).toBeLessThanOrEqual(box.scrollerRight);
      if (scheme === "light") {
        await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
        await page.screenshot({ path: after("B2-compare-390-now-only") });
        await page.evaluate(() => document.querySelector(".provenance")!.scrollIntoView());
        await page.screenshot({ path: after("S9-provenance-390") });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: after("N9-summary-390") });
      }
      // The sticky top row is the only sticky thing and stays at 0 after a scroll (S1 of the audit).
      await page.evaluate(() => window.scrollTo(0, 600));
      expect(await page.evaluate(() => document.querySelector(".hg-scenario--sticky")!.getBoundingClientRect().top)).toBe(0);
      expect(await page.evaluate(() => document.querySelector(".hg-scenario__summary")!.getBoundingClientRect().top)).toBeLessThan(0);
      await page.evaluate(() => document.getElementById("drops")!.scrollIntoView());
      await page.screenshot({ path: shot(`${width}-${scheme}-drops`) });
    } else if (scheme === "light") {
      // S2: the chips in the counselor's order — facts, then the take-up toggles — and an unset value lighter than an answer.
      const chips = await page.evaluate(() => [...document.querySelectorAll("#inputs .hg-chip")].map((c) => ({
        id: (c as HTMLElement).dataset.chip, unset: c.hasAttribute("data-unset"),
        weight: getComputedStyle(c.querySelector(".hg-chip__v")!).fontWeight, color: getComputedStyle(c.querySelector(".hg-chip__v")!).color,
      })));
      measured["S2-chips-1280"] = chips;
      expect(chips.slice(0, 5).map((c) => c.id)).toEqual(["where", "household", "pay", "rent", "childcare"]);
      expect(chips[5].id).toBe("childcare-subsidy");
      const none = chips.find((c) => c.unset)!, answered = chips.find((c) => c.id === "rent")!;
      expect(none.weight).toBe("400");
      expect(answered.weight).toBe("600");
      expect(none.color).not.toBe(answered.color);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: after("S1-S2-chips-1280"), clip: { x: 0, y: 0, width: 1280, height: 300 } });
      // S7 at 1280: label, track and value on one line.
      const desktopRow = await page.evaluate(() => { const r = document.querySelector(".bd-row:not(.bd-axis)")!; return { h: r.getBoundingClientRect().height, track: r.querySelector(".bd-track")!.getBoundingClientRect().width }; });
      measured["S7-breakdown-1280"] = desktopRow;
      expect(desktopRow.h).toBeLessThan(40);
      // S10: landing on a bare URL shows the screen, no chips, the actions disabled.
      await page.goto("/caseworker.html");
      await expect(page.locator("#editor")).toBeVisible();
      await expect(page.locator("#inputs")).toBeHidden();
      await expect(page.getByRole("button", { name: "Add a what-if" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Print the client sheet" })).toBeDisabled();
      await expect(page.locator(".editor__heading")).toHaveText("The household");
      await expect(page.getByRole("button", { name: "Update the household" })).toBeVisible();
      await page.screenshot({ path: after("S10-landing-1280") });
    }
    expect(errors).toEqual([]);
  });
}

test("390px: a take-up chip adds a what-if, evaluated live, and the URL carries both; the action opens the screen led by Add as a what-if", async ({ page }) => {
  const errors = consoleErrors(page);
  await light(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HOUSEHOLD);
  await rendered(page);
  await expect(page.locator("#compareHead th")).toHaveCount(2);
  await expect(page.locator("#compareEmpty")).toBeVisible();

  // S3: "What-if" opens the four-facts screen with "Add as a what-if" as its lead, so it always ends in a what-if.
  await page.getByRole("button", { name: "What-if" }).click();
  await expect(page.locator("#editor")).toBeVisible();
  await expect(page.getByLabel("Pay, before taxes")).toBeFocused();
  const lead = page.getByRole("button", { name: "Add as a what-if" });
  await expect(lead).toHaveClass(/hg-button--primary/);
  await expect(page.getByRole("button", { name: "Update the household" })).not.toHaveClass(/hg-button--primary/);
  await page.screenshot({ path: after("S3-whatif-390-action-opened") });
  await page.getByLabel("Pay, before taxes").fill("55000");
  const evaluatedRaise = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await page.keyboard.press("Enter");   /* Enter presses the lead */
  await expect(page.locator("#editor")).toBeHidden();
  expect(new URL(page.url()).searchParams.getAll("whatif")).toEqual(["pay=55000"]);
  expect((await evaluatedRaise).status()).toBe(200);
  await expect(page.locator('[data-chip="pay"] .hg-chip__v')).toHaveText("$38,000 a year");   /* the chips show the base */

  // A take-up chip: the note answers first in the row, with the mockup's own link to the comparison.
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const chip = page.locator('[data-chip="childcare-subsidy"]');
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await chip.click();
  expect(new URL(page.url()).searchParams.getAll("whatif")).toEqual(["pay=55000", "childcare-subsidy="]);
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(chip).toBeFocused();
  const note = page.locator(".hg-scenario__note");
  await expect(note).toContainText("What-if added: CCDF subsidy off, evaluated beside the base under Compare. The chips show the base.");
  await expect(note.locator("a")).toHaveAttribute("href", "#compare");
  expect(await page.evaluate(() => document.querySelector("#inputs")!.firstElementChild!.className)).toContain("hg-scenario__note");
  const noteBox = await page.evaluate(() => { const n = document.querySelector(".hg-scenario__note")!.getBoundingClientRect(); return { w: n.width, maxWidth: getComputedStyle(document.querySelector(".hg-scenario__note")!).maxWidth }; });
  measured["S3-N2-note-390"] = noteBox;
  expect(noteBox.maxWidth).toBe("none");
  await page.screenshot({ path: after("S3-note-390-after-press") });
  expect((await evaluated).status()).toBe(200);
  // The columns are evaluated beside the base; one chip is named one way in the chip, the note and the column (S1).
  await expect(page.locator("#compareHead th")).toHaveCount(4);
  await expect(page.locator("#compareHead th").nth(3)).toContainText("CCDF subsidy off");
  await expect(page.locator("#compareRows tr").first().locator("td").nth(2)).toHaveText(/^\$[\d,]+$/);
  await expect(page.locator("#compareEmpty")).toBeHidden();
  // The same chip again is already compared; nothing is added twice.
  await chip.click();
  await expect(note).toContainText("is already compared");
  expect(new URL(page.url()).searchParams.getAll("whatif")).toEqual(["pay=55000", "childcare-subsidy="]);
  // B2 at 390 with two what-ifs: the names stay in view while the scenarios scroll.
  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  measured["B2-compare-390-2-whatifs"] = await compareBox(page);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".compare th")!).position)).toBe("sticky");
  await page.screenshot({ path: after("B2-compare-390-2-whatifs") });
  // N10: the controls are 44px; removing a what-if is answered in the note.
  const remove = page.locator("#compareFoot").getByRole("button", { name: /Remove the what-if CCDF/ });
  expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator("#compareHead")).not.toContainText("Remove");
  await remove.click();
  await expect(page.locator("#compareHead th")).toHaveCount(3);
  expect(new URL(page.url()).searchParams.getAll("whatif")).toEqual(["pay=55000"]);
  await expect(note).toHaveText("What-if removed: CCDF subsidy off.");
  // B2 at 390 with one what-if: both columns inside the scroller.
  const box = await compareBox(page);
  measured["B2-compare-390-1-whatif"] = box;
  expect(box.scrollW).toBeLessThanOrEqual(box.scrollerW);
  expect(box.cols[2].right).toBeLessThanOrEqual(box.scrollerRight);
  await page.screenshot({ path: after("B2-compare-390-1-whatif") });
  await page.screenshot({ path: shot("390-light-compare") });
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("1280px: a shared comparison with three what-ifs fits its full-width table; a failed what-if keeps its name; the chart's keys open a row", async ({ page }) => {
  const errors = consoleErrors(page);
  await light(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${HOUSEHOLD}&whatif=childcare-subsidy%3D&whatif=housing%3D1&whatif=pay%3D55000`);
  await rendered(page);
  await expect(page.locator("#compareHead th")).toHaveCount(5);
  for (let i = 1; i <= 3; i++) await expect(page.locator("#compareRows tr").first().locator("td").nth(i)).toHaveText(/^\$[\d,]+$/);
  // B2 at 1280: three what-ifs, the section spanning both grid columns, no overflow, the names at their 11rem.
  const box = await compareBox(page);
  measured["B2-compare-1280-3-whatifs"] = box;
  expect(box.wide).toBe(true);
  expect(box.scrollW).toBeLessThanOrEqual(box.scrollerW);
  expect(box.cols[0].w).toBeGreaterThanOrEqual(176);
  // N7: a what-if column carries one start-side rule and the header rule; no doubled line between neighbours.
  const shadow = await page.evaluate(() => getComputedStyle(document.querySelector("#compareRows td.b")!).boxShadow);
  measured["N7-cell-shadow"] = shadow;
  expect(shadow.split("),").length).toBe(1);
  // N8: the row names are 600, not the browser's 700.
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("#compareRows th")!).fontWeight)).toBe("600");
  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  await page.screenshot({ path: after("B2-compare-1280-3-whatifs") });
  await page.screenshot({ path: shot("1280-light-compare") });

  // S6: a what-if whose evaluation fails (the engine busy, routed here) keeps its name in the header; the sentence sits by Try again in the footer.
  await page.route("**/api/evaluate", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "busy" }) }));
  await page.locator('[data-chip="head-start"]').click();
  await expect(page.locator("#compareHead th")).toHaveCount(6);
  await expect(page.locator("#compareHead th").nth(5)).toContainText("Head Start on");
  await expect(page.locator("#compareHead th").nth(5)).toContainText("did not come back");
  await expect(page.locator("#compareHead th").nth(5)).not.toContainText("busy");
  await expect(page.locator("#compareFoot")).toContainText("The engine is busy. Try again in a few seconds.");
  const failedBox = await compareBox(page);
  measured["S6-compare-1280-failed"] = failedBox;
  expect(failedBox.scrollW).toBeLessThanOrEqual(failedBox.scrollerW);
  expect(failedBox.cols[0].w).toBeGreaterThanOrEqual(176);
  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  await page.screenshot({ path: after("S6-compare-1280-whatif-failed") });
  // Try again, with the engine back, fills the column.
  await page.unroute("**/api/evaluate");
  await page.locator("#compareFoot").getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("#compareRows tr").first().locator("td").nth(4)).toHaveText(/^\$[\d,]+$/);
  await page.locator("#compareFoot").getByRole("button", { name: /Remove the what-if Head Start/ }).click();
  await expect(page.locator("#compareHead th")).toHaveCount(5);

  // The chart: one tab stop; ] moves to the next mark, Enter opens its row, Escape closes it and focus returns to the mark.
  await page.locator("#chartWrap").focus();
  await page.keyboard.press("]");
  const mark = page.locator("#marks .hg-mark:focus");
  await expect(mark).toHaveCount(1);
  await expect(page.locator("#readout")).toContainText(/^(Cliff at \$[\d,]+ to \$[\d,]+: −\$[\d,]+\.|\d+ drops between)/);
  await page.keyboard.press("Enter");
  await expect(mark).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('#dropRows [aria-current="true"]')).toHaveCount(1);
  await page.evaluate(() => document.getElementById("drops")!.scrollIntoView());
  await page.screenshot({ path: shot("1280-light-row-open") });
  await page.keyboard.press("Escape");
  await expect(page.locator('#dropRows [aria-current="true"]')).toHaveCount(0);
  await expect(mark).toHaveAttribute("aria-expanded", "false");
  await expect(mark).toBeFocused();
  await page.locator("#chartWrap").focus();
  await page.keyboard.press("Home");
  await expect(page.locator("#readout")).toContainText("Earnings $0 →");
  // Landing and what-ifs replaced the history entry rather than pushing: one Back leaves the page.
  await page.goBack();
  expect(page.url()).toBe("about:blank");
  await noOverflow(page);
  expect(errors.filter((e) => !e.includes("503"))).toEqual([]);   /* the routed failure above logs its own 503 */
});

test("390px: ] from the household's pay stops at the merged mark that holds its own cliff (N4)", async ({ page }) => {
  await light(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HOUSEHOLD);
  await rendered(page);
  await page.locator("#chartWrap").focus();
  await page.keyboard.press("]");
  const label = await page.locator("#marks .hg-mark:focus").getAttribute("aria-label");
  measured["N4-mark1-390"] = label;
  expect(label).toMatch(/drops between \$[\d,]+ and \$[\d,]+|Cliff at \$41,000/);
  expect(label).not.toMatch(/^Cliff at \$60,000/);
});

test("Texas: the caption's clauses come from their conditions (S5)", async ({ page }) => {
  await light(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/caseworker.html?zip=78701&kids=3%2C7&pay=38000&unit=year&rent=1500&childcare=1400");
  await expect(page.locator("#sourceNote")).toHaveAttribute("data-source", "live");
  const cap = await page.locator("#curveCap").textContent();
  measured["S5-TX-caption"] = cap;
  expect(cap).not.toContain("$0, not $0");
  expect(cap).toMatch(/^The y-axis starts at \$[\d,]+(, not \$0)?; the visible range is/);
  const rows = await page.locator("#ledgerRows tr").allTextContents();
  measured["S5-TX-ledger"] = rows;
  expect(rows.join(" ")).not.toContain("rises $0");
  await expect(page.locator("#coverage")).toContainText("Texas");
  await page.evaluate(() => document.getElementById("chartWrap")!.scrollIntoView());
  await page.screenshot({ path: after("S5-chart-1280-TX") });
});

test("print from OS-dark: the controls and the bar leave, the client sheet arrives in its own size, paper is light (B2, N5, N6, S8)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(HOUSEHOLD);
  await rendered(page);
  await expect(page.locator("#handout")).toBeHidden();
  await page.emulateMedia({ media: "print" });
  /* The curve's print redraw is on beforeprint, which media emulation does not fire; dispatch it here and measure the width it draws at. */
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  const shown = await page.evaluate(() => ({
    sticky: getComputedStyle(document.querySelector(".hg-scenario--sticky")!).display,
    bar: getComputedStyle(document.querySelector("header.hg-scenario")!).display,
    buttons: [...document.querySelectorAll(".hg-button")].map((b) => getComputedStyle(b).display).filter((d) => d !== "none").length,
    caption: getComputedStyle(document.querySelector(".drops caption")!).display,
    readout: getComputedStyle(document.querySelector("#readout")!).display,
    handout: getComputedStyle(document.querySelector("#handout")!).display,
    handoutSize: getComputedStyle(document.querySelector("#handout")!).fontSize,
    handoutMeasure: getComputedStyle(document.querySelector("#handout p")!).maxWidth,
    body: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.querySelector("#verdictLine")!).color,
    curveWidth: document.querySelector("#curve")!.getAttribute("viewBox")!.split(" ")[2],
    pageOverride: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.cssText.includes("color-scheme: light !important")); } catch { return false; } }),
  }));
  measured["print"] = shown;
  expect(shown.sticky).toBe("none");
  expect(shown.bar).toBe("none");
  expect(shown.buttons).toBe(0);
  expect(shown.caption).toBe("none");
  expect(shown.readout).toBe("none");
  expect(shown.handout).toBe("block");
  expect(parseFloat(shown.handoutSize)).toBeCloseTo(13 * 96 / 72, 0);
  expect(shown.handoutMeasure).not.toBe("none");
  expect(shown.body).toBe("rgb(255, 255, 255)");
  expect(shown.ink).toBe("rgb(18, 23, 28)");   /* the system's print block, no page override */
  expect(shown.pageOverride).toBe(false);
  expect(shown.curveWidth).toBe("672");
  await expect(page.locator("#handout h2")).toHaveText("Your pay and your help — Colorado, one parent, two children");
  await expect(page.locator("#handout")).toContainText("You are paid $38,000 a year. You keep about $84,400 a year.");
  await page.screenshot({ path: shot("1280-print-from-dark"), fullPage: true });
  await page.evaluate(() => document.getElementById("handout")!.scrollIntoView());
  await page.screenshot({ path: after("S8-print-handout") });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: after("N5-print-top") });
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  expect(await page.evaluate(() => document.querySelector("#curve")!.getAttribute("viewBox")!.split(" ")[2])).not.toBe("672");
});

test("archetype path: a what-if the sweep cannot answer says so instead of +$0 (B1)", async ({ page }) => {
  test.skip(!ARCHETYPE_URL, "set HOTGAP_ARCHETYPE_URL to a server whose engine is dead");
  await light(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${ARCHETYPE_URL}${HOUSEHOLD}&whatif=housing%3D1&whatif=pay%3D55000`);
  await expect(page.locator("#sourceNote")).toHaveAttribute("data-source", "archetype");
  await expect(page.locator('[data-chip="where"] .hg-chip__v')).toHaveText("80903, CO");
  await expect(page.locator("#compareHead th")).toHaveCount(4);
  const housing = page.locator("#compareHead th").nth(2), raise = page.locator("#compareHead th").nth(3);
  await expect(housing).toContainText("Housing voucher on");
  await expect(housing).toContainText("not in the sweep — needs the live call");
  await expect(raise).toContainText("1 adult, $55,000 (archetype)");
  const change = page.locator("#compareRows tr").nth(1);
  await expect(change.locator("td").nth(1)).toHaveText("—");
  await expect(change.locator("td").nth(2)).toHaveText(/^−\$[\d,]+$/);
  await expect(page.locator("#compareFoot")).toContainText("Try again");
  await expect(page.locator("#compareNote")).toContainText("no figure until the live call answers");
  measured["B1-archetype-1280"] = { head: await page.locator("#compareHead").innerText(), change: await change.innerText() };
  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  await page.screenshot({ path: after("B1-archetype-1280-compare") });
});

test("Texas: the ledger carries the LIHEAP boundary as a row tagged 'if you apply', with the cite; the assumptions carry core's sentence (Plan 7)", async ({ page }) => {
  await light(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/caseworker.html?zip=78701&kids=3%2C7&pay=30000&unit=year&rent=1500");
  await expect(page.locator("#sourceNote")).toHaveAttribute("data-source", "live");
  const row = page.locator("#ledgerRows tr[data-boundary]");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("$39,975");
  await expect(row).toContainText("LIHEAP energy assistance");
  await expect(row.locator(".hg-tag")).toHaveText("if you apply");
  // The tag says "if you apply"; the cite leads with the basis and does not say it again (liheap review S3).
  await expect(row.locator(".hg-cite")).toHaveText("150% of the poverty guideline, the heating limit. Worth $1,200 at that band if received; 3% of income-eligible households were served in FY2024. Not counted unless the household says it gets it. Read 2026-09-16.");
  await expect(page.locator("#assumed")).toContainText("Energy assistance (LIHEAP) in Texas: HotGap shows where energy assistance (LIHEAP) stops in this state");
  await expect(page.locator("#correctionsRest")).toContainText("LIHEAP energy assistance: HotGap shows where energy assistance");
  measured["P7-TX-ledger-boundary"] = await row.textContent();
});
