import { configDefaults, defineConfig } from "vitest/config";

// A subagent working in a `git worktree` under .claude/ puts a second full
// copy of the sources inside this directory, and vitest would happily collect
// both — 706 tests where there are 353, half of them from another branch.
// app/e2e/*.spec.ts are Playwright proofs (app/playwright.config.ts), not
// unit tests.
//
// Dates are printed in the reader's own zone (lib/format.ts dateWords), so a
// test that pins "Sep 16, 2026" for a UTC instant depends on the zone it runs
// in; the suite runs in one named zone so it says the same thing everywhere.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "**/.claude/worktrees/**", "app/e2e/**"], env: { TZ: "America/New_York" } },
});
