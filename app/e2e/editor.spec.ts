// The editor, end to end, through the Worker (app/README.md § Proofs).
// HOTGAP_EXPECT_SOURCE says which curve the server can give: "live" (the
// default — an engine or the public API answers) or "archetype" (run the
// server with a dead HOTGAP_PE_URL; the committed sweep answers instead).
import { expect, test, type Page } from "@playwright/test";

const EXPECT_SOURCE = process.env.HOTGAP_EXPECT_SOURCE ?? "live";

/** A California single parent with a 3- and a 7-year-old at $30,000 a year. */
async function fillFourFacts(page: Page): Promise<void> {
  await page.getByLabel("Your ZIP code").fill("94110");
  await expect(page.locator("#h-zip")).toHaveText("That is in California.");
  await page.getByLabel("Just me").check();
  await page.getByLabel("How many kids live with you?").fill("2");
  await page.getByLabel("How old is kid 1?").fill("3");
  await page.getByLabel("How old is kid 2?").fill("7");
  await page.getByLabel("How old is kid 2?").blur();
  await page.getByLabel("Your pay, before taxes").fill("30000");
  await page.getByLabel("Per").selectOption("year");
  // Rent and child care were prefilled from the state's typical figures.
  await expect(page.getByLabel("Rent or house payment")).not.toHaveValue("");
  await expect(page.getByLabel("Child care")).not.toHaveValue("");
}

const consoleErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
};

test(`the four facts reach a verdict with source ${EXPECT_SOURCE}`, async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/");
  await fillFourFacts(page);
  await page.getByRole("button", { name: "See my answer" }).click();
  await expect(page.locator("#answer")).toContainText("You are paid $30,000 a year.");
  await expect(page.locator("#source")).toHaveAttribute("data-source", EXPECT_SOURCE);
  // The household is in the URL, in the CLI's words.
  const url = new URL(page.url());
  expect(url.searchParams.get("zip")).toBe("94110");
  expect(url.searchParams.get("kids")).toBe("3,7");
  expect(url.searchParams.get("pay")).toBe("30000");
  expect(url.searchParams.get("unit")).toBe("year");
  // The editor closed, the bar summarizes the four facts.
  await expect(page.locator("#editor")).toBeHidden();
  await expect(page.locator(".hg-scenario__summary span")).toContainText("94110 · CA · 1 adult, kids 3 & 7 · $30,000 a year");
  expect(errors).toEqual([]);
});

test("landing on a shared link evaluates at once", async ({ page }) => {
  await page.goto("/?zip=94110&kids=3%2C7&pay=30000&unit=year");
  await expect(page.locator("#answer")).toContainText("You are paid $30,000 a year.");
  await expect(page.locator("#editor")).toBeHidden();
});

test("a bad ZIP shows core's own error text", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your ZIP code").fill("00000");
  await expect(page.locator("#h-zip")).toHaveText("no state for ZIP 00000");
  await expect(page.getByLabel("Your ZIP code")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Your pay, before taxes").fill("30000");
  await page.getByRole("button", { name: "See my answer" }).click();
  await expect(page.getByRole("alert")).toContainText("no state for ZIP 00000");
  await expect(page.getByLabel("Your ZIP code")).toBeFocused();
  await page.getByLabel("Your ZIP code").fill("00901");
  await expect(page.locator("#h-zip")).toHaveText("HotGap does not model US territories yet");
});

for (const width of [390, 1280]) {
  test(`at ${width}px: no console errors, no horizontal scroll, chip → editor → close returns focus`, async ({ page }) => {
    const errors = consoleErrors(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/?zip=94110&kids=3%2C7&pay=30000&unit=year");
    await expect(page.locator("#answer")).toContainText("You are paid");
    const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await noOverflow();
    // Below 720px the chips hide behind the summary's Edit control.
    if (width < 720) {
      const edit = page.getByRole("button", { name: "Edit", exact: true });
      await expect(edit).toHaveAttribute("aria-expanded", "false");
      await edit.click();
      await expect(edit).toHaveAttribute("aria-expanded", "true");
    }
    // A value chip opens its one-value dialog; closing it returns focus to the chip.
    const age = page.locator('[data-chip="age"]');
    await expect(age).toHaveAttribute("aria-haspopup", "dialog");
    await age.click();
    await expect(page.locator("dialog")).toBeVisible();
    await expect(age).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog")).toBeHidden();
    await expect(age).toBeFocused();
    await expect(age).toHaveAttribute("aria-expanded", "false");
    // A fact chip opens the four-facts screen on its field; Close hands focus back.
    const pay = page.locator('[data-chip="pay"]');
    await expect(pay).toHaveAttribute("aria-expanded", "false");
    await pay.click();
    await expect(page.locator("#editor")).toBeVisible();
    await expect(page.getByLabel("Your pay, before taxes")).toBeFocused();
    await expect(pay).toHaveAttribute("aria-expanded", "true");
    await noOverflow();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.locator("#editor")).toBeHidden();
    await expect(pay).toBeFocused();
    await expect(pay).toHaveAttribute("aria-expanded", "false");
    // Saving a value from the dialog re-evaluates and keeps the URL current.
    await age.click();
    await page.locator("dialog").getByLabel("Your age").fill("45");
    const evaluated = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
    await page.locator("dialog").getByRole("button", { name: "Save" }).click();
    await expect(age).toBeFocused();
    await expect(age.locator(".hg-chip__v")).toHaveText("45");
    expect(new URL(page.url()).searchParams.get("age")).toBe("45");
    expect((await evaluated).status()).toBe(200);
    // An Escape after that Save is a cancel, not a second save.
    await age.click();
    await page.locator("dialog").getByLabel("Your age").fill("50");
    await page.keyboard.press("Escape");
    await expect(age.locator(".hg-chip__v")).toHaveText("45");
    expect(new URL(page.url()).searchParams.get("age")).toBe("45");
    // A toggle flips, re-evaluates, and keeps focus.
    const housing = page.locator('[data-chip="housing"]');
    await expect(housing).toHaveAttribute("aria-pressed", "false");
    const evaluatedAgain = page.waitForResponse((r) => r.url().endsWith("/api/evaluate"));
    await housing.click();
    await expect(housing).toHaveAttribute("aria-pressed", "true");
    await expect(housing).toBeFocused();
    expect(new URL(page.url()).searchParams.get("housing")).toBe("1");
    expect((await evaluatedAgain).status()).toBe(200);
    await expect(page.locator("#result [role=status]")).toHaveText("");
    await expect(page.locator("#answer")).toContainText("You are paid");
    expect(errors).toEqual([]);
  });
}
