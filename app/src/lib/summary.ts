// The sweep's summary (/data/summary.json: coverage, vintages, the model and
// the run date), fetched at most once per page and shared by everything on
// it that reads it — the citizen's provenance lines and the site footer.
// Null if it never arrives: every reader then says less, never something wrong.
import type { SummaryJson } from "@hotgap/core";

let pending: Promise<SummaryJson | null> | null = null;

export function loadSummary(): Promise<SummaryJson | null> {
  return (pending ??= fetch("/data/summary.json").then((r) => (r.ok ? (r.json() as Promise<SummaryJson>) : null)).catch(() => null));
}
