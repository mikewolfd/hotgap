// The caseworker surface, end to end, through the Worker (app/README.md §
// Proofs): the mockup's household (design/caseworker.html — a Colorado
// single parent, kids 3 and 7, $38,000, the archetype's own rent and care)
// evaluated live, at 390 and 1280, light and dark, then a what-if added by a
// chip, the sticky top row measured after a scroll, print, and the
// keyboard path from the chart to a row and back. Screenshots land next to
// the audit's under design/audit/app/ with the audit's names.
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve(import.meta.dirname, "../../design/audit/app");
mkdirSync(OUT, { recursive: true });
const shot = (name: string) => resolve(OUT, `caseworker-${name}.png`);

const HOUSEHOLD = "/caseworker.html?zip=80903&kids=3%2C7&pay=38000&unit=year&rent=1735&childcare=2773&childcare-subsidy=1";

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

for (const width of [390, 1280]) for (const scheme of ["light", "dark"] as const) {
  test(`${width}px ${scheme}: the base household renders from the live call and the real coverage block`, async ({ page }) => {
    const errors = consoleErrors(page);
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width, height: width < 720 ? 844 : 900 });
    await page.goto(HOUSEHOLD);
    await rendered(page);
    await noOverflow(page);

    // The bar: the county the ZIP resolved to, beside the place.
    await expect(page.locator('[data-chip="where"] .hg-chip__v')).toHaveText("80903, CO, El Paso County");
    // The verdict, the tiles and the reach margin from reach.json.
    await expect(page.locator("#verdictSub")).toHaveText("It happens again between $45,000 and $119,000. Safe from $119,000: a raise of $73,000.");
    await expect(page.locator("#tiles .tile")).toHaveCount(4);
    await expect(page.locator("#tiles")).toContainText("percentile, ±$8,000 (n = 393)");
    // IncompleteMarker and CorrectionsApplied from coverage.CO — the count of states rendered, never typed.
    await expect(page.locator("#coverage")).toContainText("Figures complete for Colorado.");
    await expect(page.locator("#coverage")).toContainText(/In \d+ states? \([A-Z]{2}(, [A-Z]{2})*\) this line would carry the/);
    await expect(page.locator("#corrections li")).toHaveCount(1);
    await expect(page.locator("#corrections .hg-rows__at")).toHaveText("Colorado premium assistance");
    await expect(page.locator("#corrections .hg-tag")).toHaveText("modeled");
    await expect(page.locator("#corrections .hg-cite")).toContainText("assigned_co_premium_assistance netted out of the premium");
    await expect(page.locator("#correctionsRest")).toContainText("Checked and not applying here — TAFDC:");
    // ThresholdLedger under the one convention: the subsidy ends at $55,000, SNAP's remainder cited.
    const ledger = page.locator("#ledgerRows tr");
    await expect(ledger).toHaveCount(9);
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

    await page.screenshot({ path: shot(`${width}-${scheme}`), fullPage: true });
    if (width < 720) {
      // Below 720px the chips hide behind Edit; the summary line is the four facts.
      await expect(page.locator(".hg-scenario__summary span")).toHaveText("80903 · CO · El Paso County · 1 adult, kids 3 & 7 · $38,000 a year");
      await expect(page.locator("#inputs")).toBeHidden();
      // The sticky top row is the only sticky thing and stays at 0 after a scroll (S1).
      await page.evaluate(() => window.scrollTo(0, 600));
      expect(await page.evaluate(() => document.querySelector(".hg-scenario--sticky")!.getBoundingClientRect().top)).toBe(0);
      expect(await page.evaluate(() => document.querySelector(".hg-scenario__summary")!.getBoundingClientRect().top)).toBeLessThan(0);
      await page.evaluate(() => document.getElementById("drops")!.scrollIntoView());
      await page.screenshot({ path: shot(`${width}-${scheme}-drops`) });
    }
    expect(errors).toEqual([]);
  });
}

