// @hotgap/core — the whole calculation, from household answers to results.
//
//   validateAnswers(input)            unknown → HouseholdAnswers (or a reason)
//   buildPEPayload(answers)           HouseholdAnswers → PolicyEngine request
//   fetchCurve(answers)               → CurveResponse via the public PolicyEngine API
//   analyzeCurve / escapeAnalysis     cliffs, danger zones, safe exit, the leap
//   reachForHousehold                 where an income falls among real households
//   minWageContext                    hours-a-week-at-minimum-wage framing
//   evaluateHousehold(answers)        all of the above in one call, with an
//                                     offline archetype fallback when the API fails
//
// Committed data (data/): the weekly 51-state × 8-archetype sweep, ACS reach
// ladders, and ZIP → state / county crosswalks. See README.md.
export * from "./types.js";
export * from "./policyYear.js";
export * from "./policyOverrides.js";
export * from "./maTafdc.js";
export * from "./income.js";
export * from "./parse.js";
export * from "./analyze.js";
export * from "./archetypes.js";
export * from "./escape.js";
export * from "./reach.js";
export * from "./states.js";
export * from "./stateDefaults.js";
export * from "./validate.js";
export * from "./translate.js";
export * from "./client.js";
export * from "./data.js";
export * from "./zip.js";
export * from "./county.js";
export * from "./minWage.js";
export * from "./reachLookup.js";
export * from "./fallback.js";
export * from "./evaluate.js";
