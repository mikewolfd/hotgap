import { test, expect } from "@playwright/test";

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
const mkPoint = (earnings: number, netIncome: number, programs: Partial<typeof PROGRAMS> = {}) =>
  ({ earnings, netIncome, medicalOOP: 0, programs: { ...PROGRAMS, ...programs } });
// A small 6-point CA fixture. The test toggles the family picker to married
// before clicking California, so the archetype requested by then is
// married-2, not the default single-2 — the fixture covers both so the
// drill-down resolves regardless of picker state. SNAP phases out by $40k so
// the drill-down's "when help ends here" threshold list has an entry to show.
const points = [
  mkPoint(0, 15000, { snap: 400 }), mkPoint(20000, 28000, { snap: 200 }), mkPoint(40000, 33000),
  mkPoint(60000, 25000), mkPoint(80000, 40000), mkPoint(100000, 50000),
];
const caFixture = {
  generated: "2026-07-11T00:00:00.000Z",
  year: "2026",
  state: "CA",
  archetypes: { "single-2": { points }, "married-2": { points } },
};

test("places door: map renders all 51 states, family picker changes color, and a state opens a real drill-down", async ({ page }) => {
  await page.goto("/#/places");
  await expect(page.getByRole("heading", { name: /compare places/i })).toBeVisible();

  const statePaths = page.locator("path.state-path");
  await expect(statePaths).toHaveCount(51);

  // Task 24: default metric is now "the jump to get out" (leap), so every
  // state's default label speaks in "needs a jump" terms, not "can lose".
  const first = statePaths.first();
  await expect(first).toHaveAttribute("tabindex", "0");
  await expect(first).toHaveAttribute("aria-label", /needs a jump of up to \$/);
  await expect(page.getByRole("radio", { name: /the jump to get out/i })).toHaveAttribute("aria-checked", "true");

  const fillsBefore = await statePaths.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.fill));

  // Toggle the family picker to married — the choropleth is colored by the
  // selected archetype's numbers, so at least one state's shade must change.
  await page.getByRole("radio", { name: /me and my spouse/i }).click();
  const fillsAfter = await statePaths.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.fill));
  expect(fillsAfter).not.toEqual(fillsBefore);

  // Toggle the metric picker to "Biggest loss" — at least one state's shade
  // changes again, and the per-state labels switch back to loss wording.
  await page.getByRole("radio", { name: /^biggest loss$/i }).click();
  const fillsAfterMetric = await statePaths.evaluateAll((els) => els.map((el) => (el as HTMLElement).style.fill));
  expect(fillsAfterMetric).not.toEqual(fillsAfter);
  await expect(first).toHaveAttribute("aria-label", /can lose up to \$/);

  // Switch back to leap for the drill-down assertions below.
  await page.getByRole("radio", { name: /the jump to get out/i }).click();

  // Click California; intercept its lazy-loaded curve file with a small fixture.
  await page.route("**/data/states/CA.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(caFixture) }),
  );
  await page.locator('path[aria-label^="California"]').click();

  // Metric is leap (we switched back above), so the headline must speak the
  // leap — the SAME metric the rank line below it sorts by (Fix 1). A loss
  // figure over a leap-based rank was the cross-door coherence bug.
  const headline = page.locator(".places-panel-headline");
  await expect(headline).toBeVisible();
  await expect(headline).toContainText("California");
  await expect(headline).toContainText(/needs a jump of about \$[\d,]+ a year/i);
  await expect(page.getByRole("img", { name: /chart/i })).toBeVisible();
  await expect(page.getByText(/not your family/i)).toBeVisible();

  // Task 24: the drill-down's escape lines (safe exit / leap), computed from
  // the same lazy-loaded curve, render with dollar amounts.
  const safeOrLeap = page.locator(".places-panel-safe, .places-panel-leap");
  await expect(safeOrLeap.first()).toBeVisible();
  await expect(safeOrLeap.first()).toContainText(/\$[\d,]+/);

  // Fix 2: the thresholds title is third-person ("here"), not "for you", so
  // it doesn't contradict the panel's own "not your family" line.
  await expect(page.getByText(/when help ends here/i)).toBeVisible();

  // Plan 4: the drill-down's own chart carries the same after-health-costs
  // framing as the personal door, and the panel's honesty area discloses it.
  // (Both the chart title and the y-axis label mention "after health costs",
  // so this targets the title specifically, same wording asserted in the
  // personal door's e2e test, to avoid a strict-mode multi-match.)
  await expect(page.getByText(/what you keep after health costs/i)).toBeVisible();
  await expect(page.getByText(/pays for health coverage/i)).toBeVisible();
});

test("places door: a state with no cached data shows a plain-language error, not a stuck spinner", async ({ page }) => {
  await page.goto("/#/places");
  await page.route("**/data/states/WY.json", (route) => route.fulfill({ status: 404, body: "not found" }));
  await page.locator('path[aria-label^="Wyoming"]').click();
  await expect(page.getByText(/could not load this state/i)).toBeVisible();
});

// Every other drill-down test above intercepts /data/states/**. That leaves
// one seam entirely unexercised: the real, committed app/public/data/states
// files served by vite preview from the real path. No route mocking here —
// California's default (single-2) drill-down must resolve from the actual
// on-disk JSON file.
test("places door: clicking a state with NO route interception renders a real drill-down from the committed data file", async ({ page }) => {
  await page.goto("/#/places");
  await page.locator('path[aria-label^="California"]').click();

  const headline = page.locator(".places-panel-headline");
  await expect(headline).toBeVisible();
  await expect(headline).toContainText("California");
  await expect(headline).toContainText(/\$[\d,]+/);
  await expect(page.getByRole("img", { name: /chart/i })).toBeVisible();
});