test("390px: a take-up chip adds a what-if, evaluated live, and the URL carries both; the action opens the chips", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HOUSEHOLD);
  await rendered(page);
  await expect(page.locator("#compareHead th")).toHaveCount(2);
  await expect(page.locator("#compareEmpty")).toBeVisible();

  // "Add a what-if" opens the chips row and puts focus on the first take-up toggle.
  await page.getByRole("button", { name: "What-if" }).click();
  await expect(page.locator("#inputs")).toBeVisible();
  await expect(page.locator("#inputs [aria-pressed]").first()).toBeFocused();
  await expect(page.locator(".hg-scenario__note")).toContainText("Press a take-up chip, or change a value, to add a what-if");
  await page.screenshot({ path: shot("390-light-edit-open") });

  const chip = page.locator('[data-chip="childcare-subsidy"]');
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await chip.click();
  // The what-if is in the URL at once, the chips show the base again, focus stays on the chip.
  expect(new URL(page.url()).searchParams.getAll("whatif")).toEqual(["childcare-subsidy="]);
  expect(new URL(page.url()).searchParams.get("childcare-subsidy")).toBe("1");
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(chip).toBeFocused();
  await expect(page.locator(".hg-scenario__note")).toContainText("What-if added: CCDF subsidy off.");
  expect((await evaluated).status()).toBe(200);
  // The column is evaluated beside the base.
  await expect(page.locator("#compareHead th")).toHaveCount(3);
  await expect(page.locator("#compareHead th").nth(2)).toContainText("CCDF subsidy off");
  const row = page.locator("#compareRows tr").first();
  await expect(row).toContainText("Net after premiums");
  await expect(row.locator("td").nth(1)).not.toHaveText("…");
  await expect(row.locator("td").nth(1)).toHaveText(/^\$[\d,]+$/);
  await expect(page.locator("#compareRows tr").nth(1).locator("td").nth(1)).toHaveText(/^[−+]\$[\d,]+$/);
  await expect(page.locator("#compareEmpty")).toBeHidden();
  // The same chip again is already compared; nothing is added twice.
  await chip.click();
  await expect(page.locator(".hg-scenario__note")).toContainText("is already compared");
  expect(new URL(page.url()).searchParams.getAll("whatif")).toEqual(["childcare-subsidy="]);
  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  await page.screenshot({ path: shot("390-light-compare") });
  // Removing it clears the column and the URL.
  // The controls live in the footer row, so the column header stays the column's name.
  await expect(page.locator("#compareHead")).not.toContainText("Remove");
  await page.locator("#compareFoot").getByRole("button", { name: /Remove the what-if/ }).click();
  await expect(page.locator("#compareHead th")).toHaveCount(2);
  expect(new URL(page.url()).searchParams.getAll("whatif")).toEqual([]);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("1280px: landing on a shared comparison evaluates the base and its what-ifs; a value chip adds one; the chart's keys open a row", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${HOUSEHOLD}&whatif=childcare-subsidy%3D`);
  await rendered(page);
  await expect(page.locator("#compareHead th")).toHaveCount(3);
  await expect(page.locator("#compareRows tr").first().locator("td").nth(1)).toHaveText(/^\$[\d,]+$/);

  // The raise the mockup compares: the pay chip opens the four-facts screen, and "Add as a what-if" is its other exit.
  const pay = page.locator('[data-chip="pay"]');
  await pay.click();
  await expect(page.getByLabel("Your pay, before taxes")).toBeFocused();
  await page.getByLabel("Your pay, before taxes").fill("55000");
  const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
  await page.getByRole("button", { name: "Add as a what-if" }).click();
  await expect(page.locator("#editor")).toBeHidden();
  await expect(pay).toBeFocused();
  await expect(pay.locator(".hg-chip__v")).toHaveText("$38,000 a year");   /* the chips show the base */
  expect(new URL(page.url()).searchParams.getAll("whatif")).toEqual(["childcare-subsidy=", "pay=55000"]);
  expect((await evaluated).status()).toBe(200);
  await expect(page.locator("#compareHead th")).toHaveCount(4);
  await expect(page.locator("#compareHead th").nth(3)).toContainText("Pay $55,000 a year");
  await expect(page.locator("#compareHead th").nth(3)).toContainText("1 adult, $55,000");
  await expect(page.locator("#compareRows tr").first().locator("td").nth(2)).toHaveText(/^\$[\d,]+$/);
  // Closing the screen without submitting leaves the chips on the base.
  await pay.click();
  await page.getByLabel("Your pay, before taxes").fill("60000");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(pay.locator(".hg-chip__v")).toHaveText("$38,000 a year");
  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  await page.screenshot({ path: shot("1280-light-compare") });

  // The chart: one tab stop; ] moves to the next mark, Enter opens its row, Escape closes it and focus returns to the mark.
  await page.locator("#chartWrap").focus();
  await page.keyboard.press("]");
  const mark = page.locator("#marks .hg-mark:focus");
  await expect(mark).toHaveCount(1);
  await expect(page.locator("#readout")).toContainText(/^Cliff at \$[\d,]+ to \$[\d,]+: −\$[\d,]+\./);
  await page.keyboard.press("Enter");
  await expect(mark).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('#dropRows [aria-current="true"]')).toHaveCount(1);
  const opened = await page.locator('#dropRows [aria-current="true"]').textContent();
  await expect(page.locator("#bdTitle")).toContainText(opened!.split(" → ")[0]);
  await page.evaluate(() => document.getElementById("drops")!.scrollIntoView());
  await page.screenshot({ path: shot("1280-light-row-open") });
  await page.keyboard.press("Escape");
  await expect(page.locator('#dropRows [aria-current="true"]')).toHaveCount(0);
  await expect(mark).toHaveAttribute("aria-expanded", "false");
  await expect(mark).toBeFocused();
  // Arrow keys move the readout's point.
  await page.locator("#chartWrap").focus();
  await page.keyboard.press("Home");
  await expect(page.locator("#readout")).toContainText("Earnings $0 →");
  // Landing and what-ifs replaced the history entry rather than pushing: one Back leaves the page.
  await page.goBack();
  expect(page.url()).toBe("about:blank");
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test("print from dark: the controls leave, the client sheet arrives, and paper is light (B2)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(HOUSEHOLD);
  await rendered(page);
  await expect(page.locator("#handout")).toBeHidden();
  await page.emulateMedia({ media: "print" });
  const shown = await page.evaluate(() => ({
    sticky: getComputedStyle(document.querySelector(".hg-scenario--sticky")!).display,
    buttons: [...document.querySelectorAll(".hg-button")].map((b) => getComputedStyle(b).display).filter((d) => d !== "none").length,
    chips: getComputedStyle(document.querySelector("#inputs")!).display,
    marks: getComputedStyle(document.querySelector(".hg-mark")!).display,
    handout: getComputedStyle(document.querySelector("#handout")!).display,
    body: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.querySelector("#verdictLine")!).color,
  }));
  expect(shown.sticky).toBe("none");
  expect(shown.buttons).toBe(0);
  expect(shown.handout).toBe("block");
  expect(shown.body).toBe("rgb(255, 255, 255)");
  expect(shown.ink).toBe("rgb(18, 23, 28)");
  await expect(page.locator("#handout h2")).toHaveText("For the client — Colorado, one parent, two children");
  await expect(page.locator("#handout")).toContainText("You are paid $38,000 a year. You keep about $84,400 a year.");
  await page.screenshot({ path: shot("1280-print-from-dark"), fullPage: true });
});
