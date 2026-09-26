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
// Rewritten with the page on 2026-09-18 (design/PICTURE-FIRST-2026-09-18.md).
// Two things changed for every test below. The page is now one sentence and a
// figure over five named disclosures, so a proof that reads a ledger row
// opens the disclosure it lives in first — the way a counselor does. And the comparison is drawn on the picture: an answered
// what-if is a second line with its own dash and tag, and its column in the
// table must agree with it.
//
// HOTGAP_ARCHETYPE_URL, when set, is a second server whose engine is dead
// (wrangler dev --var HOTGAP_PE_URL:http://127.0.0.1:9/us/calculate); the
// B1 test runs against it and is skipped otherwise.
import { expect, test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AUDIT_DIR as AUDIT, consoleErrors, noOverflow, outDir, OPEN_ALL } from "./support.js";

const AFTER = outDir("design/review/caseworker/after");
const shot = (name: string) => resolve(AUDIT, `caseworker-${name}.png`);
const after = (name: string) => resolve(AFTER, `${name}.png`);
/** Plan 9's own review folder: the keep-rate row, the on-the-way list, the tile demotion. */
const KEEP_DIR = outDir("design/review/keep-rate");
const keepShot = (name: string) => resolve(KEEP_DIR, `caseworker-${name}.png`);
/** The picture-first pass's own folder, beside the citizen's. */
const PF_DIR = outDir("design/review/picture-first/caseworker");
const pf = (name: string) => resolve(PF_DIR, `${name}.png`);
const measured: Record<string, unknown> = {};
test.afterAll(() => writeFileSync(resolve(AFTER, "measurements.json"), JSON.stringify(measured, null, 1)));

const HOUSEHOLD = "/caseworker.html?zip=80903&kids=3%2C7&pay=38000&unit=year&rent=1735&childcare=2773&childcare-subsidy=1";
const THREE_WHAT_IFS = "&whatif=childcare-subsidy%3D&whatif=housing%3D1&whatif=pay%3D55000";
const ARCHETYPE_URL = process.env.HOTGAP_ARCHETYPE_URL;

const rendered = async (page: Page) => {
  await expect(page.locator("#answer")).toContainText("Net stays below its $51,456 peak (at $36,000) until $45,000: 2 of the 9 steps between them lose money");
  await expect(page.locator("#sourceNote")).toHaveAttribute("data-source", "live");
};
const light = async (page: Page) => page.emulateMedia({ colorScheme: "light" });
/** Open one of the page's five named disclosures, the way a counselor presses it. */
const open = async (page: Page, id: string) => {
  await page.evaluate((x) => { (document.getElementById(x) as HTMLDetailsElement).open = true; }, id);
  await expect(page.locator(`#${id}`)).toHaveAttribute("open", "");
};
/** The compare table's geometry: what B2 is measured by. */
const compareBox = (page: Page) => page.evaluate(() => {
  const t = document.querySelector(".compare")!, sc = t.closest(".hg-scroll-x")!;
  const cols = [...document.querySelectorAll("#compareHead th")].map((th) => ({ w: Math.round(th.getBoundingClientRect().width), right: Math.round(th.getBoundingClientRect().right) }));
  return { tableW: Math.round(t.getBoundingClientRect().width), scrollerW: Math.round(sc.getBoundingClientRect().width), scrollerRight: Math.round(sc.getBoundingClientRect().right), scrollW: sc.scrollWidth, cols };
});

