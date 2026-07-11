import type { HouseholdAnswers } from "@hotgap/shared";
import { t } from "../strings/t.js";

type Key = "getsHeadStart" | "getsHousing" | "hasEmployerCoverage";

export function Toggles({ answers, onChange }: { answers: HouseholdAnswers; onChange: (next: HouseholdAnswers) => void }) {
  const rows: { key: Key; label: string; show: boolean }[] = [
    { key: "getsHeadStart", label: t("toggles.headstart"), show: answers.childAges.some((a) => a < 6) },
    { key: "getsHousing", label: t("toggles.housing"), show: true },
    { key: "hasEmployerCoverage", label: t("toggles.esi"), show: true },
  ];
  const visible = rows.filter((r) => r.show);
  if (visible.length === 0) return null;
  return (
    <section className="toggles">
      <h2>{t("toggles.title")}</h2>
      <p className="hint">{t("toggles.hint")}</p>
      {visible.map((r) => (
        <button
          key={r.key}
          type="button"
          role="switch"
          aria-checked={answers[r.key]}
          aria-label={r.label}
          className={answers[r.key] ? "toggle on" : "toggle"}
          onClick={() => onChange({ ...answers, [r.key]: !answers[r.key] })}
        >
          <span className="toggle-label">{r.label}</span>
          <span className="toggle-state">{answers[r.key] ? t("common.yes") : t("common.no")}</span>
        </button>
      ))}
    </section>
  );
}
