// Flesch-Kincaid grade gate over app/src/strings/en.json.
// Corpus grade must be <= 5.9; every individual string <= 8.0.
import { readFileSync } from "node:fs";

const strings = JSON.parse(readFileSync(new URL("../app/src/strings/en.json", import.meta.url), "utf8"));

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function grade(text) {
  // Strip param placeholders and acronyms in parens; they aren't prose.
  const prose = text.replaceAll(/\{[a-zA-Z]+\}/g, "money").replaceAll(/\([A-Z]{2,}\)/g, "");
  const sentences = Math.max(1, (prose.match(/[.!?…]+/g) ?? []).length);
  const words = prose.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (words.length === 0) return 0;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}

const perString = Object.entries(strings).map(([key, text]) => ({ key, text, grade: grade(text) }));
const corpus = grade(Object.values(strings).join(" "));

let failed = false;
for (const s of perString.filter((s) => s.grade > 8.0)) {
  console.error(`FAIL grade ${s.grade.toFixed(1)} > 8.0: ${s.key} = "${s.text}"`);
  failed = true;
}
console.log(`corpus grade: ${corpus.toFixed(2)} (limit 5.90)`);
if (corpus > 5.9) failed = true;
if (failed) process.exit(1);
console.log(`readability OK (${perString.length} strings)`);
