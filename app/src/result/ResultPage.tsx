import { useEffect, useState } from "react";
import { analyzeCurve, escapeAnalysis, type CurveAnalysis, type EscapeAnalysis, type HouseholdAnswers } from "@hotgap/shared";
import { fetchCurve } from "../api/client.js";
import { fetchFallbackCurve, clampFallbackEarnings } from "../lib/fallback.js";
import { narrate, narrateEscape, type Narration, type PayContext } from "../lib/narration.js";
import { reachForHousehold } from "../lib/reachLookup.js";
import { STATE_NAMES } from "../lib/states.js";
import { t } from "../strings/t.js";
import { CurveChart } from "./CurveChart.js";
import { WhyList } from "./WhyList.js";
import { EscapePath } from "./EscapePath.js";

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

  useEffect(() => {
    let alive = true;
    setStatus({ phase: "loading" });
    fetchCurve(props.answers)
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

  const { analysis, narration, escape, fallback } = status;
  // Reach (Plan 5): the safe-exit income is the household's own real state +
  // archetype's escape income, so the lookup is keyed off the SAME answers
  // that produced `escape` -- never a hardcoded/default state or archetype.
  // `escape.safeExitEarnings ? ... : null` doubles as the "0 or null" guard
  // (both are falsy): a 0 safe-exit means already always safe (nothing to
  // reach), and reachForHousehold only makes sense for a positive income.
  const stateName = STATE_NAMES[props.answers.state] ?? props.answers.state;
  const reachPct = escape.safeExitEarnings
    ? reachForHousehold(props.answers.state, props.answers.married, props.answers.childAges.length, escape.safeExitEarnings)
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
  return (
    <article className={`result verdict-${analysis.verdict}`}>
      {fallback && (
        <p className="fallback-banner" role="status">{t("result.fallback.banner")}</p>
      )}
      <h1 className="verdict-headline">{narration.headline}</h1>
      <p className="verdict-body">{narration.body}</p>
      <CurveChart analysis={analysis} ctx={props.ctx} />
      <WhyList items={narration.whyItems} />
      {showEscapePath && (
        <EscapePath narration={escapeNarration} healthCostLine={narration.healthCostLine} />
      )}
      <aside className="honesty" aria-label={t("result.honesty.title")}>
        <h2>{t("result.honesty.title")}</h2>
        <p>{t("result.honesty.body")}</p>
        <p className="honesty-model">{t("result.honesty.model")}</p>
        <p className="honesty-health">{t("result.honesty.health")}</p>
        <p className="honesty-reach">{t("result.honesty.reach")}</p>
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
