import { RadioGroup } from "@hotgap/design-system";

export const WhoLives = () => (
  <RadioGroup
    legend="Who lives with you?"
    value="alone"
    options={[
      { value: "alone", label: "Just me" },
      { value: "partner", label: "Me + a partner" },
    ]}
  />
);
