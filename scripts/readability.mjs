// The readability gate (design/PORT-FROM-ARCHIVE-2026-09-16.md M1), ported
// from the archive's Flesch–Kincaid check over en.json to the copy modules
// the site renders from: every citizen-facing string must be reachable here,
// or the 5th-grade promise is a claim, not a check.
//
//   npm run readability                     # through the repo's own tsx, never a bare node
//
// Each module exports `copy`, a nest of strings (with {slot} templates, as
// app/src/citizen/copy.ts) or of arrow functions that interpolate their
// arguments (as app/src/editor/copy.ts); a function is graded on what it
// returns for placeholder arguments. Limits are the archive's: corpus grade
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
// promise; the journalist register (places) is written for a reporter, so its
// grade is a note, not a gate, until the site decides a threshold for it.
const MODULES = [
  { path: "app/src/editor/copy.ts", gate: true },
  { path: "app/src/citizen/copy.ts", gate: true },
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
 * Every string a copy object can produce, keyed by its path; a function is
 * called with "money" for each argument. A function that takes a shape a
 * string cannot stand in for (a list, a record) is returned with `text:
 * null`, so the report names what the gate could not read rather than
 * grading a sentence it never saw.
 */
export function strings(copy, path = "") {
  const out = [];
  for (const [k, v] of Object.entries(copy)) {
    const key = path ? `${path}.${k}` : k;
    if (typeof v === "string") out.push({ key, text: v });
    else if (typeof v === "function") {
      try {
        const r = v(...Array.from({ length: v.length }, () => "money"));
        if (Array.isArray(r)) r.forEach((t, i) => out.push({ key: `${key}[${i}]`, text: String(t) }));
        else out.push({ key, text: String(r) });
      } catch { out.push({ key, text: null }); }
    }
    else if (v && typeof v === "object") out.push(...strings(v, key));
  }
  return out;
}

const root = new URL("../", import.meta.url);
let failed = false;
for (const { path: rel, gate } of MODULES) {
  const { copy } = await import(pathToFileURL(new URL(rel, root).pathname).href);
  const seen = strings(copy);
  const unread = seen.filter((s) => s.text === null);
  const all = seen.filter((s) => s.text !== null && /[a-zA-Z]/.test(s.text));
  const corpus = grade(all.map((s) => s.text.trim()).map((t) => (/[.!?…]$/.test(t) ? t : `${t}.`)).join(" "));
  const worst = all.reduce((a, b) => (grade(b.text) > grade(a.text) ? b : a));
  console.log(`${rel}: corpus grade ${corpus.toFixed(2)} (limit ${CORPUS_LIMIT}${gate ? "" : ", reported only"}), ${all.length} strings, worst ${grade(worst.text).toFixed(1)} at ${worst.key}`);
  if (unread.length) console.log(`  not graded (a list or record argument, which a placeholder cannot stand in for): ${unread.map((s) => s.key).join(", ")}`);
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
