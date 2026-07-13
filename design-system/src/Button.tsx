import type { ReactNode } from "react";

export interface ButtonProps {
  /** Visual style. "primary" is the teal call-to-action, "ghost" a plain
   *  underlined text link, "choice" a selectable option pill. */
  variant?: "primary" | "ghost" | "choice";
  /** For variant="choice": whether this option is currently picked. */
  selected?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}

/**
 * The one button in HotGap. `primary` is the teal call-to-action, `ghost` a
 * plain underlined link, and `choice` a pill you can select (e.g. "Just me" vs
 * "Me + a partner"). At least 48px tall so it's easy to tap.
 */
export function Button({
  variant = "primary", selected = false, disabled, children, onClick, type = "button",
}: ButtonProps) {
  const cls =
    variant === "primary" ? "primary"
    : variant === "ghost" ? "ghost"
    : `choice${selected ? " selected" : ""}`;
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      aria-pressed={variant === "choice" ? selected : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
