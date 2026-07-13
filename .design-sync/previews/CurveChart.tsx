import { CurveChart, type CurveAnalysis } from "@hotgap/design-system";

// A single parent of two in a high-cost state: a real benefits cliff at
// $30k/yr (net falls $8k as SNAP + Medicaid end), then recovery.
const analysis: CurveAnalysis = {
  points: [
    { earnings: 0, netIncome: 20000 },
    { earnings: 10000, netIncome: 26000 },
    { earnings: 20000, netIncome: 30000 },
    { earnings: 30000, netIncome: 33000 },
    { earnings: 40000, netIncome: 25000 },
    { earnings: 60000, netIncome: 34000 },
    { earnings: 80000, netIncome: 42000 },
    { earnings: 100000, netIncome: 50000 },
  ],
  cliffs: [{ startEarnings: 30000, endEarnings: 40000, drop: 8000, programsLost: ["snap", "medicaid"] }],
  dangerZones: [{ startEarnings: 30000, endEarnings: 60000, peakNet: 33000 }],
  currentEarnings: 24960,
  currentNet: 31000,
};

export const Yearly = () => <CurveChart analysis={analysis} unit="year" />;

export const PerHour = () => <CurveChart analysis={analysis} unit="hour" hoursPerWeek={40} />;

export const Comparison = () => <CurveChart analysis={analysis} unit="year" showCurrent={false} />;
