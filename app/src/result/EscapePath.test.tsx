// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { EscapeNarration } from "../lib/narration.js";
import { EscapePath } from "./EscapePath.js";

const populated: EscapeNarration = {
  safeLine: "Past $30.75 an hour, more pay always helps you.",
  leapLine: "To clear the worst rough zone in one move, it takes a raise of about $34,000 a year.",
  thresholds: [
    { label: "cash help (TANF)", wage: "$11 an hour" },
    { label: "food help (SNAP)", wage: "$14 an hour" },
  ],
};

const empty: EscapeNarration = { safeLine: null, leapLine: null, thresholds: [] };

describe("EscapePath", () => {
  it("renders the title, both lines, and the ends list when populated", () => {
    const { container } = render(<EscapePath narration={populated} />);
    expect(container.querySelector("h2")?.textContent).toMatch(/your path off help/i);
    expect(container.querySelector(".escape-safe")?.textContent).toMatch(/30\.75 an hour, more pay always helps/i);
    expect(container.querySelector(".escape-leap")?.textContent).toMatch(/raise of about \$34,000/i);
    expect(container.querySelector(".escape-ends-title")?.textContent).toMatch(/when help ends for you/i);
    expect(container.querySelectorAll("li.escape-ends-item").length).toBe(2);
  });

  it("renders nothing when there is no safe line, no leap line, and no thresholds", () => {
    const { container } = render(<EscapePath narration={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders only the safe/leap lines with no ends list when thresholds is empty", () => {
    // Scoped to `container` (not the destructured queryByText/getByText, which
    // query the shared baseElement/document.body) since RTL auto-cleanup
    // between tests isn't wired up in this project's vitest config — other
    // renders in this file can otherwise leave stray matching text behind.
    const { container } = render(
      <EscapePath narration={{ ...empty, safeLine: "Past $30 an hour, more pay always helps you." }} />,
    );
    expect(container.querySelector(".escape-safe")?.textContent).toMatch(/more pay always helps/i);
    expect(container.querySelector(".escape-ends-title")).toBeNull();
  });
});
