// The 50 states + DC that HotGap models, keyed by USPS code. Every other
// state-keyed table in the package (minimum wage, FIPS, reach ladders, the
// weekly sweep) is checked against this list by tests.
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

export const STATE_CODES: readonly string[] = Object.keys(STATE_NAMES);

// Census FIPS state code -> USPS abbreviation. County FIPS codes start with
// the state's two digits, so this also tells you which state a county is in.
export const FIPS_TO_USPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

// Statewide minimum wage ($/hour) in effect as of July 2026 — reflects Jan 1 2026
// and July 1 2026 changes. Used only to CONTEXTUALIZE where a cliff falls (an
// "hours a week at minimum wage" translation + a full-time reference point); it
// is never a model input. Rules:
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
