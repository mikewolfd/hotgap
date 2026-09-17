// Every string the caseworker surface shows, in one place, in the
// caseworker register, in the one copy shape (lib/copy.ts): whole messages
// with {slots}, variants keyed by what chooses them, no function and no
// formatter — every figure arrives formatted by lib/format.ts (money, a
// list, a date, a pay figure in the unit), program names from
// lib/programs.ts (M3) and state names from core. `editor` is the register
// laid over the citizen editor's words (mountEditor's `copy`). `handout` is
// the client sheet, in the citizen register (review S8), and reads the
// citizen's phrases.
import { LIHEAP_VINTAGE } from "@hotgap/core";
import { bind } from "../lib/copy.js";

export const copy = {
  /* The editor in the caseworker register: the household is the client's, named in the third person. */
  editor: {
    summary: { none: "Enter the household to evaluate it.", edit: "Edit" },
    heading: "The household",
    lead: "Place, household, pay and monthly costs. Net income is evaluated at every pay level on the axis.",
    privacy: "Nothing typed here is stored.",
    place: { legend: "Place", zip: "ZIP code", zipHint: "Five digits; it sets the state and the county.", or: "Or the state", statePlaceholder: "Choose a state", inState: "In {state}." },
    household: { legend: "Household", adults: "Adults", single: "One adult", married: "Two adults, married", kids: "Children in the household", kidsHint: "Under 18. Up to six.", kidAge: "Age of child {n}" },
    pay: { legend: "Pay", amount: "Pay, before taxes", unit: "Per", hours: "Hours a week", hoursHint: "Blank assumes 40." },
    costs: { legend: "Monthly costs", rent: "Rent or mortgage", childcare: "Child care", typical: "Typical in {where}: {amount} a month. Change it if the household's differs.", none: "0 if nothing is paid." },
    submit: "Update the household",
    chips: {
      where: "Place", household: "Household", pay: "Pay", rent: "Rent", childcare: "Child care",
      age: "Age", spouseAge: "Spouse's age", spousePay: "Spouse's pay",
      ssdi: "SSDI", childSupport: "Child support", unemployment: "Unemployment", savings: "Savings",
      status: "Status", spouseStatus: "Spouse's status", kidsDisabled: "Children with a disability",
      childcareSubsidy: "CCDF subsidy", headStart: "Head Start", housing: "Housing voucher",
      energyAssistance: "LIHEAP", heatInRent: "Heat in rent",
      employerCoverage: "Employer coverage", selfEmployed: "Self-employed", disabled: "Disability", spouseDisabled: "Spouse's disability",
      snap: "SNAP", tanf: "TANF", medicaid: "Medicaid", wic: "WIC",
      yes: "on", no: "off",
    },
    errors: {
      check: "Check {label}.",
      fields: {
        zip: "the ZIP code", state: "the ZIP code or state", annualEarnings: "the pay", hoursPerWeek: "the hours", childAges: "the children's ages",
        age: "the age", spouseAge: "the spouse's age", monthlyRent: "the rent", monthlyChildcare: "the child care cost",
        spouseAnnualEarnings: "the spouse's pay", ssdiMonthly: "SSDI", childSupportMonthly: "child support", unemploymentMonthly: "unemployment pay",
        savings: "savings", youStatus: "the status", spouseStatus: "the spouse's status", youYearsInUs: "years in the US",
        spouseYearsInUs: "the spouse's years in the US", childDisabled: "which children have a disability", countyFips: "the county",
      } as Record<string, string>,
    },
  },

  actions: {
    whatIf: "Add a what-if", whatIfShort: "What-if",
    print: "Print the client sheet", printShort: "Print",
    addAsWhatIf: "Add as a what-if",
  },

  page: {
    title: "Benefits cliffs for one household, with what-ifs",
    skip: "Skip to the threshold ledger",
    coverageHeading: "Model coverage in {state}",
    correctionsHeading: "Corrections applied in {state}",
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
    loading: "Evaluating… net income is checked at {count} pay levels. A household not seen before takes a few seconds.",
    errorTitle: "The evaluation did not come back.",
    errors: {
      rate_limited: "Too many evaluations in a minute. Wait a minute and try again.",
      busy: "The engine is busy. Try again in a few seconds.",
      other: "The engine did not reply. Nothing was saved. Try again in a minute.",
      badInput: "Not a household: {detail}.",
    },
    tryAgain: "Try again",
  },

  whatIf: {
    added: "What-if added: {label}, evaluated beside the base under",
    addedAfterLink: ". The chips show the base.",
    compareLink: "Compare",
    removed: "What-if removed: {label}.",
    already: "{label} is already compared.",
    now: "Now",
    computing: "computing",
    failed: "did not come back",
    /** B1: the fallback's curve is the base's own, so the column has no figure. */
    notInSweep: "not in the sweep — needs the live call",
    archetype: "(archetype)",
    thisWhatIf: "This what-if",
    remove: "Remove",
    removeAria: "Remove the what-if {title}",
    ellipsis: "…",
    dash: "—",
    /* A what-if's name from what it changes (scenarios.ts). */
    married: "Married", single: "Single",
    cleared: "{label} cleared",
    place: "Place {where}",
    pay: "Pay {pay}",
    monthly: "{label} {amount} a month",
    yearly: "{label} {amount} a year",
    figure: "{label} {amount}",
    children: "Children {ages}",
    valued: "{label} {value}",
    toggled: { on: "{label} on", off: "{label} off" },
    names: {
      zip: "ZIP", state: "State", county: "County", age: "Age", "spouse-age": "Spouse's age", kids: "Children", "kids-disabled": "Children with a disability",
      rent: "Rent", childcare: "Child care", earnings: "Earnings", pay: "Pay", unit: "Pay unit", hours: "Hours a week", "spouse-earnings": "Spouse's pay",
      ssdi: "SSDI", "child-support": "Child support", unemployment: "Unemployment", savings: "Savings", status: "Status", "spouse-status": "Spouse's status",
      "years-in-us": "Years in the US", "spouse-years-in-us": "Spouse's years in the US",
    } as Record<string, string>,
  },

  verdict: {
    alwaysUp: "No danger zone. Net rises with every step of earnings on the axis.",
    cliffAhead: "A cliff ahead: at {at} net drops {drop}. Below it, more pay is more money.",
    cliffBehind: "Past the cliff. The big drop is below current earnings; from here, more pay is more money.",
    stuck: "In a danger zone with no exit on the axis. From {start} up to {top} of earnings, net never gets back to the {peak} it reaches at {start}.",
    inZone: "In a danger zone. Between {start} and {exit} of earnings, net never gets back to the {peak} it reaches at {start}. Clear at {exit}: a raise of {raise}.",
    again: "It happens again between {exit} and {safe}.",
    safeFrom: { exact: "Safe from {safe}: a raise of {leap}.", atLeast: "Safe from {safe}: a raise of {leap} or more." },
    neverSafe: "The sweep never found a pay past which no zone remains.",
  },

  tiles: {
    net: "Net, after premiums", netSub: "at {earned} earned",
    raise: "Raise to clear the zone", raiseTo: "to {exit} earned", raiseNotFound: "not found below {top}", atLeast: "> {n}",
    drop: "Largest single-step drop", dropAt: "at {from} → {to}",
    reach: "Reach at current earnings", reachSub: "percentile, ±{moe} (n = {n})",
  },

  coverage: {
    unknown: "Coverage unknown for {state}.",
    noBlock: "The sweep on this site recorded no coverage block for this state, so nothing here can say what the model leaves out.",
    notLoaded: "The weekly sweep's summary did not load, so nothing here can say what the model leaves out. Reload to try again.",
    incomplete: "Figures incomplete in {state}.",
    incompleteBody: "The model cannot compute {programs} here, so a cliff this household would meet is missing from this curve. Every figure on this page is a floor, not a measurement. Do not read this household as better off than one in a state the model can complete.",
    complete: "Figures complete for {state}.",
    completeBody: "Nothing this household would hold is unmodelled here.",
    elsewhere: { one: "In 1 state ({states}) this line would carry the", other: "In {n} states ({states}) this line would carry the" },
    elsewhereAfterMark: "mark and every figure on the page would be a floor.",
  },

  corrections: {
    none: "None", noneBody: "No HotGap-side correction touches this state's numbers.",
    unknown: "Unknown", unknownBody: "The coverage block did not load, so the corrections behind these numbers cannot be listed.",
    source: "source",
    tafdc: "TAFDC (MA)", tafdcChecked: "TAFDC", premiumHelp: "State premium help", coverageGap: "Coverage gap",
    rest: "Checked and not applying here — {items}",
    checked: "{program}: {note}",
  },

  drops: {
    range: "{from} → {to}",
    noneNamed: "none named",
    deferred: "Deferred",
    until: "until {when}",
    empty: "No step down of {min} or more anywhere on this curve.",
  },

  breakdown: {
    idle: "Where a drop went",
    idleBody: "Select a step above, or a mark on the chart.",
    title: "Where the {drop} went — {from} to {to}",
    parts: { benefits: "Benefits", credits: "Credits", premiums: "Premiums", other: "Other" },
    offsets: "offsets the loss", adds: "adds to the loss",
    sum: "Sums to {drop}, the drop. Driver: {driver}.",
  },

  ledger: {
    who: { Adult: "Adult", Children: "Children", Household: "Household" },
    deferred: "Deferred",
    continues: { open: "{left} a year of {program} continues at {at}.", closed: "{left} a year of {program} continues at {at}, none from {goneAt}." },
    careWorth: {
      priced: "Worth {worth} a year at {at}. Care priced at {monthly} a month for {kids} ({price} prices, carried to {year} dollars by the BLS Employment Cost Index).",
      unpriced: "Worth {worth} a year at {at}. Care priced at {monthly} a month for {kids}.",
    },
    kids: { one: "{n} child", other: "{n} children" },
    medicaidEnds: { flat: "Coverage ends with the raise (no deferral applies).", premium: "Coverage ends with the raise (no deferral applies); the net premium rises {premiumRise} in the step." },
    acaEnds: { alone: "Net premium rises {premiumRise} in one step.", withHelp: "Net premium rises {premiumRise} in one step; {program} ({amount}) ends with it." },
    toChip: "The children move to CHIP: {amount} a year of coverage from {at}.",
    eitc: "Phases out; no step of {min} or more, so it is not a cliff.",
    chipEnds: "The premium tax credit rises {ptcRise} as it ends.",
    deferredUntil: "Crossing this does not end it this year: the loss lands at {when}.",
    cashNever: "Cash benefits never end inside this axis.",
    cashEnds: "The last cash benefit ends at {at}.",
    childCoverageEnds: "Child coverage ends at {at}, deferred.",
    gapApplies: "Coverage gap band applies: {note}",
    gapNone: "No coverage gap band: {note}",
    premiumModeled: "{program} is modeled: netted out of the premium, up to {max} a year.",
    premiumLadder: "{program} is applied from a local ladder.",
    premiumUnmodeled: "{program} exists but is not modeled on this sweep.",
    premiumNone: "No state premium help applies.",
    /* EligibilityBoundary (#23): the row at the limit, tagged, with the three facts and their vintage — the tag says "if you apply" once,
       so the cite leads with the basis rather than saying it again (liheap review S3). */
    ifYouApply: "if you apply",
    liheapBoundary: "{limit}, the heating limit. {worthServed} Not counted unless the household says it gets it. Read {readOn}.",
    liheapWorthServed: {
      bandKnown: "Worth {band} at that band if received; {pct}% of income-eligible households were served in {vintage}.",
      bandUnread: "Worth {band} at that band if received; the {vintage} share of income-eligible households served was not read.",
      unreadKnown: "The amount at that band was not read; {pct}% of income-eligible households were served in {vintage}.",
      unreadUnread: "The amount at that band was not read; the {vintage} share of income-eligible households served was not read.",
    },
    /* Where the state pays its heating help as a refundable credit PolicyEngine models and HotGap already counts (Michigan): the row is where it
       tapers out, not a boundary and not a cliff, and the cite says what the model assumed about heat in the rent (liheap review B1). */
    liheapCredit: "{paidAs} {served} {heat} Read {readOn}.",
    liheapPaidAs: {
      named: "Paid as the {program}, a refundable state credit PolicyEngine models and HotGap counts in state credits; it tapers out by the state's limit, {limit}, so it is not a cliff.",
      unnamed: "Paid as a refundable state credit PolicyEngine models and HotGap counts in state credits; it tapers out by the state's limit, {limit}, so it is not a cliff.",
    },
    liheapServed: { known: "{pct}% of income-eligible households were served in {vintage}.", unread: "The {vintage} share of income-eligible households served was not read." },
    liheapHeat: { inRent: "Heat is included in the rent, so the credit is halved.", notInRent: "Assumes heat is not included in rent; the credit halves when it is." },
    liheapCounted: "Counted at the household's say-so: {amount} a year from HotGap's table of the state's published schedule, to the {limit} limit. PolicyEngine serves no LIHEAP amount on this payload.",
    liheapBand: { flat: "{min}", range: "{min}–{max}" },
  },

  chart: {
    title: "Net income after premiums, {from}–{to} of earnings",
    /* The wrapper's aria-label: the shape in words, one sentence per fact, joined by the model. */
    label: {
      lead: "Net income after premiums against earnings, {from} to {to}.",
      zones: { none: "No danger zone.", one: "{n} danger zone.", other: "{n} danger zones." },
      own: {
        toExit: "This household's runs from {start} to {exit}.",
        toExitRaise: "This household's runs from {start} to {exit}, cleared by a raise of {raise}.",
        toTop: "This household's runs from {start} to the top of the axis.",
        toTopRaise: "This household's runs from {start} to the top of the axis, cleared by a raise of {raise}.",
      },
      worst: { none: "The largest step down is {drop} at {at}.", one: "The largest step down is {drop} at {at} where {programs} ends.", other: "The largest step down is {drop} at {at} where {programs} end." },
      safe: { none: "No pay on the axis is past every zone.", from: "Safe from {safe}." },
    },
    cliff: {
      lead: "Cliff at {from} to {to}: {drop}.",
      lost: { none: "No program named.", one: "{programs} ends.", other: "{programs} end." },
      driver: "Driver: {driver}.",
      deferred: "Deferred until {until}.",
    },
    merged: "{n} drops between {from} and {to}, together {sum} a year.",
    later: "later", backToEven: "back to even", backToEvenAndSafe: "back to even, and safe from here", safeFromHere: "safe from here",
    leap: { exact: "+{raise}", atLeast: "more than +{raise}" },
    key: { net: "Net income", ownZone: "This household's zone", otherZones: "Other zones", zones: "Danger zones", immediate: "Immediate cliff", deferred: "Deferred cliff", current: "Current earnings", leap: "The leap, to the exit", safe: "Safe from here" },
    readout: {
      lead: "Earnings {earnings} → net {net}.",
      outside: "Outside any danger zone.",
      own: { toExit: "Inside the household's danger zone (ends {end}; peak {peak} at {start}).", toTop: "Inside the household's danger zone (ends past the axis; peak {peak} at {start})." },
      other: { toExit: "Inside a later zone ({start}–{end}).", toTop: "Inside a later zone ({start}–the top of the axis)." },
    },
    /** S5: the "not $0" clause only when the floor is above zero. */
    axis: { fromZero: "The y-axis starts at {floor}; the visible range is {ratio}× the largest drop.", aboveZero: "The y-axis starts at {floor}, not $0; the visible range is {ratio}× the largest drop." },
    liftedGhost: "Deferred drops are lifted out of the plotted line, which is what analysis.dangerZones describes; the real curve including them is the dashed ghost.",
    liftedNoGhost: "Deferred drops are lifted out of the plotted line, which is what analysis.dangerZones describes; here they are too small to draw.",
    noneDeferred: "No cliff on this curve is deferred.",
  },

  compare: {
    rows: { net: "Net after premiums", change: "Change from now", inZone: "In a danger zone", zoneEnds: "Zone ends at", raise: "Raise still needed", safe: "Safe from", drop: "Largest drop", adultMedicaid: "Adult Medicaid ends", childCoverage: "Child coverage ends", reach: "Reach at these earnings" },
    yes: "Yes", no: "No", pastAxis: "past the axis", none: "none", dash: "—",
    sub: "{adults}, {earnings}",
    adults: { one: "1 adult", two: "2 adults" },
    reachNote: "Reach is the share of households of the same shape in {state} earning at or below this figure — it says how common the pay is, never the odds of getting there.",
    ladderNote: "A column whose household shape differs sits on its own ladder ({other} against {base}), which is why the same pay can sit at a different percentile there.",
    archetypeNote: "A column marked archetype is the committed sweep for a household of that shape in this state, not this family's own live call.",
    unansweredNote: {
      one: "The committed sweep varies only a household's shape and pay, so a what-if that changes something else has no figure until the live call answers.",
      other: "The committed sweep varies only a household's shape and pay, so {n} what-ifs that change something else have no figure until the live call answers.",
    },
  },

  assumed: {
    health: "Health cost is premiums only — no deductibles, copays or other out-of-pocket spending.",
    facts: "Assumed for this curve: {facts}; aged {age}.",
    citizen: "a citizen", status: "status: {status}", savings: "{amount} in savings", noSavings: "no savings",
    selfEmployed: "self-employed", wages: "wages, not self-employment", esi: "employer coverage offered", noEsi: "no employer coverage",
    otherIncome: "other income as entered", noOtherIncome: "no other income",
    takeUp: { all: "Take-up assumed for {on}.", some: "Take-up assumed for {on}; not for {off}." },
    annualised: "Annualised current-rule scenarios, not prorated calendar-year benefit totals.",
    unmodeled: "Not modelled in {state}: {program}. {note}",
    liheap: "Energy assistance (LIHEAP) in {state}: {note}",
  },

  source: {
    /* The SourceNote (#17): one sentence per fact, joined by the model in this order. */
    lead: "Estimates only — a caseworker decides real benefits. Rules: {year}. Curve: {curve}",
    vintages: "Rent: {rent} Child-care price: {care}, carried to {year} dollars by the BLS Employment Cost Index. Reach: {reach}",
    other: "Other state benefits in the remainder: {other}.",
    model: "Model: {model}.",
    archetype: {
      dated: "committed archetype sweep ({id}), generated {generated} — not this family's own live call.",
      undated: "committed archetype sweep ({id}) — not this family's own live call.",
    },
    clamped: "Pay is above the modeled range — evaluated at {clamped}, the top of the sweep.",
    live: { inPlace: "live PolicyEngine call for this household in {where}.", anywhere: "live PolicyEngine call for this household." },
    inPlace: "{county}, {state}",
    rent: "{publisher} {vintage}",
    reachVintages: "{basis} Vintages used: {vintages}.",
    otherBenefit: "{label} (up to {max})",
    unclaimed: "Off for this household: {items} at {earnings}.",
    wouldPay: "{program} would pay {annual} a year",
  },

  /* The client sheet, in the citizen register — the second person the sheet is handed to (review S8). */
  handout: {
    title: "Your pay and your help — {state}, {parents}, {children}",
    parents: { one: "one parent", two: "two parents" },
    children: { none: "no children", one: "one child", other: "{count} children" },
    careShare: "{amount} of what you keep is {phrase} paid straight to your day care.",
    biggestDrop: {
      none: "The biggest drop is at {at} of pay: your tax break shrinks and you keep {drop} less.",
      one: "The biggest drop is at {at} of pay: {phrases} ends and you keep {drop} less.",
      other: "The biggest drop is at {at} of pay: {phrases} end and you keep {drop} less.",
    },
    snapEnds: "Food help ends at {at}.",
    kidsCoverage: "Your kids' health plan ends at {at} of pay — but not that year. It ends at their next yearly check, up to 12 months later.",
    estimates: "These are estimates. A case worker decides real help.",
    printed: { dated: "Printed from HotGap. {year} rules. Sweep of {sweep}.", undated: "Printed from HotGap. {year} rules." },
  },
};

/* The chips a counselor what-ifs first: the six facts, then the take-up toggles, then the rest in the citizen order. */
export const CHIP_ORDER = ["where", "household", "pay", "rent", "childcare", "childcare-subsidy", "head-start", "housing", "energy-assistance", "heat-in-rent", "employer-coverage", "no-snap", "no-tanf", "no-medicaid", "no-wic", "self-employed", "disabled", "spouse-disabled"];

/** The vintage words the LIHEAP rows name: the served share's year, from core. */
export const SERVED_VINTAGE = LIHEAP_VINTAGE.served;

export const t = bind(copy);
