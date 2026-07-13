import { ChoroplethMap, type StateValues } from "@hotgap/design-system";

// Biggest yearly loss for a single parent of two, by state (illustrative
// spread across the range so every ramp step is visible).
const values: StateValues = {
  OR: 27513, VT: 24690, HI: 23800, NJ: 22400, MD: 18500, MA: 17800, CA: 20100,
  NY: 19200, CO: 16900, WA: 15400, MN: 14800, IL: 14200, VA: 12600, AZ: 11800,
  NC: 11200, GA: 12000, FL: 12500, TX: 13100, OH: 10900, PA: 10800, MI: 10500,
  WV: 10832, TN: 9800, IN: 9600, MO: 9400, KY: 9100, AL: 8700, SC: 9200,
  LA: 8900, OK: 8600, AR: 8400, MS: 8200, KS: 9000, NE: 9300, ID: 9500,
  UT: 10200, NV: 11000, NM: 10600, WI: 11400, IA: 10100, CT: 18900, RI: 16200,
  ME: 13800, NH: 14100, DE: 13200, DC: 15800, MT: 9700, WY: 8500, ND: 8800,
  SD: 8300, AK: 12800,
};

export const WorstLoss = () => (
  <ChoroplethMap
    values={values}
    valueLabel="biggest yearly loss"
    selected="OR"
    formatValue={(v) => `$${Math.round(v / 1000)}k`}
  />
);
