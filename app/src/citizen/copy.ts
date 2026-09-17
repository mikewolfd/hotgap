// Every string the citizen result shows, in one catalog, in the citizen
// register (short words, one thought a line). Slots are {name}; t() fills
// them and throws on a missing key, an unknown param or a slot left over,
// as the archive's t.ts did (design/PORT-FROM-ARCHIVE-2026-09-16.md M1), so
// a sentence can never reach the page half-filled. The readability gate
// (scripts/readability.mjs) reads this object: nothing a person reads is
// composed anywhere else. Program names an office uses appear only after
// the plain phrase (design/inventory.md M3); those names live in
// programs.ts and are not gated.
export const copy = {
  loading: "Doing the math… We check your help at {count} pay levels. This can take a few seconds.",
  errorTitle: "We could not get your answer.",
  errors: {
    rate_limited: "You have asked a few times in a row. Please wait a minute and try again.",
    busy: "The math service is busy right now. Please try again in a few seconds.",
    other: "The math service did not reply. Your answers were not saved. Please try again in a minute.",
  },
  tryAgain: "Try again",
  skip: "Skip to the answer",
  wordmark: "HotGap",
  heading: "If your pay goes up, do you keep more?",
  // The masthead line, on paper only (the ScenarioBar's summary is screen chrome).
  who: "{adults} with {kids}, in {place}.",
  whoNoKids: "{adults} with no kids, in {place}.",
  adults: { one: "A parent", two: "Two parents", oneNoKids: "An adult", twoNoKids: "A couple" },
  kidsOne: "one kid, age {age}",
  kidsMany: "{n} kids, ages {ages}",
  stillArchetype: "We still could not get your exact numbers. These are numbers for a family like yours in your state.",

  // M2: one sentence per curve shape (design/inventory.md § Verdict catalog).
  // {pay}, {wage}, {exit}, {leap} and {top} are in the person's own unit (M5);
  // {kept} and {drop} are yearly money.
  verdict: {
    always_up: "You are paid {pay}. You keep {kept}. When you earn more, you keep more. We did not find a spot where more pay leaves you with less.",
    cliff_ahead: "You are paid {pay}. You keep {kept}. Near {wage}, more pay can mean less money: past it you would keep about {drop} less a year. People call this a benefits cliff.",
    in_danger_zone: "You are paid {pay}. You keep {kept}. More pay does not add to that until you are paid {exit}: a raise of {leap}.",
    "in_danger_zone:stuck": "You are paid {pay}. You keep {kept}. More pay does not add to that in the pay range we checked, up to {top}. We did not find a spot where you come out ahead again.",
    cliff_behind: "You are paid {pay}. You keep {kept}. The big drop is below your pay now. From here, more pay means more for you.",
    // A deferred cliff at or above the person's pay (design/REVIEW-citizen B1; the
    // catalog needs this clause, TODO(system) 16): the loss the lifted curve leaves out.
    waits: " One more thing: at {at}, {phrase} stops, but not that day. Later, you would keep about {drop} less a year.",
  },
  again: "It happens again from {from} to {to}.",
  againMany: "It happens {n} more times, between {from} and {to}.",
  sub: {
    more: "You keep more than your pay because help and tax money are part of it.",
    less: "You keep less than your pay because taxes and health costs come out of it.",
  },
  // Help inside "money you keep" that never reaches the household as cash (S6).
  noncash: {
    childcare: "{amount} of this is child care help. It goes to your day care, not to you.",
    schoolmeals: "{amount} of this is free school meals. It is not cash.",
    headstart: "{amount} of this is free early learning. It is not cash.",
    liheap: "{amount} of this is help with heating bills. It goes to your utility, not to you.",
  },
  health: "{amount} a year for your health plan comes out first.",

  chart: {
    title: "Money you keep in a year, as your pay goes up",
    unit: {
      year: "Pay is by the year.",
      month: "Pay is by the month.",
      week: "Pay is by the week.",
      hour: "Pay is by the hour, at {hours} hours a week.",
    },
    readoutHint: "Move along the line with your finger, your mouse, or the left and right arrow keys.",
    readoutMarks: " Press ] and [ to jump between drops.",
    readout: "Paid {pay}, you keep {kept}.",
    inYourZone: " This pay is inside your flat stretch.",
    inZone: " This pay is inside a flat stretch.",
    outZone: " Here, more pay means more money.",
    markWould: "A drop near {pay}. You would keep about {drop} less a year here.",
    markPast: "A drop near {pay}. You keep about {drop} less a year here.",
    markLater: "A drop near {pay} that waits. Later, you would keep about {drop} less a year.",
    markMerged: "{n} drops from {from} to {to}. Together, about {sum} a year.",
    markMergedWaits: "{n} drops from {from} to {to}. Together, about {sum} a year. Some of it waits for a later day.",
    axisNote: "The side numbers start at {floor}, not at $0, so the drops are easy to see.",
    axisNoteBare: "The side numbers start at {floor}, not at $0.",
    biggestBeyond: " The biggest drop, about {drop} a year at {pay}, is outside the picture.",
    safeBeyond: " From {safe} up, more pay always adds to what you keep.",
    safeNever: " In the pay range we checked, up to {top}, we did not find a spot past all the flat stretches.",
    ghost: " The dashed line is what happens if the later change happens.",
    ghostNow: " The dashed line is where you are now: the later change has already landed for you.",
    estimates: " These are estimates. They use the rules for {year} in {state}.",
    aria: "A line of the money this household keeps as pay rises from {from} to {to}. It is flat from {zoneFrom} to {zoneTo}.{more}{worst} The household sits at {pay}, inside a flat stretch.",
    ariaMore: " It is flat again from {from} to {to}.",
    ariaWorst: " The biggest drop is at {at}, where {what} ends.",
    ariaNoZone: "A line of the money this household keeps as pay rises from {from} to {to}.{worst} The household sits at {pay}.",
    someHelp: "some help",
    labels: {
      later: "later",
      you: "you",
      backToEven: "back to even",
      backToEvenSafe: "back to even, and safe from here",
      safe: "safe from here",
      leap: "+{leap}",
      leapMore: "more than +{leap}",
      drop: "−{drop}",
    },
  },
  key: {
    line: "Money you keep",
    band: "Your flat stretch",
    other: "Other flat stretches",
    drop: "A drop this year",
    later: "A drop that waits",
    you: "You now",
    boundary: "Where help with heating bills stops",
  },

  // EligibilityBoundary (#23): three facts and an invitation, never a drop.
  // {pay} is in the person's own unit; {min}, {max}, {amount} are yearly money.
  boundary: {
    line: "Above {pay}, you can no longer apply for help with heating bills in {state}. It is called LIHEAP.",
    worth: " It is worth {min} to {max} a winter if you get it.",
    worthFlat: " It is worth {amount} a winter if you get it.",
    worthUnknown: " We could not read what it pays.",
    served: {
      some: " About {n} in 10 families who could get it here do.",
      few: " Fewer than 1 in 10 families who could get it here do.",
      most: " Almost all families who could get it here do.",
      unknown: " We do not know how many families who could get it here do.",
    },
    invite: " If you get it, turn it on to see it in your line.",
    counted: "You said you get help with heating bills (LIHEAP). We put it in your line: about {amount} a year, up to {pay}.",
  },

  // SourceNote (#17) with its archetype state (M4).
  source: {
    archetype: "We could not get your exact numbers right now. These are numbers for a family like yours in your state.",
    clamped: " Your pay is above the range we checked. These numbers are for {top}, the top of that range.",
    live: "Source: HotGap, from PolicyEngine with {year} rules. These are your own numbers.",
    sweep: "Source: HotGap, from {model} with {year} rules. Sweep of {date}.",
    sweepBare: "Source: HotGap, from PolicyEngine. Rules for {year}.",
    rent: " Rent: HUD Fair Market Rents, {rent}.",
    childcare: " Child care price: {childcare}, grown to {year} dollars.",
    money: " Money kept is what is left after taxes and health-plan premiums.",
  },

  table: {
    show: "Show the numbers",
    caption: "The points the picture marks. Money kept is in dollars a year.",
    pay: "Your pay",
    keep: "You keep",
    drop: "Drop",
    dropCell: "−{drop}",
    mark: "On the picture",
    marks: { peak: "The top of your flat stretch", you: "You now", exit: "Back to even", drop: "A drop", later: "A drop that waits", safe: "Safe from here" },
  },

  // StepList (#6), under the one convention: a program ends at the first
  // pay at which it is gone. Above current pay the tense is "would".
  steps: {
    heading: "What ends, and when",
    none: "Nothing ends in the pay range we checked.",
    ends: "{Phrase} ends. It is called {name}.",
    wouldEnd: "{Phrase} would end. It is called {name}.",
    endsGroup: {
      adults: "Your own {noun} ends. It is called {name}.",
      children: "Your kids' {noun} ends. It is called {name}.",
    },
    wouldEndGroup: {
      adults: "Your own {noun} would end. It is called {name}.",
      children: "Your kids' {noun} would end. It is called {name}.",
    },
    starts: " Then {phrase} starts. It is called {name}.",
    wouldStart: " Then {phrase} would start. It is called {name}.",
    remains: " Some goes on until {until}: {list}.",
    remainsItem: "{amount} of {phrase}",
    smaller: {
      benefits: "Some help gets smaller here.",
      credits: "Your tax breaks get smaller here.",
      premiums: "Your health plan costs more here.",
      other: "Other money gets smaller here.",
    },
    wouldSmaller: {
      benefits: "Some help would get smaller here.",
      credits: "Your tax breaks would get smaller here.",
      premiums: "Your health plan would cost more here.",
      other: "Other money would get smaller here.",
    },
    loss: "You keep about {drop} less.",
    wouldLoss: "You would keep about {drop} less.",
    laterLoss: "Later, you would keep about {drop} less a year.",
    biggest: " This is the biggest drop.",
    waitsBadge: "Waits",
    waitsTail: " It does not end that day.",
    close: "Close",
  },
  waits: {
    head: "One change waits",
    headMany: "{n} changes wait",
    reasons: {
      child_continuous_eligibility: "At {at} your kids stop being able to get {phrase}. But the law lets kids keep it for a full year at a time. So it ends at their next yearly check, up to 12 months later.",
      head_start_program_year: "At {at} your kids stop being able to get {phrase}. But a child in it stays to the end of the next program year.",
      transitional_medical_assistance: "At {at} you stop being able to get {phrase}. But the law lets you keep it for 6 to 12 more months.",
    },
    foot: "We do not draw it as a drop today, because it is not one.",
    thisHelp: "this help",
    kids: "your kids' {noun}",
    own: "your own {noun}",
  },

  // "What we assumed about you" (S6): the household the curve was run for.
  assumed: {
    heading: "What we assumed about you",
    rent: "{amount} a month. You gave this.",
    rentTypical: "{amount} a month. The usual rent in {state}.",
    rentNone: "None given. We counted no rent.",
    childcare: "{amount} a month for {kids}. You gave this.",
    childcareTypical: "{amount} a month for {kids}. The usual price of day care in {state}.",
    childcareNone: "None. Nobody in the home pays for day care.",
    help: "{list}. We count each as if you get it.",
    notCounted: "{list}. We count them as if you do not get them.",
    you: "Age {age}. A U.S. citizen.",
    youNotCitizen: "Age {age}. Not a U.S. citizen.",
    spouse: "Age {age}. Paid {pay} a year.",
    spouseNoPay: "Age {age}. Not paid.",
    nobodyDisabled: " No one in the home has a disability.",
    youDisabled: " You said you have a disability.",
    spouseDisabled: " You said your spouse has a disability.",
    kidDisabled: " You said one of your kids has a disability.",
    kidsDisabled: " You said {n} of your kids have a disability.",
    savings: "Savings: {savings}.",
    noOtherMoney: " No child support, SSDI or unemployment pay.",
    hours: "{hours} hours a week.",
    hoursNone: "Not given. We assume full time.",
    selfEmployed: "You work for yourself, not for a boss.",
    employerPlan: "{amount} a year comes out of your pay for it.",
    employerPlanFree: "At your pay, we counted no cost for it.",
    headStart: "Worth {amount} a year to you: what day care would cost.",
    coverageGap: "From {from} to {to} you would have no health plan at all: no Medicaid and no help to buy one. We counted no health plan cost there.",
    premiumHelp: "{program}. It helps pay for health insurance. We counted it.",
    premiumHelpMax: "{program}, up to {amount} a year. It helps pay for health insurance. We counted it.",
    maTafdc: "We used the state's rule for people already on it. Not the first-year rule.",
    unclaimed: "You said you do not get {list}. At your pay it would be worth about {amount} a year.",
    labels: {
      rent: "Rent", childcare: "Child care", help: "Help you get", notCounted: "Not counted", you: "You", spouse: "Your spouse",
      money: "Other money", hours: "Hours", work: "Work", employerPlan: "Health plan from a job", headStart: "Head Start",
      coverageGap: "No health plan", premiumHelp: "Health plan help", maTafdc: "Cash help (TANF)", unclaimed: "Help you could get",
    },
    kids: { one: "one kid", two: "two kids", three: "three kids", many: "{n} kids" },
    monthly: { ssdi: " SSDI: {amount} a month.", childSupport: " Child support: {amount} a month.", unemployment: " Unemployment pay: {amount} a month." },
    none: "None",
  },

  // IncompleteMarker (#16) in the citizen register: one caution, from
  // coverage[state].unmodeled[], only when it could move this household.
  incomplete: {
    lead: "One thing we could not count.",
    body: " {state} has {program}. Our math does not include it. A drop could be missing from this page.",
  },

  reach: {
    heading: "How common is this pay?",
    some: "About {n} in 10 {who} in {state} are paid {pay} or less.",
    few: "Fewer than 1 in 10 {who} in {state} are paid {pay} or less.",
    most: "Almost all {who} in {state} are paid {pay} or less.",
    who: { parents: "parents like you", couples: "couples like you", people: "people like you" },
    margin: " The count could be off by a few thousand dollars either way.",
    note: "This says how common the pay is. It does not say what you will earn.",
    source: "From U.S. Census Bureau survey data ({vintages}). Grown to {year} dollars.",
    sourceBare: "From U.S. Census Bureau survey data.",
  },
  hours: {
    heading: "The lowest legal pay",
    body: "{state}'s lowest legal pay is {wage} an hour. Full-time work at that pay is about {fullTime} a year.",
  },
  footer: {
    estimates: "These are estimates.",
    caseworker: " A case worker decides real help.",
    assumed: "We use {year} rules. The list above says what we assumed. If any of it is wrong for you, these numbers are off too. We did not ask about anyone in the home aged 65 or more.",
    noAdvice: "We do not tell you what to do.",
  },

  // M3: the plain phrase for each program (design/inventory.md § Program phrases).
  program: {
    snap: "food help",
    medicaid: "a free state health plan",
    chip: "a health plan for kids",
    eitc: "a tax break for workers",
    ctc: "the child tax break",
    aca: "help paying for health insurance",
    tanf: "cash help",
    housing: "housing help",
    wic: "food help for moms and babies",
    ssi: "SSI cash help",
    headstart: "free early learning",
    schoolmeals: "free school meals",
    childcare: "child care help",
    liheap: "help with heating bills",
  },
};

type Params = Record<string, string | number>;

/** Fill {slots} in a template; every slot must be given and every param must be a slot. */
export function fill(text: string, params: Params = {}): string {
  const out = text.replace(/\{([A-Za-z]+)\}/g, (_, k: string) => {
    if (!(k in params)) throw new Error(`missing param {${k}} in "${text}"`);
    return String(params[k]);
  });
  for (const k in params) if (!text.includes(`{${k}}`)) throw new Error(`unknown param ${k} for "${text}"`);
  return out;
}

export type Part = { text: string } | { slot: string; text: string };

/** A template as parts, each slot its own part, so a renderer can mark a slot up; the same checks as fill(). */
export function parts(text: string, params: Params = {}): Part[] {
  fill(text, params);
  const out: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(/\{([A-Za-z]+)\}/g)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ slot: m[1], text: String(params[m[1]]) });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The string at a dotted key ("steps.ends"), filled. */
export function t(key: string, params?: Params): string {
  const s = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], copy);
  if (typeof s !== "string") throw new Error(`missing string ${key}`);
  return fill(s, params);
}
