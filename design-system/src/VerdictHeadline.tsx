import type { ReactNode } from "react";

export interface VerdictHeadlineProps {
  /** "danger" colors it clay-red (a cliff is ahead); "good" colors it teal
   *  (earning more keeps helping). */
  tone?: "danger" | "good";
  children: ReactNode;
}

/**
 * The big answer at the top of a result — the one line a reader leaves with.
 * Red when there's a benefits cliff ahead, teal when the path is clear. Keep it
 * short and plain ("Watch out near $14.50 an hour").
 */
export function VerdictHeadline({ tone = "good", children }: VerdictHeadlineProps) {
  return (
    <h1 className={`verdict-headline ${tone === "danger" ? "verdict-danger" : "verdict-good"}`}>
      {children}
    </h1>
  );
}
