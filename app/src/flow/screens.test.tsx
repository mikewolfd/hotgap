// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, within } from "@testing-library/react";
import { ZipScreen, FamilyScreen, HousingScreen, GetsScreen, PayScreen } from "./screens.js";
import type { FlowAnswers } from "./state.js";
import { t } from "../strings/t.js";

const base: FlowAnswers = {
  zip: "", state: null, countyFips: null, married: false, age: null, spouseAge: null,
  childAges: [], youDisabled: false, spouseDisabled: false, childDisabled: [],
  monthlyRent: null, monthlyChildcare: null,
  pay: { amount: 0, unit: "hour", hoursPerWeek: 40 }, spousePay: null,
  getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
};

// All queries are scoped to `container` since RTL auto-cleanup isn't wired up.
describe("ZipScreen", () => {
  it("dispatches setZip, capping input to five digits", () => {
    const dispatch = vi.fn();
    const { container } = render(<ZipScreen answers={base} dispatch={dispatch} />);
    fireEvent.change(within(container).getByLabelText(/where do you live/i), { target: { value: "941101234" } });
    expect(dispatch).toHaveBeenCalledWith({ type: "setZip", zip: "94110" });
  });

  it("surfaces a live-region alert for a five-digit ZIP that resolves to no state", () => {
    const { container } = render(<ZipScreen answers={{ ...base, zip: "00000", state: null }} dispatch={vi.fn()} />);
    const alert = within(container).getByRole("alert");
    expect(alert.className).toContain("error-text");
  });
});

describe("FamilyScreen", () => {
  it("makes the marital question a real radiogroup, not aria-pressed buttons", () => {
    const dispatch = vi.fn();
    const { container } = render(<FamilyScreen answers={base} dispatch={dispatch} />);
    const q = within(container);
    // The a11y fix: role=radio options that announce "1 of 2".
    expect(q.getByRole("radio", { name: t("flow.family.single") })).toBeTruthy();
    fireEvent.click(q.getByRole("radio", { name: t("flow.family.married") }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setMarried", married: true });
  });

  it("adds and removes children through the stepper's +/- buttons", () => {
    const dispatch = vi.fn();
    const { container } = render(<FamilyScreen answers={{ ...base, childAges: [5] }} dispatch={dispatch} />);
    const q = within(container);
    fireEvent.click(q.getByRole("button", { name: t("common.moreKids") }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setChildAges", ages: [5, 5] });
    fireEvent.click(q.getByRole("button", { name: t("common.fewerKids") }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setChildAges", ages: [] });
  });

  it("dispatches setAge from the labeled age field", () => {
    const dispatch = vi.fn();
    const { container } = render(<FamilyScreen answers={base} dispatch={dispatch} />);
    fireEvent.change(within(container).getByLabelText(/how old are you/i), { target: { value: "30" } });
    expect(dispatch).toHaveBeenCalledWith({ type: "setAge", age: 30 });
  });
});

describe("HousingScreen", () => {
  it("dispatches setRent from the labeled money field", () => {
    const dispatch = vi.fn();
    const { container } = render(<HousingScreen answers={base} dispatch={dispatch} />);
    fireEvent.change(within(container).getByLabelText(/what do you pay to live/i), { target: { value: "1500" } });
    expect(dispatch).toHaveBeenCalledWith({ type: "setRent", amount: 1500 });
  });

  it("clears the amount to null via the Not sure button", () => {
    const dispatch = vi.fn();
    const { container } = render(<HousingScreen answers={{ ...base, monthlyRent: 1200 }} dispatch={dispatch} />);
    fireEvent.click(within(container).getByRole("button", { name: t("flow.notSure") }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setRent", amount: null });
  });
});

describe("GetsScreen", () => {
  it("renders programs as a checkbox group; checking one dispatches setGets", () => {
    const dispatch = vi.fn();
    const { container } = render(<GetsScreen answers={base} dispatch={dispatch} />);
    fireEvent.click(within(container).getByRole("checkbox", { name: /housing/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setGets", key: "getsHousing", value: true });
  });

  it("hides the Head Start option unless a child is under six", () => {
    const withKid = render(<GetsScreen answers={{ ...base, childAges: [3] }} dispatch={vi.fn()} />);
    expect(within(withKid.container).getByRole("checkbox", { name: /head start/i })).toBeTruthy();

    const noKid = render(<GetsScreen answers={{ ...base, childAges: [10] }} dispatch={vi.fn()} />);
    expect(within(noKid.container).queryByRole("checkbox", { name: /head start/i })).toBeNull();
    // Housing stays regardless.
    expect(within(noKid.container).getByRole("checkbox", { name: /housing/i })).toBeTruthy();
  });
});

describe("PayScreen", () => {
  it("dispatches setPay and preserves a trailing decimal while typing", () => {
    const dispatch = vi.fn();
    const { container } = render(<PayScreen answers={base} dispatch={dispatch} />);
    fireEvent.change(within(container).getByLabelText(/what do you make now/i), { target: { value: "18.5" } });
    expect(dispatch).toHaveBeenCalledWith({ type: "setPay", pay: { amount: 18.5, unit: "hour", hoursPerWeek: 40 } });
  });

  it("exposes the pay-unit options as selectable choice buttons", () => {
    const dispatch = vi.fn();
    const { container } = render(<PayScreen answers={base} dispatch={dispatch} />);
    const perMonth = within(container).getByRole("button", { name: t("flow.pay.perMonth") });
    expect(perMonth.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(perMonth);
    expect(dispatch).toHaveBeenCalledWith({ type: "setPay", pay: { amount: 0, unit: "month", hoursPerWeek: 40 } });
  });
});
