// Every string the journalist surface shows, in one place, in the reporter's
// register (app/README.md § Languages: one copy module per surface until the
// locale files land; a sentence with values is a function of them, whole,
// never fragments joined). The skeleton in places.html holds ids; render.ts
// fills them from here. Numbers, money, lists and dates go through Intl with
// `locale`, the one place it is named (lib/format.ts binds the same locale).
// Program names are the `name` register (lib/programs.ts, M3); state names
// and the cliff floor are core's. Nothing a figure says is typed here: every
// number is a slot.
//
// A sentence may carry a link or an emphasis as `[text](url "title")`,
// `*em*` or `**strong**`; render.ts's `rich()` is the only reader of that
// notation, and it escapes everything else.
import { CLIFF_MIN, LIHEAP_VINTAGE, type LiheapShape, type ProgramId } from "@hotgap/core";
import { capitalize, dateWords, dayWords, listOf, modelLine, money } from "../lib/format.js";
import { programName } from "../lib/programs.js";
import { servedTenths } from "../lib/served.js";

export const locale = "en-US";

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Formatting in the active locale; money, list and date are the shell's (lib/format.ts). */
export const fmt = {
  money,
  list: listOf,
  date: dateWords,
  /** A count in words, up to ninety-nine ("eleven", "fifty-one"); larger as digits. */
  count: (n: number): string => {
    if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
    if (n < 20) return ONES[n];
    return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  },
  /** A measure's value as the map, the ranking and the caption print it; null is past the axis. */
  measure: (v: number | null, unit: "$" | ""): string => (v === null ? copy.pastAxis : unit === "$" ? money(v) : String(v)),
  /** "$26,206 (floor)": a figure the model could not complete, so it can only be low (S5). */
  floor: (v: string): string => `${v} (floor)`,
  /** "≥ $53,000": a leap the axis bounded from above. */
  atLeast: (v: string): string => `≥ ${v}`,
  /** The step a figure names: "$38,000 → $39,000". */
  step: (at: number, step: number): string => `${money(at)} → ${money(at + step)}`,
  /** "30." — a rank ordinal in the strip (N3). */
  rank: (n: number): string => `${n}.`,
  /** "1–12" — the rank range a lower-bound group shares, the way a tie shares one rank (rerun B1); "1." when it is one state. */
  rankRange: (n: number): string => (n === 1 ? "1." : `1–${n}`),
  /** A program list in the `name` register: "Medicaid", "SNAP and CCDF child care subsidy". */
  programs: (ids: readonly ProgramId[]): string => listOf(ids.map(programName)),
  /** "HotGap hosted engine, policyengine-us 2.6.2" — the model as a label a spreadsheet can carry (N8). */
  modelLabel: (model: { endpoint: string; version: string | null } | null | undefined): string =>
    model?.version ? `HotGap hosted engine, ${modelLine(model)}` : model ? `PolicyEngine public API (${model.endpoint})` : modelLine(model),
};

/** EligibilityBoundary (#23): the served share as the citizen hears it, with the figure a reporter quotes — "About 2 in 10 income-eligible households were served in FY2024 (22%)." */
const servedLine = (share: number): string => {
  const s = servedTenths(share);
  const lead = s.kind === "few" ? "Fewer than 1 in 10" : s.kind === "most" ? "Almost all" : `About ${s.n} in 10`;
  return `${lead} income-eligible households were served in ${LIHEAP_VINTAGE.served} (${Math.round(share * 100)}%).`;
};

