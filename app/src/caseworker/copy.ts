// Every string the caseworker surface shows, in one place, in the
// caseworker register (app/README.md § Languages: one copy module per
// surface until the locale files land; a sentence with values is a function
// of them, whole, never fragments joined). `editor` is the register laid
// over the citizen editor's words (mountEditor's `copy`); program names come
// from lib/programs.ts (M3) and state names from core. Numbers, money and
// lists go through Intl with `locale`, the one place it is named.
import type { PayUnit, ProgramId } from "@hotgap/core";
import { money as usd, unitPhrase } from "../lib/format.js";
import { programName, programPhrase } from "../lib/programs.js";
import { reachWord } from "../places/format.js";

export const locale = "en-US";

const listFormat = new Intl.ListFormat(locale, { type: "conjunction" });
const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
const ordinalRules = new Intl.PluralRules(locale, { type: "ordinal" });
const ORDINAL: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };

/** Formatting in the active locale: the money helper is the shell's (lib/format.ts) and is passed through. */
export const fmt = {
  money: usd,
  /** "−$25,449": a loss, with a true minus. */
  loss: (n: number): string => `−${usd(Math.abs(n))}`,
  /** "+$1,590" / "−$875": a signed share. */
  signed: (n: number): string => `${n < 0 ? "−" : "+"}${usd(Math.abs(n))}`,
  /** "40th". */
  ordinal: (n: number): string => `${n}${ORDINAL[ordinalRules.select(n)]}`,
  /** "a", "a and b", "a, b, and c". */
  list: (xs: string[]): string => listFormat.format(xs),
  /** The sweep stamp as a date. */
  date: (iso: string): string => dateFormat.format(new Date(iso)),
  /** "$38,000 a year", "$18.50 an hour". */
  pay: (amount: number, unit: PayUnit): string => `${unit === "hour" ? `$${amount.toFixed(2)}` : usd(amount)} ${unitPhrase(unit)}`,
  /** A tick: "$0", "$60k". */
  tick: (v: number): string => (v === 0 ? "$0" : `$${Math.round(v / 1000)}k`),
  adults: (married: boolean): string => (married ? "2 adults" : "1 adult"),
  kids: (n: number): string => (n === 1 ? "1 child" : `${n} children`),
  count: (n: number): string => ["no", "one", "two", "three"][n] ?? String(n),
};

const $ = usd;

