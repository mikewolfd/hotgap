// The input editor: the ScenarioBar (design/inventory.md #11) made real for
// the citizen and caseworker pages, plus the one screen behind its value
// chips. A surface names the top row's two actions (`actions`); the citizen
// defaults stand otherwise.
//
// One screen holds the four facts the bar's summary line shows — place,
// household, pay, rent and child care. Everything else the calculation
// accepts is a chip in the bar's inputs row: a take-up or yes/no answer is a
// toggle (aria-pressed), a number or a choice opens a <dialog> for that one
// value. The household is a HouseholdFlags (core/src/flags.ts) — the CLI's
// own vocabulary — so the page can keep it in the URL and a link is a
// household. Validation is core's validateAnswers; its detail is the error.
//
// Rendering is O(chips + kids) per change, nothing per point of any curve:
// the editor never sees an evaluation.
import "./editor.css";
import {
  childcareMonthlyFor,
  CHILDCARE_MAX_AGE,
  flagList,
  IMMIGRATION_STATUSES,
  PAY_UNITS,
  provideData,
  rawAnswersFromFlags,
  resolvePlace,
  STATE_NAMES,
  stateDefaults,
  validateAnswers,
  type HouseholdFlagName,
  type HouseholdFlags,
  type PayUnit,
} from "@hotgap/core";
import stateDefaultsJson from "@hotgap/core/data/state-defaults.json";
import zip3State from "@hotgap/core/data/zip3-state.json";
import { money, unitPhrase } from "../lib/format.js";
import { copy } from "./copy.js";

// The two small tables the editor reads through core: a state's typical rent
// and child-care prices for the prefill, and ZIP → state for the place line.
// ZIP → county (528 KB) stays on the Worker, which resolves it on evaluate.
provideData({ "state-defaults.json": stateDefaultsJson, "zip3-state.json": zip3State });

/** One of the sticky top row's two actions (design/inventory.md § ScenarioBar). */
export interface EditorAction {
  label: string;
  /** A shorter name below 720px, so the sticky top row stays one row at every width (design/caseworker.html, S1). */
  short?: string;
  /** The one action the surface leads with (.hg-button--primary). */
  primary?: boolean;
  onClick(): void;
}

export interface EditorOptions {
  /** The four-facts screen was submitted and core accepted the household. */
  onSubmit(flags: HouseholdFlags): void;
  /** A chip changed one answer. The page decides whether that re-evaluates. */
  onChange(flags: HouseholdFlags): void;
  /** The top row's actions. Default: "Change my answers" (opens the screen) and "Print" — the citizen surface's. */
  actions?: EditorAction[];
  /**
   * A second way to leave the four-facts screen: the same validated household
   * handed to the page without becoming its answer (the caseworker's "Add as
   * a what-if"). Shown beside Close, so never on a first visit.
   */
  altSubmit?: { label: string; onSubmit(flags: HouseholdFlags): void };
  /** The screen closed, by Close or by the page; the flags may hold edits that were never submitted. */
  onClose?(): void;
}

export interface Editor {
  readonly flags: HouseholdFlags;
  /** Replace every answer (a URL was read); nothing is submitted. */
  setFlags(flags: HouseholdFlags): void;
  /** Show the four-facts screen, focused on a field's flag when given. */
  open(field?: HouseholdFlagName): void;
  close(): void;
  /** Show a validation detail — core's, from the page or the API — beside the field it names. */
  showError(detail: string): void;
  /** Show the chips row (it hides behind Edit below 720px) and focus one chip — a given id, else the first take-up toggle. */
  openInputs(chip?: string): void;
  /** The full-width line inside the chips row that a take-up toggle answers with (§ ScenarioBar); empty hides it. */
  setNote(text: string): void;
  /** The county the evaluation resolved for a ZIP, shown beside the place while that ZIP stands; undefined clears it. */
  setCounty(zip: string, name: string | undefined): void;
}

const DEFAULT_KID_AGE = 5;
const MAX_KIDS = 6;
const HEAD_START_MAX_AGE = 5;

/** The modeled state a flag set names — through its ZIP or its state — or undefined; never a code core does not know. */
export function stateOf(flags: HouseholdFlags): string | undefined {
  const p = resolvePlace({ zip: flags.zip, state: flags.state?.toUpperCase() });
  return p.ok && p.state !== undefined && p.state in STATE_NAMES ? p.state : undefined;
}

