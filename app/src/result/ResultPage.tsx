import { useEffect, useState } from "react";
import { analyzeCurve, escapeAnalysis, type CurveAnalysis, type EscapeAnalysis, type HouseholdAnswers } from "@hotgap/shared";
import { CurveChart, Callout, EscapePath, VerdictHeadline, WhyList, Toggle, type CurveChartLabels } from "@hotgap/design-system";
import { fetchCurve } from "../api/client.js";
import { fetchFallbackCurve, clampFallbackEarnings } from "../lib/fallback.js";
import { narrate, narrateEscape, type Narration, type PayContext, type WhyItem } from "../lib/narration.js";
import { reachForHousehold } from "../lib/reachLookup.js";
import { STATE_NAMES } from "../lib/states.js";
import { t, type StringKey } from "../strings/t.js";

// The take-up toggles the result page exposes (Head Start / housing voucher /
// employer coverage). Flipping one edits `current`, which the fetch effect
// depends on, so the curve recomputes live — the same recompute-on-flip
// behavior the old app `Toggles` component drove, now wired to DS `Toggle`s.
type ToggleKey = "getsHeadStart" | "getsHousing" | "hasEmployerCoverage";

// Plain-language chart copy, passed to the DS `CurveChart` via its `labels`
// prop so every user-facing chart string stays in en.json and stays
// gate-checked — the DS component never gets to show its built-in English.
const CHART_LABELS: CurveChartLabels = {
  title: t("result.chart.title"),
  alt: t("result.chart.alt"),
  xLabel: (unit) => t("result.chart.xLabel", { unit }),
  yLabel: t("result.chart.yLabel"),
  youAreHere: t("result.chart.youAreHere"),
  dangerZone: t("result.chart.dangerZone"),
  dropHint: t("chart.drop.hint"),
  close: t("chart.drop.card.close"),
  markerLabel: (pay, amount) => t("chart.drop.marker.label", { pay, amount }),
  cardAmount: (pay, amount) => t("chart.drop.card.amount", { pay, amount }),
  cardLose: t("chart.drop.card.lose"),
  cardNone: t("chart.drop.card.none"),
  programLabel: (id) => t(`program.${id}` as StringKey),
};

// Verdict colouring lives with the DS `VerdictHeadline` now (tone → clay-red /
// teal). A cliff ahead or being in the zone reads danger; always-up or a cliff
// already behind reads good.
function verdictTone(verdict: CurveAnalysis["verdict"]): "danger" | "good" {
  return verdict === "cliff_ahead" || verdict === "in_danger_zone" ? "danger" : "good";
}

// Icon per kind of help, by its plain-language label — moved here from the old
// app `WhyList` so the DS `WhyList` can stay label-agnostic and just take an
// icon per item.
const WHY_ICONS: Record<string, string> = {
  food: "🍎", health: "🏥", kids: "👶", housing: "🏠", cash: "💵", tax: "🧾",
};
function iconFor(label: string): string {
  if (label.includes("food") || label.includes("meals")) return WHY_ICONS.food;
  if (label.includes("Head Start")) return WHY_ICONS.kids;
  if (label.includes("health")) return WHY_ICONS.health;
  if (label.includes("child")) return WHY_ICONS.kids;
  if (label.includes("housing")) return WHY_ICONS.housing;
  if (label.includes("tax")) return WHY_ICONS.tax;
  return WHY_ICONS.cash;
}

// Maps the app's narration `WhyItem` onto the DS `WhyList` item shape. A
// program the next cliff takes away leads with the "you could lose …" line;
// one that's simply worth something now leads with its own name. Either way
// the muted second line names what it's worth today.
function toWhyListItem(item: WhyItem) {
  return {
    icon: iconFor(item.programLabel),
    lost: item.lostNear
      ? t("result.why.lost", { wage: item.lostNear, programs: item.programLabel })
      : item.programLabel,
    value: t("result.why.currentValue", { amount: item.currentValue }),
  };
}

type Status =
  | { phase: "loading" }
  | { phase: "error" }
  // `fallback: true` means these numbers came from a precomputed archetype
  // curve (the live PolicyEngine call failed) rather than the household's
  // own real-time calculation — the page shows a banner and a still-visible
  // "Try again" button in that case (see the render below).
  | { phase: "done"; analysis: CurveAnalysis; narration: Narration; escape: EscapeAnalysis; fallback: boolean };

