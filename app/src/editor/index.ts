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
  type Coded,
  type HouseholdFlagName,
  type HouseholdFlags,
  type PayUnit,
} from "@hotgap/core";
import stateDefaultsJson from "@hotgap/core/data/state-defaults.json";
import zip3State from "@hotgap/core/data/zip3-state.json";
import { coreText, fill } from "../lib/copy.js";
import { languageSwitch } from "../lib/lang.js";
import { siteNav, wordmark, type Page } from "../lib/nav.js";
import { countyBare, countyWords, stateName } from "../lib/names.js";
import { h } from "../lib/dom.js";
import { listOfItems, money, payInUnit, shortList } from "../lib/format.js";
import { copy as defaultCopy } from "./copy.js";

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
  /** Disabled until the flags say enough to evaluate — nothing to what-if or print before a household stands. */
  needsAnswers?: boolean;
  onClick(): void;
}

/** A surface's own words for the editor: any part of copy.ts, merged over the citizen defaults two levels deep. */
export type CopyOverride = { [K in keyof Copy]?: Copy[K] extends object ? Partial<Copy[K]> : Copy[K] };

export interface EditorOptions {
  /** Which page this is: the nav marks it current. */
  page: Page;
  /** The four-facts screen was submitted and core accepted the household. */
  onSubmit(flags: HouseholdFlags): void;
  /** A chip changed one answer. The page decides whether that re-evaluates. */
  onChange(flags: HouseholdFlags): void;
  /**
   * The top row's actions. Default: "Print" alone — the citizen surface's —
   * hidden until there is an answer to print; the summary line's button is
   * the one way to change the answers.
   */
  actions?: EditorAction[];
  /**
   * A second way to leave the four-facts screen: the same validated household
   * handed to the page without becoming its answer (the caseworker's "Add as
   * a what-if"). Shown beside Close, so never on a first visit.
   */
  altSubmit?: { label: string; onSubmit(flags: HouseholdFlags): void };
  /** The screen closed, by Close or by the page; the flags may hold edits that were never submitted. */
  onClose?(): void;
  /** The surface's register: chip names, the screen's heading and labels, its submit. Default: the citizen's (copy.ts). */
  copy?: CopyOverride;
  /** Chip ids in the order the surface wants them first; the rest follow in the citizen order. */
  order?: readonly string[];
  /**
   * "always": the chips stay behind the summary line's Edit at every width,
   * not only below 720px — for a surface with no controls that change the
   * answer (the citizen page; design/README.md § Where the personas conflict,
   * 2; citizen review S1). Sets data-collapse on the bar's second block;
   * tokens.css carries the rule.
   */
  collapse?: "always";
}

export interface Editor {
  readonly flags: HouseholdFlags;
  /** Replace every answer (a URL was read); nothing is submitted. */
  setFlags(flags: HouseholdFlags): void;
  /**
   * Show the four-facts screen, focused on a field's flag when given. With
   * `lead: "alt"` the alternate submit is the screen's primary button and
   * what Enter presses — "Add a what-if" then always ends in a what-if.
   */
  open(field?: HouseholdFlagName, opts?: { lead?: "submit" | "alt" }): void;
  close(): void;
  /** Show the chips row, as the bar's "Change my answers" does, and move focus to a chip when given (its id, e.g. "no-snap"). */
  showChips(chip?: string): void;
  /** Show a validation detail — core's, from the page or the API — beside the field it names. */
  /** A rejection from core (validateAnswers, the API): its English detail and, where core sent one, its code, said in the page's language. */
  showError(detail: string, message?: Coded): void;
  /** The full-width line, first in the chips row, that a press answers with (§ ScenarioBar): text or a fragment with a link; "" empties it. */
  setNote(content: string | Node): void;
  /** The county the evaluation resolved for a ZIP, shown beside the place while that ZIP stands; undefined clears it. */
  setCounty(zip: string, name: string | undefined): void;
}

type Copy = typeof defaultCopy;

/** The citizen copy with a surface's words laid over it, two levels deep (a table like `chips`, a function like `kidAge`). */
function mergeCopy(over: CopyOverride | undefined): Copy {
  if (!over) return defaultCopy;
  const out = { ...defaultCopy } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    const base = out[k];
    out[k] = v && typeof v === "object" && base && typeof base === "object" ? { ...base, ...v } : v;
  }
  return out as Copy;
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

