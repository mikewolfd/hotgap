// Every string the caseworker surface shows: `caseworker.*` in
// src/i18n/<locale>.json (the shape and the reader are lib/copy.ts), in the
// caseworker register — every figure arrives formatted by lib/format.ts
// (money, a list, a date, a pay figure in the unit), program names from
// lib/programs.ts (M3) and state names from the catalog. `editor` is the
// register laid over the citizen editor's words (mountEditor's `copy`).
// `handout` is the client sheet, in the citizen register (review S8), and
// reads the citizen's phrases; the readability gate grades it.
//
// The decisions the messages carry, by key:
//   editor.* — the editor in the caseworker register: the household is the
//     client's, named in the third person.
//   whatIf.notInSweep — B1: the fallback's curve is the base's own, so the
//     column has no figure. whatIf.married … whatIf.names.* — a what-if's name
//     from what it changes (scenarios.ts).
//   ledger.ifYouApply, ledger.liheapBoundary, ledger.liheapWorthServed.* —
//     EligibilityBoundary (#23): the row at the limit, tagged, with the three
//     facts and their vintage — the tag says "if you apply" once, so the cite
//     leads with the basis rather than saying it again (liheap review S3).
//   ledger.liheapCredit, ledger.liheapPaidAs.*, ledger.liheapHeat.* — where the
//     state pays its heating help as a refundable credit PolicyEngine models
//     and HotGap already counts (Michigan): the row is where it tapers out, not
//     a boundary and not a cliff, and the cite says what the model assumed
//     about heat in the rent (liheap review B1).
//   chart.label.* — the wrapper's aria-label: the shape in words, one sentence
//     per fact, joined by the model. chart.axis.* — S5: the "not $0" clause
//     only when the floor is above zero.
//   source.* — the SourceNote (#17): one sentence per fact, joined by the model
//     in this order.
//   handout.* — the client sheet, in the citizen register — the second person
//     the sheet is handed to (review S8).
import { LIHEAP_VINTAGE } from "@hotgap/core";
import { bind, catalog } from "../lib/copy.js";

export const copy = catalog.caseworker;

/* The chips a counselor what-ifs first: the six facts, then the take-up toggles, then the rest in the citizen order. */
export const CHIP_ORDER = ["where", "household", "pay", "rent", "childcare", "childcare-subsidy", "head-start", "housing", "energy-assistance", "heat-in-rent", "employer-coverage", "no-snap", "no-tanf", "no-medicaid", "no-wic", "self-employed", "disabled", "spouse-disabled"];

/** The vintage words the LIHEAP rows name: the served share's year, from core. */
export const SERVED_VINTAGE = LIHEAP_VINTAGE.served;

export const t = bind(copy);
