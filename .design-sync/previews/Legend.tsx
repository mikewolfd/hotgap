import { Legend } from "@hotgap/design-system";

export const Scale = () => (
  <Legend
    title="Biggest yearly loss"
    items={[
      { color: "var(--danger-ramp-1)", label: "Up to $6k" },
      { color: "var(--danger-ramp-2)", label: "$6–12k" },
      { color: "var(--danger-ramp-3)", label: "$12–18k" },
      { color: "var(--danger-ramp-4)", label: "$18–24k" },
      { color: "var(--danger-ramp-5)", label: "$24k and up" },
    ]}
  />
);
