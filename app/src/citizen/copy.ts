// Every string the citizen result shows: `citizen.*` in src/i18n/<locale>.json
// (the shape and the reader are lib/copy.ts — this surface's catalog was
// their model), in the citizen register (short words, one thought a line).
// t() fills a message and throws on a missing key, an unknown param or an
// argument left over, as the archive's t.ts did (design/PORT-FROM-ARCHIVE-
// 2026-09-16.md M1), so a sentence can never reach the page half-filled.
// The readability gate (scripts/readability.mjs) grades this namespace in
// en.json: nothing a person reads is composed anywhere else. Program names
// an office uses appear only after the plain phrase (design/inventory.md
// M3); those names are `shared.program.*` (lib/programs.ts) and are not gated.
//
// The decisions the messages carry, by key:
//   who, whoNoKids, adults.* — the masthead line, on paper only (the
//     ScenarioBar's summary is screen chrome).
//   verdict.* — M2: one sentence per curve shape (design/inventory.md § Verdict
//     catalog). {pay}, {wage}, {exit}, {leap} and {top} are in the person's own
//     unit (M5); {kept} and {drop} are yearly money. verdict.waits is the
//     deferred cliff at or above the person's pay (design/REVIEW-citizen B1; the
//     catalog needs this clause, TODO(system) 16): the money is already in the figures; this says when it lands.
//   noncash.* — help inside "money you keep" that never reaches the household as cash (S6).
//   boundary.* — EligibilityBoundary (#23): three facts and an invitation, never
//     a drop. {pay} is in the person's own unit; {min}, {max}, {amount} are yearly
//     money. The invitation is its own sentence so the page can keep it off paper
//     (liheap review S2). Where the state pays its heating help as a tax credit
//     HotGap already counts (Michigan), there is nothing to apply for and nothing
//     to turn on: boundary.credit says it is in the line (review B1).
//   source.* — SourceNote (#17) with its archetype state (M4).
//   steps.* — StepList (#6), under the one convention: a program ends at the
//     first pay at which it is gone. Above current pay the tense is "would".
//   assumed.* — "What we assumed about you" (S6): the household the curve was
//     run for. assumed.kids is a plural with exact matches (=1 =2 =3) for the
//     count words the review chose.
//   incomplete.* — IncompleteMarker (#16) in the citizen register: one caution,
//     from coverage[state].unmodeled[], only when it could move this household.
//   program.* — M3: the plain phrase for each program (design/inventory.md § Program phrases).
import { bind, catalog, fill, parts, type Part } from "../lib/copy.js";

export { fill, parts, type Part };

export const copy = catalog.citizen;

/** The string at a dotted key ("steps.ends"), filled. */
export const t = bind(copy);
