import { useEffect, useState } from "react";
import { analyzeCurve, escapeAnalysis, type CurveAnalysis, type CurvePoint } from "@hotgap/shared";
import { CurveChart, EscapePath } from "@hotgap/design-system";
import { t } from "../strings/t.js";
import { formatDollars, narratePlacesEscape } from "../lib/narration.js";
import { makeChartLabels, minWageLineFor } from "../lib/chartLabels.js";
import { reachForArchetype } from "../lib/reachLookup.js";
import type { PlacesMetric } from "../lib/placesRamp.js";

interface StateDataFile {
  state: string;
  archetypes: Record<string, { points: CurvePoint[] }>;
}

type Status =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "done"; analysis: CurveAnalysis };

export function StatePanel(props: {
  stateCode: string;
  stateName: string;
  archetypeId: string;
  /** Which metric the map/legend/rank currently sort by — the headline must
   *  describe the SAME number the rank sorts by, or a loss headline reads as
   *  if the leap-based rank ordered it. */
  metric: PlacesMetric;
  /** Precomputed from the bundled summary.json — renders instantly, no fetch needed. */
  biggestLoss: number;
  /** The leap (raise to clear the worst zone in one move), same source. */
  leap: number;
  /** How many of the other 50 states rank strictly better on the SELECTED
   *  metric — computed in PlacesPage against whichever metric is active. */
  rank: number;
  fetchImpl?: typeof fetch;
}) {
  const { stateCode, archetypeId, metric, fetchImpl = fetch } = props;
  const [status, setStatus] = useState<Status>({ phase: "loading" });

  useEffect(() => {
    let alive = true;
    setStatus({ phase: "loading" });
    fetchImpl(`/data/states/${stateCode}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`state fetch failed: ${res.status}`);
        return res.json() as Promise<StateDataFile>;
      })
      .then((data) => {
        if (!alive) return;
        const points = data.archetypes?.[archetypeId]?.points;
        if (!points || points.length < 2) throw new Error("no curve for this archetype");
        setStatus({ phase: "done", analysis: analyzeCurve(points, 0) });
      })
      .catch(() => {
        if (alive) setStatus({ phase: "error" });
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode, archetypeId]);

  // Escape analysis runs on the same lazy-loaded points the curve chart
  // already fetched — no new data, and it's the exact math the personal
  // door's "path off help" section uses, so a state's drill-down and a
  // household's own result page can never disagree on a number.
  //
  // Reach (Plan 5): safeExitEarnings here comes from THIS SAME escapeAnalysis
  // call, not a separate `safeExit` prop threaded from PlacesPage's bundled
  // summary.json — the two would compute an identical number (same points,
  // same math), and reading it from a second source of truth risks the two
  // silently drifting apart. `esc.safeExitEarnings ? ... : null` doubles as
  // the "0 or null" guard, same reasoning as the personal door's ResultPage.
  const escapeNarration = status.phase === "done"
    ? (() => {
        const esc = escapeAnalysis(status.analysis.points);
        const pct = esc.safeExitEarnings ? reachForArchetype(stateCode, archetypeId, esc.safeExitEarnings) : null;
        return narratePlacesEscape(esc, { pct });
      })()
    : null;

  // The DS EscapePath has no dedicated reach slot, so the reach line — which
  // elaborates on the very safe-exit income the safe line names — is folded
  // onto the end of the safe line (reach is only ever non-null when the safe
  // line is too, so it never appears orphaned). Same treatment as the
  // personal door's EscapePath.
  const safeLine = escapeNarration
    ? [escapeNarration.safeLine, escapeNarration.reachLine].filter(Boolean).join(" ") || undefined
    : undefined;
  const showEscape = escapeNarration !== null && (
    escapeNarration.safeLine !== null || escapeNarration.leapLine !== null
    || escapeNarration.reachLine !== null || escapeNarration.thresholds.length > 0
  );

  return (
    <section className="places-panel" aria-live="polite">
      <h2 className="places-panel-headline">
        {metric === "leap"
          ? t("places.panel.headlineLeap", { state: props.stateName, amount: formatDollars(props.leap) })
          : t("places.panel.headline", { state: props.stateName, loss: formatDollars(props.biggestLoss) })}
      </h2>
      <p className="places-panel-rank">{t("places.panel.rank", { n: props.rank })}</p>

      {status.phase === "loading" && (
        <div className="places-panel-loading" role="status">
          <div className="spinner" aria-hidden />
          <p>{t("places.loading")}</p>
        </div>
      )}
      {status.phase === "error" && (
        <p className="places-panel-error" role="alert">{t("places.error")}</p>
      )}
      {status.phase === "done" && (
        <CurveChart analysis={status.analysis} unit="year" showCurrent={false} minWageLine={minWageLineFor(stateCode)} labels={makeChartLabels(stateCode)} />
      )}

      {showEscape && escapeNarration && (
        <EscapePath
          safe={safeLine}
          leap={escapeNarration.leapLine ?? undefined}
          ends={escapeNarration.thresholds.map((th) => t("escape.ends", { label: th.label, wage: th.wage }))}
          endsTitle={t("places.panel.endsTitle")}
        />
      )}

      <p className="places-panel-honesty">{t("places.panel.honesty")}</p>
      {/* Plan 4: the chart's own y-axis label (rendered by the shared
          CurveChart component above) already says "after health costs" — this
          note is the drill-down's honesty-box equivalent of the personal
          door's result.honesty.health sentence, spelling out what that means
          in the same "not your family" honesty voice as the line above it. */}
      <p className="places-panel-health-note">{t("places.panel.healthNote")}</p>
      <p className="places-panel-reach-note">{t("places.panel.reachNote")}</p>
      <p className="places-panel-assumptions">{t("places.panel.assumptions")}</p>
      <p className="places-panel-assumptions">{t("places.panel.baseline")}</p>
    </section>
  );
}
