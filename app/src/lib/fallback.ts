import { ARCHETYPES, DEFAULT_ARCHETYPE, type CurvePoint } from "@hotgap/shared";

// The most kids any pipeline archetype models — households with more kids
// fall back to this archetype's curve as the closest available comparison.
const MAX_ARCHETYPE_KIDS = Math.max(...ARCHETYPES.map((a) => a.childAges.length));

// The personal door's fallback picks the state-file archetype closest to the
// real household by married status and kid count, clamping kid count to the
// largest archetype the pipeline ever built (3+ kids -> the 3-kid curve).
// Resolved against @hotgap/shared's ARCHETYPES (the same list the pipeline
// sweeps) rather than re-deriving the "(single|married)-N" id format here, so
// a rename or reshape of the shared list can never silently desync this
// picker; DEFAULT_ARCHETYPE is the defensive last resort for an unmatched
// combination (unreachable today: both married values × 0..MAX kids exist).
export function pickArchetypeId(married: boolean, kidCount: number): string {
  const kids = Math.min(kidCount, MAX_ARCHETYPE_KIDS);
  const match = ARCHETYPES.find((a) => a.married === married && a.childAges.length === kids);
  return match?.id ?? DEFAULT_ARCHETYPE;
}

interface StateFallbackFile {
  archetypes?: Record<string, { points?: CurvePoint[] }>;
}

// Fetches the precomputed per-state archetype curve used when the live
// PolicyEngine call fails. Returns null on ANY failure — bad HTTP status,
// unparsable JSON, or a missing/malformed archetype entry — so the caller
// always has a single "no fallback available" branch to handle.
export async function fetchFallbackCurve(
  state: string,
  married: boolean,
  kidCount: number,
  fetchImpl: typeof fetch = fetch,
): Promise<CurvePoint[] | null> {
  try {
    const res = await fetchImpl(`/data/states/${state}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as StateFallbackFile;
    const points = data.archetypes?.[pickArchetypeId(married, kidCount)]?.points;
    return points && points.length >= 2 ? points : null;
  } catch {
    return null;
  }
}
