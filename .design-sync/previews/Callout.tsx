import { Callout } from "@hotgap/design-system";

export const Info = () => (
  <Callout tone="info" title="Please know">
    <p>This is a guess based on public rules. Your caseworker decides your real benefits. Rules change.</p>
  </Callout>
);

export const Warn = () => (
  <Callout tone="warn">We could not reach the live numbers. These are close estimates.</Callout>
);
