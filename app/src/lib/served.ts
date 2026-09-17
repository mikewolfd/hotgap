// EligibilityBoundary (design/inventory.md #23): the served share as "about
// N in 10" — one rule, so the citizen's odds and the journalist's quotable
// phrase cannot disagree about what "about 2 in 10" means. Rounded to the
// nearest tenth; under half a tenth it is "fewer than 1 in 10", at ten it is
// "almost all". Each surface writes its own sentence from the kind and the
// count (app/README.md § Languages). Cross-sectional, never a household's
// own odds: the share of income-eligible households the state served.
export type ServedTenths = { kind: "few" } | { kind: "most" } | { kind: "some"; n: number };

export function servedTenths(share: number): ServedTenths {
  const n = Math.round(share * 10);
  return n <= 0 ? { kind: "few" } : n >= 10 ? { kind: "most" } : { kind: "some", n };
}
