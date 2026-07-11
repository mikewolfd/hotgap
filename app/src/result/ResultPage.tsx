import { useEffect, useState } from "react";
import { analyzeCurve, type CurveAnalysis, type HouseholdAnswers } from "@hotgap/shared";
import { fetchCurve } from "../api/client.js";
import { fetchFallbackCurve, clampFallbackEarnings } from "../lib/fallback.js";
import { narrate, type Narration, type PayContext } from "../lib/narration.js";
import { t } from "../strings/t.js";
import { CurveChart } from "./CurveChart.js";
import { WhyList } from "./WhyList.js";

type Status =
  | { phase: "loading" }
  | { phase: "error" }
  // `fallback: true` means these numbers came from a precomputed archetype
  // curve (the live PolicyEngine call failed) rather than the household's
  // own real-time calculation — the page shows a banner and a still-visible
  // "Try again" button in that case (see the render below).
  | { phase: "done"; analysis: CurveAnalysis; narration: Narration; fallback: boolean };

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
      .then(async (r) => {
        if (!alive) return;
        if (r.ok) {
          const analysis = analyzeCurve(r.data.points, r.data.currentEarnings);
          setStatus({ phase: "done", analysis, narration: narrate(analysis, props.ctx), fallback: false });
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
          props.answers.state,
          props.answers.married,
          props.answers.childAges.length,
        );
        if (!alive) return;
        if (!fallbackPoints) return setStatus({ phase: "error" });
        const analysis = analyzeCurve(
          fallbackPoints,
          clampFallbackEarnings(fallbackPoints, props.answers.annualEarnings),
        );
        setStatus({ phase: "done", analysis, narration: narrate(analysis, props.ctx), fallback: true });
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

  const { analysis, narration, fallback } = status;
  return (
    <article className={`result verdict-${analysis.verdict}`}>
      {fallback && (
        <p className="fallback-banner" role="status">{t("result.fallback.banner")}</p>
      )}
      <h1 className="verdict-headline">{narration.headline}</h1>
      <p className="verdict-body">{narration.body}</p>
      <CurveChart analysis={analysis} ctx={props.ctx} />
      <WhyList items={narration.whyItems} />
      <aside className="honesty" aria-label={t("result.honesty.title")}>
        <h2>{t("result.honesty.title")}</h2>
        <p>{t("result.honesty.body")}</p>
        <p className="honesty-model">{t("result.honesty.model")}</p>
      </aside>
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
