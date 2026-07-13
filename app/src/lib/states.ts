export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "Washington, DC", FL: "Florida",
  GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// Statewide minimum wage ($/hour) in effect as of July 2026 — reflects Jan 1 2026
// and July 1 2026 changes. Used only to CONTEXTUALIZE where a cliff falls (an
// "hours a week at minimum wage" translation + a full-time reference line); it is
// never a model input. Rules:
//  - No state law or set below federal → federal $7.25.
//  - Geographically tiered states → LOWEST tier (conservative: never overstates
//    how few hours a cliff represents). OR = nonurban $14.55; NY = upstate $16.00.
//  - FL is $14.00 now; it rises to $15.00 on Sept 30 2026.
// Small hand-maintained table — NOT wired into the weekly data Action (minimum
// wage changes ~yearly). Sources: US DOL state minimum-wage table; NCSL; EPI
// July-2026 mid-year tracker; Oregon BOLI; CA DIR 2026 notice.
export const STATE_MIN_WAGE: Record<string, number> = {
  AL: 7.25, AK: 14.00, AZ: 15.15, AR: 11.00, CA: 16.90,
  CO: 15.16, CT: 16.94, DE: 15.00, DC: 17.95, FL: 14.00,
  GA: 7.25, HI: 16.00, ID: 7.25, IL: 15.00, IN: 7.25, IA: 7.25,
  KS: 7.25, KY: 7.25, LA: 7.25, ME: 15.10, MD: 15.00,
  MA: 15.00, MI: 13.73, MN: 11.41, MS: 7.25, MO: 15.00,
  MT: 10.85, NE: 15.00, NV: 12.00, NH: 7.25, NJ: 15.92,
  NM: 12.00, NY: 16.00, NC: 7.25, ND: 7.25, OH: 11.00,
  OK: 7.25, OR: 14.55, PA: 7.25, RI: 16.00, SC: 7.25,
  SD: 11.85, TN: 7.25, TX: 7.25, UT: 7.25, VT: 14.42,
  VA: 12.77, WA: 17.13, WV: 8.75, WI: 7.25, WY: 7.25,
};
