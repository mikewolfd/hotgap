// The citizen surface's entry: the editor (app/src/editor) above, the
// result (result.ts and the pure modules beside it) below, the household in
// the URL between them.
//
// URL contract: the query is a HouseholdFlags (core/src/flags.ts), the same
// words as the CLI — `/?zip=94110&kids=3,7&pay=30000&unit=year`. Landing
// with a place and a pay evaluates at once; landing without shows the editor.
import "../../../design/tokens.css";
import "./citizen.css";
import { axisSpec, flagsFromSearchParams, rawAnswersFromFlags, searchParamsFromFlags, validateAnswers, type HouseholdFlags } from "@hotgap/core";
import { evaluate } from "../editor/api.js";
import { hasAnswers, mountEditor } from "../editor/index.js";
import { h } from "../lib/dom.js";
import { t } from "./copy.js";
import { mountResult } from "./result.js";

const app = document.querySelector<HTMLElement>("#app")!;
// SkipLink (#22): the first focusable thing on the page, to the answer.
app.append(h("a", { class: "hg-skip", href: "#answer" }, t("skip")));
const editor = mountEditor(app, {
  onSubmit: (flags) => run(flags, { submitted: true }),
  // A chip changed one answer: with a result on the page, that is a new
  // household to evaluate; before one, it is just an answer for later.
  onChange: (flags) => { if (hasAnswers(flags)) run(flags, { submitted: false }); },
});
const resultRoot = h("div", { class: "result", id: "result" });
app.append(h("h1", { class: "hg-visually-hidden" }, "If your pay goes up, do you keep more?"), resultRoot);
const result = mountResult(resultRoot, () => run(editor.flags, { submitted: false }));

// Evaluations are answered out of order (a fresh curve takes seconds, a
// cached one milliseconds); only the latest request may render.
let latest = 0;

/**
 * Evaluate a household and render it. A submit closes the screen and moves
 * focus to the answer; a chip change re-evaluates in place, leaving focus on
 * the chip (the toggle's whole behaviour, design/inventory.md § ScenarioBar);
 * a landing on a shared link closes the screen and leaves focus alone.
 */
async function run(flags: HouseholdFlags, { submitted, landing = false }: { submitted: boolean; landing?: boolean }): Promise<void> {
  const url = `?${searchParamsFromFlags(flags)}`;
  if (submitted && url !== location.search) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
  const v = validateAnswers(rawAnswersFromFlags(flags));
  if (!v.ok) { editor.showError(v.detail); return; }
  const id = ++latest;
  result.loading(axisSpec(v.value).count);
  const r = await evaluate(flags);
  if (id !== latest) return;
  if (r.ok) {
    result.render(r.evaluation, flags, { announce: !submitted });
    if (submitted) {
      editor.close();
      // A person's own submit moves focus to their answer; a page load does
      // not move focus anywhere (the skip link is the way to the answer).
      if (!landing) document.querySelector<HTMLElement>("#answer")?.focus();
    }
  } else if (r.error === "bad_input" && r.detail) {
    editor.showError(r.detail);
  } else {
    result.error(r);
  }
}

function start(): void {
  const flags = flagsFromSearchParams(new URLSearchParams(location.search));
  editor.setFlags(flags);
  if (hasAnswers(editor.flags)) void run(editor.flags, { submitted: true, landing: true });
  else { result.clear(); editor.open(); }
}
window.addEventListener("popstate", start);
start();
