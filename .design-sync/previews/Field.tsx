import { Field } from "@hotgap/design-system";

export const Text = () => (
  <Field label="Where do you live?" hint="Your ZIP code helps us use local numbers." placeholder="ZIP code" />
);

export const Money = () => (
  <Field label="What do you make now?" prefix="$" inputMode="decimal" value="18.50" hint="Per hour, before taxes." />
);

export const Small = () => (
  <Field label="How old are you?" small inputMode="numeric" value="30" />
);
