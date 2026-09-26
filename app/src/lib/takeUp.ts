// Which take-up switches mean something for a household. The WIC switch is
// on by default for everyone (core flags.ts), but WIC serves pregnant and
// postpartum women, infants, and children up to their fifth birthday; the
// model has no pregnancy answer, so a household with no child under five has
// no WIC to get, and listing it — "food help for moms and babies" for a
// single adult — reads as a bug (marketing review M5). Children's ages are
// known, so the rule is exact for everything the form asks.
import type { HouseholdAnswers, ProgramId } from "@hotgap/core";

/** WIC's child limit: a child is eligible until this birthday. */
export const WIC_CHILD_AGE_LIMIT = 5;

/** Whether WIC could apply to this household at all: a child under five. */
export const wicCouldApply = (a: Pick<HouseholdAnswers, "childAges">): boolean =>
  a.childAges.some((age) => age < WIC_CHILD_AGE_LIMIT);

/** Whether a take-up line should name this program for this household (only WIC is ruled out by the household's shape). */
export const takeUpApplies = (a: Pick<HouseholdAnswers, "childAges">, id: ProgramId): boolean =>
  id !== "wic" || wicCouldApply(a);
