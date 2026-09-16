// The page's side of POST /api/evaluate (worker/src/index.ts serves it; the
// shapes are core/src/api.ts). Flags in, a HouseholdEvaluation or a named
// failure out; the page never sees a thrown error.
import { rawAnswersFromFlags, type ApiErrorBody, type ApiErrorCode, type HouseholdEvaluation, type HouseholdFlags } from "@hotgap/core";

export type EvaluateResult =
  | { ok: true; evaluation: HouseholdEvaluation }
  | { ok: false; error: ApiErrorCode | "network" | "timeout"; detail?: string };

// A Massachusetts household re-asks PolicyEngine point by point; the Worker
// bounds each upstream request at 60 s, so the whole call needs longer.
const TIMEOUT_MS = 180_000;

export async function evaluate(flags: HouseholdFlags, fetchImpl: typeof fetch = fetch): Promise<EvaluateResult> {
  let res: Response;
  try {
    res = await fetchImpl("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rawAnswersFromFlags(flags)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, error: (e as Error).name === "TimeoutError" ? "timeout" : "network" };
  }
  if (res.ok) return { ok: true, evaluation: (await res.json()) as HouseholdEvaluation };
  const body: ApiErrorBody = await res.json().then((b) => b as ApiErrorBody, () => ({ error: "internal" }));
  return { ok: false, error: body.error, detail: body.detail };
}
