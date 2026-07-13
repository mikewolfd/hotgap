import type { ReactNode } from "react";

export interface VerdictHeadlineProps {
  /** "danger" colors it clay-red (a cliff is ahead); "good" colors it teal
   *  (earning more keeps helping). */
  tone?: "danger" | "good";
  children: ReactNode;
}

/**
 * The big answer at the top of a result — the one plain fact a reader takes away.
 * Red when there's a benefits cliff ahead, teal when the path is clear. Keep it
 * short and plain (e.g. "Near $14.50 an hour, more pay can mean less money").
 */
export function VerdictHeadline({ tone = "good", children }: VerdictHeadlineProps) {
  return (
    <h1 className={`verdict-headline ${tone === "danger" ? "verdict-danger" : "verdict-good"}`}>
      {children}
    </h1>
  );
}
