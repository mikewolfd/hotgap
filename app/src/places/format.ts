// Words and numbers as the journalist surface prints them. Annual dollars,
// exact — this reader checks the table against the file (inventory.md § Pay
// in the person's unit).
import type { ModelRecord } from "@hotgap/core";
import type { Measure } from "./model.js";

export const money = (v: number): string => "$" + v.toLocaleString("en-US");

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

/** "a", "a and b", "a, b and c". */
export const list = (xs: string[]): string =>
  xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];

export const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** A reach.json vintage token ("2024-1yr", "2020-2024-5yr") as words; anything else as-is. */
export function reachWord(s: string): string {
  const m = s.match(/^(\d{4})(?:-(\d{4}))?-(\d)yr$/);
  return m ? `ACS ${m[2] ? `${m[1]}–${m[2]}` : m[1]} ${m[3]}-year PUMS` : s;
}

/** The sweep stamp as a date, for prose; the CSV carries the full ISO string. */
export const dateOf = (generated: string): string => new Date(generated).toISOString().slice(0, 10);

/* N9: the model that produced the numbers, from the file, not the one installed.
   When `version` is null (public API) the line names the endpoint. */
export const modelLine = (model: ModelRecord | null | undefined): string =>
  model?.version ? `policyengine-us ${model.version}`
  : model ? `the PolicyEngine API at ${model.endpoint}`
  : "PolicyEngine (version not recorded)";

/** HTML-escape a data value before it goes into a template string. */
export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
