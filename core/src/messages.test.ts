import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stateCoverage } from "./coverage.js";
import type { StateCoverage, SummaryJson } from "./data.js";
import { provideData } from "./data.js";
import { message, type Coded, type MessageCode } from "./messages.js";
import en from "./messages/en.json" with { type: "json" };
import { STATE_CODES, STATE_NAMES } from "./states.js";
import { validateAnswers } from "./validate.js";
import { answersFor, archetypeById } from "./archetypes.js";
import { evaluateOffline } from "./evaluate.js";
import { keepRateWords } from "./road.js";
import { resolvePlace } from "./zip.js";

const root = new URL("../", import.meta.url);
const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, root), "utf8"));
provideData({ "state-defaults.json": read("data/state-defaults.json"), "smi.json": read("data/smi.json"), "reach.json": read("data/reach.json"), "zip3-state.json": read("data/zip3-state.json"), "county-names.json": read("data/county-names.json") });
const summary = read("data/summary.json") as SummaryJson;

type Nest = { [k: string]: string | Nest };
const codes = (o: Nest, path = ""): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === "string" ? [path ? `${path}.${k}` : k] : codes(v, path ? `${path}.${k}` : k)));
const ALL_CODES = new Set(codes(en as unknown as Nest).filter((c) => !c.startsWith("_")));

/** Every note a coverage block carries, with the code beside it. */
function notes(c: StateCoverage): { note: string; message?: Coded; where: string }[] {
  const cx = c.corrections;
  return [
    ...cx.policyOverrides.map((o) => ({ note: o.note, message: o.message, where: `override ${o.parameter}` })),
    { note: cx.maTafdc.note, message: cx.maTafdc.message, where: "maTafdc" },
    { note: cx.premiumAssistance.note, message: cx.premiumAssistance.message, where: "premiumAssistance" },
    { note: cx.childcareSubsidy.note, message: cx.childcareSubsidy.message, where: "childcareSubsidy" },
    { note: cx.coverageGap.note, message: cx.coverageGap.message, where: "coverageGap" },
    ...(cx.liheap ? [{ note: cx.liheap.note, message: cx.liheap.message, where: "liheap" }] : []),
    ...c.unmodeled.map((u) => ({ note: u.note, message: u.message, where: `unmodeled ${u.program}` })),
    ...c.otherBenefits.map((o) => ({ note: o.label, message: o.message, where: `otherBenefits ${o.variable}` })),
  ];
}

describe("core's prose is a code (app/README.md § Languages)", () => {
  it("every code a coverage block emits has an English message that renders to the note beside it, and the notes are the committed summary's, byte for byte", () => {
    // The committed file holds the sentences as core wrote them before they
    // were codes (or, once rebuilt, as the codes render them): either way,
    // what a reader saw is what the code says.
    let seen = 0;
    for (const state of STATE_CODES) {
      const curves = Object.fromEntries(Object.entries(read(`data/states/${state}.json`).archetypes as Record<string, { points: unknown[] }>).map(([id, a]) => [id, a.points]));
      const c = stateCoverage(state, curves as never, { model: summary.model, childcareSubsidyUnmodeled: summary.childcareSubsidyUnmodeled });
      const committed = notes(summary.coverage![state]);
      const fresh = notes(c);
      expect(fresh.map((n) => n.where), state).toEqual(committed.map((n) => n.where));
      for (const [i, n] of fresh.entries()) {
        expect(n.message, `${state} ${n.where}`).toBeDefined();
        expect(ALL_CODES.has(n.message!.code), `${state} ${n.where}: ${n.message!.code}`).toBe(true);
        expect(message(n.message!.code, n.message!.params), `${state} ${n.where}`).toBe(n.note);
        expect(n.note, `${state} ${n.where}`).toBe(committed[i].note);
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(51 * 5);
  });

  it("a validation detail and a place's refusal carry their code, and the code renders to the detail", () => {
    const cases = [
      validateAnswers(null), validateAnswers({ state: "XX" }), validateAnswers({ zip: "00901" }), validateAnswers({ zip: "00000" }),
      resolvePlace({ zip: "94110", state: "NY" }),
    ];
    for (const v of cases) {
      expect(v.ok).toBe(false);
      if (v.ok) continue;
      expect(ALL_CODES.has(v.message.code), v.message.code).toBe(true);
      expect(message(v.message.code, v.message.params)).toBe(v.detail);
    }
  });

  it("an unknown code throws rather than rendering blank", () => {
    expect(() => message("no.such.code" as MessageCode)).toThrow(/no message/);
  });

  it("every code the English file has, the Spanish draft has too, and nothing extra", () => {
    // A message the other file lacks renders in English, so a partial
    // translation ships — but core's own sentences are few enough that a gap
    // is an oversight, not a decision. Both ways: an orphan in es-US is a
    // code that was renamed or removed and left behind.
    const { _: _record, ...rest } = read("src/messages/es-US.json") as Record<string, Nest>;
    const es = new Set(codes(rest as Nest));
    expect([...ALL_CODES].filter((c) => !es.has(c))).toEqual([]);
    expect([...es].filter((c) => !ALL_CODES.has(c))).toEqual([]);
  });
});

describe("the road out of poverty says the same thing the plan says (Plan 9)", () => {
  // The sentences the journalist readout is built from, rendered here with the
  // numbers read from the committed sweep — never typed — so the words are
  // pinned and the figures stay the data's.
  const road = evaluateOffline(answersFor("MO", archetypeById("single-2")))!.road!;
  const { sign, cents } = keepRateWords(road.keepRate!);
  // Money reaches a message already formatted, as every catalog message's does
  // (app/README.md § Languages): the locale's own dollars, and — on the
  // citizen page — the person's own pay unit, neither of which a bare number
  // could carry through ICU.
  const money = (n: number): string =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  it("renders Missouri's road sentence word for word", () => {
    expect(message("road.sentence", { state: STATE_NAMES.MO, household: "a single parent of two", sign, cents }))
      .toBe("Missouri — a single parent of two who earns their way from poverty to twice poverty ends up 63¢ poorer for every extra dollar.");
  });

  it("renders where the road collapses, and who is standing there", () => {
    expect(message("road.collapse", { at: money(road.worst!.startEarnings), program: "child-care help", drop: money(road.worst!.drop) }))
      .toBe("The road collapses at $40,000, where child-care help ends and the family loses $16,428 in one step.");
    expect(message("road.position", { n: Math.round(road.worst!.position!) })).toMatch(/^\d+ in 100 families like this earn less$/);
  });

  it("says a keep rate either way round: kept on the map's legend, poorer in the sentence", () => {
    expect(message("road.rate", { sign, cents })).toBe("loses 63¢ of each extra dollar");
    expect(message("road.rate", keepRateWords(0.3))).toBe("keeps 30¢ of each extra dollar");
    expect(message("road.sentence", { state: "New Mexico", household: "a single parent of two", ...keepRateWords(0.3) }))
      .toBe("New Mexico — a single parent of two who earns their way from poverty to twice poverty keeps 30¢ of every extra dollar.");
  });

  it("says the next stretch, and says a plateau when there is no step to point at", () => {
    expect(message("road.keepNext", { over: money(10_000), kept: money(1200) })).toBe("Of the next $10,000 you earn, you keep about $1,200.");
    expect(message("road.plateau", { over: money(10_000), kept: money(200) })).toBe("Of the next $10,000 you earn, you keep about $200 — a plateau: more work, almost the same money.");
  });
});
