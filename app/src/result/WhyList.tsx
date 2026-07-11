import type { WhyItem } from "../lib/narration.js";
import { t } from "../strings/t.js";

const ICONS: Record<string, string> = {
  food: "🍎", health: "🏥", kids: "👶", housing: "🏠", cash: "💵", tax: "🧾",
};
function iconFor(label: string): string {
  if (label.includes("food") || label.includes("meals")) return ICONS.food;
  if (label.includes("Head Start")) return ICONS.kids;
  if (label.includes("health")) return ICONS.health;
  if (label.includes("child")) return ICONS.kids;
  if (label.includes("housing")) return ICONS.housing;
  if (label.includes("tax")) return ICONS.tax;
  return ICONS.cash;
}

export function WhyList({ items }: { items: WhyItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="why">
      <h2>{t("result.why.title")}</h2>
      <ul className="why-list">
        {items.map((item) => (
          <li key={item.programLabel} className="why-item">
            <span className="why-icon" aria-hidden>{iconFor(item.programLabel)}</span>
            <div>
              {item.lostNear && (
                <p className="why-lost">
                  {t("result.why.lost", { wage: item.lostNear, programs: item.programLabel })}
                </p>
              )}
              <p className="why-value">
                {!item.lostNear && <strong>{item.programLabel}: </strong>}
                {t("result.why.currentValue", { amount: item.currentValue })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
