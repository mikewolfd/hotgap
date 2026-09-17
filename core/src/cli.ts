// `npm run hotgap -- <command>` — a thin terminal front end over @hotgap/core.
// It parses flags, hands them to validateAnswers, and prints; every number it
// shows comes from evaluateHousehold, so the CLI can never drift from the API.
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { PolicyEngineError } from "./client.js";
import { loadSummary } from "./data.js";
import { ENTITLEMENT_TAKE_UP, evaluateHousehold, evaluateOffline, type HouseholdEvaluation } from "./evaluate.js";
import { HOUSEHOLD_FLAGS, rawAnswersFromFlags, type HouseholdFlags } from "./flags.js";
import { PAY_UNITS } from "./income.js";
import { MEDICARE_PART_B_ANNUAL } from "./policyYear.js";
import type { Cliff } from "./analyze.js";
import { type HouseholdAnswers, type ProgramId } from "./types.js";
import { validateAnswers } from "./validate.js";

const USAGE = `hotgap <command> [options]

  curve     evaluate one household against the benefits curve
    --state CA | --zip 94110      location (--zip also resolves county)
    --county 06037                county FIPS; overrides the ZIP's
    --age 30  --married  --spouse-age 30
    --kids 3,7                    child ages         --kids-disabled 1,0
    --disabled  --spouse-disabled
    --rent 1500  --childcare 600  monthly; default none
    --earnings 30000              annual pay from work
    --pay 15 --unit hour|week|month|year     (instead of --earnings; unit defaults to hour)
    --hours 40                    hours a week worked; also converts an hourly --pay
    --spouse-earnings 0
    --ssdi 1500  --child-support 400  --unemployment 300   monthly, other income
    --self-employed               pay is self-employment income, not wages
    --savings 2000                household bank balances (SNAP's asset test)
    --status lpr  --spouse-status undocumented    citizen unless given: lpr, refugee,
                                  asylee, daca, tps, undocumented, deportation_withheld,
                                  cuban_haitian_entrant, conditional_entrant, paroled_one_year
    --years-in-us 3  --spouse-years-in-us 3       for a non-citizen (the five-year bar)
    --head-start  --housing  --employer-coverage  take-up (default: not received)
    --childcare-subsidy           take-up of the state's CCDF child-care subsidy
                                  (default: not received; needs --childcare)
    --energy-assistance           take-up of LIHEAP energy assistance (default: not
                                  received; the report shows where it stops either way)
    --heat-in-rent                heat is included in the rent (halves Michigan's credit)
    --no-snap  --no-tanf  --no-medicaid  --no-wic   not currently received (default: received);
                                  the report then shows what each would pay
    --offline                     use the committed archetype curve
    --json                        print the full evaluation as JSON

  summary [--state CA] [--json]   the weekly sweep's per-state cliff metrics`;

const OPTIONS = {
  ...HOUSEHOLD_FLAGS,
  offline: { type: "boolean" }, json: { type: "boolean" }, help: { type: "boolean" },
} as const;

// The household flags (flags.ts, shared with the site's URL) plus the CLI's own.
type Flags = HouseholdFlags & { offline?: boolean; json?: boolean; help?: boolean };