/** Whether a flag set says enough to evaluate: a place core knows and a pay. */
export const hasAnswers = (flags: HouseholdFlags): boolean => stateOf(flags) !== undefined && Boolean(flags.pay || flags.earnings);

/** Which control a validateAnswers detail points at. */
const FIELD_OF: Record<string, string> = {
  zip: "zip", state: "zip", annualEarnings: "pay", hoursPerWeek: "hours", childAges: "kids",
  monthlyRent: "rent", monthlyChildcare: "childcare",
};

type Attrs = Record<string, string | boolean | undefined>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children) if (c !== null && c !== undefined) el.append(c);
  return el;
}

const chip = (id: string, key: string, value: string, attrs: Attrs) =>
  h("button", { type: "button", class: "hg-chip", "data-chip": id, ...attrs },
    h("span", { class: "hg-chip__k" }, key), h("span", { class: "hg-chip__v" }, value));

interface DialogField {
  flag: HouseholdFlagName;
  label: string;
  kind: "number" | "select" | "kids-disabled";
  min?: number; max?: number; step?: number;
  options?: readonly string[];
  hint?: string;
}

type ChipSpec =
  | { kind: "fact"; id: string; label: string; value: () => string; field: HouseholdFlagName; when?: () => boolean }
  | { kind: "toggle"; id: HouseholdFlagName; label: string; inverted?: boolean; when?: () => boolean }
  | { kind: "value"; id: string; label: string; value: () => string; fields: DialogField[]; when?: () => boolean };

