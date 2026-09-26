// The site footer (marketing review M8): who HotGap is, where to reach it,
// when the data was last run, and the privacy promise the citizen form makes
// under its button — the same on all three pages, and never on paper (the
// printed page has its own source lines). Each page's main.ts mounts it once.
//
// What HotGap is, is the repository's own description (README.md, first
// paragraph) and licence (package.json `license`); the two links are the
// repository and its issue tracker, as package.json `repository` and `bugs`
// record them (footer.test.ts holds the two in step). No organisation is
// named because the repository names none.
import type { SummaryJson } from "@hotgap/core";
import { catalog, fill } from "./copy.js";
import { h } from "./dom.js";
import { dateWords, modelLine } from "./format.js";

/** The repository and its issue tracker (package.json `repository.url` and `bugs.url`). */
export const REPOSITORY_URL = "https://github.com/mikewolfd/hotgap";
export const ISSUES_URL = `${REPOSITORY_URL}/issues`;

export interface FooterContent {
  about: string;
  links: { text: string; href: string }[];
  /** "Data updated Sep 24, 2026, with policyengine-us 2.6.10." — null until the page has the sweep's summary. */
  run: string | null;
  privacy: string;
}

/** The footer's words, from the catalog and the sweep's summary: pure, so the tests read it without a DOM. */
export function footerContent(summary: SummaryJson | null): FooterContent {
  const F = catalog.shared.footer;
  return {
    about: F.about,
    links: [{ text: F.code, href: REPOSITORY_URL }, { text: F.issues, href: ISSUES_URL }],
    run: summary ? fill(F.run, { date: dateWords(summary.generated), model: modelLine(summary.model) }) : null,
    privacy: F.privacy,
  };
}

export interface Footer {
  element: HTMLElement;
  /** Fill (or clear) the run line from the sweep's summary. */
  setSummary(summary: SummaryJson | null): void;
}

/**
 * Mount the footer at the end of `parent` (the body: outside every page's
 * <main>). A summary the page is still fetching fills the run line when it
 * arrives; a fetch that fails leaves the line out rather than saying less.
 */
export function mountFooter(summary: SummaryJson | Promise<SummaryJson | null> | null = null, parent: HTMLElement = document.body): Footer {
  const run = h("p", { class: "hg-footer__run" });
  const setSummary = (s: SummaryJson | null): void => {
    const line = footerContent(s).run;
    run.textContent = line ?? "";
    run.hidden = line === null;
  };
  const c = footerContent(null);
  const links = c.links.flatMap((l, i) => [...(i ? [" · "] : []), h("a", { href: l.href, rel: "noopener" }, l.text)]);
  const element = h("footer", { class: "hg-footer hg-no-print", "aria-label": catalog.shared.footer.label },
    h("div", { class: "hg-footer__inner" }, h("p", {}, c.about, " ", ...links), run, h("p", {}, c.privacy)));
  parent.append(element);
  if (summary instanceof Promise) { setSummary(null); void summary.then(setSummary, () => undefined); }
  else setSummary(summary);
  return { element, setSummary };
}
