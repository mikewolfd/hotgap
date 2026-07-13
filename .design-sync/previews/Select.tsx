import { Select } from "@hotgap/design-system";

const states = [
  { value: "CA", label: "California" },
  { value: "NY", label: "New York" },
  { value: "OR", label: "Oregon" },
  { value: "TX", label: "Texas" },
];

export const States = () => (
  <Select label="Pick your state from a list" placeholder="Choose a state…" options={states} value="OR" />
);
