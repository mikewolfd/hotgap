import { configDefaults, defineConfig } from "vitest/config";

// app/tsconfig.json emits to "dist-ts" (not "dist") to avoid colliding with
// vite build's own "dist" output. Vitest's default excludes only skip
// "**/dist/**", so without this, `tsc -b` leaves compiled .test.js files
// under app/dist-ts that vitest would otherwise pick up as duplicate tests.
// "**/e2e/**" holds Playwright specs (run via `npm run e2e`), not vitest ones —
// they use a different `test()` from `@playwright/test` that vitest's runner
// can't execute.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/dist-ts/**", "**/e2e/**"],
  },
});
