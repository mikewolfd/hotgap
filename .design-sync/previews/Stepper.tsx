import { Stepper } from "@hotgap/design-system";

export const Kids = () => <Stepper label="kids" value={2} />;

export const None = () => <Stepper label="kids" value={0} />;

export const WithPhrase = () => <Stepper label="kids" value={2} display="2 kids, ages 3 and 7" />;
