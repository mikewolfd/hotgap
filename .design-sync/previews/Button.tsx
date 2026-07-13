import { Button } from "@hotgap/design-system";

export const Primary = () => <Button variant="primary">See my answer</Button>;

export const Ghost = () => <Button variant="ghost">Start over</Button>;

export const Choices = () => (
  <div className="choice-row">
    <Button variant="choice" selected>Just me</Button>
    <Button variant="choice">Me + a partner</Button>
  </div>
);

export const Disabled = () => <Button variant="primary" disabled>See my answer</Button>;
