// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, fireEvent, within } from "@testing-library/react";
import Flow from "./Flow.js";
import { t } from "../strings/t.js";

// Scoped to `container` since RTL auto-cleanup isn't wired up in this project.
describe("Flow", () => {
  it("renders the step indicator as a progressbar using app copy", () => {
    const { container } = render(<Flow onComplete={() => {}} />);
    const bar = within(container).getByRole("progressbar");
    // The noun comes from en.json (flow.stepNoun); a default childless
    // household has 5 visible screens.
    expect(bar.getAttribute("aria-label")).toBe(`${t("flow.stepNoun")} 1 of 5`);
    expect(bar.getAttribute("aria-valuenow")).toBe("1");
    expect(bar.getAttribute("aria-valuemax")).toBe("5");
    expect(bar.textContent).toContain(`${t("flow.stepNoun")} 1 of 5`);
  });

  it("keeps the primary button disabled until the screen can advance, with no Back on the first screen", () => {
    const { container } = render(<Flow onComplete={() => {}} />);
    const q = within(container);
    const next = q.getByRole("button", { name: t("flow.next") }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect(q.queryByRole("button", { name: t("flow.back") })).toBeNull();

    // A valid ZIP derives a state, which unlocks the button.
    fireEvent.change(q.getByLabelText(/where do you live/i), { target: { value: "94110" } });
    expect((q.getByRole("button", { name: t("flow.next") }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("advances to the family screen and reveals a Back button", () => {
    const { container } = render(<Flow onComplete={() => {}} />);
    const q = within(container);
    fireEvent.change(q.getByLabelText(/where do you live/i), { target: { value: "94110" } });
    fireEvent.click(q.getByRole("button", { name: t("flow.next") }));

    // Family screen's marital question is now a real radiogroup.
    expect(q.getByRole("radio", { name: t("flow.family.single") })).toBeTruthy();
    expect(q.getByRole("button", { name: t("flow.back") })).toBeTruthy();
  });
});
