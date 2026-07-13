import { defineConfig } from "tsup";

// Builds the design system to a single ESM entry (dist/index.mjs) plus a rolled-up
// dist/index.d.ts. React stays external — the claude.ai/design bundle and preview
// harness provide it. us-atlas geometry JSON is bundled in (esbuild's json loader).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
});
