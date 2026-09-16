import { resolve } from "node:path";
import { defineConfig } from "vite";

// Three surfaces, three pages, one design system (design/tokens.css, imported
// by each page's module so Vite bundles it and the Archivo files it names).
// Committed data is served as static assets from app/public/data, a symlink
// to core/data: `/data/summary.json` and `/data/states/{ST}.json`.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        citizen: resolve(__dirname, "index.html"),
        places: resolve(__dirname, "places.html"),
        caseworker: resolve(__dirname, "caseworker.html"),
      },
    },
  },
});
