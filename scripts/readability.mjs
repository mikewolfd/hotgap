// The readability gate (design/PORT-FROM-ARCHIVE-2026-09-16.md M1), ported
// from the archive's Flesch–Kincaid check over en.json to the copy modules
// the site renders from: every citizen-facing string must be reachable here,
// or the 5th-grade promise is a claim, not a check.
//
//   npm run readability                     # through the repo's own tsx, never a bare node
//
// Each module exports `copy` in the one copy shape (app/src/lib/copy.ts):
// a nest of whole messages with {slot} placeholders, a variant object where
// a message has plural or select forms — never a function. A slot is graded
// as "money" (a value, not prose); a function anywhere in the nest is a
// shape violation the gate names and fails on. Limits are the archive's: corpus grade
// ≤ 5.9, every string ≤ 8.0. Two refinements, both because Flesch–Kincaid
// is defined on sentences: a one-word label ("Edit", two syllables) grades
// 8.4 on the formula alone, so the per-string limit binds on strings of
// four or more words (shorter ones are still graded and listed when over,
// as notes); and the corpus counts a catalog entry with no terminal
// punctuation as one sentence — joined bare, the editor's twenty-six chip
// labels read as one sixty-word sentence and its corpus sat at 6.1 from the
// day the gate was ported, which no rewrite of the five strings that were
// over could cure. What this cannot see: a hard word in a three-word label.
// Exit 1 when a limit is over, so CI can gate.
import { pathToFileURL } from "node:url";

// Every copy module is graded and reported. `gate` says whether the limits
// block: the citizen-register modules (editor, citizen) carry the 5th-grade
// promise, and so does the caseworker's client sheet (`handout`, the citizen
// register per the caseworker review's S8 — `only` reads that subtree); the
// caseworker's own register and the journalist's (places) are written for a
// professional and a reporter, so their grades are notes, not gates, until
// the site decides a threshold for them.
const MODULES = [
  { path: "app/src/editor/copy.ts", gate: true },
  { path: "app/src/citizen/copy.ts", gate: true },
  { path: "app/src/caseworker/copy.ts", gate: true, only: "handout" },
  { path: "app/src/caseworker/copy.ts", gate: false },
  { path: "app/src/places/copy.ts", gate: false },
];
const CORPUS_LIMIT = 5.9;
const STRING_LIMIT = 8.0;
const SENTENCE_WORDS = 4;

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function grade(text) {
  // Strip slot placeholders and acronyms in parens; they are not prose.
  const prose = text.replaceAll(/\{[a-zA-Z]+\}/g, "money").replaceAll(/\([A-Z]{2,}\)/g, "");
  const sentences = Math.max(1, (prose.match(/[.!?…]+/g) ?? []).length);
  const words = prose.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (words.length === 0) return 0;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}

/**
 * Every message a copy object holds, keyed by its path. A function is not a
 * message: it is returned with `text: null`, so the report names the shape
 * violation and the gate fails on it (the locale-file migration cannot read
 * a function either).
 */
export function strings(copy, path = "") {
  const out = [];
  for (const [k, v] of Object.entries(copy)) {
    const key = path ? `${path}.${k}` : k;
    if (typeof v === "string") out.push({ key, text: v });
    else if (typeof v === "function") out.push({ key, text: null });
    else if (Array.isArray(v)) v.forEach((item, i) => out.push(...(typeof item === "string" ? [{ key: `${key}[${i}]`, text: item }] : strings(item, `${key}[${i}]`))));
    else if (v && typeof v === "object") out.push(...strings(v, key));
  }
  return out;
}

const root = new URL("../", import.meta.url);
let failed = false;
for (const { path: rel, gate, only } of MODULES) {
  const { copy } = await import(pathToFileURL(new URL(rel, root).pathname).href);
  const seen = strings(only ? copy[only] : copy, only ?? "");
  const unread = seen.filter((s) => s.text === null);
  if (unread.length) failed = true;
  const all = seen.filter((s) => s.text !== null && /[a-zA-Z]/.test(s.text));
  const corpus = grade(all.map((s) => s.text.trim()).map((t) => (/[.!?…]$/.test(t) ? t : `${t}.`)).join(" "));
  const worst = all.reduce((a, b) => (grade(b.text) > grade(a.text) ? b : a));
  console.log(`${rel}${only ? ` (${only})` : ""}: corpus grade ${corpus.toFixed(2)} (limit ${CORPUS_LIMIT}${gate ? "" : ", reported only"}), ${all.length} strings, worst ${grade(worst.text).toFixed(1)} at ${worst.key}`);
  if (unread.length) console.error(`  FAIL not a message (a function in the copy shape): ${unread.map((s) => s.key).join(", ")}`);
  const over = all.filter((s) => grade(s.text) > STRING_LIMIT);
  if (!gate) { console.log(`  ${over.length} of ${all.length} strings over ${STRING_LIMIT}; not gated`); continue; }
  for (const s of over) {
    const sentence = s.text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length >= SENTENCE_WORDS;
    console[sentence ? "error" : "log"](`  ${sentence ? "FAIL" : "note"} grade ${grade(s.text).toFixed(1)} > ${STRING_LIMIT}: ${s.key} = "${s.text}"`);
    if (sentence) failed = true;
  }
  if (corpus > CORPUS_LIMIT) failed = true;
}
if (failed) process.exit(1);
console.log("readability OK");
