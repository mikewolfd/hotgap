import type { CurvePoint } from "@hotgap/shared";

// Mirrors the pipeline's archetype ids (single|married)-(0|1|2|3): the personal
// door's fallback picks the state-file archetype closest to the real
// household by married status and kid count, clamping kid count to the
// largest archetype the pipeline ever built (3+ kids -> the 3-kid curve).
export function pickArchetypeId(married: boolean, kidCount: number): string {
  return `${married ? "married" : "single"}-${Math.min(kidCount, 3)}`;
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
