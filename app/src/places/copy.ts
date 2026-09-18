// Every string the journalist surface shows: `places.*` in
// src/i18n/<locale>.json (the shape and the reader are lib/copy.ts), in the
// reporter's register. The skeleton in places.html holds ids; render.ts
// fills them from here, words.ts composes the sentences that have variants.
// Every figure arrives formatted by lib/format.ts; program names are the
// `name` register (lib/programs.ts, M3); state names are the catalog's and
// the cliff floor is core's. Nothing a figure says is typed in a message:
// every number is an argument.
//
// A sentence may carry a link or an emphasis as `[text](url "title")`,
// `*em*` or `**strong**`; render.ts's `rich()` is the only reader of that
// notation, and it escapes everything else.
//
// The decisions the messages carry, by key:
//   lede.counted.* — the counted sentence, written whole once the data is in
//     (S6); "one axis" said as what it is (N12); the states counted as a reader
//     counts them (rerun N11). The trailing space joins it to the figure
//     sentence in its own element. lede.glossary — one glossary sentence, from
//     core's floor (S3), and PolicyEngine introduced on first use (S6).
//   measures.* — the six measures pipeline/src/metrics.ts writes, in the
//     FilterRow's order; each option stands on its own (S2). dangerWidth: the
//     pipeline sums every zone (metrics.ts); the widest one's width is the leap
//     — the earlier label, "the worst danger zone", described the leap.
//     deferredCliffCount.describe names the three mechanisms where the map is
//     chosen, not six bullets down (S4).
//   household.* — the household as the reader knows it (S10 of the first
//     review): "1 adult, 2 children (3 and 7)". figure.sub adds its tenure,
//     which every household shares (rerun N10).
//   figure.source, figure.binsLine.* — the map's own provenance and bins, one
//     line (N7: a run, not a sweep): its sentences, joined. figure.oneClass.* —
//     when one class holds nine states in ten, the near-monochrome map
//     explains itself (N11).
//   readout.* — the state readout beside the map (B3, B4, S1): the selected
//     measure's figure in its own sentence (rerun B2), then the worst step
//     where it is not the measure, then the county; a figure the axis bounds
//     says past what, in dollars (S6, N9); readout.none* is the data's own
//     reason, never a guessed cause (rerun S6). The two-count sentences
//     (floor, worstStepFloor, measure.cliffCount, measure.deferred) are nested
//     plurals: `n` programs or cliffs, `m` missing programs, `deferred`.
//   rank.row.* — the row's accessible name: its rank, the state, the value —
//     and, on the one-step loss, the step's earnings (S5). rank.at — where the
//     worst step begins, beside the loss (rerun S5). rank.ordinal, rank.range
//     — a rank ordinal in the strip (N3); the range a lower-bound group shares,
//     the way a tie shares one rank (rerun B1). rank.floor, rank.atLeast — a
//     figure the model could not complete can only be low (S5); a leap the
//     axis bounded from above. rank.lower.* — lower-bound rows lead the order
//     under their own heading (B1) and share the top ranks the way a tie does
//     (rerun B1): the leap's floor is a figure; a safe exit past the axis is
//     not. rank.lower.note.* — why the ranks are shared, and the one thing the
//     data lets a reader say about the worst: two sentences, the second only
//     with a measured figure to name.
//   table.order.* — one order per measure (N2); the hint said once, where the
//     control is: the two controls are independent (rerun N3). table.defs.* —
//     one sentence per column, where the headers are (rerun S3); the six
//     measures reuse their own `describe`. table.floor — the row's own caveat,
//     in its cell (S5). table.subsidyAdded — the child-care subsidy's footing,
//     in the Figures cell where HotGap added it (rerun S4). table.floorMark —
//     the short amber word in the state cell, so the caveat is on screen at
//     390 without a swipe (S10).
//   detail.* — CorrectionsApplied (#18), IncompleteMarker (#16), otherBenefits
//     and the state's SourceNote, for the selected state. detail.applied — the
//     chip on a correction core records without a source word: the CSV's own
//     word (rerun N7). detail.subsidy.* — the child-care subsidy's footing,
//     stated in every block (B2). detail.liheap.* — EligibilityBoundary (#23):
//     where energy assistance stops in the selected state, as one row in the
//     ledger's shape — the footing chip, three sentences (the limit in words,
//     the worth if received, the share served as "about N in 10" with the
//     figure), and the publishers as the cite with the day read; one row,
//     because the block sits beside the ranked strip at 1280. Never a measure,
//     a bin or a sort. detail.source — SourceNote (#17), the county named (B4)
//     and reach gone from this page (N9).
//   csv.* — CSV cell words (the headers are a machine contract and live in
//     csv.ts); csv.modelLabel.* — the model as a label a spreadsheet can carry (N8).
//   method.axis.* — the axis the selected household was swept to, in dollars
//     (rerun N9), with the states whose guidelines lengthen it.
//     method.excludes.everywhere — a gap every state shares, listed once here
//     and never under a state (S8). method.excludes.liheap.* —
//     EligibilityBoundary once for the page: the served range with its two
//     states and the states where the money is counted, from every block.
//     method.pastAxisCaution — the worst and the last zone can differ (S9): an
//     exact leap beside an unknown safe exit is one state, not a contradiction.
//     method.cite — a suggested citation, from the run's own facts and the
//     page's own address (N13).
import { bind, catalog } from "../lib/copy.js";

export const copy = catalog.places;

export const t = bind(copy);
