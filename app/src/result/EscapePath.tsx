import type { EscapeNarration } from "../lib/narration.js";
import { t } from "../strings/t.js";

// Guards on its own narration (belt-and-suspenders alongside the caller's
// visibility check in ResultPage, which reads the raw EscapeAnalysis fields
// that narrateEscape doesn't carry through, like benefitsEndEarnings) so this
// component never renders an empty shell with just a heading.
export function EscapePath({ narration }: { narration: EscapeNarration }) {
  const { safeLine, leapLine, thresholds } = narration;
  if (!safeLine && !leapLine && thresholds.length === 0) return null;
  return (
    <section className="escape-path">
      <h2>{t("escape.title")}</h2>
      {safeLine && <p className="escape-safe">{safeLine}</p>}
      {leapLine && <p className="escape-leap">{leapLine}</p>}
      {thresholds.length > 0 && (
        <>
          <p className="escape-ends-title">{t("escape.endsTitle")}</p>
          <ul className="escape-ends-list">
            {thresholds.map((th) => (
              <li key={th.label} className="escape-ends-item">
                {t("escape.ends", { label: th.label, wage: th.wage })}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
