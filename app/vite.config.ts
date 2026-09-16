import { resolve } from "node:path";
import { defineConfig } from "vite";

// Three surfaces, three pages, one design system (design/tokens.css, imported
// by each page's module so Vite bundles it and the Archivo files it names).
// Committed data is served as static assets from app/public/data, a symlink
// to core/data: `/data/summary.json` and `/data/states/{ST}.json`.
// In development /api/* is proxied to `wrangler dev` (worker/, port 8787),
// which is the only thing that evaluates a household.
export default defineConfig({
  server: { proxy: { "/api": "http://localhost:8787" } },
  build: {
    rollupOptions: {
      input: {
        citizen: resolve(import.meta.dirname, "index.html"),
        places: resolve(import.meta.dirname, "places.html"),
        caseworker: resolve(import.meta.dirname, "caseworker.html"),
      },
    },
  },
});
