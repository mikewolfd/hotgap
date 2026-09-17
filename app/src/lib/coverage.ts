// IncompleteMarker (design/inventory.md #16): the one rule for when a
// state's `coverage[state].unmodeled[]` entry could move a household's
// figures, shared by the three surfaces (audit D7 — the citizen page once
// tested age < 6 where the others read core's CHILDCARE_MAX_AGE). A gap
// every state shares (`scope: "all"`, and LIHEAP by name on a file written
// before scope was recorded) cannot make one state's figures a floor beside
// another's and never bites; the child-care entry bites only a household
// with a child of care age that pays for care; a state premium program
// bites every household. The count of states this marks is rendered from
// the file, never typed.
import { CHILDCARE_MAX_AGE, type HouseholdAnswers, type StateCoverage, type UnmodeledProgram } from "@hotgap/core";
import { catalog, coreText } from "./copy.js";

/** What the rule needs of a household: its children's ages, and whether it has a care bill at all. */
export interface CareHousehold { childAges: number[]; paysForCare: boolean }

/** A live household pays for care when it said so; the swept archetype's reading is the journalist page's (places/model.ts paysForCare). */
export const careHousehold = (a: HouseholdAnswers): CareHousehold => ({ childAges: a.childAges, paysForCare: (a.monthlyChildcare ?? 0) > 0 });

/** The child-care gap, by its code; by its English name on a file written before codes were recorded. */
const isChildcare = (u: UnmodeledProgram): boolean => u.message?.code === "coverage.unmodeled.childcare" || (!u.message && /child.?care/i.test(u.program));

export const bites = (u: UnmodeledProgram, h: CareHousehold): boolean =>
  u.scope !== "all" && u.program !== "LIHEAP" &&
  (!isChildcare(u) || (h.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && h.paysForCare));

/** The entry's program name in the active language: core's own name for the child-care gap, a state program's proper name as core sent it. */
export const unmodeledName = (u: UnmodeledProgram): string => (isChildcare(u) && u.message ? catalog.core.program.childcareCcdf : u.program);
/** The entry's note in the active language, the English as the fallback. */
export const unmodeledNote = (u: UnmodeledProgram): string => coreText(u.message, u.note);

/** The entries that mark this household's figures incomplete in this state. O(entries). */
export const incompleteFor = (cov: StateCoverage | undefined, h: CareHousehold): UnmodeledProgram[] =>
  (cov?.unmodeled ?? []).filter((u) => bites(u, h));