type Attrs = Parameters<typeof h>[1];

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
  const copy = mergeCopy(opts.copy);
  // Which button the screen leads with and Enter presses: the submit, or the surface's alternate.
  let lead: "submit" | "alt" = "submit";

  // ── Derived readings of the flags ───────────────────────────────────
  const married = () => flags.married === true;
  const kids = () => flagList(flags.kids).map(Number);
  const place = () => resolvePlace({ zip: flags.zip, state: flags.state?.toUpperCase() });
  const state = (): string | undefined => stateOf(flags);
  const unit = (): PayUnit => (PAY_UNITS as readonly string[]).includes(flags.unit ?? "") ? (flags.unit as PayUnit) : "hour";
  const monthly = (v: string | undefined) => (v ? fill(copy.chips.aMonth, { amount: money(Number(v)) }) : copy.chips.none);
  const yearly = (v: string | undefined) => (v ? fill(copy.chips.aYear, { amount: money(Number(v)) }) : copy.chips.none);
  /**
   * "A parent with kids aged 3 & 7": the adults by the marriage answer, the
   * kids' ages as the locale's short list. An adult with no kids is not a
   * parent, so the two cases take different words (`adults.one` /
   * `adults.oneAlone`) rather than one noun bent to fit both.
   */
  const householdLabel = () => {
    const k = kids(), S = copy.summary;
    if (!k.length) return fill(S.household.alone, { adults: married() ? S.adults.twoAlone : S.adults.oneAlone });
    return fill(S.household.withKids, { adults: married() ? S.adults.two : S.adults.one, kids: fill(S.kids, { n: k.length, ages: shortList(k.map(String)) }) });
  };
  const payLabel = () => (flags.pay ? payInUnit(Number(flags.pay), unit()) : copy.chips.none);
  /** An immigration status's words, the citizen's when none was given. */
  const status = (s: string | undefined): string => (copy.status as Record<string, string>)[s ?? "citizen"] ?? s ?? "";
  /** The county the ZIP resolved to, as core's table writes it; the two places that print it say its kind their own way (names.ts countyWords / countyBare). */
  const countyLabel = (): string | undefined => (county && county.zip === flags.zip ? county.name : undefined);
  const placeLabel = () => { const c = countyLabel(); return listOfItems([flags.zip, state(), c && countyWords(c)].filter((x): x is string => Boolean(x))) || copy.chips.none; };

  // ── The chips, in row order ──────────────────────────────────────────
  /* A dialog's field is labelled by the unit or the question, never by the chip's name again — that is the dialog's title (review N8). */
  const monthlyField = (flag: HouseholdFlagName): DialogField => ({ flag, label: copy.dialog.monthly, kind: "number", min: 0, max: 20000, step: 1 });
  const statusFields = (status: HouseholdFlagName, years: HouseholdFlagName): DialogField[] => [
    { flag: status, label: copy.dialog.choose, kind: "select", options: IMMIGRATION_STATUSES },
    { flag: years, label: copy.dialog.years, kind: "number", min: 0, max: 100, step: 1, hint: copy.dialog.yearsHint },
  ];
  const chips: ChipSpec[] = [
    { kind: "fact", id: "where", label: copy.chips.where, value: placeLabel, field: "zip" },
    { kind: "fact", id: "household", label: copy.chips.household, value: householdLabel, field: "kids" },
    { kind: "fact", id: "pay", label: copy.chips.pay, value: payLabel, field: "pay" },
    { kind: "fact", id: "rent", label: copy.chips.rent, value: () => monthly(flags.rent), field: "rent" },
    { kind: "fact", id: "childcare", label: copy.chips.childcare, value: () => monthly(flags.childcare), field: "childcare", when: () => kids().some((a) => a <= CHILDCARE_MAX_AGE) },
    { kind: "value", id: "age", label: copy.chips.age, value: () => flags.age ?? "30", fields: [{ flag: "age", label: copy.dialog.age, kind: "number", min: 16, max: 110, step: 1 }] },
    { kind: "value", id: "spouse-age", label: copy.chips.spouseAge, value: () => flags["spouse-age"] ?? "30", fields: [{ flag: "spouse-age", label: copy.dialog.age, kind: "number", min: 16, max: 110, step: 1 }], when: married },
    { kind: "value", id: "spouse-earnings", label: copy.chips.spousePay, value: () => yearly(flags["spouse-earnings"]), fields: [{ flag: "spouse-earnings", label: copy.dialog.yearly, kind: "number", min: 0, max: 500000, step: 1 }], when: married },
    { kind: "value", id: "ssdi", label: copy.chips.ssdi, value: () => monthly(flags.ssdi), fields: [monthlyField("ssdi")] },
    { kind: "value", id: "child-support", label: copy.chips.childSupport, value: () => monthly(flags["child-support"]), fields: [monthlyField("child-support")] },
    { kind: "value", id: "unemployment", label: copy.chips.unemployment, value: () => monthly(flags.unemployment), fields: [monthlyField("unemployment")] },
    { kind: "value", id: "savings", label: copy.chips.savings, value: () => (flags.savings ? money(Number(flags.savings)) : copy.chips.none), fields: [{ flag: "savings", label: copy.dialog.dollars, kind: "number", min: 0, max: 10_000_000, step: 1 }] },
    { kind: "value", id: "status", label: copy.chips.status, value: () => status(flags.status), fields: statusFields("status", "years-in-us") },
    { kind: "value", id: "spouse-status", label: copy.chips.spouseStatus, value: () => status(flags["spouse-status"]), fields: statusFields("spouse-status", "spouse-years-in-us"), when: married },
    { kind: "value", id: "kids-disabled", label: copy.chips.kidsDisabled, value: () => { const n = flagList(flags["kids-disabled"]).filter((x) => x === "1").length; return n ? String(n) : copy.chips.none; }, fields: [{ flag: "kids-disabled", label: copy.chips.kidsDisabled, kind: "kids-disabled" }], when: () => kids().length > 0 },
    { kind: "toggle", id: "childcare-subsidy", label: copy.chips.childcareSubsidy, when: () => kids().some((a) => a <= CHILDCARE_MAX_AGE) },
    { kind: "toggle", id: "head-start", label: copy.chips.headStart, when: () => kids().some((a) => a <= HEAD_START_MAX_AGE) },
    { kind: "toggle", id: "housing", label: copy.chips.housing },
    { kind: "toggle", id: "energy-assistance", label: copy.chips.energyAssistance },
    // Heat in the rent halves Michigan's heating credit and changes what the toggle above counts, so it shows with either.
    { kind: "toggle", id: "heat-in-rent", label: copy.chips.heatInRent, when: () => flags["energy-assistance"] === true || state() === "MI" },
    { kind: "toggle", id: "employer-coverage", label: copy.chips.employerCoverage },
    { kind: "toggle", id: "self-employed", label: copy.chips.selfEmployed },
    { kind: "toggle", id: "disabled", label: copy.chips.disabled },
    { kind: "toggle", id: "spouse-disabled", label: copy.chips.spouseDisabled, when: married },
    { kind: "toggle", id: "no-snap", label: copy.chips.snap, inverted: true },
    { kind: "toggle", id: "no-tanf", label: copy.chips.tanf, inverted: true },
    { kind: "toggle", id: "no-medicaid", label: copy.chips.medicaid, inverted: true },
    { kind: "toggle", id: "no-wic", label: copy.chips.wic, inverted: true },
  ];
  // A surface's order first (facts, then the take-up toggles a counselor what-ifs), the rest in the citizen order.
  if (opts.order) {
    const rank = new Map(opts.order.map((id, i) => [id, i]));
    chips.sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
  }

  // ── Skeleton ─────────────────────────────────────────────────────────
  const printBtn = h("button", { type: "button", class: "hg-button" }, copy.actions.print);
  // A surface's own actions replace the two defaults; a short name shows below
  // 720px and the full label stays the accessible name, so a screen reader
  // hears the same words at every width.
  const actionBtn = (a: EditorAction) => {
    const b = h("button", { type: "button", class: `hg-button${a.primary ? " hg-button--primary" : ""}`, ...(a.short ? { "aria-label": a.label } : {}) },
      ...(a.short ? [h("span", { class: "editor-action__full" }, a.label), h("span", { class: "editor-action__short" }, a.short)] : [a.label]));
    b.addEventListener("click", a.onClick);
    return b;
  };
  const actions = opts.actions ? opts.actions.map(actionBtn) : [printBtn];
  /* An action that needs a household is disabled until the flags say enough to evaluate (caseworker review S10). */
  const gated = (opts.actions ?? []).flatMap((a, i) => (a.needsAnswers ? [actions[i]] : []));
  const summaryText = h("span");
  const inputsBtn = h("button", { type: "button", class: "hg-button hg-button--small", "aria-expanded": "false", "aria-controls": "inputs" }, copy.summary.edit);
  const summaryRow = h("div", { class: "hg-scenario__summary hg-no-print" }, summaryText, inputsBtn);
  const inputsRow = h("div", { class: "hg-scenario__inputs", id: "inputs" });
  // The line a press answers with, first in the row so it is read before the
  // chips it explains (caseworker review S2). Placed empty on the first
  // setNote and filled a frame later, so it is a live region in the tree
  // before it first speaks (a hidden element is not); a page that never
  // sets one has no note in its DOM.
  const note = h("p", { class: "hg-scenario__note hg-source", "aria-live": "polite" });
  let noteContent: string | Node = "";
  const dialog = h("dialog", { class: "editor__dialog", "aria-labelledby": "dialog-title" });

  const zipInput = h("input", { id: "f-zip", name: "zip", class: "hg-input editor__input--short", inputmode: "numeric", autocomplete: "postal-code", pattern: "[0-9]{5}", maxlength: "5", "aria-describedby": "h-zip" });
  const zipHint = h("p", { class: "editor__hint", id: "h-zip", "aria-live": "polite" }, copy.place.zipHint);
  const stateSelect = h("select", { id: "f-state", name: "state", class: "hg-select" }, h("option", { value: "" }, copy.place.statePlaceholder),
    ...Object.keys(STATE_NAMES).map((code) => h("option", { value: code }, stateName(code))));
  const radio = (value: string, label: string) => h("label", { class: "editor__option" }, h("input", { type: "radio", name: "married", value }), label);
  const kidsCount = h("input", { id: "f-kids", name: "kids-count", type: "number", min: "0", max: String(MAX_KIDS), inputmode: "numeric", class: "hg-input editor__input--short", "aria-describedby": "h-kids" });
  const kidsRows = h("div", { class: "editor__kids" });
  const payInput = h("input", { id: "f-pay", name: "pay", type: "number", min: "0", step: "0.01", inputmode: "decimal", required: true, class: "hg-input" });
  const unitSelect = h("select", { id: "f-unit", name: "unit", class: "hg-select" }, ...PAY_UNITS.map((u) => h("option", { value: u }, copy.pay.units[u])));
  const hoursInput = h("input", { id: "f-hours", name: "hours", type: "number", min: "1", max: "80", step: "1", inputmode: "numeric", class: "hg-input editor__input--short", "aria-describedby": "h-hours" });
  const rentInput = h("input", { id: "f-rent", name: "rent", type: "number", min: "0", step: "1", inputmode: "numeric", class: "hg-input editor__input--short", "aria-describedby": "h-rent" });
  const rentHint = h("p", { class: "editor__hint", id: "h-rent" }, copy.costs.none);
  const childcareInput = h("input", { id: "f-childcare", name: "childcare", type: "number", min: "0", step: "1", inputmode: "numeric", class: "hg-input editor__input--short", "aria-describedby": "h-childcare" });
  const childcareHint = h("p", { class: "editor__hint", id: "h-childcare" }, copy.costs.none);
  const childcareField = h("div", { class: "editor__field" }, h("label", { for: "f-childcare" }, copy.costs.childcare), childcareInput, childcareHint);
  const errorLine = h("p", { class: "hg-callout hg-callout--caution", role: "alert", hidden: true });
  const closeBtn = h("button", { type: "button", class: "hg-button", hidden: true }, copy.close);
  const altBtn = opts.altSubmit ? h("button", { type: "button", class: "hg-button", hidden: true }, opts.altSubmit.label) : null;
  const submitBtn = h("button", { type: "submit", class: "hg-button hg-button--primary" }, copy.submit);
  const actionsRow = h("div", { class: "editor__actions" }, submitBtn, altBtn, closeBtn);
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
    actionsRow,
    h("p", { class: "editor__privacy hg-source" }, copy.privacy),
  );
  const editorSection = h("section", { class: "editor", id: "editor", hidden: true }, form);

  // Prepended, not appended: a page may keep its own content in `root`, and
  // the sticky top row's containing block is then the whole page (a sticky
  // child cannot outlive its parent's box — S1). An empty root sees no difference.
  root.prepend(
    h("div", { class: "hg-scenario hg-scenario--sticky hg-no-print" },
      h("div", { class: "hg-scenario__top" }, wordmark(copy.wordmark, "hg-wordmark editor-wordmark"), siteNav(opts.page), languageSwitch(),
        h("div", { class: "hg-scenario__actions" }, ...actions))),
    h("header", { class: "hg-scenario", "data-collapse": opts.collapse }, summaryRow, inputsRow),
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
      zipHint.textContent = p.ok && p.state ? fill(copy.place.inState, { state: stateName(p.state) }) : p.ok ? copy.place.zipHint : coreText(p.message, p.detail);
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
        const input = h("input", { id: `f-kid-${i}`, name: `kid-${i}`, type: "number", min: "0", max: "17", step: "1", inputmode: "numeric", required: true, class: "hg-input" });
        return field(`f-kid-${i}`, fill(copy.household.kidAge, { n: i + 1 }), input);
      }));
    }
    k.forEach((age, i) => write(kidsRows.querySelector<HTMLInputElement>(`#f-kid-${i}`)!, String(age)));
    write(payInput, flags.pay ?? "");
    write(unitSelect, unit());
    write(hoursInput, flags.hours ?? "");
    write(rentInput, flags.rent ?? "");
    write(childcareInput, flags.childcare ?? "");
    childcareField.hidden = !k.some((a) => a <= CHILDCARE_MAX_AGE);
    const where = st ? stateName(st) : null;
    rentHint.textContent = where && prefilled.rent ? fill(copy.costs.typical, { amount: money(Number(prefilled.rent)), where }) : copy.costs.none;
    childcareHint.textContent = where && prefilled.childcare ? fill(copy.costs.typical, { amount: money(Number(prefilled.childcare)), where }) : copy.costs.none;
  }

  function renderChips(): void {
    const focused = (document.activeElement as HTMLElement | null)?.dataset.chip;
    /* An unanswered value is marked, so it can be set lighter than an answer (caseworker review S2). */
    const valueChip = (c: Extract<ChipSpec, { kind: "fact" | "value" }>, attrs: Attrs) => {
      const v = c.value();
      return chip(c.id, c.label, v, { ...attrs, "data-unset": v === copy.chips.none });
    };
    inputsRow.replaceChildren(...(note.isConnected ? [note] : []), ...chips.flatMap((c) => {
      if (c.when && !c.when()) return [];
      if (c.kind === "fact") return [valueChip(c, { "aria-expanded": String(editorOpen), "aria-controls": "editor" })];
      if (c.kind === "value") return [valueChip(c, { "aria-haspopup": "dialog", "aria-expanded": "false" })];
      const on = flags[c.id] === true;
      const shown = c.inverted ? !on : on;
      return [chip(c.id, c.label, c.inverted ? (shown ? copy.chips.yes : copy.chips.no) : shown ? copy.chips.on : copy.chips.off, { "aria-pressed": String(shown) })];
    }));
    if (focused) inputsRow.querySelector<HTMLElement>(`[data-chip="${focused}"]`)?.focus();
    const answered = hasAnswers(flags);
    /* No household, no chips: a row of controls for answers that do not exist yet (caseworker review S10). */
    inputsRow.hidden = !answered;
    for (const b of gated) b.disabled = !answered;
    /* Before an answer there is nothing to print or change: the empty form is the page (design/TASKS.md). */
    if (!opts.actions) printBtn.hidden = !answered;
    summaryRow.hidden = !answered;
    /* The place, once, in words (2026-09-18): the county the ZIP resolved to
       stands for the ZIP (review N9) and the ZIP itself leaves the line —
       it is in the chips, and a phrase that names a place does not also need
       the postcode inside it. The state is its name here, not its code: this
       line is a sentence a person reads, and the code is in the chips too. */
    const c = countyLabel(), S = copy.summary, code = state();
    const st = code ? stateName(code) : "";
    // The county with its kind ("El Paso County"): bare, two counselors read "El Paso, Colorado" as Texas (caseworker picture-first review).
    const place = c ? fill(S.place.withCounty, { state: st, county: countyWords(c) }) : fill(S.place.stateOnly, { state: st });
    summaryText.textContent = answered ? fill(S.line, { place, household: householdLabel(), pay: payLabel() }) : S.none;
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
  /* The lead is the screen's one type="submit" button, so Enter's implicit
     submission presses it; the other exit is a plain button with its own
     handler. The form's submit dispatches by `lead`. */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = accepted();
    if (!f) return;
    if (lead === "alt" && opts.altSubmit) opts.altSubmit.onSubmit(f); else opts.onSubmit(f);
  });
  altBtn?.addEventListener("click", () => {
    if (altBtn.type === "submit") return;   /* the form's submit handler has it */
    const f = accepted();
    if (f) opts.altSubmit!.onSubmit(f);
  });
  submitBtn.addEventListener("click", () => {
    if (submitBtn.type === "submit") return;
    const f = accepted();
    if (f) opts.onSubmit(f);
  });

  function showError(detail: string, message?: Coded): void {
    // A field's rejection names the field (code validate.field); the editor's own words for it are the line.
    const field = message?.code === "validate.field" ? String(message.params?.field) : detail;
    const label = (copy.errors.fields as Record<string, string>)[field];
    errorLine.replaceChildren(h("strong", {}, copy.errors.checkThis), " ", label ? fill(copy.errors.check, { label }) : coreText(message, detail));
    errorLine.hidden = false;
    // A field name points at its control; a sentence about a ZIP points at the ZIP.
    const fieldId = FIELD_OF[field] ?? ((message ? message.code.startsWith("place.") : /ZIP|territor/i.test(detail)) ? "zip" : null);
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
          return { box, label: h("label", {}, box, fill(copy.dialog.hasDisability, { n: k + 1, age })) };
        });
        controls.push({ field: f, read: () => (boxes.some((b) => b.box.checked) ? boxes.map((b) => (b.box.checked ? "1" : "0")).join(",") : undefined) });
        return h("div", { class: "editor__checks" }, ...boxes.map((b) => b.label));
      }
      let control: HTMLInputElement | HTMLSelectElement;
      if (f.kind === "select") {
        control = h("select", { id, class: "hg-select" }, ...(f.options ?? []).map((o) => h("option", { value: o }, status(o))));
        control.value = (flags[f.flag] as string | undefined) ?? f.options?.[0] ?? "";
        // The default answer is not an answer: leave it out of the URL.
        controls.push({ field: f, read: () => (control.value === f.options?.[0] ? undefined : control.value) });
      } else {
        control = h("input", { id, type: "number", class: "hg-input", min: f.min?.toString(), max: f.max?.toString(), step: f.step?.toString(), inputmode: "numeric" });
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
  closeBtn.addEventListener("click", () => close());
  printBtn.addEventListener("click", () => window.print());
  const showInputs = (open: boolean) => {
    inputsRow.setAttribute("data-open", String(open));
    inputsBtn.setAttribute("aria-expanded", String(open));
  };
  inputsBtn.addEventListener("click", () => showInputs(inputsRow.getAttribute("data-open") !== "true"));

  function open(fieldFlag?: HouseholdFlagName, by: HTMLElement | null = null, leadWith: "submit" | "alt" = "submit"): void {
    editorOpen = true;
    opener = by;
    // Opened from the page itself (a first visit), there is nothing to go back to — and nothing to compare against.
    closeBtn.hidden = by === null;
    if (altBtn) altBtn.hidden = by === null;
    // The lead button is the primary one and what Enter presses (caseworker review S3).
    lead = altBtn && !altBtn.hidden ? leadWith : "submit";
    submitBtn.classList.toggle("hg-button--primary", lead === "submit");
    submitBtn.type = lead === "submit" ? "submit" : "button";
    if (altBtn) { altBtn.classList.toggle("hg-button--primary", lead === "alt"); altBtn.type = lead === "alt" ? "submit" : "button"; }
    actionsRow.prepend(lead === "alt" ? altBtn! : submitBtn);   /* the lead button comes first */
    editorSection.hidden = false;
    renderChips();
    const target = fieldFlag ? form.querySelector<HTMLElement>(`#f-${fieldFlag}`) : null;
    (target ?? zipInput).focus();
    target?.scrollIntoView({ block: "center" });
  }
  function close(): void {
    editorOpen = false;
    editorSection.hidden = true;
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
    /* A plain open is a first visit (no Close); one led by the alternate exit was asked for by a control, which gets focus back. */
    open(field, o = {}) { open(field, o.lead === "alt" && document.activeElement instanceof HTMLElement ? document.activeElement : null, o.lead); },
    close,
    showChips(chip) {
      showInputs(true);
      const target = chip ? inputsRow.querySelector<HTMLElement>(`[data-chip="${chip}"]`) : null;
      (target ?? inputsBtn).focus();
      (target ?? inputsRow).scrollIntoView({ block: "nearest" });
    },
    showError,
    setNote(content) {
      noteContent = content;
      const fill = () => note.replaceChildren(noteContent);
      if (note.isConnected) { fill(); return; }
      inputsRow.prepend(note);
      requestAnimationFrame(fill);
    },
    setCounty(zip, name) {
      county = name === undefined ? null : { zip, name };
      renderChips();
    },
  };
}