for (const width of [390, 1280] as const) for (const scheme of ["light", "dark"] as const) {
  test(`${width}px ${scheme}: the base household renders from the live call and the real coverage block`, async ({ page }) => {
    const errors = consoleErrors(page);
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(HOUSEHOLD);
    await rendered(page);

    // The answer is the figure's own caption, first child, so the picture's accessible name IS the answer.
    expect(await page.evaluate(() => document.querySelector("figure")!.firstElementChild!.id)).toBe("answer");
    // Each dollar figure in the sentence wears the key of the mark it names.
    await expect(page.locator("#answer .hg-amt--gap")).toHaveCount(3);
    // Nothing between the masthead and the answer: the chips are behind Edit at every width now.
    await expect(page.locator("#inputs")).toBeHidden();
    await expect(page.locator(".hg-scenario__summary span")).toHaveText("A parent with kids aged 3 & 7 in El Paso County, Colorado, paid $38,000 a year.");

    // ── Nothing that warns hides, and nothing that merely provides is in the way.
    await expect(page.locator("#incomplete")).toBeHidden();       /* Colorado is complete: not a warning, so not in the notices */
    await expect(page.locator("#whose")).toBeHidden();            /* a live call is nobody else's curve */
    await expect(page.locator("#coverage")).toContainText("Figures complete for Colorado.");
    for (const id of ["steps-panel", "compare-panel", "ledger-panel", "assumed-panel", "sources-panel", "howto"]) {
      expect(await page.evaluate((x) => (document.getElementById(x) as HTMLDetailsElement).open, id), `${id} closed by default`).toBe(false);
    }
    // ── The picture says what the prose used to (design/charts.md § Direct labels).
    const labels = await page.evaluate(() => [...document.querySelectorAll("#curve text.hg-label")].map((t) => t.textContent));
    measured[`PF-labels-${width}-${scheme}`] = labels;
    expect(labels).toContain("net $51,095, help counted");         /* 1: the y axis named in dollars at the diamond, and why it is not the pay */
    expect(labels.some((l) => /^−\$\d/.test(l ?? ""))).toBe(true); /* 2: the largest drop always draws */
    expect(labels.some((l) => /¢ of each extra dollar on average$/.test(l ?? ""))).toBe(true);   /* 6: the keep rate on the road out of poverty */
    // The peak's own dollar went with this pass: it printed a number within a rounding of "net" two inches away.
    expect(labels.filter((l) => l === "$51,456")).toEqual([]);

    // ── The rows behind the disclosures are the rows they always were.
    await open(page, "sources-panel");
    await expect(page.locator("#coverage")).toContainText(/In \d+ states? \([A-Z]{2}(, [A-Z]{2})*\) this line would carry the|Nothing this household would hold is unmodelled here\./);
    await expect(page.locator("#corrections li")).toHaveCount(1);
    await expect(page.locator("#corrections .hg-rows__at")).toHaveText("Colorado premium assistance");
    await expect(page.locator("#corrections .hg-tag")).toHaveText("modeled");
    await expect(page.locator("#corrections .hg-cite")).toContainText("HotGap subtracts it from the premium the household pays");
    await expect(page.locator("#correctionsRest")).toContainText("Checked and not applying here — TAFDC:");
    await expect(page.locator("#sourceNote")).toContainText("Curve: live PolicyEngine call for this household in El Paso County, Colorado.");
    await expect(page.locator("#sourceNote")).toContainText(/Model: policyengine-us \d/);

    await open(page, "ledger-panel");
    const ledger = page.locator("#ledgerRows tr");
    await expect(ledger).toHaveCount(10);
    await expect(ledger.nth(7)).toContainText("$69,935");
    await expect(ledger.nth(7).locator(".hg-tag")).toHaveText("if you apply");
    await expect(ledger.nth(5)).toContainText("$55,000");
    await expect(ledger.nth(5)).toContainText("CCDF child care subsidy");
    await expect(ledger.nth(5)).toContainText("Care priced at $2,773 a month for 2 children (county 2015 prices");
    await expect(ledger.nth(3)).toContainText("$713 a year of SNAP continues at $54,000, none from $55,000.");
    await expect(ledger.filter({ hasText: "Deferred" })).toHaveCount(2);

    await open(page, "steps-panel");
    // The zones beyond this one lead the disclosure a counselor opens second — not the answer.
    await expect(page.locator("#again")).toHaveText("It happens again between $45,000 and $119,000. Safe from $119,000: a raise of $73,000.");
    await expect(page.locator("#answer")).not.toContainText("again");
    await expect(page.locator("#tiles .tile")).toHaveCount(5);
    await expect(page.locator("#tiles .tile").nth(2)).toContainText("Next cliff");
    await expect(page.locator("#tiles .tile").nth(2)).toContainText("$41,000 → $42,000");
    await expect(page.locator("#tiles .tile").nth(3)).toContainText("Largest drop anywhere on the curve");
    await expect(page.locator("#tiles .tile").nth(3)).toContainText("in 100 families like this earn less");
    await expect(page.locator("#tiles")).toContainText("percentile, ±$8,000 (n = 393)");
    // Every drop row carries its own position now, so the fourth cliff is as defensible as the two on the tiles.
    await expect(page.locator('#dropRows [aria-current="true"]')).toHaveText(/^\$54,000 → \$55,000/);
    // The position stays on the two tiles a counselor reads out and off every row: three of four fresh
    // readers flinched at being ranked, and ten rows of it was nine too many.
    await expect(page.locator("#dropRows tr").first().locator(".hg-cite")).toHaveCount(0);
    await expect(page.locator("#bdTitle")).toHaveText("Where the $25,449 went — $54,000 to $55,000");
    await expect(page.locator("#bdBars")).toContainText("Sums to $25,449, the drop. Driver: benefits.");

    await open(page, "assumed-panel");
    await expect(page.locator("#reachNote")).toContainText("it says how common the pay is, never the odds of getting there");

    expect(await page.locator("#marks .hg-mark").count()).toBeGreaterThan(0);
    await expect(page.locator("#chartWrap")).toHaveAttribute("aria-label", /The largest step down is \$25,449 at \$54,000 where CCDF child care subsidy ends/);
    await open(page, "howto");
    await expect(page.locator("#curveCap")).toContainText(/The y-axis starts at \$[\d,]+, not \$0; the visible range is [\d.]+× the largest drop\. The x-axis runs \$0 to \$[\d,]+; scroll the curve sideways to reach all of it\. No cliff on this curve is deferred\. Estimates only/);

    // The page's ground, the same two values as before.
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe(scheme === "dark" ? "rgb(13, 17, 20)" : "rgb(232, 235, 238)");
    // N1: a landing leaves focus at the document start, so the answer wears no ring.
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
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: pf(`${width}-screen1`) });
      await page.evaluate(OPEN_ALL);
      await page.screenshot({ path: pf(`${width}-open`), fullPage: true });
      await page.evaluate(() => { for (const d of document.querySelectorAll("details")) d.open = false; });
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: pf(`${width}-screen1-dark`) });
    }
    if (width < 720) {
      measured[`N9-summary-${scheme}`] = await page.evaluate(() => ({ text: document.querySelector(".hg-scenario__summary span")!.textContent, h: document.querySelector(".hg-scenario__summary span")!.getBoundingClientRect().height }));
      await open(page, "steps-panel");
      // S7: the breakdown's track is the panel's width, its axis words one line.
      const bd = await page.evaluate(() => ({ track: document.querySelector(".bd-row:not(.bd-axis) .bd-track")!.getBoundingClientRect().width, axisH: document.querySelector(".bd-axis .bd-track")!.getBoundingClientRect().height }));
      measured[`S7-breakdown-${scheme}`] = bd;
      expect(bd.track).toBeGreaterThan(300);
      expect(bd.axisH).toBeLessThan(24);
      // S9: a correction's cite has the whole line below 520px.
      await open(page, "sources-panel");
      const cite = await page.evaluate(() => document.querySelector("#corrections .hg-cite")!.getBoundingClientRect().width);
      measured[`S9-cite-${scheme}`] = cite;
      expect(cite).toBeGreaterThan(300);
      // B2: the base alone fits its scroller, values inside it.
      await open(page, "compare-panel");
      const box = await compareBox(page);
      measured[`B2-compare-390-now-${scheme}`] = box;
      expect(box.scrollW).toBeLessThanOrEqual(box.scrollerW);
      expect(box.cols[1].right).toBeLessThanOrEqual(box.scrollerRight);
      if (scheme === "light") {
        await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
        await page.screenshot({ path: after("B2-compare-390-now-only") });
        await page.evaluate(() => document.getElementById("coverage")!.scrollIntoView());
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
      // S2: the chips, behind Edit at every width since the picture came first, in the counselor's order —
      // facts, then the take-up toggles — and an unset value lighter than an answer.
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await expect(page.locator("#inputs")).toBeVisible();
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
      await expect(page.locator('[data-chip="where"] .hg-chip__v')).toHaveText("80903, CO, El Paso County");
      await expect(page.locator('[data-chip="childcare-subsidy"]')).toHaveText("CCDF subsidyon");
      await expect(page.locator('[data-chip="no-snap"]')).toHaveText("SNAPon");
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: after("S1-S2-chips-1280"), clip: { x: 0, y: 0, width: 1280, height: 300 } });
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      // S7 at 1280: label, track and value on one line.
      await open(page, "steps-panel");
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
    await noOverflow(page);
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
  await expect(page.locator("#curve path[data-whatif]")).toHaveCount(0);

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

  // The comparison IS the picture. A raise with nothing else changed is the SAME curve at a different pay,
  // so it is not a second line — its line would lie exactly under the base's and claim there are two
  // curves. It is a hollow diamond where that pay lands, and the caption says which kind it is.
  await expect(page.locator("#curve path[data-whatif]")).toHaveCount(1);
  await expect(page.locator('#curve path[data-whatif][data-kind="position"]')).toHaveCount(1);
  await expect(page.locator("#curve text.hg-label--whatif")).toHaveText(["$55,000"]);
  await expect(page.locator("#curveCap")).toContainText("One what-if is this same curve at a different pay: its hollow diamond marks where it lands.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: pf("390-one-whatif") });

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
  // A person asked for the comparison, so the disclosure it lands in is open by the time the link is pressed.
  expect(await page.evaluate(() => (document.getElementById("compare-panel") as HTMLDetailsElement).open)).toBe(true);
  // The columns are evaluated beside the base; one chip is named one way in the chip, the note and the column (S1).
  await expect(page.locator("#compareHead th")).toHaveCount(4);
  await expect(page.locator("#compareHead th").nth(3)).toContainText("CCDF subsidy off");
  await expect(page.locator("#compareRows tr").first().locator("td").nth(2)).toHaveText(/^\$[\d,]+$/);
  await expect(page.locator("#compareEmpty")).toBeHidden();
  // Two columns, two marks: the picture and the table cannot disagree about how many what-ifs there are.
  // Turning the subsidy off is a different household, so that one IS a second curve, and a dashed one —
  // a dash, not a colour, so the two lines are told apart in greyscale and on a photocopier.
  await expect(page.locator("#curve path[data-whatif]")).toHaveCount(2);
  const line = page.locator('#curve path[data-whatif]:not([data-kind="position"])');
  await expect(line).toHaveCount(1);
  expect(await line.getAttribute("stroke-dasharray")).toBeTruthy();
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
  await expect(page.locator("#curve path[data-whatif]")).toHaveCount(1);   /* the line goes with the column */
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

test("1280px: three what-ifs are three lines on one picture and four columns in the table; a failed what-if keeps its name; the chart's keys open a row", async ({ page }) => {
  const errors = consoleErrors(page);
  await light(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(HOUSEHOLD + THREE_WHAT_IFS);
  await rendered(page);
  await expect(page.locator("#compareHead th")).toHaveCount(5);

  // The comparison is the picture. Three what-ifs, three marks, each named:
  // two are different households and draw their own curves; the raise is this curve at another pay.
  await expect(page.locator("#curve path[data-whatif]")).toHaveCount(3);
  const tags = await page.locator("#curve text.hg-label--whatif").allTextContents();
  measured["PF-whatif-tags-1280"] = tags;
  expect(tags).toEqual(["CCDF subsidy", "Housing voucher", "$55,000"]);
  // Distinct dashes, so identity survives greyscale; the position mark carries none and is a shape instead.
  const dashes = await page.evaluate(() => [...document.querySelectorAll('#curve path[data-whatif]:not([data-kind="position"])')].map((p) => p.getAttribute("stroke-dasharray")));
  measured["PF-whatif-dashes"] = dashes;
  expect(dashes.length).toBe(2);
  expect(new Set(dashes).size).toBe(2);
  await expect(page.locator('#curve path[data-whatif][data-kind="position"]')).toHaveCount(1);
  await expect(page.locator("#curveCap")).toContainText("2 what-ifs are drawn here as second lines");
  await expect(page.locator("#curveCap")).toContainText("One what-if is this same curve at a different pay");
  await page.screenshot({ path: pf("1280-three-whatifs") });

  await open(page, "compare-panel");
  for (let i = 1; i <= 3; i++) await expect(page.locator("#compareRows tr").first().locator("td").nth(i)).toHaveText(/^\$[\d,]+$/);
  // B2 at 1280: three what-ifs, no overflow, the names at their 11rem.
  const box = await compareBox(page);
  measured["B2-compare-1280-3-whatifs"] = box;
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
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.locator('[data-chip="head-start"]').click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.locator("#compareHead th")).toHaveCount(6);
  await expect(page.locator("#compareHead th").nth(5)).toContainText("Head Start on");
  await expect(page.locator("#compareHead th").nth(5)).toContainText("did not come back");
  await expect(page.locator("#compareHead th").nth(5)).not.toContainText("busy");
  await expect(page.locator("#compareFoot")).toContainText("The engine is busy. Try again in a few seconds.");
  // A column with no evaluation is no line: the picture never draws a curve nobody computed.
  await expect(page.locator("#curve path[data-whatif]")).toHaveCount(3);
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

  // The chart: one tab stop; ] moves to the next mark, Enter opens its row in the disclosure the rows live in, Escape closes it.
  await page.locator("#chartWrap").focus();
  await page.keyboard.press("]");
  const mark = page.locator("#marks .hg-mark:focus");
  await expect(mark).toHaveCount(1);
  await expect(page.locator("#readout")).toContainText(/^(Cliff at \$[\d,]+ to \$[\d,]+: −\$[\d,]+\.|\d+ drops between)/);
  await page.keyboard.press("Enter");
  await expect(mark).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => (document.getElementById("steps-panel") as HTMLDetailsElement).open)).toBe(true);
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

test("Plan 9: the keep-rate row and the on-the-way list measure against the page's own /api/evaluate responses; the tiles demote the whole-axis worst below the household's own next cliff", async ({ page }) => {
  const errors = consoleErrors(page);
  await light(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  // Every /api/evaluate call this page load makes, request and reply, captured live — the proof recomputes the keep cell and the on-the-way list from these, never from the rendered HTML alone.
  const calls: { req: Record<string, unknown>; res: Record<string, unknown> }[] = [];
  page.on("response", (res) => {
    if (!res.url().endsWith("/api/evaluate")) return;
    void res.json().then((body) => calls.push({ req: (res.request().postDataJSON() ?? {}) as Record<string, unknown>, res: body as Record<string, unknown> })).catch(() => {});
  });
  await page.goto(HOUSEHOLD + THREE_WHAT_IFS);
  await rendered(page);
  await open(page, "compare-panel");
  await open(page, "steps-panel");
  await expect(page.locator("#compareHead th")).toHaveCount(5);
  // Wait for every what-if to land before reading the table or the capture.
  for (let i = 1; i <= 3; i++) await expect(page.locator("#compareRows tr").first().locator("td").nth(i)).toHaveText(/^\$[\d,]+$/);

  // Plan 9's demotion: the family's own next cliff leads (a different, nearer cliff here), the whole-axis worst — labeled as the whole-axis fact — follows it, each with its own position.
  const tiles = page.locator("#tiles .tile");
  await expect(tiles).toHaveCount(5);
  await expect(tiles.nth(2)).toContainText("Next cliff");
  await expect(tiles.nth(2)).toContainText(/in 100 families like this earn less/);
  await expect(tiles.nth(3)).toContainText("Largest drop anywhere on the curve");
  await expect(tiles.nth(3)).toContainText(/in 100 families like this earn less/);

  const earn = (c: { res: Record<string, unknown> }) => (c.res.analysis as Record<string, unknown>).currentEarnings as number;
  const base = calls.find((c) => earn(c) === 38000 && c.req.getsChildcareSubsidy === true && c.req.getsHousing !== true);
  const payWhatIf = calls.find((c) => earn(c) === 55000);
  const toggleWhatIf = calls.find((c) => earn(c) === 38000 && c.req.getsChildcareSubsidy === false);
  expect([base, payWhatIf, toggleWhatIf].every(Boolean), `captured base, pay and toggle what-ifs among ${calls.length} /api/evaluate calls`).toBe(true);
  measured["keepRate-calls"] = calls.map((c) => ({ req: { earnings: c.req.annualEarnings, subsidy: c.req.getsChildcareSubsidy, housing: c.req.getsHousing }, net: earn(c) }));

  // Δnet ÷ Δpay between the base and the pay what-if, rounded the way keepRateWords rounds — the compare row's own cell, never typed here.
  const baseAnalysis = base!.res.analysis as Record<string, unknown>, payAnalysis = payWhatIf!.res.analysis as Record<string, unknown>;
  const baseNet = baseAnalysis.currentNet as number, baseEarn = baseAnalysis.currentEarnings as number;
  const payNet = payAnalysis.currentNet as number, payEarn = payAnalysis.currentEarnings as number;
  const rate = (payNet - baseNet) / (payEarn - baseEarn);
  const expectedKeep = `${rate < 0 ? "loses" : "keeps"} ${Math.round(Math.abs(rate) * 100)}¢ of each extra dollar on average`;

  const payTitle = "Pay $55,000 a year", toggleTitle = "CCDF subsidy off";
  const indexOfHeader = (title: string) => page.evaluate((t) => [...document.querySelectorAll("#compareHead th")].findIndex((th) => th.textContent?.includes(t)), title);
  const payIndex = await indexOfHeader(payTitle), toggleIndex = await indexOfHeader(toggleTitle);
  expect(payIndex).toBeGreaterThan(0);
  expect(toggleIndex).toBeGreaterThan(0);
  const keepRow = page.locator("#compareRows tr").nth(2);   /* net, change, keep — the row directly under Change from now */
  await expect(keepRow.locator("th")).toHaveText("Of each extra dollar, now → this what-if");
  await expect(keepRow.locator("td, th").nth(payIndex)).toHaveText(expectedKeep);
  // The toggle changed no pay: its keep cell is the table's own dash, never a rate over $0.
  await expect(keepRow.locator("td, th").nth(toggleIndex)).toHaveText("—");

  // On the way: the base's own cliffs between the two pays, from the page's own live response.
  const baseCliffs = baseAnalysis.cliffs as { startEarnings: number }[];
  const lo = Math.min(baseEarn, payEarn), hi = Math.max(baseEarn, payEarn);
  const expectedOnTheWay = baseCliffs.filter((c) => c.startEarnings >= lo && c.startEarnings < hi);
  const payCol = page.locator("#onTheWay .on-the-way__col").filter({ hasText: payTitle });
  await expect(payCol).toHaveCount(1);
  await expect(payCol.locator("li")).toHaveCount(expectedOnTheWay.length);
  for (const [i, c] of expectedOnTheWay.entries()) await expect(payCol.locator("li").nth(i)).toContainText(`$${c.startEarnings.toLocaleString("en-US")}`);
  // The toggle column moved no pay: no on-the-way list at all, not an empty one.
  await expect(page.locator("#onTheWay .on-the-way__col").filter({ hasText: toggleTitle })).toHaveCount(0);
  measured["keepRate-onTheWay"] = { expected: expectedOnTheWay.map((c) => c.startEarnings), rendered: await payCol.locator("li").allTextContents() };

  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  await page.screenshot({ path: keepShot("1280") });
  expect(errors).toEqual([]);
});

test("390px with three what-ifs: no horizontal scroll (the compare table's width rule holds with the keep row's prose cell); print keeps the row and stays light", async ({ page }) => {
  const errors = consoleErrors(page);
  await light(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HOUSEHOLD + THREE_WHAT_IFS);
  await rendered(page);
  await expect(page.locator("#curve path[data-whatif]")).toHaveCount(3);
  await expect(page.locator("#compareHead th")).toHaveCount(5);
  await open(page, "compare-panel");
  for (let i = 1; i <= 3; i++) await expect(page.locator("#compareRows tr").first().locator("td").nth(i)).toHaveText(/^\$[\d,]+$/);
  // The page itself never scrolls sideways — B2's rule for the compare table's own scroller (fits whole at one or two what-ifs) is unchanged by the keep row; three what-ifs already needed the table's internal .hg-scroll-x before this plan, and still do — measured, not asserted narrower than the pre-existing contract.
  await noOverflow(page);
  const box = await compareBox(page);
  measured["keepRate-B2-compare-390-3-whatifs"] = box;
  expect(box.cols[0].w).toBeGreaterThanOrEqual(112);   /* the sticky name column keeps its 8rem at this width, wrap row or not */
  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  await page.screenshot({ path: keepShot("390") });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: pf("390-three-whatifs") });

  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => dispatchEvent(new Event("beforeprint")));
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(255, 255, 255)");   /* paper is light, even from a light OS session */
  // Print opens everything: a closed <details> prints nothing, and on paper there is nobody to press anything.
  const closed = await page.evaluate(() => [...document.querySelectorAll("details.hg-disclosure")].filter((d) => !(d as HTMLDetailsElement).open).length);
  expect(closed).toBe(0);
  const keepRow = page.locator("#compareRows tr").nth(2);
  await expect(keepRow.locator("th")).toHaveText("Of each extra dollar, now → this what-if");
  await expect(keepRow).toBeVisible();   /* nothing hides the keep row on paper */
  await page.screenshot({ path: keepShot("390-print") });
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  // And closes them again afterwards, so the screen is where the reader left it.
  expect(await page.evaluate(() => (document.getElementById("ledger-panel") as HTMLDetailsElement).open)).toBe(false);

  expect(errors).toEqual([]);
});

