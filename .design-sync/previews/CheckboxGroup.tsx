import { CheckboxGroup } from "@hotgap/design-system";

export const Help = () => (
  <CheckboxGroup
    legend="What help do you get now?"
    value={["snap"]}
    options={[
      { value: "snap", label: "Food help (SNAP)" },
      { value: "housing", label: "A housing voucher" },
      { value: "headstart", label: "Head Start (free early learning)" },
    ]}
  />
);