function fail(code: number, message: string): never {
  console.error(message);
  process.exit(code);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const money = (n: number) => usd.format(n);
// An hourly wage keeps its cents: rounding $16.90 to "$17" would misstate a published rate.
const wage = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
// Signed, because `other` (taxes and market-income effects) can go either way;
// a zero share is left out rather than printed as "$0".
const signed = (n: number) => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;
// What a cliff was when no program can be named for it.
const DRIVER_LABEL: Record<Cliff["driver"], string> = {
  benefits: "a benefit not tracked by name (e.g. SSDI)",
  credits: "tax credits",
  premiums: "health premium",
  other: "taxes / other",
};

// The two child-tax-credit numbers answer different questions and must not be
// read as one. A cliff names the REFUNDABLE credit, the part that sits in the
// money line and can actually fall; `program ends` reports the whole credit,
// because the refundable part reaching zero usually means a rising tax bill
// absorbed the credit, not that the family stopped having it.
const PROGRAM_LABEL: Partial<Record<ProgramId, string>> = { ctc: "ctc (refundable)" };
const programName = (id: ProgramId): string => PROGRAM_LABEL[id] ?? id;

const breakdownOf = (c: Cliff): string => {
  const parts: string[] = [];
  if (Math.round(c.breakdown.benefits) !== 0) parts.push(`benefits ${signed(-c.breakdown.benefits)}`);
  if (Math.round(c.breakdown.credits) !== 0) parts.push(`credits ${signed(-c.breakdown.credits)}`);
  if (Math.round(c.breakdown.premiums) !== 0) parts.push(`premiums ${signed(c.breakdown.premiums)}`);
  if (Math.round(c.breakdown.other) !== 0) parts.push(`other ${signed(-c.breakdown.other)}`);
  return parts.join(" · ");
};

function householdFrom(f: Flags): HouseholdAnswers {
  if (f.state === undefined && f.zip === undefined) fail(2, "--state or --zip is required");
  if (f.unit !== undefined && !(PAY_UNITS as readonly string[]).includes(f.unit)) fail(2, "--unit must be hour, week, month, or year");
  if (f.earnings === undefined && f.pay === undefined) fail(2, "--earnings or --pay is required");
  const v = validateAnswers(rawAnswersFromFlags(f));
  return v.ok ? v.value : fail(2, `bad input: ${v.detail}`);
}

async function evaluateFor(answers: HouseholdAnswers, offline: boolean): Promise<HouseholdEvaluation> {
  if (offline) return evaluateOffline(answers) ?? fail(2, `no archetype curve for ${answers.state}`);
  try {
    const ev = await evaluateHousehold(answers);
    // evaluateHousehold substitutes the baseline curve silently; the notice goes
    // to stderr so a piped `--json` stays machine-readable.
    if (ev.source === "archetype") {
      console.error("PolicyEngine call failed — showing this state's committed archetype curve instead.");
    }
    return ev;
  } catch (e) {
    return fail(1, e instanceof PolicyEngineError ? `PolicyEngine ${e.kind}: ${e.message}` : String(e));
  }
}

function report(ev: HouseholdEvaluation): string {
  const a = ev.answers;
  const { analysis, escape: esc } = ev;
  // The archetype sweep stops at the top of its axis; pay beyond it is
  // evaluated at that top, and every line below must say so.
  const clamped = analysis.currentEarnings !== a.annualEarnings;
  const out: string[] = [
    [
      a.state + (a.countyFips ? ` county ${a.countyFips}` : ""),
      a.married ? "married" : "single",
      a.childAges.length ? `kids aged ${a.childAges.join(", ")}` : "no kids",
      `${money(a.annualEarnings)}/yr from work`,
    ].join(" · "),
    `source: ${ev.source === "live" ? "live PolicyEngine" : "archetype curve (offline)"}`,
    ...(clamped ? [`pay is above the modeled range — evaluated at ${money(analysis.currentEarnings)}, the top of the sweep`] : []),
    `verdict: ${analysis.verdict.replace(/_/g, " ")}`,
    `money after health costs at ${money(analysis.currentEarnings)}: ${money(analysis.currentNet)}`,
    "",
  ];

  const row = (at: string, drop: string, lost: string, hrs: string) =>
    `  ${at.padEnd(10)}${drop.padEnd(10)}${lost.padEnd(32)}${hrs}`;
  // Indices are into analysis.cliffs, which is what minWage.cliffs is built
  // from, so a filtered block still finds its own hours column.
  const cliffLines = (pick: (c: Cliff) => boolean): string[] =>
    analysis.cliffs.flatMap((c, i) => {
      if (!pick(c)) return [];
      const hours = ev.minWage?.cliffs[i]?.hoursPerWeek ?? null;
      return [
        row(money(c.startEarnings), money(c.drop), c.programsLost.map(programName).join(", ") || DRIVER_LABEL[c.driver], hours === null ? "" : String(hours)),
        // Every dollar of the drop attributed, so "lost SNAP" is never read as
        // the whole explanation when most of the fall was a premium.
        `  ${" ".repeat(10)}${breakdownOf(c)}`,
        // …and, for a deferred one, what carries them past it — on its own
        // row, because two deferred cliffs rarely share a rule.
        ...(c.deferral ? [`  ${" ".repeat(10)}until ${c.deferral.until}`] : []),
      ];
    });

  const now = cliffLines((c) => c.deferral === null);
  if (now.length === 0) out.push(`no cliffs on this curve${ev.deferred.length ? " that arrive with the raise" : ""}`);
  else out.push(row("at", "drop", "programs lost", ev.minWage ? `~hrs/wk at ${wage(ev.minWage.wage)} min wage` : ""), ...now);

  // Deferred cliffs are real losses that simply do not land in the year of the
  // raise, so they get their own block and stay out of the verdict, the danger
  // zones and the leap above.
  if (ev.deferred.length) {
    out.push("", "later, at the next renewal — these do not arrive with the raise, so nothing above counts them");
    out.push(...cliffLines((c) => c.deferral !== null));
  }

  // This household's own position first — the state-level safe exit and leap
  // below answer a different question (the worst zone anywhere on the curve).
  out.push("", "your path");
  if (ev.personal.zone === null) {
    out.push(`  you are not in a rough zone at ${money(analysis.currentEarnings)}`);
  } else if (ev.personal.raiseIsLowerBound) {
    out.push(`  you are in a rough zone from ${money(ev.personal.zone.startEarnings)} that does not recover inside the modeled range`);
    out.push(`  a raise of at least ${money(ev.personal.raiseToClear!)} to clear it`);
  } else {
    out.push(`  you are in a rough zone from ${money(ev.personal.zone.startEarnings)} to ${money(ev.personal.escapeEarnings!)}`);
    out.push(`  a raise of ${money(ev.personal.raiseToClear!)} clears it`);
  }

  out.push(
    "",
    `safe exit: ${esc.safeExitEarnings === null ? "not within the modeled range" : esc.safeExitEarnings === 0 ? "already clear — no danger zone" : money(esc.safeExitEarnings)}`,
    `the leap: ${money(esc.leap)}${esc.leapIsLowerBound ? " (at least)" : ""}`,
    `benefits end: ${esc.benefitsEndEarnings === null ? "beyond the modeled range" : money(esc.benefitsEndEarnings)}`,
  );

  // Adults and children lose the same program at different incomes, so they
  // only share a line when the thresholds actually coincide.
  const { adults, children } = esc.programEndsByAge;
  // A curve swept before `ctc` was requested knows only the refundable series,
  // so its threshold IS a cliff's and carries the same label. Once the sweep
  // carries the whole credit the two differ, and the note below says how.
  const knowsTotalCtc = ev.curve.points.some((p) => p.totalCtc !== p.programs.ctc);
  const ends = Object.entries(esc.programEnds).map(([id, at]) => {
    const name = id === "ctc" && !knowsTotalCtc ? programName("ctc") : id;
    const forAdults = adults[id as ProgramId];
    const forChildren = children[id as ProgramId];
    if (forAdults !== undefined && forChildren !== undefined && forAdults !== forChildren) {
      return `${name} adults ${money(forAdults)}, children ${money(forChildren)}`;
    }
    return `${name} ${money(at)}`;
  });
  if (ends.length) out.push(`program ends: ${ends.join(" · ")}`);
  if (esc.programEnds.ctc !== undefined && knowsTotalCtc) {
    out.push("  ctc there is the whole child tax credit; a cliff's \"ctc (refundable)\" is only the part paid out as a refund, which stops earlier as a rising tax bill absorbs the credit.");
  }
  if (esc.childCoverageEndEarnings !== null) {
    out.push(
      `children's coverage: past ${money(esc.childCoverageEndEarnings)} the children no longer qualify — but a child already enrolled keeps Medicaid or CHIP until the next yearly renewal, up to 12 months away (42 CFR 435.926, 457.342), so the loss is deferred, not immediate`,
    );
  }

  if (ev.coverageGap) {
    out.push(
      "",
      `no coverage help exists between ${money(ev.coverageGap.fromEarnings)} and ${money(ev.coverageGap.toEarnings)} in ${a.state}${analysis.currentEarnings >= ev.coverageGap.fromEarnings && analysis.currentEarnings <= ev.coverageGap.toEarnings ? " — your pay is in that band" : ""} — ${a.youStatus === "citizen" && a.spouseStatus === "citizen" ? `too much for ${a.state} Medicaid, too little for a marketplace subsidy (which starts at the poverty line)` : `Medicaid is barred by immigration status (the five-year bar for permanent residents, 8 U.S.C. 1613), and since 2026 a lawfully present adult under the poverty line no longer qualifies for a marketplace subsidy either (P.L. 119-21 repealed 26 U.S.C. 36B(c)(1)(B))`}. Shown with no premium, because nobody in that band is buying that plan.`,
    );
  }
  if (ev.headStart) {
    out.push(
      "",
      `Head Start is priced at ${money(ev.headStart.stickerValue)} a year by PolicyEngine, but it is worth what it would cost to replace: ${money(ev.headStart.replacementValue)}, a full-day preschool place at ${money(ev.headStart.monthlyReplacementCost)} a month — ${ev.headStart.usesStateMarketPrice ? `the going price in ${a.state}, because a free full-day slot replaces the whole bill even for a family paying nothing today` : "the childcare you told us you buy"}. And a raise past the income limit does not end it — an enrolled child stays eligible through the following program year (45 CFR 1302.12(j)(1)).`,
    );
  }
  if (ev.maTafdc) out.push("", ev.maTafdc.message);
  if (ev.statePremiumAssistance) {
    const sp = ev.statePremiumAssistance;
    out.push("", `${a.state}'s ${sp.program} is modeled by PolicyEngine and netted out of the premium here — up to ${money(sp.maxAnnual)}/yr on this curve.`);
  }
  if (ev.premiumWrap) {
    const w = ev.premiumWrap;
    out.push("", `${a.state}'s ${w.program} makes the marketplace plan free up to ${Math.round(w.zeroPremiumUpToFpl * 100)}% of the poverty line — shown with no premium in that band (${w.source}).`);
  }
  if (ev.perMemberPremiumHelp) {
    const h = ev.perMemberPremiumHelp;
    out.push("", `${a.state}'s ${h.program} pays a flat amount each month for every person on the plan, which this endpoint's PolicyEngine does not compute — HotGap applies the published schedule itself, up to ${money(h.maxAnnual)}/yr on this curve (${h.source}).`);
  }
  if (ev.esi) {
    const TIER_NAME = { single: "single", plusOne: "employee-plus-one", family: "family" } as const;
    out.push(
      "",
      ev.esi.tier === null
        ? `employer coverage: nothing charged at ${money(analysis.currentEarnings)} — at this pay the plan holder is on Medicaid${a.hoursPerWeek !== null && a.hoursPerWeek < 30 ? `, or works under 30 hours a week (26 U.S.C. 4980H(c)(4)), so no employer owes them a plan` : ""}.`
        : `employer coverage: counted at ${money(ev.esi.annualContribution)}/yr, the average ${TIER_NAME[ev.esi.tier]} employee contribution (AHRQ MEPS-IC 2024), in place of the marketplace premium PolicyEngine would otherwise charge you. The tier follows who the plan has to cover at your pay, so it can change along the curve as children move on and off Medicaid.`,
    );
  }
  if (a.hoursPerWeek === null) {
    out.push("", "hours: assumed full time (40 a week) because --hours was not given. SNAP's work rules for adults without young children, and some states' child-care activity tests, read this; pass --hours if you work less.");
  }
  const off = ENTITLEMENT_TAKE_UP.filter(({ flag }) => !a[flag]).map(({ program }) => program);
  if (off.length) {
    const NAME = { snap: "SNAP", tanf: "TANF", medicaid: "Medicaid", wic: "WIC" } as const;
    const claims = (ev.unclaimed ?? []).map((u) => `${NAME[u.program]} about ${money(u.annual)}/yr`);
    out.push(
      "",
      `not received: ${off.map((k) => NAME[k]).join(", ")} — the curve above is the money you live on without ${off.length > 1 ? "them" : "it"}.` +
        (ev.unclaimed === null ? " Whether you would qualify is not checked on the offline curve." : claims.length ? ` At ${money(analysis.currentEarnings)} you appear to qualify for ${claims.join(", ")}; a caseworker decides.` : ` At ${money(analysis.currentEarnings)} you would not qualify for ${off.length > 1 ? "them" : "it"} anyway.`),
    );
  }
  if (a.ssdiMonthly > 0 && !a.hasEmployerCoverage) {
    out.push(
      "",
      `SSDI: modeled as already on Medicare — entitlement starts 24 months after the first check and runs at least 93 months past a trial work period (42 U.S.C. 426(b)), so crossing substantial gainful activity costs the check, not the coverage. No marketplace premium is charged; the 2026 Part B premium of ${money(MEDICARE_PART_B_ANNUAL)}/yr is, except where you are on Medicaid, which stands in for a Medicare Savings Program paying it. HotGap does not ask how long you have had SSDI: in the first two years there would still be a marketplace premium, and this leaves it out.`,
    );
  }

  // "N% earn at or below X" — how common the income is, never odds of reaching it.
  const earnAtOrBelow = (pct: number, at: number, what: string) =>
    `  ${Math.round(pct)}% of similar households earn at or below ${money(at)} (${what})`;
  const reach: string[] = [];
  if (ev.reach.current !== null) reach.push(earnAtOrBelow(ev.reach.current, analysis.currentEarnings, clamped ? "evaluated pay" : "your pay"));
  if (ev.reach.safeExit !== null) reach.push(earnAtOrBelow(ev.reach.safeExit, esc.safeExitEarnings!, "safe exit"));
  if (reach.length) out.push("", "reach", ...reach);

  if (ev.minWage) {
    out.push("", `full-time at ${a.state} minimum wage (${wage(ev.minWage.wage)}/hr): ${money(ev.minWage.fullTimeEarnings)}`);
  }
  return out.join("\n");
}

function summaryReport(f: Flags): number {
  const summary = loadSummary();
  const states = f.state ? [f.state.toUpperCase()] : Object.keys(summary.states).sort();
  const picked = Object.fromEntries(states.map((s) => [s, summary.states[s] ?? fail(2, `no sweep data for ${s}`)]));
  if (f.json) {
    // The numbers travel with what a reader must know about them (data.ts StateCoverage).
    const coverage = summary.coverage && Object.fromEntries(states.map((s) => [s, summary.coverage![s]]));
    console.log(JSON.stringify({ generated: summary.generated, year: summary.year, states: picked, ...(coverage ? { coverage } : {}) }, null, 2));
    return 0;
  }
  console.log(`numbers last changed ${summary.generated} · policy year ${summary.year}`);
  const blind = (summary.childcareSubsidyUnmodeled ?? []).filter((s) => states.includes(s));
  if (blind.length) {
    console.log(`note: PolicyEngine models no child-care subsidy in ${blind.join(", ")}, so the childcare cliff is missing there — not a kinder rule.`);
  }
  const cols = (id: string, loss: string, leap: string, exit: string, count: string, deferred: string, width: string) =>
    `  ${id.padEnd(15)}${loss.padStart(13)}${leap.padStart(10)}${exit.padStart(11)}${count.padStart(8)}${deferred.padStart(10)}${width.padStart(14)}`;
  for (const [state, rows] of Object.entries(picked)) {
    console.log(`\n${state}`);
    console.log(cols("archetype", "biggest loss", "leap", "safe exit", "cliffs", "deferred", "danger width"));
    for (const [id, m] of Object.entries(rows)) {
      console.log(cols(id, money(m.biggestLoss), money(m.leap), m.safeExit === null ? "none" : money(m.safeExit), String(m.cliffCount), String(m.deferredCliffCount ?? 0), money(m.dangerWidth)));
    }
    for (const message of new Set(Object.values(rows).flatMap((m) => m.maTafdc ? [m.maTafdc.message] : []))) {
      console.log(message);
    }
  }
  return 0;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  let parsed: ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>>;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
  } catch (e) {
    return fail(2, `${(e as Error).message} — try --help`);
  }
  const { values, positionals } = parsed;
  const f: Flags = values;
  const command = positionals[0];
  if (f.help || command === undefined) {
    console.log(USAGE);
    return f.help ? 0 : 2;
  }
  if (command === "summary") return summaryReport(f);
  if (command !== "curve") fail(2, `unknown command "${command}" — try --help`);

  const ev = await evaluateFor(householdFrom(f), f.offline === true);
  console.log(f.json ? JSON.stringify(ev, null, 2) : report(ev));
  return 0;
}

// Only run when this file is the invoked entrypoint (via `tsx core/src/cli.ts`),
// not when imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => { process.exitCode = code; },
    (e: unknown) => fail(1, e instanceof Error ? e.message : String(e)),
  );
}
