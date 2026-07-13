import { Progress } from "@hotgap/design-system";

export const Early = () => <Progress current={2} total={6} />;
export const Halfway = () => <Progress current={4} total={6} />;
export const Steps = () => <Progress current={1} total={3} noun="Step" />;
