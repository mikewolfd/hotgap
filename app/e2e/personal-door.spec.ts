import { test, expect } from "@playwright/test";

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
const mkPoint = (earnings: number, netIncome: number, medicaid = 0, medicalOOP = 0) => ({
  earnings, netIncome, medicalOOP, programs: { ...PROGRAMS, medicaid },
});
// A 6-point curve with a $8k cliff at $30k where medicaid disappears.
// The $20k point (nearest sampled point to currentEarnings=24960 below) also
// carries a real health cost — Plan 4's transparency line must surface it.
const curve = {
  year: "2026",
  currentEarnings: 24960, // $12/hr × 40h
  points: [
    mkPoint(0, 20000, 8000), mkPoint(10000, 26000, 8000), mkPoint(20000, 30000, 8000, 1200),
    mkPoint(30000, 32000, 8000), mkPoint(40000, 24000, 0), mkPoint(50000, 31000, 0),
  ],
};

test("landing → flow → cliff result", async ({ page }) => {
  await page.route("**/api/curve", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(curve) }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /more pay/i })).toBeVisible();

  await page.getByRole("link", { name: /check my benefits/i }).click();
  await page.getByLabel(/where do you live/i).fill("94110");
  await expect(page.getByText(/looks like you live in california/i)).toBeVisible();
  await page.getByRole("button", { name: /next/i }).click();

  await page.getByRole("radio", { name: /just me/i }).click();
  await page.getByLabel(/how old are you/i).fill("30");
  await page.getByRole("button", { name: "more kids" }).click();
  await page.getByRole("button", { name: /next/i }).click();

  await page.getByLabel(/what do you pay to live/i).fill("1500");
  await page.getByRole("button", { name: /next/i }).click();

  await page.getByLabel(/child care/i).fill("0");
  await page.getByRole("button", { name: /next/i }).click();

  // Regression for the decimal-input bug: typing a "." keystroke-by-keystroke
  // must not get silently swallowed by a parse-then-rerender round trip
  // (e.g. "18." -> Number("18.") = 18 -> rerenders as "18", losing the dot
  // the user is about to follow with "50"). Type it one character at a time
  // so each keystroke goes through the real onChange handler, then confirm
  // the decimal survived before clearing the field and typing the value the
  // rest of this test actually submits.
  const payInput = page.getByLabel(/what do you make now/i);
  await payInput.pressSequentially("18.50");
  await expect(payInput).toHaveValue("18.50");

  // Regression for the second-dot bug: a stray extra "." must be rejected
  // outright (the field keeps its current value), not accepted into the
  // text while it quietly parses to NaN -> null underneath and silently
  // submits "not sure".
  await payInput.pressSequentially(".");
  await expect(payInput).toHaveValue("18.50");

  await payInput.fill("");
  await payInput.fill("12");
  await page.getByRole("button", { name: /see my answer/i }).click();

  await expect(page.getByRole("heading", { name: /watch out/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /chart/i })).toBeVisible();
  await expect(page.getByText(/caseworker/i)).toBeVisible();

  // Plan 4: the chart is labeled as health-adjusted, and the honesty box
  // explains what that means, so the reframing is never silent.
  await expect(page.getByText(/what you keep after health costs/i)).toBeVisible();
  await expect(page.getByText(/losing medicaid often means paying for other coverage/i)).toBeVisible();

  // "Your path off help" section: this mocked curve's danger zone never
  // recovers by the last sampled point ($50k net $31k < the $32k peak at
  // $30k), so the leap is a lower bound (widest zone = axisMax($50k) -
  // zoneStart($30k) = $20,000) and the safe-exit line is the "never found a
  // safe spot" honesty branch, not a concrete wage.
  await expect(page.getByRole("heading", { name: /your path off help/i })).toBeVisible();
  await expect(page.getByText(/raise of at least \$20,000/i)).toBeVisible();

  // Plan 4: the health-cost line names the real cost at the household's
  // nearest sampled point (20000, nearest to currentEarnings=24960).
  await expect(page.getByText(/pay about \$1,200 a year for health coverage/i)).toBeVisible();
});

// This household (single, 1 kid — clicked below via "more kids") resolves to
// fallback archetype "single-1" (see pickArchetypeId in app/src/lib/fallback.ts).
// This small fixture covers that one archetype, shaped like the mock curve
// used elsewhere in this file.
const fallbackPoints = [
  mkPoint(0, 18000), mkPoint(20000, 27000), mkPoint(40000, 31000),
  mkPoint(60000, 23000, 8000), mkPoint(80000, 38000), mkPoint(100000, 48000),
];
const caFallbackFixture = {
  generated: "2026-07-11T00:00:00.000Z",
  year: "2026",
  state: "CA",
  archetypes: { "single-1": { points: fallbackPoints } },
};

async function fillThroughToResult(page: import("@playwright/test").Page) {
  await page.goto("/#/check");
  await page.getByLabel(/where do you live/i).fill("94110");
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByLabel(/how old are you/i).fill("30");
  await page.getByRole("button", { name: "more kids" }).click(); // single, 1 kid -> fallback archetype "single-1"
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByLabel(/what do you pay to live/i).fill("1500");
  await page.getByRole("button", { name: /next/i }).click(); // housing
  await page.getByLabel(/child care/i).fill("0");
  await page.getByRole("button", { name: /next/i }).click(); // childcare (visible because the kid is under 13)
  await page.getByLabel(/what do you make now/i).fill("12");
  await page.getByRole("button", { name: /see my answer/i }).click();
}

test("API failure falls back to a precomputed state curve with a banner and a working retry", async ({ page }) => {
  await page.route("**/api/curve", (route) => route.fulfill({ status: 502, body: "{}" }));
  await page.route("**/data/states/CA.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(caFallbackFixture) }),
  );
  await fillThroughToResult(page);

  await expect(page.getByText(/could not get your exact numbers/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /chart/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
});

test("API failure shows plain-language error with retry when the fallback also fails", async ({ page }) => {
  await page.route("**/api/curve", (route) => route.fulfill({ status: 502, body: "{}" }));
  await page.route("**/data/states/CA.json", (route) => route.fulfill({ status: 404, body: "not found" }));
  await fillThroughToResult(page);

  await expect(page.getByRole("heading", { name: /could not get your answer/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
});