export function mountEditor(root: HTMLElement, opts: EditorOptions): Editor {
  let flags: HouseholdFlags = {};
  // What the prefill last wrote, so a person's own figure is never overwritten.
  const prefilled = { state: "", kids: "", rent: "", childcare: "" };
  let editorOpen = false;
  // What opened the screen, so closing it can hand focus back.
  let opener: HTMLElement | null = null;
  // The county the page learned for a ZIP (the Worker resolves it): shown only while that ZIP stands.
  let county: { zip: string; name: string } | null = null;

  // ── Derived readings of the flags ───────────────────────────────────
  const married = () => flags.married === true;
  const kids = () => flagList(flags.kids).map(Number);
  const place = () => resolvePlace({ zip: flags.zip, state: flags.state?.toUpperCase() });
  const state = (): string | undefined => stateOf(flags);
  const unit = (): PayUnit => (PAY_UNITS as readonly string[]).includes(flags.unit ?? "") ? (flags.unit as PayUnit) : "hour";
  const monthly = (v: string | undefined) => (v ? `${money(Number(v))} ${copy.chips.aMonth}` : copy.chips.none);
  const yearly = (v: string | undefined) => (v ? `${money(Number(v))} ${copy.chips.aYear}` : copy.chips.none);
  const householdLabel = () => {
    const k = kids();
    return `${married() ? "2 adults" : "1 adult"}${k.length ? `, kid${k.length > 1 ? "s" : ""} ${k.join(" & ")}` : ""}`;
  };
  const payLabel = () => (flags.pay ? `${unit() === "hour" ? `$${Number(flags.pay).toFixed(2)}` : money(Number(flags.pay))} ${unitPhrase(unit())}` : copy.chips.none);
  const countyLabel = (): string | undefined => (county && county.zip === flags.zip ? county.name : undefined);
  const placeLabel = () => [flags.zip, state(), countyLabel()].filter(Boolean).join(", ") || copy.chips.none;

  // ── The chips, in row order ──────────────────────────────────────────
  const monthlyField = (flag: HouseholdFlagName, label: string): DialogField => ({ flag, label, kind: "number", min: 0, max: 20000, step: 1, hint: copy.dialog.monthly });
  const statusFields = (status: HouseholdFlagName, years: HouseholdFlagName, label: string): DialogField[] => [
    { flag: status, label, kind: "select", options: IMMIGRATION_STATUSES },
    { flag: years, label: copy.dialog.years, kind: "number", min: 0, max: 100, step: 1, hint: copy.dialog.yearsHint },
  ];
  const chips: ChipSpec[] = [
    { kind: "fact", id: "where", label: copy.chips.where, value: placeLabel, field: "zip" },
    { kind: "fact", id: "household", label: copy.chips.household, value: householdLabel, field: "kids" },
    { kind: "fact", id: "pay", label: copy.chips.pay, value: payLabel, field: "pay" },
    { kind: "fact", id: "rent", label: copy.chips.rent, value: () => monthly(flags.rent), field: "rent" },
    { kind: "fact", id: "childcare", label: copy.chips.childcare, value: () => monthly(flags.childcare), field: "childcare", when: () => kids().some((a) => a <= CHILDCARE_MAX_AGE) },
    { kind: "value", id: "age", label: copy.chips.age, value: () => flags.age ?? "30", fields: [{ flag: "age", label: copy.chips.age, kind: "number", min: 16, max: 110, step: 1 }] },
    { kind: "value", id: "spouse-age", label: copy.chips.spouseAge, value: () => flags["spouse-age"] ?? "30", fields: [{ flag: "spouse-age", label: copy.chips.spouseAge, kind: "number", min: 16, max: 110, step: 1 }], when: married },
    { kind: "value", id: "spouse-earnings", label: copy.chips.spousePay, value: () => yearly(flags["spouse-earnings"]), fields: [{ flag: "spouse-earnings", label: copy.chips.spousePay, kind: "number", min: 0, max: 500000, step: 1, hint: copy.dialog.yearly }], when: married },
    { kind: "value", id: "ssdi", label: copy.chips.ssdi, value: () => monthly(flags.ssdi), fields: [monthlyField("ssdi", copy.chips.ssdi)] },
    { kind: "value", id: "child-support", label: copy.chips.childSupport, value: () => monthly(flags["child-support"]), fields: [monthlyField("child-support", copy.chips.childSupport)] },
    { kind: "value", id: "unemployment", label: copy.chips.unemployment, value: () => monthly(flags.unemployment), fields: [monthlyField("unemployment", copy.chips.unemployment)] },
    { kind: "value", id: "savings", label: copy.chips.savings, value: () => (flags.savings ? money(Number(flags.savings)) : copy.chips.none), fields: [{ flag: "savings", label: copy.chips.savings, kind: "number", min: 0, max: 10_000_000, step: 1 }] },
    { kind: "value", id: "status", label: copy.chips.status, value: () => copy.status[flags.status ?? "citizen"], fields: statusFields("status", "years-in-us", copy.chips.status) },
    { kind: "value", id: "spouse-status", label: copy.chips.spouseStatus, value: () => copy.status[flags["spouse-status"] ?? "citizen"], fields: statusFields("spouse-status", "spouse-years-in-us", copy.chips.spouseStatus), when: married },
    { kind: "value", id: "kids-disabled", label: copy.chips.kidsDisabled, value: () => { const n = flagList(flags["kids-disabled"]).filter((x) => x === "1").length; return n ? String(n) : copy.chips.none; }, fields: [{ flag: "kids-disabled", label: copy.chips.kidsDisabled, kind: "kids-disabled" }], when: () => kids().length > 0 },
    { kind: "toggle", id: "childcare-subsidy", label: copy.chips.childcareSubsidy, when: () => kids().some((a) => a <= CHILDCARE_MAX_AGE) },
    { kind: "toggle", id: "head-start", label: copy.chips.headStart, when: () => kids().some((a) => a <= HEAD_START_MAX_AGE) },
    { kind: "toggle", id: "housing", label: copy.chips.housing },
    { kind: "toggle", id: "employer-coverage", label: copy.chips.employerCoverage },
    { kind: "toggle", id: "self-employed", label: copy.chips.selfEmployed },
    { kind: "toggle", id: "disabled", label: copy.chips.disabled },
    { kind: "toggle", id: "spouse-disabled", label: copy.chips.spouseDisabled, when: married },
    { kind: "toggle", id: "no-snap", label: copy.chips.snap, inverted: true },
    { kind: "toggle", id: "no-tanf", label: copy.chips.tanf, inverted: true },
    { kind: "toggle", id: "no-medicaid", label: copy.chips.medicaid, inverted: true },
    { kind: "toggle", id: "no-wic", label: copy.chips.wic, inverted: true },
  ];

  // ── Skeleton ─────────────────────────────────────────────────────────
  const changeBtn = h("button", { type: "button", class: "hg-button", "aria-expanded": "false", "aria-controls": "editor" }, copy.actions.change);
  const printBtn = h("button", { type: "button", class: "hg-button" }, copy.actions.print);
  // A surface's own actions replace the two defaults; a short name shows below 720px (display:none keeps the other out of the accessible name).
  const actionBtn = (a: EditorAction) => {
    const b = h("button", { type: "button", class: `hg-button${a.primary ? " hg-button--primary" : ""}` },
      ...(a.short ? [h("span", { class: "editor-action__full" }, a.label), h("span", { class: "editor-action__short" }, a.short)] : [a.label]));
    b.addEventListener("click", a.onClick);
    return b;
  };
  const actions = opts.actions ? opts.actions.map(actionBtn) : [changeBtn, printBtn];
  const summaryText = h("span");
  const inputsBtn = h("button", { type: "button", class: "hg-button hg-button--small", "aria-expanded": "false", "aria-controls": "inputs" }, copy.summary.edit);
  const inputsRow = h("div", { class: "hg-scenario__inputs", id: "inputs" });
  // The line a take-up toggle answers with: in the DOM from the start (hidden), so it is a live region before it first speaks.
  const note = h("p", { class: "hg-scenario__note hg-source", "aria-live": "polite", hidden: true });
  const dialog = h("dialog", { class: "editor__dialog", "aria-labelledby": "dialog-title" });

  const zipInput = h("input", { id: "f-zip", name: "zip", class: "editor__input editor__input--short", inputmode: "numeric", autocomplete: "postal-code", pattern: "[0-9]{5}", maxlength: "5", "aria-describedby": "h-zip" });
  const zipHint = h("p", { class: "editor__hint", id: "h-zip", "aria-live": "polite" }, copy.place.zipHint);
  const stateSelect = h("select", { id: "f-state", name: "state", class: "hg-select" }, h("option", { value: "" }, copy.place.statePlaceholder),
    ...Object.entries(STATE_NAMES).map(([code, name]) => h("option", { value: code }, name)));
  const radio = (value: string, label: string) => h("label", { class: "editor__option" }, h("input", { type: "radio", name: "married", value }), label);
  const kidsCount = h("input", { id: "f-kids", name: "kids-count", type: "number", min: "0", max: String(MAX_KIDS), inputmode: "numeric", class: "editor__input editor__input--short", "aria-describedby": "h-kids" });
  const kidsRows = h("div", { class: "editor__kids" });
  const payInput = h("input", { id: "f-pay", name: "pay", type: "number", min: "0", step: "0.01", inputmode: "decimal", required: true, class: "editor__input" });
  const unitSelect = h("select", { id: "f-unit", name: "unit", class: "hg-select" }, ...PAY_UNITS.map((u) => h("option", { value: u }, copy.pay.units[u])));
  const hoursInput = h("input", { id: "f-hours", name: "hours", type: "number", min: "1", max: "80", step: "1", inputmode: "numeric", class: "editor__input editor__input--short", "aria-describedby": "h-hours" });
  const rentInput = h("input", { id: "f-rent", name: "rent", type: "number", min: "0", step: "1", inputmode: "numeric", class: "editor__input editor__input--short", "aria-describedby": "h-rent" });
  const rentHint = h("p", { class: "editor__hint", id: "h-rent" }, copy.costs.none);
  const childcareInput = h("input", { id: "f-childcare", name: "childcare", type: "number", min: "0", step: "1", inputmode: "numeric", class: "editor__input editor__input--short", "aria-describedby": "h-childcare" });
  const childcareHint = h("p", { class: "editor__hint", id: "h-childcare" }, copy.costs.none);
  const childcareField = h("div", { class: "editor__field" }, h("label", { for: "f-childcare" }, copy.costs.childcare), childcareInput, childcareHint);
  const errorLine = h("p", { class: "hg-callout hg-callout--caution", role: "alert", hidden: true });
  const closeBtn = h("button", { type: "button", class: "hg-button", hidden: true }, copy.close);
  const altBtn = opts.altSubmit ? h("button", { type: "button", class: "hg-button", hidden: true }, opts.altSubmit.label) : null;
  const field = (id: string, label: string, control: HTMLElement, hint?: HTMLElement) =>
    h("div", { class: "editor__field" }, h("label", { for: id }, label), control, hint);

  const form = h("form", { class: "editor__form" },
    // An h2: the page owns its h1 (which stays when this screen hides).
    h("h2", { class: "editor__heading" }, copy.heading),
    h("p", { class: "editor__lead" }, copy.lead),
    h("fieldset", { class: "editor__group" }, h("legend", {}, copy.place.legend),
      h("div", { class: "editor__pair" }, field("f-zip", copy.place.zip, zipInput, zipHint), field("f-state", copy.place.or, stateSelect))),
    h("fieldset", { class: "editor__group" }, h("legend", {}, copy.household.legend),
      h("fieldset", { class: "editor__field" }, h("legend", {}, copy.household.adults),
        h("div", { class: "editor__options" }, radio("", copy.household.single), radio("1", copy.household.married))),
      field("f-kids", copy.household.kids, kidsCount, h("p", { class: "editor__hint", id: "h-kids" }, copy.household.kidsHint)),
      kidsRows),
    h("fieldset", { class: "editor__group" }, h("legend", {}, copy.pay.legend),
      h("div", { class: "editor__row" }, field("f-pay", copy.pay.amount, payInput), field("f-unit", copy.pay.unit, unitSelect)),
      field("f-hours", copy.pay.hours, hoursInput, h("p", { class: "editor__hint", id: "h-hours" }, copy.pay.hoursHint))),
    h("fieldset", { class: "editor__group" }, h("legend", {}, copy.costs.legend),
      h("div", { class: "editor__pair" }, field("f-rent", copy.costs.rent, rentInput, rentHint), childcareField)),
    errorLine,
    h("div", { class: "editor__actions" }, h("button", { type: "submit", class: "hg-button hg-button--primary" }, copy.submit), altBtn, closeBtn),
    h("p", { class: "editor__privacy hg-source" }, copy.privacy),
  );
  const editorSection = h("section", { class: "editor", id: "editor", hidden: true }, form);

  // Prepended, not appended: a page may keep its own content in `root`, and
  // the sticky top row's containing block is then the whole page (a sticky
  // child cannot outlive its parent's box — S1). An empty root sees no difference.
  root.prepend(
    h("div", { class: "hg-scenario hg-scenario--sticky hg-no-print" },
      h("div", { class: "hg-scenario__top" }, h("p", { class: "editor-wordmark" }, copy.wordmark),
        h("div", { class: "hg-scenario__actions" }, ...actions))),
    h("header", { class: "hg-scenario" },
      h("div", { class: "hg-scenario__summary hg-no-print" }, summaryText, inputsBtn), inputsRow),
    editorSection,
    dialog,
  );

  // ── Rendering from the flags ─────────────────────────────────────────
  const set = (flag: HouseholdFlagName, value: string | boolean | undefined) => {
    if (value === undefined || value === "" || value === false) delete flags[flag];
    else (flags as Record<string, string | boolean>)[flag] = value;
  };

  /** A state's typical rent and child care, written only over a blank or the last prefill. */
  function prefill(): void {
    const st = state();
    if (!st) return;
    const d = stateDefaults(st);
    if (st !== prefilled.state && (!flags.rent || flags.rent === prefilled.rent)) {
      set("rent", String(d.monthlyRent));
      prefilled.rent = flags.rent ?? "";
    }
    const kidsKey = flags.kids ?? "";
    if ((st !== prefilled.state || kidsKey !== prefilled.kids) && (!flags.childcare || flags.childcare === prefilled.childcare)) {
      const sum = kids().reduce((s, age) => s + childcareMonthlyFor(d, age), 0);
      set("childcare", sum ? String(sum) : undefined);
      prefilled.childcare = flags.childcare ?? "";
    }
    prefilled.state = st;
    prefilled.kids = kidsKey;
  }

  /**
   * The form from the flags. A control is written only when its value differs
   * and never while it is the one being edited, so a "30." mid-keystroke or a
   * child's age with focus in it survives a re-render (the archive's lesson,
   * design/PORT-FROM-ARCHIVE-2026-09-16.md W10).
   */
  function renderForm(): void {
    const editing = document.activeElement;
    const write = (el: HTMLInputElement | HTMLSelectElement, value: string) => {
      if (el !== editing && el.value !== value) el.value = value;
    };
    write(zipInput, flags.zip ?? "");
    const st = state();
    write(stateSelect, st ?? "");
    const p = place();
    if (flags.zip) {
      zipHint.textContent = p.ok && p.state ? copy.place.inState(STATE_NAMES[p.state]) : p.ok ? copy.place.zipHint : p.detail;
      zipInput.setAttribute("aria-invalid", p.ok ? "false" : "true");
    } else {
      zipHint.textContent = copy.place.zipHint;
      zipInput.removeAttribute("aria-invalid");
    }
    for (const r of form.querySelectorAll<HTMLInputElement>('input[name="married"]')) r.checked = (r.value === "1") === married();
    const k = kids();
    write(kidsCount, String(k.length));
    // Rows are rebuilt only when the count changes; otherwise each keeps its element.
    if (kidsRows.children.length !== k.length) {
      kidsRows.replaceChildren(...k.map((_, i) => {
        const input = h("input", { id: `f-kid-${i}`, name: `kid-${i}`, type: "number", min: "0", max: "17", step: "1", inputmode: "numeric", required: true, class: "editor__input" });
        return field(`f-kid-${i}`, copy.household.kidAge(i + 1), input);
      }));
    }
    k.forEach((age, i) => write(kidsRows.querySelector<HTMLInputElement>(`#f-kid-${i}`)!, String(age)));
    write(payInput, flags.pay ?? "");
    write(unitSelect, unit());
    write(hoursInput, flags.hours ?? "");
    write(rentInput, flags.rent ?? "");
    write(childcareInput, flags.childcare ?? "");
    childcareField.hidden = !k.some((a) => a <= CHILDCARE_MAX_AGE);
    const where = st ? STATE_NAMES[st] : null;
    rentHint.textContent = where && prefilled.rent ? copy.costs.typical(money(Number(prefilled.rent)), where) : copy.costs.none;
    childcareHint.textContent = where && prefilled.childcare ? copy.costs.typical(money(Number(prefilled.childcare)), where) : copy.costs.none;
  }

  function renderChips(): void {
    const focused = (document.activeElement as HTMLElement | null)?.dataset.chip;
    inputsRow.replaceChildren(...chips.flatMap((c) => {
      if (c.when && !c.when()) return [];
      if (c.kind === "fact") return [chip(c.id, c.label, c.value(), { "aria-expanded": String(editorOpen), "aria-controls": "editor" })];
      if (c.kind === "value") return [chip(c.id, c.label, c.value(), { "aria-haspopup": "dialog", "aria-expanded": "false" })];
      const on = flags[c.id] === true;
      const shown = c.inverted ? !on : on;
      return [chip(c.id, c.label, c.inverted ? (shown ? copy.chips.yes : copy.chips.no) : shown ? copy.chips.on : copy.chips.off, { "aria-pressed": String(shown) })];
    }), note);
    if (focused) inputsRow.querySelector<HTMLElement>(`[data-chip="${focused}"]`)?.focus();
    summaryText.textContent = hasAnswers(flags) ? [flags.zip, state(), countyLabel(), householdLabel(), payLabel()].filter(Boolean).join(" · ") : copy.summary.none;
  }

  function render(): void {
    renderForm();
    renderChips();
  }

  function afterChange(): void {
    prefill();
    render();
  }

  // ── Form behaviour ───────────────────────────────────────────────────
  form.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    switch (t.name) {
      case "zip":
        set("zip", t.value);
        if (t.value.length === 5 || t.value === "") { set("state", undefined); afterChange(); }
        return;
      case "state":
        set("state", t.value);
        set("zip", undefined);
        afterChange();
        return;
      case "married":
        set("married", t.value === "1");
        renderChips();
        return;
      case "kids-count": {
        // A cleared field is mid-edit, not "no kids": the ages stay until a number arrives.
        if (t.value === "") return;
        const n = Math.max(0, Math.min(MAX_KIDS, Number(t.value) || 0));
        const ages = kids().slice(0, n);
        while (ages.length < n) ages.push(DEFAULT_KID_AGE);
        set("kids", ages.join(","));
        set("kids-disabled", undefined);
        afterChange();
        return;
      }
      case "pay": set("pay", t.value); renderChips(); return;
      case "unit": set("unit", t.value); renderChips(); return;
      case "hours": set("hours", t.value); return;
      case "rent": set("rent", t.value); renderChips(); return;
      case "childcare": set("childcare", t.value); renderChips(); return;
    }
    if (t.name.startsWith("kid-") && t.value !== "") {
      const ages = kids();
      ages[Number(t.name.slice(4))] = Number(t.value);
      set("kids", ages.join(","));
      renderChips();
    }
  });
  form.addEventListener("change", (e) => {
    // A child's age settles on change, not per keystroke: the prefill and
    // the age-gated chips move with it.
    if ((e.target as HTMLInputElement).name.startsWith("kid-")) afterChange();
  });
  /** The screen's household, once the form and core both accept it; null (with the error shown) otherwise. */
  const accepted = (): HouseholdFlags | null => {
    if (!form.reportValidity()) return null;
    const v = validateAnswers(rawAnswersFromFlags(flags));
    if (!v.ok) { showError(v.detail); return null; }
    clearError();
    return { ...flags };
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = accepted();
    if (f) opts.onSubmit(f);
  });
  altBtn?.addEventListener("click", () => {
    const f = accepted();
    if (f) opts.altSubmit!.onSubmit(f);
  });

  function showError(detail: string): void {
    const label = copy.errors.fields[detail];
    errorLine.replaceChildren(h("strong", {}, "Check this."), " ", label ? copy.errors.check(label) : detail);
    errorLine.hidden = false;
    // A field name points at its control; a sentence about a ZIP points at the ZIP.
    const fieldId = FIELD_OF[detail] ?? (/ZIP|territor/i.test(detail) ? "zip" : null);
    const control = fieldId ? form.querySelector<HTMLElement>(`#f-${fieldId}`) : null;
    control?.setAttribute("aria-invalid", "true");
    // An error from the API arrives with the screen closed; one from the
    // screen's own submit must not reset who opened it.
    if (!editorOpen) open();
    (control ?? errorLine).focus();
  }
  function clearError(): void {
    errorLine.hidden = true;
    for (const el of form.querySelectorAll('[aria-invalid="true"]')) el.removeAttribute("aria-invalid");
  }

  // ── Chips ────────────────────────────────────────────────────────────
  inputsRow.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-chip]");
    if (!btn) return;
    const spec = chips.find((c) => c.id === btn.dataset.chip);
    if (!spec) return;
    if (spec.kind === "fact") { open(spec.field, btn); return; }
    if (spec.kind === "toggle") {
      set(spec.id, flags[spec.id] !== true);
      renderChips();
      opts.onChange({ ...flags });
      return;
    }
    openDialog(spec, btn);
  });

  function openDialog(spec: Extract<ChipSpec, { kind: "value" }>, btn: HTMLButtonElement): void {
    const controls: { field: DialogField; read: () => string | undefined }[] = [];
    const body = spec.fields.map((f, i) => {
      const id = `d-${spec.id}-${i}`;
      if (f.kind === "kids-disabled") {
        const flagsNow = flagList(flags["kids-disabled"]);
        const boxes = kids().map((age, k) => {
          const box = h("input", { type: "checkbox" });
          box.checked = flagsNow[k] === "1";
          return { box, label: h("label", {}, box, copy.dialog.hasDisability(k + 1, String(age))) };
        });
        controls.push({ field: f, read: () => (boxes.some((b) => b.box.checked) ? boxes.map((b) => (b.box.checked ? "1" : "0")).join(",") : undefined) });
        return h("div", { class: "editor__checks" }, ...boxes.map((b) => b.label));
      }
      let control: HTMLInputElement | HTMLSelectElement;
      if (f.kind === "select") {
        control = h("select", { id, class: "hg-select" }, ...(f.options ?? []).map((o) => h("option", { value: o }, copy.status[o] ?? o)));
        control.value = (flags[f.flag] as string | undefined) ?? f.options?.[0] ?? "";
        // The default answer is not an answer: leave it out of the URL.
        controls.push({ field: f, read: () => (control.value === f.options?.[0] ? undefined : control.value) });
      } else {
        control = h("input", { id, type: "number", class: "editor__input", min: f.min?.toString(), max: f.max?.toString(), step: f.step?.toString(), inputmode: "numeric" });
        control.value = (flags[f.flag] as string | undefined) ?? "";
        controls.push({ field: f, read: () => control.value });
      }
      return field(id, f.label, control, f.hint ? h("p", { class: "editor__hint" }, f.hint) : undefined);
    });
    const cancelBtn = h("button", { type: "button", class: "hg-button" }, copy.dialog.cancel);
    const dialogForm = h("form", { method: "dialog" }, h("h2", { id: "dialog-title" }, spec.label), ...body,
      h("div", { class: "editor__dialog-actions" },
        // Cancel is not a submit button: the form's first submit is what Enter presses, and that must be Save.
        cancelBtn,
        h("button", { type: "submit", class: "hg-button hg-button--primary", value: "save" }, copy.dialog.save)));
    cancelBtn.addEventListener("click", () => dialog.close(""));
    dialog.replaceChildren(dialogForm);
    // returnValue survives a close: an Escape after an earlier Save must not read as Save.
    dialog.returnValue = "";
    btn.setAttribute("aria-expanded", "true");
    dialog.addEventListener("close", () => {
      if (dialog.returnValue === "save") {
        for (const c of controls) set(c.field.flag, c.read());
        renderChips();
        opts.onChange({ ...flags });
      }
      // The chip may have been re-rendered: find it again by id.
      const again = inputsRow.querySelector<HTMLButtonElement>(`[data-chip="${spec.id}"]`);
      again?.setAttribute("aria-expanded", "false");
      again?.focus();
    }, { once: true });
    dialog.showModal();
  }

  // ── Bar actions ──────────────────────────────────────────────────────
  changeBtn.addEventListener("click", () => open(undefined, changeBtn));
  closeBtn.addEventListener("click", () => close());
  printBtn.addEventListener("click", () => window.print());
  const showInputs = (open: boolean) => {
    inputsRow.setAttribute("data-open", String(open));
    inputsBtn.setAttribute("aria-expanded", String(open));
  };
  inputsBtn.addEventListener("click", () => showInputs(inputsRow.getAttribute("data-open") !== "true"));

  function open(fieldFlag?: HouseholdFlagName, by: HTMLElement | null = null): void {
    editorOpen = true;
    opener = by;
    // Opened from the page itself (a first visit), there is nothing to go back to — and nothing to compare against.
    closeBtn.hidden = by === null;
    if (altBtn) altBtn.hidden = by === null;
    editorSection.hidden = false;
    changeBtn.setAttribute("aria-expanded", "true");
    renderChips();
    const target = fieldFlag ? form.querySelector<HTMLElement>(`#f-${fieldFlag}`) : null;
    (target ?? zipInput).focus();
    target?.scrollIntoView({ block: "center" });
  }
  function close(): void {
    editorOpen = false;
    editorSection.hidden = true;
    changeBtn.setAttribute("aria-expanded", "false");
    opts.onClose?.();
    renderChips();
    // The opener may have been re-rendered as a chip; find it again by id.
    const id = opener?.dataset.chip;
    const back = id ? inputsRow.querySelector<HTMLElement>(`[data-chip="${id}"]`) : opener;
    opener = null;
    back?.focus();
  }

  return {
    get flags() { return { ...flags }; },
    setFlags(next) {
      flags = { ...next };
      // A hand-written `earnings` is a yearly pay.
      if (flags.earnings && !flags.pay) { set("pay", flags.earnings); set("unit", "year"); }
      set("earnings", undefined);
      // What arrived is the person's own; no prefill until something changes.
      prefilled.state = state() ?? "";
      prefilled.kids = flags.kids ?? "";
      prefilled.rent = "";
      prefilled.childcare = "";
      clearError();
      render();
    },
    open,
    close,
    showError,
    openInputs(id) {
      showInputs(true);
      (inputsRow.querySelector<HTMLElement>(id ? `[data-chip="${id}"]` : "[aria-pressed]") ?? inputsBtn).focus();
    },
    setNote(text) {
      note.textContent = text;
      note.hidden = text === "";
    },
    setCounty(zip, name) {
      county = name === undefined ? null : { zip, name };
      renderChips();
    },
  };
}
