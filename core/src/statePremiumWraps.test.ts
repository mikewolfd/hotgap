import { describe, it, expect } from "vitest";
import { STATE_CODES } from "./states.js";
import { STATE_PREMIUM_ASSISTANCE, UNMODELED_STATE_PREMIUM_ASSISTANCE } from "./statePremiumAssistance.js";
import { PER_MEMBER_PREMIUM_HELP, STATE_PREMIUM_WRAPS, perMemberPremiumHelpFor, premiumTierAbove, premiumWrapFor } from "./statePremiumWraps.js";

// A state exchange that does not publish on a .gov domain. Every other source
// must be government. Listing them by name is the point: it is what stops a
// blog, an insurer, or a policy shop's summary from being cited as the bound.
const STATE_EXCHANGE_HOSTS = ["mahealthconnector.org", "coveredca.com", "wahbexchange.org"];

const isGovernmentSource = (url: string): boolean => {
  const { protocol, hostname } = new URL(url);
  if (protocol !== "https:") return false;
  if (hostname === "gov" || hostname.endsWith(".gov")) return true;
  return STATE_EXCHANGE_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
};

describe("STATE_PREMIUM_WRAPS", () => {
  it("names a state HotGap models, at most once each", () => {
    for (const w of STATE_PREMIUM_WRAPS) expect(STATE_CODES, w.state).toContain(w.state);
    const states = STATE_PREMIUM_WRAPS.map((w) => w.state);
    expect(new Set(states).size, "a second row for a state would be unreachable").toBe(states.length);
  });

  it("bounds every tier inside the range a marketplace wrap can live in", () => {
    for (const w of STATE_PREMIUM_WRAPS) {
      // Below 100% FPL there is no premium tax credit to wrap (26 CFR
      // 1.36B-2(b)(1)); above 400% no state in the table claims a $0 tier.
      expect(w.zeroPremiumUpToFpl, w.state).toBeGreaterThanOrEqual(1.0);
      expect(w.zeroPremiumUpToFpl, w.state).toBeLessThanOrEqual(4.0);
    }
  });

  it("cites a state or state-exchange page over https", () => {
    for (const w of STATE_PREMIUM_WRAPS) {
      expect(w.source.startsWith("https://"), `${w.state}: ${w.source}`).toBe(true);
      expect(isGovernmentSource(w.source), `${w.state}: ${w.source} is not a state source`).toBe(true);
    }
  });

  it("records a real, already-past date for every reading", () => {
    for (const w of STATE_PREMIUM_WRAPS) {
      expect(w.readOn, w.state).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const read = new Date(`${w.readOn}T00:00:00Z`);
      expect(Number.isNaN(read.getTime()), w.state).toBe(false);
      // Round-tripping catches 2026-02-30, which Date would otherwise roll over.
      expect(read.toISOString().slice(0, 10), w.state).toBe(w.readOn);
      expect(read.getTime(), `${w.state} was read in the future`).toBeLessThanOrEqual(Date.now());
    }
  });

  it("names the program and its conditions", () => {
    for (const w of STATE_PREMIUM_WRAPS) {
      expect(w.program.length, w.state).toBeGreaterThan(0);
      // Every one of these programs is conditional — on APTC take-up, a plan
      // level, an age range, or a Medicaid screen. A row with no note is a row
      // whose conditions were not read.
      expect(w.note, w.state).toBeTruthy();
    }
  });

  // The bounds themselves, pinned to what each state publishes. These are the
  // numbers that move when the policy year moves, so they are asserted
  // literally rather than derived from the table under test.
  it("pins each published 2026 bound", () => {
    const bounds = Object.fromEntries(STATE_PREMIUM_WRAPS.map((w) => [w.state, w.zeroPremiumUpToFpl]));
    expect(bounds).toEqual({
      CT: 1.75, // CT DSS: "up to and including 175% of the Federal Poverty Level"
      MA: 1.50, // MA Health Connector 2026 table: Plan Type 2A, 100–150% FPL, $0
      NM: 2.00, // NM HCA PY26 MAP manual, Table 1: 0% of income up to 200% FPL
      CA: 1.50, // Covered California 2026 Table 1: 0.0% applicable percentage under 150% FPL
    });
  });

  // States checked and deliberately left out, with what each actually pays for
  // 2026. Read as a list of "do not re-add without new evidence".
  it("leaves out the states whose 2026 help is not an FPL-bounded $0 tier", () => {
    const excluded = [
      // NJ and WA pay a flat amount per person per month with no $0 band, so
      // they belong to PER_MEMBER_PREMIUM_HELP below, never to this table.
      ...PER_MEMBER_PREMIUM_HELP.map((h) => h.state),
      "CO", // Colorado Premium Assistance: $80 first member + $29 each after, capped at the premium
      "MD", // Maryland Premium Assistance: no published $0 band, and closed to anyone enrolling after 2026-04-01
      "VT", // Vermont Premium Assistance: lowers the bill by 1.5% of income — 2.10% ACA minus 1.5% is not $0
      "NY", // Essential Plan is a Basic Health Program, not a marketplace wrap; PolicyEngine models it
    ];
    for (const state of excluded) expect(premiumWrapFor(state, 1.2), state).toBeNull();
  });

  // The claim the journalist map's hatch rests on. It was NJ and WA until
  // 2026-09-16; if it ever fills again, the state named here is one whose
  // premium figure a reader must not compare with another state's.
  it("leaves no state's 2026 premium help modeled nowhere", () => {
    expect(UNMODELED_STATE_PREMIUM_ASSISTANCE).toEqual([]);
    // Vacuous today by design, and the assertion above is what keeps it so;
    // the loop is what catches a row added back without a table to hold it.
    for (const { state } of UNMODELED_STATE_PREMIUM_ASSISTANCE) {
      const modeled = STATE_PREMIUM_ASSISTANCE.some((s) => s.state === state);
      const local = STATE_PREMIUM_WRAPS.some((w) => w.state === state) || PER_MEMBER_PREMIUM_HELP.some((h) => h.state === state);
      expect(modeled || local, `${state} is modeled after all`).toBe(false);
    }
  });
});