export const copy = {
  pageTitle: "HotGap — what a raise costs, state by state",
  wordmark: "HotGap",
  skip: "Skip to the data table",
  title: "What a raise costs, state by state",
  lede: {
    /** The counted sentence, written whole once the data is in (S6); "one axis" said as what it is (N12); the states counted as a reader counts them (rerun N11). */
    counted: (states: number, households: number, withDc: boolean) =>
      `${withDc ? `${capitalize(fmt.count(states - 1))} states and the District of Columbia` : `${capitalize(fmt.count(states))} states`}, ${fmt.count(households)} household shapes, one earnings scale — from $0 past 400% of the poverty line for that household. `,
    figure: "Each figure is the worst single $1,000 step of earnings in that state's curve for that household — how much net income falls when pay goes up by a thousand dollars.",
    /** One glossary sentence, from core's floor (S3), and PolicyEngine introduced on first use (S6). */
    glossary: `A *cliff* is a $1,000 raise that cuts net income by ${money(CLIFF_MIN)} or more; a *danger zone* is a run of earnings across which the household never gets ahead. The figures come from [PolicyEngine](https://policyengine.org), an open-source tax-and-benefit calculator, run by HotGap. Estimates only.`,
  },
  status: {
    loading: "Loading the weekly run…",
    failed: (reason: string) => `We could not load the weekly run: ${reason}. Reload to try again.`,
    http: (status: number) => `the data file answered HTTP ${status}`,
  },
  filters: { household: "Household", measure: "Measure", csv: "Download these rows (CSV)" },
  /* The six measures pipeline/src/metrics.ts writes, in the FilterRow's order. Each option stands on its own (S2). */
  measures: {
    biggestLoss: { title: "Largest one-step loss", option: "Largest one-step loss ($)", describe: "Net income lost in the worst single $1,000 step of earnings." },
    /* The pipeline sums every zone (metrics.ts); the widest one's width is the leap. The earlier label, "the worst danger zone", described the leap. */
    dangerWidth: { title: "Total width of the danger zones", option: "Total width of the danger zones — every stretch where more pay leaves the household no better off, added together ($)", describe: "Earnings spanned by every stretch where more pay leaves the household no better off, all such stretches added together." },
    leap: { title: "The leap", option: "The leap — the raise needed to clear the worst danger zone ($)", describe: "The raise a household must clear in one move to get past its worst danger zone." },
    safeExit: { title: "Safe exit", option: "Safe exit — earnings above which no danger zone remains ($)", describe: "Earnings above which no danger zone remains: where the last one closes." },
    cliffCount: { title: "Number of cliffs", option: "Number of cliffs", describe: `Steps down of ${money(CLIFF_MIN)} or more anywhere on the curve.` },
    deferredCliffCount: { title: "Deferred cliffs", option: "Deferred cliffs — of the cliffs counted, those that land at a later renewal",
      /* The three mechanisms named where the map is chosen, not six bullets down (S4). */
      describe: "Of the cliffs counted, those that land at a later renewal rather than with the raise: Head Start's program-year carry-over, a child's 12 months of continuous Medicaid or CHIP, a parent's Transitional Medical Assistance." },
  },
  /** The household as the reader knows it (S10 of the first review): "1 adult, 2 children (3 and 7)". */
  household: (married: boolean, bothWork: boolean, ages: number[]) => {
    const adults = !married ? "1 adult" : bothWork ? "2 adults, both working" : "2 adults, one working";
    const n = ages.length;
    const list = n === 2 ? `${ages[0]} and ${ages[1]}` : ages.join(", ");
    return `${adults}, ${n === 0 ? "no children" : `${n} ${n === 1 ? "child" : "children"} (${list})`}`;
  },
  pastAxis: "past the axis",
  figure: {
    title: (measure: string) => `${measure}, by state`,
    /** The household as the reader knows it, and its tenure, which every household shares (rerun N10). */
    sub: (household: string, describe: string) => `${household}, renting in the state's most populous county. ${describe}`,
    description: "A grid of the fifty states and the District of Columbia, each a square in roughly its geographic position, shaded by the selected measure. A state with no cliff is an empty square; a state whose figure runs past the axis has a dashed edge; a state the model cannot complete is hatched rather than shaded. Each square is a button that opens that state's corrections under the map; the arrow keys move between squares and Enter selects. Every value is listed in the table below this figure.",
    tile: {
      value: (state: string, v: string) => `${state}: ${v}`,
      none: (state: string) => `${state}: no cliff found`,
      past: (state: string) => `${state}: past the axis`,
      incomplete: (state: string, programs: string[]) => `${state}: ${fmt.list(programs)} not modelled — figures incomplete`,
    },
    legend: {
      none: (n: number) => `No cliff found (${n})`,
      past: (n: number) => `Runs past the top of the axis (${n})`,
      incomplete: (programs: string[], n: number) => `${fmt.list(programs)} not modelled — figures incomplete, not low (${n})`,
    },
    bins: {
      steps: (lo: string, hi: string) => `five equal-width steps from ${lo} to ${hi}`,
      classes: (n: number, lo: number, hi: number) => `${fmt.count(n)} ${n === 1 ? "class" : "classes"} from ${lo} to ${hi}`,
    },
    /** The map's own provenance and bins, one line (N7: a run, not a sweep). */
    source: (year: string, model: string, date: string, bins: string, comparable: number, none: number, past: number) =>
      `HotGap, from PolicyEngine ${year} rules on ${model}. Weekly run of ${date}. Net income after health-insurance premiums. Estimates only. ` +
      `Bins: ${bins} over the ${comparable} states with a comparable figure${none ? `; ${none} with no cliff found` : ""}${past ? `; ${past} past the axis` : ""}.`,
    hatched: (n: number, programs: string[]) => n === 1
      ? `One state is hatched: ${fmt.list(programs)} ${programs.length === 1 ? "is" : "are"} not modelled there, so its figures are incomplete and are not shaded or ranked.`
      : `${n} states are hatched: ${fmt.list(programs)} ${programs.length === 1 ? "is" : "are"} not modelled there, so their figures are incomplete and are not shaded or ranked.`,
    /** When one class holds nine states in ten, the near-monochrome map explains itself (N11). */
    oneClass: {
      count: (n: number, total: number, lo: number, hi: number) =>
        `${n} of the ${total} comparable states have ${lo === hi ? (lo === 0 ? "none" : String(lo)) : `${lo} to ${hi}`}.`,
      dollars: (n: number, total: number, lo: string, hi: string) => `${n} of the ${total} comparable states fall between ${lo} and ${hi}.`,
    },
  },
  /* The state readout beside the map (B3, B4, S1): the selected measure's
     figure in its own sentence, then the worst step where it is not the
     measure (rerun B2), then the county. Slots arrive already marked by render.ts. */
  readout: {
    empty: "Select a state on the map or in the table.",
    /** The worst step, leading, on the one-step-loss measure. */
    step: (state: string, loss: string, step: string, programs: readonly ProgramId[]) =>
      programs.length
        ? `${state} — ${loss} lost at ${step}, when ${fmt.programs(programs)} ${programs.length === 1 ? "ends" : "end"}.`
        : `${state} — ${loss} lost at ${step}; no single program explains the drop.`,
    floor: (state: string, loss: string, step: string, programs: readonly ProgramId[], missing: string[]) =>
      `${state} — at least ${loss} lost at ${step}${programs.length ? `, when ${fmt.programs(programs)} ${programs.length === 1 ? "ends" : "end"}` : ""}; a floor, because ${fmt.list(missing)} ${missing.length === 1 ? "is" : "are"} not modelled.`,
    /** The worst step as the second line, under another measure's sentence. */
    worstStep: (loss: string, step: string, programs: readonly ProgramId[]) =>
      programs.length
        ? `Worst step: ${loss} lost at ${step}, when ${fmt.programs(programs)} ${programs.length === 1 ? "ends" : "end"}.`
        : `Worst step: ${loss} lost at ${step}; no single program explains the drop.`,
    worstStepFloor: (loss: string, step: string, programs: readonly ProgramId[], missing: string[]) =>
      `Worst step: at least ${loss} lost at ${step}${programs.length ? `, when ${fmt.programs(programs)} ${programs.length === 1 ? "ends" : "end"}` : ""}; a floor, because ${fmt.list(missing)} ${missing.length === 1 ? "is" : "are"} not modelled.`,
    /** The selected measure's own sentence (rerun B2); a figure the axis bounds says past what, in dollars (S6, N9). */
    measure: {
      dangerWidth: (state: string, width: string) => `${state} — ${width} of earnings lie inside danger zones.`,
      dangerWidthOpen: (state: string, width: string, top: string) => `${state} — at least ${width} of earnings lie inside danger zones; the last one had not closed by ${top}, the top of the axis.`,
      leap: (state: string, leap: string) => `${state} — a raise of ${leap} clears the worst danger zone.`,
      leapAtLeast: (state: string, leap: string, top: string) => `${state} — a raise of at least ${leap} to clear the worst danger zone, which runs past ${top}, the top of the axis.`,
      safeExit: (state: string, exit: string) => `${state} — no danger zone left above ${exit}.`,
      safeExitPast: (state: string, top: string) => `${state} — no safe exit found: the last danger zone had not closed by ${top}, the top of the axis.`,
      cliffCount: (state: string, n: number, deferred: number) =>
        `${state} — ${n} ${n === 1 ? "cliff" : "cliffs"} on this household's curve, ${deferred === 0 ? "none deferred" : `and ${deferred} more deferred to a later renewal`}.`,
      deferred: (state: string, deferred: number, n: number) =>
        deferred === 0
          ? `${state} — no cliff deferred to a later renewal; ${n === 1 ? "its one cliff lands" : `all ${n} land`} with the raise.`
          : `${state} — ${deferred} ${deferred === 1 ? "cliff" : "cliffs"} deferred to a later renewal, on top of ${n} that ${n === 1 ? "lands" : "land"} with the raise.`,
      /** Appended to the measure's sentence for a hatched state: its figure is a floor. */
      floorTail: (missing: string[]) => ` Incomplete: ${fmt.list(missing)} ${missing.length === 1 ? "is" : "are"} not modelled, so the figure is a floor.`,
    },
    /** What the model found instead of a cliff (rerun S6): the data's own reason, never a guessed cause. */
    none: (state: string, step: string, floor: string, top: string) =>
      `${state} — no cliff found: no ${step} step of earnings on this household's curve cut net income by ${floor} or more, up to ${top}.`,
    noneDeferred: (state: string, step: string, floor: string, top: string, deferred: number) =>
      `${state} — no cliff lands with the raise: no ${step} step of earnings on this household's curve cut net income by ${floor} or more in the year of the raise, up to ${top}; ${deferred} ${deferred === 1 ? "cliff is" : "cliffs are"} deferred to a later renewal.`,
    renter: (county: string | null) => (county ? `Renter, ${county}.` : "Renter in the state's most populous county."),
    details: "Details below ↓",
  },
  rank: {
    heading: "Ranked",
    /** The row's accessible name: its rank, the state, the value — and, on the one-step loss, the step's earnings (S5). */
    row: (rank: string, state: string, v: string, at?: string) => `${rank} ${state}: ${v}${at ? `, ${at}` : ""}`,
    /** "at $38,000": where the worst step begins, beside the loss (rerun S5). */
    at: (v: string) => `at ${v}`,
    lower: {
      /* Lower-bound rows lead the order under their own heading (B1) and
         share the top ranks the way a tie shares one rank (rerun B1): the
         leap's floor is a figure; a safe exit past the axis is not. */
      leap: (n: number) => `${n === 1 ? "Rank 1" : `Ranks 1–${n} shared`} — at least this much; the exact size runs past the axis (${n})`,
      safeExit: (n: number) => `${n === 1 ? "Rank 1" : `Ranks 1–${n} shared`} — past the top of the axis; no safe exit found on the scale (${n})`,
      /** Why the ranks are shared, and the one thing the data lets a reader say about the worst. */
      note: {
        leap: (n: number, top: { state: string; v: string } | null, floor: { state: string; v: string; reaches: boolean }) =>
          `${n === 1 ? "This state" : "Any of these"} could need the largest raise — the axis ends before the worst zone closes — so ${n === 1 ? "it takes the top rank" : "they share the top ranks the way a tie does"}.` +
          (top ? ` The largest measured leap is ${top.state}'s ${top.v}; ${floor.state}'s is ${floor.reaches ? "at least as large" : `at least ${floor.v} and may be larger`}.` : ""),
        safeExit: (n: number, top: { state: string; v: string } | null) =>
          (n === 1
            ? "This state had not closed its last danger zone by the top of the axis, so it takes the top rank."
            : "None of these had closed the last danger zone by the top of the axis, so any could be the highest; they share the top ranks the way a tie does.") +
          (top ? ` The highest measured safe exit is ${top.state}'s ${top.v}.` : ""),
      },
    },
    none: {
      heading: (n: number) => `No cliff found (${n})`,
      value: "no cliff",
      note: `No step down of ${money(CLIFF_MIN)} or more anywhere on this household's curve. A measurement of zero, not the smallest loss: these states are left out of the bins.`,
    },
    incomplete: {
      heading: (n: number) => `Not ranked — figures incomplete (${n})`,
      value: "not comparable",
      note: (n: number, programs: string[]) =>
        `${fmt.list(programs)} ${programs.length === 1 ? "is" : "are"} not modelled here, so a real cliff may be missing from ${n === 1 ? "this curve" : "these curves"}. ` +
        (n === 1 ? "This is not a low state; it is an unmeasured one." : "They are not low states; they are unmeasured ones."),
    },
    bins: "Bins are recomputed for every measure — equal-width steps of a dollar measure, classes of whole numbers for a count — so a shade means nothing across two different measures. Read the bin bounds, not the colour.",
  },
  table: {
    heading: (n: number) => `All ${n}, every measure`,
    order: {
      label: "Table order",
      state: "State, A to Z",
      /* One order per measure (N2): "Largest one-step loss, largest first" … "Deferred cliffs, most first". */
      measure: (title: string, count: boolean) => `${title}, ${count ? "most" : "largest"} first`,
      /** Said once, where the control is: the two controls are independent (rerun N3). */
      hint: "Orders this table only; the map and the ranking follow the Measure above.",
    },
    caption: (household: string, order: string, year: string, date: string) =>
      `All six measures for ${household}, ${order}. PolicyEngine ${year} rules, run of ${date}.`,
    byState: "by state",
    byMeasure: (title: string, count: boolean) => `by ${title.toLowerCase()}, ${count ? "most" : "largest"} first`,
    cols: { state: "State", biggestLoss: "Largest one-step loss", biggestLossAt: "Worst step", dangerWidth: "Danger zones, total width", leap: "The leap", safeExit: "Safe exit", cliffCount: "Cliffs", deferredCliffCount: "Deferred", figures: "Figures" },
    /** One sentence per column, where the headers are (rerun S3); the six measures reuse their own `describe`. */
    defs: {
      label: "What the columns mean",
      biggestLossAt: "The $1,000 step of earnings at which the largest one-step loss lands.",
      figures: "Complete, or the program the model cannot compute in that state, which makes the row's figures floors; and whether HotGap added the child-care subsidy to net income, where PolicyEngine had left it out.",
    },
    none: "none",
    complete: "complete",
    /** The row's own caveat, in its cell (S5). */
    floor: (programs: string[]) => `floor: ${fmt.list(programs)} not modelled`,
    /** The child-care subsidy's footing, in the Figures cell where HotGap added it (rerun S4), so two states read on the same footing without a click. */
    subsidyAdded: "child-care subsidy added by HotGap",
    /** The short amber word in the state cell, so the caveat is on screen at 390 without a swipe (S10). */
    floorMark: "floor",
    swipe: "Swipe for more →",
    note: "Every row keeps the number the model returned, including the rows it cannot complete, because a reporter needs to see what came back. Those rows are flagged in the last column and are not shaded on the map or placed in the ranking. Select a state on the map or in this table to read the corrections behind its numbers under the map; the arrow keys move between states and Enter selects.",
  },
  /* CorrectionsApplied (#18), IncompleteMarker (#16), otherBenefits and the state's SourceNote, for the selected state. */
  detail: {
    choose: "Corrections applied — choose a state",
    chooseSub: "Select a state on the map or in the table to read what HotGap changed on top of PolicyEngine before its figures were read.",
    heading: (state: string, n: number) => `Corrections applied in ${state} (${n})`,
    /** The chip on a correction core records without a source word (the coverage-gap premium): the CSV's own word (rerun N7). */
    applied: "applied",
    noBlock: "This run recorded no coverage block for this state.",
    changed: (state: string) => `What HotGap changed on top of PolicyEngine before any figure for ${state} was read.`,
    unchanged: (state: string) => `PolicyEngine's own figures for ${state} stand as served; HotGap changed nothing on top of them — the fixes other states need were not needed here.`,
    /** The child-care subsidy's footing, stated in every block (B2), from corrections.childcareSubsidy.source. */
    subsidy: (state: string, source: "in net income" | "added by HotGap") =>
      source === "added by HotGap" ? `Child-care subsidy: added by HotGap for ${state}.` : `Child-care subsidy: inside PolicyEngine's net income for ${state}.`,
    unmodeled: (state: string, n: number) => `Not modelled in ${state} (${n})`,
    incompleteTag: "figures incomplete",
    other: (state: string, n: number) => `Also in ${state}'s net income (${n})`,
    otherNote: (max: string) => `Up to ${max} a year on this run.`,
    variable: (name: string) => `PolicyEngine variable: ${name}`,
    /* EligibilityBoundary (#23): where energy assistance stops in the selected
       state, as one row in the ledger's shape — the program with its footing
       chip, three sentences (the limit in words, the worth if received, the
       share served as "about N in 10" with the figure), and the publishers as
       the cite with the day read. One row, because the block sits beside the
       ranked strip at 1280 and a taller block moves the table below with the
       selection. Never a measure, a bin or a sort. */
    liheap: {
      program: "Energy assistance (LIHEAP)",
      /** The chip beside the name: the row's footing, from corrections.liheap.source. */
      footing: { boundary: "not counted", inNetIncome: "in net income" } as const,
      /** The three facts, whole; a null amount or share says so in words, never as a number. */
      facts: (p: { limit: string; worth: { lo: string; hi: string | null; shape: LiheapShape | null } | null; share: number | null }) =>
        `Stops at ${p.limit}, the heating limit for ${LIHEAP_VINTAGE.limits}. ` +
        (p.worth === null ? "The state's matrix prints no amount at that band. "
          : `Worth ${p.worth.hi === null ? p.worth.lo : `${p.worth.lo} to ${p.worth.hi}`} a winter if received${p.worth.shape === "taper" ? "; the amount tapers toward the limit. " : p.worth.shape === "notch" ? ", flat to the limit. " : ", at that top income band. "}`) +
        (p.share === null ? `The share of income-eligible households served is not published for ${LIHEAP_VINTAGE.served}.` : servedLine(p.share)),
      served: servedLine,
      /** Michigan: the money is in every figure, as the credit core names. */
      counted: (state: string, program: string) => ` Paid as the ${program}, which is counted in every figure for ${state}.`,
      /** The publishers behind the row's figures, with the day they were read. */
      cite: (p: { limits: string; amounts: string | null; served: string | null; readOn: string }) => {
        const host = (u: string) => `[${new URL(u).hostname}](${u})`;
        const limitAndAmount = p.amounts && new URL(p.amounts).hostname === new URL(p.limits).hostname ? `Limit and amount: ${host(p.limits)}.` : `Limit: ${host(p.limits)}.${p.amounts ? ` Amount: ${host(p.amounts)}.` : ""}`;
        return `${limitAndAmount}${p.served ? ` Households served: ${host(p.served)}.` : ""} Read ${dayWords(p.readOn)}.`;
      },
    },
    care: { county: "county price", stateMedianCounty: "state median county price", nationalMedian: "national median price", unknown: "not recorded" } as Record<string, string>,
    /** SourceNote (#17), the county named (B4) and reach gone from this page (N9). */
    source: (v: { year: string; rentPublisher: string; rentVintage: string; county: string | null; countyVintage: string; care: string; careYear: string | null; model: string; date: string }) =>
      `Estimates only. Rules: ${v.year}. Rent: ${v.rentPublisher}; ${v.rentVintage}. ` +
      `County: ${v.county ? `${v.county} (the state's most populous; ${v.countyVintage})` : `the state's most populous, ${v.countyVintage}`}. ` +
      `Child-care price: ${v.care}${v.careYear ? `, ${v.careYear} study` : ""}, carried to ${v.year} dollars by the BLS Employment Cost Index. ` +
      `Model: ${v.model}. Weekly run of ${v.date}.`,
  },
  /** CSV cell words (the headers are a machine contract and live in csv.ts). */
  csv: {
    subsidy: { inNetIncome: "in PolicyEngine's net income", added: "added by HotGap" } as const,
  },
  method: {
    heading: "How these numbers were made",
    items: (year: string, columns: readonly string[]) => [
      `Every cell is one household shape run through [PolicyEngine](https://policyengine.org), an open-source tax-and-benefit calculator, at ${year} rules, earnings varied in $1,000 steps from $0 past 400% of the poverty guideline for that household size, plus $40,000 of room to recover.`,
      "The money line is **health-adjusted**: household net income minus what the household actually pays in health-insurance premiums, net of the marketplace subsidy. Deductibles and copays are not included.",
      `Each household is a typical renter in the state's most populous county — named under the map for the selected state — with HUD Fair Market Rent, Census county estimates, and the DOL National Database of Childcare Prices preschool price for that county, carried to ${year} dollars by the BLS Employment Cost Index. The study year behind the price, and whether a state or national median stood in for a county the database lacks, differ by state and are printed in the source line under the map.`,
      "The CCDF child care subsidy is **on** for this run and off for a household's own lookup. Head Start and housing vouchers are off in both: they are rationed, and assuming a family holds one inflates its numbers.",
      "Cliffs deferred to a future renewal — Head Start's program-year carry-over, a child's 12 months of continuous Medicaid or CHIP eligibility, a parent's Transitional Medical Assistance — are counted in the *deferred* column and are lifted out of every other figure here. They are real losses; they do not land in the year of the raise.",
      "Where a state's figure needed a correction on top of PolicyEngine — a premium ladder applied locally, the child care subsidy added back into net income, a parent Medicaid limit taken from the state's handbook, a coverage-gap premium — it is listed under the map for the selected state, from the run's own coverage record, not from copy kept here.",
      `The download is the table's rows in the table's order, one per state, with these columns: ${columns.join(", ")}. Empty dollar cells are a state with no cliff or a safe exit past the axis; the flags say which figures are floors or lower bounds.`,
    ],
    /** The axis the selected household was swept to, in dollars (rerun N9), with the states whose guidelines lengthen it. */
    axis: (household: string, top: string, exceptions: { state: string; top: string }[]) =>
      `For ${household} the axis runs from $0 to ${top}${exceptions.length ? ` (${exceptions.map((e) => `${e.top} in ${e.state}`).join(", ")})` : ""}; a figure that runs past the axis runs past that.`,
    excludes: {
      heading: "What the model does not include",
      inputs: "Immigration status, assets, and household members aged 65 or over are not inputs.",
      alaskaHawaii: `Alaska and Hawaii marketplace subsidies are computed upstream against the 48-state poverty guideline rather than their own higher ones ([reported to PolicyEngine](https://github.com/PolicyEngine/policyengine-us/issues/9482 "policyengine-us #9482")). HotGap does not correct this, so both states' premium-driven figures are understated.`,
      /** A gap every state shares, listed once here and never under a state (S8). */
      everywhere: (program: string, note: string) => `${program}, in every state: ${note}`,
      /** EligibilityBoundary (#23), once for the page: the served range with its two states and the states where the money is counted, from every block. */
      liheap: (lo: { state: string; share: number }, hi: { state: string; share: number }, counted: { state: string; program: string }[]) =>
        `Energy assistance (LIHEAP) is in no figure on this page${counted.length ? `, except in ${fmt.list(counted.map((c) => c.state))}, where it is paid as ${fmt.list([...new Set(counted.map((c) => `the ${c.program}`))])} and counted` : ""}. ` +
        `It is a block grant, not an entitlement: in ${LIHEAP_VINTAGE.served} the states served between ${Math.round(lo.share * 100)}% (${lo.state}) and ${Math.round(hi.share * 100)}% (${hi.state}) of their income-eligible households, ` +
        "so a curve that assumed it would draw a benefit most eligible families never receive. Each state's block under the map says where it stops, what it pays there and the share served; the download carries the limit and the share.",
      hatched: (household: string, where: string[]) =>
        `A program the model cannot compute in a state is listed under the map for that state and hatches it on every measure it could move. For ${household} today that is ${fmt.list(where)}.`,
      whereItem: (programs: string[], state: string) => `${programs.join(" and ")} in ${state}`,
      nothing: (household: string) => `Nothing the model cannot compute would move this household's figures in any state, so no state is hatched for ${household}.`,
    },
    hatchCaution: (programs: string[]) =>
      `**Hatched is not low.** A program the model cannot compute in a state${programs.length ? ` — today ${fmt.list(programs)}` : ""} — is missing from every figure for it, so its numbers are floors, not measurements. Do not write that those states are gentler; the only honest claim is that this model cannot yet say. The flag is read from the run's own coverage record, not from a list kept here, so a state drops off it the day the engine starts modelling the program.`,
    /* The worst and the last zone can differ (S9): an exact leap beside an unknown safe exit is one state, not a contradiction. */
    pastAxisCaution: "**Past the axis is not a number.** Where a state's *last* danger zone runs off the top of the axis rather than closing, the safe exit is unknown; the leap is a lower bound only when the *worst* zone is the one that runs off. The two can differ, so a state can show an exact leap and no safe exit. Those cells read *past the axis* here and must not be charted as a value.",
    source: (date: string, model: string) => `Run of ${date} on ${model}. Licence: AGPL-3.0-only. Estimates only — a caseworker decides real benefits.`,
    /** A suggested citation, from the run's own facts and the page's own address (N13). */
    cite: (year: string, model: string, date: string, url: string) =>
      `Cite as: HotGap, *What a raise costs, state by state*, ${year} rules on PolicyEngine (${model}), run of ${date}, ${url}.`,
  },
};
