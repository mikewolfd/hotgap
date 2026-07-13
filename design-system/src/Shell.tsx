import type { ReactNode } from "react";
export interface ShellProps { children: ReactNode; }
/** The page frame every HotGap screen sits in — centers content to a readable
 *  ~560px column with comfortable gutters. Put one Shell at the root of a screen. */
export function Shell({ children }: ShellProps) {
  return <div className="shell">{children}</div>;
}