describe("premiumWrapFor", () => {
  it("returns the state's tier for an enrollee inside it", () => {
    const ct = premiumWrapFor("CT", 1.47);
    expect(ct?.state).toBe("CT");
    expect(ct?.program).toBe("Covered Connecticut Program");
    expect(premiumWrapFor("NM", 1.95)?.state).toBe("NM");
  });

  it("returns null above the tier", () => {
    expect(premiumWrapFor("CT", 1.80)).toBeNull();
    expect(premiumWrapFor("MA", 1.51)).toBeNull();
    expect(premiumWrapFor("NM", 2.01)).toBeNull();
  });

  it("returns null for a state with no wrap", () => {
    expect(premiumWrapFor("TX", 1.2)).toBeNull();
    expect(premiumWrapFor("", 1.2)).toBeNull();
  });

  it("includes the bound itself", () => {
    // CT and MA and NM all publish inclusive bands ("up to and including 175%",
    // "100–150%", "Up to 150% / 150-200%"). California's is exclusive; its row
    // says so, and a $1,000-step curve does not land on 150.00% anyway.
    expect(premiumWrapFor("CT", 1.75)?.state).toBe("CT");
    expect(premiumWrapFor("MA", 1.50)?.state).toBe("MA");
    expect(premiumWrapFor("NM", 2.00)?.state).toBe("NM");
  });

  it("gives no wrap below the premium tax credit's own 100%-FPL floor", () => {
    // There is nothing to wrap down here: an enrollee under 100% FPL gets no
    // APTC, so every one of these programs' "use all your federal help" test
    // fails. Cf. applyCoverageGap, which measures the same floor.
    expect(premiumWrapFor("CT", 0.99)).toBeNull();
    expect(premiumWrapFor("CT", 0)).toBeNull();
    expect(premiumWrapFor("CT", 1.0)?.state).toBe("CT");
  });

  it("gives no wrap for a share that is not a number", () => {
    expect(premiumWrapFor("CT", Number.NaN)).toBeNull();
    expect(premiumWrapFor("CT", Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("reduced-premium tiers", () => {
  it("are ordered, start above the $0 band, and price MA's ladder per enrollee", () => {
    for (const w of STATE_PREMIUM_WRAPS) {
      if (!w.tiers) continue;
      let prev = w.zeroPremiumUpToFpl;
      for (const t of w.tiers) { expect(t.upToFpl).toBeGreaterThan(prev); prev = t.upToFpl; expect(t.source.startsWith("https://")).toBe(true); }
    }
    expect(premiumTierAbove("MA", 2.12)?.tier.annualPremium(0, 2.12, 1)).toBe(103 * 12);
    expect(premiumTierAbove("MA", 3.5)?.tier.annualPremium(0, 3.5, 2)).toBe(235 * 12 * 2);
    expect(premiumTierAbove("MA", 4.5)).toBeNull();
    expect(premiumTierAbove("CT", 1.8)).toBeNull();
  });
});

describe("PER_MEMBER_PREMIUM_HELP", () => {
  it("holds the provenance the $0 table holds: a state page over https, a past reading date, the program and its conditions, the issue that retires it", () => {
    for (const h of PER_MEMBER_PREMIUM_HELP) {
      expect(STATE_CODES, h.state).toContain(h.state);
      expect(isGovernmentSource(h.source), `${h.state}: ${h.source} is not a state source`).toBe(true);
      expect(h.readOn, h.state).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const read = new Date(`${h.readOn}T00:00:00Z`);
      expect(read.toISOString().slice(0, 10), h.state).toBe(h.readOn);
      expect(read.getTime(), `${h.state} was read in the future`).toBeLessThanOrEqual(Date.now());
      expect(h.program.length, h.state).toBeGreaterThan(0);
      expect(h.note, h.state).toBeTruthy();
      expect(h.upstreamIssue, h.state).toMatch(/^#\d{4}$/);
    }
  });

  it("names each state once, in one table only", () => {
    const states = PER_MEMBER_PREMIUM_HELP.map((h) => h.state);
    expect(new Set(states).size).toBe(states.length);
    for (const state of states) expect(STATE_PREMIUM_WRAPS.some((w) => w.state === state), `${state} is in both tables`).toBe(false);
  });

  it("keeps every band ordered, above the program's own floor, and inside the range a marketplace wrap can live in", () => {
    for (const h of PER_MEMBER_PREMIUM_HELP) {
      expect(h.fromFpl, h.state).toBeGreaterThanOrEqual(1.0);
      let prev = h.fromFpl;
      for (const b of h.bands) {
        expect(b.upToFpl, h.state).toBeGreaterThan(prev);
        expect(b.monthlyPerMember, h.state).toBeGreaterThan(0);
        prev = b.upToFpl;
      }
      // Nobody's marketplace wrap reaches past New Jersey's 600%.
      expect(prev, h.state).toBeLessThanOrEqual(6.0);
    }
  });

  // The figures themselves, pinned to what each publisher printed. These move
  // when the plan year moves, so they are asserted literally.
  it("pins each published 2026 schedule", () => {
    const schedules = Object.fromEntries(PER_MEMBER_PREMIUM_HELP.map((h) => [h.state, { from: h.fromFpl, bands: h.bands.map((b) => [b.upToFpl, b.monthlyPerMember]) }]));
    expect(schedules).toEqual({
      // Treasury OTA 1332 addendum (Nov 2021), enhanced schedule; DOBI FY2026 "$20 ... $100"; DOBI FY2027 "up to 600% FPL" in 2026
      NJ: { from: 1.38, bands: [[1.50, 20], [2.00, 40], [2.50, 50], [4.00, 100], [6.00, 50]] },
      // WAHBE 2025-09-30 memo: "$55 per member, per month"; final PY2026 policy §4(1)(c): "up to 250%", no floor
      WA: { from: 1.0, bands: [[2.50, 55]] },
    });
  });
});

describe("perMemberPremiumHelpFor", () => {
  it("steps through New Jersey's bands, upper-inclusive, and stops at 600%", () => {
    const at = (share: number) => perMemberPremiumHelpFor("NJ", share)?.monthlyPerMember ?? null;
    expect(at(1.37)).toBeNull(); // NJ FamilyCare below 138%
    expect(at(1.38)).toBe(20);
    expect(at(1.50)).toBe(20);
    expect(at(1.51)).toBe(40);
    expect(at(2.00)).toBe(40);
    expect(at(2.01)).toBe(50);
    expect(at(2.50)).toBe(50);
    expect(at(2.51)).toBe(100);
    expect(at(4.00)).toBe(100);
    expect(at(4.01)).toBe(50); // the federal credit ends here; the state's $50 does not
    expect(at(6.00)).toBe(50);
    expect(at(6.01)).toBeNull();
  });

  it("pays Washington's flat $55 from the credit's floor to 250% and nothing past it", () => {
    const at = (share: number) => perMemberPremiumHelpFor("WA", share)?.monthlyPerMember ?? null;
    expect(at(0.99)).toBeNull();
    expect(at(1.0)).toBe(55);
    expect(at(1.38)).toBe(55);
    expect(at(2.50)).toBe(55);
    expect(at(2.51)).toBeNull();
  });

  it("returns null for a state with no schedule and for a share that is not a number", () => {
    expect(perMemberPremiumHelpFor("CT", 1.5)).toBeNull();
    expect(perMemberPremiumHelpFor("", 1.5)).toBeNull();
    expect(perMemberPremiumHelpFor("NJ", Number.NaN)).toBeNull();
    expect(perMemberPremiumHelpFor("NJ", Number.POSITIVE_INFINITY)).toBeNull();
  });
});
