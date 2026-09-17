// The one-time bridge from the four copy modules to app/src/i18n/en.json
// (app/README.md § Languages, step 2 of the migration): every module's
// `copy` nest walked and written as ICU MessageFormat, mechanically —
//
//   - a leaf keeps its text; a {slot} is already an ICU argument, and the
//     only characters ICU reads differently (an apostrophe before a brace,
//     a literal brace) are quoted;
//   - a variant object keyed by CLDR plural categories with an `other`
//     (`{one, other}`, `{none, one, other}`) becomes one ICU plural on the
//     count the branches name (`n`, `count`, `deferred`; `n` when none),
//     `none` as the exact match `=0`, so the locale's own rule chooses the
//     branch and the code hands over the count;
//   - any other object stays a nest, its key path the message id;
//
// plus `shared`: the program names lib/programs.ts held and the words
// lib/format.ts composed in English (the pay unit, an ordinal's suffix, a
// count in words, a reach vintage, the model line, a chart tick).
//
//   npx vite-node scripts/build-locale-en.mjs      # writes app/src/i18n/en.json (vite-node, because lib/copy.ts loads its files through import.meta.glob)
//
// Variant objects with compound keys (places' `oneOne`…`otherOther`: two
// counts) and hand-picked count words (the citizen's `one/two/three/many`)
// are not mechanical; they are converted by hand in the same step and
// named in its commit. Once en.json is the source the modules are views
// into it and this script has nothing to read: it is deleted with them.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const mod = async (rel) => (await import(pathToFileURL(new URL(rel, root).pathname).href)).copy;

const PLURAL = new Set(["zero", "one", "two", "few", "many", "other", "none"]);
const COUNTS = ["n", "count", "deferred"];

/** ICU-quote what a leaf must not mean: an apostrophe before a brace or another apostrophe, a brace that is not a {slot}. */
const quote = (s) => s
  .replace(/'(?=[{}'])/g, "''")
  .replace(/\{(?![A-Za-z]+\})/g, "'{'")
  .replace(/(?<!\{[A-Za-z]+)\}/g, (m, i, str) => (/\{[A-Za-z]+$/.test(str.slice(0, i)) ? m : "'}'"));

/** Inside a plural branch `#` is the count; a literal one is quoted. */
const branch = (s) => quote(s).replace(/#/g, "'#'");

function convert(v) {
  if (typeof v === "string") return quote(v);
  if (Array.isArray(v)) return v.map(convert);
  if (typeof v !== "object" || v === null) throw new Error(`not a message: ${JSON.stringify(v)}`);
  const keys = Object.keys(v);
  const plural = keys.every((k) => PLURAL.has(k) && typeof v[k] === "string") && "other" in v;
  if (plural) {
    const selector = COUNTS.find((c) => new RegExp(`\\{${c}\\}`).test(v.other)) ?? "n";
    const branches = keys.map((k) => `${k === "none" ? "=0" : k} {${branch(v[k])}}`).join(" ");
    return `{${selector}, plural, ${branches}}`;
  }
  return Object.fromEntries(keys.map((k) => [k, convert(v[k])]));
}

const shared = {
  program: {
    snap: "SNAP", medicaid: "Medicaid", chip: "CHIP", eitc: "Earned Income Tax Credit (EITC)", ctc: "Child Tax Credit", aca: "Premium tax credit",
    tanf: "TANF cash assistance", housing: "Housing voucher", wic: "WIC", ssi: "SSI", headstart: "Head Start", schoolmeals: "School meals",
    childcare: "CCDF child care subsidy", liheap: "LIHEAP energy assistance",
  },
  /* A pay figure in the person's unit, as the unit is said (design/inventory.md M5). */
  pay: { hour: "{figure} an hour", week: "{figure} a week", month: "{figure} a month", year: "{figure} a year" },
  /* An ordinal, "40th": the suffix by the locale's ordinal category. */
  ordinal: "{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}",
  /* A count in words, to ninety-nine: the ones, the tens, and how a compound is joined ("fifty-one"); an exact form wins over the join. */
  numbers: {
    ones: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"],
    tens: ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"],
    compound: "{tens}-{ones}",
    exact: {},
  },
  /* A reach.json vintage token as words: "ACS 2024 1-year PUMS", "ACS 2020–2024 5-year PUMS". */
  reachVintage: { one: "ACS {year} {n}-year PUMS", range: "ACS {from}–{to} {n}-year PUMS" },
  /* The model that produced the numbers (places N9). */
  model: { versioned: "policyengine-us {version}", endpoint: "the PolicyEngine API at {endpoint}", unrecorded: "PolicyEngine (version not recorded)" },
  /* A chart tick in thousands: "$40k". */
  tickThousands: "{amount}k",
  /* The language switch. */
  language: { label: "Language" },
};

const out = {
  _: { language: "en", status: "source", note: "The English every other locale is a translation of; app/src/lib/copy.ts says the shape and app/README.md § Languages the rules." },
  editor: convert(await mod("app/src/editor/copy.ts")),
  citizen: convert(await mod("app/src/citizen/copy.ts")),
  caseworker: convert(await mod("app/src/caseworker/copy.ts")),
  places: convert(await mod("app/src/places/copy.ts")),
  shared,   // written as ICU already
};
const path = new URL("app/src/i18n/en.json", root).pathname;
writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
const count = (o) => (typeof o === "string" ? 1 : Object.values(o).reduce((n, v) => n + count(v), 0));
console.log(`${path}: ${count(out) - count(out._)} messages`);
