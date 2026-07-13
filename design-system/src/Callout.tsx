import { useId, type ReactNode } from "react";

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
  const titleId = useId();
  const cls = tone === "warn" ? "callout callout-warn" : tone === "plain" ? "callout callout-plain" : "callout";
  return (
    // When titled, the section is a named landmark (screen-reader region nav).
    <section className={cls} aria-labelledby={title ? titleId : undefined}>
      {title && <h2 id={titleId}>{title}</h2>}
      {children}
    </section>
  );
}
