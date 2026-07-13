import type { ReactNode } from "react";

export interface DoorProps {
  /** The choice's title (e.g. "Check my own benefits"). */
  title: string;
  /** A sentence describing where this door leads. */
  description: ReactNode;
  /** The call-to-action text (an arrow is added, e.g. "Start"). */
  cta: string;
  /** Show the call-to-action as a plain link (default) or a filled primary button
   *  — use 'button' for the main action on a screen. */
  ctaVariant?: "link" | "button";
  /** Draw the teal border to mark the suggested door. */
  highlighted?: boolean;
  href?: string;
  onClick?: () => void;
}

/**
 * A large tappable card that opens one path through the app (HotGap's landing
 * has two: check your own benefits, or compare places). The whole card is the
 * link; `highlighted` gives it the teal border.
 */
export function Door({ title, description, cta, ctaVariant = "link", highlighted, href, onClick }: DoorProps) {
  const className = `door${highlighted ? " door-check" : ""}`;
  const inner = (
    <>
      <h2>{title}</h2>
      <p className="hint">{description}</p>
      {ctaVariant === "button"
        ? <span className="primary" style={{ display: "inline-block", marginTop: 8 }}>{cta}</span>
        : <span className="door-cta">{cta} →</span>}
    </>
  );
  if (href) {
    return <a className={className} href={href} onClick={onClick}>{inner}</a>;
  }
  return <button type="button" className={className} onClick={onClick}>{inner}</button>;
}
