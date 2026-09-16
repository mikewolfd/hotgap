// The hosted engine, up or down: DigitalOcean App Platform bills a service per
// second for as long as it exists, and nothing depends on this one staying up
// (the weekly sweep and CI start their own engine on the runner; the CLI falls
// back to the public API). So: `down` when idle, `up` when wanted — the image
// stays in the registry, and a fresh app is serving in about three minutes.
//
// Usage: node scripts/engine-app.mjs up | down | status
// Reads DIGITAL_OCEAN_TOKEN and HOTGAP_PE_TOKEN from .env, and writes
// HOTGAP_PE_URL back to it (the app's hostname changes on every `up`).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ENV_PATH = new URL("../.env", import.meta.url);
const APP_NAME = "hotgap-engine";
const API = "https://api.digitalocean.com/v2";

const env = Object.fromEntries(
  (existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "")
    .split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const need = (k) => env[k] || fail(`${k} is not set in .env`);
function fail(msg) { console.error(msg); process.exit(1); }

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${need("DIGITAL_OCEAN_TOKEN")}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (res.status === 204) return null;
  const body = await res.json();
  if (!res.ok) fail(`${init.method ?? "GET"} ${path}: ${res.status} ${body.message ?? JSON.stringify(body)}`);
  return body;
}

/** What the app is. Sizing is explained in engine/README.md ("Hosted on DigitalOcean"). */
const spec = () => ({
  name: APP_NAME,
  region: "nyc",
  services: [{
    name: "engine",
    image: { registry_type: "DOCR", registry: "hotgap", repository: "engine", tag: "latest", deploy_on_push: { enabled: true } },
    instance_size_slug: "apps-d-2vcpu-8gb",
    instance_count: 1,
    http_port: 8080,
    health_check: { http_path: "/healthz", initial_delay_seconds: 120, period_seconds: 30, timeout_seconds: 10, failure_threshold: 6, success_threshold: 1 },
    envs: [
      { key: "WEB_CONCURRENCY", value: "1", scope: "RUN_TIME" },
      { key: "GUNICORN_MAX_REQUESTS", value: "100", scope: "RUN_TIME" },
      { key: "HOTGAP_ENGINE_TOKEN", value: need("HOTGAP_PE_TOKEN"), scope: "RUN_TIME", type: "SECRET" },
    ],
  }],
});

async function findApp() {
  const { apps } = await api("/apps?per_page=200");
  return (apps ?? []).find((a) => a.spec.name === APP_NAME) ?? null;
}

function setEnvUrl(url) {
  const lines = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8").split("\n") : [];
  const kept = lines.filter((l) => !l.startsWith("HOTGAP_PE_URL="));
  if (url) kept.push(`HOTGAP_PE_URL=${url}/us/calculate`);
  writeFileSync(ENV_PATH, kept.filter((l, i, a) => l !== "" || i < a.length - 1).join("\n").replace(/\n*$/, "\n"));
}

const phase = (app) => (app.in_progress_deployment ?? app.active_deployment ?? {}).phase ?? "?";

async function up() {
  let app = await findApp();
  if (app) {
    console.log(`already exists: ${app.live_url ?? "(no URL yet)"} — ${phase(app)}`);
  } else {
    app = (await api("/apps", { method: "POST", body: JSON.stringify({ spec: spec() }) })).app;
    console.log(`created ${app.id}; deploying…`);
  }
  for (;;) {
    app = (await api(`/apps/${app.id}`)).app;
    const p = phase(app);
    if (p === "ACTIVE" && app.live_url) break;
    if (p === "ERROR" || p === "CANCELED") fail(`deployment ${p}`);
    await new Promise((r) => setTimeout(r, 15_000));
  }
  const health = await fetch(`${app.live_url}/healthz`).then((r) => r.json()).catch(() => null);
  setEnvUrl(app.live_url);
  console.log(`up: ${app.live_url} — ${health ? `${health.model} ${health.version}` : "healthz not answering yet"}; HOTGAP_PE_URL written to .env`);
}

async function down() {
  const app = await findApp();
  if (!app) { console.log("not running"); setEnvUrl(null); return; }
  await api(`/apps/${app.id}`, { method: "DELETE" });
  setEnvUrl(null);
  console.log(`deleted ${APP_NAME} (${app.live_url ?? app.id}); HOTGAP_PE_URL removed from .env — the CLI falls back to the public API until \`up\`. The registry image ($5/month) stays so \`up\` is fast.`);
}

async function status() {
  const app = await findApp();
  if (!app) { console.log("down (no app)"); return; }
  const size = app.spec.services[0].instance_size_slug;
  const workers = app.spec.services[0].envs.find((e) => e.key === "WEB_CONCURRENCY")?.value;
  console.log(`${phase(app)} ${app.live_url ?? ""} — ${size}, ${workers} worker(s), since ${app.created_at}`);
}

const cmd = process.argv[2];
if (cmd === "up") await up();
else if (cmd === "down") await down();
else if (cmd === "status") await status();
else fail("usage: node scripts/engine-app.mjs up | down | status");