export const copy = {
  /* The editor in the caseworker register: the household is the client's, named in the third person. */
  editor: {
    summary: { none: "Enter the household to evaluate it.", edit: "Edit" },
    heading: "The household",
    lead: "Place, household, pay and monthly costs. Net income is evaluated at every pay level on the axis.",
    privacy: "Nothing typed here is stored.",
    place: { legend: "Place", zip: "ZIP code", zipHint: "Five digits; it sets the state and the county.", or: "Or the state", statePlaceholder: "Choose a state", inState: (state: string) => `In ${state}.` },
    household: { legend: "Household", adults: "Adults", single: "One adult", married: "Two adults, married", kids: "Children in the household", kidsHint: "Under 18. Up to six.", kidAge: (n: number) => `Age of child ${n}` },
    pay: { legend: "Pay", amount: "Pay, before taxes", unit: "Per", hours: "Hours a week", hoursHint: "Blank assumes 40." },
    costs: { legend: "Monthly costs", rent: "Rent or mortgage", childcare: "Child care", typical: (amount: string, where: string) => `Typical in ${where}: ${amount} a month. Change it if the household's differs.`, none: "0 if nothing is paid." },
    submit: "Update the household",
    chips: {
      where: "Place", household: "Household", pay: "Pay", rent: "Rent", childcare: "Child care",
      age: "Age", spouseAge: "Spouse's age", spousePay: "Spouse's pay",
      ssdi: "SSDI", childSupport: "Child support", unemployment: "Unemployment", savings: "Savings",
      status: "Status", spouseStatus: "Spouse's status", kidsDisabled: "Children with a disability",
      childcareSubsidy: "CCDF subsidy", headStart: "Head Start", housing: "Housing voucher",
      employerCoverage: "Employer coverage", selfEmployed: "Self-employed", disabled: "Disability", spouseDisabled: "Spouse's disability",
      snap: "SNAP", tanf: "TANF", medicaid: "Medicaid", wic: "WIC",
      yes: "on", no: "off",
    },
    errors: {
      check: (label: string) => `Check ${label}.`,
      fields: {
        zip: "the ZIP code", state: "the ZIP code or state", annualEarnings: "the pay", hoursPerWeek: "the hours", childAges: "the children's ages",
        age: "the age", spouseAge: "the spouse's age", monthlyRent: "the rent", monthlyChildcare: "the child care cost",
        spouseAnnualEarnings: "the spouse's pay", ssdiMonthly: "SSDI", childSupportMonthly: "child support", unemploymentMonthly: "unemployment pay",
        savings: "savings", youStatus: "the status", spouseStatus: "the spouse's status", youYearsInUs: "years in the US",
        spouseYearsInUs: "the spouse's years in the US", childDisabled: "which children have a disability", countyFips: "the county",
      } as Record<string, string>,
    },
  },
  /* The chips a counselor what-ifs first: the six facts, then the take-up toggles, then the rest in the citizen order. */
  chipOrder: ["where", "household", "pay", "rent", "childcare", "childcare-subsidy", "head-start", "housing", "employer-coverage", "no-snap", "no-tanf", "no-medicaid", "no-wic", "self-employed", "disabled", "spouse-disabled"],

  actions: {
    whatIf: "Add a what-if", whatIfShort: "What-if",
    print: "Print the client sheet", printShort: "Print",
    addAsWhatIf: "Add as a what-if",
  },

  page: {
    title: "Benefits cliffs for one household, with what-ifs",
    skip: "Skip to the threshold ledger",
    coverageHeading: (state: string) => `Model coverage in ${state}`,
    correctionsHeading: (state: string) => `Corrections applied in ${state}`,
    readoutHint: "Arrow keys, or drag, to read any point. Square brackets step between cliffs.",
    dropsHeading: "Every step down",
    dropsCaption: "Select a row or its mark for the breakdown.",
    dropsCols: { earnings: "Earnings", drop: "Drop", lost: "Programs lost", driver: "Driver" },
    breakdownFootnote: "The four shares sum to the drop exactly. A share right of zero adds to the loss; one left of it offsets the loss — here, a falling tax bill. Medicaid and CHIP never appear: their value is a coverage sticker price, never cash, so it cannot move net income. A child losing coverage shows in programs lost instead.",
    ledgerHeading: "Where each program ends",
    ledgerCaption: "A program ends at the first pay at which it is gone. Adults and children are reported separately — a parent usually loses coverage far below a child’s limit.",
    ledgerCols: { earnings: "Earnings", program: "Program", who: "Who" },
    compareHeading: "Compare",
    compareCaption: "The same rules asked of each what-if.",
    compareEmpty: "No what-if yet. Press a take-up chip, or change a value in the bar above, to add one beside the base.",
    assumptionsHeading: "What this model does not include",
  },

  status: {
    loading: (count: number) => `Evaluating… net income is checked at ${count} pay levels. A household not seen before takes a few seconds.`,
    errorTitle: "The evaluation did not come back.",
    errors: {
      rate_limited: "Too many evaluations in a minute. Wait a minute and try again.",
      busy: "The engine is busy. Try again in a few seconds.",
      other: "The engine did not reply. Nothing was saved. Try again in a minute.",
      badInput: (detail: string) => `Not a household: ${detail}.`,
    },
    tryAgain: "Try again",
  },

  whatIf: {
    added: (label: string) => `What-if added: ${label}, evaluated beside the base under`,
    addedAfterLink: ". The chips show the base.",
    compareLink: "Compare",
    removed: (label: string) => `What-if removed: ${label}.`,
    already: (label: string) => `${label} is already compared.`,
    now: "Now",
    computing: "computing",
    failed: "did not come back",
    /** B1: the fallback's curve is the base's own, so the column has no figure. */
    notInSweep: "not in the sweep — needs the live call",
    archetype: "(archetype)",
    thisWhatIf: "This what-if",
    remove: "Remove",
    removeAria: (title: string) => `Remove the what-if ${title}`,
    ellipsis: "…",
    dash: "—",
    /* A what-if's name from what it changes (scenarios.ts). */
    on: "on", off: "off", married: "Married", single: "Single",
    cleared: (label: string) => `${label} cleared`,
    place: (where: string) => `Place ${where}`,
    payOf: (amount: number, unit: PayUnit) => `Pay ${fmt.pay(amount, unit)}`,
    monthly: (label: string, amount: number) => `${label} ${$(amount)} a month`,
    yearly: (label: string, amount: number) => `${label} ${$(amount)} a year`,
    figure: (label: string, amount: number) => `${label} ${$(amount)}`,
    children: (ages: string[]) => `Children ${ages.join(" & ")}`,
    valued: (label: string, value: string) => `${label} ${value}`,
    toggled: (label: string, on: boolean) => `${label} ${on ? "on" : "off"}`,
    names: {
      zip: "ZIP", state: "State", county: "County", age: "Age", "spouse-age": "Spouse's age", kids: "Children", "kids-disabled": "Children with a disability",
      rent: "Rent", childcare: "Child care", earnings: "Earnings", pay: "Pay", unit: "Pay unit", hours: "Hours a week", "spouse-earnings": "Spouse's pay",
      ssdi: "SSDI", "child-support": "Child support", unemployment: "Unemployment", savings: "Savings", status: "Status", "spouse-status": "Spouse's status",
      "years-in-us": "Years in the US", "spouse-years-in-us": "Spouse's years in the US",
    } as Record<string, string>,
  },

  verdict: {
    alwaysUp: "No danger zone. Net rises with every step of earnings on the axis.",
    cliffAhead: (at: number, drop: number) => `A cliff ahead: at ${$(at)} net drops ${$(drop)}. Below it, more pay is more money.`,
    cliffBehind: "Past the cliff. The big drop is below current earnings; from here, more pay is more money.",
    stuck: (start: number, top: number, peak: number) => `In a danger zone with no exit on the axis. From ${$(start)} up to ${$(top)} of earnings, net never gets back to the ${$(peak)} it reaches at ${$(start)}.`,
    inZone: (start: number, exit: number, peak: number, raise: number) => `In a danger zone. Between ${$(start)} and ${$(exit)} of earnings, net never gets back to the ${$(peak)} it reaches at ${$(start)}. Clear at ${$(exit)}: a raise of ${$(raise)}.`,
    again: (exit: number, safe: number) => `It happens again between ${$(exit)} and ${$(safe)}.`,
    safeFrom: (safe: number, leap: number, lowerBound: boolean) => `Safe from ${$(safe)}: a raise of ${$(leap)}${lowerBound ? " or more" : ""}.`,
    neverSafe: "The sweep never found a pay past which no zone remains.",
  },

  tiles: {
    net: "Net, after premiums", netSub: (earned: number) => `at ${$(earned)} earned`,
    raise: "Raise to clear the zone", raiseTo: (exit: number) => `to ${$(exit)} earned`, raiseNotFound: (top: number) => `not found below ${$(top)}`, atLeast: (n: number) => `> ${$(n)}`,
    drop: "Largest single-step drop", dropAt: (from: number, to: number) => `at ${$(from)} → ${$(to)}`,
    reach: "Reach at current earnings", reachSub: (moe: number, n: number) => `percentile, ±${$(moe)} (n = ${n})`,
  },

  coverage: {
    unknown: (state: string) => `Coverage unknown for ${state}.`,
    noBlock: "The sweep on this site recorded no coverage block for this state, so nothing here can say what the model leaves out.",
    notLoaded: "The weekly sweep's summary did not load, so nothing here can say what the model leaves out. Reload to try again.",
    incomplete: (state: string) => `Figures incomplete in ${state}.`,
    incompleteBody: (programs: string[]) => `The model cannot compute ${fmt.list(programs)} here, so a cliff this household would meet is missing from this curve. Every figure on this page is a floor, not a measurement. Do not read this household as better off than one in a state the model can complete.`,
    complete: (state: string) => `Figures complete for ${state}.`,
    completeBody: "Nothing this household would hold is unmodelled here.",
    elsewhere: (states: string[]) => `In ${states.length === 1 ? "1 state" : `${states.length} states`} (${states.join(", ")}) this line would carry the`,
    elsewhereAfterMark: "mark and every figure on the page would be a floor.",
  },

  corrections: {
    none: "None", noneBody: "No HotGap-side correction touches this state's numbers.",
    unknown: "Unknown", unknownBody: "The coverage block did not load, so the corrections behind these numbers cannot be listed.",
    source: "source",
    tafdc: "TAFDC (MA)", tafdcChecked: "TAFDC", premiumHelp: "State premium help", coverageGap: "Coverage gap",
    rest: (items: string[]) => `Checked and not applying here — ${items.join(" ")}`,
    checked: (program: string, note: string) => `${program}: ${note}`,
  },

  drops: {
    range: (from: number, to: number) => `${$(from)} → ${$(to)}`,
    noneNamed: "none named",
    deferred: "Deferred",
    until: (when: string) => `until ${when}`,
    empty: (min: number) => `No step down of ${$(min)} or more anywhere on this curve.`,
  },

  breakdown: {
    idle: "Where a drop went",
    idleBody: "Select a step above, or a mark on the chart.",
    title: (drop: number, from: number, to: number) => `Where the ${$(drop)} went — ${$(from)} to ${$(to)}`,
    parts: { benefits: "Benefits", credits: "Credits", premiums: "Premiums", other: "Other" },
    offsets: "offsets the loss", adds: "adds to the loss",
    sum: (drop: number, driver: string) => `Sums to ${$(drop)}, the drop. Driver: ${driver}.`,
  },

  ledger: {
    who: { Adult: "Adult", Children: "Children", Household: "Household" },
    deferred: "Deferred",
    continues: (left: number, program: string, at: number, goneAt: number | null) =>
      `${$(left)} a year of ${program} continues at ${$(at)}${goneAt === null ? "" : `, none from ${$(goneAt)}`}.`,
    careWorth: (worth: number, at: number, monthly: number, kids: number, price: string | undefined, year: string) =>
      `Worth ${$(worth)} a year at ${$(at)}. Care priced at ${$(monthly)} a month for ${fmt.kids(kids)}${price ? ` (${price} prices, carried to ${year} dollars by the BLS Employment Cost Index)` : ""}.`,
    medicaidEnds: (premiumRise: number) => `Coverage ends with the raise (no deferral applies)${premiumRise > 0 ? `; the net premium rises ${$(premiumRise)} in the step` : ""}.`,
    acaEnds: (premiumRise: number, assistance: { program: string; amount: number } | null) =>
      `Net premium rises ${$(premiumRise)} in one step${assistance ? `; ${assistance.program} (${$(assistance.amount)}) ends with it` : ""}.`,
    toChip: (amount: number, at: number) => `The children move to CHIP: ${$(amount)} a year of coverage from ${$(at)}.`,
    eitc: (min: number) => `Phases out; no step of ${$(min)} or more, so it is not a cliff.`,
    chipEnds: (ptcRise: number) => `The premium tax credit rises ${$(ptcRise)} as it ends.`,
    deferredUntil: (when: string) => `Crossing this does not end it this year: the loss lands at ${when}.`,
    cashNever: "Cash benefits never end inside this axis.",
    cashEnds: (at: number) => `The last cash benefit ends at ${$(at)}.`,
    childCoverageEnds: (at: number) => `Child coverage ends at ${$(at)}, deferred.`,
    gapApplies: (note: string) => `Coverage gap band applies: ${note}`,
    gapNone: (note: string) => `No coverage gap band: ${note}`,
    premiumModeled: (program: string, max: number) => `${program} is modeled: netted out of the premium, up to ${$(max)} a year.`,
    premiumLadder: (program: string) => `${program} is applied from a local ladder.`,
    premiumUnmodeled: (program: string) => `${program} exists but is not modeled on this sweep.`,
    premiumNone: "No state premium help applies.",
  },

  chart: {
    title: (from: number, to: number) => `Net income after premiums, ${$(from)}–${$(to)} of earnings`,
    label: (p: { from: number; to: number; zones: number; own: { start: number; exit: number | null; raise: number | null } | null; worst: { drop: number; at: number; lost: string[] } | null; safe: number | null }) =>
      `Net income after premiums against earnings, ${$(p.from)} to ${$(p.to)}. ` +
      (p.zones ? `${p.zones === 1 ? "1 danger zone" : `${p.zones} danger zones`}` +
        (p.own ? `; this household's runs from ${$(p.own.start)} to ${p.own.exit === null ? "the top of the axis" : $(p.own.exit)}${p.own.raise === null ? "" : `, cleared by a raise of ${$(p.own.raise)}`}` : "") + ". " : "No danger zone. ") +
      (p.worst ? `The largest step down is ${$(p.worst.drop)} at ${$(p.worst.at)}${p.worst.lost.length ? ` where ${fmt.list(p.worst.lost)} ${p.worst.lost.length > 1 ? "end" : "ends"}` : ""}. ` : "") +
      (p.safe === null ? "No pay on the axis is past every zone." : `Safe from ${$(p.safe)}.`),
    cliff: (from: number, to: number, drop: number, lost: string[], driver: string, deferredUntil: string | null) =>
      `Cliff at ${$(from)} to ${$(to)}: ${fmt.loss(drop)}. ${lost.length ? `${fmt.list(lost)} ${lost.length > 1 ? "end" : "ends"}.` : "No program named."} Driver: ${driver}.${deferredUntil ? ` Deferred until ${deferredUntil}.` : ""}`,
    merged: (n: number, from: number, to: number, sum: number) => `${n} drops between ${$(from)} and ${$(to)}, together ${$(sum)} a year.`,
    later: "later", backToEven: "back to even", backToEvenAndSafe: "back to even, and safe from here", safeFromHere: "safe from here",
    leap: (raise: number, lowerBound: boolean) => `${lowerBound ? "more than +" : "+"}${$(raise)}`,
    key: { net: "Net income", ownZone: "This household's zone", otherZones: "Other zones", zones: "Danger zones", immediate: "Immediate cliff", deferred: "Deferred cliff", current: "Current earnings", leap: "The leap, to the exit", safe: "Safe from here" },
    readout: (earnings: number, net: number, zone: { own: boolean; end: number | null; peak: number; start: number } | null) =>
      `Earnings ${$(earnings)} → net ${$(net)}. ` +
      (!zone ? "Outside any danger zone."
        : zone.own ? `Inside the household's danger zone (ends ${zone.end === null ? "past the axis" : $(zone.end)}; peak ${$(zone.peak)} at ${$(zone.start)}).`
        : `Inside a later zone (${$(zone.start)}–${zone.end === null ? "the top of the axis" : $(zone.end)}).`),
    /** S5: the "not $0" clause only when the floor is above zero. */
    axis: (floor: number, ratio: string) => `The y-axis starts at ${$(floor)}${floor > 0 ? ", not $0" : ""}; the visible range is ${ratio}× the largest drop.`,
    liftedGhost: "Deferred drops are lifted out of the plotted line, which is what analysis.dangerZones describes; the real curve including them is the dashed ghost.",
    liftedNoGhost: "Deferred drops are lifted out of the plotted line, which is what analysis.dangerZones describes; here they are too small to draw.",
    noneDeferred: "No cliff on this curve is deferred.",
  },

  compare: {
    rows: { net: "Net after premiums", change: "Change from now", inZone: "In a danger zone", zoneEnds: "Zone ends at", raise: "Raise still needed", safe: "Safe from", drop: "Largest drop", adultMedicaid: "Adult Medicaid ends", childCoverage: "Child coverage ends", reach: "Reach at these earnings" },
    yes: "Yes", no: "No", pastAxis: "past the axis", none: "none", dash: "—",
    sub: (married: boolean, earnings: number) => `${fmt.adults(married)}, ${$(earnings)}`,
    reachNote: (state: string) => `Reach is the share of households of the same shape in ${state} earning at or below this figure — it says how common the pay is, never the odds of getting there.`,
    ladderNote: (other: string, base: string) => `A column whose household shape differs sits on its own ladder (${other} against ${base}), which is why the same pay can sit at a different percentile there.`,
    archetypeNote: "A column marked archetype is the committed sweep for a household of that shape in this state, not this family's own live call.",
    unansweredNote: (n: number) => `The committed sweep varies only a household's shape and pay, so ${n === 1 ? "a what-if that changes something else has" : `${n} what-ifs that change something else have`} no figure until the live call answers.`,
  },

  assumed: {
    health: "Health cost is premiums only — no deductibles, copays or other out-of-pocket spending.",
    facts: (facts: string[], age: number) => `Assumed for this curve: ${fmt.list(facts)}; aged ${age}.`,
    citizen: "a citizen", status: (s: string) => `status: ${s}`, savings: (n: number) => `${$(n)} in savings`, noSavings: "no savings",
    selfEmployed: "self-employed", wages: "wages, not self-employment", esi: "employer coverage offered", noEsi: "no employer coverage",
    otherIncome: "other income as entered", noOtherIncome: "no other income",
    takeUp: (on: string[], off: string[]) => `Take-up assumed for ${fmt.list(on)}${off.length ? `; not for ${fmt.list(off)}` : ""}.`,
    annualised: "Annualised current-rule scenarios, not prorated calendar-year benefit totals.",
    unmodeled: (state: string, program: string, note: string) => `Not modelled in ${state}: ${program}. ${note}`,
  },

  source: {
    line: (p: { year: string; curve: string; vintages: { rent: string; care: string; reach: string } | null; other: string | null; model: string }) =>
      `Estimates only — a caseworker decides real benefits. Rules: ${p.year}. Curve: ${p.curve}` +
      (p.vintages ? ` Rent: ${p.vintages.rent} Child-care price: ${p.vintages.care}, carried to ${p.year} dollars by the BLS Employment Cost Index. Reach: ${p.vintages.reach}` : "") +
      (p.other ? ` Other state benefits in the remainder: ${p.other}.` : "") + ` Model: ${p.model}.`,
    archetype: (id: string, generated: string | null, clamped: number | null) =>
      `committed archetype sweep (${id})${generated ? `, generated ${generated}` : ""} — not this family's own live call.${clamped === null ? "" : ` Pay is above the modeled range — evaluated at ${$(clamped)}, the top of the sweep.`}`,
    live: (where: string | null) => `live PolicyEngine call for this household${where ? ` in ${where}` : ""}.`,
    inPlace: (county: string, state: string) => `${county}, ${state}`,
    reachVintages: (basis: string, vintages: string[]) => `${basis} Vintages used: ${fmt.list(vintages.map(reachWord))}.`,
    otherBenefit: (label: string, max: number) => `${label} (up to ${$(max)})`,
    modelVersion: (version: string) => `policyengine-us ${version}`,
    modelEndpoint: (endpoint: string) => `the PolicyEngine API at ${endpoint}`,
    modelUnknown: "PolicyEngine (version not recorded)",
    unclaimed: (items: string[], earnings: number) => `Off for this household: ${fmt.list(items)} at ${$(earnings)}.`,
    wouldPay: (program: string, annual: number) => `${program} would pay ${$(annual)} a year`,
  },

  /* The client sheet, in the citizen register — the second person the sheet is handed to (review S8). */
  handout: {
    title: (state: string, married: boolean, kids: number) => `Your pay and your help — ${state}, ${married ? "two parents" : "one parent"}, ${fmt.count(kids)} ${kids === 1 ? "child" : "children"}`,
    careShare: (amount: number) => `${$(amount)} of what you keep is ${programPhrase("childcare")} paid straight to your day care.`,
    biggestDrop: (at: number, lost: ProgramId[], drop: number) =>
      `The biggest drop is at ${$(at)} of pay: ${lost.length ? `${fmt.list(lost.map(programPhrase))} ${lost.length > 1 ? "end" : "ends"}` : "your tax break shrinks"} and you keep ${$(drop)} less.`,
    snapEnds: (at: number) => `Food help ends at ${$(at)}.`,
    kidsCoverage: (at: number) => `Your kids' health plan ends at ${$(at)} of pay — but not that year. It ends at their next yearly check, up to 12 months later.`,
    estimates: "These are estimates. A case worker decides real help.",
    printed: (year: string, sweep: string | null) => `Printed from HotGap. ${year} rules.${sweep ? ` Sweep of ${sweep}.` : ""}`,
  },
};

export { programName, programPhrase };
