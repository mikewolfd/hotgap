// The citizen surface's entry: the editor (app/src/editor) above, the
// result below, the household in the URL between them. What is rendered as
// the result today is the minimal placeholder in result.ts; the citizen page
// proper replaces that module and keeps everything here.
//
// URL contract: the query is a HouseholdFlags (core/src/flags.ts), the same
// words as the CLI — `/?zip=94110&kids=3,7&pay=30000&unit=year`. Landing
// with a place and a pay evaluates at once; landing without shows the editor.
import "../../../design/tokens.css";
import "./citizen.css";
import { axisSpec, flagsFromSearchParams, rawAnswersFromFlags, searchParamsFromFlags, validateAnswers, type HouseholdFlags } from "@hotgap/core";
import { evaluate } from "../editor/api.js";
import { mountEditor } from "../editor/index.js";
import { mountResult } from "./result.js";

const app = document.querySelector<HTMLElement>("#app")!;
const editor = mountEditor(app, {
  onSubmit: (flags) => run(flags, { push: true }),
  // A chip changed one answer: with a result on the page, that is a new
  // household to evaluate; before one, it is just an answer for later.
  onChange: (flags) => { if (hasAnswers(flags)) run(flags, { push: false }); },
});
const resultRoot = document.createElement("div");
resultRoot.className = "page result";
resultRoot.id = "result";
app.append(resultRoot);
const result = mountResult(resultRoot, () => run(editor.flags, { push: false }));

const hasAnswers = (flags: HouseholdFlags): boolean => Boolean((flags.zip || flags.state) && (flags.pay || flags.earnings));

async function run(flags: HouseholdFlags, { push }: { push: boolean }): Promise<void> {
  const url = `?${searchParamsFromFlags(flags)}`;
  if (push) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
  const v = validateAnswers(rawAnswersFromFlags(flags));
  if (!v.ok) { editor.showError(v.detail); return; }
  result.loading(axisSpec(v.value).count);
  const r = await evaluate(flags);
  if (r.ok) {
    editor.close();
    result.render(r.evaluation, flags);
    document.querySelector<HTMLElement>("#answer")?.focus();
  } else if (r.error === "bad_input" && r.detail) {
    editor.showError(r.detail);
  } else {
    result.error(r);
  }
}

function start(): void {
  const flags = flagsFromSearchParams(new URLSearchParams(location.search));
  editor.setFlags(flags);
  if (hasAnswers(flags)) void run(editor.flags, { push: false });
  else editor.open();
}
window.addEventListener("popstate", start);
start();
