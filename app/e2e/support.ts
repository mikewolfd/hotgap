// The harness the proofs share (audit D12): where renders land, the console
// listener, the overflow test, the WCAG contrast formula the audit measured
// with, and `check` — a soft assertion that prints what it measured, so a
// proof's log is a list of measurements and a failure names the finding.
// The server is playwright.config.ts's (wrangler, or HOTGAP_BASE_URL); the
// PDF reader is pdf.mjs.
import { expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

/** design/audit/app — the audit's own names, so a render can be read beside its predecessor. */
export const AUDIT_DIR = resolve(import.meta.dirname, "../../design/audit/app");
/** A review's after/ folder, created on first use. */
export function outDir(...rel: string[]): string {
  const dir = resolve(import.meta.dirname, "../..", ...rel);
  mkdirSync(dir, { recursive: true });
  return dir;
}
outDir("design/audit/app");

/** Every console error and page error from here on; a proof expects the list empty at its end. */
export function consoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** No horizontal scroll at this width. */
export const noOverflow = async (page: Page): Promise<void> =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

/* WCAG 2.x relative luminance and contrast, the audit's own method, over the colours the page resolved. */
export const lum = ([r, g, b]: number[]): number => {
  const f = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const contrast = (a: number[], b: number[]): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/** The three channels of a resolved `rgb(…)` / `rgba(…)`. */
export const rgb = (s: string): number[] => (s.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);

/**
 * A measured check: prints ok/FAIL with what was measured, and fails the
 * test softly so every later measurement is still taken and printed — the
 * places proof's own `check`, kept so its 193 lines read as before.
 */
export function check(ok: boolean, what: string, measured?: unknown): void {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${measured !== undefined ? ` — ${typeof measured === "string" ? measured : JSON.stringify(measured)}` : ""}`);
  expect.soft(ok, what).toBe(true);
}

/** Open every disclosure on the page, for a proof that reads what is inside them. */
export const OPEN_ALL = (): void => {
  for (const d of document.querySelectorAll("details")) d.open = true;
};
