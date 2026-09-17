import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stateCoverage } from "./coverage.js";
import type { StateCoverage, SummaryJson } from "./data.js";
import { provideData } from "./data.js";
import { message, type Coded, type MessageCode } from "./messages.js";
import en from "./messages/en.json" with { type: "json" };
import { STATE_CODES } from "./states.js";
import { validateAnswers } from "./validate.js";
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
});
