import { useEffect, useState } from "react";
import { analyzeCurve, type CurveAnalysis, type HouseholdAnswers } from "@hotgap/shared";
import { fetchCurve } from "../api/client.js";
import { narrate, type Narration, type PayContext } from "../lib/narration.js";
import { t } from "../strings/t.js";
import { CurveChart } from "./CurveChart.js";
import { WhyList } from "./WhyList.js";

type Status =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "done"; analysis: CurveAnalysis; narration: Narration };

export function ResultPage(props: {
  answers: HouseholdAnswers;
  ctx: PayContext;
  onStartOver: () => void;
}) {
  const [status, setStatus] = useState<Status>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus({ phase: "loading" });
    fetchCurve(props.answers)
      .then((r) => {
        if (!alive) return;
        if (!r.ok) return setStatus({ phase: "error" });
        const analysis = analyzeCurve(r.data.points, r.data.currentEarnings);
        setStatus({ phase: "done", analysis, narration: narrate(analysis, props.ctx) });
      })
      .catch(() => {
        // Defensive: fetchCurve resolves for expected failures, but a throw
        // inside the .then() (analyzeCurve/narrate on malformed data) or an
        // unexpected rejection would otherwise leave the page loading forever.
        if (alive) setStatus({ phase: "error" });
      });
    return () => { alive = false; };
  }, [props.answers, props.ctx, attempt]);

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

  const { analysis, narration } = status;
  return (
    <article className={`result verdict-${analysis.verdict}`}>
      <h1 className="verdict-headline">{narration.headline}</h1>
      <p className="verdict-body">{narration.body}</p>
      <CurveChart analysis={analysis} ctx={props.ctx} />
      <WhyList items={narration.whyItems} />
      <aside className="honesty" aria-label={t("result.honesty.title")}>
        <h2>{t("result.honesty.title")}</h2>
        <p>{t("result.honesty.body")}</p>
        <p className="honesty-model">{t("result.honesty.model")}</p>
      </aside>
      <button type="button" className="ghost" onClick={props.onStartOver}>
        {t("result.startOver")}
      </button>
    </article>
  );
}
