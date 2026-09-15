import { configDefaults, defineConfig } from "vitest/config";

// A subagent working in a `git worktree` under .claude/ puts a second full
// copy of the sources inside this directory, and vitest would happily collect
// both — 706 tests where there are 353, half of them from another branch.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "**/.claude/worktrees/**"] },
});
