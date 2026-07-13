import type { ReactNode } from "react";
export interface CardProps {
  /** Optional bold title shown at the top of the card. */
  title?: string;
  /** Optional muted subtitle under the title. */
  subtitle?: string;
  children?: ReactNode;
}
/**
 * A plain surface — the cream-on-white card HotGap groups related content in
 * (a result panel, a picker, a section). Rounded, hairline-bordered, using the
 * --card / --line / --radius tokens. Compose anything inside it.
 */
export function Card({ title, subtitle, children }: CardProps) {
  return (
    <section className="card">
      {title && <p className="card-title">{title}</p>}
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {children}
    </section>
  );
}
