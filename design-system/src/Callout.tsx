import type { ReactNode } from "react";

export interface CalloutProps {
  /** "info" is a teal-edged note (e.g. an honesty box); "warn" is a red alert
   *  banner (e.g. "we couldn't reach the live numbers"); "plain" is a neutral,
   *  unaccented aside. */
  tone?: "info" | "warn" | "plain";
  /** Optional bold heading. */
  title?: string;
  children: ReactNode;
}

/**
 * A bordered aside for context the reader should not miss. `info` is the calm
 * teal-edged note HotGap uses for its honesty box; `warn` is the red banner for
 * problems. Keep the copy plain and never advise — state facts.
 */
export function Callout({ tone = "info", title, children }: CalloutProps) {
  return (
    <section className={tone === "warn" ? "callout callout-warn" : tone === "plain" ? "callout callout-plain" : "callout"}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
