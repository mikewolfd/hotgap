import { defineConfig, devices } from "@playwright/test";

// The proofs run against the built site behind the Worker — what a person
// gets — not the Vite dev server. HOTGAP_BASE_URL points at a server you
// already run (e.g. `wrangler dev` with a dead HOTGAP_PE_URL to prove the
// archetype path); without it the config builds app/ and starts wrangler.
const baseURL = process.env.HOTGAP_BASE_URL ?? "http://localhost:8787";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL, ...devices["Desktop Chrome"] },
  webServer: process.env.HOTGAP_BASE_URL
    ? undefined
    : { command: "npx vite build && cd ../worker && npx wrangler dev --port 8787", url: `${baseURL}/api/health`, timeout: 120_000, reuseExistingServer: true },
});
