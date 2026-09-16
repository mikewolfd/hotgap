// The site's /api/evaluate contract, shared by the Worker that serves it
// (worker/) and the pages that call it (app/). The request is whatever
// validateAnswers accepts (a `zip` allowed); a 200 is a HouseholdEvaluation;
// anything else is an ApiErrorBody.

export type ApiErrorCode =
  /** 400: not a household. `detail` is validateAnswers' reason, or "invalid JSON". */
  | "bad_input"
  /** 404 / 405 */
  | "not_found"
  | "method_not_allowed"
  /** 413 */
  | "payload_too_large"
  /** 429, with Retry-After: this client has evaluated too often this minute. */
  | "rate_limited"
  /** 503, with Retry-After: the Worker is already running as many live evaluations as it will. */
  | "busy"
  /** 504 / 502: PolicyEngine failed AND no archetype curve could stand in. `detail` is core's message. */
  | "upstream_timeout"
  | "upstream_error"
  /** 500 */
  | "internal";

export interface ApiErrorBody {
  error: ApiErrorCode;
  detail?: string;
}
