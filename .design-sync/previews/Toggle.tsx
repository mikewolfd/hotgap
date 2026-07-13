import { Toggle } from "@hotgap/design-system";

export const On = () => <Toggle label="A housing voucher" on={true} />;

export const Off = () => <Toggle label="Head Start for a child" on={false} />;

export const Group = () => (
  <div className="toggles">
    <h2>What help do you get now?</h2>
    <Toggle label="Food help (SNAP)" on={true} />
    <Toggle label="A housing voucher" on={false} />
    <Toggle label="Head Start for a child" on={false} />
  </div>
);
