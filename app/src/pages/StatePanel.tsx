import { useEffect, useState } from "react";
import { analyzeCurve, type CurveAnalysis, type CurvePoint } from "@hotgap/shared";
import { t } from "../strings/t.js";
import { formatDollars } from "../lib/narration.js";
import { CurveChart } from "../result/CurveChart.js";

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
  /** Precomputed from the bundled summary.json — renders instantly, no fetch needed. */
  biggestLoss: number;
  /** How many of the other 50 states have a strictly smaller biggestLoss for this archetype. */
  rank: number;
  fetchImpl?: typeof fetch;
}) {
  const { stateCode, archetypeId, fetchImpl = fetch } = props;
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

  return (
    <section className="places-panel" aria-live="polite">
      <h2 className="places-panel-headline">
        {t("places.panel.headline", { state: props.stateName, loss: formatDollars(props.biggestLoss) })}
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
        <CurveChart analysis={status.analysis} ctx={{ unit: "year" }} showCurrent={false} />
      )}

      <p className="places-panel-honesty">{t("places.panel.honesty")}</p>
      <p className="places-panel-assumptions">{t("places.panel.assumptions")}</p>
    </section>
  );
}
