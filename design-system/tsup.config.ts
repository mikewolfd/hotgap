import { defineConfig } from "tsup";

// Builds the design system to a single ESM entry (dist/index.js) plus a rolled-up
// dist/index.d.ts. React stays external — the claude.ai/design bundle and preview
// harness provide it. us-atlas geometry JSON is force-bundled via noExternal, since
// tsup auto-externalizes dependencies and a bare atlas import would throw in native ESM.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom"],
  noExternal: ["us-atlas"],
  treeshake: true,
  onSuccess: "cp src/styles.css dist/styles.css",
});