test("es-US: the answer, the picture's labels and the disclosure names are the Spanish redraft", async ({ page }) => {
  const errors = consoleErrors(page);
  await light(page);
  for (const width of [390, 1280] as const) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(`${HOUSEHOLD}&lang=es-US`);
    await expect(page.locator("#answer")).toHaveText(/^El neto se queda por debajo de su pico de \$[\d,]+ \(en \$[\d,]+\) hasta \$[\d,]+: \d+ de los \d+ pasos entre ambos pierden? dinero; con \$[\d,]+ más al año sale del tramo\.$/);
    await expect(page.locator("#howToSummary")).toHaveText("Cómo leer esta gráfica");
    await expect(page.locator("#stepsHeading")).toHaveText("Lo que enfrenta esta familia, escalón por escalón");
    await expect(page.locator("#compare")).toHaveText("Comparar los escenarios");
    const labels = await page.evaluate(() => [...document.querySelectorAll("#curve text.hg-label")].map((t) => t.textContent));
    measured[`ES-labels-${width}`] = labels;
    expect(labels).toContain("neto $51,095, con la ayuda contada");
    expect(labels.some((l) => /¢ de cada dólar extra de media$/.test(l ?? ""))).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: pf(`${width}-es`) });
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
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
  await open(page, "ledger-panel");
  const rows = await page.locator("#ledgerRows tr").allTextContents();
  measured["S5-TX-ledger"] = rows;
  expect(rows.join(" ")).not.toContain("rises $0");
  await open(page, "sources-panel");
  await expect(page.locator("#coverage")).toContainText("Texas");
  await page.evaluate(() => document.getElementById("chartWrap")!.scrollIntoView());
  await page.screenshot({ path: after("S5-chart-1280-TX") });
});

