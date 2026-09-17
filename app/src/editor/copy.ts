// Every string the editor shows: `editor.*` in src/i18n/<locale>.json (the
// shape and the reader are lib/copy.ts), written in the citizen register
// (short words, one thought a line). The readability gate
// (scripts/readability.mjs, design/PORT-FROM-ARCHIVE-2026-09-16.md M1)
// grades this namespace in en.json. Program and field names a caseworker
// uses (SNAP, TANF, CCDF, "permanent resident") appear only after the plain
// phrase. A surface lays its own register over any part of it two levels
// deep (mountEditor's `copy`).
//
// The decisions the messages carry, by key:
//   summary.line — the one-line summary of the four facts (design/inventory.md
//     § ScenarioBar); its separators are this line's, not code's (citizen review N12).
//   summary.kids — a plural on the count of ages, the locale's rule choosing.
//   dialog.* — the one-value dialog's title is the chip's name, so its one label
//     carries the unit or the question instead of the name again (citizen review N8).
//   errors.fields.* — keyed by validateAnswers' field name (core/src/validate.ts).
import { bind, catalog } from "../lib/copy.js";

export const copy = catalog.editor;
export const t = bind(copy);
