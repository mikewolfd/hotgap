import { test, expect } from "@playwright/test";

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
const mkPoint = (earnings: number, netIncome: number, medicaid = 0) => ({
  earnings, netIncome, programs: { ...PROGRAMS, medicaid },
});
// A 6-point curve with a $8k cliff at $30k where medicaid disappears.
const curve = {
  year: "2026",
  currentEarnings: 24960, // $12/hr × 40h
  points: [
    mkPoint(0, 20000, 8000), mkPoint(10000, 26000, 8000), mkPoint(20000, 30000, 8000),
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
  await payInput.fill("");
  await payInput.fill("12");
  await page.getByRole("button", { name: /see my answer/i }).click();

  await expect(page.getByRole("heading", { name: /watch out/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /chart/i })).toBeVisible();
  await expect(page.getByText(/caseworker/i)).toBeVisible();
});

test("places door shows honest stub", async ({ page }) => {
  await page.goto("/#/places");
  await expect(page.getByRole("heading", { name: /compare places/i })).toBeVisible();
  await expect(page.getByText(/not ready yet/i)).toBeVisible();
});

test("API failure shows plain-language error with retry", async ({ page }) => {
  await page.route("**/api/curve", (route) => route.fulfill({ status: 502, body: "{}" }));
  await page.goto("/#/check");
  await page.getByLabel(/where do you live/i).fill("94110");
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /next/i }).click(); // family defaults
  await page.getByRole("button", { name: /next/i }).click(); // housing "not sure"
  await page.getByLabel(/what do you make now/i).fill("12");
  await page.getByRole("button", { name: /see my answer/i }).click();
  await expect(page.getByRole("heading", { name: /could not get your answer/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
});
