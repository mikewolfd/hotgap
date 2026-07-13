import type { ReactNode } from "react";
export interface BannerProps {
  /** "warn" is the red alert used when the live numbers can't be reached. */
  tone?: "warn";
  children: ReactNode;
}
/** A full-width status banner for a problem affecting the whole screen — e.g.
 *  "We couldn't reach the live numbers." For an inline aside use Callout. */
export function Banner({ tone = "warn", children }: BannerProps) {
  return <div className={`fallback-banner fallback-${tone}`} role="status">{children}</div>;
}
