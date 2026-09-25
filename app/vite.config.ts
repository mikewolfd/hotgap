import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

// Three surfaces, three pages, one design system (design/tokens.css, imported
// by each page's module so Vite bundles it and the Archivo files it names).
// Committed data is served as static assets from app/public/data, a symlink
// to core/data: `/data/summary.json` and `/data/states/{ST}.json`.
// In development /api/* is proxied to `wrangler dev` (worker/, port 8787),
// which is the only thing that evaluates a household.

const STATES_DIR = resolve(import.meta.dirname, "../core/data/states");

/**
 * Every state's money line for one household, derived at build time from the
 * committed state files (so it can never drift from them): `/data/curves/{id}.json`
 * is `{ from, step, states: { ST: net[] } }`, whole dollars. About 45 KB an
 * archetype against 30 MB of state files — what /places needs to draw one
 * small curve per state without fetching fifty-one of those.
 */
function curves(): Record<string, string> {
  const out: Record<string, { from: number; step: number; states: Record<string, number[]> }> = {};
  for (const file of readdirSync(STATES_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const json = JSON.parse(readFileSync(resolve(STATES_DIR, file), "utf8")) as { state: string; archetypes: Record<string, { points: { earnings: number; netIncome: number }[] }> };
    for (const [id, { points }] of Object.entries(json.archetypes)) {
      if (points.length < 2) continue;
      const c = (out[id] ??= { from: points[0].earnings, step: points[1].earnings - points[0].earnings, states: {} });
      c.states[json.state] = points.map((p) => Math.round(p.netIncome));
    }
  }
  return Object.fromEntries(Object.entries(out).map(([id, c]) => [id, JSON.stringify(c)]));
}

const curvesPlugin = (): Plugin => {
  let cache: Record<string, string> | null = null;
  const get = () => (cache ??= curves());
  return {
    name: "hotgap-curves",
    configureServer(server) {
      server.middlewares.use("/data/curves/", (req, res, next) => {
        const body = get()[(req.url ?? "").replace(/^\//, "").replace(/\.json.*$/, "")];
        if (!body) return next();
        res.setHeader("Content-Type", "application/json");
        res.end(body);
      });
    },
    generateBundle() {
      for (const [id, body] of Object.entries(get())) this.emitFile({ type: "asset", fileName: `data/curves/${id}.json`, source: body });
    },
  };
};

export default defineConfig({
  plugins: [curvesPlugin()],
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
