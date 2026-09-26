import { readFileSync } from "node:fs";
import type { SummaryJson } from "@hotgap/core";
import { describe, expect, test } from "vitest";
import { footerContent, ISSUES_URL, REPOSITORY_URL } from "./footer.js";

const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")) as { license: string; repository: { url: string }; bugs: { url: string } };

describe("the site footer (marketing review M8)", () => {
  test("says who HotGap is from the repository's own record: open source, its licence, its code and its issues", () => {
    const c = footerContent(null);
    expect(c.about).toBe("HotGap is an open-source tool (AGPL-3.0 license) that shows what happens to a family's money when its pay goes up.");
    expect(pkg.license).toBe("AGPL-3.0-only");
    expect(c.links).toEqual([
      { text: "See the code", href: REPOSITORY_URL },
      { text: "Report a problem or ask a question", href: ISSUES_URL },
    ]);
    expect(REPOSITORY_URL).toBe(pkg.repository.url);
    expect(ISSUES_URL).toBe(pkg.bugs.url);
  });
  test("repeats the privacy promise word for word", () => {
    expect(footerContent(null).privacy).toBe("We don't save what you type. No sign up, no tracking.");
  });
  test("names the run and its model only when the page has the sweep's summary", () => {
    expect(footerContent(null).run).toBeNull();
    const summary = { generated: "2026-09-24T15:08:33.246Z", model: { endpoint: "engine", version: "2.6.10" } } as unknown as SummaryJson;
    expect(footerContent(summary).run).toBe("Data updated Sep 24, 2026, with policyengine-us 2.6.10.");
  });
});
