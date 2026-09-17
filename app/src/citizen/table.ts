// DataTable (#15), the chart's table twin: the points the picture marks,
// as numbers (N3). The words for each threshold live once, in the StepList;
// a row here says only which mark it is. Every `keep` is read off the
// plotted curve, so the table and the picture cannot disagree.
import { t } from "./copy.js";
import type { Scene } from "./model.js";

export interface TableRow { at: number; keep: number; drop?: number; mark: string }

export function tableRows(s: Scene): TableRow[] {
  const keepAt = (e: number) => s.net[s.idx(e)];
  const rows: TableRow[] = [];
  if (s.zone) rows.push({ at: s.zone.startEarnings, keep: s.zone.peakNet, mark: t("table.marks.peak") });
  rows.push({ at: s.current, keep: s.currentNet, mark: t("table.marks.you") });
  if (s.zone && s.exit !== null) rows.push({ at: s.exit, keep: keepAt(s.exit), mark: t("table.marks.exit") });
  // Every cliff in the window on its own row: a merged mark separates here.
  for (const c of s.inWindow) rows.push({ at: c.endEarnings, keep: keepAt(c.endEarnings), drop: c.drop, mark: t(c.deferral ? "table.marks.later" : "table.marks.drop") });
  if (s.safeExit !== null && s.safeExit !== s.exit && s.safeExit > 0) rows.push({ at: s.safeExit, keep: keepAt(s.safeExit), mark: t("table.marks.safe") });
  return rows.sort((a, b) => a.at - b.at || (a.drop ? 1 : -1));
}
