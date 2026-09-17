// Words and numbers as the journalist surface prints them. Annual dollars,
// exact — this reader checks the table against the file (inventory.md § Pay
// in the person's unit). Everything a second surface wanted is in
// lib/format.ts (audit D1); these two are the journalist page's own.
import { money } from "../lib/format.js";
import type { Measure } from "./model.js";

/** A measure's value as the map, the ranking and the caption print it; null is "past the axis". */
export const fmt = (v: number | null, m: Measure): string =>
  v === null ? "past the axis" : m.unit === "$" ? money(v) : String(v);

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** A count in words, up to ninety-nine ("eleven", "fifty-one"); larger as digits. */
export function word(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
}
