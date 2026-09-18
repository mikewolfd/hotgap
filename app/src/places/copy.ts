// Every string the journalist surface shows, in one place, in the reporter's
// register, in the one copy shape (lib/copy.ts): whole messages with
// {slots}, variants keyed by what chooses them, no function and no
// formatter. The skeleton in places.html holds ids; render.ts fills them
// from here, words.ts composes the sentences that have variants. Every
// figure arrives formatted by lib/format.ts; program names are the `name`
// register (lib/programs.ts, M3); state names and the cliff floor are
// core's. Nothing a figure says is typed here: every number is a slot.
//
// A sentence may carry a link or an emphasis as `[text](url "title")`,
// `*em*` or `**strong**`; render.ts's `rich()` is the only reader of that
// notation, and it escapes everything else.
import { bind } from "../lib/copy.js";

export const copy = {
  pageTitle: "HotGap — what a raise costs, state by state",
  wordmark: "HotGap",
  skip: "Skip to the data table",
  title: "What a raise costs, state by state",
  lede: {
    /** The counted sentence, written whole once the data is in (S6); "one axis" said as what it is (N12); the states counted as a reader counts them (rerun N11). The trailing space joins it to the figure sentence in its own element. */
    counted: {
      withDc: "{states} states and the District of Columbia, {households} household shapes, one earnings scale — from $0 past 400% of the poverty line for that household. ",
      plain: "{states} states, {households} household shapes, one earnings scale — from $0 past 400% of the poverty line for that household. ",
    },
    figure: "Each figure is the worst single $1,000 step of earnings in that state's curve for that household — how much net income falls when pay goes up by a thousand dollars.",
    /** One glossary sentence, from core's floor (S3), and PolicyEngine introduced on first use (S6). */
    glossary: "A *cliff* is a $1,000 raise that cuts net income by {floor} or more; a *danger zone* is a run of earnings across which the household never gets ahead. The figures come from [PolicyEngine](https://policyengine.org), an open-source tax-and-benefit calculator, run by HotGap. Estimates only.",
  },
  status: {
    loading: "Loading the weekly run…",
    failed: "We could not load the weekly run: {reason}. Reload to try again.",
    http: "the data file answered HTTP {status}",
  },
  filters: { household: "Household", measure: "Measure", csv: "Download these rows (CSV)" },
  /* The six measures pipeline/src/metrics.ts writes, in the FilterRow's order. Each option stands on its own (S2). */
  measures: {
    biggestLoss: { title: "Largest one-step loss", option: "Largest one-step loss ($)", describe: "Net income lost in the worst single $1,000 step of earnings." },
    /* The pipeline sums every zone (metrics.ts); the widest one's width is the leap. The earlier label, "the worst danger zone", described the leap. */
    dangerWidth: { title: "Total width of the danger zones", option: "Total width of the danger zones — every stretch where more pay leaves the household no better off, added together ($)", describe: "Earnings spanned by every stretch where more pay leaves the household no better off, all such stretches added together." },
    leap: { title: "The leap", option: "The leap — the raise needed to clear the worst danger zone ($)", describe: "The raise a household must clear in one move to get past its worst danger zone." },
    safeExit: { title: "Safe exit", option: "Safe exit — earnings above which no danger zone remains ($)", describe: "Earnings above which no danger zone remains: where the last one closes." },
    cliffCount: { title: "Number of cliffs", option: "Number of cliffs", describe: "Steps down of {floor} or more anywhere on the curve." },
    deferredCliffCount: { title: "Deferred cliffs", option: "Deferred cliffs — of the cliffs counted, those that land at a later renewal",
      /* The three mechanisms named where the map is chosen, not six bullets down (S4). */
      describe: "Of the cliffs counted, those that land at a later renewal rather than with the raise: Head Start's program-year carry-over, a child's 12 months of continuous Medicaid or CHIP, a parent's Transitional Medical Assistance." },
  },
  /** The household as the reader knows it (S10 of the first review): "1 adult, 2 children (3 and 7)". */
  household: {
    line: "{adults}, {children}",
    adults: { single: "1 adult", bothWork: "2 adults, both working", oneWorks: "2 adults, one working" },
    children: { none: "no children", one: "{n} child ({ages})", other: "{n} children ({ages})" },
  },
  pastAxis: "past the axis",
  figure: {
    title: "{measure}, by state",
    /** The household as the reader knows it, and its tenure, which every household shares (rerun N10). */
    sub: "{household}, renting in the state's most populous county. {describe}",
    description: "A grid of the fifty states and the District of Columbia, each a square in roughly its geographic position, shaded by the selected measure. A state with no cliff is an empty square; a state whose figure runs past the axis has a dashed edge; a state the model cannot complete is hatched rather than shaded. Each square is a button that opens that state's corrections under the map; the arrow keys move between squares and Enter selects. Every value is listed in the table below this figure.",
    tile: {
      value: "{state}: {value}",
      none: "{state}: no cliff found",
      past: "{state}: past the axis",
      incomplete: "{state}: {programs} not modelled — figures incomplete",
    },
    legend: {
      none: "No cliff found ({n})",
      past: "Runs past the top of the axis ({n})",
      incomplete: "{programs} not modelled — figures incomplete, not low ({n})",
    },
    bins: {
      steps: "five equal-width steps from {lo} to {hi}",
      classes: { one: "{n} class from {lo} to {hi}", other: "{n} classes from {lo} to {hi}" },
    },
    /** The map's own provenance and bins, one line (N7: a run, not a sweep): its sentences, joined. */
    source: "HotGap, from PolicyEngine {year} rules on {model}. Weekly run of {date}. Net income after health-insurance premiums. Estimates only.",
    binsLine: {
      plain: "Bins: {bins} over the {comparable} states with a comparable figure.",
      none: "Bins: {bins} over the {comparable} states with a comparable figure; {none} with no cliff found.",
      past: "Bins: {bins} over the {comparable} states with a comparable figure; {past} past the axis.",
      nonePast: "Bins: {bins} over the {comparable} states with a comparable figure; {none} with no cliff found; {past} past the axis.",
    },
    hatched: {
      oneOne: "One state is hatched: {programs} is not modelled there, so its figures are incomplete and are not shaded or ranked.",
      oneOther: "One state is hatched: {programs} are not modelled there, so its figures are incomplete and are not shaded or ranked.",
      otherOne: "{n} states are hatched: {programs} is not modelled there, so their figures are incomplete and are not shaded or ranked.",
      otherOther: "{n} states are hatched: {programs} are not modelled there, so their figures are incomplete and are not shaded or ranked.",
    },
    /** When one class holds nine states in ten, the near-monochrome map explains itself (N11). */
    oneClass: {
      countNone: "{n} of the {total} comparable states have none.",
      countValue: "{n} of the {total} comparable states have {value}.",
      countRange: "{n} of the {total} comparable states have {lo} to {hi}.",
      dollars: "{n} of the {total} comparable states fall between {lo} and {hi}.",
    },
  },
  /* The state readout beside the map (B3, B4, S1): the selected measure's
     figure in its own sentence, then the worst step where it is not the
     measure (rerun B2), then the county. Slots arrive already marked by render.ts. */
  readout: {
    empty: "Select a state on the map or in the table.",
    /** The worst step, leading, on the one-step-loss measure. */
    step: {
      one: "{state} — {loss} lost at {step}, when {programs} ends.",
      other: "{state} — {loss} lost at {step}, when {programs} end.",
      none: "{state} — {loss} lost at {step}; no single program explains the drop.",
    },
    floor: {
      oneOne: "{state} — at least {loss} lost at {step}, when {programs} ends; a floor, because {missing} is not modelled.",
      oneOther: "{state} — at least {loss} lost at {step}, when {programs} ends; a floor, because {missing} are not modelled.",
      otherOne: "{state} — at least {loss} lost at {step}, when {programs} end; a floor, because {missing} is not modelled.",
      otherOther: "{state} — at least {loss} lost at {step}, when {programs} end; a floor, because {missing} are not modelled.",
      noneOne: "{state} — at least {loss} lost at {step}; a floor, because {missing} is not modelled.",
      noneOther: "{state} — at least {loss} lost at {step}; a floor, because {missing} are not modelled.",
    },
    /** The worst step as the second line, under another measure's sentence. */
    worstStep: {
      one: "Worst step: {loss} lost at {step}, when {programs} ends.",
      other: "Worst step: {loss} lost at {step}, when {programs} end.",
      none: "Worst step: {loss} lost at {step}; no single program explains the drop.",
    },
    worstStepFloor: {
      oneOne: "Worst step: at least {loss} lost at {step}, when {programs} ends; a floor, because {missing} is not modelled.",
      oneOther: "Worst step: at least {loss} lost at {step}, when {programs} ends; a floor, because {missing} are not modelled.",
      otherOne: "Worst step: at least {loss} lost at {step}, when {programs} end; a floor, because {missing} is not modelled.",
      otherOther: "Worst step: at least {loss} lost at {step}, when {programs} end; a floor, because {missing} are not modelled.",
      noneOne: "Worst step: at least {loss} lost at {step}; a floor, because {missing} is not modelled.",
      noneOther: "Worst step: at least {loss} lost at {step}; a floor, because {missing} are not modelled.",
    },
    /** The selected measure's own sentence (rerun B2); a figure the axis bounds says past what, in dollars (S6, N9). */
    measure: {
      dangerWidth: "{state} — {width} of earnings lie inside danger zones.",
      dangerWidthOpen: "{state} — at least {width} of earnings lie inside danger zones; the last one had not closed by {top}, the top of the axis.",
      leap: "{state} — a raise of {leap} clears the worst danger zone.",
      leapAtLeast: "{state} — a raise of at least {leap} to clear the worst danger zone, which runs past {top}, the top of the axis.",
      safeExit: "{state} — no danger zone left above {exit}.",
      safeExitPast: "{state} — no safe exit found: the last danger zone had not closed by {top}, the top of the axis.",
      cliffCount: {
        oneNone: "{state} — 1 cliff on this household's curve, none deferred.",
        otherNone: "{state} — {n} cliffs on this household's curve, none deferred.",
        oneSome: "{state} — 1 cliff on this household's curve, and {deferred} more deferred to a later renewal.",
        otherSome: "{state} — {n} cliffs on this household's curve, and {deferred} more deferred to a later renewal.",
      },
      deferred: {
        noneOne: "{state} — no cliff deferred to a later renewal; its one cliff lands with the raise.",
        noneOther: "{state} — no cliff deferred to a later renewal; all {n} land with the raise.",
        oneOne: "{state} — 1 cliff deferred to a later renewal, on top of {n} that lands with the raise.",
        oneOther: "{state} — 1 cliff deferred to a later renewal, on top of {n} that land with the raise.",
        otherOne: "{state} — {deferred} cliffs deferred to a later renewal, on top of {n} that lands with the raise.",
        otherOther: "{state} — {deferred} cliffs deferred to a later renewal, on top of {n} that land with the raise.",
      },
      /** Appended to the measure's sentence for a hatched state: its figure is a floor. */
      floorTail: { one: "Incomplete: {missing} is not modelled, so the figure is a floor.", other: "Incomplete: {missing} are not modelled, so the figure is a floor." },
    },
    /** What the model found instead of a cliff (rerun S6): the data's own reason, never a guessed cause. */
    none: "{state} — no cliff found: no {step} step of earnings on this household's curve cut net income by {floor} or more, up to {top}.",
    noneDeferred: {
      one: "{state} — no cliff lands with the raise: no {step} step of earnings on this household's curve cut net income by {floor} or more in the year of the raise, up to {top}; 1 cliff is deferred to a later renewal.",
      other: "{state} — no cliff lands with the raise: no {step} step of earnings on this household's curve cut net income by {floor} or more in the year of the raise, up to {top}; {deferred} cliffs are deferred to a later renewal.",
    },
    renter: { county: "Renter, {county}.", unknown: "Renter in the state's most populous county." },
    details: "Details below ↓",
  },
  rank: {
    heading: "Ranked",
    /** The row's accessible name: its rank, the state, the value — and, on the one-step loss, the step's earnings (S5). */
    row: { plain: "{rank} {state}: {value}", withAt: "{rank} {state}: {value}, {at}" },
    /** "at $38,000": where the worst step begins, beside the loss (rerun S5). */
    at: "at {value}",
    /** "30." — a rank ordinal in the strip (N3); "1–12" the range a lower-bound group shares, the way a tie shares one rank (rerun B1). */
    ordinal: "{n}.",
    range: { one: "1.", other: "1–{n}" },
    /** "$26,206 (floor)": a figure the model could not complete, so it can only be low (S5); "≥ $53,000": a leap the axis bounded from above. */
    floor: "{value} (floor)",
    atLeast: "≥ {value}",
    /** The step a figure names: "$38,000 → $39,000". */
    step: "{from} → {to}",
    lower: {
      /* Lower-bound rows lead the order under their own heading (B1) and
         share the top ranks the way a tie shares one rank (rerun B1): the
         leap's floor is a figure; a safe exit past the axis is not. */
      leap: { one: "Rank 1 — at least this much; the exact size runs past the axis (1)", other: "Ranks 1–{n} shared — at least this much; the exact size runs past the axis ({n})" },
      safeExit: { one: "Rank 1 — past the top of the axis; no safe exit found on the scale (1)", other: "Ranks 1–{n} shared — past the top of the axis; no safe exit found on the scale ({n})" },
      /** Why the ranks are shared, and the one thing the data lets a reader say about the worst: two sentences, the second only with a measured figure to name. */
      note: {
        leap: { one: "This state could need the largest raise — the axis ends before the worst zone closes — so it takes the top rank.", other: "Any of these could need the largest raise — the axis ends before the worst zone closes — so they share the top ranks the way a tie does." },
        leapTop: { reaches: "The largest measured leap is {topState}'s {topValue}; {floorState}'s is at least as large.", larger: "The largest measured leap is {topState}'s {topValue}; {floorState}'s is at least {floorValue} and may be larger." },
        safeExit: { one: "This state had not closed its last danger zone by the top of the axis, so it takes the top rank.", other: "None of these had closed the last danger zone by the top of the axis, so any could be the highest; they share the top ranks the way a tie does." },
        safeExitTop: "The highest measured safe exit is {topState}'s {topValue}.",
      },
    },
    none: {
      heading: "No cliff found ({n})",
      value: "no cliff",
      note: "No step down of {floor} or more anywhere on this household's curve. A measurement of zero, not the smallest loss: these states are left out of the bins.",
    },
    incomplete: {
      heading: "Not ranked — figures incomplete ({n})",
      value: "not comparable",
      note: {
        oneOne: "{programs} is not modelled here, so a real cliff may be missing from this curve. This is not a low state; it is an unmeasured one.",
        oneOther: "{programs} are not modelled here, so a real cliff may be missing from this curve. This is not a low state; it is an unmeasured one.",
        otherOne: "{programs} is not modelled here, so a real cliff may be missing from these curves. They are not low states; they are unmeasured ones.",
        otherOther: "{programs} are not modelled here, so a real cliff may be missing from these curves. They are not low states; they are unmeasured ones.",
      },
    },
    bins: "Bins are recomputed for every measure — equal-width steps of a dollar measure, classes of whole numbers for a count — so a shade means nothing across two different measures. Read the bin bounds, not the colour.",
  },
  table: {
    heading: "All {n}, every measure",
    order: {
      label: "Table order",
      state: "State, A to Z",
      /* One order per measure (N2): "Largest one-step loss, largest first" … "Deferred cliffs, most first". */
      measure: { dollars: "{title}, largest first", count: "{title}, most first" },
      /** Said once, where the control is: the two controls are independent (rerun N3). */
      hint: "Orders this table only; the map and the ranking follow the Measure above.",
    },
    caption: "All six measures for {household}, {order}. PolicyEngine {year} rules, run of {date}.",
    byState: "by state",
    byMeasure: { dollars: "by {title}, largest first", count: "by {title}, most first" },
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
    floor: "floor: {programs} not modelled",
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
    heading: "Corrections applied in {state} ({n})",
    /** The chip on a correction core records without a source word (the coverage-gap premium): the CSV's own word (rerun N7). */
    applied: "applied",
    noBlock: "This run recorded no coverage block for this state.",
    changed: "What HotGap changed on top of PolicyEngine before any figure for {state} was read.",
    unchanged: "PolicyEngine's own figures for {state} stand as served; HotGap changed nothing on top of them — the fixes other states need were not needed here.",
    /** The child-care subsidy's footing, stated in every block (B2), from corrections.childcareSubsidy.source. */
    subsidy: { added: "Child-care subsidy: added by HotGap for {state}.", inNetIncome: "Child-care subsidy: inside PolicyEngine's net income for {state}." },
    unmodeled: "Not modelled in {state} ({n})",
    incompleteTag: "figures incomplete",
    other: "Also in {state}'s net income ({n})",
    otherNote: "Up to {max} a year on this run.",
    variable: "PolicyEngine variable: {name}",
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
      footing: { boundary: "not counted", inNetIncome: "in net income" },
      /** The three facts, one sentence each, joined; a null amount or share says so in words, never as a number. */
      limit: "Stops at {limit}, the heating limit for {vintage}.",
      worth: {
        unread: "The state's matrix prints no amount at that band.",
        flatTaper: "Worth {lo} a winter if received; the amount tapers toward the limit.",
        flatNotch: "Worth {lo} a winter if received, flat to the limit.",
        flatOther: "Worth {lo} a winter if received, at that top income band.",
        rangeTaper: "Worth {lo} to {hi} a winter if received; the amount tapers toward the limit.",
        rangeNotch: "Worth {lo} to {hi} a winter if received, flat to the limit.",
        rangeOther: "Worth {lo} to {hi} a winter if received, at that top income band.",
      },
      /** The served share as the citizen hears it, with the figure a reporter quotes — "About 2 in 10 income-eligible households were served in FY2024 (22%)." */
      served: {
        few: "Fewer than 1 in 10 income-eligible households were served in {vintage} ({pct}%).",
        some: "About {n} in 10 income-eligible households were served in {vintage} ({pct}%).",
        most: "Almost all income-eligible households were served in {vintage} ({pct}%).",
        unread: "The share of income-eligible households served is not published for {vintage}.",
      },
      /** Michigan: the money is in every figure, as the credit core names. */
      counted: "Paid as the {program}, which is counted in every figure for {state}.",
      /** The publishers behind the row's figures, with the day they were read: one sentence each, joined. */
      cite: {
        limitAndAmount: "Limit and amount: {host}.",
        limit: "Limit: {host}.",
        amount: "Amount: {host}.",
        served: "Households served: {host}.",
        readOn: "Read {readOn}.",
        link: "[{host}]({url})",
      },
    },
    care: { county: "county price", stateMedianCounty: "state median county price", nationalMedian: "national median price", unknown: "not recorded" } as Record<string, string>,
    /** SourceNote (#17), the county named (B4) and reach gone from this page (N9). */
    source: "Estimates only. Rules: {year}. Rent: {rentPublisher}; {rentVintage}. County: {county}. Child-care price: {care}, carried to {year} dollars by the BLS Employment Cost Index. Model: {model}. Weekly run of {date}.",
    sourceCounty: { named: "{county} (the state's most populous; {vintage})", unnamed: "the state's most populous, {vintage}" },
    sourceCare: { dated: "{care}, {year} study", undated: "{care}" },
  },
  /** CSV cell words (the headers are a machine contract and live in csv.ts). */
  csv: {
    subsidy: { inNetIncome: "in PolicyEngine's net income", added: "added by HotGap" },
    /** "HotGap hosted engine, policyengine-us 2.6.2" — the model as a label a spreadsheet can carry (N8). */
    modelLabel: { hosted: "HotGap hosted engine, {model}", publicApi: "PolicyEngine public API ({endpoint})" },
  },
  method: {
    heading: "How these numbers were made",
    items: {
      engine: "Every cell is one household shape run through [PolicyEngine](https://policyengine.org), an open-source tax-and-benefit calculator, at {year} rules, earnings varied in $1,000 steps from $0 past 400% of the poverty guideline for that household size, plus $40,000 of room to recover.",
      money: "The money line is **health-adjusted**: household net income minus what the household actually pays in health-insurance premiums, net of the marketplace subsidy. Deductibles and copays are not included.",
      household: "Each household is a typical renter in the state's most populous county — named under the map for the selected state — with HUD Fair Market Rent, Census county estimates, and the DOL National Database of Childcare Prices preschool price for that county, carried to {year} dollars by the BLS Employment Cost Index. The study year behind the price, and whether a state or national median stood in for a county the database lacks, differ by state and are printed in the source line under the map.",
      takeUp: "The CCDF child care subsidy is **on** for this run and off for a household's own lookup. Head Start and housing vouchers are off in both: they are rationed, and assuming a family holds one inflates its numbers.",
      deferred: "Cliffs deferred to a future renewal — Head Start's program-year carry-over, a child's 12 months of continuous Medicaid or CHIP eligibility, a parent's Transitional Medical Assistance — count in every figure here, because the household loses the money. The *deferred* column says how many of the counted cliffs are of that kind: the loss lands at a later renewal, not in the year of the raise.",
      corrections: "Where a state's figure needed a correction on top of PolicyEngine — a premium ladder applied locally, the child care subsidy added back into net income, a parent Medicaid limit taken from the state's handbook, a coverage-gap premium — it is listed under the map for the selected state, from the run's own coverage record, not from copy kept here.",
      download: "The download is the table's rows in the table's order, one per state, with these columns: {columns}. Empty dollar cells are a state with no cliff or a safe exit past the axis; the flags say which figures are floors or lower bounds.",
    },
    /** The axis the selected household was swept to, in dollars (rerun N9), with the states whose guidelines lengthen it. */
    axis: {
      plain: "For {household} the axis runs from $0 to {top}; a figure that runs past the axis runs past that.",
      exceptions: "For {household} the axis runs from $0 to {top} ({exceptions}); a figure that runs past the axis runs past that.",
    },
    exception: "{top} in {state}",
    excludes: {
      heading: "What the model does not include",
      inputs: "Immigration status, assets, and household members aged 65 or over are not inputs.",
      alaskaHawaii: "Alaska and Hawaii marketplace subsidies are computed upstream against the 48-state poverty guideline rather than their own higher ones ([reported to PolicyEngine](https://github.com/PolicyEngine/policyengine-us/issues/9482 \"policyengine-us #9482\")). HotGap does not correct this, so both states' premium-driven figures are understated.",
      /** A gap every state shares, listed once here and never under a state (S8). */
      everywhere: "{program}, in every state: {note}",
      /** EligibilityBoundary (#23), once for the page: the served range with its two states and the states where the money is counted, from every block. */
      liheap: {
        none: "Energy assistance (LIHEAP) is in no figure on this page.",
        counted: "Energy assistance (LIHEAP) is in no figure on this page, except in {states}, where it is paid as {programs} and counted.",
        grant: "It is a block grant, not an entitlement: in {vintage} the states served between {loPct}% ({loState}) and {hiPct}% ({hiState}) of their income-eligible households, so a curve that assumed it would draw a benefit most eligible families never receive. Each state's block under the map says where it stops, what it pays there and the share served; the download carries the limit and the share.",
        the: "the {program}",
      },
      hatched: "A program the model cannot compute in a state is listed under the map for that state and hatches it on every measure it could move. For {household} today that is {where}.",
      whereItem: "{programs} in {state}",
      nothing: "Nothing the model cannot compute would move this household's figures in any state, so no state is hatched for {household}.",
    },
    hatchCaution: {
      some: "**Hatched is not low.** A program the model cannot compute in a state — today {programs} — is missing from every figure for it, so its numbers are floors, not measurements. Do not write that those states are gentler; the only honest claim is that this model cannot yet say. The flag is read from the run's own coverage record, not from a list kept here, so a state drops off it the day the engine starts modelling the program.",
      none: "**Hatched is not low.** A program the model cannot compute in a state is missing from every figure for it, so its numbers are floors, not measurements. Do not write that those states are gentler; the only honest claim is that this model cannot yet say. The flag is read from the run's own coverage record, not from a list kept here, so a state drops off it the day the engine starts modelling the program.",
    },
    /* The worst and the last zone can differ (S9): an exact leap beside an unknown safe exit is one state, not a contradiction. */
    pastAxisCaution: "**Past the axis is not a number.** Where a state's *last* danger zone runs off the top of the axis rather than closing, the safe exit is unknown; the leap is a lower bound only when the *worst* zone is the one that runs off. The two can differ, so a state can show an exact leap and no safe exit. Those cells read *past the axis* here and must not be charted as a value.",
    source: "Run of {date} on {model}. Licence: AGPL-3.0-only. Estimates only — a caseworker decides real benefits.",
    /** A suggested citation, from the run's own facts and the page's own address (N13). */
    cite: "Cite as: HotGap, *What a raise costs, state by state*, {year} rules on PolicyEngine ({model}), run of {date}, {url}.",
  },
};

export const t = bind(copy);