test("print from OS-dark: the controls and the bar leave, the client sheet opens with the pay and the money kept, paper is light (B2, N5, N6, S8)", async ({ page }) => {
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
    caption: getComputedStyle(document.querySelector("#dropsCaption")!).display,
    readout: getComputedStyle(document.querySelector("#readout")!).display,
    masthead: getComputedStyle(document.querySelector("#masthead")!).display,
    handout: getComputedStyle(document.querySelector("#handout")!).display,
    handoutSize: getComputedStyle(document.querySelector("#handout")!).fontSize,
    handoutMeasure: getComputedStyle(document.querySelector("#handout p")!).maxWidth,
    body: getComputedStyle(document.body).backgroundColor,
    ink: getComputedStyle(document.querySelector("#answer")!).color,
    curveWidth: document.querySelector("#curve")!.getAttribute("viewBox")!.split(" ")[2],
    gutterWidth: document.querySelector(".hg-chart__gutter")!.getAttribute("viewBox")!.split(" ")[2],
    pageOverride: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.cssText.includes("color-scheme: light !important")); } catch { return false; } }),
  }));
  measured["print"] = shown;
  expect(shown.sticky).toBe("none");
  expect(shown.bar).toBe("none");
  expect(shown.buttons).toBe(0);
  expect(shown.caption).toBe("none");
  expect(shown.readout).toBe("none");
  /* Paper has no ScenarioBar and, since the page opens with the answer, no wordmark either: one print-only line says whose numbers these are. */
  expect(shown.masthead).toBe("block");
  await expect(page.locator("#masthead")).toHaveText("HotGap 1 adult in Colorado, $38,000 of earnings.");
  expect(shown.handout).toBe("block");
  expect(parseFloat(shown.handoutSize)).toBeCloseTo(13 * 96 / 72, 0);
  expect(shown.handoutMeasure).not.toBe("none");
  expect(shown.body).toBe("rgb(255, 255, 255)");
  expect(shown.ink).toBe("rgb(18, 23, 28)");   /* the system's print block, no page override */
  expect(shown.pageOverride).toBe(false);
  /* 672 is still the figure's width on paper, but the figure is two SVGs now —
     the y axis holds still in a 52px gutter and the plot is the rest — so the
     pin is on the pair. Paper cannot scroll, so the plot is the column and the
     whole axis is fitted into it (charts.md § The scroll rule, 2026-09-17). */
  expect(Number(shown.curveWidth) + Number(shown.gutterWidth)).toBe(672);
  expect(shown.gutterWidth).toBe("52");
  await expect(page.locator("#handout h2")).toHaveText("Your pay and your help — Colorado, one parent, two children");
  /* The sheet's first line is the two facts the citizen answer gave up on 2026-09-18: the pay is in the
     ScenarioBar and the money kept is the label on the diamond, and paper carries neither. */
  await expect(page.locator("#handout p").first()).toHaveText("You're paid $38,000 a year, and with help counted you keep $51,095.");
  await expect(page.locator("#handout")).toContainText("You're past a drop at $38,000. From here to $45,000 you keep about 5¢ of each extra dollar; at $45,000 you're back to what you'd have kept at $36,000.");
  await page.screenshot({ path: shot("1280-print-from-dark"), fullPage: true });
  await page.screenshot({ path: pf("1280-print"), fullPage: true });
  await page.evaluate(() => document.getElementById("handout")!.scrollIntoView());
  await page.screenshot({ path: after("S8-print-handout") });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: after("N5-print-top") });
  await page.evaluate(() => dispatchEvent(new Event("afterprint")));
  expect(await page.evaluate(() => document.querySelector("#curve")!.getAttribute("viewBox")!.split(" ")[2])).not.toBe("672");
});

