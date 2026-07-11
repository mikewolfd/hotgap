import type { CurveResponse, HouseholdAnswers } from "@hotgap/shared";

export type CurveResult =
  | { ok: true; data: CurveResponse }
  | { ok: false; kind: "timeout" | "server" | "network" };

export async function fetchCurve(
  answers: HouseholdAnswers,
  fetchImpl: typeof fetch = fetch,
): Promise<CurveResult> {
  let res: Response;
  try {
    res = await fetchImpl("/api/curve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    return { ok: false, kind: (e as Error).name === "TimeoutError" ? "timeout" : "network" };
  }
  if (res.status === 200) return { ok: true, data: (await res.json()) as CurveResponse };
  return { ok: false, kind: res.status === 504 ? "timeout" : "server" };
}
