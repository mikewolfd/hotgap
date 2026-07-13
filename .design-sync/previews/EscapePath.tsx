import { EscapePath } from "@hotgap/design-system";

export const FullPath = () => (
  <EscapePath
    healthCost="At this pay, you'd pay about $1,200 a year for health coverage."
    safe="You're past the rough patch once you earn about $58,000 a year."
    leap="To clear the trap in one move, you'd need a raise of about $28,000 a year."
    ends={[
      "Food help (SNAP) ends near $34,000 a year.",
      "Help paying for health care (Medicaid) ends near $40,000 a year.",
    ]}
    endsTitle="When help ends"
  />
);

export const SafeAlready = () => (
  <EscapePath safe="Earning more always leaves you with more here." />
);