test("archetype path: the notice stays in the open, and a what-if the sweep cannot answer says so instead of +$0 (B1)", async ({ page }) => {
  test.skip(!ARCHETYPE_URL, "set HOTGAP_ARCHETYPE_URL to a server whose engine is dead");
  await light(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${ARCHETYPE_URL}${HOUSEHOLD}&whatif=housing%3D1&whatif=pay%3D55000`);
  await expect(page.locator("#sourceNote")).toHaveAttribute("data-source", "archetype");
  /* Whose numbers these are is a warning, so it never hides: it is in the notices, above the figure, with Try again. */
  await expect(page.locator("#whose")).toBeVisible();
  await expect(page.locator("#whoseText")).toHaveText("These are the committed sweep's numbers for a household of this shape in Colorado, not this family's own live call.");
  await expect(page.locator("#whose").getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.locator('[data-chip="where"] .hg-chip__v')).toHaveText("80903, CO");
  await open(page, "compare-panel");
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
  /* A column the sweep cannot answer has no evaluation, so it has no line either: only the pay what-if draws. */
  await expect(page.locator("#curve path[data-whatif]")).toHaveCount(1);
  measured["B1-archetype-1280"] = { head: await page.locator("#compareHead").innerText(), change: await change.innerText() };
  await page.evaluate(() => document.getElementById("compare")!.scrollIntoView());
  await page.screenshot({ path: after("B1-archetype-1280-compare") });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: pf("1280-archetype") });
});

test("Texas: the ledger carries the LIHEAP boundary as a row tagged 'if you apply', with the cite; the assumptions carry core's sentence (Plan 7)", async ({ page }) => {
  await light(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/caseworker.html?zip=78701&kids=3%2C7&pay=30000&unit=year&rent=1500");
  await expect(page.locator("#sourceNote")).toHaveAttribute("data-source", "live");
  await open(page, "ledger-panel");
  const row = page.locator("#ledgerRows tr[data-boundary]");
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("$39,975");
  await expect(row).toContainText("LIHEAP energy assistance");
  await expect(row.locator(".hg-tag")).toHaveText("if you apply");
  // The tag says "if you apply"; the cite leads with the basis and does not say it again (liheap review S3).
  await expect(row.locator(".hg-cite")).toHaveText("150% of the poverty guideline, the heating limit. Worth $1,200 at that band if received; 3% of income-eligible households were served in FY2024. Not counted unless the household says it gets it. Read 2026-09-16.");
  await open(page, "assumed-panel");
  await expect(page.locator("#assumed")).toContainText("Energy assistance (LIHEAP) in Texas: HotGap shows where energy assistance (LIHEAP) stops in this state");
  await open(page, "sources-panel");
  await expect(page.locator("#correctionsRest")).toContainText("LIHEAP energy assistance: HotGap shows where energy assistance");
  measured["P7-TX-ledger-boundary"] = await row.textContent();
});
