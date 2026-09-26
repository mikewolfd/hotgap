// The citizen surface's entry: the editor (app/src/editor) above, the
// result (result.ts and the pure modules beside it) below, the household in
// the URL between them, and the site footer (lib/footer.ts) under all of it.
//
// URL contract: the query is a HouseholdFlags (core/src/flags.ts), the same
// words as the CLI — `/?zip=94110&kids=3,7&pay=30000&unit=year`. Landing
// with a place and a pay evaluates at once; landing without shows the editor.
import "../../../design/tokens.css";
import "./citizen.css";
import { axisSpec, flagsFromSearchParams, rawAnswersFromFlags, searchParamsFromFlags, validateAnswers, type HouseholdFlags } from "@hotgap/core";
import { evaluate } from "../editor/api.js";
import { hasAnswers, mountEditor } from "../editor/index.js";
import { withLang } from "../lib/copy.js";
import { h } from "../lib/dom.js";
import { mountFooter } from "../lib/footer.js";
import { loadSummary } from "../lib/summary.js";
import { t } from "./copy.js";
import { mountResult } from "./result.js";

const app = document.querySelector<HTMLElement>("#app")!;
// SkipLink (#22): the first focusable thing on the page, to the answer.
app.append(h("a", { class: "hg-skip", href: "#answer" }, t("skip")));
const editor = mountEditor(app, {
  page: "citizen",
  onSubmit: (flags) => run(flags, { submitted: true }),
  // A chip changed one answer: with a result on the page, that is a new
  // household to evaluate; before one, it is just an answer for later.
  onChange: (flags) => { if (hasAnswers(flags)) run(flags, { submitted: false }); },
  // This surface has no controls that change the answer (design/README.md
  // § Where the personas conflict, 2): the chips keep the phone rule at
  // every width — the summary line and Edit, the chips behind it (review S1).
  collapse: "always",
});
const resultRoot = h("div", { class: "result", id: "result" });
app.append(h("h1", { class: "hg-visually-hidden" }, t("heading")), resultRoot);
const result = mountResult(resultRoot, () => run(editor.flags, { submitted: false, retry: true }), () => editor.showChips("no-snap"));
/* The footer's run line waits for the sweep's summary, which this page fetches with its first answer (result.ts), not on an empty form. */
const footer = mountFooter();

// Evaluations are answered out of order (a fresh curve takes seconds, a
// cached one milliseconds); only the latest request may render.
let latest = 0;

/**
 * Evaluate a household and render it. A submit closes the screen and moves
 * focus to the answer; a chip change re-evaluates in place, leaving focus on
 * the chip (the toggle's whole behaviour, design/inventory.md § ScenarioBar);
 * a landing on a shared link closes the screen and leaves focus alone.
 */
async function run(flags: HouseholdFlags, { submitted, landing = false, retry = false }: { submitted: boolean; landing?: boolean; retry?: boolean }): Promise<void> {
  const url = `?${withLang(searchParamsFromFlags(flags))}`;
  if (submitted && url !== location.search) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
  const v = validateAnswers(rawAnswersFromFlags(flags));
  if (!v.ok) { editor.showError(v.detail, v.message); return; }
  const id = ++latest;
  result.loading(axisSpec(v.value).count);
  const r = await evaluate(flags);
  if (id !== latest) return;
  if (r.ok) {
    result.render(r.evaluation, flags, { announce: !submitted, retry });
    void loadSummary().then(footer.setSummary);
    // The chips assert answers an archetype curve did not use (S5): the row's
    // note says so where the chips are, with the same Try again.
    if (r.evaluation.source === "archetype") {
      const again = h("button", { type: "button", class: "hg-button hg-button--small" }, t("tryAgain"));
      again.addEventListener("click", () => run(editor.flags, { submitted: false, retry: true }));
      const note = document.createDocumentFragment();
      note.append(t("source.archetype"), " ", again);
      editor.setNote(note);
    } else editor.setNote("");
    if (submitted) {
      editor.close();
      // A person's own submit moves focus to their answer; a page load does
      // not move focus anywhere (the skip link is the way to the answer).
      if (!landing) document.querySelector<HTMLElement>("#answer")?.focus();
    }
  } else if (r.error === "bad_input" && r.detail) {
    editor.showError(r.detail, r.message);
  } else {
    result.error(r);
  }
}

/* The tab's own name is a message too: the skeleton's <title> is English so a
   page has one before the catalog is in, and this replaces it in the active
   language (the pseudo-locale gate reads document.title). */
document.title = t("pageTitle");

function start(): void {
  const flags = flagsFromSearchParams(new URLSearchParams(location.search));
  editor.setFlags(flags);
  if (hasAnswers(editor.flags)) void run(editor.flags, { submitted: true, landing: true });
  else { result.clear(); editor.open(); }
}
window.addEventListener("popstate", start);
start();
