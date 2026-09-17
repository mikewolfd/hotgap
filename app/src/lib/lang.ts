// The language switch (app/README.md § Languages: "the locale travels"):
// one link per language in LANGUAGES other than the active one, each named
// in its own language (Intl's autonym — "English", "Español" — never a
// name a translator has to keep in every other file): the page's language
// is the page, and a reader looking for theirs finds it by its own name,
// which is the convention a switch is recognised by. A link is the page's
// own address with `lang=` set, so the household, the what-ifs or the view
// travel with the language; landing on it is a fresh page load in that
// language, the one path every module resolves its catalog through
// (lib/copy.ts). The switch's own label is copy (`shared.language.label`).
// Sits in the ScenarioBar's top row, where two actions already share 390
// pixels with the wordmark, and in the journalist masthead; never on paper.
import { catalog, LANG_PARAM, LANGUAGES, languageName, locale } from "./copy.js";
import { h } from "./dom.js";

/** This page's address in another language: the search as it stands, `lang` set. */
export const langHref = (tag: string): string => {
  const q = new URLSearchParams(location.search);
  q.set(LANG_PARAM, tag);
  return `?${q}${location.hash}`;
};

export function languageSwitch(): HTMLElement {
  const active = locale();
  return h("nav", { class: "hg-lang hg-no-print", "aria-label": catalog.shared.language.label },
    ...LANGUAGES.filter((tag) => tag !== active).map((tag) => h("a", { href: langHref(tag), lang: tag, hreflang: tag }, languageName(tag))));
}
