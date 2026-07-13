import { WhyList } from "@hotgap/design-system";

export const Losses = () => (
  <WhyList
    items={[
      { icon: "🍎", lost: "You lose food help (SNAP)", value: "Worth about $3,600 a year now" },
      { icon: "🏥", lost: "You lose help paying for health care (Medicaid)", value: "Worth about $9,000 a year now" },
      { icon: "🏠", lost: "You lose housing help", value: "Worth about $7,200 a year now" },
    ]}
  />
);
