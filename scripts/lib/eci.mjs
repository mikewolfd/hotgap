// The BLS Employment Cost Index arithmetic that carries a dollar figure from
// one calendar year to CY2026, shared by build-reach.mjs (2024 -> 2026 for
// the reach ladders) and build-state-defaults.mjs (each NDCP study year ->
// 2026 for childcare prices). Each builder keeps its own fetch — they ask
// api.bls.gov for different windows, on purpose, so that state-defaults'
// cross-check against reach.json tests the ECI vintage rather than a shared
// download — and its own offline fallback table with the date it was taken.

export const ECI_SERIES = "CIU2020000000000I"; // ECI, wages and salaries, private industry workers, index NSA

/** One BLS API series object -> { "YYYY-Q": index }, quarterly rows only. */
export function quarterlyValues(series) {
  const values = {};
  for (const d of series.data) {
    const q = /^Q0([1-4])$/.exec(d.period);
    if (q) values[`${d.year}-${q[1]}`] = Number(d.value);
  }
  return values;
}

/** The four quarterly values of a calendar year; throws if one is missing. */
export function calendarYear(values, year) {
  const quarters = [1, 2, 3, 4].map((q) => values[`${year}-${q}`]);
  if (quarters.some((x) => x === undefined)) throw new Error(`ECI: CY${year} is incomplete`);
  return quarters;
}

export const average = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * The CY2026 average of the index. Quarters 2026 has not published yet are
 * extrapolated from the same quarter of 2025 at the latest published
 * 12-month rate, which is how BLS itself frames the series' headline number.
 * Returns the pieces the builders print and record: the latest published
 * quarter and its year-earlier value, the 12-month ratio, the four target
 * quarters (each marked projected or not) and their average.
 */
export function projectCy2026(values) {
  let latest = null;
  for (const y of [2026, 2025]) for (const q of [4, 3, 2, 1]) if (latest === null && values[`${y}-${q}`] !== undefined) latest = { y, q };
  const prior = values[`${latest.y - 1}-${latest.q}`];
  if (prior === undefined) throw new Error("ECI: no year-earlier quarter for the 12-month rate");
  const yoy = values[`${latest.y}-${latest.q}`] / prior;

  const target = [1, 2, 3, 4].map((q) => {
    const actual = values[`2026-${q}`];
    return actual !== undefined ? { q, value: actual, projected: false } : { q, value: values[`2025-${q}`] * yoy, projected: true };
  });
  return { latest, prior, yoy, target, to: average(target.map((t) => t.value)) };
}
