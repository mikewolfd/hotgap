// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, within } from "@testing-library/react";
import { Toggles } from "./Toggles.js";
import type { HouseholdAnswers } from "@hotgap/shared";

const answers: HouseholdAnswers = {
  state: "CA", married: false, childAges: [3], childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000,
  spouseAnnualEarnings: 0, age: 30, spouseAge: null, youDisabled: false,
  spouseDisabled: false, getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
};

describe("Toggles", () => {
  // Scoped to `container` (not the destructured getByRole/queryByRole, which
  // query the shared baseElement/document.body) since RTL auto-cleanup between
  // tests isn't wired up in this project's vitest config — see the same note
  // in CurveChart.test.tsx.
  it("flipping housing emits updated answers", () => {
    const onChange = vi.fn();
    const { container } = render(<Toggles answers={answers} onChange={onChange} />);
    fireEvent.click(within(container).getByRole("switch", { name: /housing/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ getsHousing: true }));
  });
  it("hides the Head Start toggle when there is no young child", () => {
    const { container } = render(<Toggles answers={{ ...answers, childAges: [10], childDisabled: [false] }} onChange={() => {}} />);
    expect(within(container).queryByRole("switch", { name: /head start/i })).toBeNull();
  });
});
