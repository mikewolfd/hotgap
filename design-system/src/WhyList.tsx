export interface WhyItem {
  /** A short emoji icon (e.g. "🍎", "🏠"). */
  icon: string;
  /** What is lost — shown bold and red. */
  lost: string;
  /** Optional muted line for what it's worth now. */
  value?: string;
}

export interface WhyListProps {
  items: WhyItem[];
}

/**
 * The "why does this happen?" list on a result — one card per kind of help that
 * ends, each with an icon, the loss in bold red, and an optional value line.
 */
export function WhyList({ items }: WhyListProps) {
  return (
    <ul className="why-list">
      {items.map((it, i) => (
        <li key={i} className="why-item">
          <span className="why-icon" aria-hidden>{it.icon}</span>
          <div>
            <p className="why-lost">{it.lost}</p>
            {it.value && <p className="why-value">{it.value}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
