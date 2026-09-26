import { ARCHETYPES, isNoSubsidyTwin, type Archetype, type CurvePoint } from "@hotgap/core";
import type { ResultsByStateArchetype } from "./build.js";

// THE NO-SUBSIDY TWIN, DERIVED (policy-data review R2/R16, 2026-09-26).
//
// core defines `single-2-nosub` — the default household, same children and
// same care bill, with the child-care subsidy off: the family that pays for
// care and is not served, which is most eligible families. The committed
// sweep predates it, so until a sweep runs it directly a `--from-data`
// rebuild derives it from the stored `single-2` points: at each point, net
// income less the subsidy the point carries, and the subsidy itself zeroed.
//
// The care bill stays charged exactly as it is on the base row (core's
// net-income definition is the same for both), so this is the no-subsidy
// family up to second-order interactions: SNAP's dependent-care deduction and
// the dependent-care credit both read the care the family pays itself, which
// a direct sweep would recompute and this does not. The page says so
// ("derived from the same run; will be swept directly"). Once a sweep carries
// the row, the swept points win and nothing is derived.

/** The id a twin is derived from: its own id without `-nosub`. */
export const twinBase = (a: Pick<Archetype, "id">): string => a.id.replace(/-nosub$/, "");

/** One curve with the child-care subsidy taken out: net income less the subsidy at each point, the subsidy zeroed. Pure. */
export function withoutSubsidy(points: readonly CurvePoint[]): CurvePoint[] {
  return points.map((p) => {
    const subsidy = p.programs.childcare ?? 0;
    return { ...p, netIncome: p.netIncome - subsidy, programs: { ...p.programs, childcare: 0 } };
  });
}

/**
 * The twins to derive, and from what: every `-nosub` row of ARCHETYPES that
 * NO state in `results` carries, whose base row every state does. A twin some
 * states carry is a sweep's own row and is left to the validator; a base row
 * that is missing leaves nothing to derive from.
 */
export function twinsToDerive(states: readonly string[], results: ResultsByStateArchetype): { id: string; from: string }[] {
  return ARCHETYPES.filter(isNoSubsidyTwin)
    .map((a) => ({ id: a.id, from: twinBase(a) }))
    .filter(({ id, from }) => states.every((st) => results[st]?.[id] === undefined && results[st]?.[from] !== undefined));
}

/** `results` with each derivable twin filled in from its base row, and the ids it derived (and from what). Pure: the input is not changed. */
export function deriveTwins(states: readonly string[], results: ResultsByStateArchetype): { results: ResultsByStateArchetype; derived: Record<string, string> } {
  const twins = twinsToDerive(states, results);
  if (!twins.length) return { results, derived: {} };
  const out: ResultsByStateArchetype = {};
  for (const st of Object.keys(results)) {
    out[st] = { ...results[st] };
    for (const { id, from } of twins) if (states.includes(st)) out[st][id] = withoutSubsidy(results[st][from]);
  }
  return { results: out, derived: Object.fromEntries(twins.map(({ id, from }) => [id, from])) };
}