export function ResultPage(props: {
  answers: HouseholdAnswers;
  ctx: PayContext;
  onStartOver: () => void;
}) {
  const [status, setStatus] = useState<Status>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Toggles (Plan 6 Task 5) let the visitor flip take-up assumptions
  // (Head Start / housing voucher / employer coverage) right on the result
  // page and see the curve recompute live. `current` starts as the answers
  // the flow captured, then diverges as the household edits toggles — every
  // downstream read in this component (the fetch effect, reach lookup,
  // fallback lookup, state name) must use `current`, never `props.answers`,
  // or a flip would silently fail to affect the render.
  const [current, setCurrent] = useState<HouseholdAnswers>(props.answers);

  useEffect(() => {
    let alive = true;
    setStatus({ phase: "loading" });
    fetchCurve(current)
      .then(async (r) => {
        if (!alive) return;
        if (r.ok) {
          const analysis = analyzeCurve(r.data.points, r.data.currentEarnings);
          const escape = escapeAnalysis(r.data.points);
          setStatus({
            phase: "done", analysis, narration: narrate(analysis, props.ctx), escape, fallback: false,
          });
          return;
        }
        // The live API failed. Try a precomputed archetype curve for this
        // household's state/married/kid-count before giving up — the site
        // should never white-screen when it already has close-enough
        // numbers on hand. The fallback curve is evaluated at the user's
        // REAL annualEarnings (not the archetype's 0), so the verdict and
        // chart reflect their actual pay — but archetype curves are only
        // sampled up to a $100k floor, so earnings past the last sampled
        // point are clamped down to it (see clampFallbackEarnings): otherwise
        // the "you are here" dot lands off-chart and the verdict could claim
        // "stuck" beyond data the sweep never checked.
        const fallbackPoints = await fetchFallbackCurve(
          current.state,
          current.married,
          current.childAges.length,
        );
        if (!alive) return;
        if (!fallbackPoints) return setStatus({ phase: "error" });
        const analysis = analyzeCurve(
          fallbackPoints,
          clampFallbackEarnings(fallbackPoints, current.annualEarnings),
        );
        const escape = escapeAnalysis(fallbackPoints);
        setStatus({
          phase: "done", analysis, narration: narrate(analysis, props.ctx), escape, fallback: true,
        });
      })
      .catch(() => {
        // Defensive: fetchCurve resolves for expected failures, but a throw
        // inside the .then() (analyzeCurve/narrate on malformed data) or an
        // unexpected rejection would otherwise leave the page loading forever.
        if (alive) setStatus({ phase: "error" });
      });
    return () => { alive = false; };
  }, [current, props.ctx, attempt]);

  if (status.phase === "loading") {
    return (
      <div className="loading" role="status">
        <div className="spinner" aria-hidden />
        <h1>{t("loading.title")}</h1>
        <p>{t("loading.body")}</p>
      </div>
    );
  }

  if (status.phase === "error") {
    return (
      <div className="error-page" role="alert">
        <h1>{t("error.title")}</h1>
        <p>{t("error.body")}</p>
        <div className="nav-row">
          <button type="button" className="primary" onClick={() => setAttempt((n) => n + 1)}>
            {t("result.tryAgain")}
          </button>
          <button type="button" className="ghost" onClick={props.onStartOver}>
            {t("result.startOver")}
          </button>
        </div>
      </div>
    );
  }

  const { analysis, narration, escape, fallback } = status;
  // Reach (Plan 5): the safe-exit income is the household's own real state +
  // archetype's escape income, so the lookup is keyed off the SAME answers
  // that produced `escape` -- never a hardcoded/default state or archetype.
  // `escape.safeExitEarnings ? ... : null` doubles as the "0 or null" guard
  // (both are falsy): a 0 safe-exit means already always safe (nothing to
  // reach), and reachForHousehold only makes sense for a positive income.
  const stateName = STATE_NAMES[current.state] ?? current.state;
  const reachPct = escape.safeExitEarnings
    ? reachForHousehold(current.state, current.married, current.childAges.length, escape.safeExitEarnings)
    : null;
  const escapeNarration = narrateEscape(escape, props.ctx, { pct: reachPct, stateName });
  // Task 23's visibility condition reads the raw EscapeAnalysis fields, not
  // narrateEscape's output — narrateEscape doesn't carry benefitsEndEarnings
  // through (it isn't spoken by any of the three original EscapeNarration
  // lines), so that field can only gate the section here. Plan 4 adds
  // narration's own healthCostLine to the same gate: a household can have a
  // real health cost at their current pay with no cliff/leap/program-end
  // nearby, and that cost must still surface somewhere — EscapePath is where
  // it renders. Plan 5's reachLine is included too, defensively: in practice
  // it's only ever non-null alongside a non-null safeLine (both keyed off the
  // same safeExitEarnings), so this never changes visibility on real data —
  // see EscapePath's own belt-and-suspenders guard for the same reasoning.
  const showEscapePath =
    escape.benefitsEndEarnings !== null || escape.leap > 0
    || Object.keys(escape.programEnds).length > 0 || narration.healthCostLine !== null
    || escapeNarration.reachLine !== null;

  // The DS EscapePath has no dedicated reach slot, so the reach line — which
  // elaborates on the very safe-exit income the safe line names, and always
  // renders right beside it — is folded onto the end of the safe line. Reach
  // is only ever non-null when the safe line is too (both keyed off
  // safeExitEarnings), so it never appears orphaned.
  const safeLine = [escapeNarration.safeLine, escapeNarration.reachLine].filter(Boolean).join(" ") || undefined;

  // The take-up toggles, filtered to the ones that apply (Head Start only
  // shows with a child under 6). Flipping a switch rewrites `current`, which
  // re-runs the fetch effect above — the recompute-on-flip behavior preserved
  // exactly from the old `Toggles` component.
  const toggleRows: { key: ToggleKey; label: string; show: boolean }[] = [
    { key: "getsHeadStart", label: t("toggles.headstart"), show: current.childAges.some((a) => a < 6) },
    { key: "getsHousing", label: t("toggles.housing"), show: true },
    { key: "hasEmployerCoverage", label: t("toggles.esi"), show: true },
  ];
  const visibleToggles = toggleRows.filter((r) => r.show);

  return (
    <article className={`result verdict-${analysis.verdict}`}>
      {fallback && (
        <p className="fallback-banner" role="status">{t("result.fallback.banner")}</p>
      )}
      <VerdictHeadline tone={verdictTone(analysis.verdict)}>{narration.headline}</VerdictHeadline>
      <p className="verdict-body">{narration.body}</p>
      <CurveChart analysis={analysis} unit={props.ctx.unit} hoursPerWeek={props.ctx.hoursPerWeek} labels={CHART_LABELS} />
      {narration.whyItems.length > 0 && (
        <section className="why">
          <h2>{t("result.why.title")}</h2>
          <WhyList items={narration.whyItems.map(toWhyListItem)} />
        </section>
      )}
      {showEscapePath && (
        <section className="escape">
          <h2>{t("escape.title")}</h2>
          <EscapePath
            healthCost={narration.healthCostLine ?? undefined}
            safe={safeLine}
            leap={escapeNarration.leapLine ?? undefined}
            ends={escapeNarration.thresholds.map((th) => t("escape.ends", { label: th.label, wage: th.wage }))}
            endsTitle={t("escape.endsTitle")}
          />
        </section>
      )}
      {visibleToggles.length > 0 && (
        <section className="toggles">
          <h2>{t("toggles.title")}</h2>
          <p className="hint">{t("toggles.hint")}</p>
          {visibleToggles.map((r) => (
            <Toggle
              key={r.key}
              label={r.label}
              on={current[r.key]}
              onText={t("common.yes")}
              offText={t("common.no")}
              onChange={() => setCurrent({ ...current, [r.key]: !current[r.key] })}
            />
          ))}
        </section>
      )}
      {/* Only the LIVE curve is computed with the county; the state-level
          archetype fallback ignores it, so suppress the "uses your county"
          note whenever we're showing a fallback curve. */}
      {current.countyFips !== null && !fallback && (
        <p className="county-note">{t("result.county.note")}</p>
      )}
      <Callout tone="info" title={t("result.honesty.title")}>
        <p>{t("result.honesty.body")}</p>
        <p className="callout-note">{t("result.honesty.model")}</p>
        <p className="callout-note">{t("result.honesty.health")}</p>
        <p className="callout-note">{t("result.honesty.reach")}</p>
      </Callout>
      <div className="nav-row">
        {fallback && (
          <button type="button" className="primary" onClick={() => setAttempt((n) => n + 1)}>
            {t("result.tryAgain")}
          </button>
        )}
        <button type="button" className="ghost" onClick={props.onStartOver}>
          {t("result.startOver")}
        </button>
      </div>
    </article>
  );
}
